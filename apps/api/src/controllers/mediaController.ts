import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { planGuardService } from '../services/billing/planGuard.service.js';
import { UsageTrackerService } from '../services/usageTracker.service.js';
import { EntitlementService } from '../services/entitlement.service.js';

const DEFAULT_BRAND_FOLDERS = ['General', 'Product Launches', 'Promotions', 'Campaigns', 'Evergreen'];

function parseAssetMetadata(rawMeta: any): Record<string, any> {
  if (!rawMeta) return {};
  if (typeof rawMeta === 'string') {
    try {
      return JSON.parse(rawMeta);
    } catch {
      return {};
    }
  }
  return typeof rawMeta === 'object' ? { ...rawMeta } : {};
}

function formatMediaAsset(asset: any) {
  const metadata = parseAssetMetadata(asset.metadata);
  const folder =
    typeof metadata.folder === 'string' && metadata.folder.trim()
      ? metadata.folder.trim()
      : 'General';
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.map((t: any) => String(t).trim()).filter(Boolean)
    : [];
  const title =
    typeof metadata.title === 'string' && metadata.title.trim()
      ? metadata.title.trim()
      : asset.file_name;
  const favorite = Boolean(metadata.favorite);
  const usageCount = Number(metadata.usageCount || 0);
  const lastUsedAt = metadata.lastUsedAt || null;

  return {
    id: asset.id,
    tenantId: asset.tenant_id,
    brandId: asset.brand_id,
    storageKey: asset.storage_key,
    publicUrl: asset.public_url,
    thumbnailUrl: asset.thumbnail_url || asset.public_url,
    fileName: asset.file_name,
    title,
    folder,
    tags,
    favorite,
    usageCount,
    lastUsedAt,
    mimeType: asset.mime_type,
    fileSizeBytes: Number(asset.file_size_bytes),
    mediaType: asset.media_type,
    metadata: {
      ...metadata,
      title,
      folder,
      tags,
      favorite,
      usageCount,
      lastUsedAt,
    },
    createdAt: asset.created_at,
  };
}

export class MediaController {
  private static async verifyBrandAccess(req: Request, brandId: string) {
    const brand = await db('brands').where('id', brandId).first();
    if (!brand) return null;
    const userTenantId = (req as any).user?.tenantId;
    const userRole = (req as any).user?.role;
    if (userTenantId && userRole !== 'superadmin' && brand.tenant_id !== userTenantId) {
      return null;
    }
    return brand;
  }

