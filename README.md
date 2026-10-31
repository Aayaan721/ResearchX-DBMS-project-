# ResearchX — Intelligent Research Discovery & Project Similarity Platform

**University DBMS Mini-Project (UE23CS351A — PES University)**  
*Standardized on PostgreSQL 16.4 + pgvector extension, Next.js 14 App Router, TypeScript, Tailwind CSS, OpenAlex REST API, and local 384-dimensional MiniLM embeddings.*

---

## 1. System Overview

ResearchX solves a common dilemma for university students and research labs: identifying duplicate project proposals, discovering semantically aligned academic literature, tracking faculty reviews, and organizing research paper-author relationships.

- **Relational Integrity**: Core entities (`role`, `app_user`, `domain`, `project`, `project_domain`, `research_paper`, `author`, `paper_author`, `project_review`, `audit_log`, `embedding_ref`) are managed in a normalized PostgreSQL 16 schema with strict primary/foreign keys, cascade rules, check constraints, indexes, triggers, and stored procedures.
- **pgvector Integration**: Dense 384-dimensional semantic embeddings are generated locally on CPU using `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) and stored in PostgreSQL using the `vector(384)` type with HNSW nearest-neighbor indexes.
- **OpenAlex Live Search**: Real-time academic paper discovery querying over 250M works with on-the-fly inverted-index abstract reconstruction.
- **Faculty Review Procedure**: Atomic review workflow implemented via the PostgreSQL stored procedure `sp_review_and_approve_project` with automated audit logging via trigger `trg_audit_project_changes`.

---

## 2. Directory Architecture

```text
dbms_mini_project/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Dashboard with metrics, domains & audit trail
│   │   ├── layout.tsx                   # Glassmorphic layout & header
│   │   ├── globals.css                  # Custom styling & scrollbars
│   │   ├── projects/
│   │   │   ├── page.tsx                 # Projects directory with search & filters
│   │   │   ├── new/page.tsx             # Project submission & vector indexing
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # Project details, review modal, & similarity
│   │   │       └── edit/page.tsx        # Project modification & re-indexing
│   │   ├── discover/page.tsx            # Live OpenAlex paper search & save
│   │   ├── papers/page.tsx              # Saved research papers catalog
│   │   ├── similarity/page.tsx          # pgvector cosine similarity search engine
│   │   └── api/
│   │       ├── stats/route.ts           # Platform counts & domain distribution
│   │       ├── domains/route.ts         # Research domain classification
│   │       ├── users/route.ts           # Seeded demo students and faculty
│   │       ├── projects/
│   │       │   ├── route.ts             # Project CRUD (GET / POST with pgvector)
│   │       │   └── [id]/
│   │       │       ├── route.ts         # Project item (GET, PUT, DELETE)
│   │       │       └── review/route.ts  # Stored procedure sp_review_and_approve_project
│   │       ├── openalex/
│   │       │   ├── search/route.ts      # Live OpenAlex works search
│   │       │   └── save/route.ts        # Persist paper, authors & compute vector
│   │       ├── papers/
│   │       │   ├── route.ts             # Saved papers catalog (GET)
│   │       │   └── [id]/route.ts        # Saved paper item (GET, DELETE)
│   │       └── similarity/route.ts      # Parameterized pgvector <=> similarity query
│   ├── components/
│   │   ├── Navbar.tsx                   # Navigation header
│   │   ├── StatCard.tsx                 # Metric card
│   │   ├── ProjectCard.tsx              # Project card with status & vector badge
│   │   ├── PaperCard.tsx                # Academic paper card with DOI/PDF links
│   │   └── SimilarityScoreBadge.tsx     # Cosine similarity score percentage indicator
│   └── lib/
│       ├── db.ts                        # PostgreSQL connection pool wrapper
│       ├── embeddings.ts                # Xenova MiniLM 384-d singleton pipeline
│       └── openalex.ts                  # Inverted-index reconstructor & API client
├── database/
│   ├── schema.sql                       # Complete PostgreSQL DDL (11 tables + HNSW index)
│   ├── procedures_triggers.sql          # Stored procedure, audit trigger, & stats functions
│   ├── seed.sql                         # Seed data for users, domains, projects, papers
│   ├── queries.sql                      # University DBMS queries (7.1 to 7.6)
│   └── vector_queries.sql               # Cosine distance (<=>) retrieval examples
├── scripts/
│   ├── generate_seed_embeddings.mjs     # Indexes seed records into pgvector
│   ├── test_platform.mjs                # Automated 13-step integration test suite
│   ├── test_transaction_rollback.mjs    # Multi-statement transaction rollback & integrity tests
│   ├── verify_browser_and_screenshots.mjs # Browser UI verification & screenshot automation
│   ├── capture_sql_screenshots.mjs      # Terminal-grade SQL execution screenshot generator
│   └── generate_evidence.mjs            # Dumps verifiable outputs to docs/evidence/
├── docs/
│   └── evidence/                        # Real query outputs & test execution logs
│       └── screenshots/                 # 13 genuine UI & SQL execution screenshots
├── next.config.js                       # External packages config for ONNX runtime
├── tailwind.config.js                   # Modern styling theme
├── package.json                         # Dependencies & run scripts
└── README.md                            # Documentation and execution instructions
```

---

## 3. Technology Stack & Verified Package Versions

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | `14.2.15` | Full-stack server & client UI |
| **Language & Types** | TypeScript | `5.6.3` | Type safety across client & server |
| **Database Engine** | PostgreSQL (x64) | `16.4` | Normalized relational data store |
| **Vector Extension** | pgvector | `0.8.6` | 384-d dense vector index & cosine similarity (`<=>`) |
| **Embedding Model** | Xenova/all-MiniLM-L6-v2 | `@xenova/transformers 2.17.2` | CPU-friendly 384-dimensional sentence transformer |
| **Academic API** | OpenAlex Works REST API | v1 (`api.openalex.org`) | Real-time global literature search |
| **Icons & Design** | Lucide React & Tailwind CSS | `0.453.0` / `3.4.14` | Glassmorphic UI design system |

---

## 4. Setup & Execution Commands (Windows PowerShell)

### Step 1: Environment PATH Configuration
Ensure Node.js and PostgreSQL tools are in your PowerShell session PATH:
```powershell
$env:PATH = "C:\Users\aayaa\tools\node;C:\Users\aayaa\tools\pgsql\pgsql\bin;$env:PATH"
```

### Step 2: Database Initialization (If starting fresh)
Start the PostgreSQL server:
```powershell
& "C:\Users\aayaa\tools\pgsql\pgsql\bin\pg_ctl.exe" -D "C:\Users\aayaa\tools\pgsql\data" -l "C:\Users\aayaa\tools\pgsql\logfile.log" start
```

Execute DDL schema and stored procedures:
```powershell
psql -U postgres -d researchx -f "database/schema.sql"
psql -U postgres -d researchx -f "database/procedures_triggers.sql"
psql -U postgres -d researchx -f "database/seed.sql"
```

Index seed records with real 384-d vectors:
```powershell
node scripts/generate_seed_embeddings.mjs
```

### Step 3: Run the Next.js Application
Install dependencies (already complete in repository):
```powershell
npm install
```

Build the production bundle:
```powershell
npm run build
```

Start the application on port 3000:
```powershell
npm run start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 5. Verification & Test Execution

