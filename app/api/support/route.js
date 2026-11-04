import { NextResponse } from 'next/server';
import { supportDatabases, SUPPORT_DB_ID, SUPPORT_COLLECTION_ID, SUPPORT_CONVERSATIONS_COLLECTION_ID, Query, ID, getAdminClient } from '@/services/appwrite-support';
import { SUPPORT_BUCKET_ID } from '@/services/appwrite-support-client';
import { Storage } from 'node-appwrite';
import { withUser } from '@/lib/request-context';

// Force dynamic route execution - clean build without InputFile
export const dynamic = 'force-dynamic';

export const GET = withUser(async function GET(request, ctx) {
    const { searchParams } = new URL(request.url);
    const userEmail = ctx.assertEmail(searchParams.get('email'));
    const conversationId = searchParams.get('conversationId');

    if (!userEmail) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        if (conversationId) {
            // Fetch conversation metadata and verify ownership
            let convDoc = null;
            try {
                convDoc = await supportDatabases.getDocument(
                    SUPPORT_DB_ID,
                    SUPPORT_CONVERSATIONS_COLLECTION_ID,
                    conversationId
                );
            } catch (err) {
                return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
            }

            if (!convDoc || convDoc.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
                return NextResponse.json({ error: 'Unauthorized conversation access' }, { status: 403 });
            }

            // Fetch messages for this conversation
            const response = await supportDatabases.listDocuments(
                SUPPORT_DB_ID, 
                SUPPORT_COLLECTION_ID, 
                [
                    Query.equal('conversationId', conversationId),
                    Query.orderAsc('createdAt'),
                    Query.limit(500)
                ]
            );

            // Filter out internal admin notes - customers must never see internal staff discussions
            const safeMessages = (response.documents || []).filter(m => !m.isInternal);

            return NextResponse.json({ 
                messages: safeMessages,
                conversation: convDoc
            });
        } else {
            // Fetch all conversations for the user
            const response = await supportDatabases.listDocuments(
                SUPPORT_DB_ID,
                SUPPORT_CONVERSATIONS_COLLECTION_ID,
                [
                    Query.equal('userEmail', userEmail),
                    Query.orderDesc('updatedAt'),
                    Query.limit(100)
                ]
            );
            return NextResponse.json({ conversations: response.documents || [] });
        }
    } catch (error) {
        console.error('Support fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch support data' }, { status: 500 });
    }
});

