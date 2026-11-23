import test from "node:test";
import assert from "node:assert/strict";
import { interpolateLms } from "./interpolate.js";

// Angka buatan untuk menguji mesin, BUKAN data WHO.
const LOWER = { v: 70, l: -0.5, m: 8, s: 0.08 };
const UPPER = { v: 70.5, l: -0.3, m: 9, s: 0.09 };

test("interpolasi di titik tengah dan 60%", () => {
  const r = interpolateLms(LOWER, UPPER, 70.3);
  assert.ok(Math.abs(r.l - -0.38) < 1e-9);
  assert.ok(Math.abs(r.m - 8.6) < 1e-9);
  assert.ok(Math.abs(r.s - 0.086) < 1e-9);
});

test("tepat di baris tabel mengembalikan baris itu", () => {
  assert.deepEqual(interpolateLms(LOWER, LOWER, 70), {
    l: -0.5,
    m: 8,
    s: 0.08,
  });
});

test("di luar rentang menghasilkan null", () => {
  assert.equal(interpolateLms(null, UPPER, 44), null);
  assert.equal(interpolateLms(LOWER, null, 111), null);
});
