import axios from 'axios';
import { NextResponse } from 'next/server';
import { databases, DB_ID, ID, Query } from '@/services/appwrite-admin';
import { USERS_COLLECTION_ID, USAGE_LOGS_COLLECTION_ID } from '@/services/appwrite-collections';
import { checkResearchLimit } from '@/lib/planUtils-server';
import { normalizePlan } from '@/lib/subscriptionPlans';
import { buildConversationMemoryContext } from '@/lib/memory-context';
import { AuthError, authErrorResponse, normalizeEmail, resolveRequestUserEmail } from '@/lib/server-auth';
import { needsSearch } from '@/lib/search-utils';
import { GoogleGenAI } from '@google/genai';

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'by', 'is', 'are', 'was',
    'were', 'be', 'as', 'at', 'from', 'that', 'this', 'it', 'its', 'their', 'your', 'you', 'about'
]);

const DOMAIN_HINTS = {
    engineering: ['api', 'code', 'software', 'architecture', 'debug', 'performance', 'javascript', 'python', 'react', 'node'],
    business: ['pricing', 'market', 'revenue', 'startup', 'roi', 'strategy', 'customer', 'sales'],
    health: ['health', 'medical', 'clinical', 'treatment', 'disease', 'patient'],
    legal: ['law', 'legal', 'regulation', 'compliance', 'policy', 'contract'],
    finance: ['finance', 'investment', 'stock', 'valuation', 'budget', 'cost']
};

function tokenize(text = '') {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token && !STOP_WORDS.has(token));
}

function keywordOverlapScore(left = '', right = '') {
    const leftTokens = new Set(tokenize(left));
    if (!leftTokens.size) return 0;
    const rightTokens = new Set(tokenize(right));
    let overlap = 0;
    leftTokens.forEach(token => {
        if (rightTokens.has(token)) overlap += 1;
    });
    return overlap / leftTokens.size;
}

function detectQueryIntent(mainPrompt = '') {
    const normalized = String(mainPrompt || '').toLowerCase();
    const tokenCount = tokenize(normalized).length;

    const isComparison = /(compare|vs\.?|difference|better|best)/i.test(normalized);
    const isHowTo = /(how to|build|implement|setup|step by step)/i.test(normalized);
    const isDecision = /(choose|recommend|should i|which one)/i.test(normalized);

    let intent = 'inform';
    if (isComparison) intent = 'compare';
    else if (isHowTo) intent = 'build';
    else if (isDecision) intent = 'decision';

    let depth = 'standard';
    if (tokenCount >= 14 || /(deep|comprehensive|detailed|expert)/i.test(normalized)) {
        depth = 'deep';
    } else if (tokenCount <= 6) {
        depth = 'quick';
    }

    let domain = 'general';
    for (const [candidate, keywords] of Object.entries(DOMAIN_HINTS)) {
        if (keywords.some(keyword => normalized.includes(keyword))) {
            domain = candidate;
            break;
        }
    }

    return { intent, depth, domain, tokenCount };
}

