import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { query } from './db';
import { HttpError } from './http';
export type Role = 'Student' | 'Faculty' | 'Admin';
export type SessionUser = { user_id: number; username: string; full_name: string; role_name: Role };
export const SESSION_COOKIE = 'researchx_session';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.SESSION_COOKIE_SECURE !== 'false', sameSite: 'lax' as const, path: '/' });
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'Cross-site request rejected');
  }
}
export async function currentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await query<SessionUser>(`SELECT u.user_id,u.username,u.full_name,r.role_name
    FROM auth_session s JOIN app_user u USING(user_id) JOIN role r USING(role_id)
    WHERE s.token_hash=$1 AND s.expires_at>NOW()`, [tokenHash(token)]);
  return result.rows[0] || null;
}
export async function requireUser(request: Request, roles?: Role[]): Promise<SessionUser> {
  checkOrigin(request);
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Please log in');
  if (roles && !roles.includes(user.role_name)) throw new HttpError(403, 'Permission denied');
  return user;
}
export async function startSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  const old = cookies().get(SESSION_COOKIE)?.value;
  if (old) await query('DELETE FROM auth_session WHERE token_hash=$1', [tokenHash(old)]);
  await query('DELETE FROM auth_session WHERE expires_at<=NOW()');
  await query(`INSERT INTO auth_session(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')`, [tokenHash(token),userId]);
  cookies().set(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: 8 * 60 * 60 });
}
