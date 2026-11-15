import { requireUser } from '@/lib/auth';
import { fail, positiveId, HttpError } from '@/lib/http';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paperId = positiveId(params.id);
    if (isNaN(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    const paperRes = await query(
      `SELECT 
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
      WHERE rp.paper_id = $1
      GROUP BY rp.paper_id, er.embedding_id`,
      [paperId]
    );

    if (paperRes.rows.length === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    return NextResponse.json({ paper: paperRes.rows[0] });
  } catch (error: any) {
    console.error('Error fetching paper details:', error);
    return fail(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser(request, ['Admin']);
    const paperId = positiveId(params.id);
    const result = await query('DELETE FROM research_paper WHERE paper_id=$1 RETURNING paper_id,title', [paperId]);
    if (!result.rows.length) throw new HttpError(404, 'Paper not found');
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) { return fail(error); }
}
