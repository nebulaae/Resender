import pino from 'pino';
import { env, isProd } from '../../src/env';

const usePretty = env.LOG_PRETTY && !isProd;

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'session',
      'sessionString',
      '*.session',
      'initData',
      'token',
    ],
    remove: true,
  },
  transport: usePretty
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined,
});

export default logger;
