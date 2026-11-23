import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/audit.js';
import * as repo from './users.repository.js';

const bad = (message) => new ApiError(400, 'VALIDATION_ERROR', 'Data tidak valid', [{ field: 'user', message }]);

export async function listUsers(actor, { page, limit, q, is_active }) {
  const { rows, total } = await repo.list(actor.posyandu_id, {
    q: q || null,
    isActive: is_active === undefined ? null : is_active === 'true',
    limit,
    offset: (page - 1) * limit,
  });
  return { rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

export async function createUser(actor, input, ip) {
  const password_hash = await bcrypt.hash(input.password, 10);
  let id;
  try {
    id = await repo.insert({ posyandu_id: actor.posyandu_id, name: input.name, email: input.email, password_hash, role: input.role });
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'EMAIL_TAKEN', 'Email sudah dipakai', [{ field: 'email', message: 'Email sudah dipakai' }]);
    }
    throw err;
  }
  await logAudit({
    userId: actor.id, action: 'create', entityType: 'user', entityId: id,
    newData: { email: input.email, role: input.role }, ip, // tanpa kata sandi
  });
  return repo.findById(actor.posyandu_id, id);
}

export async function updateUser(actor, id, input, ip) {
  const before = await repo.findById(actor.posyandu_id, id);
  if (!before) throw new ApiError(404, 'NOT_FOUND', 'Akun tidak ditemukan');

  if (id === actor.id && input.is_active === false) throw bad('Anda tidak dapat menonaktifkan akun sendiri');
  if (id === actor.id && input.role && input.role !== before.role) throw bad('Anda tidak dapat mengubah role akun sendiri');

  const { password, ...rest } = input;
  const patch = { ...rest };
  if (password) patch.password_hash = await bcrypt.hash(password, 10);

  await repo.update(actor.posyandu_id, id, patch);
  const after = await repo.findById(actor.posyandu_id, id);

  await logAudit({
    userId: actor.id, action: 'update', entityType: 'user', entityId: id,
    oldData: { role: before.role, is_active: before.is_active },
    newData: { role: after.role, is_active: after.is_active, changed_fields: Object.keys(rest) },
    ip,
  });
  if (password) {
    await logAudit({ userId: actor.id, action: 'password_reset', entityType: 'user', entityId: id, ip });
  }
  return after;
}