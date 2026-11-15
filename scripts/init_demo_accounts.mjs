// Credentials are generated locally and never printed or committed.
import { randomBytes } from 'node:crypto';
import { writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { database } from './db.mjs';
import { hashPassword } from '../src/lib/password.mjs';
const pool = database();
const file = process.env.DEMO_CREDENTIALS_FILE;
if (!file) throw new Error('Set DEMO_CREDENTIALS_FILE to a private path outside the checkout');
const root = await realpath(new URL('..', import.meta.url));
await mkdir(dirname(resolve(file)), { recursive: true, mode: 0o700 });
const parent = await realpath(dirname(resolve(file)));
if (parent === root || parent.startsWith(root + '/')) throw new Error('Keep credentials outside the checkout');
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const users = (await client.query(`SELECT user_id,username,password_hash FROM app_user
    WHERE password_hash LIKE '%Dummy%' OR password_hash='!uninitialized' FOR UPDATE`)).rows;
  const credentials = [];
  for (const user of users) {
    const password = randomBytes(24).toString('base64url');
    await client.query('UPDATE app_user SET password_hash=$1 WHERE user_id=$2', [await hashPassword(password), user.user_id]);
    await client.query('DELETE FROM auth_session WHERE user_id=$1', [user.user_id]);
    credentials.push({ username: user.username, password });
  }
  if (credentials.length) {
    // Exclusive creation prevents overwriting pre-existing credentials.
    await writeFile(file, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  await client.query('COMMIT');
  console.log(`Initialized ${credentials.length} accounts; existing initialized accounts were preserved.`);
  if (credentials.length) console.log('Read demo credentials locally from DEMO_CREDENTIALS_FILE; do not share or commit them.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
