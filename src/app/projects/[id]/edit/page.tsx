'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Sparkles, AlertCircle } from 'lucide-react';

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const projectId = params.id;

  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<number[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch('/api/domains').then((r) => r.json()),
    ])
      .then(([projData, domainsData]) => {
        if (projData.project) {
          setTitle(projData.project.title || '');
          setProblemStatement(projData.project.problem_statement || '');
          setDescription(projData.project.description || '');
          const dIds = (projData.project.domains || []).map((d: any) => d.domain_id);
          setSelectedDomains(dIds);
        }
        setDomains(domainsData.domains || []);
      })
      .catch((err) => console.error('Failed to load project for editing:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  function handleDomainToggle(domainId: number) {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    );
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          problem_statement: problemStatement,
          description,
          domain_ids: selectedDomains,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update project');

      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.message || 'Update failed');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="glass-panel p-12 rounded-2xl animate-pulse text-center">Loading project data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Cancel and Return to Details
      </Link>

      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-700/60">
        <h1 className="text-2xl font-bold text-white mb-1">Edit Project #{projectId}</h1>
        <p className="text-xs text-slate-400 mb-6">
          Updating the title or problem statement will automatically trigger re-indexing of the 384-d pgvector embedding.
        </p>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Domains</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {domains.map((d) => {
                const isSelected = selectedDomains.includes(d.domain_id);
                return (
                  <button
                    type="button"
                    key={d.domain_id}
                    onClick={() => handleDomainToggle(d.domain_id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{d.domain_name}</span>
                    <span>{isSelected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Problem Statement</label>
            <textarea
              required
              rows={3}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Link href={`/projects/${projectId}`} className="px-4 py-2 text-xs font-semibold text-slate-400">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" /> Updating & Re-embedding...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