### 1. Automated Integration Test Suite (13 Endpoints & Workflows)
Run the automated test suite against the live platform:
```powershell
node scripts/test_platform.mjs
```

### 2. ACID Transaction Atomicity & Controlled Rollback
Execute the multi-statement constraint violation and authorization guard rollback verification:
```powershell
node scripts/test_transaction_rollback.mjs
```

### 3. Browser UI Automation & Verification
Run the end-to-end browser workflows in headless Chrome:
```powershell
node scripts/verify_browser_and_screenshots.mjs
```

### 4. University Relational DBMS Evaluation Queries
Execute 7.1 to 7.6 (GROUP BY, HAVING, correlated subqueries, multi-table JOINs):
```powershell
psql -U postgres -d researchx -f "database/queries.sql"
```

### 5. Evidence & Screenshots Manifest
Genuine execution logs are saved in `docs/evidence/` and all 13 verified screenshots are in `docs/evidence/screenshots/`:
- `01_dashboard.png`: Live system metrics, domain distribution, and trigger audit trail
- `02_projects_listing.png`: Projects catalog with search, domain filtering, and status pills
- `03_project_submission_form.png`: Student project submission form with domain tags
- `04_project_details_and_review.png`: Project details, 1-click similarity results, and faculty review panel
- `05_project_edit_persistence.png`: Project editing form and persistence verification
- `06_openalex_search.png`: Live OpenAlex academic literature search with DOI/PDF links
- `07_saved_papers.png`: Saved research papers and multi-author relational catalog
- `08_similarity_search.png`: pgvector semantic cosine similarity ranking engine
- `09_sql_table_data_and_counts.png`: Relational schema table counts and user accounts SQL
- `10_sql_joins_and_subqueries.png`: Relational queries 7.1, 7.4, and 7.6 execution proof
- `11_sql_stored_procedures_and_triggers.png`: Stored procedures & trigger audit log execution
- `12_sql_pgvector_cosine_similarity.png`: pgvector HNSW vector index definition and cosine query
- `13_sql_transaction_rollback.png`: Multi-statement transaction rollback under failure proof

