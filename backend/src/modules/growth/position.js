import { BOUNDARY_MONTHS, POSITION_CORRECTION_CM } from "./growth.config.js";

// Permenkes No. 2 Tahun 2020, Lampiran BAB II (hlm. 12) dan catatan bintang pada baris 24 bulan.
//  - di bawah 24 bulan : tabel PB. Jika diukur berdiri, panjang ditambah 0,7 cm.
//  - di atas 24 bulan  : tabel TB. Jika diukur telentang, tinggi dikurangi 0,7 cm.
//  - tepat 24 bulan    : tabel mengikuti cara ukur (telentang = PB, berdiri = TB), tanpa koreksi.
// months = umur dalam bulan penuh. m = { height_cm, measurement_type }.
export function resolveLengthHeight(m, months) {
  const supine = m.measurement_type === "recumbent";
  let table;
  let correction = 0;

  if (months < BOUNDARY_MONTHS) {
    table = "pb";
    if (!supine) correction = POSITION_CORRECTION_CM;
  } else if (months > BOUNDARY_MONTHS) {
    table = "tb";
    if (supine) correction = -POSITION_CORRECTION_CM;
  } else {
    table = supine ? "pb" : "tb";
  }

  const height = Math.round((m.height_cm + correction) * 10) / 10;
  return { table, height, correction };
}
