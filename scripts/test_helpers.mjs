import { readFile } from 'node:fs/promises';
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const names = { Student: 'aayaan_s', OtherStudent: 'priya_k', Faculty: 'dr_shilpa', Admin: 'admin_researchx' };
export async function demoAccount(role) {
  const file = process.env.TEST_CREDENTIALS_FILE || process.env.DEMO_CREDENTIALS_FILE;
  if (!file) throw new Error('Set TEST_CREDENTIALS_FILE to the private credentials file created during provisioning');
  const users = JSON.parse(await readFile(file, 'utf8'));
  const user = users.find(u => u.username === names[role]);
  if (!user) throw new Error(`Missing test account for ${role}`);
  return user;
}
export async function loginClient(role) {
  const user = await demoAccount(role);
  const response = await fetch(`${BASE_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
  if (!response.ok) throw new Error(`Could not log in test account (${role}): HTTP ${response.status}`);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const request = (url, init = {}) => fetch(new URL(url, BASE_URL), { ...init, headers: { ...init.headers, Cookie: cookie } });
  return { request, cookie, setCookie: response.headers.get('set-cookie') };
}
export async function authenticatedFetch(role) { return (await loginClient(role)).request; }
export async function loginBrowser(page, role) {
  const user = await demoAccount(role);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('#username', user.username);
  await page.type('#password', user.password);
  await page.click('form button');
  await page.waitForFunction(async expected => {
    const r = await fetch('/api/auth/me'); const data = await r.json(); return data.user?.username === expected;
  }, {}, user.username);
  await page.waitForFunction(() => window.location.pathname !== '/login');
}
