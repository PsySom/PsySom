import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';

const AppContent: React.FC = () => {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();

  if (authLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className={`absolute inset-0 border-2 ${theme === 'dark' ? 'border-indigo-500/20' : 'border-indigo-500/10'} rounded-full`}></div>
            <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
          </div>
          <div className="space-y-1 text-center">
            <p className={`font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Neural OS</p>
            <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Initializing IdeaFlow 3.0</p>
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ProjectProvider>
          <AppContent />
        </ProjectProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;