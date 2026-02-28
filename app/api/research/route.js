import axios from 'axios';
import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';
import { checkResearchLimit } from '@/lib/planUtils';

/**
 * Deep Research API - Comprehensive Research Engine
 * 
 * Features:
 * 1. Multi-angle query generation for thorough coverage
 * 2. Parallel search execution across different perspectives
 * 3. Source aggregation and deduplication
 * 4. Content extraction and analysis
 * 5. Synthesized research output with citations
 */

// Generate diverse research queries from the main prompt
function generateResearchQueries(mainPrompt) {
    return [
        mainPrompt, // Original query
        `comprehensive overview of ${mainPrompt}`,
        `latest developments and updates on ${mainPrompt}`,
        `expert analysis of ${mainPrompt}`,
        `detailed explanation of ${mainPrompt}`,
        `pros and cons of ${mainPrompt}`,
        `statistics and data about ${mainPrompt}`,
        `common misconceptions about ${mainPrompt}`,
        `future trends in ${mainPrompt}`,
        `best practices for ${mainPrompt}`,
        `why ${mainPrompt} matters`,
        `impact and implications of ${mainPrompt}`,
        `historical context of ${mainPrompt}`,
        `case studies on ${mainPrompt}`,
        `challenges and solutions for ${mainPrompt}`
    ];
}

// Deduplicate sources by URL
function deduplicateSources(sources) {
    const seen = new Set();
    return sources.filter(source => {
        const url = source?.link || source?.url;
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
    });
}

// Format sources for consistent structure (basic initial mapping)
function formatSources(sources) {
    return sources.map((item, index) => {
        const url = item?.link || item?.url || '';
        return {
            id: index + 1,
            title: item?.title || 'Untitled',
            description: item?.snippet || item?.description || '',
            url,
            displayLink: item?.displayLink || item?.name || '',
            thumbnail: item?.pagemap?.cse_thumbnail?.[0]?.src ||
                item?.pagemap?.imageobject?.[0]?.url ||
                item?.pagemap?.cse_image?.[0]?.src ||
                item?.thumbnail ||
                item?.image || '',
            metadata: {
                author: item?.pagemap?.person?.[0]?.name || '',
                publishDate: item?.pagemap?.metatags?.[0]?.['article:published_time'] || '',
                type: item?.pagemap?.metatags?.[0]?.['og:type'] || 'article'
            },
            deepResearch: true // marker used by frontend
        }
    });
}

// Fetch and extract page content (best effort, lightweight)
async function fetchPageContent(url) {
    try {
        const resp = await axios.get(url, { timeout: 12000 });
        const html = resp.data || '';
        // Strip scripts/styles and tags
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return text.slice(0, 8000); // cap size to prevent overload
    } catch (e) {
        return '';
    }
}

// Generate a heuristic summary (no model call to avoid latency for each source)
function heuristicSummary(text) {
    if (!text) return { summary: '', keyPoints: [] };
    const sentences = text.split(/(?<=\.)\s+/).slice(0, 6);
    const summary = sentences.slice(0, 3).join(' ');
    const keyPoints = sentences.slice(3, 6).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { summary, keyPoints };
}

