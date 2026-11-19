import { Router } from 'express';
import { query } from './config/db.js';
import { sendSuccess } from './utils/response.js';
import authRoutes from './modules/auth/auth.routes.js';

const router = Router();

router.get('/health', async (req, res) => {
  await query('SELECT 1');
  sendSuccess(res, {
    message: 'Server berjalan',
    data: { status: 'ok', database: 'connected' },
  });
});

// Modul fitur didaftarkan di sini saat dibuat, contoh:
// router.use('/auth', authRoutes);
router.use('/auth', authRoutes);

export default router;