import { pool } from '../../config/db.js';

// Usia dalam bulan penuh, dihitung di database.
export const AGE_SQL = `CASE WHEN c.birth_date IS NULL THEN NULL
  ELSE (EXTRACT(YEAR FROM age(CURRENT_DATE, c.birth_date)) * 12
      + EXTRACT(MONTH FROM age(CURRENT_DATE, c.birth_date)))::int END`;

// Status persetujuan terbaru anak.
export const CONSENT_SQL = `COALESCE((
  SELECT g.consent_status FROM guardian_consents g
  WHERE g.child_id = c.id ORDER BY g.created_at DESC, g.id DESC LIMIT 1
), 'belum_ada')`;

const CHILD_COLUMNS = `c.id, c.name, c.birth_date, c.gender, c.parent_name, c.parent_phone,
  c.address, c.rt, c.rw, c.status, c.created_at, c.updated_at,
  ${AGE_SQL} AS age_months, ${CONSENT_SQL} AS consent_status`;

const UPDATABLE = ['name', 'birth_date', 'gender', 'parent_name', 'parent_phone', 'address', 'rt', 'rw'];

export async function list(posyanduId, { q, status, limit, offset, single = false, rt = null, rw = null }) {
  // Escape karakter khusus LIKE agar pencarian "50%" tidak dianggap wildcard.
  const term = q ? String(q).trim() : '';
  const escaped = term.replace(/[\\%_]/g, '\\$&');
  const like = term ? `%${escaped}%` : null;
  const prefix = term ? `${escaped}%` : null;
  const deletedOnly = status === 'terhapus';
  const where = `c.posyandu_id = $1 AND ${deletedOnly ? 'c.deleted_at IS NOT NULL' : 'c.deleted_at IS NULL'}
    AND ($2::text IS NULL OR c.status = $2)
    AND ($3::text IS NULL OR c.name ILIKE $3 OR c.parent_name ILIKE $3)
    AND ($4::text IS NULL OR c.rt = $4)
    AND ($5::text IS NULL OR c.rw = $5)`;
  const whereParams = [posyanduId, deletedOnly ? null : (status ?? null), like, rt ?? null, rw ?? null];
  const relevanceParams = term ? [term, prefix] : [];
  const termIndex = whereParams.length + 1;
  const prefixIndex = termIndex + 1;
  const queryParams = [...whereParams, ...relevanceParams, limit, offset];
  const limitIndex = queryParams.length - 1;
  const offsetIndex = queryParams.length;
  const order = term
    ? `ORDER BY CASE
        WHEN lower(c.name) = lower($${termIndex}) THEN 0
        WHEN c.name ILIKE $${prefixIndex} THEN 1
        WHEN c.name ILIKE $3 THEN 2
        WHEN lower(c.parent_name) = lower($${termIndex}) THEN 3
        WHEN c.parent_name ILIKE $${prefixIndex} THEN 4
        ELSE 5 END, lower(c.name), c.id`
    : 'ORDER BY lower(c.name), c.id';

  const rowsPromise = pool.query(
    `SELECT ${CHILD_COLUMNS} FROM children c WHERE ${where}
     ${order} LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    queryParams
  );

  if (single && term) {
    const { rows } = await rowsPromise;
    return { rows, total: rows.length };
  }

  const [rows, count] = await Promise.all([
    rowsPromise,
    pool.query(`SELECT count(*)::int AS total FROM children c WHERE ${where}`, whereParams),
  ]);
  return { rows: rows.rows, total: count.rows[0].total };
}

// Selalu menyertakan posyandu_id: anak Posyandu lain dianggap tidak ada.
export async function findById(posyanduId, id, db = pool) {
  const { rows } = await db.query(
    `SELECT ${CHILD_COLUMNS} FROM children c
     WHERE c.id = $1 AND c.posyandu_id = $2 AND c.deleted_at IS NULL`,
    [id, posyanduId]
  );
  return rows[0] || null;
}

export async function findDeletedById(posyanduId, id, db = pool) {
  const { rows } = await db.query(
    `SELECT ${CHILD_COLUMNS} FROM children c
     WHERE c.id = $1 AND c.posyandu_id = $2 AND c.deleted_at IS NOT NULL`,
    [id, posyanduId]
  );
  return rows[0] || null;
}

export async function findDuplicates(posyanduId, { name, gender, birth_date }) {
  const { rows } = await pool.query(
    `SELECT id, name, birth_date, parent_name FROM children
     WHERE posyandu_id = $1 AND deleted_at IS NULL
       AND lower(name) = lower($2) AND gender = $3
       AND birth_date IS NOT DISTINCT FROM $4::date
     ORDER BY id LIMIT 5`,
    [posyanduId, name, gender, birth_date]
  );
  return rows;
}

export async function insert(db, d) {
  const { rows } = await db.query(
    `INSERT INTO children (posyandu_id, name, birth_date, gender, parent_name, parent_phone, address, rt, rw, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      d.posyandu_id, d.name, d.birth_date, d.gender, d.parent_name, d.parent_phone,
      d.address, d.rt ?? null, d.rw ?? null, d.created_by,
    ]
  );
  return rows[0].id;
}

