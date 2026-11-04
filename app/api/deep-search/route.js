import { NextResponse } from 'next/server';
import { search } from 'duck-duck-scrape';
import { tavily } from '@tavily/core';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { SEARCH_CACHE_COLLECTION_ID, SEARCH_USAGE_COLLECTION_ID } from '@/services/appwrite-collections';
import { resolveRequestUserEmail } from '@/lib/server-auth';
import Groq from 'groq-sdk';

const TAVILY_KEYS = [
    process.env.TAVILY_API_KEY,
    process.env.TAVILY_API_KEY2,
    process.env.TAVILY_API_KEY3,
    process.env.TAVILY_API_KEY4,
    process.env.TAVILY_API_KEY5,
    process.env.TAVILY_API_KEY6
].filter(Boolean);

const hasTavilyKeys = TAVILY_KEYS.length > 0;

async function executeTavilySearch(query, options) {
    if (!hasTavilyKeys) {
        throw new Error('No Tavily API keys configured');
    }

    let lastError = null;
    for (let i = 0; i < TAVILY_KEYS.length; i++) {
        try {
            const client = tavily({ apiKey: TAVILY_KEYS[i] });
            const response = await client.search(query, options);
            return response;
        } catch (error) {
            console.warn(`Tavily API Key ${i + 1} failed:`, error.message || error);
            lastError = error;
            // Continue to the next key
        }
    }
    throw lastError || new Error('All Tavily API keys failed');
}
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

import { computeComplexityScore, needsSearch } from '@/lib/search-utils';

function normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function getCachedResult(query) {
    const normalized = normalizeQuery(query);
    try {
        const response = await databases.listDocuments(DB_ID, SEARCH_CACHE_COLLECTION_ID, [
            Query.equal('query', normalized),
            Query.limit(1)
        ]);
        if (response.documents.length > 0) {
            const doc = response.documents[0];
            const now = Date.now();
            const createdAt = new Date(doc.$createdAt).getTime();
            if (now - createdAt < CACHE_TTL_MS) {
                return JSON.parse(doc.results);
            }
        }
    } catch (e) {
        console.warn('Cache fetch error:', e.message);
    }
    return null;
}

async function setCachedResult(query, results) {
    const normalized = normalizeQuery(query);
    try {
        await databases.createDocument(DB_ID, SEARCH_CACHE_COLLECTION_ID, ID.unique(), {
            query: normalized,
            results: JSON.stringify(results)
        });
    } catch (e) {
        console.warn('Cache set error:', e.message);
    }
}

