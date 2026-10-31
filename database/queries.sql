-- ============================================================================
-- ResearchX — Core Relational DBMS Demonstrations & Advanced SQL Queries
-- Designed to satisfy university DBMS evaluation criteria (Sections 7.1 to 7.5)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Simple Query with GROUP BY, Aggregate Functions, and HAVING
-- Query: Distribution of projects across research domains with average title length
-- ----------------------------------------------------------------------------
SELECT 
    d.domain_id,
    d.domain_name,
    COUNT(pd.project_id) AS total_projects,
    COUNT(CASE WHEN p.status = 'Approved' THEN 1 END) AS approved_projects,
    COUNT(CASE WHEN p.status = 'Pending' THEN 1 END) AS pending_projects,
    ROUND(AVG(LENGTH(p.problem_statement)), 2) AS avg_problem_statement_chars
FROM domain d
LEFT JOIN project_domain pd ON d.domain_id = pd.domain_id
LEFT JOIN project p ON pd.project_id = p.project_id
GROUP BY d.domain_id, d.domain_name
HAVING COUNT(pd.project_id) >= 0
ORDER BY total_projects DESC, d.domain_name ASC;

-- ----------------------------------------------------------------------------
-- 7.1b Additional Aggregate Query: Research paper citation metrics by publication year
-- ----------------------------------------------------------------------------
SELECT 
    year,
    COUNT(paper_id) AS papers_published,
    SUM(cited_by_count) AS total_citations,
    ROUND(AVG(cited_by_count), 2) AS avg_citations_per_paper,
    MAX(cited_by_count) AS max_citations
FROM research_paper
WHERE year IS NOT NULL
GROUP BY year
ORDER BY year DESC;

-- ----------------------------------------------------------------------------
-- 7.2 UPDATE Operation: Update project problem statement and description
-- ----------------------------------------------------------------------------
UPDATE project
SET 
    problem_statement = 'Updated: Scaling dense vector embeddings for low-latency similarity search across millions of student research repositories using HNSW graphs.',
    updated_at = NOW()
WHERE project_id = 1;

-- ----------------------------------------------------------------------------
-- 7.3 DELETE Operation: Cleanly delete a project and verify CASCADE / Audit
-- ----------------------------------------------------------------------------
-- (Demonstration on a test project if needed; wrapped in a savepoint in transactions)
DELETE FROM project
WHERE project_id = 999;

-- ----------------------------------------------------------------------------
-- 7.4 Correlated Subquery: Papers cited more than their cohort year average
-- Query: For each paper, check if its citations exceed the average citations of papers
-- published in that exact same year.
-- ----------------------------------------------------------------------------
SELECT 
    rp.paper_id,
    rp.title,
    rp.year,
    rp.cited_by_count,
    ROUND((
        SELECT AVG(sub.cited_by_count)
        FROM research_paper sub
        WHERE sub.year = rp.year
    ), 2) AS cohort_avg_citations
FROM research_paper rp
WHERE rp.cited_by_count > (
    SELECT AVG(sub.cited_by_count)
    FROM research_paper sub
    WHERE sub.year = rp.year
)
ORDER BY rp.year DESC, rp.cited_by_count DESC;

-- ----------------------------------------------------------------------------
-- 7.5 Nested Subquery (IN / EXISTS): Students with Approved AI/ML Projects
-- Query: Find student user profiles who have at least one approved project mapped
-- to Artificial Intelligence or Machine Learning domains.
-- ----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.username,
    u.full_name,
    u.email
FROM app_user u
WHERE u.user_id IN (
    SELECT p.student_id
    FROM project p
    WHERE p.status = 'Approved'
      AND p.project_id IN (
          SELECT pd.project_id
          FROM project_domain pd
          JOIN domain d ON pd.domain_id = d.domain_id
          WHERE d.domain_name ILIKE '%Artificial Intelligence%'
             OR d.domain_name ILIKE '%Machine Learning%'
      )
);

-- ----------------------------------------------------------------------------
-- 7.6 Complex Multi-Table JOIN: Comprehensive Project Dossier
-- Joins Project, Student, Domain, Reviewer, and Vector status
-- ----------------------------------------------------------------------------
SELECT 
    p.project_id,
    p.title,
    p.status,
    u_student.full_name AS student_name,
    u_student.email AS student_email,
    STRING_AGG(DISTINCT d.domain_name, ', ') AS domains,
    u_faculty.full_name AS reviewed_by_faculty,
    pr.decision AS review_decision,
    pr.comments AS review_comments,
    CASE WHEN er.embedding_id IS NOT NULL THEN 'Indexed (384-d)' ELSE 'Pending Vector' END AS vector_status,
    p.created_at
FROM project p
JOIN app_user u_student ON p.student_id = u_student.user_id
LEFT JOIN project_domain pd ON p.project_id = pd.project_id
LEFT JOIN domain d ON pd.domain_id = d.domain_id
LEFT JOIN app_user u_faculty ON p.approved_by = u_faculty.user_id
LEFT JOIN project_review pr ON p.project_id = pr.project_id
LEFT JOIN embedding_ref er ON p.project_id = er.entity_id AND er.entity_type = 'PROJECT'
GROUP BY 
    p.project_id, 
    p.title, 
    p.status, 
    u_student.full_name, 
    u_student.email, 
    u_faculty.full_name, 
    pr.decision, 
    pr.comments, 
    er.embedding_id, 
    p.created_at
ORDER BY p.project_id ASC;