export async function update(posyanduId, id, patch) {
  // Nama kolom berasal dari daftar tetap UPDATABLE, bukan dari input pengguna.
  const keys = UPDATABLE.filter((k) => patch[k] !== undefined);
  const sets = keys.map((k, i) => `${k} = $${i + 3}`);
  await pool.query(
    `UPDATE children SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $1 AND posyandu_id = $2 AND deleted_at IS NULL`,
    [id, posyanduId, ...keys.map((k) => patch[k])]
  );
}

export async function setStatus(posyanduId, id, status) {
  await pool.query(
    `UPDATE children SET status = $3, updated_at = now()
     WHERE id = $1 AND posyandu_id = $2 AND deleted_at IS NULL`,
    [id, posyanduId, status]
  );
}

export async function softDelete(posyanduId, id, db = pool) {
  const { rowCount } = await db.query(
    `UPDATE children SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND posyandu_id = $2 AND deleted_at IS NULL`,
    [id, posyanduId]
  );
  return rowCount > 0;
}

export async function restore(posyanduId, id, db = pool) {
  const { rowCount } = await db.query(
    `UPDATE children SET deleted_at = NULL, updated_at = now()
     WHERE id = $1 AND posyandu_id = $2 AND deleted_at IS NOT NULL`,
    [id, posyanduId]
  );
  return rowCount > 0;
}

const CONSENT_COLUMNS = `g.id, g.guardian_name, g.consent_status, g.method, g.notice_version,
  g.consented_at, g.withdrawn_at,
  json_build_object('id', u.id, 'name', u.name) AS recorded_by`;

export async function insertConsent(db, c) {
  const { rows } = await db.query(
    `INSERT INTO guardian_consents
       (child_id, guardian_name, consent_status, method, notice_version, consented_at, withdrawn_at, recorded_by)
     VALUES ($1, $2, $3::text, $4, $5,
       CASE WHEN $3::text = 'diberikan' THEN now() END,
       CASE WHEN $3::text = 'ditarik' THEN now() END,
       $6)
     RETURNING id`,
    [c.child_id, c.guardian_name, c.consent_status, c.method, c.notice_version, c.recorded_by]
  );
  return rows[0].id;
}

export async function findConsent(id) {
  const { rows } = await pool.query(
    `SELECT ${CONSENT_COLUMNS} FROM guardian_consents g JOIN users u ON u.id = g.recorded_by WHERE g.id = $1`,
    [id]
  );
  return rows[0];
}

export async function listConsents(childId) {
  const { rows } = await pool.query(
    `SELECT ${CONSENT_COLUMNS} FROM guardian_consents g JOIN users u ON u.id = g.recorded_by
     WHERE g.child_id = $1 ORDER BY g.created_at DESC, g.id DESC`,
    [childId]
  );
  return rows;
}