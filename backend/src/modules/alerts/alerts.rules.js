import { CATEGORY_NOTES } from "../growth/categories.js";

// Ubah ke true HANYA setelah aturan di bawah ditinjau tenaga kesehatan.
// Catat siapa yang meninjau dan kapan di docs/KEPUTUSAN.md.
export const RULES_VALIDATED = false;

const T = "perlu_tindak_lanjut";
const P = "perlu_pemeriksaan";
const A = "perlu_perhatian";

const gizi = (p) => ({
  [`${p}_gizi_buruk`]: T,
  [`${p}_gizi_kurang`]: P,
  [`${p}_gizi_baik`]: null,
  [`${p}_berisiko_gizi_lebih`]: A,
  [`${p}_gizi_lebih`]: P,
  [`${p}_obesitas`]: T,
});

// Pemetaan kategori Permenkes No. 2/2020 -> tingkat perhatian.
// SEMENTARA: kategorinya dari Permenkes, tetapi pemetaan tingkatnya adalah usulan tim.
// null = tidak menghasilkan peringatan.
export const SEVERITY_BY_CATEGORY = {
  bbu_sangat_kurang: T,
  bbu_kurang: P,
  bbu_normal: null,
  bbu_risiko_lebih: A,
  tbu_sangat_pendek: T,
  tbu_pendek: P,
  tbu_normal: null,
  tbu_tinggi: A,
  ...gizi("bbtb"),
  ...gizi("imt"),
};

// Bukan diagnosis: kalimat hanya menyatakan kategori dan langkah lanjutan.
const BASE_RECOMMENDATION = {
  [T]: "Perlu tindak lanjut. Periksa ulang pengukuran dan segera koordinasikan dengan tenaga kesehatan (bidan atau puskesmas) sesuai prosedur rujukan yang berlaku. Permenkes No. 2 Tahun 2020 mewajibkan tata laksana sesuai kebutuhan jika ditemukan masalah gizi.",
  [P]: "Perlu pemeriksaan. Periksa ulang pengukuran (alat, posisi, dan tanggal lahir), lihat keempat indikator secara bersamaan, lalu konsultasikan dengan tenaga kesehatan.",
  [A]: "Perlu perhatian. Pantau pada kunjungan berikutnya dan lihat indikator lain sebelum menyimpulkan.",
};

function indicatorName(key, ind) {
  if (key === "bb_u") return "Berat badan menurut umur (BB/U)";
  if (key === "tb_u")
    return ind.mode === "pb_u"
      ? "Panjang badan menurut umur (PB/U)"
      : "Tinggi badan menurut umur (TB/U)";
  if (key === "bb_tb")
    return ind.mode === "bb_pb"
      ? "Berat badan menurut panjang badan (BB/PB)"
      : "Berat badan menurut tinggi badan (BB/TB)";
  return "Indeks massa tubuh menurut umur (IMT/U)";
}

const fmtZ = (z) => String(z).replace(".", ",");

// assessment: objek Assessment (bentuk API Contract bagian 5).
export function buildAlerts(assessment) {
  const result = [];
  for (const [key, ind] of Object.entries(assessment.indicators)) {
    if (ind.status !== "dihitung" || !ind.category) continue;
    const severity = SEVERITY_BY_CATEGORY[ind.category.code];
    if (!severity) continue;
    const note = CATEGORY_NOTES[ind.category.code];
    result.push({
      type: key,
      severity,
      message: `${indicatorName(key, ind)} berada pada kategori “${ind.category.label}” (z-score ${fmtZ(ind.zscore)}).`,
      recommendation: note
        ? `${BASE_RECOMMENDATION[severity]} ${note}`
        : BASE_RECOMMENDATION[severity],
    });
  }
  return result;
}
