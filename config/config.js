// sequelize-cli configuration (migrations/seeders only).
// The application itself connects via shared/config/database.ts.
require('dotenv').config();

const common = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: common,
  test: { ...common, database: process.env.DB_NAME_TEST || common.database },
  production: common,
};
