
import React, { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { Project, ProjectConfig } from '../../types';
import { FolderBrowser } from './FolderBrowser';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

type Tab = 'general' | 'intelligence' | 'connection' | 'appearance';

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project }) => {
  const { updateProjectConfig } = useProjects();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [config, setConfig] = useState<ProjectConfig>(project.config);
  const [projectName, setProjectName] = useState(project.name);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!projectName.trim()) return;
    
    setIsSaving(true);
    try {
      const nameChanged = projectName.trim() !== project.name;
      await updateProjectConfig(
        project.id, 
        config, 
        nameChanged ? projectName.trim() : undefined
      );
      onClose();
    } catch (err) {
      console.error("Neural Sync Failure:", err);
      alert("Failed to synchronize changes with the neural vault.");
    } finally {
      setIsSaving(false);
    }
  };

  const voices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];
  const colors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Crimson', hex: '#ef4444' }
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
           <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                Vault Configuration
              </h2>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-[0.2em] mt-2 font-black">{project.name} // NODE_{project.id.substring(0, 8)}</p>
           </div>
           <button onClick={onClose} className="p-3 text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-zinc-950/80 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
           {(['general', 'intelligence', 'connection', 'appearance'] as Tab[]).map(tab => (
             <button
               key={tab}
               onClick={() => { setActiveTab(tab); setIsBrowsing(false); }}
               className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}
             >
               {tab}
               {activeTab === tab && (
                 <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-500 rounded-full"></div>
               )}
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-[450px] scrollbar-hide">
           {activeTab === 'general' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Project Identifier (Name)</label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-bold shadow-inner"
                    placeholder="e.g. Project Hyperion"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Baseline Mission Protocol</label>
                  <textarea 
                    value={config.description || ''}
                    onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-6 py-5 text-slate-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm h-48 resize-none font-medium leading-relaxed shadow-inner"
                    placeholder="Define the project's core objectives, constraints, and operational logic..."
                  />
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-600 italic font-mono uppercase tracking-widest pl-1">This context is embedded into every neural reasoning cycle.</p>
                </div>
             </div>
           )}

           {activeTab === 'intelligence' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Neural Persona (Role)</label>
                      <input 
                        type="text"
                        value={config.role}
                        onChange={e => setConfig(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-bold shadow-inner"
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Vocal Identity (TTS)</label>
                      <div className="relative">
                        <select 
                          value={config.voice}
                          onChange={e => setConfig(prev => ({ ...prev, voice: e.target.value }))}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm appearance-none cursor-pointer font-bold shadow-inner"
                        >
                          {voices.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Core Expertise Domains (Skills)</label>
                   <textarea 
                     value={config.skills.join(', ')}
                     onChange={e => setConfig(prev => ({ ...prev, skills: e.target.value.split(',').map(s => s.trim()).filter(s => !!s) }))}
                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-6 py-5 text-slate-900 dark:text-white text-sm h-32 resize-none font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner"
                     placeholder="Separate by commas: System Design, Code Review, Strategic Analysis..."
                   />
                </div>
             </div>
           )}

           {activeTab === 'connection' && (
             <div className="space-y-8 h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
                {!isBrowsing ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-12 text-center gap-8 bg-zinc-50 dark:bg-zinc-950/30 shadow-inner">
                     <div className="relative">
                        <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl flex items-center justify-center text-indigo-500 shadow-2xl">
                          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <p className="text-slate-900 dark:text-white text-lg font-black italic uppercase tracking-tight">Active Neural Mount</p>
                        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em] font-black">UID: {config.attachedFolderId}</p>
                     </div>
                     <button 
                       onClick={() => setIsBrowsing(true)}
                       className="px-10 py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl hover:scale-105 active:scale-95"
                     >
                       Re-Map Connection
                     </button>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[400px]">
                     <FolderBrowser 
                       initialFolderId={config.attachedFolderId}
                       onSelect={(id) => { setConfig(prev => ({ ...prev, attachedFolderId: id })); setIsBrowsing(false); }}
                     />
                  </div>
                )}
             </div>
           )}

           {activeTab === 'appearance' && (
             <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-6">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Neural Accent Matrix</label>
                   <div className="flex flex-wrap gap-6">
                      {colors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setConfig(prev => ({ ...prev, themeColor: color.hex }))}
                          className={`w-16 h-16 rounded-[1.5rem] border-2 transition-all flex items-center justify-center relative group ${config.themeColor === color.hex ? 'border-slate-400 dark:border-white scale-110 shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
                          style={{ backgroundColor: color.hex }}
                        >
                          <span className="absolute -bottom-6 text-[8px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">{color.name}</span>
                          {config.themeColor === color.hex && (
                            <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                          )}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-950/80 flex gap-4 backdrop-blur-xl">
           <button 
             onClick={onClose}
             className="flex-1 py-5 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border border-zinc-200 dark:border-zinc-800/50 shadow-sm"
           >
             Abort
           </button>
           <button 
             disabled={isSaving || !projectName.trim()}
             onClick={handleSave}
             className="flex-2 flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-[0_20px_40px_rgba(79,70,229,0.3)] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
           >
             {isSaving ? (
               <>
                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                 Synchronizing...
               </>
             ) : (
               <>
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                 </svg>
                 Commit Configuration
               </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
};
