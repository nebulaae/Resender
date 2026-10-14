import crypto from 'crypto';
import { env } from '../../src/env';

export interface TelegramInitUser {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ParsedInitData {
  user: TelegramInitUser;
  authDate: number;
  startParam?: string;
  raw: Record<string, string>;
}

const MAX_AGE_SECONDS = 24 * 60 * 60; // 24h

/**
 * Validate a Telegram Mini App initData string and return its parsed contents.
 * Throws on invalid signature or expired auth_date.
 * Ref: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export const validateInitData = (initData: string): ParsedInitData => {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('initData: missing hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(env.BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computed !== hash) throw new Error('initData: bad signature');

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    throw new Error('initData: expired');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new Error('initData: missing user');
  const parsedUser = JSON.parse(userRaw);

  const raw: Record<string, string> = {};
  for (const [k, v] of params.entries()) raw[k] = v;

  return {
    user: { ...parsedUser, id: String(parsedUser.id) },
    authDate,
    startParam: params.get('start_param') ?? undefined,
    raw,
  };
};
