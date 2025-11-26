import * as dotenv from 'dotenv';
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (
  !databaseUrl ||
  typeof databaseUrl !== 'string' ||
  databaseUrl.trim() === ''
) {
  throw new Error(
    'ENV CONFIG ERROR: DATABASE_URL is missing or invalid. Please set a valid connection string in .env',
  );
}

export const envConfig = {
  // Database Configuration
  DATABASE_URL: databaseUrl,
  DB_SSL: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1',
  // JWT Configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // App Configuration
  APP_PORT: parseInt(process.env.APP_PORT || '4000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URI: process.env.REDIS_URI || '',
};
