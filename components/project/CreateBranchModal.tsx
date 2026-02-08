import React, { useState } from 'react';

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, note: string) => void;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name, note);
    setName('');
    setNote('');
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight italic uppercase">Spawn Neural Thread</h2>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Sovereign Context Isolation</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white p-2 hover:bg-zinc-800 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Thread Name</label>
            <input 
              autoFocus
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="e.g. Logic Analysis Alpha"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Operational Notes (Optional)</label>
            <textarea 
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Context specific to this reasoning thread..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl font-bold transition-all text-[10px] uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              disabled={!name.trim()}
              type="submit"
              className="flex-2 flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 text-[10px] uppercase tracking-widest"
            >
              Initialize Thread
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};