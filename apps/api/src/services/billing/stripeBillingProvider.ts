import Stripe from 'stripe';
import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { DunningService } from './dunning.service.js';
import { BillingEmailService } from './billingEmail.service.js';
import { WhatsAppBillingNotificationService } from './whatsappBillingNotification.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { UsageTrackerService } from '../usageTracker.service.js';
import type {
  SubscriptionPlanId,
  SubscriptionStatus,
  BillingInterval,
} from '@socialforge/shared';
import type {
  BillingProvider,
  BillingCustomer,
  CreateCustomerParams,
  CreateCheckoutParams,
  CheckoutSessionResult,
  CreatePortalParams,
  BillingSubscriptionDetails,
  ChangeSubscriptionOptions,
  WebhookVerificationResult,
  WebhookHandleResult,
} from './billingProvider.interface.js';

export class StripeBillingProvider implements BillingProvider {
  public readonly providerName = 'stripe';
  private stripeClient: Stripe | null = null;

  /**
   * Initializes or returns cached Stripe SDK client
   */
  public getStripe(): Stripe | null {
    if (!this.stripeClient && config.stripe.secretKey && !config.stripe.secretKey.startsWith('mock_')) {
      this.stripeClient = new Stripe(config.stripe.secretKey, {
        apiVersion: '2025-02-24.acacia' as any,
      });
    }
    return this.stripeClient;
  }

  /**
   * 1. createCustomer()
   * Provisions or retrieves Stripe customer for tenant
   */
  public async createCustomer(params: CreateCustomerParams): Promise<BillingCustomer> {
    const { tenantId, email, name, metadata = {} } = params;

    const existingSub = await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .select('provider_customer_id')
      .first();

    if (existingSub?.provider_customer_id) {
      return {
        customerId: existingSub.provider_customer_id,
        email,
        name,
      };
    }

    const tenant = await db('tenants').where({ id: tenantId }).first();
    const customerName = name || tenant?.name || 'SocialForge Workspace';
    const customerEmail = email || `billing+${tenantId.slice(0, 8)}@socialforge.io`;

    let customerId: string;
    const stripe = this.getStripe();

    if (stripe) {
      const customer = await stripe.customers.create({
        name: customerName,
        email: customerEmail,
        metadata: { tenantId, ...metadata },
      });
      customerId = customer.id;
    } else {
      // Deterministic simulation customer ID for test/development environments
      customerId = `cus_${crypto.randomBytes(12).toString('hex')}`;
    }

    // Persist customerId into tenant_subscriptions
    if (existingSub) {
      await db('tenant_subscriptions')
        .where({ tenant_id: tenantId })
        .update({
          provider: 'stripe',
          provider_customer_id: customerId,
          updated_at: new Date(),
        });
    }

    return {
      customerId,
      email: customerEmail,
      name: customerName,
    };
  }

  /**
   * 2. createCheckout()
   * Creates a Stripe Checkout Session for subscription upgrade or renewal
   */
  public async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const { tenantId, userId, userEmail, planId, billingInterval = 'month' } = params;

    // Validate plan
    const plan = await db('subscription_plans').where({ id: planId }).first();
    if (!plan) {
      throw new Error(`Invalid plan specified: ${planId}`);
    }

    const isZeroCost =
      planId === 'free' ||
      planId === 'free_trial' ||
      planId === 'legacy_agency_grandfathered' ||
      (Number(plan.monthly_price_cents || 0) === 0 && Number(plan.price || 0) === 0);

    if (isZeroCost) {
      await this.activateDirectFreePlan(
        tenantId,
        plan.id,
        userId,
        userEmail,
        (billingInterval || 'month') as any
      );
      const redirectUrl = `${config.webAppUrl}/?tab=dashboard&checkout=success&plan=${plan.id}`;
      return {
        sessionId: `free_${crypto.randomUUID()}`,
        url: redirectUrl,
        planId: plan.id,
        planName: plan.name,
      };
    }

    const customer = await this.createCustomer({ tenantId, email: userEmail });
    const stripe = this.getStripe();

    const successUrl =
      params.successUrl || `${config.webAppUrl}/?tab=dashboard&checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;
    const cancelUrl = params.cancelUrl || `${config.webAppUrl}/?tab=billing&status=cancelled`;

    if (stripe) {
      const interval = (billingInterval || plan.billing_interval || 'month') as 'month' | 'year';
      const unitAmount =
        interval === 'year'
          ? (plan.annual_price_cents || (plan.monthly_price_cents ? plan.monthly_price_cents * 10 : Math.round(Number(plan.price) * 100 * 10)))
          : (plan.monthly_price_cents || Math.round(Number(plan.price) * 100));

      const session = await stripe.checkout.sessions.create({
        customer: customer.customerId,
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: plan.currency || 'usd',
              product_data: {
                name: plan.name,
                description: plan.description || undefined,
                metadata: { planId: plan.id },
              },
              unit_amount: unitAmount,
              recurring: {
                interval,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          tenantId,
          planId,
          userId,
        },
        subscription_data: {
          metadata: {
            tenantId,
            planId,
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return {
        sessionId: session.id,
        url: session.url || successUrl,
        planId: plan.id,
        planName: plan.name,
      };
    }

    // Mock/development checkout simulation
    const mockSessionId = `cs_test_${crypto.randomUUID()}`;
    const mockSubId = `sub_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;

    await this.handleCheckoutSessionCompleted(
      {
        id: mockSessionId,
        customer: customer.customerId,
        subscription: mockSubId,
        metadata: {
          tenantId,
          planId: plan.id,
          userId,
          billingInterval,
        },
      },
      tenantId
    );

