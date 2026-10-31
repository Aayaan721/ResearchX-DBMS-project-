'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  User, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Activity,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import SimilarityScoreBadge from '@/components/SimilarityScoreBadge';

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<any[]>([]);
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingSimilarity, setSearchingSimilarity] = useState(false);

  // Review form states
  const [facultyId, setFacultyId] = useState('');
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | 'Changes Required'>('Approved');
  const [reviewComments, setReviewComments] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, usersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch('/api/users'),
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          setProject(projData.project);
          setReviews(projData.reviews || []);
          setAuditHistory(projData.auditHistory || []);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const facList = usersData.faculty || [];
          setFacultyUsers(facList);
          if (facList.length > 0) setFacultyId(String(facList[0].user_id));
        }
      } catch (err) {
        console.error('Failed to load project details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReview(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: parseInt(facultyId, 10),
          decision,
          comments: reviewComments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      setFeedback({ message: data.message, type: 'success' });
      // Refresh project & reviews & audit
      const updatedRes = await fetch(`/api/projects/${projectId}`);
      if (updatedRes.ok) {
        const updated = await updatedRes.json();
        setProject(updated.project);
        setReviews(updated.reviews);
        setAuditHistory(updated.auditHistory);
      }
      setReviewComments('');
    } catch (err: any) {
      setFeedback({ message: err.message || 'Review procedure failed', type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  }

  async function findSimilar() {
    setSearchingSimilarity(true);
    try {
      const res = await fetch('/api/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: parseInt(projectId, 10), limit: 5 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimilarItems(data.matches || []);
      }
    } catch (err) {
      console.error('Similarity search error:', err);
    } finally {
      setSearchingSimilarity(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this project? This will permanently remove its database rows and trigger audit logging.')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/projects');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  if (loading) {
    return <div className="glass-panel p-12 rounded-2xl animate-pulse text-center">Loading project data from PostgreSQL...</div>;
  }

  if (!project) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center">
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <Link href="/projects" className="text-cyan-400 mt-2 inline-block">Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects Directory
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit Project
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Main Project Dossier */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-700/60 relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              project.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              project.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {project.status === 'Approved' ? <CheckCircle2 className="h-4 w-4" /> :
               project.status === 'Rejected' ? <XCircle className="h-4 w-4" /> :
               <Clock className="h-4 w-4" />}
              {project.status}
            </span>

            {project.is_embedded && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                pgvector 384-d Indexed
              </span>
            )}
          </div>

          <span className="text-xs font-mono text-slate-500">Project #{project.project_id}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
          {project.title}
        </h1>

        {/* Domains */}
        {project.domains && project.domains.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {project.domains.map((d: any) => (
              <span
                key={d.domain_id}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 font-medium"
              >
                {d.domain_name}
              </span>
            ))}
          </div>
        )}

        {/* Student & Date metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block uppercase font-mono text-[10px]">Student Lead</span>
            <span className="font-semibold text-white mt-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-cyan-400" />
              {project.student_name}
            </span>
            <span className="text-slate-500 text-[11px] block">{project.student_email}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-mono text-[10px]">Submission Date</span>
            <span className="font-semibold text-white mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-mono text-[10px]">Faculty Approver</span>
            <span className="font-semibold text-white mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              {project.reviewer_name || 'Pending Faculty Assignment'}
            </span>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Problem Statement</h3>
          <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            {project.problem_statement}
          </p>
        </div>

        {/* Abstract/Description */}
        {project.description && (
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Detailed Abstract & Methodology</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              {project.description}
            </p>
          </div>
        )}

        {/* 1-Click Semantic Similarity Action */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Discover Similar Projects & Literature
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare this project vector against all locally stored projects and OpenAlex papers via pgvector.
            </p>
          </div>
          <button
            onClick={findSimilar}
            disabled={searchingSimilarity}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            {searchingSimilarity ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                Querying pgvector...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Run Similarity Analysis
              </>
            )}
          </button>
        </div>

        {/* Similar Items Results */}
        {similarItems.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Ranked Semantic Matches (Excluding Source #{projectId})
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {similarItems.map((item) => (
                <div
                  key={`${item.entity_type}-${item.entity_id}`}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.entity_type === 'PROJECT'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {item.entity_type === 'PROJECT' ? 'Student Project' : 'Academic Paper'}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.summary}</p>
                  </div>
                  <SimilarityScoreBadge score={item.similarity_score} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Faculty Review & Stored Procedure Execution Panel */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Faculty Approval & Transaction Review</h2>
            <p className="text-xs text-slate-400">
              Executes stored procedure <code className="text-cyan-400 font-mono">CALL sp_review_and_approve_project()</code> with ACID atomicity
            </p>
          </div>
        </div>

        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Faculty Reviewer
              </label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {facultyUsers.map((f) => (
                  <option key={f.user_id} value={f.user_id}>
                    {f.full_name} ({f.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Review Decision
              </label>
              <select
                value={decision}
                onChange={(e: any) => setDecision(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Changes Required">Changes Required</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Evaluation Notes & Feedback
            </label>
            <textarea
              required
              rows={2}
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="Enter faculty critique, novelty evaluation, and next milestone instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {submittingReview ? 'Executing Stored Procedure...' : 'Submit Faculty Review'}
            </button>
          </div>
        </form>

        {/* Past Reviews List */}
        {reviews.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Review History</h3>
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.review_id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{r.faculty_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.decision === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      r.decision === 'Rejected' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {r.decision}
                    </span>
                  </div>
                  <p className="text-slate-300">{r.comments}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    {new Date(r.review_date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Database Audit History for this Record */}
      {auditHistory.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/60">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Project Table Audit History (Trigger Captured)</h3>
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            {auditHistory.map((a) => (
              <div key={a.log_id} className="py-2.5 flex items-start justify-between gap-4">
                <div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    a.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400' :
                    a.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    {a.action}
                  </span>
                  {a.old_values && (
                    <div className="mt-1 font-mono text-[10px] text-slate-400">
                      Old status: {a.old_values.status} → New status: {a.new_values?.status}
                    </div>
                  )}
                </div>
                <span className="text-slate-500 font-mono text-[11px] shrink-0">
                  {new Date(a.changed_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
