import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { validate } from '../../middlewares/validate.js';
import { createFoodSchema, priceSchema, activeSchema } from './foods.schema.js';
import * as controller from './foods.controller.js';

const router = Router();

router.use(authenticate); // dipasang hanya di /food-items

router.get('/', controller.list); // semua peran boleh melihat
router.post('/', requireRole('koordinator'), validate(createFoodSchema), controller.create);
router.post('/:id/prices', requireRole('koordinator'), validate(priceSchema), controller.addPrice);
router.patch('/:id', requireRole('koordinator'), validate(activeSchema), controller.setActive);

export default router;