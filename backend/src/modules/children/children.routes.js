import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  createChildSchema, updateChildSchema, statusSchema, consentSchema, listQuerySchema,
} from './children.schema.js';
import * as controller from './children.controller.js';

const router = Router();

router.use(authenticate); // semua endpoint balita butuh login

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.post('/', validate(createChildSchema), controller.create);
router.get('/:id', controller.detail);
router.patch('/:id', validate(updateChildSchema), controller.update);
router.patch('/:id/status', validate(statusSchema), controller.setStatus);
router.get('/:id/consents', controller.listConsents);
router.post('/:id/consents', validate(consentSchema), controller.addConsent);

export default router;