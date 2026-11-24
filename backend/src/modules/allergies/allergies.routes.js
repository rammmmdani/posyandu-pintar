import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { replaceAllergiesSchema } from './allergies.schema.js';
import * as controller from './allergies.controller.js';

const router = Router();

router.get('/children/:id/allergies', authenticate, controller.list);
router.put('/children/:id/allergies', authenticate, validate(replaceAllergiesSchema), controller.replace);

export default router;