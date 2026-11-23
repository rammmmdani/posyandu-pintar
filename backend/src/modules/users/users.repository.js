import { pool } from '../../config/db.js';

const COLUMNS = 'id, name, email, role, is_active, last_login_at';
const UPDATABLE = ['name', 'role', 'is_active', 'password_hash'];

export async function list(posyanduId, { q, isActive, limit, offset }) {
  const like = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const where = `posyandu_id = $1 AND ($2::text IS NULL OR name ILIKE $2 OR email ILIKE $2)
                 AND ($3::boolean IS NULL OR is_active = $3)`;
  const params = [posyanduId, like, isActive];
  const [rows, count] = await Promise.all([
    pool.query(`SELECT ${COLUMNS} FROM users WHERE ${where} ORDER BY lower(name), id LIMIT $4 OFFSET $5`, [...params, limit, offset]),
    pool.query(`SELECT count(*)::int AS total FROM users WHERE ${where}`, params),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

export async function findById(posyanduId, id) {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM users WHERE id = $1 AND posyandu_id = $2`, [id, posyanduId]);
  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO users (posyandu_id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [d.posyandu_id, d.name, d.email, d.password_hash, d.role]
  );
  return rows[0].id;
}

export async function update(posyanduId, id, patch) {
  // Nama kolom berasal dari daftar tetap UPDATABLE, bukan dari input pengguna.
  const keys = UPDATABLE.filter((k) => patch[k] !== undefined);
  const sets = keys.map((k, i) => `${k} = $${i + 3}`);
  await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND posyandu_id = $2`,
    [id, posyanduId, ...keys.map((k) => patch[k])]
  );
}