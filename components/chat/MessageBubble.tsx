
import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, CloudUpload, Sparkles, Cpu, Clapperboard, Globe, Trash2 } from 'lucide-react';
import { Message } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useProjects } from '../../contexts/ProjectContext';
import { useTTS } from '../../hooks/useTTS';
import { MediaAttachment } from './MediaAttachment';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  onDelete: (id: string) => void;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ 
  message, 
  isLast,
  onDelete
}) => {
  const { theme } = useTheme();
  const { activeProject, activeBranch, saveBranch } = useProjects();
  const { play, stop, activeMessageId, isPlaying } = useTTS();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isProcess = message.type === 'process';
  const isResult = message.type === 'result'; 
  const projectColor = activeProject?.config.themeColor || '#6366f1';
  const isMePlaying = activeMessageId === message.id && isPlaying;

  const mediaDisplayMatch = message.content.match(/\[MEDIA_DISPLAY:\s*({[^\]]+})\s*\]/);
  let parsedMedia = null;
  if (mediaDisplayMatch) {
    try {
      parsedMedia = JSON.parse(mediaDisplayMatch[1]);
    } catch (e) {
      console.warn("Neural Protocol Error: Failed to parse MEDIA_DISPLAY block", e);
    }
  }

  const handleSaveToVault = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving || !activeBranch) return;
    setIsSaving(true);
    try {
      await saveBranch(activeBranch.messages);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error("Manual message sync failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const displayContent = message.content
    .replace(/\[MEDIA_DISPLAY:\s*{[^\]]+}\s*\]/g, '')
    .replace(/\[SYSTEM_TOOL_CALL:\s*{[^\]]+}\s*\]/g, '')
    .replace(/\[SYSTEM_TOOL_RESULT:\s*.*?\s*\]/g, '')
    .replace(/\[SYSTEM_TOOL_ERROR:\s*.*?\s*\]/g, '')
    .replace(/\[SYSTEM_PROTOCOL: CREATIVE_MODE_ACTIVE\]/g, '')
    .replace(/\[SYSTEM_PROTOCOL: DEEP_THINK_ACTIVE\]/g, '')
    .replace(/^(Action|Thought|Executing|Result):.*$/gmi, '') 
    .replace(/^I will now.*$/gmi, '') 
    .replace(/^I'll use the.*tool.*$/gmi, '')
    .trim();

  if (message.role === 'assistant' && message.content.includes('video') && !displayContent && !parsedMedia) {
     return (
        <div className="flex flex-col items-center my-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl">
                <Clapperboard className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-black">Neural Production</span>
                    <span className="text-xs text-slate-400">Synthesizing Scene...</span>
                </div>
            </div>
        </div>
     );
  }

  if (message.role === 'assistant' && !displayContent && !parsedMedia && !message.attachment && !message.base64Attachment) {
    return (
      <div className="flex flex-col items-center my-2 gap-2 opacity-50">
        <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl text-[9px] font-mono uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 border-zinc-200 dark:border-zinc-700/50">
           <Cpu size={10} className="animate-pulse" />
           <span>Neural Flow State</span>
        </div>
      </div>
    );
  }

  if (isSystem || isProcess || (message.role === 'assistant' && !displayContent && parsedMedia)) {
    return (
      <div className="flex flex-col items-center my-4 gap-2">
        {displayContent && (
          <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl text-[10px] font-mono uppercase tracking-[0.15em] shadow-sm backdrop-blur-md transition-all ${
            isProcess 
              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-in slide-in-from-left-2' 
              : theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60 text-slate-500' : 'bg-slate-200/50 border-slate-300/60 text-slate-600'
          }`}>
            {isProcess && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>}
            {displayContent}
          </div>
        )}
        {parsedMedia && (
          <MediaAttachment 
            fileId={parsedMedia.id} 
            mimeType={parsedMedia.type} 
            fileName={parsedMedia.name || 'Neural Asset'} 
          />
        )}
      </div>
    );
  }

  if (!displayContent && !parsedMedia && !message.attachment && !message.base64Attachment) return null;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 group/msg`}>
      <div 
        className={`relative max-w-[90%] md:max-w-[75%] px-4 py-3 sm:px-5 sm:py-4 rounded-[1.25rem] sm:rounded-[1.5rem] shadow-xl transition-all ${
          isUser 
            ? 'text-white rounded-tr-none shadow-black/10' 
            : `${theme === 'dark' ? 'bg-slate-900/90 border-slate-800/80 text-slate-200 shadow-black/40' : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/40'} border rounded-tl-none backdrop-blur-md ${isResult ? 'border-teal-500/30' : ''}`
        }`}
        style={isUser ? { backgroundColor: projectColor } : {}}
      >
        {!isUser && (
          <div className="flex items-center justify-between mb-2 sm:mb-3">
             <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                   <Sparkles size={10} className={`animate-pulse ${isResult ? 'text-teal-500' : ''} sm:w-3 sm:h-3`} style={!isResult ? { color: projectColor } : {}} />
                   <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-90" style={{ color: isResult ? '#14b8a6' : projectColor }}>
                     {isResult ? 'Verified Intelligence' : 'Neural Core'}
                   </div>
                </div>

                {isResult && (
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full animate-in fade-in slide-in-from-left-2">
                      <Globe size={8} className="text-teal-500 animate-pulse sm:w-[10px] sm:h-[10px]" />
                      <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-teal-600 dark:text-teal-400">Web Search</span>
                   </div>
                )}
             </div>
          </div>
        )}
        
        {/* Render Base64 Vision Attachment if present */}
        {message.base64Attachment && (
          <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-lg bg-zinc-950/50">
             <img 
               src={message.base64Attachment} 
               alt="Vision Attachment" 
               className="w-full max-h-[250px] sm:max-h-[350px] object-cover" 
             />
             <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-black/40 backdrop-blur-sm text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 border-t border-white/5">
                Neural Vision Input
             </div>
          </div>
        )}

        <div className={`prose prose-sm max-w-none prose-headings:text-inherit prose-a:text-inherit prose-code:text-inherit ${isUser ? 'prose-invert' : theme === 'dark' ? 'prose-invert' : 'prose-slate'} prose-a:text-indigo-400 prose-a:font-bold hover:prose-a:text-indigo-300 transition-colors text-xs sm:text-sm`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
        </div>

        {message.attachment && <MediaAttachment fileId={message.attachment.id} mimeType={message.attachment.mimeType} fileName={message.attachment.name} />}
        {parsedMedia && <MediaAttachment fileId={parsedMedia.id} mimeType={parsedMedia.type} fileName={parsedMedia.name || 'Generated Asset'} />}

        <div className={`text-[8px] sm:text-[9px] mt-3 sm:mt-4 opacity-30 font-mono flex items-center gap-2 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="uppercase tracking-widest">{isUser ? 'Sovereign' : 'Neural'}</span>
            <span>•</span>
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            {!isUser && (
              <button 
                onClick={handleSaveToVault}
                className={`p-1 rounded-lg transition-all hover:opacity-100 ${isSaved ? 'text-green-500 opacity-100' : 'hover:bg-zinc-100 dark:hover:bg-white/10 opacity-30'} ${isSaving ? 'animate-pulse' : ''}`}
                title="Save to Vault"
              >
                {isSaved ? <Check size={12} strokeWidth={3} className="sm:w-3.5 sm:h-3.5" /> : <CloudUpload size={12} strokeWidth={2.5} className="sm:w-3.5 sm:h-3.5" />}
              </button>
            )}
            
            {!isSystem && !isProcess && displayContent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isMePlaying ? stop() : play(message.content, message.id);
                }}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors ml-1 text-gray-500"
                title={isMePlaying ? "Stop Reading" : "Read Aloud"}
              >
                {isMePlaying ? (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-indigo-500 rounded-sm animate-pulse" />
                ) : (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            )}

            {!isSystem && !isProcess && (
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this note permanently?")) {
                        onDelete(message.id);
                    }
                }}
                className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors ml-1"
                title="Delete Note"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        <div 
          className={`absolute top-0 ${isUser ? 'right-0 -mr-0.5' : 'left-0 -ml-0.5'} w-2.5 h-2.5 sm:w-3 sm:h-3 rotate-45 transition-colors duration-300`}
          style={isUser ? { backgroundColor: projectColor } : { backgroundColor: theme === 'dark' ? (isResult ? '#0d2d2a' : '#1e293b') : '#e2e8f0' }}
        ></div>
      </div>
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
