import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { validate } from '../../middlewares/validate.js';
import { createUserSchema, updateUserSchema, listQuerySchema } from './users.schema.js';
import * as controller from './users.controller.js';

const router = Router();

router.use(authenticate, requireRole('koordinator')); // router ini hanya dipasang di /users

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.post('/', validate(createUserSchema), controller.create);
router.patch('/:id', validate(updateUserSchema), controller.update);

export default router;