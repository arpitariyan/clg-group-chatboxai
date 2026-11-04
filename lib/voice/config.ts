import { VoiceSettings } from './types';

export const ELEVENLABS_CONFIG = {
  get apiKey(): string {
    return process.env.ELEVENLABS_API_KEY || '';
  },

  get modelId(): string {
    return process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
  },

  get voiceId(): string {
    return process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_1_ID || 'EXAVITQu4vr4xnSDxMaL';
  },

  get voice1Id(): string {
    return process.env.ELEVENLABS_VOICE_1_ID || 'EXAVITQu4vr4xnSDxMaL';
  },
  get voice2Id(): string {
    return process.env.ELEVENLABS_VOICE_2_ID || 'IKne3meq5aSn9XLyUdCD';
  },
  get voice3Id(): string {
    return process.env.ELEVENLABS_VOICE_3_ID || 'JBFqnCBsd6RMkjVDRZzb';
  },
  get voice4Id(): string {
    return process.env.ELEVENLABS_VOICE_4_ID || 'ErXwobaYiN019PkySvjV';
  },
  get voice5Id(): string {
    return process.env.ELEVENLABS_VOICE_5_ID || 'pqHfZKP75CvOlQylNhV4';
  },

  get defaultVoiceSettings(): Required<VoiceSettings> {
    return {
      stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.45'),
      similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY || '0.80'),
      style: parseFloat(process.env.ELEVENLABS_STYLE || '0.15'),
      useSpeakerBoost: (process.env.ELEVENLABS_SPEAKER_BOOST ?? 'true') === 'true',
      speed: parseFloat(process.env.ELEVENLABS_SPEED || '0.98'),
    };
  },

  // Free Tier Protection & Safeguards
  maxTextLength: 500, // Maximum characters per TTS generation
  apiBaseUrl: 'https://api.elevenlabs.io/v1',
};
