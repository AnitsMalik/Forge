import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type { AgentMemoryItem, MemoryType } from '@socialforge/shared';

export class AgentMemoryService {
  /**
   * Retain a memory item in persistent database storage and memory cache
   */
  async retain(
    tenantId: string,
    key: string,
    value: any,
    options: {
      brandId?: string;
      memoryType?: MemoryType;
      confidence?: number;
      ttlSeconds?: number;
    } = {}
  ): Promise<AgentMemoryItem> {
    const memoryId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = options.ttlSeconds ? new Date(Date.now() + options.ttlSeconds * 1000) : null;
    const memoryType: MemoryType = options.memoryType || 'short_term';
    const confidence = options.confidence ?? 1.0;

    // Check if an existing memory with this key exists for the tenant/brand
    let query = db('agent_memories').where({ tenant_id: tenantId, key });
    if (options.brandId) {
      query = query.where({ brand_id: options.brandId });
    } else {
      query = query.whereNull('brand_id');
    }
    const existing = await query.first();

    if (existing) {
      await db('agent_memories')
        .where({ id: existing.id })
        .update({
          value: JSON.stringify(value),
          confidence,
          memory_type: memoryType,
          expires_at: expiresAt,
          updated_at: now,
        });

      return {
        id: existing.id,
        tenantId,
        brandId: options.brandId,
        memoryType,
        key,
        value,
        confidence,
        expiresAt,
        createdAt: new Date(existing.created_at),
        updatedAt: now,
      };
    }

    await db('agent_memories').insert({
      id: memoryId,
      tenant_id: tenantId,
      brand_id: options.brandId || null,
      memory_type: memoryType,
      key,
      value: JSON.stringify(value),
      confidence,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    });

    return {
      id: memoryId,
      tenantId,
      brandId: options.brandId,
      memoryType,
      key,
      value,
      confidence,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Recall a specific memory item by key with tenant isolation
   */
  async recall(tenantId: string, key: string, brandId?: string): Promise<any | null> {
    let query = db('agent_memories').where({ tenant_id: tenantId, key });
    if (brandId) {
      query = query.andWhere((builder) => {
        builder.where({ brand_id: brandId }).orWhereNull('brand_id');
      });
    }

    const row = await query.first();
    if (!row) return null;

    // Check expiration
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      await db('agent_memories').where({ id: row.id }).delete();
      return null;
    }

    try {
      return typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch {
      return row.value;
    }
  }

  /**
   * Recall all memories of a specific type (e.g. brand_guidelines, engagement_pattern)
   */
  async recallByType(tenantId: string, memoryType: MemoryType, brandId?: string): Promise<AgentMemoryItem[]> {
    let query = db('agent_memories').where({ tenant_id: tenantId, memory_type: memoryType });
    if (brandId) {
      query = query.andWhere((builder) => {
        builder.where({ brand_id: brandId }).orWhereNull('brand_id');
      });
    }

    const rows = await query.select('*');
    const now = Date.now();
    const results: AgentMemoryItem[] = [];

    for (const r of rows) {
      if (r.expires_at && new Date(r.expires_at).getTime() < now) {
        continue;
      }
      let val = r.value;
      try {
        if (typeof val === 'string') val = JSON.parse(val);
      } catch {
        // keep string
      }
      results.push({
        id: r.id,
        tenantId: r.tenant_id,
        brandId: r.brand_id,
        memoryType: r.memory_type,
        key: r.key,
        value: val,
        confidence: r.confidence,
        expiresAt: r.expires_at ? new Date(r.expires_at) : null,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      });
    }

    return results;
  }

  /**
   * Remove a specific memory key
   */
  async forget(tenantId: string, key: string, brandId?: string): Promise<boolean> {
    let query = db('agent_memories').where({ tenant_id: tenantId, key });
    if (brandId) {
      query = query.where({ brand_id: brandId });
    }
    const deletedCount = await query.delete();
    return deletedCount > 0;
  }

  /**
   * Pre-load and cache brand guidelines into agent memory for quick reasoning
   */
  async loadBrandGuidelines(tenantId: string, brandId: string): Promise<any> {
    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) return null;

    let brandBrain = null;
    try {
      const hasBrain = await db.schema.hasTable('brand_brains');
      if (hasBrain) {
        brandBrain = await db('brand_brains').where({ brand_id: brandId }).first();
      }
    } catch {
      // optional
    }

    const guidelines = {
      brandName: brand.name,
      industry: brand.industry || 'General',
      websiteUrl: brand.website_url,
      timezone: brand.timezone || 'UTC',
      tone: brandBrain?.tone || 'Professional yet engaging',
      tabooWords: brandBrain?.taboo_words ? (typeof brandBrain.taboo_words === 'string' ? JSON.parse(brandBrain.taboo_words) : brandBrain.taboo_words) : [],
      voiceRules: brandBrain?.voice_rules ? (typeof brandBrain.voice_rules === 'string' ? JSON.parse(brandBrain.voice_rules) : brandBrain.voice_rules) : ['Clear', 'Impactful', 'Action-oriented'],
      targetAudience: brandBrain?.target_audience || 'Professionals & Decision Makers',
    };

    await this.retain(tenantId, `guidelines_${brandId}`, guidelines, {
      brandId,
      memoryType: 'brand_guidelines',
      confidence: 1.0,
      ttlSeconds: 86400, // 24h cache
    });

    return guidelines;
  }
}

export const agentMemoryService = new AgentMemoryService();
