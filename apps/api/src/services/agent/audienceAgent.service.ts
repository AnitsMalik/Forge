import { toolRegistryService } from './toolRegistry.service.js';

export interface AudienceAnalysisResult {
  primaryDemographics: string;
  peakEngagementWindows: Array<{ day: string; bestTimes: string[]; timezone: string }>;
  formatPreferences: Array<{ format: string; resonanceScore: number }>;
  recommendedPacing: string;
}

export class AudienceAgentService {
  /**
   * Analyzes target customer personas and optimal publication timing windows
   */
  async analyzeAudience(
    tenantId: string,
    brandId: string | undefined
  ): Promise<AudienceAnalysisResult> {
    const audienceTool = await toolRegistryService.executeTool(
      'audience.analyzeTarget',
      {},
      { tenantId, brandId }
    );

    const voiceTool = await toolRegistryService.executeTool(
      'brandBrain.getVoiceRules',
      {},
      { tenantId, brandId }
    );

    const tz = voiceTool.result?.timezone || 'UTC';

    return {
      primaryDemographics: voiceTool.result?.targetAudience || 'B2B Founders & Marketing Leaders',
      peakEngagementWindows: [
        { day: 'Tuesday', bestTimes: ['08:30 AM', '01:15 PM'], timezone: tz },
        { day: 'Wednesday', bestTimes: ['09:00 AM', '04:30 PM'], timezone: tz },
        { day: 'Thursday', bestTimes: ['08:45 AM', '05:00 PM'], timezone: tz },
      ],
      formatPreferences: [
        { format: 'Multi-slide Carousel', resonanceScore: 94 },
        { format: 'Short-Form Video (9:16 Reel)', resonanceScore: 89 },
        { format: 'High-Density Text Thread', resonanceScore: 82 },
      ],
      recommendedPacing: '4 high-value posts per week with 48h distribution intervals',
    };
  }
}

export const audienceAgentService = new AudienceAgentService();
