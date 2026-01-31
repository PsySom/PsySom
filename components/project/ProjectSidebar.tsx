import React, { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { CreateBranchModal } from './CreateBranchModal';
import { Project } from '../../types';

interface ProjectSidebarProps {
  onNewProject: () => void;
  onOpenSettings: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ onNewProject, onOpenSettings }) => {
  const { projects, activeProject, selectProject, branches, activeBranch, selectBranch, createBranch } = useProjects();
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full w-80 bg-white dark:bg-zinc-950">
      {settingsProject && (
        <ProjectSettingsModal 
          isOpen={!!settingsProject} 
          onClose={() => setSettingsProject(null)} 
          project={settingsProject} 
        />
      )}

      <CreateBranchModal 
        isOpen={isBranchModalOpen} 
        onClose={() => setIsBranchModalOpen(false)} 
        onCreate={(name, note) => createBranch(name, note)}
      />

      <div className="p-6 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="text-[11px] font-black text-white italic relative z-10">IF</span>
          </div>
          <h1 className="font-black text-sm uppercase tracking-[0.25em] text-slate-900 dark:text-white italic">IdeaFlow</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-10 scrollbar-hide">
        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-5 px-3">
             <div className="flex items-center gap-2">
               <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
               <h2 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Neural Nodes</h2>
             </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onNewProject(); }}
              className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"
              title="New Node"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="space-y-1.5">
            {projects.length === 0 ? (
              <p className="px-3 text-[11px] text-zinc-400 italic">No nodes initialized.</p>
            ) : (
              projects.map(project => (
                <div key={project.id} className="group relative">
                  <button 
                    onClick={() => selectProject(project.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all pr-12 relative overflow-hidden ${activeProject?.id === project.id ? 'bg-indigo-600/5 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-500/10' : 'text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50 border border-transparent'}`}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: project.config.themeColor || '#6366f1' }}></div>
                    <span className="truncate tracking-tight">{project.name}</span>
                    {activeProject?.id === project.id && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSettingsProject(project); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-300 dark:text-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all rounded-xl hover:bg-white dark:hover:bg-zinc-800 shadow-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 z-10"
                    title="Vault Config"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Branches Section */}
        {activeProject && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-5 px-3">
               <div className="flex items-center gap-2">
                 <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                 <h2 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Neural Threads</h2>
               </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsBranchModalOpen(true); }}
                className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"
                title="Spawn Thread"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="space-y-1.5">
              {branches.length === 0 ? (
                <p className="px-3 text-[11px] text-zinc-400 italic">No threads active.</p>
              ) : (
                branches.map(branch => (
                  <button 
                    key={branch.id}
                    onClick={() => selectBranch(branch.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium rounded-2xl transition-all ${activeBranch?.id === branch.id ? 'bg-zinc-100 dark:bg-white/5 text-slate-900 dark:text-white shadow-inner border border-zinc-200 dark:border-white/5' : 'text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}
                  >
                    <svg className={`w-4 h-4 ${activeBranch?.id === branch.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-300 dark:text-zinc-800'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span className="truncate">{branch.name}</span>
                    {branch.isVirtual && (
                      <div className="ml-auto w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-sm shadow-amber-500/50"></div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
         <button 
           onClick={onOpenSettings}
           className="p-3 text-zinc-400 hover:text-indigo-600 dark:hover:text-white rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-3 group w-full"
         >
           <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
           <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">System Config</span>
         </button>
      </div>
    </div>
  );
};