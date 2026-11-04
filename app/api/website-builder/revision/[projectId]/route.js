import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { generateRevision, enhancePrompt } from '@/lib/ai-client';
import { validateGeneratedFiles } from '@/lib/task-executor';
import { validateGeneratedCode, formatValidationErrors } from '@/lib/code-validator';
import { formatConversation } from '@/lib/website-builder-utils';
import {
    createWebsiteConversationMessage,
    createWebsiteVersionDocument,
    deductWebsiteCreditsWithLock,
    ensureProjectOwnership,
    normalizeWebsiteProject,
    refundWebsiteCreditsWithLock,
    updateWebsiteProjectCode,
    ensureTemplateFilesInCode,
    queueByKey
} from '@/lib/website-builder-server-utils';
import {
    WEBSITE_PROJECTS_COLLECTION_ID,
    WEBSITE_CONVERSATIONS_COLLECTION_ID,
} from '@/services/appwrite-collections';
import { withUser } from '@/lib/request-context';

async function emitBuildEvent(projectId, payload) {
    const safePayload = {
        ts: Date.now(),
        ...payload,
    };
    return createWebsiteConversationMessage(projectId, 'assistant', `📡 **BUILD_EVENT**\n${JSON.stringify(safePayload)}`);
}

export const POST = withUser(async function POST(request, ctx) {
    let shouldRefundCredit = false;
    let refundUserEmail = '';
    let currentProjectId = '';

    try {
        const { projectId } = await ctx.params;
        currentProjectId = projectId;
        const body = await request.json();
        const { message, errorType, originalError, errorSuggestion, batchErrors } = body;
        const userEmail = ctx.assertEmail(body.userEmail);

        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: 'Revision message is required' },
                { status: 400 }
            );
        }

        if (!userEmail) {
            return NextResponse.json(
                { error: 'User email is required' },
                { status: 401 }
            );
        }

        return await queueByKey(projectId, async () => {
            // Step 1: Get current project
            let project;
            try {
                project = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
        } catch (projectError) {
            return NextResponse.json(
                { error: 'Project not found', details: projectError.message },
                { status: 404 }
            );
        }

        const normalizedProject = normalizeWebsiteProject(project);

        if (!normalizedProject.current_code) {
            return NextResponse.json(
                { error: 'No current code to revise. Please wait for initial generation.' },
                { status: 400 }
            );
        }

        if (!ensureProjectOwnership(project, userEmail)) {
            return NextResponse.json(
                { error: 'You are not allowed to revise this project' },
                { status: 403 }
            );
        }

        // Check and deduct credits before generating revision
        try {
            const result = await deductWebsiteCreditsWithLock(project.user_email, 1);

            if (!result.success) {
                return NextResponse.json(
                    {
                        error: 'Insufficient credits',
                        message: 'You do not have enough credits to make revisions. Please purchase more credits or wait for your weekly reset.',
                        credits: {
                            weekly: result.weekly_credits,
                            purchased: result.purchased_credits,
                            total: result.total_credits
                        }
                    },
                    { status: 402 }
                );
            }

            shouldRefundCredit = true;
            refundUserEmail = project.user_email;
        } catch (creditError) {
            console.error('Credit check error:', creditError);
            return NextResponse.json(
                { error: 'Failed to process credits', details: creditError.message },
                { status: 500 }
            );
        }

        // Step 2: Get conversation history
        await emitBuildEvent(projectId, {
            event: 'phase',
            phase: 'revision_context',
            status: 'running',
            label: 'Collecting project context',
        });
        const convRes = await databases.listDocuments(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, [
            Query.equal('project_id', projectId),
            Query.orderAsc('$createdAt'),
            Query.limit(100)
        ]);
        const formattedHistory = formatConversation(convRes.documents || []);
        await emitBuildEvent(projectId, {
            event: 'phase',
            phase: 'revision_context',
            status: 'done',
            label: 'Context loaded',
        });

        // Step 3: Add user message to conversation
        await createWebsiteConversationMessage(projectId, 'user', message);

        // Step 4: Enhance the revision request
        await emitBuildEvent(projectId, {
            event: 'phase',
            phase: 'revision_plan',
            status: 'running',
            label: 'Planning revision scope',
        });
        let enhancedRequest = await enhancePrompt(message);
        
        // If this is a comprehensive batch fix, include ALL error details
        if (batchErrors && Array.isArray(batchErrors) && batchErrors.length > 0) {
            const errorDetails = batchErrors
                .map((err, idx) => `${idx + 1}. [${err.type}] ${err.message}`)
                .join('\n');
            enhancedRequest = `${enhancedRequest}\n\n[BATCH ERROR CONTEXT - FIX ALL TOGETHER]\nThere are ${batchErrors.length} error(s) that need to be fixed in a single comprehensive pass:\n${errorDetails}\n\nIMPORTANT: Fix ALL of these errors together in one pass. Do not fix them individually or sequentially. Ensure the final code has:\n- All variables properly defined and imported\n- All import paths correct and files existing\n- All JSX syntax valid\n- All required providers in place\n- No circular dependencies\n- Clean, working code with zero critical errors`;
        } 
        // If this is a single error fix, inject error context
        else if (errorType || originalError) {
            enhancedRequest = `${enhancedRequest}\n\n[ERROR CONTEXT]\nError Type: ${errorType || 'UNKNOWN'}\nError Message: ${originalError || 'N/A'}\nFocus on fixing this error comprehensively.`;
        }
        await emitBuildEvent(projectId, {
            event: 'phase',
            phase: 'revision_plan',
            status: 'done',
            label: 'Revision scope ready',
        });

        // Step 5: Add assistant message about enhancement
        await createWebsiteConversationMessage(projectId, 'assistant', `I've enhanced your request to: "${enhancedRequest}"`);

        // Step 6: Add assistant message about starting changes
        await createWebsiteConversationMessage(projectId, 'assistant', 'Now making changes to your website...');

        // Step 7: Generate revision with internal reliability loop
        await emitBuildEvent(projectId, {
            event: 'phase',
            phase: 'patch_apply',
            status: 'running',
            label: 'Applying targeted changes',
        });
        const currentFiles = (() => {
            try { return JSON.parse(normalizedProject.current_code || '{}') } catch { return {} }
        })();

        // Use more repair attempts for batch error fixes (multiple errors = higher complexity)
        const isBatchErrorFix = batchErrors && Array.isArray(batchErrors) && batchErrors.length > 1;
        const MAX_INTERNAL_REPAIR_ATTEMPTS = isBatchErrorFix ? 4 : 2;
        let repairAttempt = 0;
        let workingFiles = { ...currentFiles };
        let repairPrompt = enhancedRequest;
        let changesApplied = false; // Track if changes were actually made

        while (repairAttempt <= MAX_INTERNAL_REPAIR_ATTEMPTS) {
            const revisedFiles = await generateRevision(workingFiles, repairPrompt, formattedHistory);
            
            // IMPROVED: Handle empty changeset gracefully
            if (revisedFiles && Object.keys(revisedFiles).length > 0) {
                changesApplied = true;
                const mergedFiles = { ...workingFiles, ...revisedFiles };
                
                // Enhanced validation: Run both old and new validators
                const oldValidation = validateGeneratedFiles(mergedFiles);
                const newValidation = await validateGeneratedCode(mergedFiles);
                
                workingFiles = oldValidation?.files || mergedFiles;
                
                // Check both validation results
                const oldCriticalCount = Number(oldValidation?.summary?.criticalCount || 0);
                const newCriticalCount = newValidation.errors.filter(e => e.severity === 'critical').length;
                const totalCriticalCount = Math.max(oldCriticalCount, newCriticalCount);
                
                if (totalCriticalCount === 0) {
                    console.log('[Revision] Enhanced quality gate passed');
                    break;
                }
                
                const allErrors = [
                    ...(oldValidation?.severity?.critical || []),
                    ...newValidation.errors.filter(e => e.severity === 'critical').map(e => e.message)
                ];
                const criticalErrors = allErrors.slice(0, 5);
                
                if (repairAttempt >= MAX_INTERNAL_REPAIR_ATTEMPTS) {
                    await createWebsiteConversationMessage(projectId, 'assistant', 
                        `⚠️ Revision completed but ${totalCriticalCount} issue(s) remain: ${criticalErrors.join(' | ')}\n\nThe website has been updated with your requested changes.`);
                    break;
                }
                
                await emitBuildEvent(projectId, {
                    event: 'phase',
                    phase: 'patch_apply',
                    status: 'warning',
                    label: `Detected ${totalCriticalCount} critical issue(s), auto-repairing (${repairAttempt + 1}/${MAX_INTERNAL_REPAIR_ATTEMPTS})`,
                });

                repairPrompt = `${enhancedRequest}\n\n[REPAIR PASS]\nFix these critical errors first:\n${criticalErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n${errorSuggestion ? `\nSuggestion: ${errorSuggestion}` : ''}`;
                repairAttempt += 1;
            } else {
                // IMPROVED: AI returned no changes
                console.log('[Revision] Repair attempt returned no changes');
                const oldValidation = validateGeneratedFiles(workingFiles);
                const newValidation = await validateGeneratedCode(workingFiles);
                
                const oldCriticalCount = Number(oldValidation?.summary?.criticalCount || 0);
                const newCriticalCount = newValidation.errors.filter(e => e.severity === 'critical').length;
                const totalCriticalCount = Math.max(oldCriticalCount, newCriticalCount);
                
                if (totalCriticalCount === 0) {
                    console.log('[Revision] Current files are valid, no changes needed');
                    await createWebsiteConversationMessage(projectId, 'assistant', 
                        '✅ Your website is already in good condition. No changes were needed.');
                    break;
                } else if (repairAttempt >= MAX_INTERNAL_REPAIR_ATTEMPTS) {
                    const allErrors = [
                        ...(oldValidation?.severity?.critical || []),
                        ...newValidation.errors.filter(e => e.severity === 'critical').map(e => e.message)
                    ];
                    const criticalErrors = allErrors.slice(0, 3);
                    console.log(`[Revision] Max attempts reached with ${totalCriticalCount} remaining issues`);
                    await createWebsiteConversationMessage(projectId, 'assistant', 
                        `⚠️ Your request has been logged, but I couldn't automatically fix all issues.\n\nRemaining issues:\n${criticalErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nPlease try a more specific request or generate a new version.`);
                    break;
                } else {
                    console.log('[Revision] Will retry repair with different prompt');
                    const allErrors = [
                        ...(oldValidation?.severity?.critical || []),
                        ...newValidation.errors.filter(e => e.severity === 'critical').map(e => e.message)
                    ];
                    const criticalErrors = allErrors.slice(0, 5);
                    repairPrompt = `${enhancedRequest}\n\n[REPAIR PASS ${repairAttempt + 1}]\nFix these critical errors:\n${criticalErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n${errorSuggestion ? `\nSuggestion: ${errorSuggestion}` : ''}`;
                    repairAttempt += 1;
                }
            }
        }

            // Strict Quality Gate: Do not overwrite the working project if remaining critical issues exist
            const finalOldValidation = validateGeneratedFiles(workingFiles);
            const finalNewValidation = await validateGeneratedCode(workingFiles);
            const remainingCriticalErrors = [
                ...(finalOldValidation?.severity?.critical || []),
                ...finalNewValidation.errors.filter(e => e.severity === 'critical').map(e => e.message)
            ];

            if (remainingCriticalErrors.length > 0) {
                console.warn(`[Revision] Quality gate halted save: ${remainingCriticalErrors.length} critical errors remain.`);
                if (shouldRefundCredit && refundUserEmail) {
                    try {
                        await refundWebsiteCreditsWithLock(refundUserEmail, 1);
                        shouldRefundCredit = false;
                    } catch (rErr) {
                        console.error('Failed to refund credit on quality gate failure:', rErr);
                    }
                }

                await createWebsiteConversationMessage(
                    projectId,
                    'assistant',
                    `⚠️ The revision could not be applied cleanly because critical code errors remained: ${remainingCriticalErrors.slice(0, 3).join(' | ')}. Your previous working code was preserved.`
                );

                await emitBuildEvent(projectId, {
                    event: 'phase',
                    phase: 'revision_failed',
                    status: 'error',
                    label: 'Revision halted to protect working website',
                });

                return NextResponse.json({
                    success: false,
                    error: 'Revision halted due to critical syntax errors. Preserved last known-good version.',
                    criticalErrors: remainingCriticalErrors.slice(0, 5),
                    preservedLastKnownGood: true
                }, { status: 422 });
            }

            const filesJson = ensureTemplateFilesInCode(workingFiles, normalizedProject.project_name);
            await emitBuildEvent(projectId, {
                event: 'phase',
                phase: 'patch_apply',
                status: 'done',
                label: 'Changes applied and verified',
            });

            // Step 8: Create new version
            const version = await createWebsiteVersionDocument({
                projectId,
                code: filesJson
            });

            // Step 9: Update project
            await updateWebsiteProjectCode(projectId, filesJson, version.$id);

            const updatedProjectDoc = await databases.getDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId);
            const updatedProject = normalizeWebsiteProject(updatedProjectDoc);

            // Step 10: Add AI success message to conversation
            const successMsg = changesApplied 
                ? "✅ Your website has been updated with the requested changes!"
                : "✅ Your website is ready. Changes have been applied and verified.";
            
            await createWebsiteConversationMessage(projectId, 'assistant', successMsg);
            await emitBuildEvent(projectId, {
                event: 'phase',
                phase: 'revision_complete',
                status: 'done',
                label: 'Revision completed successfully',
            });

            shouldRefundCredit = false;

            return NextResponse.json({
                success: true,
                versionId: version.$id,
                message: 'Website updated successfully',
                project: updatedProject
            });
        });

    } catch (error) {
        console.error('Error in revision endpoint:', error);

        if (shouldRefundCredit && refundUserEmail) {
            try {
                await refundWebsiteCreditsWithLock(refundUserEmail, 1);
            } catch (refundError) {
                console.error('Failed to refund revision credit:', refundError);
            }
        }

        if (currentProjectId) {
            try {
                await createWebsiteConversationMessage(
                    currentProjectId,
                    'assistant',
                    `Sorry, I encountered an error updating your website: ${error.message}`
                );
            } catch (conversationError) {
                console.error('Failed to save revision error message:', conversationError);
            }
        }

        return NextResponse.json(
            { error: 'Failed to generate revision', details: error.message },
            { status: 500 }
        );
    }
});
