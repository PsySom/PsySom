import { useState, useCallback, useRef } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { GeminiLiveService } from '../lib/ai/geminiLive';

export const useVoiceChat = () => {
  const { activeProject } = useProjects();
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const stopSession = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsModelSpeaking(false);
    setTranscriptionHistory([]);
  }, []);

  const startSession = useCallback(async (initialHistory: string = '', onTurn: (u: string, a: string) => void) => {
    if (!activeProject) return;
    setError(null);

    try {
      // Ensure any existing session is purged
      await stopSession();

      const service = new GeminiLiveService({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: activeProject.config.voice || 'Zephyr',
        systemInstruction: `You are ${activeProject.name}, a Sovereign Neural OS interface. Your logic is powered by a private vault. Be direct and insightful.`,
        onOpen: () => {
          setIsConnected(true);
          setIsListening(true);
        },
        onModelSpeakingChange: (speaking) => {
          setIsModelSpeaking(speaking);
        },
        onUserText: (text) => {
           setTranscriptionHistory(prev => [...prev.slice(-2), `You: ${text}`]);
        },
        onAiText: (text) => {
           setTranscriptionHistory(prev => [...prev.slice(-2), `OS: ${text}`]);
        },
        onTurnComplete: (u, a) => {
           onTurn(u, a);
           setTranscriptionHistory([]);
        },
        onError: (err) => {
          const errMsg = err?.message || "Neural Link disruption.";
          setError(errMsg);
          if (errMsg.includes("Insufficient") || errMsg.includes("1006")) {
            console.warn("Resource exhaustion detected. Purging neural core...");
          }
          stopSession();
        },
        onClose: () => {
          setIsConnected(false);
        }
      });

      serviceRef.current = service;
      // Fix: The connect method on GeminiLiveService does not take arguments. 
      // If history is required, it should be provided via initialContext in the constructor.
      await service.connect();
    } catch (err: any) {
      console.error("Voice Engine Failure:", err);
      setError(err.message || "Microphone initialization failed. Check browser permissions.");
      await stopSession();
    }
  }, [activeProject, stopSession]);

  return { isConnected, isListening, isModelSpeaking, startSession, stopSession, transcriptionHistory, error };
};