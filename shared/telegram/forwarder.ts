import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { Api, TelegramClient } from 'telegram';
import * as delivery from './delivery';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'application/pdf': '.pdf',
};

const extFromMime = (mime?: string): string => {
  if (!mime) return '.bin';
  if (MIME_EXT[mime]) return MIME_EXT[mime];
  const sub = mime.split('/')[1];
  return sub ? '.' + sub.split(';')[0] : '.bin';
};

const fileNameFor = (message: Api.Message): string => {
  if (message.photo) return 'photo.jpg';
  const doc = message.document;
  if (doc) {
    const nameAttr = doc.attributes?.find(
      (a): a is Api.DocumentAttributeFilename => a instanceof Api.DocumentAttributeFilename,
    );
    if (nameAttr?.fileName) return nameAttr.fileName;
    return 'file' + extFromMime(doc.mimeType);
  }
  return 'file.bin';
};

const isMediaLike = (message: Api.Message): boolean => {
  const doc = message.document;
  if (!doc) return false;
  if (message.video || message.audio || message.voice || message.videoNote || message.gif || message.sticker) {
    return true;
  }
  return (doc.mimeType || '').startsWith('image/');
};

export interface CopyResult {
  delivered: boolean;
  bytes: number;
}

const tmpFile = (name: string): string =>
  path.join(os.tmpdir(), `resender_${crypto.randomBytes(8).toString('hex')}_${name}`);

/**
 * Copy one message to a chat: download its bytes with the reader (user)
 * account, then re-upload a fresh copy via the delivery bot. Works on
 * protected channels because MTProto downloads are not blocked.
 */
export const copyMessageToChat = async (
  readClient: TelegramClient,
  message: Api.Message,
  deliverChatId: string,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<CopyResult> => {
  const media = message.media;
  const isWebPage = media instanceof Api.MessageMediaWebPage;

  if (!media || isWebPage) {
    const text = message.message || '';
    if (!text.trim()) return { delivered: false, bytes: 0 };
    await delivery.sendText(deliverChatId, text, message.entities);
    return { delivered: true, bytes: 0 };
  }

  const name = fileNameFor(message);
  const out = tmpFile(name);
  let bytes = 0;
  try {
    await readClient.downloadMedia(message, {
      outputFile: out,
      progressCallback: (downloaded, total) => {
        bytes = Number(downloaded);
        onProgress?.(Number(downloaded), Number(total));
      },
    });

    const doc = message.document;
    await delivery.sendFile({
      chatId: deliverChatId,
      file: out,
      caption: message.message || undefined,
      entities: message.entities,
      attributes: doc?.attributes,
      forceDocument: doc ? !isMediaLike(message) : false,
    });
    return { delivered: true, bytes };
  } finally {
    await fs.unlink(out).catch(() => undefined);
  }
};
