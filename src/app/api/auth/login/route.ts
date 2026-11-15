import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkOrigin, startSession } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password.mjs';
import { fail, HttpError, readBody, textField } from '@/lib/http';
const dummyHash = hashPassword(randomBytes(32).toString('hex'));
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await readBody(request);
    const username = textField(body.username, 'Username', 1, 50);
    if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 256) throw new HttpError(400, 'Invalid password input');
    const password = body.password;
    // Persist throttling across app restarts. Do not trust spoofable forwarded IP headers.
    const attempts = await query(`INSERT INTO auth_login_attempt(username,attempts,window_start)
      VALUES($1,1,NOW()) ON CONFLICT(username) DO UPDATE SET
      attempts=CASE WHEN auth_login_attempt.window_start<NOW()-INTERVAL '15 minutes' THEN 1 ELSE auth_login_attempt.attempts+1 END,
      window_start=CASE WHEN auth_login_attempt.window_start<NOW()-INTERVAL '15 minutes' THEN NOW() ELSE auth_login_attempt.window_start END
      RETURNING attempts`, [username]);
    if (attempts.rows[0].attempts > 10) throw new HttpError(429, 'Too many login attempts; try again in 15 minutes');
    const result = await query(`SELECT u.user_id,u.password_hash FROM app_user u WHERE username=$1`, [username]);
    const user = result.rows[0];
    const validHash = user?.password_hash?.startsWith('scrypt$') ? user.password_hash : await dummyHash;
    const valid = await verifyPassword(password, validHash);
    if (!user || !valid || validHash !== user.password_hash) throw new HttpError(401, 'Invalid username or password');
    await query('DELETE FROM auth_login_attempt WHERE username=$1', [username]);
    await startSession(user.user_id);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error); }
}
