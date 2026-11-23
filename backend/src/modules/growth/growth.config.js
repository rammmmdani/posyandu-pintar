export const REFERENCE_VERSION = "who-2006";
export const CALCULATION_VERSION = "0.1.0";

// Aturan sementara: usia boleh melebihi baris referensi terakhir paling banyak 30 hari
// (bulan penuh terakhir). Lebih dari itu dianggap di luar cakupan. Verifikasi bersama aturan usia WHO.
export const COVERAGE_EXTRA_DAYS = 30;

// Usia (hari) mulai dipakainya tinggi berdiri (24 bulan = Math.round(24 * 30,4375)).
// Di bawahnya memakai panjang berbaring. Verifikasi aturan ini pada dokumentasi WHO.
export const STANDING_FROM_DAYS = 731;
