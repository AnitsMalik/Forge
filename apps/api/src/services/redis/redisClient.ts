import { Redis } from 'ioredis';

let redisInstance: Redis | null = null;
let isConnected = false;
let connectionAttempted = false;

export interface RedisHealth {
  status: 'connected' | 'disconnected' | 'disabled';
  host?: string;
  port?: number;
  latencyMs?: number;
}

/**
 * Returns a singleton ioredis client with fail-fast timeouts and offline queue disabled.
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  if (process.env.REDIS_DISABLED === 'true') {
    return null;
  }

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;

  try {
    redisInstance = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      enableOfflineQueue: false,
      reconnectOnError: () => false,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop reconnecting after 3 tries
        return Math.min(times * 500, 2000);
      },
    });

    redisInstance.on('connect', () => {
      isConnected = true;
    });

    redisInstance.on('ready', () => {
      isConnected = true;
    });

    redisInstance.on('error', (_err) => {
      isConnected = false;
    });

    redisInstance.on('close', () => {
      isConnected = false;
    });

    // Attempt non-blocking background connection
    if (!connectionAttempted) {
      connectionAttempted = true;
      redisInstance.connect().catch(() => {
        isConnected = false;
      });
    }

    return redisInstance;
  } catch (_err) {
    isConnected = false;
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return isConnected && redisInstance !== null;
}

export async function checkRedisHealth(): Promise<RedisHealth> {
  const client = getRedisClient();
  if (!client || process.env.REDIS_DISABLED === 'true') {
    return { status: 'disabled' };
  }

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT) || 6379;

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return {
      status: 'connected',
      host,
      port,
      latencyMs,
    };
  } catch {
    return {
      status: 'disconnected',
      host,
      port,
    };
  }
}
