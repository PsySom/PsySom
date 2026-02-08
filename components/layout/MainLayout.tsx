
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import { ProjectSidebar } from '../project/ProjectSidebar';
import { NewProjectModal } from '../project/NewProjectModal';
import { ChatInterface } from '../chat/ChatInterface';
import { SettingsModal } from '../settings/SettingsModal';
import { useChat } from '../../hooks/useChat';
import { useTTS } from '../../hooks/useTTS';
import { Square, Play, Volume2, AudioLines, Menu, Settings, LogOut, X } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeProject, activeBranch, isLoading: projectLoading } = useProjects();
  const { isLoading: aiLoading, toolStatus } = useChat();
  const { play, stop, isPlaying, lastMessage } = useTTS();
  
  // Sidebar state handles both desktop collapse and mobile drawer visibility
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Close sidebar automatically on mobile when a branch or project is selected
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [activeProject?.id, activeBranch?.id]);

  // Sync state with window resizing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
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

      {/* Neural Backdrop Overlay (Mobile Only) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sovereign Sidebar Drawer */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 shadow-2xl transition-transform duration-500 ease-out
          lg:relative lg:translate-x-0 lg:z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:opacity-0 lg:overflow-hidden'}
        `}
      >
        <div className="h-full w-80 flex flex-col">
          <div className="lg:hidden absolute top-4 right-4 z-50">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <ProjectSidebar 
            onNewProject={() => setIsModalOpen(true)} 
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/10">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
                <img src={user?.picture} className="relative w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg object-cover" alt={user?.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] font-mono text-zinc-500 truncate uppercase tracking-tighter">{user?.email}</p>
              </div>
              <button 
                onClick={logout} 
                className="text-zinc-400 hover:text-red-500 p-2 hover:bg-white dark:hover:bg-zinc-800/50 rounded-lg transition-all"
                title="Disconnect Persona"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main OS Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <header className="h-16 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="text-zinc-500 hover:text-indigo-600 dark:hover:text-white p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors active:scale-90"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 overflow-hidden text-sm">
              <span className="text-zinc-400 dark:text-zinc-600 font-mono hidden md:inline text-[10px]">VAULT /</span>
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
            {/* Global Neural Synthesis Controls */}
            {lastMessage && (
              <button
                onClick={handleGlobalTTSToggle}
                className={`flex items-center justify-center p-2.5 rounded-xl border transition-all shadow-sm group ${
                  isPlaying 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-indigo-400 active:scale-95'
                }`}
                title={isPlaying ? "Stop Neural Stream" : "Synthesize Latest Response"}
              >
                {isPlaying ? (
                  <Square size={14} fill="currentColor" className="animate-pulse" />
                ) : (
                  <Volume2 size={16} className="group-hover:text-indigo-500" />
                )}
              </button>
            )}

            {/* Sync State */}
            <div className="hidden xs:flex items-center gap-2 px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className={`h-1.5 w-1.5 rounded-full ${(projectLoading || aiLoading) ? 'bg-yellow-500 animate-ping' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}></div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter font-black hidden sm:inline">
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
                <div className="relative w-28 h-28 sm:w-40 sm:h-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] sm:rounded-[3rem] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700">
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
