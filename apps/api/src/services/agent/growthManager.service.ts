import { toolRegistryService } from './toolRegistry.service.js';
import { agentMemoryService } from './agentMemory.service.js';

export interface GrowthPlan {
  brandId: string;
  objective: string;
  milestones: Array<{ phase: string; description: string; targetDay: number }>;
  contentThemes: string[];
  recommendedSchedule: { daysPerWeek: number; peakSlots: string[] };
  estimatedWeeklyImpressions: number;
}

export class GrowthManagerService {
  /**
   * Orchestrates high-level growth campaigns, setting milestones and content schedules
   */
  async runGrowthPlan(
    tenantId: string,
    brandId: string | undefined,
    objective: string
  ): Promise<GrowthPlan> {
    const effectiveBrandId = brandId || 'default_brand';

    // 1. Query audience insights tool
    const audienceTool = await toolRegistryService.executeTool(
      'audience.analyzeTarget',
      {},
      { tenantId, brandId: effectiveBrandId }
    );

    // 2. Query analytics metrics
    const analyticsTool = await toolRegistryService.executeTool(
      'analytics.queryMetrics',
      {},
      { tenantId, brandId: effectiveBrandId }
    );

    // 3. Assemble strategic growth plan
    const growthPlan: GrowthPlan = {
      brandId: effectiveBrandId,
      objective,
      milestones: [
        { phase: 'Phase 1: Attention Capture', description: 'Deploy counter-narrative hooks to agitate core industry friction points.', targetDay: 1 },
        { phase: 'Phase 2: Authority Building', description: 'Publish framework carousels breaking down proprietary methodologies.', targetDay: 3 },
        { phase: 'Phase 3: Proof & Validation', description: 'Showcase customer case studies and quantitative results.', targetDay: 5 },
        { phase: 'Phase 4: Direct Conversion', description: 'Offer high-leverage lead magnet or limited-time cohort access.', targetDay: 7 },
      ],
      contentThemes: [
        'Counter-Intuitive Insights',
        'Step-by-Step Blueprint',
        'Real-World Case Study',
        'Framework Breakdown',
      ],
      recommendedSchedule: {
        daysPerWeek: 4,
        peakSlots: audienceTool.result?.peakHours || ['09:00 AM', '04:30 PM'],
      },
      estimatedWeeklyImpressions: (analyticsTool.result?.averageImpressionsPerPost || 1500) * 4,
    };

    // 4. Retain plan in agent episodic memory
    await agentMemoryService.retain(tenantId, `growth_plan_${effectiveBrandId}`, growthPlan, {
      brandId: effectiveBrandId,
      memoryType: 'episodic',
      ttlSeconds: 604800, // 7 days
    });

    return growthPlan;
  }
}

export const growthManagerService = new GrowthManagerService();
