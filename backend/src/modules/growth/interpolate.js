// Interpolasi linier L, M, S antara dua baris tabel yang mengapit nilai.
// ATURAN SEMENTARA: wajib diverifikasi dengan WHO Anthro untuk panjang/tinggi non-kelipatan 0,5 cm.
// Mengembalikan null jika nilai di luar rentang tabel.
export function interpolateLms(lower, upper, value) {
  if (!lower || !upper) return null;
  if (lower.v === upper.v) return { l: lower.l, m: lower.m, s: lower.s };
  const t = (value - lower.v) / (upper.v - lower.v);
  const mix = (a, b) => a + (b - a) * t;
  return {
    l: mix(lower.l, upper.l),
    m: mix(lower.m, upper.m),
    s: mix(lower.s, upper.s),
  };
}
