import * as repo from "./growth.repository.js";
import { ageInDays } from "./age.js";
import { lmsZScore, roundZ } from "./zscore.js";
import { categorize, labelFor } from "./categories.js";
import { ageInMonths } from "../../utils/dates.js";
import { interpolateLms } from "./interpolate.js";
import {
  REFERENCE_VERSION,
  CALCULATION_VERSION,
  COVERAGE_EXTRA_DAYS,
  STANDING_FROM_DAYS,
  MAX_REFERENCE_AGE_DAYS,
} from "./growth.config.js";

const INDICATORS = {
  bb_u: { label: "Berat badan menurut umur" },
  tb_u: { label: "Panjang/tinggi badan menurut umur" },
  bb_tb: { label: "Berat badan menurut panjang/tinggi badan" },
  imt_u: { label: "IMT menurut umur" },
};

const NO_CATEGORY =
  "Kategori belum dikonfigurasi (menunggu verifikasi Permenkes No. 2 Tahun 2020)";

const unavailable = (reason) => ({
  zscore: null,
  categoryCode: null,
  reason,
});

// BB/U.
async function computeBbU(child, m, ageDays) {
  if (!child.birth_date) return unavailable("Tanggal lahir belum diketahui");
  if (m.weight_kg === null) return unavailable("Berat badan belum diisi");

  const ref = await repo.findReference(
    "bb_u",
    child.gender,
    ageDays,
    REFERENCE_VERSION,
  );

  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");

  if (ageDays > ref.max_age + COVERAGE_EXTRA_DAYS) {
    return unavailable("Usia di luar cakupan referensi");
  }

  // adjustTails untuk BB/U: verifikasi pada dokumen teknis WHO.
  const zscore = roundZ(lmsZScore(m.weight_kg, ref, { adjustTails: true }));
  const category = categorize("bb_u", zscore);

  return {
    zscore,
    categoryCode: category ? category.code : null,
    reason: category ? null : NO_CATEGORY,
  };
}

// Pemeriksaan masukan untuk indikator yang memakai panjang/tinggi.
function missingInput(child, m, { weight = false, height = false }) {
  if (!child.birth_date) return "Tanggal lahir belum diketahui";
  if (weight && m.weight_kg === null) return "Berat badan belum diisi";
  if (height && m.height_cm === null) {
    return "Panjang/tinggi badan belum diisi";
  }
  if (height && !m.measurement_type) {
    return "Cara pengukuran belum diisi";
  }
  return null;
}

// Cara ukur harus sesuai usia.
function positionProblem(type, ageDays) {
  const recumbent = type === "recumbent";

  if (recumbent && ageDays >= STANDING_FROM_DAYS) {
    return "Diukur berbaring pada usia 24 bulan atau lebih. Ukur ulang dengan posisi berdiri (tinggi badan).";
  }

  if (!recumbent && ageDays < STANDING_FROM_DAYS) {
    return "Diukur berdiri pada usia di bawah 24 bulan. Ukur ulang dengan posisi berbaring (panjang badan).";
  }

  return null;
}

function finish(indicator, zRaw) {
  const zscore = roundZ(zRaw);
  const category = categorize(indicator, zscore);

  return {
    zscore,
    categoryCode: category ? category.code : null,
    reason: category ? null : NO_CATEGORY,
  };
}

// PB/U atau TB/U.
async function computeLengthHeightForAge(child, m, ageDays) {
  const missing = missingInput(child, m, { height: true });
  if (missing) return unavailable(missing);

  const problem = positionProblem(m.measurement_type, ageDays);
  if (problem) return unavailable(problem);

  const table = m.measurement_type === "recumbent" ? "pb_u" : "tb_u";

  const ref = await repo.findReference(
    table,
    child.gender,
    ageDays,
    REFERENCE_VERSION,
  );

  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");

  if (ageDays > ref.max_age + COVERAGE_EXTRA_DAYS) {
    return unavailable("Usia di luar cakupan referensi");
  }

  return finish("tb_u", lmsZScore(m.height_cm, ref, { adjustTails: false }));
}

// BB/PB atau BB/TB.
async function computeWeightForLengthHeight(child, m, ageDays) {
  const missing = missingInput(child, m, {
    weight: true,
    height: true,
  });
  if (missing) return unavailable(missing);

  const problem = positionProblem(m.measurement_type, ageDays);
  if (problem) return unavailable(problem);

  if (ageDays > MAX_REFERENCE_AGE_DAYS) {
    return unavailable("Usia di luar cakupan referensi");
  }

  const table = m.measurement_type === "recumbent" ? "bb_pb" : "bb_tb";

  const { lower, upper } = await repo.findBracket(
    table,
    child.gender,
    m.height_cm,
    REFERENCE_VERSION,
  );

  const ref = interpolateLms(lower, upper, m.height_cm);

  if (!ref) {
    return unavailable("Panjang/tinggi badan di luar cakupan referensi");
  }

  // adjustTails masih perlu diverifikasi pada dokumen teknis WHO.
  return finish("bb_tb", lmsZScore(m.weight_kg, ref, { adjustTails: true }));
}

