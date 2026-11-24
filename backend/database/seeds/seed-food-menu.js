import { pool } from '../../src/config/db.js';
import { todayString } from '../../src/utils/dates.js';

// DATA CONTOH untuk demo. Bukan rujukan gizi.
//  - Harga: contoh, bukan hasil survei pasar. Koordinator wajib memperbaruinya.
//  - Takaran dan komposisi menu: contoh, belum divalidasi ahli gizi.
//  - Klasifikasi kelompok pangan dan tag alergen: usulan, ditinjau ahli gizi.
// Tidak memuat gula, garam, madu, atau susu sapi pada menu bayi, sesuai prinsip kehati-hatian.
//   npm run seed:food-menu

const SOURCE = 'Harga contoh untuk demo, bukan survei';

// [nama, satuan harga, kelompok, tag alergen, harga contoh per satuan (Rp)]
const FOODS = [
  ['Beras putih', 'kg', 'makanan_pokok', [], 14000],
  ['Kentang', 'kg', 'makanan_pokok', [], 16000],
  ['Ubi jalar', 'kg', 'makanan_pokok', [], 12000],
  ['Daging ayam', 'kg', 'daging_dagingan', [], 38000],
  ['Hati ayam', 'kg', 'daging_dagingan', [], 30000],
  ['Ikan lele', 'kg', 'daging_dagingan', ['ikan'], 30000],
  ['Ikan kembung', 'kg', 'daging_dagingan', ['ikan'], 35000],
  ['Ikan tongkol', 'kg', 'daging_dagingan', ['ikan'], 38000],
  ['Daging sapi giling', 'kg', 'daging_dagingan', [], 120000],
  ['Telur ayam', 'butir', 'telur', ['telur'], 2200],
  ['Tempe', 'kg', 'kacang_kacangan', ['kedelai'], 20000],
  ['Tahu', 'kg', 'kacang_kacangan', ['kedelai'], 14000],
  ['Kacang hijau', 'kg', 'kacang_kacangan', [], 28000],
  ['Susu sapi cair', 'l', 'produk_susu', ['susu'], 20000],
  ['Wortel', 'kg', 'sayur_buah_vit_a', [], 15000],
  ['Labu kuning', 'kg', 'sayur_buah_vit_a', [], 10000],
  ['Bayam', 'kg', 'sayur_buah_vit_a', [], 12000],
  ['Kangkung', 'kg', 'sayur_buah_vit_a', [], 10000],
  ['Pepaya', 'kg', 'sayur_buah_vit_a', [], 12000],
  ['Buncis', 'kg', 'sayur_buah_lain', [], 14000],
  ['Brokoli', 'kg', 'sayur_buah_lain', [], 25000],
  ['Tomat', 'kg', 'sayur_buah_lain', [], 14000],
  ['Pisang', 'kg', 'sayur_buah_lain', [], 15000],
  ['Alpukat', 'kg', 'sayur_buah_lain', [], 30000],
  ['Minyak goreng', 'l', 'lemak_tambahan', [], 18000],
];

const TIPS = {
  '6-8_bulan': 'Haluskan lalu saring. Tanpa gula dan garam. Mulai dari porsi kecil.',
  '9-11_bulan': 'Tumbuk atau cincang kasar. Tanpa gula dan garam.',
  '12-23_bulan': 'Potong kecil sesuai kemampuan mengunyah. Gula dan garam dibatasi.',
  '24-59_bulan': 'Makanan keluarga yang dipotong kecil. Gula dan garam dibatasi.',
};

