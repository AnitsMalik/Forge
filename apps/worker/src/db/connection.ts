import knex from 'knex';
import { config } from '../config/index.js';

export const db = knex({
  client: config.database.client,
  connection: process.env.DATABASE_URL || {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    charset: 'utf8mb4',
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
});
