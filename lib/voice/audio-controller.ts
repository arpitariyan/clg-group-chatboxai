import { PlaybackState } from './types';
import { loadUserVoicePreference } from '@/lib/user-preferences';
import { DEFAULT_ASSISTANT_VOICE_ID } from './voice-registry';

export interface AudioControllerOptions {
  onStateChange?: (state: PlaybackState) => void;
  onLevelUpdate?: (level: number) => void;
  onError?: (error: Error) => void;
}

export class AudioController {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private abortController: AbortController | null = null;
  private animFrameId: number | null = null;
  private state: PlaybackState = 'idle';

  private onStateChange?: (state: PlaybackState) => void;
  private onLevelUpdate?: (level: number) => void;
  private onError?: (error: Error) => void;

  constructor(options: AudioControllerOptions = {}) {
    this.onStateChange = options.onStateChange;
    this.onLevelUpdate = options.onLevelUpdate;
    this.onError = options.onError;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  private setState(newState: PlaybackState) {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(newState);
      }
    }
  }

  /**
   * Initialize or resume Web Audio Context safely (mobile-friendly)
   */
  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Stop active speech and cancel pending HTTP fetch requests immediately
   */
  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (_) {}
      this.currentSource = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.onLevelUpdate) {
      this.onLevelUpdate(0);
    }

    this.setState('stopped');
  }

  /**
   * Synthesize and play audio response from /api/tts endpoint
   */
  public async playText(text: string, voiceId?: string, authHeader?: string): Promise<void> {
    // 1. Stop any currently playing audio immediately
    this.stop();

    if (!text || !text.trim()) {
      return;
    }

    this.setState('loading');
    this.abortController = new AbortController();

    // Resolve effective voice ID: explicit parameter -> saved user preference -> Sarah (voice-1)
    const effectiveVoiceId = voiceId || loadUserVoicePreference() || DEFAULT_ASSISTANT_VOICE_ID;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, voiceOptionId: effectiveVoiceId, voiceId: effectiveVoiceId }),
        signal: this.abortController.signal
      });


      if (!response.ok) {
        let errMessage = `TTS service returned HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson?.error) {
            errMessage = errorJson.error;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Received empty audio stream from TTS service');
      }

      // Decode audio and start playback
      await this.playAudioBuffer(arrayBuffer);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was intentional canceled, ignore error
        return;
      }

      console.error('AudioController playback error:', err);
      this.setState('error');
      if (this.onError) {
        this.onError(err);
      }
    }
  }

  /**
   * Decode ArrayBuffer into Web Audio buffer & analyze amplitude in real-time
   */
  private async playAudioBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    const ctx = this.initAudioContext();

    // Decode MP3 buffer
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Create Source and Analyser nodes
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    this.currentSource = source;
    this.analyser = analyser;

    // Track audio levels during playback
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (this.state !== 'playing' || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      // Normalized level between 0.0 and 1.0
      const normalizedLevel = Math.min(1.0, Math.max(0.0, average / 128));

      if (this.onLevelUpdate) {
        this.onLevelUpdate(normalizedLevel);
      }

      this.animFrameId = requestAnimationFrame(updateLevel);
    };

    source.onended = () => {
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      if (this.onLevelUpdate) {
        this.onLevelUpdate(0);
      }
      this.currentSource = null;
      this.setState('idle');
    };

    this.setState('playing');
    source.start(0);
    updateLevel();
  }
}
