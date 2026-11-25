import { z } from 'zod';

export const AgentRunRequestSchema = z.object({
  brandId: z.string().uuid(),
  agentRole: z.enum([
    'growth_manager',
    'audience_agent',
    'strategy_agent',
    'content_agent',
    'analytics_agent',
    'optimization_agent',
    'experiment_agent',
  ]),
  goal: z.string().min(1, 'Goal or instruction is required'),
  context: z.record(z.unknown()).optional(),
});

export const AgentPolicyUpdateSchema = z.object({
  brandId: z.string().uuid(),
  bannedTopics: z.array(z.string()).optional(),
  maxDailyPosts: z.number().int().min(1).max(100).optional(),
  requireApprovalBeforePublish: z.boolean().optional(),
  minConfidenceScore: z.number().min(0).max(1).optional(),
});
