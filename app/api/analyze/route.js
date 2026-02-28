import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI, createPartFromUri } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Initialize Gemini AI - Use the same approach as your Shared.jsx models
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
                    process.env.NEXT_PUBLIC_GEMINI_API_KEY_2 || 
                    process.env.GEMINI_API_KEY || 
                    process.env.GOOGLE_GENAI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Store for document summaries (in-memory cache - can be moved to database for persistence)
const documentSummaryCache = new Map();

export async function POST(req) {
    try {
        const { prompt, filePaths, libId, conversationHistory } = await req.json();
        
        // console.log('API analyze called with:', { prompt, fileCount: filePaths?.length, libId, hasConversationHistory: !!conversationHistory });

        // Validate required input
        if (!prompt && (!filePaths || filePaths.length === 0)) {
            return NextResponse.json(
                { error: "Either prompt or files must be provided" }, 
                { status: 400 }
            );
        }

        let extractedContent = [];
        let documentSummaries = [];
        let hasImages = false;
        let hasDocuments = false;
        
        // Process uploaded files if any
        if (filePaths && filePaths.length > 0) {
            // console.log('Processing files:', filePaths.map(f => f.fileName));
            
            for (const fileInfo of filePaths) {
                try {
                    // console.log(`Processing file: ${fileInfo.fileName}`);
                    
                    if (fileInfo.fileType.startsWith('image/')) {
                        // Handle images for vision analysis
                        hasImages = true;
                        const imageData = await extractImageForVision(fileInfo);
                        
                        extractedContent.push({
                            fileName: fileInfo.fileName,
                            fileType: fileInfo.fileType,
                            content: `Image file: ${fileInfo.fileName}`,
                            isImage: true,
                            imageData: imageData
                        });
                    } else if (fileInfo.fileType === 'application/pdf' || 
                               fileInfo.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                               fileInfo.fileType.startsWith('text/')) {
                        // Handle documents with advanced understanding
                        hasDocuments = true;
                        const documentAnalysis = await performDocumentUnderstanding(fileInfo);
                        
                        extractedContent.push({
                            fileName: fileInfo.fileName,
                            fileType: fileInfo.fileType,
                            content: documentAnalysis.fullContent,
                            summary: documentAnalysis.summary,
                            isImage: false,
                            isDocument: true,
                            documentContext: documentAnalysis.context
                        });
                        
                        documentSummaries.push({
                            fileName: fileInfo.fileName,
                            summary: documentAnalysis.summary,
                            context: documentAnalysis.context
                        });
                    } else {
                        // Handle other text files
                        const fileContent = await extractFileContent(fileInfo);
                        if (fileContent) {
                            extractedContent.push({
                                fileName: fileInfo.fileName,
                                fileType: fileInfo.fileType,
                                content: fileContent,
                                isImage: false,
                                isDocument: false
                            });
                        }
                    }
                    // console.log(`Successfully processed: ${fileInfo.fileName}`);
                } catch (error) {
                    console.error(`Error processing file ${fileInfo.fileName}:`, error);
                    // Continue with other files even if one fails
                    extractedContent.push({
                        fileName: fileInfo.fileName,
                        fileType: fileInfo.fileType,
                        content: `Error processing file: ${error.message}`,
                        isImage: fileInfo.fileType.startsWith('image/')
                    });
                }
            }
        }

        // Now use the existing LLM system to analyze the content
        // console.log('Starting AI analysis with your existing LLM system...');
        
        // Use gemini-2.5-flash for both text and vision (like your example)
        const modelToUse = 'gemini-2.5-flash';

        // Create advanced analysis prompt based on your example logic
        let analysisPrompt;
        
        // Build conversation context if available
        let conversationContext = '';
        if (conversationHistory && conversationHistory.length > 0) {
            conversationContext = '\n\n**Previous Conversation Context:**\n';
            conversationHistory.forEach((chat, index) => {
                if (chat.userSearchInput) {
                    conversationContext += `\nUser Question ${index + 1}: "${chat.userSearchInput}"`;
                }
                if (chat.aiResp) {
                    conversationContext += `\nAI Response ${index + 1}: ${chat.aiResp.substring(0, 300)}${chat.aiResp.length > 300 ? '...' : ''}`;
                }
                conversationContext += '\n---';
            });
            conversationContext += '\n\nPlease consider this conversation history when analyzing the files and answering the current question.\n\n';
        }
        
        // Build document context from summaries
        let documentContext = '';
        if (documentSummaries.length > 0) {
            documentContext = '\n\n**Document Summaries (for context):**\n';
            documentSummaries.forEach((docSummary, index) => {
                documentContext += `\n**Document ${index + 1}: ${docSummary.fileName}**\n`;
                documentContext += `Summary: ${docSummary.summary}\n`;
                if (docSummary.context) {
                    documentContext += `Key Information: ${docSummary.context}\n`;
                }
                documentContext += '---\n';
            });
            documentContext += '\n';
        }
        
        if (hasImages && prompt) {
          // Advanced image analysis with user question and conversation context
          analysisPrompt = `Analyze this image in comprehensive detail and answer the user's specific question within the context of our ongoing conversation.

${conversationContext}${documentContext}**Current User Question:** "${prompt}"

Please provide:
1. **Detailed Image Description**: Describe everything you see in the image - objects, people, text, colors, composition, setting
2. **Object and Element Identification**: List all identifiable items, text, signs, or written content
3. **Context and Scene Analysis**: Explain the setting, environment, and what's happening in the image
4. **Answer to User Question**: Provide a direct, comprehensive answer to their specific question based on your analysis${conversationContext ? ' and the conversation history' : ''}${documentContext ? ' and the document context' : ''}
5. **Contextual Insights**: Any additional observations that relate to the conversation history or might be helpful for follow-up questions

Format your response in clear, organized sections with detailed explanations.`;
        
        } else if (hasImages) {
          // General image analysis without specific question but with context
          analysisPrompt = `Describe this image in comprehensive detail${conversationContext ? ' considering our previous conversation' : ''}.

${conversationContext}${documentContext}Analyze and identify:

- All objects, people, and elements present
- Any text, signs, or written content visible
- Colors, composition, and visual style
- Setting, context, and environment
- What's happening in the scene
- Any notable details or features${conversationContext ? '\n- How this image relates to our previous conversation' : ''}${documentContext ? '\n- How this image relates to the documents analyzed' : ''}

Provide a thorough, descriptive analysis of everything you observe.`;
        
        } else if (hasDocuments) {
          // Document-based question answering with deep understanding
          analysisPrompt = `You are a document understanding expert. Based on the document summaries and full content provided, answer the user's question comprehensively.

${conversationContext}${documentContext}**Current User Question:** "${prompt || 'Please provide a comprehensive analysis of the document(s)'}"

**Instructions:**
1. **Use the document summaries** as context to understand the overall content
2. **Reference specific details** from the full document content when answering
3. **Consider the conversation history** to provide contextually relevant answers
4. **Cite information accurately** from the documents
5. **If the answer isn't in the documents**, clearly state that and provide the best possible guidance
6. **Anticipate follow-up questions** based on the document content and conversation flow

**Response Format:**
- Direct answer to the user's question
- Supporting evidence from the documents
- Additional relevant insights from the document analysis
- Clear citations indicating which document the information came from

Be precise, comprehensive, and base your answers strictly on the document content and summaries provided.`;
        
        } else {
          // Regular text analysis with conversation context
          analysisPrompt = `Analyze the provided file content and answer the user's question within the context of our conversation.

${conversationContext}${documentContext}**Current User Question:** "${prompt || 'Please analyze this content'}"

Please provide a comprehensive analysis that:
1. **Addresses the specific question** asked by the user
2. **Considers the conversation history** and any relevant context from previous exchanges
3. **Analyzes the file content** thoroughly and accurately
4. **Combines insights** from both the files and the conversation to provide the most helpful response
5. **Anticipates follow-up questions** based on the conversation flow

Format your response to be clear, well-organized, and directly useful for continuing our conversation.`;
        }

        // Prepare content for AI analysis using Google's advanced API
        let aiResponse;
        let actualModelUsed = modelToUse;

        try {
            // console.log('Sending request to Gemini AI with document understanding...');
            
            // Use the new @google/genai SDK for advanced document understanding
            const contents = [{ text: analysisPrompt }];

            // Process files and add their content
            for (const fileData of extractedContent) {
                if (fileData.isImage && fileData.imageData) {
                    // Add image for vision analysis (inline data approach)
                    contents.push({
                        inlineData: {
                            mimeType: fileData.imageData.mimeType,
                            data: fileData.imageData.data
                        }
                    });
                    
                    // Add context about the image
                    if (extractedContent.length > 1) {
                        contents.push({ 
                            text: `[Image: ${fileData.fileName}]` 
                        });
                    }
                } else if (fileData.isDocument && fileData.summary) {
                    // For documents, include both summary and relevant content
                    const documentPrompt = `**${fileData.fileName}**\n\n**Summary:** ${fileData.summary}\n\n**Full Content:**\n${fileData.content}`;
                    contents.push({
                        text: documentPrompt
                    });
                } else {
                    // Add regular text content
                    const contentText = `**File: ${fileData.fileName}** (${fileData.fileType})\n\n${fileData.content}`;
                    contents.push({
                        text: contentText
                    });
                }
            }

            // Generate AI response using the new SDK
            const response = await ai.models.generateContent({
                model: modelToUse,
                contents: contents
            });

            aiResponse = response.text;
            
            // console.log('Received response from Gemini AI with document understanding');

        } catch (error) {
            console.error('Document understanding error:', error);
            
            // Fallback to traditional approach
            // console.log('Falling back to traditional analysis approach...');
            
            try {
                const model = genAI.getGenerativeModel({ model: modelToUse });
                const contentParts = [{ text: analysisPrompt }];
                
                // Add simplified content
                for (const fileData of extractedContent) {
                    if (fileData.isImage && fileData.imageData) {
                        contentParts.push({
                            inlineData: {
                                mimeType: fileData.imageData.mimeType,
                                data: fileData.imageData.data
                            }
                        });
                    } else {
                        const preview = fileData.content.substring(0, 5000);
                        contentParts.push({
                            text: `${fileData.fileName}:\n${preview}${fileData.content.length > 5000 ? '...[truncated]' : ''}`
                        });
                    }
                }
                
                const result = await model.generateContent({
                    contents: [{
                        role: "user",
                        parts: contentParts
                    }]
                });

                const response = await result.response;
                aiResponse = response.text();
                
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                throw error; // Throw original error
            }
        }

        // Format results in searchResult structure (enhanced for better analysis)
        const searchResult = extractedContent.map((fileData, index) => ({
            type: 'file_analysis',
            title: fileData.fileName,
            snippet: fileData.isImage 
                ? `Advanced Image Analysis: ${fileData.fileName} - Comprehensive visual analysis with object detection and scene understanding`
                : fileData.isDocument
                ? `Document Understanding: ${fileData.summary || fileData.content.substring(0, 300)}${(!fileData.summary && fileData.content.length > 300) ? '...' : ''}`
                : `Document Analysis: ${fileData.content.substring(0, 300)}${fileData.content.length > 300 ? '...' : ''}`,
            description: fileData.isImage 
                ? `Image analyzed with advanced Gemini vision capabilities: ${fileData.fileName} (${fileData.fileType})`
                : fileData.isDocument
                ? `Document analyzed with advanced understanding: ${fileData.fileName} - Summary available for context-aware Q&A`
                : `Text content extracted and analyzed from ${fileData.fileName}`,
            url: filePaths[index]?.publicUrl || '',
            displayLink: 'Advanced File Analysis',
            fullContent: fileData.isImage ? null : fileData.content, // Full content for document analysis
            summary: fileData.summary || null, // Document summary for quick reference
            documentContext: fileData.documentContext || null, // Additional context from document understanding
            metadata: {
                fileType: fileData.fileType,
                fileName: fileData.fileName,
                size: fileData.isImage ? 'Image file' : `${fileData.content.length} characters`,
                analysisType: fileData.isImage ? 'advanced_vision' : fileData.isDocument ? 'document_understanding' : 'text_analysis',
                aiModel: actualModelUsed,
                contentPreview: fileData.isImage ? 'Advanced image analysis' : fileData.content.substring(0, 200),
                hasAdvancedAnalysis: true,
                hasSummary: !!fileData.summary,
                hasDocumentContext: !!fileData.documentContext
            },
            resultType: 'file',
            isFile: true,
            isImage: fileData.isImage,
            isDocument: fileData.isDocument || false,
            imageData: fileData.isImage ? fileData.imageData : null // Pass image data for further processing
        }));

        // Return response in the same format as your existing system (enhanced)
        return NextResponse.json({
            success: true,
            searchResult: searchResult,
            aiResponse: aiResponse,
            documentSummaries: documentSummaries, // Include summaries for follow-up questions
            analyzedFiles: extractedContent.length,
            processedFiles: extractedContent.map(f => ({
                fileName: f.fileName,
                fileType: f.fileType,
                contentLength: f.content?.length || 0,
                isImage: f.isImage,
                isDocument: f.isDocument || false,
                hasSummary: !!f.summary,
                analysisType: f.isImage ? 'advanced_vision' : f.isDocument ? 'document_understanding' : 'text_analysis'
            })),
            usedModel: actualModelUsed,
            modelApi: actualModelUsed,
            hasVisionAnalysis: hasImages && actualModelUsed.includes('2.5-flash'),
            hasDocumentUnderstanding: hasDocuments,
            analysisFeatures: {
                advancedImageAnalysis: hasImages,
                documentUnderstanding: hasDocuments,
                documentSummaries: documentSummaries.length > 0,
                contextAwareQA: documentSummaries.length > 0 || conversationHistory?.length > 0,
                combinedAnalysis: hasImages && extractedContent.some(f => !f.isImage),
                userPromptIntegration: !!prompt
            }
        });

    } catch (error) {
        console.error('File analysis API Error:', error);
        
        // Handle specific Gemini API errors
        let errorMessage = error.message;
        if (error.message?.includes('models/gemini') && error.message?.includes('not found')) {
            errorMessage = 'Gemini model not available. Please check your API configuration.';
        } else if (error.message?.includes('API key')) {
            errorMessage = 'Invalid Gemini API key. Please check your environment variables.';
        } else if (error.message?.includes('quota')) {
            errorMessage = 'Gemini API quota exceeded. Please try again later.';
        }
        
        return NextResponse.json(
            { 
                error: "File analysis failed", 
                message: errorMessage,
                originalError: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }, 
            { status: 500 }
        );
    }
}

