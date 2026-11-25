import app from './app.js';
import { env } from './config/env.js';
import { pool, testConnection } from './config/db.js';

try {
  await testConnection();
  console.log('Database terhubung');
} catch (err) {
  console.error('Gagal terhubung ke database:', err.message);
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`Server berjalan di port ${env.port} (${env.nodeEnv})`);
});

// Hentikan dengan rapi saat platform mengganti atau mematikan layanan.
function shutdown(signal) {
  console.log(`${signal} diterima, menutup server...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));