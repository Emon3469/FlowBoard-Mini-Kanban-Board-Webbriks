'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ApiUser, authApi, loadAccessToken, loadCurrentUser, setAccessToken, setCurrentUser } from './api';
import { disconnectSocket } from './socket';

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = loadAccessToken();
    const storedUser = loadCurrentUser();
    if (storedToken && storedUser) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    setAccessToken(result.data.accessToken);
    setCurrentUser(result.data.user);
    setToken(result.data.accessToken);
    setUser(result.data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.register({ name, email, password });
    setAccessToken(result.data.accessToken);
    setCurrentUser(result.data.user);
    setToken(result.data.accessToken);
    setUser(result.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    setAccessToken(null);
    setCurrentUser(null);
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
