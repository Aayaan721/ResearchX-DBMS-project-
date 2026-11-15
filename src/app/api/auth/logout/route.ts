import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkOrigin, cookieOptions, SESSION_COOKIE, tokenHash } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail } from '@/lib/http';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (token) await query('DELETE FROM auth_session WHERE token_hash=$1', [tokenHash(token)]);
    cookies().set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    return NextResponse.json({ success: true });
  } catch (error) { return fail(error); }
}
