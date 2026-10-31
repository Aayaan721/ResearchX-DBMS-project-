'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Sparkles, ExternalLink, Trash2 } from 'lucide-react';

export default function SavedPapersPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function loadPapers() {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await fetch(`/api/papers${q}`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data.papers || []);
      }
    } catch (err) {
      console.error('Failed to load saved papers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPapers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDelete(paperId: number) {
    if (!confirm(`Remove paper #${paperId} from PostgreSQL database?`)) return;

    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ message: 'Paper deleted successfully.', type: 'success' });
        setPapers((prev) => prev.filter((p) => p.paper_id !== paperId));
      } else {
        const err = await res.json();
        setNotification({ message: err.error || 'Delete failed', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    }
    setTimeout(() => setNotification(null), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-cyan-400" />
            Saved Academic Papers Repository
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Peer-reviewed research works persisted in PostgreSQL and indexed with pgvector dense embeddings
          </p>
        </div>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-md self-start sm:self-auto"
        >
          <Search className="h-4 w-4" />
          Discover More on OpenAlex
        </Link>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Search Input */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/60">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved papers by title, abstract keywords, or author names..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel h-52 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800">
          <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No saved research papers found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Explore OpenAlex to find academic literature and save papers directly into your PostgreSQL database.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 transition-colors"
          >
            Go to OpenAlex Discovery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {papers.map((p) => {
            const authorsList = (p.authors || []).map((a: any) => a.name).join(', ');
            const doiUrl = p.doi ? (p.doi.startsWith('http') ? p.doi : `https://doi.org/${p.doi}`) : null;

            return (
              <div
                key={p.paper_id}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-slate-700/60"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {p.year || 'N/A'}
                      </span>
                      <span className="text-cyan-300 font-medium truncate max-w-[200px]">
                        {p.published_in || 'Academic Venue'}
                      </span>
                    </div>
                    {p.is_embedded && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Sparkles className="h-3 w-3" /> 384-d pgvector
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug line-clamp-2 mt-1">
                    {p.title}
                  </h3>

                  {authorsList && (
                    <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                      By {authorsList}
                    </p>
                  )}

                  <p className="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                    {p.abstract || 'No abstract text stored.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {doiUrl && (
                      <a
                        href={doiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> DOI Link
                      </a>
                    )}
                    {p.file_url && (
                      <a
                        href={p.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        PDF
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(p.paper_id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove paper"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
