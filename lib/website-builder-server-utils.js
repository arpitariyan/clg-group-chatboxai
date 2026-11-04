import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
    USERS_COLLECTION_ID,
    WEBSITE_CONVERSATIONS_COLLECTION_ID,
    WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID,
    WEBSITE_PROJECTS_COLLECTION_ID,
    WEBSITE_USER_CREDITS_COLLECTION_ID,
    WEBSITE_VERSIONS_COLLECTION_ID,
    WEBSITE_ERROR_LOGS_COLLECTION_ID,
    WEBSITE_MEMORY_CACHE_COLLECTION_ID,
    WEBSITE_COMPONENT_REGISTRY_COLLECTION_ID,
    WEBSITE_TASK_LOGS_COLLECTION_ID
} from '@/services/appwrite-collections';
import { getViteTemplate } from '@/lib/website-builder-templates';
import { normalizeEmail } from '@/lib/server-auth';

export const creditLocks = new Map();

export function queueByKey(key, task) {
    const previous = creditLocks.get(key) || Promise.resolve();

    const runTask = previous
        .catch(() => {
            // Keep the chain alive even if previous task failed.
        })
        .then(task);

    const trackingPromise = runTask.finally(() => {
        if (creditLocks.get(key) === trackingPromise) {
            creditLocks.delete(key);
        }
    });

    creditLocks.set(key, trackingPromise);

    return runTask;
}

export function normalizeDoc(doc) {
    if (!doc) return doc;
    return {
        ...doc,
        id: doc.$id
    };
}

/**
 * Ensures critical template files are always present in generated code.
 * This is a safety net to prevent missing package.json and other infra files.
 * @param {string|object} codeInput - The generated code (JSON string or object)
 * @param {string} projectName - The project name (used for package.json)
 * @returns {string} The final code JSON with template files guaranteed
 */
export function ensureTemplateFilesInCode(codeInput, projectName = 'my-app') {
    try {
        let codeObj = null;
        if (typeof codeInput === 'string') {
            const trimmed = codeInput.trim();
            // If it is a legacy HTML document, preserve it without corrupting into an empty Vite template
            if (trimmed.startsWith('<!DOCTYPE') || (trimmed.startsWith('<html') && trimmed.includes('</html>'))) {
                return codeInput;
            }
            codeObj = JSON.parse(codeInput);
        } else {
            codeObj = codeInput;
        }
        if (!codeObj || typeof codeObj !== 'object') codeObj = {};

        // Get template and merge (AI output takes precedence, but template provides fallbacks)
        const template = getViteTemplate(projectName);
        const finalCode = { ...template, ...codeObj };

        // Validate critical files exist
        const requiredFiles = ['package.json', 'index.html', 'src/main.jsx', 'vite.config.js'];
        const missingFiles = requiredFiles.filter(f => !finalCode[f]);
        
        if (missingFiles.length > 0) {
            console.warn(`⚠️ Template fallback: Missing files ${missingFiles.join(', ')} — added from template`);
        }

        return JSON.stringify(finalCode);
    } catch (error) {
        console.error('❌ Error ensuring template files:', error);
        if (typeof codeInput === 'string' && (codeInput.includes('<html') || codeInput.includes('<!DOCTYPE'))) {
            return codeInput;
        }
        // Last resort: return template only
        const template = getViteTemplate(projectName);
        return JSON.stringify(template);
    }
}

function clipText(value, maxLength) {
    if (typeof value !== 'string') return value;
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength);
}

export function normalizeWebsiteProject(doc) {
    if (!doc) return doc;

    const projectName = doc.project_name || doc.name || 'Untitled Website';
    const currentCode = doc.current_code || doc.html_content || '';

    return {
        ...doc,
        id: doc.$id,
        project_name: projectName,
        current_code: currentCode,
        original_prompt: doc.original_prompt || doc.description || '',
        updated_at: doc.updated_at || doc.$updatedAt,
        created_at: doc.created_at || doc.$createdAt
    };
}

export function normalizeWebsiteVersion(doc) {
    if (!doc) return doc;

    return {
        ...doc,
        id: doc.$id,
        code: doc.code || doc.html_content || '',
        created_at: doc.created_at || doc.$createdAt
    };
}

