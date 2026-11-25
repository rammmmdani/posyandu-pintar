const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Menghitung selisih hari antara dua tanggal.
 * Format tanggal: YYYY-MM-DD.
 */
export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error('Tanggal awal dan akhir wajib diisi');
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Format tanggal tidak valid');
  }

  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}
