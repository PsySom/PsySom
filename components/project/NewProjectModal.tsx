
import React, { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { createNewProject } = useProjects();
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'creating'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Lead AI Architect',
    context: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || status !== 'idle') return;
    
    setStatus('authorizing');
    setError(null);
    try {
      setStatus('creating');
      await createNewProject(formData.name, formData.role, formData.context);
      onClose();
      setFormData({ name: '', role: 'Lead AI Architect', context: '' });
      setStatus('idle');
    } catch (err: any) {
      console.error("Creation error:", err);
      setError(err.message || "Failed to initialize workspace. Ensure you granted Drive permissions in the popup.");
      setStatus('idle');
    }
  };

  const isSubmitting = status !== 'idle';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Initialize Workspace</h2>
            <p className="text-zinc-500 text-[10px] mt-1 font-mono uppercase tracking-[0.2em] font-bold">Sovereign Neural Vault: Drive V3</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in slide-in-from-top-2">
              <p className="text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Knowledge OS Identifier</label>
            <input 
              autoFocus
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Project Hyperion"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-lg font-bold shadow-inner"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Neural Persona</label>
              <input 
                type="text"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g. Lead System Architect"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-bold shadow-inner"
              />
            </div>
            <div className="flex items-center pt-8">
              <p className="text-[10px] text-zinc-500 leading-tight italic font-medium">
                This persona defines the logic of the AI's reasoning cycles.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Baseline Context & Mission</label>
            <textarea 
              rows={4}
              value={formData.context}
              onChange={e => setFormData(prev => ({ ...prev, context: e.target.value }))}
              placeholder="Define core objectives, rules, and knowledge boundaries..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none text-sm font-medium leading-relaxed shadow-inner"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-white rounded-2xl font-black transition-all text-[10px] uppercase tracking-widest disabled:opacity-30"
            >
              Abort
            </button>
            <button
              disabled={isSubmitting || !formData.name.trim()}
              type="submit"
              className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {status === 'authorizing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Permissions...
                </>
              ) : status === 'creating' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Syncing...
                </>
              ) : (
                'Commit Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
