import { pool } from '../../config/db.js';

const COLUMNS = `m.id, m.child_id, m.measurement_date, m.weight_kg, m.height_cm, m.measurement_type,
  m.validity_status, m.notes, m.version,
  json_build_object('id', u.id, 'name', u.name) AS measured_by, m.created_at`;

const FROM_USER = 'FROM measurements m JOIN users u ON u.id = m.measured_by';

// Ringkasan penilaian terbaru, untuk daftar riwayat.
const ASSESSMENT_SUMMARY = `CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object(
  'id', a.id,
  'zscores', json_build_object('bb_u', a.zscore_bb_u, 'tb_u', a.zscore_tb_u,
                               'bb_tb', a.zscore_bb_tb, 'imt_u', a.zscore_imt_u),
  'categories', json_build_object('bb_u', a.category_bb_u, 'tb_u', a.category_tb_u,
                                  'bb_tb', a.category_bb_tb, 'imt_u', a.category_imt_u)
) END AS assessment`;

// Selalu lewat tabel children agar pengukuran Posyandu lain dianggap tidak ada.
export async function findById(posyanduId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} ${FROM_USER}
     JOIN children c ON c.id = m.child_id AND c.posyandu_id = $2 AND c.deleted_at IS NULL
     WHERE m.id = $1`,
    [id, posyanduId]
  );
  return rows[0] || null;
}

export async function findLatestByChild(childId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} ${FROM_USER} WHERE m.child_id = $1
     ORDER BY m.measurement_date DESC, m.id DESC LIMIT 1`,
    [childId]
  );
  return rows[0] || null;
}

export async function listByChild(childId, { limit, offset, order }) {
  const dir = order === 'asc' ? 'ASC' : 'DESC'; // dipetakan dari nilai tetap, aman
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT ${COLUMNS}, ${ASSESSMENT_SUMMARY} ${FROM_USER}
       LEFT JOIN LATERAL (
         SELECT * FROM growth_assessments ga WHERE ga.measurement_id = m.id
         ORDER BY ga.assessed_at DESC, ga.id DESC LIMIT 1
       ) a ON TRUE
       WHERE m.child_id = $1
       ORDER BY m.measurement_date ${dir}, m.id ${dir} LIMIT $2 OFFSET $3`,
      [childId, limit, offset]
    ),
    pool.query('SELECT count(*)::int AS total FROM measurements WHERE child_id = $1', [childId]),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

export async function findDuplicate(childId, d, excludeId = 0) {
  const { rows } = await pool.query(
    `SELECT id FROM measurements
     WHERE child_id = $1 AND id <> $6 AND measurement_date = $2
       AND weight_kg IS NOT DISTINCT FROM $3::numeric
       AND height_cm IS NOT DISTINCT FROM $4::numeric
       AND measurement_type IS NOT DISTINCT FROM $5::text
     LIMIT 1`,
    [childId, d.measurement_date, d.weight_kg, d.height_cm, d.measurement_type, excludeId]
  );
  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO measurements
       (child_id, measured_by, measurement_date, weight_kg, height_cm, measurement_type, validity_status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [d.child_id, d.measured_by, d.measurement_date, d.weight_kg, d.height_cm,
     d.measurement_type, d.validity_status, d.notes]
  );
  return rows[0].id;
}

// Hanya berhasil jika version masih sama (optimistic locking). Mengembalikan true/false.
export async function updateVersioned(id, version, d) {
  const { rowCount } = await pool.query(
    `UPDATE measurements
     SET measurement_date = $3, weight_kg = $4, height_cm = $5, measurement_type = $6,
         validity_status = $7, notes = $8, version = version + 1, updated_at = now()
     WHERE id = $1 AND version = $2`,
    [id, version, d.measurement_date, d.weight_kg, d.height_cm,
     d.measurement_type, d.validity_status, d.notes]
  );
  return rowCount === 1;
}