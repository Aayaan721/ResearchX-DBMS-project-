'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  Search, 
  FolderGit2, 
  BookOpen, 
  ArrowRight, 
  AlertCircle,
  Info,
  ShieldAlert
} from 'lucide-react';
import SimilarityScoreBadge from '@/components/SimilarityScoreBadge';

function SimilarityContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || 'approximate nearest neighbor search on dense vectors using hnsw graphs';

  const [mode, setMode] = useState<'text' | 'project'>('text');
  const [queryText, setQueryText] = useState(initialQ);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectsList, setProjectsList] = useState<Array<{ project_id: number; title: string; status: string }>>([]);
  
  const [results, setResults] = useState<any[]>([]);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        const projs = data.projects || [];
        setProjectsList(projs);
        if (projs.length > 0) {
          setSelectedProjectId(String(projs[0].project_id));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  async function handleSearch(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    setSourceTitle(null);

    try {
      const payload: { limit: number; queryText?: string; projectId?: number } = { limit: 8 };
      if (mode === 'text') {
        const textToUse = customQuery || queryText;
        if (!textToUse.trim()) throw new Error('Please enter a research concept or topic statement.');
        payload.queryText = textToUse.trim();
      } else {
        if (!selectedProjectId) throw new Error('Please select an existing project from the dropdown.');
        payload.projectId = parseInt(selectedProjectId, 10);
      }

      const res = await fetch('/api/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Similarity search failed');

      setResults(data.matches || []);
      setSourceTitle(data.sourceTitle);
    } catch (err: any) {
      setError(err.message || 'Error executing similarity discovery');
    } finally {
      setLoading(false);
    }
  }

  // Trigger search on mount if initial query param provided
  useEffect(() => {
    if (searchParams.get('q')) {
      handleSearch(undefined, searchParams.get('q')!);
    }
  }, [searchParams]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Semantic Discovery Engine</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Find Similar Research
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Compare research proposals against locally indexed university capstones and published literature. Semantic embeddings identify conceptually aligned work even when different keywords are used.
        </p>
      </div>

      {/* Semantic Meaning Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">How Similarity Scores Work:</span> Scores indicate <span className="text-cyan-300 font-medium">semantic cosine similarity</span> between dense 384-dimensional text vectors in PostgreSQL. They represent conceptual relatedness, <span className="underline decoration-slate-600">not</span> probability of duplication, plagiarism, or lack of originality.
        </div>
      </div>

      {/* Control Panel: Mode Selection & Input Form */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
        {/* Toggle Mode */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'text'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Type Research Idea
          </button>
          <button
            type="button"
            onClick={() => setMode('project')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'project'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Select Existing Project
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {mode === 'text' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Proposed Research Idea or Problem Statement
              </label>
              <textarea
                rows={3}
                required
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Type your proposed project idea, algorithmic intuition, or problem statement..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Base Project to Compare
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {projectsList.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    #{p.project_id}: {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Computing Similarity...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Find Related Projects &amp; Papers</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span>
              Ranked similarity results for: <span className="text-white font-medium">{sourceTitle}</span>
            </span>
            <span className="font-mono text-cyan-400">{results.length} nearest neighbors found</span>
          </div>

          <div className="space-y-3">
            {results.map((item, index) => {
              const isProject = item.entity_type === 'PROJECT';
              return (
                <div
                  key={`${item.entity_type}-${item.entity_id}`}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isProject
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {isProject ? <FolderGit2 className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                        {isProject ? 'Student Project' : 'Academic Literature'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {item.category_info || item.metadata_badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="text-[11px] text-slate-500">
                      <span>Contributor: </span>
                      <span className="text-slate-300 font-medium">{item.primary_contributor}</span>
                    </div>
                  </div>

                  {/* Similarity Badge & Action Link */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Semantic Match
                      </span>
                      <SimilarityScoreBadge score={item.similarity_score} />
                    </div>

                    {isProject ? (
                      <Link
                        href={`/projects/${item.entity_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        <span>View Project</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link
                        href={`/papers`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        <span>View in Library</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SimilarityPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading similarity engine...</div>}>
      <SimilarityContent />
    </Suspense>
  );
}
