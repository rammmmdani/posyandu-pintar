export const ALLERGEN_LABEL = {
  telur: 'Telur',
  susu: 'Susu sapi',
  ikan: 'Ikan',
  udang: 'Udang',
  kacang: 'Kacang tanah',
  kedelai: 'Kedelai (tempe, tahu)',
  gandum: 'Gandum',
};

export const FOOD_GROUP_LABEL = {
  makanan_pokok: 'Makanan pokok',
  kacang_kacangan: 'Kacang-kacangan',
  produk_susu: 'Produk susu',
  daging_dagingan: 'Daging-dagingan (termasuk ikan dan unggas)',
  telur: 'Telur',
  sayur_buah_vit_a: 'Sayur dan buah kaya vitamin A',
  sayur_buah_lain: 'Sayur dan buah lainnya',
  lemak_tambahan: 'Lemak tambahan',
};

export const rupiah = (n) => `Rp ${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export const formatQty = (q, unit) => `${String(q).replace('.', ',')} ${unit}`;