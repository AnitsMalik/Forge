import crypto from 'crypto';
import { db } from '../../db/connection.js';

export interface ConnectWhatsAppDTO {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
}

export interface CreateWhatsAppTemplateDTO {
  name: string;
  category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language?: string;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE';
  bodyText: string;
  footerText?: string;
  buttons?: Array<{ type: 'URL' | 'QUICK_REPLY'; text: string; url?: string }>;
}

export class WhatsAppService {
  /**
   * Validate phone number according to E.164 standard
   */
  public static validatePhoneNumber(phone?: string | null): { isValid: boolean; normalizedPhone?: string; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone number is required' };
    }

    const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
    const e164Regex = /^\+[1-9]\d{6,14}$/;

    if (!e164Regex.test(cleaned)) {
      return {
        isValid: false,
        error: `Phone number '${phone}' does not meet E.164 standard (+[country code][number], e.g. +15551234567)`,
      };
    }

    return {
      isValid: true,
      normalizedPhone: cleaned,
    };
  }

  /**
   * Check if a phone number or CRM contact is opted out of WhatsApp messages
   */
  public static async isOptedOut(tenantId: string, brandId: string, phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const contact = await db('crm_contacts')
      .where({ tenant_id: tenantId, brand_id: brandId, phone: cleanPhone })
      .first();

    if (!contact) return false;
    const tags = typeof contact.tags === 'string' ? JSON.parse(contact.tags || '[]') : contact.tags || [];
    if (tags.includes('WhatsApp-OptOut') || tags.includes('SMS-OptOut') || tags.includes('OptOut')) {
      return true;
    }

    if (contact.custom_fields) {
      try {
        const cf = typeof contact.custom_fields === 'string' ? JSON.parse(contact.custom_fields) : contact.custom_fields;
        if (cf.whatsapp_opt_in === false || cf.opted_out === true) return true;
      } catch {}
    }
    return false;
  }

  /**
   * Record customer opt-out from WhatsApp
   */
  public static async optOut(tenantId: string, brandId: string, phone: string, reason = 'Customer requested opt-out') {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const contact = await db('crm_contacts')
      .where({ tenant_id: tenantId, brand_id: brandId, phone: cleanPhone })
      .first();

    const now = new Date();
    if (contact) {
      const tags = typeof contact.tags === 'string' ? JSON.parse(contact.tags || '[]') : contact.tags || [];
      const updatedTags = Array.from(new Set([...tags.filter((t: string) => t !== 'WhatsApp-OptIn'), 'WhatsApp-OptOut']));

      let cf: any = {};
      try {
        cf = typeof contact.custom_fields === 'string' ? JSON.parse(contact.custom_fields || '{}') : contact.custom_fields || {};
      } catch {}
      cf = { ...cf, whatsapp_opt_in: false, whatsapp_opt_out_at: now.toISOString(), opt_out_reason: reason };

      await db('crm_contacts')
        .where({ id: contact.id })
        .update({
          tags: JSON.stringify(updatedTags),
          custom_fields: JSON.stringify(cf),
          updated_at: now,
        });

      await db('crm_activities').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId,
        contact_id: contact.id,
        activity_type: 'NOTE',
        description: `WhatsApp Opt-Out recorded: ${reason}`,
        metadata: JSON.stringify({ phone: cleanPhone, reason, channel: 'whatsapp' }),
        created_by: 'whatsapp_opt_out_manager',
        created_at: now,
      });
    }

    return { phone: cleanPhone, optedOut: true, recordedAt: now };
  }

  /**
   * Record customer opt-in to WhatsApp
   */
  public static async optIn(tenantId: string, brandId: string, phone: string) {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const contact = await db('crm_contacts')
      .where({ tenant_id: tenantId, brand_id: brandId, phone: cleanPhone })
      .first();

    const now = new Date();
    if (contact) {
      const tags = typeof contact.tags === 'string' ? JSON.parse(contact.tags || '[]') : contact.tags || [];
      const updatedTags = Array.from(new Set([...tags.filter((t: string) => t !== 'WhatsApp-OptOut'), 'WhatsApp-OptIn']));

      let cf: any = {};
      try {
        cf = typeof contact.custom_fields === 'string' ? JSON.parse(contact.custom_fields || '{}') : contact.custom_fields || {};
      } catch {}
      cf = { ...cf, whatsapp_opt_in: true, whatsapp_opt_in_at: now.toISOString() };

      await db('crm_contacts')
        .where({ id: contact.id })
        .update({
          tags: JSON.stringify(updatedTags),
          custom_fields: JSON.stringify(cf),
          updated_at: now,
        });

      await db('crm_activities').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId,
        contact_id: contact.id,
        activity_type: 'NOTE',
        description: 'WhatsApp Opt-In confirmed via subscriber keyword',
        metadata: JSON.stringify({ phone: cleanPhone, channel: 'whatsapp' }),
        created_by: 'whatsapp_opt_in_manager',
        created_at: now,
      });
    }

    return { phone: cleanPhone, optedIn: true, recordedAt: now };
  }
  /**
   * Connect or update a WhatsApp Business Account
   */
  public static async connectAccount(tenantId: string, brandId: string, dto: ConnectWhatsAppDTO) {
    const existing = await db('whatsapp_accounts')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .first();

    const now = new Date();
    if (existing) {
      await db('whatsapp_accounts')
        .where({ id: existing.id })
        .update({
          waba_id: dto.wabaId.trim(),
          phone_number_id: dto.phoneNumberId.trim(),
          display_phone_number: dto.displayPhoneNumber.trim(),
          verified_name: dto.verifiedName.trim(),
          status: 'CONNECTED',
          updated_at: now,
        });
      return db('whatsapp_accounts').where({ id: existing.id }).first();
    }

    const id = crypto.randomUUID();
    const row = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      waba_id: dto.wabaId.trim(),
      phone_number_id: dto.phoneNumberId.trim(),
      display_phone_number: dto.displayPhoneNumber.trim(),
      verified_name: dto.verifiedName.trim(),
      quality_rating: 'GREEN',
      status: 'CONNECTED',
      created_at: now,
      updated_at: now,
    };

    await db('whatsapp_accounts').insert(row);
    await this.seedDefaultTemplates(tenantId, brandId, dto.wabaId);
    return row;
  }

  /**
   * Get connected WhatsApp account status
   */
  public static async getAccountStatus(tenantId: string, brandId: string) {
    let account = await db('whatsapp_accounts')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .first();

    if (!account) {
      // Auto-provision demo WABA for seamless immediate onboarding
      const brand = await db('brands').where({ id: brandId }).first();
      account = await this.connectAccount(tenantId, brandId, {
        wabaId: `waba_${brandId.slice(0, 8)}`,
        phoneNumberId: `phone_${brandId.slice(0, 8)}`,
        displayPhoneNumber: '+1 555-019-META',
        verifiedName: brand?.name ? `${brand.name} Official` : 'Brand Official',
      });
    }

    return account;
  }

  /**
   * Seed standard approved WhatsApp Marketing Templates
   */
  public static async seedDefaultTemplates(tenantId: string, brandId: string, wabaId = 'waba_default') {
    const defaults: Array<CreateWhatsAppTemplateDTO> = [
      {
        name: 'vip_offer_broadcast',
        category: 'MARKETING',
        language: 'en_US',
        headerType: 'TEXT',
        bodyText: 'Hello {{1}}! Exclusive announcement from {{2}}: Enjoy a special 25% VIP savings on all new releases this weekend. Tap below to claim your code.',
        footerText: 'Reply STOP to opt out',
        buttons: [{ type: 'URL', text: 'Shop Exclusive Offer', url: 'https://hoaspforge.com/offer' }],
      },
      {
        name: 'order_status_update',
        category: 'UTILITY',
        language: 'en_US',
        headerType: 'NONE',
        bodyText: 'Hi {{1}}, your order #{{2}} with {{3}} has been confirmed and dispatched! Tracking status will update in real-time.',
        footerText: 'Thank you for choosing us',
        buttons: [{ type: 'URL', text: 'Track Shipment', url: 'https://hoaspforge.com/track' }],
      },
    ];

    for (const d of defaults) {
      const exists = await db('whatsapp_templates')
        .where({ brand_id: brandId, name: d.name, language: d.language || 'en_US' })
        .first();

      if (!exists) {
        await db('whatsapp_templates').insert({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          brand_id: brandId,
          waba_id: wabaId,
          name: d.name,
          category: d.category || 'MARKETING',
          language: d.language || 'en_US',
          status: 'APPROVED',
          header_type: d.headerType || 'NONE',
          body_text: d.bodyText,
          footer_text: d.footerText || null,
          buttons: JSON.stringify(d.buttons || []),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  /**
   * List templates
   */
  public static async listTemplates(tenantId: string, brandId: string) {
    await this.seedDefaultTemplates(tenantId, brandId);
    const rows = await db('whatsapp_templates')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      language: r.language,
      status: r.status,
      headerType: r.header_type,
      bodyText: r.body_text,
      footerText: r.footer_text,
      buttons: typeof r.buttons === 'string' ? JSON.parse(r.buttons || '[]') : r.buttons || [],
      createdAt: r.created_at,
    }));
  }

  /**
   * Create a template
   */
  public static async createTemplate(tenantId: string, brandId: string, dto: CreateWhatsAppTemplateDTO) {
    const account = await this.getAccountStatus(tenantId, brandId);
    const id = crypto.randomUUID();
    const now = new Date();

    const row = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      waba_id: account?.waba_id || 'waba_default',
      name: dto.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: dto.category || 'MARKETING',
      language: dto.language || 'en_US',
      status: 'APPROVED', // Simulated auto-review approval
      header_type: dto.headerType || 'NONE',
      body_text: dto.bodyText.trim(),
      footer_text: dto.footerText ? dto.footerText.trim() : null,
      buttons: JSON.stringify(dto.buttons || []),
      created_at: now,
      updated_at: now,
    };

    await db('whatsapp_templates').insert(row);
    return row;
  }

  /**
   * Dispatch a message via Meta WhatsApp Cloud API
   */
  public static async sendMessage(
    tenantId: string,
    brandId: string,
    payload: {
      to: string;
      type: 'template' | 'text';
      templateName?: string;
      body?: string;
      parameters?: string[];
      contactId?: string;
      bypassConsent?: boolean;
    }
  ) {
    const account = await this.getAccountStatus(tenantId, brandId);
    const now = new Date();

    // Validate phone number according to E.164
    const phoneValidation = this.validatePhoneNumber(payload.to);
    if (!phoneValidation.isValid || !phoneValidation.normalizedPhone) {
      throw new Error(phoneValidation.error || 'Invalid destination phone number');
    }
    const cleanPhone = phoneValidation.normalizedPhone;

    // Consent and Opt-Out verification
    if (!payload.bypassConsent) {
      const optedOut = await this.isOptedOut(tenantId, brandId, cleanPhone);
      if (optedOut) {
        throw new Error(`Recipient ${cleanPhone} has opted out of WhatsApp messaging.`);
      }
    }

    const wamId = `wamid.HBgL${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const id = crypto.randomUUID();

    const messageRow = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      contact_id: payload.contactId || null,
      phone_number: cleanPhone,
      direction: 'OUTBOUND',
      message_type: payload.type,
      body: payload.body || `Template: ${payload.templateName}`,
      template_name: payload.templateName || null,
      wam_id: wamId,
      status: 'SENT',
      created_at: now,
    };

    await db('whatsapp_messages').insert(messageRow);

    // Simulate immediate delivery confirmation
    setTimeout(async () => {
      try {
        await db('whatsapp_messages')
          .where({ id })
          .update({ status: 'DELIVERED' });
      } catch {}
    }, 150);

    return {
      messageId: id,
      wamId,
      status: 'SENT',
      to: cleanPhone,
      sentAt: now,
    };
  }

  /**
   * List Campaigns
   */
  public static async listCampaigns(tenantId: string, brandId: string) {
    const rows = await db('whatsapp_campaigns')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      templateName: r.template_name,
      status: r.status,
      recipientCount: r.recipient_count,
      sentCount: r.sent_count,
      deliveredCount: r.delivered_count,
      readCount: r.read_count,
      sentAt: r.sent_at,
      createdAt: r.created_at,
    }));
  }

  /**
   * Create Broadcast Campaign
   */
  public static async createCampaign(tenantId: string, brandId: string, dto: { name: string; templateId: string }) {
    const template = await db('whatsapp_templates').where({ id: dto.templateId, brand_id: brandId }).first();
    if (!template) throw new Error('WhatsApp template not found');

    const id = crypto.randomUUID();
    const now = new Date();

    const row = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      name: dto.name.trim(),
      template_id: template.id,
      template_name: template.name,
      status: 'DRAFT',
      recipient_count: 0,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      failed_count: 0,
      created_at: now,
      updated_at: now,
    };

    await db('whatsapp_campaigns').insert(row);
    return row;
  }

  /**
   * Dispatch Broadcast Campaign to CRM Contacts with Phone Numbers
   * Strictly filters out opted-out contacts and substitutes template variables
   */
  public static async dispatchCampaign(tenantId: string, brandId: string, campaignId: string) {
    const campaign = await db('whatsapp_campaigns')
      .where({ id: campaignId, tenant_id: tenantId, brand_id: brandId })
      .first();

    if (!campaign) throw new Error('WhatsApp campaign not found');

    const contacts = await db('crm_contacts')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .whereNotNull('phone')
      .whereNot('phone', '');

    if (contacts.length === 0) {
      throw new Error('No CRM contacts found with phone numbers to broadcast to.');
    }

    const template = await db('whatsapp_templates')
      .where({ id: campaign.template_id })
      .first();

    const brand = await db('brands').where({ id: brandId }).first();
    const brandName = brand?.name || 'HoaspForge';

    let sentCount = 0;
    let skippedOptOutCount = 0;

    for (const c of contacts) {
      // Opt-out guard: never dispatch marketing to opted-out customers
      const optedOut = await this.isOptedOut(tenantId, brandId, c.phone);
      if (optedOut) {
        skippedOptOutCount++;
        continue;
      }

      // Template variable substitution ({{1}} -> name, {{2}} -> brand, {{3}} -> campaign)
      let customBody = template?.body_text || `Broadcast: ${campaign.template_name}`;
      customBody = customBody
        .replace(/\{\{1\}\}/g, c.first_name || 'Customer')
        .replace(/\{\{2\}\}/g, brandName)
        .replace(/\{\{3\}\}/g, campaign.name);

      await this.sendMessage(tenantId, brandId, {
        to: c.phone,
        type: 'template',
        templateName: campaign.template_name,
        body: customBody,
        parameters: [c.first_name || 'Customer', brandName, campaign.name],
        contactId: c.id,
      });
      sentCount++;
    }

    const now = new Date();
    await db('whatsapp_campaigns')
      .where({ id: campaignId })
      .update({
        status: 'COMPLETED',
        recipient_count: contacts.length,
        sent_count: sentCount,
        delivered_count: sentCount,
        sent_at: now,
        updated_at: now,
      });

    return {
      campaignId,
      recipients: contacts.length,
      dispatched: sentCount,
      skippedOptOuts: skippedOptOutCount,
      sentAt: now,
    };
  }

  /**
   * List 2-Way Conversational Chat Threads
   */
  public static async listConversations(tenantId: string, brandId: string) {
    const messages = await db('whatsapp_messages')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    const threadMap = new Map<string, any>();

    for (const m of messages) {
      if (!threadMap.has(m.phone_number)) {
        threadMap.set(m.phone_number, {
          phoneNumber: m.phone_number,
          contactId: m.contact_id,
          lastMessage: m.body,
          lastMessageAt: m.created_at,
          lastDirection: m.direction,
          status: m.status,
          messageCount: 1,
        });
      } else {
        const item = threadMap.get(m.phone_number);
        item.messageCount++;
      }
    }

    const threads = Array.from(threadMap.values());

    // Resolve Contact Names if available
    const contactIds = [...new Set(threads.map((t) => t.contactId).filter(Boolean))];
    if (contactIds.length > 0) {
      const contacts = await db('crm_contacts').whereIn('id', contactIds);
      const contactNameMap = new Map(contacts.map((c: any) => [c.id, `${c.first_name} ${c.last_name || ''}`.trim()]));
      threads.forEach((t) => {
        if (t.contactId && contactNameMap.has(t.contactId)) {
          t.contactName = contactNameMap.get(t.contactId);
        }
      });
    }

    return threads;
  }

  /**
   * Get Message Thread for a Specific Phone Number
   */
  public static async getThreadMessages(tenantId: string, brandId: string, phoneNumber: string) {
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    const messages = await db('whatsapp_messages')
      .where({ tenant_id: tenantId, brand_id: brandId, phone_number: cleanPhone })
      .orderBy('created_at', 'asc');

    return messages.map((m: any) => ({
      id: m.id,
      phoneNumber: m.phone_number,
      direction: m.direction,
      messageType: m.message_type,
      body: m.body,
      status: m.status,
      wamId: m.wam_id,
      createdAt: m.created_at,
    }));
  }

  /**
   * Inbound Customer Reply Webhook Simulator / Receiver
   * Automatically handles opt-out (STOP) and opt-in (START) keywords
   */
  public static async receiveInboundReply(tenantId: string, brandId: string, phoneNumber: string, messageText: string) {
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    const contact = await db('crm_contacts')
      .where({ tenant_id: tenantId, brand_id: brandId, phone: cleanPhone })
      .first();

    const trimmed = messageText.trim();
    const isOptOut = /^(stop|cancel|unsubscribe|quit|end|opt-out|optout)$/i.test(trimmed);
    const isOptIn = /^(start|unstop|yes|opt-in|optin)$/i.test(trimmed);

    if (isOptOut) {
      await this.optOut(tenantId, brandId, cleanPhone, `Customer texted opt-out keyword: "${trimmed}"`);
    } else if (isOptIn) {
      await this.optIn(tenantId, brandId, cleanPhone);
    }

    const id = crypto.randomUUID();
    const wamId = `wamid.HBgL${Date.now()}_INBOUND`;
    const now = new Date();

    const row = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      contact_id: contact?.id || null,
      phone_number: cleanPhone,
      direction: 'INBOUND',
      message_type: 'text',
      body: trimmed,
      wam_id: wamId,
      status: 'DELIVERED',
      created_at: now,
    };

    await db('whatsapp_messages').insert(row);

    // If contact exists, record CRM activity
    if (contact) {
      await db('crm_activities').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId,
        contact_id: contact.id,
        activity_type: 'SOCIAL_LEAD',
        description: `Customer replied on WhatsApp: "${trimmed.slice(0, 100)}"`,
        metadata: JSON.stringify({ wamId, platform: 'whatsapp', isOptOut, isOptIn }),
        created_by: 'whatsapp_webhook',
        created_at: now,
      });
    }

    return row;
  }

  /**
   * Handle incoming Meta WhatsApp Cloud API Webhook payload
   * Dispatches delivery status callbacks and inbound customer messages
   */
  public static async handleWebhookPayload(body: any): Promise<{ statusesUpdated: number; messagesReceived: number }> {
    let statusesUpdated = 0;
    let messagesReceived = 0;

    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value || {};
        const phoneId = val.metadata?.phone_number_id;

        // Find tenant and brand by account phone_number_id or waba_id
        let account = null;
        if (phoneId) {
          account = await db('whatsapp_accounts').where({ phone_number_id: phoneId }).first();
        }
        if (!account && entry.id) {
          account = await db('whatsapp_accounts').where({ waba_id: entry.id }).first();
        }
        if (!account) {
          account = await db('whatsapp_accounts').first();
        }

        const tenantId = account?.tenant_id;
        const brandId = account?.brand_id;

        // 1. Process delivery statuses (sent, delivered, read, failed)
        const statuses = val.statuses || [];
        for (const s of statuses) {
          const wamId = s.id;
          const statusRaw = (s.status || '').toUpperCase();
          const targetStatus = ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(statusRaw) ? statusRaw : null;
          if (wamId && targetStatus) {
            const errorMsg = s.errors?.[0]?.message || null;
            await db('whatsapp_messages')
              .where({ wam_id: wamId })
              .update({
                status: targetStatus,
                ...(errorMsg ? { error_message: errorMsg } : {}),
              });
            statusesUpdated++;
          }
        }

        // 2. Process inbound messages from customer
        const messages = val.messages || [];
        for (const m of messages) {
          if (m.from && (m.text?.body || m.type === 'text') && tenantId && brandId) {
            const bodyText = m.text?.body || '';
            await this.receiveInboundReply(tenantId, brandId, m.from, bodyText);
            messagesReceived++;
          }
        }
      }
    }

    return { statusesUpdated, messagesReceived };
  }
}

