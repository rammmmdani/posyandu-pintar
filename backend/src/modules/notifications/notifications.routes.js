import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './notifications.controller.js';

const router = Router();

router.use(authenticate); // dipasang hanya di /notifications

router.get('/', validate(controller.listQuerySchema, 'query'), controller.list);
router.patch('/:id/read', controller.markRead);

export default router;