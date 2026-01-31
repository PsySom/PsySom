
import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as geminiLive from '../../lib/ai/geminiLive';
import { useProjects } from '../../contexts/ProjectContext';
import { Message, DriveItem } from '../../types';
import { DriveService } from '../../lib/drive/driveService';

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onSyncMessages: (messages: Message[]) => Promise<void>;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isOpen, onClose, projectName, onSyncMessages }) => {
  const { activeBranch, activeProject } = useProjects();
  const [isLinking, setIsLinking] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filesInContext, setFilesInContext] = useState<DriveItem[]>([]);
  
  const isMountedRef = useRef(true);

  // Fetch file list for context injection
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen && activeProject?.config.attachedFolderId) {
      const fetchContextFiles = async () => {
        try {
          const driveService = DriveService.getInstance();
          const files = await driveService.listContents(activeProject.config.attachedFolderId);
          if (isMountedRef.current) {
            setFilesInContext(files);
          }
        } catch (err) {
          console.error("Failed to fetch file context for voice:", err);
        }
      };
      fetchContextFiles();
    }
  }, [isOpen, activeProject?.config.attachedFolderId]);

  const recentHistory = useMemo(() => {
    if (!activeBranch) return "";
    return activeBranch.messages.slice(-5).map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join("\n");
  }, [activeBranch]);

  const systemInstruction = useMemo(() => {
    const fileListStr = filesInContext.length > 0 
      ? filesInContext.map(f => `- [${f.mimeType === 'application/vnd.google-apps.folder' ? 'DIR' : 'FILE'}] Name: ${f.name} | ID: ${f.id}`).join('\n')
      : 'The project directory is currently empty.';

    return `
      IDENTITY: You are ${projectName}, a Sovereign Neural Intelligence voice interface.
      CORE ROLE: ${activeProject?.config.role || 'Strategic Intelligence Assistant'}.
      
      SITUATIONAL CONTEXT:
      - Project Name: ${activeProject?.name}
      - Mounted Files:
      ${fileListStr}
      
      BEHAVIORAL PROTOCOLS:
      1. REAL-TIME: Respond concisely but intelligently.
      2. KNOWLEDGE: You are aware of the files listed above. If the user asks about them, use your internal project context.
      3. VOCAL STYLE: Professional, helpful, and sovereign.
    `;
  }, [projectName, activeProject, filesInContext]);

  useEffect(() => {
    if (isOpen) {
      const startLink = async () => {
        try {
          setError(null);
          setIsLinking(true);
          await geminiLive.connect(
            systemInstruction, 
            recentHistory, 
            (speaking) => {
              if (isMountedRef.current) setIsSpeaking(speaking);
            },
            activeProject?.config.voice || 'Zephyr'
          );
          if (isMountedRef.current) setIsLinking(false);
        } catch (err: any) {
          console.error("Link Error:", err);
          if (isMountedRef.current) {
            setError(err.message || "Neural Link Failed");
            setIsLinking(false);
          }
        }
      };
      startLink();
    }
    
    return () => {
      isMountedRef.current = false;
      geminiLive.disconnect();
    };
  }, [isOpen, systemInstruction, recentHistory, activeProject?.config.voice]);

  const handleEndSession = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    try {
      const transcriptArray = await geminiLive.disconnect();
      
      if (transcriptArray.length > 0) {
        const messagesToInject: Message[] = transcriptArray.map((turn, index) => ({
          id: `voice-${Date.now()}-${index}`,
          role: turn.role === 'model' ? 'assistant' : 'user',
          content: turn.text,
          timestamp: Date.now() + index,
          type: 'idea'
        }));
        
        await onSyncMessages(messagesToInject);
      }
    } catch (e) {
      console.error("Sync Error:", e);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="max-w-md w-full flex flex-col items-center gap-12 text-center p-8">
        
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full mb-2">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : isLinking ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {error ? "Link Error" : isLinking ? "Synchronizing" : "Live Link Online"}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">{projectName}</h1>
        </div>

        <div className="relative w-48 h-48 flex items-center justify-center">
           <div className={`absolute inset-0 border border-zinc-800 rounded-full ${isSpeaking ? 'scale-110 opacity-20' : 'scale-100 opacity-10'} transition-all duration-700`}></div>
           
           <div className={`relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 ${isSpeaking ? 'bg-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.5)]' : 'bg-zinc-800'}`}>
              <div className={`w-full h-full bg-gradient-to-tr from-white/20 to-transparent animate-pulse`}></div>
              {isSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 bg-white/40 rounded-full animate-bounce" style={{ height: '40%', animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              )}
           </div>

           <div className={`absolute inset-0 border-2 border-indigo-500/30 rounded-full animate-ping [animation-duration:3s] ${isSpeaking ? 'block' : 'hidden'}`}></div>
        </div>

        <div className="h-20 flex flex-col items-center justify-center">
          {error ? (
            <p className="text-red-400 text-xs font-mono">{error}</p>
          ) : isLinking ? (
            <p className="text-zinc-500 text-xs font-mono animate-pulse uppercase tracking-widest">Awaiting Neural Handshake...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-zinc-300 text-sm italic font-medium">
                {isSpeaking ? "Co-reasoning in progress..." : "System listening..."}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em]">{filesInContext.length} files in neural context</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button 
            onClick={handleEndSession}
            disabled={isSyncing}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-900/20 active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? "Syncing Drive..." : "Terminate Session"}
          </button>
          {!isLinking && !error && (
            <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
              Audio is processed at 16kHz for low-latency throughput
            </p>
          )}
        </div>
      </div>

      <div className="absolute top-8 left-8 text-[8px] font-mono text-zinc-800 uppercase vertical-text tracking-widest">NeuralOS // Core_Voice_Link</div>
      <div className="absolute bottom-8 right-8 text-[8px] font-mono text-zinc-800 uppercase tracking-widest">Sovereign Knowledge Vault v3.0</div>
    </div>
  );
};
