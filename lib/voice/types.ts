export interface VoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

export interface VoiceRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
}

export interface VoiceProvider {
  name: string;
  synthesize(input: VoiceRequest): Promise<Response>;
  stream(input: VoiceRequest): Promise<Response>;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
