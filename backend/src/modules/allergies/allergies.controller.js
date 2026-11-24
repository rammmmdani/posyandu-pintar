import * as service from './allergies.service.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export async function list(req, res) {
  sendSuccess(res, { message: 'Data berhasil diambil', data: await service.listAllergies(req.user, parseId(req.params.id)) });
}
export async function replace(req, res) {
  const data = await service.replaceAllergies(req.user, parseId(req.params.id), req.body.items, req.ip);
  sendSuccess(res, { message: 'Alergi dan pantangan berhasil disimpan', data });
}