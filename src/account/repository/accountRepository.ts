import { TelegramAccount, TelegramAccountAttributes } from '../models/TelegramAccount';

export const listByUser = (userId: string) =>
  TelegramAccount.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });

export const listActiveByUser = (userId: string) =>
  TelegramAccount.findAll({ where: { userId, status: 'active' }, order: [['lastUsedAt', 'ASC']] });

export const findById = (id: string, userId?: string) =>
  TelegramAccount.findOne({ where: userId ? { id, userId } : { id } });

export const findByTgUser = (userId: string, tgUserId: string) =>
  TelegramAccount.findOne({ where: { userId, tgUserId } });

export const createAccount = (data: Partial<TelegramAccountAttributes> & { userId: string; tgUserId: string; sessionEnc: string }) =>
  TelegramAccount.create(data);

export const removeAccount = (account: TelegramAccount) => account.destroy();

export const touch = (account: TelegramAccount) => account.update({ lastUsedAt: new Date() });

export const markStatus = (account: TelegramAccount, status: TelegramAccountAttributes['status']) =>
  account.update({ status });
