import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const projRes = await query(
      `SELECT 
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
      WHERE p.project_id = $1
      GROUP BY p.project_id, u.full_name, u.email, u_rev.full_name, er.embedding_id`,
      [projectId]
    );

    if (projRes.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projRes.rows[0];

    // Fetch reviews
    const reviewsRes = await query(
      `SELECT 
        pr.review_id,
        pr.decision,
        pr.comments,
        pr.review_date,
        u.full_name AS faculty_name,
        u.email AS faculty_email
      FROM project_review pr
      JOIN app_user u ON pr.faculty_id = u.user_id
      WHERE pr.project_id = $1
      ORDER BY pr.review_date DESC`,
      [projectId]
    );

    // Fetch audit history for this project
    const auditRes = await query(
      `SELECT log_id, action, old_values, new_values, changed_at
       FROM audit_log
       WHERE table_name = 'project' AND record_id = $1
       ORDER BY changed_at DESC`,
      [projectId]
    );

    return NextResponse.json({
      project,
      reviews: reviewsRes.rows,
      auditHistory: auditRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  try {
    const projectId = parseInt(params.id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, problem_statement, description, domain_ids } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Project title cannot be empty' }, { status: 400 });
    }
    if (!problem_statement || !problem_statement.trim()) {
      return NextResponse.json({ error: 'Problem statement cannot be empty' }, { status: 400 });
    }

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE project
       SET title = $1, problem_statement = $2, description = $3, updated_at = NOW()
       WHERE project_id = $4
       RETURNING *`,
      [title.trim(), problem_statement.trim(), (description || '').trim(), projectId]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (Array.isArray(domain_ids)) {
      await client.query('DELETE FROM project_domain WHERE project_id = $1', [projectId]);
      for (const dId of domain_ids) {
        await client.query(
          `INSERT INTO project_domain (project_id, domain_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [projectId, parseInt(dId, 10)]
        );
      }
    }

    await client.query('COMMIT');

    // Update embedding
    try {
      const textToEmbed = `${title}. ${problem_statement}. ${description || ''}`;
      const rawVector = await generateEmbedding(textToEmbed);
      const vectorStr = formatVectorForPg(rawVector);

      await query(
        `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
         VALUES ('PROJECT', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
         ON CONFLICT (entity_type, entity_id)
         DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
        [projectId, vectorStr]
      );
    } catch (e) {
      console.error(`Failed to update embedding for project ${projectId}:`, e);
    }

    return NextResponse.json({ project: updateRes.rows[0], success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Delete embedding reference explicitly if any
    await query(`DELETE FROM embedding_ref WHERE entity_type = 'PROJECT' AND entity_id = $1`, [projectId]);

    // Delete project (cascade handles project_domain, project_review; trigger logs DELETE)
    const res = await query(`DELETE FROM project WHERE project_id = $1 RETURNING project_id, title`, [projectId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: res.rows[0] });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
