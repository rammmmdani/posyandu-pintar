// Format response sukses sesuai API Contract bagian 1.1
export function sendSuccess(res, { message = 'Berhasil', data = null, meta, status = 200 } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}