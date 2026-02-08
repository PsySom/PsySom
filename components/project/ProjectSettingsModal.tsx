
import React, { useState, useEffect, useCallback } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { Project, ProjectConfig } from '../../types';
import { FolderBrowser } from './FolderBrowser';
import { checkNeuralAccess } from '../../lib/config';
import { Play, Square, Sparkles } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

type Tab = 'general' | 'intelligence' | 'connection' | 'appearance' | 'access';

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, project }) => {
  const { updateProjectConfig } = useProjects();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [config, setConfig] = useState<ProjectConfig>(project.config);
  const [projectName, setProjectName] = useState(project.name);
  const [skillsInput, setSkillsInput] = useState(Array.isArray(project.config.skills) ? project.config.skills.join(', ') : '');
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [showResetToast, setShowResetToast] = useState(false);

  // Native TTS State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(localStorage.getItem('idea_flow_tts_voice_uri') || '');
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  const fetchVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    // Prioritize high-quality voices found in Google/Neural engines
    const sorted = [...voices].sort((a, b) => {
      const isANeural = a.name.toLowerCase().includes('google') || a.name.toLowerCase().includes('neural');
      const isBNeural = b.name.toLowerCase().includes('google') || b.name.toLowerCase().includes('neural');
      if (isANeural && !isBNeural) return -1;
      if (!isANeural && isBNeural) return 1;
      return a.name.localeCompare(b.name);
    });
    setAvailableVoices(sorted);
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkNeuralAccess().then(setHasApiKey);
      setSkillsInput(Array.isArray(project.config.skills) ? project.config.skills.join(', ') : '');
      setConfig(project.config);
      setProjectName(project.name);
      
      // Initial fetch and setup listener
      fetchVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = fetchVoices;
      }
    }
  }, [isOpen, project, fetchVoices]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!projectName.trim()) return;
    
    setIsSaving(true);
    try {
      const nameChanged = projectName.trim() !== project.name;
      const finalSkills = skillsInput.split(',').map(s => s.trim()).filter(s => s !== '');
      const finalConfig = { ...config, skills: finalSkills };
      
      // Persist chosen voice to localStorage for TTSContext to use
      localStorage.setItem('idea_flow_tts_voice_uri', selectedVoiceUri);
      
      await updateProjectConfig(
        project.id, 
        finalConfig, 
        nameChanged ? projectName.trim() : undefined
      );
      onClose();
    } catch (err) {
      console.error("Neural Sync Failure:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestVoice = () => {
    if (isTestPlaying) {
      window.speechSynthesis.cancel();
      setIsTestPlaying(false);
      return;
    }

    const testText = selectedVoiceUri.includes('RU') || selectedVoiceUri.includes('Russian') 
      ? "Нейронное рукопожатие подтверждено. Система готова." 
      : "Neural handshake confirmed. Vocal matrix synchronized.";

    const utterance = new SpeechSynthesisUtterance(testText);
    const voice = availableVoices.find(v => v.voiceURI === selectedVoiceUri);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    
    utterance.onstart = () => setIsTestPlaying(true);
    utterance.onend = () => setIsTestPlaying(false);
    utterance.onerror = () => setIsTestPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleRestoreDefaults = () => {
    setConfig(prev => ({
      ...prev,
      logicModelId: 'gemini-3-pro-preview',
      imageModelId: 'imagen-4.0-generate-001',
      videoModelId: 'veo-3.1-generate-preview',
      reasoningBudget: 4096
    }));
    setShowResetToast(true);
    setTimeout(() => setShowResetToast(false), 3000);
  };

  const handleManageKeys = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setTimeout(async () => {
        const hasKey = await checkNeuralAccess();
        setHasApiKey(hasKey);
      }, 1000);
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

  const handleStopPropagation = (e: React.KeyboardEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-white dark:bg-zinc-900 border-none md:border border-zinc-200 dark:border-zinc-800 rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <div className="p-5 sm:p-8 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
           <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase flex items-center gap-3">
                <div className="w-1.5 h-6 sm:w-2 sm:h-8 bg-indigo-500 rounded-full"></div>
                Vault Configuration
              </h2>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-[0.2em] mt-2 font-black truncate max-w-[200px] sm:max-w-none">{project.name} // NODE_{project.id.substring(0, 8)}</p>
           </div>
           <button onClick={onClose} className="p-2 sm:p-3 text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        </div>

        <div className="flex bg-white dark:bg-zinc-950/80 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-md overflow-x-auto no-scrollbar shrink-0">
           {(['general', 'intelligence', 'connection', 'appearance', 'access'] as Tab[]).map(tab => (
             <button
               key={tab}
               onClick={() => { setActiveTab(tab); setIsBrowsing(false); }}
               className={`flex-1 min-w-[90px] py-4 sm:py-5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}
             >
               {tab}
               {activeTab === tab && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-500 rounded-full"></div>}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 scrollbar-hide min-h-0">
           {activeTab === 'general' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Project Identifier</label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    onKeyDown={handleStopPropagation}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Mission Protocol</label>
                  <textarea 
                    value={config.description || ''}
                    onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    onKeyDown={handleStopPropagation}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-5 py-5 text-slate-900 dark:text-white text-sm h-48 md:h-64 resize-none font-medium leading-relaxed shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
             </div>
           )}

           {activeTab === 'intelligence' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Neural Logic Core</h3>
                  </div>
                  <button 
                    onClick={handleRestoreDefaults}
                    className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/10 hover:border-indigo-500/30 bg-indigo-500/5 group"
                  >
                    <Sparkles className="w-3.5 h-3.5 group-hover:animate-pulse" />
                    Reset Core Models
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Persona (Role)</label>
                      <input 
                        type="text"
                        value={config.role}
                        onChange={e => setConfig(prev => ({ ...prev, role: e.target.value }))}
                        onKeyDown={handleStopPropagation}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-bold shadow-inner text-base"
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Live Voice</label>
                      <select 
                        value={config.voice}
                        onChange={e => setConfig(prev => ({ ...prev, voice: e.target.value }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-bold shadow-inner appearance-none text-base"
                      >
                        {voices.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                   </div>

                   {/* Native TTS Selector: Polyglot Mode Support */}
                   <div className="space-y-4 col-span-1 md:col-span-2 p-5 sm:p-6 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-inner">
                      <div className="flex items-center justify-between mb-2">
                         <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Text Reader Voice (Native)</label>
                         <button 
                           onClick={handleTestVoice}
                           className={`p-2 rounded-lg transition-all ${isTestPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white dark:bg-zinc-800 text-indigo-500 hover:bg-indigo-50 shadow-sm'}`}
                         >
                            {isTestPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                         </button>
                      </div>
                      <select 
                        value={selectedVoiceUri}
                        onChange={e => setSelectedVoiceUri(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-slate-900 dark:text-white text-xs font-bold appearance-none cursor-pointer"
                      >
                        <option value="">Auto-Detect (Polyglot Mode)</option>
                        {availableVoices.map(v => (
                          <option key={v.voiceURI} value={v.voiceURI} className={v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('neural') ? 'font-black text-indigo-500' : ''}>
                            {v.name.toLowerCase().includes('google') ? '★ ' : ''}{v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                   </div>

                   <div className="space-y-3 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Reasoning Core</label>
                      <input 
                        type="text"
                        value={config.logicModelId || 'gemini-3-pro-preview'}
                        onChange={e => setConfig(prev => ({ ...prev, logicModelId: e.target.value }))}
                        onKeyDown={handleStopPropagation}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-mono shadow-inner text-base"
                      />
                   </div>

                   <div className="space-y-3 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] pl-1">Core Expertise Domains (Skills) & System Persona</label>
                      <p className="text-[10px] text-zinc-400 mb-2 pl-1">Define the AI's role, specialized knowledge, tone, and strict rules.</p>
                      <textarea 
                        value={config.systemInstruction || ''}
                        onChange={e => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                        onKeyDown={handleStopPropagation}
                        placeholder="Example: You are a Senior React Developer. Always answer with code examples. Be concise..."
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-5 py-5 text-slate-900 dark:text-white text-sm h-40 resize-y font-mono leading-relaxed shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'access' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-zinc-50 dark:bg-zinc-950/30 space-y-6">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Neural Handshake Status</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{hasApiKey ? 'Authenticated' : 'Offline'}</span>
                   </div>
                   <button 
                    onClick={handleManageKeys}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl transition-all"
                  >
                    Refresh Neural Access
                  </button>
                </div>
             </div>
           )}
           
           {activeTab === 'connection' && (
             <div className="space-y-8 h-full flex flex-col animate-in slide-in-from-right-4 duration-300 min-h-0">
                {!isBrowsing ? (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-6 sm:p-12 text-center gap-8 bg-zinc-50 dark:bg-zinc-950/30">
                     <p className="text-slate-900 dark:text-white text-lg font-black italic uppercase tracking-tight">Active Neural Mount</p>
                     <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em] font-black break-all">{config.attachedFolderId}</p>
                     <button onClick={() => setIsBrowsing(true)} className="px-8 sm:px-10 py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all">Re-Map Connection</button>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden">
                     <FolderBrowser 
                       initialFolderId={config.attachedFolderId}
                       onSelect={(id) => { setConfig(prev => ({ ...prev, attachedFolderId: id })); setIsBrowsing(false); }}
                     />
                  </div>
                )}
             </div>
           )}
        </div>

        <div className="p-5 sm:p-8 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-950/80 flex flex-col sm:flex-row gap-3 sm:gap-4 backdrop-blur-xl shrink-0">
           <button onClick={onClose} className="flex-1 py-4 sm:py-5 bg-white dark:bg-zinc-800/50 text-zinc-400 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] transition-all border border-zinc-200 dark:border-zinc-800/50">Abort</button>
           <button 
             disabled={isSaving || !projectName.trim()}
             onClick={handleSave}
             className="flex-2 flex-[2] py-4 sm:py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-xl disabled:opacity-50"
           >
             {isSaving ? "Syncing..." : "Commit Configuration"}
           </button>
        </div>
      </div>
    </div>
  );
};
