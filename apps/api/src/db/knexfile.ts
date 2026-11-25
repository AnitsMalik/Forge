import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const knexConfig: { [key: string]: Knex.Config } = {
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
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    pool: {
      min: Number(process.env.DB_POOL_MIN) || 5,
      max: Number(process.env.DB_POOL_MAX) || 30,
      acquireTimeoutMillis: Number(process.env.DB_ACQUIRE_TIMEOUT_MS) || 10000,
      createTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false,
      afterCreate: (conn: any, done: Function) => {
        conn.query("SET time_zone = '+00:00';", (err: any) => {
          if (err) return done(err, conn);
          conn.query("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';", (err2: any) => {
            done(err2, conn);
          });
        });
      },
    },
  },
  production: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'js',
    },
    pool: {
      min: Number(process.env.DB_POOL_MIN) || 10,
      max: Number(process.env.DB_POOL_MAX) || 50,
      acquireTimeoutMillis: Number(process.env.DB_ACQUIRE_TIMEOUT_MS) || 10000,
      createTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false,
      afterCreate: (conn: any, done: Function) => {
        conn.query("SET time_zone = '+00:00';", (err: any) => {
          if (err) return done(err, conn);
          conn.query("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';", (err2: any) => {
            done(err2, conn);
          });
        });
      },
    },
  },
};

export default knexConfig;
