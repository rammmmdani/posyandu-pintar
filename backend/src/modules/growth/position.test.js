import test from "node:test";
import assert from "node:assert/strict";
import { resolveLengthHeight } from "./position.js";

const m = (h, type) => ({ height_cm: h, measurement_type: type });

test("di bawah 24 bulan diukur berdiri: ditambah 0,7 cm, tabel PB", () => {
  assert.deepEqual(resolveLengthHeight(m(70.3, "standing"), 12), {
    table: "pb",
    height: 71,
    correction: 0.7,
  });
});
test("di bawah 24 bulan diukur telentang: tanpa koreksi", () => {
  assert.deepEqual(resolveLengthHeight(m(71, "recumbent"), 12), {
    table: "pb",
    height: 71,
    correction: 0,
  });
});
test("di atas 24 bulan diukur telentang: dikurangi 0,7 cm, tabel TB", () => {
  assert.deepEqual(resolveLengthHeight(m(96.8, "recumbent"), 36), {
    table: "tb",
    height: 96.1,
    correction: -0.7,
  });
});
test("di atas 24 bulan diukur berdiri: tanpa koreksi", () => {
  assert.deepEqual(resolveLengthHeight(m(96.1, "standing"), 36), {
    table: "tb",
    height: 96.1,
    correction: 0,
  });
});
test("tepat 24 bulan: tabel mengikuti cara ukur, tanpa koreksi", () => {
  assert.deepEqual(resolveLengthHeight(m(87.8, "recumbent"), 24), {
    table: "pb",
    height: 87.8,
    correction: 0,
  });
  assert.deepEqual(resolveLengthHeight(m(87.1, "standing"), 24), {
    table: "tb",
    height: 87.1,
    correction: 0,
  });
});
