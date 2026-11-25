import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { normalizationService, type ValidationError } from './normalization.service.js';
import { marketingObjectSynthesisService } from './marketingObjectSynthesis.service.js';

export interface IngestRecordParams {
  tenantId: string;
  brandId: string;
  source: 'google_sheets' | 'google_drive' | 'excel' | 'csv' | string;
  sourceRecordId?: string;
  sourceVersion?: string;
  rawRecord: Record<string, any>;
  objectType?: string;
  idempotencyKey?: string;
  provenance?: Record<string, any>;
  batchId?: string;
}

export interface IngestRecordResult {
  id: string;
  isDuplicate: boolean;
  isValid: boolean;
  status: 'valid' | 'invalid';
  objectType: string;
  title: string;
  sourceRecordId?: string;
  sourceVersion?: string;
  validationErrors: ValidationError[];
}

export interface IngestBatchParams {
  tenantId: string;
  brandId: string;
  source: string;
  resourceId?: string;
  sourceVersion?: string;
  records: Array<{
    sourceRecordId?: string;
    rawRecord: Record<string, any>;
  }>;
  objectType?: string;
  provenanceMeta?: Record<string, any>;
}

export interface IngestBatchResult {
  batchId: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  items: IngestRecordResult[];
  errors: Array<{ index: number; sourceRecordId?: string; errors: ValidationError[] }>;
}

export class IngestionService {
  /**
   * Ingest a single source record through the normalization pipeline.
   */
  public async ingestRecord(params: IngestRecordParams): Promise<IngestRecordResult> {
    const {
      tenantId,
      brandId,
      source,
      sourceRecordId = `rec_${crypto.randomBytes(8).toString('hex')}`,
      sourceVersion = 'v1',
      rawRecord,
      objectType,
      provenance = {},
      batchId = `batch_${crypto.randomBytes(8).toString('hex')}`,
    } = params;

    const idempotencyKey =
      params.idempotencyKey ||
      crypto
        .createHash('sha256')
        .update(`${tenantId}:${brandId}:${source}:${sourceRecordId}:${sourceVersion}`)
        .digest('hex');

    // 1. Duplicate & Idempotency Check
    const existing = await db('marketing_objects')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .andWhere(function () {
        this.where({ idempotency_key: idempotencyKey }).orWhere({
          source,
          source_record_id: sourceRecordId,
          source_version: sourceVersion,
        });
      })
      .first();

    if (existing) {
      return {
        id: existing.id,
        isDuplicate: true,
        isValid: existing.status === 'valid',
        status: existing.status as any,
        objectType: existing.object_type,
        title: existing.title,
        sourceRecordId: existing.source_record_id,
        sourceVersion: existing.source_version,
        validationErrors: typeof existing.validation_errors === 'string'
          ? JSON.parse(existing.validation_errors)
          : existing.validation_errors || [],
      };
    }

    // 2. Normalization & Validation Pipeline
    const norm = normalizationService.normalize(rawRecord, { objectType });
    const status = norm.isValid ? 'valid' : 'invalid';
    const objectId = crypto.randomUUID();

    const fullProvenance = {
      ...provenance,
      source,
      sourceRecordId,
      sourceVersion,
      batchId,
      ingestedAt: new Date().toISOString(),
      rawHash: crypto.createHash('sha256').update(JSON.stringify(rawRecord)).digest('hex'),
    };

    // 3. Persist Marketing Object
    await db('marketing_objects').insert({
      id: objectId,
      tenant_id: tenantId,
      brand_id: brandId,
      source,
      object_type: norm.objectType,
      external_id: sourceRecordId,
      source_record_id: sourceRecordId,
      source_version: sourceVersion,
      status,
      title: norm.title,
      properties: JSON.stringify(rawRecord),
      normalized_data: JSON.stringify(norm.normalizedData),
      validation_errors: norm.validationErrors.length > 0 ? JSON.stringify(norm.validationErrors) : null,
      provenance: JSON.stringify(fullProvenance),
      idempotency_key: idempotencyKey,
      retry_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      id: objectId,
      isDuplicate: false,
      isValid: norm.isValid,
      status,
      objectType: norm.objectType,
      title: norm.title,
      sourceRecordId,
      sourceVersion,
      validationErrors: norm.validationErrors,
    };
  }

  /**
   * Ingest a batch of records and log the batch audit record.
   */
  public async ingestBatch(params: IngestBatchParams): Promise<IngestBatchResult> {
    const { tenantId, brandId, source, resourceId, sourceVersion = 'v1', records, objectType, provenanceMeta } = params;
    const batchId = `batch_${crypto.randomBytes(8).toString('hex')}`;

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const items: IngestRecordResult[] = [];
    const batchErrors: Array<{ index: number; sourceRecordId?: string; errors: ValidationError[] }> = [];

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      try {
        const result = await this.ingestRecord({
          tenantId,
          brandId,
          source,
          sourceRecordId: rec.sourceRecordId || `row_${i + 1}`,
          sourceVersion,
          rawRecord: rec.rawRecord,
          objectType,
          provenance: {
            ...provenanceMeta,
            rowIndex: i + 1,
            resourceId,
          },
          batchId,
        });

        items.push(result);

        if (result.isDuplicate) {
          duplicateCount++;
        } else if (result.isValid) {
          successCount++;
        } else {
          errorCount++;
          batchErrors.push({
            index: i + 1,
            sourceRecordId: result.sourceRecordId,
            errors: result.validationErrors,
          });
        }
      } catch (err: any) {
        errorCount++;
        batchErrors.push({
          index: i + 1,
          sourceRecordId: rec.sourceRecordId,
          errors: [{ field: 'system', message: err.message }],
        });
      }
    }

    // Persist Ingestion Audit Log
    await db('ingestion_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId,
      source,
      resource_id: resourceId || null,
      batch_id: batchId,
      action: errorCount > 0 && successCount === 0 ? 'validation_failed' : 'import',
      total_records: records.length,
      success_count: successCount,
      error_count: errorCount,
      errors: batchErrors.length > 0 ? JSON.stringify(batchErrors) : null,
      metadata: JSON.stringify({
        sourceVersion,
        duplicateCount,
        provenanceMeta,
      }),
      created_at: new Date(),
    });

