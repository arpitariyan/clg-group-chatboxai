export interface AssistantVoice {
  id: 'voice-1' | 'voice-2' | 'voice-3' | 'voice-4' | 'voice-5' | string;
  name: string;
  voiceId: string;
  description: string;
  personality: string;
  gender: 'female' | 'male' | 'neutral';
  enabled: boolean;
  isDefault?: boolean;
  previewUrl?: string;
}

export const PREVIEW_SAMPLE_TEXT = "Hey! I'm here. How can I help you today?";

/**
 * Approved 5-Voice Registry for ChatBox AI Assistant
 * Server-controlled allowlist mapping internal voiceOptionId to ElevenLabs voiceId
 */
export const ASSISTANT_VOICES: AssistantVoice[] = [
  {
    id: 'voice-1',
    name: 'Sarah',
    voiceId: process.env.ELEVENLABS_VOICE_1_ID || 'EXAVITQu4vr4xnSDxMaL',
    description: 'Warm & Natural',
    personality: 'Warm, calm, supportive, natural',
    gender: 'female',
    enabled: true,
    isDefault: true,
    previewUrl: '/voice-previews/voice-1.mp3',
  },
  {
    id: 'voice-2',
    name: 'Charlie',
    voiceId: process.env.ELEVENLABS_VOICE_2_ID || 'IKne3meq5aSn9XLyUdCD',
    description: 'Friendly & Casual',
    personality: 'Friendly, upbeat, casual, energetic',
    gender: 'male',
    enabled: true,
    previewUrl: '/voice-previews/voice-2.mp3',
  },
  {
    id: 'voice-3',
    name: 'George',
    voiceId: process.env.ELEVENLABS_VOICE_3_ID || 'JBFqnCBsd6RMkjVDRZzb',
    description: 'Trusted & Confident',
    personality: 'Calm, reliable, confident, professional',
    gender: 'male',
    enabled: true,
    previewUrl: '/voice-previews/voice-3.mp3',
  },
  {
    id: 'voice-4',
    name: 'Antoni',
    voiceId: process.env.ELEVENLABS_VOICE_4_ID || 'ErXwobaYiN019PkySvjV',
    description: 'Warm & Grounded',
    personality: 'Warm, mature, grounded, relaxed',
    gender: 'male',
    enabled: true,
    previewUrl: '/voice-previews/voice-4.mp3',
  },
  {
    id: 'voice-5',
    name: 'Bill',
    voiceId: process.env.ELEVENLABS_VOICE_5_ID || 'pqHfZKP75CvOlQylNhV4',
    description: 'Helpful & Reassuring',
    personality: 'Helpful, gentle, reassuring, friendly',
    gender: 'male',
    enabled: true,
    previewUrl: '/voice-previews/voice-5.mp3',
  },
];

export const DEFAULT_ASSISTANT_VOICE_ID = 'voice-1';

/**
 * Get approved AssistantVoice object by voiceOptionId (e.g. "voice-1"), name, or voiceId
 * Falls back to default Voice 1 (Sarah) if invalid or disabled
 */
export function getVoiceOptionById(optionId?: string): AssistantVoice {
  if (!optionId || typeof optionId !== 'string') {
    return ASSISTANT_VOICES[0];
  }

  const clean = optionId.trim().toLowerCase();

  const found = ASSISTANT_VOICES.find((v) => {
    if (!v.enabled) return false;
    return (
      v.id.toLowerCase() === clean ||
      v.name.toLowerCase() === clean ||
      v.voiceId.toLowerCase() === clean
    );
  });

  return found || ASSISTANT_VOICES[0];
}

