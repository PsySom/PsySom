
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Branch, ProjectConfig, Message, AvatarConfig } from '../types';
import { DriveService } from '../lib/drive/driveService';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  activeBranch: Branch | null;
  branches: Branch[];
  isLoading: boolean;
  createNewProject: (name: string, role: string, context: string) => Promise<void>;
  selectProject: (projectId: string, force?: boolean) => Promise<void>;
  createBranch: (name: string, note?: string) => void;
  updateLocalMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  saveBranch: (messages: Message[], summary?: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  selectBranch: (branchId: string) => Promise<void>;
  updateProjectConfig: (projectId: string, config: ProjectConfig, newName?: string) => Promise<void>;
  renameBranch: (branchId: string, newName: string) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  pendingProjectId: string | null;
  setPendingProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DEFAULT_ORB: AvatarConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#4338ca',
    glow: 'rgba(99, 102, 241, 0.4)',
    eyes: '#ffffff',
    particles: '#a5b4fc',
  },
  settings: {
    eyeSize: 4,
    eyeSpacing: 12,
    eyeHeight: 0,
    glowIntensity: 40,
    particleCount: 8,
    vibrationSpeed: 50,
  }
};

const DEFAULT_CONFIG = (folderId: string): ProjectConfig => ({
  role: 'Lead AI Architect',
  voice: 'Zephyr',
  skills: ['System Design', 'Strategic Planning'],
  themeColor: '#6366f1',
  attachedFolderId: folderId,
  description: '',
  logicModelId: 'gemini-3-pro-preview',
  imageModelId: 'imagen-4.0-generate-001',
  videoModelId: 'veo-3.1-fast-generate-preview',
  reasoningBudget: 4096,
  systemInstruction: '',
  avatarConfig: DEFAULT_ORB
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  const driveService = DriveService.getInstance();

  const loadProjects = useCallback(async () => {
    if (!isLoggedIn) return;
    setIsLoading(true);
    try {
      await driveService.initializeDrive();
      const configFiles = await driveService.searchFiles("name = 'project.config.json' and trashed = false");
      const loadedProjects: Project[] = [];

      for (const configFile of configFiles) {
        if (configFile.parents && configFile.parents.length > 0) {
          const folderId = configFile.parents[0];
          try {
            const contentStr = await driveService.readFile(configFile.id);
            const config = JSON.parse(contentStr);
            const folderMeta = await driveService.getFileMetadata(folderId);

            loadedProjects.push({
              id: folderId,
              name: folderMeta.name,
              driveFolderId: folderId,
              activeBranchId: '',
              branches: [],
              config: { ...DEFAULT_CONFIG(folderId), ...config },
            });
          } catch (readErr) {
            console.warn(`Failed to read project config at ${configFile.id}`, readErr);
          }
        }
      }

      setProjects(loadedProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const selectProject = async (projectId: string, force = false) => {
    if (!force && activeBranch?.isDirty) {
      setPendingProjectId(projectId);
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setIsLoading(true);
    setActiveProject(project);
    setActiveBranch(null);
    setBranches([]);
    setPendingProjectId(null);
    
    try {
      const branchFiles = await driveService.listBranches(projectId);
      
      const loadedBranches: Branch[] = [];
      for (const file of branchFiles) {
        try {
          const contentStr = await driveService.readFile(file.id);
          const rawData = JSON.parse(contentStr);
          
          const branchData: Branch = {
            ...rawData,
            id: file.id,
            messages: Array.isArray(rawData.messages) ? rawData.messages : [],
            isDirty: false,
            isVirtual: false
          };
          
          loadedBranches.push(branchData);
        } catch (branchReadErr) {
          console.warn(`Failed to read branch ${file.id}`, branchReadErr);
        }
      }
      
      const sortedBranches = loadedBranches.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setBranches(sortedBranches);
      if (sortedBranches.length > 0) {
        setActiveBranch(sortedBranches[0]);
      }
    } catch (error) {
      console.error("Failed to select project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewProject = async (name: string, role: string, context: string) => {
    setIsLoading(true);
    try {
      const folderId = await driveService.createFolder(name);
      const projectConfig = DEFAULT_CONFIG(folderId);
      projectConfig.role = role;
      projectConfig.description = context;
      
      await driveService.createFile('project.config.json', projectConfig, folderId);
      await loadProjects();
      await selectProject(folderId, true);
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProjectConfig = async (projectId: string, config: ProjectConfig, newName?: string) => {
    setIsLoading(true);
    try {
      if (newName) {
        await driveService.renameFile(projectId, newName);
      }

      const configFiles = await driveService.searchFiles(`'${projectId}' in parents and name = 'project.config.json' and trashed = false`);
      const fileId = configFiles[0]?.id;
      
      if (fileId) {
        await driveService.updateFile(fileId, config);
      } else {
        await driveService.createFile('project.config.json', config, projectId);
      }
      
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, config, name: newName || p.name } : p));
      if (activeProject?.id === projectId) {
        setActiveProject(prev => prev ? { ...prev, config, name: newName || prev.name } : null);
      }
    } catch (error) {
      console.error("Failed to update project config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBranch = (name: string, note?: string) => {
    if (!activeProject) return;
    const now = Date.now();
    const virtualBranch: Branch = {
      id: `virtual-${now}`,
      name,
      note,
      createdAt: now,
      updatedAt: now,
      messages: [], 
      isVirtual: true,
      isDirty: false
    };
    setActiveBranch(virtualBranch);
    setBranches(prev => [virtualBranch, ...prev]);
  };

  const updateLocalMessages = (messagesOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
    setActiveBranch(prevBranch => {
      if (!prevBranch) return null;
      
      const currentMessages = prevBranch.messages || [];
      const nextMessages = typeof messagesOrUpdater === 'function' 
        ? messagesOrUpdater(currentMessages)
        : messagesOrUpdater;
      
      const updatedBranch = { 
        ...prevBranch, 
        messages: Array.isArray(nextMessages) ? nextMessages : [], 
        isDirty: true, 
        updatedAt: Date.now() 
      };

      // Also update the list of branches
      setBranches(prevBranches => prevBranches.map(b => b.id === prevBranch.id ? updatedBranch : b));
      
      return updatedBranch;
    });
  };

  const saveBranch = async (messages: Message[], summary?: string) => {
    if (!activeBranch || !activeProject) return;
    const cleanMessages = Array.isArray(messages) ? messages : [];
    
    setIsLoading(true);
    try {
      let branchId = activeBranch.id;
      const now = Date.now();
      
      const payload: Partial<Branch> = {
        name: activeBranch.name,
        note: activeBranch.note,
        summary: summary || activeBranch.summary,
        createdAt: activeBranch.createdAt || now,
        updatedAt: now,
        messages: cleanMessages,
      };

      if (activeBranch.isVirtual) {
        // Timestamp will be added by the drive service saveBranch or manual naming
        const cleanName = activeBranch.name.replace(/\s+/g, '_');
        const fileName = `thread_${cleanName}.json`; // DriveService will refresh this on first save
        branchId = await driveService.createFile(fileName, payload, activeProject.id);
        
        // Immediately trigger a save to get the correct timestamped filename if needed
        await driveService.saveBranch(branchId, payload);
      } else {
        await driveService.saveBranch(branchId, payload);
      }

      const updatedBranch: Branch = { 
        ...activeBranch, 
        ...payload,
        id: branchId, 
        isVirtual: false,
        isDirty: false 
      } as Branch;

      setActiveBranch(updatedBranch);
      setBranches(prev => prev.map(b => b.id === activeBranch.id ? updatedBranch : b));
    } catch (error) {
      console.error("Failed to save branch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renameBranch = async (branchId: string, newName: string) => {
    if (!activeProject) return;
    setIsLoading(true);
    try {
      const branch = branches.find(b => b.id === branchId);
      if (!branch) return;

      if (branch.isVirtual) {
        // Just update local state if it's virtual
        const updatedBranch = { ...branch, name: newName };
        if (activeBranch?.id === branchId) setActiveBranch(updatedBranch);
        setBranches(prev => prev.map(b => b.id === branchId ? updatedBranch : b));
      } else {
        await driveService.renameBranchFile(branchId, newName);
        const updatedBranch = { ...branch, name: newName, isDirty: false };
        if (activeBranch?.id === branchId) setActiveBranch(updatedBranch);
        setBranches(prev => prev.map(b => b.id === branchId ? updatedBranch : b));
      }
    } catch (error) {
      console.error("Failed to rename branch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBranch = async (branchId: string) => {
    setIsLoading(true);
    try {
      const branch = branches.find(b => b.id === branchId);
      if (!branch) return;

      if (!branch.isVirtual) {
        await driveService.deleteFile(branchId);
      }

      setBranches(prev => prev.filter(b => b.id !== branchId));
      if (activeBranch?.id === branchId) {
        setActiveBranch(null);
      }
    } catch (error) {
      console.error("Failed to delete branch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectBranch = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      const sanitizedBranch = {
        ...branch,
        messages: Array.isArray(branch.messages) ? branch.messages : []
      };
      setActiveBranch(sanitizedBranch);
    }
  };

  useEffect(() => {
    if (isLoggedIn && token) loadProjects();
  }, [isLoggedIn, token, loadProjects]);

  return (
    <ProjectContext.Provider value={{
      projects,
      activeProject,
      activeBranch,
      branches,
      isLoading,
      createNewProject,
      selectProject,
      createBranch,
      updateLocalMessages,
      saveBranch,
      loadProjects,
      selectBranch,
      updateProjectConfig,
      renameBranch,
      deleteBranch,
      pendingProjectId,
      setPendingProjectId
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjects must be used within ProjectProvider");
  return context;
};