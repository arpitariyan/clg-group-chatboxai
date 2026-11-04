/**
 * Canva Connect Client — Hybrid MCP + REST API
 * 
 * Design Generation: Uses Canva's MCP server (mcp.canva.com) for AI-powered design creation
 *                    This is the same endpoint Claude uses for generate-design
 * Other Operations: Uses Canva's REST API (api.canva.com/rest/v1) for search, export, folders, etc.
 * 
 * Auth: OAuth 2.0 Bearer token for REST API, passed to MCP for session auth
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';
const CANVA_TIMEOUT_MS = 120000; // 2 minutes for individual API calls
const CANVA_POLL_INTERVAL_MS = 3000; // 3 seconds between status polls
const CANVA_MAX_POLL_ATTEMPTS = 60; // 60 attempts × 3s = up to 3 minutes of polling
const CANVA_EXPORT_POLL_INTERVAL_MS = 2000; // 2 seconds for export polls
const CANVA_EXPORT_MAX_POLLS = 45; // 45 × 2s = up to 90 seconds for export
const CANVA_JOB_TTL_MS = 30 * 60 * 1000; // keep local orchestration state for 30 minutes
const CANVA_PROMPT_MAX_CHARS = 420;
const CANVA_GROQ_MODEL = process.env.CANVA_PROMPT_MODEL || 'llama-3.3-70b-versatile';
const CANVA_OPENROUTER_MODEL = process.env.CANVA_PROMPT_OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const CANVA_OPENROUTER_FALLBACKS = [
  'qwen/qwen3-32b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
];
const CANVA_GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
].filter((key) => key && typeof key === 'string' && key.trim());
const CANVA_OPENROUTER_KEYS = [...new Set(
  [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY_5,
    process.env.OPENROUTER_API_KEY_6,
    process.env.OPENROUTER_API_KEY_7,
    process.env.OPENROUTER_API_KEY_8,
  ]
    .map((key) => (typeof key === 'string' ? key.trim() : ''))
    .filter(Boolean)
)];
let canvaGroqKeyIndex = 0;
let canvaOpenRouterKeyIndex = 0;

const CANVA_ASPECT_RATIO_PRESETS = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '5:4': { width: 1280, height: 1024 },
  '3:4': { width: 960, height: 1280 },
  '4:3': { width: 1280, height: 960 },
  '3:2': { width: 1536, height: 1024 },
  '2:3': { width: 1024, height: 1536 },
  '16:9': { width: 1536, height: 864 },
  '9:16': { width: 864, height: 1536 },
  '2:1': { width: 1536, height: 768 },
};

function roundToNearestEight(value) {
  return Math.max(64, Math.round(Number(value) / 8) * 8);
}

function normalizePromptText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function clampPromptLength(value, maxChars = CANVA_PROMPT_MAX_CHARS) {
  const text = normalizePromptText(value);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim().replace(/[,.\s]+$/, '');
}

function parseRatioValue(value) {
  if (!value) return null;
  const text = normalizePromptText(value).toLowerCase();

  if (!text) return null;
  if (/(square|1\s*[:x×\/\-]\s*1)/.test(text)) {
    return { ratio: '1:1', explicit: true };
  }

  const ratioMatch = text.match(/(?:^|\b)(\d{1,2})\s*(?:[:x×\/]|by)\s*(\d{1,2})(?:\b|$)/i);
  if (!ratioMatch) return null;

  const numerator = Number(ratioMatch[1]);
  const denominator = Number(ratioMatch[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) {
    return null;
  }

  return {
    ratio: `${numerator}:${denominator}`,
    explicit: true,
  };
}

function inferCanvaAspectRatio(prompt = '', explicitRatio = null) {
  const parsedExplicit = parseRatioValue(explicitRatio) || parseRatioValue(prompt);
  if (parsedExplicit?.ratio) {
    return { ratio: parsedExplicit.ratio, explicit: true, source: 'explicit' };
  }

  const text = normalizePromptText(prompt).toLowerCase();
  if (!text) {
    return { ratio: '1:1', explicit: false, source: 'default' };
  }

  const score = new Map([
    ['1:1', 0],
    ['4:5', 0],
    ['5:4', 0],
    ['3:4', 0],
    ['4:3', 0],
    ['3:2', 0],
    ['2:3', 0],
    ['16:9', 0],
    ['9:16', 0],
    ['2:1', 0],
  ]);

  const bump = (ratio, amount) => score.set(ratio, (score.get(ratio) || 0) + amount);

  if (/(logo|icon|avatar|profile|badge|token|product\s*shot|thumbnail|app\s*icon|square)/.test(text)) bump('1:1', 6);
  if (/(instagram\s*post|social\s*post|feed|flyer|promo|poster|editorial|cover\s*art|menu|catalog|brochure|portrait)/.test(text)) bump('4:5', 6);
  if (/(print\s*poster|book\s*cover|vertical\s*poster|art\s*print|invitation|event\s*flyer)/.test(text)) bump('3:4', 5);
  if (/(website\s*hero|banner|header|cover|wide\s*scene|landscape|presentation|deck|web\s*banner|youtube|linkedin|cinematic)/.test(text)) bump('16:9', 7);
  if (/(story|reel|tiktok|phone|mobile|fullscreen|vertical\s*ad|short\s*video|smartphone)/.test(text)) bump('9:16', 7);
  if (/(infographic|slide|product\s*layout|lifestyle\s*scene|editorial\s*spread)/.test(text)) bump('3:2', 4);
  if (/(ads?|campaign|landing\s*page|web\s*header|hero\s*image|brand\s*banner)/.test(text)) bump('16:9', 3);
  if (/(square|centered|grid|tile|badge|sticker)/.test(text)) bump('1:1', 3);

  if (!Array.from(score.values()).some((value) => value > 0)) {
    if (/(people|portrait|headshot|fashion|model|person|face|couple|team)/.test(text)) {
      return { ratio: '4:5', explicit: false, source: 'heuristic' };
    }
    if (/(scene|landscape|cityscape|room|interior|product|still\s*life|mockup|architecture)/.test(text)) {
      return { ratio: '3:2', explicit: false, source: 'heuristic' };
    }
    return { ratio: '1:1', explicit: false, source: 'default' };
  }

  let bestRatio = '1:1';
  let bestScore = -Infinity;
  for (const [ratio, value] of score.entries()) {
    if (value > bestScore) {
      bestScore = value;
      bestRatio = ratio;
    }
  }

  return { ratio: bestRatio, explicit: false, source: 'heuristic' };
}

function getCanvaAspectRatioDimensions(ratio) {
  const ratioText = normalizePromptText(ratio || '1:1');
  const preset = CANVA_ASPECT_RATIO_PRESETS[ratioText];
  if (preset) return { ...preset, ratio: ratioText };

  const match = ratioText.match(/^(\d{1,3}):(\d{1,3})$/);
  if (!match) {
    return { ...CANVA_ASPECT_RATIO_PRESETS['1:1'], ratio: '1:1' };
  }

  const widthRatio = Number(match[1]);
  const heightRatio = Number(match[2]);
  const isLandscape = widthRatio >= heightRatio;
  const longEdge = 1536;
  const computedWidth = isLandscape ? longEdge : roundToNearestEight(longEdge * (widthRatio / heightRatio));
  const computedHeight = isLandscape ? roundToNearestEight(longEdge * (heightRatio / widthRatio)) : longEdge;

  return {
    ratio: ratioText,
    width: roundToNearestEight(computedWidth),
    height: roundToNearestEight(computedHeight),
  };
}

function buildCanvaCompositionCue(ratio) {
  const normalized = normalizePromptText(ratio || '1:1');
  switch (normalized) {
    case '16:9':
      return 'wide cinematic composition, strong foreground-to-background depth, generous negative space, and a clear focal path';
    case '9:16':
      return 'tall vertical composition, hero subject framed for a mobile-first canvas, with a strong top-to-bottom visual flow';
    case '4:5':
      return 'portrait marketing composition with a strong focal hierarchy, polished spacing, and clean breathing room';
    case '3:4':
      return 'vertical editorial composition with balanced margins and a refined poster-ready layout';
    case '3:2':
      return 'editorial landscape composition with balanced framing and room for layered depth';
    case '2:3':
      return 'tall print-style composition with a clear vertical focal line and elegant negative space';
    case '4:3':
      return 'classic balanced composition with stable framing and natural subject separation';
    case '5:4':
      return 'compact landscape composition with a premium layout and confident subject placement';
    case '2:1':
      return 'ultra-wide composition with panoramic breathing room and a strong horizontal flow';
    default:
      return 'balanced composition with a clean focal point and strong subject separation';
  }
}

function buildCanvaStyleCue(designType, prompt) {
  const text = normalizePromptText(`${designType || ''} ${prompt || ''}`.toLowerCase());
  if (/(logo|icon|badge|mark)/.test(text)) {
    return 'minimal, clean vector-inspired styling, simple geometry, crisp edges, and premium brand polish';
  }
  if (/(product|packaging|mockup|commerce|ecommerce|ad|campaign)/.test(text)) {
    return 'commercial-grade styling with premium materials, soft studio lighting, and a polished advertising finish';
  }
  if (/(portrait|people|headshot|fashion|beauty|character)/.test(text)) {
    return 'professional portrait styling with flattering light, realistic skin texture, and strong subject emphasis';
  }
  if (/(landscape|scene|architecture|interior|travel|cityscape)/.test(text)) {
    return 'editorial scene styling with depth, atmospheric lighting, and refined environmental detail';
  }
  return 'professional, high-end visual styling with refined color harmony, crisp detail, and a finished design look';
}

function buildCanvaQualityCue(designType) {
  const text = normalizePromptText(designType || '').toLowerCase();
  if (text === 'custom') {
    return 'clear layout structure, intentional whitespace, and polished composition suitable for a Canva canvas';
  }
  return 'high detail, sharp focus, clean edges, coherent lighting, realistic textures, and a finished professional render';
}

function buildCanvaNegativeCue() {
  return 'avoid clutter, warped geometry, extra limbs, distorted text, muddy backgrounds, low contrast, and blurry artifacts';
}

function buildCanvaFallbackPrompt(prompt, { aspectRatio, designType } = {}) {
  const cleanPrompt = normalizePromptText(prompt);
  const ratioCue = buildCanvaCompositionCue(aspectRatio);
  const styleCue = buildCanvaStyleCue(designType, cleanPrompt);
  const qualityCue = buildCanvaQualityCue(designType);
  const negativeCue = buildCanvaNegativeCue();

  return clampPromptLength([
    cleanPrompt,
    `composition: ${ratioCue}`,
    `style: ${styleCue}`,
    `quality: ${qualityCue}`,
    `negative prompt: ${negativeCue}`,
  ].filter(Boolean).join('. '));
}

function buildCanvaPromptOptimizationSystemPrompt() {
  return `You are a senior image-directing prompt engineer for Canva image generation.
Rewrite the user's brief into a polished generation prompt that produces professional, visually appealing results.

Return ONLY valid JSON with this schema:
{
  "optimized_prompt": "string",
  "aspect_ratio": "string",
  "composition": "string",
  "style": "string",
  "quality": "string",
  "negative_prompt": "string"
}

Rules:
- Preserve the user's intent and subject matter.
- Improve composition, layout, styling, lighting, and overall visual polish.
- If the user specified an aspect ratio, preserve it exactly.
- If no ratio was specified, choose the most suitable ratio from: 1:1, 4:5, 5:4, 3:4, 4:3, 3:2, 2:3, 16:9, 9:16, 2:1.
- Keep the final prompt concise, directive, and production-quality.
- Avoid markdown, code fences, and commentary.`;
}

function buildCanvaPromptOptimizationUserMessage(prompt, { aspectRatio, designType } = {}) {
  return JSON.stringify({
    prompt: normalizePromptText(prompt),
    aspect_ratio: aspectRatio || null,
    design_type: designType || null,
    composition_hint: buildCanvaCompositionCue(aspectRatio),
    style_hint: buildCanvaStyleCue(designType, prompt),
    quality_hint: buildCanvaQualityCue(designType),
  }, null, 2);
}

function extractJSON(text) {
  if (!text) return null;

  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {
      // continue
    }
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (_) {
      // continue
    }
  }

  return null;
}

function getCanvaGroqClient() {
  if (CANVA_GROQ_KEYS.length === 0) return null;
  const key = CANVA_GROQ_KEYS[canvaGroqKeyIndex % CANVA_GROQ_KEYS.length];
  canvaGroqKeyIndex += 1;
  return new Groq({ apiKey: key, timeout: 5000, maxRetries: 0 });
}

function getCanvaOpenRouterClient() {
  if (CANVA_OPENROUTER_KEYS.length === 0) return null;
  const key = CANVA_OPENROUTER_KEYS[canvaOpenRouterKeyIndex % CANVA_OPENROUTER_KEYS.length];
  canvaOpenRouterKeyIndex += 1;
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 5000,
    maxRetries: 0,
  });
}

async function optimizeCanvaPrompt(prompt, { aspectRatio, designType } = {}) {
  const cleanPrompt = normalizePromptText(prompt);
  const explicitRatio = parseRatioValue(aspectRatio);
  const inferredRatio = explicitRatio?.ratio
    ? { ratio: explicitRatio.ratio, explicit: true, source: 'explicit' }
    : inferCanvaAspectRatio(cleanPrompt);
  const resolvedRatio = inferredRatio?.ratio || '1:1';

  const systemPrompt = buildCanvaPromptOptimizationSystemPrompt();
  const userMessage = buildCanvaPromptOptimizationUserMessage(cleanPrompt, {
    aspectRatio: resolvedRatio,
    designType,
  });

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const normalizeResult = (content) => {
    const parsed = extractJSON(content);
    if (!parsed) return null;

    const candidateRatio = parseRatioValue(parsed.aspect_ratio || parsed.aspectRatio || resolvedRatio)?.ratio || resolvedRatio;
    const parts = [
      parsed.optimized_prompt || parsed.prompt || cleanPrompt,
      parsed.composition ? `composition: ${parsed.composition}` : buildCanvaCompositionCue(candidateRatio),
      parsed.style ? `style: ${parsed.style}` : buildCanvaStyleCue(designType, cleanPrompt),
      parsed.quality ? `quality: ${parsed.quality}` : buildCanvaQualityCue(designType),
      parsed.negative_prompt ? `negative prompt: ${parsed.negative_prompt}` : buildCanvaNegativeCue(),
    ];

    return {
      prompt: clampPromptLength(parts.filter(Boolean).join('. ')),
      aspectRatio: candidateRatio,
      source: 'ai',
    };
  };

  if (CANVA_GROQ_KEYS.length > 0) {
    for (let attempt = 0; attempt < CANVA_GROQ_KEYS.length; attempt++) {
      try {
        const client = getCanvaGroqClient();
        if (!client) break;
        const response = await client.chat.completions.create({
          model: CANVA_GROQ_MODEL,
          messages,
          temperature: 0.45,
          max_tokens: 600,
        });
        const content = response.choices[0]?.message?.content;
        const normalized = normalizeResult(content);
        if (normalized?.prompt) {
          return normalized;
        }
      } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (!message.includes('rate limit') && !message.includes('429') && !message.includes('timeout') && !message.includes('503')) {
          break;
        }
      }
    }
  }

  if (CANVA_OPENROUTER_KEYS.length > 0) {
    const models = [CANVA_OPENROUTER_MODEL, ...CANVA_OPENROUTER_FALLBACKS].filter(Boolean);
    for (const model of [...new Set(models)]) {
      for (let attempt = 0; attempt < Math.min(CANVA_OPENROUTER_KEYS.length, 2); attempt++) {
        try {
          const client = getCanvaOpenRouterClient();
          if (!client) break;
          const response = await client.chat.completions.create({
            model,
            messages,
            temperature: 0.45,
            max_tokens: 600,
          });
          const content = response.choices[0]?.message?.content;
          const normalized = normalizeResult(content);
          if (normalized?.prompt) {
            return normalized;
          }
        } catch (error) {
          const message = String(error?.message || '').toLowerCase();
          if (message.includes('404') || message.includes('not found') || message.includes('data policy')) {
            break;
          }
          if (!message.includes('rate limit') && !message.includes('429') && !message.includes('timeout') && !message.includes('503')) {
            break;
          }
        }
      }
    }
  }

  return {
    prompt: buildCanvaFallbackPrompt(cleanPrompt, { aspectRatio: resolvedRatio, designType }),
    aspectRatio: resolvedRatio,
    source: 'fallback',
  };
}

function buildCanvaSeedImagePrompt(prompt = '', { designType = '', aspectRatio = '1:1' } = {}) {
  const cleanPrompt = normalizePromptText(prompt);
  const ratioCue = buildCanvaCompositionCue(aspectRatio);
  const styleCue = buildCanvaStyleCue(designType, cleanPrompt);
  const qualityCue = buildCanvaQualityCue(designType);
  const negativeCue = buildCanvaNegativeCue();

  return clampPromptLength([
    cleanPrompt,
    `composition: ${ratioCue}`,
    `style: ${styleCue}`,
    `quality: ${qualityCue}`,
    `negative prompt: ${negativeCue}`,
  ].filter(Boolean).join('. '));
}

// Local in-process job state. This provides async UX/progress for generation jobs.
// If the runtime restarts, callers can still check Canva native job endpoints as fallback.
const canvaGenerationJobs = new Map();

function newJobId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `canva_job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function setGenerationJob(jobId, patch) {
  const current = canvaGenerationJobs.get(jobId) || {
    jobId,
    status: 'in_progress',
    stage: 'queued',
    progress: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const next = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  canvaGenerationJobs.set(jobId, next);
  return next;
}

function getGenerationJob(jobId) {
  const job = canvaGenerationJobs.get(jobId);
  if (!job) return null;

  if (Date.now() - (job.createdAt || 0) > CANVA_JOB_TTL_MS) {
    canvaGenerationJobs.delete(jobId);
    return null;
  }

  return job;
}

function inferDesignType(prompt = '') {
  const value = String(prompt || '').toLowerCase();
  if (/(presentation|slides|pitch\s*deck)/.test(value)) return 'presentation';
  if (/(whiteboard|brainstorm|mind\s*map)/.test(value)) return 'whiteboard';
  if (/(email|newsletter)/.test(value)) return 'email';
  if (/(doc|document|proposal|report)/.test(value)) return 'doc';
  return 'presentation';
}

function normalizeDesignType(designType, prompt = '') {
  const value = String(designType || '').trim().toLowerCase();
  const supportedPresetTypes = new Set(['doc', 'email', 'presentation', 'whiteboard']);

  if (supportedPresetTypes.has(value)) return value;

  if (value && value !== 'custom') {
    const promptValue = String(prompt || '').toLowerCase();
    if (/(1:1|square|instagram|thumbnail|avatar|logo)/.test(promptValue)) {
      return 'custom';
    }
    if (/(poster|flyer|banner|invitation|business\s*card|menu|resume|linkedin|facebook|youtube)/.test(promptValue)) {
      return 'custom';
    }
  }

  return supportedPresetTypes.has(inferDesignType(prompt)) ? inferDesignType(prompt) : 'presentation';
}

function inferCustomDimensions(prompt = '') {
  const value = String(prompt || '').toLowerCase();

  if (/1:1|square|instagram|thumbnail|avatar|logo/.test(value)) {
    return { width: 1080, height: 1080 };
  }

  if (/poster|flyer|invitation|menu|business\s*card/.test(value)) {
    return { width: 1080, height: 1350 };
  }

  if (/banner|linkedin|facebook|youtube/.test(value)) {
    return { width: 1920, height: 1080 };
  }

  return null;
}

function buildCreateDesignBody(params = {}, uploadedAssetId = null) {
  const prompt = String(params.prompt || '').trim();
  const designType = normalizeDesignType(params.designType || inferDesignType(prompt), prompt);
  const body = {
    type: 'type_and_asset',
    title: params.title || buildTitleFromPrompt(prompt),
  };

  const dims = parseDimensions(params.dimensions);
  const inferredDims = dims || inferCustomDimensions(prompt);
  if (inferredDims) {
    body.design_type = {
      type: 'custom',
      width: inferredDims.width,
      height: inferredDims.height,
    };
  } else {
    body.design_type = {
      type: 'preset',
      name: designType,
    };
  }

  if (uploadedAssetId) {
    body.asset_id = uploadedAssetId;
  }

  return body;
}

function buildBrandTemplateDesignBody(brandTemplateId, title) {
  return {
    type: 'brand_template',
    brand_template_id: brandTemplateId,
    title,
  };
}

function encodeBase64Name(value) {
  return Buffer.from(String(value || '').trim(), 'utf8').toString('base64');
}

function buildAssetUploadHeaders(assetName) {
  return {
    'Asset-Upload-Metadata': `{ "name_base64": "${encodeBase64Name(assetName || 'Canva seed image')}" }`,
    'Content-Type': 'application/octet-stream',
  };
}

async function uploadCanvaAssetFromBytes(imageBuffer, accessToken, assetName, jobId) {
  const uploadStart = await canvaFetch('/asset-uploads', {
    method: 'POST',
    headers: buildAssetUploadHeaders(assetName),
    body: imageBuffer,
  }, accessToken, CANVA_TIMEOUT_MS);

  const uploadJobId = uploadStart.job?.id || uploadStart.id;
  if (!uploadJobId) {
    throw new Error('Canva asset upload failed to start.');
  }

  let uploadStatus = uploadStart.job?.status || 'in_progress';
  let uploadResult = uploadStart;

  for (let attempt = 0; attempt < CANVA_MAX_POLL_ATTEMPTS && uploadStatus === 'in_progress'; attempt++) {
    await new Promise(resolve => setTimeout(resolve, CANVA_POLL_INTERVAL_MS));
    uploadResult = await canvaFetch(`/asset-uploads/${uploadJobId}`, { method: 'GET' }, accessToken);
    uploadStatus = uploadResult.job?.status || uploadResult.status || 'in_progress';
    setGenerationJob(jobId, {
      stage: 'uploading_asset',
      progress: Math.min(55, 20 + attempt),
    });
  }

  if (uploadStatus !== 'success') {
    throw new Error(uploadResult.job?.error?.message || 'Canva asset upload failed.');
  }

  return uploadResult.job?.asset?.id || uploadResult.asset?.id || null;
}

function parseDimensions(dimensions) {
  if (!dimensions || typeof dimensions !== 'string') return null;
  const match = dimensions.trim().match(/^(\d{2,4})\s*[xX]\s*(\d{2,4})$/);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width < 40 || height < 40 || width > 8000 || height > 8000) return null;
  if (width * height > 25000000) return null;

  return { width, height };
}

function buildTitleFromPrompt(prompt) {
  const raw = String(prompt || '').trim();
  if (!raw) return 'Generated Canva Design';
  const title = raw.replace(/\s+/g, ' ').slice(0, 80);
  return title.length > 0 ? title : 'Generated Canva Design';
}

function buildCanvaAssetName(prompt) {
  const baseName = buildTitleFromPrompt(prompt) || 'Canva seed image';
  return baseName.replace(/\.[a-z0-9]+$/i, '').trim().slice(0, 50) || 'Canva seed image';
}

/**
 * Make an authenticated request to the Canva Connect API
 */
