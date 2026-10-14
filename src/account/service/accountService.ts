import { Api } from 'telegram';
import { buildClient, dropClient } from '../../../shared/telegram/clientManager';
import { encryptSecret } from '../../../shared/utils/crypto';
import { NotFoundError } from '../../../shared/errors/AppError';
import { env } from '../../env';
import logger from '../../../shared/utils/logger';
import * as accountRepository from '../repository/accountRepository';

export interface LoginHandle {
  userId: string;
  qrUrl: string;
  needsPassword: boolean;
  submitPassword(pw: string): void;
  completion: Promise<{ accountId: string; tgUserId: string; username: string | null }>;
  cancel(): Promise<void>;
}

const active = new Map<string, LoginHandle>();
export const getActiveLogin = (userId: string) => active.get(userId);

/** Start a QR login. Resolves (completion) when the user approves in Telegram. */
export const startQrLogin = async (
  userId: string,
  callbacks: { onQr: (url: string) => void; onNeedPassword: () => void },
): Promise<LoginHandle> => {
  const prev = active.get(userId);
  if (prev) await prev.cancel().catch(() => undefined);

  const client = buildClient('');
  client.setLogLevel('error' as never);
  await client.connect();

  let resolvePw!: (pw: string) => void;
  const pwPromise = new Promise<string>((r) => (resolvePw = r));

  const handle: LoginHandle = {
    userId,
    qrUrl: '',
    needsPassword: false,
    submitPassword: (pw) => resolvePw(pw),
    completion: Promise.resolve() as never,
    cancel: async () => {
      active.delete(userId);
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    },
  };

  handle.completion = (async () => {
    try {
      await client.signInUserWithQrCode(
        { apiId: env.TELEGRAM_API_ID, apiHash: env.TELEGRAM_API_HASH },
        {
          qrCode: async (code) => {
            const token = Buffer.from(code.token).toString('base64url');
            handle.qrUrl = `tg://login?token=${token}`;
            callbacks.onQr(handle.qrUrl);
          },
          password: async () => {
            handle.needsPassword = true;
            callbacks.onNeedPassword();
            return pwPromise;
          },
          onError: (err: Error) => {
            logger.warn({ err: err.message }, 'qr login error');
            return false;
          },
        },
      );

      const me = (await client.getMe()) as Api.User;
      const session = client.session.save() as unknown as string;
      const tgUserId = String(me.id);
      const encrypted = encryptSecret(session);

      const existing = await accountRepository.findByTgUser(userId, tgUserId);
      const account = existing
        ? await existing.update({
            sessionEnc: encrypted,
            status: 'active',
            username: me.username ?? null,
            isPremium: !!me.premium,
            lastUsedAt: new Date(),
          })
        : await accountRepository.createAccount({
            userId,
            tgUserId,
            username: me.username ?? null,
            phone: me.phone ?? null,
            sessionEnc: encrypted,
            isPremium: !!me.premium,
            status: 'active',
            lastUsedAt: new Date(),
          });

      return { accountId: account.id, tgUserId, username: me.username ?? null };
    } finally {
      active.delete(userId);
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    }
  })();

  active.set(userId, handle);
  return handle;
};

export const listAccounts = (userId: string) => accountRepository.listByUser(userId);

export const removeAccount = async (userId: string, accountId: string): Promise<void> => {
  const account = await accountRepository.findById(accountId, userId);
  if (!account) throw new NotFoundError('Account not found.');
  await dropClient(accountId);
  await accountRepository.removeAccount(account);
};
