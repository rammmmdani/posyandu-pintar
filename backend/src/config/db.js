import pg from 'pg';
import { env } from './env.js';

// Samakan tipe data dengan API Contract.
pg.types.setTypeParser(20, (v) => Number(v));      // BIGINT  -> number
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number
pg.types.setTypeParser(1082, (v) => v);             // DATE    -> 'YYYY-MM-DD'

export const pool = new pg.Pool({ connectionString: env.databaseUrl });

// Selalu gunakan parameter ($1, $2) agar aman dari SQL injection.
export const query = (text, params) => pool.query(text, params);

export async function testConnection() {
  await pool.query('SELECT 1');
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}