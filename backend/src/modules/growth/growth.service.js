// STUB. Kontrak antarmuka antara modul pengukuran (Weri) dan modul penilaian (Vibe).
// Vibe menimpa isi file ini setelah PR ini ter-merge. Tanda tangan fungsi TIDAK boleh berubah.

// Menghitung penilaian dan peringatan untuk satu pengukuran.
// child: { id, birth_date, gender, ... }, measurement: objek Measurement.
// Mengembalikan { assessment: objek Assessment | null, alerts: array Alert }.
export async function assessMeasurement({ child, measurement }) {
  return { assessment: null, alerts: [] };
}

// Penilaian terbaru untuk satu pengukuran, atau null.
export async function getLatestAssessment(measurementId) {
  return null;
}