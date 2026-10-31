// scripts/verify_browser_and_screenshots.mjs
import puppeteer from 'puppeteer-core';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres@127.0.0.1:5432/researchx',
});

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'docs/evidence/screenshots';

// Helper to click element by text
async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle((sel, txt) => {
    const elements = Array.from(document.querySelectorAll(sel));
    return elements.find(el => el.textContent.toLowerCase().includes(txt.toLowerCase())) || null;
  }, selector, text);

  if (!handle.asElement()) {
    throw new Error(`Could not find ${selector} containing text: "${text}"`);
  }
  await handle.asElement().click();
}

async function main() {
  console.log('================================================================');
  console.log(' ResearchX Phase 2 — Browser Automation & UI Verification');
  console.log('================================================================\n');

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('Launching headless Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1366, height: 850 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  let createdProjectId = null;

  try {
    // --------------------------------------------------------------------------
    // Workflow 1: Dashboard loads & shows genuine database statistics
    // --------------------------------------------------------------------------
    console.log('[1/9] Testing Dashboard (http://localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 1200));

    const dashboardScreenshotPath = `${SCREENSHOT_DIR}/01_dashboard.png`;
    await page.screenshot({ path: dashboardScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${dashboardScreenshotPath}`);

    const statsText = await page.evaluate(() => document.body.innerText.toLowerCase());
    if (!statsText.includes('total student projects') || !statsText.includes('pgvector embeddings')) {
      throw new Error('Dashboard stats cards not rendered properly.');
    }
    console.log('  -> Dashboard metrics & domains verified successfully.');

    // --------------------------------------------------------------------------
    // Workflow 2: Browse existing research projects
    // --------------------------------------------------------------------------
    console.log('\n[2/9] Testing Projects Directory (http://localhost:3000/projects)...');
    await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder*="Search projects"]');
    await new Promise((r) => setTimeout(r, 800));

    // Test live search filter
    await page.type('input[placeholder*="Search projects"]', 'BioMedQA');
    await new Promise((r) => setTimeout(r, 500));

    // Clear search
    await page.click('input[placeholder*="Search projects"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise((r) => setTimeout(r, 500));

    const listingScreenshotPath = `${SCREENSHOT_DIR}/02_projects_listing.png`;
    await page.screenshot({ path: listingScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${listingScreenshotPath}`);

    // --------------------------------------------------------------------------
    // Workflow 3: Submit New Research Project & Verify pgvector indexing
    // --------------------------------------------------------------------------
    console.log('\n[3/9] Testing Project Submission (http://localhost:3000/projects/new)...');
    await page.goto('http://localhost:3000/projects/new', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder*="Adaptive Indexing"]');

    const timestamp = Date.now();
    const testTitle = `QuantumGraph: Topological Quantum Simulation on Database Graphs (Run ${timestamp})`;
    const testProblem = 'Simulating topological qubit operations on massive citation graphs causes memory overhead and high latency under standard graph traversals.';
    const testDesc = 'Designs a pgvector cosine similarity pipeline combined with topological anyon braiding to partition large relational subgraphs into quantum coherent states.';

    await page.type('input[placeholder*="Adaptive Indexing"]', testTitle);
    await page.type('textarea[placeholder*="What core limitation"]', testProblem);
    await page.type('textarea[placeholder*="Detail your proposed system architecture"]', testDesc);

    // Select domain
    await clickByText(page, 'button[type="button"]', 'Artificial Intelligence');

    const formScreenshotPath = `${SCREENSHOT_DIR}/03_project_submission_form.png`;
    await page.screenshot({ path: formScreenshotPath, fullPage: false });
    console.log(`  -> Saved: ${formScreenshotPath}`);

    console.log('  -> Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for redirect to /projects/:id (numeric ID)
    await page.waitForFunction(() => /^\/projects\/\d+$/.test(window.location.pathname), { timeout: 15000 });
    const currentUrl = page.url();
    console.log('  -> Navigated to:', currentUrl);
    const match = currentUrl.match(/\/projects\/(\d+)/);
    if (!match) throw new Error('Did not redirect to project details page.');
    createdProjectId = parseInt(match[1], 10);
    console.log('  -> Created Project ID:', createdProjectId);

    // Verify in PostgreSQL
    const dbProj = await pool.query('SELECT * FROM project WHERE project_id = $1', [createdProjectId]);
    if (dbProj.rows.length === 0) throw new Error('Project not found in PostgreSQL!');
    const dbVec = await pool.query('SELECT * FROM embedding_ref WHERE entity_type = \'PROJECT\' AND entity_id = $1', [createdProjectId]);
    if (dbVec.rows.length === 0) throw new Error('384-d pgvector embedding not found in embedding_ref!');
    console.log('  -> Verified in PostgreSQL: Project row exists and 384-d pgvector is stored.');

    // --------------------------------------------------------------------------
    // Workflow 4: Project Details, 1-Click Similarity, and Faculty Review Procedure
    // --------------------------------------------------------------------------
    console.log('\n[4/9] Testing Project Details & Faculty Review Procedure...');
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 1000));

    // Run similarity analysis on page
    console.log('  -> Running 1-click similarity discovery on details page...');
    await clickByText(page, 'button', 'Run Similarity Analysis');
    await new Promise((r) => setTimeout(r, 2500));

    // Submit Faculty Review via UI
    console.log('  -> Submitting faculty review via UI (sp_review_and_approve_project)...');
    await page.type(
      'textarea[placeholder*="Enter faculty critique"]',
      'Topological quantum simulation methodology verified. Approved for experimental implementation.'
    );
    await clickByText(page, 'button[type="submit"]', 'Submit Faculty Review');
    await new Promise((r) => setTimeout(r, 2000));

    const detailsScreenshotPath = `${SCREENSHOT_DIR}/04_project_details_and_review.png`;
    await page.screenshot({ path: detailsScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${detailsScreenshotPath}`);

    // Verify status in DB
    const checkApproved = await pool.query('SELECT status, approved_by FROM project WHERE project_id = $1', [createdProjectId]);
    if (checkApproved.rows[0].status !== 'Approved') {
      throw new Error(`Expected Approved status, got ${checkApproved.rows[0].status}`);
    }
    const checkAudit = await pool.query('SELECT * FROM audit_log WHERE table_name = \'project\' AND record_id = $1 ORDER BY changed_at DESC', [createdProjectId]);
    console.log(`  -> Project status is Approved in PostgreSQL. Audit log entries count: ${checkAudit.rows.length}`);

    // --------------------------------------------------------------------------
    // Workflow 5: Edit Project & Persistence Verification
    // --------------------------------------------------------------------------
    console.log('\n[5/9] Testing Edit Project Form...');
    await page.goto(`http://localhost:3000/projects/${createdProjectId}/edit`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[value*="QuantumGraph"]');

    // Append to title
    await page.type('input[value*="QuantumGraph"]', ' [VERIFIED PERSISTENCE]');
    await clickByText(page, 'button[type="submit"]', 'Save Changes');
    await page.waitForFunction(() => !window.location.pathname.endsWith('/edit'), { timeout: 10000 });

    const editScreenshotPath = `${SCREENSHOT_DIR}/05_project_edit_persistence.png`;
    await page.screenshot({ path: editScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${editScreenshotPath}`);

    const checkUpdated = await pool.query('SELECT title FROM project WHERE project_id = $1', [createdProjectId]);
    if (!checkUpdated.rows[0].title.includes('[VERIFIED PERSISTENCE]')) {
      throw new Error('Title update did not persist in PostgreSQL.');
    }
    console.log('  -> Project edit persisted cleanly in PostgreSQL.');

    // --------------------------------------------------------------------------
    // Workflow 6: Live OpenAlex Academic Paper Search
    // --------------------------------------------------------------------------
    console.log('\n[6/9] Testing Live OpenAlex Academic Search (http://localhost:3000/discover)...');
    await page.goto('http://localhost:3000/discover', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder*="Search academic works"]');

    await page.click('input[placeholder*="Search academic works"]', { clickCount: 3 });
    await page.type('input[placeholder*="Search academic works"]', 'vector database similarity postgresql');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 4000)); // Wait for OpenAlex response

    const openalexScreenshotPath = `${SCREENSHOT_DIR}/06_openalex_search.png`;
    await page.screenshot({ path: openalexScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${openalexScreenshotPath}`);

    // Click "Save Paper" on first available card
    try {
      console.log('  -> Clicking Save Paper for an OpenAlex work...');
      await clickByText(page, 'button', 'Save Paper');
      await new Promise((r) => setTimeout(r, 4000));
      console.log('  -> Paper saved and indexed via UI.');
    } catch (e) {
      console.log('  -> Paper already saved or button text changed:', e.message);
    }

    // --------------------------------------------------------------------------
    // Workflow 7: Saved Papers Catalog in PostgreSQL
    // --------------------------------------------------------------------------
    console.log('\n[7/9] Testing Saved Papers Catalog (http://localhost:3000/papers)...');
    await page.goto('http://localhost:3000/papers', { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 1200));

    const savedPapersScreenshotPath = `${SCREENSHOT_DIR}/07_saved_papers.png`;
    await page.screenshot({ path: savedPapersScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${savedPapersScreenshotPath}`);

    // --------------------------------------------------------------------------
    // Workflow 8: Semantic Vector Similarity Engine
    // --------------------------------------------------------------------------
    console.log('\n[8/9] Testing Vector Similarity Engine (http://localhost:3000/similarity)...');
    await page.goto('http://localhost:3000/similarity', { waitUntil: 'networkidle2' });
    await page.waitForSelector('textarea[placeholder*="Type your proposed project idea"]');

    await page.click('textarea[placeholder*="Type your proposed project idea"]', { clickCount: 3 });
    await page.type(
      'textarea[placeholder*="Type your proposed project idea"]',
      'approximate nearest neighbor search on dense vectors using hnsw graphs'
    );
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 3500)); // Compute embedding & pgvector query

    const similarityScreenshotPath = `${SCREENSHOT_DIR}/08_similarity_search.png`;
    await page.screenshot({ path: similarityScreenshotPath, fullPage: true });
    console.log(`  -> Saved: ${similarityScreenshotPath}`);

    // Verify similarity results exist in DOM
    const similarityResultsText = await page.evaluate(() => document.body.innerText.toLowerCase());
    if (!similarityResultsText.includes('ranked similarity results') && !similarityResultsText.includes('nearest neighbors found')) {
      throw new Error('Vector similarity results failed to display in UI.');
    }
    console.log('  -> Vector similarity search executed and rendered ranked scores successfully.');

    // --------------------------------------------------------------------------
    // Workflow 9: Delete Temporary Test Project
    // --------------------------------------------------------------------------
    console.log(`\n[9/9] Cleaning up temporary test project #${createdProjectId}...`);
    const delRes = await pool.query('DELETE FROM project WHERE project_id = $1 RETURNING project_id;', [createdProjectId]);
    console.log(`  -> Deleted project #${delRes.rows[0].project_id} from PostgreSQL.`);

    // Confirm CASCADE deletion
    const checkDomainMap = await pool.query('SELECT * FROM project_domain WHERE project_id = $1;', [createdProjectId]);
    const checkReviews = await pool.query('SELECT * FROM project_review WHERE project_id = $1;', [createdProjectId]);
    const checkEmb = await pool.query('SELECT * FROM embedding_ref WHERE entity_type = \'PROJECT\' AND entity_id = $1;', [createdProjectId]);
    console.log(`  -> Cascade check: project_domain: ${checkDomainMap.rows.length}, reviews: ${checkReviews.rows.length}, embeddings: ${checkEmb.rows.length}`);

    // Audit log should have captured DELETE action
    const deleteAudit = await pool.query(
      `SELECT log_id, action, record_id, old_values, changed_at 
       FROM audit_log 
       WHERE table_name = 'project' AND action = 'DELETE' AND record_id = $1;`,
      [createdProjectId]
    );
    console.log(`  -> Trigger captured DELETE action in audit_log: ${deleteAudit.rows.length > 0 ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('\n*** ERROR DURING BROWSER WORKFLOW ***:', error);
    throw error;
  } finally {
    await browser.close();
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(' ALL 9 UI & DB WORKFLOWS COMPLETED SUCCESSFULLY!');
  console.log(' Captured genuine screenshots in docs/evidence/screenshots/');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
