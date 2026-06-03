import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
const AuthContext = createContext(null);

const STORAGE_KEY = 'attendance_app_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistLocal = useCallback((nextUser, nextCreds) => {
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, credentials: nextCreds }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        if (window.electronAPI?.getSession) {
          const session = await window.electronAPI.getSession();
          if (session?.user) {
            setUser(session.user);
            setCredentials({ username: session.username, password: session.password });
            setLoading(false);
            return;
          }
        }
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed.user);
          setCredentials(parsed.credentials);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const login = useCallback(async (username, passwordEncoded, userData) => {
    setUser(userData);
    setCredentials({ username, password: passwordEncoded });
    persistLocal(userData, { username, password: passwordEncoded });

    if (window.electronAPI?.setSession) {
      await window.electronAPI.setSession({
        username,
        password: passwordEncoded,
        user: userData,
      });
    }
  }, [persistLocal]);

  const logout = useCallback(async () => {
    setUser(null);
    setCredentials(null);
    persistLocal(null, null);
    if (window.electronAPI?.clearSession) {
      await window.electronAPI.clearSession();
    }
  }, [persistLocal]);

  const refreshUser = useCallback(async (userId) => {
    const { fetchUser } = await import('../services/api');
    const data = await fetchUser(userId);
    setUser(data);
    persistLocal(data, credentials);
    if (window.electronAPI?.setSession && credentials) {
      await window.electronAPI.setSession({
        username: credentials.username,
        password: credentials.password,
        user: data,
      });
    }
    return data;
  }, [credentials, persistLocal]);

  return (
    <AuthContext.Provider value={{ user, credentials, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
