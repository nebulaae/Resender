import crypto from 'crypto';
import { env } from '../../src/env';

const KEY = Buffer.from(env.SESSION_ENC_KEY, 'hex'); // 32 bytes
const ALGO = 'aes-256-gcm';

/** Encrypt a secret (e.g. a Telegram StringSession) → base64(iv|tag|ciphertext). */
export const encryptSecret = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
};

export const decryptSecret = (payload: string): string => {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};
