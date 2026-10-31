-- ============================================================================
-- ResearchX — pgvector Semantic Similarity Queries
-- Uses cosine distance operator (<=>) and cosine similarity = 1 - (v1 <=> v2)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Find Most Similar Projects to a Given Query Embedding (Parameterized)
-- Parameter: $1 = 384-dimensional query vector
-- ----------------------------------------------------------------------------
SELECT 
    p.project_id,
    p.title,
    p.problem_statement,
    p.status,
    u.full_name AS student_name,
    STRING_AGG(DISTINCT d.domain_name, ', ') AS domains,
    ROUND((1 - (er.embedding <=> $1::vector))::numeric, 4) AS similarity_score
FROM embedding_ref er
JOIN project p ON er.entity_type = 'PROJECT' AND er.entity_id = p.project_id
JOIN app_user u ON p.student_id = u.user_id
LEFT JOIN project_domain pd ON p.project_id = pd.project_id
LEFT JOIN domain d ON pd.domain_id = d.domain_id
GROUP BY p.project_id, p.title, p.problem_statement, p.status, u.full_name, er.embedding
ORDER BY er.embedding <=> $1::vector ASC
LIMIT 5;

-- ----------------------------------------------------------------------------
-- 2. Find Similar Projects and Saved Papers to an Existing Project (Excluding itself)
-- Parameter: :target_project_id
-- ----------------------------------------------------------------------------
WITH target_vector AS (
    SELECT embedding
    FROM embedding_ref
    WHERE entity_type = 'PROJECT' AND entity_id = :target_project_id
)
SELECT 
    'PROJECT' AS entity_type,
    p.project_id AS entity_id,
    p.title,
    p.problem_statement AS summary,
    ROUND((1 - (er.embedding <=> tv.embedding))::numeric, 4) AS similarity_score,
    p.status AS status_or_published
FROM target_vector tv
CROSS JOIN embedding_ref er
JOIN project p ON er.entity_type = 'PROJECT' AND er.entity_id = p.project_id
WHERE p.project_id <> :target_project_id
UNION ALL
SELECT 
    'RESEARCH_PAPER' AS entity_type,
    rp.paper_id AS entity_id,
    rp.title,
    rp.abstract AS summary,
    ROUND((1 - (er.embedding <=> tv.embedding))::numeric, 4) AS similarity_score,
    rp.published_in AS status_or_published
FROM target_vector tv
CROSS JOIN embedding_ref er
JOIN research_paper rp ON er.entity_type = 'RESEARCH_PAPER' AND er.entity_id = rp.paper_id
ORDER BY similarity_score DESC
LIMIT 10;
