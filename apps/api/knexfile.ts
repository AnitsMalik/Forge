import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'socialforge_db',
    },
    migrations: {
      directory: path.join(__dirname, 'src/db/migrations'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: path.join(__dirname, 'src/db/seeds'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.join(__dirname, 'src/db/migrations'),
      extension: 'js',
    },
    pool: {
      min: 2,
      max: 20,
    },
  },
};

export default config;
