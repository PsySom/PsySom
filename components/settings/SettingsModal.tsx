import React from 'react';
import { useTheme, ThemeMode, FontSize, AccentColor } from '../../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, fontSize, setFontSize, accentColor, setAccentColor, getAccentClass } = useTheme();

  if (!isOpen) return null;

  const accents: { name: AccentColor; class: string }[] = [
    { name: 'indigo', class: 'bg-indigo-500' },
    { name: 'purple', class: 'bg-purple-500' },
    { name: 'emerald', class: 'bg-emerald-500' },
    { name: 'amber', class: 'bg-amber-500' },
  ];

  const fontSizes: { name: FontSize; label: string }[] = [
    { name: 'sm', label: 'Small' },
    { name: 'base', label: 'Default' },
    { name: 'lg', label: 'Large' },
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase">System UI</h2>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-[0.2em] mt-1 font-bold">Appearance & Persona</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Mode Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Neural Core Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all ${theme === 'light' ? `bg-zinc-50 text-indigo-600 border-indigo-200 shadow-sm font-black` : 'bg-white dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 font-bold'}`}
              >
                <span className="text-xl">☀️</span>
                <span className="text-[10px] uppercase tracking-widest">Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all ${theme === 'dark' ? `bg-zinc-800 text-white border-zinc-700 shadow-lg font-black` : 'bg-white dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 font-bold'}`}
              >
                <span className="text-xl">🌙</span>
                <span className="text-[10px] uppercase tracking-widest">Dark</span>
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Neural Accent</label>
            <div className="flex items-center gap-4 px-1">
              {accents.map((acc) => (
                <button
                  key={acc.name}
                  onClick={() => setAccentColor(acc.name)}
                  className={`relative w-9 h-9 rounded-full transition-all ${acc.class} ${accentColor === acc.name ? 'ring-2 ring-indigo-500 dark:ring-white ring-offset-4 dark:ring-offset-zinc-900 scale-110' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                />
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Information Density</label>
            <div className="flex bg-zinc-50 dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {fontSizes.map((size) => (
                <button
                  key={size.name}
                  onClick={() => setFontSize(size.name)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${fontSize === size.name ? `bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-md` : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400'}`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800/50">
          <button
            onClick={onClose}
            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${getAccentClass('bg', '600')}`}
          >
            Apply Manifest
          </button>
        </div>
      </div>
    </div>
  );
};