// Create a comprehensive research prompt for AI synthesis
function createResearchSynthesisPrompt(originalQuery, sources) {
    const sourcesText = sources.map((s, idx) =>
        `[${idx + 1}] ${s.title}\n   URL: ${s.url}\n   Summary: ${s.description}${s.keyPoints ? '\n   Key Points: ' + s.keyPoints.join('; ') : ''}`
    ).join('\n\n');

    return `You are an expert research analyst with deep knowledge across multiple domains. Your task is to synthesize comprehensive, high-quality research based on the provided sources.

RESEARCH TOPIC: "${originalQuery}"

AVAILABLE SOURCES (${sources.length} sources with summaries and key points):
${sourcesText}

COMPREHENSIVE RESEARCH REQUIREMENTS:

1. EXECUTIVE SUMMARY & OVERVIEW (3-4 paragraphs)
   - Provide a detailed, comprehensive overview of the topic
   - Explain the significance and relevance of the topic
   - Highlight the 3-5 most critical findings upfront
   - State key conclusions and implications clearly
   - Include context about why this matters

2. DETAILED ANALYSIS WITH MULTIPLE SECTIONS
   - Identify and create 4-6 major topic sections based on the research
   - For each section:
     * Provide in-depth, detailed explanation
     * Include relevant data, statistics, research findings, and examples
     * Reference specific sources using [1], [2], etc.
     * Compare different viewpoints and perspectives
     * Explain the "why" behind findings, not just the "what"
     * Address controversies or debates with balanced perspective
   - Ensure logical flow and clear connections between sections

3. KEY FINDINGS & INSIGHTS (Detailed bullet points)
   - List 8-12 major findings of critical importance
   - Highlight surprising, counterintuitive, or novel information
   - Include specific data points, statistics, and percentages where available
   - Note conflicting information from different sources
   - Identify gaps in current knowledge and research areas needing attention
   - Flag areas of consensus vs. debate

4. ANALYSIS OF DIFFERENT PERSPECTIVES & VIEWPOINTS
   - Identify different schools of thought or approaches
   - Explain each perspective with supporting evidence
   - Compare strengths and weaknesses of each viewpoint
   - Identify which perspective has stronger evidence/support
   - Note any emerging consensus or shifting opinions

5. PRACTICAL IMPLICATIONS & REAL-WORLD APPLICATIONS
   - Explain specific, actionable implications
   - Provide examples of real-world applications or use cases
   - Discuss benefits, challenges, and considerations for implementation
   - Identify who should care about this and why
   - Include relevant case studies or practical examples from sources

6. TRENDS, PATTERNS & FUTURE OUTLOOK
   - Identify current trends and patterns in the research
   - Discuss emerging developments and innovations
   - Predict future evolution or changes based on current trajectory
   - Note areas that are rapidly evolving vs. stable
   - Identify research opportunities and future directions

7. LIMITATIONS, UNCERTAINTIES & RESEARCH GAPS
   - Acknowledge limitations in current research
   - Note data gaps or areas with insufficient information
   - Discuss reliability and potential biases in sources
   - Distinguish between well-established facts and areas of uncertainty
   - Recommend areas needing further research or investigation

8. COMPREHENSIVE CITATIONS & SOURCE ATTRIBUTION
   - Reference sources using [1], [2], etc. throughout response
   - Ensure ALL major claims and statistics are backed by source citations
   - Note when sources agree or disagree on findings
   - Indicate if sources appear outdated or current
   - Highlight if any sources have known biases

9. QUALITY & PRESENTATION STANDARDS
   - Provide an objective, balanced, and well-reasoned analysis
   - Use clear, professional language suitable for educated readers
   - Organize with clear headings (use ## for main sections, ### for subsections)
   - Use bold for key terms and important concepts
   - Use bullet points and numbered lists for clarity and readability
   - Maintain academic rigor while remaining accessible
   - Length: Aim for a comprehensive 2000-3000 word response

CRITICAL INSTRUCTIONS:
- Make the research DETAILED and COMPREHENSIVE, not brief
- Include specific numbers, statistics, and data points where available
- Provide context and explanation for all findings
- Connect different pieces of information to show relationships
- Ensure proper source attribution with [1], [2] citations
- Be thorough and exhaustive in covering the topic
- Aim for depth and comprehensiveness over brevity`;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            searchInput,
            selectedModel = 'best',
            maxSources = 20,
            includeDiversity = true,
            user_email
        } = body;

        if (!searchInput?.trim()) {
            return NextResponse.json(
                { error: 'Search input is required' },
                { status: 400 }
            );
        }

        if (!user_email) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: 'User email is required for Research' },
                { status: 401 }
            );
        }

        // console.log('🔬 Starting deep research for:', searchInput);

        // Plan/usage gating for Research feature
        const researchLimit = await checkResearchLimit(user_email);
        if (!researchLimit.canResearch) {
            return NextResponse.json(
                {
                    error: 'RESEARCH_LIMIT_REACHED',
                    message: researchLimit.message,
                    remaining: researchLimit.remaining,
                    monthlyCount: researchLimit.monthlyCount,
                    monthlyLimit: researchLimit.monthlyLimit,
                    plan: researchLimit.plan
                },
                { status: 403 }
            );
        }

        // Log usage for this Research attempt
        try {
            await supabase
                .from('usage_logs')
                .insert({
                    user_email,
                    model: 'research',
                    operation_type: 'research',
                    credits_consumed: 0,
                    credits_remaining: null,
                    created_at: new Date().toISOString()
                });
        } catch (logErr) {
            console.warn('Failed to log research usage:', logErr?.message || logErr);
        }

        // Step 1: Generate diverse research queries
        const researchQueries = includeDiversity
            ? generateResearchQueries(searchInput)
            : [searchInput];

        // console.log(`📝 Generated ${researchQueries.length} research angles`);

        // Get the base URL for internal API calls
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Step 2: Execute searches in parallel
        const searchPromises = researchQueries.slice(0, 5).map(async (query) => {
            try {
                const response = await axios.post(
                    `${baseUrl}/api/google-search-api`,
                    {
                        searchInput: query,
                        searchType: 'search'
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000 // 30 second timeout
                    }
                );

                const webResults = response.data?.categorizedResults?.web || [];
                console.log(`✓ Query "${query.substring(0, 40)}..." returned ${webResults.length} results`);
                return webResults;
            } catch (error) {
                console.error(`✗ Search failed for query: ${query}`, error.message);
                return [];
            }
        });

        const searchResults = await Promise.all(searchPromises);
        const allSources = searchResults.flat();

        // console.log(`📚 Total sources collected: ${allSources.length}`);

        // Step 3: Deduplicate and format sources
        const uniqueSources = deduplicateSources(allSources);
        const formattedSources = formatSources(uniqueSources).slice(0, maxSources);

        // console.log(`🎯 Unique sources after deduplication: ${formattedSources.length}`);

        // Determine if Google API was successfully used
        const googleApiUsed = formattedSources.length > 0;

        // If no sources found, return with fallback flag
        if (!googleApiUsed) {
            console.warn('⚠️ No sources found for research, using direct AI model');
            return NextResponse.json({
                success: true,
                googleApiUsed: false,
                useDirectModel: true,
                runId: null,
                sources: [],
                searchResult: [],
                metadata: {
                    totalSourcesFound: 0,
                    uniqueSources: 0,
                    queriesExecuted: 0,
                    researchDepth: 'direct_model',
                    enrichedSources: 0
                }
            });
        }

        // Step 4: Create comprehensive research synthesis prompt
        const researchPrompt = createResearchSynthesisPrompt(searchInput, formattedSources);

        // Step 5: Enrich sources with page content & heuristic summaries (limit to first 8 to control cost)
        // console.log('📄 Fetching page contents for deep enrichment...');
        const enrichmentTargets = formattedSources.slice(0, 8);
        for (const src of enrichmentTargets) {
            const content = await fetchPageContent(src.url);
            const { summary, keyPoints } = heuristicSummary(content);
            src.contentExcerpt = content.slice(0, 600);
            src.summary = summary;
            src.keyPoints = keyPoints;
            src.contentLength = content.length;
        }

        // Step 6: Initiate synthesis (best effort) using enriched sources
        // console.log('🤖 Initiating AI synthesis...');
        let runId = null;
        try {
            const llmResponse = await axios.post(
                `${baseUrl}/api/llm-model`,
                {
                    searchInput: researchPrompt,
                    searchResult: formattedSources.map(s => ({
                        title: s.title,
                        url: s.url,
                        description: s.description,
                        summary: s.summary,
                        keyPoints: s.keyPoints
                    })),
                    recordId: 'research-' + Date.now(), // Generate a temporary ID for research
                    selectedModel: selectedModel,
                    isPro: true // This will be handled on the frontend with actual user plan
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                }
            );
            runId = llmResponse.data;
            // console.log('📊 AI synthesis initiated with runId:', runId);
        } catch (e) {
            console.warn('⚠️ Synthesis failed, continuing without runId:', e.message);
        }

        // Return enriched sources immediately
        return NextResponse.json({
            success: true,
            googleApiUsed: true,
            runId,
            sources: formattedSources,
            searchResult: formattedSources,
            metadata: {
                totalSourcesFound: allSources.length,
                uniqueSources: formattedSources.length,
                queriesExecuted: researchQueries.slice(0, 5).length,
                researchDepth: 'comprehensive',
                enrichedSources: enrichmentTargets.length
            }
        });

    } catch (error) {
        console.error('❌ Research API error:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        return NextResponse.json(
            {
                error: 'Research failed',
                message: error.message,
                details: error.response?.data || error.toString()
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check Research usage status for a user
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const user_email = searchParams.get('user_email');

        if (!user_email) {
            return NextResponse.json(
                { error: 'Missing user_email parameter' },
                { status: 400 }
            );
        }

        const status = await checkResearchLimit(user_email);
        return NextResponse.json({
            success: true,
            ...status
        });
    } catch (error) {
        console.error('Research GET error:', error);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Failed to get research usage', details: error.message },
            { status: 500 }
        );
    }
}

// PUT handler - Method not allowed (Inngest compatibility)
export async function PUT(request) {
    return NextResponse.json(
        { error: 'METHOD_NOT_ALLOWED', message: 'PUT method is not supported for this endpoint' },
        { status: 405 }
    );
}
