import * as service from './foods.service.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export async function list(req, res) {
  sendSuccess(res, { message: 'Data berhasil diambil', data: await service.listFoods() });
}
export async function create(req, res) {
  sendSuccess(res, { message: 'Bahan berhasil ditambahkan', data: await service.createFood(req.user, req.body, req.ip), status: 201 });
}
export async function addPrice(req, res) {
  sendSuccess(res, { message: 'Harga berhasil diperbarui', data: await service.addPrice(req.user, parseId(req.params.id), req.body, req.ip), status: 201 });
}
export async function setActive(req, res) {
  sendSuccess(res, { message: 'Status bahan berhasil diperbarui', data: await service.setActive(req.user, parseId(req.params.id), req.body.is_active, req.ip) });
}