const pad = (n) => String(n).padStart(2, "0");
const lastDay = (year, month) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate(); // month 1-12

// bulanan: bulan terpilih. rekap_6_bulan: enam bulan kalender yang berakhir di bulan terpilih.
// kustom: tanggal yang diberikan apa adanya.
export function resolvePeriod({
  report_type,
  month,
  period_start,
  period_end,
}) {
  if (report_type === "kustom") return { start: period_start, end: period_end };

  const [y, m] = month.split("-").map(Number);
  const end = `${y}-${pad(m)}-${pad(lastDay(y, m))}`;
  if (report_type === "bulanan") return { start: `${y}-${pad(m)}-01`, end };

  const total = y * 12 + (m - 1) - 5;
  return {
    start: `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`,
    end,
  };
}

export const daysBetween = (a, b) =>
  Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );
