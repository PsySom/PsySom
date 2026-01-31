
import React, { useState, useRef, useEffect } from 'react';
import { DriveService } from '../../lib/drive/driveService';
import { useProjects } from '../../contexts/ProjectContext';
import { Message } from '../../types';

interface ChatInputProps {
  onSend: (text: string, attachment?: Message['attachment']) => void;
  onVoiceTrigger?: () => void;
  disabled: boolean;
  placeholder?: string;
}

type Language = { code: string; label: string; bcp47: string };
const LANGUAGES: Language[] = [
  { code: 'EN', label: 'English', bcp47: 'en-US' },
  { code: 'RU', label: 'Русский', bcp47: 'ru-RU' },
  { code: 'FR', label: 'Français', bcp47: 'fr-FR' },
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onVoiceTrigger, disabled, placeholder }) => {
  const [text, setText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [langIndex, setLangIndex] = useState(0); 
  const { activeProject } = useProjects();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isManuallyStopping = useRef(false);

  const currentLang = LANGUAGES[langIndex];

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

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
      
      onSend(attachmentMsg, attachmentObj);
      
    } catch (err: any) {
      console.error("Vault Sync Failure:", err);
      alert(`Sovereign Vault Error: ${err.message || "Failed to upload file."}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cycleLanguage = () => {
    setLangIndex((prev) => (prev + 1) % LANGUAGES.length);
  };

  const toggleDictation = () => {
    if (isDictating) {
      isManuallyStopping.current = true;
      recognitionRef.current?.stop();
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
    recognition.lang = currentLang.bcp47;

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => {
      if (!isManuallyStopping.current) {
        try { recognition.start(); } catch (e) { setIsDictating(false); }
      } else {
        setIsDictating(false);
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        setText(prev => {
          const base = prev.trim();
          return base === '' ? finalTranscript : `${base} ${finalTranscript}`;
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
    <div className="relative group max-w-4xl mx-auto w-full px-4 md:px-0">
      <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-600/20 to-indigo-500/20 rounded-2xl blur-xl transition-opacity duration-1000 ${isDictating || isUploading ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}`}></div>
      
      <div className={`relative flex items-end gap-2 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-3xl border ${isDictating ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.1)]' : isUploading ? 'border-indigo-500/50 animate-pulse' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl p-2 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-2xl overflow-hidden`}>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className={`self-center ml-2 p-3 rounded-xl transition-all ${isUploading ? 'bg-indigo-600/20 text-indigo-500' : 'text-zinc-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          title="Ingest Asset"
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={cycleLanguage}
          disabled={disabled || isDictating}
          className={`self-center px-3 py-1.5 rounded-xl text-[10px] font-black font-mono transition-all uppercase border ${
            isDictating 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-700' 
              : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white'
          }`}
        >
          {currentLang.code}
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isUploading ? "Syncing with Vault..." : isDictating ? `Listening (${currentLang.code})...` : (placeholder || "Initiate neural flow...")}
          disabled={disabled || isUploading}
          className="flex-1 bg-transparent border-none focus:outline-none text-zinc-900 dark:text-zinc-100 py-3.5 pl-2 resize-none max-h-[200px] text-sm md:text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-700 disabled:opacity-50"
        />
        
        <div className="flex items-center gap-2 self-end p-1">
          <button 
            type="button"
            onClick={toggleDictation}
            disabled={disabled || isUploading}
            className={`p-3.5 transition-all rounded-xl relative group/mic ${isDictating ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
          >
            {isDictating && <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping"></span>}
            <svg className={`w-5 h-5 relative z-10 ${isDictating ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          
          <button 
            onClick={handleSend}
            disabled={!text.trim() || disabled || isUploading}
            className="p-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-300 dark:disabled:text-zinc-700 text-white rounded-xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 group/send"
          >
            <svg className="w-5 h-5 group-hover/send:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
