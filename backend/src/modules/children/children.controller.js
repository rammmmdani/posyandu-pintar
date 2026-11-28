import * as service from './children.service.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export async function list(req, res) {
  const { rows, meta } = await service.listChildren(req.user, req.validatedQuery);
  sendSuccess(res, { message: 'Data berhasil diambil', data: rows, meta });
}

export async function detail(req, res) {
  const data = await service.getChild(req.user, parseId(req.params.id));
  sendSuccess(res, { message: 'Data berhasil diambil', data });
}

export async function create(req, res) {
  const data = await service.createChild(req.user, req.body, req.ip);
  sendSuccess(res, { message: 'Balita berhasil didaftarkan', data, status: 201 });
}

export async function update(req, res) {
  const { child, warning } = await service.updateChild(req.user, parseId(req.params.id), req.body, req.ip);
  sendSuccess(res, { message: 'Data balita berhasil diperbarui', data: child, warning });
}

export async function setStatus(req, res) {
  const data = await service.setChildStatus(req.user, parseId(req.params.id), req.body.status, req.ip);
  sendSuccess(res, { message: 'Status balita berhasil diperbarui', data });
}

export async function remove(req, res) {
  await service.deleteChild(req.user, parseId(req.params.id), req.ip);
  sendSuccess(res, { message: 'Balita berhasil dihapus', data: null });
}

export async function restore(req, res) {
  const data = await service.restoreChild(req.user, parseId(req.params.id), req.ip);
  sendSuccess(res, { message: 'Balita berhasil dipulihkan', data });
}

export async function listConsents(req, res) {
  const data = await service.listConsents(req.user, parseId(req.params.id));
  sendSuccess(res, { message: 'Data berhasil diambil', data });
}

export async function addConsent(req, res) {
  const data = await service.addConsent(req.user, parseId(req.params.id), req.body, req.ip);
  sendSuccess(res, { message: 'Persetujuan wali berhasil dicatat', data, status: 201 });
}