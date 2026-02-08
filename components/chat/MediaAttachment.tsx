
import React, { useState, useEffect } from 'react';
import { DriveService } from '../../lib/drive/driveService';

interface MediaAttachmentProps {
  fileId: string;
  mimeType: string;
  fileName: string;
}

export const MediaAttachment: React.FC<MediaAttachmentProps> = ({ fileId, mimeType, fileName }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let currentUrl: string | null = null;
    let isMounted = true;

    const loadMedia = async () => {
      try {
        setLoading(true);
        const driveService = DriveService.getInstance();
        const blob = await driveService.getFileBlob(fileId);
        
        if (!isMounted) return;

        currentUrl = URL.createObjectURL(blob);
        setUrl(currentUrl);
      } catch (err) {
        console.error("Neural Vault: Media Retrieval Fault", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl flex flex-col items-center justify-center animate-pulse border border-zinc-200 dark:border-zinc-800 my-4 shadow-inner">
         <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
         <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.3em] font-black">Decrypting Asset...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl text-center">
        <p className="text-[10px] text-red-500 font-black font-mono uppercase tracking-widest">Neural Link Disrupted: Asset Inaccessible</p>
      </div>
    );
  }

  if (!url) return null;

  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');

  return (
    <div className="my-4 group relative overflow-hidden rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-950 transition-all hover:scale-[1.01] hover:shadow-indigo-500/10">
      {isImage ? (
        <img src={url} alt={fileName} className="w-full h-auto block" />
      ) : isVideo ? (
        <video controls src={url} className="w-full h-full aspect-video block bg-black" />
      ) : (
        <div className="p-6 flex items-center gap-5">
           <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white truncate italic">{fileName}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter mt-1">{mimeType}</p>
           </div>
           <a 
             href={url} 
             download={fileName} 
             className="p-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-indigo-500 rounded-xl transition-all hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
           >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
           </a>
        </div>
      )}
      
      {isImage && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
           <a href={url} download={fileName} className="p-2.5 bg-black/50 backdrop-blur-md rounded-xl text-white hover:bg-indigo-600 transition-colors shadow-xl">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
           </a>
        </div>
      )}
    </div>
  );
};