  // List media assets for a specific brand with folder, tag, favorite, and search filtering
  public static async listMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { type, folder, tag, q, search, favorite, limit = '100', page = '1' } = req.query;

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Brand not found or access denied' },
        });
        return;
      }

      let query = db('media_assets').where('brand_id', brandId);

      if (type && typeof type === 'string' && type !== 'all') {
        query = query.andWhere('media_type', type);
      }

      const rawAssets = await query.orderBy('created_at', 'desc');
      const allFormatted = rawAssets.map(formatMediaAsset);

      // Compute per-brand folder counts and distinct tags across all assets of this brand
      const folderCounts: Record<string, number> = {};
      DEFAULT_BRAND_FOLDERS.forEach((f) => {
        folderCounts[f] = 0;
      });
      const tagSet = new Set<string>();

      for (const item of allFormatted) {
        const f = item.folder || 'General';
        folderCounts[f] = (folderCounts[f] || 0) + 1;
        item.tags.forEach((t: string) => tagSet.add(t));
      }

      // Apply in-memory metadata filters (folder, favorite, tag, search query)
      const searchQuery = String(q || search || '').trim().toLowerCase();
      const folderFilter = typeof folder === 'string' ? folder.trim() : '';
      const tagFilter = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
      const favoriteOnly = favorite === 'true' || folderFilter.toLowerCase() === 'favorites';

      const filtered = allFormatted.filter((item) => {
        if (favoriteOnly && !item.favorite) return false;
        if (
          folderFilter &&
          folderFilter.toLowerCase() !== 'all' &&
          folderFilter.toLowerCase() !== 'favorites' &&
          item.folder.toLowerCase() !== folderFilter.toLowerCase()
        ) {
          return false;
        }
        if (tagFilter && !item.tags.some((t: string) => t.toLowerCase() === tagFilter)) {
          return false;
        }
        if (searchQuery) {
          const hay = `${item.title} ${item.fileName} ${item.folder} ${item.tags.join(' ')}`.toLowerCase();
          if (!hay.includes(searchQuery)) return false;
        }
        return true;
      });

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 100);
      const offset = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(offset, offset + limitNum);

      res.json({
        success: true,
        data: paginated,
        meta: {
          total: filtered.length,
          brandTotal: allFormatted.length,
          brandId: brand.id,
          brandName: brand.name,
          folders: Object.entries(folderCounts).map(([name, count]) => ({ name, count })),
          tags: Array.from(tagSet),
          page: pageNum,
          limit: limitNum,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('[MediaController.listMedia] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch media assets' },
      });
    }
  }

  // Create / upload a new media asset scoped to a specific brand
  public static async createMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const {
        fileName,
        title,
        folder,
        tags,
        favorite,
        publicUrl,
        thumbnailUrl,
        mimeType = 'image/png',
        fileSizeBytes = 1024,
        mediaType = 'image',
        metadata = {},
      } = req.body;

      if (!fileName || !publicUrl) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'fileName and publicUrl are required' },
        });
        return;
      }

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const assetId = crypto.randomUUID();
      const brandPrefix = `brand-${brand.id.slice(0, 8)}`;
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageKey = `uploads/${brandPrefix}-${assetId}-${sanitizedFileName}`;

      let resolvedPublicUrl = publicUrl;
      let resolvedThumbnailUrl = thumbnailUrl || publicUrl;
      let calculatedSizeBytes = fileSizeBytes;

      // Handle direct base64 data URLs (e.g. from canvas exports, local uploads, or poster designer)
      if (typeof publicUrl === 'string' && publicUrl.startsWith('data:image/')) {
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const matches = publicUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const rawExt = matches[1].split('/')[1] || 'png';
            const ext = rawExt.includes('+') ? rawExt.split('+')[0] : rawExt;
            const diskFileName = `${brandPrefix}-${assetId}-${sanitizedFileName.replace(/\.[^/.]+$/, '')}.${ext}`;
            const diskFilePath = path.join(uploadsDir, diskFileName);

            const buffer = Buffer.from(matches[2], 'base64');
            fs.writeFileSync(diskFilePath, buffer);
            calculatedSizeBytes = buffer.length;

            const serverOrigin = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
            resolvedPublicUrl = `${serverOrigin}/uploads/${diskFileName}`;
            resolvedThumbnailUrl = resolvedPublicUrl;
          }
        } catch (fsErr) {
          console.warn('[MediaController] Could not write base64 image to disk, falling back to dataUrl:', fsErr);
        }
      }

      // Enforce plan storage quota
      const storageCheck = await planGuardService.check(brand.tenant_id, 'storage', calculatedSizeBytes);
      if (!storageCheck.allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PLAN_LIMIT_EXCEEDED',
            message: storageCheck.reason || 'Storage quota exceeded for this tenant plan.',
            resource: 'storage_bytes_limit',
            current: storageCheck.current,
            limit: storageCheck.limit,
            remaining: storageCheck.remaining,
            planId: storageCheck.planId,
            planName: storageCheck.planName,
            upgradeRequired: true,
          },
        });
        return;
      }

      const parsedInputMeta = parseAssetMetadata(metadata);
      const normalizedFolder =
        (typeof folder === 'string' && folder.trim()) ||
        (typeof parsedInputMeta.folder === 'string' && parsedInputMeta.folder.trim()) ||
        'General';
      const normalizedTags = Array.isArray(tags)
        ? tags.map((t: any) => String(t).trim()).filter(Boolean)
        : Array.isArray(parsedInputMeta.tags)
          ? parsedInputMeta.tags.map((t: any) => String(t).trim()).filter(Boolean)
          : [];
      const normalizedTitle =
        (typeof title === 'string' && title.trim()) ||
        (typeof parsedInputMeta.title === 'string' && parsedInputMeta.title.trim()) ||
        fileName;
      const normalizedFavorite = Boolean(favorite ?? parsedInputMeta.favorite ?? false);

      // Compute SHA-256 checksum for duplicate asset detection
      let checksumSha256 = '';
      if (typeof publicUrl === 'string') {
        checksumSha256 = crypto.createHash('sha256').update(publicUrl).digest('hex');
      }

      // Check for duplicate asset within this brand
      const existingAssets = await db('media_assets')
        .where('brand_id', brand.id)
        .select('id', 'file_name', 'public_url', 'metadata', 'file_size_bytes');

      let duplicateOfAsset: any = null;
      for (const ea of existingAssets) {
        const meta = parseAssetMetadata(ea.metadata);
        if (
          (checksumSha256 && meta.checksumSha256 === checksumSha256) ||
          ea.public_url === resolvedPublicUrl ||
          (ea.file_name === fileName && Number(ea.file_size_bytes) === calculatedSizeBytes && calculatedSizeBytes > 1024)
        ) {
          duplicateOfAsset = ea;
          break;
        }
      }

      const isDuplicate = Boolean(duplicateOfAsset);
      const duplicateOfAssetId = duplicateOfAsset?.id || null;

      const finalMetadata = {
        ...parsedInputMeta,
        title: normalizedTitle,
        folder: normalizedFolder,
        tags: normalizedTags,
        favorite: normalizedFavorite,
        brandName: brand.name,
        usageCount: Number(parsedInputMeta.usageCount || 0),
        checksumSha256,
        isDuplicate,
        duplicateOfAssetId,
        dimensions: parsedInputMeta.dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
      };

      await db('media_assets').insert({
        id: assetId,
        tenant_id: brand.tenant_id,
        brand_id: brand.id,
        storage_key: storageKey,
        public_url: resolvedPublicUrl,
        thumbnail_url: resolvedThumbnailUrl,
        file_name: fileName,
        mime_type: mimeType,
        file_size_bytes: calculatedSizeBytes,
        media_type: mediaType,
        metadata: JSON.stringify(finalMetadata),
        created_at: new Date(),
      });

      // Increment storage usage counter
      await UsageTrackerService.recordUsage(brand.tenant_id, 'storage_bytes_used', calculatedSizeBytes);

      const created = await db('media_assets').where('id', assetId).first();

      res.status(201).json({
        success: true,
        data: formatMediaAsset(created),
        duplicateDetected: isDuplicate,
        duplicateOfAssetId,
      });
    } catch (err: any) {
      console.error('[MediaController.createMedia] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create media asset' },
      });
    }
  }

  // Organize / update a brand media asset (title, fileName, folder, tags, favorite, reuse tracking)
  public static async updateMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, assetId } = req.params;
      const { title, fileName, folder, tags, favorite, incrementUsage, metadata: incomingMeta } = req.body;

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const asset = await db('media_assets')
        .where({ id: assetId, brand_id: brandId })
        .first();

      if (!asset) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media asset not found for this brand' } });
        return;
      }

      const existingMeta = parseAssetMetadata(asset.metadata);
      const nextMeta: Record<string, any> = {
        ...existingMeta,
        ...(incomingMeta && typeof incomingMeta === 'object' ? incomingMeta : {}),
      };

      if (typeof title === 'string' && title.trim()) {
        nextMeta.title = title.trim();
      }
      if (typeof folder === 'string' && folder.trim()) {
        nextMeta.folder = folder.trim();
      }
      if (Array.isArray(tags)) {
        nextMeta.tags = tags.map((t: any) => String(t).trim()).filter(Boolean);
      }
      if (typeof favorite === 'boolean') {
        nextMeta.favorite = favorite;
      }
      if (incrementUsage) {
        nextMeta.usageCount = Number(existingMeta.usageCount || 0) + 1;
        nextMeta.lastUsedAt = new Date().toISOString();
      }

      const nextFileName =
        typeof fileName === 'string' && fileName.trim() ? fileName.trim() : asset.file_name;

      await db('media_assets')
        .where({ id: assetId, brand_id: brandId })
        .update({
          file_name: nextFileName,
          metadata: JSON.stringify(nextMeta),
        });

      const updated = await db('media_assets').where({ id: assetId, brand_id: brandId }).first();

      res.json({
        success: true,
        data: formatMediaAsset(updated),
      });
    } catch (err: any) {
      console.error('[MediaController.updateMedia] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update media asset' },
      });
    }
  }

  // Duplicate / reuse an image asset within the brand (or copy into another brand of the same tenant)
  public static async duplicateMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, assetId } = req.params;
      const { title, folder, targetBrandId } = req.body || {};

      const sourceBrand = await MediaController.verifyBrandAccess(req, brandId);
      if (!sourceBrand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source brand not found' } });
        return;
      }

      const asset = await db('media_assets')
        .where({ id: assetId, brand_id: brandId })
        .first();

      if (!asset) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media asset not found' } });
        return;
      }

      const destBrandId = targetBrandId && typeof targetBrandId === 'string' ? targetBrandId : brandId;
      const destBrand = await MediaController.verifyBrandAccess(req, destBrandId);
      if (!destBrand || destBrand.tenant_id !== sourceBrand.tenant_id) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Destination brand is not accessible' },
        });
        return;
      }

      const existingMeta = parseAssetMetadata(asset.metadata);
      const newAssetId = crypto.randomUUID();
      const baseTitle = existingMeta.title || asset.file_name;
      const newTitle =
        typeof title === 'string' && title.trim()
          ? title.trim()
          : destBrandId === brandId
            ? `${baseTitle} (Copy)`
            : baseTitle;
      const newFolder =
        typeof folder === 'string' && folder.trim()
          ? folder.trim()
          : existingMeta.folder || 'General';

      const newMeta = {
        ...existingMeta,
        title: newTitle,
        folder: newFolder,
        brandName: destBrand.name,
        duplicatedFromAssetId: asset.id,
        duplicatedFromBrandId: brandId,
        usageCount: 0,
      };

      const sizeBytes = Number(asset.file_size_bytes || 1024);
      await db('media_assets').insert({
        id: newAssetId,
        tenant_id: destBrand.tenant_id,
        brand_id: destBrand.id,
        storage_key: `uploads/brand-${destBrand.id.slice(0, 8)}-${newAssetId}-${asset.file_name}`,
        public_url: asset.public_url,
        thumbnail_url: asset.thumbnail_url || asset.public_url,
        file_name: asset.file_name,
        mime_type: asset.mime_type,
        file_size_bytes: sizeBytes,
        media_type: asset.media_type,
        metadata: JSON.stringify(newMeta),
        created_at: new Date(),
      });

      await UsageTrackerService.recordUsage(destBrand.tenant_id, 'storage_bytes_used', sizeBytes);

      const created = await db('media_assets').where('id', newAssetId).first();
      res.status(201).json({
        success: true,
        data: formatMediaAsset(created),
      });
    } catch (err: any) {
      console.error('[MediaController.duplicateMedia] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate media asset' },
      });
    }
  }

  // Delete media asset
  public static async deleteMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, assetId } = req.params;

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const asset = await db('media_assets')
        .where({ id: assetId, brand_id: brandId })
        .first();

      if (!asset) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Media asset not found' } });
        return;
      }

      await db('media_assets')
        .where({ id: assetId, brand_id: brandId })
        .delete();

      const sizeBytes = Number(asset.file_size_bytes || 0);
      if (sizeBytes > 0 && asset.tenant_id) {
        await UsageTrackerService.decrementUsage(asset.tenant_id, 'storage_bytes_used', sizeBytes);
      }

      // If local uploaded file exists and no other asset references it, clean up from disk
      if (asset.public_url && asset.public_url.includes('/uploads/')) {
        try {
          const otherRefs = await db('media_assets')
            .where('public_url', asset.public_url)
            .count<{ count: number }>('* as count')
            .first();
          if (!otherRefs || Number(otherRefs.count) === 0) {
            const diskFileName = path.basename(asset.public_url);
            const localPath = path.join(process.cwd(), 'uploads', diskFileName);
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
            }
          }
        } catch (fsErr) {
          console.warn('[MediaController.deleteMedia] Failed to delete local file:', fsErr);
        }
      }

      res.json({ success: true, data: { deletedId: assetId } });
    } catch (err: any) {
      console.error('[MediaController.deleteMedia] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete media asset' },
      });
    }
  }

  // Bulk create multiple media assets
  public static async bulkCreateMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { assets = [] } = req.body;

      if (!Array.isArray(assets) || assets.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assets array is required and must not be empty' },
        });
        return;
      }

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const createdList: any[] = [];
      let totalBytesAdded = 0;

      for (const item of assets) {
        if (!item.fileName || !item.publicUrl) continue;

        const assetId = crypto.randomUUID();
        const brandPrefix = `brand-${brand.id.slice(0, 8)}`;
        const sanitizedFileName = item.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageKey = `uploads/${brandPrefix}-${assetId}-${sanitizedFileName}`;

        let resolvedUrl = item.publicUrl;
        let resolvedThumb = item.thumbnailUrl || item.publicUrl;
        let sizeBytes = Number(item.fileSizeBytes) || 1024;

        if (typeof item.publicUrl === 'string' && item.publicUrl.startsWith('data:image/')) {
          try {
            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const matches = item.publicUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const rawExt = matches[1].split('/')[1] || 'png';
              const ext = rawExt.includes('+') ? rawExt.split('+')[0] : rawExt;
              const diskFileName = `${brandPrefix}-${assetId}-${sanitizedFileName.replace(/\.[^/.]+$/, '')}.${ext}`;
              const diskFilePath = path.join(uploadsDir, diskFileName);
              const buffer = Buffer.from(matches[2], 'base64');
              fs.writeFileSync(diskFilePath, buffer);
              sizeBytes = buffer.length;
              const serverOrigin = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
              resolvedUrl = `${serverOrigin}/uploads/${diskFileName}`;
              resolvedThumb = resolvedUrl;
            }
          } catch (e) {
            // fallback
          }
        }

        const checksumSha256 = crypto.createHash('sha256').update(item.publicUrl).digest('hex');

        const meta = {
          title: item.title || item.fileName,
          folder: item.folder || 'General',
          tags: Array.isArray(item.tags) ? item.tags : [],
          favorite: Boolean(item.favorite),
          brandName: brand.name,
          checksumSha256,
          dimensions: item.dimensions || { width: 1080, height: 1080, aspectRatio: '1:1' },
          usageCount: 0,
        };

        await db('media_assets').insert({
          id: assetId,
          tenant_id: brand.tenant_id,
          brand_id: brand.id,
          storage_key: storageKey,
          public_url: resolvedUrl,
          thumbnail_url: resolvedThumb,
          file_name: item.fileName,
          mime_type: item.mimeType || 'image/png',
          file_size_bytes: sizeBytes,
          media_type: item.mediaType || 'image',
          metadata: JSON.stringify(meta),
          created_at: new Date(),
        });

        totalBytesAdded += sizeBytes;
        const row = await db('media_assets').where('id', assetId).first();
        createdList.push(formatMediaAsset(row));
      }

      if (totalBytesAdded > 0) {
        await UsageTrackerService.recordUsage(brand.tenant_id, 'storage_bytes_used', totalBytesAdded);
      }

      res.status(201).json({
        success: true,
        data: {
          created: createdList,
          count: createdList.length,
        },
      });
    } catch (err: any) {
      console.error('[MediaController.bulkCreateMedia] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk create media' } });
    }
  }

  // Bulk delete multiple media assets
  public static async bulkDeleteMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { assetIds = [] } = req.body;

      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assetIds array is required and must not be empty' },
        });
        return;
      }

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const matchingAssets = await db('media_assets')
        .where('brand_id', brandId)
        .whereIn('id', assetIds);

      if (matchingAssets.length === 0) {
        res.json({ success: true, data: { deletedIds: [], count: 0 } });
        return;
      }

      const validIds = matchingAssets.map((a) => a.id);
      let totalBytesFreed = 0;

      for (const asset of matchingAssets) {
        totalBytesFreed += Number(asset.file_size_bytes || 0);

        // Clean up disk file if unreferenced
        if (asset.public_url && asset.public_url.includes('/uploads/')) {
          try {
            const diskFileName = path.basename(asset.public_url);
            const localPath = path.join(process.cwd(), 'uploads', diskFileName);
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      await db('media_assets').whereIn('id', validIds).delete();

      if (totalBytesFreed > 0 && brand.tenant_id) {
        await UsageTrackerService.decrementUsage(brand.tenant_id, 'storage_bytes_used', totalBytesFreed);
      }

      res.json({
        success: true,
        data: {
          deletedIds: validIds,
          count: validIds.length,
        },
      });
    } catch (err: any) {
      console.error('[MediaController.bulkDeleteMedia] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk delete media' } });
    }
  }

  // Bulk update (e.g. move to folder, add tags)
  public static async bulkUpdateMedia(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { assetIds = [], folder, tags, addTags } = req.body;

      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assetIds array is required' },
        });
        return;
      }

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const matchingAssets = await db('media_assets')
        .where('brand_id', brandId)
        .whereIn('id', assetIds);

      for (const asset of matchingAssets) {
        const meta = parseAssetMetadata(asset.metadata);
        if (typeof folder === 'string' && folder.trim()) {
          meta.folder = folder.trim();
        }
        if (Array.isArray(tags)) {
          meta.tags = tags.map((t: any) => String(t).trim()).filter(Boolean);
        } else if (Array.isArray(addTags)) {
          const currentTags = Array.isArray(meta.tags) ? meta.tags : [];
          meta.tags = Array.from(new Set([...currentTags, ...addTags.map((t: any) => String(t).trim()).filter(Boolean)]));
        }

        await db('media_assets')
          .where('id', asset.id)
          .update({ metadata: JSON.stringify(meta) });
      }

      res.json({
        success: true,
        data: {
          updatedCount: matchingAssets.length,
          assetIds: matchingAssets.map((a) => a.id),
        },
      });
    } catch (err: any) {
      console.error('[MediaController.bulkUpdateMedia] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk update media' } });
    }
  }

  // Storage usage and quota summary
  public static async getStorageSummary(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const assets = await db('media_assets').where('brand_id', brandId).select('media_type', 'file_size_bytes');

      let usedBytes = 0;
      let imagesCount = 0;
      let videosCount = 0;
      let documentsCount = 0;

      for (const a of assets) {
        const size = Number(a.file_size_bytes) || 0;
        usedBytes += size;
        if (a.media_type === 'video') videosCount++;
        else if (a.media_type === 'document') documentsCount++;
        else imagesCount++;
      }

      let limitBytes = 5 * 1024 * 1024 * 1024; // 5 GB default
      let planName = 'Agency Pro';

      if (brand.tenant_id) {
        try {
          const resolvedSub = await EntitlementService.getResolvedSubscription(brand.tenant_id);
          if (resolvedSub) {
            planName = resolvedSub.planName || planName;
            if (resolvedSub.storageBytesLimit) limitBytes = Number(resolvedSub.storageBytesLimit);
          }
        } catch {
          // fallback to defaults
        }
      }

      const percentUsed = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 1000) / 10) : 0;

      res.json({
        success: true,
        data: {
          brandId: brand.id,
          brandName: brand.name,
          usedBytes,
          limitBytes,
          percentUsed,
          assetCount: assets.length,
          imagesCount,
          videosCount,
          documentsCount,
          planName,
        },
      });
    } catch (err: any) {
      console.error('[MediaController.getStorageSummary] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get storage summary' } });
    }
  }

  // Retrieve single media asset by ID
  public static async getMediaById(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, assetId } = req.params;

      const brand = await MediaController.verifyBrandAccess(req, brandId);
      if (!brand) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Brand not found or access denied' },
        });
        return;
      }

      const asset = await db('media_assets')
        .where({ id: assetId, brand_id: brandId })
        .first();

      if (!asset) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Media asset not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: formatMediaAsset(asset),
      });
    } catch (err: any) {
      console.error('[MediaController.getMediaById] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve asset' } });
    }
  }
}
