import { z } from 'zod';
import { text, optionalText, dateString, oneOf } from '../../utils/schemas.js';

const gender = oneOf(['L', 'P'], 'Jenis kelamin harus L atau P');
const method = oneOf(['lisan', 'tertulis', 'checklist'], 'Metode persetujuan tidak valid').default('checklist');
const regionCode = (label) =>
  z.preprocess(
    (v) => (v === '' ? null : v),
    z
      .string({ invalid_type_error: `${label} harus berupa teks` })
      .trim()
      .regex(/^\d{3}$/, `${label} harus terdiri dari 3 digit angka`)
      .nullish()
      .transform((v) => v || null)
  );

export const createChildSchema = z.object({
  name: text('Nama anak', 150),
  birth_date: dateString('Tanggal lahir').nullish().transform((v) => v ?? null),
  gender,
  parent_name: text('Nama wali', 150),
  parent_phone: optionalText(30),
  address: optionalText(300),
  rt: regionCode('RT'),
  rw: regionCode('RW'),
  confirm_duplicate: z.boolean().optional().default(false),
  consent: z.object(
    {
      guardian_name: text('Nama wali pemberi persetujuan', 150),
      method,
      notice_version: text('Versi pemberitahuan', 20),
    },
    { required_error: 'Persetujuan wali wajib dicatat' }
  ),
});

// Semua opsional. Field yang tidak dikirim tidak diubah.
export const updateChildSchema = z
  .object({
    name: text('Nama anak', 150).optional(),
    birth_date: dateString('Tanggal lahir').nullable().optional(),
    gender: gender.optional(),
    parent_name: text('Nama wali', 150).optional(),
    parent_phone: z.string().trim().max(30, 'Maksimal 30 karakter').nullable().optional(),
    address: z.string().trim().max(300, 'Maksimal 300 karakter').nullable().optional(),
    rt: regionCode('RT'),
    rw: regionCode('RW'),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Tidak ada data yang diubah' });

export const statusSchema = z.object({
  status: oneOf(['aktif', 'nonaktif'], 'Status harus aktif atau nonaktif'),
});

export const consentSchema = z.object({
  consent_status: oneOf(['diberikan', 'ditarik'], 'Status persetujuan harus diberikan atau ditarik'),
  guardian_name: text('Nama wali', 150),
  method,
  notice_version: text('Versi pemberitahuan', 20),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['aktif', 'nonaktif', 'semua', 'terhapus']).default('aktif'),
  single: z.coerce.boolean().default(false),
  rt: regionCode('RT'),
  rw: regionCode('RW'),
});