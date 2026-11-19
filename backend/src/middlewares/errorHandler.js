import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
}

// Harus punya 4 parameter agar dikenali Express sebagai error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    });
  }

  // JSON rusak dari client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Format JSON tidak valid',
      code: 'VALIDATION_ERROR',
      errors: [],
    });
  }

  // Error tak terduga: detail hanya di log server, tidak dikirim ke client.
  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    code: 'INTERNAL_ERROR',
    errors: env.nodeEnv === 'development' ? [{ message: err.message }] : [],
  });
}