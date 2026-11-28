import * as service from './reports.service.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export async function list(req, res) {
  const { rows, meta } = await service.listReports(req.user, req.validatedQuery);
  sendSuccess(res, { message: 'Data laporan berhasil diambil', data: rows, meta });
}

export async function create(req, res) {
  const data = await service.createReport(req.user, req.body, req.ip);
  sendSuccess(res, {
    message: data.status === 'selesai' ? 'Laporan berhasil dibuat' : 'Laporan gagal dibuat',
    data,
    status: 201,
  });
}

export async function download(req, res) {
  const { buffer, filename } = await service.downloadReport(req.user, parseId(req.params.id), req.ip);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store',
  });
  return res.send(buffer);
}
