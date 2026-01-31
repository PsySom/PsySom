
// Global declaration for gapi and google to resolve TS errors
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

import { UserProfile, DriveItem, Message } from '../../types';
import { config } from '../../config';

/**
 * DriveService: The Sovereign Neural Vault Interface.
 * Handles all interactions with Google Drive API (v3) and Identity Services (GIS).
 * Implements centralized retry logic for authentication failures.
 */
export class DriveService {
  private static instance: DriveService;
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DriveService {
    if (!DriveService.instance) {
      DriveService.instance = new DriveService();
    }
    return DriveService.instance;
  }

  private loadScript(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  public async initializeDrive(): Promise<void> {
    if (this.gapiInited && this.gisInited) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await Promise.all([
          this.loadScript('https://apis.google.com/js/api.js', 'gapi-script'),
          this.loadScript('https://accounts.google.com/gsi/client', 'gis-script'),
        ]);

        await new Promise<void>((resolve, reject) => {
          window.gapi.load('client', async () => {
            try {
              await window.gapi.client.init({
                apiKey: config.googleApiKey,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
              });
              this.gapiInited = true;
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: config.googleClientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: '',
        });
        this.gisInited = true;
      } catch (error) {
        console.error('❌ IdeaFlow: Drive Initialization Fault:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  public async getAccessToken(forcePrompt = false): Promise<any> {
    if (!this.gapiInited || !this.gisInited) {
      await this.initializeDrive();
    }

    return new Promise((resolve, reject) => {
      try {
        const currentToken = window.gapi.client.getToken();
        if (!forcePrompt && currentToken && currentToken.access_token) {
          resolve(currentToken);
          return;
        }

        this.tokenClient.callback = (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
          } else {
            window.gapi.client.setToken(resp);
            resolve(resp);
          }
        };

        this.tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
      } catch (err) {
        reject(err);
      }
    });
  }

  private async callDriveApi<T>(operation: () => Promise<T>): Promise<T> {
    const token = window.gapi.client.getToken();
    if (!token) await this.getAccessToken();

    try {
      return await operation();
    } catch (err: any) {
      const status = err.status || (err.result && err.result.error && err.result.error.code);
      if (status === 401 || status === 403) {
        console.warn("🔄 IdeaFlow: Neural Vault Access Expired. Retrying...");
        await this.getAccessToken(true);
        return await operation();
      }
      throw err;
    }
  }

  public async loginUser(clientId: string): Promise<UserProfile> {
    return this.callDriveApi(async () => {
      const token = window.gapi.client.getToken();
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!response.ok) throw new Error("Profile resolution failed.");
      const userData = await response.json();
      return {
        id: userData.sub,
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
      };
    });
  }

  public async searchFiles(q: string): Promise<DriveItem[]> {
    return this.callDriveApi(async () => {
      const response = await window.gapi.client.drive.files.list({
        q,
        fields: 'files(id, name, mimeType, parents, modifiedTime)',
        spaces: 'drive',
      });
      return response.result.files || [];
    });
  }

  public async uploadFile(file: File, parentId: string = 'root'): Promise<string> {
    return this.callDriveApi(async () => {
      const metadata = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        parents: [parentId],
      };

      const accessToken = window.gapi.client.getToken().access_token;
      const fileData = await file.arrayBuffer();
      const bytes = new Uint8Array(fileData);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      const boundary = 'IdeaFlow_Multipart_Boundary';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + (file.type || 'application/octet-stream') + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64Data +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Upload failed.");
      }

      const result = await response.json();
      return result.id;
    });
  }

  public async listContents(folderId: string = 'root'): Promise<DriveItem[]> {
    return this.callDriveApi(async () => {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
        spaces: 'drive',
      });
      const files = response.result.files || [];
      
      return files.sort((a: DriveItem, b: DriveItem) => {
        const isFolder = (mime: string) => mime === 'application/vnd.google-apps.folder';
        if (isFolder(a.mimeType) && !isFolder(b.mimeType)) return -1;
        if (!isFolder(a.mimeType) && isFolder(b.mimeType)) return 1;
        return a.name.localeCompare(b.name);
      });
    });
  }

  public async listFiles(folderId: string = 'root'): Promise<DriveItem[]> {
    return this.listContents(folderId);
  }

  public async getFileMetadata(fileId: string): Promise<DriveItem> {
    return this.callDriveApi(async () => {
      const response = await window.gapi.client.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, parents',
      });
      return response.result;
    });
  }

  public async readFile(fileId: string): Promise<string> {
    return this.callDriveApi(async () => {
      try {
        const response = await window.gapi.client.drive.files.get({
          fileId: fileId,
          alt: 'media',
        });
        return typeof response.body === 'string' ? response.body : JSON.stringify(response.result);
      } catch (err: any) {
        if (err.status === 404) throw new Error("FILE_NOT_FOUND");
        throw err;
      }
    });
  }

  public async readImage(fileId: string): Promise<{ data: string; mimeType: string }> {
    return this.callDriveApi(async () => {
      const meta = await this.getFileMetadata(fileId);
      const token = window.gapi.client.getToken().access_token;
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to fetch image binary from Drive.");
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ data: base64, mimeType: meta.mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
  }

  public async createFile(name: string, content: any, parentId: string = 'root', mimeType: string = 'application/json'): Promise<string> {
    return this.callDriveApi(async () => {
      const metadata = { name, mimeType, parents: [parentId] };
      const boundary = '-------IdeaFlowBoundary';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      const bodyContent = typeof content === 'string' ? content : JSON.stringify(content);

      const multipartRequestBody =
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: ' + mimeType + "\r\n\r\n" + bodyContent + close_delim;

      const response = await window.gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
        'body': multipartRequestBody
      });
      return response.result.id;
    });
  }

  public async updateFile(fileId: string, content: any): Promise<void> {
    return this.callDriveApi(async () => {
      const body = typeof content === 'string' ? content : JSON.stringify(content);
      await window.gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'media' },
        body: body,
      });
    });
  }

  public async renameFile(fileId: string, newName: string): Promise<void> {
    return this.callDriveApi(async () => {
      await window.gapi.client.drive.files.update({
        fileId: fileId,
        resource: { name: newName },
      });
    });
  }

  /**
   * Authority method for renaming a project folder.
   */
  public async renameFolder(folderId: string, newName: string): Promise<void> {
    return this.renameFile(folderId, newName);
  }

  public async createFolder(name: string, parentId: string = 'root'): Promise<string> {
    return this.callDriveApi(async () => {
      const response = await window.gapi.client.drive.files.create({
        resource: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      });
      return response.result.id;
    });
  }

  public async saveBranch(fileId: string, messages: Message[]): Promise<void> {
    return this.callDriveApi(async () => {
      await this.updateFile(fileId, JSON.stringify(messages));
    });
  }

  public async listBranches(folderId: string): Promise<DriveItem[]> {
    return this.callDriveApi(async () => {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name contains 'branch_' and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
      });
      return response.result.files || [];
    });
  }

  public setToken(token: any) {
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken(token);
    }
  }
}
