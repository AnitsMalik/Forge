import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { BrandBrain } from '@socialforge/shared';

const openai = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;

export interface GenerateContentInput {
  prompt: string;
  brandName: string;
  brandSlug: string;
  brandKit?: {
    toneOfVoice?: any;
    targetAudiences?: string[];
    hashtagsDefault?: string[];
    tabooWords?: string[];
    disclaimers?: string;
  };
  brandBrain?: BrandBrain;
  targetPlatforms: Array<'instagram' | 'facebook' | 'x_twitter' | 'linkedin' | 'tiktok' | 'youtube_shorts'>;
  campaignGoal?: string;
}

export interface GeneratedContentOutput {
  title: string;
  baseContent: string;
  variants: Record<string, string>;
}

export async function generateContent(input: GenerateContentInput): Promise<GeneratedContentOutput> {
  const brain = input.brandBrain;
  const tone = brain?.tone || input.brandKit?.toneOfVoice || { formality: 'approachable', descriptors: ['engaging', 'modern'] };
  const tabooList = brain?.topicsToAvoid || input.brandKit?.tabooWords || [];
  const defaultHashtags = brain?.hashtagPreferences?.defaultTags || input.brandKit?.hashtagsDefault || [];
  const disclaimers = input.brandKit?.disclaimers || '';
  const usps = brain?.usps || [];
  const ctas = brain?.ctaPreferences || [];
  const emojiStyle = brain?.emojiPreferences?.usage || 'moderate';
  const signatureEmojis = brain?.emojiPreferences?.signatureEmojis || ['✨'];

  // If OpenAI API key is available, call GPT-4o with structured prompt
  if (openai) {
    const systemPrompt = `You are the lead multi-brand social media copywriter for "${input.brandName}".
Brand Brain Governance Guidelines:
- Tone of Voice: Formality=${tone.formality || 'approachable'}. Descriptors: ${(tone.descriptors || []).join(', ')}.
- USPs & Differentiators: ${usps.join(' | ') || 'None specified'}.
- CTA Preferences: ${ctas.join(' | ') || 'None specified'}.
- Emoji Policy: Usage=${emojiStyle}. Signature Emojis: ${signatureEmojis.join(' ')}.
- Forbidden Taboo Words & Competitors (NEVER USE): ${tabooList.join(', ') || 'None'}.
- Default Brand Hashtags to weave in: ${defaultHashtags.join(', ') || 'None'}.
- Legal Disclaimer to append if applicable: ${disclaimers || 'None'}.

Output Format: You MUST return a valid JSON object with keys:
{
  "title": "short campaign title",
  "baseContent": "core message",
  "variants": {
    "instagram": "Instagram tailored caption with emojis and formatted hashtags",
    "x_twitter": "punchy tweet strictly under 280 characters with 1-2 hashtags",
    "linkedin": "professional thought-leadership post with line breaks and key takeaways"
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input.prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      title: parsed.title || input.prompt.slice(0, 50),
      baseContent: parsed.baseContent || input.prompt,
      variants: parsed.variants || {},
    };
  }

  // High-fidelity heuristic synthesis engine when no OpenAI API key is configured
  const cleanPrompt = input.prompt.trim();
  const title = cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 47)}...` : cleanPrompt;
  const brandTags = defaultHashtags.length > 0 ? defaultHashtags.join(' ') : `#${input.brandSlug} #Innovation`;

  const variants: Record<string, string> = {};

  if (input.targetPlatforms.includes('instagram')) {
    variants['instagram'] = `✨ ELEVATE YOUR STANDARD ✨\n\n${cleanPrompt}\n\nKey Highlights:\n🌱 Formulated with intention\n⚡ Rapid results backed by clinical science\n💫 Designed for daily performance\n\nTap the link in our bio to explore the complete collection.\n\n.\n.\n${brandTags} #DailyRoutine #ElevatedLiving`;
  }

  if (input.targetPlatforms.includes('x_twitter')) {
    const twitterDraft = `✨ Big announcement: ${cleanPrompt}\n\nDiscover the difference: https://${input.brandSlug}.example.com\n\n${defaultHashtags.slice(0, 2).join(' ')}`;
    // Enforce 280 char limit
    variants['x_twitter'] = twitterDraft.length > 280 ? twitterDraft.slice(0, 277) + '...' : twitterDraft;
  }

  if (input.targetPlatforms.includes('linkedin')) {
    variants['linkedin'] = `We are proud to share a major milestone at ${input.brandName}.\n\n${cleanPrompt}\n\nOur perspective on where the category is heading in 2026:\n1. Transparency is the only durable moat.\n2. True innovation requires rigorous testing before market launch.\n3. Customer-centric delivery creates lasting brand loyalty.\n\nWhat are your thoughts on this approach? Let's connect in the comments below.\n\n${brandTags} #Leadership #ProductLaunch #BusinessStrategy`;
  }

  return {
    title,
    baseContent: cleanPrompt,
    variants,
  };
}
