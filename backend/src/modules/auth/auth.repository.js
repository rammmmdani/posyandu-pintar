import { query } from '../../config/db.js';

const PUBLIC_COLUMNS = 'id, posyandu_id, name, email, role, is_active';

export async function findByEmail(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

// Dipakai di setiap request: akun nonaktif otomatis tidak ditemukan.
export async function findActiveById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return rows[0] || null;
}

export async function touchLastLogin(id) {
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
}