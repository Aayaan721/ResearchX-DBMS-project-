-- Additive Level 3 migration. Never run schema.sql on an existing database.
-- One transaction; compatibility failures leave all existing data unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS auth_session (
  token_hash CHAR(64) PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id INTEGER NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_session_user ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expiry ON auth_session(expires_at);
CREATE TABLE IF NOT EXISTS auth_login_attempt (
  username VARCHAR(50) PRIMARY KEY,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  window_start TIMESTAMPTZ NOT NULL
);

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM project WHERE length(btrim(title)) NOT BETWEEN 1 AND 255 OR title !~ '[^[:space:]]'
    OR length(btrim(problem_statement)) NOT BETWEEN 10 AND 10000 OR problem_statement !~ '[^[:space:]]'
    OR length(description)>20000) THEN
    RAISE EXCEPTION 'Existing project records need review before Level 3 constraints can be validated';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='project'::regclass AND conname='project_content_valid') THEN
    ALTER TABLE project ADD CONSTRAINT project_content_valid CHECK (
      length(btrim(title)) BETWEEN 1 AND 255 AND title ~ '[^[:space:]]'
      AND length(btrim(problem_statement)) BETWEEN 10 AND 10000 AND problem_statement ~ '[^[:space:]]'
      AND (description IS NULL OR length(description)<=20000)) NOT VALID;
  END IF;
  IF EXISTS(SELECT 1 FROM embedding_ref e WHERE
    (entity_type='PROJECT' AND NOT EXISTS(SELECT 1 FROM project WHERE project_id=e.entity_id)) OR
    (entity_type='RESEARCH_PAPER' AND NOT EXISTS(SELECT 1 FROM research_paper WHERE paper_id=e.entity_id))) THEN
    RAISE EXCEPTION 'Existing orphan embeddings need review; migration does not delete them';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='research_paper'::regclass AND conname='paper_title_nonblank') THEN
    ALTER TABLE research_paper ADD CONSTRAINT paper_title_nonblank CHECK (title ~ '[^[:space:]]') NOT VALID;
  END IF;
END $$;
ALTER TABLE project VALIDATE CONSTRAINT project_content_valid;
ALTER TABLE research_paper VALIDATE CONSTRAINT paper_title_nonblank;

-- Polymorphic parent references need a trigger. Key-share locks serialize child
-- insertion against parent deletion; existing cascade triggers remove vectors.
CREATE OR REPLACE FUNCTION fn_validate_embedding_parent() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type='PROJECT' THEN
    PERFORM 1 FROM project WHERE project_id=NEW.entity_id FOR KEY SHARE;
  ELSIF NEW.entity_type='RESEARCH_PAPER' THEN
    PERFORM 1 FROM research_paper WHERE paper_id=NEW.entity_id FOR KEY SHARE;
  ELSE
    RAISE EXCEPTION 'Invalid embedding entity type' USING ERRCODE='23514';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Embedding parent must exist' USING ERRCODE='23503'; END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='embedding_ref'::regclass AND tgname='trg_embedding_parent') THEN
    CREATE TRIGGER trg_embedding_parent BEFORE INSERT OR UPDATE OF entity_type,entity_id ON embedding_ref
      FOR EACH ROW EXECUTE FUNCTION fn_validate_embedding_parent();
  END IF;
END $$;

-- Primary-key changes must not strand polymorphic embeddings either.
CREATE OR REPLACE FUNCTION fn_guard_embedding_parent_key() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW)->>TG_ARGV[0]) IS DISTINCT FROM (to_jsonb(OLD)->>TG_ARGV[0])
     AND EXISTS(SELECT 1 FROM embedding_ref WHERE entity_type=TG_ARGV[1]
       AND entity_id=(to_jsonb(OLD)->>TG_ARGV[0])::integer) THEN
    RAISE EXCEPTION 'Cannot change an indexed entity identifier' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='project'::regclass AND tgname='trg_project_vector_key') THEN
    CREATE TRIGGER trg_project_vector_key BEFORE UPDATE OF project_id ON project
      FOR EACH ROW EXECUTE FUNCTION fn_guard_embedding_parent_key('project_id','PROJECT');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='research_paper'::regclass AND tgname='trg_paper_vector_key') THEN
    CREATE TRIGGER trg_paper_vector_key BEFORE UPDATE OF paper_id ON research_paper
      FOR EACH ROW EXECUTE FUNCTION fn_guard_embedding_parent_key('paper_id','RESEARCH_PAPER');
  END IF;
END $$;

CREATE OR REPLACE VIEW v_project_overview AS
SELECT p.project_id,p.student_id,p.title,p.status,p.updated_at,
  u.full_name AS student_name,
  (SELECT string_agg(d.domain_name, ', ' ORDER BY d.domain_name)
   FROM project_domain pd JOIN domain d USING(domain_id) WHERE pd.project_id=p.project_id) AS domains,
  (SELECT count(*) FROM project_review pr WHERE pr.project_id=p.project_id) AS review_count,
  EXISTS(SELECT 1 FROM embedding_ref e WHERE e.entity_type='PROJECT' AND e.entity_id=p.project_id) AS is_embedded
FROM project p JOIN app_user u ON p.student_id=u.user_id;
CREATE OR REPLACE VIEW v_domain_statistics AS
SELECT d.domain_id,d.domain_name,count(p.project_id) AS total_projects,
  count(p.project_id) FILTER(WHERE p.status='Approved') AS approved_projects,
  count(p.project_id) FILTER(WHERE p.status='Pending') AS pending_projects
FROM domain d LEFT JOIN project_domain pd USING(domain_id) LEFT JOIN project p USING(project_id)
GROUP BY d.domain_id,d.domain_name;
COMMIT;
