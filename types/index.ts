export type MessageType = 'idea' | 'process' | 'result' | 'discussion' | 'system';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type: MessageType;
  attachment?: {
    id: string;
    name: string;
    mimeType: string;
  };
}

export interface Branch {
  id: string;
  name: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  isVirtual?: boolean; // True if not yet persisted to Drive
  isDirty?: boolean;   // True if messages have changed since last Drive sync
}

export interface AvatarSettings {
  color: string;
  intensity: number;
  speed: number;
  scale: number;
}

export interface ProjectConfig {
  role: string;
  voice: string;
  skills: string[];
  themeColor: string;
  attachedFolderId: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  driveFolderId: string;
  activeBranchId: string;
  branches: string[]; // List of Branch file IDs
  config: ProjectConfig;
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  parents?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: UserProfile | null;
  token: string | null;
}