import { entities } from '../entities/index';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { envConfig } from './env.config';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: envConfig.DATABASE_URL,
  entities: entities, // Use entities array directly
  synchronize: envConfig.NODE_ENV === 'development',
  logging: false,
  ssl: envConfig.DB_SSL ? { rejectUnauthorized: false } : undefined,
};

// Separate config for DataSource (used in seeder)
export const dataSourceConfig: DataSourceOptions = {
  type: 'postgres',
  url: envConfig.DATABASE_URL,
  entities: entities,
  synchronize: envConfig.NODE_ENV === 'development',
  logging: false,
  ssl: envConfig.DB_SSL ? { rejectUnauthorized: false } : undefined,
};
