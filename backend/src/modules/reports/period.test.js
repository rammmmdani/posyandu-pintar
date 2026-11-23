import test from "node:test";
import assert from "node:assert/strict";
import { resolvePeriod, daysBetween } from "./period.js";

test("bulanan: awal dan akhir bulan", () => {
  assert.deepEqual(
    resolvePeriod({ report_type: "bulanan", month: "2026-11" }),
    { start: "2026-11-01", end: "2026-11-30" },
  );
});
test("bulanan: Februari kabisat", () => {
  assert.equal(
    resolvePeriod({ report_type: "bulanan", month: "2024-02" }).end,
    "2024-02-29",
  );
});
test("rekap 6 bulan berakhir di bulan terpilih", () => {
  assert.deepEqual(
    resolvePeriod({ report_type: "rekap_6_bulan", month: "2026-11" }),
    { start: "2026-06-01", end: "2026-11-30" },
  );
});
test("rekap 6 bulan melewati pergantian tahun", () => {
  assert.deepEqual(
    resolvePeriod({ report_type: "rekap_6_bulan", month: "2026-03" }),
    { start: "2025-10-01", end: "2026-03-31" },
  );
});
test("kustom memakai tanggal apa adanya", () => {
  assert.deepEqual(
    resolvePeriod({
      report_type: "kustom",
      period_start: "2026-01-05",
      period_end: "2026-02-10",
    }),
    { start: "2026-01-05", end: "2026-02-10" },
  );
});
test("daysBetween", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-31"), 30);
});
