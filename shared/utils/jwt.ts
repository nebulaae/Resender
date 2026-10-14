import jwt from 'jsonwebtoken';
import { env } from '../../src/env';

export interface JwtPayload {
  sub: string; // user id
}

export const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '30d' });

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded?.sub ? decoded : null;
  } catch {
    return null;
  }
};
