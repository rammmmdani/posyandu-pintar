const CATEGORY_TONE = {
  bbu_sangat_kurang: 'tindak',
  bbu_kurang: 'pemeriksaan',
  bbu_normal: 'sukses',
  bbu_risiko_lebih: 'perhatian',
  tbu_sangat_pendek: 'tindak',
  tbu_pendek: 'pemeriksaan',
  tbu_normal: 'sukses',
  tbu_tinggi: 'perhatian',
  bbtb_gizi_buruk: 'tindak',
  bbtb_gizi_kurang: 'pemeriksaan',
  bbtb_gizi_baik: 'sukses',
  bbtb_berisiko_gizi_lebih: 'perhatian',
  bbtb_gizi_lebih: 'pemeriksaan',
  bbtb_obesitas: 'tindak',
  imt_gizi_buruk: 'tindak',
  imt_gizi_kurang: 'pemeriksaan',
  imt_gizi_baik: 'sukses',
  imt_berisiko_gizi_lebih: 'perhatian',
  imt_gizi_lebih: 'pemeriksaan',
  imt_obesitas: 'tindak',
};

const LABEL_TONE = {
  'Berat badan sangat kurang': 'tindak',
  'Berat badan kurang': 'pemeriksaan',
  'Berat badan normal': 'sukses',
  'Risiko berat badan lebih': 'perhatian',
  'Sangat pendek': 'tindak',
  Pendek: 'pemeriksaan',
  Normal: 'sukses',
  Tinggi: 'perhatian',
  'Gizi buruk': 'tindak',
  'Gizi kurang': 'pemeriksaan',
  'Gizi baik': 'sukses',
  'Berisiko gizi lebih': 'perhatian',
  'Gizi lebih': 'pemeriksaan',
  Obesitas: 'tindak',
};

const DOT_COLOR = {
  sukses: '#1f7a5c',
  perhatian: '#b45309',
  pemeriksaan: '#c2410c',
  tindak: '#b91c1c',
  netral: '#64748b',
};

export function toneForCategory(code, label) {
  if (code && CATEGORY_TONE[code]) return CATEGORY_TONE[code];
  if (label && LABEL_TONE[label]) return LABEL_TONE[label];
  return 'netral';
}

export function dotColorFor(tone) {
  return DOT_COLOR[tone] || DOT_COLOR.netral;
}
