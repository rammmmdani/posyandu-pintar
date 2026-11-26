import test from "node:test";
import assert from "node:assert/strict";
import { recommend, lineCost, rupiah } from "./recommend.js";

const ing = (id, name, group, extra = {}) => ({
  food_item_id: id,
  name,
  quantity: 20,
  unit: "g",
  item_unit: "kg",
  food_group: group,
  allergen_tags: [],
  is_active: true,
  price: 10000,
  price_date: "2026-11-20",
  ...extra,
});
const menu = (id, name, ingredients) => ({
  id,
  name,
  age_group: "9-11_bulan",
  serving_info: null,
  ingredients,
});
const TODAY = "2026-11-24";
const run = (menus, opts = {}) =>
  recommend({
    menus,
    allergies: [],
    budget: null,
    today: TODAY,
    ageLabel: "9 sampai 11 bulan",
    ...opts,
  });

test("lineCost: konversi gram ke kg dan satuan sama", () => {
  assert.equal(lineCost(20, "g", "kg", 15000), 300);
  assert.equal(lineCost(3, "ml", "l", 18000), 54);
  assert.equal(lineCost(0.5, "butir", "butir", 2200), 1100);
  assert.equal(lineCost(20, "g", "butir", 2200), null); // satuan tidak dapat dikonversi
  assert.equal(lineCost(20, "g", "kg", null), null);
});

test("rupiah memakai pemisah ribuan titik", () => {
  assert.equal(rupiah(12500), "Rp 12.500");
  assert.equal(rupiah(999), "Rp 999");
});

const A = menu(1, "A", [
  ing(1, "Beras", "makanan_pokok"),
  ing(2, "Ayam", "daging_dagingan"),
  ing(3, "Wortel", "sayur_buah_vit_a"),
]);
const B = menu(2, "B", [
  ing(1, "Beras", "makanan_pokok"),
  ing(4, "Telur", "telur", { allergen_tags: ["telur"] }),
]);

test("alergi berdasarkan kategori mengeluarkan menu beserta alasannya", () => {
  const r = run([A, B], {
    allergies: [{ food_item_id: null, allergen_tag: "telur" }],
  });
  assert.deepEqual(
    r.recommendations.map((x) => x.menu.name),
    ["A"],
  );
  assert.match(r.excluded[0].reason, /Mengandung Telur \(telur\)/);
});

test("alergi berdasarkan bahan tertentu", () => {
  const r = run([A, B], {
    allergies: [{ food_item_id: 2, allergen_tag: null }],
  });
  assert.deepEqual(
    r.recommendations.map((x) => x.menu.name),
    ["B"],
  );
});

test("menu dengan bahan nonaktif dikeluarkan", () => {
  const m = menu(3, "C", [
    ing(1, "Beras", "makanan_pokok", { is_active: false }),
  ]);
  assert.match(run([m]).excluded[0].reason, /tidak tersedia/);
});

test("anggaran: menu yang melebihi dikeluarkan, yang di bawahnya diberi alasan biaya", () => {
  // A = 3 bahan x 20 g x Rp10.000/kg = Rp600
  const r = run([A], { budget: 500 });
  assert.equal(r.recommendations.length, 0);
  assert.match(r.excluded[0].reason, /melebihi anggaran Rp 500/);
  const ok = run([A], { budget: 1000 });
  assert.equal(ok.recommendations[0].estimated_cost, 600);
  assert.ok(
    ok.recommendations[0].reasons.some((s) =>
      s.includes("dalam anggaran Rp 1.000"),
    ),
  );
});

test("harga hilang: menu tetap tampil dengan biaya belum lengkap dan tidak disaring anggaran", () => {
  const m = menu(4, "D", [
    ing(1, "Beras", "makanan_pokok"),
    ing(9, "Langka", "daging_dagingan", { price: null, price_date: null }),
  ]);
  const r = run([m], { budget: 1 });
  assert.equal(r.recommendations.length, 1);
  assert.equal(r.recommendations[0].cost_complete, false);
  assert.ok(
    r.recommendations[0].reasons.some((s) => s.includes("belum lengkap")),
  );
});

test("harga lebih dari 30 hari ditandai kedaluwarsa", () => {
  const old = menu(5, "E", [
    ing(1, "Beras", "makanan_pokok", { price_date: "2026-09-01" }),
  ]);
  const r = run([old]);
  assert.equal(r.recommendations[0].price_stale, true);
  assert.equal(r.recommendations[0].oldest_price_date, "2026-09-01");
});

test("urutan: keragaman kelompok pangan terbanyak dulu", () => {
  const r = run([B, A]);
  assert.deepEqual(
    r.recommendations.map((x) => x.menu.name),
    ["A", "B"],
  );
  assert.equal(r.recommendations[0].food_group_count, 3);
});

test("lemak tambahan tidak dihitung sebagai kelompok pangan", () => {
  const m = menu(6, "F", [
    ing(1, "Beras", "makanan_pokok"),
    ing(7, "Minyak", "lemak_tambahan"),
  ]);
  assert.equal(run([m]).recommendations[0].food_group_count, 1);
});

test("protein hewani dari telur atau susu juga dihitung", () => {
  assert.equal(run([B]).recommendations[0].animal_protein, true);
  assert.equal(
    run([menu(7, "G", [ing(1, "Beras", "makanan_pokok")])]).recommendations[0]
      .animal_protein,
    false,
  );
});
