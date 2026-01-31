import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectContext';
import { ProjectSidebar } from '../project/ProjectSidebar';
import { NewProjectModal } from '../project/NewProjectModal';
import { ChatInterface } from '../chat/ChatInterface';
import { SettingsModal } from '../settings/SettingsModal';
import { useChat } from '../../hooks/useChat';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeProject, activeBranch, isLoading: projectLoading } = useProjects();
  const { isLoading: aiLoading, toolStatus } = useChat();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Sidebar Overlay for Mobile */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 left-6 z-50 p-4 bg-indigo-600 rounded-full shadow-2xl md:hidden hover:scale-110 transition-transform"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside className={`relative z-40 transition-all duration-500 ease-out border-r border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 shadow-2xl ${sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="h-full w-80 flex flex-col">
          <ProjectSidebar 
            onNewProject={() => setIsModalOpen(true)} 
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
          
          {/* User Profile & Footer Actions */}
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/10">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity"></div>
                <img src={user?.picture} className="relative w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg" alt={user?.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] font-mono text-zinc-500 truncate uppercase tracking-tighter">{user?.email}</p>
              </div>
              <button 
                onClick={logout} 
                className="text-zinc-400 hover:text-red-500 p-2 hover:bg-white dark:hover:bg-zinc-800/50 rounded-lg transition-all"
                title="Disconnect"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Animated Background Pulse */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        <header className="h-16 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="text-zinc-500 hover:text-indigo-600 dark:hover:text-white p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 overflow-hidden text-sm md:text-base">
              <span className="text-zinc-400 dark:text-zinc-600 font-mono hidden sm:inline text-xs">ROOT /</span>
              <span className="text-slate-900 dark:text-white font-black truncate tracking-tight">{activeProject?.name || 'IdeaFlow'}</span>
              {activeBranch && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-800 font-light">/</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold truncate uppercase tracking-widest">{activeBranch.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {toolStatus && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-pulse">
                <div className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full"></div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-widest">
                  {toolStatus}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className={`h-1.5 w-1.5 rounded-full ${(projectLoading || aiLoading) ? 'bg-yellow-500 animate-ping' : 'bg-green-500'}`}></div>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-tighter">
                {aiLoading ? 'Thinking' : projectLoading ? 'Syncing' : 'Secure'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {!activeProject ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="relative group mb-10">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-10 group-hover:opacity-20 transition-opacity animate-pulse"></div>
                <div className="relative w-32 h-32 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                   <svg className="w-12 h-12 text-zinc-300 dark:text-zinc-700 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                   </svg>
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight italic">Welcome to IdeaFlow 3.0</h2>
              <p className="text-zinc-500 max-w-sm mb-10 leading-relaxed text-sm">Your sovereign knowledge graph awaits. All data is securely handled via your personal neural vault on Google Drive.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group relative px-8 py-4 bg-indigo-600 text-white dark:bg-white dark:text-zinc-950 rounded-2xl font-black transition-all hover:bg-indigo-500 dark:hover:bg-zinc-200 shadow-xl overflow-hidden text-xs tracking-widest uppercase"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <span className="relative">INITIALIZE WORKSPACE</span>
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