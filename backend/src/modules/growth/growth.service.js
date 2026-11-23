import * as repo from "./growth.repository.js";
import { ageInDays } from "./age.js";
import { lmsZScore, roundZ } from "./zscore.js";
import { interpolateLms } from "./interpolate.js";
import { categorize, labelFor } from "./categories.js";
import { resolveLengthHeight } from "./position.js";
import { ageInMonths } from "../../utils/dates.js";
import {
  REFERENCE_VERSION,
  CALCULATION_VERSION,
  DAYS_PER_MONTH,
  MAX_AGE_MONTHS,
} from "./growth.config.js";
import {
  createAlertsForAssessment,
  closeAlertsForMeasurement,
} from "../alerts/alerts.service.js";

const INDICATORS = {
  bb_u: { label: "Berat badan menurut umur" },
  tb_u: { label: "Panjang/tinggi badan menurut umur" },
  bb_tb: { label: "Berat badan menurut panjang/tinggi badan" },
  imt_u: { label: "IMT menurut umur" },
};
const NO_CATEGORY = "Kategori belum dapat ditentukan";

const unavailable = (reason) => ({ zscore: null, categoryCode: null, reason });

// Permenkes: umur dihitung dalam BULAN PENUH. Kunci tabel referensi = bulan x 30,4375 hari.
const lookupDays = (months) => Math.round(months * DAYS_PER_MONTH);

// Kategori ditentukan dari z-score tanpa pembulatan; yang disimpan dan ditampilkan dibulatkan dua desimal.
function finish(indicator, zRaw) {
  const category = categorize(indicator, zRaw);
  return {
    zscore: roundZ(zRaw),
    categoryCode: category ? category.code : null,
    reason: category ? null : NO_CATEGORY,
  };
}

function missingInput(age, m, { weight = false, height = false }) {
  if (age.months == null) return "Tanggal lahir belum diketahui";

  if (age.months > MAX_AGE_MONTHS) {
    return "Usia di luar cakupan referensi (0 sampai 60 bulan)";
  }

  if (weight && m.weight_kg == null) {
    return "Berat badan belum diisi";
  }

  if (height && m.height_cm == null) {
    return "Panjang/tinggi badan belum diisi";
  }

  if (height && !m.measurement_type) {
    return "Cara pengukuran belum diisi";
  }

  return null;
}

async function computeBbU(child, m, age) {
  const missing = missingInput(age, m, { weight: true });
  if (missing) return unavailable(missing);
  const ref = await repo.findReference(
    "bb_u",
    child.gender,
    lookupDays(age.months),
    REFERENCE_VERSION,
  );
  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");
  // adjustTails untuk BB/U: verifikasi pada dokumen teknis WHO (lihat zscore.js).
  return finish("bb_u", lmsZScore(m.weight_kg, ref, { adjustTails: true }));
}

// PB/U atau TB/U (tanpa penyesuaian ekor). Tinggi yang dipakai sudah dikoreksi sesuai cara ukur.
async function computeLengthHeightForAge(child, m, age, pos) {
  const missing = missingInput(age, m, { height: true });
  if (missing) return unavailable(missing);
  const table = pos.table === "pb" ? "pb_u" : "tb_u";
  const ref = await repo.findReference(
    table,
    child.gender,
    lookupDays(age.months),
    REFERENCE_VERSION,
  );
  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");
  return finish("tb_u", lmsZScore(pos.height, ref, { adjustTails: false }));
}

// BB/PB atau BB/TB. Kunci tabel = panjang/tinggi (setelah koreksi), diinterpolasi antar-baris 0,5 cm.
async function computeWeightForLengthHeight(child, m, age, pos) {
  const missing = missingInput(age, m, { weight: true, height: true });
  if (missing) return unavailable(missing);
  const table = pos.table === "pb" ? "bb_pb" : "bb_tb";
  const { lower, upper } = await repo.findBracket(
    table,
    child.gender,
    pos.height,
    REFERENCE_VERSION,
  );
  const ref = interpolateLms(lower, upper, pos.height);
  if (!ref)
    return unavailable("Panjang/tinggi badan di luar cakupan referensi");
  return finish("bb_tb", lmsZScore(m.weight_kg, ref, { adjustTails: true }));
}

