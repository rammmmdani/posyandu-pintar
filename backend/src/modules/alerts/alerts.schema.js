import { z } from "zod";
import { text, optionalText, dateString, oneOf } from "../../utils/schemas.js";

// "ditindaklanjuti" tidak bisa dipilih manual: terbentuk otomatis saat tindak lanjut dicatat.
export const statusSchema = z
  .object({
    status: oneOf(["dilihat", "ditutup"], "Status harus dilihat atau ditutup"),
    note: optionalText(500),
  })
  .superRefine((d, ctx) => {
    if (d.status === "ditutup" && !d.note) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Catatan wajib diisi saat menutup peringatan",
      });
    }
  });

export const followUpSchema = z.object({
  action_date: dateString("Tanggal tindakan"),
  action_note: text("Catatan tindakan", 500),
  referral_status: oneOf(
    ["tidak_dirujuk", "direncanakan", "sudah_dirujuk", "selesai"],
    "Status rujukan tidak valid",
  ),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["baru", "dilihat", "ditindaklanjuti", "ditutup"]).optional(),
  severity: z
    .enum(["perlu_perhatian", "perlu_pemeriksaan", "perlu_tindak_lanjut"])
    .optional(),
  child_id: z.coerce.number().int().positive().optional(),
});
