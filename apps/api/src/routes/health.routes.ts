import { Router } from 'express';
import { db } from '../db/connection.js';

export const healthRouter = Router();

const healthHandler = async (_req: any, res: any) => {
  try {
    const rawResult: any = await db.raw('SELECT 1+1 as result');
    const rows = Array.isArray(rawResult) ? rawResult[0] : rawResult.rows || rawResult;
    const firstRow = Array.isArray(rows) ? rows[0] : rows;
    const isDbConnected = firstRow && (firstRow.result === 2 || firstRow['1+1'] === 2);

    // Verify Meta publication lock integrity
    const metaLock = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .first();

    // Check migration status
    const migrationsTable = await db.schema.hasTable('knex_migrations');
    let migrationsCount = 0;
    if (migrationsTable) {
      const countRes = await db('knex_migrations').count('* as count');
      migrationsCount = Number(countRes[0]?.count || 0);
    }

    const isHealthy = isDbConnected && !!metaLock;

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'up',
        database: isDbConnected ? 'connected' : 'disconnected',
        migrationsApplied: migrationsCount,
        metaPublicationLock: metaLock ? 'intact' : 'missing',
      },
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
};

healthRouter.get('/health', healthHandler);
healthRouter.get('/api/v1/health', healthHandler);

// Internal test harness endpoint to reset rate limits between test suites
healthRouter.post('/api/v1/internal/reset-rate-limits', async (_req, res) => {
  const { authLimiterInstance, magicLimiterInstance, generalLimiterInstance } = await import(
    '../middleware/rateLimiter.js'
  );
  authLimiterInstance.reset();
  magicLimiterInstance.reset();
  generalLimiterInstance.reset();
  res.json({ success: true, message: 'Rate limits cleared' });
});

