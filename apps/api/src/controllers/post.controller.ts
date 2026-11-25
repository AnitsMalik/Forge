import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreatePostSchema, SchedulePostSchema, isRealExternalPostId, isSandboxUrl } from '@socialforge/shared';
import { socialAdapterRegistry } from '../services/adapters/adapterRegistry.js';
import { decryptSecret, isEncryptedSecret } from '../services/cryptoVault.js';
import { AiCopyService } from '../services/aiCopyService.js';
import { BrandBrainService } from '../services/brandBrainService.js';
import { prePublishValidator } from '../services/meta/prePublishValidator.js';
import { UsageTrackerService } from '../services/usageTracker.service.js';
import { credentialVaultService } from '../services/connections/credentialVault.service.js';

export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId } = req.params;
    const { status, campaignId } = req.query;

    const query = db('posts')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .orderBy('created_at', 'desc');

    if (status) {
      query.andWhere('status', String(status));
    }
    if (campaignId) {
      query.andWhere('campaign_id', String(campaignId));
    }

    const posts = await query.select('*');

    // Attach variants and media assets
    const postIds = posts.map((p) => p.id);
    let variants: any[] = [];
    const mediaMap = new Map<string, any>();
    if (postIds.length > 0) {
      variants = await db('post_variants').whereIn('post_id', postIds).select('*');
      const allMediaIds = new Set<string>();
      variants.forEach((v) => {
        try {
          const ids = typeof v.media_asset_ids === 'string' ? JSON.parse(v.media_asset_ids) : v.media_asset_ids;
          if (Array.isArray(ids)) {
            ids.forEach((id: string) => {
              if (id) allMediaIds.add(id);
            });
          }
        } catch {}
      });
      if (allMediaIds.size > 0) {
        const assets = await db('media_assets').whereIn('id', Array.from(allMediaIds)).select('*');
        assets.forEach((a) => {
          mediaMap.set(a.id, {
            id: a.id,
            publicUrl: a.public_url,
            thumbnailUrl: a.thumbnail_url || a.public_url,
            fileName: a.file_name,
            mimeType: a.mime_type,
            fileSizeBytes: Number(a.file_size_bytes),
            mediaType: a.media_type,
            metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {}),
          });
        });
      }
    }

    const postsWithVariants = posts.map((post) => {
      const postVars = variants.filter((v) => v.post_id === post.id).map((v) => {
        let assetObj = null;
        try {
          const ids = typeof v.media_asset_ids === 'string' ? JSON.parse(v.media_asset_ids) : v.media_asset_ids;
          if (Array.isArray(ids) && ids.length > 0 && mediaMap.has(ids[0])) {
            assetObj = mediaMap.get(ids[0]);
          }
        } catch {}
        return {
          ...v,
          mediaAsset: assetObj,
          media: assetObj,
        };
      });

      const firstAsset = postVars.find((v) => v.mediaAsset)?.mediaAsset || null;

      return {
        ...post,
        media: firstAsset,
        variants: postVars,
      };
    });

    return res.status(200).json({
      success: true,
      data: postsWithVariants,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getPostById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const variants = await db('post_variants').where({ post_id: postId }).select('*');
    const allMediaIds = new Set<string>();
    variants.forEach((v) => {
      try {
        const ids = typeof v.media_asset_ids === 'string' ? JSON.parse(v.media_asset_ids) : v.media_asset_ids;
        if (Array.isArray(ids)) {
          ids.forEach((id: string) => {
            if (id) allMediaIds.add(id);
          });
        }
      } catch {}
    });

    const mediaMap = new Map<string, any>();
    if (allMediaIds.size > 0) {
      const assets = await db('media_assets').whereIn('id', Array.from(allMediaIds)).select('*');
      assets.forEach((a) => {
        mediaMap.set(a.id, {
          id: a.id,
          publicUrl: a.public_url,
          thumbnailUrl: a.thumbnail_url || a.public_url,
          fileName: a.file_name,
          mimeType: a.mime_type,
          fileSizeBytes: Number(a.file_size_bytes),
          mediaType: a.media_type,
          metadata: typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {}),
        });
      });
    }

    const hydratedVariants = variants.map((v) => {
      let assetObj = null;
      try {
        const ids = typeof v.media_asset_ids === 'string' ? JSON.parse(v.media_asset_ids) : v.media_asset_ids;
        if (Array.isArray(ids) && ids.length > 0 && mediaMap.has(ids[0])) {
          assetObj = mediaMap.get(ids[0]);
        }
      } catch {}
      return {
        ...v,
        mediaAsset: assetObj,
        media: assetObj,
      };
    });

    const firstAsset = hydratedVariants.find((v) => v.mediaAsset)?.mediaAsset || null;

    return res.status(200).json({
      success: true,
      data: {
        ...post,
        media: firstAsset,
        variants: hydratedVariants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { brandId } = req.params;
    const validated = CreatePostSchema.parse(req.body);

    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    }

    const postId = crypto.randomUUID();

    await db.transaction(async (trx) => {
      await trx('posts').insert({
        id: postId,
        tenant_id: tenantId,
        brand_id: brandId,
        author_id: userId,
        campaign_id: validated.campaignId || null,
        title: validated.title,
        base_content: validated.baseContent,
        status: 'draft',
      });

      const variantsToInsert = validated.variants.map((v) => ({
        id: crypto.randomUUID(),
        post_id: postId,
        platform: v.platform,
        content: v.content,
        media_asset_ids: JSON.stringify(v.mediaAssetIds || []),
        platform_specific_config: JSON.stringify(v.platformSpecificConfig || {}),
        status: 'pending',
      }));

      await trx('post_variants').insert(variantsToInsert);
    });

    const post = await db('posts').where({ id: postId }).first();
    const variants = await db('post_variants').where({ post_id: postId }).select('*');

    return res.status(201).json({
      success: true,
      data: {
        ...post,
        variants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

import { fromBrandLocal, getTimezoneDetails } from '@socialforge/shared';

export async function schedulePost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;
    const validated = SchedulePostSchema.parse(req.body);

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const brand = await db('brands').where({ id: brandId }).first();
    const timeZone = brand?.timezone || 'Asia/Kolkata';

    let targetDate: Date;
    if (typeof validated.scheduledFor === 'string' && validated.scheduledFor.endsWith('Z')) {
      targetDate = new Date(validated.scheduledFor);
    } else if (typeof validated.scheduledFor === 'string' && validated.scheduledFor.includes('T')) {
      const [dStr, tStr] = validated.scheduledFor.split('T');
      targetDate = fromBrandLocal(dStr, tStr, timeZone);
    } else {
      targetDate = new Date(validated.scheduledFor);
    }

    if (isNaN(targetDate.getTime())) {
      throw new AppError(400, 'INVALID_DATE', 'Invalid scheduled date format');
    }

    await db('posts')
      .where({ id: postId })
      .update({
        status: 'scheduled',
        scheduled_for: targetDate,
        updated_at: new Date(),
      });

    // Synchronize corresponding publishing_jobs for all variants
    const variants = await db('post_variants').where({ post_id: postId }).select('*');
    for (const v of variants) {
      const existingJob = await db('publishing_jobs').where({ content_id: v.id }).first();
      if (existingJob) {
        await db('publishing_jobs')
          .where({ id: existingJob.id })
          .update({
            scheduled_at: targetDate,
            status: 'scheduled',
            updated_at: new Date(),
          });
      } else {
        const sa = await db('social_accounts').where({ brand_id: brandId, platform: v.platform }).first();
        const accountId = sa?.account_id || (v.platform === 'facebook' ? '1405588742634526' : `acc_${v.platform}_${brandId.slice(0, 8)}`);

        let mediaAssetIds = [];
        try {
          mediaAssetIds = typeof v.media_asset_ids === 'string'
            ? JSON.parse(v.media_asset_ids)
            : (Array.isArray(v.media_asset_ids) ? v.media_asset_ids : []);
        } catch {
          mediaAssetIds = [];
        }

        await db('publishing_jobs').insert({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          brand_id: brandId,
          user_id: req.user!.id,
          platform: v.platform,
          account_id: accountId,
          content_id: v.id,
          post_id: postId,
          scheduled_at: targetDate,
          status: 'scheduled',
          attempt_count: 0,
          max_attempts: 3,
          payload: JSON.stringify({
            contentText: v.content,
            mediaAssetIds,
          }),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    const updatedPost = await db('posts').where({ id: postId }).first();

    return res.status(200).json({
      success: true,
      data: {
        ...updatedPost,
        variants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Core atomic publishing engine with strict idempotency guard
 */
export async function executePublishPost(
  postId: string,
  brandId: string,
  tenantId: string,
  options?: { force?: boolean; platforms?: string[] }
): Promise<{ success: boolean; idempotent?: boolean; post: any; variants: any[]; message?: string; partialSuccess?: boolean; status?: string }> {
  const post = await db('posts')
    .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
    .first();

  if (!post) {
    throw new AppError(404, 'POST_NOT_FOUND', `Post ${postId} not found`);
  }

  // Idempotency guard: prevent duplicate publishing unless explicitly forced
  if (!options?.force) {
    if (post.status === 'published' || post.status === 'sandbox') {
      const rawVariants = await db('post_variants').where({ post_id: postId }).select('*');
      const variants = rawVariants.map((rv) => {
        let cfg: any = {};
        try {
          cfg = typeof rv.platform_specific_config === 'string'
            ? JSON.parse(rv.platform_specific_config)
            : rv.platform_specific_config || {};
        } catch {}
        return {
          ...rv,
          simulated: Boolean(cfg?.simulated || cfg?.isSandbox),
          isSandbox: Boolean(cfg?.simulated || cfg?.isSandbox),
        };
      });
      return {
        success: true,
        idempotent: true,
        post,
        variants,
        message: post.status === 'sandbox' ? 'Post is already published in sandbox mode.' : 'Post is already published.',
      };
    }
    if (post.status === 'publishing') {
      const rawVariants = await db('post_variants').where({ post_id: postId }).select('*');
      const variants = rawVariants.map((rv) => {
        let cfg: any = {};
        try {
          cfg = typeof rv.platform_specific_config === 'string'
            ? JSON.parse(rv.platform_specific_config)
            : rv.platform_specific_config || {};
        } catch {}
        return {
          ...rv,
          simulated: Boolean(cfg?.simulated || cfg?.isSandbox),
          isSandbox: Boolean(cfg?.simulated || cfg?.isSandbox),
        };
      });
      return {
        success: true,
        idempotent: true,
        post,
        variants,
        message: 'Post is currently being published.',
      };
    }
  }

  const now = new Date();

  // Atomically lock post status to 'publishing' to prevent race conditions (Requirement 6)
  if (!options?.force) {
    const lockRows = await db('posts')
      .where({ id: postId })
      .whereNot({ status: 'publishing' })
      .update({ status: 'publishing', updated_at: now });

    if (lockRows === 0) {
      const rawVariants = await db('post_variants').where({ post_id: postId }).select('*');
      const variants = rawVariants.map((rv) => {
        let cfg: any = {};
        try {
          cfg = typeof rv.platform_specific_config === 'string'
            ? JSON.parse(rv.platform_specific_config)
            : rv.platform_specific_config || {};
        } catch {}
        return {
          ...rv,
          simulated: Boolean(cfg?.simulated || cfg?.isSandbox),
          isSandbox: Boolean(cfg?.simulated || cfg?.isSandbox),
        };
      });
      return {
        success: true,
        idempotent: true,
        post,
        variants,
        message: 'Post is currently being published or was already published by another request.',
      };
    }
  } else {
    await db('posts')
      .where({ id: postId })
      .update({ status: 'publishing', updated_at: now });
  }

  // 1. Fetch connected social accounts for this brand to resolve credentials
  const allBrandAccounts = await db('social_accounts')
    .where({ brand_id: brandId });

  const accountByPlatform = new Map<string, any>();
  for (const acc of allBrandAccounts) {
    const platformKey = acc.platform.toLowerCase();
    const existing = accountByPlatform.get(platformKey);
    if (!existing) {
      accountByPlatform.set(platformKey, acc);
    } else {
      let isExistingSandbox = false;
      let isNewSandbox = false;
      try {
        const em = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata;
        isExistingSandbox = em?.isSandbox === true;
      } catch {}
      try {
        const nm = typeof acc.metadata === 'string' ? JSON.parse(acc.metadata) : acc.metadata;
        isNewSandbox = nm?.isSandbox === true;
      } catch {}

      if ((!existing.is_active && acc.is_active) || (isExistingSandbox && !isNewSandbox)) {
        accountByPlatform.set(platformKey, acc);
      }
    }
  }

  // Also query social_connections (from Connect Hub / Unified Onboarding) for any platforms
  try {
    const conns = await db('social_connections')
      .where({ brand_id: brandId, tenant_id: tenantId })
      .whereNot({ status: 'DISCONNECTED' });

    for (const conn of conns) {
      const rawPlat = conn.provider.toLowerCase();
      const platformKey = rawPlat === 'x_twitter' ? 'twitter' : rawPlat;
      if (!accountByPlatform.has(platformKey)) {
        let resolvedToken = '';
        let isSandbox = false;
        if (conn.credential_reference) {
          try {
            const creds: any = await credentialVaultService.getCredentials(tenantId, conn.credential_reference);
            resolvedToken = creds?.accessToken || creds?.apiKey || '';
            isSandbox = Boolean(creds?.isSandbox);
          } catch {
            // Safe fallback if vault decryption key rotated
          }
        }
        accountByPlatform.set(platformKey, {
          id: conn.id,
          platform: conn.provider,
          account_name: conn.account_name,
          account_id: conn.provider_account_id,
          is_active: conn.status === 'CONNECTED',
          access_token_encrypted: resolvedToken,
          metadata: {
            isSandbox,
            ...(typeof conn.provider_account_metadata === 'string'
              ? JSON.parse(conn.provider_account_metadata)
              : conn.provider_account_metadata || {}),
          },
        });
      }
    }
  } catch (connErr: any) {
    console.warn('[executePublishPost] Could not resolve social_connections:', connErr.message);
  }

  // 2. Pre-Publish Validation (Requirement 3: verify token, page, permissions, instagram account, active state. If validation fails, STOP before publishing)
  const variants = await db('post_variants').where({ post_id: postId }).select('*');
  const targetVariants = variants.filter((v) => {
    if (options?.platforms && options.platforms.length > 0 && !options.platforms.includes(v.platform)) {
      return false;
    }
    if (v.status === 'published' && isRealExternalPostId(v.remote_post_id)) {
      return false;
    }
    if (v.status === 'published' && !options?.force) {
      return false;
    }
    return true;
  });

  const metaPlatforms = targetVariants
    .map((v) => v.platform.toLowerCase())
    .filter((p) => p === 'facebook' || p === 'instagram');

  if (metaPlatforms.length > 0) {
    const valResult = await prePublishValidator.validateForLivePublish(brandId, metaPlatforms);
    if (!valResult.valid) {
      const errorMsg = valResult.errors.join('; ');
      const isTokenExpired = valResult.errors.some((e) => /expired/i.test(e) || /190/.test(e));
      const code = isTokenExpired ? 'META_TOKEN_EXPIRED' : 'PRE_PUBLISH_VALIDATION_FAILED';

      // STOP before publishing! Maintain partially_published if other variants are already live
      const hasAnyPublished = variants.some((v: any) => v.status === 'published' && isRealExternalPostId(v.remote_post_id));
      await db('posts')
        .where({ id: postId })
        .update({ status: hasAnyPublished ? 'partially_published' : 'failed', updated_at: now });

      for (const v of targetVariants) {
        if (v.status === 'published' && isRealExternalPostId(v.remote_post_id)) {
          continue;
        }
        if (['facebook', 'instagram'].includes(v.platform.toLowerCase())) {
          await db('post_variants')
            .where({ id: v.id })
            .update({ status: 'failed', updated_at: now });

          await db('publish_logs').insert({
            id: crypto.randomUUID(),
            post_variant_id: v.id,
            attempt_number: 1,
            status: 'failed',
            http_status: isTokenExpired ? 401 : 400,
            response_payload: JSON.stringify({
              error: errorMsg,
              code,
              errors: valResult.errors,
              metaCode: 190,
              metaType: 'OAuthException',
              safeMessage: errorMsg,
              reauthRequired: isTokenExpired,
              reauthUrl: `/api/v1/integrations/meta/connect?brandId=${brandId}`,
            }),
            error_message: errorMsg,
            created_at: now,
          });
        }
      }

      const updatedPost = await db('posts').where({ id: postId }).first();
      const rawUpdatedVariants = await db('post_variants').where({ post_id: postId }).select('*');
      const updatedVariants = rawUpdatedVariants.map((rv) => {
        let cfg: any = {};
        try {
          cfg = typeof rv.platform_specific_config === 'string'
            ? JSON.parse(rv.platform_specific_config)
            : rv.platform_specific_config || {};
        } catch {}
        return {
          ...rv,
          simulated: Boolean(cfg?.simulated || cfg?.isSandbox),
          isSandbox: Boolean(cfg?.simulated || cfg?.isSandbox),
        };
      });

      return {
        success: false,
        message: `Pre-publish validation stopped publishing: ${errorMsg}`,
        post: updatedPost,
        variants: updatedVariants,
      };
    }
  }

  let hasFailures = false;

  for (const v of variants) {
    // If specific platforms are requested, skip variants not in the selected platforms list
    if (options?.platforms && options.platforms.length > 0 && !options.platforms.includes(v.platform)) {
      continue;
    }

    // Requirement 8: Ensure retrying cannot create duplicate posts!
    // Skip any variant that is already confirmed published with a valid remote ID, even if options.force is true.
    if ((v.status === 'published' && isRealExternalPostId(v.remote_post_id)) || (v.status === 'sandbox' && !options?.force)) {
      console.log(`[executePublishPost] Skipping already published/sandbox variant ${v.id} (${v.platform}: ${v.remote_post_id}) to prevent duplicate publishing.`);
      continue;
    }

    const adapter = socialAdapterRegistry.getAdapter(v.platform);
    const acc = accountByPlatform.get(v.platform.toLowerCase());

    // If an account is registered for this platform but marked inactive (e.g. Meta token expired),
    // do NOT silently fall back to mock sandbox! Fail the variant with an actionable notification.
    if (acc && !acc.is_active) {
      const errorMsg = `Account "${acc.account_name}" (${v.platform}) is inactive or access token has expired. Please re-authorize Meta in Social Channels to publish live.`;
      const metaCode = 190;
      const metaType = 'OAuthException';
      const safeMessage = `Your ${acc.account_name} access token has expired (OAuthException 190). Please re-authorize Meta in the Social Channels tab to publish live.`;

      await db('publish_logs').insert({
        id: crypto.randomUUID(),
        post_variant_id: v.id,
        attempt_number: 1,
        status: 'failed',
        http_status: 401,
        response_payload: JSON.stringify({
          error: errorMsg,
          code: 'META_AUTH_REQUIRED',
          metaCode,
          metaType,
          safeMessage,
        }),
        error_message: errorMsg,
        created_at: now,
      });

      hasFailures = true;
      await db('post_variants')
        .where({ id: v.id })
        .update({
          status: 'failed',
          updated_at: now,
        });

      continue;
    }

    let credentials = undefined;
    if (acc) {
      let token = acc.access_token_encrypted;
      try {
        if (isEncryptedSecret(token)) {
          token = decryptSecret(token);
        }
      } catch {
        // Fallback if decryption fails
      }
      credentials = {
        accessToken: token,
        accountName: acc.account_name,
        accountId: acc.account_id,
        isSandbox: acc.metadata ? JSON.parse(typeof acc.metadata === 'string' ? acc.metadata : JSON.stringify(acc.metadata))?.isSandbox !== false : true,
      };
    }

    // Resolve media URLs from media_asset_ids if attached
    const rawAssetIds = typeof v.media_asset_ids === 'string'
      ? (() => { try { return JSON.parse(v.media_asset_ids); } catch { return []; } })()
      : (Array.isArray(v.media_asset_ids) ? v.media_asset_ids : []);

    let resolvedMediaUrls: string[] = [];
    if (Array.isArray(rawAssetIds) && rawAssetIds.length > 0) {
      const assets = await db('media_assets').whereIn('id', rawAssetIds);
      resolvedMediaUrls = assets.map((a: any) => a.public_url).filter(Boolean);
    }

    // Requirement 7: Before publishing/retrying, verify media requirements
    if (v.platform.toLowerCase() === 'instagram') {
      const mediaVal = prePublishValidator.validateMediaRequirements('instagram', resolvedMediaUrls);
      if (!mediaVal.valid) {
        const errorMsg = mediaVal.error || 'Instagram requires at least one image or video attachment.';
        await db('publish_logs').insert({
          id: crypto.randomUUID(),
          post_variant_id: v.id,
          attempt_number: 1,
          status: 'failed',
          http_status: 400,
          response_payload: JSON.stringify({
            error: errorMsg,
            code: 'META_MEDIA_REQUIRED',
            platform: 'instagram',
            safeMessage: errorMsg,
          }),
          error_message: errorMsg,
          created_at: now,
        });

        hasFailures = true;
        await db('post_variants').where({ id: v.id }).update({
          status: 'failed',
          updated_at: now,
        });
        continue;
      }
    }

    // Requirement 6: Disallow simulated sandbox fallback during live publishing for Meta
    if (credentials?.isSandbox && (v.platform.toLowerCase() === 'facebook' || v.platform.toLowerCase() === 'instagram')) {
      const errorMsg = `Channel "${v.platform}" is running in Mock Sandbox Mode. Live publishing must not be reported as successful when it has not occurred.`;
      await db('publish_logs').insert({
        id: crypto.randomUUID(),
        post_variant_id: v.id,
        attempt_number: 1,
        status: 'failed',
        http_status: 400,
        response_payload: JSON.stringify({
          error: errorMsg,
          code: 'MOCK_SANDBOX_DISALLOWED_FOR_LIVE',
          safeMessage: errorMsg,
        }),
        error_message: errorMsg,
        created_at: now,
      });

      hasFailures = true;
      await db('post_variants').where({ id: v.id }).update({
        status: 'failed',
        updated_at: now,
      });
      continue;
    }

    // Execute adapter publish
    const pubResult = await adapter.publish(
      {
        postVariantId: v.id,
        postId: post.id,
        brandId,
        platform: v.platform,
        content: v.content,
        mediaUrls: resolvedMediaUrls,
      },
      credentials
    );

    // Record to publish_logs audit trail
    await db('publish_logs').insert({
      id: crypto.randomUUID(),
      post_variant_id: v.id,
      attempt_number: 1,
      status: pubResult.success ? 'success' : 'failed',
      http_status: pubResult.httpStatus || (pubResult.success ? 200 : 400),
      response_payload: JSON.stringify(pubResult.rawResponse || {}),
      error_message: pubResult.errorMessage || null,
      created_at: now,
    });

    const isSimulated = Boolean(pubResult.rawResponse?.simulated || credentials?.isSandbox || !credentials?.accessToken);
    const isReal = !isSimulated && isRealExternalPostId(pubResult.remotePostId) && !isSandboxUrl(pubResult.remotePostUrl);
    const variantStatus = isReal ? 'published' : 'sandbox';

    if (pubResult.success) {
      let existingConfig: any = {};
      try {
        existingConfig = typeof v.platform_specific_config === 'string'
          ? JSON.parse(v.platform_specific_config)
          : v.platform_specific_config || {};
      } catch {}

      await db('post_variants')
        .where({ id: v.id })
        .update({
          status: variantStatus,
          remote_post_id: pubResult.remotePostId,
          remote_post_url: pubResult.remotePostUrl,
          platform_specific_config: JSON.stringify({
            ...existingConfig,
            simulated: !isReal,
            isSandbox: !isReal,
          }),
          updated_at: now,
        });

      // Upsert telemetry metrics from adapter
      const metrics = await adapter.fetchMetrics(pubResult.remotePostId, credentials);
      const existingMetric = await db('analytics_metrics').where({ post_variant_id: v.id }).first();
      if (!existingMetric) {
        await db('analytics_metrics').insert({
          id: crypto.randomUUID(),
          post_variant_id: v.id,
          impressions: metrics.impressions,
          reach: metrics.reach,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          clicks: metrics.clicks,
          video_views: metrics.videoViews || Math.floor(metrics.reach * 0.4),
          engagement_rate: Math.min(0.9999, metrics.engagementRate / 100),
          recorded_at: now,
        });
      }
    } else {
      hasFailures = true;
      await db('post_variants')
        .where({ id: v.id })
        .update({
          status: 'failed',
          updated_at: now,
        });
    }
  }

  // 3. Update overall post status
  const finalVariants = await db('post_variants').where({ post_id: postId }).select('*');
  const finalTargetVariants = options?.platforms && options.platforms.length > 0
    ? finalVariants.filter((v) => options.platforms!.includes(v.platform))
    : finalVariants;
  const allPublished = finalTargetVariants.length > 0 && finalTargetVariants.every((v) => v.status === 'published');
  const somePublished = finalTargetVariants.some((v) => v.status === 'published');
  const allSandbox = finalTargetVariants.length > 0 && finalTargetVariants.every((v) => v.status === 'sandbox');
  const someSandbox = finalTargetVariants.some((v) => v.status === 'sandbox');

  const overallStatus = allPublished
    ? 'published'
    : somePublished
    ? 'partially_published'
    : allSandbox || someSandbox
    ? 'sandbox'
    : 'failed';

  // Atomic transaction for post status update and real production quota consumption
  await db.transaction(async (trx) => {
    await trx('posts')
      .where({ id: postId })
      .update({
        status: overallStatus,
        published_at: allPublished || somePublished ? now : null,
        updated_at: now,
      });

    // Quota is consumed ONLY after successful real production publication (published or partially_published).
    // Never for sandbox, mock, failed, cancelled, invalid, or rejected.
    // Atomic check-and-set prevents double counting during retries.
    if (overallStatus === 'published' || overallStatus === 'partially_published') {
      const rowsClaimed = await trx('posts')
        .where({ id: postId, tenant_id: tenantId, quota_counted: false })
        .whereIn('status', ['published', 'partially_published'])
        .update({ quota_counted: true });

      if (rowsClaimed > 0) {
        await UsageTrackerService.recordUsage(tenantId, 'posts_published', 1, trx);
      }
    }
  });

  const updatedPost = await db('posts').where({ id: postId }).first();
  const rawVariants = await db('post_variants').where({ post_id: postId }).select('*');
  const updatedVariants = rawVariants.map((rv) => {
    let cfg: any = {};
    try {
      cfg = typeof rv.platform_specific_config === 'string'
        ? JSON.parse(rv.platform_specific_config)
        : rv.platform_specific_config || {};
    } catch {}
    return {
      ...rv,
      simulated: Boolean(cfg?.simulated || cfg?.isSandbox),
      isSandbox: Boolean(cfg?.simulated || cfg?.isSandbox),
    };
  });

  return {
    success: allPublished,
    partialSuccess: somePublished && !allPublished,
    status: overallStatus,
    post: updatedPost,
    variants: updatedVariants,
  };
}

export async function publishPostNow(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;
    const { force = false, platforms } = req.body || {};

    const result = await executePublishPost(postId, brandId, tenantId, { force, platforms });

    if (!result.success) {
      const failedVariants = (result.variants || []).filter((v: any) =>
        v.status === 'failed' && (!platforms || platforms.length === 0 || platforms.includes(v.platform))
      );
      const failedVariantIds = failedVariants.map((v: any) => v.id);

      let failureMessage = result.message || '';
      let firstFailedPayload: any = {};
      if (failedVariantIds.length > 0) {
        const logs = await db('publish_logs')
          .whereIn('post_variant_id', failedVariantIds)
          .where({ status: 'failed' })
          .orderBy('created_at', 'desc');

        if (logs.length > 0) {
          if (logs[0]?.response_payload) {
            try {
              firstFailedPayload = typeof logs[0].response_payload === 'string'
                ? JSON.parse(logs[0].response_payload)
                : logs[0].response_payload;
            } catch {}
          }

          const reasons = logs
            .map((l: any) => {
              const v = failedVariants.find((fv: any) => fv.id === l.post_variant_id);
              const platName = v?.platform ? `[${v.platform.toUpperCase()}] ` : '';
              return `${platName}${l.error_message || 'Publishing failed'}`;
            })
            .filter(Boolean);
          if (reasons.length > 0) {
            failureMessage = reasons.join('; ');
          }
        }
      }

      if (!failureMessage) {
        failureMessage = 'One or more social platform variants failed to publish.';
      }

      const metaCode = firstFailedPayload.metaCode ?? firstFailedPayload.code;
      const metaType = firstFailedPayload.metaType;
      const safeMessage = firstFailedPayload.safeMessage || failureMessage;
      const fbtraceId = firstFailedPayload.fbtraceId;

      return res.status(400).json({
        success: false,
        status: result.status || result.post?.status || (result.partialSuccess ? 'PARTIAL_SUCCESS' : 'failed'),
        partialSuccess: result.partialSuccess || false,
        error: {
          code: result.partialSuccess ? 'PARTIAL_SUCCESS' : 'PUBLISH_FAILED',
          message: failureMessage,
          metaCode,
          metaType,
          safeMessage,
          fbtraceId,
        },
        metaCode,
        metaType,
        safeMessage,
        fbtraceId,
        message: failureMessage,
        data: {
          ...result.post,
          status: result.status || result.post?.status || (result.partialSuccess ? 'PARTIAL_SUCCESS' : 'failed'),
          variants: result.variants,
        },
      });
    }

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent || false,
      message: result.message || 'Post published successfully.',
      data: {
        ...result.post,
        variants: result.variants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function batchPublishPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId } = req.params;
    const { postIds, force = false } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'postIds array is required');
    }

    let publishedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const pid of postIds) {
      try {
        const resPub = await executePublishPost(pid, brandId, tenantId, { force });
        if (resPub.idempotent) skippedCount++;
        else if (resPub.success) publishedCount++;
        else failedCount++;
        results.push({ postId: pid, ...resPub });
      } catch (err: any) {
        failedCount++;
        results.push({ postId: pid, success: false, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalCount: postIds.length,
        publishedCount,
        skippedCount,
        failedCount,
        results,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function retryPublishPost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;

    const result = await executePublishPost(postId, brandId, tenantId, { force: true });

    if (!result.success) {
      const failedVariants = (result.variants || []).filter((v: any) => v.status === 'failed');
      const failedVariantIds = failedVariants.map((v: any) => v.id);

      let failureMessage = result.message || '';
      if (failedVariantIds.length > 0) {
        const logs = await db('publish_logs')
          .whereIn('post_variant_id', failedVariantIds)
          .where({ status: 'failed' })
          .orderBy('created_at', 'desc');

        if (logs.length > 0) {
          const reasons = logs
            .map((l: any) => {
              const v = failedVariants.find((fv: any) => fv.id === l.post_variant_id);
              const platName = v?.platform ? `[${v.platform.toUpperCase()}] ` : '';
              return `${platName}${l.error_message || 'Publishing failed'}`;
            })
            .filter(Boolean);
          if (reasons.length > 0) {
            failureMessage = reasons.join('; ');
          }
        }
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'PUBLISH_FAILED',
          message: failureMessage || 'Retry failed for one or more platforms.',
        },
        message: failureMessage || 'Retry failed for one or more platforms.',
        data: {
          ...result.post,
          variants: result.variants,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...result.post,
        variants: result.variants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    const variantIds = await db('post_variants').where({ post_id: postId }).pluck('id');
    if (variantIds.length > 0) {
      await db('publish_logs').whereIn('post_variant_id', variantIds).del().catch(() => {});
      await db('analytics_metrics').whereIn('post_variant_id', variantIds).del().catch(() => {});
      await db('post_variants').where({ post_id: postId }).del();
    }

    await db('posts').where({ id: postId }).del();

    return res.status(200).json({
      success: true,
      data: { id: postId, deleted: true },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update single post metadata and content (without affecting campaign)
 */
export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;
    const { title, baseContent, scheduledFor, status, variants } = req.body;

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const updates: any = { updated_at: new Date() };
    if (title !== undefined) updates.title = title;
    if (baseContent !== undefined) updates.base_content = baseContent;
    if (status !== undefined) updates.status = status;
    if (scheduledFor !== undefined) updates.scheduled_for = scheduledFor ? new Date(scheduledFor) : null;

    await db.transaction(async (trx) => {
      await trx('posts').where({ id: postId }).update(updates);

      if (Array.isArray(variants)) {
        for (const v of variants) {
          if (!v || !v.platform) continue;
          const existingVariant = await trx('post_variants')
            .where({ post_id: postId, platform: v.platform })
            .first();

          const variantData: any = {
            content: v.content !== undefined ? v.content : '',
            updated_at: new Date(),
          };
          if (v.mediaAssetIds !== undefined) {
            variantData.media_asset_ids = JSON.stringify(v.mediaAssetIds || []);
          }
          if (v.platformSpecificConfig !== undefined) {
            variantData.platform_specific_config = JSON.stringify(v.platformSpecificConfig || {});
          }

          if (existingVariant) {
            await trx('post_variants').where({ id: existingVariant.id }).update(variantData);
          } else {
            await trx('post_variants').insert({
              id: crypto.randomUUID(),
              post_id: postId,
              platform: v.platform,
              content: variantData.content,
              media_asset_ids: variantData.media_asset_ids || JSON.stringify([]),
              platform_specific_config: variantData.platform_specific_config || JSON.stringify({}),
              status: 'pending',
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }
      }

      if (scheduledFor !== undefined && updates.scheduled_for) {
        const postVars = await trx('post_variants').where({ post_id: postId });
        for (const pv of postVars) {
          await trx('publishing_jobs')
            .where({ content_id: pv.id })
            .update({ scheduled_at: updates.scheduled_for, updated_at: new Date() });
        }
      }
    });

    const updatedPost = await db('posts').where({ id: postId }).first();
    const updatedVariants = await db('post_variants').where({ post_id: postId }).select('*');

    return res.status(200).json({
      success: true,
      data: {
        ...updatedPost,
        variants: updatedVariants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Duplicate a post as a new draft
 */
export async function duplicatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { brandId, postId } = req.params;

    const originalPost = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!originalPost) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post to duplicate not found');
    }

    const originalVariants = await db('post_variants').where({ post_id: postId });

    const newPostId = crypto.randomUUID();
    const now = new Date();

    await db.transaction(async (trx) => {
      await trx('posts').insert({
        id: newPostId,
        tenant_id: tenantId,
        brand_id: brandId,
        author_id: userId || originalPost.author_id,
        campaign_id: originalPost.campaign_id,
        title: `${originalPost.title || 'Untitled Post'} (Copy)`,
        base_content: originalPost.base_content,
        status: 'draft',
        scheduled_for: null,
        created_at: now,
        updated_at: now,
      });

      if (originalVariants.length > 0) {
        const variantsToInsert = originalVariants.map((v: any) => ({
          id: crypto.randomUUID(),
          post_id: newPostId,
          platform: v.platform,
          content: v.content,
          media_asset_ids: typeof v.media_asset_ids === 'string' ? v.media_asset_ids : JSON.stringify(v.media_asset_ids || []),
          platform_specific_config: typeof v.platform_specific_config === 'string' ? v.platform_specific_config : JSON.stringify(v.platform_specific_config || {}),
          status: 'pending',
          remote_post_id: null,
          remote_post_url: null,
          created_at: now,
          updated_at: now,
        }));

        await trx('post_variants').insert(variantsToInsert);
      }
    });

    const clonedPost = await db('posts').where({ id: newPostId }).first();
    const clonedVariants = await db('post_variants').where({ post_id: newPostId }).select('*');

    return res.status(201).json({
      success: true,
      message: 'Post duplicated successfully as draft',
      data: {
        ...clonedPost,
        variants: clonedVariants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Update specific platform variant copy for a single post
 */
export async function updatePostVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId, platform } = req.params;
    const { content, hashtags, hookTitle, callToAction } = req.body;

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const existingVariant = await db('post_variants')
      .where({ post_id: postId, platform })
      .first();

    const now = new Date();
    if (existingVariant) {
      const currentConfig = typeof existingVariant.platform_specific_config === 'string'
        ? JSON.parse(existingVariant.platform_specific_config || '{}')
        : (existingVariant.platform_specific_config || {});
      if (hashtags !== undefined) currentConfig.hashtags = hashtags;
      if (hookTitle !== undefined) currentConfig.hookTitle = hookTitle;
      if (callToAction !== undefined) currentConfig.callToAction = callToAction;

      await db('post_variants')
        .where({ id: existingVariant.id })
        .update({
          content: content !== undefined ? content : existingVariant.content,
          platform_specific_config: JSON.stringify(currentConfig),
          updated_at: now,
        });
    } else {
      const config: any = {};
      if (hashtags !== undefined) config.hashtags = hashtags;
      if (hookTitle !== undefined) config.hookTitle = hookTitle;
      if (callToAction !== undefined) config.callToAction = callToAction;

      await db('post_variants').insert({
        id: crypto.randomUUID(),
        post_id: postId,
        platform,
        content: content || '',
        media_asset_ids: JSON.stringify([]),
        platform_specific_config: JSON.stringify(config),
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
    }

    await db('posts').where({ id: postId }).update({ updated_at: now });

    const updatedPost = await db('posts').where({ id: postId }).first();
    const variants = await db('post_variants').where({ post_id: postId }).select('*');

    return res.status(200).json({
      success: true,
      data: {
        ...updatedPost,
        variants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Regenerate ONLY this single post (without touching the rest of the campaign)
 */
export async function regenerateSinglePost(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;
    const { prompt, style } = req.body;

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const brand = await db('brands').where({ id: brandId }).first();
    const brandKit = await db('brand_kits').where({ brand_id: brandId }).first();
    const brandBrain = await BrandBrainService.getBrandBrain(brandId);

    const effectivePrompt = prompt || post.base_content || post.title;

    // Generate multi-platform copy variants
    const copyResult = AiCopyService.generateMultiPlatformCopy(
      { prompt: effectivePrompt, style: style || 'promotional_launch' },
      { name: brand.name, slug: brand.slug, industry: brand.industry },
      brandKit,
      brandBrain
    );

    const now = new Date();
    await db('posts')
      .where({ id: postId })
      .update({
        base_content: effectivePrompt,
        updated_at: now,
      });

    // Update variants in-place
    const existingVariants = await db('post_variants').where({ post_id: postId }).select('*');
    for (const v of existingVariants) {
      const generated = copyResult.variants[v.platform as keyof typeof copyResult.variants];
      if (generated) {
        await db('post_variants')
          .where({ id: v.id })
          .update({
            content: generated.content,
            character_count: generated.characterCount,
            hashtags: JSON.stringify(generated.hashtags || []),
            hook_title: generated.hookTitle || null,
            call_to_action: generated.callToAction || null,
            updated_at: now,
          });
      }
    }

    const updatedPost = await db('posts').where({ id: postId }).first();
    const variants = await db('post_variants').where({ post_id: postId }).select('*');

    return res.status(200).json({
      success: true,
      data: {
        ...updatedPost,
        variants,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Execute any of the 11 AI Actions on this single post variant
 */
export async function transformPostVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { brandId, postId } = req.params;
    const { operation, platform, targetLanguage } = req.body;

    const post = await db('posts')
      .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
      .first();

    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const targetPlatform = platform || 'instagram';
    const variant = await db('post_variants')
      .where({ post_id: postId, platform: targetPlatform })
      .first();

    const sourceContent = variant?.content || post.base_content || '';

    const transformedResult = AiCopyService.transformCopy({
      content: sourceContent,
      platform: targetPlatform as any,
      operation,
      targetLanguage,
    });

    const now = new Date();
    if (variant) {
      await db('post_variants')
        .where({ id: variant.id })
        .update({
          content: transformedResult.transformedContent,
          character_count: transformedResult.characterCount,
          updated_at: now,
        });
    } else {
      await db('post_variants').insert({
        id: crypto.randomUUID(),
        post_id: postId,
        platform: targetPlatform,
        content: transformedResult.transformedContent,
        character_count: transformedResult.characterCount,
        created_at: now,
        updated_at: now,
      });
    }

    await db('posts').where({ id: postId }).update({ updated_at: now });

    const updatedPost = await db('posts').where({ id: postId }).first();
    const variants = await db('post_variants').where({ post_id: postId }).select('*');

    return res.status(200).json({
      success: true,
      data: {
        ...updatedPost,
        variants,
        transformation: transformedResult,
      },
    });
  } catch (err) {
    return next(err);
  }
}

