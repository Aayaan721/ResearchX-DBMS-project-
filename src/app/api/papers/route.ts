import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let sql = `
      SELECT 
        rp.paper_id,
        rp.openalex_id,
        rp.title,
        rp.abstract,
        rp.keywords,
        rp.doi,
        rp.file_url,
        rp.published_in,
        rp.year,
        rp.cited_by_count,
        rp.created_at,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'author_id', a.author_id,
              'name', a.name,
              'affiliation', a.affiliation,
              'order', pa.author_order
            ) ORDER BY pa.author_order ASC
          ) FILTER (WHERE a.author_id IS NOT NULL),
          '[]'
        ) AS authors,
        (er.embedding_id IS NOT NULL) AS is_embedded
      FROM research_paper rp
      LEFT JOIN paper_author pa ON rp.paper_id = pa.paper_id
      LEFT JOIN author a ON pa.author_id = a.author_id
      LEFT JOIN embedding_ref er ON rp.paper_id = er.entity_id AND er.entity_type = 'RESEARCH_PAPER'
      WHERE 1=1
    `;

    const params: any[] = [];
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (rp.title ILIKE $${params.length} OR rp.abstract ILIKE $${params.length} OR rp.keywords ILIKE $${params.length} OR a.name ILIKE $${params.length})`;
    }

    sql += `
      GROUP BY rp.paper_id, er.embedding_id
      ORDER BY rp.created_at DESC, rp.paper_id DESC
    `;

    const result = await query(sql, params);
    return NextResponse.json({ papers: result.rows });
  } catch (error: any) {
    console.error('Error fetching papers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
