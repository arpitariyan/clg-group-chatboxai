import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { storage, BUCKET_ID, databases, DB_ID, Query, ID } from '@/services/appwrite-admin';
import { DOCUMENT_CONTEXT_COLLECTION_ID } from '@/services/appwrite-collections';

const geminiApiKeys = [
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_4,
    // process.env.GEMINI_API_KEY,
    // process.env.GOOGLE_GENAI_API_KEY,
].filter((key, index, arr) => !!key && arr.indexOf(key) === index);

// Keep model list aligned with verified working models from analysisTest.js.
const geminiModelCandidates = [
    'gemini-2.5-flash'
];

// In-memory key health cache to avoid retrying obviously bad keys on every request.
const geminiKeyCooldownUntil = new Map();

function getKeySuffix(apiKey = '') {
    return String(apiKey).slice(-6);
}

function isKeyInCooldown(apiKey) {
    const until = geminiKeyCooldownUntil.get(apiKey);
    return Number.isFinite(until) && Date.now() < until;
}

function setKeyCooldown(apiKey, error) {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.code || 0);

    // Permanent-ish key/project issues: longer cooldown.
    if (
        status === 401 ||
        message.includes('api_key_invalid') ||
        message.includes('api key expired') ||
        message.includes('consumer_suspended') ||
        message.includes('service_disabled') ||
        message.includes('api_key_service_blocked') ||
        message.includes('permission denied')
    ) {
        geminiKeyCooldownUntil.set(apiKey, Date.now() + 30 * 60 * 1000);
        return;
    }

    // Quota is often temporary: short cooldown.
    if (status === 429 || message.includes('resource_exhausted') || message.includes('quota')) {
        geminiKeyCooldownUntil.set(apiKey, Date.now() + 60 * 1000);
    }
}

const MAX_DOCUMENT_CHARS = 32000;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 250;
const MAX_CHUNKS_PER_FILE = 40;
const MAX_RETRIEVED_CHUNKS = 6;

