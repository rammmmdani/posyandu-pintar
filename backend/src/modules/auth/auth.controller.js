import * as service from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { logAudit } from '../../utils/audit.js';

export async function login(req, res) {
  const data = await service.login(req.body.email, req.body.password);
  await logAudit({
    userId: data.user.id,
    action: 'login',
    entityType: 'user',
    entityId: data.user.id,
    ip: req.ip,
  });
  sendSuccess(res, { message: 'Login berhasil', data });
}

export async function logout(req, res) {
  await logAudit({
    userId: req.user.id,
    action: 'logout',
    entityType: 'user',
    entityId: req.user.id,
    ip: req.ip,
  });
  sendSuccess(res, { message: 'Logout berhasil' });
}

export function me(req, res) {
  sendSuccess(res, { message: 'Data berhasil diambil', data: req.user });
}