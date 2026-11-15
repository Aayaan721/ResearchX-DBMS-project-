'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Login failed');
      setPassword(''); await auth.refresh();
      const next = params.get('next') || '/projects';
      router.push(next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/projects');
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setBusy(false); }
  }
  return <div className="max-w-md mx-auto p-8 rounded-2xl bg-slate-900/80 border border-slate-700 space-y-5">
    <h1 className="text-2xl font-bold">Log in to ResearchX</h1>
    <p className="text-sm text-slate-400">Use your local Student, Faculty or Admin account.</p>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor="username" className="block mb-1 text-sm">Username</label><input id="username" name="username" autoComplete="username" required maxLength={50} value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700" /></div>
      <div><label htmlFor="password" className="block mb-1 text-sm">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700" /></div>
      <button disabled={busy} className="w-full rounded-xl p-3 bg-cyan-600 font-semibold disabled:opacity-50">{busy ? 'Logging in…' : 'Log in'}</button>
    </form>
    <p className="text-xs text-slate-400">Demo passwords are generated privately during setup; no shared password is embedded in this application.</p>
  </div>;
}
export default function LoginPage() { return <Suspense fallback={<p>Loading login…</p>}><LoginForm /></Suspense>; }
