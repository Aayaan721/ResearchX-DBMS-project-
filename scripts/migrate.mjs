import { readFile } from 'node:fs/promises';
import { database } from './db.mjs';
const pool = database();
try {
  await pool.query(await readFile(new URL('../database/migrations/001_level3.sql', import.meta.url), 'utf8'));
  console.log('Level 3 migration committed (idempotent, no existing tables dropped).');
} finally { await pool.end(); }
