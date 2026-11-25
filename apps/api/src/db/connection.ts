import knex from 'knex';
import config from './knexfile.js';

export const db = knex(config[process.env.NODE_ENV || 'development']);

export interface PoolStats {
  numUsed: number;
  numFree: number;
  numPendingAcquires: number;
  numPendingCreates: number;
  min: number;
  max: number;
  saturationPct: number;
  status: 'healthy' | 'warning' | 'saturated';
}

/**
 * Returns real-time database connection pool telemetry from tarn.js.
 */
export function getPoolStats(): PoolStats {
  const pool = (db.client as any)?.pool;
  const numUsed = pool?.numUsed?.() ?? 0;
  const numFree = pool?.numFree?.() ?? 0;
  const numPendingAcquires = pool?.numPendingAcquires?.() ?? 0;
  const numPendingCreates = pool?.numPendingCreates?.() ?? 0;
  const min = pool?.min ?? 0;
  const max = pool?.max ?? 1;

  const saturationPct = Number(((numUsed / Math.max(1, max)) * 100).toFixed(1));

  let status: 'healthy' | 'warning' | 'saturated' = 'healthy';
  if (saturationPct > 90 || numPendingAcquires > 10) {
    status = 'saturated';
  } else if (saturationPct > 70 || numPendingAcquires > 0) {
    status = 'warning';
  }

  return {
    numUsed,
    numFree,
    numPendingAcquires,
    numPendingCreates,
    min,
    max,
    saturationPct,
    status,
  };
}
