// Tanggal hari ini (YYYY-MM-DD) di zona waktu Jakarta.
export const todayString = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

// Usia dalam bulan penuh. Kedua parameter berformat YYYY-MM-DD.
export function ageInMonths(birthDate, onDate = todayString()) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [oy, om, od] = onDate.split('-').map(Number);
  return (oy - by) * 12 + (om - bm) - (od < bd ? 1 : 0);
}