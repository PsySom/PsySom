
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useProjects } from '../../contexts/ProjectContext';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { theme } = useTheme();
  const { activeProject } = useProjects();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isProcess = message.type === 'process';
  const projectColor = activeProject?.config.themeColor || '#6366f1';

  if (isSystem || isProcess) {
    return (
      <div className="flex justify-center my-4">
        <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl text-[10px] font-mono uppercase tracking-[0.15em] shadow-sm backdrop-blur-md transition-all ${
          isProcess 
            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-in slide-in-from-left-2' 
            : theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60 text-slate-500' : 'bg-slate-200/50 border-slate-300/60 text-slate-600'
        }`}>
          {isProcess && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>}
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div 
        className={`relative max-w-[92%] md:max-w-[85%] px-5 py-4 rounded-[1.5rem] shadow-xl transition-all ${
          isUser 
            ? 'text-white rounded-tr-none shadow-black/10' 
            : `${theme === 'dark' ? 'bg-slate-900/90 border-slate-800/80 text-slate-200 shadow-black/40' : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/40'} border rounded-tl-none backdrop-blur-md`
        }`}
        style={isUser ? { backgroundColor: projectColor } : {}}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-3">
             <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: projectColor }}></div>
             <div className="text-[10px] font-black uppercase tracking-widest opacity-90" style={{ color: projectColor }}>
               Neural Reasoning Result
             </div>
          </div>
        )}
        
        <div className={`prose prose-sm max-w-none prose-headings:text-inherit prose-a:text-inherit prose-code:text-inherit ${isUser ? 'prose-invert' : theme === 'dark' ? 'prose-invert' : 'prose-slate'}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        <div className={`text-[9px] mt-4 opacity-30 font-mono flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="uppercase tracking-widest">
            {isUser ? 'Sovereign ID' : 'Neural Core'}
          </span>
          <span>•</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div 
          className={`absolute top-0 ${isUser ? 'right-0 -mr-0.5' : 'left-0 -ml-0.5'} w-3 h-3 rotate-45 transition-colors duration-300`}
          style={isUser ? { backgroundColor: projectColor } : { backgroundColor: theme === 'dark' ? '#1e293b' : '#e2e8f0' }}
        ></div>
      </div>
    </div>
  );
};
