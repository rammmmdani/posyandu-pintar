import { pool } from "../../config/db.js";

const COLS = `a.id, a.child_id, c.name AS child_name, a.assessment_id, a.type, a.severity, a.message,
  a.recommendation, a.status, a.status_note, a.created_at, a.updated_at`;

// Selalu lewat tabel children dan posyandu_id: peringatan Posyandu lain dianggap tidak ada.
const SCOPED = `FROM alerts a JOIN children c ON c.id = a.child_id AND c.posyandu_id = $1 AND c.deleted_at IS NULL`;

export async function list(
  posyanduId,
  { status, severity, childId, limit, offset },
) {
  const where = `WHERE ($2::text IS NULL OR a.status = $2)
                   AND ($3::text IS NULL OR a.severity = $3)
                   AND ($4::bigint IS NULL OR a.child_id = $4)`;
  const params = [posyanduId, status, severity, childId];
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLS} ${SCOPED} ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT $5 OFFSET $6`,
      [...params, limit, offset],
    ),
    pool.query(`SELECT count(*)::int AS total ${SCOPED} ${where}`, params),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

export async function findById(posyanduId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLS} ${SCOPED} WHERE a.id = $2`,
    [posyanduId, id],
  );
  return rows[0] || null;
}

// Untuk pemakaian internal (peringatan yang baru dibuat), tanpa pembatasan Posyandu.
export async function findManyByIds(ids) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM alerts a JOIN children c ON c.id = a.child_id WHERE a.id = ANY($1::bigint[]) ORDER BY a.id`,
    [ids],
  );
  return rows;
}

// Mengembalikan id baru, atau null bila peringatan yang sama sudah ada (indeks unik assessment_id + type).
export async function insert(a) {
  const { rows } = await pool.query(
    `INSERT INTO alerts (child_id, assessment_id, type, severity, message, recommendation)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (assessment_id, type) DO NOTHING RETURNING id`,
    [
      a.child_id,
      a.assessment_id,
      a.type,
      a.severity,
      a.message,
      a.recommendation,
    ],
  );
  return rows[0] ? rows[0].id : null;
}

// Menutup peringatan terbuka dari penilaian lain pada pengukuran yang sama.
export async function supersedeOpen(measurementId, keepAssessmentId, note) {
  const { rows } = await pool.query(
    `UPDATE alerts SET status = 'ditutup', status_note = $3, updated_at = now()
     WHERE status IN ('baru', 'dilihat')
       AND assessment_id IN (SELECT id FROM growth_assessments WHERE measurement_id = $1 AND id <> $2)
     RETURNING id`,
    [measurementId, keepAssessmentId, note],
  );
  return rows.map((r) => r.id);
}

// Satu notifikasi per pengguna aktif di Posyandu anak. Indeks unik mencegah duplikasi.
export async function notify(alertIds) {
  await pool.query(
    `INSERT INTO notifications (user_id, alert_id, type, body)
     SELECT u.id, a.id, 'alert_baru', c.name || ': ' || a.message
     FROM alerts a
     JOIN children c ON c.id = a.child_id
     JOIN users u ON u.posyandu_id = c.posyandu_id AND u.is_active
     WHERE a.id = ANY($1::bigint[])
     ON CONFLICT (user_id, alert_id, type) WHERE alert_id IS NOT NULL DO NOTHING`,
    [alertIds],
  );
}

export async function updateStatus(posyanduId, id, status, note) {
  await pool.query(
    `UPDATE alerts SET status = $3, status_note = $4, updated_at = now()
     WHERE id = $2 AND child_id IN (SELECT id FROM children WHERE posyandu_id = $1 AND deleted_at IS NULL)`,
    [posyanduId, id, status, note],
  );
}

const FU_COLS = `f.id, f.alert_id, f.action_date, f.action_note, f.referral_status,
  json_build_object('id', u.id, 'name', u.name) AS recorded_by, f.created_at`;

export async function insertFollowUp(f) {
  const { rows } = await pool.query(
    `INSERT INTO follow_ups (alert_id, recorded_by, action_date, action_note, referral_status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      f.alert_id,
      f.recorded_by,
      f.action_date,
      f.action_note,
      f.referral_status,
    ],
  );
  return rows[0].id;
}

export async function findFollowUp(id) {
  const { rows } = await pool.query(
    `SELECT ${FU_COLS} FROM follow_ups f JOIN users u ON u.id = f.recorded_by WHERE f.id = $1`,
    [id],
  );
  return rows[0];
}

export async function listFollowUps(alertId) {
  const { rows } = await pool.query(
    `SELECT ${FU_COLS} FROM follow_ups f JOIN users u ON u.id = f.recorded_by
     WHERE f.alert_id = $1 ORDER BY f.action_date DESC, f.id DESC`,
    [alertId],
  );
  return rows;
}
