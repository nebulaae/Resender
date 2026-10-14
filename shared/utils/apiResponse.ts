import { Response } from 'express';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  status_code: number;
  message: string;
  data?: T;
  errors?: unknown;
}

export const success = <T>(res: Response, data?: T, message = 'Success.', statusCode = 200) =>
  res.status(statusCode).json({ success: true, status_code: statusCode, message, data } satisfies ApiEnvelope<T>);

export const created = <T>(res: Response, data?: T, message = 'Created.') =>
  success(res, data, message, 201);

export const error = (res: Response, message = 'Internal server error.', statusCode = 500, errors?: unknown) =>
  res.status(statusCode).json({ success: false, status_code: statusCode, message, errors } satisfies ApiEnvelope);

export const badRequest = (res: Response, message = 'Bad request.', errors?: unknown) =>
  error(res, message, 400, errors);
export const unauthorized = (res: Response, message = 'Unauthorized.') => error(res, message, 401);
export const forbidden = (res: Response, message = 'Forbidden.') => error(res, message, 403);
export const notFound = (res: Response, message = 'Not found.') => error(res, message, 404);
export const conflict = (res: Response, message = 'Conflict.') => error(res, message, 409);
export const validationError = (res: Response, message = 'Validation failed.', errors?: unknown) =>
  error(res, message, 422, errors);
export const tooManyRequests = (res: Response, message = 'Too many requests.') =>
  error(res, message, 429);
export const internalError = (res: Response, message = 'Internal server error.') =>
  error(res, message, 500);
