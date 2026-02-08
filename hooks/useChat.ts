import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, DriveItem } from '../types';
import { GeminiService, GenerationOptions } from '../lib/ai/gemini';
import { executeDriveTool } from '../lib/ai/tools';
import { useProjects } from '../contexts/ProjectContext';
import { DriveService } from '../lib/drive/driveService';
import { MediaGenerationService } from '../lib/ai/mediaGenerationService';
import { Content, Part } from '@google/genai';
import * as geminiLive from '../lib/ai/geminiLive';
import { checkNeuralAccess } from '../lib/config';

/**
 * useChat Hook: The "Co-Reasoning" orchestrator for IdeaFlow 3.0.
 */
export const useChat = () => {
  const { activeProject, activeBranch, saveBranch, updateLocalMessages, selectBranch } = useProjects();
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceLinking, setIsVoiceLinking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthBroken, setIsAuthBroken] = useState(false);
  const [filesInContext, setFilesInContext] = useState<DriveItem[]>([]);
  
  const geminiService = useRef(new GeminiService()).current;

  const activeProjectRef = useRef(activeProject);
  const activeBranchRef = useRef(activeBranch);

  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  useEffect(() => {
    activeBranchRef.current = activeBranch;
  }, [activeBranch]);

  useEffect(() => {
    return () => {
      geminiLive.disconnect();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!activeProject) return;
    fetchContextFiles();
  }, [activeProject?.id]);

  const fetchContextFiles = useCallback(async () => {
    if (activeProject?.id) {
      try {
        const driveService = DriveService.getInstance();
        const targetFolder = activeProject.config.attachedFolderId || activeProject.driveFolderId;
        const files = await driveService.listContents(targetFolder);
        setFilesInContext(files);
      } catch (err: any) { 
        if (err.message === 'AUTH_DEAD') setIsAuthBroken(true);
        console.error("Context fetch failed:", err); 
      }
    }
  }, [activeProject]);

  const startVoiceLink = useCallback(async () => {
    const project = activeProjectRef.current;
    const branch = activeBranchRef.current;
    
    if (!project || !branch || isVoiceLinking) return;
    
    const hasKey = await checkNeuralAccess();
    if (!hasKey && window.aistudio) {
      await window.aistudio.openSelectKey();
      const stillNoKey = !(await checkNeuralAccess());
      if (stillNoKey) {
        setError("Sovereign Key required for real-time neural handshake.");
        return;
      }
    }

    setIsVoiceLinking(true);
    setError(null);

    const systemInstruction = `
      IDENTITY: ${project.name} Real-time Neural Link.
      ROLE: ${project.config.role}.
      PROTOCOL: Be concise, conversational, and direct.
      EXTRA_CONTEXT: ${project.config.systemInstruction || ''}
    `;

    try {
      await geminiLive.connect(
        systemInstruction,
        branch.messages || [],
        (speaking) => setIsAiSpeaking(speaking),
        (userFinal, aiFinal) => {
          const now = Date.now();
          const finalMessages: Message[] = [];
          if (userFinal) finalMessages.push({ id: `vf-u-${now}`, role: 'user', content: userFinal, timestamp: now, type: 'discussion' });
          if (aiFinal) finalMessages.push({ id: `vf-a-${now}`, role: 'assistant', content: aiFinal, timestamp: now + 1, type: 'idea' });
          
          updateLocalMessages(prev => {
            const existing = prev.filter(m => !m.id.startsWith('v-live-'));
            return [...existing, ...finalMessages];
          });
        },
        (userText) => {
          updateLocalMessages(prev => {
            const existing = [...prev].filter(m => m.id !== 'v-live-user');
            return [...existing, { id: 'v-live-user', role: 'user', content: userText, timestamp: Date.now(), type: 'discussion' }];
          });
        },
        (aiText) => {
          updateLocalMessages(prev => {
            const existing = [...prev].filter(m => m.id !== 'v-live-ai');
            return [...existing, { id: 'v-live-ai', role: 'assistant', content: aiText, timestamp: Date.now(), type: 'idea' }];
          });
        },
        project.config.voice,
        process.env.API_KEY
      );
    } catch (err: any) {
      console.error("Voice Connection Failure:", err);
      if (err.message === 'AUTH_DEAD') setIsAuthBroken(true);
      setError(err.message || "Neural link disruption.");
      setIsVoiceLinking(false);
    }
  }, [updateLocalMessages, isVoiceLinking]);

  const stopVoiceLink = useCallback(async () => {
    await geminiLive.disconnect();
    setIsVoiceLinking(false);
    setIsAiSpeaking(false);
    
    updateLocalMessages(prev => {
      const filtered = prev.filter(m => !m.id.startsWith('v-live-'));
      if (activeBranchRef.current) {
         setToolStatus("Vault Sync...");
         saveBranch(filtered).catch(e => {
           if (e.message === 'AUTH_DEAD') setIsAuthBroken(true);
         }).finally(() => setToolStatus(null));
      }
      return filtered;
    });
  }, [updateLocalMessages, saveBranch]);

  /**
   * deleteMessage: Removes a specific message from history and syncs with Drive.
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!activeBranchRef.current) return;
    
    const currentMessages = activeBranchRef.current.messages || [];
    const filteredMessages = currentMessages.filter(m => m.id !== messageId);
    
    // Optimistic local update
    updateLocalMessages(filteredMessages);
    
    // Immediate background sync to Vault
    try {
      setToolStatus("Pruning Vault...");
      await saveBranch(filteredMessages);
    } catch (err: any) {
      console.error("Vault Deletion Sync Failed:", err);
      if (err.message === 'AUTH_DEAD') setIsAuthBroken(true);
      setError("Failed to sync message removal to cloud vault.");
    } finally {
      setToolStatus(null);
    }
  }, [updateLocalMessages, saveBranch]);

  /**
   * sendMessage: Simplified signature for vision integration as requested.
   * Signature: (content: string, attachment?: string | null)
   */
  const sendMessage = useCallback(async (
    content: string, 
    attachment?: string | null
  ) => {
    if (!activeProject || !activeBranch || (!content.trim() && !attachment)) return;
    setError(null);
    setIsLoading(true);
    setToolStatus("Reasoning...");
    
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      type: 'discussion',
      base64Attachment: attachment || undefined
    };

    updateLocalMessages(prev => [...prev, userMessage]);
    
    try {
      const systemPrompt = `IDENTITY: ${activeProject.name}. ROLE: ${activeProject.config.role}. ${activeProject.config.systemInstruction || ''}`;
      let currentMessagesForAI = [...(activeBranchRef.current?.messages || []), userMessage];
      let assistantText = "";
      let loopCount = 0;
      const MAX_LOOPS = 6; 

      // Deep Think logic based on prompt keywords or state
      const isDeepThink = content.toLowerCase().includes('search') || content.toLowerCase().includes('verify');
      const options: GenerationOptions = {
        isDeepThink,
        modelId: activeProject.config.logicModelId,
        reasoningBudget: activeProject.config.reasoningBudget,
        onRetry: (m: string) => setToolStatus(m)
      };

      while (loopCount < MAX_LOOPS) {
        loopCount++;
        let chatHistory = GeminiService.formatHistory(currentMessagesForAI.map(m => ({ 
          role: m.role, 
          content: m.content,
          base64Attachment: m.base64Attachment
        })));
        
        const responseText = await geminiService.generateWithTools(chatHistory, systemPrompt, options);
        
        const toolCallRegex = /\[SYSTEM_TOOL_CALL: ({.*?})\]/g;
        const matches = [...responseText.matchAll(toolCallRegex)];

        const cleanText = responseText.replace(toolCallRegex, '').trim();
        if (cleanText) assistantText += (assistantText ? "\n\n" : "") + cleanText;

        if (matches.length === 0) break; 

        let contextSwitched = false;

        for (const match of matches) {
          let toolCall;
          try { toolCall = JSON.parse(match[1]); } catch (e) { continue; }

          setToolStatus(`Vault Access...`);
          
          try {
            let result = await executeDriveTool(
              toolCall.name, 
              toolCall.args, 
              activeProject.config.attachedFolderId || activeProject.driveFolderId
            );

            if (result.status === 'delegated') {
              if (result.type === 'image' || result.type === 'video') {
                const isVideo = result.type === 'video';
                if (isVideo) setIsGeneratingVideo(true);
                
                setToolStatus(isVideo ? "Producing video..." : "Synthesizing Image...");
                
                try {
                  const mediaBlob = await MediaGenerationService.getInstance().generateMedia({
                    type: result.type,
                    prompt: result.prompt,
                    referenceFileId: result.reference_file_id,
                    imageModel: activeProject.config.imageModelId,
                    videoModel: activeProject.config.videoModelId,
                    onProgress: (status) => setToolStatus(status)
                  });
                  
                  const fileName = `${result.type}_${Date.now()}.${result.type === 'video' ? 'mp4' : 'png'}`;
                  const fileId = await DriveService.getInstance().uploadFile(mediaBlob, activeProject.config.attachedFolderId || activeProject.driveFolderId, fileName);
                  
                  const toolResponse = `[MEDIA_DISPLAY: {"id": "${fileId}", "type": "${mediaBlob.type}", "name": "${fileName}"}] Media synthesized.`;
                  currentMessagesForAI.push({ role: 'assistant', content: `[SYSTEM_TOOL_RESULT: ${toolResponse}]` } as Message);
                  assistantText += `\n\n${toolResponse}`;
                } catch (mediaErr: any) {
                  if (mediaErr.message === 'AUTH_DEAD') setIsAuthBroken(true);
                  setError("Neural synthesis disruption.");
                  currentMessagesForAI.push({ role: 'assistant', content: `[SYSTEM_TOOL_ERROR: Synthesis failed]` } as Message);
                } finally {
                  if (isVideo) setIsGeneratingVideo(false);
                }
              } else if (result.action === 'save_branch') {
                setToolStatus("Syncing...");
                await saveBranch(currentMessagesForAI as Message[], result.summary);
                currentMessagesForAI.push({ role: 'assistant', content: `[SYSTEM_TOOL_RESULT: Thread persisted]` } as Message);
              } else if (result.action === 'open_branch') {
                setToolStatus(`Switching Context...`);
                if (activeBranchRef.current?.isDirty && !activeBranchRef.current?.isVirtual) {
                   await saveBranch(currentMessagesForAI as Message[]);
                }
                await selectBranch(result.id);
                contextSwitched = true;
                break;
              }
            } else {
              const resultStr = JSON.stringify(result);
              currentMessagesForAI.push({ role: 'assistant', content: `[SYSTEM_TOOL_CALL: ${JSON.stringify(toolCall)}]` } as Message);
              currentMessagesForAI.push({ role: 'assistant', content: `[SYSTEM_TOOL_RESULT: ${resultStr}]` } as Message);
            }
          } catch (toolErr: any) {
            if (toolErr.message === 'AUTH_DEAD') setIsAuthBroken(true);
            currentMessagesForAI.push({ role: 'assistant', content: `[SYSTEM_TOOL_ERROR: Execution failed]` } as Message);
          }
        }
        
        if (contextSwitched) break; 
        setToolStatus("Deep Reasoning...");
      }

      if (assistantText.trim() || !activeBranchRef.current?.isVirtual) {
        const assistantMessage: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: assistantText.trim() || "Cycle complete.",
          timestamp: Date.now(),
          type: options.isDeepThink ? 'result' : 'idea',
        };
        updateLocalMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      if (err.message === 'AUTH_DEAD') setIsAuthBroken(true);
      setError(err.message || "NEURAL_DISRUPTION");
    } finally {
      setIsLoading(false);
      setToolStatus(null);
    }
  }, [activeProject, activeBranch, updateLocalMessages, geminiService, saveBranch, selectBranch]);

  return { sendMessage, deleteMessage, startVoiceLink, stopVoiceLink, isVoiceLinking, isAiSpeaking, isGeneratingVideo, isLoading, toolStatus, error, clearError, isAuthBroken };
};