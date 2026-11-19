import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { findActiveById } from '../modules/auth/auth.repository.js';

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Silakan login terlebih dahulu');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesi tidak valid atau sudah berakhir');
  }

  // Cek status akun di setiap request: akun nonaktif langsung kehilangan akses.
  const user = await findActiveById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Akun tidak aktif atau tidak ditemukan');
  }

  req.user = user; // { id, posyandu_id, name, email, role, is_active }
  next();
}