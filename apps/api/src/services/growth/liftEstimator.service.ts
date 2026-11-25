import type { LiftEstimateResult } from '@socialforge/shared';

export class LiftEstimatorService {
  /**
   * Calculates empirical relative lift percentage between a variant metric and baseline.
   * Lift % = ((variant - baseline) / baseline) * 100
   */
  public calculateEmpiricalLift(variantMetric: number, baselineMetric: number): number {
    const denom = Math.max(Math.abs(baselineMetric), 0.00001);
    const lift = ((variantMetric - baselineMetric) / denom) * 100;
    return Math.round(lift * 100) / 100;
  }

  /**
   * Applies empirical Bayes shrinkage to prevent small-sample noise from dominating.
   * Shrinkage factor = sampleSize / (sampleSize + priorWeight)
   */
  public calculateBayesianShrinkage(
    empiricalLiftPct: number,
    sampleSize: number,
    priorWeight = 50
  ): number {
    if (sampleSize <= 0) return 0;
    const shrinkage = sampleSize / (sampleSize + priorWeight);
    const shrunken = empiricalLiftPct * shrinkage;
    return Math.round(shrunken * 100) / 100;
  }

  /**
   * Calculates two-proportion hypothesis test and confidence intervals.
   */
  public calculateConfidenceInterval(
    pVariant: number,
    nVariant: number,
    pBaseline: number,
    nBaseline: number,
    confidenceLevel = 0.95
  ): {
    difference: number;
    lowerBoundPct: number;
    upperBoundPct: number;
    zScore: number;
    pValue: number;
    confidenceScore: number;
  } {
    const p1Norm = pVariant > 1 ? pVariant / 100 : pVariant;
    const p0Norm = pBaseline > 1 ? pBaseline / 100 : pBaseline;
    const p1 = Math.max(0.0001, Math.min(0.9999, p1Norm));
    const p0 = Math.max(0.0001, Math.min(0.9999, p0Norm));
    const n1 = Math.max(1, nVariant);
    const n0 = Math.max(1, nBaseline);

    const diff = p1 - p0;
    const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p0 * (1 - p0)) / n0);

    // Z-critical: 1.96 for 95%, 2.576 for 99%, 1.645 for 90%
    const zCrit = confidenceLevel >= 0.99 ? 2.576 : confidenceLevel >= 0.95 ? 1.96 : 1.645;

    const marginOfError = zCrit * se;
    const lowerBound = diff - marginOfError;
    const upperBound = diff + marginOfError;

    const zScore = se > 0 ? diff / se : 0;
    // Two-tailed p-value approximation via standard normal error function
    const absZ = Math.abs(zScore);
    const pValue = Math.max(0.00001, Math.min(1.0, 2 * (1 - this.approximateNormCdf(absZ))));

    // Convert difference to relative percentage lift intervals
    const relativeLower = p0 > 0 ? (lowerBound / p0) * 100 : lowerBound * 100;
    const relativeUpper = p0 > 0 ? (upperBound / p0) * 100 : upperBound * 100;

    const confidenceScore = Math.min(0.999, Math.max(0.5, 1 - pValue));

    return {
      difference: Math.round(diff * 10000) / 10000,
      lowerBoundPct: Math.round(relativeLower * 100) / 100,
      upperBoundPct: Math.round(relativeUpper * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
    };
  }

  /**
   * Complete lift estimation pipeline combining empirical lift, Bayesian shrinkage, and statistical testing.
   */
  public estimateLift(
    variantMetric: number,
    baselineMetric: number,
    variantSampleSize: number,
    baselineSampleSize: number,
    confidenceLevel = 0.95
  ): LiftEstimateResult {
    const empiricalLiftPct = this.calculateEmpiricalLift(variantMetric, baselineMetric);
    const bayesianExpectedLiftPct = this.calculateBayesianShrinkage(
      empiricalLiftPct,
      variantSampleSize
    );

    const test = this.calculateConfidenceInterval(
      variantMetric,
      variantSampleSize,
      baselineMetric,
      baselineSampleSize,
      confidenceLevel
    );

    // Statistically significant if p-value < 0.05 and lower bound > 0 (for positive lift)
    const statisticallySignificant =
      test.pValue < 0.05 && (empiricalLiftPct > 0 ? test.lowerBoundPct > 0 : test.upperBoundPct < 0);

    return {
      empiricalLiftPct,
      bayesianExpectedLiftPct,
      credibleIntervalLowerPct: test.lowerBoundPct,
      credibleIntervalUpperPct: test.upperBoundPct,
      confidenceScore: test.confidenceScore,
      statisticallySignificant,
    };
  }

  /**
   * Numerical approximation of standard normal cumulative distribution function.
   */
  private approximateNormCdf(x: number): number {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014337 * Math.exp((-x * x) / 2);
    const prob =
      d *
      t *
      (0.31938153 +
        t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x > 0 ? 1.0 - prob : prob;
  }
}

export const liftEstimatorService = new LiftEstimatorService();
