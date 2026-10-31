import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';
import { getCanonicalWork, OpenAlexAuthor } from '@/lib/openalex';

interface SavePaperRequestBody {
  openalex_id?: string;
  title: string;
  abstract?: string | null;
  doi?: string | null;
  doi_url?: string | null;
  pdf_url?: string | null;
  publication_year?: number | string | null;
  host_venue?: string | null;
  cited_by_count?: number | string;
  authors?: Array<{
    id?: string;
    display_name?: string;
    name?: string;
    affiliation?: string;
  }>;
  keywords?: string[] | string;
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body: SavePaperRequestBody = await request.json();

    let title = body.title?.trim() || '';
    let openalex_id = body.openalex_id?.trim() || null;
    let abstract = body.abstract || null;
    let doi = body.doi?.trim() || null;
    let doi_url = body.doi_url || null;
    let pdf_url = body.pdf_url || null;
    let publication_year = body.publication_year ? parseInt(String(body.publication_year), 10) : null;
    let host_venue = body.host_venue || null;
    let cited_by_count = body.cited_by_count ? parseInt(String(body.cited_by_count), 10) : 0;
    let authors = body.authors || [];
    let keywords = body.keywords || [];

    // Canonical server-side validation using OpenAlex API if openalex_id is provided
    if (openalex_id) {
      try {
        const canonical = await getCanonicalWork(openalex_id);
        if (canonical) {
          title = canonical.title;
          abstract = abstract || canonical.abstract;
          doi = canonical.doi || doi;
          doi_url = canonical.doi_url || doi_url;
          pdf_url = canonical.pdf_url || pdf_url;
          publication_year = canonical.publication_year || publication_year;
          host_venue = canonical.host_venue || host_venue;
          cited_by_count = canonical.cited_by_count ?? cited_by_count;
          if (canonical.authors && canonical.authors.length > 0) {
            authors = canonical.authors;
          }
          if (canonical.keywords && canonical.keywords.length > 0) {
            keywords = canonical.keywords;
          }
        }
      } catch (e) {
        console.warn('Canonical fetch error (continuing with client payload):', e);
      }
    }

    if (!title) {
      return NextResponse.json({ error: 'Paper title is required and cannot be empty' }, { status: 400 });
    }

    // Check for existing paper by openalex_id or doi to prevent duplicates
    let existingQuery = 'SELECT paper_id, title FROM research_paper WHERE 1=0';
    const existingParams: (string | number)[] = [];
    if (openalex_id) {
      existingParams.push(openalex_id);
      existingQuery += ` OR openalex_id = $${existingParams.length}`;
    }
    if (doi) {
      existingParams.push(doi);
      existingQuery += ` OR doi = $${existingParams.length}`;
    }

    if (existingParams.length > 0) {
      const existing = await client.query(existingQuery, existingParams);
      if (existing.rows.length > 0) {
        return NextResponse.json({
          message: 'Paper is already indexed in the local database',
          paper_id: existing.rows[0].paper_id,
          title: existing.rows[0].title,
          already_saved: true,
        });
      }
    }

    // Prepare text and compute dense vector embedding BEFORE committing transaction
    const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : (keywords || null);
    const textToEmbed = `${title}. ${abstract || ''}. ${keywordsStr || ''}`.trim();

    let vectorStr: string | null = null;
    if (textToEmbed.length > 10) {
      const rawVector = await generateEmbedding(textToEmbed);
      vectorStr = formatVectorForPg(rawVector);
    }

    await client.query('BEGIN');

    // 1. Insert into research_paper
    const fileUrl = pdf_url || doi_url || null;
    const paperRes = await client.query(
      `INSERT INTO research_paper (
        openalex_id, title, abstract, keywords, doi, file_url, published_in, year, cited_by_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING paper_id, title, openalex_id`,
      [
        openalex_id || null,
        title,
        abstract || null,
        keywordsStr,
        doi || null,
        fileUrl,
        host_venue || null,
        publication_year,
        isNaN(cited_by_count) ? 0 : cited_by_count,
      ]
    );

    const paperId: number = paperRes.rows[0].paper_id;

    // 2. Insert authors using stable OpenAlex Author ID when available, falling back to name
    if (Array.isArray(authors) && authors.length > 0) {
      for (let i = 0; i < authors.length; i++) {
        const author = authors[i];
        const authorOaId = author.id ? author.id.replace(/^https?:\/\/openalex\.org\//, '').trim() : null;
        const authorName = (author.display_name || author.name || 'Unknown Author').trim();
        const affiliation = author.affiliation || null;

        let authorId: number;

        if (authorOaId) {
          const findByOa = await client.query('SELECT author_id FROM author WHERE openalex_id = $1 LIMIT 1', [authorOaId]);
          if (findByOa.rows.length > 0) {
            authorId = findByOa.rows[0].author_id;
          } else {
            const insertAuthor = await client.query(
              `INSERT INTO author (openalex_id, name, affiliation) 
               VALUES ($1, $2, $3)
               ON CONFLICT (openalex_id) DO UPDATE SET name = EXCLUDED.name, affiliation = COALESCE(EXCLUDED.affiliation, author.affiliation)
               RETURNING author_id`,
              [authorOaId, authorName, affiliation]
            );
            authorId = insertAuthor.rows[0].author_id;
          }
        } else {
          const findByName = await client.query('SELECT author_id FROM author WHERE name = $1 LIMIT 1', [authorName]);
          if (findByName.rows.length > 0) {
            authorId = findByName.rows[0].author_id;
          } else {
            const insertAuthor = await client.query(
              `INSERT INTO author (name, affiliation) VALUES ($1, $2) RETURNING author_id`,
              [authorName, affiliation]
            );
            authorId = insertAuthor.rows[0].author_id;
          }
        }

        await client.query(
          `INSERT INTO paper_author (paper_id, author_id, author_order)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [paperId, authorId, i + 1]
        );
      }
    }

    // 3. Atomically insert embedding into embedding_ref within the same transaction
    if (vectorStr) {
      await client.query(
        `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
         VALUES ('RESEARCH_PAPER', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
         ON CONFLICT (entity_type, entity_id)
         DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
        [paperId, vectorStr]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        paper_id: paperId,
        title: paperRes.rows[0].title,
        embeddingStatus: vectorStr ? 'indexed' : 'no_text',
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error saving paper:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save paper to database' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
