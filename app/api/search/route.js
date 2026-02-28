import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { searchInput, searchType, region } = await req.json();

        // Validate required input
        if (!searchInput) {
            return NextResponse.json(
                { error: "Search input is required" },
                { status: 400 }
            );
        }

        // Setup Google API keys
        const googleApiKeys = [
            process.env.GOOGLE_API_KEY,
            process.env.GOOGLE_API_KEY_2,
            process.env.GOOGLE_API_KEY_3,
            process.env.GOOGLE_API_KEY_4
        ].filter(key => key);

        const googleCxIds = [
            process.env.GOOGLE_CX_ID,
            process.env.GOOGLE_CX_ID_2,
            process.env.GOOGLE_CX_ID_3,
            process.env.GOOGLE_CX_ID_4
        ].filter(id => id);

        if (googleApiKeys.length === 0 || googleCxIds.length === 0) {
            return NextResponse.json(
                { error: "Google API credentials not configured" },
                { status: 500 }
            );
        }

        let currentKeyIndex = 0;

        const makeSearchRequest = async (searchParams) => {
            let lastError = null;

            for (let attempt = 0; attempt < googleApiKeys.length; attempt++) {
                try {
                    const requestParams = {
                        ...searchParams,
                        key: googleApiKeys[currentKeyIndex],
                        cx: googleCxIds[Math.min(currentKeyIndex, googleCxIds.length - 1)]
                    };

                    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                        params: requestParams,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 10000,
                    });

                    return response;

                } catch (error) {
                    lastError = error;
                    console.warn(`Google API key ${currentKeyIndex + 1} failed:`, error.response?.data?.error?.message || error.message);

                    if (currentKeyIndex < googleApiKeys.length - 1) {
                        currentKeyIndex++;
                    } else {
                        break;
                    }
                }
            }

            throw lastError;
        };

        // Enhanced search query for news - includes worldwide and region-specific news
        const newsSearchQuery = `${searchInput} "news" OR "update" OR "latest" OR "breaking" -site:reddit.com -site:pinterest.com`;

        // Search parameters optimized for news
        // gl parameter determines geographic location of search results
        // 'in' = India, 'us' = USA/Worldwide, 'gb' = UK, etc.
        const searchParams = {
            q: newsSearchQuery,
            num: 15, // Increased to get more results after filtering
            dateRestrict: 'd7', // Last 7 days for recent news
            sort: 'date:r:20231101:20261231', // Sort by date, recent first
            gl: region || 'us', // Geographic location - 'in' for India, 'us' for worldwide
            hl: 'en', // Language
        };

        // Try to get Google Search results with fallback handling
        let googleApiUsed = false;
        let formattedResults = [];
        let searchInformation = null;

        try {
            const response = await makeSearchRequest(searchParams);
            const results = response.data.items || [];

            // Process and format the results for news display
            formattedResults = results.map((item, index) => ({
                id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                title: item.title,
                snippet: item.snippet,
                link: item.link,
                displayLink: item.displayLink,
                publishedAt: item.pagemap?.metatags?.[0]?.['article:published_time'] ||
                    item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
                    new Date().toISOString(),
                source: item.displayLink,
                image: item.pagemap?.cse_image?.[0]?.src ||
                    item.pagemap?.metatags?.[0]?.['og:image'] ||
                    item.pagemap?.metatags?.[0]?.['twitter:image'] ||
                    null,
                category: extractCategory(searchInput),
                searchQuery: searchInput,
                resultType: 'news',
                region: region || 'worldwide'
            })).filter(item => item.title && item.snippet && item.link); // Filter out incomplete results

            searchInformation = response.data.searchInformation;
            googleApiUsed = true;

        } catch (apiError) {
            // Google API failed - log the error but continue with fallback
            console.warn('Google Custom Search API failed, will use direct AI model:', apiError.response?.data?.error?.message || apiError.message);
            googleApiUsed = false;
            formattedResults = [];
        }

        return NextResponse.json({
            success: true,
            googleApiUsed: googleApiUsed,
            useDirectModel: !googleApiUsed, // Signal to use direct AI model if Google API failed
            searchQuery: searchInput,
            category: extractCategory(searchInput),
            totalResults: formattedResults.length,
            results: formattedResults,
            searchInformation: searchInformation,
            timestamp: new Date().toISOString(),
            region: region || 'worldwide'
        });

    } catch (error) {
        console.error('Search API Error:', error);

        // Return fallback response instead of error
        // This allows the frontend to use direct AI model
        return NextResponse.json({
            success: true,
            googleApiUsed: false,
            useDirectModel: true,
            searchQuery: searchInput || '',
            category: 'Top',
            totalResults: 0,
            results: [],
            searchInformation: null,
            timestamp: new Date().toISOString(),
            region: region || 'worldwide',
            fallbackReason: error.response?.data?.error?.message || error.message || 'Unknown error'
        });
    }
}

// Helper function to extract category from search input
function extractCategory(searchInput) {
    const input = searchInput.toLowerCase();

    if (input.includes('tech') || input.includes('science') || input.includes('technology')) {
        return 'Tech & Science';
    } else if (input.includes('finance') || input.includes('financial') || input.includes('economy') || input.includes('business')) {
        return 'Finance';
    } else if (input.includes('art') || input.includes('culture') || input.includes('entertainment')) {
        return 'Art & Culture';
    } else if (input.includes('sports') || input.includes('sport')) {
        return 'Sports';
    } else {
        return 'Top';
    }
}