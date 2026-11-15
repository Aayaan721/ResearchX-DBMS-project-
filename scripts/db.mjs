import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured');
export const connectionString = process.env.DATABASE_URL;
export function database() { return new pg.Pool({ connectionString }); }
