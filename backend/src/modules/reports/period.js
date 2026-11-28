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

export function monthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function resolveReportPeriod(input) {
  if (input.report_type === 'kustom') {
    return { period_start: input.period_start, period_end: input.period_end };
  }

  const { start, end } = monthBounds(input.month);
  if (input.report_type === 'rekap_6_bulan') {
    const [year, monthNumber] = input.month.split('-').map(Number);
    const first = new Date(Date.UTC(year, monthNumber - 6, 1));
    const startMonth = String(first.getUTCMonth() + 1).padStart(2, '0');
    return {
      period_start: `${first.getUTCFullYear()}-${startMonth}-01`,
      period_end: end,
    };
  }

  return { period_start: start, period_end: end };
}
