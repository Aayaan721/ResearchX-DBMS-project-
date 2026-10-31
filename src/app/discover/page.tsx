'use client';

import { useState } from 'react';
import { Search, Sparkles, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import PaperCard, { OpenAlexPaperItem } from '@/components/PaperCard';

export default function DiscoverPage() {
  const [queryText, setQueryText] = useState('vector database similarity pgvector');
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
    if (!q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/openalex/search?q=${encodeURIComponent(q.trim())}&limit=8`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search OpenAlex');
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with OpenAlex API');
    } finally {
      setLoading(false);
    }
  }

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
        message: `Paper "${paper.title.slice(0, 50)}..." saved to PostgreSQL and indexed into pgvector (${data.embeddingStatus})!`,
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
          <BookOpen className="h-3.5 w-3.5" />
          Live OpenAlex Academic Literature Integration
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Discover Academic Research Papers
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Search over 250 million global research works on OpenAlex. Save high-impact papers to your local PostgreSQL database with automatic author entity resolution and 384-dimensional pgvector semantic indexing.
        </p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {notification.message}
        </div>
      )}

      {/* Search Input Box */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-4">
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
              placeholder="Search academic works (e.g. pgvector, graph neural networks, federated learning)..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Querying OpenAlex...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search Papers
              </>
            )}
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-slate-400 font-medium">Try searching:</span>
          {suggestedQueries.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => {
                setQueryText(sq);
                handleSearch(sq);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors font-mono text-[11px]"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel h-56 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-slate-800">
          <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Enter a search query to explore academic literature</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            OpenAlex indexes works from arXiv, IEEE, ACM, Springer, Nature, and thousands of peer-reviewed sources.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Found {results.length} academic papers</span>
            <span>Click &apos;Save Paper&apos; to persist to PostgreSQL &amp; compute embeddings</span>
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
