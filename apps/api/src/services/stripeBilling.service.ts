import type Stripe from 'stripe';
import type {
  SubscriptionPlanId,
  BillingInterval,
} from '@socialforge/shared';
import {
  defaultBillingProvider,
  StripeBillingProvider,
  type CreateCheckoutParams,
  type CreatePortalParams,
  type CreateCustomerParams,
  type BillingSubscriptionDetails,
  type ChangeSubscriptionOptions,
  type WebhookVerificationResult,
  type WebhookHandleResult,
} from './billing/index.js';

/**
 * StripeBillingService (Facade delegating to BillingProvider abstraction)
 */
export class StripeBillingService {
  private static provider = defaultBillingProvider as StripeBillingProvider;

  public static getStripe(): Stripe | null {
    return this.provider.getStripe();
  }

  public static async createCustomer(params: CreateCustomerParams) {
    return this.provider.createCustomer(params);
  }

  public static async getOrCreateCustomer(tenantId: string, email?: string, name?: string): Promise<string> {
    const res = await this.provider.createCustomer({ tenantId, email, name });
    return res.customerId;
  }

  public static async createCheckoutSession(params: CreateCheckoutParams) {
    return this.provider.createCheckout(params);
  }

  public static async getSubscription(subscriptionIdOrTenantId: string): Promise<BillingSubscriptionDetails | null> {
    return this.provider.getSubscription(subscriptionIdOrTenantId);
  }

  public static async syncSubscription(subscriptionIdOrTenantId: string): Promise<BillingSubscriptionDetails | null> {
    return this.provider.syncSubscription(subscriptionIdOrTenantId);
  }

  public static async changeSubscription(
    subscriptionId: string,
    newPlanId: SubscriptionPlanId,
    options?: ChangeSubscriptionOptions
  ): Promise<BillingSubscriptionDetails> {
    return this.provider.changeSubscription(subscriptionId, newPlanId, options);
  }

  public static async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<BillingSubscriptionDetails> {
    return this.provider.cancelSubscription(subscriptionId, immediately);
  }

  public static async resumeSubscription(subscriptionId: string): Promise<BillingSubscriptionDetails> {
    return this.provider.resumeSubscription(subscriptionId);
  }

  public static async createCustomerPortalSession(params: CreatePortalParams): Promise<{ url: string }> {
    return this.provider.createPortalSession(params);
  }

  public static async verifyWebhook(rawBody: Buffer | string, signature?: string): Promise<WebhookVerificationResult> {
    return this.provider.verifyWebhook(rawBody, signature);
  }

  public static async handleWebhookEvent(
    rawBody: Buffer | string,
    signature?: string
  ): Promise<WebhookHandleResult> {
    return this.provider.handleWebhook(rawBody, signature);
  }

  public static async verifyAndActivateCheckoutSession(sessionId: string, tenantId: string) {
    return this.provider.verifyAndActivateCheckoutSession(sessionId, tenantId);
  }
}
