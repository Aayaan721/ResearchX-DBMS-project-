# Executed Level 3 verification

Executed 15 November 2026 on the existing populated local ResearchX database. Runtime: Node 24.19.0, PostgreSQL 16.15, pgvector 0.8.7, installed headless Chromium. Real Xenova MiniLM weights and live OpenAlex were used. No mock embeddings, skipped failed assertions or fabricated screenshots.

## Actual outcomes

| Suite/check | Final result | Evidence |
|---|---|---|
| Authentication, permissions, session replay/expiry, CSRF, throttle, validation | **22 passed, 0 failed** | [Output](../evidence/level3/test_auth.txt) |
| Direct PostgreSQL constraints, migrations, views, DDL, triggers, vectors | **20 passed, 0 failed** | [Output](../evidence/level3/test_database_integrity.txt) |
| Existing platform integration | **13 passed, 0 failed** | [Output](../evidence/level3/test_platform.txt) |
| Existing Phase 3 corrections | **3 passed, 0 failed** | [Output](../evidence/level3/test_phase3_corrections.txt) |
| Existing transaction/authorization rollback | **2 scenarios passed, 0 failed** | [Output](../evidence/level3/test_transaction_rollback.txt) |
| Existing responsive navigation | **7 widths passed, plus icon/resource check** | [Output](../evidence/level3/test_responsive_navigation.txt) |
| Existing targeted search-input UI regression | **4 workflows passed** | [Output](../evidence/level3/verify_targeted_ui_fix.txt) |
| New authentication/role UI | **10 passed, 0 failed** | [Output](../evidence/level3/test_auth_browser.txt) |
| Full authenticated browser/database workflow | **10 workflows completed, 0 failed** | [Output](../evidence/level3/verify_browser_and_screenshots.txt) |
| Secure-cookie configuration | **Passed** | [Output](../evidence/level3/secure-cookie.txt) |
| Production build (includes TypeScript validation) | **Passed** | [Output](../evidence/level3/build.txt) |
| Standalone `npx tsc --noEmit` | **Passed (exit 0)** | Also validated by the production build |
| Lint | **No warnings or errors** | [Output](../evidence/level3/lint.txt) |
| Original relational queries/DML | **Executed with rollback** | [Actual rows](../evidence/level3/sql-queries.txt) |
| Original vector SQL examples | **Both executed with actual stored-vector parameters** | [Actual rows](../evidence/level3/sql-vector.txt) |

The full serial nine-suite runner recorded exit code 0 for every suite. After the final removal of a public reviewer-email field, authentication, platform integration and authentication-browser checks were rerun against the rebuilt production app. The other suite results remain from the same implementation with that nonessential response field present. This distinction prevents claiming a rerun that did not happen.

## Baseline findings and resolved failures

The restored database initially had zero seed embeddings. The baseline platform run reported **12 passed, 1 failed** (`Seed embeddings counted`). Real seed generation produced the missing six project and five paper vectors without overwriting relational records. The first responsive check against the restored `.next` build failed at 640px although source already contained the prior navigation fix; rebuilding current source resolved the stale-artifact mismatch. Baseline Phase 3 and transaction scenarios passed.

During implementation, TypeScript caught a request-body type mismatch and an ID type mismatch; both were fixed before the successful build. A syntax error in the adapted browser test was fixed before execution. These failures were not bypassed or counted as passes. Existing platform/Phase 3 assertions remain; sessions were added so tests use actual permitted roles. The old browser runner's save-error suppression was replaced with a failing assertion, and real stored vectors were checked after saving.

## Database safety and preservation

Before schema changes, an actual custom-format `pg_dump` backup was created outside the repository and its `pg_restore --list` manifest checked. No restore, schema reset, DROP/TRUNCATE of user tables, destructive seed rerun or user-data replacement occurred. Only legacy dummy/locked password fields were initialized as requested. Migrations ran repeatedly and committed successfully. Direct invalid-data tests and original demonstration DML ran in rollback transactions/savepoints. Browser tests removed only their newly created projects/papers; historical audit events and shared author identities are retained by the application's existing design.

The migrated database directly rejects whitespace/empty/oversized titles, short/blank problems, invalid statuses/decisions, missing foreign keys, blank paper titles, negative citations and missing vector parents. It also rejects reassigning an indexed entity's primary key to strand a vector. Vector-parent guards take row key-share locks; parent-deletion triggers cascade vectors. Real stored vectors have 384 dimensions, unit norm within tolerance and cosine self-similarity near 1. HNSW cosine and relational indexes remain present.

## Genuine new screenshots

- [Login form](../evidence/level3/screenshots/login.png)
- [Mobile login](../evidence/level3/screenshots/login-mobile.png)
- [Authenticated Student proposal form with fixed session author](../evidence/level3/screenshots/student-proposal.png)
- [Authenticated Faculty review screen](../evidence/level3/screenshots/faculty-review.png)
- [Real locally indexed semantic similarity results](../evidence/level3/screenshots/08_similarity_search.png)

Screenshots were captured by Chromium during the recorded workflows. Login screenshots contain empty password fields. Original report screenshots are preserved as historical artifacts, not relabelled as new evidence.

## Remaining limitations and outside evidence

- A separate faculty requirements draft was not supplied; only the detailed eight-task user brief was available.
- Abhinav's individual authorship/contributions cannot be established from the available Git history. The team-provided split is explicitly marked intended/unverified.
- The GitHub API host `api.github.com` is denied by the current network proxy before authentication. Git repository read/push works; pull-request creation is blocked until that host is allowed. The specific domain addition was saved to the environment draft without publishing or overwriting existing domains. No PR number or URL is invented.
- This is a local academic authentication scheme, not a claim of a comprehensive security audit or public production readiness. The explicit local HTTP configuration disables Secure cookies; a separate secure configuration was verified to issue Secure + HTTP-only + SameSite=Lax cookies.
- Existing certificate/approval language, guide details and university course-code differences in the original faculty-style report were preserved, not independently certified or silently corrected.
