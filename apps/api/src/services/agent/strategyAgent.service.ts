import { toolRegistryService } from './toolRegistry.service.js';

export interface StrategyRecommendation {
  pillars: Array<{ name: string; allocationPercentage: number; description: string }>;
  hashtagClusters: { branded: string[]; industry: string[]; niche: string[] };
  callToActionFramework: string[];
  suggestedAngles: string[];
}

export class StrategyAgentService {
  /**
   * Formulates high-resonance content pillars, hashtag clusters, and CTA frameworks
   */
  async formulateStrategy(
    tenantId: string,
    brandId: string | undefined,
    topicOrGoal: string
  ): Promise<StrategyRecommendation> {
    // Query brand voice rules
    const voiceRules = await toolRegistryService.executeTool(
      'brandBrain.getVoiceRules',
      {},
      { tenantId, brandId }
    );

    const brandName = voiceRules.result?.brandName || 'SocialForge';
    const cleanTopic = topicOrGoal.replace(/[^\w\s]/gi, '').trim();

    return {
      pillars: [
        { name: 'Core Problem Agitation', allocationPercentage: 35, description: `Highlight hidden costs of inefficient ${cleanTopic || 'workflows'}.` },
        { name: 'Proprietary Solution Framework', allocationPercentage: 35, description: 'Step-by-step technical blueprints that build immediate authority.' },
        { name: 'Social Proof & Case Studies', allocationPercentage: 20, description: 'Quantifiable client results and peer testimonials.' },
        { name: 'Direct Conversion & Call-to-Action', allocationPercentage: 10, description: 'High-urgency invitations to test the platform.' },
      ],
      hashtagClusters: {
        branded: [`#${brandName.replace(/\s+/g, '')}`, '#BuiltWithSocialForge'],
        industry: ['#SaaSGrowth', '#DigitalMarketing', '#MarketingAutomation', '#ContentStrategy'],
        niche: ['#SocialMediaROI', '#OrganicReach', '#B2BGrowthPlaybook'],
      },
      callToActionFramework: [
        'Save this post for your next content sprint 📌',
        'Drop a comment below with your biggest bottleneck 👇',
        'Follow for actionable weekly growth breakdowns 🔔',
        'Check the link in bio to deploy this framework 🚀',
      ],
      suggestedAngles: [
        `Why traditional ${cleanTopic || 'methods'} fail in 2026`,
        `The 3-part framework we used to scale 10x faster`,
        `What nobody tells you about sustainable audience growth`,
      ],
    };
  }
}

export const strategyAgentService = new StrategyAgentService();
