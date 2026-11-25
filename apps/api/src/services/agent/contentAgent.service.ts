import { toolRegistryService } from './toolRegistry.service.js';
import { agentPolicyService } from './agentPolicy.service.js';

export interface ContentSynthesisResult {
  headline: string;
  hooks: string[];
  variants: Array<{ platform: string; content: string; characterCount: number }>;
  scrubbedTabooWords: string[];
}

export class ContentAgentService {
  /**
   * Crafts multi-channel captions, platform variants, and hooks tailored to brand identity
   */
  async synthesizeContent(
    tenantId: string,
    brandId: string | undefined,
    prompt: string,
    platforms: string[] = ['linkedin', 'x', 'instagram']
  ): Promise<ContentSynthesisResult> {
    // 1. Fetch voice rules & taboo words
    const voiceTool = await toolRegistryService.executeTool(
      'brandBrain.getVoiceRules',
      {},
      { tenantId, brandId }
    );

    const voiceRules = voiceTool.result || {};
    const tabooWords: string[] = voiceRules.tabooWords || [];
    const tone = voiceRules.tone || 'Action-driven & insightful';

    // 2. Formulate 3 distinct hook angles
    const hooks = [
      `Stop doing ${prompt.slice(0, 30)} the old way. Here is the framework that changes everything:`,
      `Most teams spend hours on ${prompt.slice(0, 30)}. We automated it down to 60 seconds.`,
      `The counter-intuitive truth about ${prompt.slice(0, 30)} that nobody is talking about:`,
    ];

    // 3. Generate platform variants
    const scrubbedTaboo: string[] = [];
    const variants = platforms.map((platform) => {
      let rawCopy = '';

      if (platform === 'x' || platform === 'x_twitter') {
        rawCopy = `${hooks[0]}\n\n1. Cut manual overhead by 80%\n2. Maintain consistent brand voice\n3. Convert views into pipeline\n\nFull framework below 🧵`;
      } else if (platform === 'linkedin') {
        rawCopy = `🚀 ${hooks[1]}\n\nIn high-velocity organizations, speed to market is the ultimate moat. Here is the 3-step blueprint we deployed:\n\n• Blueprint 1: Standardize modular workflows\n• Blueprint 2: Guardrail tone & governance\n• Blueprint 3: Leverage closed-loop telemetry\n\nWhat is your team's biggest challenge in this space?\n\n#Leadership #Innovation #Growth`;
      } else {
        // Instagram / Facebook
        rawCopy = `✨ ${hooks[2]}\n\nDouble tap if you're ready to scale your social engine without burnout! Link in bio for our complete guide.\n\n#SocialForge #ContentCreation #CreatorEconomy`;
      }

      // Scrub taboo words if present
      for (const taboo of tabooWords) {
        if (rawCopy.toLowerCase().includes(taboo.toLowerCase())) {
          scrubbedTaboo.push(taboo);
          rawCopy = agentPolicyService.sanitizeText(rawCopy, [taboo]);
        }
      }

      return {
        platform,
        content: rawCopy,
        characterCount: rawCopy.length,
      };
    });

    return {
      headline: hooks[0],
      hooks,
      variants,
      scrubbedTabooWords: Array.from(new Set(scrubbedTaboo)),
    };
  }
}

export const contentAgentService = new ContentAgentService();
