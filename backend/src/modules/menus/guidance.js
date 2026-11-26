// Setiap angka di bawah bersumber dari dokumen yang tertulis. Jangan mengubah tanpa sumber.
//
// [1] Kemenkes RI, "Yuk Cermati MPASI" (keslan.kemkes.go.id/view_artikel/3866), merujuk
//     Pedoman Pemberian Makan Bayi dan Anak, Kemenkes 2020: energi, jumlah, frekuensi, tekstur
//     untuk 6-8, 9-11, dan 12-23 bulan. TODO Vibe: cocokkan dengan PDF pedoman aslinya.
// [2] Kemenkes RI, "Pemberian MPASI harus penuhi 4 syarat ini" (kemkes.go.id): MPASI mulai
//     6 bulan; keragaman minimal 5 dari 8 kelompok pangan; gula dan garam dibatasi.
// [3] Permenkes No. 28 Tahun 2019 (AKG), Lampiran I: 1-3 tahun 1.350 kkal dan 20 g protein;
//     4-6 tahun 1.400 kkal dan 25 g protein. TODO Vibe: cocokkan dengan Lampiran I resmi
//     (angka di sini dikutip dari sumber sekunder yang konsisten).

export const MENU_VALIDATED = false; // true hanya setelah ditinjau ahli gizi

const ENERGY_NOTE = "dari MPASI, di luar ASI";

export const AGE_GROUPS = {
  "6-8_bulan": {
    label: "6 sampai 8 bulan",
    texture: "Lumat dan kental (dihaluskan lalu disaring)",
    amount: "2 sampai 3 sendok makan, bertahap hingga 125 ml per makan",
    meals: "2 sampai 3 kali makan per hari",
    snack: null,
    energy: `200 kkal per hari ${ENERGY_NOTE}`,
  },
  "9-11_bulan": {
    label: "9 sampai 11 bulan",
    texture: "Ditumbuk, lalu dicincang kasar menjelang 12 bulan",
    amount: "125 sampai 200 ml per makan",
    meals: "3 sampai 4 kali makan per hari",
    snack: "1 kali selingan per hari",
    energy: `300 kkal per hari ${ENERGY_NOTE}`,
  },
  "12-23_bulan": {
    label: "12 sampai 23 bulan",
    texture: "Mengikuti menu keluarga",
    amount: "200 sampai 250 ml per makan",
    meals: "3 sampai 4 kali makan per hari",
    snack: "2 kali selingan per hari",
    energy: `550 kkal per hari ${ENERGY_NOTE}`,
  },
  "24-59_bulan": {
    label: "24 sampai 59 bulan",
    texture: "Makanan keluarga",
    amount: null,
    meals: null,
    snack: null,
    energy: null, // diisi dari AKG, lihat akgFor
  },
};

// Kelompok usia menurut bulan penuh. null = di luar cakupan menu (di bawah 6 atau 60 bulan ke atas).
export function ageGroupFor(months) {
  if (months < 6 || months > 59) return null;
  if (months <= 8) return "6-8_bulan";
  if (months <= 11) return "9-11_bulan";
  if (months <= 23) return "12-23_bulan";
  return "24-59_bulan";
}

// AKG hanya dipakai untuk 24-59 bulan. Anggapan: 1-3 tahun mencakup usia sampai 47 bulan.
export function akgFor(months) {
  return months < 48
    ? { label: "1 sampai 3 tahun", energy_kcal: 1350, protein_g: 20 }
    : { label: "4 sampai 6 tahun", energy_kcal: 1400, protein_g: 25 };
}

export function guidanceFor(code, months) {
  const g = AGE_GROUPS[code];
  const result = {
    age_group: code,
    label: g.label,
    texture: g.texture,
    amount: g.amount,
    meals: g.meals,
    snack: g.snack,
    energy: g.energy,
    akg: null,
  };
  if (code === "24-59_bulan") result.akg = akgFor(months);
  return result;
}

export const GENERAL_NOTES = [
  "Rekomendasi bersifat edukasi umum dan bukan pengganti konsultasi tenaga kesehatan.",
  "Kemenkes menganjurkan keragaman minimal 5 dari 8 kelompok pangan (termasuk ASI) dalam sehari. Padukan beberapa menu.",
  "Gula dan garam dibatasi pada makanan anak.",
];
