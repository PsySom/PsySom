
import { FunctionDeclaration, Type } from '@google/genai';
import { DriveService } from '../drive/driveService';

/**
 * Tool definitions for Google Drive interaction and Multimodal Generation.
 * These schemas inform Gemini about available capabilities.
 */
export const driveTools: FunctionDeclaration[] = [
  {
    name: 'list_files',
    description: 'Lists files in a specific Google Drive folder. Useful for exploring project documents or verifying file existence.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        folderId: {
          type: Type.STRING,
          description: 'The unique ID of the Google Drive folder. Defaults to the project root if not provided.',
        },
      },
    },
  },
  {
    name: 'read_file',
    description: 'Retrieves the full text content of a document (text, markdown, code) from Google Drive. Use this to understand the details of project files.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: {
          type: Type.STRING,
          description: 'The unique ID of the file to be read.',
        },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'read_image',
    description: 'Retrieves visual content from an image file on Google Drive for analysis. Use this when the user asks about an image or screenshot.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: {
          type: Type.STRING,
          description: 'The unique ID of the image file to be analyzed.',
        },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'create_file',
    description: 'Creates a new document in a specified Google Drive folder with the given content.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'The filename for the new document (e.g., "Architecture_Draft.md").',
        },
        content: {
          type: Type.STRING,
          description: 'The string content to be written into the file.',
        },
        parentId: {
          type: Type.STRING,
          description: 'The ID of the folder where the file should be created.',
        },
      },
      required: ['name', 'content', 'parentId'],
    },
  },
  {
    name: 'update_file',
    description: 'Overwrites the content of an existing Google Drive file. Essential for versioning or updating project state.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: {
          type: Type.STRING,
          description: 'The unique ID of the file to update.',
        },
        content: {
          type: Type.STRING,
          description: 'The new full content for the file.',
        },
      },
      required: ['fileId', 'content'],
    },
  },
  {
    name: 'open_branch',
    description: 'Loads a different conversation thread (branch) into the current session. Use this when the user wants to switch contexts or continue an older discussion by name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: 'The unique Drive File ID of the branch JSON file.',
        },
        name: {
          type: Type.STRING,
          description: 'The display name of the branch.',
        },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'save_branch_persistence',
    description: 'Explicitly saves the current conversation thread to the neural vault. Call this after significant breakthroughs or when the user asks to "save" or "commit" thoughts.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: 'A 2-sentence summary of the thread current state for future recall.',
        },
      },
    },
  },
  {
    name: 'generate_media',
    description: 'Generates a high-quality image or video based on a detailed prompt. Essential for visualization tasks. Requires Creative Mode.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'The medium to generate: "image" or "video".',
        },
        prompt: {
          type: Type.STRING,
          description: 'Comprehensive visual description, style, and camera direction.',
        },
        reference_file_id: {
          type: Type.STRING,
          description: 'Optional: ID of an existing Drive image to use as a style or subject reference (Image-to-Image / Image-to-Video).',
        },
      },
      required: ['type', 'prompt'],
    },
  },
];

/**
 * Executes a tool call by mapping the tool name to the DriveService implementation.
 */
export async function executeDriveTool(name: string, args: any, defaultFolderId: string): Promise<any> {
  const driveService = DriveService.getInstance();
  
  switch (name) {
    case 'list_files':
      return await driveService.listFiles(args.folderId || defaultFolderId);
    case 'read_file':
      return await driveService.readFile(args.fileId);
    case 'read_image':
      const imageData = await driveService.readImage(args.fileId);
      return { 
        status: 'success', 
        visual_data: imageData,
        message: "Image binary retrieved and processed for neural vision."
      };
    case 'create_file':
      const parentId = args.parentId || defaultFolderId;
      const newFileId = await driveService.createFile(args.name, args.content, parentId);
      return { status: 'success', fileId: newFileId, message: `File "${args.name}" created.` };
    case 'update_file':
      await driveService.updateFile(args.fileId, args.content);
      return { status: 'success', message: `File with ID ${args.fileId} updated.` };
    case 'open_branch':
      return {
        status: 'delegated',
        action: 'open_branch',
        id: args.id,
        name: args.name
      };
    case 'save_branch_persistence':
       return { 
         status: 'delegated', 
         action: 'save_branch',
         summary: args.summary 
       };
    case 'generate_media':
       return { 
         status: 'delegated', 
         type: args.type, 
         prompt: args.prompt, 
         reference_file_id: args.reference_file_id 
       };
    default:
      throw new Error(`Tool "${name}" is not implemented.`);
  }
}
