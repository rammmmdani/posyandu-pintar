import { z } from "zod";
import { dateString, oneOf } from "../../utils/schemas.js";

export const createReportSchema = z
  .object({
    report_type: oneOf(
      ["bulanan", "rekap_6_bulan", "kustom"],
      "Jenis laporan tidak valid",
    ),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan harus berformat YYYY-MM")
      .optional(),
    period_start: dateString("Tanggal mulai").optional(),
    period_end: dateString("Tanggal akhir").optional(),
  })
  .superRefine((d, ctx) => {
    if (d.report_type === "kustom") {
      if (!d.period_start)
        ctx.addIssue({
          code: "custom",
          path: ["period_start"],
          message: "Tanggal mulai wajib diisi",
        });
      if (!d.period_end)
        ctx.addIssue({
          code: "custom",
          path: ["period_end"],
          message: "Tanggal akhir wajib diisi",
        });
    } else if (!d.month) {
      ctx.addIssue({
        code: "custom",
        path: ["month"],
        message: "Bulan wajib diisi",
      });
    }
  });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
