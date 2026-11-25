import type {
  SubscriptionPlanId,
  SubscriptionStatus,
  BillingInterval,
} from '@socialforge/shared';

export interface CreateCustomerParams {
  tenantId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface BillingCustomer {
  customerId: string;
  email?: string;
  name?: string;
}

export interface CreateCheckoutParams {
  tenantId: string;
  userId: string;
  userEmail?: string;
  planId: SubscriptionPlanId;
  billingInterval?: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  planId: string;
  planName: string;
}

export interface CreatePortalParams {
  tenantId: string;
  returnUrl?: string;
}

export interface BillingSubscriptionDetails {
  id: string;
  tenantId?: string;
  customerId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  endedAt?: Date | null;
  pastDueSince?: Date | null;
  trialStartAt?: Date | null;
  trialEndAt?: Date | null;
  pendingDowngradePlanId?: string | null;
  pendingDowngradePlanName?: string | null;
  pendingDowngradeAt?: Date | null;
}

export interface ChangeSubscriptionOptions {
  immediate?: boolean;
  prorationBehavior?: 'always_invoice' | 'create_prorations' | 'none';
  billingInterval?: BillingInterval;
}

export interface WebhookVerificationResult {
  event: any;
  eventId: string;
  eventType: string;
}

export interface WebhookHandleResult {
  received: boolean;
  eventType: string;
  duplicate?: boolean;
}

/**
 * Standard Billing Provider Abstraction
 * Decouples commercial payment gateways (Stripe, paddle, mock) from application business logic
 */
export interface BillingProvider {
  readonly providerName: string;

  /**
   * 1. createCustomer() - Provisions or retrieves customer identifier in payment gateway
   */
  createCustomer(params: CreateCustomerParams): Promise<BillingCustomer>;

  /**
   * 2. createCheckout() - Initiates hosted checkout session for subscription activation
   */
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSessionResult>;

  /**
   * 3. getSubscription() - Fetches current subscription details
   */
  getSubscription(subscriptionIdOrTenantId: string): Promise<BillingSubscriptionDetails | null>;

  /**
   * 4. changeSubscription() - Upgrades, downgrades, or modifies plan tier
   */
  changeSubscription(
    subscriptionId: string,
    newPlanId: SubscriptionPlanId,
    options?: ChangeSubscriptionOptions
  ): Promise<BillingSubscriptionDetails>;

  /**
   * 5. cancelSubscription() - Schedules cancellation or terminates immediately
   */
  cancelSubscription(
    subscriptionId: string,
    immediately?: boolean
  ): Promise<BillingSubscriptionDetails>;

  /**
   * 6. resumeSubscription() - Reverses pending cancellation before period ends
   */
  resumeSubscription(subscriptionId: string): Promise<BillingSubscriptionDetails>;

  /**
   * 7. createPortalSession() - Generates customer portal management link
   */
  createPortalSession(params: CreatePortalParams): Promise<{ url: string }>;

  /**
   * 8. verifyWebhook() - Authenticates raw signature and parses webhook payload
   */
  verifyWebhook(rawBody: Buffer | string, signature?: string): Promise<WebhookVerificationResult>;

  /**
   * Dispatches and idempotently handles verified webhooks
   */
  handleWebhook(rawBody: Buffer | string, signature?: string): Promise<WebhookHandleResult>;

  /**
   * 9. syncSubscription() - Authoritative synchronization of subscription state from provider
   */
  syncSubscription(subscriptionIdOrTenantId: string): Promise<BillingSubscriptionDetails | null>;

  /**
   * 10. verifyAndActivateCheckoutSession() - Server-side verification and idempotent activation of completed checkout
   */
  verifyAndActivateCheckoutSession(
    sessionId: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    status: string;
    planId: string;
    alreadyProcessed?: boolean;
    message?: string;
  }>;
}
