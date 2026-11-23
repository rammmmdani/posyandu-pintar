// Sumber: Peraturan Menteri Kesehatan No. 2 Tahun 2020 tentang Standar Antropometri Anak,
// Lampiran BAB II huruf B "Kategori dan Ambang Batas Status Gizi Anak" (hlm. 14), anak usia 0-60 bulan.
//
// Notasi dokumen dan artinya:
//   "<-3 SD"            : z < -3
//   "-3 SD sd <-2 SD"   : -3 <= z < -2
//   "-2 SD sd +1 SD"    : -2 <= z <= +1
//   "> +1 SD"           : z > +1
//   "> +1 SD sd +2 SD"  : +1 < z <= +2
const band = (code, label, min, max, minInclusive, maxInclusive) => ({
  code,
  label,
  min,
  max,
  minInclusive,
  maxInclusive,
});

// BB/PB, BB/TB, dan IMT/U (0-60 bulan) memakai kategori dan ambang batas yang sama.
const gizi = (p) => [
  band(`${p}_gizi_buruk`, "Gizi buruk", null, -3, false, false),
  band(`${p}_gizi_kurang`, "Gizi kurang", -3, -2, true, false),
  band(`${p}_gizi_baik`, "Gizi baik", -2, 1, true, true),
  band(`${p}_berisiko_gizi_lebih`, "Berisiko gizi lebih", 1, 2, false, true),
  band(`${p}_gizi_lebih`, "Gizi lebih", 2, 3, false, true),
  band(`${p}_obesitas`, "Obesitas", 3, null, false, false),
];

export const CATEGORY_BANDS = {
  bb_u: [
    band(
      "bbu_sangat_kurang",
      "Berat badan sangat kurang",
      null,
      -3,
      false,
      false,
    ),
    band("bbu_kurang", "Berat badan kurang", -3, -2, true, false),
    band("bbu_normal", "Berat badan normal", -2, 1, true, true),
    band("bbu_risiko_lebih", "Risiko berat badan lebih", 1, null, false, false),
  ],
  tb_u: [
    band("tbu_sangat_pendek", "Sangat pendek", null, -3, false, false),
    band("tbu_pendek", "Pendek", -3, -2, true, false),
    band("tbu_normal", "Normal", -2, 3, true, true),
    band("tbu_tinggi", "Tinggi", 3, null, false, false),
  ],
  bb_tb: gizi("bbtb"),
  imt_u: gizi("imt"),
};

// Catatan kaki Permenkes (hlm. 15) yang perlu ikut tampil pada rekomendasi peringatan (Langkah 3.5).
export const CATEGORY_NOTES = {
  bbu_risiko_lebih:
    "Anak pada kategori ini mungkin memiliki masalah pertumbuhan, perlu dikonfirmasi dengan BB/TB atau IMT/U.",
  tbu_tinggi:
    "Anak sangat tinggi biasanya tidak menjadi masalah. Rujuk ke dokter spesialis anak jika diduga ada gangguan endokrin.",
  imt_gizi_buruk:
    "Kriteria diagnosis gizi buruk dan gizi kurang menggunakan BB/PB atau BB/TB.",
  imt_gizi_kurang:
    "Kriteria diagnosis gizi buruk dan gizi kurang menggunakan BB/PB atau BB/TB.",
};

// Mesin murni: dipakai juga oleh pengujian dengan pita buatan.
export function categorizeWith(bands, z) {
  for (const b of bands) {
    const aboveMin =
      b.min === null ||
      b.min === undefined ||
      (b.minInclusive ? z >= b.min : z > b.min);
    const belowMax =
      b.max === null ||
      b.max === undefined ||
      (b.maxInclusive ? z <= b.max : z < b.max);
    if (aboveMin && belowMax) return { code: b.code, label: b.label };
  }
  return null;
}

export const categorize = (indicator, z) =>
  categorizeWith(CATEGORY_BANDS[indicator] || [], z);

export function labelFor(indicator, code) {
  const found = (CATEGORY_BANDS[indicator] || []).find((b) => b.code === code);
  return found ? found.label : code;
}
