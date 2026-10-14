import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { env } from '../../src/env';
import logger from '../utils/logger';

let botClient: TelegramClient | null = null;

/** Lazily start the GramJS bot client used to deliver copies to users. */
export const getBotClient = async (): Promise<TelegramClient> => {
  if (botClient && botClient.connected) return botClient;
  const client = new TelegramClient(new StringSession(''), env.TELEGRAM_API_ID, env.TELEGRAM_API_HASH, {
    connectionRetries: 5,
    floodSleepThreshold: 120,
    baseLogger: undefined,
  });
  client.setLogLevel('error' as never);
  await client.start({ botAuthToken: env.BOT_TOKEN });
  botClient = client;
  logger.info('Delivery bot client ready');
  return client;
};

export interface SendFileOptions {
  chatId: string | number;
  file: string | Buffer; // path or buffer
  caption?: string;
  entities?: Api.TypeMessageEntity[];
  attributes?: Api.TypeDocumentAttribute[];
  forceDocument?: boolean;
}

export const sendFile = async (opts: SendFileOptions): Promise<Api.Message> => {
  const client = await getBotClient();
  return client.sendFile(opts.chatId, {
    file: opts.file,
    caption: opts.caption,
    formattingEntities: opts.entities,
    attributes: opts.attributes,
    forceDocument: opts.forceDocument,
  }) as unknown as Api.Message;
};

export const sendText = async (
  chatId: string | number,
  text: string,
  entities?: Api.TypeMessageEntity[],
): Promise<void> => {
  const client = await getBotClient();
  await client.sendMessage(chatId, { message: text, formattingEntities: entities });
};

export const disconnectBot = async (): Promise<void> => {
  if (botClient) {
    try {
      await botClient.disconnect();
    } catch {
      /* ignore */
    }
    botClient = null;
  }
};