async function canvaFetch(path, options = {}, accessToken, timeout = 30000) {
  const url = path.startsWith('http') ? path : `${CANVA_API_BASE}${path}`;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      
      if (response.status === 401) {
        throw new Error('Canva access token expired or invalid. Please reconnect Canva.');
      }
      if (response.status === 403) {
        throw new Error('Insufficient permissions. Please reconnect Canva with required scopes.');
      }
      if (response.status === 404) {
        throw new Error('Resource not found. Please check the ID and try again.');
      }
      if (response.status === 429) {
        throw new Error('Canva rate limit reached. Please wait a moment and try again.');
      }

      throw new Error(`Canva API error ${response.status}: ${errText.slice(0, 300)}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    return await response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Canva API request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute a Canva tool using the Connect REST API
 * @param {string} toolId - Internal tool ID (e.g., 'canva_search_designs')
 * @param {object} params - Tool parameters
 * @param {string} accessToken - Valid OAuth access token
 * @returns {object} Tool execution result
 */
export async function executeCanvaTool(toolId, params, accessToken) {
  switch (toolId) {
    // ─── SEARCH & BROWSE ───────────────────────────────────────────────────────
    case 'canva_search_designs':
      return await searchDesigns(params, accessToken);

    case 'canva_search':
      return await searchTemplates(params, accessToken);

    // ─── DESIGN ACCESS ─────────────────────────────────────────────────────────
    case 'canva_get_design':
      return await getDesign(params, accessToken);

    case 'canva_get_design_pages':
      return await getDesignPages(params, accessToken);

    case 'canva_get_design_content':
      return await getDesignContent(params, accessToken);

    // ─── FETCH ─────────────────────────────────────────────────────────────────
    case 'canva_fetch':
      return await canvaFetchResource(params, accessToken);

    // ─── IMPORT ────────────────────────────────────────────────────────────────
    case 'canva_import_design_from_url':
      return await importDesignFromUrl(params, accessToken);

    case 'canva_get_design_import_from_url_status':
      return await getImportStatus(params, accessToken);

    // ─── EXPORT ────────────────────────────────────────────────────────────────
    case 'canva_export_design':
      return await exportDesign(params, accessToken);

    case 'canva_get_export_formats':
      return await getExportFormats(params, accessToken);

    case 'canva_get_design_export_status':
      return await getExportStatus(params, accessToken);

    // ─── FOLDER ORGANIZATION ───────────────────────────────────────────────────
    case 'canva_create_folder':
      return await createFolder(params, accessToken);

    case 'canva_move_item_to_folder':
      return await moveItemToFolder(params, accessToken);

    case 'canva_list_folder_items':
      return await listFolderItems(params, accessToken);

    // ─── COLLABORATION ─────────────────────────────────────────────────────────
    case 'canva_add_comment_thread_to_design':
      return await addCommentToDesign(params, accessToken);

    // ─── AI GENERATION ─────────────────────────────────────────────────────────
    case 'canva_generate_design':
      return await generateDesign(params, accessToken);

    case 'canva_get_design_generation_job':
      return await getGenerationStatus(params, accessToken);

    // ─── LEGACY COMPATIBILITY ──────────────────────────────────────────────────
    case 'canva_create_design':
      return await generateDesign({
        prompt: `Create a ${params.type || 'design'} titled "${params.title}"`,
        designType: params.type,
        title: params.title,
      }, accessToken);

    case 'canva_find_designs':
      return await searchDesigns(params, accessToken);

    default:
      throw new Error(`Unknown Canva tool: ${toolId}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search user's saved designs
 */
async function searchDesigns(params, accessToken) {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.set('query', params.query);
  if (params.designType) queryParams.set('design_type', params.designType);
  if (params.limit) queryParams.set('count', String(Math.min(params.limit, 100)));

  const path = `/designs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const result = await canvaFetch(path, { method: 'GET' }, accessToken);

  return {
    designs: result.items || result.designs || [],
    totalCount: result.total || (result.items || result.designs || []).length,
    continuation: result.continuation || null,
  };
}

/**
 * Search Canva's template library
 */
async function searchTemplates(params, accessToken) {
  if (!params.query) throw new Error('Search query is required for template search');

  const queryParams = new URLSearchParams({ query: params.query });
  if (params.designType) queryParams.set('design_type', params.designType);
  if (params.limit) queryParams.set('count', String(Math.min(params.limit, 100)));

  const path = `/brand-templates?${queryParams.toString()}`;
  
  try {
    const result = await canvaFetch(path, { method: 'GET' }, accessToken);
    return {
      templates: result.items || [],
      totalCount: result.total || (result.items || []).length,
    };
  } catch (err) {
    // If brand templates endpoint fails, try designs search as fallback
    if (err.message.includes('404') || err.message.includes('not found')) {
      return await searchDesigns({ ...params }, accessToken);
    }
    throw err;
  }
}

/**
 * Get design metadata
 */
async function getDesign(params, accessToken) {
  if (!params.designId) throw new Error('designId is required');
  
  const result = await canvaFetch(`/designs/${params.designId}`, { method: 'GET' }, accessToken);
  
  return {
    id: result.design?.id || result.id,
    name: result.design?.title || result.title || result.name,
    type: result.design?.design_type || result.design_type,
    createdAt: result.design?.created_at || result.created_at,
    updatedAt: result.design?.updated_at || result.updated_at,
    thumbnail: result.design?.thumbnail || result.thumbnail,
    urls: result.design?.urls || result.urls,
    owner: result.design?.owner || result.owner,
    pageCount: result.design?.page_count || result.page_count,
  };
}

/**
 * Get design pages
 */
async function getDesignPages(params, accessToken) {
  if (!params.designId) throw new Error('designId is required');

  const result = await canvaFetch(`/designs/${params.designId}/pages`, { method: 'GET' }, accessToken);

  return {
    pages: result.items || result.pages || [],
    totalPages: result.total || (result.items || result.pages || []).length,
  };
}

/**
 * Get design content (elements, text, images)
 */
async function getDesignContent(params, accessToken) {
  if (!params.designId) throw new Error('designId is required');

  // Get pages first, then content for specific page or all
  const pagesResult = await canvaFetch(`/designs/${params.designId}/pages`, { method: 'GET' }, accessToken);
  const pages = pagesResult.items || pagesResult.pages || [];

  if (params.pageIndex !== undefined && params.pageIndex < pages.length) {
    // Get content for specific page
    const page = pages[params.pageIndex];
    const pageId = page.id || page.page_id;
    const content = await canvaFetch(
      `/designs/${params.designId}/pages/${pageId}/elements`,
      { method: 'GET' },
      accessToken
    ).catch(() => ({ items: [] }));

    return {
      page: page,
      elements: content.items || content.elements || [],
      totalElements: (content.items || content.elements || []).length,
    };
  }

  // Return all pages with their metadata
  return {
    pages: pages,
    totalPages: pages.length,
    _hint: 'Use pageIndex parameter to get detailed content for a specific page.',
  };
}

/**
 * Fetch a resource from URL
 */
async function canvaFetchResource(params, accessToken) {
  if (!params.url) throw new Error('URL is required');

  // If it's a Canva URL, try to extract design info
  const canvaDesignMatch = params.url.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)/);
  if (canvaDesignMatch) {
    const designId = canvaDesignMatch[1];
    return await getDesign({ designId }, accessToken);
  }

  // For other URLs, return the URL info
  return {
    url: params.url,
    message: 'URL received. If this is a Canva design URL, use import-design-from-url to import it.',
  };
}

/**
 * Import a design from a shared URL
 */
async function importDesignFromUrl(params, accessToken) {
  if (!params.url) throw new Error('URL is required for importing a design');

  const body = {
    url: params.url,
  };
  if (params.title) body.title = params.title;

  const result = await canvaFetch('/imports', {
    method: 'POST',
    body: JSON.stringify(body),
  }, accessToken, CANVA_TIMEOUT_MS);

  return {
    jobId: result.job?.id || result.id,
    status: result.job?.status || result.status || 'pending',
    _hint: 'Use canva_get_design_import_from_url_status to check import progress.',
  };
}

/**
 * Get import job status
 */
async function getImportStatus(params, accessToken) {
  if (!params.jobId) throw new Error('jobId is required');

  const result = await canvaFetch(`/imports/${params.jobId}`, { method: 'GET' }, accessToken);

  return {
    jobId: params.jobId,
    status: result.job?.status || result.status,
    designId: result.job?.result?.design_id || result.design_id,
    error: result.job?.error || result.error,
  };
}

/**
 * Export a design
 */
async function exportDesign(params, accessToken) {
  if (!params.designId) throw new Error('designId is required');
  if (!params.format) throw new Error('format is required (png, jpg, pdf, svg, mp4, gif)');

  const body = {
    design_id: params.designId,
    format: {
      type: params.format.toLowerCase(),
    },
  };

  // Add quality settings
  if (params.quality) {
    body.format.quality = params.quality;
  }
  // Add page range
  if (params.pages) {
    body.pages = params.pages.split(',').map(p => p.trim());
  }
  // PNG transparent background
  if (params.transparent && params.format.toLowerCase() === 'png') {
    body.format.transparent_background = true;
  }
  // Resolution
  if (params.resolution) {
    const dpiMatch = params.resolution.match(/(\d+)/);
    if (dpiMatch) body.format.dpi = parseInt(dpiMatch[1]);
  }

  const result = await canvaFetch('/exports', {
    method: 'POST',
    body: JSON.stringify(body),
  }, accessToken, CANVA_TIMEOUT_MS);

  return {
    jobId: result.job?.id || result.id,
    status: result.job?.status || result.status || 'pending',
    _hint: 'Use canva_get_design_export_status to check export progress and get download URL.',
  };
}

/**
 * Export a design and wait for the export job to complete, returning the download URL (first available)
 */
async function exportAndAwaitThumbnail(designId, accessToken, opts = {}) {
  if (!designId) return null;
  try {
    const format = opts.format || 'png';
    const quality = opts.quality || 'high';
    const pages = opts.pages || undefined;

    // Kick off export
    const exportJob = await exportDesign({ designId, format, quality, pages, transparent: false }, accessToken);
    const jobId = exportJob.jobId || exportJob.id;
    if (!jobId) return null;

    // Poll for export status
    for (let attempt = 0; attempt < CANVA_EXPORT_MAX_POLLS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, CANVA_EXPORT_POLL_INTERVAL_MS));
      const status = await getExportStatus({ jobId }, accessToken);
      const st = String(status.status || '').toLowerCase();
      if (st === 'completed' || st === 'success') {
        // return first downloadable url
        const dl = Array.isArray(status.downloadUrls) ? status.downloadUrls[0] : status.downloadUrl || null;
        return dl || status.downloadUrl || null;
      }
      if (st === 'failed' || st === 'error') break;
    }
  } catch (err) {
    console.warn('[Canva] export/thumbnail generation failed:', err?.message || err);
  }
  return null;
}

/**
 * Get available export formats for a design
 */
async function getExportFormats(params, accessToken) {
  if (!params.designId) throw new Error('designId is required');

  // Get design info to determine available formats based on type
  const design = await getDesign(params, accessToken);
  const designType = design.type || 'unknown';

  // Determine available formats based on design type
  const formats = [
    { format: 'png', quality: ['standard', 'high'], transparent: true, recommended: true },
    { format: 'jpg', quality: ['standard', 'high'], transparent: false },
    { format: 'pdf', quality: ['standard', 'print_ready'], transparent: false },
  ];

  // SVG for logos/icons
  if (['logo', 'icon'].some(t => designType.toLowerCase().includes(t))) {
    formats.push({ format: 'svg', quality: ['standard'], transparent: true, recommended: true });
  }

  // Video formats for animated/video designs
  if (['video', 'animated', 'reel', 'story'].some(t => designType.toLowerCase().includes(t))) {
    formats.push({ format: 'mp4', quality: ['720p', '1080p'], transparent: false });
    formats.push({ format: 'gif', quality: ['standard'], transparent: true });
  }

  return {
    designId: params.designId,
    designType,
    formats,
    recommended: formats.find(f => f.recommended)?.format || 'png',
  };
}

/**
 * Get export job status
 */
async function getExportStatus(params, accessToken) {
  if (!params.jobId) throw new Error('jobId is required');

  const result = await canvaFetch(`/exports/${params.jobId}`, { method: 'GET' }, accessToken);

  const status = result.job?.status || result.status;
  const urls = result.job?.result?.urls || result.urls || [];

  return {
    jobId: params.jobId,
    status,
    progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 50,
    downloadUrls: urls,
    downloadUrl: urls[0] || null,
    error: result.job?.error || result.error,
    _hint: status === 'completed' ? 'Download URLs expire in 24 hours.' : 'Check again in a few seconds.',
  };
}

/**
 * Create a folder
 */
async function createFolder(params, accessToken) {
  if (!params.name) throw new Error('Folder name is required');

  const body = { name: params.name };
  if (params.parentFolderId) {
    body.parent_folder_id = params.parentFolderId;
  }

  const result = await canvaFetch('/folders', {
    method: 'POST',
    body: JSON.stringify(body),
  }, accessToken);

  return {
    folderId: result.folder?.id || result.id,
    name: result.folder?.name || result.name || params.name,
  };
}

/**
 * Move an item to a folder
 */
async function moveItemToFolder(params, accessToken) {
  if (!params.itemId) throw new Error('itemId is required');
  if (!params.folderId) throw new Error('folderId is required');

  await canvaFetch(`/folders/${params.folderId}/items`, {
    method: 'POST',
    body: JSON.stringify({ item_id: params.itemId }),
  }, accessToken);

  return {
    success: true,
    message: `Item moved to folder successfully.`,
    itemId: params.itemId,
    folderId: params.folderId,
  };
}

/**
 * List folder items
 */
async function listFolderItems(params, accessToken) {
  if (!params.folderId) throw new Error('folderId is required');

  const queryParams = new URLSearchParams();
  if (params.sortBy) queryParams.set('sort_by', params.sortBy);
  if (params.limit) queryParams.set('count', String(Math.min(params.limit, 100)));

  const path = `/folders/${params.folderId}/items${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const result = await canvaFetch(path, { method: 'GET' }, accessToken);

  const items = result.items || [];
  const folders = items.filter(i => i.type === 'folder');
  const designs = items.filter(i => i.type !== 'folder');

  return {
    items: designs,
    totalItems: designs.length,
    subfolders: folders,
    totalSubfolders: folders.length,
    continuation: result.continuation || null,
  };
}

/**
 * Add a comment thread to a design
 */
async function addCommentToDesign(params, accessToken) {
  if (!params.designId) throw new Error('designId is required');
  if (!params.comment) throw new Error('comment text is required');

  const body = {
    message: params.comment,
  };

  // Attach to specific page/element if provided
  if (params.pageIndex !== undefined) {
    body.attached_to = { type: 'page', page_index: params.pageIndex };
  }
  if (params.elementId) {
    body.attached_to = { type: 'element', element_id: params.elementId };
  }

  const result = await canvaFetch(`/designs/${params.designId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, accessToken);

  return {
    commentId: result.comment?.id || result.id,
    threadId: result.comment?.thread_id || result.thread_id,
    createdAt: result.comment?.created_at || result.created_at || new Date().toISOString(),
    message: 'Comment added successfully.',
  };
}

/**
 * Generate/find designs using Canva
 * 
 * The Canva Connect REST API does NOT have a free-form AI generation endpoint.
 * That feature is exclusive to Canva's MCP server (used by Claude) which requires
 * Canva's internal session auth.
 * 
 * With the REST API, we can:
 * 1. Search the user's existing designs for relevant matches
 * 2. Return designs with thumbnails, edit URLs, and export capabilities
 * 3. Create new blank designs of a specific type
 */
async function generateDesign(params, accessToken) {
  if (!params.prompt) throw new Error('prompt is required for design generation');

  const prompt = String(params.prompt || '').trim();
  const jobId = newJobId();
  const normalizedDesignType = normalizeDesignType(params.designType, prompt);
  const promptPlan = await optimizeCanvaPrompt(prompt, {
    aspectRatio: params.aspectRatio || params.ratio || params.dimensions || (Number.isFinite(Number(params.width)) && Number.isFinite(Number(params.height)) ? `${params.width}x${params.height}` : ''),
    designType: normalizedDesignType,
  });
  const optimizedPrompt = promptPlan.prompt || buildCanvaFallbackPrompt(prompt, {
    aspectRatio: promptPlan.aspectRatio || '1:1',
    designType: normalizedDesignType,
  });
  const selectedAspectRatio = promptPlan.aspectRatio || inferCanvaAspectRatio(prompt).ratio || '1:1';
  const generationDimensions = getCanvaAspectRatioDimensions(selectedAspectRatio);
  let generatedSeedImageUrl = params.imageUrl || null;
  let selectedBrandTemplateId = params.brandTemplateId || null;

  setGenerationJob(jobId, {
    status: 'in_progress',
    stage: 'queued',
    progress: 5,
    prompt,
    optimizedPrompt,
    designType: normalizedDesignType,
    aspectRatio: selectedAspectRatio,
  });

  (async () => {
    try {
      let uploadedAssetId = null;

      if (!selectedBrandTemplateId && !params.skipTemplateSearch) {
        setGenerationJob(jobId, { stage: 'searching_template', progress: 10 });
        try {
          const templateSearch = await searchTemplates({
            query: extractKeywords(prompt) || prompt,
            designType: normalizedDesignType,
            limit: 5,
          }, accessToken);

          const templates = templateSearch?.templates || [];
          const bestTemplate = templates.find((template) => template?.id || template?.template_id || template?.brand_template_id) || null;
          selectedBrandTemplateId = bestTemplate?.id || bestTemplate?.template_id || bestTemplate?.brand_template_id || null;
        } catch (templateErr) {
          console.warn('[Canva] Template search failed, falling back to asset-based design:', templateErr?.message || templateErr);
        }
      }

      if (selectedBrandTemplateId) {
        setGenerationJob(jobId, { stage: 'creating_from_template', progress: 35 });
        try {
          const created = await canvaFetch('/designs', {
            method: 'POST',
            body: JSON.stringify(buildBrandTemplateDesignBody(selectedBrandTemplateId, buildTitleFromPrompt(prompt))),
          }, accessToken, CANVA_TIMEOUT_MS);

          const design = created.design || created;
          // Attempt to export a thumbnail for a stable preview URL
          let exportedPreviewUrl = null;
          try {
            exportedPreviewUrl = await exportAndAwaitThumbnail(design.id, accessToken, { format: 'png', quality: 'high' });
          } catch (e) {
            console.warn('[Canva] failed to export preview for template design:', e?.message || e);
          }

          const finalResult = {
            status: 'completed',
            stage: 'completed',
            progress: 100,
            prompt,
            optimizedPrompt,
            designType: normalizedDesignType,
            aspectRatio: selectedAspectRatio,
            designId: design.id || null,
            title: design.title || buildTitleFromPrompt(prompt) || null,
            editUrl: design.urls?.edit_url || null,
            viewUrl: design.urls?.view_url || null,
            thumbnailUrl: exportedPreviewUrl || design.thumbnail?.url || null,
            imageUrl: exportedPreviewUrl || design.thumbnail?.url || null,
            _canvaDesign: true,
            _canvaFinalized: true,
            _hint: 'Design generated from a Canva brand template so the canvas opens with real content and layout.',
          };

          setGenerationJob(jobId, finalResult);
          return;
        } catch (templateCreateErr) {
          console.warn('[Canva] Brand template creation failed, falling back to asset-based design:', templateCreateErr?.message || templateCreateErr);
          selectedBrandTemplateId = null;
        }
      }

      let generatedSeedImageBuffer = null;

      if (!generatedSeedImageUrl && !params.brandTemplateId) {
        setGenerationJob(jobId, { stage: 'generating_seed_image', progress: 15 });
        try {
          const { generateImageBytes } = await import('./image-generation.js');
          generatedSeedImageBuffer = await generateImageBytes(
            optimizedPrompt,
            'provider-4/imagen-4',
            `${generationDimensions.width}x${generationDimensions.height}`,
          );
        } catch (seedErr) {
          console.warn('[Canva] Seed image generation failed, continuing without image asset:', seedErr?.message || seedErr);
        }
      }

      // Optional path A: upload a generated image into Canva directly from bytes.
      if (generatedSeedImageBuffer && !selectedBrandTemplateId) {
        setGenerationJob(jobId, { stage: 'uploading_asset', progress: 20 });
        uploadedAssetId = await uploadCanvaAssetFromBytes(
          generatedSeedImageBuffer,
          accessToken,
          buildCanvaAssetName(params.assetName || prompt),
          jobId,
        );
      } else if (generatedSeedImageUrl && !selectedBrandTemplateId) {
        console.warn('[Canva] Skipping URL-based asset upload and creating a blank design fallback because a raw image buffer was not available.');
      }

      // Optional path B: Enterprise/trial template autofill generation.
      if (params.brandTemplateId && params.data && typeof params.data === 'object') {
        setGenerationJob(jobId, { stage: 'autofilling_template', progress: 55 });
        const autofillStart = await canvaFetch('/autofills', {
          method: 'POST',
          body: JSON.stringify({
            brand_template_id: params.brandTemplateId,
            title: params.title || buildTitleFromPrompt(prompt),
            data: params.data,
          }),
        }, accessToken, CANVA_TIMEOUT_MS);

        const autofillJobId = autofillStart.job?.id || autofillStart.id;
        if (!autofillJobId) {
          throw new Error('Canva autofill job failed to start.');
        }

        let autofillStatus = autofillStart.job?.status || 'in_progress';
        let autofillResult = autofillStart;

        for (let attempt = 0; attempt < CANVA_MAX_POLL_ATTEMPTS && autofillStatus === 'in_progress'; attempt++) {
          await new Promise(resolve => setTimeout(resolve, CANVA_POLL_INTERVAL_MS));
          autofillResult = await canvaFetch(`/autofills/${autofillJobId}`, { method: 'GET' }, accessToken);
          autofillStatus = autofillResult.job?.status || autofillResult.status || 'in_progress';
          setGenerationJob(jobId, {
            stage: 'autofilling_template',
            progress: Math.min(90, 55 + attempt),
          });
        }

        if (autofillStatus !== 'success') {
          throw new Error(autofillResult.job?.error?.message || 'Canva autofill job failed.');
        }

        const design = autofillResult.job?.result?.design || {};
        // Attempt to export a preview image for UI thumbnail
        let exportedPreviewUrl = null;
        try {
          exportedPreviewUrl = await exportAndAwaitThumbnail(design.id, accessToken, { format: 'png', quality: 'high' });
        } catch (e) {
          console.warn('[Canva] failed to export preview for autofill design:', e?.message || e);
        }

        const finalResult = {
          status: 'completed',
          stage: 'completed',
          progress: 100,
          prompt,
          optimizedPrompt,
          designType: params.designType || inferDesignType(prompt),
          aspectRatio: selectedAspectRatio,
          designId: design.id || null,
          title: design.title || params.title || null,
          editUrl: design.urls?.edit_url || design.url || null,
          viewUrl: design.urls?.view_url || null,
          thumbnailUrl: exportedPreviewUrl || design.thumbnail?.url || null,
          imageUrl: exportedPreviewUrl || design.thumbnail?.url || null,
          _canvaDesign: true,
          _hint: 'Design generated via Canva template autofill.',
        };

        setGenerationJob(jobId, finalResult);
        return;
      }

      // Path C: Create a new Canva design (blank or seeded with uploaded asset).
      setGenerationJob(jobId, { stage: 'creating_design', progress: 70 });
      const createDesignDimensions = params.dimensions || `${generationDimensions.width}x${generationDimensions.height}`;
      const createBody = buildCreateDesignBody({
        ...params,
        designType: normalizedDesignType,
        prompt,
        dimensions: createDesignDimensions,
      }, uploadedAssetId);
      const created = await canvaFetch('/designs', {
        method: 'POST',
        body: JSON.stringify(createBody),
      }, accessToken, CANVA_TIMEOUT_MS);

      const design = created.design || created;
      // Try to export a thumbnail so the chat UI can show a preview image
      let exportedPreviewUrl = null;
      try {
        exportedPreviewUrl = await exportAndAwaitThumbnail(design.id, accessToken, { format: 'png', quality: 'high' });
      } catch (e) {
        console.warn('[Canva] failed to export preview for created design:', e?.message || e);
      }

      const finalResult = {
        status: 'completed',
        stage: 'completed',
        progress: 100,
        prompt,
        optimizedPrompt,
        designType: normalizedDesignType,
        aspectRatio: selectedAspectRatio,
        designId: design.id || null,
        title: design.title || createBody.title || null,
        editUrl: design.urls?.edit_url || null,
        viewUrl: design.urls?.view_url || null,
        thumbnailUrl: exportedPreviewUrl || design.thumbnail?.url || null,
        imageUrl: exportedPreviewUrl || design.thumbnail?.url || null,
        _canvaDesign: true,
        _canvaFinalized: true,
        _hint: uploadedAssetId
          ? 'Design generated by creating a new Canva design with a directly uploaded Canva asset.'
          : 'Design generated by creating a new Canva design. Open in Canva to continue editing.',
      };

      setGenerationJob(jobId, finalResult);
    } catch (err) {
      setGenerationJob(jobId, {
        status: 'failed',
        stage: 'failed',
        progress: 0,
        error: err.message || 'Canva generation failed.',
      });
    }
  })();

  return {
    jobId,
    status: 'in_progress',
    stage: 'queued',
    progress: 5,
    prompt,
    optimizedPrompt,
    designType: normalizedDesignType,
    aspectRatio: selectedAspectRatio,
    _hint: 'Canva generation started in background. Use canva_get_design_generation_job with this jobId to track progress.',
  };
}

/**
 * Extract relevant keywords from a design prompt for search
 */
function extractKeywords(prompt) {
  const stopWords = ['create', 'make', 'design', 'generate', 'build', 'an', 'a', 'the', 'with', 'for', 'and', 'use', 'using', 'add', 'include', 'professional', 'ultra', 'detailed', 'ratio', 'please', 'want', 'need', 'like', 'style', 'modern', 'should', 'can', 'you'];
  const words = prompt.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  return words.slice(0, 5).join(' ');
}

/**
 * Get design generation job status
 */
async function getGenerationStatus(params, accessToken) {
  if (!params.jobId) throw new Error('jobId is required');

  const localJob = getGenerationJob(params.jobId);
  if (localJob) {
    return {
      ...localJob,
      jobId: params.jobId,
      error: localJob.error || null,
    };
  }

  // Try autofills endpoint
  try {
    const result = await canvaFetch(`/autofills/${params.jobId}`, { method: 'GET' }, accessToken);
    const status = result.job?.status || result.status;
    const normalizedStatus = status === 'success' ? 'completed' : status === 'in_progress' ? 'in_progress' : status;
    const design = result.job?.result?.design || {};

    return {
      jobId: params.jobId,
      status: normalizedStatus,
      stage: normalizedStatus === 'completed' ? 'completed' : normalizedStatus === 'failed' ? 'failed' : 'autofilling_template',
      progress: normalizedStatus === 'completed' ? 100 : normalizedStatus === 'failed' ? 0 : 60,
      designId: design.id || result.job?.result?.design_id,
      editUrl: design.urls?.edit_url,
      thumbnailUrl: design.thumbnail?.url,
      imageUrl: design.thumbnail?.url,
      _canvaDesign: normalizedStatus === 'completed',
      error: result.job?.error?.message,
    };
  } catch (err) {
    return {
      jobId: params.jobId,
      status: 'unknown',
      error: err.message,
    };
  }
}

export {
  inferCanvaAspectRatio,
  getCanvaAspectRatioDimensions,
  buildCanvaSeedImagePrompt,
  optimizeCanvaPrompt,
};
