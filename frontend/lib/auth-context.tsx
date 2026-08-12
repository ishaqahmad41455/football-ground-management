'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from './api';

type Role = 'team' | 'admin' | null;

interface Team {
  id: number;
  name: string;
  sportId: number;
  logo: string | null;
  city: string;
  status: string;
  rating: number;
  [key: string]: any;
}

interface AuthState {
  role: Role;
  team: Team | null;
  name: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Role>;
  registerTeam: (payload: any) => Promise<void>;
  logout: () => void;
  refreshTeam: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sportshub_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api<any>('/auth/me');
      setRole(me.role);
      setTeam(me.team);
      setName(me.name);
    } catch {
      localStorage.removeItem('sportshub_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<any>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    localStorage.setItem('sportshub_token', res.token);
    setRole(res.role);
    setTeam(res.team);
    setName(res.name);
    return res.role as Role;
  }, []);

  const registerTeam = useCallback(async (payload: any) => {
    const res = await api<any>('/auth/register', { method: 'POST', body: payload, auth: false });
    localStorage.setItem('sportshub_token', res.token);
    setRole('team');
    setTeam(res.team);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sportshub_token');
    setRole(null);
    setTeam(null);
    setName(null);
  }, []);

  const refreshTeam = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  return (
    <AuthContext.Provider value={{ role, team, name, loading, login, registerTeam, logout, refreshTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