function buildResearchPlan(mainPrompt = '', queryAnalysis = {}) {
    const basePlans = [
        { angle: 'core', query: mainPrompt, basePriority: 1.0 },
        { angle: 'overview', query: `comprehensive overview of ${mainPrompt}`, basePriority: 0.92 },
        { angle: 'latest', query: `latest developments and updates on ${mainPrompt}`, basePriority: 0.88 },
        { angle: 'expert', query: `expert analysis of ${mainPrompt}`, basePriority: 0.86 },
        { angle: 'data', query: `statistics, data, and benchmarks for ${mainPrompt}`, basePriority: 0.9 },
        { angle: 'examples', query: `case studies and real-world examples of ${mainPrompt}`, basePriority: 0.82 },
        { angle: 'implementation', query: `best practices and implementation patterns for ${mainPrompt}`, basePriority: 0.84 },
        { angle: 'risks', query: `challenges, risks, and mitigation for ${mainPrompt}`, basePriority: 0.83 },
        { angle: 'future', query: `future trends and outlook for ${mainPrompt}`, basePriority: 0.8 },
        { angle: 'history', query: `historical context and evolution of ${mainPrompt}`, basePriority: 0.72 }
    ];

    const intentBoostMap = {
        compare: { data: 0.08, expert: 0.06, risks: 0.05 },
        build: { implementation: 0.1, risks: 0.07, examples: 0.05 },
        decision: { data: 0.09, risks: 0.08, expert: 0.07 },
        inform: { overview: 0.04, latest: 0.04 }
    };

    const domainBoostMap = {
        engineering: { implementation: 0.08, risks: 0.06, data: 0.03 },
        business: { data: 0.07, examples: 0.06, future: 0.03 },
        health: { latest: 0.08, risks: 0.07, data: 0.04 },
        legal: { risks: 0.09, history: 0.05, expert: 0.05 },
        finance: { data: 0.1, risks: 0.07, future: 0.04 }
    };

    const intentBoosts = intentBoostMap[queryAnalysis.intent] || {};
    const domainBoosts = domainBoostMap[queryAnalysis.domain] || {};

    return basePlans.map((plan, idx) => {
        const overlap = keywordOverlapScore(mainPrompt, plan.query);
        const intentBoost = intentBoosts[plan.angle] || 0;
        const domainBoost = domainBoosts[plan.angle] || 0;
        const depthBoost = queryAnalysis.depth === 'deep' ? 0.03 : 0;
        const priority = Number((plan.basePriority + overlap * 0.2 + intentBoost + domainBoost + depthBoost).toFixed(3));
        return {
            ...plan,
            priority,
            index: idx + 1
        };
    }).sort((a, b) => b.priority - a.priority);
}

function canonicalizeUrl(url = '') {
    try {
        const parsed = new URL(url);
        parsed.hash = '';
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
        trackingParams.forEach(param => parsed.searchParams.delete(param));
        return parsed.toString().replace(/\/$/, '');
    } catch {
        return String(url || '').trim();
    }
}

function getDomain(url = '') {
    try {
        return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return '';
    }
}

function calculateSourceQualityScore(item = {}, originalQuery = '') {
    const url = item?.link || item?.url || '';
    const domain = getDomain(url);
    const snippet = String(item?.snippet || item?.description || '');
    const overlap = keywordOverlapScore(originalQuery, snippet) * 20;

    let score = 40 + overlap;

    if (/\.(gov|edu)$/i.test(domain)) score += 20;
    else if (/(wikipedia|nature|arxiv|forbes|harvard|mit|who\.int|oecd|worldbank)/i.test(domain)) score += 12;

    const publishDateRaw = item?.pagemap?.metatags?.[0]?.['article:published_time'];
    if (publishDateRaw) {
        const publishedAt = new Date(publishDateRaw).getTime();
        if (!Number.isNaN(publishedAt)) {
            const daysOld = (Date.now() - publishedAt) / (1000 * 60 * 60 * 24);
            if (daysOld <= 30) score += 12;
            else if (daysOld <= 180) score += 8;
            else if (daysOld <= 365) score += 5;
            else if (daysOld > 1825) score -= 6;
        }
    }

    if (/(forum|reddit|quora|medium\.com\/u\/)/i.test(domain)) score -= 4;
    if (!snippet || snippet.length < 40) score -= 5;

    const bounded = Math.max(0, Math.min(100, Math.round(score)));
    let band = 'medium';
    if (bounded >= 75) band = 'high';
    else if (bounded < 45) band = 'low';

    return { score: bounded, band, domain };
}

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
    const queryAnalysis = detectQueryIntent(mainPrompt);
    const rankedPlan = buildResearchPlan(mainPrompt, queryAnalysis);
    return {
        queryAnalysis,
        rankedPlan,
        queries: rankedPlan.map(item => item.query)
    };
}

