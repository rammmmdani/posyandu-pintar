import test from "node:test";
import assert from "node:assert/strict";
import { buildAlerts, SEVERITY_BY_CATEGORY } from "./alerts.rules.js";
import { CATEGORY_BANDS } from "../growth/categories.js";

const ind = (code, label, zscore, extra = {}) => ({
  status: "dihitung",
  zscore,
  category: { code, label },
  ...extra,
});
const missing = { status: "tidak_tersedia", zscore: null, category: null };

test("setiap kategori Permenkes punya pemetaan tingkat (agar tidak ada yang terlewat)", () => {
  for (const bands of Object.values(CATEGORY_BANDS)) {
    for (const b of bands)
      assert.ok(
        b.code in SEVERITY_BY_CATEGORY,
        `kategori ${b.code} belum dipetakan`,
      );
  }
});

test("kategori normal tidak menghasilkan peringatan", () => {
  const a = {
    indicators: {
      bb_u: ind("bbu_normal", "Berat badan normal", -0.05),
      tb_u: missing,
      bb_tb: ind("bbtb_gizi_baik", "Gizi baik", 0.2),
      imt_u: missing,
    },
  };
  assert.deepEqual(buildAlerts(a), []);
});

test("indikator tidak tersedia dilewati", () => {
  assert.deepEqual(
    buildAlerts({
      indicators: {
        bb_u: missing,
        tb_u: missing,
        bb_tb: missing,
        imt_u: missing,
      },
    }),
    [],
  );
});

test("pesan memuat kategori dan z-score berkoma, bukan diagnosis", () => {
  const a = {
    indicators: { bb_u: ind("bbu_kurang", "Berat badan kurang", -2.91) },
  };
  const [alert] = buildAlerts(a);
  assert.equal(alert.type, "bb_u");
  assert.equal(alert.severity, "perlu_pemeriksaan");
  assert.equal(
    alert.message,
    "Berat badan menurut umur (BB/U) berada pada kategori “Berat badan kurang” (z-score -2,91).",
  );
  assert.ok(!/diagnosis/i.test(alert.message));
});

test("catatan kaki Permenkes ikut pada rekomendasi", () => {
  const a = {
    indicators: {
      bb_u: ind("bbu_risiko_lebih", "Risiko berat badan lebih", 2.39),
    },
  };
  assert.match(
    buildAlerts(a)[0].recommendation,
    /dikonfirmasi dengan BB\/TB atau IMT\/U/,
  );
});

test("mode PB atau TB tercermin pada nama indikator", () => {
  const a = {
    indicators: { tb_u: ind("tbu_pendek", "Pendek", -2.3, { mode: "pb_u" }) },
  };
  assert.match(
    buildAlerts(a)[0].message,
    /Panjang badan menurut umur \(PB\/U\)/,
  );
});
