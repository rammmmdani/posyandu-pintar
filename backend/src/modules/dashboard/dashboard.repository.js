import { pool } from "../../config/db.js";

const MONTH_START = `date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta')::date`;
const SCOPED = `SELECT id FROM children WHERE posyandu_id = $1 AND deleted_at IS NULL`;

export async function posyandu(posyanduId) {
  const { rows } = await pool.query(
    "SELECT id, name FROM posyandus WHERE id = $1",
    [posyanduId],
  );
  return rows[0];
}

export async function counts(posyanduId) {
  const { rows } = await pool.query(
    `WITH sc AS (${SCOPED})
     SELECT
       (SELECT count(*)::int FROM children WHERE posyandu_id = $1 AND deleted_at IS NULL AND status = 'aktif') AS children_active,
       (SELECT count(*)::int FROM children WHERE posyandu_id = $1 AND deleted_at IS NULL AND status = 'nonaktif') AS children_inactive,
       (SELECT count(*)::int FROM measurements m WHERE m.child_id IN (SELECT id FROM sc) AND m.measurement_date >= ${MONTH_START}) AS measurements_this_month,
       (SELECT count(DISTINCT m.child_id)::int FROM measurements m WHERE m.child_id IN (SELECT id FROM sc) AND m.measurement_date >= ${MONTH_START}) AS children_measured_this_month,
       (SELECT count(*)::int FROM alerts a WHERE a.child_id IN (SELECT id FROM sc) AND a.status = 'baru') AS alerts_baru,
       (SELECT count(*)::int FROM alerts a WHERE a.child_id IN (SELECT id FROM sc) AND a.status = 'dilihat') AS alerts_dilihat,
       (SELECT count(*)::int FROM alerts a WHERE a.child_id IN (SELECT id FROM sc) AND a.status = 'ditindaklanjuti') AS alerts_ditindaklanjuti,
       (SELECT count(*)::int FROM follow_ups f JOIN alerts a ON a.id = f.alert_id
         WHERE a.child_id IN (SELECT id FROM sc) AND f.action_date >= ${MONTH_START}) AS follow_ups_this_month`,
    [posyanduId],
  );
  return rows[0];
}

// Peringatan yang belum ditangani (baru atau dilihat), per tingkat.
export async function openAlertsBySeverity(posyanduId) {
  const { rows } = await pool.query(
    `SELECT a.severity, count(*)::int AS n FROM alerts a
     JOIN children c ON c.id = a.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
     WHERE a.status IN ('baru', 'dilihat') GROUP BY a.severity`,
    [posyanduId],
  );
  const base = {
    perlu_perhatian: 0,
    perlu_pemeriksaan: 0,
    perlu_tindak_lanjut: 0,
  };
  for (const r of rows) base[r.severity] = r.n;
  return base;
}

export async function attentionList(posyanduId, limit) {
  const { rows } = await pool.query(
    `SELECT a.id, a.child_id, c.name AS child_name, a.severity, a.status, a.message, a.created_at,
            GREATEST(0, (now() AT TIME ZONE 'Asia/Jakarta')::date - (a.created_at AT TIME ZONE 'Asia/Jakarta')::date)::int AS days_open
     FROM alerts a
     JOIN children c ON c.id = a.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
     WHERE a.status IN ('baru', 'dilihat')
     ORDER BY CASE a.severity WHEN 'perlu_tindak_lanjut' THEN 1 WHEN 'perlu_pemeriksaan' THEN 2 ELSE 3 END,
              a.created_at ASC
     LIMIT $2`,
    [posyanduId, limit],
  );
  return rows;
}

// Penilaian terbaru tiap anak (opsional dibatasi periode dan hanya anak aktif).
// Pengukuran tanpa penilaian (perlu diperiksa) otomatis dilewati.
export async function latestAssessments(
  posyanduId,
  { from = null, to = null, activeOnly = false } = {},
) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (m.child_id) m.child_id,
            a.category_bb_u, a.category_tb_u, a.category_bb_tb, a.category_imt_u
     FROM measurements m
     JOIN children c ON c.id = m.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL
                    AND ($4::boolean = FALSE OR c.status = 'aktif')
     JOIN LATERAL (
       SELECT * FROM growth_assessments ga WHERE ga.measurement_id = m.id
       ORDER BY ga.assessed_at DESC, ga.id DESC LIMIT 1
     ) a ON TRUE
     WHERE ($2::date IS NULL OR m.measurement_date >= $2) AND ($3::date IS NULL OR m.measurement_date <= $3)
     ORDER BY m.child_id, m.measurement_date DESC, m.id DESC`,
    [posyanduId, from, to, activeOnly],
  );
  return rows;
}
