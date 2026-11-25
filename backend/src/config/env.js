import 'dotenv/config';

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Environment variable ${key} belum diisi. Periksa file .env`);
}

const nodeEnv = process.env.NODE_ENV || 'development';

// Di produksi, tolak konfigurasi yang lemah daripada berjalan diam-diam.
if (nodeEnv === 'production') {
  const secret = process.env.JWT_SECRET;
  if (secret.length < 32 || /ganti|changeme|secret/i.test(secret)) {
    throw new Error('JWT_SECRET produksi harus acak dan minimal 32 karakter');
  }
  if (!process.env.CORS_ORIGIN) throw new Error('CORS_ORIGIN wajib diisi pada produksi');
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET,
  // Boleh lebih dari satu, dipisah koma.
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  // Isi 1 bila di belakang reverse proxy (misalnya Render) agar pembatasan per alamat IP bekerja benar.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
};