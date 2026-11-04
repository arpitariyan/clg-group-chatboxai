import { NextResponse } from "next/server";
import { searchNews } from 'duck-duck-scrape';

export async function POST(req) {
    let searchInput = '';
    try {
        const body = await req.json();
        searchInput = body.searchInput;
        const region = body.region || 'wt-wt';

        if (!searchInput) {
            return NextResponse.json({ error: "Search input is required" }, { status: 400 });
        }

        let formattedResults = [];
        let usedTavily = false;
        
        try {
            const newsRes = await searchNews(searchInput, { region });
            if (newsRes && newsRes.results && newsRes.results.length > 0) {
                formattedResults = newsRes.results.map((item, index) => ({
                    id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                    title: item.title,
                    snippet: item.excerpt,
                    link: item.url,
                    displayLink: item.source,
                    publishedAt: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
                    source: item.source,
                    image: item.image || null,
                    category: extractCategory(searchInput),
                    searchQuery: searchInput,
                    resultType: 'news',
                    region: region
                }));
            } else {
                throw new Error('No DuckDuckGo results');
            }
        } catch (ddgError) {
            console.warn('DuckDuckGo news failed:', ddgError.message);
            // No API key fallbacks for normal search per user request.
        }

        return NextResponse.json({
            success: true,
            duckDuckGoUsed: !usedTavily && formattedResults.length > 0,
            tavilyUsed: usedTavily,
            useDirectModel: formattedResults.length === 0,
            searchQuery: searchInput,
            category: extractCategory(searchInput),
            totalResults: formattedResults.length,
            results: formattedResults,
            searchInformation: null,
            timestamp: new Date().toISOString(),
            region: region
        });

    } catch (error) {
        console.error('Search API Error:', error);

        return NextResponse.json({
            success: true,
            duckDuckGoUsed: false,
            tavilyUsed: false,
            useDirectModel: true,
            searchQuery: searchInput || '',
            category: 'Top',
            totalResults: 0,
            results: [],
            searchInformation: null,
            timestamp: new Date().toISOString(),
            region: 'worldwide',
            fallbackReason: error.message || 'Unknown error'
        });
    }
}

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