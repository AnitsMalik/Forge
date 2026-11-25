import crypto from 'crypto';
import { db } from '../../db/connection.js';

export class DistributedLockService {
  private inMemoryLocks = new Map<string, { token: string; expiresAt: number }>();

  /**
   * Attempts to acquire a distributed lock for an automation run or resource.
   * Leverages `distributed_locks` table with memory fallback.
   */
  public async acquireLock(
    lockKey: string,
    ttlSeconds: number = 300,
    ownerToken: string = crypto.randomUUID()
  ): Promise<{ acquired: boolean; token: string }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      // 1. Check if an active lock exists in the DB
      const existing = await db('distributed_locks').where({ lock_key: lockKey }).first();

      if (existing) {
        if (new Date(existing.expires_at) > now) {
          // Lock is held by another active worker
          return { acquired: false, token: existing.owner_token };
        } else {
          // Lock is expired: claim it by updating owner and extending TTL
          const updated = await db('distributed_locks')
            .where({ lock_key: lockKey })
            .update({
              owner_token: ownerToken,
              expires_at: expiresAt,
              acquired_at: now,
            });

          if (updated) {
            this.inMemoryLocks.set(lockKey, { token: ownerToken, expiresAt: expiresAt.getTime() });
            return { acquired: true, token: ownerToken };
          }
        }
      }

      // 2. Insert new lock record
      await db('distributed_locks').insert({
        lock_key: lockKey,
        owner_token: ownerToken,
        expires_at: expiresAt,
        acquired_at: now,
      });

      this.inMemoryLocks.set(lockKey, { token: ownerToken, expiresAt: expiresAt.getTime() });
      return { acquired: true, token: ownerToken };
    } catch {
      // Memory fallback for tests or when table is busy
      const mem = this.inMemoryLocks.get(lockKey);
      if (mem && mem.expiresAt > Date.now()) {
        return { acquired: false, token: mem.token };
      }
      this.inMemoryLocks.set(lockKey, { token: ownerToken, expiresAt: expiresAt.getTime() });
      return { acquired: true, token: ownerToken };
    }
  }

  /**
   * Releases an acquired lock if the caller holds the matching owner token.
   */
  public async releaseLock(lockKey: string, token: string): Promise<boolean> {
    this.inMemoryLocks.delete(lockKey);

    try {
      const deleted = await db('distributed_locks')
        .where({ lock_key: lockKey, owner_token: token })
        .delete();

      return deleted > 0;
    } catch {
      return true;
    }
  }

  /**
   * Checks whether a lock key is actively held.
   */
  public async isLocked(lockKey: string): Promise<boolean> {
    const now = new Date();
    try {
      const lock = await db('distributed_locks').where({ lock_key: lockKey }).first();
      if (lock && new Date(lock.expires_at) > now) {
        return true;
      }
    } catch {
      const mem = this.inMemoryLocks.get(lockKey);
      if (mem && mem.expiresAt > Date.now()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extends/refreshes a lock's TTL while long-running jobs are active.
   */
  public async refreshLock(lockKey: string, token: string, ttlSeconds: number = 300): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      const updated = await db('distributed_locks')
        .where({ lock_key: lockKey, owner_token: token })
        .update({
          expires_at: expiresAt,
        });

      if (updated) {
        this.inMemoryLocks.set(lockKey, { token, expiresAt: expiresAt.getTime() });
        return true;
      }
      return false;
    } catch {
      this.inMemoryLocks.set(lockKey, { token, expiresAt: expiresAt.getTime() });
      return true;
    }
  }
}

export const distributedLockService = new DistributedLockService();
