// scripts/test_platform.mjs
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log(' ResearchX Automated Platform & DBMS Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      await fn();
      console.log('PASSED [OK]');
      passed++;
    } catch (err) {
      console.log('FAILED [X]');
      console.error('   Error:', err.message);
      failed++;
    }
  }

  let createdProjectId = null;
  let savedPaperId = null;

  // 1. Stats API
  await test('GET /api/stats (Platform statistics & domains)', async () => {
    const res = await fetch(`${BASE_URL}/api/stats`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.stats, 'Stats object present');
    assert.ok(data.stats.total_projects >= 6, 'Seed projects counted');
    assert.ok(data.stats.total_embeddings >= 11, 'Seed embeddings counted');
    assert.ok(data.domains.length >= 6, 'Domains returned');
  });

  // 2. Users API
  await test('GET /api/users (Demo students and faculty)', async () => {
    const res = await fetch(`${BASE_URL}/api/users`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.students.length >= 2, 'Students loaded');
    assert.ok(data.faculty.length >= 2, 'Faculty reviewers loaded');
  });

  // 3. Domains API
  await test('GET /api/domains (Research taxonomy)', async () => {
    const res = await fetch(`${BASE_URL}/api/domains`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.domains.length >= 6, 'All domains loaded');
  });

  // 4. Projects List API
  await test('GET /api/projects (Filter and list)', async () => {
    const res = await fetch(`${BASE_URL}/api/projects?status=Approved`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.projects));
    assert.ok(data.projects.length >= 3, 'Approved projects found');
  });

  // 5. Create Project with MiniLM Vector Embedding
  await test('POST /api/projects (Insert project and generate 384-d pgvector embedding)', async () => {
    const payload = {
      title: 'AutoIndex: Dynamic Vector Clustering for Multi-Tenant Databases',
      problem_statement: 'High concurrency queries in multi-tenant cloud databases degrade HNSW graph index cache locality.',
      description: 'Proposes an adaptive k-means centroid partitioning strategy inside PostgreSQL to isolate tenant vector subspaces.',
      student_id: 2,
      domain_ids: [1, 3],
    };
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.project.project_id);
    assert.strictEqual(data.embeddingStatus, 'indexed');
    createdProjectId = data.project.project_id;
  });

  // 6. Project Details & Audit Trail
  await test(`GET /api/projects/:id (Fetch created project & trigger audit)`, async () => {
    assert.ok(createdProjectId, 'Created project ID required');
    const res = await fetch(`${BASE_URL}/api/projects/${createdProjectId}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.project.title, 'AutoIndex: Dynamic Vector Clustering for Multi-Tenant Databases');
    assert.strictEqual(data.project.status, 'Pending');
    assert.ok(data.auditHistory.length >= 1, 'Audit log created by trigger');
  });

  // 7. Stored Procedure sp_review_and_approve_project
  await test(`POST /api/projects/:id/review (Execute sp_review_and_approve_project)`, async () => {
    assert.ok(createdProjectId, 'Created project ID required');
    const res = await fetch(`${BASE_URL}/api/projects/${createdProjectId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faculty_id: 4, // Dr. Shilpa S
        decision: 'Approved',
        comments: 'Novel multi-tenant vector partitioning methodology. Approved for pilot implementation.',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.project.status, 'Approved');
    assert.strictEqual(data.project.approved_by, 4);
  });

  // 8. OpenAlex Live API Search
  await test('GET /api/openalex/search (Query real OpenAlex academic works)', async () => {
    const res = await fetch(`${BASE_URL}/api/openalex/search?q=hnsw+vector+similarity&limit=3`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.results));
    assert.ok(data.results.length > 0, 'OpenAlex returned works');
    assert.ok(data.results[0].title, 'Paper has title');
  });

  // 9. Save External OpenAlex Paper to PostgreSQL
  await test('POST /api/openalex/save (Save paper, authors & generate 384-d pgvector)', async () => {
    const timestamp = Date.now();
    const paperPayload = {
      openalex_id: `W_TEST_${timestamp}`,
      title: `Scalable Nearest Neighbor Search in Metric Spaces (Run ${timestamp})`,
      abstract: 'We introduce a hierarchical metric tree index capable of bounding distance computations under cosine and Euclidean metrics.',
      doi: `10.1145/test.openalex.${timestamp}`,
      doi_url: `https://doi.org/10.1145/test.openalex.${timestamp}`,
      publication_year: 2024,
      host_venue: 'ACM SIGMOD 2024',
      cited_by_count: 42,
      authors: [
        { display_name: 'Elena Rostova', affiliation: 'MIT CSAIL' },
        { display_name: 'David K. Smith', affiliation: 'Stanford AI Lab' }
      ],
      keywords: ['metric space', 'nearest neighbor', 'pgvector']
    };

    const res = await fetch(`${BASE_URL}/api/openalex/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paperPayload),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.paper_id);
    assert.strictEqual(data.embeddingStatus, 'indexed');
    savedPaperId = data.paper_id;
  });

  // 10. Saved Papers List API
  await test('GET /api/papers (Verify saved paper in PostgreSQL)', async () => {
    const res = await fetch(`${BASE_URL}/api/papers?search=Scalable+Nearest+Neighbor`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.papers.length >= 1, 'Saved paper retrieved');
    assert.strictEqual(data.papers[0].authors.length, 2, '2 authors resolved and mapped');
  });

  // 11. Semantic Vector Similarity Search (pgvector cosine search)
  await test('POST /api/similarity (Run real pgvector cosine distance search)', async () => {
    const res = await fetch(`${BASE_URL}/api/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queryText: 'vector indexing for high dimensional similarity search in relational databases',
        limit: 5,
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.matches.length > 0, 'pgvector returned similarity matches');
    assert.ok(typeof data.matches[0].similarity_score === 'number', 'Numeric similarity score');
    assert.ok(data.matches[0].similarity_score > 0, 'Valid positive cosine similarity score');
    console.log(`\n      [Top match: "${data.matches[0].title}" | Score: ${(data.matches[0].similarity_score * 100).toFixed(1)}%]`);
  });

  // 12. Delete Test Project and Paper
  await test('DELETE /api/projects/:id (Clean up test project & check CASCADE)', async () => {
    assert.ok(createdProjectId);
    const res = await fetch(`${BASE_URL}/api/projects/${createdProjectId}`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  if (savedPaperId) {
    await test('DELETE /api/papers/:id (Clean up test paper)', async () => {
      const res = await fetch(`${BASE_URL}/api/papers/${savedPaperId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
    });
  }

  console.log('\n====================================================');
  console.log(` Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
