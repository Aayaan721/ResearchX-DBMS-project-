'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Sparkles, BookOpen, AlertCircle, CheckCircle2, Compass } from 'lucide-react';
import PaperCard, { OpenAlexPaperItem } from '@/components/PaperCard';

function DiscoverContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [queryText, setQueryText] = useState(urlQuery);
  const [results, setResults] = useState<OpenAlexPaperItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const suggestedQueries = [
    'pgvector similarity search postgresql',
    'siamese sentence embeddings sbert',
    'dense passage retrieval question answering',
    'hnsw approximate nearest neighbor graph',
    'differential privacy federated learning',
  ];

  async function handleSearch(searchTerm?: string) {
    const q = searchTerm || queryText;
    if (!q || !q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/openalex/search?q=${encodeURIComponent(q.trim())}&limit=8`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search OpenAlex');
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with OpenAlex academic repository');
    } finally {
      setLoading(false);
    }
  }

  // Trigger search on mount or URL change if query param present
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setQueryText(q);
      handleSearch(q);
    } else {
      setQueryText('');
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSavePaper(paper: OpenAlexPaperItem) {
    setSavingId(paper.openalex_id || paper.title);
    setNotification(null);

    try {
      const res = await fetch('/api/openalex/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paper),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save paper');

      setNotification({
        message: data.already_saved
          ? `"${paper.title.slice(0, 50)}..." is already saved in your library.`
          : `Paper "${paper.title.slice(0, 50)}..." successfully saved and indexed into your database!`,
        type: 'success',
      });

      // Update paper item locally to mark as saved
      setResults((prev) =>
        prev.map((p) =>
          p.openalex_id === paper.openalex_id || p.title === paper.title ? { ...p, is_saved: true } : p
        )
      );
    } catch (err: any) {
      setNotification({ message: err.message || 'Error saving paper', type: 'error' });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-xs font-medium">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>Global Academic Literature Index</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Explore Research Papers
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Search over 250 million global publications indexed from arXiv, IEEE, ACM, Springer, and Nature. Save reference papers directly to your local database with automatic author resolution and dense vector indexing.
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2.5 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Search Bar & Query Controls */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search research papers by topic, title, or keyword..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Search Literature</span>
              </>
            )}
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium">Suggested queries:</span>
          {suggestedQueries.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => {
                setQueryText(sq);
                handleSearch(sq);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-xs"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No academic papers displayed</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Enter a research keyword or select a suggested topic to fetch live peer-reviewed works.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Found {results.length} academic works</span>
            <span>Click &apos;Save Paper&apos; to persist to local database</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.map((paper, idx) => (
              <PaperCard
                key={paper.openalex_id || paper.id || idx}
                paper={paper}
                onSave={handleSavePaper}
                isSaving={savingId === (paper.openalex_id || paper.title)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading research explorer...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
