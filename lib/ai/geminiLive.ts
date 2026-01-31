
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

/**
 * IdeaFlow 3.0 Live Logic
 * Adheres to @google/genai SDK guidelines for low-latency voice interaction.
 */

// Manual Base64 implementation as per SDK guidelines
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Manual raw PCM decoding as per SDK guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export interface SessionTranscript {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiLiveConfig {
  apiKey: string;
  model: string;
  voice: string;
  systemInstruction: string;
  onOpen: () => void;
  onModelSpeakingChange: (speaking: boolean) => void;
  onMessage: (message: LiveServerMessage) => void;
  onError: (err: any) => void;
  onClose: () => void;
}

/**
 * GeminiLiveService: The Neural Voice Bridge.
 * Encapsulates the Live API session and hardware management.
 */
export class GeminiLiveService {
  private config: GeminiLiveConfig;
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private transcriptHistory: SessionTranscript[] = [];
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  private isActive: boolean = false;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
    // Always use process.env.API_KEY as per guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Initializes audio contexts and connects to the Gemini Live API.
   */
  async connect(initialHistory: string = "") {
    this.isActive = true;
    
    // Create contexts immediately
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
    this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // GUARD: Check if service was deactivated while waiting for mic permission
      if (!this.isActive) {
        this.cleanup();
        return;
      }
    } catch (err) {
      console.error("Microphone access denied", err);
      this.isActive = false;
      this.cleanup();
      throw new Error("Microphone access is required for voice sessions.");
    }

    this.sessionPromise = this.ai.live.connect({
      model: this.config.model,
      callbacks: {
        onopen: () => {
          // DEFENSIVE: Check for null contexts/streams before use to prevent race condition crash
          if (!this.isActive || !this.inputAudioContext || !this.stream) {
            console.warn("GeminiLive: Attempted to initialize source on inactive session.");
            return;
          }

          try {
            const source = this.inputAudioContext.createMediaStreamSource(this.stream);
            const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!this.isActive || !this.sessionPromise) return;

              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = this.createBlob(inputData);
              
              this.sessionPromise.then((session) => {
                if (this.isActive && session) {
                   session.sendRealtimeInput({ media: pcmBlob });
                }
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputAudioContext.destination);
            this.config.onOpen();
          } catch (e) {
            console.error("GeminiLive: Failed to setup audio processing nodes:", e);
            this.config.onError(e);
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          if (!this.isActive) return;

          this.config.onMessage(message);

          // Track internal transcripts for session summary
          if (message.serverContent?.outputTranscription) {
            this.currentOutputTranscription += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            this.currentInputTranscription += message.serverContent.inputTranscription.text;
          }
          
          if (message.serverContent?.turnComplete) {
            if (this.currentInputTranscription.trim()) {
              this.transcriptHistory.push({ role: 'user', text: this.currentInputTranscription.trim() });
            }
            if (this.currentOutputTranscription.trim()) {
              this.transcriptHistory.push({ role: 'model', text: this.currentOutputTranscription.trim() });
            }
            this.currentInputTranscription = '';
            this.currentOutputTranscription = '';
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && this.outputAudioContext) {
            this.config.onModelSpeakingChange(true);
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            
            try {
              const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
              if (!this.isActive || !this.outputAudioContext) return;

              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputAudioContext.destination);
              
              source.onended = () => {
                this.sources.delete(source);
                if (this.sources.size === 0) {
                  this.config.onModelSpeakingChange(false);
                }
              };
              
              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
              this.sources.add(source);
            } catch (err) {
              console.error("GeminiLive: Error decoding audio part:", err);
            }
          }

          if (message.serverContent?.interrupted) {
            this.stopAllAudio();
            this.config.onModelSpeakingChange(false);
          }
        },
        onerror: (e: any) => {
          console.error("GeminiLive SDK Error:", e);
          this.config.onError(e);
        },
        onclose: () => {
          console.debug("GeminiLive: Connection closed by server.");
          this.cleanup();
          this.config.onClose();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: this.config.voice } },
        },
        systemInstruction: this.config.systemInstruction + (initialHistory ? `\n\nRecent context:\n${initialHistory}` : ''),
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      }
    });

    return this.sessionPromise;
  }

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private stopAllAudio() {
    this.sources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  private async cleanup() {
    this.isActive = false;
    this.stopAllAudio();
    
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    
    if (this.inputAudioContext) {
      try {
        if (this.inputAudioContext.state !== 'closed') {
          await this.inputAudioContext.close();
        }
      } catch (e) {
        console.warn("GeminiLive: Failed to close input context:", e);
      }
      this.inputAudioContext = null;
    }
    
    if (this.outputAudioContext) {
      try {
        if (this.outputAudioContext.state !== 'closed') {
          await this.outputAudioContext.close();
        }
      } catch (e) {
        console.warn("GeminiLive: Failed to close output context:", e);
      }
      this.outputAudioContext = null;
    }
    
    this.sessionPromise = null;
  }

  disconnect(): SessionTranscript[] {
    // Before disconnecting, capture any final trailing transcription
    if (this.currentInputTranscription.trim()) {
      this.transcriptHistory.push({ role: 'user', text: this.currentInputTranscription.trim() });
    }
    if (this.currentOutputTranscription.trim()) {
      this.transcriptHistory.push({ role: 'model', text: this.currentOutputTranscription.trim() });
    }
    
    const finalTranscript = [...this.transcriptHistory];
    this.cleanup();
    return finalTranscript;
  }
}

let activeGlobalService: GeminiLiveService | null = null;

/**
 * Functional wrapper for backward compatibility with existing components.
 */
export const connect = async (
  systemInstruction: string, 
  initialContext: string, 
  onSpeakingChange: (speaking: boolean) => void,
  voiceName: string = 'Zephyr'
) => {
  if (activeGlobalService) {
    activeGlobalService.disconnect();
  }

  activeGlobalService = new GeminiLiveService({
    apiKey: '', 
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    voice: voiceName,
    systemInstruction,
    onOpen: () => {},
    onModelSpeakingChange: onSpeakingChange,
    onMessage: () => {},
    onError: (e) => console.error("Neural Link Error:", e),
    onClose: () => {},
  });
  
  await activeGlobalService.connect(initialContext);
};

/**
 * Returns structured history instead of string.
 */
export const disconnect = async (): Promise<SessionTranscript[]> => {
  if (activeGlobalService) {
    const history = activeGlobalService.disconnect();
    activeGlobalService = null;
    return history;
  }
  return [];
};
