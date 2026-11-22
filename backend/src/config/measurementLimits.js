// SEMENTARA. Batas kasar untuk menangkap salah ketik (misalnya 84 untuk 8,4 kg).
// Ini BUKAN ambang medis. Nilai di luar batas hanya menandai data "perlu_diperiksa"
// dan tidak dipakai untuk penilaian. Wajib ditinjau tenaga kesehatan sebelum pilot.
export const PROVISIONAL_LIMITS = {
  weight_kg: { min: 0.5, max: 40 },
  height_cm: { min: 30, max: 140 },
};