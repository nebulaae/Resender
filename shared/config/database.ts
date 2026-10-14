import { Sequelize } from 'sequelize';
import { env, isProd } from '../../src/env';
import logger from '../utils/logger';

export const db = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  logging: false,
  pool: { max: env.DB_POOL_MAX, min: 0, acquire: 30_000, idle: 10_000, evict: 10_000 },
  dialectOptions: { keepAlive: true },
  define: {
    underscored: true, // snake_case columns from camelCase attributes
    freezeTableName: false,
  },
  retry: {
    max: 3,
    match: [/SequelizeConnectionError/i, /ECONNRESET/i, /ETIMEDOUT/i, /EHOSTUNREACH/i],
  },
});

/** Authenticate with retry/backoff for slow-starting databases. */
export const authenticateDatabase = async (maxAttempts = 6, retryDelayMs = 3000): Promise<void> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.authenticate();
      logger.info('Database connection established');
      return;
    } catch (err) {
      const last = attempt === maxAttempts;
      logger.warn(
        { attempt, maxAttempts, err: (err as Error).message },
        'Database connection failed' + (last ? '' : `, retrying in ${retryDelayMs}ms`),
      );
      if (last) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
};

/** Dev-only schema sync from models (gated by DB_SYNC_ON_START). */
export const syncDatabase = async (): Promise<void> => {
  if (isProd || !env.DB_SYNC_ON_START) return;
  await db.sync({ alter: true });
  logger.info('Database schema synced from models (alter)');
};

export default db;
