import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const config = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3308,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'socialforge_db',
      charset: 'utf8mb4',
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
    client: 'mysql2',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3308,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
    },
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
