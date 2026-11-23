import * as service from './users.service.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export async function list(req, res) {
  const { rows, meta } = await service.listUsers(req.user, req.validatedQuery);
  sendSuccess(res, { message: 'Data berhasil diambil', data: rows, meta });
}

export async function create(req, res) {
  const data = await service.createUser(req.user, req.body, req.ip);
  sendSuccess(res, { message: 'Akun berhasil dibuat', data, status: 201 });
}

export async function update(req, res) {
  const data = await service.updateUser(req.user, parseId(req.params.id), req.body, req.ip);
  sendSuccess(res, { message: 'Akun berhasil diperbarui', data });
}