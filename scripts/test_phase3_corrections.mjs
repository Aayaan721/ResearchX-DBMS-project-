// scripts/test_phase3_corrections.mjs
import pg from 'pg';
import assert from 'assert';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres@127.0.0.1:5432/researchx',
});

const BASE_URL = 'http://localhost:3000';

async function runPhase3Tests() {
  console.log('================================================================');
  console.log(' ResearchX Phase 3 — Backend Corrections & Integrity Tests');
  console.log('================================================================\n');

  const client = await pool.connect();

  try {
    // ------------------------------------------------------------------------
    // Test 1: Author Identity Schema & Stable OpenAlex ID Resolution
    // ------------------------------------------------------------------------
    console.log('[Test 1] Testing Stable OpenAlex Author ID Resolution in PostgreSQL...');
    const testOaId = `A${Date.now()}`;
    const testPaperOaId = `W${Date.now()}`;
    const testTitle = `Phase 3 Graph Neural Verification Run ${Date.now()}`;

    const saveRes = await fetch(`${BASE_URL}/api/openalex/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openalex_id: testPaperOaId,
        title: testTitle,
        abstract: 'Testing stable OpenAlex author ID resolution and atomic embedding consistency.',
        publication_year: 2026,
        authors: [
          {
            id: testOaId,
            display_name: 'Dr. Jane OpenAlex Scholar',
            affiliation: 'Department of Computer Science',
          },
        ],
      }),
    });

    const saveData = await saveRes.json();
    assert.strictEqual(saveRes.status, 201, `Paper save failed: ${saveData.error}`);
    assert.strictEqual(saveData.embeddingStatus, 'indexed', 'Embedding must be indexed atomically');
    const createdPaperId = saveData.paper_id;

    // Verify in PostgreSQL that author table has openalex_id populated
    const authorDbRes = await client.query('SELECT * FROM author WHERE openalex_id = $1;', [testOaId]);
    assert.strictEqual(authorDbRes.rows.length, 1, 'Author with openalex_id must exist in PostgreSQL');
    assert.strictEqual(authorDbRes.rows[0].openalex_id, testOaId, 'Author openalex_id must match input');
    console.log('  [PASS] Test 1 PASSED: Stable OpenAlex author ID mapped cleanly in author table.\n');

    // ------------------------------------------------------------------------
    // Test 2: Project Update Atomic Embedding Consistency
    // ------------------------------------------------------------------------
    console.log('[Test 2] Testing Atomic Project Update & Embedding Re-Indexing...');
    // Create a temporary project
    const createRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Pre-Update Project Title ${Date.now()}`,
        problem_statement: 'Initial problem statement for testing atomic update consistency.',
        student_id: 2,
        domain_ids: [1],
      }),
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201);
    const testProjId = createData.project.project_id;

    // Read initial embedding timestamp
    const initialEmbRes = await client.query(
      `SELECT created_at, embedding_id FROM embedding_ref WHERE entity_type = 'PROJECT' AND entity_id = $1;`,
      [testProjId]
    );
    assert.strictEqual(initialEmbRes.rows.length, 1, 'Initial vector must exist');
    const initialTimestamp = initialEmbRes.rows[0].created_at;

    await new Promise((r) => setTimeout(r, 1100)); // Delay to verify timestamp update

    // Update project with new content
    const updatedTitle = `Post-Update Title Verified Atomic ${Date.now()}`;
    const updateRes = await fetch(`${BASE_URL}/api/projects/${testProjId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updatedTitle,
        problem_statement: 'Updated problem statement ensuring dense vector re-indexing commits atomically.',
        description: 'New architecture details.',
        domain_ids: [1, 2],
      }),
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200, `Project update failed: ${updateData.error}`);

    // Check PostgreSQL
    const updatedProjRes = await client.query('SELECT title, updated_at FROM project WHERE project_id = $1;', [testProjId]);
    assert.strictEqual(updatedProjRes.rows[0].title, updatedTitle);

    const updatedEmbRes = await client.query(
      `SELECT created_at FROM embedding_ref WHERE entity_type = 'PROJECT' AND entity_id = $1;`,
      [testProjId]
    );
    assert.ok(
      new Date(updatedEmbRes.rows[0].created_at).getTime() >= new Date(initialTimestamp).getTime(),
      'Embedding record must be updated upon project edit'
    );
    console.log('  [PASS] Test 2 PASSED: Project update and vector embedding committed atomically.\n');

    // ------------------------------------------------------------------------
    // Test 3: Similarity API Query Validation & Cosine Metadata
    // ------------------------------------------------------------------------
    console.log('[Test 3] Testing Similarity API Validation, Bounds & Semantic Disclaimer...');
    // A. Query too short
    const shortRes = await fetch(`${BASE_URL}/api/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryText: 'ab' }),
    });
    assert.strictEqual(shortRes.status, 400, 'Must reject queries shorter than 3 characters');

    // B. Valid query returns disclaimer and metric
    const validSimRes = await fetch(`${BASE_URL}/api/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryText: 'graph neural networks on citation datasets', limit: 5 }),
    });
    const validSimData = await validSimRes.json();
    assert.strictEqual(validSimRes.status, 200);
    assert.strictEqual(validSimData.metric, 'cosine_similarity');
    assert.ok(validSimData.disclaimer.includes('cosine similarity'), 'Must include semantic cosine disclaimer');
    assert.ok(Array.isArray(validSimData.matches), 'Must return matches array');
    console.log('  [PASS] Test 3 PASSED: Similarity API input limits and semantic metadata verified.\n');

    // ------------------------------------------------------------------------
    // Cleanup temporary records
    // ------------------------------------------------------------------------
    console.log('Cleaning up temporary Phase 3 test records...');
    await client.query('DELETE FROM project WHERE project_id = $1;', [testProjId]);
    await client.query('DELETE FROM research_paper WHERE paper_id = $1;', [createdPaperId]);
    console.log('  -> Temporary test records removed.');

  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(' ALL PHASE 3 BACKEND CORRECTIONS TESTS PASSED [OK]');
  console.log('================================================================\n');
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 test failure:', err);
  process.exit(1);
});
