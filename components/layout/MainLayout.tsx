
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import { ProjectSidebar } from '../project/ProjectSidebar';
import { NewProjectModal } from '../project/NewProjectModal';
import { ChatInterface } from '../chat/ChatInterface';
import { SettingsModal } from '../settings/SettingsModal';
import { useChat } from '../../hooks/useChat';
import { useTTS } from '../../hooks/useTTS';
import { Square, Volume2, Menu, LogOut, X, Settings, RefreshCw, AlertTriangle } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { user, logout, login } = useAuth();
  const { activeProject, activeBranch, isLoading: projectLoading } = useProjects();
  const { isLoading: aiLoading } = useChat();
  const { play, stop, isPlaying, lastMessage } = useTTS();
  
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAuthBanner, setShowAuthBanner] = useState(false);

  // Listen for global auth errors
  useEffect(() => {
    const handleAuthError = () => setShowAuthBanner(true);
    window.addEventListener('google-auth-error', handleAuthError);
    return () => window.removeEventListener('google-auth-error', handleAuthError);
  }, []);

  const handleReconnect = async () => {
    try {
      await login();
      setShowAuthBanner(false);
    } catch (err) {
      console.error("Reconnect failed", err);
    }
  };

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeProject?.id, activeBranch?.id]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGlobalTTSToggle = () => {
    if (isPlaying) {
      stop();
    } else if (lastMessage) {
      play(lastMessage.text, lastMessage.id);
    }
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans selection:bg-indigo-500/30">
      <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Recovery Banner */}
      {showAuthBanner && (
        <div className="fixed top-0 left-0 right-0 z-[1000] bg-red-600 text-white animate-in slide-in-from-top duration-500 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <AlertTriangle size={18} className="text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest italic">Vault Connection Expired</span>
                <span className="text-[10px] opacity-90 font-medium">Browser policies blocked neural re-link. Manual authorization required.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={handleReconnect}
                 className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all active:scale-95 shadow-lg"
               >
                 <RefreshCw size={14} />
                 Reconnect OS
               </button>
               <button 
                 onClick={() => setShowAuthBanner(false)}
                 className="p-2 hover:bg-white/10 rounded-lg transition-colors"
               >
                 <X size={16} />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Neural Backdrop Overlay (Mobile Only) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 md:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sovereign Sidebar Drawer */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 shadow-2xl transition-transform duration-500 ease-out
          md:relative md:translate-x-0 md:z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:opacity-0 md:overflow-hidden'}
        `}
      >
        <div className="h-full w-full flex flex-col">
          <div className="md:hidden absolute top-4 right-4 z-50">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors bg-zinc-100 dark:bg-zinc-900 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

          <ProjectSidebar 
            onNewProject={() => setIsModalOpen(true)} 
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/10 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
                <img src={user?.picture} className="relative w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg object-cover" alt={user?.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[9px] font-mono text-zinc-500 truncate uppercase tracking-tighter">{user?.email}</p>
              </div>
              <button 
                onClick={logout} 
                className="text-zinc-400 hover:text-red-500 p-2 hover:bg-white dark:hover:bg-zinc-800/50 rounded-lg transition-all"
                title="Disconnect Persona"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main OS Viewport */}
      <main className={`flex-1 flex flex-col min-w-0 bg-transparent relative transition-all duration-500 ${showAuthBanner ? 'mt-14' : ''}`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <header className="h-16 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between px-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className={`text-zinc-500 hover:text-indigo-600 dark:hover:text-white p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all active:scale-90 ${sidebarOpen && 'md:bg-zinc-100 dark:md:bg-zinc-900'}`}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-1 sm:gap-2 overflow-hidden text-sm">
              <span className="text-zinc-400 dark:text-zinc-600 font-mono hidden sm:inline text-[9px] uppercase tracking-tighter">VAULT /</span>
              <span className="text-slate-900 dark:text-white font-black truncate tracking-tight text-xs sm:text-sm">{activeProject?.name || 'IdeaFlow'}</span>
              {activeBranch && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-800 font-light mx-1">/</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[9px] font-bold truncate uppercase tracking-widest">{activeBranch.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastMessage && (
              <button
                onClick={handleGlobalTTSToggle}
                className={`flex items-center justify-center p-2 rounded-xl border transition-all shadow-sm group ${
                  isPlaying 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-indigo-400 active:scale-95'
                }`}
                title={isPlaying ? "Stop Neural Stream" : "Synthesize Latest Response"}
              >
                {isPlaying ? (
                  <Square size={12} fill="currentColor" className="animate-pulse" />
                ) : (
                  <Volume2 size={16} className="group-hover:text-indigo-500" />
                )}
              </button>
            )}

            {/* Sync State */}
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className={`h-1.5 w-1.5 rounded-full ${(projectLoading || aiLoading) ? 'bg-yellow-500 animate-ping' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}></div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter font-black hidden lg:inline">
                {aiLoading ? 'Thinking' : projectLoading ? 'Syncing' : 'Secure'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
              <div className="relative group mb-8">
                <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity animate-pulse"></div>
                <div className="relative w-28 h-28 sm:w-40 sm:h-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700">
                   <Settings className="w-10 h-10 sm:w-16 sm:h-16 text-zinc-200 dark:text-zinc-800 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter italic">Welcome to IdeaFlow 3.0</h2>
              <p className="text-zinc-500 max-w-xs mb-8 leading-relaxed text-xs sm:text-sm font-medium">Your private neural knowledge graph. Securely mounted on your personal Google Drive infrastructure.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group relative px-8 py-4 bg-indigo-600 text-white dark:bg-white dark:text-zinc-950 rounded-2xl font-black transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-indigo-600/20 overflow-hidden text-[9px] tracking-[0.2em] uppercase italic"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <span className="relative">Boot Knowledge OS</span>
              </button>
            </div>
          ) : (
            <ChatInterface />
          )}
        </div>
      </main>
    </div>
  );
};
