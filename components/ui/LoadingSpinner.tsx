import React from 'react';
import { Loader2 } from 'lucide-react';

// Fix: Added size prop to allow custom icon dimensions and resolve type errors across the application
export const LoadingSpinner = ({ className, label, size = 16 }: { className?: string, label?: string, size?: number }) => (
    <div className={`flex items-center gap-2 text-zinc-400 ${className}`}>
        <Loader2 size={size} className="animate-spin text-indigo-500" />
        {label && <span className="text-[10px] font-mono tracking-widest uppercase font-black animate-pulse">{label}</span>}
    </div>
);