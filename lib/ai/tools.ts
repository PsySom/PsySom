
import { FunctionDeclaration, Type } from '@google/genai';
import { DriveService } from '../drive/driveService';

/**
 * Tool definitions for Google Drive interaction.
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
      // Return inlineData structure directly for easier integration if needed, 
      // though typically function responses are JSON.
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
    default:
      throw new Error(`Tool "${name}" is not implemented.`);
  }
}
