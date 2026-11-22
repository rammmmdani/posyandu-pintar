import test from "node:test";
import assert from "node:assert/strict";
import { ageInDays } from "./age.js";
import { categorizeWith } from "./categories.js";

test("ageInDays: tepat satu tahun = 365 hari", () => {
  assert.equal(ageInDays("2025-11-20", "2026-11-20"), 365);
});

test("ageInDays: melewati tahun kabisat", () => {
  assert.equal(ageInDays("2024-02-28", "2024-03-01"), 2);
});

// Pita buatan khusus pengujian mesin, BUKAN nilai medis.
const FAKE = [
  { code: "a", label: "A", min: null, max: 0, maxInclusive: false },
  {
    code: "b",
    label: "B",
    min: 0,
    max: 1,
    minInclusive: true,
    maxInclusive: true,
  },
  { code: "c", label: "C", min: 1, max: null },
];

test("categorizeWith: batas inklusif dan eksklusif dihormati", () => {
  assert.equal(categorizeWith(FAKE, -0.01).code, "a");
  assert.equal(categorizeWith(FAKE, 0).code, "b");
  assert.equal(categorizeWith(FAKE, 1).code, "b");
  assert.equal(categorizeWith(FAKE, 1.01).code, "c");
});

test("categorizeWith: tanpa pita menghasilkan null", () => {
  assert.equal(categorizeWith([], 0), null);
});
