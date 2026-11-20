import { ApiError } from './ApiError.js';

// Ubah parameter URL menjadi angka. Format salah dianggap data tidak ditemukan.
export function parseId(value) {
  if (!/^\d{1,15}$/.test(value)) {
    throw new ApiError(404, 'NOT_FOUND', 'Data tidak ditemukan');
  }
  return Number(value);
}