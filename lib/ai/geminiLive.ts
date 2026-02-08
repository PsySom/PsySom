
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Message } from '../../types';

/**
 * IdeaFlow 3.0 Live Logic: REFACTORED RESOURCE MANAGER
 * Implements a strict Kill-Switch Protocol to prevent "Insufficient Resources" faults.
 * Orchestrates low-latency multimodal link with atomic cleanup.
 */

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

export interface GeminiLiveConfig {
  model: string;
  voice: string;
  systemInstruction: string;
  initialContext?: Message[];
  apiKey?: string;
  onOpen?: () => void;
  onModelSpeakingChange?: (speaking: boolean) => void;
  onUserText?: (text: string) => void;
  onAiText?: (text: string) => void;
  onTurnComplete?: (userText: string, aiText: string) => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}

export class GeminiLiveService {
  private config: GeminiLiveConfig;
  private sessionPromise: Promise<any> | null = null;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  private isActive = false;
  private isConnecting = false;

  constructor(config: GeminiLiveConfig) {
    this.config = config;
  }

  private async cleanup() {
    this.isActive = false;
    this.isConnecting = false;
    
    if (this.processor) {
      try {
        this.processor.onaudioprocess = null;
        this.processor.disconnect();
      } catch (e) {}
      this.processor = null;
    }

    if (this.session) {
      try { 
        this.session.close(); 
      } catch (e) {}
      this.session = null;
    }

    this.stopAllAudio();

    if (this.stream) {
      this.stream.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      this.stream = null;
    }

    if (this.inputAudioContext) {
      if (this.inputAudioContext.state !== 'closed') {
        try { await this.inputAudioContext.close(); } catch (e) {}
      }
      this.inputAudioContext = null;
    }
    
    if (this.outputAudioContext) {
      if (this.outputAudioContext.state !== 'closed') {
        try { await this.outputAudioContext.close(); } catch (e) {}
      }
      this.outputAudioContext = null;
    }

    this.sessionPromise = null;
  }

  public async connect() {
    if (this.isConnecting || this.isActive) {
      // Logic for overlap prevention
      return;
    }

    this.isConnecting = true;
    try {
      await this.cleanup();
      this.isActive = true;

      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
      this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });

      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });

      const ai = new GoogleGenAI({ apiKey: this.config.apiKey || process.env.API_KEY });
      
      const historyText = (this.config.initialContext || []).slice(-10).map(m => 
        `${m.role === 'user' ? 'USER' : 'OS'}: ${m.content}`
      ).join('\n');

      const fullInstruction = `
${this.config.systemInstruction}

[VAULT_CONTEXT_HISTORY]
${historyText || "No previous history found for this thread."}
[END_HISTORY]

Protocol: Continue the flow from the last known state.
      `;

      this.sessionPromise = ai.live.connect({
        model: this.config.model,
        callbacks: {
          onopen: () => {
            if (!this.isActive || !this.inputAudioContext || !this.stream) {
              this.cleanup();
              return;
            }
            
            this.sessionPromise?.then(resolvedSession => {
              if (!this.isActive) {
                resolvedSession.close();
                return;
              }
              this.session = resolvedSession;
              const source = this.inputAudioContext!.createMediaStreamSource(this.stream!);
              
              // PERFORMANCE TUNING: Use 4096 buffer size to reduce CPU wake-up frequency
              this.processor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
              
              this.processor.onaudioprocess = (e) => {
                if (!this.isActive || !this.session) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = this.createBlob(inputData);
                this.sessionPromise?.then(s => {
                  if (this.isActive) s.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(this.processor);
              this.processor.connect(this.inputAudioContext!.destination);
              this.config.onOpen?.();
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!this.isActive) return;

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              this.currentInputTranscription += text;
              this.config.onUserText?.(this.currentInputTranscription);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              this.currentOutputTranscription += text;
              this.config.onAiText?.(this.currentOutputTranscription);
            }

            if (message.serverContent?.turnComplete) {
              this.config.onTurnComplete?.(this.currentInputTranscription.trim(), this.currentOutputTranscription.trim());
              this.currentInputTranscription = '';
              this.currentOutputTranscription = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext && this.isActive) {
              this.config.onModelSpeakingChange?.(true);
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              
              try {
                const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
                if (!this.isActive || !this.outputAudioContext) return;

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputAudioContext.destination);
                
                source.onended = () => {
                  this.sources.delete(source);
                  if (this.sources.size === 0) this.config.onModelSpeakingChange?.(false);
                };
                
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
              } catch (err) {
                // Silenced verbose audio-skipping logs for performance
              }
            }

            if (message.serverContent?.interrupted) {
              this.stopAllAudio();
              this.config.onModelSpeakingChange?.(false);
            }
          },
          onerror: (e: any) => {
            console.error("Neural Link Error:", e);
            this.config.onError?.(e);
            this.cleanup();
          },
          onclose: (e: any) => {
            this.cleanup();
            this.config.onClose?.();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.config.voice } },
          },
          systemInstruction: fullInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });
    } catch (err) {
      await this.cleanup();
      throw err;
    } finally {
      this.isConnecting = false;
    }
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
      try { s.stop(); s.disconnect(); } catch (e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  public async disconnect(): Promise<void> {
    await this.cleanup();
  }
}

let activeGlobalService: GeminiLiveService | null = null;
let globalConnecting = false;

export const connect = async (
  systemInstruction: string, 
  initialContext: Message[], 
  onSpeakingChange: (speaking: boolean) => void,
  onTurnComplete: (userText: string, aiText: string) => void,
  onUserText?: (text: string) => void,
  onAiText?: (text: string) => void,
  voiceName: string = 'Zephyr',
  apiKey?: string
) => {
  if (globalConnecting) return;
  globalConnecting = true;

  try {
    if (activeGlobalService) {
      await activeGlobalService.disconnect();
      activeGlobalService = null;
    }

    activeGlobalService = new GeminiLiveService({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      voice: voiceName,
      systemInstruction,
      initialContext,
      apiKey,
      onModelSpeakingChange: onSpeakingChange,
      onTurnComplete,
      onUserText,
      onAiText,
      onError: (e) => console.error("Neural Link Disruption:", e),
    });
    await activeGlobalService.connect();
  } finally {
    globalConnecting = false;
  }
};

export const disconnect = async (): Promise<void> => {
  if (activeGlobalService) {
    await activeGlobalService.disconnect();
    activeGlobalService = null;
  }
};
