import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AuthState } from '../types';
import { DriveService } from '../lib/drive/driveService';
import { config } from '../config';

// Global declaration for gapi
declare const window: any;

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'ideaflow_auth_state';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          isLoggedIn: true,
          user: parsed.user,
          token: parsed.token,
        };
      } catch (e) {
        console.error("Failed to parse saved auth state", e);
      }
    }
    return {
      isLoggedIn: false,
      user: null,
      token: null,
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driveService = DriveService.getInstance();

  // On mount, if we have a token, ensure DriveService is aware of it
  useEffect(() => {
    if (authState.token) {
      driveService.initializeDrive().then(() => {
        driveService.setToken({ access_token: authState.token });
      });
    }
  }, []);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await driveService.loginUser(config.googleClientId);
      
      let accessToken = null;
      if (typeof window.gapi !== 'undefined' && window.gapi?.client?.getToken) {
        const tokenResponse = window.gapi.client.getToken();
        accessToken = tokenResponse?.access_token || null;
      }
      
      const newState = {
        isLoggedIn: true,
        user,
        token: accessToken,
      };
      
      setAuthState(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token: accessToken }));
      
    } catch (err: any) {
      console.error("AuthContext: Login failed", err);
      if (err.message === "SESSION_EXPIRED_USER_ACTION_REQUIRED" || err.message === "AUTH_DEAD") {
        setError("Neural Link Severed. Please re-authenticate with Google Drive to resume vault synchronization.");
      } else {
        setError(err.message || "Failed to authenticate with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthState({ isLoggedIn: false, user: null, token: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
