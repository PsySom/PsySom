
import React, { useMemo, useEffect, useRef } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { useChat } from '../../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isOpen, onClose, projectName }) => {
  const { activeBranch } = useProjects();
  const { startVoiceLink, stopVoiceLink, isVoiceLinking, isAiSpeaking, error: voiceError } = useChat();
  const connectionAttempted = useRef(false);
  
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

  const recentMessages = useMemo(() => {
    if (!activeBranch || !activeBranch.messages) return [];
    return activeBranch.messages.slice(-2);
  }, [activeBranch?.messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="max-w-2xl w-full flex flex-col items-center gap-10 text-center p-8">
        
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full mb-2">
            {!isVoiceLinking && !voiceError ? (
               <LoadingSpinner className="w-3 h-3" />
            ) : (
               <div className={`w-2 h-2 rounded-full ${voiceError ? 'bg-red-500' : 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
            )}
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black">
              {voiceError ? "Neural Fault" : !isVoiceLinking ? "Handshaking" : "Link: Active"}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">{projectName}</h1>
        </div>

        <div className="relative w-48 h-48 flex items-center justify-center">
           <div className={`absolute inset-0 border border-indigo-500/20 rounded-full transition-all duration-1000 ${isAiSpeaking ? 'scale-150 opacity-10 animate-ping' : 'scale-100 opacity-0'}`}></div>
           <div className={`relative w-32 h-32 rounded-[3rem] flex items-center justify-center transition-all duration-500 ${isAiSpeaking ? 'bg-indigo-600 shadow-2xl scale-110' : 'bg-zinc-900 border border-zinc-800'}`}>
              {isAiSpeaking ? (
                <div className="flex gap-1.5 h-10 items-center">
                  {[...Array(6)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-white/90 rounded-full animate-bounce" 
                      style={{ 
                        height: `${12 + Math.random() * 24}px`,
                        animationDuration: `${0.6 + Math.random() * 0.4}s`,
                        animationDelay: `${i * 0.1}s` 
                      }}
                    ></div>
                  ))}
                </div>
              ) : (
                <div className="w-4 h-4 bg-zinc-700 rounded-full animate-pulse"></div>
              )}
           </div>
        </div>

        <div className="w-full max-w-lg min-h-[140px] flex flex-col gap-4 overflow-hidden pointer-events-none">
          {recentMessages.length > 0 ? (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-2">
               {recentMessages.map((msg, idx) => (
                 <div key={msg.id} className={`transition-all duration-500 ${idx === recentMessages.length - 1 ? 'opacity-100' : 'opacity-20 scale-95'}`}>
                    <MessageBubble message={msg} />
                 </div>
               ))}
            </div>
          ) : (
             <div className="flex flex-col items-center gap-3 py-12">
                <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] animate-pulse">Awaiting neural flow...</p>
             </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-6 pt-4">
           {voiceError && (
             <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-[10px] font-mono uppercase tracking-widest">{voiceError}</p>
             </div>
           )}
           
           <button 
            onClick={onClose}
            className="w-full py-5 bg-zinc-900 hover:bg-red-600/10 border border-zinc-800 hover:border-red-500/50 text-zinc-500 hover:text-red-500 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all"
          >
            Terminate Link
          </button>
        </div>
      </div>
    </div>
  );
};
