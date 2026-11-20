import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiError } from '../../utils/ApiError.js';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { loginSchema } from './auth.schema.js';
import * as controller from './auth.controller.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi')),
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

export default router;