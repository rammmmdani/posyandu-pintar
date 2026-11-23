import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import * as repo from './auth.repository.js';

const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 jam

const toPublicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  posyandu_id: u.posyandu_id,
});

export async function login(email, password) {
  const user = await repo.findByEmail(email);
  const passwordOk = user ? await bcrypt.compare(password, user.password_hash) : false;

  // Pesan sengaja sama untuk semua kegagalan agar tidak membocorkan email mana yang terdaftar.
  if (!user || !passwordOk || !user.is_active) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
  }

  await repo.touchLastLogin(user.id);
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: TOKEN_TTL_SECONDS });

  return { token, expires_in: TOKEN_TTL_SECONDS, user: toPublicUser(user) };
}