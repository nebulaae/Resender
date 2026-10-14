import { Request, Response } from 'express';
import { z } from 'zod';
import * as apiResponse from '../../../shared/utils/apiResponse';
import * as userService from '../service/userService';

export const getMe = async (req: Request, res: Response) => {
  const profile = await userService.getProfile(req.user!.id);
  return apiResponse.success(res, profile);
};

export const languageSchema = z.object({ language: z.string().min(2).max(8) });

export const updateLanguage = async (req: Request, res: Response) => {
  const { language } = req.body as z.infer<typeof languageSchema>;
  const lang = await userService.setLanguage(req.user!.id, language);
  return apiResponse.success(res, { language: lang }, 'Language updated.');
};
