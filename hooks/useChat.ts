
import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, DriveItem } from '../types';
import { GeminiService } from '../lib/ai/gemini';
import { executeDriveTool } from '../lib/ai/tools';
import { useProjects } from '../contexts/ProjectContext';
import { DriveService } from '../lib/drive/driveService';
import { Content, Part } from '@google/genai';

/**
 * useChat Hook: The "Co-Reasoning" orchestrator.
 * Manages conversation state and autonomous Drive interaction loop.
 */
export const useChat = () => {
  const { activeProject, activeBranch, saveBranch, updateLocalMessages } = useProjects();
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [filesInContext, setFilesInContext] = useState<DriveItem[]>([]);
  
  const lastSavedCountRef = useRef(0);

  /**
   * Neural Handshake: Reset hook state when active project changes.
   */
  useEffect(() => {
    if (!activeProject) return;
    
    setIsLoading(true);
    setFilesInContext([]);
    lastSavedCountRef.current = 0;

    const performHandshake = async () => {
      try {
        await fetchContextFiles();
      } finally {
        setIsLoading(false);
      }
    };

    performHandshake();
  }, [activeProject?.id]);

  // Auto-Save Loop: Persist to Drive every 5 messages
  useEffect(() => {
    if (!activeBranch || activeBranch.isVirtual || !activeBranch.isDirty) return;
    
    // Defensive check for messages existence
    const messages = activeBranch.messages || [];
    const messageCount = messages.length;
    
    if (messageCount > 0 && messageCount % 5 === 0 && messageCount !== lastSavedCountRef.current) {
      console.log(`Auto-saving neural thread: ${activeBranch.name} at ${messageCount} messages.`);
      saveBranch(messages);
      lastSavedCountRef.current = messageCount;
    }
  }, [activeBranch, saveBranch]);

  const fetchContextFiles = useCallback(async () => {
    if (activeProject?.id) {
      try {
        const driveService = DriveService.getInstance();
        const targetFolder = activeProject.config.attachedFolderId || activeProject.driveFolderId;
        const files = await driveService.listContents(targetFolder);
        setFilesInContext(files);
      } catch (err) {
        console.error("Failed to fetch file context for AI:", err);
      }
    } else {
      setFilesInContext([]);
    }
  }, [activeProject?.id, activeProject?.config.attachedFolderId, activeProject?.driveFolderId]);

  const injectMessages = useCallback(async (newMessages: Message[]) => {
    if (!activeBranch) return;
    const currentMessages = Array.isArray(activeBranch.messages) ? activeBranch.messages : [];
    const updatedMessages = [...currentMessages, ...newMessages];
    updateLocalMessages(updatedMessages);
  }, [activeBranch, updateLocalMessages]);

  const sendMessage = useCallback(async (text: string, attachment?: Message['attachment']) => {
    if (!activeProject || !activeBranch || (!text.trim() && !attachment)) return;

    setIsLoading(true);
    
    if (text.includes('[NEURAL_ATTACHMENT:')) {
      await fetchContextFiles();
    }
    
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      type: 'discussion',
      attachment
    };

    const currentMessages = Array.isArray(activeBranch.messages) ? activeBranch.messages : [];
    let updatedMessages = [...currentMessages, userMessage];
    
    // Lazy Authorization: If this is the first message of a virtual branch, save immediately to get a File ID.
    if (activeBranch.isVirtual) {
      await saveBranch(updatedMessages);
      lastSavedCountRef.current = updatedMessages.length;
    } else {
      updateLocalMessages(updatedMessages);
    }
    
    const gemini = new GeminiService();
    const driveService = DriveService.getInstance();

    try {
      const skills = activeProject.config.skills.join(', ') || 'General Intelligence';
      const fileListStr = filesInContext.length > 0 
        ? filesInContext.map(f => `- [${f.mimeType.includes('folder') ? 'DIR' : 'FILE'}] Name: ${f.name} | ID: ${f.id} | Type: ${f.mimeType}`).join('\n')
        : 'The directory is currently empty.';

      const systemPrompt = `
        IDENTITY: You are ${activeProject.name}, a Sovereign Neural Intelligence interface.
        CORE ROLE: ${activeProject.config.role}.
        EXPERT DOMAINS: ${skills}.
        WORKSPACE OBJECTIVE: ${activeProject.config.description || 'General collaboration and knowledge management.'}.

        SITUATIONAL CONTEXT:
        - Project Vault ID: ${activeProject.driveFolderId}
        - Attached Resource Sector: ${activeProject.config.attachedFolderId}
        - Current Thread: ${activeBranch.name}
        
        [MOUNTED KNOWLEDGE GRAPH]
        ${fileListStr}
        
        OPERATIONAL PROTOCOLS:
        1. SOVEREIGN STORAGE: You own this workspace. Use 'list_files' to map the sector if needed.
        2. KNOWLEDGE PERSISTENCE: If a user asks to "save", "remember", or "draft" something, use 'create_file' or 'update_file'.
        3. AGENTIC FEEDBACK: When you call a tool, I will log it in the UI. 
        4. IMAGE ANALYSIS: Use 'read_image' for binary visual data.
        5. THINKING: Always reason step-by-step using markdown before concluding.
      `;

      let chatHistory: Content[] = GeminiService.formatHistory(
        updatedMessages.map(m => ({ role: m.role, content: m.content }))
      );

      let response = await gemini.generateWithTools(chatHistory, systemPrompt);
      let iterationCount = 0;
      const MAX_ITERATIONS = 5;

      while (iterationCount < MAX_ITERATIONS) {
        iterationCount++;
        
        const responseText = response.text || "";
        const toolMatch = responseText.match(/\{[\s\S]*"tool":[\s\S]*\}/);

        if (toolMatch) {
          try {
            const toolData = JSON.parse(toolMatch[0]);
            let feedback = "";
            setToolStatus(`⚡ OS ACTION: ${toolData.tool.toUpperCase()}`);

            if (toolData.tool === 'create_file') {
              const fileId = await driveService.createFile(
                toolData.name, 
                toolData.content, 
                activeProject.config.attachedFolderId || activeProject.driveFolderId
              );
              feedback = `[SYSTEM: File created successfully. ID: ${fileId}]`;
            } else if (toolData.tool === 'read_file') {
              const content = await driveService.readFile(toolData.id);
              feedback = `[SYSTEM: File Content: "${content}"]`;
            } else if (toolData.tool === 'save_branch') {
              await saveBranch(updatedMessages);
              feedback = `[SYSTEM: Thread "${toolData.name}" persisted to Drive successfully.]`;
            }

            const sysMsg: Message = {
              id: `sys-tool-${Date.now()}`,
              role: 'system',
              content: feedback,
              timestamp: Date.now(),
              type: 'system',
            };
            
            updatedMessages = [...updatedMessages, sysMsg];
            updateLocalMessages(updatedMessages);
            await fetchContextFiles();

            chatHistory = GeminiService.formatHistory(
              updatedMessages.map(m => ({ role: m.role, content: m.content }))
            );
            response = await gemini.generateWithTools(chatHistory, systemPrompt);
            continue;
          } catch (err: any) {
            console.error("Text Tool Error:", err);
            break;
          }
        }

        if (response.functionCalls && response.functionCalls.length > 0) {
          chatHistory.push(response.candidates[0].content);
          const toolResponses = [];
          
          for (const fc of response.functionCalls) {
            const actionLabel = fc.name.toUpperCase().replace('_', ' ');
            const targetName = fc.args.name || fc.args.fileId || '';
            setToolStatus(`⚡ NEURAL ACTION: ${actionLabel} ${targetName}`);

            const processMsg: Message = {
              id: `proc-${Date.now()}-${Math.random()}`,
              role: 'system',
              content: `⚡ AI AGENT: Executing ${fc.name}(${targetName})`,
              timestamp: Date.now(),
              type: 'process',
            };
            updatedMessages = [...updatedMessages, processMsg];
            updateLocalMessages(updatedMessages);

            try {
              const result = await executeDriveTool(fc.name, fc.args, activeProject.config.attachedFolderId || activeProject.driveFolderId);
              toolResponses.push({ id: fc.id, name: fc.name, response: { result } });
            } catch (err: any) {
              toolResponses.push({ id: fc.id, name: fc.name, response: { error: err.message || "Drive I/O failure." } });
            }
          }

          const toolParts: Part[] = toolResponses.map(tr => ({ functionResponse: tr }));
          chatHistory.push({ role: 'user', parts: toolParts });
          response = await gemini.generateWithTools(chatHistory, systemPrompt);
        } else {
          break;
        }
      }

      const assistantMessage: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.text || "Neural reasoning sequence concluded.",
        timestamp: Date.now(),
        type: 'idea', 
      };

      updatedMessages = [...updatedMessages, assistantMessage];
      updateLocalMessages(updatedMessages);
      await fetchContextFiles(); 
    } catch (error: any) {
      const errorMessage: Message = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `NEURAL LINK INTERRUPTED: ${error.message || 'Check connection.'}`,
        timestamp: Date.now(),
        type: 'system',
      };
      updateLocalMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setToolStatus(null);
    }
  }, [activeProject, activeBranch, saveBranch, updateLocalMessages, filesInContext, fetchContextFiles]);

  return { sendMessage, injectMessages, isLoading, toolStatus };
};
