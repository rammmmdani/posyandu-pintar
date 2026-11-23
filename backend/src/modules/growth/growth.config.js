export const REFERENCE_VERSION = "who-2006";
export const CALCULATION_VERSION = "0.2.0";

export const DAYS_PER_MONTH = 30.4375; // 365,25 / 12, dipakai untuk kunci usia di tabel referensi

// Permenkes No. 2 Tahun 2020 Pasal 4 ayat (1): indeks berlaku untuk anak usia 0 sampai 60 bulan.
export const MAX_AGE_MONTHS = 60;

// Lampiran BAB II (hlm. 12): PB untuk 0 sampai 24 bulan (telentang), TB di atas 24 bulan (berdiri).
export const BOUNDARY_MONTHS = 24;
export const POSITION_CORRECTION_CM = 0.7;