export const POST = withUser(async function POST(request, ctx) {
    try {
        const formData = await request.formData();
        const userEmail = ctx.assertEmail(formData.get('userEmail'));
        const message = String(formData.get('message') || '').trim();
        const conversationId = formData.get('conversationId');
        const action = formData.get('action');
        const imageFile = formData.get('image');
        const website = formData.get('website');
        const subject = String(formData.get('subject') || '').trim();
        const category = String(formData.get('category') || 'general').trim();
        const priority = String(formData.get('priority') || 'normal').trim();

        // Honeypot spam defense
        if (website) {
            return NextResponse.json({ success: true }, { status: 202 });
        }

        if (!userEmail || (!message && !imageFile)) {
            return NextResponse.json({ error: 'Email and message or image are required' }, { status: 400 });
        }

        const timestamp = new Date().toISOString();
        let targetConversationId = conversationId;
        
        let imageUrl = null;
        if (imageFile && imageFile.size > 0) {
            try {
                const storage = new Storage(getAdminClient());
                const buffer = Buffer.from(await imageFile.arrayBuffer());
                const uploadFile = new File([buffer], imageFile.name || 'support-attachment.png', {
                    type: imageFile.type || 'image/png',
                });
                const file = await storage.createFile(SUPPORT_BUCKET_ID, ID.unique(), uploadFile);
                imageUrl = `${process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_ENDPOINT}/storage/buckets/${SUPPORT_BUCKET_ID}/files/${file.$id}/view?project=${process.env.NEXT_PUBLIC_SUPPORT_APPWRITE_PROJECT_ID}`;
            } catch (imgErr) {
                console.error('[Support] Attachment upload failed:', imgErr);
            }
        }

        // Action 'create_conversation' or no conversationId means we create a brand new ticket
        if (!targetConversationId || action === 'create_conversation') {
            const rawTopic = subject || message || 'Image attachment';
            const topic = rawTopic.length > 80 ? rawTopic.substring(0, 77) + '...' : rawTopic;
            const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

            const newConv = await supportDatabases.createDocument(
                SUPPORT_DB_ID,
                SUPPORT_CONVERSATIONS_COLLECTION_ID,
                ID.unique(),
                {
                    userEmail,
                    status: 'open',
                    topic,
                    category: ['billing', 'credits', 'technical', 'account', 'feature', 'general'].includes(category) ? category : 'general',
                    priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
                    ticketId,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    hasUnreadMessages: true,
                }
            );
            targetConversationId = newConv.$id;
        } else {
            // Update existing conversation timestamp — verify ownership first
            let existingConv = null;
            try {
                existingConv = await supportDatabases.getDocument(
                    SUPPORT_DB_ID,
                    SUPPORT_CONVERSATIONS_COLLECTION_ID,
                    targetConversationId
                );
            } catch (_) {
                existingConv = null;
            }
            if (!existingConv || existingConv.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
                return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
            }

            const updates = {
                updatedAt: timestamp,
                hasUnreadMessages: true,
            };

            // If user replies to a resolved ticket, automatically change back to open
            if (existingConv.status === 'resolved') {
                updates.status = 'open';
            }

            await supportDatabases.updateDocument(
                SUPPORT_DB_ID,
                SUPPORT_CONVERSATIONS_COLLECTION_ID,
                targetConversationId,
                updates
            );
        }

        const msgData = {
            userEmail,
            conversationId: targetConversationId,
            message,
            sender: 'user',
            createdAt: timestamp,
            isRead: false,
            isInternal: false,
        };
        
        if (imageUrl) {
            msgData.imageUrl = imageUrl;
        }

        const newMsg = await supportDatabases.createDocument(
            SUPPORT_DB_ID,
            SUPPORT_COLLECTION_ID,
            ID.unique(),
            msgData
        );

        return NextResponse.json({ 
            success: true, 
            message: newMsg, 
            conversationId: targetConversationId 
        });
    } catch (error) {
        console.error('Support send error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
});

export const PUT = withUser(async function PUT(request, ctx) {
    try {
        const body = await request.json();
        const userEmail = ctx.assertEmail(body.userEmail);
        const { conversationId, action } = body;

        if (!conversationId) {
            return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
        }

        const convDoc = await supportDatabases.getDocument(
            SUPPORT_DB_ID,
            SUPPORT_CONVERSATIONS_COLLECTION_ID,
            conversationId
        );
        if (!convDoc || convDoc.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
            return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 403 });
        }

        const timestamp = new Date().toISOString();

        if (action === 'close') {
            await supportDatabases.updateDocument(
                SUPPORT_DB_ID,
                SUPPORT_CONVERSATIONS_COLLECTION_ID,
                conversationId,
                {
                    status: 'closed',
                    updatedAt: timestamp,
                }
            );

            // Record system notice
            await supportDatabases.createDocument(
                SUPPORT_DB_ID,
                SUPPORT_COLLECTION_ID,
                ID.unique(),
                {
                    userEmail,
                    conversationId,
                    message: 'Ticket closed by customer.',
                    sender: 'system',
                    createdAt: timestamp,
                    isRead: true,
                    isInternal: false,
                }
            );

            return NextResponse.json({ success: true, status: 'closed' });
        }

        if (action === 'reopen') {
            await supportDatabases.updateDocument(
                SUPPORT_DB_ID,
                SUPPORT_CONVERSATIONS_COLLECTION_ID,
                conversationId,
                {
                    status: 'open',
                    updatedAt: timestamp,
                    hasUnreadMessages: true,
                }
            );

            // Record system notice
            await supportDatabases.createDocument(
                SUPPORT_DB_ID,
                SUPPORT_COLLECTION_ID,
                ID.unique(),
                {
                    userEmail,
                    conversationId,
                    message: 'Ticket reopened by customer.',
                    sender: 'system',
                    createdAt: timestamp,
                    isRead: false,
                    isInternal: false,
                }
            );

            return NextResponse.json({ success: true, status: 'open' });
        }

        if (action === 'rate') {
            const rating = Math.min(Math.max(Number(body.rating) || 5, 1), 5);
            const feedback = String(body.feedback || '').slice(0, 500);

            await supportDatabases.updateDocument(
                SUPPORT_DB_ID,
                SUPPORT_CONVERSATIONS_COLLECTION_ID,
                conversationId,
                {
                    rating,
                    ratingFeedback: feedback,
                    updatedAt: timestamp,
                }
            );

            return NextResponse.json({ success: true, rating });
        }

        return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    } catch (err) {
        console.error('Support PUT error:', err);
        return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }
});
