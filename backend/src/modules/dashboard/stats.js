import { CATEGORY_BANDS } from "../growth/categories.js";

const INDICATORS = [
  { key: "bb_u", label: "BB/U" },
  { key: "tb_u", label: "PB/U atau TB/U" },
  { key: "bb_tb", label: "BB/PB atau BB/TB" },
  { key: "imt_u", label: "IMT/U" },
];

// rows: penilaian terbaru tiap anak (kolom category_bb_u, category_tb_u, dst.).
// Semua kategori Permenkes selalu muncul, termasuk yang berjumlah 0.
export function buildDistribution(rows) {
  return INDICATORS.map(({ key, label }) => {
    const counts = new Map();
    let unavailable = 0;
    for (const r of rows) {
      const code = r[`category_${key}`];
      if (!code) unavailable += 1;
      else counts.set(code, (counts.get(code) || 0) + 1);
    }
    return {
      indicator: key,
      label,
      total: rows.length,
      unavailable,
      items: CATEGORY_BANDS[key].map((b) => ({
        code: b.code,
        label: b.label,
        count: counts.get(b.code) || 0,
      })),
    };
  });
}
