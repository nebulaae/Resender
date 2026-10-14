import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import * as apiResponse from '../utils/apiResponse';
import logger from '../utils/logger';

/** 404 handler for unmatched routes. */
export const notFoundHandler = (req: Request, res: Response) =>
  apiResponse.notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);

/** Central error middleware. Must be registered last, after all routes. */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    return apiResponse.validationError(res, 'Validation failed.', err.flatten());
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, 'Unhandled AppError');
    return apiResponse.error(
      res,
      err.expose ? err.message : 'Internal server error.',
      err.statusCode,
      err.errors,
    );
  }

  // Sequelize unique constraint -> 409
  if (err instanceof Error && err.name === 'SequelizeUniqueConstraintError') {
    return apiResponse.conflict(res, 'Resource already exists.');
  }

  logger.error({ err }, 'Unhandled error');
  return apiResponse.internalError(res);
};
