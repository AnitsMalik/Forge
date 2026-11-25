import crypto from 'crypto';
import { GenericOAuth2Connector } from '../core/GenericOAuth2Connector.js';
import type { HealthCheckParams, HealthCheckResult } from '../core/Connector.js';
import { ingestionService } from '../../services/data/ingestion.service.js';
import { normalizationService } from '../../services/data/normalization.service.js';

export interface FileUploadPayload {
  content: string; // CSV text or base64
  fileName: string;
  fileType?: 'csv' | 'xlsx' | 'xls';
  objectType?: string;
}

export class ExcelConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'excel',
      name: 'Excel / CSV',
      category: 'spreadsheets',
      authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      defaultScopes: ['Files.Read'],
    });
  }

  /**
   * Parse uploaded CSV/Excel text into structured rows.
   */
  public parse(content: string): Array<Record<string, string>> {
    return ingestionService.parseCsv(content);
  }

  /**
   * Validate rows against expected marketing object fields.
   */
  public validate(records: Array<Record<string, any>>, objectType = 'Product') {
    const results = records.map((r, idx) => {
      const norm = normalizationService.normalize(r, { objectType });
      return {
        rowIndex: idx + 1,
        isValid: norm.isValid,
        errors: norm.validationErrors,
        normalizedTitle: norm.title,
      };
    });

    const validCount = results.filter((r) => r.isValid).length;
    const errorCount = results.length - validCount;

    return {
      totalRows: records.length,
      validCount,
      errorCount,
      isValid: errorCount === 0,
      rowResults: results,
    };
  }

  /**
   * Import parsed file rows into marketing_objects with provenance and version tracking.
   */
  public async importData(params: {
    tenantId: string;
    brandId: string;
    content: string;
    fileName: string;
    objectType?: string;
  }) {
    const sourceVersion = `v_${crypto.createHash('md5').update(params.content).digest('hex').slice(0, 8)}`;

    return ingestionService.ingestCsv(params.content, {
      tenantId: params.tenantId,
      brandId: params.brandId,
      fileName: params.fileName,
      objectType: params.objectType,
      sourceVersion,
    });
  }

  public override async healthCheck(params: HealthCheckParams): Promise<HealthCheckResult> {
    return {
      status: 'CONNECTED',
      lastCheckedAt: new Date(),
      latencyMs: 1,
      error: null,
    };
  }
}

export const excelConnector = new ExcelConnector();
