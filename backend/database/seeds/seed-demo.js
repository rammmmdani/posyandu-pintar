import bcrypt from 'bcryptjs';
import { pool } from '../../src/config/db.js';

// HANYA untuk development dan demo. Data sintetis, bukan data asli.
const DEMO_PASSWORD = 'Demo12345';

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

  console.log('Seed demo selesai.');
  console.log('Login: koordinator@demo.test atau kader@demo.test, password:', DEMO_PASSWORD);
}

main()
  .catch((err) => {
    console.error('Seed gagal:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());