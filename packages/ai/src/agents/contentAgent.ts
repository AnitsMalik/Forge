export interface GeneratedPostDraft {
  headline: string;
  body: string;
  hashtags: string[];
  visualPrompt: string;
}

export class ContentAgent {
  async generateDraft(topic: string, tone = 'professional'): Promise<GeneratedPostDraft> {
    return {
      headline: `Mastering ${topic}: Key Takeaways`,
      body: `Here are the top actionable insights for ${topic} to elevate your workflow today.`,
      hashtags: ['#GrowthTips', '#Strategy', `#${topic.replace(/\s+/g, '')}`],
      visualPrompt: `Modern clean graphic illustrating ${topic} with brand color accents.`,
    };
  }
}
