
import React, { useState, useEffect, useCallback } from 'react';
import { DriveService } from '../../lib/drive/driveService';
import { DriveItem } from '../../types';
import { Folder, File, FileCode, FileText, Image, ArrowLeft, ChevronRight } from 'lucide-react';

interface FolderBrowserProps {
  onSelect: (folderId: string, folderName: string) => void;
  initialFolderId?: string;
}

interface PathSegment {
  id: string;
  name: string;
}

export const FolderBrowser: React.FC<FolderBrowserProps> = ({ onSelect, initialFolderId = 'root' }) => {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState(initialFolderId);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [path, setPath] = useState<PathSegment[]>([{ id: 'root', name: 'My Drive' }]);
  const [loading, setLoading] = useState(false);
  const driveService = DriveService.getInstance();

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const contents = await driveService.listContents(folderId);
      setItems(contents);

      if (folderId === 'root') {
        setPath([{ id: 'root', name: 'My Drive' }]);
      } else {
        const meta = await driveService.getFileMetadata(folderId);
        setPath(prev => {
          const idx = prev.findIndex(p => p.id === folderId);
          if (idx !== -1) return prev.slice(0, idx + 1);
          return [...prev, { id: folderId, name: meta.name }];
        });
      }
    } catch (err) {
      console.error("Folder Browser Error:", err);
    } finally {
      setLoading(false);
    }
  }, [driveService]);

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId, loadFolder]);

  const handleGoBack = () => {
    if (path.length > 1) {
      const parentSegment = path[path.length - 2];
      setCurrentFolderId(parentSegment.id);
    }
  };

  const handleBreadcrumbClick = (id: string) => {
    setCurrentFolderId(id);
  };

  const handleItemClick = (item: DriveItem) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      setCurrentFolderId(item.id);
      setSelectedFileId(null);
    } else {
      setSelectedFileId(item.id);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder size={20} />;
    }
    if (mimeType.startsWith('image/')) {
      return <Image size={20} />;
    }
    if (mimeType === 'application/json' || mimeType.includes('javascript') || mimeType.includes('typescript')) {
      return <FileCode size={20} />;
    }
    return <FileText size={20} />;
  };

  const currentFolderName = path[path.length - 1]?.name || 'Unknown';

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
      <div className="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar backdrop-blur-md">
        <button 
          onClick={handleGoBack}
          disabled={path.length <= 1}
          className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors mr-2"
        >
          <ArrowLeft size={16} />
        </button>
        {path.map((p, idx) => (
          <React.Fragment key={p.id}>
            {idx > 0 && <span className="text-zinc-700 text-xs">/</span>}
            <button 
              onClick={() => handleBreadcrumbClick(p.id)}
              className={`text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors ${idx === path.length - 1 ? 'text-indigo-400 font-black' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {p.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-zinc-950/40">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
             <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full"></div>
                <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
             </div>
             <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] animate-pulse">Scanning Neural Vault...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-40">
             <Folder size={48} className="mb-4 text-zinc-600" />
             <p className="text-zinc-500 text-xs italic">Empty workspace sector.</p>
          </div>
        ) : (
          items.map(item => {
            const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
            const isSelected = selectedFileId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl group transition-all border ${isSelected ? 'bg-indigo-600/20 border-indigo-500/50 shadow-indigo-500/10' : 'bg-transparent border-transparent hover:bg-zinc-900 hover:border-zinc-800'}`}
              >
                <div className={`p-2.5 rounded-xl transition-all transform group-hover:rotate-12 ${isFolder ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                  {getFileIcon(item.mimeType)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-zinc-100 group-hover:text-white'}`}>{item.name}</p>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter group-hover:text-zinc-400">{item.mimeType.split('/').pop()} • {item.id.substring(0, 8)}</p>
                </div>
                {isFolder && (
                  <ChevronRight size={16} className="text-zinc-800 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all" />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="p-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between backdrop-blur-xl">
         <div className="min-w-0 pr-4">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Select Project Root</p>
            <p className="text-white text-sm font-bold truncate italic">{currentFolderName}</p>
         </div>
         <button 
           onClick={() => onSelect(currentFolderId, currentFolderName)}
           disabled={loading}
           className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
         >
           Commit Mount
         </button>
      </div>
    </div>
  );
};
