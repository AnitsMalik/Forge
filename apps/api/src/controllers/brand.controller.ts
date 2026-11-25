import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateBrandSchema, UpdateBrandKitSchema } from '@socialforge/shared';

export async function listBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const brands = await db('brands')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc')
      .select('*');

    return res.status(200).json({
      success: true,
      data: brands,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBrandById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId } = req.params;

    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    }

    const brandKit = await db('brand_kits').where({ brand_id: brand.id }).first();

    return res.status(200).json({
      success: true,
      data: {
        ...brand,
        kit: brandKit,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const validated = CreateBrandSchema.parse(req.body);

    // Check slug uniqueness within tenant
    const existing = await db('brands')
      .where({ tenant_id: tenantId, slug: validated.slug.toLowerCase() })
      .first();
    if (existing) {
      throw new AppError(409, 'SLUG_EXISTS', 'A brand with this slug already exists in your agency');
    }

    const brandId = crypto.randomUUID();

    await db.transaction(async (trx) => {
      await trx('brands').insert({
        id: brandId,
        tenant_id: tenantId,
        name: validated.name,
        slug: validated.slug.toLowerCase(),
        industry: validated.industry || null,
        website_url: validated.websiteUrl || null,
        timezone: validated.timezone || 'UTC',
      });

      // Assign creator as brand manager
      await trx('brand_users').insert({
        id: crypto.randomUUID(),
        brand_id: brandId,
        user_id: userId,
        brand_role: 'brand_manager',
      });

      // Initialize default Brand Kit
      await trx('brand_kits').insert({
        id: crypto.randomUUID(),
        brand_id: brandId,
        tone_of_voice: JSON.stringify({
          formality: 'approachable',
          descriptors: ['modern', 'friendly', 'authentic'],
        }),
        target_audiences: JSON.stringify(['General Audience']),
        primary_colors: JSON.stringify({
          primary: '#2563EB',
          secondary: '#7C3AED',
          accent: '#F59E0B',
          background: '#0F172A',
          text: '#F8FAFC',
        }),
        fonts: JSON.stringify({
          heading: 'Inter',
          body: 'Roboto',
        }),
        logo_urls: JSON.stringify({
          primary: null,
          icon: null,
          dark_mode: null,
        }),
        hashtags_default: JSON.stringify([]),
        taboo_words: JSON.stringify([]),
      });
    });

    const brand = await db('brands').where({ id: brandId }).first();

    return res.status(201).json({
      success: true,
      data: brand,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateBrandKit(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId } = req.params;
    const validated = UpdateBrandKitSchema.parse(req.body);

    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (validated.toneOfVoice) updates.tone_of_voice = JSON.stringify(validated.toneOfVoice);
    if (validated.targetAudiences) updates.target_audiences = JSON.stringify(validated.targetAudiences);
    if (validated.primaryColors) updates.primary_colors = JSON.stringify(validated.primaryColors);
    if (validated.fonts) updates.fonts = JSON.stringify(validated.fonts);
    if (validated.hashtagsDefault) updates.hashtags_default = JSON.stringify(validated.hashtagsDefault);
    if (validated.tabooWords) updates.taboo_words = JSON.stringify(validated.tabooWords);
    if (validated.disclaimers !== undefined) updates.disclaimers = validated.disclaimers;
    if (validated.guidelines !== undefined) updates.guidelines = validated.guidelines;

    await db('brand_kits').where({ brand_id: brandId }).update(updates);
    const updatedKit = await db('brand_kits').where({ brand_id: brandId }).first();

    return res.status(200).json({
      success: true,
      data: updatedKit,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId } = req.params;
    const { name, slug, industry, websiteUrl, timezone } = req.body;

    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (name) updates.name = name;
    if (slug) updates.slug = slug.toLowerCase();
    if (industry !== undefined) updates.industry = industry;
    if (websiteUrl !== undefined) updates.website_url = websiteUrl;
    if (timezone) updates.timezone = timezone;

    await db('brands').where({ id: brandId }).update(updates);
    const updated = await db('brands').where({ id: brandId }).first();

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId } = req.params;

    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    }

    await db('brands').where({ id: brandId }).delete();

    return res.status(200).json({
      success: true,
      message: 'Brand deleted successfully',
      data: { deletedBrandId: brandId },
    });
  } catch (err) {
    return next(err);
  }
}