// Extract image content for vision analysis
async function extractImageForVision(fileInfo) {
    try {
        // console.log(`Extracting image for vision: ${fileInfo.fileName} at path: ${fileInfo.path}`);
        
        // Download file from Supabase Storage
        const { data: fileData, error } = await supabase.storage
            .from('mainStorage')
            .download(fileInfo.path);

        if (error) {
            console.error('Supabase storage download error:', error);
            throw new Error(`Failed to download file: ${error.message}`);
        }

        if (!fileData) {
            throw new Error('No file data received from storage');
        }

        const buffer = await fileData.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');

        // console.log(`Image converted to base64, size: ${buffer.byteLength} bytes`);

        return {
            mimeType: fileInfo.fileType,
            data: base64Data
        };

    } catch (error) {
        console.error('Image extraction error:', error);
        throw error;
    }
}

// Advanced Document Understanding using Google's Gemini API
// Implements robust document analysis with summarization and context extraction
async function performDocumentUnderstanding(fileInfo) {
    try {
        console.log(`Performing document understanding for: ${fileInfo.fileName}`);
        console.log(`File path: ${fileInfo.path}, File type: ${fileInfo.fileType}`);
        
        // Check if we have a cached summary for this document
        const cacheKey = `${fileInfo.path}_${fileInfo.fileName}`;
        if (documentSummaryCache.has(cacheKey)) {
            console.log('Using cached document summary');
            return documentSummaryCache.get(cacheKey);
        }
        
        // Download file from Supabase Storage
        console.log(`Downloading from Supabase storage: ${fileInfo.path}`);
        const { data: fileData, error } = await supabase.storage
            .from('mainStorage')
            .download(fileInfo.path);

        if (error) {
            console.error('Supabase download error:', error);
            throw new Error(`Failed to download file: ${error.message}`);
        }

        if (!fileData) {
            throw new Error('No file data received from Supabase storage');
        }

        const buffer = await fileData.arrayBuffer();
        console.log(`File downloaded successfully. Size: ${buffer.byteLength} bytes`);
        
        // SKIP text extraction - use Gemini's native document understanding
        // This is more reliable and works directly with PDFs, DOCX, etc.
        console.log('Using Gemini native document understanding (no text extraction needed)');
        
        const base64Data = Buffer.from(buffer).toString('base64');
        console.log(`Converted to base64. Length: ${base64Data.length} characters`);
        
        const contents = [
            { text: "Analyze this document comprehensively and provide:\n\n1. A detailed summary of the document (3-5 paragraphs)\n2. Key topics and themes\n3. Important facts, figures, and data points\n4. Main arguments or conclusions\n5. Any notable sections or chapters\n\nFormat your response as:\nSUMMARY: [detailed summary]\nKEY TOPICS: [list of topics]\nIMPORTANT INFORMATION: [key facts and data]\nCONCLUSIONS: [main takeaways]" },
            {
                inlineData: {
                    mimeType: fileInfo.fileType,
                    data: base64Data
                }
            }
        ];

        console.log('Sending document to Gemini for native analysis...');
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents
        });

        const analysisText = response.text;
        console.log('Received comprehensive analysis from Gemini');
        
        // Parse the response to extract structured information
        const summary = extractSection(analysisText, 'SUMMARY') || analysisText.substring(0, 1000);
        const keyTopics = extractSection(analysisText, 'KEY TOPICS') || '';
        const importantInfo = extractSection(analysisText, 'IMPORTANT INFORMATION') || '';
        const conclusions = extractSection(analysisText, 'CONCLUSIONS') || '';
        
        const documentAnalysis = {
            fullContent: analysisText, // Use Gemini's analysis as the full content
            summary: summary,
            context: `Key Topics: ${keyTopics}\n\nImportant Information: ${importantInfo}\n\nConclusions: ${conclusions}`,
            analysisMethod: 'gemini_native_understanding',
            rawAnalysis: analysisText
        };
        
        // Cache the result
        documentSummaryCache.set(cacheKey, documentAnalysis);
        console.log('Document analysis cached successfully');
        
        return documentAnalysis;

    } catch (error) {
        console.error('Document understanding error:', error);
        
        // Fallback: Try simpler Gemini request
        try {
            console.log('Trying fallback with simpler prompt...');
            const { data: fileData } = await supabase.storage
                .from('mainStorage')
                .download(fileInfo.path);
            
            const arrayBuffer = await fileData.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');
            
            const simpleContents = [
                { text: "Please extract and summarize the main content from this document. Provide key information and main points." },
                {
                    inlineData: {
                        mimeType: fileInfo.fileType,
                        data: base64Data
                    }
                }
            ];
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: simpleContents
            });
            
            const content = response.text;
            console.log('Fallback extraction successful');
            
            return {
                fullContent: content,
                summary: `${fileInfo.fileName}: ${content.substring(0, 500)}...`,
                context: content.substring(0, 500) + '...',
                analysisMethod: 'fallback_simple_extraction',
                rawAnalysis: content
            };
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw new Error(`Document understanding failed: ${error.message}`);
        }
    }
}

