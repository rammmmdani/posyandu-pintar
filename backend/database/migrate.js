import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../src/config/db.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const filename of files) {
    const { rowCount } = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
    if (rowCount > 0) continue;

    const sql = await readFile(join(migrationsDir, filename), 'utf8');
    await withTransaction(async (db) => {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    });
    process.stdout.write(`Migration diterapkan: ${filename}\n`);
  }
}

main()
  .catch((err) => {
    process.stderr.write(`Migration gagal: ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