    // Dispatch automation triggers for valid, non-duplicate ingested items
    const validItems = items.filter((it) => it.isValid && !it.isDuplicate);
    for (const validItem of validItems) {
      marketingObjectSynthesisService.triggerAutomationsForMarketingObject(
        tenantId,
        brandId,
        {
          id: validItem.id,
          object_type: validItem.objectType || objectType || 'Product',
          source,
          source_record_id: validItem.sourceRecordId,
          source_version: sourceVersion,
          status: 'valid',
        },
        'created'
      ).catch((e) => console.warn('[IngestionService] Async automation trigger error:', e.message));
    }

    return {
      batchId,
      totalRecords: records.length,
      successCount,
      errorCount,
      duplicateCount,
      items,
      errors: batchErrors,
    };
  }

  /**
   * Native, robust CSV parsing adhering to RFC 4180.
   */
  public parseCsv(csvText: string): Array<Record<string, string>> {
    if (!csvText || typeof csvText !== 'string') return [];

    const lines: string[] = [];
    let currentLine = '';
    let insideQuotes = false;

    // Detect linebreaks while respecting quotes
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentLine += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) return [];

    // Delimiter detection on header row
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

    const parseRow = (row: string): string[] => {
      const cells: string[] = [];
      let cell = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        const next = row[i + 1];
        if (c === '"') {
          if (inQuotes && next === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === delimiter && !inQuotes) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += c;
        }
      }
      cells.push(cell.trim());
      return cells;
    };

    const headers = parseRow(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
    const records: Array<Record<string, string>> = [];

    for (let r = 1; r < lines.length; r++) {
      const cells = parseRow(lines[r]);
      const obj: Record<string, string> = {};
      let hasData = false;
      for (let c = 0; c < headers.length; c++) {
        const val = (cells[c] !== undefined ? cells[c] : '').replace(/^["']|["']$/g, '').trim();
        obj[headers[c]] = val;
        if (val) hasData = true;
      }
      if (hasData) {
        records.push(obj);
      }
    }

    return records;
  }

  /**
   * Parse CSV content and ingest into normalized marketing objects.
   */
  public async ingestCsv(
    csvText: string,
    params: {
      tenantId: string;
      brandId: string;
      fileName?: string;
      objectType?: string;
      sourceVersion?: string;
    }
  ): Promise<IngestBatchResult> {
    const rawRecords = this.parseCsv(csvText);
    const version = params.sourceVersion || `csv_${crypto.createHash('md5').update(csvText).digest('hex').slice(0, 8)}`;

    const records = rawRecords.map((r, idx) => ({
      sourceRecordId: r['sku'] || r['id'] || r['SKU'] || `row_${idx + 1}`,
      rawRecord: r,
    }));

    return this.ingestBatch({
      tenantId: params.tenantId,
      brandId: params.brandId,
      source: 'csv',
      sourceVersion: version,
      records,
      objectType: params.objectType,
      provenanceMeta: {
        fileName: params.fileName || 'uploaded_data.csv',
        fileType: 'csv',
      },
    });
  }

  /**
   * Retry normalization and validation on a failed marketing object.
   */
  public async retryObject(objectId: string, tenantId: string): Promise<IngestRecordResult | null> {
    const obj = await db('marketing_objects')
      .where({ id: objectId, tenant_id: tenantId })
      .first();

    if (!obj) return null;

    const raw = typeof obj.properties === 'string' ? JSON.parse(obj.properties) : obj.properties;
    const norm = normalizationService.normalize(raw, { objectType: obj.object_type });

    const newStatus = norm.isValid ? 'valid' : 'invalid';
    const retryCount = (obj.retry_count || 0) + 1;

    await db('marketing_objects')
      .where({ id: objectId, tenant_id: tenantId })
      .update({
        status: newStatus,
        title: norm.title,
        normalized_data: JSON.stringify(norm.normalizedData),
        validation_errors: norm.validationErrors.length > 0 ? JSON.stringify(norm.validationErrors) : null,
        retry_count: retryCount,
        updated_at: new Date(),
      });

    // Record retry in audit logs
    await db('ingestion_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: obj.brand_id,
      source: obj.source,
      resource_id: obj.source_record_id,
      batch_id: `retry_${objectId.slice(0, 8)}`,
      action: 'retry',
      total_records: 1,
      success_count: norm.isValid ? 1 : 0,
      error_count: norm.isValid ? 0 : 1,
      errors: norm.validationErrors.length > 0 ? JSON.stringify(norm.validationErrors) : null,
      metadata: JSON.stringify({ retryCount, previousStatus: obj.status }),
      created_at: new Date(),
    });

    return {
      id: objectId,
      isDuplicate: false,
      isValid: norm.isValid,
      status: newStatus,
      objectType: norm.objectType,
      title: norm.title,
      sourceRecordId: obj.source_record_id,
      sourceVersion: obj.source_version,
      validationErrors: norm.validationErrors,
    };
  }
}

export const ingestionService = new IngestionService();