// Helper function to extract sections from formatted text
function extractSection(text, sectionName) {
    try {
        const regex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n(?:SUMMARY|KEY TOPICS|IMPORTANT INFORMATION|CONCLUSIONS):|$)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    } catch (error) {
        return '';
    }
}

// Extract content from different file types
async function extractFileContent(fileInfo) {
    try {
        // console.log(`Extracting content from ${fileInfo.fileName} at path: ${fileInfo.path}`);
        
        // Download file from Supabase Storage
        const { data: fileData, error } = await supabase.storage
            .from('mainStorage')
            .download(fileInfo.path);

        if (error) {
            console.error('Supabase storage download error:', error);
            throw new Error(`Failed to download file: ${error.message}`);
        }

        if (!fileData) {
            throw new Error('No file data received from storage');
        }

        const buffer = await fileData.arrayBuffer();
        
        // Extract content based on file type
        if (fileInfo.fileType === 'application/pdf') {
            return await extractPdfContent(buffer);
        } else if (fileInfo.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await extractDocxContent(buffer);
        } else if (fileInfo.fileType === 'text/csv' || fileInfo.fileName.endsWith('.csv')) {
            return await extractCsvContent(buffer);
        } else if (fileInfo.fileType.startsWith('text/') || 
                   fileInfo.fileName.endsWith('.txt') || 
                   fileInfo.fileName.endsWith('.md')) {
            return new TextDecoder().decode(buffer);
        } else {
            return await extractImageContent(buffer, fileInfo.fileType);
        }
    } catch (error) {
        console.error(`Error extracting content from ${fileInfo.fileName}:`, error);
        throw new Error(`Content extraction failed: ${error.message}`);
    }
}

