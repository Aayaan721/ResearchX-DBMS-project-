# PR #1 follow-up — audit privacy and account initialization

Branch: `feat/dbms-level3-auth-integrity`. No merge into `main`. Executed on the existing Linux cloud computer using Node 24.19.0, PostgreSQL 16.15, pgvector 0.8.7 and headless Chromium. Logs are actual command output, with terminal carriage returns and trailing whitespace normalized. No passwords or raw audit snapshots are included in the published evidence.

## Corrected behavior

- `/api/stats` remains public for counts and domain statistics. Only an authenticated **Admin** receives detailed global `recentAudit` entries. Everyone else receives `recentAudit: []` and `canViewAudit: false`.
- `/api/projects/[id]` remains public for the current project and reviews. Detailed `auditHistory` is restricted to that project's **Student owner, Faculty, or Admin**. Faculty may review all projects in the current application; there is no invented assignment model. Another Student, anonymous caller, forged cookie or expired session receives an empty history.
- Both successful personalized GET responses explicitly send `Cache-Control: private, no-store` and `Vary: Cookie`. Their audit queries are not executed for unauthorized viewers. This keeps historical/deleted snapshots out of shared/public responses without hiding existing aggregate statistics or current project records.
- The homepage and project page refetch on session changes, discard stale pending responses, and hide restricted history immediately on logout. Browser tests exercise logout without navigation, not merely a new page load.
- Demo credential location checks now use portable path boundaries instead of assuming `/`. Tests cover Windows case folding, separate drives, siblings, `..`, extended-length DOS/UNC aliases, and actual symlink/junction traversal.
- Credentials must be outside the checkout in a private directory. POSIX owner-only directory/file permissions are checked. On Windows the initializer verifies NTFS ACL Allow entries using native PowerShell **before** generating passwords, failing closed if verification fails. Allowed identities are the current user, SYSTEM and local Administrators; no security check is bypassed in documentation.
- Existing private files are not overwritten. Initialized account hashes are preserved on rerun. Commit failure removes only the new credential file created by that attempt. A lost original credential file does not silently reset passwords; the initializer explicitly explains that the existing password cannot be recovered from its hash.

No schema migration, dependency change, account reset or destructive bootstrap was applied to the populated application database in this follow-up.

## Executed results

| Check | Exact result | Evidence |
|---|---|---|
| Audit API access control | **14 passed, 0 failed** | [Output](../evidence/pr1-review/test_audit_access.txt) |
| Audit UI and logout privacy | **5 passed, 0 failed** | [Output](../evidence/pr1-review/test_audit_browser.txt) |
| Fresh database/account initialization | **14 passed, 0 failed** | [Output](../evidence/pr1-review/initialization.txt) |
| Authentication/security | **22 passed, 0 failed** | [Output](../evidence/pr1-review/test_auth.txt) |
| PostgreSQL integrity | **20 passed, 0 failed** | [Output](../evidence/pr1-review/test_database_integrity.txt) |
| Platform integration | **13 passed, 0 failed** | [Output](../evidence/pr1-review/test_platform.txt) |
| Phase 3 corrections | **3 passed, 0 failed** | [Output](../evidence/pr1-review/test_phase3_corrections.txt) |
| Transaction rollback | **2 scenarios passed, 0 failed** | [Output](../evidence/pr1-review/test_transaction_rollback.txt) |
| Responsive navigation | **7 widths and resource/icon check passed** | [Output](../evidence/pr1-review/test_responsive_navigation.txt) |
| Targeted search UI | **4 workflows passed** | [Output](../evidence/pr1-review/verify_targeted_ui_fix.txt) |
| Authentication browser workflows | **10 passed, 0 failed** | [Output](../evidence/pr1-review/test_auth_browser.txt) |
| Full browser/database workflows | **10 workflows completed, 0 failed** | [Output](../evidence/pr1-review/verify_browser_and_screenshots.txt) |
| Standalone TypeScript | **exit 0, no diagnostics** | [Output](../evidence/pr1-review/typescript.txt) |
| Lint | **exit 0, no warnings/errors** | [Output](../evidence/pr1-review/lint.txt) |
| Production build, including type validation | **exit 0** | [Output](../evidence/pr1-review/build.txt) |
| Existing data and DB definitions | **preserved** | [Output](../evidence/pr1-review/preservation.txt) |

The audit regression initially reported **0 passed, 14 failed** against the pre-fix production build; it passed after rebuilding with the access policy. A separate path probe reproduced failure to recognize extended Windows DOS/UNC aliases; those forms were normalized and the initialization suite rerun successfully. The final application code passed the eleven API/browser suites serially with exit code 0 for each. The initializer suite was rerun after its last path-only change. No failed test was skipped or weakened, and real MiniLM vectors and live OpenAlex were used for integration/browser checks.

## Fresh setup test isolation and credential handling

`scripts/test_account_initialization.mjs` requires `ALLOW_DISPOSABLE_DATABASE_TEST=true` and CREATE DATABASE permission. It creates a random `researchx_init_test_*` database, verifies it is new/empty, and only there executes the existing bootstrap/seed/migration. It starts a real separate Next.js process pointed to that database, logs in/out with the generated credentials for every seeded role, checks private files and no password output, and tests failures/reruns. It drops only its own disposable database and deletes its own temporary private files afterward. It never initializes or changes credentials in the configured application database.

The separate application-data preservation check compared pre/post fingerprints of all original business rows and definitions of existing public indexes, triggers, functions and procedures. All were unchanged. Final business counts are **6 projects, 5 papers and 11 vectors**. Test-generated audit events and one new shared author identity were appended through normal functionality; original audit and author records remain intact. Session/login-attempt tables changed through ordinary authentication testing and are not business-data preservation targets.

## Native Windows limitation and exact remaining commands

**No native Windows, PowerShell, NTFS, Windows npm installation or Windows browser execution occurred here.** This Linux machine has no such runtime. Passing `path.win32` tests is not a claim of a native Windows pass. Native ACL checking is implemented fail-closed but remains to be exercised on Windows.

Follow [WINDOWS_SETUP.md](WINDOWS_SETUP.md) for the exact fresh-checkout/database steps, private NTFS directory setup, `node --env-file=.env.local` commands, safe local-editor access to generated credentials, and the full Windows test commands. That guide explicitly guards the destructive bootstrap behind a newly created/empty database and explains initialized/lost-credential cases. Do not print passwords with `Get-Content`, `cat`, or terminal logging. Native Windows results must be recorded on a Windows machine before claiming full Windows verification.
