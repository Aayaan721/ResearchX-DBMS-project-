import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const domainId = searchParams.get('domainId');
    const status = searchParams.get('status');

    let sql = `
      SELECT 
        p.project_id,
        p.title,
        p.problem_statement,
        p.description,
        p.status,
        p.student_id,
        u.full_name AS student_name,
        u.email AS student_email,
        p.approved_by,
        u_rev.full_name AS reviewer_name,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('domain_id', d.domain_id, 'domain_name', d.domain_name)
          ) FILTER (WHERE d.domain_id IS NOT NULL), 
          '[]'
        ) AS domains,
        (er.embedding_id IS NOT NULL) AS is_embedded
      FROM project p
      JOIN app_user u ON p.student_id = u.user_id
      LEFT JOIN app_user u_rev ON p.approved_by = u_rev.user_id
      LEFT JOIN project_domain pd ON p.project_id = pd.project_id
      LEFT JOIN domain d ON pd.domain_id = d.domain_id
      LEFT JOIN embedding_ref er ON p.project_id = er.entity_id AND er.entity_type = 'PROJECT'
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (p.title ILIKE $${params.length} OR p.problem_statement ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    if (domainId) {
      params.push(parseInt(domainId, 10));
      sql += ` AND p.project_id IN (SELECT project_id FROM project_domain WHERE domain_id = $${params.length})`;
    }

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }

    sql += `
      GROUP BY p.project_id, u.full_name, u.email, u_rev.full_name, er.embedding_id
      ORDER BY p.updated_at DESC, p.project_id DESC
    `;

    const result = await query(sql, params);
    return NextResponse.json({ projects: result.rows });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { title, problem_statement, description, student_id, domain_ids } = body;

    // Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 });
    }
    if (title.trim().length > 255) {
      return NextResponse.json({ error: 'Project title must not exceed 255 characters' }, { status: 400 });
    }
    if (!problem_statement || typeof problem_statement !== 'string' || problem_statement.trim().length < 10) {
      return NextResponse.json({ error: 'Problem statement must be at least 10 characters long' }, { status: 400 });
    }
    const studentIdNum = parseInt(String(student_id), 10);
    if (!studentIdNum || isNaN(studentIdNum)) {
      return NextResponse.json({ error: 'A valid student author is required' }, { status: 400 });
    }

    // 1. Generate 384-dimensional dense vector BEFORE transaction commit
    const textToEmbed = `${title.trim()}. ${problem_statement.trim()}. ${(description || '').trim()}`;
    const rawVector = await generateEmbedding(textToEmbed);
    const vectorStr = formatVectorForPg(rawVector);

    await client.query('BEGIN');

    // 2. Insert Project
    const insertProjRes = await client.query(
      `INSERT INTO project (student_id, title, problem_statement, description, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING project_id, title, status, created_at`,
      [studentIdNum, title.trim(), problem_statement.trim(), (description || '').trim()]
    );
    const newProject = insertProjRes.rows[0];
    const projectId: number = newProject.project_id;

    // 3. Insert Domain Mappings
    if (Array.isArray(domain_ids) && domain_ids.length > 0) {
      for (const dId of domain_ids) {
        const domainIdNum = parseInt(String(dId), 10);
        if (!isNaN(domainIdNum)) {
          await client.query(
            `INSERT INTO project_domain (project_id, domain_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [projectId, domainIdNum]
          );
        }
      }
    }

    // 4. Atomically insert into embedding_ref in the same transaction
    await client.query(
      `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
       VALUES ('PROJECT', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
       ON CONFLICT (entity_type, entity_id)
       DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
      [projectId, vectorStr]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      {
        project: newProject,
        embeddingStatus: 'indexed',
      },
      { status: 201 }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
  } finally {
    client.release();
  }
}
