import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import { BillingEmailService } from './billingEmail.service.js';
import type {
  BillingDunningEvent,
  BillingNotification,
  DunningEventType,
  DunningStatusResponse,
  NotificationSeverity,
  BillingNotificationType,
} from '@socialforge/shared';

export interface RecordDunningParams {
  tenantId: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  eventType: DunningEventType;
  stage: number;
  recipientEmail: string;
  subject: string;
  payload?: Record<string, any>;
  errorMessage?: string | null;
}

export interface InAppNotificationParams {
  tenantId: string;
  userId?: string | null;
  type: BillingNotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  actionUrl?: string | null;
  actionLabel?: string | null;
  expiresAt?: Date | null;
}

export class DunningService {
  public static readonly GRACE_PERIOD_DAYS = 5;
  public static readonly GRACE_PERIOD_HOURS = 5 * 24; // 120 hours

  /**
   * Records a dunning event in billing_dunning_events with idempotency protection.
   * If an event with same tenantId, eventType, and stage was recorded within the last 24h, skip duplication.
   */
  public static async recordDunningEvent(params: RecordDunningParams): Promise<BillingDunningEvent | null> {
    const { tenantId, subscriptionId, invoiceId, eventType, stage, recipientEmail, subject, payload, errorMessage } =
      params;

    // Check recent duplicate within 24 hours
    const recentDuplicate = await db('billing_dunning_events')
      .where({
        tenant_id: tenantId,
        event_type: eventType,
        stage,
        recipient_email: recipientEmail,
      })
      .andWhere('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .first();

    if (recentDuplicate) {
      console.log(
        `[DunningService] Dunning event ${eventType} (stage ${stage}) already sent to ${recipientEmail} in last 24h. Skipping.`
      );
      return recentDuplicate as BillingDunningEvent;
    }

    const eventId = crypto.randomUUID();
    const eventRecord = {
      id: eventId,
      tenant_id: tenantId,
      subscription_id: subscriptionId || null,
      invoice_id: invoiceId || null,
      event_type: eventType,
      stage,
      status: errorMessage ? 'failed' : 'sent',
      recipient_email: recipientEmail,
      subject,
      payload: payload ? JSON.stringify(payload) : null,
      error_message: errorMessage || null,
      created_at: new Date(),
      sent_at: errorMessage ? null : new Date(),
    };

    await db('billing_dunning_events').insert(eventRecord);

    console.log(
      `[DunningService] Recorded dunning event '${eventType}' (stage ${stage}) for tenant ${tenantId} -> ${recipientEmail}`
    );

    return {
      ...eventRecord,
      payload,
    } as unknown as BillingDunningEvent;
  }

  /**
   * Creates or updates an in-app notification for the workspace.
   */
  public static async createInAppNotification(params: InAppNotificationParams): Promise<BillingNotification> {
    const { tenantId, userId, type, title, message, severity, actionUrl, actionLabel, expiresAt } = params;

    // Check if active (undismissed) notification of same type exists for tenant
    const existing = await db('billing_notifications')
      .where({
        tenant_id: tenantId,
        type,
        is_dismissed: false,
      })
      .first();

    if (existing) {
      await db('billing_notifications')
        .where({ id: existing.id })
        .update({
          title,
          message,
          severity,
          action_url: actionUrl || existing.action_url,
          action_label: actionLabel || existing.action_label,
          created_at: new Date(),
          expires_at: expiresAt || null,
        });

      return {
        ...existing,
        title,
        message,
        severity,
      } as unknown as BillingNotification;
    }

    const notificationId = crypto.randomUUID();
    const newRecord = {
      id: notificationId,
      tenant_id: tenantId,
      user_id: userId || null,
      type,
      title,
      message,
      severity,
      action_url: actionUrl || null,
      action_label: actionLabel || null,
      is_read: false,
      is_dismissed: false,
      created_at: new Date(),
      expires_at: expiresAt || null,
    };

    await db('billing_notifications').insert(newRecord);
    return newRecord as unknown as BillingNotification;
  }

  /**
   * Helper to retrieve all workspace owners and admins.
   */
  private static async getTenantBillingRecipients(tenantId: string): Promise<Array<{ id: string; email: string; fullName: string }>> {
    const members = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('tenant_users.tenant_id', tenantId)
      .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
      .where('users.is_active', 1)
      .select('users.id', 'users.email', 'users.full_name as fullName');

    return members;
  }

  /**
   * Invoked when an invoice payment fails (e.g. from Stripe invoice.payment_failed).
   * Initiates Stage 1 Dunning: sets past_due, logs Day 1 event, dispatches alerts.
   */
  public static async handlePaymentFailed(tenantId: string, invoiceData: any): Promise<void> {
    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    const pastDueSince = sub?.past_due_since || new Date();
    await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .update({
        status: 'past_due',
        past_due_since: pastDueSince,
        updated_at: new Date(),
      });

    const amountDue = invoiceData?.amount_due
      ? `$${(Number(invoiceData.amount_due) / 100).toFixed(2)}`
      : invoiceData?.amount_due_cents
      ? `$${(Number(invoiceData.amount_due_cents) / 100).toFixed(2)}`
      : 'your recent charge';

    const invoiceNumber = invoiceData?.number || invoiceData?.invoice_number || invoiceData?.id || 'Latest Invoice';

    // 1. Send Day 1 Dunning warning to owners/admins
    const recipients = await this.getTenantBillingRecipients(tenantId);
    const amountDueCents = Number(invoiceData?.amount_due || invoiceData?.amount_due_cents || 0);
    const plan = sub ? await db('subscription_plans').where({ id: sub.plan_id }).first() : null;

    for (const recipient of recipients) {
      await this.recordDunningEvent({
        tenantId,
        subscriptionId: sub?.provider_subscription_id || sub?.id,
        invoiceId: invoiceData?.id || invoiceData?.provider_invoice_id,
        eventType: 'payment_failed',
        stage: 1,
        recipientEmail: recipient.email,
        subject: `Payment failed for your SocialForge subscription (${this.GRACE_PERIOD_DAYS}-day grace active)`,
        payload: {
          invoiceNumber,
          amountDue,
          graceDaysRemaining: this.GRACE_PERIOD_DAYS,
          hostedInvoiceUrl: invoiceData?.hosted_invoice_url || null,
        },
      });

      // Dispatch responsive branded HTML notification email
      await BillingEmailService.sendPaymentFailedAlert({
        tenantId,
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        invoiceNumber,
        amountDueCents,
        currency: invoiceData?.currency || 'usd',
        planName: plan?.name || 'Active Plan',
        graceDaysRemaining: this.GRACE_PERIOD_DAYS,
      }).catch((e) => console.error('[DunningService] Failed sending payment failed alert email:', e));
    }

    // 2. Create in-app critical alert
    await this.createInAppNotification({
      tenantId,
      type: 'billing_past_due',
      title: `Payment Failed — ${this.GRACE_PERIOD_DAYS}-Day Grace Period Active`,
      message: `Your payment of ${amountDue} could not be processed. Your publishing workflows remain active under a ${this.GRACE_PERIOD_DAYS}-day grace period. Please update your payment method to prevent service interruption.`,
      severity: 'critical',
      actionUrl: '/settings/billing',
      actionLabel: 'Update Payment Method',
    });

    console.log(`[DunningService] Handled payment failure for tenant ${tenantId}. Stage 1 dunning initiated.`);
  }

  /**
   * Invoked when an invoice payment succeeds (e.g. from Stripe invoice.payment_succeeded).
   * Restores active subscription, marks dunning events resolved, sends receipt.
   */
  public static async handlePaymentSucceeded(tenantId: string, invoiceData: any): Promise<void> {
    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    const wasPastDue = sub?.status === 'past_due' || !!sub?.past_due_since;

    // Restore active status
    await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .update({
        status: 'active',
        past_due_since: null,
        updated_at: new Date(),
      });

    // Resolve any open dunning events for this tenant
    await db('billing_dunning_events')
      .where({ tenant_id: tenantId, status: 'sent' })
      .whereIn('event_type', ['payment_failed', 'grace_warning_day1', 'grace_warning_day3'])
      .update({ status: 'resolved' });

    // Dismiss any active past-due notifications
    await db('billing_notifications')
      .where({ tenant_id: tenantId, type: 'billing_past_due' })
      .update({ is_dismissed: true });

    const amountPaid = invoiceData?.amount_paid
      ? `$${(Number(invoiceData.amount_paid) / 100).toFixed(2)}`
      : invoiceData?.amount_paid_cents
      ? `$${(Number(invoiceData.amount_paid_cents) / 100).toFixed(2)}`
      : 'Subscription charge';

    const invoiceNumber = invoiceData?.number || invoiceData?.invoice_number || invoiceData?.id || 'INV-RENEWAL';

    // Send receipt event
    const recipients = await this.getTenantBillingRecipients(tenantId);
    const amountPaidCents = Number(invoiceData?.amount_paid || invoiceData?.amount_paid_cents || 0);
    const plan = sub ? await db('subscription_plans').where({ id: sub.plan_id }).first() : null;

    for (const recipient of recipients) {
      await this.recordDunningEvent({
        tenantId,
        subscriptionId: sub?.provider_subscription_id || sub?.id,
        invoiceId: invoiceData?.id || invoiceData?.provider_invoice_id,
        eventType: wasPastDue ? 'payment_recovered' : 'renewal_receipt',
        stage: 1,
        recipientEmail: recipient.email,
        subject: wasPastDue
          ? 'Payment Recovered: Your SocialForge subscription is now active'
          : `Payment Receipt: SocialForge subscription payment confirmed (${invoiceNumber})`,
        payload: {
          invoiceNumber,
          amountPaid,
          hostedInvoiceUrl: invoiceData?.hosted_invoice_url || null,
        },
      });

      // Dispatch responsive branded payment receipt email
      await BillingEmailService.sendPaymentReceipt({
        tenantId,
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        invoiceNumber,
        amountPaidCents,
        currency: invoiceData?.currency || 'usd',
        planName: plan?.name || 'Pro Tier',
        billingInterval: sub?.billing_interval || 'month',
        periodEnd: sub?.current_period_end,
        invoicePdfUrl: invoiceData?.invoice_pdf || null,
        hostedInvoiceUrl: invoiceData?.hosted_invoice_url || null,
      }).catch((e) => console.error('[DunningService] Failed sending payment receipt email:', e));
    }

    // Create in-app success notification
    await this.createInAppNotification({
      tenantId,
      type: 'renewal_success',
      title: wasPastDue ? 'Payment Recovered — Account Active' : 'Payment Succeeded',
      message: wasPastDue
        ? `Your payment of ${amountPaid} was received. Full workspace publishing privileges are restored.`
        : `Your payment of ${amountPaid} was processed successfully. Thank you for using SocialForge!`,
      severity: 'success',
      actionUrl: '/settings/billing',
      actionLabel: 'View Invoices',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // auto expires in 7 days
    });

    console.log(`[DunningService] Payment succeeded for tenant ${tenantId}. Subscription restored to active.`);
  }

  /**
   * Invoked when a subscription is canceled.
   */
  public static async handleSubscriptionCanceled(tenantId: string, subscriptionData: any): Promise<void> {
    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();

    const recipients = await this.getTenantBillingRecipients(tenantId);
    const plan = sub ? await db('subscription_plans').where({ id: sub.plan_id }).first() : null;
    const cancelAtPeriodEnd = subscriptionData?.cancel_at_period_end ?? true;

    for (const recipient of recipients) {
      await this.recordDunningEvent({
        tenantId,
        subscriptionId: sub?.provider_subscription_id || sub?.id,
        eventType: 'cancellation_notice',
        stage: 1,
        recipientEmail: recipient.email,
        subject: 'Confirmation: Your SocialForge subscription has been canceled',
        payload: {
          cancelAtPeriodEnd,
          currentPeriodEnd: sub?.current_period_end,
        },
      });

      // Dispatch cancellation confirmation email
      await BillingEmailService.sendSubscriptionCanceledNotice({
        tenantId,
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        planName: plan?.name || 'Active Plan',
        effectiveEndDate: sub?.current_period_end || null,
        cancelAtPeriodEnd,
      }).catch((e) => console.error('[DunningService] Failed sending cancellation notice email:', e));
    }

    await this.createInAppNotification({
      tenantId,
      type: 'account_suspended',
      title: 'Subscription Canceled',
      message: 'Your subscription has been canceled. Your workspace remains active until the end of the current billing cycle.',
      severity: 'warning',
      actionUrl: '/settings/billing',
      actionLabel: 'Reactivate Subscription',
    });

    console.log(`[DunningService] Logged cancellation notice for tenant ${tenantId}.`);
  }

  /**
   * Evaluates all past-due subscriptions (or a single tenant) and progresses the dunning lifecycle:
   * - Day 1 (<24h): Handled on initial failure, or re-dispatched if missing.
   * - Day 3 (>= 48h and < 120h): Stage 2 Urgent Warning.
   * - Day 5 (>= 120h): Stage 3 Grace Period Expired -> Account Suspension (status: 'unpaid').
   */
  public static async processDunningCycle(specificTenantId?: string): Promise<{
    processedCount: number;
    stage2WarningsSent: number;
    stage3Suspensions: number;
  }> {
    let query = db('tenant_subscriptions')
      .where({ status: 'past_due' })
      .orWhereNotNull('past_due_since');

    if (specificTenantId) {
      query = db('tenant_subscriptions').where({ tenant_id: specificTenantId });
    }

    const subscriptions = await query;
    let stage2WarningsSent = 0;
    let stage3Suspensions = 0;

    for (const sub of subscriptions) {
      if (sub.status !== 'past_due' && !sub.past_due_since) continue;

      const pastDueTime = sub.past_due_since ? new Date(sub.past_due_since).getTime() : new Date(sub.updated_at).getTime();
      const hoursElapsed = Math.floor((Date.now() - pastDueTime) / (3600 * 1000));
      const tenantId = sub.tenant_id;

      // STAGE 3: >= 120 hours (5 full days elapsed) -> SUSPENSION
      if (hoursElapsed >= this.GRACE_PERIOD_HOURS) {
        // Suspend subscription to expired
        await db('tenant_subscriptions')
          .where({ id: sub.id })
          .update({
            status: 'expired',
            updated_at: new Date(),
          });

        const recipients = await this.getTenantBillingRecipients(tenantId);
        for (const recipient of recipients) {
          const sent = await this.recordDunningEvent({
            tenantId,
            subscriptionId: sub.provider_subscription_id || sub.id,
            eventType: 'grace_expired_suspension',
            stage: 3,
            recipientEmail: recipient.email,
            subject: 'Account Suspended: Payment grace period expired',
            payload: {
              hoursElapsed,
              actionRequired: 'Update billing credentials to reactivate publishing.',
            },
          });
          if (sent && sent.status === 'sent') stage3Suspensions++;
        }

        // Update in-app banner to suspended state
        await this.createInAppNotification({
          tenantId,
          type: 'account_suspended',
          title: 'Account Workflows Suspended',
          message: 'Your 5-day payment grace period has expired. Publishing and automation features have been suspended. Please update your billing details immediately to restore access.',
          severity: 'critical',
          actionUrl: '/settings/billing',
          actionLabel: 'Reactivate Account',
        });

        // Dispatch account suspended notification email to workspace owners/admins
        for (const recipient of recipients) {
          await BillingEmailService.sendAccountSuspendedAlert({
            tenantId,
            recipientEmail: recipient.email,
            recipientName: recipient.fullName,
          }).catch((e) => console.error('[DunningService] Failed sending account suspended email:', e));
        }

        console.warn(`[DunningService] Tenant ${tenantId} grace period elapsed (${hoursElapsed}h). Account suspended to 'unpaid'.`);
        continue;
      }

      // STAGE 2: >= 48 hours and < 120 hours -> URGENT REMINDER
      if (hoursElapsed >= 48 && hoursElapsed < this.GRACE_PERIOD_HOURS) {
        const daysRemaining = Math.max(1, Math.ceil((this.GRACE_PERIOD_HOURS - hoursElapsed) / 24));
        const recipients = await this.getTenantBillingRecipients(tenantId);

        for (const recipient of recipients) {
          const sent = await this.recordDunningEvent({
            tenantId,
            subscriptionId: sub.provider_subscription_id || sub.id,
            eventType: 'grace_warning_day3',
            stage: 2,
            recipientEmail: recipient.email,
            subject: `Urgent: ${daysRemaining} days remaining before your SocialForge workspace is suspended`,
            payload: {
              hoursElapsed,
              daysRemaining,
              gracePeriodHoursTotal: this.GRACE_PERIOD_HOURS,
            },
          });
          if (sent && sent.status === 'sent') stage2WarningsSent++;

          // Dispatch stage 2 warning email
          await BillingEmailService.sendGracePeriodWarning({
            tenantId,
            recipientEmail: recipient.email,
            recipientName: recipient.fullName,
            daysRemaining,
            amountDueCents: 0,
            currency: 'usd',
          }).catch((e) => console.error('[DunningService] Failed sending grace warning email:', e));
        }

        await this.createInAppNotification({
          tenantId,
          type: 'billing_past_due',
          title: `Urgent: ${daysRemaining} Days Remaining in Grace Period`,
          message: `Your payment remains past due. You have ${daysRemaining} days left before publishing access is suspended. Please update your payment method now.`,
          severity: 'critical',
          actionUrl: '/settings/billing',
          actionLabel: 'Update Payment Method',
        });

        console.log(`[DunningService] Sent Stage 2 dunning warning for tenant ${tenantId} (${daysRemaining} days left).`);
      }
    }

    return {
      processedCount: subscriptions.length,
      stage2WarningsSent,
      stage3Suspensions,
    };
  }

  /**
   * Retrieves comprehensive dunning status for a given workspace.
   */
  public static async getDunningStatus(tenantId: string): Promise<DunningStatusResponse> {
    const sub = await db('tenant_subscriptions')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.tenant_id', tenantId)
      .select(
        'tenant_subscriptions.*',
        'subscription_plans.name as plan_name'
      )
      .first();

    const isPastDue = sub ? sub.status === 'past_due' || !!sub.past_due_since : false;

    let isInGracePeriod = false;
    let daysRemaining = 0;
    let graceExpiresAt: string | null = null;
    let pastDueSinceStr: string | null = null;

    if (isPastDue && sub?.past_due_since) {
      const pastDueTime = new Date(sub.past_due_since).getTime();
      const expiresTime = pastDueTime + this.GRACE_PERIOD_HOURS * 3600 * 1000;
      const msRemaining = expiresTime - Date.now();

      isInGracePeriod = msRemaining > 0;
      daysRemaining = Math.min(this.GRACE_PERIOD_DAYS, Math.max(0, Math.ceil(msRemaining / (24 * 3600 * 1000))));
      graceExpiresAt = new Date(expiresTime).toISOString();
      pastDueSinceStr = new Date(pastDueTime).toISOString();
    }

    // Fetch latest invoice
    const latestInvoiceRow = await db('billing_invoices')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc')
      .first();

    const latestInvoice = latestInvoiceRow
      ? {
          id: latestInvoiceRow.id,
          amount: Number(latestInvoiceRow.amount_due_cents || 0) / 100,
          currency: latestInvoiceRow.currency || 'usd',
          paid: latestInvoiceRow.status === 'paid',
          hostedInvoiceUrl: latestInvoiceRow.hosted_invoice_url || null,
        }
      : null;

    // Fetch active notifications
    const activeNotificationsRows = await db('billing_notifications')
      .where({ tenant_id: tenantId, is_dismissed: false })
      .orderBy('created_at', 'desc')
      .limit(10);

    const activeNotifications: BillingNotification[] = activeNotificationsRows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      severity: row.severity,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      isRead: Boolean(row.is_read),
      isDismissed: Boolean(row.is_dismissed),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));

