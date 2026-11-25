import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type { AgentSettings } from '@socialforge/shared';

export class AgentSettingsService {
  /**
   * Retrieves agent settings for a tenant & optional brand
   */
  async getSettings(tenantId: string, brandId?: string): Promise<AgentSettings> {
    let query = db('agent_settings').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.where({ brand_id: brandId });
    }

    const row = await query.first();
    if (!row) {
      return {
        tenantId,
        brandId,
        model: 'gpt-4o',
        temperature: 0.7,
        autonomousMode: 'semi',
        requireApprovalBeforePublish: true,
        maxWeeklyAutoPosts: 7,
        strictnessLevel: 90,
        bannedTopics: ['politics', 'gambling', 'unverified health claims'],
      };
    }

    let banned: string[] = [];
    if (row.banned_topics) {
      banned = typeof row.banned_topics === 'string'
        ? JSON.parse(row.banned_topics)
        : row.banned_topics;
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      model: row.model || 'gpt-4o',
      temperature: row.temperature ?? 0.7,
      autonomousMode: row.autonomous_mode || 'semi',
      requireApprovalBeforePublish: Boolean(row.require_approval_before_publish ?? true),
      maxWeeklyAutoPosts: row.max_weekly_auto_posts ?? 7,
      strictnessLevel: row.strictness_level ?? 90,
      bannedTopics: banned,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Updates or creates agent settings for a tenant & optional brand
   */
  async updateSettings(tenantId: string, updates: Partial<AgentSettings>, brandId?: string): Promise<AgentSettings> {
    let query = db('agent_settings').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.where({ brand_id: brandId });
    }

    const existing = await query.first();
    const now = new Date();

    const bannedTopicsJson = updates.bannedTopics
      ? JSON.stringify(updates.bannedTopics)
      : undefined;

    if (existing) {
      const patch: any = { updated_at: now };
      if (updates.model !== undefined) patch.model = updates.model;
      if (updates.temperature !== undefined) patch.temperature = updates.temperature;
      if (updates.autonomousMode !== undefined) patch.autonomous_mode = updates.autonomousMode;
      if (updates.requireApprovalBeforePublish !== undefined) patch.require_approval_before_publish = updates.requireApprovalBeforePublish;
      if (updates.maxWeeklyAutoPosts !== undefined) patch.max_weekly_auto_posts = updates.maxWeeklyAutoPosts;
      if (updates.strictnessLevel !== undefined) patch.strictness_level = updates.strictnessLevel;
      if (bannedTopicsJson !== undefined) patch.banned_topics = bannedTopicsJson;

      await db('agent_settings').where({ id: existing.id }).update(patch);
    } else {
      const newId = crypto.randomUUID();
      await db('agent_settings').insert({
        id: newId,
        tenant_id: tenantId,
        brand_id: brandId || null,
        model: updates.model || 'gpt-4o',
        temperature: updates.temperature ?? 0.7,
        autonomous_mode: updates.autonomousMode || 'semi',
        require_approval_before_publish: updates.requireApprovalBeforePublish ?? true,
        max_weekly_auto_posts: updates.maxWeeklyAutoPosts ?? 7,
        strictness_level: updates.strictnessLevel ?? 90,
        banned_topics: bannedTopicsJson || JSON.stringify(['politics', 'gambling']),
        created_at: now,
        updated_at: now,
      });
    }

    return this.getSettings(tenantId, brandId);
  }
}

export const agentSettingsService = new AgentSettingsService();
