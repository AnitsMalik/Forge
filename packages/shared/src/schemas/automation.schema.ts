import { z } from 'zod';

export const CreateAutomationSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(1, 'Automation name is required'),
  description: z.string().optional(),
  recipeId: z.string().optional(),
  trigger: z.object({
    type: z.enum(['schedule', 'webhook', 'datasource_change', 'social_event', 'manual']),
    cronExpression: z.string().optional(),
    sourceConnectionId: z.string().uuid().optional(),
    resourceId: z.string().optional(),
    filterRules: z.record(z.unknown()).optional(),
  }),
  workflow: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['condition', 'generate_content', 'render_media', 'approval_gate', 'publish', 'notify']),
      config: z.record(z.unknown()),
      nextStepId: z.string().optional(),
    })
  ).min(1, 'At least one workflow step is required'),
});

export const TriggerAutomationSchema = z.object({
  automationId: z.string().uuid(),
  payloadOverride: z.record(z.unknown()).optional(),
});
