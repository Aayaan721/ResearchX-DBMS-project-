import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      openalex_id,
      title,
      abstract,
      doi,
      doi_url,
      pdf_url,
      publication_year,
      host_venue,
      cited_by_count,
      authors,
      keywords,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Paper title is required' }, { status: 400 });
    }

    // Check for existing paper by openalex_id or doi
    let existingQuery = 'SELECT paper_id FROM research_paper WHERE 1=0';
    const existingParams: any[] = [];
    if (openalex_id) {
      existingParams.push(openalex_id);
      existingQuery += ` OR openalex_id = $${existingParams.length}`;
    }
    if (doi) {
      existingParams.push(doi);
      existingQuery += ` OR doi = $${existingParams.length}`;
    }

    if (existingParams.length > 0) {
      const existing = await query(existingQuery, existingParams);
      if (existing.rows.length > 0) {
        return NextResponse.json({
          message: 'Paper is already saved in the local database',
          paper_id: existing.rows[0].paper_id,
          already_saved: true,
        });
      }
    }

    await client.query('BEGIN');

    // 1. Insert into research_paper
    const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : (keywords || null);
    const fileUrl = pdf_url || doi_url || null;

    const paperRes = await client.query(
      `INSERT INTO research_paper (
        openalex_id, title, abstract, keywords, doi, file_url, published_in, year, cited_by_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING paper_id, title, openalex_id`,
      [
        openalex_id || null,
        title.trim(),
        abstract || null,
        keywordsStr,
        doi || null,
        fileUrl,
        host_venue || null,
        publication_year ? parseInt(publication_year, 10) : null,
        cited_by_count ? parseInt(cited_by_count, 10) : 0,
      ]
    );

    const paperId = paperRes.rows[0].paper_id;

    // 2. Insert authors and paper_author associations
    if (Array.isArray(authors) && authors.length > 0) {
      for (let i = 0; i < authors.length; i++) {
        const author = authors[i];
        const authorName = (author.display_name || author.name || 'Unknown Author').trim();
        const affiliation = author.affiliation || null;

        // Try to find existing author by name
        let authorId: number;
        const findAuthor = await client.query('SELECT author_id FROM author WHERE name = $1 LIMIT 1', [authorName]);
        if (findAuthor.rows.length > 0) {
          authorId = findAuthor.rows[0].author_id;
        } else {
          const insertAuthor = await client.query(
            `INSERT INTO author (name, affiliation) VALUES ($1, $2) RETURNING author_id`,
            [authorName, affiliation]
          );
          authorId = insertAuthor.rows[0].author_id;
        }

        await client.query(
          `INSERT INTO paper_author (paper_id, author_id, author_order)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [paperId, authorId, i + 1]
        );
      }
    }

    await client.query('COMMIT');

    // 3. Generate Embedding using MiniLM
    let embeddingStatus = 'no_text';
    let embeddingError: string | null = null;
    const textToEmbed = `${title}. ${abstract || ''}. ${keywordsStr || ''}`.trim();

    if (textToEmbed.length > 10) {
      try {
        const rawVector = await generateEmbedding(textToEmbed);
        const vectorStr = formatVectorForPg(rawVector);

        await query(
          `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
           VALUES ('RESEARCH_PAPER', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
           ON CONFLICT (entity_type, entity_id)
           DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
          [paperId, vectorStr]
        );
        embeddingStatus = 'indexed';
      } catch (err: any) {
        console.error(`Failed to generate embedding for paper ${paperId}:`, err);
        embeddingStatus = 'failed';
        embeddingError = err.message || 'Embedding generation error';
      }
    }

    return NextResponse.json(
      {
        success: true,
        paper_id: paperId,
        title: paperRes.rows[0].title,
        embeddingStatus,
        embeddingError,
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error saving paper:', error);
    return NextResponse.json({ error: error.message || 'Failed to save paper' }, { status: 500 });
  } finally {
    client.release();
  }
}
