import * as service from './measurements.service.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export async function list(req, res) {
  const { rows, meta } = await service.listMeasurements(req.user, parseId(req.params.id), req.validatedQuery);
  sendSuccess(res, { message: 'Data berhasil diambil', data: rows, meta });
}

export async function detail(req, res) {
  const data = await service.getMeasurement(req.user, parseId(req.params.id));
  sendSuccess(res, { message: 'Data berhasil diambil', data });
}

export async function create(req, res) {
  const { data, warning } = await service.createMeasurement(req.user, parseId(req.params.id), req.body, req.ip);
  sendSuccess(res, { message: 'Pengukuran berhasil disimpan', data, warning, status: 201 });
}

export async function update(req, res) {
  const { data, warning } = await service.updateMeasurement(req.user, parseId(req.params.id), req.body, req.ip);
  sendSuccess(res, { message: 'Pengukuran berhasil diperbarui', data, warning });
}