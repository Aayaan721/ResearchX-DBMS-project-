// scripts/generate_seed_embeddings.mjs
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('Connecting to PostgreSQL database: researchx...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/researchx',
  });

  console.log('Loading embedding model Xenova/all-MiniLM-L6-v2...');
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model loaded successfully!');

  async function getEmbedding(text) {
    const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 1000);
    const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  // 1. Index Projects
  console.log('Fetching projects to embed...');
  const { rows: projects } = await pool.query('SELECT project_id, title, problem_statement, description FROM project');
  for (const proj of projects) {
    const textToEmbed = `${proj.title}. ${proj.problem_statement}. ${proj.description || ''}`;
    console.log(`Generating embedding for Project ${proj.project_id}: "${proj.title.slice(0, 40)}..."`);
    const embedding = await getEmbedding(textToEmbed);
    const vectorStr = `[${embedding.join(',')}]`;

    await pool.query(
      `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
       VALUES ('PROJECT', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
       ON CONFLICT (entity_type, entity_id)
       DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
      [proj.project_id, vectorStr]
    );
  }

  // 2. Index Research Papers
  console.log('Fetching research papers to embed...');
  const { rows: papers } = await pool.query('SELECT paper_id, title, abstract, keywords FROM research_paper');
  for (const paper of papers) {
    const textToEmbed = `${paper.title}. ${paper.abstract || ''}. ${paper.keywords || ''}`;
    console.log(`Generating embedding for Paper ${paper.paper_id}: "${paper.title.slice(0, 40)}..."`);
    const embedding = await getEmbedding(textToEmbed);
    const vectorStr = `[${embedding.join(',')}]`;

    await pool.query(
      `INSERT INTO embedding_ref (entity_type, entity_id, embedding, model)
       VALUES ('RESEARCH_PAPER', $1, $2::vector, 'Xenova/all-MiniLM-L6-v2')
       ON CONFLICT (entity_type, entity_id)
       DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, created_at = NOW()`,
      [paper.paper_id, vectorStr]
    );
  }

  console.log('\n--- Verifying Stored Embeddings ---');
  const { rows: countRows } = await pool.query('SELECT entity_type, COUNT(*) as count FROM embedding_ref GROUP BY entity_type');
  console.table(countRows);

  console.log('\n--- Running Test Semantic Similarity Query ---');
  const queryText = 'vector embeddings for semantic similarity and fast search in databases';
  console.log(`Search query: "${queryText}"`);
  const queryEmbedding = await getEmbedding(queryText);
  const qVecStr = `[${queryEmbedding.join(',')}]`;

  const { rows: simResults } = await pool.query(
    `SELECT 
        er.entity_type,
        er.entity_id,
        CASE 
          WHEN er.entity_type = 'PROJECT' THEN p.title
          ELSE rp.title
        END AS title,
        ROUND((1 - (er.embedding <=> $1::vector))::numeric, 4) AS similarity_score
     FROM embedding_ref er
     LEFT JOIN project p ON er.entity_type = 'PROJECT' AND er.entity_id = p.project_id
     LEFT JOIN research_paper rp ON er.entity_type = 'RESEARCH_PAPER' AND er.entity_id = rp.paper_id
     ORDER BY er.embedding <=> $1::vector ASC
     LIMIT 5`,
    [qVecStr]
  );
  console.table(simResults);

  await pool.end();
  console.log('Vector embedding generation completed successfully!');
}

main().catch((err) => {
  console.error('Fatal error in generate_seed_embeddings:', err);
  process.exit(1);
});
