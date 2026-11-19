import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({ connectionString: env.databaseUrl });

// Helper query. Selalu gunakan parameter ($1, $2) agar aman dari SQL injection.
export const query = (text, params) => pool.query(text, params);

export async function testConnection() {
  await pool.query('SELECT 1');
}