    return {
      isPastDue,
      isInGracePeriod,
      graceDaysTotal: this.GRACE_PERIOD_DAYS,
      daysRemaining,
      pastDueSince: pastDueSinceStr,
      graceExpiresAt,
      currentPlanName: sub?.plan_name || 'Free Trial',
      subscriptionStatus: sub?.status || 'active',
      latestInvoice,
      activeNotifications,
    };
  }

  /**
   * Dismisses an in-app notification.
   */
  public static async dismissNotification(tenantId: string, notificationId: string): Promise<boolean> {
    const updated = await db('billing_notifications')
      .where({ id: notificationId, tenant_id: tenantId })
      .update({ is_dismissed: true, is_read: true });

    return updated > 0;
  }

  /**
   * Time simulator for automated testing & validation.
   * Modifies past_due_since by subtracting hoursElapsed and runs dunning cycle.
   */
  public static async simulateDunningAdvance(tenantId: string, hoursToSimulate: number): Promise<{
    simulatedPastDueSince: Date;
    cycleResult: {
      processedCount: number;
      stage2WarningsSent: number;
      stage3Suspensions: number;
    };
  }> {
    const simulatedPastDueSince = new Date(Date.now() - hoursToSimulate * 3600 * 1000);

    await db('tenant_subscriptions')
      .where({ tenant_id: tenantId })
      .update({
        status: 'past_due',
        past_due_since: simulatedPastDueSince,
        updated_at: new Date(),
      });

    const cycleResult = await this.processDunningCycle(tenantId);

    return {
      simulatedPastDueSince,
      cycleResult,
    };
  }
}
