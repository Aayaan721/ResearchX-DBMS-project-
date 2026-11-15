import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database } from './db.mjs';
const pool=database(), c=await pool.connect();
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}
async function rejects(sql,params,code){
 await c.query('SAVEPOINT invalid_input');
 let error;
 try {await c.query(sql,params)}catch(e){error=e}
 await c.query('ROLLBACK TO SAVEPOINT invalid_input');
 assert.equal(error?.code,code,'PostgreSQL must reject the invalid record');
}
try {
 await test('migration reapplication is idempotent',async()=>{
  const sql=await readFile(new URL('../database/migrations/001_level3.sql',import.meta.url),'utf8');await c.query(sql);await c.query(sql);
 });
 await c.query('BEGIN');
 for(const [name,title,problem] of [['empty title','','A meaningful problem statement'],['spaces title','   ','A meaningful problem statement'],['whitespace title','\t\n','A meaningful problem statement'],['oversized title','x'.repeat(256),'A meaningful problem statement'],['short problem','Valid title','short'],['blank problem','Valid title',' '.repeat(20)]]){
  await test('DB rejects '+name,()=>rejects('INSERT INTO project(student_id,title,problem_statement) VALUES(2,$1,$2)',[title,problem],'23514'));
 }
 await test('DB rejects invalid status',()=>rejects("INSERT INTO project(student_id,title,problem_statement,status) VALUES(2,'Valid title','A meaningful problem statement','Invalid')",[],'23514'));
 await test('DB rejects invalid review decision',()=>rejects("INSERT INTO project_review(project_id,faculty_id,decision) VALUES(1,4,'Invalid')",[],'23514'));
 await test('DB rejects invalid foreign key',()=>rejects("INSERT INTO project(student_id,title,problem_statement) VALUES(2147483647,'Valid title','A meaningful problem statement')",[],'23503'));
 await test('DB rejects blank research-paper title',()=>rejects("INSERT INTO research_paper(title) VALUES('   ')",[],'23514'));
 await test('DB rejects orphan project embeddings',()=>rejects("INSERT INTO embedding_ref(entity_type,entity_id,embedding) SELECT 'PROJECT',2147483647,embedding FROM embedding_ref LIMIT 1",[],'23503'));
 await test('DB rejects orphan paper embeddings',()=>rejects("INSERT INTO embedding_ref(entity_type,entity_id,embedding) SELECT 'RESEARCH_PAPER',2147483647,embedding FROM embedding_ref LIMIT 1",[],'23503'));
 await test('DB rejects retargeting a vector to a missing parent',()=>rejects("UPDATE embedding_ref SET entity_id=2147483647 WHERE embedding_id=(SELECT min(embedding_id) FROM embedding_ref)",[],'23503'));
 await test('DB prevents parent-key changes that strand vectors',()=>rejects('UPDATE research_paper SET paper_id=2147483647 WHERE paper_id=1',[],'23503'));
 await test('DB rejects negative citations',()=>rejects("INSERT INTO research_paper(title,cited_by_count) VALUES('Valid title',-1)",[],'23514'));
 await test('views agree with base relations',async()=>{
  const r=(await c.query('SELECT (SELECT count(*) FROM project)=(SELECT count(*) FROM v_project_overview) matches')).rows[0];assert.equal(r.matches,true);
  const ds=(await c.query('SELECT (SELECT sum(total_projects) FROM v_domain_statistics)=(SELECT count(*) FROM project_domain) matches')).rows[0];assert.equal(ds.matches,true);
 });
 await test('real vectors and HNSW cosine index are present',async()=>{
  const vectors=(await c.query('SELECT vector_dims(embedding) dims,vector_norm(embedding) norm,1-(embedding<=>embedding) self FROM embedding_ref')).rows;assert.ok(vectors.length>=11);
  for(const v of vectors){assert.equal(v.dims,384);assert.ok(Math.abs(v.norm-1)<1e-5);assert.ok(Math.abs(v.self-1)<1e-5)}
  assert.ok((await c.query("SELECT indexdef FROM pg_indexes WHERE tablename='embedding_ref'")).rows.some(r=>r.indexdef.includes('hnsw')&&r.indexdef.includes('vector_cosine_ops')));
 });
 await test('timestamp, audit triggers and stored review procedure execute atomically',async()=>{
  await c.query('SAVEPOINT trigger_demo');
  const id=(await c.query("INSERT INTO project(student_id,title,problem_statement) VALUES(2,'Level 3 database trigger test','Verify trigger and review procedure effects') RETURNING project_id")).rows[0].project_id;
  await c.query("UPDATE project SET title='Level 3 updated trigger test',updated_at='2000-01-01' WHERE project_id=$1",[id]);
  assert.ok((await c.query('SELECT updated_at FROM project WHERE project_id=$1',[id])).rows[0].updated_at.getFullYear()>2000);
  await c.query("CALL sp_review_and_approve_project($1,4,'Approved','Verified in a rolled-back test transaction')",[id]);
  assert.equal((await c.query('SELECT status FROM project WHERE project_id=$1',[id])).rows[0].status,'Approved');
  await c.query('DELETE FROM project WHERE project_id=$1',[id]);
  assert.equal((await c.query('SELECT count(*)::int n FROM project_review WHERE project_id=$1',[id])).rows[0].n,0);
  const actions=(await c.query("SELECT action FROM audit_log WHERE table_name='project' AND record_id=$1",[id])).rows.map(r=>r.action);
  for(const action of ['INSERT','UPDATE','DELETE'])assert.ok(actions.includes(action));
  await c.query('ROLLBACK TO SAVEPOINT trigger_demo');
  assert.equal((await c.query("SELECT count(*)::int n FROM audit_log WHERE table_name='project' AND record_id=$1",[id])).rows[0].n,0);
 });
 await c.query('ROLLBACK');
 await test('CREATE, ALTER, DROP and temporary relationship/view examples execute safely',async()=>{
  await c.query(await readFile(new URL('../database/ddl_demonstration.sql',import.meta.url),'utf8'));
  assert.equal((await c.query("SELECT to_regclass('pg_temp.ddl_parent') name")).rows[0].name,null);
 });
}finally{await c.query('ROLLBACK');c.release();await pool.end()}
console.log(`Database integrity: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
