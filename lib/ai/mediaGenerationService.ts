import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DriveService } from "../drive/driveService";

export interface MediaGenerationParams {
  type: 'image' | 'video';
  prompt: string;
  referenceFileId?: string;
  imageModel?: string;
  videoModel?: string;
  onProgress?: (status: string) => void;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000, onProgress?: (s: string) => void): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error.message || "";
    const status = error.status || 0;
    const isRateLimit = status === 429 || msg.includes('429');
    const isUnavailable = status >= 500 || msg.includes('503') || msg.includes('TIMEOUT');

    if ((isRateLimit || isUnavailable) && retries > 0) {
      if (onProgress) onProgress(`Congestion detected... retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2, onProgress);
    }
    throw error;
  }
}

export class MediaGenerationService {
  private static instance: MediaGenerationService;
  private driveService: DriveService;

  private constructor() {
    this.driveService = DriveService.getInstance();
  }

  public static getInstance(): MediaGenerationService {
    if (!MediaGenerationService.instance) {
      MediaGenerationService.instance = new MediaGenerationService();
    }
    return MediaGenerationService.instance;
  }

  public async generateMedia(params: MediaGenerationParams): Promise<Blob> {
    const { type, prompt, referenceFileId, onProgress } = params;
    const isVideo = type === 'video';

    const imageChain = [params.imageModel || 'gemini-2.5-flash-image', 'imagen-3.0-generate-001'];
    const videoChain = [params.videoModel || 'veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'];

    const modelsToTry = isVideo ? videoChain : imageChain;
    let lastError: any = null;

    for (const modelId of modelsToTry) {
      try {
        if (onProgress) onProgress(`Initializing ${type} pipeline...`);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        if (isVideo) {
          return await this.executeVideoGeneration(ai, modelId, prompt, referenceFileId, onProgress);
        } else {
          return await this.executeImageGeneration(ai, modelId, prompt, referenceFileId, onProgress);
        }
      } catch (err: any) {
        lastError = err;
        if (err.status === 404) continue;
        throw err;
      }
    }
    throw lastError || new Error(`Neural synthesis failed.`);
  }

  private async executeVideoGeneration(ai: any, modelId: string, prompt: string, referenceFileId?: string, onProgress?: (s: string) => void): Promise<Blob> {
    let referenceBase64: string | null = null;
    let referenceMime: string | null = null;

    if (referenceFileId) {
      const refData = await this.driveService.downloadFileAsBase64(referenceFileId);
      referenceBase64 = refData.data;
      referenceMime = refData.mimeType;
    }

    let operation: any = await withRetry(() => ai.models.generateVideos({
      model: modelId,
      prompt: prompt,
      image: referenceBase64 ? { imageBytes: referenceBase64, mimeType: referenceMime || 'image/png' } : undefined,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    }), 3, 2000, onProgress);

    const startTime = Date.now();
    const TIMEOUT_MS = 120000; // Increased to 2 minutes for heavy video render

    while (!operation.done) {
      if (Date.now() - startTime > TIMEOUT_MS) throw new Error("Video synthesis timed out.");
      if (onProgress) onProgress(`Synthesizing frames... [${Math.floor((Date.now() - startTime) / 1000)}s]`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await withRetry(() => ai.operations.getVideosOperation({ operation: operation }), 3, 2000, onProgress);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video produced.");
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    return await videoResponse.blob();
  }

  private async executeImageGeneration(ai: any, modelId: string, prompt: string, referenceFileId?: string, onProgress?: (s: string) => void): Promise<Blob> {
    let referenceBase64: string | null = null;
    let referenceMime: string | null = null;

    if (referenceFileId) {
      const refData = await this.driveService.downloadFileAsBase64(referenceFileId);
      referenceBase64 = refData.data;
      referenceMime = refData.mimeType;
    }

    if (modelId.includes('imagen')) {
      const response: any = await withRetry(() => ai.models.generateImages({
        model: modelId,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' }
      }), 3, 2000, onProgress);
      return this.base64ToBlob(response.generatedImages[0].image.imageBytes, 'image/png');
    } else {
      const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: modelId,
        contents: referenceBase64 
          ? { parts: [{ inlineData: { data: referenceBase64, mimeType: referenceMime || 'image/png' } }, { text: prompt }] }
          : { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      }), 3, 2000, onProgress);
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (!part?.inlineData) throw new Error("Visual core failed.");
      return this.base64ToBlob(part.inlineData.data, part.inlineData.mimeType);
    }
  }

  private base64ToBlob(base64: string, mime: string): Blob {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mime });
  }
}