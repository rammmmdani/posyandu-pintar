const toUtc = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// Selisih hari antara dua tanggal berformat YYYY-MM-DD.
export const ageInDays = (birthDate, onDate) =>
  Math.round((toUtc(onDate) - toUtc(birthDate)) / 86400000);
