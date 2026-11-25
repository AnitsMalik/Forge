import type { BillingProvider } from './billingProvider.interface.js';
import { StripeBillingProvider } from './stripeBillingProvider.js';

export class BillingProviderRegistry {
  private static instance: BillingProviderRegistry;
  private providers: Map<string, BillingProvider> = new Map();

  private constructor() {
    const stripeProvider = new StripeBillingProvider();
    this.providers.set('stripe', stripeProvider);
  }

  public static getInstance(): BillingProviderRegistry {
    if (!BillingProviderRegistry.instance) {
      BillingProviderRegistry.instance = new BillingProviderRegistry();
    }
    return BillingProviderRegistry.instance;
  }

  public getProvider(name: string = 'stripe'): BillingProvider {
    const key = (name || '').toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      const fallback = this.providers.get('stripe');
      if (fallback) return fallback;
      throw new Error(`Billing provider "${name}" not registered.`);
    }
    return provider;
  }

  public registerProvider(name: string, provider: BillingProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  public getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const billingProviderRegistry = BillingProviderRegistry.getInstance();
export const defaultBillingProvider = billingProviderRegistry.getProvider('stripe');
