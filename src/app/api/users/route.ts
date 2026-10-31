import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.email,
        r.role_name
      FROM app_user u
      JOIN role r ON u.role_id = r.role_id
      ORDER BY r.role_id ASC, u.full_name ASC
    `);

    const students = res.rows.filter((u) => u.role_name === 'Student');
    const faculty = res.rows.filter((u) => u.role_name === 'Faculty');
    const admins = res.rows.filter((u) => u.role_name === 'Admin');

    return NextResponse.json({
      all: res.rows,
      students,
      faculty,
      admins,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
