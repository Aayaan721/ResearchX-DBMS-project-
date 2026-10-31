import { Pool, QueryResult, QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/researchx';

export const pool: Pool =
  global.__dbPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

export async function query<R extends QueryResultRow = any, I extends any[] = any[]>(
  text: string,
  params?: I
): Promise<QueryResult<R>> {
  const start = Date.now();
  try {
    const res = await pool.query<R>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 200) {
      console.log(`[SQL SLOW] ${text.slice(0, 100)}... (${duration}ms)`);
    }
    return res;
  } catch (error) {
    console.error(`[SQL ERROR] Query: ${text}`);
    console.error(error);
    throw error;
  }
}
