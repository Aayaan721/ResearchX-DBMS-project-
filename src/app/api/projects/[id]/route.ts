import { canViewProjectAudit } from '@/lib/audit-permissions';
import { currentUser, requireUser } from '@/lib/auth';
import { fail, readBody, textField, positiveId, domainIds, HttpError } from '@/lib/http';
import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { generateEmbedding, formatVectorForPg } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = positiveId(params.id);
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
        u.full_name AS faculty_name
      FROM project_review pr
      JOIN app_user u ON pr.faculty_id = u.user_id
      WHERE pr.project_id = $1
      ORDER BY pr.review_date DESC`,
      [projectId]
    );

    // Historical snapshots can include data no longer present in the public project.
    const canViewAudit = canViewProjectAudit(await currentUser(), project.student_id);
    const auditRes = canViewAudit ? await query(
      `SELECT log_id, action, old_values, new_values, changed_at
       FROM audit_log
       WHERE table_name = 'project' AND record_id = $1
       ORDER BY changed_at DESC`,
      [projectId]
    ) : { rows: [] };

    return NextResponse.json({
      project,
      reviews: reviewsRes.rows,
      auditHistory: auditRes.rows,
      canViewAudit,
    }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return fail(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    const user = await requireUser(request, ['Student', 'Admin']);
    const projectId = positiveId(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await readBody(request);
    const title = textField(body.title, 'Project title', 1, 255);
    const problem_statement = textField(body.problem_statement, 'Problem statement', 10, 10000);
    const description = body.description == null ? '' : textField(body.description, 'Description', 0, 20000);
    const domain_ids = domainIds(body.domain_ids);
    const owner = await query('SELECT student_id FROM project WHERE project_id=$1', [projectId]);
    if (!owner.rows.length) throw new HttpError(404, 'Project not found');
    if (user.role_name !== 'Admin' && owner.rows[0].student_id !== user.user_id) throw new HttpError(403, 'You can modify only your own projects');

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Project title cannot be empty' }, { status: 400 });
    }
    if (!problem_statement || !problem_statement.trim()) {
      return NextResponse.json({ error: 'Problem statement cannot be empty' }, { status: 400 });
    }

    // 1. Generate updated 384-dimensional dense vector BEFORE transaction commit
    const textToEmbed = `${title.trim()}. ${problem_statement.trim()}. ${(description || '').trim()}`;
    const rawVector = await generateEmbedding(textToEmbed);
    const vectorStr = formatVectorForPg(rawVector);

    client = await pool.connect();
    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE project
       SET title = $1, problem_statement = $2, description = $3, updated_at = NOW()
       WHERE project_id = $4
       RETURNING *`,
      [title.trim(), problem_statement.trim(), (description || '').trim(), projectId]
    );

    if (updateRes.rows.length === 0) {
      if (client) await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (Array.isArray(domain_ids)) {
      await client.query('DELETE FROM project_domain WHERE project_id = $1', [projectId]);
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

    // 2. Atomically update embedding in the exact same transaction
    await client.query(
      `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
       VALUES ('PROJECT', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
       ON CONFLICT (entity_type, entity_id)
       DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
      [projectId, vectorStr]
    );

    await client.query('COMMIT');

    return NextResponse.json({ project: updateRes.rows[0], success: true });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating project:', error);
    return fail(error);
  } finally {
    client?.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request, ['Student', 'Admin']);
    const projectId = positiveId(params.id);
    // One atomic DELETE; database cascades remove mappings, reviews and vectors.
    const owner = await query('SELECT student_id FROM project WHERE project_id=$1', [projectId]);
    if (!owner.rows.length) throw new HttpError(404, 'Project not found');
    if (user.role_name !== 'Admin' && owner.rows[0].student_id !== user.user_id) throw new HttpError(403, 'You can delete only your own projects');
    const result = await query(`DELETE FROM project WHERE project_id=$1 AND (student_id=$2 OR $3::boolean) RETURNING project_id,title`, [projectId,user.user_id,user.role_name==='Admin']);
    if (!result.rows.length) throw new HttpError(404, 'Project not found');
    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (error) { return fail(error); }
}
