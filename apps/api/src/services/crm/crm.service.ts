import crypto from 'crypto';
import { db } from '../../db/connection.js';

export interface CreateContactDTO {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status?: 'lead' | 'prospect' | 'customer' | 'churned';
  leadSource?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface CreateDealDTO {
  pipelineId?: string;
  stageId: string;
  contactId?: string;
  title: string;
  value?: number;
  currency?: string;
  expectedCloseDate?: string;
  status?: 'OPEN' | 'WON' | 'LOST';
  notes?: string;
}

export class CrmService {
  /**
   * List contacts with search, status filtering, and pagination
   */
  public static async listContacts(
    tenantId: string,
    brandId: string,
    query: { search?: string; status?: string; leadSource?: string; limit?: number; offset?: number } = {}
  ) {
    let q = db('crm_contacts')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    if (query.status && query.status !== 'ALL') {
      q = q.where({ status: query.status });
    }

    if (query.leadSource && query.leadSource !== 'ALL') {
      q = q.where({ lead_source: query.leadSource });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      q = q.where((builder) => {
        builder
          .where('first_name', 'like', term)
          .orWhere('last_name', 'like', term)
          .orWhere('email', 'like', term)
          .orWhere('company', 'like', term);
      });
    }

    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const offset = Math.max(0, Number(query.offset) || 0);

    const [countResult] = await q.clone().count('* as total');
    const rows = await q.limit(limit).offset(offset);

    const contacts = rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      firstName: r.first_name,
      lastName: r.last_name || '',
      fullName: [r.first_name, r.last_name].filter(Boolean).join(' '),
      email: r.email,
      phone: r.phone,
      company: r.company,
      jobTitle: r.job_title,
      status: r.status,
      leadSource: r.lead_source || 'direct',
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags || [],
      customFields: typeof r.custom_fields === 'string' ? JSON.parse(r.custom_fields || '{}') : r.custom_fields || {},
      lastContactedAt: r.last_contacted_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return {
      contacts,
      total: Number(countResult?.total || 0),
      limit,
      offset,
    };
  }

  /**
   * Retrieve a single contact with associated deals and activity history
   */
  public static async getContact(tenantId: string, brandId: string, contactId: string) {
    const contact = await db('crm_contacts')
      .where({ id: contactId, tenant_id: tenantId, brand_id: brandId })
      .first();

    if (!contact) return null;

    const deals = await db('crm_deals')
      .where({ contact_id: contactId, tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    const activities = await db('crm_activities')
      .where({ contact_id: contactId, tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc')
      .limit(50);

    return {
      ...contact,
      fullName: [contact.first_name, contact.last_name].filter(Boolean).join(' '),
      tags: typeof contact.tags === 'string' ? JSON.parse(contact.tags || '[]') : contact.tags || [],
      customFields: typeof contact.custom_fields === 'string' ? JSON.parse(contact.custom_fields || '{}') : contact.custom_fields || {},
      deals: deals.map((d: any) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value),
        currency: d.currency,
        status: d.status,
        stageId: d.stage_id,
        expectedCloseDate: d.expected_close_date,
        createdAt: d.created_at,
      })),
      activities: activities.map((a: any) => ({
        id: a.id,
        activityType: a.activity_type,
        description: a.description,
        metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata || '{}') : a.metadata || {},
        createdBy: a.created_by,
        createdAt: a.created_at,
      })),
    };
  }

  /**
   * Create a contact
   */
  public static async createContact(tenantId: string, brandId: string, dto: CreateContactDTO, actorEmail?: string) {
    const id = crypto.randomUUID();
    const now = new Date();

    const row = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      first_name: dto.firstName.trim(),
      last_name: dto.lastName ? dto.lastName.trim() : null,
      email: dto.email ? dto.email.trim().toLowerCase() : null,
      phone: dto.phone ? dto.phone.trim() : null,
      company: dto.company ? dto.company.trim() : null,
      job_title: dto.jobTitle ? dto.jobTitle.trim() : null,
      status: dto.status || 'lead',
      lead_source: dto.leadSource || 'direct',
      tags: JSON.stringify(dto.tags || []),
      custom_fields: JSON.stringify(dto.customFields || {}),
      created_at: now,
      updated_at: now,
    };

    await db('crm_contacts').insert(row);

