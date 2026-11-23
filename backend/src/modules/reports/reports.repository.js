import { pool } from "../../config/db.js";

const COLS = `r.id, r.report_type, r.period_start, r.period_end, r.status, r.error_message,
  r.private_file_path, r.created_at, json_build_object('id', u.id, 'name', u.name) AS created_by`;
const FROM = "FROM reports r JOIN users u ON u.id = r.created_by";

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO reports (posyandu_id, created_by, report_type, period_start, period_end)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [d.posyandu_id, d.created_by, d.report_type, d.period_start, d.period_end],
  );
  return rows[0].id;
}

export async function markDone(id, relPath) {
  await pool.query(
    `UPDATE reports SET status = 'selesai', private_file_path = $2, error_message = NULL WHERE id = $1`,
    [id, relPath],
  );
}

export async function markFailed(id, message) {
  await pool.query(
    `UPDATE reports SET status = 'gagal', error_message = $2 WHERE id = $1`,
    [id, message],
  );
}

export async function findById(posyanduId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${FROM} WHERE r.id = $1 AND r.posyandu_id = $2`,
    [id, posyanduId],
  );
  return rows[0] || null;
}

export async function list(posyanduId, { limit, offset }) {
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLS} ${FROM} WHERE r.posyandu_id = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT $2 OFFSET $3`,
      [posyanduId, limit, offset],
    ),
    pool.query(
      "SELECT count(*)::int AS total FROM reports WHERE posyandu_id = $1",
      [posyanduId],
    ),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

const TZ_DATE = (col) => `(${col} AT TIME ZONE 'Asia/Jakarta')::date`;

// Ringkasan angka untuk satu periode (from dan to berformat YYYY-MM-DD, keduanya termasuk).
export async function summaryFor(posyanduId, from, to) {
  const { rows } = await pool.query(
    `WITH sc AS (SELECT id FROM children WHERE posyandu_id = $1 AND deleted_at IS NULL)
     SELECT
       (SELECT count(*)::int FROM children WHERE posyandu_id = $1 AND deleted_at IS NULL AND ${TZ_DATE("created_at")} <= $3::date) AS children_registered,
       (SELECT count(*)::int FROM measurements m WHERE m.child_id IN (SELECT id FROM sc) AND m.measurement_date BETWEEN $2::date AND $3::date) AS measurements,
       (SELECT count(DISTINCT m.child_id)::int FROM measurements m WHERE m.child_id IN (SELECT id FROM sc) AND m.measurement_date BETWEEN $2::date AND $3::date) AS children_measured,
       (SELECT count(*)::int FROM alerts a WHERE a.child_id IN (SELECT id FROM sc) AND ${TZ_DATE("a.created_at")} BETWEEN $2::date AND $3::date) AS alerts_created,
       (SELECT count(*)::int FROM follow_ups f JOIN alerts a ON a.id = f.alert_id WHERE a.child_id IN (SELECT id FROM sc) AND f.action_date BETWEEN $2::date AND $3::date) AS follow_ups,
       (SELECT count(*)::int FROM alerts a WHERE a.child_id IN (SELECT id FROM sc) AND a.status IN ('baru', 'dilihat')) AS alerts_unhandled_now`,
    [posyanduId, from, to],
  );
  return rows[0];
}

export async function severityFor(posyanduId, from, to) {
  const { rows } = await pool.query(
    `SELECT a.severity, count(*)::int AS n FROM alerts a
     JOIN children c ON c.id = a.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
     WHERE ${TZ_DATE("a.created_at")} BETWEEN $2::date AND $3::date GROUP BY a.severity`,
    [posyanduId, from, to],
  );
  const base = {
    perlu_perhatian: 0,
    perlu_pemeriksaan: 0,
    perlu_tindak_lanjut: 0,
  };
  for (const r of rows) base[r.severity] = r.n;
  return base;
}

export async function alertsFor(posyanduId, from, to, limit) {
  const { rows } = await pool.query(
    `SELECT a.created_at, c.name AS child_name, a.message, a.severity, a.status,
            count(*) OVER ()::int AS total_rows
     FROM alerts a JOIN children c ON c.id = a.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
     WHERE ${TZ_DATE("a.created_at")} BETWEEN $2::date AND $3::date
     ORDER BY CASE a.severity WHEN 'perlu_tindak_lanjut' THEN 1 WHEN 'perlu_pemeriksaan' THEN 2 ELSE 3 END, a.created_at DESC
     LIMIT $4`,
    [posyanduId, from, to, limit],
  );
  return rows;
}

// Versi referensi dan perhitungan yang dipakai pada penilaian di periode ini (keterlacakan).
export async function versionsFor(posyanduId, from, to) {
  const { rows } = await pool.query(
    `SELECT DISTINCT a.reference_version, a.calculation_version
     FROM growth_assessments a JOIN measurements m ON m.id = a.measurement_id
     JOIN children c ON c.id = m.child_id AND c.posyandu_id = $1
     WHERE m.measurement_date BETWEEN $2::date AND $3::date ORDER BY 1, 2`,
    [posyanduId, from, to],
  );
  return rows;
}
