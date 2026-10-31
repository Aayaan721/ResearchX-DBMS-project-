// scripts/generate_evidence.mjs
import fs from 'fs';
import { execSync } from 'child_process';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres@127.0.0.1:5432/researchx',
});

async function run() {
  console.log('Generating comprehensive evidence files in docs/evidence/...');

  // 1. Schema & Table structure
  console.log('1. Dumping schema and table definitions...');
  const tables = [
    'role', 'app_user', 'domain', 'project', 'project_domain',
    'research_paper', 'author', 'paper_author', 'project_review',
    'audit_log', 'embedding_ref'
  ];

  let schemaEvidence = '=== RESEARCHX POSTGRESQL 16 + PGVECTOR SCHEMA DEFINITIONS ===\n\n';
  const tableListRes = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
  );
  schemaEvidence += 'TABLE LIST:\n' + JSON.stringify(tableListRes.rows.map(r => r.table_name), null, 2) + '\n\n';

  for (const tbl of tables) {
    const colRes = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position;`,
      [tbl]
    );
    schemaEvidence += `--- TABLE: ${tbl} ---\n`;
    for (const c of colRes.rows) {
      schemaEvidence += `  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(20)} NULLABLE: ${c.is_nullable}  DEFAULT: ${c.column_default || 'NONE'}\n`;
    }
    schemaEvidence += '\n';
  }

  // Extensions
  const extRes = await pool.query('SELECT extname, extversion FROM pg_extension;');
  schemaEvidence += 'INSTALLED EXTENSIONS:\n' + JSON.stringify(extRes.rows, null, 2) + '\n';
  fs.writeFileSync('docs/evidence/01_schema_and_tables.txt', schemaEvidence);

  // 2. DML Row Counts
  console.log('2. Recording row counts across all tables...');
  let countsEvidence = '=== RESEARCHX TABLE RECORD COUNTS ===\n\n';
  for (const tbl of tables) {
    const cntRes = await pool.query(`SELECT COUNT(*) as count FROM ${tbl};`);
    countsEvidence += `${tbl.padEnd(20)} : ${cntRes.rows[0].count} rows\n`;
  }
  fs.writeFileSync('docs/evidence/02_table_row_counts.txt', countsEvidence);

  // 3. DBMS Queries (7.1 to 7.6)
  console.log('3. Executing queries.sql and saving output...');
  try {
    const qOutput = execSync(
      `psql -U postgres -d researchx -f database/queries.sql`,
      { encoding: 'utf-8', env: { ...process.env, PATH: `C:\\Users\\aayaa\\tools\\pgsql\\pgsql\\bin;${process.env.PATH}` } }
    );
    fs.writeFileSync('docs/evidence/03_queries_7_1_to_7_6.txt', qOutput);
  } catch (err) {
    console.error('Failed to run psql queries:', err);
  }

  // 4. Stored Procedure & Trigger Audit
  console.log('4. Verifying stored procedure sp_review_and_approve_project & trigger...');
  let spEvidence = '=== STORED PROCEDURE & TRIGGER AUDIT VERIFICATION ===\n\n';
  // Check trigger definition
  const trgRes = await pool.query(
    `SELECT trigger_name, event_manipulation, event_object_table, action_statement 
     FROM information_schema.triggers 
     WHERE trigger_schema = 'public';`
  );
  spEvidence += 'TRIGGERS IN DATABASE:\n' + JSON.stringify(trgRes.rows, null, 2) + '\n\n';

  // Check audit_log rows
  const auditRes = await pool.query(
    `SELECT log_id, table_name, action, record_id, old_values, new_values, changed_at 
     FROM audit_log 
     ORDER BY changed_at DESC 
     LIMIT 5;`
  );
  spEvidence += 'RECENT AUDIT LOG ENTRIES CAPTURED BY TRIGGER:\n' + JSON.stringify(auditRes.rows, null, 2) + '\n\n';

  // Check project_review rows
  const revRes = await pool.query(
    `SELECT pr.review_id, pr.project_id, u.full_name AS faculty_name, pr.decision, pr.comments, pr.review_date
     FROM project_review pr
     JOIN app_user u ON pr.faculty_id = u.user_id
     ORDER BY pr.review_date DESC;`
  );
  spEvidence += 'FACULTY REVIEWS RECORDED VIA PROCEDURE sp_review_and_approve_project:\n' + JSON.stringify(revRes.rows, null, 2) + '\n';
  fs.writeFileSync('docs/evidence/04_stored_procedure_and_trigger.txt', spEvidence);

  // 5. pgvector Similarity Queries
  console.log('5. Executing vector similarity search demonstration...');
  let vecEvidence = '=== PGVECTOR COSINE SIMILARITY SEARCH DEMONSTRATION ===\n\n';
  const targetProjRes = await pool.query(
    `WITH target_vector AS (
        SELECT embedding FROM embedding_ref WHERE entity_type = 'PROJECT' AND entity_id = 1
     )
     SELECT 
        er.entity_type,
        er.entity_id,
        CASE WHEN er.entity_type = 'PROJECT' THEN p.title ELSE rp.title END AS title,
        ROUND((1 - (er.embedding <=> tv.embedding))::numeric, 4) AS cosine_similarity,
        CASE 
          WHEN 1 - (er.embedding <=> tv.embedding) >= 0.65 THEN 'Strong Match'
          WHEN 1 - (er.embedding <=> tv.embedding) >= 0.35 THEN 'Moderate Alignment'
          ELSE 'Low Similarity'
        END AS qualitative_alignment
     FROM target_vector tv
     CROSS JOIN embedding_ref er
     LEFT JOIN project p ON er.entity_type = 'PROJECT' AND er.entity_id = p.project_id
     LEFT JOIN research_paper rp ON er.entity_type = 'RESEARCH_PAPER' AND er.entity_id = rp.paper_id
     WHERE NOT (er.entity_type = 'PROJECT' AND er.entity_id = 1)
     ORDER BY er.embedding <=> tv.embedding ASC
     LIMIT 8;`
  );
  vecEvidence += 'Cosine similarity to Project #1 ("ResearchX: Intelligent Research Discovery & Project Similarity Platform"):\n';
  vecEvidence += JSON.stringify(targetProjRes.rows, null, 2) + '\n\n';
  fs.writeFileSync('docs/evidence/05_pgvector_similarity_queries.txt', vecEvidence);

  // 6. Automated Integration Test Suite
  console.log('6. Running test suite and saving output...');
  try {
    const testOutput = execSync(
      `node scripts/test_platform.mjs`,
      { encoding: 'utf-8', env: { ...process.env, PATH: `C:\\Users\\aayaa\\tools\\node;C:\\Users\\aayaa\\tools\\pgsql\\pgsql\\bin;${process.env.PATH}` } }
    );
    fs.writeFileSync('docs/evidence/06_automated_integration_tests.txt', testOutput);
  } catch (err) {
    fs.writeFileSync('docs/evidence/06_automated_integration_tests.txt', err.stdout || err.message);
  }

  // 7. Verify HTTP rendered HTML
  console.log('7. Verifying Next.js server page responses...');
  let httpEvidence = '=== NEXT.JS LIVE HTTP PAGE RESPONSE EVIDENCE ===\n\n';
  const endpoints = ['/', '/projects', '/discover', '/papers', '/similarity', '/api/stats'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:3000${ep}`);
      const body = await res.text();
      httpEvidence += `ENDPOINT: ${ep} | STATUS: ${res.status} | LENGTH: ${body.length} bytes\n`;
      httpEvidence += `SNIPPET:\n${body.slice(0, 300)}...\n\n`;
    } catch (e) {
      httpEvidence += `ENDPOINT: ${ep} | ERROR: ${e.message}\n\n`;
    }
  }
  fs.writeFileSync('docs/evidence/07_http_pages_html_evidence.txt', httpEvidence);

  await pool.end();
  console.log('All evidence artifacts successfully created in docs/evidence/!');
}

run().catch(console.error);
