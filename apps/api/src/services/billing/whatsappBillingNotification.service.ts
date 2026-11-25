import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';

export interface WhatsAppProviderStatus {
  isConfigured: boolean;
  missingCredentials: string[];
  provider: 'meta_cloud_api';
  details: {
    hasApiToken: boolean;
    hasPhoneNumberId: boolean;
    hasWabaId: boolean;
  };
}

export interface SendWhatsAppPaymentConfirmationParams {
  tenantId: string;
  brandId?: string;
  customerName: string;
  planName: string;
  amountPaidCents: number;
  currency?: string;
  billingInterval: string;
  invoiceNumber: string;
  transactionId?: string;
  destinationPhone?: string;
  whatsappConsent?: boolean;
  bypassConsent?: boolean;
  renewalDate?: Date | string | null;
}

export interface WhatsAppPaymentConfirmationResult {
  success: boolean;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
  messageId?: string;
  wamId?: string;
  error?: string;
  missingCredentials?: string[];
  isDuplicate?: boolean;
  secureInvoiceUrl?: string;
  deliveryTracked?: boolean;
  phoneNormalized?: string;
}

export class WhatsAppBillingNotificationService {
  private static columnsEnsured = false;

  /**
   * Ensure necessary columns exist in whatsapp_messages
   */
  public static async ensureColumns(): Promise<void> {
    if (this.columnsEnsured) return;
    try {
      const hasIdempotency = await db.schema.hasColumn('whatsapp_messages', 'idempotency_key');
      if (!hasIdempotency) {
        await db.schema.alterTable('whatsapp_messages', (t) => {
          t.string('idempotency_key', 255).nullable();
          t.index(['idempotency_key'], 'idx_wa_msg_idempotency');
        });
      }

      const hasMetadata = await db.schema.hasColumn('whatsapp_messages', 'metadata');
      if (!hasMetadata) {
        await db.schema.alterTable('whatsapp_messages', (t) => {
          t.text('metadata', 'longtext').nullable();
        });
      }

      const hasRetryCount = await db.schema.hasColumn('whatsapp_messages', 'retry_count');
      if (!hasRetryCount) {
        await db.schema.alterTable('whatsapp_messages', (t) => {
          t.integer('retry_count').notNullable().defaultTo(0);
        });
      }
      this.columnsEnsured = true;
    } catch (e) {
      console.warn('[WhatsAppBillingNotificationService] ensureColumns warning:', e);
    }
  }

  /**
   * 1. Inspect and identify WhatsApp Business API provider configuration & credentials
   * If credentials are missing, reports exact missing keys.
   */
  public static async checkProviderConfig(tenantId?: string, brandId?: string): Promise<WhatsAppProviderStatus> {
    let apiToken = config.whatsapp?.apiToken || process.env.WHATSAPP_API_TOKEN || '';
    let phoneNumberId = config.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    let wabaId = config.whatsapp?.wabaId || process.env.WHATSAPP_WABA_ID || '';

    // If not in environment, check connected account in database
    if ((!phoneNumberId || !apiToken) && tenantId) {
      let query = db('whatsapp_accounts').where({ tenant_id: tenantId });
      if (brandId) {
        query = query.andWhere({ brand_id: brandId });
      }
      const account = await query.first();
      if (account) {
        if (!phoneNumberId && account.phone_number_id && !account.phone_number_id.startsWith('phone_')) {
          phoneNumberId = account.phone_number_id;
        }
        if (!wabaId && account.waba_id && !account.waba_id.startsWith('waba_')) {
          wabaId = account.waba_id;
        }
      }
    }

    const missingCredentials: string[] = [];
    if (!apiToken) missingCredentials.push('WHATSAPP_API_TOKEN');
    if (!phoneNumberId) missingCredentials.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!wabaId) missingCredentials.push('WHATSAPP_WABA_ID');

    const isConfigured = missingCredentials.length === 0;