// Extract PDF content
async function extractPdfContent(arrayBuffer) {
    try {
        const pdfParse = (await import('pdf-parse')).default;
        // Convert ArrayBuffer to Node.js Buffer
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        throw new Error(`PDF extraction failed: ${error.message}`);
    }
}

// Extract DOCX content
async function extractDocxContent(arrayBuffer) {
    try {
        const mammoth = await import('mammoth');
        // Convert ArrayBuffer to Node.js Buffer
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } catch (error) {
        throw new Error(`DOCX extraction failed: ${error.message}`);
    }
}

// Extract CSV content with smart formatting
async function extractCsvContent(buffer) {
    try {
        const text = new TextDecoder().decode(buffer);
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length === 0) return 'Empty CSV file';
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const sampleRows = lines.slice(1, Math.min(6, lines.length)); // Show first 5 data rows
        
        let csvText = `CSV file with ${lines.length - 1} rows and columns: ${headers.join(', ')}\n\n`;
        csvText += 'Sample data:\n';
        sampleRows.forEach((row, index) => {
            const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
            csvText += `Row ${index + 1}: ` + headers.map((h, i) => `${h}: ${values[i] || 'N/A'}`).join(', ') + '\n';
        });
        
        return csvText;
    } catch (error) {
        // Fallback to plain text if CSV parsing fails
        return new TextDecoder().decode(buffer);
    }
}

// Image content placeholder (for non-vision models)
async function extractImageContent(buffer, fileType) {
    try {
        return `[Image file: ${fileType}, size: ${buffer.byteLength} bytes. This is an image file that requires vision analysis.]`;
    } catch (error) {
        throw new Error(`Image processing failed: ${error.message}`);
    }
}