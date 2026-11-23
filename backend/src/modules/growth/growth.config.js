export const REFERENCE_VERSION = "who-2006";
export const CALCULATION_VERSION = "0.1.0";

// Aturan sementara: usia boleh melebihi baris referensi terakhir paling banyak 30 hari.
export const COVERAGE_EXTRA_DAYS = 30;

// Batas usia 24 bulan dalam hari.
export const STANDING_FROM_DAYS = 24 * 30.4375;

// Usia maksimum untuk indikator berkunci panjang/tinggi: 60 bulan + tenggang.
export const MAX_REFERENCE_AGE_DAYS = 1826 + COVERAGE_EXTRA_DAYS;
