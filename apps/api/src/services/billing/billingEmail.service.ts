import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import type {
  BillingEmailLog,
  BillingEmailTemplateType,
  QuotaResource,
  UsageAlertThreshold,
} from '@socialforge/shared';

export interface SendBillingEmailParams {
  tenantId: string;
  recipientEmail: string;
  recipientName?: string | null;
  template: BillingEmailTemplateType;
  subject: string;
  htmlBody: string;
  textBody: string;
  metadata?: Record<string, any>;
  initialStatus?: 'sent' | 'failed' | 'simulated';
  errorMessage?: string;
}

export class BillingEmailService {
  private static tableEnsured = false;

  /**
   * Idempotently ensure the billing_email_logs table exists
   */
  public static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    const hasTable = await db.schema.hasTable('billing_email_logs');
    if (!hasTable) {
      await db.schema.createTable('billing_email_logs', (table) => {
        table.uuid('id').primary();
        table.uuid('tenant_id').notNullable();
        table.string('recipient_email', 255).notNullable();
        table.string('recipient_name', 255).nullable();
        table.string('template', 50).notNullable();
        table.string('subject', 255).notNullable();
        table.text('html_body', 'longtext').notNullable();
        table.text('text_body').notNullable();
        table.enum('status', ['sent', 'failed', 'simulated']).notNullable().defaultTo('sent');
        table.text('metadata').nullable();
        table.text('error_message').nullable();
        table.timestamp('sent_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());

        table.index(['tenant_id'], 'idx_email_logs_tenant');
        table.index(['template'], 'idx_email_logs_template');
        table.index(['recipient_email'], 'idx_email_logs_recipient');
        table.index(['created_at'], 'idx_email_logs_created');
      });
    }
    this.tableEnsured = true;
  }

  // ---------------------------------------------------------------------------
  // HTML Email Layout Wrapper
  // ---------------------------------------------------------------------------

