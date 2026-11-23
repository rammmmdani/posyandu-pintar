import test from "node:test";
import assert from "node:assert/strict";
import { lmsZScore, roundZ } from "./zscore.js";

// Laki-laki, 12 bulan, BB/U (dari tabel WHO yang diimpor).
const BOYS_12M = { l: 0.0644, m: 9.6479, s: 0.10925 };
const opts = { adjustTails: true };

test("berat sama dengan median menghasilkan z = 0", () => {
  assert.equal(roundZ(lmsZScore(9.6479, BOYS_12M, opts)), 0);
});

// Kolom SD pada file WHO dibulatkan satu desimal, jadi toleransi 0,1.
test("titik SD pada tabel WHO sesuai (toleransi pembulatan tabel)", () => {
  const cases = [
    [7.7, -2],
    [8.6, -1],
    [10.8, 1],
    [12.0, 2],
  ];

  for (const [weight, expectedZ] of cases) {
    const z = lmsZScore(weight, BOYS_12M, opts);
    assert.ok(
      Math.abs(z - expectedZ) < 0.1,
      `berat ${weight}: z=${z}, harapan ${expectedZ}`,
    );
  }
});

test("nilai ekstrem memakai penyesuaian ekor (regresi)", () => {
  // Angka ini masih harus diverifikasi dengan WHO Anthro atau macro WHO.
  assert.equal(roundZ(lmsZScore(16, BOYS_12M, opts)), 4.96);
  assert.equal(roundZ(lmsZScore(5, BOYS_12M, opts)), -5.37);
});

test("berat nol atau negatif ditolak", () => {
  assert.throws(() => lmsZScore(0, BOYS_12M, opts));
  assert.throws(() => lmsZScore(-1, BOYS_12M, opts));
});

// L = 1 (panjang/tinggi menurut umur): z = (y/M - 1) / S, tanpa penyesuaian ekor.
test("PB/U laki-laki 12 bulan: titik SD tabel WHO", () => {
  const ref = { l: 1, m: 75.7488, s: 0.03137 };
  const opts = { adjustTails: false };
  assert.ok(Math.abs(lmsZScore(71.0, ref, opts) - -2) < 0.1);
  assert.ok(Math.abs(lmsZScore(80.5, ref, opts) - 2) < 0.1);
  assert.equal(roundZ(lmsZScore(82.9, ref, opts)), 3.01);
});
