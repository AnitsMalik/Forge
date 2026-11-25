export class ExperimentAgent {
  async designExperiment(brandId: string) {
    return {
      experimentId: `exp_${Date.now()}`,
      hypothesis: 'Short punchy 15-second reels generate 30% higher shares than standard static quotes.',
      durationDays: 14,
    };
  }
}