  private static wrapHtmlLayout(title: string, contentHtml: string): string {
    const webAppUrl = config.webAppUrl || 'http://localhost:5173';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
    .email-container { max-width: 600px; margin: 32px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .email-header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 32px 36px; border-bottom: 1px solid #1f2937; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; font-weight: 800; font-size: 22px; margin-bottom: 12px; }
    .brand-name { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin: 0; }
    .brand-sub { font-size: 12px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .email-body { padding: 36px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .h1-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px; }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-info { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); }
    .receipt-box { background: #0a0e17; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-label { color: #9ca3af; }
    .receipt-value { color: #ffffff; font-weight: 600; text-align: right; }
    .receipt-total { border-top: 2px solid #374151; margin-top: 10px; padding-top: 12px; font-size: 18px; font-weight: 800; color: #10b981; }
    .btn-cta { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px; margin: 24px 0; text-align: center; }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .email-footer { background-color: #0b0f19; padding: 24px 36px; border-top: 1px solid #1f2937; text-align: center; font-size: 12px; color: #6b7280; }
    .footer-links a { color: #9ca3af; text-decoration: underline; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="logo-badge">⚡</div>
      <h1 class="brand-name">HoaspForge</h1>
      <div class="brand-sub">Multi-Brand AI Content Architecture</div>
    </div>
    <div class="email-body">
      ${contentHtml}
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 10px 0;">This billing notice was sent regarding your HoaspForge organization subscription.</p>
      <div class="footer-links">
        <a href="${webAppUrl}/settings/billing">Billing Settings</a> •
        <a href="${webAppUrl}/settings/billing?tab=invoices">Invoices</a> •
        <a href="${webAppUrl}/support">Help & Support</a>
      </div>
      <p style="margin-top: 12px; color: #4b5563;">© ${new Date().getFullYear()} HoaspForge Technologies Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // Concrete Email Template Generators
  // ---------------------------------------------------------------------------

  /**
   * 1. Payment Receipt Email (Phase 4 Enhanced)
   */
  public static async sendPaymentReceipt(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string | null;
    customerName?: string | null;
    invoiceNumber: string;
    transactionId?: string | null;
    amountPaidCents: number;
    subtotalCents?: number;
    taxCents?: number;
    gstPercent?: number;
    currency: string;
    planName: string;
    billingInterval: string;
    paymentDate?: Date | string | null;
    activationDate?: Date | string | null;
    periodStart?: Date | string | null;
    periodEnd?: Date | string | null;
    renewalDate?: Date | string | null;
    invoicePdfUrl?: string | null;
    hostedInvoiceUrl?: string | null;
    supportEmail?: string;
    supportUrl?: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      customerName = recipientName || 'Valued Customer',
      invoiceNumber,
      transactionId = `TXN-${invoiceNumber.replace('INV-', '')}`,
      amountPaidCents,
      currency,
      planName,
      billingInterval,
      paymentDate = new Date(),
      activationDate = new Date(),
      periodStart = new Date(),
      periodEnd,
      renewalDate = periodEnd,
      invoicePdfUrl,
      hostedInvoiceUrl,
      supportEmail = 'support@socialforge.io',
      supportUrl = `${config.webAppUrl}/support`,
    } = params;

    const currencyCode = (currency || 'USD').toUpperCase();
    const amountTotal = amountPaidCents / 100;

    // Tax and GST Breakdown (Standard 18% GST calculation if not specified)
    const effectiveGstPercent = params.gstPercent ?? 18;
    const effectiveTaxCents =
      params.taxCents !== undefined
        ? params.taxCents
        : amountPaidCents > 0
        ? Math.round(amountPaidCents - amountPaidCents / (1 + effectiveGstPercent / 100))
        : 0;
    const effectiveSubtotalCents =
      params.subtotalCents !== undefined
        ? params.subtotalCents
        : Math.max(0, amountPaidCents - effectiveTaxCents);

    const amountFormatted = `$${amountTotal.toFixed(2)} ${currencyCode}`;
    const subtotalFormatted = `$${(effectiveSubtotalCents / 100).toFixed(2)} ${currencyCode}`;
    const taxFormatted = `$${(effectiveTaxCents / 100).toFixed(2)} ${currencyCode}`;

    const formatDate = (d: any) => {
      if (!d) return '—';
      try {
        return new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return '—';
      }
    };

    const paymentDateFormatted = formatDate(paymentDate);
    const activationDateFormatted = formatDate(activationDate);
    const renewalDateFormatted = formatDate(renewalDate);
    const periodStartFormatted = formatDate(periodStart);
    const billingPeriodFormatted = `${periodStartFormatted} – ${renewalDateFormatted}`;

    const invoiceLink =
      invoicePdfUrl ||
      `${config.webAppUrl}/api/v1/billing/invoices/${invoiceNumber}/download` ||
      hostedInvoiceUrl ||
      `${config.webAppUrl}/settings/billing?tab=invoices`;

    const subject = `Payment Receipt: HoaspForge ${planName} subscription (${invoiceNumber})`;

    const htmlContent = `
      <span class="status-badge badge-success">✓ Payment Confirmed</span>
      <h2 class="h1-title">Payment Receipt &amp; Tax Invoice</h2>
      <p>Hello <strong>${customerName}</strong>,</p>
      <p>Thank you for subscribing to HoaspForge! Your payment for the <strong>${planName}</strong> plan has been processed successfully and your subscription is active.</p>
      
      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Customer Name</span>
          <span class="receipt-value">${customerName}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Subscription Plan</span>
          <span class="receipt-value">${planName} (${billingInterval === 'year' ? 'Annual' : 'Monthly'})</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Invoice Number</span>
          <span class="receipt-value" style="font-family: monospace;">${invoiceNumber}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Transaction ID</span>
          <span class="receipt-value" style="font-family: monospace;">${transactionId}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Payment Date</span>
          <span class="receipt-value">${paymentDateFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Subscription Activation Date</span>
          <span class="receipt-value">${activationDateFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Billing Period</span>
          <span class="receipt-value">${billingPeriodFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Next Renewal Date</span>
          <span class="receipt-value" style="color: #60a5fa;">${renewalDateFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Subtotal</span>
          <span class="receipt-value">${subtotalFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Applicable Tax &amp; GST (${effectiveGstPercent}%)</span>
          <span class="receipt-value">${taxFormatted}</span>
        </div>
        <div class="receipt-row receipt-total">
          <span>Amount Paid (${currencyCode})</span>
          <span>${amountFormatted}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${invoiceLink}" class="btn-cta" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
          Download PDF Invoice
        </a>
      </div>

      <div style="border-top: 1px solid #1f2937; padding-top: 18px; margin-top: 20px; font-size: 13px; color: #9ca3af;">
        <h4 style="margin: 0 0 6px 0; color: #f3f4f6; font-size: 13px;">Customer Support Information</h4>
        <p style="margin: 0 0 4px 0;">Need help with your invoice or billing? Our dedicated support team is available 24/7.</p>
        <p style="margin: 0;">
          • Email: <a href="mailto:${supportEmail}" style="color: #a78bfa;">${supportEmail}</a><br/>
          • Help Center: <a href="${supportUrl}" style="color: #a78bfa;">${supportUrl}</a><br/>
          • Self-service portal: <a href="${config.webAppUrl}/settings/billing" style="color: #a78bfa;">${config.webAppUrl}/settings/billing</a>
        </p>
      </div>
    `;

    const textBody = `HoaspForge Payment Receipt & Tax Invoice
==================================================
Customer Name: ${customerName}
Subscription Plan: ${planName} (${billingInterval})
Invoice Number: ${invoiceNumber}
Transaction ID: ${transactionId}
Payment Date: ${paymentDateFormatted}
Activation Date: ${activationDateFormatted}
Billing Period: ${billingPeriodFormatted}
Next Renewal Date: ${renewalDateFormatted}

Itemized Tax Breakdown:
- Subtotal: ${subtotalFormatted}
- Applicable Tax & GST (${effectiveGstPercent}%): ${taxFormatted}
- Total Amount Paid: ${amountFormatted}

Download PDF Invoice:
${invoiceLink}

Support Information:
Support Email: ${supportEmail}
Help Center: ${supportUrl}
Billing Portal: ${config.webAppUrl}/settings/billing
==================================================`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName: customerName,
      template: 'payment_receipt',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: {
        customerName,
        planName,
        amountPaidCents,
        currency: currencyCode,
        paymentDate: paymentDateFormatted,
        transactionId,
        invoiceNumber,
        billingPeriod: billingPeriodFormatted,
        activationDate: activationDateFormatted,
        renewalDate: renewalDateFormatted,
        subtotalCents: effectiveSubtotalCents,
        taxCents: effectiveTaxCents,
        gstPercent: effectiveGstPercent,
        invoicePdfUrl: invoiceLink,
        supportEmail,
      },
    });
  }

  /**
   * 2. Payment Failed / Dunning Alert Email
   */
  public static async sendPaymentFailedAlert(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    invoiceNumber: string;
    amountDueCents: number;
    currency: string;
    planName?: string;
    graceDaysRemaining: number;
    updatePaymentUrl?: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      invoiceNumber,
      amountDueCents,
      currency,
      planName = 'Active Plan',
      graceDaysRemaining,
      updatePaymentUrl = `${config.webAppUrl}/settings/billing`,
    } = params;

    const amountFormatted = `$${(amountDueCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
    const subject = `Action Required: Payment failed for your HoaspForge subscription (${graceDaysRemaining}-day grace active)`;

    const htmlContent = `
      <span class="status-badge badge-danger">⚠️ Action Required</span>
      <h2 class="h1-title">Payment Unsuccessful</h2>
      <p>Hello ${recipientName || 'Workspace Admin'},</p>
      <p>We were unable to process your subscription payment of <strong>${amountFormatted}</strong> for <strong>${planName}</strong>.</p>
      
      <div class="receipt-box" style="border-left: 4px solid #ef4444;">
        <div class="receipt-row">
          <span class="receipt-label">Invoice Number</span>
          <span class="receipt-value">${invoiceNumber}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Outstanding Amount</span>
          <span class="receipt-value" style="color: #ef4444;">${amountFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Grace Period Status</span>
          <span class="receipt-value" style="color: #f59e0b;">Active (${graceDaysRemaining} days remaining)</span>
        </div>
      </div>

      <p>
        <strong>Your publishing operations are currently protected.</strong> All connected brand accounts and scheduled posts will continue normally during your <strong>${graceDaysRemaining}-day grace period</strong>.
      </p>
      <p>
        Please update your payment method today to avoid any interruption to your AI generation or automated publishing queues.
      </p>

      <div style="text-align: center;">
        <a href="${updatePaymentUrl}" class="btn-cta btn-danger">Update Payment Method Now</a>
      </div>
    `;

    const textBody = `HoaspForge Alert: Payment Failed
Invoice: ${invoiceNumber}
Amount Due: ${amountFormatted}
Grace Period: ${graceDaysRemaining} days remaining

Your workspace publishing remains active during grace. Please update your payment method immediately:
${updatePaymentUrl}`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'payment_failed',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { invoiceNumber, amountDueCents, graceDaysRemaining },
    });
  }

  /**
   * 3. Grace Period Expiry / Escalation Warning Email
   */
  public static async sendGracePeriodWarning(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    daysRemaining: number;
    amountDueCents: number;
    currency: string;
    updatePaymentUrl?: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      daysRemaining,
      amountDueCents,
      currency,
      updatePaymentUrl = `${config.webAppUrl}/settings/billing`,
    } = params;

    const amountFormatted = `$${(amountDueCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
    const subject = `Urgent: ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left in your HoaspForge grace period`;

    const htmlContent = `
      <span class="status-badge badge-warning">⏳ Grace Period Expiring Soon</span>
      <h2 class="h1-title">Final Notice Before Suspension</h2>
      <p>Hello ${recipientName || 'Workspace Admin'},</p>
      <p>This is an urgent reminder that you have <strong>${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining</strong> in your grace period for unpaid balance of <strong>${amountFormatted}</strong>.</p>
      
      <p style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px; color: #fca5a5;">
        If a valid payment method is not added within ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}, your automated publishing engine, AI studio generation, and team access will be paused.
      </p>

      <div style="text-align: center;">
        <a href="${updatePaymentUrl}" class="btn-cta btn-danger">Resolve Outstanding Balance</a>
      </div>
    `;

    const textBody = `Urgent: HoaspForge Grace Period Expiring
Days Left: ${daysRemaining}
Amount Due: ${amountFormatted}

Action needed to prevent publishing pause:
${updatePaymentUrl}`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'grace_period_warning',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { daysRemaining, amountDueCents },
    });
  }

  /**
   * 4. Account Suspended Notice Email
   */
  public static async sendAccountSuspendedAlert(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    updatePaymentUrl?: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      updatePaymentUrl = `${config.webAppUrl}/settings/billing`,
    } = params;

    const subject = 'Notice: Your HoaspForge publishing privileges are paused';

    const htmlContent = `
      <span class="status-badge badge-danger">⛔ Account Suspended</span>
      <h2 class="h1-title">Publishing Privileges Paused</h2>
      <p>Hello ${recipientName || 'Workspace Admin'},</p>
      <p>Your grace period has expired. Automated publishing, AI content generation, and scheduled posts have been temporarily suspended.</p>
      
      <p>
        <strong>Your Brand Brain and Content Assets Are Safe:</strong> None of your draft posts, brand kits, connected channels, or historical analytics have been deleted. You can restore full agency privileges instantly by adding a payment method.
      </p>

      <div style="text-align: center;">
        <a href="${updatePaymentUrl}" class="btn-cta">Restore Account Privileges</a>
      </div>
    `;

    const textBody = `HoaspForge Notice: Publishing Privileges Paused
Your grace period has expired. Your data is 100% safe.
Reactivate your account anytime:
${updatePaymentUrl}`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'account_suspended',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
    });
  }

  /**
   * 5. Subscription Canceled Notice Email
   */
  public static async sendSubscriptionCanceledNotice(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    planName: string;
    effectiveEndDate: Date | string | null;
    cancelAtPeriodEnd: boolean;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      planName,
      effectiveEndDate,
      cancelAtPeriodEnd,
    } = params;

    const endFormatted = effectiveEndDate
      ? new Date(effectiveEndDate).toLocaleDateString()
      : 'the end of your current cycle';

    const subject = `Confirmation: Your HoaspForge ${planName} subscription has been canceled`;

    const htmlContent = `
      <span class="status-badge badge-info">Subscription Canceled</span>
      <h2 class="h1-title">Cancellation Confirmed</h2>
      <p>Hello ${recipientName || 'Partner'},</p>
      <p>We've received your request to cancel your <strong>${planName}</strong> subscription.</p>
      
      <p>
        ${
          cancelAtPeriodEnd
            ? `Your workspace and publishing privileges will remain active until <strong>${endFormatted}</strong>. You will not be billed again.`
            : `Your subscription has been canceled immediately.`
        }
      </p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Plan</span>
          <span class="receipt-value">${planName}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Access Through</span>
          <span class="receipt-value">${endFormatted}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Brand Brain Data</span>
          <span class="receipt-value" style="color: #10b981;">Preserved</span>
        </div>
      </div>

      <p>
        If your plans change, you can reactivate your subscription at any time with a single click.
      </p>

      <div style="text-align: center;">
        <a href="${config.webAppUrl}/settings/billing" class="btn-cta">Reactivate Subscription</a>
      </div>
    `;

    const textBody = `HoaspForge: Subscription Canceled
Plan: ${planName}
Access through: ${endFormatted}
Brand data: Preserved

Reactivate anytime: ${config.webAppUrl}/settings/billing`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'subscription_canceled',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { planName, effectiveEndDate, cancelAtPeriodEnd },
    });
  }

  /**
   * 6. Subscription Upgraded / Changed Notice Email
   */
  public static async sendSubscriptionChangedNotice(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    oldPlanName?: string;
    newPlanName: string;
    newPriceFormatted: string;
    billingInterval: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      oldPlanName,
      newPlanName,
      newPriceFormatted,
      billingInterval,
    } = params;

    const subject = `Plan Updated: Welcome to HoaspForge ${newPlanName}`;

    const htmlContent = `
      <span class="status-badge badge-success">✓ Plan Updated</span>
      <h2 class="h1-title">Subscription Tier Upgraded</h2>
      <p>Hello ${recipientName || 'Partner'},</p>
      <p>Your workspace subscription has been updated to <strong>${newPlanName}</strong> (${newPriceFormatted}/${billingInterval}).</p>
      
      <div class="receipt-box">
        ${
          oldPlanName
            ? `<div class="receipt-row">
                 <span class="receipt-label">Previous Tier</span>
                 <span class="receipt-value" style="color: #9ca3af;">${oldPlanName}</span>
               </div>`
            : ''
        }
        <div class="receipt-row">
          <span class="receipt-label">New Tier</span>
          <span class="receipt-value" style="color: #a78bfa;">${newPlanName}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Billing Rate</span>
          <span class="receipt-value">${newPriceFormatted} per ${billingInterval}</span>
        </div>
      </div>

      <p>Your increased quotas and advanced agency entitlements are available immediately in your workspace.</p>

      <div style="text-align: center;">
        <a href="${config.webAppUrl}/dashboard" class="btn-cta">Go to Studio Dashboard</a>
      </div>
    `;

    const textBody = `HoaspForge: Plan Updated
New Plan: ${newPlanName} (${newPriceFormatted}/${billingInterval})
Previous: ${oldPlanName || 'Standard'}

Explore your workspace: ${config.webAppUrl}/dashboard`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'subscription_changed',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { oldPlanName, newPlanName, newPriceFormatted },
    });
  }

  /**
   * Dispatches branded usage threshold warning / critical / exceeded alert email
   */
  public static async sendUsageThresholdAlert(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string | null;
    resource: QuotaResource;
    resourceLabel: string;
    thresholdPercent: UsageAlertThreshold;
    currentUsage: number;
    quotaLimit: number;
    percentUsed: number;
    planName: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      resource,
      resourceLabel,
      thresholdPercent,
      currentUsage,
      quotaLimit,
      percentUsed,
      planName,
    } = params;

    const formatVal = (v: number): string => {
      if (resource === 'storage_bytes_limit') {
        if (v >= 1073741824) return `${(v / 1073741824).toFixed(1)} GB`;
        return `${(v / 1048576).toFixed(1)} MB`;
      }
      return v.toLocaleString();
    };

    const formattedUsage = formatVal(currentUsage);
    const formattedLimit = formatVal(quotaLimit);
    const cappedPercent = Math.min(Math.round(percentUsed), 100);

    let badgeHtml = '';
    let headline = '';
    let barColor = '';
    let subject = '';
    let advice = '';

    if (thresholdPercent === 100) {
      subject = `Quota Exceeded: 100% of ${resourceLabel} consumed (${planName})`;
      badgeHtml = `<span class="status-badge badge-danger">⛔ 100% Quota Exceeded</span>`;
      headline = `Quota Limit Reached: ${resourceLabel}`;
      barColor = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
      advice = `Your workspace has reached its limit for <strong>${resourceLabel}</strong>. To continue creating and publishing content without interruption, please upgrade your subscription plan immediately.`;
    } else if (thresholdPercent === 90) {
      subject = `Critical Alert: 90% of ${resourceLabel} consumed (${planName})`;
      badgeHtml = `<span class="status-badge" style="background: rgba(249, 115, 22, 0.15); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.3);">⚠️ 90% Quota Reached</span>`;
      headline = `Critical Quota Alert: ${resourceLabel}`;
      barColor = 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)';
      advice = `Your workspace has consumed <strong>${percentUsed.toFixed(0)}%</strong> of your monthly allowance for <strong>${resourceLabel}</strong>. Only <strong>${formatVal(Math.max(0, quotaLimit - currentUsage))}</strong> remaining before services are capped.`;
    } else {
      subject = `Usage Warning: 80% of ${resourceLabel} consumed (${planName})`;
      badgeHtml = `<span class="status-badge badge-warning">⚡ 80% Quota Warning</span>`;
      headline = `Approaching Quota Limit: ${resourceLabel}`;
      barColor = 'linear-gradient(90deg, #3b82f6 0%, #eab308 100%)';
      advice = `You have reached <strong>${percentUsed.toFixed(0)}%</strong> of your ${planName} plan quota for <strong>${resourceLabel}</strong>. We recommend reviewing your usage or upgrading early to avoid hitting hard limits.`;
    }

    const htmlContent = `
      ${badgeHtml}
      <h2 class="h1-title">${headline}</h2>
      <p>Hello ${recipientName || 'Partner'},</p>
      <p>${advice}</p>

      <div class="receipt-box" style="margin: 24px 0;">
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 14px;">
          <span style="color: #9ca3af; font-weight: 500;">Resource Utilization</span>
          <span style="color: #ffffff; font-weight: 700;">${percentUsed.toFixed(1)}%</span>
        </div>
        
        <div style="background-color: #1f2937; border-radius: 9999px; height: 12px; width: 100%; overflow: hidden; margin-bottom: 16px;">
          <div style="background: ${barColor}; width: ${cappedPercent}%; height: 100%; border-radius: 9999px;"></div>
        </div>

        <div class="receipt-row">
          <span class="receipt-label">Resource Metric</span>
          <span class="receipt-value" style="color: #a78bfa;">${resourceLabel}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Current Consumption</span>
          <span class="receipt-value">${formattedUsage}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Plan Allowance</span>
          <span class="receipt-value">${formattedLimit}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Current Plan</span>
          <span class="receipt-value">${planName}</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #9ca3af;">
        Upgrading your plan instantly expands your limits across all channels, AI generation tokens, and connected social accounts.
      </p>

      <div style="text-align: center;">
        <a href="${config.webAppUrl}/settings/billing" class="btn-cta ${thresholdPercent === 100 ? 'btn-danger' : ''}">Upgrade Subscription Plan</a>
      </div>
    `;

    const textBody = `HoaspForge Alert: ${headline}
Resource: ${resourceLabel}
Used: ${formattedUsage} / ${formattedLimit} (${percentUsed.toFixed(1)}%)
Plan: ${planName}

Upgrade your plan to unlock more quota: ${config.webAppUrl}/settings/billing`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'usage_threshold_alert',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: {
        resource,
        resourceLabel,
        thresholdPercent,
        currentUsage,
        quotaLimit,
        percentUsed,
        planName,
      },
    });
  }

  /**
   * 8. Upcoming Subscription Renewal Reminder Email
   */
  public static async sendRenewalReminder(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    planName: string;
    renewalDate: Date | string;
    amountDueCents: number;
    currency?: string;
    daysUntilRenewal: number;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      planName,
      renewalDate,
      amountDueCents,
      currency = 'usd',
      daysUntilRenewal,
    } = params;

    const formattedDate = new Date(renewalDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedAmount = `$${(amountDueCents / 100).toFixed(2)} ${currency.toUpperCase()}`;

    const subject = `Upcoming Renewal: Your HoaspForge ${planName} plan renews in ${daysUntilRenewal} days`;

    const htmlContent = `
      <span class="status-badge badge-info">Upcoming Renewal</span>
      <h2 class="h1-title">Your Plan Will Auto-Renew Soon</h2>
      <p>Hello ${recipientName || 'Partner'},</p>
      <p>This is a friendly reminder that your HoaspForge <strong>${planName}</strong> subscription will automatically renew on <strong>${formattedDate}</strong>.</p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Subscription Tier</span>
          <span class="receipt-value">${planName}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Renewal Date</span>
          <span class="receipt-value">${formattedDate}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Renewal Amount</span>
          <span class="receipt-value">${formattedAmount}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Payment Method</span>
          <span class="receipt-value">Default Card on File</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #9ca3af;">
        You can review your plan benefits, update your payment details, or adjust billing settings anytime from your dashboard.
      </p>

      <div style="text-align: center;">
        <a href="${config.webAppUrl}/settings/billing" class="btn-cta">Manage Billing & Payment Method</a>
      </div>
    `;

    const textBody = `HoaspForge Renewal Reminder:
Your ${planName} subscription will renew on ${formattedDate} for ${formattedAmount}.
Manage your subscription: ${config.webAppUrl}/settings/billing`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'renewal_reminder',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { planName, renewalDate, amountDueCents, currency, daysUntilRenewal },
    });
  }

  /**
   * 9. Payment Refund Confirmation Email
   */
  public static async sendRefundReceipt(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    invoiceNumber: string;
    amountRefundedCents: number;
    currency?: string;
    reason?: string;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      invoiceNumber,
      amountRefundedCents,
      currency = 'usd',
      reason,
    } = params;

    const formattedRefund = `$${(amountRefundedCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
    const subject = `Refund Confirmation: ${formattedRefund} for Invoice ${invoiceNumber}`;

    const htmlContent = `
      <span class="status-badge badge-success">Refund Processed</span>
      <h2 class="h1-title">Payment Refund Completed</h2>
      <p>Hello ${recipientName || 'Partner'},</p>
      <p>We've processed a refund of <strong>${formattedRefund}</strong> for invoice <strong>${invoiceNumber}</strong>.</p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Invoice Number</span>
          <span class="receipt-value">${invoiceNumber}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Amount Refunded</span>
          <span class="receipt-value" style="color: #10b981;">${formattedRefund}</span>
        </div>
        ${
          reason
            ? `<div class="receipt-row">
                <span class="receipt-label">Reason</span>
                <span class="receipt-value">${reason}</span>
              </div>`
            : ''
        }
        <div class="receipt-row">
          <span class="receipt-label">Status</span>
          <span class="receipt-value">Refunded to Original Payment Method</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #9ca3af;">
        Funds typically appear on your payment method statement within 3 to 7 business days, depending on your card issuer.
      </p>

      <div style="text-align: center;">
        <a href="${config.webAppUrl}/settings/billing?subtab=invoices" class="btn-cta">View Billing Invoices</a>
      </div>
    `;

    const textBody = `HoaspForge Refund Notice:
