import { GoogleGenAI, GenerateContentResponse, Content, Part } from "@google/genai";
import { driveTools } from "./tools";

export interface GenerationOptions {
  isDeepThink?: boolean;
  isCreative?: boolean;
  onRetry?: (message: string) => void;
  modelId?: string; 
  reasoningBudget?: number;
}

const MAX_HISTORY_MESSAGES = 40;
const PRUNE_MEDIA_THRESHOLD = 10; 

/**
 * Standard models as per system instructions.
 */
const SAFE_REASONING_MODEL = 'gemini-3-pro-image-preview'; // Upgraded for search/vision stability
const STANDARD_FLOW_MODEL = 'gemini-3-flash-preview';

/**
 * Helper: Wait for specified milliseconds.
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust retry wrapper with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, onRetry?: (msg: string) => void): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const msg = error.message || "";
      const status = error.status || 0;
      
      const isServerError = status === 500 || status === 503 || msg.includes('500') || msg.includes('503') || msg.includes('SERVICE_UNAVAILABLE') || msg.includes('INTERNAL');
      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');

      if ((isServerError || isRateLimit) && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        const retryMsg = `Pathways congested (${status || 'error'}). Rerouting signal in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`;
        
        if (onRetry) onRetry(retryMsg);
        console.warn(`⚠️ Gemini API: ${retryMsg}`);
        
        await wait(delay);
        continue;
      }
      throw error;
    }
  }
  throw new Error("RETRY_LIMIT_EXCEEDED");
}

export class GeminiService {
  async generateWithTools(
    contents: Content[],
    systemInstruction: string,
    options?: GenerationOptions
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const osModeInstruction = `
[OPERATING SYSTEM MODE: KERNEL v3.0]
You are the kernel of IdeaFlow 3.0. Control project's private neural vault.

[VISION_PROTOCOL]
If an image part is provided in the current turn's contents, analyze it as primary context for the text prompt.

[CRITICAL: AMBIGUOUS FILE PROTOCOL]
If user asks to OPEN a .json file, ASK: 'Switch to this branch or analyze it here?'.

[STANDARD FILE PROTOCOLS]
1. TEXT FILES (PDF, MD, TXT, DOCX, CODE): Call 'read_file'.
2. MEDIA GENERATION: SILENT EXECUTION.

${options?.isDeepThink ? `
[PROTOCOL: DEEP_THINK_ACTIVE]
Use Google Search Grounding. Verify facts. Listing sources is mandatory.
` : ''}
      `;

    const tools: any[] = [{ functionDeclarations: driveTools }];
    if (options?.isDeepThink) {
      tools.push({ googleSearch: {} });
    }

    // Rule: Upgrade to gemini-3-pro-image-preview if using googleSearch or explicitly requested
    let targetModel = options?.modelId || (options?.isDeepThink ? SAFE_REASONING_MODEL : STANDARD_FLOW_MODEL);
    let systemNotification = "";

    const genConfig: any = {
      systemInstruction: systemInstruction + "\n\n" + osModeInstruction,
      tools: tools,
      temperature: options?.isDeepThink ? 0.4 : 0.7,
    };

    if (targetModel.includes('pro') || options?.isDeepThink) {
      genConfig.thinkingConfig = { thinkingBudget: options?.reasoningBudget || 4096 };
    }

    return await withRetry(async () => {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: genConfig,
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      let finalOutput = systemNotification;
      
      for (const part of parts) {
        if (part.text) finalOutput += part.text;
        if (part.functionCall) finalOutput += `\n[SYSTEM_TOOL_CALL: ${JSON.stringify(part.functionCall)}]`;
      }

      if (finalOutput.replace(systemNotification, "").trim() === "" && response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          finalOutput += `\n[SYSTEM_TOOL_CALL: ${JSON.stringify(fc)}]`;
        }
      }

      return finalOutput;
    }, 3, options?.onRetry);
  }

  static formatHistory(history: { role: string; content: string; base64Attachment?: string }[]): Content[] {
    const windowedHistory = history.slice(-MAX_HISTORY_MESSAGES);
    return windowedHistory.map((msg, index) => {
      let prunedContent = msg.content;
      if (windowedHistory.length - index > PRUNE_MEDIA_THRESHOLD) {
        const base64Regex = /data:[^;]+;base64,[A-Za-z0-9+/=]+/g;
        prunedContent = prunedContent.replace(base64Regex, "[ASSET_DATA_PRUNED]");
      }

      const parts: Part[] = [{ text: prunedContent }];

      // Construction of Multimodal Parts
      if (msg.base64Attachment && msg.base64Attachment.includes('base64,')) {
        try {
          // 1. Extract pure Base64
          // 2. Determine MIME type
          const [meta, data] = msg.base64Attachment.split(',');
          const mimeType = meta.split(':')[1].split(';')[0];
          
          // 3. Append inlineData part
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          });
        } catch (e) {
          console.error("Neural Vision Protocol Error: Failed to parse attachment", e);
        }
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts
      };
    });
  }
}