// [bahan, jumlah, satuan resep]
const MENUS = [
  ['Bubur beras halus ayam wortel', '6-8_bulan', [['Beras putih', 20, 'g'], ['Daging ayam', 20, 'g'], ['Wortel', 20, 'g'], ['Minyak goreng', 3, 'ml']]],
  ['Bubur beras hati ayam bayam', '6-8_bulan', [['Beras putih', 20, 'g'], ['Hati ayam', 15, 'g'], ['Bayam', 15, 'g'], ['Minyak goreng', 3, 'ml']]],
  ['Bubur beras ikan lele labu kuning', '6-8_bulan', [['Beras putih', 20, 'g'], ['Ikan lele', 20, 'g'], ['Labu kuning', 20, 'g'], ['Minyak goreng', 3, 'ml']]],
  ['Bubur beras telur wortel', '6-8_bulan', [['Beras putih', 20, 'g'], ['Telur ayam', 0.5, 'butir'], ['Wortel', 20, 'g'], ['Minyak goreng', 3, 'ml']]],

  ['Nasi tim ayam tahu wortel', '9-11_bulan', [['Beras putih', 25, 'g'], ['Daging ayam', 25, 'g'], ['Tahu', 20, 'g'], ['Wortel', 20, 'g'], ['Minyak goreng', 3, 'ml']]],
  ['Nasi tim ikan kembung bayam', '9-11_bulan', [['Beras putih', 25, 'g'], ['Ikan kembung', 25, 'g'], ['Bayam', 20, 'g'], ['Minyak goreng', 3, 'ml']]],
  ['Bubur ubi jalar daging sapi buncis', '9-11_bulan', [['Ubi jalar', 40, 'g'], ['Daging sapi giling', 25, 'g'], ['Buncis', 20, 'g'], ['Minyak goreng', 3, 'ml']]],

  ['Nasi tim hati ayam telur brokoli', '12-23_bulan', [['Beras putih', 40, 'g'], ['Hati ayam', 20, 'g'], ['Telur ayam', 0.5, 'butir'], ['Brokoli', 25, 'g'], ['Minyak goreng', 4, 'ml']]],
  ['Nasi ikan tongkol labu kuning', '12-23_bulan', [['Beras putih', 40, 'g'], ['Ikan tongkol', 30, 'g'], ['Labu kuning', 30, 'g'], ['Minyak goreng', 4, 'ml']]],
  ['Nasi tempe telur wortel buncis', '12-23_bulan', [['Beras putih', 40, 'g'], ['Tempe', 25, 'g'], ['Telur ayam', 0.5, 'butir'], ['Wortel', 20, 'g'], ['Buncis', 20, 'g'], ['Minyak goreng', 4, 'ml']]],
  ['Nasi ayam tahu kangkung', '12-23_bulan', [['Beras putih', 40, 'g'], ['Daging ayam', 30, 'g'], ['Tahu', 25, 'g'], ['Kangkung', 20, 'g'], ['Minyak goreng', 4, 'ml']]],

  ['Nasi daging sapi wortel buncis', '24-59_bulan', [['Beras putih', 60, 'g'], ['Daging sapi giling', 30, 'g'], ['Wortel', 25, 'g'], ['Buncis', 25, 'g'], ['Minyak goreng', 5, 'ml']]],
  ['Nasi ikan lele bayam pepaya', '24-59_bulan', [['Beras putih', 60, 'g'], ['Ikan lele', 40, 'g'], ['Bayam', 30, 'g'], ['Pepaya', 50, 'g'], ['Minyak goreng', 5, 'ml']]],
  ['Nasi telur dadar tahu brokoli', '24-59_bulan', [['Beras putih', 60, 'g'], ['Telur ayam', 1, 'butir'], ['Tahu', 30, 'g'], ['Brokoli', 30, 'g'], ['Minyak goreng', 5, 'ml']]],
];

async function foodId(name) {
  const { rows } = await pool.query('SELECT id FROM food_items WHERE lower(name) = lower($1)', [name]);
  if (!rows[0]) throw new Error(`Bahan "${name}" tidak ada`);
  return rows[0].id;
}

async function main() {
  const today = todayString();
  let foods = 0;
  let menus = 0;

  for (const [name, unit, group, tags, price] of FOODS) {
    const ins = await pool.query(
      `INSERT INTO food_items (name, unit, food_group, allergen_tags) VALUES ($1, $2, $3, $4)
       ON CONFLICT ((lower(name))) DO NOTHING RETURNING id`,
      [name, unit, group, tags]
    );
    if (ins.rows[0]) foods += 1;
    const id = await foodId(name);
    await pool.query(
      `INSERT INTO food_item_prices (food_item_id, price, source, effective_date)
       SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM food_item_prices WHERE food_item_id = $1)`,
      [id, price, SOURCE, today]
    );
  }

  for (const [name, age, items] of MENUS) {
    const exists = await pool.query('SELECT id FROM menus WHERE name = $1', [name]);
    if (exists.rows[0]) continue;
    const { rows } = await pool.query(
      `INSERT INTO menus (name, age_group, serving_info) VALUES ($1, $2, $3) RETURNING id`,
      [name, age, TIPS[age]]
    );
    for (const [item, qty, unit] of items) {
      await pool.query(
        'INSERT INTO menu_ingredients (menu_id, food_item_id, quantity, unit) VALUES ($1, $2, $3, $4)',
        [rows[0].id, await foodId(item), qty, unit]
      );
    }
    menus += 1;
  }

  console.log(`Data contoh: ${foods} bahan dan ${menus} menu baru dibuat. Harga dan takaran adalah contoh.`);
}

main()
  .catch((err) => {
    console.error('Seed bahan dan menu gagal:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());