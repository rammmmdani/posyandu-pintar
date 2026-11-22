/**
 * KATEGORI STATUS GIZI ANAK
 *
 * Sumber:
 * Permenkes No. 2 Tahun 2020
 * Pasal 4 ayat (2), (3), (4), dan (5).
 * Lampiran halaman 14, bagian B:
 * Kategori dan Ambang Batas Status Gizi Anak.
 *
 * Cakupan: anak usia 0-60 bulan.
 * Batas menggunakan nilai Z-score.
 */

export const CATEGORY_BANDS = {
  // BB/U: Berat Badan menurut Umur (0-60 bulan)
  bb_u: [
    {
      code: "berat_badan_sangat_kurang",
      label: "Berat badan sangat kurang",
      min: null,
      max: -3,
      maxInclusive: false,
    },
    {
      code: "berat_badan_kurang",
      label: "Berat badan kurang",
      min: -3,
      minInclusive: true,
      max: -2,
      maxInclusive: false,
    },
    {
      code: "berat_badan_normal",
      label: "Berat badan normal",
      min: -2,
      minInclusive: true,
      max: 1,
      maxInclusive: true,
    },
    {
      code: "risiko_berat_badan_lebih",
      label: "Risiko berat badan lebih",
      min: 1,
      minInclusive: false,
      max: null,
    },
  ],

  // PB/U atau TB/U: Panjang/Tinggi Badan menurut Umur (0-60 bulan)
  tb_u: [
    {
      code: "sangat_pendek",
      label: "Sangat pendek",
      min: null,
      max: -3,
      maxInclusive: false,
    },
    {
      code: "pendek",
      label: "Pendek",
      min: -3,
      minInclusive: true,
      max: -2,
      maxInclusive: false,
    },
    {
      code: "normal",
      label: "Normal",
      min: -2,
      minInclusive: true,
      max: 3,
      maxInclusive: true,
    },
    {
      code: "tinggi",
      label: "Tinggi",
      min: 3,
      minInclusive: false,
      max: null,
    },
  ],

  // BB/PB atau BB/TB: Berat Badan menurut Panjang/Tinggi Badan (0-60 bulan)
  bb_tb: [
    {
      code: "gizi_buruk",
      label: "Gizi buruk",
      min: null,
      max: -3,
      maxInclusive: false,
    },
    {
      code: "gizi_kurang",
      label: "Gizi kurang",
      min: -3,
      minInclusive: true,
      max: -2,
      maxInclusive: false,
    },
    {
      code: "gizi_baik",
      label: "Gizi baik",
      min: -2,
      minInclusive: true,
      max: 1,
      maxInclusive: true,
    },
    {
      code: "berisiko_gizi_lebih",
      label: "Berisiko gizi lebih",
      min: 1,
      minInclusive: false,
      max: 2,
      maxInclusive: true,
    },
    {
      code: "gizi_lebih",
      label: "Gizi lebih",
      min: 2,
      minInclusive: false,
      max: 3,
      maxInclusive: true,
    },
    {
      code: "obesitas",
      label: "Obesitas",
      min: 3,
      minInclusive: false,
      max: null,
    },
  ],

  // IMT/U: Indeks Massa Tubuh menurut Umur (0-60 bulan)
  imt_u: [
    {
      code: "gizi_buruk",
      label: "Gizi buruk",
      min: null,
      max: -3,
      maxInclusive: false,
    },
    {
      code: "gizi_kurang",
      label: "Gizi kurang",
      min: -3,
      minInclusive: true,
      max: -2,
      maxInclusive: false,
    },
    {
      code: "gizi_baik",
      label: "Gizi baik",
      min: -2,
      minInclusive: true,
      max: 1,
      maxInclusive: true,
    },
    {
      code: "berisiko_gizi_lebih",
      label: "Berisiko gizi lebih",
      min: 1,
      minInclusive: false,
      max: 2,
      maxInclusive: true,
    },
    {
      code: "gizi_lebih",
      label: "Gizi lebih",
      min: 2,
      minInclusive: false,
      max: 3,
      maxInclusive: true,
    },
    {
      code: "obesitas",
      label: "Obesitas",
      min: 3,
      minInclusive: false,
      max: null,
    },
  ],
};

// Mesin kategori murni.
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

    if (aboveMin && belowMax) {
      return { code: b.code, label: b.label };
    }
  }

  return null;
}

export const categorize = (indicator, z) =>
  categorizeWith(CATEGORY_BANDS[indicator] || [], z);

export function labelFor(indicator, code) {
  const band = (CATEGORY_BANDS[indicator] || []).find((b) => b.code === code);

  return band ? band.label : code;
}
