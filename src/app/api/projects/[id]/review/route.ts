import { requireUser } from '@/lib/auth';
import { fail, readBody, textField, positiveId, HttpError } from '@/lib/http';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(request, ['Faculty', 'Admin']);
    const projectId = positiveId(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await readBody(request);
    const faculty_id = user.user_id;
    const decision = textField(body.decision, 'Decision', 1, 30);
    const comments = body.comments == null ? '' : textField(body.comments, 'Comments', 0, 10000);
    const exists = await query('SELECT 1 FROM project WHERE project_id=$1', [projectId]);
    if (!exists.rows.length) throw new HttpError(404, 'Project not found');

    if (!faculty_id) {
      return NextResponse.json({ error: 'Faculty reviewer ID is required' }, { status: 400 });
    }
    if (!decision || !['Approved', 'Rejected', 'Changes Required'].includes(decision)) {
      return NextResponse.json(
        { error: 'Valid decision is required (Approved, Rejected, or Changes Required)' },
        { status: 400 }
      );
    }

    // Call stored procedure sp_review_and_approve_project
    await query(
      `CALL sp_review_and_approve_project($1, $2, $3, $4)`,
      [projectId, faculty_id, decision, (comments || '').trim()]
    );

    // Fetch updated project status
    const projRes = await query(`SELECT project_id, status, approved_by, updated_at FROM project WHERE project_id = $1`, [
      projectId,
    ]);

    return NextResponse.json({
      success: true,
      message: `Project status updated to ${decision} via stored procedure sp_review_and_approve_project`,
      project: projRes.rows[0],
    });
  } catch (error: any) {
    console.error('Error reviewing project via stored procedure:', error);
    return fail(error);
  }
}
