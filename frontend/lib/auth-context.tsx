'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from './api';

export type Role = 'team' | 'admin' | 'ground_owner' | null;

interface Team {
  id: number;
  name: string;
  sportId: number;
  venueId: number;
  logo: string | null;
  city: string;
  status: string;
  rating: number;
  [key: string]: any;
}

interface Venue {
  id: number;
  name: string;
  city: string;
  ownerId: number | null;
  [key: string]: any;
}

interface AuthState {
  role: Role;
  team: Team | null;
  venues: Venue[]; // populated only when role === 'ground_owner'
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
  const [venues, setVenues] = useState<Venue[]>([]);
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
      setVenues(me.venues || []);
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
    setVenues(res.venues || []);
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
    setVenues([]);
    setName(null);
  }, []);

  const refreshTeam = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  return (
    <AuthContext.Provider value={{ role, team, venues, name, loading, login, registerTeam, logout, refreshTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
