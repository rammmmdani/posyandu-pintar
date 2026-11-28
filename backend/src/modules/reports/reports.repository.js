import { pool } from '../../config/db.js';
import { AGE_SQL, CONSENT_SQL } from '../children/children.repository.js';

const COLUMNS = `r.id, r.created_by AS created_by_id, r.report_type, r.period_start, r.period_end,
  r.status, r.error_message, r.created_at,
  json_build_object('id', u.id, 'name', u.name) AS created_by`;

export async function list(posyanduId, { limit, offset }) {
  const where = 'r.posyandu_id = $1';
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS} FROM reports r
       JOIN users u ON u.id = r.created_by
       WHERE ${where}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $2 OFFSET $3`,
      [posyanduId, limit, offset]
    ),
    pool.query(`SELECT count(*)::int AS total FROM reports r WHERE ${where}`, [posyanduId]),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

export async function findById(posyanduId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM reports r
     JOIN users u ON u.id = r.created_by
     WHERE r.id = $1 AND r.posyandu_id = $2`,
    [id, posyanduId]
  );
  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO reports (posyandu_id, created_by, report_type, period_start, period_end, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      d.posyandu_id,
      d.created_by,
      d.report_type,
      d.period_start,
      d.period_end,
      d.status,
      d.error_message || null,
    ]
  );
  return rows[0].id;
}

export async function summary(posyanduId, periodStart, periodEnd) {
  const [overview, rtRows, alertRows, childRows, measurementRows] = await Promise.all([
    pool.query(
      `SELECT
         count(*) FILTER (WHERE c.status = 'aktif')::int AS active_children,
         (SELECT count(*)::int
          FROM measurements m
          JOIN children cm ON cm.id = m.child_id AND cm.posyandu_id = $1 AND cm.deleted_at IS NULL
          WHERE m.measurement_date BETWEEN $2 AND $3) AS measurements,
         (SELECT count(*)::int
          FROM alerts a
          JOIN children ca ON ca.id = a.child_id AND ca.posyandu_id = $1 AND ca.deleted_at IS NULL
          WHERE a.created_at::date BETWEEN $2 AND $3) AS alerts,
         (SELECT count(*)::int
          FROM alerts a
          JOIN children ca ON ca.id = a.child_id AND ca.posyandu_id = $1 AND ca.deleted_at IS NULL
          WHERE a.created_at::date BETWEEN $2 AND $3
            AND a.status IN ('ditindaklanjuti', 'ditutup')) AS handled_alerts
       FROM children c
       WHERE c.posyandu_id = $1 AND c.deleted_at IS NULL`,
      [posyanduId, periodStart, periodEnd]
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(rt, ''), '-') AS rt, COALESCE(NULLIF(rw, ''), '-') AS rw, count(*)::int AS total
       FROM children
       WHERE posyandu_id = $1 AND deleted_at IS NULL AND status = 'aktif'
       GROUP BY 1, 2
       ORDER BY 1, 2`,
      [posyanduId]
    ),
    pool.query(
      `SELECT c.name AS child_name, a.type, a.severity, a.status, a.created_at::date AS created_date
       FROM alerts a
       JOIN children c ON c.id = a.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
       WHERE a.created_at::date BETWEEN $2 AND $3
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 8`,
      [posyanduId, periodStart, periodEnd]
    ),
    pool.query(
      `SELECT c.name, c.birth_date, c.gender, c.parent_name, c.rt, c.rw, c.status,
              ${AGE_SQL} AS age_months, ${CONSENT_SQL} AS consent_status
       FROM children c
       WHERE c.posyandu_id = $1 AND c.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM measurements m
           WHERE m.child_id = c.id AND m.measurement_date BETWEEN $2 AND $3
         )
       ORDER BY COALESCE(c.rt, ''), COALESCE(c.rw, ''), lower(c.name), c.id`,
      [posyanduId, periodStart, periodEnd]
    ),
    pool.query(
      `SELECT c.name AS child_name, m.measurement_date, m.weight_kg, m.height_cm,
              m.measurement_type, m.validity_status
       FROM measurements m
       JOIN children c ON c.id = m.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
       WHERE m.measurement_date BETWEEN $2 AND $3
       ORDER BY COALESCE(c.rt, ''), COALESCE(c.rw, ''), lower(c.name), c.id,
                m.measurement_date, m.id`,
      [posyanduId, periodStart, periodEnd]
    ),
  ]);

  return {
    ...overview.rows[0],
    rt: rtRows.rows,
    alerts_recent: alertRows.rows,
    children_detail: childRows.rows,
    measurement_rows: measurementRows.rows,
  };
}
