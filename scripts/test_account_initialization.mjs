import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, stat, rm, symlink } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { connectionString, database } from './db.mjs';
import { isWithinDirectory } from './private_credentials.mjs';
import { verifyPassword } from '../src/lib/password.mjs';

if (process.env.ALLOW_DISPOSABLE_DATABASE_TEST !== 'true') {
  throw new Error('Set ALLOW_DISPOSABLE_DATABASE_TEST=true to create/drop only a new disposable test database');
}
const root = fileURLToPath(new URL('..', import.meta.url));
const directory = await mkdtemp(path.join(os.tmpdir(), 'researchx account tests '));
const databaseName = 'researchx_init_test_' + randomBytes(8).toString('hex');
assert.match(databaseName, /^researchx_init_test_[a-f0-9]{16}$/);
const url = new URL(connectionString);
url.pathname = '/' + databaseName;
const admin = database();
let pool, app, createdDatabase = false;
let passed = 0, failed = 0;
const credentials = path.join(directory, 'demo credentials.json');
const originalHashes = async () => (await pool.query('SELECT user_id,password_hash FROM app_user ORDER BY user_id')).rows;
const absent = file => stat(file).then(() => false, e => { if (e.code === 'ENOENT') return true; throw e; });
async function test(name, run) {
  try { await run(); passed++; console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, error.message); }
}
function initialize(file, { envFile = false } = {}) {
  const env = { ...process.env, DATABASE_URL: url.href, DEMO_CREDENTIALS_FILE: file };
  const args = [];
  if (envFile) { delete env.DATABASE_URL; args.push('--env-file=' + path.join(directory, '.env.local')); }
  args.push(path.join(root, 'scripts/init_demo_accounts.mjs'));
  const child = spawnSync(process.execPath, args, { cwd: directory, env, encoding: 'utf8' });
  if (child.error) throw child.error;
  return { status: child.status, output: child.stdout + child.stderr };
}
try {
  await test('Windows path boundaries reject nested/case-variant checkout paths', async () => {
    const paths = path.win32;
    assert.equal(isWithinDirectory('C:\\ResearchX', 'C:\\ResearchX\\private', paths), true);
    assert.equal(isWithinDirectory('C:\\ResearchX', 'c:\\researchx\\private', paths), true);
    assert.equal(isWithinDirectory('C:\\ResearchX', 'C:\\ResearchX', paths), true);
    assert.equal(isWithinDirectory('C:\\ResearchX', 'C:\\ResearchX-other', paths), false);
    assert.equal(isWithinDirectory('C:\\ResearchX', 'D:\\private', paths), false);
    assert.equal(isWithinDirectory('C:\\ResearchX', 'C:\\ResearchX\\..\\private', paths), false);
    assert.equal(isWithinDirectory('C:\\ResearchX', '\\\\?\\C:\\ResearchX\\private', paths), true);
    assert.equal(isWithinDirectory('\\\\?\\C:\\ResearchX', 'c:\\ResearchX\\private', paths), true);
    assert.equal(isWithinDirectory('\\\\server\\share\\ResearchX', '\\\\?\\UNC\\server\\share\\ResearchX\\private', paths), true);

  });
  await test('POSIX path boundaries distinguish descendants from siblings', async () => {
    assert.equal(isWithinDirectory('/repo', '/repo/credentials', path.posix), true);
    assert.equal(isWithinDirectory('/repo', '/repo-other', path.posix), false);
    assert.equal(isWithinDirectory('/repo', '/private', path.posix), false);
  });
  await admin.query(`CREATE DATABASE ${databaseName} TEMPLATE template0`);
  createdDatabase = true;
  pool = new pg.Pool({ connectionString: url.href });
  // The destructive bootstrap is permitted ONLY in this just-created, verified empty DB.
  assert.equal((await pool.query('SELECT current_database() db')).rows[0].db, databaseName);
  assert.equal((await pool.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  for (const file of ['schema.sql', 'procedures_triggers.sql', 'seed.sql']) {
    await pool.query(await readFile(new URL('../database/' + file, import.meta.url), 'utf8'));
  }
  const seeded = await originalHashes();
  assert.equal(seeded.length, 5);
  await test('fresh PostgreSQL/pgvector bootstrap starts demo accounts locked', async () => {
    assert.ok(seeded.every(user => user.password_hash === '!uninitialized'));
    assert.ok((await pool.query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows.length);
  });
  await test('initialization before migration fails without changing accounts or writing credentials', async () => {
    assert.notEqual(initialize(credentials).status, 0);
    assert.deepEqual(await originalHashes(), seeded);
    assert.ok(await absent(credentials));
  });
  const migration = await readFile(new URL('../database/migrations/001_level3.sql', import.meta.url), 'utf8');
  await pool.query(migration);
  await test('missing and relative credential paths fail safely', async () => {
    assert.notEqual(initialize('').status, 0);
    assert.notEqual(initialize('relative.json').status, 0);
    assert.deepEqual(await originalHashes(), seeded);
  });
  await test('credential files inside the real checkout are rejected', async () => {
    const inside = path.join(root, '.forbidden-init-test.credentials.json');
    assert.notEqual(initialize(inside).status, 0);
    assert.ok(await absent(inside));
    assert.deepEqual(await originalHashes(), seeded);
  });
  await test('symlink/junction into the checkout cannot bypass the location check', async () => {
    const link = path.join(directory, 'checkout-link');
    await symlink(root, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.notEqual(initialize(path.join(link, '.forbidden-init-test.credentials.json')).status, 0);
    assert.deepEqual(await originalHashes(), seeded);
  });
  await test('an existing credentials file is never overwritten and DB changes roll back', async () => {
    const file = path.join(directory, 'existing.json');
    await writeFile(file, 'preserve this existing file', { mode: 0o600 });
    assert.notEqual(initialize(file).status, 0);
    assert.equal(await readFile(file, 'utf8'), 'preserve this existing file');
    assert.deepEqual(await originalHashes(), seeded);
  });
  await writeFile(path.join(directory, '.env.local'), 'DATABASE_URL=' + url.href + '\n', { mode: 0o600 });
  let generated;
  await test('native Node --env-file initializes fresh accounts with paths containing spaces', async () => {
    const result = initialize(credentials, { envFile: true });
    assert.equal(result.status, 0, 'Initializer must exit successfully');
    generated = JSON.parse(await readFile(credentials, 'utf8'));
    assert.equal(generated.length, 5);
    assert.equal(new Set(generated.map(user => user.password)).size, 5);
    for (const user of generated) {
      const row = (await pool.query('SELECT password_hash FROM app_user WHERE username=$1', [user.username])).rows[0];
      assert.ok(await verifyPassword(user.password, row.password_hash), 'Generated credentials must match stored hashes');
      assert.ok(!result.output.includes(user.password), 'Passwords must not be printed');
    }
    if (process.platform !== 'win32') assert.equal((await stat(credentials)).mode & 0o777, 0o600);
  });
  await test('fresh database credentials authenticate every seeded role through real HTTP login/logout', async () => {
    const listener = createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    app = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: root, env: { ...process.env, DATABASE_URL: url.href, SESSION_COOKIE_SECURE: 'false' },
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (app.exitCode !== null) throw new Error('Fresh-database application process exited');
      try { ready = (await fetch(base + '/api/auth/me')).ok; } catch { /* Wait for local startup. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Fresh-database application must become ready');
    for (const user of generated) {
      const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
      assert.equal(r.status, 200, 'Generated credentials must log in via the API');
      const cookie = r.headers.get('set-cookie').split(';')[0];
      const current = await (await fetch(base + '/api/auth/me', { headers: { Cookie: cookie } })).json();
      assert.equal(current.user.username, user.username);
      const expected = (await pool.query('SELECT r.role_name FROM app_user u JOIN role r USING(role_id) WHERE username=$1', [user.username])).rows[0];
      assert.equal(current.user.role_name, expected.role_name);
      assert.equal((await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } })).status, 200);
      assert.equal((await (await fetch(base + '/api/auth/me', { headers: { Cookie: cookie } })).json()).user, null);
    }
    const bad = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: generated[0].username, password: 'not-the-generated-password' }) });
    assert.equal(bad.status, 401);
  });
  const initialized = await originalHashes();
  const fileBefore = await readFile(credentials, 'utf8');
  await test('rerunning initialization preserves initialized hashes and the private file', async () => {
    assert.equal(initialize(credentials).status, 0);
    assert.deepEqual(await originalHashes(), initialized);
    assert.equal(await readFile(credentials, 'utf8'), fileBefore);
  });
  await test('a lost credentials file does not silently reset initialized passwords', async () => {
    const file = path.join(directory, 'not-recovered.json');
    const result = initialize(file);
    assert.equal(result.status, 0);
    assert.match(result.output, /cannot be recovered from hashes/);
    assert.ok(await absent(file));
    assert.deepEqual(await originalHashes(), initialized);
  });
  await pool.query("INSERT INTO app_user(username,password_hash,full_name,email,role_id) VALUES('init_pending','!uninitialized','Initialization Test','init-pending@example.invalid',2)");
  await pool.query(`CREATE FUNCTION fail_init_commit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Controlled initialization commit failure'; END $$`);
  await pool.query(`CREATE CONSTRAINT TRIGGER fail_init_commit AFTER UPDATE ON app_user DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fail_init_commit()`);
  await test('commit failure rolls back hashes and removes only the newly created credential file', async () => {
    const before = await originalHashes();
    const file = path.join(directory, 'commit-failure.json');
    assert.notEqual(initialize(file).status, 0);
    assert.ok(await absent(file));
    assert.deepEqual(await originalHashes(), before);
    assert.equal(await readFile(credentials, 'utf8'), fileBefore);
  });
  await pool.query('DROP TRIGGER fail_init_commit ON app_user');
  await pool.query('DROP FUNCTION fail_init_commit()');
  await test('partial initialization changes only pending accounts', async () => {
    const file = path.join(directory, 'pending.json');
    const result = initialize(file);
    assert.equal(result.status, 0);
    const added = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(added.length, 1);
    assert.equal(added[0].username, 'init_pending');
    assert.ok(!result.output.includes(added[0].password), 'Password must not be printed');
    const row = (await pool.query("SELECT password_hash FROM app_user WHERE username='init_pending'")).rows[0];
    assert.ok(await verifyPassword(added[0].password, row.password_hash));
    assert.deepEqual((await originalHashes()).slice(0, 5), initialized);
  });
} finally {
  if (app && app.exitCode === null) {
    const exited = once(app, 'exit');
    app.kill();
    await exited;
  }
  if (pool) await pool.end();
  if (createdDatabase) await admin.query(`DROP DATABASE ${databaseName}`);
  await admin.end();
  await rm(directory, { recursive: true, force: true });
}
console.log(`Account initialization: ${passed} passed, ${failed} failed`);
console.log('Windows path semantics were tested; native Windows/NTFS execution requires a Windows host.');
if (failed) process.exitCode = 1;
