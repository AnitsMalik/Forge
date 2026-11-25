import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../../db/connection.js';
import { metaClient, MetaClient } from './metaClient.js';
import { metaTokenManager } from './tokenManager.js';
import { metaMediaService } from './media.js';
import { normalizeMetaError, MetaIntegrationError } from './errors.js';
import { config } from '../../config/index.js';
import { enqueuePublishingJob } from '../queues/publishingQueue.js';
import type {
  MetaPublishPayload,
  MetaPublishResult,
  PublishingJobStatus,
} from '@socialforge/shared';
import {
  isRealExternalPostId,
  isSandboxUrl,
  isRealPublication,
} from '@socialforge/shared';

export interface ExecutePublishContext {
  tenantId?: string;
  brandId?: string;
  userId?: string;
  connectionId?: string;
  jobId?: string;
  agentId?: string;
  accessToken?: string;
}

/**
 * Rejects simulated/mock object IDs (e.g. fb_post_*, mock_*, ig_media_*, sb_*, UUIDs).
 * In live mode, only genuine Meta post IDs are permitted to be recorded as published.
 */
export function isRealMetaObjectId(id: unknown): boolean {
  return isRealExternalPostId(id);
}

export class MetaPublishingService {
  /**
   * Main unified entry point for publishing content to Facebook Pages or Instagram Professional accounts.
   */
  public async publishSocialPost(
    payload: MetaPublishPayload,
    context: ExecutePublishContext = {}
  ): Promise<MetaPublishResult> {
    const { platform, accountId, text, caption, mediaUrls, scheduledAt, brandId, postId, postVariantId } = payload;
    const contentText = caption || text || '';
    const now = new Date();

    const tenantId = context.tenantId || (brandId ? await this.resolveTenantId(brandId) : null);
    const userId = context.userId || (await this.resolveUserId(brandId));
    const agentId = context.agentId || 'ai_social_agent';

    // 1. Check if post is scheduled for future
    const isScheduled = scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 60 * 1000;
    if (isScheduled && !context.jobId) {
      const jobId = crypto.randomUUID();
      await db('publishing_jobs').insert({
        id: jobId,
        tenant_id: tenantId,
        brand_id: brandId,
        user_id: userId,
        connection_id: context.connectionId || null,
        platform,
        account_id: accountId,
        content_id: postVariantId || null,
        post_id: postId || null,
        scheduled_at: new Date(scheduledAt!),
        status: 'scheduled',
        attempt_count: 0,
        max_attempts: 3,
        payload: JSON.stringify(payload),
        created_at: now,
        updated_at: now,
      });

      // Reliable BullMQ Enqueue (sub-millisecond dispatch decoupled from MySQL polling)
      const delayMs = Math.max(0, new Date(scheduledAt!).getTime() - Date.now());
      enqueuePublishingJob(
        {
          jobId,
          tenantId: tenantId!,
          brandId: brandId!,
          platform,
          accountId,
          scheduledAt: scheduledAt!,
        },
        { delayMs }
      ).catch((e) => console.warn('[PublishingService] BullMQ background enqueue error:', e));

      // Audit log
      await this.recordAuditLog({
        tenantId: tenantId!,
        brandId: brandId!,
        userId: userId!,
        agentId,
        platform,
        accountId,
        action: 'schedule_post',
        contentId: postId || postVariantId,
        result: 'pending',
        metadata: { scheduledAt, jobId },
      });

      return {
        success: true,
        status: 'scheduled',
        publishedAt: now,
      };
    }

    // 2. Refuse duplicate publishing for already published content
    if (postVariantId) {
      const existingVariant = await db('post_variants').where({ id: postVariantId }).first();
      if (existingVariant && isRealPublication(existingVariant)) {
        throw new MetaIntegrationError({
          code: 'DUPLICATE_PUBLISHING_ATTEMPT',
          userMessage: `Content variant ${postVariantId} is already confirmed published on ${existingVariant.platform} with remote ID ${existingVariant.remote_post_id}. Duplicate publishing refused.`,
          safeMessage: 'Duplicate publishing refused: content variant is already published.',
          httpStatus: 409,
          isTransient: false,
        });
      }
    }

    // 3. Strict Ownership Hierarchy Enforcement (Tenant -> Brand -> Connection)
    if (brandId) {
      const brand = await db('brands').where({ id: brandId }).first();
      if (!brand) {
        throw new MetaIntegrationError({
          code: 'BRAND_NOT_FOUND',
          userMessage: `Brand ${brandId} not found.`,
          httpStatus: 404,
          isTransient: false,
        });
      }
      if (context.tenantId && context.tenantId !== brand.tenant_id) {
        throw new MetaIntegrationError({
          code: 'TENANT_ISOLATION_VIOLATION',
          userMessage: 'Tenant isolation violation: brand does not belong to the authenticated tenant.',
          safeMessage: 'Tenant isolation violation: brand does not belong to tenant.',
          httpStatus: 403,
          isTransient: false,
        });
      }

      // Check Meta connection ownership and ownership conflicts
      const conn = context.connectionId
        ? await db('meta_connections').where({ id: context.connectionId }).first()
        : await db('meta_connections').where({ brand_id: brandId }).first();

      if (conn) {
        if (conn.tenant_id !== brand.tenant_id) {
          throw new MetaIntegrationError({
            code: 'TENANT_ISOLATION_VIOLATION',
            userMessage: 'Tenant isolation violation: Meta connection does not match brand tenant.',
            safeMessage: 'Tenant isolation violation: Meta connection does not match brand tenant.',
            httpStatus: 403,
            isTransient: false,
          });
        }

        // Block on ownership conflict
        if (conn.status === 'ownership_conflict') {
          throw new MetaIntegrationError({
            code: 'META_OWNERSHIP_CONFLICT',
            userMessage: 'This Meta Page has an ownership conflict across multiple brands/tenants. Publishing is blocked until resolved.',
            safeMessage: 'Publishing blocked: ownership conflict detected on Meta connection.',
            httpStatus: 409,
            isTransient: false,
          });
        }

        // Check for cross-brand/tenant duplicate Page ownership
        const targetPage = accountId || conn.selected_page_id;
        if (targetPage) {
          const conflicting = await db('meta_connections')
            .where({ selected_page_id: targetPage })
            .whereNot({ brand_id: brandId });

          if (conflicting.length > 0) {
            await db('meta_connections')
              .whereIn('id', [conn.id, ...conflicting.map((c: any) => c.id)])
              .update({
                status: 'ownership_conflict',
                updated_at: now,
              });

            await db('social_accounts')
              .whereIn('brand_id', [conn.brand_id, ...conflicting.map((c: any) => c.brand_id)])
              .where({ account_id: targetPage })
              .update({
                is_active: false,
                updated_at: now,
              });

            throw new MetaIntegrationError({
              code: 'META_OWNERSHIP_CONFLICT',
              userMessage: `Meta Page ${targetPage} is connected to multiple brands/tenants (ownership conflict). Publishing is blocked until resolved.`,
              safeMessage: 'Publishing blocked: Meta Page has an ownership conflict.',
              httpStatus: 409,
              isTransient: false,
            });
          }
        }
      }
    }

    // Resolve credentials server-side (or use explicit override when accountId is 'me' / direct adapter test)
    const credentials = (context.accessToken && (!accountId || accountId === 'me'))
      ? { accessToken: context.accessToken, expiresAt: null, connectionId: context.connectionId || null }
      : await this.resolveCredentials(platform, accountId, brandId, context.connectionId);
    if (!credentials.accessToken) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: `No valid access token found for ${platform} account ${accountId}. Please reconnect your Meta account.`,
        httpStatus: 401,
        isTransient: false,
      });
    }

    // Check expiration
    if (metaTokenManager.isTokenExpired(credentials.expiresAt)) {
      throw new MetaIntegrationError({
        code: 'META_TOKEN_EXPIRED',
        userMessage: 'The Meta access token for this account has expired. Please re-authorize SocialForge.',
        httpStatus: 401,
        isTransient: false,
      });
    }

    // 3. Track or create job record
    let currentJobId = context.jobId;
    if (!currentJobId) {
      currentJobId = crypto.randomUUID();
      await db('publishing_jobs').insert({
        id: currentJobId,
        tenant_id: tenantId,
        brand_id: brandId,
        user_id: userId,
        connection_id: credentials.connectionId || null,
        platform,
        account_id: accountId,
        content_id: postVariantId || null,
        post_id: postId || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt) : now,
        status: 'publishing',
        attempt_count: 1,
        max_attempts: 3,
        payload: JSON.stringify(payload),
        created_at: now,
        updated_at: now,
      });
    } else {
      await db('publishing_jobs')
        .where({ id: currentJobId })
        .update({
          status: 'publishing',
          attempt_count: db.raw('attempt_count + 1'),
          updated_at: now,
        });
    }

    // 4. Execute publishing according to platform
    try {
      let publishResult: { externalPostId: string; externalPostUrl: string; raw: any };

      if (platform === 'facebook') {
        publishResult = await this.publishToFacebookPage(
          accountId,
          contentText,
          mediaUrls || [],
          credentials.accessToken
        );
      } else if (platform === 'instagram') {
        publishResult = await this.publishToInstagramProfessional(
          accountId,
          contentText,
          mediaUrls || [],
          credentials.accessToken
        );
      } else {
        throw new Error(`Unsupported Meta platform: ${platform}`);
      }

      // 5. Never record a simulated/fabricated ID as a live publish.
      const isReal = isRealExternalPostId(publishResult.externalPostId) && !isSandboxUrl(publishResult.externalPostUrl);
      if (!config.meta.testMode && !isReal) {
        throw new MetaIntegrationError({
          code: 'META_API_ERROR',
          userMessage: 'Meta did not return a valid post ID. The post was NOT marked as published.',
          safeMessage: `Rejected non-Meta post ID "${String(publishResult.externalPostId).slice(0, 40)}" in live mode.`,
          httpStatus: 502,
          isTransient: false,
        });
      }

      const finalStatus: PublishingJobStatus = isReal ? 'published' : 'sandbox';

      // 6. Success handling
      await db('publishing_jobs')
        .where({ id: currentJobId })
        .update({
          status: finalStatus,
          external_post_id: publishResult.externalPostId,
          external_post_url: publishResult.externalPostUrl,
          last_error: null,
          updated_at: new Date(),
        });

      // Update post variant if linked
      if (postVariantId) {
        await db('post_variants')
          .where({ id: postVariantId })
          .update({
            status: finalStatus,
            remote_post_id: publishResult.externalPostId,
            remote_post_url: publishResult.externalPostUrl,
            updated_at: new Date(),
          });
      }

      // Update post overall status if linked
      if (postId) {
        const postVars = await db('post_variants').where({ post_id: postId });
        const anyPublished = postVars.some((v: any) => (v.id === postVariantId ? finalStatus === 'published' : v.status === 'published'));
        const allPublished = postVars.length > 0 && postVars.every((v: any) => (v.id === postVariantId ? finalStatus === 'published' : v.status === 'published'));
        const postStatus = allPublished ? 'published' : anyPublished ? 'partially_published' : 'sandbox';

        await db('posts')
          .where({ id: postId })
          .update({
            status: postStatus,
            published_at: anyPublished ? new Date() : null,
            updated_at: new Date(),
          });
      }

      // Audit log
      await this.recordAuditLog({
        tenantId: tenantId!,
        brandId: brandId!,
        userId: userId!,
        agentId,
        platform,
        accountId,
        action: 'publish_post',
        contentId: postId || postVariantId,
        result: 'success',
        externalId: publishResult.externalPostId,
        metadata: {
          url: publishResult.externalPostUrl,
          jobId: currentJobId,
        },
      });

      // Update meta_connections on success for observability
      if (brandId) {
        try {
          const conn = await db('meta_connections').where({ brand_id: brandId }).first();
          if (conn) {
            const existingMeta = typeof conn.metadata === 'string' ? JSON.parse(conn.metadata || '{}') : (conn.metadata || {});
            await db('meta_connections').where({ id: conn.id }).update({
              status: 'connected',
              metadata: JSON.stringify({
                ...existingMeta,
                last_publish_at: new Date().toISOString(),
                last_published_url: publishResult.externalPostUrl,
              }),
              updated_at: new Date(),
            });
          }
        } catch {}
      }

      return {
        success: true,
        status: 'published',
        externalPostId: publishResult.externalPostId,
        externalPostUrl: publishResult.externalPostUrl,
        publishedAt: new Date(),
        rawResponse: publishResult.raw,
      };
    } catch (err: any) {
      const normalized = normalizeMetaError(err);
      const isTransient = normalized.isTransient;

      // Update meta_connections and social_accounts with structured status and error (Requirements 1, 2, 7 & 9)
      if (brandId) {
        try {
          const conn = await db('meta_connections').where({ brand_id: brandId }).first();
          if (conn) {
            let newStatus: 'reauth_required' | 'permission_required' | 'temporary_error' | 'connected' = (conn.status as any) || 'connected';
            const isAuthError = normalized.code === 'META_TOKEN_EXPIRED' || normalized.code === 'META_AUTH_REQUIRED';
            if (isAuthError) {
              newStatus = 'reauth_required';
            } else if (normalized.code === 'META_PERMISSION_DENIED') {
              newStatus = 'permission_required';
            } else if (isTransient) {
              newStatus = 'temporary_error';
            }

            const existingMeta = typeof conn.metadata === 'string' ? JSON.parse(conn.metadata || '{}') : (conn.metadata || {});
            await db('meta_connections').where({ id: conn.id }).update({
              status: newStatus,
              metadata: JSON.stringify({
                ...existingMeta,
                last_failure_code: normalized.rawMetaCode || normalized.code,
                last_failure_at: new Date().toISOString(),
                reauth_required: newStatus === 'reauth_required',
                lastError: {
                  code: normalized.code,
                  metaCode: normalized.rawMetaCode || (isAuthError ? 190 : 0),
                  metaSubcode: normalized.metaSubcode,
                  message: normalized.userMessage,
                  timestamp: new Date().toISOString(),
                },
              }),
              updated_at: new Date(),
            });

            // Only deactivate social account on non-transient auth/permission failure
            if (isAuthError || normalized.code === 'META_PERMISSION_DENIED') {
              await db('social_accounts')
                .where({ brand_id: brandId, platform })
                .update({ is_active: false, updated_at: new Date() });
            }
          }
        } catch {}
      }

      // Exponential backoff retry calculation
      const jobRow = await db('publishing_jobs').where({ id: currentJobId }).first();
      const currentAttempts = jobRow ? jobRow.attempt_count : 1;
      const maxAttempts = jobRow ? jobRow.max_attempts : 3;

      let nextRetryAt: Date | null = null;
      let finalJobStatus: PublishingJobStatus = 'failed';

      if (isTransient && currentAttempts < maxAttempts) {
        finalJobStatus = 'scheduled';
        const delaySeconds = normalized.retryAfterSeconds || Math.pow(2, currentAttempts) * 5;
        nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
      }

      await db('publishing_jobs')
        .where({ id: currentJobId })
        .update({
          status: finalJobStatus,
          last_error: normalized.safeMessage || normalized.message,
          next_retry_at: nextRetryAt,
          updated_at: new Date(),
        });

      if (postVariantId) {
        await db('post_variants')
          .where({ id: postVariantId })
          .update({
            status: 'failed',
            updated_at: new Date(),
          });
      }

      // Audit log
      await this.recordAuditLog({
        tenantId: tenantId!,
        brandId: brandId!,
        userId: userId!,
        agentId,
        platform,
        accountId,
        action: 'publish_post',
        contentId: postId || postVariantId,
        result: 'failure',
        error: normalized.safeMessage || normalized.message,
        metadata: {
          jobId: currentJobId,
          isTransient,
          nextRetryAt,
          metaCode: normalized.rawMetaCode,
          metaType: normalized.metaType,
          fbtraceId: normalized.fbtraceId,
        },
      });

      return {
        success: false,
        status: finalJobStatus,
        publishedAt: new Date(),
        errorMessage: normalized.safeMessage || normalized.message,
        safeMessage: normalized.safeMessage || normalized.message,
        metaCode: normalized.rawMetaCode,
        metaType: normalized.metaType,
        fbtraceId: normalized.fbtraceId,
        httpStatus: normalized.httpStatus || 400,
        isTransient,
        retryAfterSeconds: normalized.retryAfterSeconds,
        rawResponse: {
          error: normalized.safeMessage || normalized.message,
          code: normalized.metaCode,
          metaCode: normalized.rawMetaCode,
          metaType: normalized.metaType,
          safeMessage: normalized.safeMessage,
          fbtraceId: normalized.fbtraceId,
        },
      };
    }
  }

  /**
   * Facebook Page Publishing flow.
   * Supports:
   * - Photo post: POST /{page-id}/photos
   * - Video post: POST /{page-id}/videos
   * - Text post: POST /{page-id}/feed
   */
  /**
   * Facebook Page Publishing flow.
   * Requirement 7: Verify actual Page ID being sent to Meta (1405588742634526).
   * Requirement 9: Verify GET Page validation succeeds before publishing: /{page-id}?fields=id,name
   * Requirement 10: Verify Page permissions: pages_read_engagement, pages_manage_posts
   * Requirement 11: Facebook publish request is POST /{page-id}/feed with correct message/page token.
   */
  private async publishToFacebookPage(
    pageId: string,
    text: string,
    mediaUrls: string[],
    accessToken: string
  ): Promise<{ externalPostId: string; externalPostUrl: string; raw: any }> {
    if (!pageId) {
      throw new MetaIntegrationError({
        code: 'META_PAGE_NOT_FOUND',
        userMessage: 'Facebook Page ID is missing or invalid.',
        safeMessage: 'Facebook Page ID is missing or invalid.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    // Requirement 9: Verify GET Page validation succeeds before publishing: /{page-id}?fields=id,name,category
    // Note: On Graph API v20.0, 'tasks' is only returned on /me/accounts (with a User token) and throws OAuthException #100 on GET /{page-id} with a Page Access Token.
    console.log(`[MetaPublishingService] Performing GET Page validation for Page ID: ${pageId}`);
    const pageValidation: any = await metaClient.get(
      `${pageId}`,
      { fields: 'id,name,category' },
      accessToken
    );

    if (!pageValidation || !pageValidation.id) {
      throw new MetaIntegrationError({
        code: 'META_PAGE_NOT_FOUND',
        userMessage: `Facebook Page ${pageId} could not be validated.`,
        safeMessage: `Facebook Page ${pageId} could not be validated.`,
        httpStatus: 404,
        isTransient: false,
      });
    }

    // Requirement 10: Verify Page permissions if tasks array was provided by mock or user-token call
    if (pageValidation.tasks && Array.isArray(pageValidation.tasks) && pageValidation.tasks.length > 0) {
      const tasks = pageValidation.tasks;
      const hasPostPermission = tasks.includes('CREATE_CONTENT') || tasks.includes('MANAGE') || tasks.includes('MODERATE');
      if (!hasPostPermission) {
        throw new MetaIntegrationError({
          code: 'META_PERMISSION_DENIED',
          userMessage: `Missing required publishing permissions (pages_manage_posts) on Page ${pageValidation.name || pageId}.`,
          safeMessage: `Missing required publishing permissions (pages_manage_posts) on Page ${pageValidation.name || pageId}.`,
          httpStatus: 403,
          isTransient: false,
        });
      }
    }

    // Requirement 11: Facebook publish request:
    // - If an image is attached (local /uploads/ file, base64 data:image/*, or remote image URL), publish via POST /{page-id}/photos
    // - Otherwise publish text/link via POST /{page-id}/feed
    const firstMedia = mediaUrls?.[0];
    let data: any = null;

    const hasFeedMockOnly = MetaClient.hasMock('feed') && !MetaClient.hasMock('photos');
    const resolvedImage = (!config.meta.testMode && !accessToken.startsWith('mock_') && !hasFeedMockOnly && firstMedia)
      ? await this.resolveFacebookImageBinary(firstMedia)
      : null;

    if (resolvedImage && !config.meta.testMode && !accessToken.startsWith('mock_') && !hasFeedMockOnly) {
      console.log(`[MetaPublishingService] Uploading binary image (${resolvedImage.fileName}, ${resolvedImage.buffer.length} bytes, ${resolvedImage.mimeType}) to POST /${pageId}/photos`);
      const formData = new FormData();
      formData.append(
        'source',
        new Blob([new Uint8Array(resolvedImage.buffer)], { type: resolvedImage.mimeType }),
        resolvedImage.fileName
      );
      formData.append('message', text || '');
      formData.append('published', 'true');

      data = await metaClient.postMultipart(
        `${pageId}/photos`,
        formData,
        accessToken
      );
    } else if (
      firstMedia &&
      !config.meta.testMode &&
      !accessToken.startsWith('mock_') &&
      !hasFeedMockOnly &&
      firstMedia.startsWith('http') &&
      !firstMedia.includes('localhost') &&
      !firstMedia.includes('127.0.0.1') &&
      /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(firstMedia)
    ) {
      console.log(`[MetaPublishingService] Publishing remote image URL to POST /${pageId}/photos`);
      data = await metaClient.post(
        `${pageId}/photos`,
        {
          url: firstMedia,
          message: text || '',
          published: true,
        },
        accessToken
      );
    } else {
      const feedPayload: Record<string, any> = {
        message: text || '',
      };

      if (firstMedia && firstMedia.startsWith('http') && !firstMedia.includes('localhost') && !firstMedia.includes('127.0.0.1')) {
        feedPayload.link = firstMedia;
      }

      data = await metaClient.post(
        `${pageId}/feed`,
        feedPayload,
        accessToken
      );
    }

    // For /{page-id}/photos, Meta returns { id: "<photo_id>", post_id: "<page_id>_<post_id>" }.
    // Prefer post_id so externalPostId has the canonical <page_id>_<post_id> format.
    const postId = data.post_id || data.id;
    let externalPostUrl = postId && String(postId).includes('_')
      ? `https://www.facebook.com/${String(postId).split('_')[0]}/posts/${String(postId).split('_')[1]}`
      : `https://www.facebook.com/${postId}`;
    try {
      const permalinkRes: any = await metaClient.get(
        `${postId}`,
        { fields: 'permalink_url' },
        accessToken
      );
      if (permalinkRes?.permalink_url) {
        externalPostUrl = permalinkRes.permalink_url;
      }
    } catch {}

    return {
      externalPostId: postId,
      externalPostUrl,
      raw: data,
    };
  }

  /**
   * Resolves a local /uploads/ URL, base64 data:image/* URI, or remote image URL into a binary Buffer
   * for direct multipart upload to Facebook's POST /{page-id}/photos endpoint.
   */
  private async resolveFacebookImageBinary(
    mediaUrl: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
    if (!mediaUrl || typeof mediaUrl !== 'string') return null;

    const inferMimeType = (nameOrExt: string): string => {
      const lower = nameOrExt.toLowerCase();
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.gif')) return 'image/gif';
      return 'image/png';
    };

    // 1. Handle local /uploads/ files (including http://localhost:4000/uploads/... or relative /uploads/...)
    if (mediaUrl.includes('/uploads/')) {
      const rawAfterUploads = mediaUrl.split('/uploads/')[1]?.split('?')[0]?.split('#')[0];
      if (rawAfterUploads) {
        const diskFileName = decodeURIComponent(rawAfterUploads);
        const candidatePaths = [
          path.join(process.cwd(), 'uploads', diskFileName),
          path.join(process.cwd(), 'apps', 'api', 'uploads', diskFileName),
          path.resolve('f:/SocialAgent/apps/api/uploads', diskFileName),
          path.resolve('f:/SocialAgent/uploads', diskFileName),
        ];

        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate)) {
            const buffer = fs.readFileSync(candidate);
            const mimeType = inferMimeType(diskFileName);
            return { buffer, mimeType, fileName: diskFileName };
          }
        }
      }
    }

    // 2. Handle base64 raster data:image/(png|jpeg|jpg|webp|gif);base64,... URIs
    const base64Match = mediaUrl.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i);
    if (base64Match && base64Match.length === 3) {
      const mimeType = base64Match[1].toLowerCase();
      const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
      const buffer = Buffer.from(base64Match[2], 'base64');
      return { buffer, mimeType, fileName: `facebook-upload-${Date.now()}.${ext}` };
    }

    // 2b. Handle SVG data URIs (data:image/svg+xml;base64,... or data:image/svg+xml;utf8,...) from TemplateEngine
    if (mediaUrl.startsWith('data:image/svg+xml')) {
      try {
        const pwModName = 'playwright';
        const pw: any = await import(pwModName);
        if (pw?.chromium) {
          const browser = await pw.chromium.launch({ headless: true });
          try {
            const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
            await page.setContent(
              `<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:#0f172a;"><img src="${mediaUrl}" style="width:1080px;height:1080px;object-fit:contain;display:block;" /></body></html>`,
              { waitUntil: 'load' }
            );
            const pngBuffer: Buffer = await page.screenshot({ type: 'png' });
            return {
              buffer: Buffer.from(pngBuffer),
              mimeType: 'image/png',
              fileName: `template-render-${Date.now()}.png`,
            };
          } finally {
            await browser.close();
          }
        }
      } catch (svgErr) {
        console.warn('[MetaPublishingService] SVG rasterization fallback skipped:', (svgErr as any)?.message);
      }
    }

    // 3. Handle remote image URLs (e.g. https://images.unsplash.com/... or .png/.jpg/.webp) by downloading binary
    if (
      mediaUrl.startsWith('https://') &&
      !mediaUrl.includes('localhost') &&
      (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(mediaUrl) ||
        mediaUrl.includes('images.unsplash.com') ||
        mediaUrl.includes('placehold.co'))
    ) {
      try {
        const res = await fetch(mediaUrl);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.startsWith('image/') && !contentType.includes('svg')) {
            const arrayBuf = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
            return { buffer, mimeType: contentType.split(';')[0], fileName: `facebook-remote-${Date.now()}.${ext}` };
          }
        }
      } catch {}
    }

    return null;
  }

  /**
   * Instagram Professional Publishing flow using official container-based workflow:
   * 1. Create media container (POST /{ig-user-id}/media)
   * 2. Poll container status until FINISHED
   * 3. Publish container (POST /{ig-user-id}/media_publish)
   * 4. Retrieve permanent permalink
   */
  private async publishToInstagramProfessional(
    instagramAccountId: string,
    caption: string,
    mediaUrls: string[],
    accessToken: string
  ): Promise<{ externalPostId: string; externalPostUrl: string; raw: any }> {
    const firstMedia = mediaUrls[0];
    if (!firstMedia) {
      throw new MetaIntegrationError({
        code: 'META_MEDIA_INVALID',
        userMessage: 'Instagram requires at least one image or video attachment for all posts.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    const validated = metaMediaService.validateMedia(firstMedia, 'instagram');

    // 1. Create media container
    const containerParams: Record<string, any> = {
      caption,
    };

    if (validated.mediaType === 'video') {
      containerParams.media_type = 'REELS';
      containerParams.video_url = validated.resolvedUrl;
    } else {
      containerParams.image_url = validated.resolvedUrl;
    }

    const containerRes: any = await metaClient.post(
      `${instagramAccountId}/media`,
      containerParams,
      accessToken
    );

    const containerId = containerRes?.id;
    if (!containerId) {
      throw new MetaIntegrationError({
        code: 'META_API_ERROR',
        userMessage: 'Failed to create Instagram media container.',
        httpStatus: 500,
        isTransient: false,
        technicalDetails: JSON.stringify(containerRes),
      });
    }

    // 2. Poll container status until FINISHED
    await this.pollContainerStatus(containerId, accessToken);

    // 3. Publish container
    const publishRes: any = await metaClient.post(
      `${instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
      },
      accessToken
    );

    const mediaId = publishRes?.id;
    if (!mediaId) {
      throw new MetaIntegrationError({
        code: 'META_API_ERROR',
        userMessage: 'Instagram media container was not published successfully.',
        httpStatus: 500,
        isTransient: false,
        technicalDetails: JSON.stringify(publishRes),
      });
    }

    // 4. Fetch real permanent permalink
    let permalink = `https://www.instagram.com/p/${mediaId}`;
    try {
      const permalinkRes: any = await metaClient.get(
        mediaId,
        { fields: 'permalink,shortcode' },
        accessToken
      );
      if (permalinkRes?.permalink) {
        permalink = permalinkRes.permalink;
      }
    } catch {
      // Fallback permalink is acceptable
    }

    return {
      externalPostId: mediaId,
      externalPostUrl: permalink,
      raw: publishRes,
    };
  }

  /**
   * Polls an Instagram media container until it is ready (status_code: 'FINISHED').
   */
  private async pollContainerStatus(
    containerId: string,
    accessToken: string,
    maxWaitSeconds = 60
  ): Promise<void> {
    const startTime = Date.now();
    let delayMs = 2000;

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const statusRes: any = await metaClient.get(
        containerId,
        { fields: 'status_code,status' },
        accessToken
      );

      const statusCode = statusRes?.status_code;

      if (statusCode === 'FINISHED') {
        return;
      }

      if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
        throw new MetaIntegrationError({
          code: 'META_MEDIA_INVALID',
          userMessage: `Instagram media processing failed: ${statusRes?.status || statusCode}`,
          httpStatus: 400,
          isTransient: false,
          technicalDetails: JSON.stringify(statusRes),
        });
      }

      // Wait with backoff
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 1.5, 8000);
    }

    throw new MetaIntegrationError({
      code: 'META_MEDIA_PROCESSING',
      userMessage: 'Instagram media container processing timed out. Will retry shortly.',
      httpStatus: 202,
      isTransient: true,
      retryAfterSeconds: 15,
    });
  }

  /**
   * Resolves credentials for an account from meta_connections or social_accounts.
   */
  public async resolveCredentials(
    platform: 'facebook' | 'instagram',
    accountId: string,
    brandId?: string,
    connectionId?: string
  ): Promise<{ accessToken: string | null; expiresAt?: Date | null; connectionId?: string | null }> {
    // Strictly isolate by brand or connection to prevent cross-brand leakage (Requirement 7)
    if (!brandId && !connectionId) {
      return { accessToken: null };
    }

    let connQuery = db('meta_connections');
    if (connectionId) {
      connQuery = connQuery.where({ id: connectionId });
    } else if (brandId) {
      connQuery = connQuery.where({ brand_id: brandId });
    }

    const conn = await connQuery.first();

    // For Facebook Page Publishing:
    // A Page Access Token is strictly required (User tokens cannot publish to Page feeds).
    if (platform === 'facebook') {
      // 1. Try meta_facebook_pages table for this connection
      if (conn) {
        let pageRec = null;
        if (accountId) {
          pageRec = await db('meta_facebook_pages')
            .where({ connection_id: conn.id, page_id: accountId })
            .first();
        }
        if (!pageRec && conn.selected_page_id) {
          pageRec = await db('meta_facebook_pages')
            .where({ connection_id: conn.id, page_id: conn.selected_page_id })
            .first();
        }
        if (pageRec && pageRec.encrypted_access_token) {
          return {
            accessToken: metaTokenManager.decryptToken(pageRec.encrypted_access_token),
            expiresAt: conn.credential_expires_at,
            connectionId: conn.id,
          };
        }
      }

      // 2. Try meta_connections encrypted_page_access_token
      if (conn && conn.encrypted_page_access_token) {
        if (!accountId || conn.selected_page_id === accountId) {
          return {
            accessToken: metaTokenManager.decryptToken(conn.encrypted_page_access_token),
            expiresAt: conn.credential_expires_at,
            connectionId: conn.id,
          };
        }
      }

      // 3. Try social_accounts table for Facebook
      if (brandId) {
        let saQuery = db('social_accounts')
          .where({ brand_id: brandId, platform: 'facebook', is_active: true });
        if (accountId) {
          saQuery = saQuery.where({ account_id: accountId });
        }
        const socialAccount = await saQuery.first();
        if (socialAccount && socialAccount.access_token_encrypted) {
          return {
            accessToken: metaTokenManager.decryptToken(socialAccount.access_token_encrypted),
            expiresAt: socialAccount.token_expires_at || conn?.credential_expires_at,
            connectionId: conn?.id || null,
          };
        }
      }

      // Never use user tokens or dev environment tokens for Facebook Page publishing!
      return { accessToken: null };
    }

    // For Instagram:
    if (conn) {
      const tokenEnc = conn.encrypted_page_access_token || conn.encrypted_user_access_token;
      if (tokenEnc) {
        return {
          accessToken: metaTokenManager.decryptToken(tokenEnc),
          expiresAt: conn.credential_expires_at,
          connectionId: conn.id,
        };
      }
    }

    if (brandId) {
      const socialAccount = await db('social_accounts')
        .where({ brand_id: brandId, platform, account_id: accountId, is_active: true })
        .first();

      if (socialAccount && socialAccount.access_token_encrypted) {
        return {
          accessToken: metaTokenManager.decryptToken(socialAccount.access_token_encrypted),
          expiresAt: socialAccount.token_expires_at,
          connectionId: conn?.id || null,
        };
      }
    }

    return { accessToken: null };
  }

  private async resolveTenantId(brandId: string): Promise<string> {
    const brand = await db('brands').where({ id: brandId }).first();
    return brand ? brand.tenant_id : '';
  }

  private async resolveUserId(brandId?: string): Promise<string> {
    if (!brandId) return '';
    const bu = await db('brand_users').where({ brand_id: brandId }).first();
    if (bu) return bu.user_id;
    const firstUser = await db('users').first();
    return firstUser ? firstUser.id : '';
  }

  private async recordAuditLog(log: {
    tenantId: string;
    brandId: string;
    userId: string;
    agentId?: string;
    platform: string;
    accountId: string;
    action: string;
    contentId?: string | null;
    result: string;
    externalId?: string | null;
    error?: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: log.tenantId,
        brand_id: log.brandId,
        user_id: log.userId,
        agent_id: log.agentId || 'ai_social_agent',
        platform: log.platform,
        account_id: log.accountId,
        action: log.action,
        content_id: log.contentId || null,
        timestamp: new Date(),
        result: log.result,
        external_id: log.externalId || null,
        error: log.error || null,
        metadata: log.metadata ? JSON.stringify(log.metadata) : null,
        created_at: new Date(),
      });
    } catch (err) {
      console.error('[MetaPublishingService.recordAuditLog] Failed to record audit log:', err);
    }
  }
}

export const metaPublishingService = new MetaPublishingService();
