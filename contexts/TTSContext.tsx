
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useProjects } from './ProjectContext';

interface TTSContextType {
  isPlaying: boolean;
  activeMessageId: string | null;
  activeText: string | null;
  lastMessage: { text: string; id: string } | null;
  play: (text: string, id: string) => void;
  stop: () => void;
  toggle: (text: string, id: string) => void;
  setLatestMessage: (text: string, id: string) => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProject } = useProjects();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<{ text: string; id: string } | null>(null);
  
  // Keep track of the current utterance to prevent GC issues
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /**
   * Neural Voice Selection Logic: POLYGLOT MODE (Strict Fix)
   * Detects language and assigns high-quality (Google/Neural) voices for Russian and French.
   */
  const getBestVoice = useCallback((text: string, voices: SpeechSynthesisVoice[]) => {
    // 1. Language Detection via instruction-specific RegEx
    const isRussian = /[а-яА-ЯёЁ]/.test(text);
    const isFrench = /[éàèùâêîôûç]/i.test(text);

    // 2. Russian Prioritization: "Google" + "ru" fallback to "ru"
    if (isRussian) {
      return voices.find(v => v.lang.toLowerCase().includes('ru') && v.name.toLowerCase().includes('google')) || 
             voices.find(v => v.lang.toLowerCase().includes('ru')) || null;
    }

    // 3. French Prioritization: "Google" + "fr" fallback to "fr"
    if (isFrench) {
      return voices.find(v => v.lang.toLowerCase().includes('fr') && v.name.toLowerCase().includes('google')) || 
             voices.find(v => v.lang.toLowerCase().includes('fr')) || null;
    }

    // 4. Manual Override from Settings
    const manualVoiceUri = localStorage.getItem('idea_flow_tts_voice_uri');
    if (manualVoiceUri) {
      const selected = voices.find(v => v.voiceURI === manualVoiceUri);
      if (selected) return selected;
    }

    // 5. Default Priority: Google US English or high-quality fallback
    return voices.find(v => v.name.includes('Google US English')) || 
           voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
           voices.find(v => v.lang.startsWith('en')) || 
           voices[0] || null;
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveMessageId(null);
    setActiveText(null);
    currentUtteranceRef.current = null;
  }, []);

  const play = useCallback((text: string, id: string) => {
    // CRITICAL FIX: Hard Reset before every utterance to avoid overlap/interruption errors
    window.speechSynthesis.cancel();

    // Neural Cleaning Protocol: Strip AI markers, tools, and markdown before vocalization
    const cleanText = text
      .replace(/\[MEDIA_DISPLAY:\s*{[^\]]+}\s*\]/g, '')
      .replace(/\[SYSTEM_TOOL_CALL:\s*{[^\]]+}\s*\]/g, '')
      .replace(/\[SYSTEM_TOOL_RESULT:\s*.*?\s*\]/g, '')
      .replace(/\[SYSTEM_TOOL_ERROR:\s*.*?\s*\]/g, '')
      .replace(/\[SYSTEM_PROTOCOL:.*?\]/g, '')
      .replace(/\[NEURAL_ATTACHMENT:.*?\]/g, '')
      .replace(/[#*`_~]/g, ' ') // Strip markdown syntax characters
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Ensure voices are loaded; trigger refresh if empty
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.getVoices();
    }

    const voice = getBestVoice(cleanText, voices);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    
    // Strict requirement: Rate = 1.0
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setActiveMessageId(id);
      setActiveText(cleanText);
      setLastMessage({ text, id });
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setActiveMessageId(null);
      setActiveText(null);
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      // Interrupted error is expected when calling .cancel()
      if (e.error !== 'interrupted') {
        console.warn("TTS Neural Interface Error:", e);
      }
      setIsPlaying(false);
      setActiveMessageId(null);
      setActiveText(null);
      currentUtteranceRef.current = null;
    };

    // Retain reference locally to prevent garbage collection during playback
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getBestVoice, stop]);

  const toggle = useCallback((text: string, id: string) => {
    if (activeMessageId === id && isPlaying) {
      stop();
    } else {
      play(text, id);
    }
  }, [activeMessageId, isPlaying, play, stop]);

  const setLatestMessage = useCallback((text: string, id: string) => {
    setLastMessage({ text, id });
  }, []);

  useEffect(() => {
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    // Initial fetch for systems that don't trigger the event immediately
    window.speechSynthesis.getVoices();
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  return (
    <TTSContext.Provider value={{ 
      isPlaying, 
      activeMessageId, 
      activeText, 
      lastMessage, 
      play, 
      stop, 
      toggle, 
      setLatestMessage 
    }}>
      {children}
    </TTSContext.Provider>
  );
};

export const useTTSContext = () => {
  const context = useContext(TTSContext);
  if (!context) throw new Error("useTTSContext must be used within TTSProvider");
  return context;
};
