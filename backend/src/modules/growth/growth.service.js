import * as repo from "./growth.repository.js";
import { ageInDays } from "./age.js";
import { lmsZScore, roundZ } from "./zscore.js";
import { categorize, labelFor } from "./categories.js";
import { ageInMonths } from "../../utils/dates.js";
import {
  REFERENCE_VERSION,
  CALCULATION_VERSION,
  COVERAGE_EXTRA_DAYS,
  STANDING_FROM_DAYS,
} from "./growth.config.js";

const INDICATORS = {
  bb_u: { label: "Berat badan menurut umur" },
  tb_u: { label: "Panjang/tinggi badan menurut umur" },
  bb_tb: { label: "Berat badan menurut panjang/tinggi badan" },
  imt_u: { label: "IMT menurut umur" },
};
const MODE = {
  tb_u: { recumbent: "pb_u", standing: "tb_u" },
  bb_tb: { recumbent: "bb_pb", standing: "bb_tb" },
};
const NOT_YET = "Referensi untuk indikator ini belum tersedia";
const NO_CATEGORY =
  "Kategori belum dikonfigurasi (menunggu verifikasi Permenkes No. 2 Tahun 2020)";

const unavailable = (reason) => ({ zscore: null, categoryCode: null, reason });

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
  if (ageDays > ref.max_age + COVERAGE_EXTRA_DAYS)
    return unavailable("Usia di luar cakupan referensi");

  // adjustTails untuk BB/U: verifikasi pada dokumen teknis WHO (lihat zscore.js).
  const zscore = roundZ(lmsZScore(m.weight_kg, ref, { adjustTails: true }));
  const category = categorize("bb_u", zscore);
  return {
    zscore,
    categoryCode: category ? category.code : null,
    reason: category ? null : NO_CATEGORY,
  };
}

// PB/U (berbaring, di bawah 24 bulan) atau TB/U (berdiri, 24 bulan ke atas).
// Tabel dipilih dari cara pengukuran yang dicatat. Tidak ada koreksi otomatis antar-cara ukur.
async function computeLengthHeightForAge(child, m, ageDays) {
  if (!child.birth_date) return unavailable("Tanggal lahir belum diketahui");
  if (m.height_cm === null)
    return unavailable("Panjang/tinggi badan belum diisi");
  if (!m.measurement_type) return unavailable("Cara pengukuran belum diisi");

  const recumbent = m.measurement_type === "recumbent";
  if (recumbent && ageDays >= STANDING_FROM_DAYS) {
    return unavailable(
      "Diukur berbaring pada usia 24 bulan atau lebih. Ukur ulang dengan posisi berdiri (tinggi badan).",
    );
  }
  if (!recumbent && ageDays < STANDING_FROM_DAYS) {
    return unavailable(
      "Diukur berdiri pada usia di bawah 24 bulan. Ukur ulang dengan posisi berbaring (panjang badan).",
    );
  }

  const table = recumbent ? "pb_u" : "tb_u";
  const ref = await repo.findReference(
    table,
    child.gender,
    ageDays,
    REFERENCE_VERSION,
  );
  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");
  if (ageDays > ref.max_age + COVERAGE_EXTRA_DAYS)
    return unavailable("Usia di luar cakupan referensi");

  // Tanpa penyesuaian ekor untuk panjang/tinggi menurut umur (verifikasi pada dokumen teknis WHO).
  const zscore = roundZ(lmsZScore(m.height_cm, ref, { adjustTails: false }));
  const category = categorize("tb_u", zscore); // satu set kategori untuk PB/U dan TB/U
  return {
    zscore,
    categoryCode: category ? category.code : null,
    reason: category ? null : NO_CATEGORY,
  };
}

export async function assessMeasurement({ child, measurement }) {
  // Data yang ditandai perlu diperiksa tidak dipakai untuk penilaian.
  if (measurement.validity_status === "perlu_diperiksa")
    return { assessment: null, alerts: [] };

  const ageDays = child.birth_date
    ? ageInDays(child.birth_date, measurement.measurement_date)
    : null;
  const results = {
    bb_u: await computeBbU(child, measurement, ageDays),
    tb_u: await computeLengthHeightForAge(child, measurement, ageDays),
    bb_tb: unavailable(
      child.birth_date ? NOT_YET : "Tanggal lahir belum diketahui",
    ),
    imt_u: unavailable(
      child.birth_date ? NOT_YET : "Tanggal lahir belum diketahui",
    ),
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
    note: JSON.stringify({ reasons }), // alasan per indikator disimpan di overall_note
    reference_version: REFERENCE_VERSION,
    calculation_version: CALCULATION_VERSION,
  });
  const row = await repo.findById(id);
  return { assessment: toAssessmentObject(row), alerts: [] }; // peringatan dibuat di Langkah 3.5
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
  if (MODE[key]) obj.mode = MODE[key][row.measurement_type] ?? null;
  obj.status = z === null || z === undefined ? "tidak_tersedia" : "dihitung";
  obj.zscore = z ?? null;
  obj.category = code ? { code, label: labelFor(key, code) } : null;
  obj.reason = reasons[key] ?? null;
  return obj;
}

function toAssessmentObject(row) {
  const reasons = decodeReasons(row.overall_note);
  const indicators = {};
  for (const key of Object.keys(INDICATORS))
    indicators[key] = indicatorObject(key, row, reasons);
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
