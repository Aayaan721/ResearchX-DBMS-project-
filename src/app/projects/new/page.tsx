'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, ArrowLeft, CheckCircle2, AlertCircle, FileText, UserCheck, Layers } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<number[]>([]);
  
  const [domains, setDomains] = useState<Array<{ domain_id: number; domain_name: string }>>([]);
  const [students, setStudents] = useState<Array<{ user_id: number; full_name: string; username: string; email: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  useEffect(() => {
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
      if (title.trim().length > 255) throw new Error('Title must not exceed 255 characters');
      if (!problemStatement.trim()) throw new Error('Please describe the problem statement');
      if (problemStatement.trim().length < 10) throw new Error('Problem statement must be at least 10 characters long');
      if (!studentId) throw new Error('Please select a student author');

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
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Submission error');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects Directory
      </Link>

      <div className="p-6 sm:p-10 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="h-10 w-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-md">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Submit Research Proposal</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Enter your project details to index it for semantic matching and faculty review.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold">Project proposal submitted successfully!</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                Indexed for semantic similarity matching. Redirecting to project page...
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <FileText className="h-4 w-4" />
              <span>Project Details</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Adaptive Indexing for High-Dimensional Vector Search"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Problem Statement <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="What core limitation, inefficiency, or research question does your project tackle?"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Proposed Architecture & Methodology (Optional)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail your proposed system architecture, database design, algorithms, or experimental datasets..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Section 2: Contributor & Classification */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <UserCheck className="h-4 w-4" />
              <span>Author & Categorization</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Student Lead / Contributor <span className="text-rose-400">*</span>
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {students.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} ({s.username}) — {s.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Research Fields (Select all that apply)
              </label>
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
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              * Required fields. All submissions are saved to the database.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Submitting Proposal...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Submit Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
