'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/auth';
const Context = createContext<{ user: SessionUser | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> }>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refresh = useCallback(async () => {
    try { const r = await fetch('/api/auth/me', { cache: 'no-store' }); const data = await r.json(); setUser(r.ok ? data.user : null); }
    catch { setUser(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) return;
    setUser(null); router.refresh();
  }
  return <Context.Provider value={{ user, loading, refresh, logout }}>{children}</Context.Provider>;
}
export function useAuth() { return useContext(Context); }
export function LoginRequired() {
  return <div className="p-6 rounded-2xl bg-slate-900 border border-slate-700 space-y-3"><h1 className="text-xl font-bold">Log in to continue</h1><p className="text-slate-400">Research discovery remains public. Project and library changes require an account.</p><Link className="text-cyan-400 underline" href="/login">Log in</Link></div>;
}
