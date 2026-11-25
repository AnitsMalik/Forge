export class OptimizationAgent {
  async optimizeCopy(originalCopy: string): Promise<{ variantA: string; variantB: string }> {
    return {
      variantA: `Hook: Unlock 10x output.\n\n${originalCopy}`,
      variantB: `Question: Are you making this key mistake?\n\n${originalCopy}`,
    };
  }
}

export class ExperimentAgent {
  async designExperiment(brandId: string) {
    return {
      experimentId: `exp_${Date.now()}`,
      hypothesis: 'Short punchy 15-second reels generate 30% higher shares than standard static quotes.',
      durationDays: 14,
    };
  }
}
