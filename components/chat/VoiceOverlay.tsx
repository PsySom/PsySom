
import React, { useMemo, useEffect, useRef } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { useChat } from '../../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OrbAvatar, DEFAULT_ORB_CONFIG } from '../ui/OrbAvatar';
import { X } from 'lucide-react';

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isOpen, onClose, projectName }) => {
  const { activeBranch, activeProject } = useProjects();
  const { startVoiceLink, stopVoiceLink, isVoiceLinking, isAiSpeaking, error: voiceError } = useChat();
  const connectionAttempted = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!connectionAttempted.current) {
      connectionAttempted.current = true;
      startVoiceLink();
    }
    
    return () => {
      stopVoiceLink();
      connectionAttempted.current = false;
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeBranch?.messages]);

  const messages = useMemo(() => {
    if (!activeBranch || !activeBranch.messages) return [];
    return activeBranch.messages;
  }, [activeBranch?.messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex flex-col md:flex-row bg-zinc-950 animate-in fade-in duration-500 overflow-hidden">
      {/* LEFT: Transcript Sector (66% on Desktop) */}
      <div className="flex-1 md:flex-[2] flex flex-col min-h-0 relative order-2 md:order-1 border-t md:border-t-0 md:border-r border-zinc-900 bg-zinc-950/50">
        <div className="p-4 sm:p-6 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
             <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] font-mono">Neural Transcript</h2>
          </div>
          <div className="md:hidden">
             <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 scrollbar-hide pb-24"
        >
          {messages.length > 0 ? (
            messages.map((msg, idx) => (
              <div key={msg.id} className={`transition-all duration-700 ${idx === messages.length - 1 ? 'opacity-100' : 'opacity-40 grayscale-[0.5] scale-[0.98]'}`}>
                <MessageBubble message={msg} onDelete={() => {}} />
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
               <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.4em] animate-pulse">Establishing flow stream...</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Neural Interface Sector (33% on Desktop) */}
      <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-8 gap-12 bg-zinc-950 order-1 md:order-2 shrink-0">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
            {!isVoiceLinking && !voiceError ? (
               <LoadingSpinner className="w-3 h-3" />
            ) : (
               <div className={`w-2 h-2 rounded-full ${voiceError ? 'bg-red-500' : 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
            )}
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">
              {voiceError ? "Neural Fault" : !isVoiceLinking ? "Handshaking" : "Link: Active"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter">{projectName}</h1>
        </div>

        <div className="relative group">
           <div className="absolute -inset-16 bg-indigo-500/5 blur-[100px] rounded-full animate-pulse"></div>
           <OrbAvatar 
             config={activeProject?.config.avatarConfig || DEFAULT_ORB_CONFIG} 
             size={window.innerWidth < 768 ? 180 : 280} 
             isSpeaking={isAiSpeaking} 
             interactive={true} 
           />
        </div>

        <div className="w-full max-w-xs flex flex-col gap-6">
           {voiceError && (
             <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                <p className="text-red-400 text-[10px] font-mono uppercase tracking-widest font-black">{voiceError}</p>
             </div>
           )}
           
           <button 
            onClick={onClose}
            className="w-full py-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-500 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all active:scale-[0.98] shadow-2xl"
          >
            Terminate Link
          </button>
        </div>
      </div>
    </div>
  );
};
