-- ============================================================================
-- ResearchX — Stored Procedures, Functions, and Database Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger Function: Automatically update updated_at timestamp on project
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_timestamp ON project;
CREATE TRIGGER trg_project_timestamp
BEFORE UPDATE ON project
FOR EACH ROW
EXECUTE FUNCTION fn_trg_project_timestamp();

-- ----------------------------------------------------------------------------
-- 2. Trigger Function: Audit Logging for Project Status & Modification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_audit_project_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR OLD.title IS DISTINCT FROM NEW.title) THEN
            INSERT INTO audit_log (table_name, action, record_id, old_values, new_values, changed_at)
            VALUES (
                'project',
                'UPDATE',
                NEW.project_id,
                jsonb_build_object(
                    'title', OLD.title,
                    'status', OLD.status,
                    'approved_by', OLD.approved_by,
                    'updated_at', OLD.updated_at
                ),
                jsonb_build_object(
                    'title', NEW.title,
                    'status', NEW.status,
                    'approved_by', NEW.approved_by,
                    'updated_at', NEW.updated_at
                ),
                NOW()
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, action, record_id, old_values, new_values, changed_at)
        VALUES (
            'project',
            'DELETE',
            OLD.project_id,
            jsonb_build_object(
                'title', OLD.title,
                'status', OLD.status,
                'student_id', OLD.student_id
            ),
            NULL,
            NOW()
        );
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, action, record_id, old_values, new_values, changed_at)
        VALUES (
            'project',
            'INSERT',
            NEW.project_id,
            NULL,
            jsonb_build_object(
                'title', NEW.title,
                'status', NEW.status,
                'student_id', NEW.student_id
            ),
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_project_changes ON project;
CREATE TRIGGER trg_audit_project_changes
AFTER INSERT OR UPDATE OR DELETE ON project
FOR EACH ROW
EXECUTE FUNCTION fn_trg_audit_project_changes();

-- ----------------------------------------------------------------------------
-- 3. Stored Procedure: Atomic Faculty Project Review & Approval Operation
--    Demonstrates transactional integrity across project, review, and audit.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_review_and_approve_project(
    p_project_id INTEGER,
    p_faculty_id INTEGER,
    p_decision VARCHAR(30),
    p_comments TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_role_name VARCHAR(30);
    v_project_exists BOOLEAN;
    v_new_status VARCHAR(30);
BEGIN
    -- Verify project exists
    SELECT EXISTS(SELECT 1 FROM project WHERE project_id = p_project_id) INTO v_project_exists;
    IF NOT v_project_exists THEN
        RAISE EXCEPTION 'Project with ID % does not exist', p_project_id;
    END IF;

    -- Verify that the reviewer is Faculty or Admin
    SELECT r.role_name INTO v_role_name
    FROM app_user u
    JOIN role r ON u.role_id = r.role_id
    WHERE u.user_id = p_faculty_id;

    IF v_role_name IS NULL OR v_role_name NOT IN ('Faculty', 'Admin') THEN
        RAISE EXCEPTION 'User % is not authorized as Faculty or Admin to review projects', p_faculty_id;
    END IF;

    -- Map review decision to project status
    IF p_decision = 'Approved' THEN
        v_new_status := 'Approved';
    ELSIF p_decision = 'Rejected' THEN
        v_new_status := 'Rejected';
    ELSE
        v_new_status := 'Pending';
    END IF;

    -- Perform atomic updates
    -- 1. Insert faculty review record
    INSERT INTO project_review (project_id, faculty_id, decision, comments, review_date)
    VALUES (p_project_id, p_faculty_id, p_decision, p_comments, NOW());

    -- 2. Update project status and approval faculty ID
    UPDATE project
    SET status = v_new_status,
        approved_by = CASE WHEN p_decision = 'Approved' THEN p_faculty_id ELSE NULL END,
        updated_at = NOW()
    WHERE project_id = p_project_id;

    -- Note: Trigger trg_audit_project_changes will automatically record the audit entry!
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Stored Function: Count projects in a given domain
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_domain_project_count(p_domain_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM project_domain
    WHERE domain_id = p_domain_id;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 5. Stored Function: Aggregate Platform Statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_platform_stats()
RETURNS TABLE (
    total_projects BIGINT,
    approved_projects BIGINT,
    pending_projects BIGINT,
    rejected_projects BIGINT,
    total_papers BIGINT,
    total_authors BIGINT,
    total_embeddings BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM project) AS total_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'Approved') AS approved_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'Pending') AS pending_projects,
        (SELECT COUNT(*) FROM project WHERE status = 'Rejected') AS rejected_projects,
        (SELECT COUNT(*) FROM research_paper) AS total_papers,
        (SELECT COUNT(*) FROM author) AS total_authors,
        (SELECT COUNT(*) FROM embedding_ref) AS total_embeddings;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 6. Trigger Function: Cascade Delete for Polymorphic embedding_ref
-- Ensures zero orphan vectors when a project or research_paper is deleted directly.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_trg_cascade_delete_embeddings()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'project') THEN
        DELETE FROM embedding_ref 
        WHERE entity_type = 'PROJECT' AND entity_id = OLD.project_id;
        RETURN OLD;
    ELSIF (TG_TABLE_NAME = 'research_paper') THEN
        DELETE FROM embedding_ref 
        WHERE entity_type = 'RESEARCH_PAPER' AND entity_id = OLD.paper_id;
        RETURN OLD;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cascade_project_embeddings ON project;
CREATE TRIGGER trg_cascade_project_embeddings
BEFORE DELETE ON project
FOR EACH ROW
EXECUTE FUNCTION fn_trg_cascade_delete_embeddings();

DROP TRIGGER IF EXISTS trg_cascade_paper_embeddings ON research_paper;
CREATE TRIGGER trg_cascade_paper_embeddings
BEFORE DELETE ON research_paper
FOR EACH ROW
EXECUTE FUNCTION fn_trg_cascade_delete_embeddings();
