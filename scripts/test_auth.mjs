import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { database } from './db.mjs';
import { BASE_URL, demoAccount, loginClient } from './test_helpers.mjs';
const pool = database();
let passed = 0, failed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log('PASS', name); } catch (e) { failed++; console.error('FAIL',name,e.message); } }
const json = body => ({ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) });
const payload = { title:'Level 3 authorization regression', problem_statement:'Authenticate ownership before changing relational records and semantic vectors.', domain_ids:[1] };
const student=await loginClient('Student'), other=await loginClient('OtherStudent'), faculty=await loginClient('Faculty'), admin=await loginClient('Admin');
let projectId;
try {
 await test('invalid password and unknown account return identical generic errors',async()=>{
  const account=await demoAccount('Student');
  const a=await fetch(BASE_URL+'/api/auth/login',json({...account,password:'wrong-password'}));
  const b=await fetch(BASE_URL+'/api/auth/login',json({username:'nonexistent-test-account',password:'wrong-password'}));
  assert.equal(a.status,401);assert.equal(b.status,401);assert.deepEqual(await a.json(),await b.json());
 });
 await test('session cookie is HTTP-only, SameSite Lax, scoped and time-limited',async()=>{
  assert.match(student.setCookie,/HttpOnly/i);assert.match(student.setCookie,/SameSite=lax/i);assert.match(student.setCookie,/Path=\//i);assert.match(student.setCookie,/Max-Age=28800/i);
  if(process.env.SESSION_COOKIE_SECURE!=='false') assert.match(student.setCookie,/; Secure/i);
 });
 await test('only SHA256 token hashes are persisted',async()=>{
  const token=student.cookie.split('=')[1];const hash=createHash('sha256').update(token).digest('hex');
  assert.equal((await pool.query('SELECT count(*)::int n FROM auth_session WHERE token_hash=$1',[hash])).rows[0].n,1);
  assert.equal((await pool.query('SELECT count(*)::int n FROM auth_session WHERE token_hash=$1',[token])).rows[0].n,0);
 });
 await test('unauthenticated mutations and user directory are blocked',async()=>{
  for(const [url,init] of [['/api/projects',json(payload)],['/api/projects/1',{method:'DELETE'}],['/api/projects/1/review',json({decision:'Approved'})],['/api/openalex/save',json({title:'Forbidden paper'})],['/api/papers/1',{method:'DELETE'}],['/api/users',{}]])assert.equal((await fetch(BASE_URL+url,init)).status,401,url);
 });
 await test('public discovery, catalogues and semantic search remain accessible',async()=>{
  for(const path of ['/api/projects','/api/papers','/api/domains','/api/stats'])assert.equal((await fetch(BASE_URL+path)).status,200);
  assert.equal((await fetch(BASE_URL+'/api/similarity',json({projectId:1}))).status,200);
 });
 await test('account directory is admin-only and excludes hashes',async()=>{
  assert.equal((await student.request('/api/users')).status,403);
  const r=await admin.request('/api/users');assert.equal(r.status,200);assert.ok(!(await r.text()).includes('password_hash'));
 });
 await test('student cannot impersonate another creator or role',async()=>{
  const r=await student.request('/api/projects',json({...payload,student_id:3,role:'Admin'}));assert.equal(r.status,201);
  projectId=(await r.json()).project.project_id;
  const row=(await pool.query('SELECT student_id FROM project WHERE project_id=$1',[projectId])).rows[0];assert.equal(row.student_id,2);
 });
 await test('other students cannot update or delete this project',async()=>{
  assert.equal((await other.request('/api/projects/'+projectId,{...json(payload),method:'PUT'})).status,403);
  assert.equal((await other.request('/api/projects/'+projectId,{method:'DELETE'})).status,403);
 });
 await test('faculty cannot create, edit or delete student projects',async()=>{
  assert.equal((await faculty.request('/api/projects',json(payload))).status,403);
  assert.equal((await faculty.request('/api/projects/'+projectId,{...json(payload),method:'PUT'})).status,403);
  assert.equal((await faculty.request('/api/projects/'+projectId,{method:'DELETE'})).status,403);
 });
 await test('student cannot escalate to faculty by forged review payload',async()=>{
  assert.equal((await student.request(`/api/projects/${projectId}/review`,json({faculty_id:4,role:'Faculty',decision:'Approved'}))).status,403);
 });
 await test('faculty reviewer is always derived from session',async()=>{
  const r=await faculty.request(`/api/projects/${projectId}/review`,json({faculty_id:5,decision:'Approved',comments:'Session-based faculty review'}));assert.equal(r.status,200);assert.equal((await r.json()).project.approved_by,4);
 });
 await test('owner can edit; creator and approval cannot be overwritten',async()=>{
  assert.equal((await student.request('/api/projects/'+projectId,{...json({...payload,title:'Level 3 updated authorization regression',student_id:3,status:'Rejected',approved_by:5}),method:'PUT'})).status,200);
  const row=(await pool.query('SELECT student_id,status,approved_by FROM project WHERE project_id=$1',[projectId])).rows[0];assert.deepEqual(row,{student_id:2,status:'Approved',approved_by:4});
 });
 await test('invalid bodies and SQL-like identifiers are rejected without internal details',async()=>{
  for(const bad of [{...payload,title:123},{...payload,description:[]},{...payload,domain_ids:['1 OR 1=1']},{...payload,title:'   '},{...payload,problem_statement:'short'}])assert.equal((await student.request('/api/projects',json(bad))).status,400);
  const r=await student.request('/api/projects',json({...payload,domain_ids:[2147483647]}));assert.equal(r.status,400);assert.ok(!(await r.text()).includes('project_domain'));
  assert.equal((await student.request('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:'null'})).status,400);
 });
 await test('origin checks reject cross-site login and writes',async()=>{
  const account=await demoAccount('Student');assert.equal((await fetch(BASE_URL+'/api/auth/login',{...json(account),headers:{'Content-Type':'application/json',Origin:'https://evil.invalid'}})).status,403);
  assert.equal((await student.request('/api/projects/'+projectId,{method:'DELETE',headers:{Origin:'https://evil.invalid'}})).status,403);
 });
 await test('shared paper deletion requires Admin',async()=>{
  assert.equal((await student.request('/api/papers/1',{method:'DELETE'})).status,403);assert.equal((await faculty.request('/api/papers/1',{method:'DELETE'})).status,403);
 });
 await test('expired sessions cannot authenticate',async()=>{
  const c=await loginClient('OtherStudent');const hash=createHash('sha256').update(c.cookie.split('=')[1]).digest('hex');await pool.query("UPDATE auth_session SET created_at=NOW()-INTERVAL '9 hours',expires_at=NOW()-INTERVAL '1 hour' WHERE token_hash=$1",[hash]);
  assert.equal((await c.request('/api/projects',json(payload))).status,401);
 });
 await test('logout revokes the server session and blocks replay',async()=>{
  const c=await loginClient('OtherStudent');assert.equal((await c.request('/api/auth/logout',{method:'POST'})).status,200);assert.equal((await c.request('/api/projects',json(payload))).status,401);
 });
 await test('fabricated session cookies are rejected',async()=>{
  assert.equal((await fetch(BASE_URL+'/api/projects',{...json(payload),headers:{'Content-Type':'application/json',Cookie:'researchx_session='+'a'.repeat(64)}})).status,401);
 });
 await test('Admin can maintain projects without impersonation',async()=>{
  assert.equal((await admin.request('/api/projects/'+projectId,{...json(payload),method:'PUT'})).status,200);
 });
 await test('owner deletion cascades relational records and embeddings',async()=>{
  assert.equal((await student.request('/api/projects/'+projectId,{method:'DELETE'})).status,200);
  for(const table of ['project_domain','project_review'])assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table} WHERE project_id=$1`,[projectId])).rows[0].n,0);
  assert.equal((await pool.query("SELECT count(*)::int n FROM embedding_ref WHERE entity_type='PROJECT' AND entity_id=$1",[projectId])).rows[0].n,0);
 });
 await test('login attempts are throttled persistently',async()=>{
  const username='throttle-'+Date.now();
  try { for(let i=0;i<10;i++)assert.equal((await fetch(BASE_URL+'/api/auth/login',json({username,password:'wrong-password'}))).status,401);
  assert.equal((await fetch(BASE_URL+'/api/auth/login',json({username,password:'wrong-password'}))).status,429);
  } finally {await pool.query('DELETE FROM auth_login_attempt WHERE username=$1',[username]);}
 });
 await test('password hashes use distinct salts and no dummy hashes remain',async()=>{
  const hashes=(await pool.query('SELECT password_hash FROM app_user')).rows.map(r=>r.password_hash);assert.ok(hashes.every(h=>h.startsWith('scrypt$32768$8$1$')));assert.equal(new Set(hashes).size,hashes.length);
 });
} finally {
 if(projectId)await pool.query('DELETE FROM project WHERE project_id=$1',[projectId]);
 await pool.end();
}
console.log(`Authentication: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
