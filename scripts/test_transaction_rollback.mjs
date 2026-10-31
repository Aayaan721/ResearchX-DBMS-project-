// scripts/test_transaction_rollback.mjs
import pg from 'pg';
import assert from 'assert';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres@127.0.0.1:5432/researchx',
});

async function testRollback() {
  console.log('================================================================');
  console.log(' ResearchX Controlled Transaction Rollback & Integrity Test');
  console.log('================================================================\n');

  const client = await pool.connect();

  try {
    // ------------------------------------------------------------------------
    // Scenario 1: Multi-Table Transaction Rollback on Constraint Violation
    // ------------------------------------------------------------------------
    console.log('[Scenario 1] Testing Multi-Table Transaction Atomicity & Rollback...');
    const initialProjectCountRes = await client.query('SELECT COUNT(*) as count FROM project;');
    const initialCount = parseInt(initialProjectCountRes.rows[0].count, 10);
    console.log(`  -> Baseline project count: ${initialCount}`);

    let caughtExpectedError = false;
    await client.query('BEGIN');
    try {
      // Step A: Insert valid project in uncommitted transaction
      const insRes = await client.query(
        `INSERT INTO project (student_id, title, problem_statement, description, status)
         VALUES (2, 'ROLLBACK_TEST_TRANSACTION_PROJECT', 'Testing transaction atomicity under failure', 'Description', 'Pending')
         RETURNING project_id;`
      );
      const tempId = insRes.rows[0].project_id;
      console.log(`  -> Uncommitted project row inserted with temporary ID #${tempId}`);

      // Step B: Deliberately violate CHECK constraint (status = 'InvalidStatus')
      console.log('  -> Intentionally executing invalid statement (violating CHECK status constraint)...');
      await client.query(
        `UPDATE project SET status = 'ForbiddenStatusValue' WHERE project_id = $1;`,
        [tempId]
      );

      // Should not reach here
      await client.query('COMMIT');
    } catch (err) {
      caughtExpectedError = true;
      console.log(`  -> Successfully intercepted expected database error: "${err.message}"`);
      await client.query('ROLLBACK');
      console.log('  -> Executed client.query("ROLLBACK").');
    }

    assert.ok(caughtExpectedError, 'Transaction must trigger error and catch block');

    // Confirm that the database state was completely rolled back
    const finalProjectCountRes = await client.query('SELECT COUNT(*) as count FROM project;');
    const finalCount = parseInt(finalProjectCountRes.rows[0].count, 10);
    assert.strictEqual(finalCount, initialCount, 'Project count must remain unchanged after rollback');

    const checkGhostRes = await client.query(
      `SELECT * FROM project WHERE title = 'ROLLBACK_TEST_TRANSACTION_PROJECT';`
    );
    assert.strictEqual(checkGhostRes.rows.length, 0, 'No uncommitted project rows must exist in the database');
    console.log('  [PASS] Scenario 1 PASSED: Zero orphan records created, transaction rolled back cleanly.\n');

    // ------------------------------------------------------------------------
    // Scenario 2: Stored Procedure Authorization Guard & Transaction Abort
    // ------------------------------------------------------------------------
    console.log('[Scenario 2] Testing Stored Procedure sp_review_and_approve_project Authorization Guard...');
    // Target Project 1
    const targetProjRes = await client.query('SELECT status, approved_by FROM project WHERE project_id = 1;');
    const originalStatus = targetProjRes.rows[0].status;
    const originalApprover = targetProjRes.rows[0].approved_by;

    let procCaughtError = false;
    try {
      // Attempt to review using Student user_id = 2 ('Aayaan S'), who does NOT have Faculty role
      console.log('  -> Attempting review approval with unauthorized student user (user_id = 2)...');
      await client.query(
        `CALL sp_review_and_approve_project(1, 2, 'Approved', 'Unauthorized student review attempt');`
      );
    } catch (err) {
      procCaughtError = true;
      console.log(`  -> Stored procedure correctly raised exception: "${err.message}"`);
    }

    assert.ok(procCaughtError, 'Stored procedure must reject non-faculty users');

    // Verify Project 1 status and approver remain identical
    const verifyProjRes = await client.query('SELECT status, approved_by FROM project WHERE project_id = 1;');
    assert.strictEqual(verifyProjRes.rows[0].status, originalStatus, 'Project status must remain unchanged');
    assert.strictEqual(verifyProjRes.rows[0].approved_by, originalApprover, 'Approver must remain unchanged');

    // Verify no rogue review record was inserted
    const verifyReviewRes = await client.query(
      `SELECT * FROM project_review WHERE comments = 'Unauthorized student review attempt';`
    );
    assert.strictEqual(verifyReviewRes.rows.length, 0, 'No rogue review rows should be inserted');
    console.log('  [PASS] Scenario 2 PASSED: Authorization guard protected database consistency.\n');

  } finally {
    client.release();
    await pool.end();
  }

  console.log('================================================================');
  console.log(' ALL TRANSACTION ROLLBACK & CONSISTENCY TESTS PASSED [OK]');
  console.log('================================================================\n');
}

testRollback().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
