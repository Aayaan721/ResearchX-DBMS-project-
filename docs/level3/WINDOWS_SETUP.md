# Windows setup, private demo credentials, and verification boundaries

This is a **native Windows PowerShell** procedure for a new local ResearchX checkout. It preserves PostgreSQL 16, pgvector, Next.js and the real MiniLM model. The commands below are not a claim of execution on Windows: this review ran on Linux, which has no Windows, PowerShell or NTFS runtime. Windows path rules were tested with Node's `path.win32`; fresh PostgreSQL/pgvector initialization and real HTTP login/logout were exercised in a disposable database on Linux. Native Windows dependency installation, ACL execution and browser tests remain to be run on Windows.

## Prerequisites and configuration

Install Git, **Node 24**, PostgreSQL **16 x64**, and pgvector built/installed for that PostgreSQL 16 server. The original reference versions were 16.4/0.8.6; this review used PostgreSQL 16.15 and pgvector 0.8.7. A pgvector package for another PostgreSQL major version is not interchangeable. See the [official pgvector Windows installation instructions](https://github.com/pgvector/pgvector#windows) if the server does not list the extension. This guide does not install or reset a PostgreSQL server.

Use a checkout in your private Windows user profile, not a shared/public directory. In PowerShell, from that checkout:

```powershell
node --version
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
if (-not (Test-Path -LiteralPath .env.local)) {
    Copy-Item -LiteralPath .env.example -Destination .env.local -ErrorAction Stop
}
notepad.exe .env.local
```

On an existing checkout, **do not overwrite an existing `.env.local`**. Fill its placeholder `DATABASE_URL` privately in the editor, matching your database user, password, host, port and database name. Percent-encode special characters in the URL password. Database credentials are separate from website Student/Faculty/Admin credentials. For a local `http://localhost:3000` demonstration set `SESSION_COOKIE_SECURE=false`; retain `true` for HTTPS. Never paste real values in documentation, terminal output, screenshots or commits. `.env.local` is ignored by Git and should inherit only your private profile's ACLs.

Next.js loads `.env.local` itself. Plain Node scripts do **not** automatically load it. Use `node --env-file=.env.local ...` as shown below. Node 24 supplies this flag without dotenv dependencies. `npm.cmd` avoids the common Windows policy restriction on `npm.ps1`.

## Database: choose the correct path

### Existing populated database

Never execute `database/schema.sql` or rerun seeds as an upgrade. Back up with your PostgreSQL tools first; password prompts from `-W` are not echoed. Set the tool PATH if needed, and use your actual database/user names (these are not website usernames):

```powershell
$env:Path = "C:\Program Files\PostgreSQL\16\bin;$env:Path"
# Save in the private directory configured below, not the checkout.
pg_dump.exe -h 127.0.0.1 -U postgres -d researchx -W -Fc -f "$env:LOCALAPPDATA\ResearchX\credentials\before-level3.dump"
if ($LASTEXITCODE -ne 0) { throw 'Backup failed; stop before migration' }
pg_restore.exe --list "$env:LOCALAPPDATA\ResearchX\credentials\before-level3.dump" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Backup manifest verification failed' }
node --env-file=.env.local scripts/migrate.mjs
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; existing data was not reset' }
```

Create/protect the private directory in the next section **before** writing that backup. The migration is additive/idempotent. It does not initialize fresh databases that have no `app_user`, `role`, project tables or pgvector extension.

### Brand-new demonstration database only

Create a **new** database. If the chosen name already exists, `createdb` fails: stop instead of resetting it. Fill `.env.local` for this same database. Example:

```powershell
$env:Path = "C:\Program Files\PostgreSQL\16\bin;$env:Path"
createdb.exe -h 127.0.0.1 -U postgres -W researchx_level3_demo
if ($LASTEXITCODE -ne 0) { throw 'Database was not newly created; stop' }
$tables = psql.exe -X -h 127.0.0.1 -U postgres -d researchx_level3_demo -W -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
if ($LASTEXITCODE -ne 0 -or $tables.Trim() -ne '0') { throw 'Database is not empty; never run bootstrap here' }
$vector = psql.exe -X -h 127.0.0.1 -U postgres -d researchx_level3_demo -W -Atc "SELECT count(*) FROM pg_available_extensions WHERE name='vector'"
if ($LASTEXITCODE -ne 0 -or $vector.Trim() -ne '1') { throw 'Install pgvector for this PostgreSQL server first' }
foreach ($sql in @('database/schema.sql', 'database/procedures_triggers.sql', 'database/seed.sql')) {
    psql.exe -X -h 127.0.0.1 -U postgres -d researchx_level3_demo -W -v ON_ERROR_STOP=1 -f $sql
    if ($LASTEXITCODE -ne 0) { throw "Bootstrap failed at $sql; stop" }
}
node --env-file=.env.local scripts/migrate.mjs
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop' }
```

The bootstrap contains DROP statements, which are safe here **only because this is the just-created and independently checked empty database**. Do not use that block for an existing database. Seeded website accounts start locked with `!uninitialized`; they have no shared default password. The migration must run before account initialization because initialization also revokes sessions through `auth_session`.

## Initialize and obtain login credentials without printing passwords

`DEMO_CREDENTIALS_FILE` must be an absolute path **outside the checkout**, including outside nested checkout directories, symlinks and junctions. The initializer now checks path boundaries correctly on Windows (case, separators and drive letters). It rejects non-private POSIX directories; on Windows it checks the NTFS ACL using the local `powershell.exe` before generating any passwords. File mode `0600` is not an NTFS access-control policy.

Create a dedicated credentials directory with access for your current Windows account only. Do not apply this ACL to a broad directory such as your profile, drive root, or shared workspace:

```powershell
$ErrorActionPreference = 'Stop'
$private = Join-Path $env:LOCALAPPDATA 'ResearchX\credentials'
New-Item -ItemType Directory -Path $private -Force | Out-Null
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', $inherit, 'None', 'Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $private -AclObject $acl
$env:DEMO_CREDENTIALS_FILE = Join-Path $private 'demo.credentials.json'
node --env-file=.env.local scripts/init_demo_accounts.mjs
if ($LASTEXITCODE -ne 0) { throw 'Account initialization failed; no new login should be assumed' }
notepad.exe $env:DEMO_CREDENTIALS_FILE
```

Open the private file **only in a local editor** to obtain the username/password for manual login. Do not use `Get-Content`, `type`, `cat`, `Write-Output`, command arguments containing a password, or screenshots to reveal it. Close the editor before screen sharing. Passwords are generated locally and written exclusively to that protected file; they are never printed by the initializer. Hashes alone cannot reveal an existing password.

The ACL checker permits only the current account, local SYSTEM and local Administrators to have Allow entries; additional group access causes initialization to fail closed. Do not disable the check. The dedicated directory above grants only the current user and provides inheritance for newly created credential files. Local administrators remain able to take ownership by operating-system design.

Demo usernames:

| Role | Username |
|---|---|
| Student | `aayaan_s`, `priya_k` |
| Faculty | `dr_shilpa`, `prof_sandesh` |
| Admin | `admin_researchx` |

A successful first initialization generates valid, distinct scrypt hashes for pending accounts. An existing credentials file is never overwritten. If a pending account needs initialization but that file already exists, the transaction rolls back: choose a new unused private filename rather than deleting your old credentials. Rerunning against initialized accounts preserves their hashes and file. If the original file is lost, rerunning does **not** generate a replacement password; obtain it through your own secure backup or an explicitly authorized database-administrator password reset. This PR does not implement a self-service password-reset feature and never silently resets initialized users.

## Run the real application

```powershell
node --env-file=.env.local scripts/generate_seed_embeddings.mjs
if ($LASTEXITCODE -ne 0) { throw 'Real model/vector generation failed' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
npm.cmd run start
```

Open the local app in your browser, follow **Log in**, and enter the private credentials there. Logout invalidates the server session. Do not expose a preview publicly for testing. In a managed proxy environment, set `$env:NODE_USE_ENV_PROXY='1'` and preserve its supplied CA settings; ordinary local Windows installations without that proxy do not need the variable. Model downloads and OpenAlex require their respective hosts to be reachable. Never disable TLS verification to work around installation/download problems.

## Execute regression checks on Windows

With the app running in another terminal:

```powershell
$env:TEST_CREDENTIALS_FILE = $env:DEMO_CREDENTIALS_FILE
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node --env-file=.env.local scripts/test_audit_access.mjs
node --env-file=.env.local scripts/test_audit_browser.mjs
node --env-file=.env.local scripts/test_auth.mjs
node --env-file=.env.local scripts/test_database_integrity.mjs
node --env-file=.env.local scripts/test_platform.mjs
node --env-file=.env.local scripts/test_phase3_corrections.mjs
node --env-file=.env.local scripts/test_transaction_rollback.mjs
node --env-file=.env.local scripts/test_responsive_navigation.mjs
node --env-file=.env.local scripts/test_auth_browser.mjs
node --env-file=.env.local scripts/verify_browser_and_screenshots.mjs
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Check `$LASTEXITCODE` after each command and record actual results; success in this Linux review is not a Windows pass. The initialization regression uses a **new disposable database only**, requires a database role allowed to CREATE DATABASE, and drops that database afterward. For a private Windows temporary directory, create `test-temp` under `$private` so it inherits the same ACL, then:

```powershell
New-Item -ItemType Directory -Path (Join-Path $private 'test-temp') -Force | Out-Null
$env:TEMP = Join-Path $private 'test-temp'
$env:TMP = $env:TEMP
$env:ALLOW_DISPOSABLE_DATABASE_TEST = 'true'
node --env-file=.env.local scripts/test_account_initialization.mjs
```

That suite rejects running without explicit opt-in. Its destructive bootstrap is isolated to a randomly named, freshly created and verified empty `researchx_init_test_*` database. It never runs `schema.sql` against the configured application database. It verifies actual hashes, private files, real HTTP login/logout for all seeded roles, preservation on rerun, failure rollback and no password output. If CREATE DATABASE, pgvector, Chrome, PowerShell or ACL prerequisites are missing, report that failure rather than marking the test passed.
