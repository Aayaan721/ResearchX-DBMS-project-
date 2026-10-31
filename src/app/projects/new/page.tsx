'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<number[]>([]);
  
  const [domains, setDomains] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  useEffect(() => {
    // Load domains and demo students
    Promise.all([
      fetch('/api/domains').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ])
      .then(([domainsData, usersData]) => {
        setDomains(domainsData.domains || []);
        const stdList = usersData.students || [];
        setStudents(stdList);
        if (stdList.length > 0) {
          setStudentId(String(stdList[0].user_id));
        }
      })
      .catch((err) => console.error('Failed to load form options:', err));
  }, []);

  function handleDomainToggle(domainId: number) {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!title.trim()) throw new Error('Please enter a project title');
      if (!problemStatement.trim()) throw new Error('Please enter a problem statement');
      if (!studentId) throw new Error('Please select a student owner');

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          problem_statement: problemStatement,
          description,
          student_id: parseInt(studentId, 10),
          domain_ids: selectedDomains,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit project');
      }

      setSuccessInfo(data);
      setTimeout(() => {
        router.push(`/projects/${data.project.project_id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Submission error');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb / Back button */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects Directory
      </Link>

      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-700/60 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Submit Research Project</h1>
            <p className="text-xs text-slate-400">
              Proposals are stored in PostgreSQL and automatically indexed into 384-d pgvector embeddings
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {successInfo && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 mb-6">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold">Project created successfully in PostgreSQL!</p>
              <p className="text-xs text-emerald-400/80">
                Vector Index Status:{' '}
                <span className="font-mono font-bold uppercase">{successInfo.embeddingStatus}</span> (MiniLM 384-d). Redirecting...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Project Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Adaptive Indexing for High-Dimensional Vector Search"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>

          {/* Student Owner Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Student / Project Lead <span className="text-rose-400">*</span>
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {students.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.full_name} ({s.username}) — {s.email}
                </option>
              ))}
            </select>
          </div>

          {/* Research Domains Checkbox Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Research Domains (Select all that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {domains.map((d) => {
                const isSelected = selectedDomains.includes(d.domain_id);
                return (
                  <button
                    type="button"
                    key={d.domain_id}
                    onClick={() => handleDomainToggle(d.domain_id)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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

          {/* Problem Statement */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Problem Statement <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="What core limitation or research gap does this project tackle?"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>

          {/* Detailed Description / Abstract */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Technical Description / Abstract (Optional)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail your proposed system architecture, database design, and evaluation methodology..."
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>

          {/* Vector Indexing Notification */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
            <Sparkles className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-200 font-semibold block">Automatic Semantic Indexing:</span>
              On submission, the title and problem statement will pass through the local{' '}
              <code className="text-cyan-400 font-mono">Xenova/all-MiniLM-L6-v2</code> transformer model to generate a 384-dimensional vector stored in{' '}
              <code className="text-cyan-400 font-mono">embedding_ref</code>.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              href="/projects"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Generating Embeddings & Saving...
                </>
              ) : (
                'Submit Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
