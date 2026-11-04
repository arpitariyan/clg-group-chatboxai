import { VoiceProvider } from './types';
import { ElevenLabsProvider } from './elevenlabs';

let cachedProvider: VoiceProvider | null = null;

/**
 * Returns active VoiceProvider instance (defaults to ElevenLabs).
 * Allows effortless swapping or fallback to alternative providers in the future.
 */
export function getVoiceProvider(): VoiceProvider {
  if (!cachedProvider) {
    cachedProvider = new ElevenLabsProvider();
  }
  return cachedProvider;
}

export * from './types';
export * from './config';
export * from './preprocess';
export * from './voice-registry';
