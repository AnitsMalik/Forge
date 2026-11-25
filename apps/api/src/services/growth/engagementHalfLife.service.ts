import type { EngagementHalfLifeResult } from '@socialforge/shared';

export interface PlatformHalfLifeConfig {
  halfLifeHours: number;
  initialVelocityWeight: number;
}

export const PLATFORM_HALF_LIVES: Record<string, number> = {
  facebook: 24,
  instagram: 48,
  twitter: 4,
  x: 4,
  x_twitter: 4,
  linkedin: 72,
  tiktok: 48,
  youtube: 96,
  youtube_shorts: 96,
  default: 24,
};

export class EngagementHalfLifeService {
  /**
   * Returns characteristic engagement half-life in hours for a social platform.
   */
  public getHalfLifeHours(platform: string): number {
    const key = (platform || '').toLowerCase().trim();
    return PLATFORM_HALF_LIVES[key] ?? PLATFORM_HALF_LIVES.default;
  }

  /**
   * Calculates exponential decay rate parameter (lambda).
   * lambda = ln(2) / t_half
   */
  public getDecayLambda(halfLifeHours: number): number {
    if (halfLifeHours <= 0) return 0.02888; // fallback to 24h
    return Math.LN2 / halfLifeHours;
  }

  /**
   * Calculates expected velocity (engagements per hour) at time t given initial velocity V0.
   * V(t) = V0 * e^(-lambda * t)
   */
  public calculateVelocityAtTime(
    initialVelocity: number,
    hoursElapsed: number,
    platform: string
  ): number {
    const halfLife = this.getHalfLifeHours(platform);
    const lambda = this.getDecayLambda(halfLife);
    const velocity = initialVelocity * Math.exp(-lambda * hoursElapsed);
    return Math.max(0, Math.round(velocity * 100) / 100);
  }

  /**
   * Calculates cumulative engagement fraction expected by time t.
   * F(t) = 1 - e^(-lambda * t)
   */
  public calculateCumulativeFraction(hoursElapsed: number, platform: string): number {
    const halfLife = this.getHalfLifeHours(platform);
    const lambda = this.getDecayLambda(halfLife);
    const fraction = 1 - Math.exp(-lambda * hoursElapsed);
    return Math.min(0.9999, Math.max(0.0001, fraction));
  }

  /**
   * Estimates asymptotic total lifetime engagements based on current engagement and elapsed time.
   */
  public estimateAsymptoticTotal(
    currentEngagements: number,
    hoursElapsed: number,
    platform: string
  ): number {
    if (hoursElapsed <= 0.25) return currentEngagements * 10;
    const fraction = this.calculateCumulativeFraction(hoursElapsed, platform);
    const projected = currentEngagements / fraction;
    return Math.round(projected);
  }

  /**
   * Evaluates post engagement metrics against platform half-life model to detect velocity anomalies.
   */
  public evaluateEngagementVelocity(
    platform: string,
    publishedAt: Date | string,
    currentEngagements: number,
    currentVelocityScore?: number
  ): EngagementHalfLifeResult {
    const pubDate = new Date(publishedAt);
    const now = new Date();
    const hoursElapsed = Math.max(0.1, (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60));

    const halfLife = this.getHalfLifeHours(platform);
    const lambda = this.getDecayLambda(halfLife);

    // Initial velocity estimated from total engagements and fraction
    const asymptotic = this.estimateAsymptoticTotal(currentEngagements, hoursElapsed, platform);
    const initialVelocity = (asymptotic * lambda);

    // Expected velocity at current hour
    const expectedVelocity = this.calculateVelocityAtTime(initialVelocity, hoursElapsed, platform);

    // Actual observed velocity: supplied score or average velocity over recent window
    const observedVelocity = currentVelocityScore !== undefined
      ? currentVelocityScore
      : currentEngagements / hoursElapsed;

    const anomalyRatio = expectedVelocity > 0
      ? Math.round((observedVelocity / expectedVelocity) * 100) / 100
      : (observedVelocity > 5 ? 3.0 : 1.0);

    // Anomaly threshold: 2.5x expected velocity indicates viral surge or algorithmic breakout
    const isVelocityAnomaly = anomalyRatio >= 2.5;

    return {
      platform,
      publishedAt: pubDate.toISOString(),
      currentEngagements,
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      expectedHalfLifeHours: halfLife,
      decayLambda: Math.round(lambda * 10000) / 10000,
      expectedRemainingVelocity: expectedVelocity,
      isVelocityAnomaly,
      anomalyRatio,
    };
  }
}

export const engagementHalfLifeService = new EngagementHalfLifeService();
