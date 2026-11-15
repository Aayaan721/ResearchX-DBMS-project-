import { fail, positiveId, HttpError } from '@/lib/http';
import { NextRequest, NextResponse } from 'next/server';
import { searchOpenAlex } from '@/lib/openalex';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = searchParams.has('limit') ? positiveId(searchParams.get('limit'), 'limit') : 10;
    if (limit > 25 || q.length > 500) throw new HttpError(400, 'Search exceeds supported limits');

    if (!q.trim()) {
      return NextResponse.json({ results: [] });
    }

    const papers = await searchOpenAlex(q, limit);

    // Cross reference with database to see which are already saved
    const savedRes = await query('SELECT openalex_id, doi, paper_id FROM research_paper');
    const savedMap = new Map<string, number>();
    for (const r of savedRes.rows) {
      if (r.openalex_id) savedMap.set(r.openalex_id, r.paper_id);
      if (r.doi) savedMap.set(r.doi.toLowerCase(), r.paper_id);
    }

    const results = papers.map((p) => {
      const savedId =
        (p.openalex_id && savedMap.get(p.openalex_id)) ||
        (p.doi && savedMap.get(p.doi.toLowerCase()));

      return {
        ...p,
        is_saved: !!savedId,
        saved_paper_id: savedId || null,
      };
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('OpenAlex search error:', error);
    return fail(error);
  }
}
