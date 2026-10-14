import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** Coerce common truthy strings ("1", "true", "yes", "on") into booleans. */
const boolean = (def: boolean) =>
  z
    .preprocess((v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
      return v;
    }, z.boolean())
    .default(def);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  LOG_PRETTY: boolean(true),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_SYNC_ON_START: boolean(false),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  SESSION_ENC_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'SESSION_ENC_KEY must be 64 hex chars (32 bytes)'),

  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(1),
  BOT_TOKEN: z.string().min(1),
  BOT_API_ROOT: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
