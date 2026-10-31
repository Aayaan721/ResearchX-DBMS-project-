'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const projectId = params.id;

  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<number[]>([]);
  const [domains, setDomains] = useState<Array<{ domain_id: number; domain_name: string }>>([]);
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
    return <div className="p-12 text-center text-slate-400">Loading project data for editing...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Cancel and Return to Details
      </Link>

      <div className="p-6 sm:p-10 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Edit Project #{projectId}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Updating the title or problem statement re-indexes its semantic embeddings in PostgreSQL atomically.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Problem Statement</label>
            <textarea
              required
              rows={3}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Proposed Architecture &amp; Methodology</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Research Fields</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {domains.map((d) => {
                const isSelected = selectedDomains.includes(d.domain_id);
                return (
                  <button
                    type="button"
                    key={d.domain_id}
                    onClick={() => handleDomainToggle(d.domain_id)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{d.domain_name}</span>
                    <span
                      className={`h-4 w-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'border border-slate-700'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
