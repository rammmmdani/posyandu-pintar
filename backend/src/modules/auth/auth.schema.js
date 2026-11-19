import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi', invalid_type_error: 'Email harus berupa teks' })
    .trim()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Password wajib diisi', invalid_type_error: 'Password harus berupa teks' })
    .min(1, 'Password wajib diisi'),
});