// Generate research queries using an LLM to analyze intent
async function analyzeIntentWithLLM(mainPrompt) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY not found, falling back to heuristics");
            return generateResearchQueries(mainPrompt);
        }
        
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const prompt = `You are an expert research analyst. Analyze the following user request and determine the user's actual intent, key objectives, and the best approach to answer it.
Then, generate a list of the 4-6 most effective search queries to gather the necessary information.

User Request: "${mainPrompt}"

Respond ONLY with a valid JSON object matching this schema:
{
  "intentAnalysis": "Your detailed reasoning about what the user actually needs and the best approach.",
  "queries": ["query 1", "query 2", "query 3"]
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const text = response.text;
        const data = JSON.parse(text);
        
        // Map to existing structure expected by the rest of the file
        const queryAnalysis = {
             intent: 'inform', 
             depth: 'deep',
             domain: 'general',
             intentAnalysis: data.intentAnalysis
        };
        const rankedPlan = data.queries.map((q, idx) => ({ 
            query: q, 
            angle: 'llm', 
            priority: 1 - (idx * 0.05), 
            index: idx + 1 
        }));
        
        return {
            queryAnalysis,
            rankedPlan,
            queries: data.queries
        };
    } catch (err) {
        console.error("LLM Intent Analysis failed, falling back to heuristics:", err);
        return generateResearchQueries(mainPrompt);
    }
}

// Deduplicate sources by URL
function deduplicateSources(sources) {
    const seen = new Set();
    return sources.filter(source => {
        const url = canonicalizeUrl(source?.link || source?.url);
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
    });
}

// Format sources for consistent structure (basic initial mapping)
function formatSources(sources, originalQuery = '') {
    const withQuality = sources.map((item, index) => {
        const url = item?.link || item?.url || '';
        const quality = calculateSourceQualityScore(item, originalQuery);
        return {
            id: index + 1,
            title: item?.title || 'Untitled',
            description: item?.snippet || item?.description || '',
            url: canonicalizeUrl(url),
            displayLink: item?.displayLink || item?.name || '',
            thumbnail: item?.pagemap?.cse_thumbnail?.[0]?.src ||
                item?.pagemap?.imageobject?.[0]?.url ||
                item?.pagemap?.cse_image?.[0]?.src ||
                item?.thumbnail ||
                item?.image || '',
            metadata: {
                author: item?.pagemap?.person?.[0]?.name || '',
                publishDate: item?.pagemap?.metatags?.[0]?.['article:published_time'] || '',
                type: item?.pagemap?.metatags?.[0]?.['og:type'] || 'article',
                qualityScore: quality.score,
                qualityBand: quality.band,
                sourceHost: quality.domain
            },
            qualityScore: quality.score,
            qualityBand: quality.band,
            sourceHost: quality.domain,
            deepResearch: true // marker used by frontend
        };
    });

    return withQuality.sort((a, b) => {
        if (b.qualityScore === a.qualityScore) return a.id - b.id;
        return b.qualityScore - a.qualityScore;
    });
}

function createFollowUpSuggestions(queryAnalysis, originalQuery) {
    const topic = String(originalQuery || '').trim();
    const defaults = [
        `What are the biggest trade-offs in ${topic}?`,
        `What would a practical implementation roadmap for ${topic} look like?`,
        `What could go wrong with ${topic}, and how can we mitigate it?`,
        `What changed recently in ${topic} that matters most?`
    ];

    if (queryAnalysis.intent === 'compare') {
        return [
            `Create a decision matrix to compare options for ${topic}`,
            `Which option is best for low budget vs enterprise scale in ${topic}?`,
            `What hidden costs appear when comparing ${topic}?`,
            `What are long-term risks in each option related to ${topic}?`
        ];
    }

    if (queryAnalysis.intent === 'build') {
        return [
            `Give a step-by-step build plan for ${topic}`,
            `What architecture is recommended for production ${topic}?`,
            `What testing and monitoring strategy should be used for ${topic}?`,
            `What security and reliability pitfalls should be avoided in ${topic}?`
        ];
    }

    return defaults;
}

function getInternalResearchBudgetFactor(plan = 'free', queryAnalysis = {}) {
    const normalizedPlan = normalizePlan(plan);
    const planFactor = normalizedPlan === 'max' ? 1 : 0.5;

    const intentFactor = queryAnalysis.intent === 'compare' || queryAnalysis.intent === 'decision'
        ? 1.1
        : queryAnalysis.intent === 'build'
            ? 1.15
            : 1;

    const depthFactor = queryAnalysis.depth === 'deep'
        ? 1.1
        : queryAnalysis.depth === 'quick'
            ? 0.9
            : 1;

    return Math.max(0.45, Math.min(1, planFactor * intentFactor * depthFactor));
}

// Fetch and extract page content (best effort, lightweight)
async function fetchPageContent(url) {
    try {
        const resp = await axios.get(url, {
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ChatBoxAI-Research/1.0)'
            }
        });
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

function normalizeSelectedModel(selectedModel) {
    if (!selectedModel) return { modelApi: 'auto', name: 'Auto', provider: 'mixed' };
    if (typeof selectedModel === 'string') {
        return { modelApi: selectedModel, name: selectedModel, provider: 'mixed' };
    }
    return {
        modelApi: selectedModel.modelApi || 'auto',
        name: selectedModel.name || 'Auto',
        provider: selectedModel.provider || 'mixed',
        id: selectedModel.id
    };
}

function createNoSourceResearchPrompt(originalQuery) {
    return `You are a senior research analyst. Produce a high-quality, detailed research brief for the topic below using your internal knowledge.

