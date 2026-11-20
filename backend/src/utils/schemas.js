import { z } from 'zod';

export const text = (label, max = 200) =>
  z
    .string({ required_error: `${label} wajib diisi`, invalid_type_error: `${label} harus berupa teks` })
    .trim()
    .min(1, `${label} wajib diisi`)
    .max(max, `${label} maksimal ${max} karakter`);

// Boleh kosong. String kosong diubah menjadi null.
export const optionalText = (max = 300) =>
  z
    .string({ invalid_type_error: 'Harus berupa teks' })
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .nullish()
    .transform((v) => v || null);

export const dateString = (label) =>
  z
    .string({ required_error: `${label} wajib diisi`, invalid_type_error: `${label} harus berupa teks` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} harus berformat YYYY-MM-DD`)
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, `${label} bukan tanggal yang valid`);

export const oneOf = (values, message) => z.enum(values, { errorMap: () => ({ message }) });