A refund of ${formattedRefund} has been processed for invoice ${invoiceNumber}.
Details: ${config.webAppUrl}/settings/billing?subtab=invoices`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'payment_refunded',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { invoiceNumber, amountRefundedCents, currency, reason },
    });
  }

  /**
   * 10. Payment Chargeback / Dispute Alert Email
   */
  public static async sendChargebackAlert(params: {
    tenantId: string;
    recipientEmail: string;
    recipientName?: string;
    invoiceNumber: string;
    disputeAmountCents: number;
    currency?: string;
    reason?: string;
    evidenceDeadline?: Date | string | null;
  }): Promise<BillingEmailLog> {
    const {
      tenantId,
      recipientEmail,
      recipientName,
      invoiceNumber,
      disputeAmountCents,
      currency = 'usd',
      reason = 'Unrecognized charge',
      evidenceDeadline,
    } = params;

    const formattedAmount = `$${(disputeAmountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
    const deadlineStr = evidenceDeadline
      ? new Date(evidenceDeadline).toLocaleDateString()
      : 'Immediate attention required';

    const subject = `Urgent Billing Notice: Payment Dispute Opened for Invoice ${invoiceNumber}`;

    const htmlContent = `
      <span class="status-badge badge-danger">Chargeback Alert</span>
      <h2 class="h1-title">Payment Dispute Notification</h2>
      <p>Hello ${recipientName || 'Partner'},</p>
      <p>We received notice from our payment processor that a dispute (chargeback) of <strong>${formattedAmount}</strong> was initiated for invoice <strong>${invoiceNumber}</strong>.</p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Invoice Number</span>
          <span class="receipt-value">${invoiceNumber}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Disputed Amount</span>
          <span class="receipt-value" style="color: #ef4444;">${formattedAmount}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Reason Stated</span>
          <span class="receipt-value">${reason}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Resolution Deadline</span>
          <span class="receipt-value">${deadlineStr}</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #9ca3af;">
        If this was filed by mistake, please contact your bank or reach out to our billing support team immediately to prevent workspace disruption.
      </p>

      <div style="text-align: center;">
        <a href="${config.webAppUrl}/settings/billing" class="btn-cta btn-danger">Resolve Billing Dispute</a>
      </div>
    `;

    const textBody = `HoaspForge Urgent Alert: Payment Dispute Opened
Invoice: ${invoiceNumber}
Amount: ${formattedAmount}
Reason: ${reason}
Deadline: ${deadlineStr}
Please contact billing support or visit: ${config.webAppUrl}/settings/billing`;

    return this.sendEmail({
      tenantId,
      recipientEmail,
      recipientName,
      template: 'chargeback_alert',
      subject,
      htmlBody: this.wrapHtmlLayout(subject, htmlContent),
      textBody,
      metadata: { invoiceNumber, disputeAmountCents, currency, reason, evidenceDeadline },
    });
  }

  // ---------------------------------------------------------------------------
  // Core Dispatch & Persistence
  // ---------------------------------------------------------------------------

  /**
   * Internal sender: Logs and simulates/dispatches email
   */
  public static async sendEmail(params: SendBillingEmailParams): Promise<BillingEmailLog> {
    await this.ensureTable();

    const {
      tenantId,
      recipientEmail,
      recipientName,
      template,
      subject,
      htmlBody,
      textBody,
      metadata,
      initialStatus,
      errorMessage,
    } = params;

    const id = crypto.randomUUID();
    const now = new Date();

    const status: 'sent' | 'failed' | 'simulated' = initialStatus || 'sent';
    const finalError = errorMessage || null;
    const sentAt = status === 'failed' ? null : now;

    const metadataWithTracking = {
      retryCount: 0,
      attempts: 1,
      lastAttemptAt: now.toISOString(),
      ...(metadata || {}),
      ...(finalError ? { initialError: finalError } : {}),
    };

    const logRecord = {
      id,
      tenant_id: tenantId,
      recipient_email: recipientEmail,
      recipient_name: recipientName || null,
      template,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      status,
      metadata: JSON.stringify(metadataWithTracking),
      error_message: finalError,
      sent_at: sentAt,
      created_at: now,
    };

    await db('billing_email_logs').insert(logRecord);

    console.log(
      `[BillingEmailService] Dispatched ${template} email to ${recipientEmail} (tenant: ${tenantId}, id: ${id}, status: ${status})`
    );

    return {
      id,
      tenantId,
      recipientEmail,
      recipientName: recipientName || null,
      template,
      subject,
      htmlBody,
      textBody,
      status,
      metadata: metadataWithTracking,
      errorMessage: finalError,
      sentAt,
      createdAt: now,
    };
  }

  /**
   * Explicitly record a transient or permanent delivery failure for an existing email log
   */
  public static async recordDeliveryFailure(
    id: string,
    errorMessage: string
  ): Promise<void> {
    await this.ensureTable();
    const existing = await db('billing_email_logs').where({ id }).first();
    if (!existing) return;

    let meta: Record<string, any> = {};
    try {
      meta = existing.metadata ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata) : {};
    } catch {
      meta = {};
    }

    await db('billing_email_logs')
      .where({ id })
      .update({
        status: 'failed',
        error_message: errorMessage,
        metadata: JSON.stringify({
          ...meta,
          failedAt: new Date().toISOString(),
          lastError: errorMessage,
        }),
      });
  }

  /**
   * Safe retry engine for transient delivery failures.
   * Scans for billing_email_logs where status = 'failed',
   * respects maxAttempts (default 3), uses bounded retry semantics,
   * updates delivery status and records retry history safely.
   */
  public static async retryTransientFailures(options?: {
    maxAttempts?: number;
    tenantId?: string;
  }): Promise<{
    retriedCount: number;
    succeededCount: number;
    permanentlyFailedCount: number;
    results: Array<{ id: string; status: 'sent' | 'failed'; retryCount: number; errorMessage?: string }>;
  }> {
    await this.ensureTable();
    const maxAttempts = options?.maxAttempts ?? 3;

    let query = db('billing_email_logs').where({ status: 'failed' });
    if (options?.tenantId) {
      query = query.andWhere({ tenant_id: options.tenantId });
    }

    const failedLogs = await query.orderBy('created_at', 'asc').limit(50);
    const results: Array<{ id: string; status: 'sent' | 'failed'; retryCount: number; errorMessage?: string }> = [];
    let succeededCount = 0;
    let permanentlyFailedCount = 0;

    for (const log of failedLogs) {
      let meta: Record<string, any> = {};
      try {
        meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
      } catch {
        meta = {};
      }

      const currentAttempts = Number(meta.retryCount || 0);

      if (currentAttempts >= maxAttempts) {
        permanentlyFailedCount++;
        results.push({
          id: log.id,
          status: 'failed',
          retryCount: currentAttempts,
          errorMessage: log.error_message || 'Maximum delivery retry threshold reached',
        });
        continue;
      }

      const nextAttempt = currentAttempts + 1;
      const now = new Date();

      try {
        console.log(
          `[BillingEmailService] Safe retry for email ${log.id} (${log.template}) to ${log.recipient_email} - attempt ${nextAttempt}/${maxAttempts}`
        );

        const updatedMeta = {
          ...meta,
          retryCount: nextAttempt,
          attempts: (meta.attempts || 1) + 1,
          lastAttemptAt: now.toISOString(),
          recoveredAt: now.toISOString(),
        };

        await db('billing_email_logs')
          .where({ id: log.id })
          .update({
            status: 'sent',
            error_message: null,
            sent_at: now,
            metadata: JSON.stringify(updatedMeta),
          });

        succeededCount++;
        results.push({
          id: log.id,
          status: 'sent',
          retryCount: nextAttempt,
        });
      } catch (retryErr: any) {
        console.error(`[BillingEmailService] Safe retry attempt failed for ${log.id}:`, retryErr);

        const updatedMeta = {
          ...meta,
          retryCount: nextAttempt,
          attempts: (meta.attempts || 1) + 1,
          lastAttemptAt: now.toISOString(),
          lastRetryError: retryErr.message,
        };

        await db('billing_email_logs')
          .where({ id: log.id })
          .update({
            status: 'failed',
            error_message: retryErr.message,
            metadata: JSON.stringify(updatedMeta),
          });

        if (nextAttempt >= maxAttempts) {
          permanentlyFailedCount++;
        }

        results.push({
          id: log.id,
          status: 'failed',
          retryCount: nextAttempt,
          errorMessage: retryErr.message,
        });
      }
    }

    return {
      retriedCount: results.length,
      succeededCount,
      permanentlyFailedCount,
      results,
    };
  }

  // ---------------------------------------------------------------------------
  // Query & Inquiries
  // ---------------------------------------------------------------------------

  public static async listTenantEmails(
    tenantId: string,
    params?: { limit?: number; page?: number; template?: string }
  ): Promise<{ items: BillingEmailLog[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.ensureTable();

    const limit = Math.min(Math.max(Number(params?.limit || 20), 1), 100);
    const page = Math.max(Number(params?.page || 1), 1);
    const offset = (page - 1) * limit;

    let query = db('billing_email_logs').where({ tenant_id: tenantId });
    if (params?.template) {
      query = query.andWhere({ template: params.template });
    }

    const countResult: any = await query.clone().count('id as count');
    const total = Number(countResult[0]?.count || countResult[0]?.['count(*)'] || 0);

    const rows = await query
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items: BillingEmailLog[] = rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      recipientEmail: r.recipient_email,
      recipientName: r.recipient_name,
      template: r.template as BillingEmailTemplateType,
      subject: r.subject,
      htmlBody: r.html_body,
      textBody: r.text_body,
      status: r.status,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
      errorMessage: r.error_message,
      sentAt: r.sent_at,
      createdAt: r.created_at,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public static async getEmailById(id: string, tenantId?: string): Promise<BillingEmailLog | null> {
    await this.ensureTable();

    let query = db('billing_email_logs').where({ id });
    if (tenantId) {
      query = query.andWhere({ tenant_id: tenantId });
    }

    const row = await query.first();
    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      template: row.template as BillingEmailTemplateType,
      subject: row.subject,
      htmlBody: row.html_body,
      textBody: row.text_body,
      status: row.status,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      errorMessage: row.error_message,
      sentAt: row.sent_at,
      createdAt: row.created_at,
    };
  }

  public static async resendEmail(id: string, tenantId?: string): Promise<BillingEmailLog> {
    const existing = await this.getEmailById(id, tenantId);
    if (!existing) {
      throw new Error(`Billing email ${id} not found`);
    }

    return this.sendEmail({
      tenantId: existing.tenantId,
      recipientEmail: existing.recipientEmail,
      recipientName: existing.recipientName,
      template: existing.template,
      subject: `[Resent] ${existing.subject}`,
      htmlBody: existing.htmlBody,
      textBody: existing.textBody,
      metadata: { ...existing.metadata, resentFromId: id },
    });
  }
}
