export interface SourceRef {
  kind: 'public' | 'private';
  username?: string; // for public
  channelId?: string; // marked id like -100... for private (from /c/<id>/)
  msgId?: number; // present when a message link was given
}

/**
 * Parse a source reference the user supplied:
 *   @name | https://t.me/name | https://t.me/name/123
 *   https://t.me/c/<internalId>/<msgId>  (private)
 *   -100123...  | 123...                 (raw ids)
 */
export const parseSourceRef = (input: string): SourceRef => {
  const s = input.trim();

  // private message link: t.me/c/<internal>/<msg>[/<msg>]
  const priv = s.match(/t\.me\/c\/(\d+)\/(?:\d+\/)?(\d+)/i);
  if (priv) {
    return { kind: 'private', channelId: '-100' + priv[1], msgId: Number(priv[2]) };
  }

  // public link with optional message id
  const pub = s.match(/t\.me\/([A-Za-z0-9_]{4,})(?:\/(?:\d+\/)?(\d+))?/i);
  if (pub) {
    return { kind: 'public', username: pub[1], msgId: pub[2] ? Number(pub[2]) : undefined };
  }

  // @username
  if (/^@[A-Za-z0-9_]{4,}$/.test(s)) {
    return { kind: 'public', username: s.slice(1) };
  }

  // raw marked channel id
  if (/^-100\d+$/.test(s)) {
    return { kind: 'private', channelId: s };
  }

  // bare username
  if (/^[A-Za-z0-9_]{4,}$/.test(s)) {
    return { kind: 'public', username: s };
  }

  throw new Error('Не понял ссылку. Пришли @username, ссылку на канал или ссылку на сообщение.');
};
