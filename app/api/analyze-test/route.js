import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { prompt, filePaths, libId, conversationHistory } = await req.json();
        
        console.log('Test API called with:', { prompt, fileCount: filePaths?.length, libId, hasConversationHistory: !!conversationHistory });
        
        // Build a more contextual test response
        let contextInfo = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextInfo = ` I can see there are ${conversationHistory.length} previous messages in our conversation.`;
        }
        
        // Simple test response without complex file processing
        const response = {
            success: true,
            answer: `Test response: I received ${filePaths?.length || 0} file(s) and the prompt: "${prompt}".${contextInfo} This is a simplified response to test the API connection with conversation awareness. File analysis features are being configured.`,
            analyzedFiles: filePaths?.length || 0,
            processedFiles: filePaths?.map(f => ({
                fileName: f.fileName,
                fileType: f.fileType,
                contentLength: 0
            })) || []
        };
        
        return NextResponse.json(response);
        
    } catch (error) {
        console.error('Test API error:', error);
        return NextResponse.json(
            { 
                error: "Test API failed", 
                message: error.message 
            }, 
            { status: 500 }
        );
    }
}