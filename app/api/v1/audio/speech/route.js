/**
 * POST /api/v1/audio/speech
 * ChatboxAI API — Text-to-Speech endpoint.
 * Uses Google TTS REST API with OpenAI TTS fallback.
 *
 * Body: { input, voice, model, speed, response_format, language_code }
 * Returns: binary audio stream
 */

import { NextResponse } from 'next/server';
import { validateApiRequest, createApiErrorResponse } from '@/lib/api-gateway.js';
import { calculateAudioCost } from '@/lib/api-pricing.js';
import { deductApiCreditsWithLock } from '@/lib/api-credits.js';
import { databases } from '@/services/appwrite-admin.js';
import { API_USAGE_LOGS_COLLECTION_ID, APPWRITE_DATABASE_ID } from '@/services/appwrite-collections.js';
import { ID } from 'node-appwrite';

const VOICES = {
  alloy:   { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
  echo:    { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE'   },
  fable:   { languageCode: 'en-GB', name: 'en-GB-Neural2-B', ssmlGender: 'MALE'   },
  onyx:    { languageCode: 'en-US', name: 'en-US-Neural2-J', ssmlGender: 'MALE'   },
  nova:    { languageCode: 'en-US', name: 'en-US-Neural2-C', ssmlGender: 'FEMALE' },
  shimmer: { languageCode: 'en-US', name: 'en-US-Neural2-E', ssmlGender: 'FEMALE' },
  coral:   { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Achernar', ssmlGender: 'FEMALE' },
  ash:     { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Charon', ssmlGender: 'MALE' },
  sage:    { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Fenrir', ssmlGender: 'MALE' },
};

const FORMAT_MIME     = { mp3: 'audio/mpeg', opus: 'audio/opus', wav: 'audio/wav' };
const FORMAT_ENCODING = { mp3: 'MP3', opus: 'OGG_OPUS', wav: 'LINEAR16' };

async function logUsage(userId, keyId, voice, chars, costUsd, status = 'success') {
  try {
    await databases.createDocument(APPWRITE_DATABASE_ID, API_USAGE_LOGS_COLLECTION_ID, ID.unique(), {
      user_id: userId, key_id: keyId, endpoint: 'audio', model: 'tts-1',
      provider_used: 'google-tts', input_tokens: chars, output_tokens: 0,
      total_tokens: chars, cost_usd: costUsd, status,
      created_at: new Date().toISOString(), timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (e) { console.error('[ChatboxAI] Failed to log audio usage:', e); }
}

async function googleTTS(text, voiceConfig, encoding, rate) {
  const key = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error('[GoogleTTS] API key not configured.');
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voiceConfig.languageCode, name: voiceConfig.name, ssmlGender: voiceConfig.ssmlGender },
      audioConfig: { audioEncoding: encoding, speakingRate: rate },
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`[GoogleTTS] ${e?.error?.message || res.status}`);
  }
  const data = await res.json();
  if (!data.audioContent) throw new Error('[GoogleTTS] Empty audio response.');
  return Buffer.from(data.audioContent, 'base64');
}

async function openaiTTS(text, voice, model, speed) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('[OpenAI TTS] Key not configured.');
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: key });
  const validVoices = ['alloy','echo','fable','onyx','nova','shimmer'];
  const res = await client.audio.speech.create({
    model: model === 'tts-1-hd' ? 'tts-1-hd' : 'tts-1',
    voice: validVoices.includes(voice) ? voice : 'alloy',
    input: text,
    speed: Math.min(Math.max(speed, 0.25), 4.0),
  });
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(request) {
  const context = await validateApiRequest(request, 0);
  if (!context.valid) return context.errorResponse;

  let body;
  try {
    body = await request.json();
    const { input, voice = 'alloy', model = 'tts-1', speed = 1.0, response_format = 'mp3', language_code } = body;

    if (!input || typeof input !== 'string' || !input.trim()) {
      return createApiErrorResponse('Missing required field: input (string)', 'validation_error', 'invalid_request', 400, context.context);
    }
    if (input.length > 5000) {
      return createApiErrorResponse('input exceeds 5,000 character limit.', 'validation_error', 'text_too_long', 400, context.context);
    }

    // ── TEST environment: return a silent mock audio buffer ───────────────────
    if (context.context.environment === 'test') {
      // Minimal valid MP3 header (silence) so clients can still parse it
      const SILENT_MP3 = Buffer.from('FFFB9000000000000000000000000000000000000000000000000000000000000000', 'hex');
      return new NextResponse(SILENT_MP3, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(SILENT_MP3.length),
          'X-API-Credits-Remaining': '0',
          'X-Characters-Processed': String(input.length),
          'X-Test-Mode': 'true',
        },
      });
    }

    const voiceConfig = { ...(VOICES[voice] || VOICES.alloy) };
    if (language_code) voiceConfig.languageCode = language_code;
    const encoding = FORMAT_ENCODING[response_format] || 'MP3';
    const mimeType = FORMAT_MIME[response_format] || 'audio/mpeg';
    const rate = Math.min(Math.max(Number(speed) || 1.0, 0.25), 4.0);
    const costUsd = calculateAudioCost(input);

    // ── PRE-DEDUCT credits before calling provider ────────────────────────────
    const deduction = await deductApiCreditsWithLock(context.context.userEmail, costUsd, {
      transactionType: 'usage', keyId: context.context.keyId, endpoint: 'audio', costUsd,
      meta: { voice, chars: input.length, format: response_format },
    });

    if (!deduction.success) {
      return createApiErrorResponse(deduction.error || 'Insufficient API credits.', 'payment_required', 'insufficient_api_credits', 402, context.context);
    }

    let audioBuffer;
    try {
      try {
        audioBuffer = await googleTTS(input, voiceConfig, encoding, rate);
      } catch (gErr) {
        console.warn('[ChatboxAI] Google TTS failed, trying OpenAI:', gErr.message);
        audioBuffer = await openaiTTS(input, voice, model, rate);
      }
    } catch (providerErr) {
      // Refund credits if both providers fail
      const { addApiCreditsWithLock } = await import('@/lib/api-credits.js');
      await addApiCreditsWithLock(context.context.userEmail, costUsd, {
        transactionType: 'refund', keyId: context.context.keyId, endpoint: 'audio', costUsd,
        meta: { reason: 'TTS provider failed', error: providerErr.message },
      });
      throw providerErr;
    }

    logUsage(context.context.userId, context.context.keyId, voice, input.length, costUsd);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(audioBuffer.length),
        'X-API-Credits-Remaining': String(deduction.balance_credits ?? 0),
        'X-Characters-Processed': String(input.length),
      },
    });
  } catch (err) {
    console.error('[ChatboxAI] /api/v1/audio/speech error:', err);
    if (body && context?.context) logUsage(context.context.userId, context.context.keyId, body.voice || 'alloy', 0, 0, 'error');
    return createApiErrorResponse(err.message || 'Audio synthesis failed.', 'server_error', 'internal_error', 500, context.context);
  }
}

export async function GET(request) {
  const context = await validateApiRequest(request, 0);
  if (!context.valid) return context.errorResponse;
  return NextResponse.json({
    object: 'list',
    data: Object.entries(VOICES).map(([id, c]) => ({
      id, name: id.charAt(0).toUpperCase() + id.slice(1),
      language: c.languageCode, gender: c.ssmlGender.toLowerCase(), provider: 'google-tts',
    })),
  });
}
