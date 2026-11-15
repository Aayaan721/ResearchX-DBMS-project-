// Credentials are generated locally and never printed or committed.
import { randomBytes } from 'node:crypto';
import { writeFile, realpath, unlink } from 'node:fs/promises';
import { credentialFilePath } from './private_credentials.mjs';
import { database } from './db.mjs';
import { hashPassword } from '../src/lib/password.mjs';
const root = await realpath(new URL('..', import.meta.url));
const file = await credentialFilePath(process.env.DEMO_CREDENTIALS_FILE, root);
const pool = database();
let createdFile = false;
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
    createdFile = true;
  }
  await client.query('COMMIT');
  console.log(`Initialized ${credentials.length} accounts; existing initialized accounts were preserved.`);
  if (credentials.length) console.log('Open DEMO_CREDENTIALS_FILE privately in a local editor; never print, share or commit it.');
  else console.log('No passwords were regenerated. Use the original private credentials file; existing passwords cannot be recovered from hashes.');
} catch (error) {
  await client.query('ROLLBACK');
  if (createdFile) await unlink(file); // Only remove a file this invocation created.
  throw error;
}
finally { client.release(); await pool.end(); }