TOPIC: "${originalQuery}"

Requirements:
- Use clear markdown headings and subheadings.
- Include: Executive Summary, Core Concepts, Key Findings, Contrasting Viewpoints, Practical Implications, Risks & Limitations, and Actionable Recommendations.
- Include concrete examples, estimates, and decision criteria where useful.
- Clearly mark uncertainty where evidence may be limited.
- Provide a comprehensive and structured response (minimum 1200 words).
`;
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


export async function POST(request) {
    try {
        const requestStartAt = Date.now();
        const body = await request.json();
        let authenticatedEmail = null;
        try {
            authenticatedEmail = await resolveRequestUserEmail(request);
        } catch {
            authenticatedEmail = null;
        }
        const {
            searchInput,
            selectedModel = 'best',
            maxSources = 20,
            includeDiversity = true,
            user_email,
            conversationHistory = [],
            memoryEnabled = true
        } = body;

        const requestedEmail = normalizeEmail(user_email);
        if (requestedEmail && authenticatedEmail && requestedEmail !== authenticatedEmail) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: 'Requested user email does not match authenticated session.' },
                { status: 403 }
            );
        }

        const normalizedSelectedModel = normalizeSelectedModel(selectedModel);

        if (!searchInput?.trim()) {
            return NextResponse.json(
                { error: 'Search input is required' },
                { status: 400 }
            );
        }

        // console.log('🔬 Starting deep research for:', searchInput);

        // Plan/usage gating for Research feature
        const researchLimit = await checkResearchLimit(authenticatedEmail);
        if (!researchLimit.canResearch) {
            return NextResponse.json(
                {
                    error: 'RESEARCH_LIMIT_REACHED',
                    message: researchLimit.message,
                    remaining: researchLimit.remaining,
                    weeklyCount: researchLimit.weeklyCount,
                    weeklyLimit: researchLimit.weeklyLimit,
                    monthlyCount: researchLimit.monthlyCount,
                    monthlyLimit: researchLimit.monthlyLimit,
                    plan: researchLimit.plan
                },
                { status: 403 }
            );
        }

        const normalizedPlan = normalizePlan(researchLimit.plan || 'free');

        // Log usage for this Research attempt
        try {
            const userRes = await databases.listDocuments(DB_ID, USERS_COLLECTION_ID, [
                Query.equal('email', authenticatedEmail),
                Query.limit(1),
            ]);
            const userDoc = userRes.documents?.[0];

            if (userDoc?.$id) {
                try {
                    await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
                        user_id: userDoc.$id,
                        model: 'research',
                        operation_type: 'research',
                        credits_consumed: 0,
                        credits_remaining: 0,
                    });
                } catch (logByIdErr) {
                    await databases.createDocument(DB_ID, USAGE_LOGS_COLLECTION_ID, ID.unique(), {
                        user_email: authenticatedEmail,
                        model: 'research',
                        operation_type: 'research',
                        credits_consumed: 0,
                        credits_remaining: 0,
                    });
                }
            }
        } catch (logErr) {
            console.warn('Failed to log research usage:', logErr?.message || logErr);
        }

        // Step 1: Generate diverse research queries
        const planningStartAt = Date.now();
        const queryPlanData = includeDiversity
            ? await analyzeIntentWithLLM(searchInput)
            : {
                queryAnalysis: detectQueryIntent(searchInput),
                rankedPlan: [{ query: searchInput, angle: 'core', priority: 1, index: 1 }],
                queries: [searchInput]
            };

        const internalBudgetFactor = getInternalResearchBudgetFactor(normalizedPlan, queryPlanData.queryAnalysis);

        const queryBatchSize = Math.max(4, Math.round(7 * internalBudgetFactor));
        const selectedPlan = queryPlanData.rankedPlan.slice(0, queryBatchSize);
        const selectedQueries = selectedPlan.map(item => item.query);
        const planningDurationMs = Date.now() - planningStartAt;

        // console.log(`📝 Generated ${researchQueries.length} research angles`);

        // Get the base URL for internal API calls
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Step 2: Execute searches in parallel
        const retrievalStartAt = Date.now();
        const searchPromises = selectedQueries.map(async (query) => {
            try {
                const response = await axios.post(
                    `${baseUrl}/api/deep-search`,
                    {
                        searchInput: query,
                        searchType: 'search',
                        isDeepResearch: true
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        timeout: 45000 // Increased to 45s for Deep Research
                    }
                );

                const webResults = response.data?.categorizedResults?.web || [];
                // console.log(`✓ Query "${query.substring(0, 40)}..." returned ${webResults.length} results`);
                return webResults;
            } catch (error) {
                console.error(`✗ Search failed for query: ${query}`, error.message);
                return [];
            }
        });

        const searchResults = await Promise.all(searchPromises);
        const allSources = searchResults.flat();
        const retrievalDurationMs = Date.now() - retrievalStartAt;

        // console.log(`📚 Total sources collected: ${allSources.length}`);

        // Step 3: Deduplicate and format sources
        const rankingStartAt = Date.now();
        const uniqueSources = deduplicateSources(allSources);
        const normalizedMaxSources = Math.max(8, Math.min(Math.ceil((Number(maxSources) || 20) * internalBudgetFactor), internalBudgetFactor < 1 ? 12 : 30));
        const formattedSources = formatSources(uniqueSources, searchInput).slice(0, normalizedMaxSources);
        const rankingDurationMs = Date.now() - rankingStartAt;

        // console.log(`🎯 Unique sources after deduplication: ${formattedSources.length}`);

        // Determine if Google API was successfully used
        const googleApiUsed = formattedSources.length > 0;

        // If no sources found, return with fallback flag
        if (!googleApiUsed) {
            console.warn('⚠️ No sources found for research, using direct AI model');

            const runId = null;

            return NextResponse.json({
                success: true,
                googleApiUsed: false,
                useDirectModel: true,
                runId,
                synthesisDeferredToClient: true,
                sources: [],
                searchResult: [],
                metadata: {
                    totalSourcesFound: 0,
                    uniqueSources: 0,
                    queriesExecuted: 0,
                    researchDepth: 'direct_model',
                    enrichedSources: 0,
                    queryAnalysis: queryPlanData.queryAnalysis,
                    plannedAngles: selectedPlan,
                    followUpSuggestions: createFollowUpSuggestions(queryPlanData.queryAnalysis, searchInput),
                    phaseDurationsMs: {
                        planning: planningDurationMs,
                        retrieval: retrievalDurationMs,
                        ranking: rankingDurationMs,
                        total: Date.now() - requestStartAt
                    }
                }
            });
        }

        // Step 4: Fetch and format user memory context (compact summaries only — no raw history)
        const memoryContextData = await buildConversationMemoryContext({
            userEmail: authenticatedEmail,
            query: searchInput,
            memoryEnabled,
            limit: internalBudgetFactor < 1 ? 3 : 5,
        });
        const memoryContext = memoryContextData.combinedContext || memoryContextData.memoryContext || '';

        // Step 5: (Skipped) Prompt synthesis deferred to Inngest to prevent DB polling issues

        // Step 6: Enrich sources with page content & heuristic summaries (budgeted by plan + query depth)
        // console.log('📄 Fetching page contents for deep enrichment...');
        const enrichmentStartAt = Date.now();
        const enrichmentTargets = formattedSources.slice(0, internalBudgetFactor < 1 ? 6 : 12);
        await Promise.allSettled(
            enrichmentTargets.map(async (src) => {
                const content = await fetchPageContent(src.url);
                const { summary, keyPoints } = heuristicSummary(content);
                src.contentExcerpt = content.slice(0, 400); // Trimmed for TTFT optimization
                src.summary = summary;
                src.keyPoints = keyPoints;
                src.contentLength = content.length;
            })
        );
        const enrichmentDurationMs = Date.now() - enrichmentStartAt;

        // Step 7: Do NOT initiate synthesis here.
        // Reason: API layer does not yet have the real chat recordId; starting Inngest with
        // a temporary ID causes DB updates to miss the actual chat row and the UI keeps polling.
        // The client starts /api/llm-model after creating the real chat row.
        const runId = null;
        const synthesisDispatchDurationMs = 0;

        const qualityScores = formattedSources.map(src => src.qualityScore || 0);
        const avgQuality = qualityScores.length
            ? Math.round(qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length)
            : 0;
        const highConfidenceSources = formattedSources.filter(src => src.qualityBand === 'high').length;
        const followUpSuggestions = createFollowUpSuggestions(queryPlanData.queryAnalysis, searchInput);

        // Return enriched sources immediately
        return NextResponse.json({
            success: true,
            googleApiUsed: true,
            runId,
            synthesisDeferredToClient: true,
            sources: formattedSources,
            searchResult: formattedSources,
            metadata: {
                totalSourcesFound: allSources.length,
                uniqueSources: formattedSources.length,
                queriesExecuted: selectedQueries.length,
                researchDepth: 'comprehensive',
                enrichedSources: enrichmentTargets.length,
                queryAnalysis: queryPlanData.queryAnalysis,
                plannedAngles: selectedPlan,
                followUpSuggestions,
                qualitySummary: {
                    averageSourceQuality: avgQuality,
                    highConfidenceSources
                },
                phaseDurationsMs: {
                    planning: planningDurationMs,
                    retrieval: retrievalDurationMs,
                    ranking: rankingDurationMs,
                    enrichment: enrichmentDurationMs,
                    synthesisDispatch: synthesisDispatchDurationMs,
                    total: Date.now() - requestStartAt
                }
            }
        });

    } catch (error) {
        if (error instanceof AuthError) {
            return authErrorResponse(error, 'Authentication is required for research.');
        }
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
        const authenticatedEmail = await resolveRequestUserEmail(request);
        const requestedEmail = normalizeEmail(searchParams.get('user_email'));
        if (requestedEmail && requestedEmail !== authenticatedEmail) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: 'Requested user email does not match authenticated session.' },
                { status: 403 }
            );
        }

        const status = await checkResearchLimit(authenticatedEmail);
        return NextResponse.json({
            success: true,
            ...status
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return authErrorResponse(error, 'Authentication is required for research usage.');
        }
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
