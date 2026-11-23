import { z } from 'zod';
import * as repo from './notifications.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { sendSuccess } from '../../utils/response.js';
import { parseId } from '../../utils/parseId.js';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  is_read: z.enum(['true', 'false']).optional(),
});

export async function list(req, res) {
  const { page, limit, is_read } = req.validatedQuery;
  const { rows, total, unread } = await repo.list(req.user.id, {
    isRead: is_read === undefined ? null : is_read === 'true',
    limit,
    offset: (page - 1) * limit,
  });
  sendSuccess(res, {
    message: 'Data berhasil diambil',
    data: rows,
    meta: { page, limit, total, total_pages: Math.ceil(total / limit), unread_count: unread },
  });
}

export async function markRead(req, res) {
  const data = await repo.markRead(req.user.id, parseId(req.params.id));
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Notifikasi tidak ditemukan');
  sendSuccess(res, { message: 'Notifikasi ditandai dibaca', data });
}