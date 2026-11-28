import { z } from 'zod';
import { dateString, oneOf } from '../../utils/schemas.js';

const monthString = z
  .string({ required_error: 'Bulan wajib diisi', invalid_type_error: 'Bulan harus berupa teks' })
  .regex(/^\d{4}-\d{2}$/, 'Bulan harus berformat YYYY-MM')
  .refine((value) => {
    const [year, month] = value.split('-').map(Number);
    return year >= 1900 && year <= 9999 && month >= 1 && month <= 12;
  }, 'Bulan bukan bulan yang valid');

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createReportSchema = z
  .object({
    report_type: oneOf(['bulanan', 'rekap_6_bulan', 'kustom'], 'Jenis laporan tidak valid'),
    month: monthString.optional(),
    period_start: dateString('Tanggal mulai').optional(),
    period_end: dateString('Tanggal akhir').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.report_type === 'kustom') {
      if (!data.period_start) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['period_start'], message: 'Tanggal mulai wajib diisi' });
      }
      if (!data.period_end) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['period_end'], message: 'Tanggal akhir wajib diisi' });
      }
      if (data.period_start && data.period_end && data.period_end < data.period_start) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['period_end'], message: 'Tanggal akhir tidak boleh sebelum tanggal mulai' });
      }
      return;
    }
    if (!data.month) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['month'], message: 'Bulan wajib diisi' });
    }
  });
