import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createMeasurementSchema, updateMeasurementSchema, listQuerySchema } from './measurements.schema.js';
import * as controller from './measurements.controller.js';

const router = Router();

// authenticate dipasang per rute (bukan router.use) agar URL tak dikenal tetap menghasilkan 404.
router.get('/children/:id/measurements', authenticate, validate(listQuerySchema, 'query'), controller.list);
router.post('/children/:id/measurements', authenticate, validate(createMeasurementSchema), controller.create);
router.get('/measurements/:id', authenticate, controller.detail);
router.patch('/measurements/:id', authenticate, validate(updateMeasurementSchema), controller.update);

export default router;