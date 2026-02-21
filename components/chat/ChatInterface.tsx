
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';
import { useChat } from '../../hooks/useChat';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { VoiceOverlay } from './VoiceOverlay';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTTS } from '../../hooks/useTTS';
import { OrbAvatar, DEFAULT_ORB_CONFIG } from '../ui/OrbAvatar';

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
  const { sendMessage, deleteMessage, isLoading: aiLoading, toolStatus, error, clearError, isAuthBroken } = useChat();
  const { isPlaying, activeMessageId, toggle, setLatestMessage } = useTTS();
  const { theme, setTheme } = useTheme();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = Array.isArray(activeBranch?.messages) ? activeBranch.messages : [];

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setLatestMessage(lastMessage.content, lastMessage.id);
      }
    }
  }, [messages, setLatestMessage]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      if (isInput) return;

      const key = e.key.toLowerCase();
      if (key === 'v') { e.preventDefault(); setIsVoiceOpen(true); }
      if (key === 's' && activeBranch?.isDirty) { e.preventDefault(); saveBranch(activeBranch.messages || []); }
      if (key === 't') { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeBranch, saveBranch, theme, setTheme]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiLoading, scrollToBottom]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!activeProject || projectLoading || (aiLoading && !activeBranch)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-950/20 h-full">
        <div className="relative">
          <div className="absolute -inset-12 bg-indigo-500/5 rounded-full blur-[80px] animate-pulse"></div>
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-zinc-900 border border-zinc-800 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-2xl">
            <LoadingSpinner size={32} />
          </div>
        </div>
        <div className="mt-8 space-y-2 text-center">
          <p className="text-[9px] font-mono text-indigo-500 uppercase tracking-[0.5em] font-black animate-pulse">Neural Handshake</p>
          <p className="text-zinc-500 text-[10px] sm:text-xs font-medium italic">Mounting Sovereign Context Sector...</p>
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

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        setShowScrollButton(!isNearBottom);
      }
    };

    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col relative h-[100dvh] md:h-full overflow-hidden transition-colors duration-500">
      {isVoiceOpen && (
        <VoiceOverlay 
          isOpen={isVoiceOpen} 
          onClose={() => setIsVoiceOpen(false)} 
          projectName={activeProject.name} 
        />
      )}

      {isAuthBroken && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[600] w-full max-w-xl px-4 animate-in slide-in-from-top-10 duration-500">
          <div className="bg-slate-900 border-2 border-red-500/50 p-6 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white uppercase tracking-tight italic">Neural Link Severed</h4>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-black">Sovereign Vault session expired.</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-900/20 active:scale-95"
            >
              Reconnect OS
            </button>
          </div>
        </div>
      )}

      {error && !isAuthBroken && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-400">
            <p className="text-xs font-bold">{error}</p>
            <button onClick={clearError} className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {pendingProjectId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-300"></div>
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
             <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-2">Uncommitted Context</h3>
             <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
               Neural thread <span className="text-white font-bold">"{activeBranch?.name}"</span> has unsaved reasoning steps. Commit to Drive before switching nodes?
             </p>
             <div className="flex flex-col gap-3">
                <button onClick={handleCommitAndSwitch} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all">Commit & Switch</button>
                <button onClick={handleDiscardAndSwitch} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all">Discard Changes</button>
                <button onClick={() => setPendingProjectId(null)} className="w-full py-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-zinc-400 transition-colors">Stay</button>
             </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 right-0 p-3 sm:p-4 z-10 flex gap-2">
         {activeBranch?.isDirty && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full backdrop-blur-md">
               <span className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-500">Unsaved Flow</span>
            </div>
         )}

         {toolStatus && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full backdrop-blur-md transition-all animate-in fade-in slide-in-from-right-2">
               <LoadingSpinner label={toolStatus} size={12} />
            </div>
         )}

         <div className="flex items-center px-2 py-1 bg-white/90 dark:bg-slate-900/80 border border-zinc-200 dark:border-slate-800 rounded-xl shadow-xl">
            <OrbAvatar 
              config={activeProject?.config.avatarConfig || DEFAULT_ORB_CONFIG} 
              size={32} 
              isSpeaking={isPlaying} 
              interactive={true} 
            />
         </div>

         <button onClick={toggleTheme} className="flex items-center justify-center p-2.5 bg-white/90 dark:bg-slate-900/80 border border-zinc-200 dark:border-slate-800 rounded-xl transition-all shadow-xl group">
           {theme === 'dark' ? (
             <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
           ) : (
             <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
           )}
         </button>
         
         <button onClick={() => setIsVoiceOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-slate-900/80 border border-zinc-200 dark:border-slate-800 rounded-xl transition-all shadow-xl group">
           <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
           <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden xs:inline">Voice Link</span>
         </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 pt-16 sm:pt-20 pb-28 sm:pb-36 space-y-6 sm:space-y-8 scrollbar-hide">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 sm:gap-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center animate-in fade-in duration-1000">
              <OrbAvatar 
                config={activeProject?.config.avatarConfig || DEFAULT_ORB_CONFIG} 
                size={120} 
                interactive={true} 
              />
              <h2 className={`mt-6 text-2xl sm:text-3xl font-black italic uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeProject.name}</h2>
              <p className="opacity-80 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.4em] font-black" style={{ color: projectColor }}>{activeProject.config.role}</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble 
                  key={`${msg.id}-${idx}`} 
                  message={msg} 
                  isLast={idx === messages.length - 1}
                  onDelete={deleteMessage}
                />
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/90 dark:bg-slate-900/50 border border-zinc-200 dark:border-slate-800/50 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl rounded-tl-none flex gap-3 items-center backdrop-blur-sm shadow-xl">
                    <LoadingSpinner label="Reasoning..." size={14} />
                  </div>
                </div>
              )}
              <div className="h-40 flex-shrink-0"></div>
            </>
          )}
        </div>
      </div>

      {showScrollButton && (
        <button 
          onClick={scrollToBottom}
          className="fixed bottom-32 right-6 sm:bottom-40 sm:right-10 z-[100] p-3 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-full shadow-2xl text-indigo-500 hover:scale-110 active:scale-95 transition-all animate-in fade-in zoom-in duration-300"
          title="Scroll to Bottom"
        >
          <ChevronDown size={20} strokeWidth={3} />
        </button>
      )}

      {activeBranch && (
        <div className={`fixed sm:absolute bottom-0 left-0 right-0 p-3 sm:p-6 md:p-10 ${theme === 'dark' ? 'bg-gradient-to-t from-slate-950 via-slate-950/95' : 'bg-gradient-to-t from-gray-50 via-gray-50/95'} to-transparent pt-8 sm:pt-16 pointer-events-none z-30`}>
          <div className="pointer-events-auto">
            <ChatInput 
              onSend={sendMessage} 
              onVoiceTrigger={() => setIsVoiceOpen(true)}
              disabled={aiLoading || isAuthBroken} 
              placeholder={isAuthBroken ? "SYSTEM OFFLINE" : `Consult ${activeProject.name}...`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
