import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { env } from '../../src/env';
import { decryptSecret } from '../utils/crypto';
import logger from '../utils/logger';

interface Entry {
  client: TelegramClient;
  lastUsed: number;
}

const pool = new Map<string, Entry>();
const IDLE_MS = 10 * 60 * 1000;

export const buildClient = (sessionString: string): TelegramClient =>
  new TelegramClient(new StringSession(sessionString), env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH, {
    connectionRetries: 5,
    floodSleepThreshold: 120,
    autoReconnect: true,
  });

/** Get a connected client for a stored account (by id), reusing the pool. */
export const getClientForAccount = async (
  accountId: string,
  sessionEnc: string,
): Promise<TelegramClient> => {
  const existing = pool.get(accountId);
  if (existing) {
    existing.lastUsed = Date.now();
    if (!existing.client.connected) await existing.client.connect();
    return existing.client;
  }
  const client = buildClient(decryptSecret(sessionEnc));
  client.setLogLevel('error' as never);
  await client.connect();
  pool.set(accountId, { client, lastUsed: Date.now() });
  return client;
};

export const dropClient = async (accountId: string): Promise<void> => {
  const entry = pool.get(accountId);
  if (!entry) return;
  pool.delete(accountId);
  try {
    await entry.client.disconnect();
  } catch {
    /* ignore */
  }
};

/** Periodically disconnect idle clients to free resources. */
export const startIdleSweeper = (): NodeJS.Timeout =>
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of pool) {
      if (now - entry.lastUsed > IDLE_MS) {
        logger.debug({ accountId: id }, 'disconnecting idle client');
        void dropClient(id);
      }
    }
  }, 60_000).unref();

export const disconnectAll = async (): Promise<void> => {
  for (const [, entry] of pool) {
    try {
      await entry.client.disconnect();
    } catch {
      /* ignore */
    }
  }
  pool.clear();
};
