
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login, isLoading, error } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-block">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-40 animate-pulse"></div>
          <div className="relative bg-zinc-900 rounded-full p-6 border border-zinc-800">
            <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">IdeaFlow <span className="text-indigo-500">3.0</span></h1>
          <p className="text-zinc-400 text-lg">Your Sovereign Neural Knowledge OS.</p>
        </div>

        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-6">
          <div className="text-left space-y-4">
            <FeatureItem icon="🔒" title="Full Sovereignty" description="All data lives in your personal Google Drive. No third-party databases." />
            <FeatureItem icon="🧠" title="Context-Aware AI" description="Deep reasoning with Gemini 3 Pro across your entire knowledge graph." />
            <FeatureItem icon="🎙️" title="Hands-free Flow" description="Seamlessly switch between voice and text modes." />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={login}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 hover:bg-zinc-200 transition-all py-3 px-6 rounded-xl font-semibold shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                Connecting...
              </>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Connect with Google Drive
              </>
            )}
          </button>
        </div>

        <p className="text-zinc-500 text-sm">
          IdeaFlow only requests access to files it creates.<br />
          Your existing Drive files remain private.
        </p>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex gap-4">
    <span className="text-2xl">{icon}</span>
    <div>
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      <p className="text-zinc-500 text-sm">{description}</p>
    </div>
  </div>
);
