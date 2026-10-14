import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { User } from '../../src/user/models/User';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User | null;
  }
}

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token;
  return cookieToken || null;
};

export const auth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError('Missing auth token.');
    const payload = verifyToken(token);
    if (!payload) throw new UnauthorizedError('Invalid or expired token.');
    const user = await User.findByPk(payload.sub);
    if (!user) throw new UnauthorizedError('User not found.');
    if (user.isBlocked) throw new ForbiddenError('Account is blocked.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