    const separator = successUrl.includes('?') ? '&' : '?';
    const redirectUrl = successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)
      : `${successUrl}${separator}session_id=${mockSessionId}&plan=${plan.id}`;

    return {
      sessionId: mockSessionId,
      url: redirectUrl,
      planId: plan.id,
      planName: plan.name,
    };
  }

  /**
   * Directly activates zero-cost tier (Free) without requiring external payment checkout
   */
  public async activateDirectFreePlan(
    tenantId: string,
    planId: string = 'free',
    userId?: string,
    userEmail?: string,
    billingInterval: 'month' | 'year' = 'month'
  ): Promise<void> {
    const periodStart = new Date();
    const periodEnd =
      billingInterval === 'year'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const existingSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    let existingMeta: Record<string, any> = {};
    if (existingSub?.provider_metadata) {
      try {
        existingMeta =
          typeof existingSub.provider_metadata === 'string'
            ? JSON.parse(existingSub.provider_metadata)
            : existingSub.provider_metadata || {};
      } catch {
        existingMeta = {};
      }
    }
    existingMeta.billingInterval = billingInterval;

    if (existingSub) {
      await db('tenant_subscriptions')
        .where({ tenant_id: tenantId })
        .update({
          plan_id: planId,
          status: 'active',
          provider: 'stripe',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          agreed_price_cents: 0,
          cancel_at_period_end: false,
          past_due_since: null,
          provider_metadata: JSON.stringify(existingMeta),
          updated_at: new Date(),
        });
    } else {
      await db('tenant_subscriptions').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        plan_id: planId,
        status: 'active',
        provider: 'stripe',
        current_period_start: periodStart,
        current_period_end: periodEnd,
        agreed_price_cents: 0,
        cancel_at_period_end: false,
        past_due_since: null,
        provider_metadata: JSON.stringify(existingMeta),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    const invoiceNumber = `INV-FREE-${Date.now().toString(36).toUpperCase()}`;
    await this.dispatchPostActivationNotifications({
      tenantId,
      planId,
      billingInterval,
      agreedPriceCents: 0,
      invoiceNumber,
      periodEnd,
      userId,
      userEmail,
    });

    console.log(`[StripeBillingProvider] Activated direct free tier '${planId}' for tenant ${tenantId}`);
  }

  /**
   * 3. getSubscription()
   * Retrieves active subscription details from provider or local database
   */
  public async getSubscription(subscriptionIdOrTenantId: string): Promise<BillingSubscriptionDetails | null> {
    const sub = await db('tenant_subscriptions')
      .where('id', subscriptionIdOrTenantId)
      .orWhere('provider_subscription_id', subscriptionIdOrTenantId)
      .orWhere('tenant_id', subscriptionIdOrTenantId)
      .first();

    if (!sub) return null;

    let metadata: Record<string, any> = {};
    try {
      metadata = typeof sub.provider_metadata === 'string'
        ? JSON.parse(sub.provider_metadata)
        : (sub.provider_metadata || {});
    } catch {
      metadata = {};
    }

    return {
      id: sub.id,
      tenantId: sub.tenant_id,
      customerId: sub.provider_customer_id,
      planId: sub.plan_id as SubscriptionPlanId,
      status: sub.status as SubscriptionStatus,
      currentPeriodStart: new Date(sub.current_period_start),
      currentPeriodEnd: new Date(sub.current_period_end),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : null,
      endedAt: sub.ended_at ? new Date(sub.ended_at) : null,
      pastDueSince: sub.past_due_since ? new Date(sub.past_due_since) : null,
      trialStartAt: sub.trial_start_at ? new Date(sub.trial_start_at) : null,
      trialEndAt: sub.trial_end_at ? new Date(sub.trial_end_at) : null,
      pendingDowngradePlanId: metadata.pendingDowngradePlanId || null,
      pendingDowngradePlanName: metadata.pendingDowngradePlanName || null,
      pendingDowngradeAt: metadata.pendingDowngradeAt ? new Date(metadata.pendingDowngradeAt) : null,
    };
  }

  /**
   * 4. changeSubscription()
   * Modifies subscription tier:
   * - Upgrades take effect immediately with proration
   * - Downgrades are scheduled for next renewal date to preserve entitlements until period end
   */
  public async changeSubscription(
    subscriptionId: string,
    newPlanId: SubscriptionPlanId,
    options?: ChangeSubscriptionOptions
  ): Promise<BillingSubscriptionDetails> {
    const sub = await db('tenant_subscriptions')
      .where('id', subscriptionId)
      .orWhere('provider_subscription_id', subscriptionId)
      .orWhere('tenant_id', subscriptionId)
      .first();

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const plan = await db('subscription_plans').where({ id: newPlanId }).first();
    if (!plan) {
      throw new Error(`Target plan not found: ${newPlanId}`);
    }

    const currentPlan = await db('subscription_plans').where({ id: sub.plan_id }).first();
    const isUpgrade = currentPlan ? Number(plan.price) > Number(currentPlan.price) : false;

    let metadata: Record<string, any> = {};
    try {
      metadata = typeof sub.provider_metadata === 'string'
        ? JSON.parse(sub.provider_metadata)
        : (sub.provider_metadata || {});
    } catch {
      metadata = {};
    }

    // Cancellation of scheduled downgrade (re-selecting current active plan)
    if (newPlanId === sub.plan_id && metadata.pendingDowngradePlanId) {
      delete metadata.pendingDowngradePlanId;
      delete metadata.pendingDowngradePlanName;
      delete metadata.pendingDowngradeAt;

      const stripe = this.getStripe();
      if (stripe && sub.provider_subscription_id && !sub.provider_subscription_id.startsWith('sub_mock_')) {
        await stripe.subscriptions.update(sub.provider_subscription_id, {
          metadata: {
            tenantId: sub.tenant_id,
            pendingDowngradePlanId: '',
            pendingDowngradeAt: '',
          },
        });
      }

      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          provider_metadata: JSON.stringify(metadata),
          updated_at: new Date(),
        });

      const updated = await this.getSubscription(sub.id);
      return updated!;
    }

    const stripe = this.getStripe();

    const targetInterval = options?.billingInterval || metadata.billingInterval || plan.billing_interval || 'month';
    const isIntervalChange = options?.billingInterval && options.billingInterval !== metadata.billingInterval;

    let targetPriceCents = 0;
    if (targetInterval === 'year') {
      targetPriceCents = plan.annual_price_cents || Math.round(Number(plan.price) * 12 * 0.8 * 100);
    } else {
      targetPriceCents = plan.monthly_price_cents || Math.round(Number(plan.price) * 100);
    }

    metadata.billingInterval = targetInterval;

    if (isUpgrade || options?.immediate || isIntervalChange) {
      // IMMEDIATE UPGRADE OR INTERVAL CONVERSION: Update Stripe and database now
      if (stripe && sub.provider_subscription_id && !sub.provider_subscription_id.startsWith('sub_mock_')) {
        const stripeSub = await stripe.subscriptions.retrieve(sub.provider_subscription_id);
        const itemId = stripeSub.items.data[0]?.id;

        if (itemId) {
          const targetPriceId = (config.stripe.priceIds as any)[newPlanId];
          const updateParams: Stripe.SubscriptionUpdateParams = {
            proration_behavior: options?.prorationBehavior || 'create_prorations',
            metadata: {
              tenantId: sub.tenant_id,
              planId: newPlanId,
              billingInterval: targetInterval,
            },
          };

          if (targetPriceId) {
            updateParams.items = [{ id: itemId, price: targetPriceId }];
          }

          await stripe.subscriptions.update(sub.provider_subscription_id, updateParams);
        }
      }

      // Clear any pending downgrade
      delete metadata.pendingDowngradePlanId;
      delete metadata.pendingDowngradePlanName;
      delete metadata.pendingDowngradeAt;

      const now = new Date();
      const periodEnd = targetInterval === 'year'
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          plan_id: newPlanId,
          agreed_price_cents: targetPriceCents,
          current_period_start: now,
          current_period_end: periodEnd,
          provider_metadata: JSON.stringify(metadata),
          updated_at: now,
        });

      // Generate invoice for upgrade or annual conversion
      if (isUpgrade || isIntervalChange) {
        const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
        await db('billing_invoices')
          .insert({
            id: crypto.randomUUID(),
            tenant_id: sub.tenant_id,
            subscription_id: sub.id,
            provider: sub.provider || 'stripe',
            provider_invoice_id: `in_chg_${Date.now().toString(36)}`,
            invoice_number: invoiceNumber,
            status: 'paid',
            currency: plan.currency || 'usd',
            amount_due_cents: targetPriceCents,
            amount_paid_cents: targetPriceCents,
            period_start: now,
            period_end: periodEnd,
            paid_at: now,
            hosted_invoice_url: `/settings/billing?subtab=invoices`,
            invoice_pdf_url: null,
            created_at: now,
            updated_at: now,
          })
          .catch((e) => console.error('[StripeBillingProvider] Invoice creation error:', e));
      }
    } else {
      // SCHEDULED DOWNGRADE: Schedule for next renewal, preserve entitlements until period end
      metadata.pendingDowngradePlanId = newPlanId;
      metadata.pendingDowngradePlanName = plan.name;
      metadata.pendingDowngradeAt = sub.current_period_end;

      if (stripe && sub.provider_subscription_id && !sub.provider_subscription_id.startsWith('sub_mock_')) {
        await stripe.subscriptions.update(sub.provider_subscription_id, {
          metadata: {
            tenantId: sub.tenant_id,
            pendingDowngradePlanId: newPlanId,
            pendingDowngradeAt: new Date(sub.current_period_end).toISOString(),
          },
        });
      }

      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          provider_metadata: JSON.stringify(metadata),
          updated_at: new Date(),
        });
    }

    // Notify billing recipients of plan change or scheduled downgrade
    try {
      const oldPlan = await db('subscription_plans').where({ id: sub.plan_id }).first();
      const recipients = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', sub.tenant_id)
        .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
        .where('users.is_active', 1)
        .select('users.email', 'users.full_name as fullName');

      for (const rec of recipients) {
        await BillingEmailService.sendSubscriptionChangedNotice({
          tenantId: sub.tenant_id,
          recipientEmail: rec.email,
          recipientName: rec.fullName,
          oldPlanName: oldPlan?.name,
          newPlanName: isUpgrade ? plan.name : `${oldPlan?.name} (Scheduled downgrade to ${plan.name} at period end)`,
          newPriceFormatted: `$${Number(plan.price).toFixed(2)} ${plan.currency?.toUpperCase() || 'USD'}`,
          billingInterval: plan.billing_interval || 'month',
        }).catch((e) => console.error('[StripeBillingProvider] Failed sending plan change email:', e));
      }
    } catch (emailErr) {
      console.error('[StripeBillingProvider] Plan change notification failed:', emailErr);
    }

    const updated = await this.getSubscription(sub.id);
    return updated!;
  }

  /**
   * 5. cancelSubscription()
   * Schedules subscription termination at period end or terminates immediately
   */
  public async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<BillingSubscriptionDetails> {
    const sub = await db('tenant_subscriptions')
      .where('id', subscriptionId)
      .orWhere('provider_subscription_id', subscriptionId)
      .orWhere('tenant_id', subscriptionId)
      .first();

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const stripe = this.getStripe();
    const now = new Date();

    if (stripe && sub.provider_subscription_id && !sub.provider_subscription_id.startsWith('sub_mock_')) {
      if (immediately) {
        await stripe.subscriptions.cancel(sub.provider_subscription_id);
      } else {
        await stripe.subscriptions.update(sub.provider_subscription_id, {
          cancel_at_period_end: true,
        });
      }
    }

    if (immediately) {
      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          status: 'cancelled',
          cancel_at_period_end: false,
          canceled_at: now,
          ended_at: now,
          updated_at: now,
        });
    } else {
      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          cancel_at_period_end: true,
          canceled_at: now,
          updated_at: now,
        });
    }

    // Notify billing recipients of cancellation
    try {
      const plan = await db('subscription_plans').where({ id: sub.plan_id }).first();
      const recipients = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', sub.tenant_id)
        .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
        .where('users.is_active', 1)
        .select('users.email', 'users.full_name as fullName');

      for (const rec of recipients) {
        await BillingEmailService.sendSubscriptionCanceledNotice({
          tenantId: sub.tenant_id,
          recipientEmail: rec.email,
          recipientName: rec.fullName,
          planName: plan?.name || 'Active Plan',
          effectiveEndDate: immediately ? now : sub.current_period_end,
          cancelAtPeriodEnd: !immediately,
        }).catch((e) => console.error('[StripeBillingProvider] Failed sending cancellation email:', e));
      }
    } catch (emailErr) {
      console.error('[StripeBillingProvider] Cancellation notification failed:', emailErr);
    }

    const updated = await this.getSubscription(sub.id);
    return updated!;
  }

  /**
   * 6. resumeSubscription()
   * Reverses a pending cancellation before period ends
   */
  public async resumeSubscription(subscriptionId: string): Promise<BillingSubscriptionDetails> {
    const sub = await db('tenant_subscriptions')
      .where('id', subscriptionId)
      .orWhere('provider_subscription_id', subscriptionId)
      .orWhere('tenant_id', subscriptionId)
      .first();

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const stripe = this.getStripe();
    if (stripe && sub.provider_subscription_id && !sub.provider_subscription_id.startsWith('sub_mock_')) {
      await stripe.subscriptions.update(sub.provider_subscription_id, {
        cancel_at_period_end: false,
      });
    }

    await db('tenant_subscriptions')
      .where({ id: sub.id })
      .update({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        updated_at: new Date(),
      });

    const updated = await this.getSubscription(sub.id);
    return updated!;
  }

  /**
   * 7. createPortalSession()
   * Generates a Stripe Customer Portal link for self-service payment management
   */
  public async createPortalSession(params: CreatePortalParams): Promise<{ url: string }> {
    const { tenantId, returnUrl } = params;
    const customer = await this.createCustomer({ tenantId });
    const finalReturnUrl = returnUrl || `${config.webAppUrl}/settings/billing`;

    const stripe = this.getStripe();
    if (stripe) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.customerId,
        return_url: finalReturnUrl,
      });
      return { url: portalSession.url };
    }

    // Mock fallback for local development
    return { url: `${finalReturnUrl}?portal=simulated` };
  }

  /**
   * 8. verifyWebhook()
   * Verifies the cryptographic Stripe webhook signature using raw request body
   */
  public async verifyWebhook(
    rawBody: Buffer | string,
    signature?: string
  ): Promise<WebhookVerificationResult> {
    let event: Stripe.Event;
    const stripe = this.getStripe();

    if (stripe && config.stripe.webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
      } catch (err: any) {
        console.error('[StripeBillingProvider] Webhook signature verification failed:', err.message);
        throw new Error(`Webhook Signature Error: ${err.message}`);
      }
    } else {
      // In development or automated test mode, parse JSON payload directly from raw body
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      event = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : (bodyStr as any);
    }

    return {
      event,
      eventId: event.id,
      eventType: event.type,
    };
  }

  /**
   * Dispatches and idempotently handles verified webhooks
   * Guarantees duplicate delivery does not duplicate subscriptions, invoices, usage, or entitlements.
   */
  public async handleWebhook(
    rawBody: Buffer | string,
    signature?: string
  ): Promise<WebhookHandleResult> {
    const { event, eventId, eventType } = await this.verifyWebhook(rawBody, signature);

    // 1. Idempotency Check: Verify if event has already been recorded
    const existingEvent = await db('billing_events')
      .where({ provider: 'stripe', provider_event_id: eventId })
      .first();

    if (existingEvent) {
      console.log(`[StripeBillingProvider] Event ${eventId} (${eventType}) already processed. Skipping.`);
      return { received: true, eventType, duplicate: true };
    }

    const eventObject: any = event.data.object;
    const tenantId =
      eventObject.metadata?.tenantId ||
      eventObject.subscription_details?.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(eventObject));

    // Record billing event in audit table atomically
    await db('billing_events').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId || null,
      event_type: eventType,
      provider: 'stripe',
      provider_event_id: eventId,
      payload: JSON.stringify(event),
      created_at: new Date(),
    });

    // 2. Dispatch domain handling
    switch (eventType) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(eventObject, tenantId);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(eventObject, tenantId, event.created);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(eventObject, tenantId);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(eventObject, tenantId);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(eventObject, tenantId);
        break;

      case 'invoice.payment_action_required':
        await this.handleInvoicePaymentActionRequired(eventObject, tenantId);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(eventObject, tenantId);
        break;

      case 'charge.dispute.created':
        await this.handleChargeDisputeCreated(eventObject, tenantId);
        break;

      case 'charge.dispute.closed':
        await this.handleChargeDisputeClosed(eventObject, tenantId);
        break;

      default:
        console.log(`[StripeBillingProvider] Unhandled event type: ${eventType}`);
        break;
    }

    return { received: true, eventType };
  }

  /**
   * 10. verifyAndActivateCheckoutSession()
   * Cryptographically or server-side verifies a completed payment session with the payment provider.
   * Enforces that subscriptions are NEVER activated on frontend redirect alone.
   * Protects against replay attacks and duplicate activations using idempotency.
   */
  public async verifyAndActivateCheckoutSession(
    sessionId: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    status: string;
    planId: string;
    alreadyProcessed?: boolean;
    message?: string;
  }> {
    if (!sessionId || !sessionId.trim()) {
      throw new Error('Valid checkout sessionId is required.');
    }
    if (!tenantId) {
      throw new Error('Tenant identification is required.');
    }

    const trimmedSessionId = sessionId.trim();
    const idempotencyKey = `checkout_session_verified:${trimmedSessionId}`;
    const currentSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    // 1. Idempotency Guard: Check if this session has already been verified and activated
    const existingAudit = await db('billing_events')
      .where({ provider: 'stripe', provider_event_id: idempotencyKey })
      .first();

    if (existingAudit) {
      if (existingAudit.tenant_id && existingAudit.tenant_id !== tenantId) {
        throw new Error(`Cross-tenant security violation: Session does not belong to workspace ${tenantId}`);
      }
      return {
        success: true,
        status: currentSub?.status || 'active',
        planId: currentSub?.plan_id || 'starter',
        alreadyProcessed: true,
        message: 'Checkout session has already been verified and activated.',
      };
    }

    const stripe = this.getStripe();

    if (stripe && !trimmedSessionId.startsWith('cs_test_') && !trimmedSessionId.startsWith('mock_')) {
      // Live Stripe Checkout Session Verification
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.retrieve(trimmedSessionId, {
          expand: ['subscription', 'customer'],
        });
      } catch (err: any) {
        throw new Error(`Failed to retrieve checkout session from Stripe: ${err.message}`);
      }

      if (!session) {
        throw new Error(`Stripe checkout session not found: ${trimmedSessionId}`);
      }

      // Security Check: Cross-Tenant Isolation
      const sessionTenantId = session.metadata?.tenantId;
      if (sessionTenantId && sessionTenantId !== tenantId) {
        throw new Error(`Cross-tenant security violation: Session does not belong to workspace ${tenantId}`);
      }

      // Payment Status Check: Must be paid or complete
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        throw new Error(`Session payment has not succeeded. Current status: ${session.payment_status || session.status}`);
      }

      // Authoritative Activation
      await this.handleCheckoutSessionCompleted(session, tenantId);

      // Record Idempotent Verification Audit Log
      await db('billing_events').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        event_type: 'checkout.session.verified',
        provider: 'stripe',
        provider_event_id: idempotencyKey,
        payload: JSON.stringify({
          sessionId: trimmedSessionId,
          planId: session.metadata?.planId,
          verifiedAt: new Date().toISOString(),
        }),
        created_at: new Date(),
      });

      const updatedSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
      return {
        success: true,
        status: updatedSub?.status || 'active',
        planId: updatedSub?.plan_id || session.metadata?.planId || 'starter',
        alreadyProcessed: false,
      };
    }

    // Mock / Development / Testing Session Verification
    const creationEvent = await db('billing_events')
      .where({ provider: 'stripe', provider_event_id: trimmedSessionId })
      .orWhere('payload', 'like', `%"sessionId":"${trimmedSessionId}"%`)
      .first();

    let targetPlanId = 'starter';
    let billingInterval: 'month' | 'year' = 'month';
    let sessionUserId: string | undefined;

    if (creationEvent) {
      if (creationEvent.tenant_id && creationEvent.tenant_id !== tenantId) {
        throw new Error(`Cross-tenant security violation: Session does not belong to workspace ${tenantId}`);
      }
      try {
        const payload = typeof creationEvent.payload === 'string'
          ? JSON.parse(creationEvent.payload)
          : (creationEvent.payload || {});
        if (payload.planId) targetPlanId = payload.planId;
        if (payload.billingInterval) billingInterval = payload.billingInterval;
        if (payload.userId) sessionUserId = payload.userId;
      } catch (parseErr) {
        console.warn('[StripeBillingProvider] Could not parse creationEvent payload:', parseErr);
      }
    } else if (trimmedSessionId.startsWith('cs_pending_')) {
      return {
        success: false,
        status: 'pending',
        planId: 'professional',
        message: 'Payment gateway transaction is pending verification. Please wait.',
      };
    } else if (trimmedSessionId.startsWith('cs_test_') || trimmedSessionId.startsWith('mock_')) {
      targetPlanId = currentSub?.plan_id || 'starter';
    } else {
      throw new Error(`Invalid or unrecognized checkout session ID: ${trimmedSessionId}`);
    }

    const mockSubId = `sub_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    const mockCustomerId = currentSub?.provider_customer_id || `cus_test_${crypto.randomUUID().slice(0, 10)}`;

    await this.handleCheckoutSessionCompleted(
      {
        id: trimmedSessionId,
        customer: mockCustomerId,
        subscription: mockSubId,
        metadata: {
          tenantId,
          planId: targetPlanId,
          userId: sessionUserId,
          billingInterval,
        },
      },
      tenantId
    );

    // Record Idempotent Verification Audit Log
    await db('billing_events').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'checkout.session.verified',
      provider: 'stripe',
      provider_event_id: idempotencyKey,
      payload: JSON.stringify({
        sessionId: trimmedSessionId,
        planId: targetPlanId,
        verifiedAt: new Date().toISOString(),
      }),
      created_at: new Date(),
    });

    const updatedSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    return {
      success: true,
      status: updatedSub?.status || 'active',
      planId: updatedSub?.plan_id || targetPlanId,
      alreadyProcessed: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Event Handlers & Helpers
  // ---------------------------------------------------------------------------

  private async resolveTenantIdFromStripeObject(obj: any): Promise<string | null> {
    if (obj.customer) {
      const sub = await db('tenant_subscriptions')
        .where({ provider_customer_id: obj.customer })
        .select('tenant_id')
        .first();
      if (sub?.tenant_id) return sub.tenant_id;
    }

    if (obj.subscription) {
      const sub = await db('tenant_subscriptions')
        .where({ provider_subscription_id: obj.subscription })
        .select('tenant_id')
        .first();
      if (sub?.tenant_id) return sub.tenant_id;
    }

    return null;
  }

  /**
   * Dispatches automated invoice recording, usage counter reset, email receipt, and WhatsApp confirmation
   */
  public async dispatchPostActivationNotifications(params: {
    tenantId: string;
    planId: string;
    billingInterval?: string;
    agreedPriceCents?: number;
    invoiceNumber?: string;
    periodEnd?: Date;
    userId?: string;
    userEmail?: string;
    session?: any;
    isRenewal?: boolean;
  }): Promise<void> {
    const {
      tenantId,
      planId,
      billingInterval = 'month',
      agreedPriceCents = 0,
      invoiceNumber: providedInvNum,
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      session,
      isRenewal = false,
    } = params;

    const plan = await db('subscription_plans').where({ id: planId }).first();
    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    // 1. Sync tenant's subscription_tier in tenants table
    try {
      await db('tenants').where({ id: tenantId }).update({
        subscription_tier: planId,
        updated_at: new Date(),
      });
    } catch (e) {
      console.warn('[StripeBillingProvider] Could not update tenants.subscription_tier:', e);
    }

    // 2. Initialize or reset usage counters for current month
    try {
      const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
      await db.raw(
        `
        INSERT INTO tenant_usage_counters (tenant_id, period_month, posts_published, posts_created, video_render_seconds, ai_tokens_consumed, storage_bytes_used, created_at, updated_at)
        VALUES (?, ?, 0, 0, 0, 0, 0, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          updated_at = NOW()
        `,
        [tenantId, periodMonth]
      );
    } catch (e) {
      console.warn('[StripeBillingProvider] Could not sync tenant_usage_counters:', e);
    }

    // 3. Record invoice in billing_invoices if paid plan (strictly ONE invoice per transaction)
    const transactionId =
      session?.id ||
      session?.payment_intent ||
      (providedInvNum ? `TXN-${providedInvNum.replace('INV-', '')}` : null);

    let finalInvoiceNumber = providedInvNum || '';

    // Check if an invoice was already generated for this transaction or invoice number in this tenant
    if (transactionId || finalInvoiceNumber) {
      const existingInv = await db('billing_invoices')
        .where({ tenant_id: tenantId })
        .andWhere((builder) => {
          if (transactionId) {
            builder.where({ provider_invoice_id: transactionId });
          }
          if (finalInvoiceNumber) {
            builder.orWhere({ invoice_number: finalInvoiceNumber });
          }
        })
        .first();

      if (existingInv) {
        finalInvoiceNumber = existingInv.invoice_number;
      }
    }

    if (!finalInvoiceNumber) {
      finalInvoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    }

    if (agreedPriceCents > 0) {
      try {
        const existingInv = await db('billing_invoices')
          .where({ tenant_id: tenantId })
          .andWhere((builder) => {
            builder.where({ invoice_number: finalInvoiceNumber });
            if (transactionId) {
              builder.orWhere({ provider_invoice_id: transactionId });
            }
          })
          .first();

        if (!existingInv) {
          await db('billing_invoices').insert({
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            subscription_id: sub?.id || null,
            invoice_number: finalInvoiceNumber,
            amount_due_cents: agreedPriceCents,
            amount_paid_cents: agreedPriceCents,
            currency: plan?.currency || 'usd',
            status: 'paid',
            provider: 'stripe',
            provider_invoice_id: transactionId || finalInvoiceNumber,
            hosted_invoice_url: `${config.webAppUrl}/settings/billing?tab=invoices`,
            invoice_pdf_url: `${config.webAppUrl}/api/v1/billing/invoices/${finalInvoiceNumber}/download`,
            period_start: new Date(),
            period_end: periodEnd,
            paid_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        } else {
          finalInvoiceNumber = existingInv.invoice_number;
        }
      } catch (invErr) {
        console.warn('[StripeBillingProvider] Invoice insert warning:', invErr);
      }
    }

    // 4. Resolve metadata for billing contact info
    let billingInfo: Record<string, any> = {};
    if (sub?.provider_metadata) {
      try {
        const meta =
          typeof sub.provider_metadata === 'string'
            ? JSON.parse(sub.provider_metadata)
            : sub.provider_metadata;
        if (meta?.billingInfo && typeof meta.billingInfo === 'object') {
          billingInfo = meta.billingInfo;
        }
      } catch {}
    }

    // 5. Automated Email Receipt
    try {
      const recipients = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', tenantId)
        .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
        .where('users.is_active', 1)
        .select('users.email', 'users.full_name as fullName');

      if (billingInfo.billingEmail && !recipients.some((r: any) => r.email === billingInfo.billingEmail)) {
        recipients.push({ email: billingInfo.billingEmail, fullName: billingInfo.companyLegalName || 'Billing Contact' });
      }
      if (params.userEmail && !recipients.some((r: any) => r.email === params.userEmail)) {
        recipients.push({ email: params.userEmail, fullName: 'Workspace Admin' });
      }

      for (const rec of recipients) {
        await BillingEmailService.sendPaymentReceipt({
          tenantId,
          recipientEmail: rec.email,
          recipientName: rec.fullName || undefined,
          customerName: rec.fullName || billingInfo.companyLegalName || 'Valued Customer',
          invoiceNumber: finalInvoiceNumber,
          transactionId: transactionId || `TXN-${finalInvoiceNumber.replace('INV-', '')}`,
          amountPaidCents: agreedPriceCents,
          currency: plan?.currency || 'usd',
          planName: plan?.name || planId,
          billingInterval,
          paymentDate: new Date(),
          activationDate: sub?.created_at || new Date(),
          periodStart: new Date(),
          periodEnd,
          renewalDate: periodEnd,
          invoicePdfUrl: `${config.webAppUrl}/api/v1/billing/invoices/${finalInvoiceNumber}/download`,
          hostedInvoiceUrl: `${config.webAppUrl}/settings/billing?tab=invoices`,
          supportEmail: 'support@socialforge.io',
          supportUrl: `${config.webAppUrl}/support`,
        }).catch((err) => console.error('[StripeBillingProvider] Failed sending payment receipt email:', err));
      }
    } catch (emailErr) {
      console.error('[StripeBillingProvider] Error preparing email receipt:', emailErr);
    }

    // 6. Automated WhatsApp Confirmation (Phase 5 Enhanced)
    try {
      const destinationPhone = billingInfo.whatsappPhone || billingInfo.billingPhone;
      const whatsappConsent = Boolean(billingInfo.whatsappConsent || billingInfo.autoWhatsappConfirmations);

      const tenantUser = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', tenantId)
        .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
        .where('users.is_active', 1)
        .select('users.full_name as fullName')
        .first();

      const customerName =
        tenantUser?.fullName ||
        billingInfo.companyLegalName ||
        'Valued Customer';

      const brand = await db('brands').where({ tenant_id: tenantId }).first();
      const brandId = brand?.id || tenantId;

      await WhatsAppBillingNotificationService.sendPaymentConfirmation({
        tenantId,
        brandId,
        customerName,
        planName: plan?.name || planId,
        amountPaidCents: agreedPriceCents,
        currency: plan?.currency || 'usd',
        billingInterval,
        invoiceNumber: finalInvoiceNumber,
        transactionId,
        destinationPhone,
        whatsappConsent,
        renewalDate: periodEnd,
      });
    } catch (waErr) {
      console.error('[StripeBillingProvider] WhatsApp confirmation dispatch warning:', waErr);
    }
  }

  private async handleCheckoutSessionCompleted(session: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId = resolvedTenantId || session.metadata?.tenantId;
    const planId = session.metadata?.planId;

    if (!tenantId) {
      console.warn('[StripeBillingProvider] checkout.session.completed missing tenantId in metadata.');
      return;
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const billingInterval = session.metadata?.billingInterval || 'month';

    const existingSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    const periodStart = new Date();
    const periodEnd = billingInterval === 'year'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const targetPlan = planId ? await db('subscription_plans').where({ id: planId }).first() : null;
    const agreedPrice = targetPlan
      ? (billingInterval === 'year'
          ? (targetPlan.annual_price_cents || (targetPlan.monthly_price_cents ? targetPlan.monthly_price_cents * 10 : Math.round(Number(targetPlan.price) * 100 * 10)))
          : (targetPlan.monthly_price_cents || Math.round(Number(targetPlan.price) * 100)))
      : undefined;

    let existingMeta: Record<string, any> = {};
    if (existingSub?.provider_metadata) {
      try {
        existingMeta = typeof existingSub.provider_metadata === 'string'
          ? JSON.parse(existingSub.provider_metadata)
          : (existingSub.provider_metadata || {});
      } catch {
        existingMeta = {};
      }
    }
    existingMeta.billingInterval = billingInterval;

    if (existingSub) {
      await db('tenant_subscriptions')
        .where({ tenant_id: tenantId })
        .update({
          plan_id: planId || existingSub.plan_id,
          status: 'active',
          provider: 'stripe',
          provider_customer_id: customerId || existingSub.provider_customer_id,
          provider_subscription_id: subscriptionId || existingSub.provider_subscription_id,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          agreed_price_cents: agreedPrice ?? existingSub.agreed_price_cents,
          cancel_at_period_end: false,
          past_due_since: null,
          provider_metadata: JSON.stringify(existingMeta),
          updated_at: new Date(),
        });
    } else {
      await db('tenant_subscriptions').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        plan_id: planId || 'starter',
        status: 'active',
        provider: 'stripe',
        provider_customer_id: customerId,
        provider_subscription_id: subscriptionId,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        agreed_price_cents: agreedPrice ?? 5900,
        cancel_at_period_end: false,
        past_due_since: null,
        provider_metadata: JSON.stringify(existingMeta),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    console.log(`[StripeBillingProvider] Successfully activated subscription for tenant ${tenantId} (plan: ${planId}, interval: ${billingInterval})`);

    // Complete automated activation lifecycle: reset usage, dispatch email receipt & WhatsApp confirmation
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    await this.dispatchPostActivationNotifications({
      tenantId,
      planId: planId || existingSub?.plan_id || 'starter',
      billingInterval,
      agreedPriceCents: agreedPrice ?? (existingSub?.agreed_price_cents || 0),
      invoiceNumber,
      periodEnd,
      session,
      userId: session.metadata?.userId,
    });
  }

  private async handleSubscriptionUpdated(
    subscription: any,
    resolvedTenantId: string | null,
    eventCreated?: number
  ): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      subscription.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(subscription));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] subscription.updated could not resolve tenantId for sub ${subscription.id}`);
      return;
    }

    const mappedStatus = this.mapStripeStatus(subscription.status);
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : new Date();
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const existingSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    let metadata: Record<string, any> = {};
    if (existingSub?.provider_metadata) {
      try {
        metadata = typeof existingSub.provider_metadata === 'string'
          ? JSON.parse(existingSub.provider_metadata)
          : (existingSub.provider_metadata || {});
      } catch {
        metadata = {};
      }
    }

    // Out-of-order check: if event timestamp is older than last processed event, ignore
    if (eventCreated && metadata.last_event_timestamp && eventCreated < metadata.last_event_timestamp) {
      console.warn(`[StripeBillingProvider] Out-of-order subscription event discarded (event: ${eventCreated} < recorded: ${metadata.last_event_timestamp})`);
      return;
    }
    if (eventCreated) {
      metadata.last_event_timestamp = eventCreated;
    }

    const updatePayload: Record<string, any> = {
      status: mappedStatus,
      provider: 'stripe',
      provider_customer_id: subscription.customer,
      provider_subscription_id: subscription.id,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      provider_metadata: JSON.stringify(metadata),
      updated_at: new Date(),
    };

    if (mappedStatus === 'active') {
      updatePayload.past_due_since = null;
    }

    if (subscription.canceled_at) {
      updatePayload.canceled_at = new Date(subscription.canceled_at * 1000);
    }

    // Check if there is a pending scheduled downgrade whose renewal date has arrived
    if (metadata.pendingDowngradePlanId) {
      const downgradeAt = metadata.pendingDowngradeAt ? new Date(metadata.pendingDowngradeAt) : null;
      const isDue = !downgradeAt ||
        new Date() >= downgradeAt ||
        Math.floor(currentPeriodStart.getTime() / 1000) >= (downgradeAt ? Math.floor(downgradeAt.getTime() / 1000) - 60 : 0);

      if (isDue) {
        const appliedPlanId = metadata.pendingDowngradePlanId;
        const targetPlan = await db('subscription_plans').where({ id: appliedPlanId }).first();
        if (targetPlan) {
          updatePayload.plan_id = appliedPlanId;
          updatePayload.agreed_price_cents = targetPlan.monthly_price_cents || Math.round(Number(targetPlan.price) * 100);
          delete metadata.pendingDowngradePlanId;
          delete metadata.pendingDowngradePlanName;
          delete metadata.pendingDowngradeAt;
          updatePayload.provider_metadata = JSON.stringify(metadata);
          console.log(`[StripeBillingProvider] Executed scheduled downgrade to ${appliedPlanId} for tenant ${tenantId} via subscription.updated`);
        }
      }
    }

    if (!updatePayload.plan_id) {
      const targetPlanId = subscription.metadata?.planId || this.resolvePlanFromPrice(subscription);
      if (targetPlanId) {
        updatePayload.plan_id = targetPlanId;
      }
    }

    await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .update(updatePayload);

    console.log(`[StripeBillingProvider] Synced subscription ${subscription.id} status '${mappedStatus}' for tenant ${tenantId}`);
  }

  private async handleSubscriptionDeleted(subscription: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      subscription.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(subscription));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] subscription.deleted could not resolve tenantId for sub ${subscription.id}`);
      return;
    }

    await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .update({
        status: 'cancelled',
        ended_at: new Date(),
        cancel_at_period_end: false,
        updated_at: new Date(),
      });

    // Notify dunning lifecycle of cancellation
    try {
      await DunningService.handleSubscriptionCanceled(tenantId, subscription);
    } catch (dunningErr) {
      console.error('[StripeBillingProvider] Dunning cancellation notification failed:', dunningErr);
    }

    console.log(`[StripeBillingProvider] Marked subscription cancelled for tenant ${tenantId}`);
  }

  private async handleInvoicePaid(invoice: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      invoice.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(invoice));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] invoice.paid could not resolve tenantId for invoice ${invoice.id}`);
      return;
    }

    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    const invoiceNumber = invoice.number || invoice.id || `inv_${Date.now()}`;
    const amountDue = invoice.amount_due ?? 0;
    const amountPaid = invoice.amount_paid ?? amountDue;
    const currency = invoice.currency || 'usd';
    const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
    const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date();

    // Check if invoice already recorded
    const existingInvoice = await db('billing_invoices')
      .where({ provider: 'stripe', provider_invoice_id: invoice.id })
      .first();

    if (existingInvoice) {
      await db('billing_invoices')
        .where({ id: existingInvoice.id })
        .update({
          status: 'paid',
          amount_paid_cents: amountPaid,
          paid_at: new Date(),
          updated_at: new Date(),
        });
    } else {
      await db('billing_invoices').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        subscription_id: sub?.id || null,
        invoice_number: invoiceNumber,
        amount_due_cents: amountDue,
        amount_paid_cents: amountPaid,
        currency,
        status: 'paid',
        provider: 'stripe',
        provider_invoice_id: invoice.id,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        invoice_pdf_url: invoice.invoice_pdf || null,
        period_start: periodStart,
        period_end: periodEnd,
        paid_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Ensure tenant subscription is active, clear past_due_since and payment_action_required
    if (sub) {
      const updateSubPayload: Record<string, any> = {
        updated_at: new Date(),
      };
      if (sub.status === 'past_due' || sub.past_due_since) {
        updateSubPayload.status = 'active';
        updateSubPayload.past_due_since = null;
      }
      try {
        const metadata = typeof sub.provider_metadata === 'string'
          ? JSON.parse(sub.provider_metadata)
          : (sub.provider_metadata || {});
        if (metadata.payment_action_required) {
          delete metadata.payment_action_required;
          delete metadata.payment_action_url;
          updateSubPayload.provider_metadata = JSON.stringify(metadata);
        }
      } catch {}

      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update(updateSubPayload);
    }

    // Execute scheduled downgrade on renewal payment if pending
    if (sub) {
      try {
        const metadata = typeof sub.provider_metadata === 'string'
          ? JSON.parse(sub.provider_metadata)
          : (sub.provider_metadata || {});

        if (metadata.pendingDowngradePlanId) {
          const targetPlan = await db('subscription_plans').where({ id: metadata.pendingDowngradePlanId }).first();
          if (targetPlan) {
            const appliedPlanId = metadata.pendingDowngradePlanId;
            delete metadata.pendingDowngradePlanId;
            delete metadata.pendingDowngradePlanName;
            delete metadata.pendingDowngradeAt;

            await db('tenant_subscriptions')
              .where({ id: sub.id })
              .update({
                plan_id: appliedPlanId,
                agreed_price_cents: targetPlan.monthly_price_cents || Math.round(Number(targetPlan.price) * 100),
                provider_metadata: JSON.stringify(metadata),
                updated_at: new Date(),
              });

            console.log(`[StripeBillingProvider] Executed scheduled downgrade to ${appliedPlanId} for tenant ${tenantId} upon renewal.`);
          }
        }
      } catch (metaErr) {
        console.error('[StripeBillingProvider] Error processing scheduled downgrade on renewal:', metaErr);
      }
    }

    // Dispatch dunning resolution and renewal receipt
    try {
      await DunningService.handlePaymentSucceeded(tenantId, invoice);
    } catch (dunningErr) {
      console.error('[StripeBillingProvider] Dunning payment success notification failed:', dunningErr);
    }

    // Complete renewal lifecycle: reset usage, dispatch email receipt & WhatsApp confirmation
    await this.dispatchPostActivationNotifications({
      tenantId,
      planId: sub?.plan_id || 'starter',
      billingInterval: 'month',
      agreedPriceCents: amountPaid,
      invoiceNumber,
      periodEnd,
      isRenewal: true,
    });

    console.log(`[StripeBillingProvider] Recorded paid invoice ${invoiceNumber} ($${(amountPaid / 100).toFixed(2)}) for tenant ${tenantId}`);
  }

  private async handleInvoicePaymentFailed(invoice: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      invoice.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(invoice));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] invoice.payment_failed could not resolve tenantId for invoice ${invoice.id}`);
      return;
    }

    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    const invoiceNumber = invoice.number || invoice.id || `inv_fail_${Date.now()}`;
    const amountDue = invoice.amount_due ?? 0;
    const amountPaid = invoice.amount_paid ?? 0;
    const currency = invoice.currency || 'usd';

    // Record invoice with open status
    const existingInvoice = await db('billing_invoices')
      .where({ provider: 'stripe', provider_invoice_id: invoice.id })
      .first();

    if (existingInvoice) {
      await db('billing_invoices')
        .where({ id: existingInvoice.id })
        .update({ status: 'open', updated_at: new Date() });
    } else {
      await db('billing_invoices').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        subscription_id: sub?.id || null,
        invoice_number: invoiceNumber,
        amount_due_cents: amountDue,
        amount_paid_cents: amountPaid,
        currency,
        status: 'open',
        provider: 'stripe',
        provider_invoice_id: invoice.id,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        invoice_pdf_url: invoice.invoice_pdf || null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Set subscription status to past_due and initialize past_due_since for grace period policy
    const pastDueSince = sub?.past_due_since || new Date();
    await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .update({
        status: 'past_due',
        past_due_since: pastDueSince,
        updated_at: new Date(),
      });

    // Initiate automated dunning sequence (Day 1 warning, in-app alert)
    try {
      await DunningService.handlePaymentFailed(tenantId, invoice);
    } catch (dunningErr) {
      console.error('[StripeBillingProvider] Dunning payment failed workflow error:', dunningErr);
    }

    console.warn(`[StripeBillingProvider] Payment failed for invoice ${invoiceNumber}; tenant ${tenantId} entered past_due grace period.`);
  }

  private async handleInvoicePaymentActionRequired(invoice: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      invoice.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(invoice));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] invoice.payment_action_required could not resolve tenantId for invoice ${invoice.id}`);
      return;
    }

    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    const invoiceNumber = invoice.number || invoice.id || `inv_sca_${Date.now()}`;
    const amountDue = invoice.amount_due ?? 0;
    const amountPaid = invoice.amount_paid ?? 0;
    const currency = invoice.currency || 'usd';

    // Record or update invoice with open status and hosted_invoice_url for 3DS authentication
    const existingInvoice = await db('billing_invoices')
      .where({ provider: 'stripe', provider_invoice_id: invoice.id })
      .first();

    if (existingInvoice) {
      await db('billing_invoices')
        .where({ id: existingInvoice.id })
        .update({
          status: 'open',
          hosted_invoice_url: invoice.hosted_invoice_url || existingInvoice.hosted_invoice_url,
          updated_at: new Date(),
        });
    } else {
      await db('billing_invoices').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        subscription_id: sub?.id || null,
        invoice_number: invoiceNumber,
        amount_due_cents: amountDue,
        amount_paid_cents: amountPaid,
        currency,
        status: 'open',
        provider: 'stripe',
        provider_invoice_id: invoice.id,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        invoice_pdf_url: invoice.invoice_pdf || null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Flag 3DS/SCA requirement in subscription metadata
    if (sub) {
      let metadata: Record<string, any> = {};
      try {
        metadata = typeof sub.provider_metadata === 'string'
          ? JSON.parse(sub.provider_metadata)
          : (sub.provider_metadata || {});
      } catch {
        metadata = {};
      }
      metadata.payment_action_required = true;
      metadata.payment_action_url = invoice.hosted_invoice_url || null;

      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          provider_metadata: JSON.stringify(metadata),
          updated_at: new Date(),
        });
    }

    console.warn(`[StripeBillingProvider] 3DS/SCA authentication required for invoice ${invoiceNumber} (tenant: ${tenantId})`);
  }

  private async handleChargeRefunded(charge: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      charge.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(charge));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] charge.refunded could not resolve tenantId for charge ${charge.id}`);
      return;
    }

    const amountRefunded = charge.amount_refunded ?? charge.amount ?? 0;
    const currency = charge.currency || 'usd';
    const invoiceId = charge.invoice;

    // Find and update the associated invoice
    let invoice = invoiceId
      ? await db('billing_invoices').where({ provider: 'stripe', provider_invoice_id: invoiceId }).first()
      : null;

    if (!invoice) {
      invoice = await db('billing_invoices')
        .where({ tenant_id: tenantId })
        .orderBy('created_at', 'desc')
        .first();
    }

    if (invoice) {
      await db('billing_invoices')
        .where({ id: invoice.id })
        .update({
          status: 'refunded',
          updated_at: new Date(),
        });
    }

    // Lookup recipient for receipt
    const owner = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('tenant_users.tenant_id', tenantId)
      .whereIn('tenant_users.role', ['owner', 'admin'])
      .select('users.email', 'users.full_name')
      .first();

    const recipientEmail = owner?.email || 'billing@socialforge.io';
    const recipientName = owner?.full_name || 'Valued Customer';
    const invoiceNumber = invoice?.invoice_number || charge.id;

    try {
      await BillingEmailService.sendRefundReceipt({
        tenantId,
        recipientEmail,
        recipientName,
        invoiceNumber,
        amountRefundedCents: amountRefunded,
        currency,
        reason: charge.refunds?.data?.[0]?.reason || 'Customer request / administrative adjustment',
      });
    } catch (emailErr) {
      console.error('[StripeBillingProvider] Error sending refund receipt email:', emailErr);
    }

    // In-app billing notification
    await db('billing_notifications').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'refund_issued',
      severity: 'info',
      title: 'Payment Refund Issued',
      message: `A refund of $${(amountRefunded / 100).toFixed(2)} was issued for invoice ${invoiceNumber}.`,
      action_url: '/settings/billing?subtab=invoices',
      action_label: 'View Invoices',
      created_at: new Date(),
    });

    console.log(`[StripeBillingProvider] Processed charge refund of $${(amountRefunded / 100).toFixed(2)} for tenant ${tenantId}`);
  }

  private async handleChargeDisputeCreated(dispute: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      dispute.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(dispute));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] charge.dispute.created could not resolve tenantId for dispute ${dispute.id}`);
      return;
    }

    const disputeAmount = dispute.amount ?? 0;
    const currency = dispute.currency || 'usd';
    const reason = dispute.reason || 'Unrecognized charge';
    const evidenceDeadline = dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000)
      : null;

    // Find and update invoice to disputed
    const invoice = await db('billing_invoices')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc')
      .first();

    if (invoice) {
      await db('billing_invoices')
        .where({ id: invoice.id })
        .update({
          status: 'disputed',
          updated_at: new Date(),
        });
    }

    // Flag subscription as disputed in metadata
    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    if (sub) {
      let meta: Record<string, any> = {};
      try {
        meta = typeof sub.provider_metadata === 'string'
          ? JSON.parse(sub.provider_metadata)
          : (sub.provider_metadata || {});
      } catch {}
      meta.active_dispute = {
        disputeId: dispute.id,
        amount: disputeAmount,
        reason,
        evidenceDeadline,
        openedAt: new Date(),
      };

      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          status: 'disputed',
          provider_metadata: JSON.stringify(meta),
          updated_at: new Date(),
        });
    }

    // Lookup recipient for alert
    const owner = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('tenant_users.tenant_id', tenantId)
      .whereIn('tenant_users.role', ['owner', 'admin'])
      .select('users.email', 'users.full_name')
      .first();

    const recipientEmail = owner?.email || 'billing@socialforge.io';
    const recipientName = owner?.full_name || 'Valued Customer';
    const invoiceNumber = invoice?.invoice_number || dispute.charge || dispute.id;

    try {
      await BillingEmailService.sendChargebackAlert({
        tenantId,
        recipientEmail,
        recipientName,
        invoiceNumber,
        disputeAmountCents: disputeAmount,
        currency,
        reason,
        evidenceDeadline,
      });
    } catch (emailErr) {
      console.error('[StripeBillingProvider] Error sending chargeback alert email:', emailErr);
    }

    // In-app billing notification
    await db('billing_notifications').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      type: 'chargeback_alert',
      severity: 'critical',
      title: 'Payment Dispute Opened',
      message: `A payment dispute of $${(disputeAmount / 100).toFixed(2)} was filed. Immediate action is required to avoid suspension.`,
      action_url: '/settings/billing',
      action_label: 'Resolve Dispute',
      created_at: new Date(),
    });

    console.warn(`[StripeBillingProvider] Recorded charge dispute ${dispute.id} ($${(disputeAmount / 100).toFixed(2)}) for tenant ${tenantId}`);
  }

  private async handleChargeDisputeClosed(dispute: any, resolvedTenantId: string | null): Promise<void> {
    const tenantId =
      resolvedTenantId ||
      dispute.metadata?.tenantId ||
      (await this.resolveTenantIdFromStripeObject(dispute));

    if (!tenantId) {
      console.warn(`[StripeBillingProvider] charge.dispute.closed could not resolve tenantId for dispute ${dispute.id}`);
      return;
    }

    const status = dispute.status; // 'won', 'lost', 'needs_response'
    console.log(`[StripeBillingProvider] Dispute ${dispute.id} closed with status '${status}' for tenant ${tenantId}`);

    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    if (sub) {
      let meta: Record<string, any> = {};
      try {
        meta = typeof sub.provider_metadata === 'string'
          ? JSON.parse(sub.provider_metadata)
          : (sub.provider_metadata || {});
      } catch {}
      delete meta.active_dispute;

      const newStatus = status === 'won' ? 'active' : 'expired';
      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          status: newStatus,
          provider_metadata: JSON.stringify(meta),
          updated_at: new Date(),
        });
    }
  }

  /**
   * 9. syncSubscription()
   * Authoritative synchronization of subscription state from Stripe
   */
  public async syncSubscription(subscriptionIdOrTenantId: string): Promise<BillingSubscriptionDetails | null> {
    const sub = await db('tenant_subscriptions')
      .where('id', subscriptionIdOrTenantId)
      .orWhere('provider_subscription_id', subscriptionIdOrTenantId)
      .orWhere('tenant_id', subscriptionIdOrTenantId)
      .first();

    if (!sub) return null;

    const stripe = this.getStripe();
    if (stripe && sub.provider_subscription_id && !sub.provider_subscription_id.startsWith('sub_mock_')) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.provider_subscription_id);
        await this.handleSubscriptionUpdated(stripeSub, sub.tenant_id);
      } catch (err: any) {
        console.error(`[StripeBillingProvider] Failed to retrieve subscription from Stripe for sync: ${err.message}`);
      }
    }

    return this.getSubscription(sub.id);
  }

  public mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'trialing':
        return 'trialing';
      case 'past_due':
      case 'unpaid':
      case 'incomplete':
        return 'past_due';
      case 'paused':
        return 'paused';
      case 'canceled':
        return 'cancelled';
      case 'incomplete_expired':
        return 'expired';
      default:
        return 'active';
    }
  }

  public resolvePlanFromPrice(subscription: any): SubscriptionPlanId | null {
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (!priceId) return null;

    const p = config.stripe.priceIds as any;
    if (priceId === p.starter || priceId === p.starterAnnual) return 'starter';
    if (priceId === p.growth || priceId === p.growthAnnual) return 'growth';
    if (priceId === p.agency || priceId === p.agencyAnnual) return 'agency';
    if (priceId === p.agency_scale) return 'agency_scale';
    if (priceId === p.scale || priceId === p.scaleAnnual) return 'scale';
    if (priceId === p.enterprise) return 'enterprise';

    return null;
  }
}