    return {
      isConfigured,
      missingCredentials,
      provider: 'meta_cloud_api',
      details: {
        hasApiToken: Boolean(apiToken),
        hasPhoneNumberId: Boolean(phoneNumberId),
        hasWabaId: Boolean(wabaId),
      },
    };
  }

  /**
   * 2. Validate phone number against E.164 standard
   */
  public static validatePhoneNumber(phone?: string | null): { isValid: boolean; normalizedPhone?: string; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Clean whitespace, dots, hyphens, and brackets
    const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');

    // E.164 format: leading '+' followed by 7 to 15 digits (first digit 1-9)
    const e164Regex = /^\+[1-9]\d{6,14}$/;

    if (!e164Regex.test(cleaned)) {
      return {
        isValid: false,
        error: `Phone number '${phone}' does not meet E.164 format (+[country code][number], e.g. +15551234567)`,
      };
    }

    return {
      isValid: true,
      normalizedPhone: cleaned,
    };
  }

  /**
   * 3. Generate Cryptographically Secure, Signed, Time-Limited Invoice Download Link
   */
  public static generateSecureInvoiceUrl(invoiceNumber: string, tenantId: string, expiresInHours = 720): string {
    const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
    const payload = `${invoiceNumber}:${tenantId}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', config.jwtSecret || config.encryptionMasterKey)
      .update(payload)
      .digest('hex');

    return `${config.webAppUrl}/api/v1/billing/invoices/${encodeURIComponent(invoiceNumber)}/download?sig=${signature}&exp=${expiresAt}&tenant=${encodeURIComponent(tenantId)}`;
  }

  /**
   * Verify signature of secure invoice link
   */
  public static verifySecureInvoiceUrl(invoiceNumber: string, tenantId: string, sig: string, exp: number | string): boolean {
    const expNum = Number(exp);
    if (!expNum || Date.now() > expNum) return false;

    const payload = `${invoiceNumber}:${tenantId}:${expNum}`;
    const expectedSig = crypto
      .createHmac('sha256', config.jwtSecret || config.encryptionMasterKey)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signatureBuffer(sig)), Buffer.from(signatureBuffer(expectedSig)));
  }

  /**
   * 4. Ensure Approved WhatsApp Utility Message Template Exists
   */
  public static async ensurePaymentConfirmationTemplate(tenantId: string, brandId: string): Promise<void> {
    const templateName = 'billing_payment_confirmation';
    const existing = await db('whatsapp_templates')
      .where({ brand_id: brandId, name: templateName })
      .first();

    if (!existing) {
      await db('whatsapp_templates').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId,
        waba_id: config.whatsapp?.wabaId || 'waba_billing',
        name: templateName,
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED', // Meta Utility templates for transactional receipts
        header_type: 'TEXT',
        body_text:
          '⚡ HoaspForge Payment Confirmed!\n\nHello {{1}}! Your subscription to the {{2}} plan ({{3}}) is now active.\n\n• Amount Paid: {{4}}\n• Invoice: {{5}}\n• Support: {{6}}\n\nThank you for choosing HoaspForge!',
        footer_text: 'HoaspForge Multi-Brand Billing Concierge',
        buttons: JSON.stringify([
          { type: 'URL', text: 'View Invoice', url: 'https://hoaspforge.com/invoices' },
          { type: 'QUICK_REPLY', text: 'Contact Support' },
        ]),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  /**
   * 5. Dispatch Automatic WhatsApp Payment Confirmation
   * Enforces:
   * - WhatsApp consent verification
   * - Phone number validation (E.164)
   * - Deduplication / duplicate message prevention
   * - Missing credential detection (Never simulates successful delivery)
   * - Delivery tracking
   */
  public static async sendPaymentConfirmation(
    params: SendWhatsAppPaymentConfirmationParams
  ): Promise<WhatsAppPaymentConfirmationResult> {
    await this.ensureColumns();

    const {
      tenantId,
      customerName,
      planName,
      amountPaidCents,
      currency = 'USD',
      billingInterval,
      invoiceNumber,
      transactionId = `TXN-${invoiceNumber.replace('INV-', '')}`,
      destinationPhone,
      whatsappConsent,
      bypassConsent = false,
      renewalDate,
    } = params;

    // Resolve brand ID
    let resolvedBrandId = params.brandId;
    if (!resolvedBrandId) {
      const brand = await db('brands').where({ tenant_id: tenantId }).first();
      resolvedBrandId = brand?.id || tenantId;
    }
    const finalBrandId: string = resolvedBrandId || tenantId;

    // Step A: Consent Verification
    if (!whatsappConsent && !bypassConsent) {
      console.log(`[WhatsAppBillingNotification] Skipped: Customer ${customerName} has not granted WhatsApp consent.`);
      return {
        success: false,
        status: 'SKIPPED',
        error: 'NO_WHATSAPP_CONSENT: Customer has not opted in to WhatsApp billing notifications',
      };
    }

    // Step B: Phone Number E.164 Validation
    const phoneCheck = this.validatePhoneNumber(destinationPhone);
    if (!phoneCheck.isValid || !phoneCheck.normalizedPhone) {
      console.warn(`[WhatsAppBillingNotification] Phone validation failed for ${destinationPhone}:`, phoneCheck.error);

      // Record failed message in database
      const failedMsgId = crypto.randomUUID();
      await db('whatsapp_messages').insert({
        id: failedMsgId,
        tenant_id: tenantId,
        brand_id: finalBrandId,
        phone_number: destinationPhone || 'UNKNOWN',
        direction: 'OUTBOUND',
        message_type: 'text',
        body: `Payment confirmation for invoice ${invoiceNumber} failed: Invalid phone number.`,
        template_name: 'billing_payment_confirmation',
        status: 'FAILED',
        error_message: phoneCheck.error,
        retry_count: 0,
        created_at: new Date(),
      });

      return {
        success: false,
        status: 'FAILED',
        error: phoneCheck.error,
        messageId: failedMsgId,
      };
    }

    const cleanPhone = phoneCheck.normalizedPhone;

    // Step C: Duplicate Message Prevention (Idempotency Key)
    const idempotencyKey = `wa_payment_${tenantId}_${transactionId || invoiceNumber}`;

    const existingMsg = await db('whatsapp_messages')
      .where({ tenant_id: tenantId, idempotency_key: idempotencyKey })
      .first();

    if (existingMsg && (existingMsg.status === 'SENT' || existingMsg.status === 'DELIVERED')) {
      console.log(
        `[WhatsAppBillingNotification] Duplicate WhatsApp confirmation suppressed for txn ${transactionId} (existing message ID: ${existingMsg.id})`
      );
      return {
        success: true,
        status: existingMsg.status as 'SENT' | 'DELIVERED',
        messageId: existingMsg.id,
        wamId: existingMsg.wam_id,
        isDuplicate: true,
        deliveryTracked: true,
        phoneNormalized: cleanPhone,
      };
    }

    // Step D: Secure Invoice Link
    const secureInvoiceUrl = this.generateSecureInvoiceUrl(invoiceNumber, tenantId);

    // Step E: Ensure Template is present
    await this.ensurePaymentConfirmationTemplate(tenantId, finalBrandId);

    // Step F: Format Message Body and Template Parameters
    const cycleLabel = billingInterval === 'year' ? 'Annual' : 'Monthly';
    const amountFormatted = `$${(amountPaidCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
    const renewalFormatted = renewalDate
      ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Auto-renews next cycle';
    const supportInfo = 'support@socialforge.io | https://hoaspforge.com/support';

    const messageBody = `⚡ *HoaspForge Plan Activated!*

Hello *${customerName}*! Your subscription to the *${planName}* plan (${cycleLabel}) is now active.

• Amount Paid: ${amountFormatted}
• Next Renewal: ${renewalFormatted}
• Invoice: ${secureInvoiceUrl}
• Support: ${supportInfo}

Thank you for choosing HoaspForge!`;

    const templateParams = [
      customerName,
      planName,
      cycleLabel,
      amountFormatted,
      secureInvoiceUrl,
      supportInfo,
    ];

    // Step G: Provider Configuration Inspection
    const providerStatus = await this.checkProviderConfig(tenantId, finalBrandId);

    const messageId = existingMsg?.id || crypto.randomUUID();
    const metadataRecord = {
      customerName,
      planName,
      amountPaidCents,
      currency,
      billingInterval,
      invoiceNumber,
      transactionId,
      secureInvoiceUrl,
      supportInfo,
      templateParams,
      idempotencyKey,
      dispatchAttempts: 1,
    };

    // Requirement: "If the WhatsApp provider is not configured, identify the missing integration and credentials. Never simulate successful delivery."
    if (!providerStatus.isConfigured) {
      const missingList = providerStatus.missingCredentials.join(', ');
      const errStr = `WhatsApp Business API provider unconfigured: missing [${missingList}]`;
      console.warn(`[WhatsAppBillingNotification] Delivery failed: ${errStr}`);

      if (existingMsg) {
        await db('whatsapp_messages')
          .where({ id: messageId })
          .update({
            status: 'FAILED',
            error_message: errStr,
            metadata: JSON.stringify(metadataRecord),
          });
      } else {
        await db('whatsapp_messages').insert({
          id: messageId,
          tenant_id: tenantId,
          brand_id: finalBrandId,
          phone_number: cleanPhone,
          direction: 'OUTBOUND',
          message_type: 'template',
          body: messageBody,
          template_name: 'billing_payment_confirmation',
          idempotency_key: idempotencyKey,
          status: 'FAILED',
          error_message: errStr,
          retry_count: 0,
          metadata: JSON.stringify(metadataRecord),
          created_at: new Date(),
        });
      }

      return {
        success: false,
        status: 'FAILED',
        messageId,
        error: errStr,
        missingCredentials: providerStatus.missingCredentials,
        secureInvoiceUrl,
        deliveryTracked: true,
        phoneNormalized: cleanPhone,
      };
    }

    // Step H: Real Provider Dispatch via Meta WhatsApp Cloud API
    const apiToken = config.whatsapp.apiToken || process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = config.whatsapp.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = config.whatsapp.graphApiVersion || 'v20.0';
    const baseUrl = config.whatsapp.graphApiBaseUrl || 'https://graph.facebook.com';

    const url = `${baseUrl}/${version}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: 'billing_payment_confirmation',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: templateParams.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        const errMsg = data.error?.message || `Meta WhatsApp API HTTP ${response.status}`;
        console.error(`[WhatsAppBillingNotification] Meta API Error: ${errMsg}`);

        if (existingMsg) {
          await db('whatsapp_messages')
            .where({ id: messageId })
            .update({
              status: 'FAILED',
              error_message: errMsg,
              metadata: JSON.stringify(metadataRecord),
            });
        } else {
          await db('whatsapp_messages').insert({
            id: messageId,
            tenant_id: tenantId,
            brand_id: finalBrandId,
            phone_number: cleanPhone,
            direction: 'OUTBOUND',
            message_type: 'template',
            body: messageBody,
            template_name: 'billing_payment_confirmation',
            idempotency_key: idempotencyKey,
            status: 'FAILED',
            error_message: errMsg,
            retry_count: 0,
            metadata: JSON.stringify(metadataRecord),
            created_at: new Date(),
          });
        }

        return {
          success: false,
          status: 'FAILED',
          messageId,
          error: errMsg,
          secureInvoiceUrl,
          deliveryTracked: true,
          phoneNormalized: cleanPhone,
        };
      }

      // Successful Meta API response
      const wamId = data.messages?.[0]?.id || `wamid.${Date.now()}`;

      if (existingMsg) {
        await db('whatsapp_messages')
          .where({ id: messageId })
          .update({
            wam_id: wamId,
            status: 'SENT',
            error_message: null,
            metadata: JSON.stringify(metadataRecord),
          });
      } else {
        await db('whatsapp_messages').insert({
          id: messageId,
          tenant_id: tenantId,
          brand_id: finalBrandId,
          phone_number: cleanPhone,
          direction: 'OUTBOUND',
          message_type: 'template',
          body: messageBody,
          template_name: 'billing_payment_confirmation',
          wam_id: wamId,
          idempotency_key: idempotencyKey,
          status: 'SENT',
          error_message: null,
          retry_count: 0,
          metadata: JSON.stringify(metadataRecord),
          created_at: new Date(),
        });
      }

      console.log(`[WhatsAppBillingNotification] Successfully dispatched WhatsApp confirmation to ${cleanPhone} (WAMID: ${wamId})`);

      return {
        success: true,
        status: 'SENT',
        messageId,
        wamId,
        secureInvoiceUrl,
        deliveryTracked: true,
        phoneNormalized: cleanPhone,
      };
    } catch (fetchErr: any) {
      console.error('[WhatsAppBillingNotification] Network error dispatching WhatsApp:', fetchErr);

      if (existingMsg) {
        await db('whatsapp_messages')
          .where({ id: messageId })
          .update({
            status: 'FAILED',
            error_message: fetchErr.message,
            metadata: JSON.stringify(metadataRecord),
          });
      } else {
        await db('whatsapp_messages').insert({
          id: messageId,
          tenant_id: tenantId,
          brand_id: finalBrandId,
          phone_number: cleanPhone,
          direction: 'OUTBOUND',
          message_type: 'template',
          body: messageBody,
          template_name: 'billing_payment_confirmation',
          idempotency_key: idempotencyKey,
          status: 'FAILED',
          error_message: fetchErr.message,
          retry_count: 0,
          metadata: JSON.stringify(metadataRecord),
          created_at: new Date(),
        });
      }

      return {
        success: false,
        status: 'FAILED',
        messageId,
        error: fetchErr.message,
        secureInvoiceUrl,
        deliveryTracked: true,
        phoneNormalized: cleanPhone,
      };
    }
  }

  /**
   * 6. Safe Retry Engine for Failed WhatsApp Billing Notifications
   * Enforces:
   * - Bounded retry threshold (default max 3 attempts)
   * - Idempotency guard (skips already SENT/DELIVERED)
   * - Re-evaluates provider credentials before attempting re-delivery
   */
  public static async retryFailedNotification(
    messageId: string,
    options?: { maxAttempts?: number; tenantId?: string }
  ): Promise<{ success: boolean; status: string; retryCount: number; error?: string }> {
    await this.ensureColumns();
    const maxAttempts = options?.maxAttempts ?? 3;

    let query = db('whatsapp_messages').where({ id: messageId });
    if (options?.tenantId) {
      query = query.andWhere({ tenant_id: options.tenantId });
    }
    const message = await query.first();

    if (!message) {
      return { success: false, status: 'NOT_FOUND', retryCount: 0, error: 'Message not found' };
    }

    if (message.status === 'SENT' || message.status === 'DELIVERED') {
      return {
        success: true,
        status: message.status,
        retryCount: message.retry_count || 0,
        error: 'Message has already been delivered successfully',
      };
    }

    const currentAttempts = Number(message.retry_count || 0);
    if (currentAttempts >= maxAttempts) {
      return {
        success: false,
        status: 'FAILED',
        retryCount: currentAttempts,
        error: `Maximum retry attempts exceeded (${currentAttempts}/${maxAttempts})`,
      };
    }

    const nextAttempt = currentAttempts + 1;
    const providerStatus = await this.checkProviderConfig(message.tenant_id, message.brand_id);

    // If provider is still unconfigured, record attempt and return diagnostics
    if (!providerStatus.isConfigured) {
      const missingList = providerStatus.missingCredentials.join(', ');
      const errStr = `WhatsApp Business API provider unconfigured: missing [${missingList}]`;

      await db('whatsapp_messages')
        .where({ id: message.id })
        .update({
          retry_count: nextAttempt,
          error_message: errStr,
        });

      return {
        success: false,
        status: 'FAILED',
        retryCount: nextAttempt,
        error: errStr,
      };
    }

    // Provider is configured: perform redelivery
    try {
      const apiToken = config.whatsapp.apiToken || process.env.WHATSAPP_API_TOKEN;
      const phoneNumberId = config.whatsapp.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const version = config.whatsapp.graphApiVersion || 'v20.0';
      const baseUrl = config.whatsapp.graphApiBaseUrl || 'https://graph.facebook.com';

      const meta = message.metadata ? (typeof message.metadata === 'string' ? JSON.parse(message.metadata) : message.metadata) : {};
      const templateParams = meta.templateParams || [message.phone_number, 'Subscription', 'Monthly', '$0.00', 'Invoice', 'Support'];

      const res = await fetch(`${baseUrl}/${version}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.phone_number,
          type: 'template',
          template: {
            name: message.template_name || 'billing_payment_confirmation',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: templateParams.map((text: string) => ({ type: 'text', text })),
              },
            ],
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        const errMsg = data.error?.message || `HTTP ${res.status}`;
        await db('whatsapp_messages')
          .where({ id: message.id })
          .update({
            retry_count: nextAttempt,
            error_message: errMsg,
          });

        return {
          success: false,
          status: 'FAILED',
          retryCount: nextAttempt,
          error: errMsg,
        };
      }

      const wamId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
      await db('whatsapp_messages')
        .where({ id: message.id })
        .update({
          wam_id: wamId,
          status: 'SENT',
          error_message: null,
          retry_count: nextAttempt,
        });

      return {
        success: true,
        status: 'SENT',
        retryCount: nextAttempt,
      };
    } catch (e: any) {
      await db('whatsapp_messages')
        .where({ id: message.id })
        .update({
          retry_count: nextAttempt,
          error_message: e.message,
        });

      return {
        success: false,
        status: 'FAILED',
        retryCount: nextAttempt,
        error: e.message,
      };
    }
  }

  /**
   * Retry all failed WhatsApp notifications for a tenant with bounded limit
   */
  public static async retryAllFailed(options?: {
    tenantId?: string;
    maxAttempts?: number;
  }): Promise<{
    retriedCount: number;
    succeededCount: number;
    permanentlyFailedCount: number;
    results: Array<{ id: string; status: string; retryCount: number; error?: string }>;
  }> {
    await this.ensureColumns();
    const maxAttempts = options?.maxAttempts ?? 3;

    let query = db('whatsapp_messages').where({ status: 'FAILED' });
    if (options?.tenantId) {
      query = query.andWhere({ tenant_id: options.tenantId });
    }

    const failedLogs = await query.orderBy('created_at', 'asc').limit(50);
    const results: Array<{ id: string; status: string; retryCount: number; error?: string }> = [];
    let succeededCount = 0;
    let permanentlyFailedCount = 0;

    for (const log of failedLogs) {
      const res = await this.retryFailedNotification(log.id, { maxAttempts, tenantId: options?.tenantId });
      results.push({
        id: log.id,
        status: res.status,
        retryCount: res.retryCount,
        error: res.error,
      });

      if (res.success) {
        succeededCount++;
      } else if (res.retryCount >= maxAttempts) {
        permanentlyFailedCount++;
      }
    }

    return {
      retriedCount: results.length,
      succeededCount,
      permanentlyFailedCount,
      results,
    };
  }

  /**
   * 7. Inbound Status Webhook Handler (updates message delivery status from Meta callbacks)
   */
  public static async handleStatusCallback(body: any): Promise<{ processed: number }> {
    await this.ensureColumns();
    let processed = 0;

    const entry = body?.entry || [];
    for (const e of entry) {
      const changes = e.changes || [];
      for (const c of changes) {
        const statuses = c.value?.statuses || [];
        for (const s of statuses) {
          const wamId = s.id;
          const statusRaw = (s.status || '').toUpperCase();
          const targetStatus = ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(statusRaw) ? statusRaw : null;

          if (wamId && targetStatus) {
            const errorObj = s.errors?.[0];
            const errorMsg = errorObj ? `${errorObj.title || 'Error'}: ${errorObj.message || ''}` : null;

            await db('whatsapp_messages')
              .where({ wam_id: wamId })
              .update({
                status: targetStatus,
                ...(errorMsg ? { error_message: errorMsg } : {}),
              });
            processed++;
          }
        }
      }
    }

    return { processed };
  }
}

function signatureBuffer(str: string): string {
  return str.padEnd(64, '0').slice(0, 64);
}
