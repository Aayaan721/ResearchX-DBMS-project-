'use client';

import { ExternalLink, BookmarkPlus, Check, Sparkles, BookOpen } from 'lucide-react';

export interface OpenAlexPaperItem {
  id?: string;
  openalex_id?: string;
  paper_id?: number;
  title: string;
  abstract?: string | null;
  doi?: string | null;
  doi_url?: string | null;
  pdf_url?: string | null;
  publication_year?: number | null;
  year?: number | null;
  host_venue?: string | null;
  published_in?: string | null;
  cited_by_count?: number;
  authors?: Array<{ name?: string; display_name?: string; affiliation?: string }>;
  is_saved?: boolean;
}

interface PaperCardProps {
  paper: OpenAlexPaperItem;
  onSave?: (paper: OpenAlexPaperItem) => Promise<void>;
  isSaving?: boolean;
}

export default function PaperCard({ paper, onSave, isSaving }: PaperCardProps) {
  const year = paper.publication_year || paper.year;
  const venue = paper.host_venue || paper.published_in;
  const doiUrl = paper.doi_url || (paper.doi ? `https://doi.org/${paper.doi}` : null);
  const authorNames = (paper.authors || [])
    .slice(0, 3)
    .map((a) => a.display_name || a.name)
    .join(', ');

  return (
    <div className="rounded-2xl p-6 flex flex-col justify-between bg-slate-900/70 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
      <div className="space-y-2">
        {/* Header row: Venue & Year & Citations */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 font-mono text-[11px]">
              {year || 'Recent'}
            </span>
            <span className="truncate max-w-[220px] text-cyan-300 font-medium">
              {venue || 'Academic Literature'}
            </span>
          </div>
          {paper.cited_by_count !== undefined && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
              {paper.cited_by_count.toLocaleString()} citations
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white leading-snug line-clamp-2 pt-1">
          {paper.title}
        </h3>

        {/* Authors */}
        {authorNames && (
          <p className="text-xs text-slate-400 line-clamp-1">
            <span className="text-slate-500 font-medium">Authors:</span> {authorNames} {paper.authors && paper.authors.length > 3 ? 'et al.' : ''}
          </p>
        )}

        {/* Abstract snippet */}
        <p className="text-xs sm:text-sm text-slate-400 pt-1 line-clamp-3 leading-relaxed">
          {paper.abstract || 'Abstract preview not provided directly in publisher feed.'}
        </p>
      </div>

      {/* Footer: Open Link & Save button */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {doiUrl && (
            <a
              href={doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Publisher DOI</span>
            </a>
          )}
          {paper.pdf_url && (
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Open PDF</span>
            </a>
          )}
        </div>

        {onSave && (
          <button
            onClick={() => onSave(paper)}
            disabled={paper.is_saved || isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              paper.is_saved
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60 cursor-default'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm active:scale-95 disabled:opacity-50'
            }`}
          >
            {paper.is_saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved to Library</span>
              </>
            ) : isSaving ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>Indexing...</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span>Save Paper</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
