-- ============================================================================
-- ResearchX — Relational & Vector Schema DDL (PostgreSQL 16 + pgvector)
-- Scope: Full relational schema with vector similarity support for ResearchX
-- ============================================================================

-- Enable the pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS embedding_ref CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS project_review CASCADE;
DROP TABLE IF EXISTS paper_author CASCADE;
DROP TABLE IF EXISTS author CASCADE;
DROP TABLE IF EXISTS research_paper CASCADE;
DROP TABLE IF EXISTS project_domain CASCADE;
DROP TABLE IF EXISTS project CASCADE;
DROP TABLE IF EXISTS domain CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS role CASCADE;

-- ----------------------------------------------------------------------------
-- 1. ROLE: System access levels ('Admin', 'Student', 'Faculty')
-- ----------------------------------------------------------------------------
CREATE TABLE role (
    role_id SMALLINT PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE,
    CHECK (role_name IN ('Admin', 'Student', 'Faculty'))
);

-- ----------------------------------------------------------------------------
-- 2. APP_USER: Registered students, faculty reviewers, and administrators
-- ----------------------------------------------------------------------------
CREATE TABLE app_user (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    role_id SMALLINT NOT NULL REFERENCES role(role_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. DOMAIN: Research classification categories (e.g. AI/ML, NLP, Cloud)
-- ----------------------------------------------------------------------------
CREATE TABLE domain (
    domain_id SERIAL PRIMARY KEY,
    domain_name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT
);

-- ----------------------------------------------------------------------------
-- 4. PROJECT: Student submitted research proposals and capstone projects
-- ----------------------------------------------------------------------------
CREATE TABLE project (
    project_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    problem_statement TEXT NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    approved_by INTEGER REFERENCES app_user(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

-- ----------------------------------------------------------------------------
-- 5. PROJECT_DOMAIN: Many-to-Many mapping of projects to research domains
-- ----------------------------------------------------------------------------
CREATE TABLE project_domain (
    project_id INTEGER NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    domain_id INTEGER NOT NULL REFERENCES domain(domain_id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, domain_id)
);

-- ----------------------------------------------------------------------------
-- 6. RESEARCH_PAPER: Stored academic papers (locally indexed & saved from OpenAlex)
-- ----------------------------------------------------------------------------
CREATE TABLE research_paper (
    paper_id SERIAL PRIMARY KEY,
    openalex_id VARCHAR(100) UNIQUE,
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    keywords TEXT,
    doi VARCHAR(255) UNIQUE,
    file_url VARCHAR(500),
    published_in VARCHAR(255),
    year SMALLINT,
    cited_by_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (cited_by_count >= 0)
);

-- ----------------------------------------------------------------------------
-- 7. AUTHOR: Academic researchers and paper contributors
-- ----------------------------------------------------------------------------
CREATE TABLE author (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    affiliation VARCHAR(255),
    email VARCHAR(120)
);

-- ----------------------------------------------------------------------------
-- 8. PAPER_AUTHOR: Many-to-Many relationship between papers and authors
-- ----------------------------------------------------------------------------
CREATE TABLE paper_author (
    paper_id INTEGER NOT NULL REFERENCES research_paper(paper_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES author(author_id) ON DELETE CASCADE,
    author_order SMALLINT NOT NULL DEFAULT 1,
    PRIMARY KEY (paper_id, author_id)
);

-- ----------------------------------------------------------------------------
-- 9. PROJECT_REVIEW: Faculty reviews, approval decisions, and evaluation notes
-- ----------------------------------------------------------------------------
CREATE TABLE project_review (
    review_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
    decision VARCHAR(30) NOT NULL,
    comments TEXT,
    review_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (decision IN ('Approved', 'Rejected', 'Changes Required'))
);

-- ----------------------------------------------------------------------------
-- 10. AUDIT_LOG: Audit trail for tracking changes to critical entities
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    record_id INTEGER NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. EMBEDDING_REF: 384-dimensional dense vectors for semantic similarity
-- ----------------------------------------------------------------------------
CREATE TABLE embedding_ref (
    embedding_id SERIAL PRIMARY KEY,
    entity_type VARCHAR(30) NOT NULL,
    entity_id INTEGER NOT NULL,
    embedding vector(384) NOT NULL,
    model VARCHAR(150) NOT NULL DEFAULT 'Xenova/all-MiniLM-L6-v2',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (entity_type IN ('PROJECT', 'RESEARCH_PAPER')),
    UNIQUE (entity_type, entity_id)
);

-- ----------------------------------------------------------------------------
-- Indexes for Relational Performance & Vector Retrieval
-- ----------------------------------------------------------------------------
CREATE INDEX idx_project_student ON project(student_id);
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_paper_year ON research_paper(year);
CREATE INDEX idx_paper_openalex ON research_paper(openalex_id);
CREATE INDEX idx_embedding_entity ON embedding_ref(entity_type, entity_id);
CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);

-- HNSW Vector Index for efficient approximate nearest-neighbor cosine queries
CREATE INDEX idx_embedding_vector_hnsw ON embedding_ref 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
