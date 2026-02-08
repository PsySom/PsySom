
import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, X, BrainCircuit, Sparkles, Languages, Mic, SendHorizontal, Loader2 } from 'lucide-react';
import { DriveService } from '../../lib/drive/driveService';
import { useProjects } from '../../contexts/ProjectContext';
import { Message } from '../../types';

interface ChatInputProps {
  onSend: (text: string, attachment?: Message['attachment'] | string | null, options?: { isDeepThink?: boolean; isCreative?: boolean }) => void;
  onVoiceTrigger?: () => void;
  disabled: boolean;
  placeholder?: string;
}

type Language = { code: string; label: string; bcp47: string };
const LANGUAGES: Language[] = [
  { code: 'RU', label: 'Русский', bcp47: 'ru-RU' },
  { code: 'EN', label: 'English', bcp47: 'en-US' },
  { code: 'FR', label: 'Français', bcp47: 'fr-FR' },
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onVoiceTrigger, disabled, placeholder }) => {
  const [text, setText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreativeMode, setIsCreativeMode] = useState(false);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [langIndex, setLangIndex] = useState(() => {
    const saved = localStorage.getItem('if-input-lang-idx');
    return saved ? parseInt(saved, 10) : 0;
  }); 
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const { activeProject } = useProjects();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isManuallyStopping = useRef(false);

  const inputLang = LANGUAGES[langIndex];

  useEffect(() => {
    localStorage.setItem('if-input-lang-idx', langIndex.toString());
  }, [langIndex]);

  const handleSend = () => {
    if ((text.trim() || imagePreview) && !disabled) {
      onSend(text.trim(), imagePreview, { 
        isDeepThink, 
        isCreative: isCreativeMode 
      });
      
      setText('');
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const clearImagePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelection = async (file: File) => {
    if (!file || !activeProject) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setIsUploading(true);
      const driveService = DriveService.getInstance();
      try {
        const folderId = activeProject.config.attachedFolderId || activeProject.driveFolderId;
        const fileId = await driveService.uploadFile(file, folderId);
        
        const attachmentMsg = `[NEURAL_ATTACHMENT: ${file.name} (ID: ${fileId})] I have ingested this asset into the neural vault.`;
        const attachmentObj = {
          id: fileId,
          name: file.name,
          mimeType: file.type || 'application/octet-stream'
        };
        
        onSend(attachmentMsg, attachmentObj, { isDeepThink, isCreative: isCreativeMode });
      } catch (err: any) {
        console.error("Vault Sync Failure:", err);
        alert(`Sovereign Vault Error: ${err.message || "Failed to upload file."}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelection(file);
          return;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cycleLanguage = () => {
    if (isDictating) {
      isManuallyStopping.current = true;
      recognitionRef.current?.stop();
      setIsDictating(false);
    }
    setLangIndex((prev) => (prev + 1) % LANGUAGES.length);
  };

  const toggleDictation = () => {
    if (isDictating) {
      isManuallyStopping.current = true;
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Neural Voice interface is not compatible with this environment.");
      return;
    }

    isManuallyStopping.current = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = inputLang.bcp47;

    recognition.onstart = () => setIsDictating(true);
    
    recognition.onerror = (event: any) => {
      console.error("Neural Dictation Error:", event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        setText(prev => {
          const base = prev.trim();
          const cleanNew = finalTranscript.trim();
          return base === '' ? cleanNew : `${base} ${cleanNew}`;
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  return (
    <div className="relative group max-w-4xl mx-auto w-full px-1 sm:px-0 flex flex-col gap-2 sm:gap-3">
      {imagePreview && (
        <div className="relative inline-block self-start animate-in zoom-in-95 fade-in duration-300 ml-2">
           <div className="p-1 bg-white dark:bg-zinc-900 border border-indigo-500/30 rounded-xl sm:rounded-2xl shadow-2xl">
             <img src={imagePreview} alt="Vision Input" className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg sm:rounded-xl border border-zinc-200 dark:border-zinc-800" />
             <button 
               type="button"
               onClick={clearImagePreview}
               className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:scale-110 active:scale-90 transition-transform"
               title="Remove attachment"
             >
               <X size={10} strokeWidth={3} className="sm:w-3 sm:h-3" />
             </button>
           </div>
        </div>
      )}

      <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-600/20 to-teal-500/20 rounded-2xl blur-xl transition-opacity duration-1000 ${isDictating || isUploading || isCreativeMode || isDeepThink || imagePreview ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}`}></div>
      
      <div className={`relative flex items-end gap-1 sm:gap-2 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-3xl border ${
        isDeepThink ? 'border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.15)]' :
        isCreativeMode ? 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 
        isDictating ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.1)]' : 
        isUploading ? 'border-indigo-500/50 animate-pulse' : 
        'border-zinc-200 dark:border-zinc-800'
      } rounded-xl sm:rounded-2xl p-1 sm:p-2 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-2xl overflow-hidden`}>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />

        <div className="flex items-center gap-0.5 sm:gap-1 self-center ml-0.5 sm:ml-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all relative group/attachment ${imagePreview || isUploading ? 'text-indigo-600 bg-indigo-500/10' : 'text-zinc-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            title="Attach Media"
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin sm:w-5 sm:h-5" />
            ) : (
              <Paperclip size={18} strokeWidth={1.5} className={`sm:w-5 sm:h-5 ${imagePreview ? 'animate-bounce' : ''}`} />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsDeepThink(!isDeepThink);
              if (!isDeepThink) setIsCreativeMode(false);
            }}
            disabled={disabled || isUploading}
            className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all relative overflow-hidden group/brain ${isDeepThink ? 'bg-gradient-to-tr from-teal-600 to-cyan-500 text-white shadow-lg' : 'text-zinc-400 hover:text-teal-600 dark:text-zinc-500 dark:hover:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            title="Deep Think"
          >
            <BrainCircuit size={18} className={`sm:w-5 sm:h-5 relative z-10 ${isDeepThink ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={cycleLanguage}
          disabled={disabled || isDictating}
          className={`self-center w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl transition-all border ${
            isDictating 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border-transparent' 
              : 'text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800'
          }`}
          title={`Switch Language (${inputLang.label})`}
        >
          <span className="text-[8px] sm:text-[10px] font-black tracking-widest">{inputLang.code}</span>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onPaste={handlePaste}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? "Syncing..." : isDictating ? `Listening (${inputLang.code})...` : (placeholder || "Initiate flow...")}
          disabled={disabled || isUploading}
          className="flex-1 bg-transparent border-none focus:outline-none text-zinc-900 dark:text-zinc-100 py-3 sm:py-3.5 pl-1 sm:pl-2 resize-none max-h-[150px] sm:max-h-[200px] text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-700"
        />
        
        <div className="flex items-center gap-1 self-end p-0.5 sm:p-1">
          <button 
            type="button"
            onClick={toggleDictation}
            disabled={disabled || isUploading}
            className={`p-2.5 sm:p-3.5 transition-all rounded-lg sm:rounded-xl relative group/mic ${isDictating ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
          >
            {isDictating && <span className="absolute inset-0 rounded-lg sm:rounded-xl bg-red-500/20 animate-ping"></span>}
            <Mic size={18} className={`sm:w-5 sm:h-5 relative z-10 ${isDictating ? 'animate-pulse' : ''}`} />
          </button>
          
          <button 
            onClick={handleSend}
            disabled={(!text.trim() && !imagePreview) || disabled || isUploading}
            className={`p-2.5 sm:p-3.5 ${isDeepThink ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'} disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-300 dark:disabled:text-zinc-700 text-white rounded-lg sm:rounded-xl transition-all shadow-xl active:scale-95 group/send`}
          >
            <SendHorizontal size={18} className="sm:w-5 sm:h-5 group-hover/send:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
