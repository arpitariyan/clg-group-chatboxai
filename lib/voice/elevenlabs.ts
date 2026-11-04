import { VoiceProvider, VoiceRequest } from './types';
import { ELEVENLABS_CONFIG } from './config';

let currentKeyIndex = 0;

export class ElevenLabsProvider implements VoiceProvider {
  name = 'elevenlabs';

  async synthesize(input: VoiceRequest): Promise<Response> {
    return this.stream(input);
  }

  async stream(input: VoiceRequest): Promise<Response> {
    const keys = [
      process.env.ELEVENLABS_API_KEY,
      process.env.ELEVENLABS_API_KEY_2,
      process.env.ELEVENLABS_API_KEY_3,
      process.env.ELEVENLABS_API_KEY_4,
      process.env.ELEVENLABS_API_KEY_5,
      process.env.ELEVENLABS_API_KEY_6,
      process.env.ELEVENLABS_API_KEY_7,
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      throw new Error('No ELEVENLABS_API_KEY is configured in the environment variables.');
    }

    const voiceId = input.voiceId || ELEVENLABS_CONFIG.voiceId;
    const modelId = input.modelId || ELEVENLABS_CONFIG.modelId;
    const voiceSettings = {
      ...ELEVENLABS_CONFIG.defaultVoiceSettings,
      ...(input.voiceSettings || {})
    };

    const endpoint = `${ELEVENLABS_CONFIG.apiBaseUrl}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`;

    const voice_settings: Record<string, any> = {
      stability: typeof voiceSettings.stability === 'number' ? voiceSettings.stability : 0.45,
      similarity_boost: typeof voiceSettings.similarityBoost === 'number' ? voiceSettings.similarityBoost : 0.80,
      style: typeof voiceSettings.style === 'number' ? voiceSettings.style : 0.15,
      use_speaker_boost: typeof voiceSettings.useSpeakerBoost === 'boolean' ? voiceSettings.useSpeakerBoost : true
    };

    if (typeof voiceSettings.speed === 'number' && voiceSettings.speed >= 0.7 && voiceSettings.speed <= 1.2) {
      voice_settings.speed = voiceSettings.speed;
    }

    const payload = {
      text: input.text,
      model_id: modelId,
      voice_settings
    };

    let lastErrorMessage = '';

    for (let i = 0; i < keys.length; i++) {
      const activeIndex = (currentKeyIndex + i) % keys.length;
      const apiKey = keys[activeIndex];

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          let errorMessage = `ElevenLabs API error (HTTP ${response.status})`;
          try {
            const errorJson = await response.json();
            if (errorJson && errorJson.detail && errorJson.detail.message) {
              errorMessage = `ElevenLabs Error: ${errorJson.detail.message}`;
            } else if (errorJson && errorJson.message) {
              errorMessage = `ElevenLabs Error: ${errorJson.message}`;
            }
          } catch (_) { }

          // If the error is related to quota (402), unauthorized/invalid key (401), or rate limit (429), we switch to the next key
          if (response.status === 401 || response.status === 402 || response.status === 429) {
            console.warn(`ElevenLabs key at index ${activeIndex} failed (${response.status}). Switching to next key...`);
            lastErrorMessage = errorMessage;
            // Update global index to point to the next key permanently
            currentKeyIndex = (activeIndex + 1) % keys.length;
            continue; // Retry with next key
          }

          // If it's a bad request (e.g. 400), don't retry, just throw
          throw new Error(errorMessage);
        }

        // Success! Set the current key to the one that worked for future requests
        currentKeyIndex = activeIndex;
        return response;

      } catch (err: any) {
        lastErrorMessage = err.message || 'Network error';
        // If it's a network error (fetch threw an exception), we should also retry
        console.warn(`ElevenLabs key at index ${activeIndex} encountered an exception. Switching to next key... Error: ${lastErrorMessage}`);
        currentKeyIndex = (activeIndex + 1) % keys.length;
      }
    }

    throw new Error(`All configured ElevenLabs API keys failed. Last error: ${lastErrorMessage}`);
  }
}
