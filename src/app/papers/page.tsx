'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Sparkles, ExternalLink, Trash2, BookmarkCheck, ArrowRight } from 'lucide-react';

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

  async function handleDelete(paperId: number, title: string) {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${title}" from your library?\n\nThis will remove the paper, its author mappings, and associated vector embeddings from the database.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/papers/${paperId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ message: 'Paper deleted successfully from your library.', type: 'success' });
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-xs font-medium mb-2">
            <BookmarkCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Academic Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Saved Academic Literature
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Peer-reviewed papers saved from OpenAlex and indexed into PostgreSQL with dense semantic embeddings.
          </p>
        </div>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-600/20 self-start sm:self-auto"
        >
          <Search className="h-4 w-4" />
          <span>Discover Papers</span>
        </Link>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved papers by title, abstract keywords, or author names..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No saved papers found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Use the Literature Explorer to search millions of peer-reviewed articles and save relevant citations here.
          </p>
          <div className="mt-4">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              <span>Explore OpenAlex Papers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {papers.map((paper) => {
            const authorList = Array.isArray(paper.authors) ? paper.authors : [];
            const authorNames = authorList.map((a: any) => a.name).join(', ');

            return (
              <div
                key={paper.paper_id}
                className="p-6 rounded-2xl bg-slate-900/70 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700/80">
                        {paper.year || 'Published'}
                      </span>
                      <span className="truncate max-w-[200px] text-cyan-300 font-medium">
                        {paper.published_in || 'Academic Venue'}
                      </span>
                    </div>
                    {paper.is_embedded && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                        Indexed
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-2 leading-snug pt-1">
                    {paper.title}
                  </h3>

                  {authorNames && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      <span className="text-slate-500 font-medium">Authors:</span> {authorNames}
                    </p>
                  )}

                  <p className="text-xs sm:text-sm text-slate-400 pt-1 line-clamp-3 leading-relaxed">
                    {paper.abstract || 'No abstract stored for this record.'}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {paper.doi && (
                      <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>DOI</span>
                      </a>
                    )}
                    {paper.file_url && (
                      <a
                        href={paper.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Source</span>
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(paper.paper_id, paper.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Paper"
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
