import { z } from 'zod';
import { dateString, optionalText, oneOf } from '../../utils/schemas.js';

// Angka positif dengan batas desimal sesuai kolom database. Boleh null atau tidak dikirim.
const decimal = (label, max, places) =>
  z
    .number({ invalid_type_error: `${label} harus berupa angka` })
    .positive(`${label} harus lebih dari 0`)
    .max(max, `${label} terlalu besar`)
    .refine((v) => Math.abs(v * 10 ** places - Math.round(v * 10 ** places)) < 1e-9, {
      message: `${label} maksimal ${places} angka di belakang koma`,
    })
    .nullish()
    .transform((v) => v ?? null);

const type = oneOf(['recumbent', 'standing'], 'Jenis pengukuran harus recumbent atau standing')
  .nullish()
  .transform((v) => v ?? null);

// Aturan gabungan, dipakai saat membuat dan saat koreksi.
export function checkCombination(d) {
  const issues = [];
  if (d.weight_kg === null && d.height_cm === null) {
    issues.push({ field: 'weight_kg', message: 'Isi minimal berat badan atau panjang/tinggi badan' });
  }
  if (d.height_cm !== null && d.measurement_type === null) {
    issues.push({
      field: 'measurement_type',
      message: 'Jenis pengukuran wajib diisi jika panjang/tinggi badan diisi',
    });
  }
  return issues;
}

export const createMeasurementSchema = z
  .object({
    measurement_date: dateString('Tanggal pengukuran'),
    weight_kg: decimal('Berat badan', 999, 2),
    height_cm: decimal('Panjang/tinggi badan', 999, 1),
    measurement_type: type,
    notes: optionalText(500),
  })
  .superRefine((d, ctx) => {
    for (const issue of checkCombination(d)) {
      ctx.addIssue({ code: 'custom', path: [issue.field], message: issue.message });
    }
  });

// Koreksi: field yang tidak dikirim tidak diubah. version wajib (pengecekan konflik).
export const updateMeasurementSchema = z.object({
  version: z.number({ required_error: 'Versi data wajib dikirim' }).int().min(1),
  measurement_date: dateString('Tanggal pengukuran').optional(),
  weight_kg: decimal('Berat badan', 999, 2).optional(),
  height_cm: decimal('Panjang/tinggi badan', 999, 1).optional(),
  measurement_type: type.optional(),
  notes: optionalText(500).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(['asc', 'desc']).default('desc'),
});