export const GENDER_LABEL = { L: 'Laki-laki', P: 'Perempuan' };

export function formatAge(months) {
  if (months === null || months === undefined) return 'Belum diketahui';
  if (months < 12) return `${months} bulan`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} tahun` : `${years} tahun ${rest} bulan`;
}

// Menerima 'YYYY-MM-DD' atau timestamp ISO. Memakai potongan string agar tidak bergeser zona waktu.
export function formatDate(value) {
  if (!value) return '-';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}