export async function createWebsiteProjectDocument({ userEmail, projectName, originalPrompt, enhancedPrompt }) {
    const commonName = clipText(projectName || 'Untitled Website', 500);
    const promptText = originalPrompt || '';
    const enhancedText = enhancedPrompt || '';

    // Appwrite schema: user_email, name, description, html_content, is_published, published_url, current_version_id, generation_step, status
    const payloadPrimary = {
        user_email: userEmail,
        name: commonName,
        description: clipText(enhancedText || promptText, 1900),
        html_content: '',
        is_published: false,
        generation_step: 'Started',
        status: 'pending'
    };

    try {
        return await databases.createDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, ID.unique(), payloadPrimary);
    } catch (primaryError) {
        // Fallback: try with minimal required fields
        const payloadFallback = {
            user_email: userEmail,
            name: commonName,
            description: clipText(promptText, 1900),
            html_content: '',
            is_published: false,
            generation_step: 'Started',
            status: 'pending'
        };

        try {
            return await databases.createDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, ID.unique(), payloadFallback);
        } catch (fallbackError) {
            const primaryMsg = primaryError?.message || 'Primary schema write failed';
            const fallbackMsg = fallbackError?.message || 'Fallback schema write failed';
            throw new Error(`Project create failed. ${primaryMsg} | ${fallbackMsg}`);
        }
    }
}

export async function createWebsiteVersionDocument({ projectId, code, versionType = 'initial' }) {
    const primaryPayload = {
        project_id: projectId,
        code: code || '',
        version_type: versionType
    };

    try {
        return await databases.createDocument(DB_ID, WEBSITE_VERSIONS_COLLECTION_ID, ID.unique(), primaryPayload);
    } catch (primaryError) {
        const fallbackPayload = {
            project_id: projectId,
            html_content: code || '',
            version_type: versionType
        };

        try {
            return await databases.createDocument(DB_ID, WEBSITE_VERSIONS_COLLECTION_ID, ID.unique(), fallbackPayload);
        } catch (fallbackError) {
            const primaryMsg = primaryError?.message || 'Primary version write failed';
            const fallbackMsg = fallbackError?.message || 'Fallback version write failed';
            throw new Error(`Version create failed. ${primaryMsg} | ${fallbackMsg}`);
        }
    }
}

export async function updateWebsiteProjectCode(projectId, code, versionId, options = {}) {
  // Appwrite schema fields: user_email, name, description, html_content, is_published, published_url, current_version_id, generation_step, status
  // Map: current_code → html_content
  
  const status = options?.status || 'success';
  const generationStep = options?.generationStep || 'Complete';

  const fullUpdate = {
    html_content: code,
    generation_step: generationStep,
    status: status
  };
  
  // Only add versionId if provided
  if (versionId) {
    fullUpdate.current_version_id = versionId;
  }

  try {
    return await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, fullUpdate);
  } catch (primaryError) {
    // Fallback: try with just html_content and generation_step
    try {
      return await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, {
        html_content: code,
        generation_step: generationStep,
        status: status
      });
    } catch (fallbackError) {
      console.error('❌ Update failed:', {
        withVersion: primaryError.message,
        htmlOnly: fallbackError.message
      });
      throw new Error(`Project update failed. ${primaryError.message}`);
    }
  }
}

export async function updateProjectGenerationState(projectId, payload) {
    if (!projectId) return null;
    try {
        // Appwrite website_projects schema: user_email, name, description, html_content, is_published, published_url, current_version_id, generation_step, status
        const updateData = {};
        
        // Map incoming fields to Appwrite schema
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.generation_step !== undefined) updateData.generation_step = payload.generation_step;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.html_content !== undefined) updateData.html_content = payload.html_content;
        if (payload.is_published !== undefined) updateData.is_published = payload.is_published;
        if (payload.published_url !== undefined) updateData.published_url = payload.published_url;

        // If no valid fields to update, return early
        if (Object.keys(updateData).length === 0) {
            console.warn(`[Appwrite] No valid fields to update for project ${projectId}`);
            return null;
        }

        return await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, updateData);
    } catch (error) {
        console.error(`[Appwrite] Failed to update project generation state for ${projectId}:`, error.message);
        return null;
    }
}