    // Record creation activity
    await db('crm_activities').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId,
      contact_id: id,
      activity_type: 'NOTE',
      description: `Contact created via ${dto.leadSource || 'manual entry'}.`,
      created_by: actorEmail || 'system',
      created_at: now,
    });

    return this.getContact(tenantId, brandId, id);
  }

  /**
   * Update contact
   */
  public static async updateContact(tenantId: string, brandId: string, contactId: string, dto: Partial<CreateContactDTO>) {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (dto.firstName !== undefined) updateData.first_name = dto.firstName.trim();
    if (dto.lastName !== undefined) updateData.last_name = dto.lastName ? dto.lastName.trim() : null;
    if (dto.email !== undefined) updateData.email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (dto.phone !== undefined) updateData.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.company !== undefined) updateData.company = dto.company ? dto.company.trim() : null;
    if (dto.jobTitle !== undefined) updateData.job_title = dto.jobTitle ? dto.jobTitle.trim() : null;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.leadSource !== undefined) updateData.lead_source = dto.leadSource;
    if (dto.tags !== undefined) updateData.tags = JSON.stringify(dto.tags);
    if (dto.customFields !== undefined) updateData.custom_fields = JSON.stringify(dto.customFields);

    await db('crm_contacts')
      .where({ id: contactId, tenant_id: tenantId, brand_id: brandId })
      .update(updateData);

    return this.getContact(tenantId, brandId, contactId);
  }

  /**
   * Delete contact
   */
  public static async deleteContact(tenantId: string, brandId: string, contactId: string) {
    const deleted = await db('crm_contacts')
      .where({ id: contactId, tenant_id: tenantId, brand_id: brandId })
      .del();
    return Boolean(deleted);
  }

  /**
   * Sync existing marketing objects into CRM leads
   */
  public static async syncMarketingObjectsToLeads(tenantId: string, brandId: string) {
    const leadObjects = await db('marketing_objects')
      .where({ tenant_id: tenantId, brand_id: brandId, object_type: 'lead' })
      .limit(100);

    let syncedCount = 0;
    for (const obj of leadObjects) {
      const data = typeof obj.normalized_data === 'string'
        ? JSON.parse(obj.normalized_data || '{}')
        : (obj.normalized_data || {});

      const email = data.email ? String(data.email).trim().toLowerCase() : null;
      const firstName = data.firstName || data.name || data.title || 'Lead Contact';

      // Check if contact already exists
      let existing = null;
      if (email) {
        existing = await db('crm_contacts')
          .where({ tenant_id: tenantId, brand_id: brandId, email })
          .first();
      }

      if (!existing) {
        await this.createContact(
          tenantId,
          brandId,
          {
            firstName,
            lastName: data.lastName || '',
            email: email || undefined,
            phone: data.phone || undefined,
            company: data.company || undefined,
            jobTitle: data.jobTitle || undefined,
            status: 'lead',
            leadSource: 'sheets_import',
            tags: ['AutoSynced', 'MarketingObject'],
            customFields: { sourceObjectId: obj.id, externalId: obj.external_id },
          },
          'system_sync'
        );
        syncedCount++;
      }
    }

    return { syncedCount, totalFound: leadObjects.length };
  }

  /**
   * Get or create the default pipeline and stages for a brand
   */
  public static async getOrCreateDefaultPipeline(tenantId: string, brandId: string) {
    let pipeline = await db('crm_pipelines')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .first();

    if (!pipeline) {
      const pipelineId = crypto.randomUUID();
      await db('crm_pipelines').insert({
        id: pipelineId,
        tenant_id: tenantId,
        brand_id: brandId,
        name: 'Sales & Inbound Pipeline',
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Default Standard Stages
      const defaultStages = [
        { name: 'New Inbound Lead', stage_order: 0, color: '#3b82f6', win_probability: 10 },
        { name: 'Contacted & Engaged', stage_order: 1, color: '#8b5cf6', win_probability: 25 },
        { name: 'Proposal Sent', stage_order: 2, color: '#eab308', win_probability: 50 },
        { name: 'In Negotiation', stage_order: 3, color: '#f97316', win_probability: 75 },
        { name: 'Closed Won', stage_order: 4, color: '#10b981', win_probability: 100 },
        { name: 'Closed Lost', stage_order: 5, color: '#ef4444', win_probability: 0 },
      ];

      for (const s of defaultStages) {
        await db('crm_stages').insert({
          id: crypto.randomUUID(),
          pipeline_id: pipelineId,
          name: s.name,
          stage_order: s.stage_order,
          color: s.color,
          win_probability: s.win_probability,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      pipeline = await db('crm_pipelines').where({ id: pipelineId }).first();
    }

    return pipeline;
  }

  /**
   * Fetch complete Kanban Pipeline board: stages + deals grouped by stage
   */
  public static async getPipelineBoard(tenantId: string, brandId: string, pipelineId?: string) {
    const pipeline = pipelineId
      ? await db('crm_pipelines').where({ id: pipelineId, tenant_id: tenantId, brand_id: brandId }).first()
      : await this.getOrCreateDefaultPipeline(tenantId, brandId);

    if (!pipeline) return null;

    const stages = await db('crm_stages')
      .where({ pipeline_id: pipeline.id })
      .orderBy('stage_order', 'asc');

    const deals = await db('crm_deals')
      .where({ pipeline_id: pipeline.id, tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    const contactIds = [...new Set(deals.map((d: any) => d.contact_id).filter(Boolean))];
    const contacts = contactIds.length > 0
      ? await db('crm_contacts').whereIn('id', contactIds)
      : [];

    const contactMap = new Map(contacts.map((c: any) => [c.id, c]));

    const stagesWithDeals = stages.map((stage: any) => {
      const stageDeals = deals
        .filter((d: any) => d.stage_id === stage.id)
        .map((d: any) => {
          const contact = contactMap.get(d.contact_id);
          return {
            id: d.id,
            title: d.title,
            value: Number(d.value),
            currency: d.currency,
            status: d.status,
            notes: d.notes,
            expectedCloseDate: d.expected_close_date,
            createdAt: d.created_at,
            contact: contact
              ? {
                  id: contact.id,
                  fullName: [contact.first_name, contact.last_name].filter(Boolean).join(' '),
                  email: contact.email,
                  company: contact.company,
                }
              : null,
          };
        });

      const totalValue = stageDeals.reduce((sum: number, d: any) => sum + d.value, 0);

      return {
        id: stage.id,
        name: stage.name,
        stageOrder: stage.stage_order,
        color: stage.color,
        winProbability: stage.win_probability,
        dealCount: stageDeals.length,
        totalValue,
        deals: stageDeals,
      };
    });

    const pipelineTotalValue = stagesWithDeals.reduce((sum: number, s: any) => sum + s.totalValue, 0);
    const totalDeals = deals.length;

    return {
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        isDefault: Boolean(pipeline.is_default),
        totalValue: pipelineTotalValue,
        totalDeals,
      },
      stages: stagesWithDeals,
    };
  }

  /**
   * Create a new deal
   */
  public static async createDeal(tenantId: string, brandId: string, dto: CreateDealDTO, actorEmail?: string) {
    const pipeline = dto.pipelineId
      ? { id: dto.pipelineId }
      : await this.getOrCreateDefaultPipeline(tenantId, brandId);

    const id = crypto.randomUUID();
    const now = new Date();

    const row = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      pipeline_id: pipeline.id,
      stage_id: dto.stageId,
      contact_id: dto.contactId || null,
      title: dto.title.trim(),
      value: dto.value !== undefined ? Number(dto.value) : 0.0,
      currency: dto.currency || 'USD',
      expected_close_date: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
      status: dto.status || 'OPEN',
      notes: dto.notes ? dto.notes.trim() : null,
      created_at: now,
      updated_at: now,
    };

    await db('crm_deals').insert(row);

    // Record activity
    await db('crm_activities').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId,
      contact_id: dto.contactId || null,
      deal_id: id,
      activity_type: 'NOTE',
      description: `Deal "${dto.title}" created with value ${dto.currency || 'USD'} ${dto.value || 0}.`,
      created_by: actorEmail || 'system',
      created_at: now,
    });

    return row;
  }

  /**
   * Move deal between pipeline stages (Kanban Drag-and-Drop)
   */
  public static async moveDealStage(tenantId: string, brandId: string, dealId: string, newStageId: string, actorEmail?: string) {
    const deal = await db('crm_deals')
      .where({ id: dealId, tenant_id: tenantId, brand_id: brandId })
      .first();

    if (!deal) return null;

    const oldStage = await db('crm_stages').where({ id: deal.stage_id }).first();
    const newStage = await db('crm_stages').where({ id: newStageId }).first();

    let newStatus = deal.status;
    if (newStage?.name.toLowerCase().includes('won')) {
      newStatus = 'WON';
    } else if (newStage?.name.toLowerCase().includes('lost')) {
      newStatus = 'LOST';
    } else if (deal.status !== 'OPEN') {
      newStatus = 'OPEN';
    }

    const now = new Date();
    await db('crm_deals')
      .where({ id: dealId })
      .update({
        stage_id: newStageId,
        status: newStatus,
        updated_at: now,
      });

    // Record Stage Transition Activity
    await db('crm_activities').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId,
      contact_id: deal.contact_id || null,
      deal_id: dealId,
      activity_type: 'TASK',
      description: `Deal moved from "${oldStage?.name || 'Stage'}" to "${newStage?.name || 'Stage'}".`,
      metadata: JSON.stringify({ fromStageId: deal.stage_id, toStageId: newStageId, status: newStatus }),
      created_by: actorEmail || 'user',
      created_at: now,
    });

    return {
      id: dealId,
      previousStageId: deal.stage_id,
      newStageId,
      status: newStatus,
      updatedAt: now,
    };
  }

  /**
   * Delete deal
   */
  public static async deleteDeal(tenantId: string, brandId: string, dealId: string) {
    const deleted = await db('crm_deals')
      .where({ id: dealId, tenant_id: tenantId, brand_id: brandId })
      .del();
    return Boolean(deleted);
  }
}

