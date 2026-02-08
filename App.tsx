
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TTSProvider } from './contexts/TTSContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

/**
 * IdeaFlow 3.0: Core View Orchestrator.
 * Dynamically switches between Authentication and the Main OS Layout based on session state.
 */
const AppContent: React.FC = () => {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();

  if (authLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
            <LoadingSpinner size={48} className="relative" />
          </div>
          <div className="space-y-1 text-center">
            <p className={`font-black uppercase tracking-[0.4em] text-[10px] animate-pulse ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Neural OS Initializing
            </p>
            <p className={`font-medium text-xs opacity-50 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Establishing Sovereign Vault Handshake...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-slate-900'}`}>
      {isLoggedIn ? <MainLayout /> : <LoginScreen />}
    </div>
  );
};

/**
 * IdeaFlow 3.0: Sovereign Neural Knowledge OS Bootstrapper.
 * Hierarchical Context Architecture:
 * 1. AuthProvider: Identity & OAuth session management.
 * 2. ThemeProvider: UI/UX visual matrix.
 * 3. ProjectProvider: Knowledge graph and Drive persistence.
 * 4. TTSProvider: Neural voice synthesis & vocal flow synchronization.
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProjectProvider>
          <TTSProvider>
            <AppContent />
          </TTSProvider>
        </ProjectProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
