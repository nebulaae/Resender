import { User } from '../models/User';
import * as userRepository from '../repository/userRepository';

export interface TelegramIdentity {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  language_code?: string | null;
  is_premium?: boolean;
}

const SUPPORTED_LANGS = new Set([
  'ru', 'uz', 'en', 'es', 'ar', 'hi', 'pt', 'fr', 'de', 'tr', 'id', 'fa', 'uk',
]);

const normalizeLang = (code?: string | null): string => {
  const c = (code || 'en').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.has(c) ? c : 'en';
};

/** Upsert a user from Telegram identity (bot ctx or Mini App initData). */
export const upsertFromTelegram = async (
  tg: TelegramIdentity,
  startParam?: string,
): Promise<User> => {
  let user = await userRepository.findByTelegramId(tg.id);

  if (!user) {
    let referredBy: string | null = null;
    if (startParam && /^ref_(.+)$/.test(startParam)) {
      const refCode = startParam.replace(/^ref_/, '');
      const referrer = await userRepository.findByTelegramId(refCode);
      if (referrer && referrer.telegramId !== tg.id) referredBy = referrer.id;
    }
    user = await userRepository.createUser({
      telegramId: tg.id,
      username: tg.username ?? null,
      firstName: tg.first_name ?? null,
      lastName: tg.last_name ?? null,
      languageCode: normalizeLang(tg.language_code),
      isPremium: !!tg.is_premium,
      referredBy,
      lastSeenAt: new Date(),
    });
  } else {
    await userRepository.updateUser(user, {
      username: tg.username ?? user.username,
      firstName: tg.first_name ?? user.firstName,
      lastName: tg.last_name ?? user.lastName,
      isPremium: tg.is_premium ?? user.isPremium,
      lastSeenAt: new Date(),
    });
  }
  return user;
};

export const getProfile = async (userId: string) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');
  const [usage, referrals] = await Promise.all([
    userRepository.usageSummary(userId),
    userRepository.countReferrals(userId),
  ]);
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    languageCode: user.languageCode,
    isPremium: user.isPremium,
    stats: {
      forwards: usage.forward ?? 0,
      messages: usage.message ?? 0,
      bytes: usage.bytes ?? 0,
      referrals,
    },
  };
};

export const setLanguage = async (userId: string, lang: string): Promise<string> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new Error('User not found');
  const normalized = normalizeLang(lang);
  await userRepository.updateUser(user, { languageCode: normalized });
  return normalized;
};
