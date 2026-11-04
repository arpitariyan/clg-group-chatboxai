import { NextResponse } from 'next/server';
import { databases, DB_ID, Query } from '@/services/appwrite-admin';
import { CHATS_COLLECTION_ID, LIBRARY_COLLECTION_ID } from '@/services/appwrite-collections';

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizePrompt(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSearchResult(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Detect if the user is asking about which model / AI is being used.
 * When true, bypass cache entirely so the Inngest identity handler runs.
 */
function isModelIdentityQuery(query) {
  const q = query.trim().toLowerCase();

  const hasModelWord = /\bmodel\b/.test(q);
  const hasAiWord = /\b(ai|llm|gpt|claude|gemini|llama|engine|assistant|bot)\b/.test(q);
  const hasIdentitySignal = /\b(which|what|who|r\s+u|are\s+u|r\s+you|are\s+you|ur|you|u\s+are|using|used|active|selected|running|give|giving|answering|answer|talking|chatting|speaking|behind|name|tell|identify|introduce|version|type|kaunsa|konsa|kaun|kya|batao|bolo|hai|ho|karo)\b/.test(q);

  if (hasModelWord && hasIdentitySignal) return true;
  if (hasAiWord && hasIdentitySignal) return true;

  const patterns = [
    /which\s+(model|ai|llm|engine)\b/i,
    /what\s+(model|ai|llm|version|type)\b/i,
    /what\s+are\s+you/i,
    /who\s+are\s+you/i,
    /are\s+you\s+(claude|gpt|gemini|llama|qwen|mistral|kimi|nemotron|deepseek|glm|grok)/i,
    /tell\s+me\s+(about\s+yourself|which\s+model|what\s+model)/i,
    /introduce\s+yourself/i,
    /model\s+(are|r)\s+(u|you)/i,
    /model\s+(u|you)\s+(are|r)/i,
    /kaunsa\s+(model|ai)/i,
    /konsa\s+(model|ai)/i,
    /kaun\s+sa\s+model/i,
    /your\s+(name|model|version)/i,
  ];
  return patterns.some(p => p.test(q));
}

/**
 * Detect if the user is asking about who created / made this AI.
 * These should also bypass cache so the creative Gemini response runs.
 */
function isCreatorQuery(query) {
  const creatorPatterns = [
    /who\s+(created|made|built|developed|designed)\s+you/i,
    /who\s+(is\s+your|are\s+your)\s+(creator|maker|developer|builder)/i,
    /who\s+are\s+you\s+(created|made|built)\s+by/i,
    /what\s+(company|organization|team)\s+(created|made|built|developed)\s+you/i,
    /who\s+is\s+behind\s+you/i,
    /who\s+owns\s+you/i,
    /who\s+(founded|started)\s+you/i,
  ];
  return creatorPatterns.some(pattern => pattern.test(query.trim()));
}

/**
 * Compute a simple word-overlap similarity between two normalized queries.
 * Returns a score 0.0 – 1.0.
 */
function querySimilarity(a, b) {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const query = body?.query || '';
    const mode = body?.mode === 'research' ? 'research' : 'search';
    const userEmail = (body?.userEmail || '').trim().toLowerCase();
    // selectedModel publicId passed from frontend — used to decide cache validity
    const selectedModelId = body?.selectedModelId || null;

    const normalizedQuery = normalizePrompt(query);
    if (!normalizedQuery) {
      return NextResponse.json({ success: true, hit: false, reason: 'empty_query' });
    }

    // ── Identity/creator queries must NEVER be served from cache ────────────
    // They need to hit Inngest so the model-identity handler responds correctly.
    if (isModelIdentityQuery(normalizedQuery) || isCreatorQuery(normalizedQuery)) {
      return NextResponse.json({
        success: true,
        hit: false,
        reason: 'identity_query_bypass',
      });
    }

    // ── Fetch library + chat documents ─────────────────────────────────────
    const libraryDocs = await databases.listDocuments(DB_ID, LIBRARY_COLLECTION_ID, [
      Query.equal('type', mode),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ]);

    const libraries = libraryDocs.documents || [];
    if (libraries.length === 0) {
      return NextResponse.json({ success: true, hit: false, reason: 'no_libraries' });
    }

    const libIds = libraries.map((item) => item.libId).filter(Boolean);
    if (libIds.length === 0) {
      return NextResponse.json({ success: true, hit: false, reason: 'no_lib_ids' });
    }

    const chatsRes = await databases.listDocuments(DB_ID, CHATS_COLLECTION_ID, [
      Query.equal('libId', libIds),
      Query.equal('analysisType', 'text_only'),
      Query.orderDesc('$createdAt'),
      Query.limit(400),
    ]);

    const libById = new Map(libraries.map((lib) => [lib.libId, lib]));

    // ── Score every candidate chat ─────────────────────────────────────────
    const scoredCandidates = (chatsRes.documents || [])
      .filter((chat) => {
        if (!chat?.userSearchInput || !chat?.aiResp) return false;
        const sim = querySimilarity(normalizePrompt(chat.userSearchInput), normalizedQuery);
        return sim >= 0.85; // 85% word overlap = same intent
      })
      .map((chat) => {
        const sourceLibrary = libById.get(chat.libId);
        const sourceUserEmail = (sourceLibrary?.userEmail || '').toLowerCase();
        const isOwnResult = !!userEmail && sourceUserEmail === userEmail;
        const isExactMatch = normalizePrompt(chat.userSearchInput) === normalizedQuery;
        const similarity = querySimilarity(normalizePrompt(chat.userSearchInput), normalizedQuery);

        // Prefer own results, prefer exact matches, prefer newer items (already sorted desc)
        const score = (isOwnResult ? 10 : 0) + (isExactMatch ? 5 : 0) + similarity;

        return { chat, sourceLibrary, isOwnResult, isExactMatch, similarity, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scoredCandidates.length === 0) {
      return NextResponse.json({ success: true, hit: false, reason: 'no_match' });
    }

    // ── Compute repeat count only for the current user's exact matches ─────
    const ownExactMatches = scoredCandidates.filter(c => c.isOwnResult && c.isExactMatch);
    const ownMatchCount = ownExactMatches.length;

    // Pick the best candidate
    const bestMatch = scoredCandidates[0];

    // ── Smart refresh decision ─────────────────────────────────────────────
    // NEW LOGIC (replaces old 3rd-ask-only rule):
    //
    //   1st ask  → normal live flow  (reuse returns hit:false — no record yet)
    //   2nd ask  → return cache, but IMMEDIATELY trigger a background refresh
    //              so the user sees a fast response AND gets fresh content
    //   3rd+ ask → always refresh live (user is clearly unsatisfied with cached answer)
    //
    // If the user selected a DIFFERENT model than what generated the cached answer,
    // we always skip cache so the chosen model can generate a fresh response.

    const cachedModelApi = bestMatch.chat?.modelApi || null;
    const modelChanged = selectedModelId && cachedModelApi && selectedModelId !== cachedModelApi;

    // ── Best match's previous aiResp — forwarded to AI on repeat asks ──────
    // Trimmed to 1200 chars to stay within prompt budget.
    const previousAiResp = bestMatch.chat?.aiResp
      ? String(bestMatch.chat.aiResp).slice(0, 1200)
      : null;

    let cacheDecision;
    if (modelChanged) {
      // Model was switched — force live call so the new model answers
      cacheDecision = 'model_changed_skip_cache';
    } else if (!bestMatch.isOwnResult) {
      // Cache hit from another user — show it silently (no refresh needed)
      cacheDecision = 'use_cache_other_user';
    } else {
      // Any repeat ask by the same user (2nd, 3rd, ...) → always go fresh.
      // The user re-asking signals they were not satisfied with the previous answer.
      cacheDecision = 'force_refresh';
    }

    // If we need a live call, tell the frontend to skip cache
    if (cacheDecision === 'model_changed_skip_cache' || cacheDecision === 'force_refresh') {
      return NextResponse.json({
        success: true,
        hit: false,
        reason: cacheDecision,
        // Pass the old answer so the frontend can forward it to the AI
        // and the AI knows what NOT to repeat.
        previousAiResp: previousAiResp || null,
        hint: cacheDecision === 'force_refresh'
          ? 'User re-asked — generating a fresh, improved response.'
          : 'Model changed — using selected model for a fresh response.',
      });
    }

    return NextResponse.json({
      success: true,
      hit: true,
      normalizedQuery,
      cacheDecision,
      match: {
        sourceChatId: bestMatch.chat.$id,
        sourceLibId: bestMatch.chat.libId,
        userSearchInput: bestMatch.chat.userSearchInput,
        aiResp: bestMatch.chat.aiResp,
        searchResult: parseSearchResult(bestMatch.chat.searchResult),
        mode,
        isOwnResult: bestMatch.isOwnResult,
        isExactMatch: bestMatch.isExactMatch,
        similarity: bestMatch.similarity,
        repeatCountForUser: bestMatch.isOwnResult ? ownMatchCount : 0,
        // Tell frontend whether to silently refresh in the background
        shouldRefreshInBackground: cacheDecision === 'cache_and_refresh',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process reuse request',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
