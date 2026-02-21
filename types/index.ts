
export type MessageType = 'idea' | 'process' | 'result' | 'discussion' | 'system';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type: MessageType;
  imageContext?: string; // Internal field for vision context
  base64Attachment?: string; // Explicit base64 string for vision analysis
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
  summary?: string; // Neural summary for context recall
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  isVirtual?: boolean; // True if not yet persisted to Drive
  isDirty?: boolean;   // True if messages have changed since last Drive sync
}

export interface AvatarConfig {
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    eyes: string;
    particles: string;
  };
  settings: {
    eyeSize: number;
    eyeSpacing: number;
    eyeHeight: number;
    glowIntensity: number;
    particleCount: number;
    vibrationSpeed: number;
  };
}

export interface ProjectConfig {
  role: string;
  voice: string;
  skills: string[];
  themeColor: string;
  attachedFolderId: string;
  description?: string;
  logicModelId?: string;
  imageModelId?: string;
  videoModelId?: string;
  reasoningBudget?: number;
  systemInstruction?: string;
  avatarConfig?: AvatarConfig;
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