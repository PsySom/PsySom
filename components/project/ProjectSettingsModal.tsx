
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Activity, FolderTree, Palette, MessageSquare, Zap } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';
import { Project, ProjectConfig, AvatarConfig } from '../../types';
import { FolderBrowser } from './FolderBrowser';
import { checkNeuralAccess } from '../../lib/config';
import { OrbAvatar, DEFAULT_ORB_CONFIG } from '../ui/OrbAvatar';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

type Tab = 'intelligence' | 'persona' | 'general' | 'connection';

const ensureHex = (color: string): string => {
  if (!color) return '#6366f1';
  if (color.startsWith('#')) {
    if (color.length === 7) return color;
    if (color.length === 4) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    return '#6366f1';
  }
  
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (!match) return '#6366f1';
    const [r, g, b] = match.map(Number);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  return '#6366f1';
};

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project }) => {
  const { updateProjectConfig } = useProjects();
  const [activeTab, setActiveTab] = useState<Tab>('intelligence');
  const [config, setConfig] = useState<ProjectConfig>({
    ...project.config,
    avatarConfig: project.config.avatarConfig || DEFAULT_ORB_CONFIG
  });
  const [projectName, setProjectName] = useState(project.name);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestSpeaking, setIsTestSpeaking] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkNeuralAccess().then(setHasApiKey);
      setConfig({
        ...project.config,
        avatarConfig: project.config.avatarConfig || DEFAULT_ORB_CONFIG
      });
      setProjectName(project.name);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!projectName.trim()) return;
    setIsSaving(true);
    try {
      await updateProjectConfig(
        project.id, 
        config, 
        projectName.trim() !== project.name ? projectName.trim() : undefined
      );
      onClose();
    } catch (err) {
      console.error("Neural Sync Failure:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateAvatarColors = (updates: Partial<AvatarConfig['colors']>) => {
    const current = config.avatarConfig || DEFAULT_ORB_CONFIG;
    setConfig(prev => ({
      ...prev,
      avatarConfig: { 
        ...current, 
        colors: { ...current.colors, ...updates } 
      }
    }));
  };

  const updateAvatarSettings = (updates: Partial<AvatarConfig['settings']>) => {
    const current = config.avatarConfig || DEFAULT_ORB_CONFIG;
    setConfig(prev => ({
      ...prev,
      avatarConfig: { 
        ...current, 
        settings: { ...current.settings, ...updates } 
      }
    }));
  };

  const handleStopPropagation = (e: React.KeyboardEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-6 overflow-hidden pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div 
        className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-white dark:bg-zinc-900 rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300"
        onClick={handleStopPropagation}
      >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
              Vault Configuration
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6 overflow-x-auto no-scrollbar bg-white dark:bg-zinc-900 sticky top-0 z-10">
          {(['intelligence', 'persona', 'general', 'connection'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setIsBrowsing(false); }}
              className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            
          {activeTab === 'intelligence' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Reasoning Core</label>
                  <input 
                    type="text" 
                    value={config.logicModelId || 'gemini-3-pro-preview'} 
                    onChange={e => setConfig(prev => ({ ...prev, logicModelId: e.target.value }))}
                    onKeyDown={handleStopPropagation}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Reasoning Budget</label>
                  <input 
                    type="number" 
                    value={config.reasoningBudget || 4096} 
                    onChange={e => setConfig(prev => ({ ...prev, reasoningBudget: parseInt(e.target.value) }))}
                    onKeyDown={handleStopPropagation}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Core Expertise & System Persona</label>
                <textarea
                  value={config.systemInstruction || ''} 
                  onChange={e => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                  onKeyDown={handleStopPropagation}
                  placeholder="Define AI persona constraints and knowledge boundaries..."
                  className="w-full h-48 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-6 border border-zinc-100 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                  <p className="text-xs font-black uppercase tracking-widest dark:text-white">Neural Key Status</p>
                </div>
                <button 
                  onClick={async () => { if (window.aistudio) { await window.aistudio.openSelectKey(); setTimeout(async () => setHasApiKey(await checkNeuralAccess()), 1000); } }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-colors"
                >
                  Refresh Access
                </button>
              </div>
            </div>
          )}

          {activeTab === 'persona' && (
            <div className="space-y-12 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col md:flex-row gap-10 items-center justify-center py-10 px-8 bg-zinc-50 dark:bg-zinc-950/50 rounded-[3.5rem] border border-zinc-100 dark:border-zinc-800/50 shadow-inner">
                <div className="shrink-0 flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="absolute -inset-8 bg-indigo-500/10 blur-[50px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <OrbAvatar config={config.avatarConfig || DEFAULT_ORB_CONFIG} size={180} interactive={true} isSpeaking={isTestSpeaking} />
                    <button 
                      onClick={() => setIsTestSpeaking(!isTestSpeaking)}
                      className={`absolute -bottom-2 -right-2 p-4 rounded-3xl transition-all shadow-2xl flex items-center justify-center ${isTestSpeaking ? 'bg-red-600 text-white animate-pulse' : 'bg-white dark:bg-zinc-800 text-indigo-500 hover:scale-110'}`}
                      title="Test Resonance"
                    >
                      {isTestSpeaking ? <Zap size={20} fill="currentColor" /> : <Activity size={20} />}
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.4em] font-black">Neural Core Matrix</p>
                    <p className="text-[9px] text-zinc-400 mt-1 uppercase font-bold tracking-widest">v3.0 Sovereign</p>
                  </div>
                </div>
                
                <div className="flex-1 w-full space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { label: 'Core', key: 'primary', current: config.avatarConfig?.colors.primary },
                      { label: 'Gradient', key: 'secondary', current: config.avatarConfig?.colors.secondary },
                      { label: 'Glow', key: 'glow', current: config.avatarConfig?.colors.glow },
                      { label: 'Optical', key: 'eyes', current: config.avatarConfig?.colors.eyes },
                      { label: 'Particles', key: 'particles', current: config.avatarConfig?.colors.particles },
                    ].map(c => (
                      <div key={c.key} className="space-y-2 text-center">
                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{c.label}</label>
                        <div className="relative group">
                          <input 
                            type="color" 
                            value={ensureHex(c.current || '#6366f1')} 
                            onChange={(e) => updateAvatarColors({ [c.key]: e.target.value })}
                            className="w-full h-12 rounded-2xl cursor-pointer bg-transparent border-none p-0 overflow-hidden shadow-sm hover:scale-105 transition-transform" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Glow Intensity</label>
                        <span className="text-[9px] font-mono text-indigo-500 font-black">{config.avatarConfig?.settings.glowIntensity}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1" 
                        value={config.avatarConfig?.settings.glowIntensity}
                        onChange={(e) => updateAvatarSettings({ glowIntensity: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Neural Dynamics</label>
                        <span className="text-[9px] font-mono text-indigo-500 font-black">{config.avatarConfig?.settings.vibrationSpeed}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1" 
                        value={config.avatarConfig?.settings.vibrationSpeed}
                        onChange={(e) => updateAvatarSettings({ vibrationSpeed: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Optical Density</label>
                        <span className="text-[9px] font-mono text-indigo-500 font-black">{config.avatarConfig?.settings.eyeSize}</span>
                      </div>
                      <input 
                        type="range" min="1" max="12" step="0.5" 
                        value={config.avatarConfig?.settings.eyeSize}
                        onChange={(e) => updateAvatarSettings({ eyeSize: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Optical Span</label>
                        <span className="text-[9px] font-mono text-indigo-500 font-black">{config.avatarConfig?.settings.eyeSpacing}px</span>
                      </div>
                      <input 
                        type="range" min="4" max="30" step="1" 
                        value={config.avatarConfig?.settings.eyeSpacing}
                        onChange={(e) => updateAvatarSettings({ eyeSpacing: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Particle Count</label>
                        <span className="text-[9px] font-mono text-indigo-500 font-black">{config.avatarConfig?.settings.particleCount}</span>
                      </div>
                      <input 
                        type="range" min="0" max="25" step="1" 
                        value={config.avatarConfig?.settings.particleCount}
                        onChange={(e) => updateAvatarSettings({ particleCount: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} className="text-indigo-500" />
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vocal Signature</label>
                  </div>
                  <select 
                    value={config.voice} 
                    onChange={e => setConfig(prev => ({ ...prev, voice: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-black appearance-none shadow-sm text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    {['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Palette size={16} className="text-indigo-500" />
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural Persona Title</label>
                  </div>
                  <input 
                    type="text" 
                    value={config.role} 
                    onChange={e => setConfig(prev => ({ ...prev, role: e.target.value }))}
                    onKeyDown={handleStopPropagation}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-black shadow-sm text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Project Identifier</label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={e => setProjectName(e.target.value)} 
                  onKeyDown={handleStopPropagation}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-black text-lg"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Baseline Context</label>
                <textarea 
                  value={config.description || ''} 
                  onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  onKeyDown={handleStopPropagation}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-slate-900 dark:text-white text-sm h-48 resize-none font-medium leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-8 h-full min-h-0 flex flex-col animate-in slide-in-from-right-4 duration-300">
              {isBrowsing ? (
                <div className="flex-1 min-h-[300px]">
                  <FolderBrowser 
                    initialFolderId={config.attachedFolderId} 
                    onSelect={(id) => { setConfig(prev => ({ ...prev, attachedFolderId: id })); setIsBrowsing(false); }} 
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-12 text-center gap-6">
                  <FolderTree size={48} className="text-zinc-200 dark:text-zinc-800" />
                  <div>
                    <p className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight italic">Active Neural Mount</p>
                    <p className="text-[10px] font-mono text-zinc-400 break-all mt-2 max-w-xs">{config.attachedFolderId}</p>
                  </div>
                  <button 
                    onClick={() => setIsBrowsing(true)} 
                    className="px-8 py-3 bg-zinc-100 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105"
                  >
                    Re-Map Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-4 bg-zinc-50 dark:bg-zinc-900/80 backdrop-blur-xl shrink-0">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-white dark:bg-zinc-800 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-zinc-200 dark:border-zinc-700/50 hover:text-zinc-600 transition-colors"
          >
            Abort
          </button>
          <button 
            disabled={isSaving || !projectName.trim()} 
            onClick={handleSave} 
            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={16} />
            )}
            Commit Configuration
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
