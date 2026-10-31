import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const { faculty_id, decision, comments } = body;

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
      [projectId, parseInt(faculty_id, 10), decision, (comments || '').trim()]
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
    return NextResponse.json({ error: error.message || 'Review procedure failed' }, { status: 500 });
  }
}
