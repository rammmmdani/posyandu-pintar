import bcrypt from 'bcryptjs';
import { pool } from '../../src/config/db.js';

// HANYA untuk development dan demo. Data sintetis, bukan data asli.
// HANYA untuk development dan demo. Data sintetis, bukan data asli.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345';

const remote =
  process.env.NODE_ENV === 'production' ||
  process.env.DATABASE_SSL === 'true';

if (remote && !process.env.DEMO_PASSWORD) {
  throw new Error(
    'Untuk database publik, isi DEMO_PASSWORD dengan kata sandi baru (jangan pakai bawaan).'
  );
}

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  let { rows } = await pool.query("SELECT id FROM posyandus WHERE name = 'Posyandu Demo'");
  if (rows.length === 0) {
    ({ rows } = await pool.query(
      "INSERT INTO posyandus (name, address, region) VALUES ('Posyandu Demo', 'Alamat contoh', 'Wilayah contoh') RETURNING id"
    ));
  }
  const posyanduId = rows[0].id;

  const users = [
    { name: 'Koordinator Demo', email: 'koordinator@demo.test', role: 'koordinator' },
    { name: 'Kader Demo', email: 'kader@demo.test', role: 'kader' },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (posyandu_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ((lower(email))) DO NOTHING`,
      [posyanduId, u.name, u.email, hash, u.role]
    );
  }

  console.log('Seed demo selesai. Akun: koordinator@demo.test dan kader@demo.test');

  if (!process.env.DEMO_PASSWORD) {
  console.log('Password pengembangan:', DEMO_PASSWORD);
  }
}

main()
  .catch((err) => {
    console.error('Seed gagal:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());