import { db } from '../../db/connection.js';
import { agentMemoryService } from './agentMemory.service.js';

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
  violations?: string[];
}

export class AgentPolicyService {
  /**
   * Evaluates text against banned topics, brand taboo words, and safety constraints
   */
  async evaluateConstraints(
    tenantId: string,
    brandId: string | undefined,
    text: string
  ): Promise<PolicyEvaluationResult> {
    if (!text) return { allowed: true };
    const lower = text.toLowerCase();

    // 1. Fetch Agent Settings for banned topics
    let bannedTopics: string[] = [];
    try {
      let settingsQuery = db('agent_settings').where({ tenant_id: tenantId });
      if (brandId) {
        settingsQuery = settingsQuery.where({ brand_id: brandId });
      }
      const settings = await settingsQuery.first();
      if (settings?.banned_topics) {
        bannedTopics = typeof settings.banned_topics === 'string'
          ? JSON.parse(settings.banned_topics)
          : settings.banned_topics;
      }
    } catch {
      // settings table optional fallback
    }

    // 2. Fetch Brand Kit Taboo Words from memory or database
    let tabooWords: string[] = [];
    if (brandId) {
      const memoryGuidelines = await agentMemoryService.recall(tenantId, `guidelines_${brandId}`, brandId);
      if (memoryGuidelines?.tabooWords?.length) {
        tabooWords = memoryGuidelines.tabooWords;
      } else {
        try {
          const brandBrain = await db('brand_brains').where({ brand_id: brandId }).first();
          if (brandBrain?.taboo_words) {
            tabooWords = typeof brandBrain.taboo_words === 'string'
              ? JSON.parse(brandBrain.taboo_words)
              : brandBrain.taboo_words;
          }
        } catch {
          // ignore
        }
      }
    }

    const violations: string[] = [];

    // Check banned topics
    for (const topic of bannedTopics) {
      if (topic && lower.includes(topic.toLowerCase())) {
        violations.push(`Banned Topic: "${topic}"`);
      }
    }

    // Check brand taboo words
    for (const taboo of tabooWords) {
      if (taboo && lower.includes(taboo.toLowerCase())) {
        violations.push(`Brand Taboo Word: "${taboo}"`);
      }
    }

    // Universal safety policy check
    const universalBanned = ['phishing', 'malware injection', 'credit card fraud', 'hate speech'];
    for (const bad of universalBanned) {
      if (lower.includes(bad)) {
        violations.push(`Platform Safety Violation: "${bad}"`);
      }
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        reason: `Content violates governance policies: ${violations.join(', ')}`,
        matchedRule: violations[0],
        violations,
      };
    }

    return { allowed: true };
  }

  /**
   * Determines whether an action requires human approval based on agent settings and mode
   */
  async requiresHumanApproval(
    tenantId: string,
    brandId: string | undefined,
    actionType: string
  ): Promise<boolean> {
    if (actionType === 'publish_direct') {
      return true; // Direct publishing always requires gate unless fully autonomous override
    }

    try {
      const settings = await db('agent_settings').where({ tenant_id: tenantId }).first();
      if (!settings) return true;

      if (settings.autonomous_mode === 'semi') {
        return true;
      }

      return Boolean(settings.require_approval_before_publish);
    } catch {
      return true;
    }
  }

  /**
   * Sanitizes text by stripping out taboo words and replacing with safe alternatives
   */
  sanitizeText(text: string, tabooWords: string[]): string {
    let sanitized = text;
    for (const taboo of tabooWords) {
      if (!taboo) continue;
      const regex = new RegExp(`\\b${taboo}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '[redacted]');
    }
    return sanitized;
  }
}

export const agentPolicyService = new AgentPolicyService();
