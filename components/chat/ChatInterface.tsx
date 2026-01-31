
// Add React import to resolve namespace errors
import React, { useRef, useEffect, useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { useChat } from '../../hooks/useChat';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { VoiceOverlay } from './VoiceOverlay';

export const ChatInterface: React.FC = () => {
  const { 
    activeProject, 
    activeBranch, 
    isLoading: projectLoading,
    saveBranch, 
    pendingProjectId, 
    setPendingProjectId, 
    selectProject 
  } = useProjects();
  const { sendMessage, injectMessages, isLoading: aiLoading, toolStatus } = useChat();
  const { theme, setTheme } = useTheme();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // GLOBAL KEYBOARD HANDSHAKE (Shortcuts with Input Hygiene)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // INPUT HYGIENE GUARD: Return immediately if user is focused on an input element
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      if (isInput) return;

      // Logic for shortcuts
      const key = e.key.toLowerCase();
      
      // 'V' for Voice Link
      if (key === 'v') {
        e.preventDefault();
        setIsVoiceOpen(true);
      }

      // 'S' for Save (only if dirty)
      if (key === 's' && activeBranch?.isDirty) {
        e.preventDefault();
        saveBranch(activeBranch.messages || []);
      }

      // 'T' for Theme Toggle
      if (key === 't') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeBranch, saveBranch, theme, setTheme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [activeBranch?.messages, aiLoading]);

  // RENDER SAFETY: Return loading UI if project is switching, handshake is occurring, or context is not yet stable.
  if (!activeProject || projectLoading || (aiLoading && !activeBranch)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-zinc-950/20">
        <div className="relative">
          <div className="absolute -inset-12 bg-indigo-500/5 rounded-full blur-[80px] animate-pulse"></div>
          <div className="relative w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex items-center justify-center shadow-2xl">
            <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-[2rem]"></div>
            <div className="w-10 h-10 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
          </div>
        </div>
        <div className="mt-8 space-y-2 text-center">
          <p className="text-[10px] font-mono text-indigo-500 uppercase tracking-[0.5em] font-black animate-pulse">Neural Handshake</p>
          <p className="text-zinc-500 text-xs font-medium italic">Mounting Sovereign Context Sector...</p>
        </div>
      </div>
    );
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const projectColor = activeProject.config.themeColor || '#6366f1';

  const handleCommitAndSwitch = async () => {
    if (activeBranch && pendingProjectId) {
      await saveBranch(activeBranch.messages || []);
      await selectProject(pendingProjectId, true);
    }
  };

  const handleDiscardAndSwitch = async () => {
    if (pendingProjectId) {
      await selectProject(pendingProjectId, true);
    }
  };

  const messages = Array.isArray(activeBranch?.messages) ? activeBranch.messages : [];

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden transition-colors duration-500">
      {isVoiceOpen && (
        <VoiceOverlay 
          isOpen={isVoiceOpen} 
          onClose={() => setIsVoiceOpen(false)} 
          projectName={activeProject.name} 
          onSyncMessages={injectMessages}
        />
      )}

      {/* Switch Guard Modal */}
      {pendingProjectId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-300"></div>
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300 text-center">
             <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-2">Uncommitted Context</h3>
             <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
               Neural thread <span className="text-white font-bold">"{activeBranch?.name}"</span> has unsaved reasoning steps. Commit to Drive before switching nodes?
             </p>
             <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCommitAndSwitch}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 transition-all"
                >
                  Commit & Switch
                </button>
                <button 
                  onClick={handleDiscardAndSwitch}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => setPendingProjectId(null)}
                  className="w-full py-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Stay in Current Thread
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
         {activeBranch?.isDirty && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full backdrop-blur-md shadow-sm">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
               <span className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-500">Unsaved Flow</span>
            </div>
         )}

         {toolStatus && (
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full backdrop-blur-md animate-pulse shadow-sm`}
              style={{ borderColor: `${projectColor}40` }}
            >
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projectColor }}></div>
               <span className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: projectColor }}>
                 {toolStatus}
               </span>
            </div>
         )}

         <button 
           onClick={toggleTheme}
           className={`flex items-center justify-center p-2.5 bg-white/90 dark:bg-slate-900/80 ${theme === 'dark' ? 'text-amber-400 border-slate-800' : 'text-indigo-600 border-zinc-200'} border hover:scale-105 rounded-xl transition-all shadow-xl backdrop-blur-xl group`}
         >
           {theme === 'dark' ? (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
             </svg>
           ) : (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
             </svg>
           )}
         </button>
         
         <button 
           onClick={() => setIsVoiceOpen(true)}
           className={`flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-900/80 border ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-zinc-200 text-zinc-600'} hover:text-indigo-600 dark:hover:text-white rounded-xl transition-all shadow-xl backdrop-blur-xl group`}
           style={{ borderColor: `${projectColor}40` }}
           title="Shortcut: V"
         >
           <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
           </svg>
           <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Voice Link</span>
         </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 pt-20 pb-36 space-y-8 scrollbar-hide transition-all"
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-1000">
              <div 
                className={`w-24 h-24 rounded-full border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-zinc-200 bg-white shadow-lg'} flex items-center justify-center relative mb-8 transition-all`}
                style={{ borderColor: `${projectColor}30` }}
              >
                <div className="absolute inset-0 border-t-2 opacity-30 rounded-full animate-spin" style={{ borderColor: projectColor }}></div>
                <div className={`absolute inset-2 border border-dashed ${theme === 'dark' ? 'border-slate-800' : 'border-zinc-100'} rounded-full`}></div>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: projectColor }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className={`text-3xl font-black italic uppercase tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeProject.name}</h2>
                <p className="opacity-80 font-mono text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: projectColor }}>{activeProject.config.role}</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {aiLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className={`bg-white/90 dark:bg-slate-900/50 border ${theme === 'dark' ? 'border-slate-800/50' : 'border-zinc-200'} px-5 py-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center backdrop-blur-sm shadow-xl`}>
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: projectColor }}></div>
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ backgroundColor: projectColor }}></div>
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ backgroundColor: projectColor }}></div>
                    <span className="ml-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black">Neural Reasoning Cycle</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {activeBranch && (
        <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-10 ${theme === 'dark' ? 'bg-gradient-to-t from-slate-950 via-slate-950/95' : 'bg-gradient-to-t from-gray-50 via-gray-50/95'} to-transparent pt-16 pointer-events-none transition-all`}>
          <div className="pointer-events-auto">
            <ChatInput 
              onSend={sendMessage} 
              onVoiceTrigger={() => setIsVoiceOpen(true)}
              disabled={aiLoading} 
              placeholder={`Consult ${activeProject.name}...`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
