import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryText, projectId, limit } = body || {};
    const rawLimit = parseInt(String(limit), 10);
    const safeLimit = isNaN(rawLimit) ? 8 : Math.min(Math.max(rawLimit, 1), 50);

    let vectorStr: string | null = null;
    let excludeProjectId: number | null = null;
    let sourceTitle: string | null = null;

    if (projectId) {
      excludeProjectId = parseInt(String(projectId), 10);
      if (isNaN(excludeProjectId)) {
        return NextResponse.json({ error: 'Invalid project ID specified' }, { status: 400 });
      }
      const projRes = await query(
        `SELECT p.title, er.embedding
         FROM project p
         JOIN embedding_ref er ON p.project_id = er.entity_id AND er.entity_type = 'PROJECT'
         WHERE p.project_id = $1`,
        [excludeProjectId]
      );

      if (projRes.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              'Selected project either does not exist or does not yet have an indexed vector embedding in PostgreSQL.',
          },
          { status: 404 }
        );
      }

      sourceTitle = projRes.rows[0].title;
      vectorStr = projRes.rows[0].embedding;
    } else if (queryText && typeof queryText === 'string' && queryText.trim()) {
      const cleanQuery = queryText.trim();
      if (cleanQuery.length < 3) {
        return NextResponse.json({ error: 'Search query must be at least 3 characters long' }, { status: 400 });
      }
      if (cleanQuery.length > 4000) {
        return NextResponse.json({ error: 'Search query must not exceed 4000 characters' }, { status: 400 });
      }
      sourceTitle = `Query: "${cleanQuery.slice(0, 60)}${cleanQuery.length > 60 ? '...' : ''}"`;
      const rawVector = await generateEmbedding(cleanQuery);
      vectorStr = formatVectorForPg(rawVector);
    } else {
      return NextResponse.json(
        { error: 'Please provide either a research query text or select an existing project.' },
        { status: 400 }
      );
    }

    // Parameterized vector similarity query matching both projects and saved papers
    // Cosine similarity formula: 1 - (embedding <=> target_vector)
    const sql = `
      SELECT 
        'PROJECT' AS entity_type,
        p.project_id AS entity_id,
        p.title,
        p.problem_statement AS summary,
        p.status AS metadata_badge,
        u.full_name AS primary_contributor,
        STRING_AGG(DISTINCT d.domain_name, ', ') AS category_info,
        ROUND((1 - (er.embedding <=> $1::vector))::numeric, 4) AS similarity_score
      FROM embedding_ref er
      JOIN project p ON er.entity_type = 'PROJECT' AND er.entity_id = p.project_id
      JOIN app_user u ON p.student_id = u.user_id
      LEFT JOIN project_domain pd ON p.project_id = pd.project_id
      LEFT JOIN domain d ON pd.domain_id = d.domain_id
      WHERE ($2::int IS NULL OR p.project_id <> $2::int)
      GROUP BY p.project_id, p.title, p.problem_statement, p.status, u.full_name, er.embedding

      UNION ALL

      SELECT 
        'RESEARCH_PAPER' AS entity_type,
        rp.paper_id AS entity_id,
        rp.title,
        rp.abstract AS summary,
        COALESCE(rp.published_in, 'Academic Literature') AS metadata_badge,
        COALESCE(
          (SELECT a.name FROM paper_author pa JOIN author a ON pa.author_id = a.author_id WHERE pa.paper_id = rp.paper_id ORDER BY pa.author_order ASC LIMIT 1),
          'Primary Author'
        ) AS primary_contributor,
        COALESCE(rp.keywords, 'Peer-reviewed Paper') AS category_info,
        ROUND((1 - (er.embedding <=> $1::vector))::numeric, 4) AS similarity_score
      FROM embedding_ref er
      JOIN research_paper rp ON er.entity_type = 'RESEARCH_PAPER' AND er.entity_id = rp.paper_id
      GROUP BY rp.paper_id, rp.title, rp.abstract, rp.published_in, rp.keywords, er.embedding

      ORDER BY similarity_score DESC
      LIMIT $3;
    `;

    const results = await query(sql, [vectorStr, excludeProjectId, safeLimit]);

    return NextResponse.json({
      sourceTitle,
      metric: 'cosine_similarity',
      disclaimer: 'Scores indicate semantic cosine similarity between 384-dimensional dense vectors in PostgreSQL. They are not probabilities and do not assess originality or plagiarism.',
      totalMatches: results.rows.length,
      matches: results.rows.map((row) => ({
        ...row,
        similarity_score: parseFloat(row.similarity_score),
      })),
    });
  } catch (error: any) {
    console.error('Similarity search error:', error);
    return NextResponse.json(
      { error: error.message || 'Vector similarity search failed' },
      { status: 500 }
    );
  }
}
