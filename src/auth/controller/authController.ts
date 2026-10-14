import { Request, Response } from 'express';
import { z } from 'zod';
import * as apiResponse from '../../../shared/utils/apiResponse';
import { validateInitData } from '../../../shared/utils/telegram';
import { signToken } from '../../../shared/utils/jwt';
import { BadRequestError, UnauthorizedError } from '../../../shared/errors/AppError';
import * as userService from '../../user/service/userService';

export const telegramSchema = z.object({ initData: z.string().min(1) });

/** POST /auth/telegram — exchange Mini App initData for an app JWT. */
export const telegramLogin = async (req: Request, res: Response) => {
  const { initData } = req.body as z.infer<typeof telegramSchema>;

  let parsed;
  try {
    parsed = validateInitData(initData);
  } catch (err) {
    throw new UnauthorizedError('initData validation failed: ' + (err as Error).message);
  }

  if (!parsed.user?.id) throw new BadRequestError('initData has no user');

  const user = await userService.upsertFromTelegram(parsed.user, parsed.startParam);
  const token = signToken(user.id);
  return apiResponse.success(res, { token, userId: user.id }, 'Authenticated.');
};