// IMT/U. Pada tepat 24 bulan: telentang memakai baris tabel PB (730), berdiri memakai baris tabel TB (731).
async function computeBmiForAge(child, m, age, pos) {
  const missing = missingInput(age, m, { weight: true, height: true });
  if (missing) return unavailable(missing);
  const days =
    age.months === 24
      ? pos.table === "pb"
        ? 730
        : 731
      : lookupDays(age.months);
  const ref = await repo.findReference(
    "imt_u",
    child.gender,
    days,
    REFERENCE_VERSION,
  );
  if (!ref) return unavailable("Referensi untuk usia ini belum tersedia");
  const bmi = m.weight_kg / Math.pow(pos.height / 100, 2);
  return finish("imt_u", lmsZScore(bmi, ref, { adjustTails: true }));
}

export async function assessMeasurement({ child, measurement }) {
  // Data yang ditandai perlu diperiksa tidak dipakai untuk penilaian.
  if (measurement.validity_status === "perlu_diperiksa") {
    await closeAlertsForMeasurement(measurement.id);
    return { assessment: null, alerts: [] };
  }

  const age = child.birth_date
    ? {
        days: ageInDays(child.birth_date, measurement.measurement_date),
        months: ageInMonths(child.birth_date, measurement.measurement_date),
      }
    : { days: null, months: null };

  const canPosition =
    age.months !== null &&
    measurement.height_cm !== null &&
    measurement.measurement_type;
  const pos = canPosition ? resolveLengthHeight(measurement, age.months) : null;

  const results = {
    bb_u: await computeBbU(child, measurement, age),
    tb_u: await computeLengthHeightForAge(child, measurement, age, pos),
    bb_tb: await computeWeightForLengthHeight(child, measurement, age, pos),
    imt_u: await computeBmiForAge(child, measurement, age, pos),
  };

  const z = {};
  const cat = {};
  const reasons = {};
  for (const k of Object.keys(results)) {
    z[k] = results[k].zscore;
    cat[k] = results[k].categoryCode;
    reasons[k] = results[k].reason;
  }

  const id = await repo.insertAssessment({
    measurement_id: measurement.id,
    age_days: age.days,
    z,
    cat,
    // Skema tidak punya kolom terpisah: alasan, usia bulan penuh, tabel, dan koreksi disimpan sebagai JSON.
    note: JSON.stringify({
      reasons,
      age_months: age.months,
      table: pos ? pos.table : null,
      correction_cm: pos ? pos.correction : 0,
    }),
    reference_version: REFERENCE_VERSION,
    calculation_version: CALCULATION_VERSION,
  });

  const row = await repo.findById(id);
  const assessment = toAssessmentObject(row);

  const alerts = await createAlertsForAssessment({
    child,
    measurement,
    assessment,
  });

  return { assessment, alerts };
}

function decodeNote(note) {
  try {
    const n = JSON.parse(note);
    return n && typeof n === "object" ? n : {};
  } catch {
    return {};
  }
}

function indicatorObject(key, row, reasons, table) {
  const zv = row[`zscore_${key}`];
  const code = row[`category_${key}`];
  const obj = { label: INDICATORS[key].label };
  if (key === "tb_u")
    obj.mode = table ? (table === "pb" ? "pb_u" : "tb_u") : null;
  if (key === "bb_tb")
    obj.mode = table ? (table === "pb" ? "bb_pb" : "bb_tb") : null;
  obj.status = zv === null || zv === undefined ? "tidak_tersedia" : "dihitung";
  obj.zscore = zv ?? null;
  obj.category = code ? { code, label: labelFor(key, code) } : null;
  obj.reason = reasons[key] ?? null;
  return obj;
}

function toAssessmentObject(row) {
  const n = decodeNote(row.overall_note);
  const indicators = {};
  for (const key of Object.keys(INDICATORS))
    indicators[key] = indicatorObject(key, row, n.reasons || {}, n.table);

  const sentences = [];
  if (n.correction_cm) {
    const sign = n.correction_cm > 0 ? "+" : "";
    sentences.push(
      `Panjang/tinggi badan dikoreksi ${sign}${String(n.correction_cm).replace(".", ",")} cm sesuai Permenkes No. 2 Tahun 2020 karena cara ukur tidak sesuai usia.`,
    );
  }
  if (Object.values(indicators).some((i) => i.status === "tidak_tersedia")) {
    sentences.push("Sebagian indikator belum dapat dihitung.");
  }

  return {
    id: row.id,
    measurement_id: row.measurement_id,
    age_days: row.age_days,
    age_months:
      n.age_months ??
      (row.age_days === null
        ? null
        : Math.floor(row.age_days / DAYS_PER_MONTH)),
    indicators,
    overall_note: sentences.length ? sentences.join(" ") : null,
    reference_version: row.reference_version,
    calculation_version: row.calculation_version,
    assessed_at: row.assessed_at,
  };
}

export async function getAssessmentById(id) {
  const row = await repo.findById(id);
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
