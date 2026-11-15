import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { fail } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json({ user: await currentUser() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return fail(error); }
}
