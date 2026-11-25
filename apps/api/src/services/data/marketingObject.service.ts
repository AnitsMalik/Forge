import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { ingestionService, type IngestRecordResult } from './ingestion.service.js';
import { normalizationService } from './normalization.service.js';

export interface ListMarketingObjectsParams {
  tenantId: string;
  brandId?: string;
  objectType?: string;
  source?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class MarketingObjectService {
  /**
   * List marketing objects for a tenant/brand with filtering and pagination.
   */
  public async list(params: ListMarketingObjectsParams) {
    const { tenantId, brandId, objectType, source, status, search, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let query = db('marketing_objects').where({ tenant_id: tenantId });

    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }
    if (objectType && objectType !== 'all') {
      query = query.andWhere({ object_type: objectType });
    }
    if (source && source !== 'all') {
      query = query.andWhere({ source });
    }
    if (status && status !== 'all') {
      query = query.andWhere({ status });
    }
    if (search) {
      query = query.andWhere(function () {
        this.whereILike('title', `%${search}%`)
          .orWhereILike('source_record_id', `%${search}%`)
          .orWhereILike('external_id', `%${search}%`);
      });
    }

    const countQuery = query.clone().count<{ count: number }[]>('* as count');
    const [totalRes] = await countQuery;
    const total = Number(totalRes?.count || 0);

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      source: r.source,
      objectType: r.object_type,
      title: r.title,
      sourceRecordId: r.source_record_id || r.external_id,
      sourceVersion: r.source_version,
      status: r.status,
      properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : r.properties,
      normalizedData: typeof r.normalized_data === 'string' ? JSON.parse(r.normalized_data) : r.normalized_data,
      validationErrors: typeof r.validation_errors === 'string' ? JSON.parse(r.validation_errors) : r.validation_errors,
      provenance: typeof r.provenance === 'string' ? JSON.parse(r.provenance) : r.provenance,
      retryCount: r.retry_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve a single marketing object by ID with strict tenant scoping.
   */
  public async get(id: string, tenantId: string) {
    const row = await db('marketing_objects')
      .where({ id, tenant_id: tenantId })
      .first();

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      source: row.source,
      objectType: row.object_type,
      title: row.title,
      sourceRecordId: row.source_record_id || row.external_id,
      sourceVersion: row.source_version,
      status: row.status,
      properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
      normalizedData: typeof row.normalized_data === 'string' ? JSON.parse(row.normalized_data) : row.normalized_data,
      validationErrors: typeof row.validation_errors === 'string' ? JSON.parse(row.validation_errors) : row.validation_errors,
      provenance: typeof row.provenance === 'string' ? JSON.parse(row.provenance) : row.provenance,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Manually create a marketing object.
   */
  public async create(params: {
    tenantId: string;
    brandId: string;
    source: string;
    objectType: string;
    properties: Record<string, any>;
    sourceRecordId?: string;
  }) {
    return ingestionService.ingestRecord({
      tenantId: params.tenantId,
      brandId: params.brandId,
      source: params.source || 'manual',
      sourceRecordId: params.sourceRecordId,
      rawRecord: params.properties,
      objectType: params.objectType,
    });
  }

  /**
   * Delete a marketing object.
   */
  public async delete(id: string, tenantId: string) {
    const count = await db('marketing_objects')
      .where({ id, tenant_id: tenantId })
      .del();
    return count > 0;
  }

  /**
   * Retry normalization and validation on an invalid/failed object.
   */
  public async retry(id: string, tenantId: string): Promise<IngestRecordResult | null> {
    return ingestionService.retryObject(id, tenantId);
  }

  /**
   * Get audit log history for ingestion events.
   */
  public async listAuditLogs(tenantId: string, brandId?: string, limit = 50) {
    let query = db('ingestion_audit_logs').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }

    const rows = await query.orderBy('created_at', 'desc').limit(limit);

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      source: r.source,
      resourceId: r.resource_id,
      batchId: r.batch_id,
      action: r.action,
      totalRecords: r.total_records,
      successCount: r.success_count,
      errorCount: r.error_count,
      errors: typeof r.errors === 'string' ? JSON.parse(r.errors) : r.errors,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: r.created_at,
    }));
  }

  /**
   * Summary metrics for dashboard and radar.
   */
  public async getStats(tenantId: string, brandId?: string) {
    let query = db('marketing_objects').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }

    const rows = await query.select('object_type', 'source', 'status');

    const total = rows.length;
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = { valid: 0, invalid: 0 };

    for (const r of rows) {
      byType[r.object_type] = (byType[r.object_type] || 0) + 1;
      bySource[r.source] = (bySource[r.source] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }

    return {
      total,
      byType,
      bySource,
      byStatus,
    };
  }
}

export const marketingObjectService = new MarketingObjectService();
