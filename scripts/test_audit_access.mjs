import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { database } from './db.mjs';
import { BASE_URL, loginClient } from './test_helpers.mjs';

const pool = database();
const owner = await loginClient('Student');
const other = await loginClient('OtherStudent');
const faculty = await loginClient('Faculty');
const admin = await loginClient('Admin');
const anonymous = (url, options) => fetch(new URL(url, BASE_URL), options);
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let projectId;
let passed = 0, failed = 0;
async function test(name, run) {
  try { await run(); passed++; console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, error.message); }
}
function privateResponse(response) {
  assert.match(response.headers.get('cache-control'), /private/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.match(response.headers.get('vary'), /cookie/i);
}
try {
  const response = await owner.request('/api/projects', json({ title: 'Audit access regression history', problem_statement: 'Preserve historical values for authorized reviewers without exposing them publicly.', domain_ids: [1] }));
  assert.equal(response.status, 201);
  projectId = (await response.json()).project.project_id;
  const edited = await owner.request('/api/projects/' + projectId, { ...json({ title: 'Audit access current title', problem_statement: 'Preserve historical values for authorized reviewers without exposing them publicly.', domain_ids: [1] }), method: 'PUT' });
  assert.equal(edited.status, 200);

  for (const [name, request, authorized] of [
    ['anonymous', anonymous, false], ['owner', owner.request, true], ['other Student', other.request, false],
    ['Faculty', faculty.request, true], ['Admin', admin.request, true],
  ]) {
    await test(`${name}: public project and reviews remain readable; audit history follows permission`, async () => {
      const r = await request(`/api/projects/${projectId}?student_id=2&role=Admin`);
      assert.equal(r.status, 200);
      privateResponse(r);
      const data = await r.json();
      assert.equal(data.project.title, 'Audit access current title');
      assert.ok(Array.isArray(data.reviews));
      assert.equal(data.canViewAudit, authorized);
      if (authorized) {
        assert.ok(data.auditHistory.some(row => row.old_values?.title === 'Audit access regression history'));
      } else {
        assert.deepEqual(data.auditHistory, []);
        assert.ok(!JSON.stringify(data).includes('old_values'));
        assert.ok(!JSON.stringify(data).includes('Audit access regression history'));
      }
    });
    await test(`${name}: statistics remain public; only Admin receives the global audit feed`, async () => {
      const r = await request('/api/stats');
      assert.equal(r.status, 200);
      privateResponse(r);
      const data = await r.json();
      assert.ok(data.stats.total_projects >= 6);
      assert.ok(data.domains.length >= 6);
      assert.equal(data.canViewAudit, name === 'Admin');
      if (name === 'Admin') assert.ok(data.recentAudit.length > 0);
      else {
        assert.deepEqual(data.recentAudit, []);
        assert.ok(!JSON.stringify(data).includes('old_values'));
      }
    });
  }
  await test('fabricated cookies cannot authorize either audit feed', async () => {
    for (const url of ['/api/stats', `/api/projects/${projectId}`]) {
      const r = await anonymous(url, { headers: { Cookie: 'researchx_session=' + 'a'.repeat(64) } });
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.equal(data.canViewAudit, false);
      assert.deepEqual(data.recentAudit || data.auditHistory, []);
    }
  });
  await test('expired session cannot read project history or global feed', async () => {
    const client = await loginClient('Admin');
    const hash = createHash('sha256').update(client.cookie.split('=')[1]).digest('hex');
    await pool.query("UPDATE auth_session SET created_at=NOW()-INTERVAL '9 hours',expires_at=NOW()-INTERVAL '1 hour' WHERE token_hash=$1", [hash]);
    for (const url of ['/api/stats', `/api/projects/${projectId}`]) {
      const r = await client.request(url);
      assert.equal(r.status, 200);
      assert.equal((await r.json()).canViewAudit, false);
    }
  });
  await test('logout invalidates history access without making project browsing private', async () => {
    await owner.request('/api/auth/logout', { method: 'POST' });
    const r = await owner.request('/api/projects/' + projectId);
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.canViewAudit, false);
    assert.deepEqual(data.auditHistory, []);
  });
  await test('deleted-project snapshots stay out of non-Admin statistics', async () => {
    assert.equal((await admin.request('/api/projects/' + projectId, { method: 'DELETE' })).status, 200);
    const r = await other.request('/api/stats');
    assert.deepEqual((await r.json()).recentAudit, []);
    assert.equal((await anonymous('/api/projects/' + projectId)).status, 404);
  });
} finally {
  if (projectId) await pool.query('DELETE FROM project WHERE project_id=$1', [projectId]);
  await pool.end();
}
console.log(`Audit access: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
