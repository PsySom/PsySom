
// Global declaration for gapi and google to resolve TS errors
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    gapi: any;
    google: any;
    aistudio?: AIStudio;
  }
}

import { UserProfile, DriveItem, Branch } from '../../types';
import { config } from '../../config';

/**
 * DriveService: The Sovereign Neural Vault Interface.
 * Implements a strict Auth Circuit Breaker to prevent infinite 401 loops.
 */
export class DriveService {
  private static instance: DriveService;
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any = null;
  private initPromise: Promise<void> | null = null;
  private isRefreshingToken = false;

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
          if (!window.gapi) {
            reject(new Error("gapi not found after script load"));
            return;
          }
          window.gapi.load('client', async () => {
            try {
              if (!window.gapi.client) {
                reject(new Error("gapi.client failed to load"));
                return;
              }
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

        if (window.google?.accounts?.oauth2) {
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: config.googleClientId,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: '',
          });
          this.gisInited = true;
        } else {
          throw new Error("Google Identity Services failed to load correctly.");
        }
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

    if (this.isRefreshingToken) {
      // Avoid multiple concurrent refresh prompts
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.isRefreshingToken) {
            clearInterval(check);
            resolve(window.gapi?.client?.getToken?.());
          }
        }, 100);
      });
    }

    return new Promise((resolve, reject) => {
      try {
        const currentToken = window.gapi?.client?.getToken?.();
        if (!forcePrompt && currentToken && currentToken.access_token) {
          resolve(currentToken);
          return;
        }

        if (!this.tokenClient) {
          reject(new Error("Token client not initialized."));
          return;
        }

        this.isRefreshingToken = true;
        this.tokenClient.callback = (resp: any) => {
          this.isRefreshingToken = false;
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
          } else {
            window.gapi?.client?.setToken(resp);
            resolve(resp);
          }
        };

        this.tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
      } catch (err) {
        this.isRefreshingToken = false;
        reject(err);
      }
    });
  }

  /**
   * Centralized Drive API executor with surgical CIRCUIT BREAKER logic.
   * Prevents infinite loops on 401/403.
   */
  public async callDriveApi<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    const MAX_RETRIES = 1;

    if (!this.gapiInited) {
      await this.initializeDrive();
    }

    try {
      return await operation();
    } catch (err: any) {
      const status = err.status || (err.result && err.result.error && err.result.error.code);
      
      // Handle Auth Failures (401/403)
      if ((status === 401 || status === 403)) {
        if (retryCount < MAX_RETRIES) {
          console.warn(`⚠️ Vault Access Expired (${status}). Refresh attempt ${retryCount + 1}...`);
          try {
            await this.getAccessToken(true);
            return await this.callDriveApi(operation, retryCount + 1);
          } catch (authErr) {
            console.error("❌ Auth Refresh Failed. Terminal State Engaged.");
            throw new Error("AUTH_DEAD");
          }
        }
        console.error("⛔ Vault Access Severed. Circuit Breaker activated.");
        throw new Error("AUTH_DEAD");
      }

      // Handle Rate Limits
      if (status === 429) {
        console.error("⛔ Rate Limit Exceeded.");
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      throw err;
    }
  }

  /**
   * Robust fetch wrapper with authorization and strict One-Time Refresh policy.
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    const MAX_RETRIES = 1;
    
    if (!this.gapiInited) await this.initializeDrive();
    
    let token = window.gapi.client.getToken()?.access_token;
    if (!token) {
      const resp = await this.getAccessToken();
      token = resp.access_token;
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });

    // Handle Auth Error (401)
    if (response.status === 401) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`⚠️ Vault Fetch Expired (401). Refresh attempt ${retryCount + 1}...`);
        try {
          await this.getAccessToken(true);
          return this.fetchWithAuth(url, options, retryCount + 1);
        } catch (e) {
          console.error("❌ Fetch Refresh Failed. Terminal State Engaged.");
          throw new Error("AUTH_DEAD");
        }
      }
      console.error("⛔ Vault Fetch Severed. Circuit Breaker activated.");
      throw new Error("AUTH_DEAD");
    }

    // Handle Rate Limit or Forbidden
    if (response.status === 403 || response.status === 429) {
       console.error(`⛔ Access Restricted (${response.status}).`);
       throw new Error("RATE_LIMIT_EXCEEDED");
    }

    return response;
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '_');
  }

  public async loginUser(clientId: string): Promise<UserProfile> {
    const response = await this.fetchWithAuth('https://www.googleapis.com/oauth2/v3/userinfo');
    if (!response.ok) throw new Error("Profile resolution failed.");
    const userData = await response.json();
    return {
      id: userData.sub,
      name: userData.name,
      email: userData.email,
      picture: userData.picture,
    };
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

  public async uploadFile(file: File | Blob, parentId: string = 'root', fileName?: string): Promise<string> {
    const name = fileName || (file as File).name || `upload_${Date.now()}`;
    const mimeType = file.type || 'application/octet-stream';
    
    const metadata = {
      name: name,
      mimeType: mimeType,
      parents: [parentId],
    };

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
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      close_delim;

    const response = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
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

  public async getFileBlob(fileId: string): Promise<Blob> {
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    if (!response.ok) throw new Error("Failed to fetch binary blob from Drive.");
    return await response.blob();
  }

  public async downloadFileAsBase64(fileId: string): Promise<{ data: string; mimeType: string }> {
    const meta = await this.getFileMetadata(fileId);
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    
    if (!response.ok) throw new Error("Failed to fetch binary from Drive.");
    
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
  }

  public async readImage(fileId: string): Promise<{ data: string; mimeType: string }> {
    return this.downloadFileAsBase64(fileId);
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

  public async deleteFile(fileId: string): Promise<void> {
    return this.callDriveApi(async () => {
      await window.gapi.client.drive.files.update({
        fileId,
        resource: { trashed: true }
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

  public async saveBranch(fileId: string, branchData: Partial<Branch>): Promise<void> {
    return this.callDriveApi(async () => {
      const originalName = branchData.name || 'Untitled_Thread';
      const cleanName = originalName.replace(/^thread_/, '').split('_20')[0].replace(/\s+/g, '_');
      const newFileName = `thread_${cleanName}_${this.getTimestamp()}.json`;

      const currentContentStr = await this.readFile(fileId);
      const parsed = JSON.parse(currentContentStr);
      const updated = { ...parsed, ...branchData, updatedAt: Date.now() };

      await this.updateFile(fileId, JSON.stringify(updated));

      await window.gapi.client.drive.files.update({
        fileId: fileId,
        resource: { name: newFileName },
      });
    });
  }

  public async renameBranchFile(fileId: string, newName: string): Promise<void> {
    return this.callDriveApi(async () => {
      const cleanName = newName.replace(/^thread_/, '').split('_20')[0].replace(/\s+/g, '_');
      const fileName = `thread_${cleanName}_${this.getTimestamp()}.json`;
      
      await this.renameFile(fileId, fileName);
      const currentContent = await this.readFile(fileId);
      const parsed = JSON.parse(currentContent);
      parsed.name = newName;
      await this.updateFile(fileId, JSON.stringify(parsed));
    });
  }

  public async listBranches(folderId: string): Promise<DriveItem[]> {
    return this.callDriveApi(async () => {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and (name contains 'thread_' or name contains 'branch_') and trashed = false`,
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
