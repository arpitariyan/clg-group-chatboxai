import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        // console.log('Google Search API called');
        const { searchInput, searchType } = await req.json();
        // console.log('Search request:', { searchInput, searchType });

        // Validate required input
        if (!searchInput) {
            console.error('No search input provided');
            return NextResponse.json(
                { error: "Search input is required" },
                { status: 400 }
            );
        }

        // Setup backup keys for Google API
        const googleApiKeys = [
            process.env.GOOGLE_API_KEY,
            process.env.GOOGLE_API_KEY_2,
            process.env.GOOGLE_API_KEY_3,
            process.env.GOOGLE_API_KEY_4
        ].filter(key => key); // Remove any undefined keys

        const googleCxIds = [
            process.env.GOOGLE_CX_ID,
            process.env.GOOGLE_CX_ID_2,
            process.env.GOOGLE_CX_ID_3,
            process.env.GOOGLE_CX_ID_4
        ].filter(id => id); // Remove any undefined IDs

        // Setup backup keys for Gemini API
        const geminiApiKeys = [
            process.env.NEXT_PUBLIC_GEMINI_API_KEY,
            process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
            process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
            process.env.NEXT_PUBLIC_GEMINI_API_KEY_4
        ].filter(key => key); // Remove any undefined keys

        // console.log('Available API keys:', {
        //     googleKeys: googleApiKeys.length,
        //     googleCxIds: googleCxIds.length,
        //     geminiKeys: geminiApiKeys.length
        // });

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

        let currentGoogleKeyIndex = 0;
        let currentGeminiKeyIndex = 0;
        const mixedResults = [];

        // Function to get current Google API credentials
        const getCurrentGoogleCredentials = () => ({
            apiKey: googleApiKeys[currentGoogleKeyIndex],
            cxId: googleCxIds[Math.min(currentGoogleKeyIndex, googleCxIds.length - 1)]
        });

        // Function to get current Gemini API key
        const getCurrentGeminiKey = () => geminiApiKeys[currentGeminiKeyIndex];

        // Function to make search request with automatic key rotation
        const makeSearchRequestWithFallback = async (searchParams) => {
            let lastError = null;
            
            for (let attempt = 0; attempt < googleApiKeys.length; attempt++) {
                try {
                    const credentials = getCurrentGoogleCredentials();
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
                    return response;

                } catch (error) {
                    lastError = error;
                    console.warn(`Google API key ${currentGoogleKeyIndex + 1} failed:`, error.response?.data?.error?.message || error.message);
                    
                    // Move to next key if available
                    if (currentGoogleKeyIndex < googleApiKeys.length - 1) {
                        currentGoogleKeyIndex++;
                        // console.log(`Switching to Google API key ${currentGoogleKeyIndex + 1}`);
                    } else {
                        // All keys failed
                        break;
                    }
                }
            }
            
            // If we get here, all keys failed
            // console.error('All Google API keys failed');
            throw lastError;
        };

        // Function to make Gemini API request with fallback (for future use)
        const makeGeminiRequestWithFallback = async (requestData) => {
            let lastError = null;
            
            for (let attempt = 0; attempt < geminiApiKeys.length; attempt++) {
                try {
                    const apiKey = getCurrentGeminiKey();
                    
                    // Example Gemini API call (adjust URL and params as needed)
                    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, requestData, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 15000,
                    });

                    // If successful, return the response
                    return response;

                } catch (error) {
                    lastError = error;
                    console.warn(`Gemini API key ${currentGeminiKeyIndex + 1} failed:`, error.response?.data?.error?.message || error.message);
                    
                    // Move to next key if available
                    if (currentGeminiKeyIndex < geminiApiKeys.length - 1) {
                        currentGeminiKeyIndex++;
                        // console.log(`Switching to Gemini API key ${currentGeminiKeyIndex + 1}`);
                    } else {
                        // All keys failed
                        break;
                    }
                }
            }
            
            // If we get here, all keys failed
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
                googleKeyUsed: currentGoogleKeyIndex + 1,
                geminiKeyUsed: currentGeminiKeyIndex + 1,
                totalGoogleKeys: googleApiKeys.length,
                totalGeminiKeys: geminiApiKeys.length
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