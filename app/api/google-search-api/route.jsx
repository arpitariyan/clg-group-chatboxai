import axios from "axios";
import { NextResponse } from "next/server";

const asNonEmpty = (value) => {
    const normalized = String(value || '').trim();
    return normalized ? normalized : null;
};

const uniqueNonEmpty = (values = []) => {
    return [...new Set(values.map(asNonEmpty).filter(Boolean))];
};

export async function POST(req) {
    let searchInput = '';
    try {
        // console.log('Google Search API called');
        const body = await req.json();
        searchInput = body?.searchInput || '';
        const { searchType } = body;
        // console.log('Search request:', { searchInput, searchType });

        // Validate required input
        if (!searchInput) {
            console.error('No search input provided');
            return NextResponse.json(
                { error: "Search input is required" },
                { status: 400 }
            );
        }

        const googleSearchEnabled = String(process.env.GOOGLE_CUSTOM_SEARCH_ENABLED || 'true').trim().toLowerCase() !== 'false';

        // Google CSE credentials (preferred aliases + backward-compatible fallbacks).
        const googleApiKeys = uniqueNonEmpty([
            process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
            process.env.GOOGLE_API_KEY,
            process.env.GOOGLE_API_KEY_2,
            process.env.GOOGLE_API_KEY_3,
            process.env.GOOGLE_API_KEY_4,
            process.env.GOOGLE_API_KEY_5
        ]);

        const googleCxIds = uniqueNonEmpty([
            process.env.GOOGLE_CUSTOM_SEARCH_CX_ID,
            process.env.GOOGLE_CX_ID,
            process.env.GOOGLE_CX_ID_2,
            process.env.GOOGLE_CX_ID_3,
            process.env.GOOGLE_CX_ID_4
        ]);

        // console.log('Available API keys:', {
        //     googleKeys: googleApiKeys.length,
        //     googleCxIds: googleCxIds.length,
        //     geminiKeys: geminiApiKeys.length
        // });

        // Fast opt-out switch while keys/CX are being fixed.
        if (!googleSearchEnabled) {
            return NextResponse.json(
                {
                    success: false,
                    googleApiUnavailable: true,
                    message: "Google search is disabled by configuration. Using direct AI model for response.",
                    searchQuery: searchInput,
                    categorizedResults: { web: [], images: [], videos: [], all: [] }
                },
                { status: 200 }
            );
        }

        // Check if we have at least one Google API key
        if (googleApiKeys.length === 0 || googleCxIds.length === 0) {
            console.warn('Google API credentials not configured - will use direct AI model fallback');
            // Return a signal to use direct AI model instead of failing
            return NextResponse.json(
                { 
                    success: false,
                    googleApiUnavailable: true,
                    message: "Google API credentials not configured. Using direct AI model for response.",
                    searchQuery: searchInput,
                    categorizedResults: {
                        web: [],
                        images: [],
                        videos: [],
                        all: []
                    }
                },
                { status: 200 } // Return 200 with flag so frontend knows to fallback
            );
        }

        let lastSuccessfulGoogleKeyIndex = null;
        const mixedResults = [];
        const loggedGoogleFailures = new Set();

        // Function to make search request with automatic key rotation
        const makeSearchRequestWithFallback = async (searchParams) => {
            let lastError = null;

            for (let keyIndex = 0; keyIndex < googleApiKeys.length; keyIndex++) {
                try {
                    const credentials = {
                        apiKey: googleApiKeys[keyIndex],
                        cxId: googleCxIds[Math.min(keyIndex, googleCxIds.length - 1)]
                    };
                    const requestParams = {
                        ...searchParams,
                        key: credentials.apiKey,
                        cx: credentials.cxId
                    };

                    // console.log(`Attempting Google Search with key ${currentGoogleKeyIndex + 1}/${googleApiKeys.length}`);

                    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                        params: requestParams,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000,
                    });

                    // console.log(`Google Search API success with key ${currentGoogleKeyIndex + 1}`);
                    // If successful, return the response
                    lastSuccessfulGoogleKeyIndex = keyIndex;
                    return response;

                } catch (error) {
                    lastError = error;
                    const failMessage = error.response?.data?.error?.message || error.message;
                    const failSignature = `${keyIndex}:${failMessage}`;

                    if (!loggedGoogleFailures.has(failSignature)) {
                        loggedGoogleFailures.add(failSignature);
                        console.warn(`Google API key ${keyIndex + 1} failed:`, failMessage);
                    }
                }
            }
            
            // If we get here, all keys failed
            // console.error('All Google API keys failed');
            throw lastError;
        };

        // console.log('Starting web search...');

        // 1. Get web search results
        const webParams = {
            q: searchInput,
            num: 10,
        };

        // 2. Get image search results
        const imageParams = {
            q: searchInput,
            searchType: 'image',
            num: 8,
        };

        // Make parallel requests for mixed results
        // console.log('Making parallel requests for web and image search...');
        const [webResults, imageResults] = await Promise.allSettled([
            makeSearchRequestWithFallback(webParams),
            makeSearchRequestWithFallback(imageParams)
        ]);

        // Process web results
        if (webResults.status === 'fulfilled' && webResults.value.data.items) {
            // console.log(`Web search returned ${webResults.value.data.items.length} results`);
            webResults.value.data.items.forEach((item, index) => {
                mixedResults.push({
                    ...item,
                    resultType: 'web',
                    originalIndex: index,
                    displayIndex: mixedResults.length
                });
            });
        } else {
            console.warn('Web search failed:', webResults.reason?.message || 'Unknown error');
        }

        // Process image results
        if (imageResults.status === 'fulfilled' && imageResults.value.data.items) {
            // console.log(`Image search returned ${imageResults.value.data.items.length} results`);
            imageResults.value.data.items.forEach((item, index) => {
                mixedResults.push({
                    ...item,
                    resultType: 'image',
                    originalIndex: index,
                    displayIndex: mixedResults.length
                });
            });
        } else {
            console.warn('Image search failed:', imageResults.reason?.message || 'Unknown error');
        }

        // Add video search using site:youtube.com for better video results
        const videoParams = {
            q: `${searchInput} site:youtube.com OR site:vimeo.com`,
            num: 5,
        };

        // console.log('Starting video search...');
        try {
            const videoResults = await makeSearchRequestWithFallback(videoParams);
            if (videoResults.data.items) {
                // console.log(`Video search returned ${videoResults.data.items.length} results`);
                videoResults.data.items.forEach((item, index) => {
                    // Only add if it's actually a video link
                    if (item.link.includes('youtube.com') || item.link.includes('vimeo.com')) {
                        mixedResults.push({
                            ...item,
                            resultType: 'video',
                            originalIndex: index,
                            displayIndex: mixedResults.length
                        });
                    }
                });
            }
        } catch (videoError) {
            // console.log('Video search failed:', videoError.message);
        }

        // Shuffle results for mixed display (optional)
        const shuffleMixedResults = (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        // Create mixed results array (you can uncomment the shuffle if you want random order)
        // const finalResults = shuffleMixedResults(mixedResults);
        const finalResults = mixedResults;

        if (webResults.status === 'rejected' && imageResults.status === 'rejected' && finalResults.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    googleApiUnavailable: true,
                    message: "Google Search API credentials are invalid or not enabled. Using direct AI model for response.",
                    searchQuery: searchInput,
                    categorizedResults: { web: [], images: [], videos: [], all: [] },
                    errors: {
                        webSearchFailed: true,
                        imageSearchFailed: true
                    }
                },
                { status: 200 }
            );
        }

        // Separate results by type for easy access
        const categorizedResults = {
            all: finalResults,
            web: finalResults.filter(item => item.resultType === 'web'),
            images: finalResults.filter(item => item.resultType === 'image'),
            videos: finalResults.filter(item => item.resultType === 'video')
        };

        // console.log('Search completed successfully:', {
        //     totalResults: finalResults.length,
        //     webResults: categorizedResults.web.length,
        //     imageResults: categorizedResults.images.length,
        //     videoResults: categorizedResults.videos.length
        // });

        // Return response with better error information
        const response = {
            success: true,
            searchQuery: searchInput,
            searchType: searchType || 'search',
            totalResults: finalResults.length,
            mixedResults: finalResults,
            categorizedResults: categorizedResults,
            searchInformation: {
                webResults: webResults.status === 'fulfilled' ? webResults.value.data.searchInformation : null,
                imageResults: imageResults.status === 'fulfilled' ? imageResults.value.data.searchInformation : null,
            },
            // Include information about which keys were used
            apiKeyInfo: {
                googleKeyUsed: Number.isInteger(lastSuccessfulGoogleKeyIndex) ? lastSuccessfulGoogleKeyIndex + 1 : null,
                totalGoogleKeys: googleApiKeys.length,
            },
            errors: {
                webSearchFailed: webResults.status === 'rejected',
                imageSearchFailed: imageResults.status === 'rejected'
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Google Search API Error:', error);
        
        // Handle different types of errors with more specific messages
        // For most errors, return fallback flag to use direct AI model instead of failing
        let errorResponse = {
            success: false,
            googleApiUnavailable: true, // Signal to use direct AI model fallback
            message: "Google Search API failed. Using direct AI model for response.",
            searchQuery: searchInput,
            originalError: error.message || "Unknown error occurred",
            categorizedResults: {
                web: [],
                images: [],
                videos: [],
                all: []
            }
        };
        
        if (error.response) {
            errorResponse.status = error.response.status;
            errorResponse.statusText = error.response.statusText;
            
            if (error.response.status === 400) {
                errorResponse.message = "Invalid search request. Using direct AI model.";
            } else if (error.response.status === 401 || error.response.status === 403) {
                errorResponse.message = "Google API authentication failed. Using direct AI model.";
            } else if (error.response.status === 429) {
                errorResponse.message = "Google API rate limit exceeded. Using direct AI model.";
            } else if (error.response.status >= 500) {
                errorResponse.message = "Google API server error. Using direct AI model.";
            }
        }
        
        // Return 200 with fallback flag instead of error status
        return NextResponse.json(errorResponse, { status: 200 });
    }
}