import { pool } from "../../config/db.js";

// Baris referensi dengan age_days terbesar yang <= usia anak, beserta usia maksimum tabel.
export async function findReference(indicator, gender, ageDays, version) {
  const { rows } = await pool.query(
    `SELECT age_days, l, m, s,
       (SELECT max(age_days) FROM who_growth_references
        WHERE indicator = $1 AND gender = $2 AND reference_version = $4) AS max_age
     FROM who_growth_references
     WHERE indicator = $1 AND gender = $2 AND reference_version = $4
       AND age_days IS NOT NULL AND age_days <= $3
     ORDER BY age_days DESC LIMIT 1`,
    [indicator, gender, ageDays, version],
  );
  return rows[0] || null;
}

// Dua baris yang mengapit nilai panjang/tinggi: terbesar yang <= nilai dan terkecil yang >= nilai.
export async function findBracket(indicator, gender, value, version) {
  const base = `SELECT measurement_value AS v, l, m, s FROM who_growth_references
                WHERE indicator = $1 AND gender = $2 AND reference_version = $3 AND measurement_value`;
  const [lower, upper] = await Promise.all([
    pool.query(`${base} <= $4 ORDER BY measurement_value DESC LIMIT 1`, [
      indicator,
      gender,
      version,
      value,
    ]),
    pool.query(`${base} >= $4 ORDER BY measurement_value ASC LIMIT 1`, [
      indicator,
      gender,
      version,
      value,
    ]),
  ]);
  return { lower: lower.rows[0] || null, upper: upper.rows[0] || null };
}

export async function insertAssessment(a) {
  const { rows } = await pool.query(
    `INSERT INTO growth_assessments
       (measurement_id, age_days, zscore_bb_u, category_bb_u, zscore_tb_u, category_tb_u,
        zscore_bb_tb, category_bb_tb, zscore_imt_u, category_imt_u,
        overall_note, reference_version, calculation_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      a.measurement_id,
      a.age_days,
      a.z.bb_u,
      a.cat.bb_u,
      a.z.tb_u,
      a.cat.tb_u,
      a.z.bb_tb,
      a.cat.bb_tb,
      a.z.imt_u,
      a.cat.imt_u,
      a.note,
      a.reference_version,
      a.calculation_version,
    ],
  );
  return rows[0].id;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.*, m.measurement_type FROM growth_assessments a
     JOIN measurements m ON m.id = a.measurement_id WHERE a.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findLatestByMeasurement(measurementId) {
  const { rows } = await pool.query(
    `SELECT a.*, m.measurement_type FROM growth_assessments a
     JOIN measurements m ON m.id = a.measurement_id
     WHERE a.measurement_id = $1 ORDER BY a.assessed_at DESC, a.id DESC LIMIT 1`,
    [measurementId],
  );
  return rows[0] || null;
}

// Titik grafik: satu baris per pengukuran, urut tanggal naik, dengan penilaian terbaru.
export async function listPoints(childId) {
  const { rows } = await pool.query(
    `SELECT m.id AS measurement_id, m.measurement_date, m.weight_kg, m.height_cm, m.validity_status,
            a.zscore_bb_u, a.zscore_tb_u, a.zscore_bb_tb, a.zscore_imt_u,
            a.category_bb_u, a.category_tb_u, a.category_bb_tb, a.category_imt_u
     FROM measurements m
     LEFT JOIN LATERAL (
       SELECT * FROM growth_assessments ga WHERE ga.measurement_id = m.id
       ORDER BY ga.assessed_at DESC, ga.id DESC LIMIT 1
     ) a ON TRUE
     WHERE m.child_id = $1
     ORDER BY m.measurement_date ASC, m.id ASC`,
    [childId],
  );
  return rows;
}
