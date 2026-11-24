// Kelompok pangan menurut Kemenkes (minimal 5 dari 8 kelompok per hari, termasuk ASI).
// Sumber: Kemenkes, "Pemberian MPASI harus penuhi 4 syarat ini" (kemkes.go.id).
// ASI tidak menjadi bahan di katalog. Klasifikasi tiap bahan adalah usulan dan ditinjau ahli gizi.
export const FOOD_GROUPS = {
  makanan_pokok: 'Makanan pokok',
  kacang_kacangan: 'Kacang-kacangan',
  produk_susu: 'Produk susu',
  daging_dagingan: 'Daging-dagingan (termasuk ikan dan unggas)',
  telur: 'Telur',
  sayur_buah_vit_a: 'Sayur dan buah kaya vitamin A',
  sayur_buah_lain: 'Sayur dan buah lainnya',
};

// Bukan salah satu dari 8 kelompok, tidak dihitung pada keragaman.
export const EXTRA_GROUP = 'lemak_tambahan';

// Daftar tag alergen: usulan, ditinjau ahli gizi.
export const ALLERGEN_TAGS = ['telur', 'susu', 'ikan', 'udang', 'kacang', 'kedelai', 'gandum'];

// Satuan harga yang bisa dikonversi dari satuan resep (g -> kg, ml -> l).
export const PRICE_UNITS = ['kg', 'l', 'butir'];

// Keputusan tim, bukan dari dokumen resmi.
export const PRICE_STALE_DAYS = 30;