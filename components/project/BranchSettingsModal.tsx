
import React, { useState, useEffect } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { Branch } from '../../types';

interface BranchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch;
}

export const BranchSettingsModal: React.FC<BranchSettingsModalProps> = ({ isOpen, onClose, branch }) => {
  const { renameBranch, saveBranch, deleteBranch } = useProjects();
  const [name, setName] = useState(branch.name);
  const [summary, setSummary] = useState(branch.summary || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(branch.name);
      setSummary(branch.summary || '');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, branch]);

  if (!isOpen) return null;

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      if (name !== branch.name) {
        await renameBranch(branch.id, name);
      }
      await saveBranch(branch.messages, summary);
      onClose();
    } catch (err) {
      console.error("Manual sync failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await deleteBranch(branch.id);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/90 backdrop-blur-2xl" onClick={onClose}></div>
      
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md bg-white dark:bg-zinc-900 border-none md:border border-zinc-200 dark:border-zinc-800 rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">Thread Config</h2>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-[0.2em] mt-1 font-bold">Local Reasoning Persistence</p>
          </div>
          <button 
            onClick={onClose} 
            onKeyDown={handleStopPropagation}
            className="p-2 sm:p-3 text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-hide">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Thread Name</label>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleStopPropagation}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-bold shadow-inner text-base"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Neural Summary (Recollection)</label>
            <textarea 
              rows={3}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              onKeyDown={handleStopPropagation}
              placeholder="The AI uses this to recall past conversations..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none text-sm leading-relaxed shadow-inner"
            />
          </div>

          {!showDeleteConfirm ? (
            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={handleManualSave}
                disabled={isSaving || !name.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? (
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                Commit to Vault
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-[0.3em] transition-colors"
              >
                Terminate Thread
              </button>
            </div>
          ) : (
            <div className="pt-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-widest leading-relaxed">
                    Permanent erasure sequence. 
                    <br/>Data cannot be recovered from the vault.
                  </p>
               </div>
               <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest"
                  >
                    Abort
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-900/20"
                  >
                    ERASE
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
