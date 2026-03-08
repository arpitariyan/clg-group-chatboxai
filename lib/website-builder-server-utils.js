import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import {
    USERS_COLLECTION_ID,
    WEBSITE_CONVERSATIONS_COLLECTION_ID,
    WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID,
    WEBSITE_PROJECTS_COLLECTION_ID,
    WEBSITE_USER_CREDITS_COLLECTION_ID,
    WEBSITE_VERSIONS_COLLECTION_ID
} from '@/services/appwrite-collections';

const creditLocks = new Map();

function queueByKey(key, task) {
    const previous = creditLocks.get(key) || Promise.resolve();

    const runTask = previous
        .catch(() => {
            // Keep the chain alive even if previous task failed.
        })
        .then(task);

    creditLocks.set(key, runTask.finally(() => {
        if (creditLocks.get(key) === runTask) {
            creditLocks.delete(key);
        }
    }));

    return runTask;
}

export function normalizeDoc(doc) {
    if (!doc) return doc;
    return {
        ...doc,
        id: doc.$id
    };
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

    const payloadPrimary = {
        user_email: userEmail,
        project_name: commonName,
        original_prompt: promptText,
        enhanced_prompt: enhancedText,
        is_published: false
    };

    try {
        return await databases.createDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, ID.unique(), payloadPrimary);
    } catch (primaryError) {
        const payloadFallback = {
            user_email: userEmail,
            name: commonName,
            description: clipText(promptText, 1900),
            html_content: '',
            is_published: false
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

export async function createWebsiteVersionDocument({ projectId, code }) {
    const primaryPayload = {
        project_id: projectId,
        code: code || ''
    };

    try {
        return await databases.createDocument(DB_ID, WEBSITE_VERSIONS_COLLECTION_ID, ID.unique(), primaryPayload);
    } catch (primaryError) {
        const fallbackPayload = {
            project_id: projectId,
            html_content: code || ''
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

export async function updateWebsiteProjectCode(projectId, code, versionId) {
    const primaryPayload = {
        current_code: code || '',
        current_version_id: versionId
    };

    try {
        return await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, primaryPayload);
    } catch (primaryError) {
        const fallbackPayload = {
            html_content: code || '',
            current_version_id: versionId
        };

        try {
            return await databases.updateDocument(DB_ID, WEBSITE_PROJECTS_COLLECTION_ID, projectId, fallbackPayload);
        } catch (fallbackError) {
            const primaryMsg = primaryError?.message || 'Primary project update failed';
            const fallbackMsg = fallbackError?.message || 'Fallback project update failed';
            throw new Error(`Project update failed. ${primaryMsg} | ${fallbackMsg}`);
        }
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

export async function createWebsiteConversationMessage(projectId, role, content) {
    if (!projectId || !role || !content) return null;

    try {
        return await databases.createDocument(DB_ID, WEBSITE_CONVERSATIONS_COLLECTION_ID, ID.unique(), {
            project_id: projectId,
            role,
            content
        });
    } catch (error) {
        console.warn('Failed to save conversation message:', error?.message || error);
        return null;
    }
}

export async function getWebsiteCreditsDoc(userEmail) {
    const res = await databases.listDocuments(DB_ID, WEBSITE_USER_CREDITS_COLLECTION_ID, [
        Query.equal('user_email', userEmail),
        Query.limit(1)
    ]);

    return res.documents[0] || null;
}

async function getUserPlanStatus(userEmail) {
    const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
        Query.equal('email', userEmail),
        Query.limit(1)
    ]);

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

export async function refundWebsiteCreditsWithLock(userEmail, amount) {
    if (!userEmail) {
        return { success: false, error: 'User email is required' };
    }

    if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid refund amount' };
    }

    return queueByKey(userEmail, async () => {
        const creditsDoc = await getOrCreateWebsiteCreditsDoc(userEmail);

        const updated = await databases.updateDocument(
            DB_ID,
            WEBSITE_USER_CREDITS_COLLECTION_ID,
            creditsDoc.$id,
            {
                purchased_credits: (creditsDoc.purchased_credits || 0) + amount
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
    return Boolean(project && userEmail && project.user_email === userEmail);
}
