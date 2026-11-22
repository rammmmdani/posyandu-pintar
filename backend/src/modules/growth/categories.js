// KATEGORI STATUS GIZI.
// Nilai kategori akan diisi setelah diverifikasi dari Permenkes No. 2 Tahun 2020.

export const CATEGORY_BANDS = {
  bb_u: [],
  tb_u: [],
  bb_tb: [],
  imt_u: [],
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
