import test from "node:test";
import assert from "node:assert/strict";
import { buildDistribution } from "./stats.js";

const rows = [
  {
    category_bb_u: "bbu_normal",
    category_tb_u: "tbu_normal",
    category_bb_tb: "bbtb_gizi_baik",
    category_imt_u: null,
  },
  {
    category_bb_u: "bbu_kurang",
    category_tb_u: null,
    category_bb_tb: "bbtb_gizi_kurang",
    category_imt_u: null,
  },
  {
    category_bb_u: "bbu_kurang",
    category_tb_u: "tbu_pendek",
    category_bb_tb: null,
    category_imt_u: null,
  },
];

test("menghitung per kategori dan menyertakan kategori berjumlah nol", () => {
  const bbu = buildDistribution(rows)[0];
  assert.equal(bbu.total, 3);
  assert.equal(bbu.unavailable, 0);
  assert.equal(bbu.items.find((i) => i.code === "bbu_kurang").count, 2);
  assert.equal(bbu.items.find((i) => i.code === "bbu_sangat_kurang").count, 0);
  assert.equal(bbu.items.length, 4);
});

test("indikator tanpa kategori dihitung sebagai belum dapat dihitung", () => {
  const imt = buildDistribution(rows)[3];
  assert.equal(imt.unavailable, 3);
  assert.equal(
    imt.items.reduce((s, i) => s + i.count, 0),
    0,
  );
});

test("tanpa data semua nol", () => {
  const dist = buildDistribution([]);
  assert.equal(dist.length, 4);
  assert.equal(dist[0].total, 0);
});
