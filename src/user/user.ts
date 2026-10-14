import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { auth } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validate';
import * as userController from './controller/userController';

const router = Router();

router.get('/me/profile', auth, asyncHandler(userController.getMe));
router.put(
  '/me/language',
  auth,
  validate({ body: userController.languageSchema }),
  asyncHandler(userController.updateLanguage),
);

export default router;
