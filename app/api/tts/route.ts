import { NextResponse } from 'next/server';
import { getVoiceProvider, preprocessTextForTTS, ELEVENLABS_CONFIG, getVoiceOptionById } from '@/lib/voice/provider';
import { resolveRequestUser } from '@/lib/server-auth';
import { deductApiCreditsWithLock } from '@/lib/api-credits';

// Simple in-memory cache for repeated short audio responses to save ElevenLabs credits
const ttsCache = new Map<string, { buffer: ArrayBuffer; timestamp: number }>();
const MAX_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getCacheKey(text: string, voiceOptionId: string, modelId: string): string {
  return `${text.trim()}:${voiceOptionId}:${modelId}`;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate request if bearer token is provided (optional for voice)
    let userEmail: string | null = null;
    try {
      const authedUser = await resolveRequestUser(req, false);
      userEmail = authedUser?.email || null;
    } catch (_) {
      userEmail = null;
    }

    // 2. Parse and validate JSON request body
    const body = await req.json().catch(() => ({}));
    const rawText = body.text || '';

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json(
        { error: 'Text field is required for TTS synthesis.' },
        { status: 400 }
      );
    }

    // 3. Preprocess text (strip markdown, normalize numbers/dates/currencies, enforce max character limit)
    const processedText = preprocessTextForTTS(rawText, ELEVENLABS_CONFIG.maxTextLength);

    if (!processedText) {
      return NextResponse.json(
        { error: 'Provided text contains no synthesizable words.' },
        { status: 400 }
      );
    }

    // 4. Server-controlled voice option lookup (resolves approved voiceId from ASSISTANT_VOICES registry)
    const voiceOptionId = body.voiceOptionId || body.voiceId || 'voice-1';
    const approvedVoice = getVoiceOptionById(voiceOptionId);
    const voiceId = approvedVoice.voiceId;
    const modelId = body.modelId || ELEVENLABS_CONFIG.modelId;

    // 5. Check cache for repeated queries
    const cacheKey = getCacheKey(processedText, approvedVoice.id, modelId);
    const cachedEntry = ttsCache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return new Response(cachedEntry.buffer.slice(0), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cachedEntry.buffer.byteLength.toString(),
          'X-TTS-Cache': 'HIT',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // 5. Check ElevenLabs API Key configuration
    if (!ELEVENLABS_CONFIG.apiKey) {
      console.warn('ELEVENLABS_API_KEY is not configured.');
      return NextResponse.json(
        { error: 'Voice generation is temporarily unavailable.' },
        { status: 503 }
      );
    }

    // 6. Invoke ElevenLabs streaming via provider abstraction
    const provider = getVoiceProvider();
    const elevenLabsResponse = await provider.stream({
      text: processedText,
      voiceId,
      modelId
    });

    // 7. Clone & buffer for cache, then return stream to browser
    const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();

    // Store in LRU cache if buffer is valid
    if (audioArrayBuffer && audioArrayBuffer.byteLength > 0) {
      if (ttsCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, {
        buffer: audioArrayBuffer.slice(0),
        timestamp: Date.now()
      });
    }

    // Deduplicate/record API credit usage if user is authenticated
    if (userEmail) {
      try {
        await deductApiCreditsWithLock(userEmail, 1, {
          endpoint: 'elevenlabs_tts',
          transactionType: 'tts_usage',
          meta: { voiceId, modelId, textLength: processedText.length }
        });
      } catch (creditErr) {
        console.warn('Failed to record TTS credit usage:', creditErr);
      }
    }

    return new Response(audioArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioArrayBuffer.byteLength.toString(),
        'X-TTS-Cache': 'MISS',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('TTS API Error:', error?.stack || error?.message || error);

    const status = typeof error?.status === 'number' ? error.status : 500;
    return NextResponse.json(
      { 
        error: error?.message || 'Voice generation encountered an error.',
        detail: error?.toString()
      },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
