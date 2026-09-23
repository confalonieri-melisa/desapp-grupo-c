'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthenticatedUser } from '@/services/auth.service';
import {
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
} from '@/services/client/auth-storage';

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (token: string, user: AuthenticatedUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      const storedAuth = getStoredAuth();

      if (isMounted && storedAuth) {
        setToken(storedAuth.token);
        setUser(storedAuth.user);
      }

      if (isMounted) {
        setIsHydrated(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (newToken: string, newUser: AuthenticatedUser) => {
    setToken(newToken);
    setUser(newUser);
    saveStoredAuth(newToken, newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isHydrated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
