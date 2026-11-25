import type { Request, Response } from 'express';
import { marketingObjectService } from '../services/data/marketingObject.service.js';
import { ingestionService } from '../services/data/ingestion.service.js';
import { marketingObjectSynthesisService } from '../services/data/marketingObjectSynthesis.service.js';
import { googleSheetsConnector } from '../connectors/google-sheets/GoogleSheetsConnector.js';
import { googleDriveConnector } from '../connectors/google-drive/GoogleDriveConnector.js';
import { excelConnector } from '../connectors/excel/ExcelConnector.js';
import { db } from '../db/connection.js';

export class DataController {
  /**
   * List marketing objects for the authenticated tenant.
   */
  public static async listMarketingObjects(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
      }

      const { brandId, objectType, source, status, search, page, limit } = req.query;

      const result = await marketingObjectService.list({
        tenantId,
        brandId: brandId as string,
        objectType: objectType as string,
        source: source as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err: any) {
      console.error('[DataController.listMarketingObjects] Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get single marketing object details.
   */
  public static async getMarketingObject(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { id } = req.params;

      const item = await marketingObjectService.get(id, tenantId);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Marketing object not found.' });
      }

      return res.status(200).json({ success: true, data: item });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Manually create a marketing object.
   */
  public static async createMarketingObject(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const brandId = (req.params as any).brandId || req.body.brandId;
      const { source = 'manual', objectType = 'Product', properties, sourceRecordId } = req.body;

      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }
      if (!properties || typeof properties !== 'object') {
        return res.status(400).json({ success: false, error: 'properties object is required.' });
      }

      const result = await marketingObjectService.create({
        tenantId,
        brandId,
        source,
        objectType,
        properties,
        sourceRecordId,
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Retry normalization and validation on a failed marketing object.
   */
  public static async retryMarketingObject(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { id } = req.params;

      const result = await marketingObjectService.retry(id, tenantId);
      if (!result) {
        return res.status(404).json({ success: false, error: 'Marketing object not found.' });
      }

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Delete a marketing object.
   */
  public static async deleteMarketingObject(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { id } = req.params;

      const deleted = await marketingObjectService.delete(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Marketing object not found.' });
      }

      return res.status(200).json({ success: true, message: 'Marketing object deleted.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Ingest CSV / Excel content.
   */
  public static async ingestCsv(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const brandId = (req.params as any).brandId || req.body.brandId;
      const { csvText, fileName = 'uploaded.csv', objectType = 'Product', sourceVersion } = req.body;

      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }
      if (!csvText || typeof csvText !== 'string') {
        return res.status(400).json({ success: false, error: 'csvText string is required.' });
      }

      const result = await excelConnector.importData({
        tenantId,
        brandId,
        content: csvText,
        fileName,
        objectType,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Dry-run validate CSV content before importing.
   */
  public static async validateCsv(req: Request, res: Response) {
    try {
      const { csvText, objectType = 'Product' } = req.body;
      if (!csvText || typeof csvText !== 'string') {
        return res.status(400).json({ success: false, error: 'csvText is required.' });
      }

      const parsed = excelConnector.parse(csvText);
      const validation = excelConnector.validate(parsed, objectType);

      return res.status(200).json({
        success: true,
        data: {
          parsedRowsCount: parsed.length,
          ...validation,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Ingest rows from a connected Google Sheets spreadsheet.
   */
  public static async ingestGoogleSheets(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const brandId = (req.params as any).brandId || req.body.brandId;
      const { connectionId, spreadsheetId, sheetName, objectType = 'Product', rawRows } = req.body;

      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }

      // Check connection ownership
      if (connectionId) {
        const conn = await db('social_connections')
          .where({ id: connectionId, tenant_id: tenantId })
          .first();
        if (!conn) {
          return res.status(404).json({ success: false, error: 'Google Sheets connection not found.' });
        }
      }

      let rows = rawRows;
      if (!rows || rows.length === 0) {
        const fetchRes = await googleSheetsConnector.fetch({
          tenantId,
          connectionId: connectionId || 'system',
          credentials: {},
          endpoint: `/spreadsheets/${spreadsheetId || 'default'}/values`,
        });
        rows = (fetchRes.data as any)?.rawRows || [];
      }

      if (!rows || rows.length < 2) {
        return res.status(400).json({ success: false, error: 'Spreadsheet has no data rows.' });
      }

      // Parse rows
      const headers = rows[0];
      const records = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const record: Record<string, any> = {};
        for (let c = 0; c < headers.length; c++) {
          record[headers[c]] = row[c] !== undefined ? row[c] : '';
        }
        records.push({
          sourceRecordId: record['sku'] || record['id'] || `row_${i}`,
          rawRecord: record,
        });
      }

      const result = await ingestionService.ingestBatch({
        tenantId,
        brandId,
        source: 'google_sheets',
        resourceId: spreadsheetId,
        sourceVersion: `v_sheet_${Date.now()}`,
        records,
        objectType,
        provenanceMeta: {
          connectionId,
          spreadsheetId,
          sheetName: sheetName || 'Sheet1',
        },
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Ingest assets from a connected Google Drive folder.
   */
  public static async ingestGoogleDrive(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const brandId = (req.params as any).brandId || req.body.brandId;
      const { connectionId, folderId, objectType = 'Product' } = req.body;

      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }

      if (connectionId) {
        const conn = await db('social_connections')
          .where({ id: connectionId, tenant_id: tenantId })
          .first();
        if (!conn) {
          return res.status(404).json({ success: false, error: 'Google Drive connection not found.' });
        }
      }

      const fetchRes = await googleDriveConnector.fetch({
        tenantId,
        connectionId: connectionId || 'system',
        credentials: {},
        endpoint: `/files?folder=${folderId || 'root'}`,
      });
      const files = (fetchRes.data as any)?.files || [];

      const records = files.map((f: any) => ({
        sourceRecordId: f.id,
        rawRecord: {
          name: f.name,
          title: f.name,
          image: f.thumbnailLink || f.webViewLink,
          url: f.webViewLink,
          price: '$0.00', // default asset price
          fileSize: f.sizeBytes,
          mimeType: f.mimeType,
          status: 'active',
        },
      }));

      const result = await ingestionService.ingestBatch({
        tenantId,
        brandId,
        source: 'google_drive',
        resourceId: folderId,
        sourceVersion: `v_drive_${Date.now()}`,
        records,
        objectType,
        provenanceMeta: {
          connectionId,
          folderId,
        },
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * List ingestion audit logs.
   */
  public static async listAuditLogs(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { brandId, limit } = req.query;

      const logs = await marketingObjectService.listAuditLogs(
        tenantId,
        brandId as string,
        limit ? parseInt(limit as string, 10) : 50
      );

      return res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get metrics and breakdown counts.
   */
  public static async getStats(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { brandId } = req.query;

      const stats = await marketingObjectService.getStats(tenantId, brandId as string);
      return res.status(200).json({ success: true, data: stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Synthesize an AI-generated multi-platform social post from a normalized marketing object.
   */
  public static async synthesizePost(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { id } = req.params;
      const brandId = (req.params as any).brandId || req.body.brandId || req.query.brandId;
      const { platforms, templateId, requireApproval, customPrompt, autoApprove, campaignId } = req.body || {};

      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
      }

      let targetBrandId = brandId;
      if (!targetBrandId) {
        const obj = await db('marketing_objects').where({ id, tenant_id: tenantId }).first();
        if (!obj) {
          return res.status(404).json({ success: false, error: 'Marketing object not found.' });
        }
        targetBrandId = obj.brand_id;
      }

      const result = await marketingObjectSynthesisService.synthesizePost(
        tenantId,
        targetBrandId,
        id,
        {
          platforms,
          templateId,
          requireApproval,
          customPrompt,
          autoApprove,
          campaignId,
        }
      );

      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      console.error('[DataController.synthesizePost] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Batch synthesize social posts from multiple marketing object IDs.
   */
  public static async batchSynthesize(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      const brandId = (req.params as any).brandId || req.body.brandId;
      const { objectIds, platforms, requireApproval, autoApprove } = req.body || {};

      if (!tenantId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
      }
      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }
      if (!Array.isArray(objectIds) || objectIds.length === 0) {
        return res.status(400).json({ success: false, error: 'objectIds array is required.' });
      }

      const results = await marketingObjectSynthesisService.batchSynthesize(
        tenantId,
        brandId,
        objectIds,
        {
          platforms,
          requireApproval,
          autoApprove,
        }
      );

      return res.status(200).json({ success: true, data: results });
    } catch (err: any) {
      console.error('[DataController.batchSynthesize] Error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
