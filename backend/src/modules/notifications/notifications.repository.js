import { pool } from '../../config/db.js';

const COLS = 'id, type, body, alert_id, is_read, created_at';

export async function list(userId, { isRead, limit, offset }) {
  const where = 'user_id = $1 AND ($2::boolean IS NULL OR is_read = $2)';
  const [rows, count, unread] = await Promise.all([
    pool.query(`SELECT ${COLS} FROM notifications WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4`, [userId, isRead, limit, offset]),
    pool.query(`SELECT count(*)::int AS total FROM notifications WHERE ${where}`, [userId, isRead]),
    pool.query('SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]),
  ]);
  return { rows: rows.rows, total: count.rows[0].total, unread: unread.rows[0].unread };
}

// Hanya milik pengguna itu sendiri. Mengembalikan null bila tidak ada atau milik orang lain.
export async function markRead(userId, id) {
  const { rows } = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING ${COLS}`,
    [id, userId]
  );
  return rows[0] || null;
}