function normalizeForRetrieval(text = '') {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(text = '') {
    return normalizeForRetrieval(text)
        .split(' ')
        .filter((token) => token.length >= 3);
}

function computeContentHash(value = '') {
    return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function createTextChunks(text = '', chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const source = String(text || '').trim();
    if (!source) return [];

    const chunks = [];
    let start = 0;
    let index = 0;

    while (start < source.length && index < MAX_CHUNKS_PER_FILE) {
        const end = Math.min(start + chunkSize, source.length);
        const chunk = source.slice(start, end).trim();

        if (chunk) {
            chunks.push({
                chunkIndex: index,
                chunkText: chunk,
                chunkKeywords: tokenize(chunk).slice(0, 60).join(' '),
            });
        }

        if (end >= source.length) break;
        start = Math.max(end - overlap, start + 1);
        index += 1;
    }

    return chunks;
}

function rankChunksForPrompt(question = '', rows = []) {
    const queryTokens = new Set(tokenize(question));
    if (!queryTokens.size) return rows.slice(0, MAX_RETRIEVED_CHUNKS);

    const scored = rows
        .map((row) => {
            const keywords = tokenize(row.chunkKeywords || row.chunkText || '');
            let overlap = 0;
            for (const token of keywords) {
                if (queryTokens.has(token)) overlap += 1;
            }

            // Slightly prioritize early chunks because titles/abstracts are often there.
            const positionBonus = Math.max(0, 3 - Number(row.chunkIndex || 0));
            return {
                row,
                score: overlap + positionBonus,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RETRIEVED_CHUNKS)
        .map((entry) => entry.row);

    return scored;
}

async function listDocumentContextRows({ libId, ownerEmail, filePath = null }) {
    if (!DB_ID || !DOCUMENT_CONTEXT_COLLECTION_ID || !libId || !ownerEmail) return [];

    const queries = [
        Query.equal('libId', String(libId)),
        Query.equal('ownerEmail', String(ownerEmail)),
        Query.limit(200),
    ];

    if (filePath) {
        queries.push(Query.equal('filePath', String(filePath)));
    }

    try {
        const result = await databases.listDocuments(DB_ID, DOCUMENT_CONTEXT_COLLECTION_ID, queries);
        return result?.documents || [];
    } catch (error) {
        console.warn('Document context listing failed, continuing without persisted retrieval:', error?.message || error);
        return [];
    }
}

async function persistDocumentChunks({
    libId,
    ownerEmail,
    fileInfo,
    analysis,
}) {
    if (!DB_ID || !DOCUMENT_CONTEXT_COLLECTION_ID || !libId || !ownerEmail || !fileInfo?.path) {
        return { persisted: false, contextVersion: null, chunks: [] };
    }

    const combinedText = String(analysis?.fullContent || analysis?.summary || '').slice(0, MAX_DOCUMENT_CHARS);
    const chunks = createTextChunks(combinedText);
    if (!chunks.length) {
        return { persisted: false, contextVersion: null, chunks: [] };
    }

    const contextVersion = computeContentHash(`${fileInfo.path}::${combinedText.slice(0, 4000)}`);

    const existingRows = await listDocumentContextRows({
        libId,
        ownerEmail,
        filePath: fileInfo.path,
    });

    const existingByIndex = new Map(
        existingRows
            .filter((row) => row?.contextVersion === contextVersion)
            .map((row) => [Number(row.chunkIndex), row])
    );

    try {
        for (const chunk of chunks) {
            const payload = {
                libId: String(libId),
                ownerEmail: String(ownerEmail),
                filePath: String(fileInfo.path),
                fileName: String(fileInfo.fileName || 'unknown-file'),
                fileType: String(fileInfo.fileType || 'application/octet-stream'),
                contextVersion,
                chunkIndex: Number(chunk.chunkIndex),
                chunkText: String(chunk.chunkText),
                chunkKeywords: String(chunk.chunkKeywords || ''),
                sourceType: 'document_understanding',
                updatedAt: new Date().toISOString(),
            };

            const existing = existingByIndex.get(Number(chunk.chunkIndex));
            if (existing?.$id) {
                await databases.updateDocument(DB_ID, DOCUMENT_CONTEXT_COLLECTION_ID, existing.$id, payload);
            } else {
                await databases.createDocument(DB_ID, DOCUMENT_CONTEXT_COLLECTION_ID, ID.unique(), {
                    ...payload,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        return { persisted: true, contextVersion, chunks };
    } catch (error) {
        console.warn('Document context persistence failed, continuing with in-memory flow:', error?.message || error);
        return { persisted: false, contextVersion, chunks };
    }
}

async function retrieveDocumentContext({ libId, ownerEmail, question }) {
    const rows = await listDocumentContextRows({ libId, ownerEmail });
    if (!rows.length) return { chunks: [], contextVersion: null };

    const best = rankChunksForPrompt(question, rows);
    const contextVersion = best[0]?.contextVersion || rows[0]?.contextVersion || null;
    return { chunks: best, contextVersion };
}

function isQuotaError(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
        error?.status === 429 ||
        error?.code === 429 ||
        message.includes('resource_exhausted') ||
        message.includes('quota') ||
        message.includes('too many requests')
    );
}

function isRetryableKeyError(error) {
    const message = String(error?.message || '').toLowerCase();
    const details = JSON.stringify(error?.errorDetails || error?.details || '').toLowerCase();
    const status = Number(error?.status || error?.code || 0);

    return (
        status === 401 ||
        status === 403 ||
        status === 400 ||
        message.includes('service_disabled') ||
        message.includes('api has not been used') ||
        message.includes('permission denied') ||
        message.includes('api key not valid') ||
        message.includes('api key expired') ||
        message.includes('api_key_invalid') ||
        message.includes('consumer_suspended') ||
        message.includes('has been suspended') ||
        message.includes('invalid api key') ||
        message.includes('forbidden') ||
        details.includes('api_key_invalid') ||
        details.includes('consumer_suspended') ||
        details.includes('service_disabled')
    );
}

async function generateWithGeminiFailover(contents, preferredModels = geminiModelCandidates) {
    if (!geminiApiKeys.length) {
        throw new Error('No Gemini API keys configured.');
    }

    const models = Array.isArray(preferredModels) && preferredModels.length > 0
        ? preferredModels
        : geminiModelCandidates;

    let lastError;

    for (const modelName of models) {
        for (const apiKey of geminiApiKeys) {
            const keySuffix = getKeySuffix(apiKey);

            if (isKeyInCooldown(apiKey)) {
                continue;
            }

            try {
                const aiClient = new GoogleGenAI({ apiKey });
                const response = await aiClient.models.generateContent({
                    model: modelName,
                    contents,
                });

                const text = response?.text || '';
                if (text?.trim()) {
                    return { text, model: modelName };
                }

                throw new Error(`Empty Gemini response for model ${modelName}`);
            } catch (primaryError) {
                lastError = primaryError;

                try {
                    const legacy = new GoogleGenerativeAI(apiKey);
                    const model = legacy.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent({
                        contents: [{ role: 'user', parts: contents }],
                    });
                    const fallbackText = await result?.response?.text?.();

                    if (fallbackText?.trim()) {
                        return { text: fallbackText, model: modelName };
                    }
                } catch (legacyError) {
                    lastError = legacyError;
                }

                setKeyCooldown(apiKey, lastError);

                if (isQuotaError(lastError) || isRetryableKeyError(lastError)) {
                    console.warn(`Gemini key/model attempt failed, rotating key. model=${modelName}, key=*${keySuffix}`, lastError?.message || lastError);
                    continue;
                }

                if (!isQuotaError(lastError)) {
                    throw lastError;
                }
            }
        }
    }

    throw lastError || new Error('Gemini analysis failed after failover attempts.');
}

// Store for document summaries (in-memory cache - can be moved to database for persistence)
const documentSummaryCache = new Map();

export async function POST(req) {
    try {
        const { prompt, filePaths, libId, userEmail, conversationHistory } = await req.json();
        const ownerEmail = String(userEmail || '').trim().toLowerCase();
        
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
        const persistedContextVersions = [];
        
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

                        const persistedContext = await persistDocumentChunks({
                            libId,
                            ownerEmail,
                            fileInfo,
                            analysis: documentAnalysis,
                        });
                        if (persistedContext?.contextVersion) {
                            persistedContextVersions.push(persistedContext.contextVersion);
                        }
                        
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

        let retrievedChunks = [];
        let retrievedContextVersion = null;
        if (hasDocuments && libId && ownerEmail && prompt?.trim()) {
            const retrieval = await retrieveDocumentContext({
                libId,
                ownerEmail,
                question: prompt,
            });
            retrievedChunks = retrieval?.chunks || [];
            retrievedContextVersion = retrieval?.contextVersion || null;
        }

        if (retrievedChunks.length > 0) {
            documentContext += '\n\n**Retrieved Document Context (most relevant to current question):**\n';
            retrievedChunks.forEach((chunk, index) => {
                documentContext += `\n[Source ${index + 1}] ${chunk.fileName}#${chunk.chunkIndex}\n`;
                documentContext += `${String(chunk.chunkText || '').slice(0, 1800)}\n`;
                documentContext += '---\n';
            });
            documentContext += '\nUse these retrieved sections as the primary evidence for the answer.\n';
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
1. **Use the document summaries and retrieved sections** as context to understand the overall content
2. **Reference specific details** from the full document content when answering
3. **Consider the conversation history** to provide contextually relevant answers
4. **Cite information accurately** from the documents
5. **Whenever possible, cite source labels** in this format: [fileName#chunkIndex]
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

        // console.log('Sending request to Gemini AI with document understanding...');
        const contents = [{ text: analysisPrompt }];

        // Process files and add their content
        for (const fileData of extractedContent) {
            if (fileData.isImage && fileData.imageData) {
                contents.push({
                    inlineData: {
                        mimeType: fileData.imageData.mimeType,
                        data: fileData.imageData.data
                    }
                });

                if (extractedContent.length > 1) {
                    contents.push({ text: `[Image: ${fileData.fileName}]` });
                }
            } else if (fileData.isDocument && fileData.summary) {
                const fullContentPreview = String(fileData.content || '').slice(0, 8000);
                const documentPrompt = `**${fileData.fileName}**\n\n**Summary:** ${fileData.summary}\n\n**Extracted Content Preview:**\n${fullContentPreview}`;
                contents.push({ text: documentPrompt });
            } else {
                const contentText = `**File: ${fileData.fileName}** (${fileData.fileType})\n\n${fileData.content}`;
                contents.push({ text: contentText });
            }
        }

        const generated = await generateWithGeminiFailover(contents, [modelToUse, ...geminiModelCandidates.filter((m) => m !== modelToUse)]);
        aiResponse = generated.text;
        actualModelUsed = generated.model || modelToUse;

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
            documentContextVersion: retrievedContextVersion || persistedContextVersions[0] || null,
            retrievedChunkCount: retrievedChunks.length,
            fileContextUsed: retrievedChunks.length > 0,
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
                retrievedContextChunks: retrievedChunks.length,
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
        } else if (error.message?.includes('API key') || isRetryableKeyError(error)) {
            errorMessage = 'Gemini API key/project access issue (disabled API, invalid key, or forbidden). Please verify keys and enable Generative Language API for the key project.';
        } else if (error.message?.includes('quota') || isQuotaError(error)) {
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
        
        // Download file from Appwrite Storage
        const fileData = await storage.getFileDownload(BUCKET_ID, fileInfo.path);
        const buffer = Buffer.from(fileData);
        const base64Data = buffer.toString('base64');

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
        
        // Download file from Appwrite Storage
        console.log(`Downloading from Appwrite storage: ${fileInfo.path}`);
        const fileData = await storage.getFileDownload(BUCKET_ID, fileInfo.path);
        const buffer = Buffer.from(fileData);
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
        const generated = await generateWithGeminiFailover(contents, ['gemini-2.5-flash', 'gemini-2.0-flash']);
        const analysisText = generated.text;
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
            const fileData = await storage.getFileDownload(BUCKET_ID, fileInfo.path);
            const base64Data = Buffer.from(fileData).toString('base64');
            
            const simpleContents = [
                { text: "Please extract and summarize the main content from this document. Provide key information and main points." },
                {
                    inlineData: {
                        mimeType: fileInfo.fileType,
                        data: base64Data
                    }
                }
            ];
            
            const generated = await generateWithGeminiFailover(simpleContents, ['gemini-2.5-flash', 'gemini-2.0-flash']);
            const content = generated.text;
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
        
        // Download file from Appwrite Storage
        const fileData = await storage.getFileDownload(BUCKET_ID, fileInfo.path);
        const buffer = Buffer.from(fileData);
        
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