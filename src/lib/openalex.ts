// src/lib/openalex.ts

export interface OpenAlexAuthor {
  id: string;
  display_name: string;
  affiliation?: string;
  orcid?: string;
}

export interface OpenAlexPaper {
  id: string; // e.g. "https://openalex.org/W2963403868"
  openalex_id: string; // e.g. "W2963403868"
  title: string;
  abstract: string | null;
  doi: string | null;
  doi_url: string | null;
  publication_year: number | null;
  host_venue: string | null;
  cited_by_count: number;
  authors: OpenAlexAuthor[];
  keywords: string[];
  pdf_url: string | null;
}

/**
 * OpenAlex returns abstracts as an inverted index: { "word": [0, 4, 12], "another": [1] }
 * This function reconstructs human-readable text from the inverted index.
 */
export function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) {
    return null;
  }

  try {
    let maxPosition = -1;
    for (const positions of Object.values(invertedIndex)) {
      for (const pos of positions) {
        if (pos > maxPosition) maxPosition = pos;
      }
    }

    if (maxPosition < 0 || maxPosition > 5000) {
      return null;
    }

    const words: string[] = new Array(maxPosition + 1);
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }

    // Fill any missing words with spaces and join
    return words.map((w) => w || '').join(' ').trim();
  } catch (err) {
    console.error('Failed to reconstruct inverted index abstract:', err);
    return null;
  }
}

/**
 * Searches academic papers using OpenAlex REST API with polite pool email
 */
export async function searchOpenAlex(query: string, limit = 10): Promise<OpenAlexPaper[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const mailto = process.env.OPENALEX_MAILTO || 'researchx-demo@pes.edu';
  const encodedQuery = encodeURIComponent(query.trim());
  const url = `https://api.openalex.org/works?search=${encodedQuery}&per-page=${limit}&mailto=${encodeURIComponent(
    mailto
  )}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': `ResearchX/1.0 (mailto:${mailto})`,
    },
    // Cache for 60 seconds to respect rate limits
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`OpenAlex API responded with status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const results: any[] = data.results || [];

  return results.map((work): OpenAlexPaper => {
    const rawId = work.id || '';
    const openalex_id = rawId.replace('https://openalex.org/', '');
    const cleanDoi = work.doi ? work.doi.replace('https://doi.org/', '') : null;
    const reconstructed = reconstructAbstract(work.abstract_inverted_index);

    const authors: OpenAlexAuthor[] = (work.authorships || []).map((a: any) => {
      const institutions = (a.institutions || []).map((inst: any) => inst.display_name).join(', ');
      return {
        id: (a.author?.id || '').replace('https://openalex.org/', ''),
        display_name: a.author?.display_name || 'Unknown Author',
        affiliation: institutions || undefined,
        orcid: a.author?.orcid,
      };
    });

    const keywords: string[] = (work.keywords || []).map((k: any) => k.display_name || '').filter(Boolean);

    return {
      id: rawId,
      openalex_id,
      title: work.title || 'Untitled Research',
      abstract: reconstructed,
      doi: cleanDoi,
      doi_url: work.doi || null,
      publication_year: work.publication_year || null,
      host_venue: work.primary_location?.source?.display_name || work.host_venue?.display_name || 'Academic Venue',
      cited_by_count: work.cited_by_count || 0,
      authors,
      keywords,
      pdf_url: work.primary_location?.pdf_url || work.open_access?.oa_url || null,
    };
  });
}
