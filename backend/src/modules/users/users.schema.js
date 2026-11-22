import { z } from 'zod';
import { text, oneOf } from '../../utils/schemas.js';

const email = z
  .string({ required_error: 'Email wajib diisi', invalid_type_error: 'Email harus berupa teks' })
  .trim()
  .min(1, 'Email wajib diisi')
  .max(150, 'Email maksimal 150 karakter')
  .email('Format email tidak valid');

// 72 adalah batas panjang kata sandi yang diproses bcrypt.
const password = z
  .string({ required_error: 'Password wajib diisi', invalid_type_error: 'Password harus berupa teks' })
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter');

const role = oneOf(['kader', 'koordinator'], 'Role harus kader atau koordinator');

export const createUserSchema = z.object({ name: text('Nama', 100), email, password, role });

export const updateUserSchema = z
  .object({
    name: text('Nama', 100).optional(),
    role: role.optional(),
    is_active: z.boolean({ invalid_type_error: 'is_active harus true atau false' }).optional(),
    password: password.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Tidak ada data yang diubah' });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  is_active: z.enum(['true', 'false']).optional(),
});