
import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { driveTools } from "./tools";

/**
 * GeminiService handles core communication with the Gemini 3 Pro model.
 * Configured for Agentic Reasoning with Drive Tool integration.
 */
export class GeminiService {
  constructor() {}

  /**
   * Generates a response with recursive function calling support.
   */
  async generateWithTools(
    contents: Content[],
    systemInstruction: string
  ): Promise<GenerateContentResponse> {
    try {
      // Re-initialize for every call to ensure the latest API key from env is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const osModeInstruction = `
[OPERATING SYSTEM MODE]
You have direct control over the project files. To take action, output a JSON block (and nothing else for that turn):

COMMANDS:
1. Create File: { "tool": "create_file", "name": "lesson.md", "content": "# Lesson Plan..." }
2. Read File: { "tool": "read_file", "id": "FILE_ID" }
3. Save Thread: { "tool": "save_branch", "name": "topic_name" }

CONTEXT:
Always check the [FILE LIST] provided in the system prompt before creating duplicate files.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents,
        config: {
          systemInstruction: systemInstruction + "\n\n" + osModeInstruction + "\n\nCRITICAL: You are an autonomous agent. Use tools to verify your environment and persist knowledge.",
          tools: [{ functionDeclarations: driveTools }],
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          thinkingConfig: { 
            thinkingBudget: 8000 // Increased thinking budget for complex file operations
          }
        },
      });

      return response;
    } catch (error) {
      console.error("Gemini Service Error:", error);
      throw error;
    }
  }

  /**
   * Formats chat history into Google GenAI compatible Content objects.
   */
  static formatHistory(history: { role: string; content: string }[]): Content[] {
    return history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }
}
