import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';

try {
  await testConnection();
  console.log('Database terhubung');
} catch (err) {
  console.error('Gagal terhubung ke database:', err.message);
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`Server berjalan di http://localhost:${env.port}`);
});