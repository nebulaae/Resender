import { fn, col } from 'sequelize';
import { User, UserAttributes } from '../models/User';
import { UsageEvent } from '../models/UsageEvent';

export const findByTelegramId = (telegramId: string) =>
  User.findOne({ where: { telegramId } });

export const findById = (id: string) => User.findByPk(id);

export const createUser = (data: Partial<UserAttributes> & { telegramId: string }) =>
  User.create(data);

export const updateUser = (user: User, data: Partial<UserAttributes>) => user.update(data);

export const countReferrals = (userId: string) => User.count({ where: { referredBy: userId } });

export const usageSummary = async (userId: string): Promise<Record<string, number>> => {
  const rows = (await UsageEvent.findAll({
    where: { userId },
    attributes: ['type', [fn('COALESCE', fn('SUM', col('value')), 0), 'total']],
    group: ['type'],
    raw: true,
  })) as unknown as Array<{ type: string; total: string }>;
  const out: Record<string, number> = { forward: 0, message: 0, bytes: 0 };
  for (const r of rows) out[r.type] = Number(r.total);
  return out;
};

export const addUsage = (userId: string, type: 'forward' | 'message' | 'bytes', value: number, jobId?: string) =>
  UsageEvent.create({ userId, type, value: String(value), jobId: jobId ?? null });
