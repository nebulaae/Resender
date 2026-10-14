import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { validate } from '../../shared/middleware/validate';
import * as authController from './controller/authController';

const router = Router();

router.post(
  '/telegram',
  validate({ body: authController.telegramSchema }),
  asyncHandler(authController.telegramLogin),
);

export default router;
