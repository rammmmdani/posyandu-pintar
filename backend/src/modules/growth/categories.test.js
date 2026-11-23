import test from "node:test";
import assert from "node:assert/strict";
import { categorize } from "./categories.js";

const code = (ind, z) => categorize(ind, z)?.code;

test("BB/U: batas sesuai Permenkes", () => {
  assert.equal(code("bb_u", -3.01), "bbu_sangat_kurang");
  assert.equal(code("bb_u", -3), "bbu_kurang");
  assert.equal(code("bb_u", -2.01), "bbu_kurang");
  assert.equal(code("bb_u", -2), "bbu_normal");
  assert.equal(code("bb_u", 1), "bbu_normal");
  assert.equal(code("bb_u", 1.01), "bbu_risiko_lebih");
});

test("PB/U atau TB/U: batas sesuai Permenkes", () => {
  assert.equal(code("tb_u", -3.01), "tbu_sangat_pendek");
  assert.equal(code("tb_u", -3), "tbu_pendek");
  assert.equal(code("tb_u", -2), "tbu_normal");
  assert.equal(code("tb_u", 3), "tbu_normal");
  assert.equal(code("tb_u", 3.01), "tbu_tinggi");
});

test("BB/PB, BB/TB, IMT/U: enam kategori", () => {
  for (const [ind, p] of [
    ["bb_tb", "bbtb"],
    ["imt_u", "imt"],
  ]) {
    assert.equal(code(ind, -3.01), `${p}_gizi_buruk`);
    assert.equal(code(ind, -2.5), `${p}_gizi_kurang`);
    assert.equal(code(ind, 1), `${p}_gizi_baik`);
    assert.equal(code(ind, 1.01), `${p}_berisiko_gizi_lebih`);
    assert.equal(code(ind, 2), `${p}_berisiko_gizi_lebih`);
    assert.equal(code(ind, 2.01), `${p}_gizi_lebih`);
    assert.equal(code(ind, 3), `${p}_gizi_lebih`);
    assert.equal(code(ind, 3.01), `${p}_obesitas`);
  }
});
