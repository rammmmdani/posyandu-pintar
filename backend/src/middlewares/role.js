import { ApiError } from '../utils/ApiError.js';

// Pemakaian: router.get('/', authenticate, requireRole('koordinator'), controller)
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke fitur ini'));
    }
    next();
  };