async function logSearchUsage(query, source, credits, score, fallbackReason = null) {
    try {
        await databases.createDocument(DB_ID, SEARCH_USAGE_COLLECTION_ID, ID.unique(), {
            query,
            source,
            credits_consumed: credits,
            complexity_score: score,
            fallback_reason: fallbackReason,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Usage log error:', e.message);
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { searchInput, searchType, maxRounds = 3, isDeepResearch = false } = body;
        
        if (!searchInput) {
            return NextResponse.json({ error: 'Search input is required' }, { status: 400 });
        }

        // 1. Complexity check
        const complexityScore = computeComplexityScore(searchInput);
        const isComplex = complexityScore >= 40;

        // 2. Cache check
        const cached = await getCachedResult(searchInput);
        if (cached) {
            await logSearchUsage(searchInput, 'cache', 0, complexityScore, null);
            return NextResponse.json({
                success: true,
                sources: cached.sources || cached,
                searchResult: cached.sources || cached, // Map for UI compatibility
                isComplex,
                source: 'cache'
            });
        }

        // 2.5 Bypass Search check
        if (!needsSearch(searchInput)) {
            console.warn('⚠️ Query is reasoning/puzzle-based, bypassing search pipeline');
            return NextResponse.json({
                success: true,
                googleApiUsed: false,
                useDirectModel: true,
                sources: [],
                searchResult: [],
                isComplex,
                source: 'bypassed',
                creditsConsumed: 0,
                synthesisDeferredToClient: true
            });
        }

        let results = [];
        let sourceUsed = 'duckduckgo';
        let fallbackReason = null;
        let creditsConsumed = 0;

        // 3. DuckDuckGo attempt (if simple)
        if (!isComplex) {
            try {
                const ddgPromise = search(searchInput);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DDG_TIMEOUT')), 5000));
                
                const ddgRes = await Promise.race([ddgPromise, timeoutPromise]);
                
                if (!ddgRes || !ddgRes.results || ddgRes.results.length < 2) {
                    throw new Error('INSUFFICIENT_RESULTS');
                }
                
                results = ddgRes.results.map(r => ({
                    title: r.title,
                    url: r.url,
                    description: r.description
                }));
            } catch (err) {
                fallbackReason = err.message;
            }
        }

        // 4. Tavily Fallback / Direct Route (ONLY if isDeepResearch is true)
        if (isDeepResearch && (isComplex || fallbackReason) && hasTavilyKeys) {
            sourceUsed = 'tavily';
            try {
                let accumulatedResults = [];
                let currentQuery = searchInput;
                let round = 1;
                
                // Perform initial Tavily search
                const depth = isComplex ? 'advanced' : 'basic';
                creditsConsumed += isComplex ? 2 : 1;
                
                const tavilyRes = await executeTavilySearch(currentQuery, {
                    searchDepth: depth,
                    includeAnswer: true
                });
                
                accumulatedResults = [...(tavilyRes.results || [])];
                
                // Multi-Round Deep Research Loop
                if (isComplex) {
                    while (round < maxRounds) {
                        round++;
                        // Generate follow-up queries using Groq
                        const prompt = `You are a research assistant. Based on the original query: "${searchInput}", and the results found so far: ${JSON.stringify(accumulatedResults.slice(0, 5))}. What are 2 distinct follow-up search queries to fill in the gaps? Return ONLY a JSON array of strings.`;
                        
                        try {
                            const completion = await groqClient.chat.completions.create({
                                model: 'llama-3.3-70b-versatile',
                                messages: [{ role: 'user', content: prompt }],
                                response_format: { type: 'json_object' }
                            });
                        
                            const parsed = JSON.parse(completion.choices[0].message.content);
                            let followUps = Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v)) || [];
                            if (followUps.length > 0) {
                                const nextQuery = followUps[0];
                                creditsConsumed += 1;
                                const followUpRes = await executeTavilySearch(nextQuery, { searchDepth: 'basic' });
                                accumulatedResults = [...accumulatedResults, ...(followUpRes.results || [])];
                            } else {
                                break;
                            }
                        } catch (e) {
                            console.error('Failed to parse follow-up queries', e);
                            break;
                        }
                    }
                }
                
                // Format Tavily results
                results = accumulatedResults.map(r => ({
                    title: r.title,
                    url: r.url,
                    description: r.content
                }));
                
                // Deduplicate by URL
                const seen = new Set();
                results = results.filter(r => {
                    if (seen.has(r.url)) return false;
                    seen.add(r.url);
                    return true;
                });
                
            } catch (err) {
                console.error('Tavily search failed', err);
                // Fallthrough if Tavily fails so we don't completely crash
            }
        } else if (isDeepResearch && (isComplex || fallbackReason) && !hasTavilyKeys) {
            console.warn('Tavily API key missing. Skipping complex search fallback.');
        }

        if (results.length === 0) {
            console.warn('⚠️ No sources found or all pipelines failed. Using direct AI model fallback.');
            return NextResponse.json({
                success: true,
                googleApiUsed: false,
                useDirectModel: true,
                sources: [],
                searchResult: [],
                isComplex,
                source: sourceUsed,
                creditsConsumed,
                synthesisDeferredToClient: true
            });
        }

        const formattedSources = results.map((r, index) => ({
            id: index + 1,
            title: r.title,
            description: r.description,
            url: r.url,
            displayLink: r.url ? new URL(r.url).hostname : '',
            deepResearch: true
        }));

        await setCachedResult(searchInput, { sources: formattedSources });
        await logSearchUsage(searchInput, sourceUsed, creditsConsumed, complexityScore, fallbackReason);

        return NextResponse.json({
            success: true,
            sources: formattedSources,
            searchResult: formattedSources,
            categorizedResults: { web: formattedSources }, // Adding this for DisplayResult compatibility
            isComplex,
            source: sourceUsed,
            creditsConsumed,
            synthesisDeferredToClient: true // Handled by frontend DisplayResult.jsx
        });
        
    } catch (error) {
        console.error('Deep Search Error:', error);
        return NextResponse.json(
            { error: 'Deep Search failed', message: error.message },
            { status: 500 }
        );
    }
}