export async function logGenerationError({ projectId, taskId, errorMessage, errorType }) {
    try {
        return await databases.createDocument(DB_ID, WEBSITE_ERROR_LOGS_COLLECTION_ID, ID.unique(), {
            project_id: projectId,
            task_id: taskId || '',
            error_message: errorMessage ? errorMessage.substring(0, 4999) : 'Unknown Error',
            error_type: errorType || 'UNKNOWN',
            fixed: false,
            fix_attempts: 0,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn('[Appwrite] Failed to log generation error:', error.message);
        return null;
    }
}

export async function updateErrorLogFixedStatus(errorLogId, fixed = true, attempts = 1) {
    try {
        return await databases.updateDocument(DB_ID, WEBSITE_ERROR_LOGS_COLLECTION_ID, errorLogId, {
            fixed,
            fix_attempts: attempts
        });
    } catch (e) {
        // ignore
    }
}

export async function findMemoryCache(errorPattern) {
    if (!errorPattern) return null;
    try {
        const res = await databases.listDocuments(DB_ID, WEBSITE_MEMORY_CACHE_COLLECTION_ID, [
            Query.equal('error_pattern', errorPattern),
            Query.limit(1)
        ]);
        if (res.documents.length > 0) {
            const doc = res.documents[0];
            // update usage count
            databases.updateDocument(DB_ID, WEBSITE_MEMORY_CACHE_COLLECTION_ID, doc.$id, {
                usage_count: (doc.usage_count || 0) + 1,
                last_used: new Date().toISOString()
            }).catch(() => {});
            return doc;
        }
    } catch (error) {
        // ignore
    }
    return null;
}

export async function saveMemoryCache(errorPattern, fixSolution) {
    if (!errorPattern || !fixSolution) return null;
    try {
        return await databases.createDocument(DB_ID, WEBSITE_MEMORY_CACHE_COLLECTION_ID, ID.unique(), {
            error_pattern: errorPattern,
            fix_solution: fixSolution,
            usage_count: 1,
            last_used: new Date().toISOString(),
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn('[Appwrite] Failed to save memory cache:', error.message);
        return null;
    }
}

export async function logGenerationTask({ projectId, taskTitle, status, attempts, logs }) {
    try {
        return await databases.createDocument(DB_ID, WEBSITE_TASK_LOGS_COLLECTION_ID, ID.unique(), {
            project_id: projectId,
            task_title: taskTitle || 'Unknown task',
            status: status || 'pending',
            attempts: attempts || 1,
            logs: logs ? logs.substring(0, 99999) : '',
            created_at: new Date().toISOString()
        });
    } catch (error) {
        return null; // optional anyway
    }
}


export async function recordWebsiteCreditTransaction({ userEmail, amount, transactionType, orderId = '', packageId = '' }) {
    if (!userEmail || !amount || !transactionType) return;

    const payloadFull = {
        user_email: userEmail,
        amount,
        transaction_type: transactionType,
        order_id: orderId,
        package_id: packageId
    };

    try {
        await databases.createDocument(DB_ID, WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID, ID.unique(), payloadFull);
        return;
    } catch (fullError) {
        // Fallback to minimal fields for schema variants that do not include order/package columns.
        try {
            await databases.createDocument(DB_ID, WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID, ID.unique(), {
                user_email: userEmail,
                amount,
                transaction_type: transactionType
            });
        } catch (minimalError) {
            console.warn('Failed to record credit transaction:', fullError?.message || minimalError?.message);
        }
    }
}

export async function createWebsiteConversationMessage(projectId, role, content, eventType = 'message') {
    if (!projectId || !role || !content) return null;

    try {
        // Appwrite website_conversations schema also requires event_type.
        return await databases.createDocument(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, ID.unique(), {
            project_id: projectId,
            role,
            content,
            event_type: eventType
        });
    } catch (error) {
        console.warn('Failed to save conversation message:', error?.message || error);
        return null;
    }
}

/**
 * Helper with exponential backoff for Appwrite database operations
 */
async function withRetry(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const isConnectionError =
                error.code === 'ECONNRESET' ||
                error.message?.includes('fetch failed') ||
                error.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
                error.message?.includes('timeout') ||
                error.code === 'ETIMEDOUT';

            if (!isConnectionError || attempt === maxRetries) {
                throw error;
            }
            
            const delay = 300 * Math.pow(2, attempt - 1);
            console.warn(`[Appwrite Utils] Attempt ${attempt} failed with ${error.code || 'timeout'}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

export async function getWebsiteCreditsDoc(userEmail) {
    const res = await withRetry(() => 
        databases.listDocuments(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, [
            Query.equal('user_email', userEmail),
            Query.limit(1)
        ])
    );

    return res.documents[0] || null;
}

async function getUserPlanStatus(userEmail) {
    const userRes = await withRetry(() => 
        databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
            Query.equal('email', userEmail),
            Query.limit(1)
        ])
    );

    if (userRes.documents.length === 0) {
        throw new Error('User not found');
    }

    return userRes.documents[0].plan === 'pro';
}

function isWeeklyResetDue(weekStartDate) {
    if (!weekStartDate) return true;
    const weekStart = new Date(weekStartDate);
    if (Number.isNaN(weekStart.getTime())) return true;
    const daysDiff = Math.floor((Date.now() - weekStart.getTime()) / 86400000);
    return daysDiff >= 7;
}

export async function getOrCreateWebsiteCreditsDoc(userEmail) {
    const isPro = await getUserPlanStatus(userEmail);
    const existing = await getWebsiteCreditsDoc(userEmail);

    if (!existing) {
        const created = await databases.createDocument(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, ID.unique(), {
            user_email: userEmail,
            weekly_credits: isPro ? 100 : 10,
            purchased_credits: 0,
            week_start_date: new Date().toISOString().split('T')[0],
            is_pro: isPro
        });
        await recordWebsiteCreditTransaction({
            userEmail,
            amount: isPro ? 100 : 10,
            transactionType: 'weekly_reset'
        });
        return created;
    }

    if (isWeeklyResetDue(existing.week_start_date) || existing.is_pro !== isPro) {
        const updated = await databases.updateDocument(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, existing.$id, {
            weekly_credits: isPro ? 100 : 10,
            week_start_date: new Date().toISOString().split('T')[0],
            is_pro: isPro
        });
        await recordWebsiteCreditTransaction({
            userEmail,
            amount: isPro ? 100 : 10,
            transactionType: 'weekly_reset'
        });
        return updated;
    }

    return existing;
}

export function computeDeductedCredits(creditsDoc, amount) {
    const weekly = creditsDoc?.weekly_credits || 0;
    const purchased = creditsDoc?.purchased_credits || 0;
    const total = weekly + purchased;

    if (total < amount) {
        return {
            success: false,
            weekly_credits: weekly,
            purchased_credits: purchased,
            total_credits: total,
            error: 'Insufficient credits'
        };
    }

    let weeklyLeft = weekly;
    let purchasedLeft = purchased;
    let toDeduct = amount;

    if (weeklyLeft >= toDeduct) {
        weeklyLeft -= toDeduct;
        toDeduct = 0;
    } else {
        toDeduct -= weeklyLeft;
        weeklyLeft = 0;
        purchasedLeft = Math.max(0, purchasedLeft - toDeduct);
    }

    return {
        success: true,
        weekly_credits: weeklyLeft,
        purchased_credits: purchasedLeft,
        total_credits: weeklyLeft + purchasedLeft
    };
}

export async function deductWebsiteCreditsWithLock(userEmail, amount) {
    if (!userEmail) {
        return { success: false, error: 'User email is required' };
    }

    if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid deduction amount' };
    }

    return queueByKey(userEmail, async () => {
        const creditsDoc = await getOrCreateWebsiteCreditsDoc(userEmail);

        const computed = computeDeductedCredits(creditsDoc, amount);

        if (!computed.success) {
            return computed;
        }

        const updated = await databases.updateDocument(
            DB_ID,
            WEBSITE_USER_CREDITS_COLLECTION_ID,
            creditsDoc.$id,
            {
                weekly_credits: computed.weekly_credits,
                purchased_credits: computed.purchased_credits
            }
        );

        await recordWebsiteCreditTransaction({
            userEmail,
            amount,
            transactionType: 'deduct'
        });

        return {
            success: true,
            weekly_credits: updated.weekly_credits,
            purchased_credits: updated.purchased_credits,
            total_credits: (updated.weekly_credits || 0) + (updated.purchased_credits || 0)
        };
    });
}

export async function refundWebsiteCreditsWithLock(userEmail, amount, bucket = 'auto') {
    if (!userEmail) {
        return { success: false, error: 'User email is required' };
    }

    if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid refund amount' };
    }

    return queueByKey(userEmail, async () => {
        const creditsDoc = await getOrCreateWebsiteCreditsDoc(userEmail);

        const maxWeekly = creditsDoc.is_pro ? 100 : 10;
        const currentWeekly = creditsDoc.weekly_credits || 0;
        const currentPurchased = creditsDoc.purchased_credits || 0;

        let refundToWeekly = 0;
        let refundToPurchased = 0;

        if (bucket === 'weekly') {
            refundToWeekly = amount;
        } else if (bucket === 'purchased') {
            refundToPurchased = amount;
        } else {
            // 'auto': restore to weekly up to maxWeekly limit, and remainder to purchased
            const weeklyDeficit = Math.max(0, maxWeekly - currentWeekly);
            refundToWeekly = Math.min(amount, weeklyDeficit);
            refundToPurchased = amount - refundToWeekly;
        }

        const updated = await databases.updateDocument(
            DB_ID,
            WEBSITE_USER_CREDITS_COLLECTION_ID,
            creditsDoc.$id,
            {
                weekly_credits: currentWeekly + refundToWeekly,
                purchased_credits: currentPurchased + refundToPurchased
            }
        );

        await recordWebsiteCreditTransaction({
            userEmail,
            amount,
            transactionType: 'refund'
        });

        return {
            success: true,
            weekly_credits: updated.weekly_credits || 0,
            purchased_credits: updated.purchased_credits || 0,
            total_credits: (updated.weekly_credits || 0) + (updated.purchased_credits || 0)
        };
    });
}

export function ensureProjectOwnership(project, userEmail) {
    // Case-insensitive: email identity is case-insensitive, and the acting email now
    // arrives normalized (lowercased) from ctx.assertEmail(), while older project docs
    // may have stored the raw client-supplied casing. Normalizing both sides never
    // breaks a genuine match and never creates a false one.
    const owner = normalizeEmail(project?.user_email);
    const actor = normalizeEmail(userEmail);
    return Boolean(owner && actor && owner === actor);
}
