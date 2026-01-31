
import { useState, useCallback, useRef } from 'react';
import { LiveServerMessage } from '@google/genai';
import { useProjects } from '../contexts/ProjectContext';
import { GeminiLiveService, SessionTranscript } from '../lib/ai/geminiLive';

interface UseVoiceChatProps {
  onSessionComplete?: (transcript: SessionTranscript[]) => void;
}

export const useVoiceChat = ({ onSessionComplete }: UseVoiceChatProps = {}) => {
  const { activeProject } = useProjects();
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [transcriptionHistory, setTranscriptionHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  const stopSession = useCallback(() => {
    let finalTranscript: SessionTranscript[] = [];
    
    if (serviceRef.current) {
      finalTranscript = serviceRef.current.disconnect();
      serviceRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsModelSpeaking(false);

    if (onSessionComplete && finalTranscript.length > 0) {
      onSessionComplete(finalTranscript);
    }

    setTranscriptionHistory([]);
  }, [onSessionComplete]);

  const startSession = useCallback(async (initialHistory: string = '') => {
    if (!activeProject) return;
    setError(null);

    try {
      const service = new GeminiLiveService({
        apiKey: process.env.API_KEY as string,
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: activeProject.config.voice || 'Zephyr',
        systemInstruction: `You are ${activeProject.name}, a Sovereign Neural Intelligence interface.
          ROLE: ${activeProject.config.role}. 
          CONVERSATION STYLE: Concise, professional, and helpful. Respond as a real-time voice assistant.
          SUPPORTED LANGUAGES: Russian, English, French. Match the user's language choice.`,
        onOpen: () => {
          setIsConnected(true);
          setIsListening(true);
        },
        onModelSpeakingChange: (speaking) => {
          setIsModelSpeaking(speaking);
        },
        onMessage: (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            setTranscriptionHistory(prev => [...prev, `You: ${text}`].slice(-3));
          }
          if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            setTranscriptionHistory(prev => [...prev, `OS: ${text}`].slice(-3));
          }
        },
        onError: (err) => {
          console.error("Voice Link Error:", err);
          setError(err.message || "Neural Link connection failure.");
          stopSession();
        },
        onClose: () => {
          setIsConnected(false);
        }
      });

      serviceRef.current = service;
      await service.connect(initialHistory);
    } catch (err: any) {
      console.error("Start Session Error:", err);
      setError(err.message || "Failed to initialize voice hardware.");
      stopSession();
    }
  }, [activeProject, stopSession]);

  return { isConnected, isListening, isModelSpeaking, startSession, stopSession, transcriptionHistory, error };
};