// IMT/U.
async function computeBmiForAge(child, m, ageDays) {
  const missing = missingInput(child, m, {
    weight: true,
    height: true,
  });
  if (missing) return unavailable(missing);

  const problem = positionProblem(m.measurement_type, ageDays);
  if (problem) return unavailable(problem);

  if (ageDays > MAX_REFERENCE_AGE_DAYS) {
    return unavailable("Usia di luar cakupan referensi");
  }

  const ref = await repo.findReference(
    "imt_u",
    child.gender,
    ageDays,
    REFERENCE_VERSION,
  );

  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");

  const bmi = m.weight_kg / Math.pow(m.height_cm / 100, 2);

  return finish("imt_u", lmsZScore(bmi, ref, { adjustTails: true }));
}

export async function assessMeasurement({ child, measurement }) {
  // Data yang ditandai perlu diperiksa tidak dipakai untuk penilaian.
  if (measurement.validity_status === "perlu_diperiksa") {
    return { assessment: null, alerts: [] };
  }

  const ageDays = child.birth_date
    ? ageInDays(child.birth_date, measurement.measurement_date)
    : null;

  const results = {
    bb_u: await computeBbU(child, measurement, ageDays),
    tb_u: await computeLengthHeightForAge(child, measurement, ageDays),
    bb_tb: await computeWeightForLengthHeight(child, measurement, ageDays),
    imt_u: await computeBmiForAge(child, measurement, ageDays),
  };

  const keys = Object.keys(results);
  const z = {};
  const cat = {};
  const reasons = {};

  for (const k of keys) {
    z[k] = results[k].zscore;
    cat[k] = results[k].categoryCode;
    reasons[k] = results[k].reason;
  }

  const id = await repo.insertAssessment({
    measurement_id: measurement.id,
    age_days: ageDays,
    z,
    cat,
    note: JSON.stringify({ reasons }),
    reference_version: REFERENCE_VERSION,
    calculation_version: CALCULATION_VERSION,
  });

  const row = await repo.findById(id);

  return {
    assessment: toAssessmentObject(row),
    alerts: [],
  };
}

function decodeReasons(note) {
  try {
    return JSON.parse(note)?.reasons || {};
  } catch {
    return {};
  }
}

function indicatorObject(key, row, reasons) {
  const z = row[`zscore_${key}`];
  const code = row[`category_${key}`];
  const obj = { label: INDICATORS[key].label };

  if (key === "tb_u") {
    obj.mode = row.measurement_type === "recumbent" ? "pb_u" : "tb_u";
  }

  if (key === "bb_tb") {
    obj.mode = row.measurement_type === "recumbent" ? "bb_pb" : "bb_tb";
  }

  obj.status = z === null || z === undefined ? "tidak_tersedia" : "dihitung";
  obj.zscore = z ?? null;
  obj.category = code ? { code, label: labelFor(key, code) } : null;
  obj.reason = reasons[key] ?? null;

  return obj;
}

function toAssessmentObject(row) {
  const reasons = decodeReasons(row.overall_note);
  const indicators = {};

  for (const key of Object.keys(INDICATORS)) {
    indicators[key] = indicatorObject(key, row, reasons);
  }

  const anyMissing = Object.values(indicators).some(
    (i) => i.status === "tidak_tersedia",
  );

  return {
    id: row.id,
    measurement_id: row.measurement_id,
    age_days: row.age_days,
    age_months:
      row.age_days === null ? null : Math.floor(row.age_days / 30.4375),
    indicators,
    overall_note: anyMissing
      ? "Sebagian indikator belum dapat dihitung."
      : null,
    reference_version: row.reference_version,
    calculation_version: row.calculation_version,
    assessed_at: row.assessed_at,
  };
}

export async function getLatestAssessment(measurementId) {
  const row = await repo.findLatestByMeasurement(measurementId);
  return row ? toAssessmentObject(row) : null;
}

export async function getGrowth(child) {
  const rows = await repo.listPoints(child.id);

  const points = rows.map((r) => ({
    measurement_id: r.measurement_id,
    measurement_date: r.measurement_date,
    age_months: child.birth_date
      ? ageInMonths(child.birth_date, r.measurement_date)
      : null,
    weight_kg: r.weight_kg,
    height_cm: r.height_cm,
    validity_status: r.validity_status,
    zscores: {
      bb_u: r.zscore_bb_u ?? null,
      tb_u: r.zscore_tb_u ?? null,
      bb_tb: r.zscore_bb_tb ?? null,
      imt_u: r.zscore_imt_u ?? null,
    },
    categories: {
      bb_u: r.category_bb_u ? labelFor("bb_u", r.category_bb_u) : null,
      tb_u: r.category_tb_u ? labelFor("tb_u", r.category_tb_u) : null,
      bb_tb: r.category_bb_tb ? labelFor("bb_tb", r.category_bb_tb) : null,
      imt_u: r.category_imt_u ? labelFor("imt_u", r.category_imt_u) : null,
    },
  }));

  return {
    child: {
      id: child.id,
      name: child.name,
      gender: child.gender,
      birth_date: child.birth_date,
    },
    points,
    reference_curves: null,
  };
}
