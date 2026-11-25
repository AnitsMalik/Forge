import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../db/connection.js';
import { publishMockPost } from '../engines/publishers/mockPublisher.js';
import { isRealExternalPostId, isSandboxUrl } from '@socialforge/shared';

function resolveMasterKey(customKeyHex?: string): Buffer {
  const envKey = customKeyHex || process.env.ENCRYPTION_MASTER_KEY;
  if (envKey) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return crypto.createHash('sha256').update('socialforge-local-dev-master-encryption-key-2026').digest();
}

function decryptSecret(cipherString: string): string {
  if (!cipherString) return '';
  const parts = cipherString.split(':');
  if (parts.length !== 3 || parts[0].length !== 32 || parts[1].length !== 32) {
    return cipherString;
  }
  const [ivHex, authTagHex, encryptedText] = parts;
  const key = resolveMasterKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function resolveFacebookPageCredentials(brandId: string, accountId?: string): Promise<{ pageId: string; accessToken: string } | null> {
  if (process.env.META_TEST_MODE === 'true') return null;

  const conn = await db('meta_connections').where({ brand_id: brandId }).first();
  const pageId = accountId || conn?.selected_page_id;
  if (!pageId || pageId.startsWith('sb_') || pageId.startsWith('mock_')) {
    return null;
  }

  let encryptedToken = conn?.encrypted_page_access_token;
  if (!encryptedToken && conn?.id) {
    const pageRow = await db('meta_facebook_pages').where({ connection_id: conn.id, page_id: pageId }).first();
    encryptedToken = pageRow?.encrypted_access_token;
  }
  if (!encryptedToken) {
    const sa = await db('social_accounts').where({ brand_id: brandId, platform: 'facebook', is_active: true }).first();
    encryptedToken = sa?.access_token_encrypted;
  }

  if (!encryptedToken) return null;
  try {
    const accessToken = decryptSecret(encryptedToken);
    if (!accessToken || accessToken.startsWith('mock_') || accessToken.length < 50) return null;
    return { pageId, accessToken };
  } catch {
    return null;
  }
}

async function resolveWorkerImageBinary(
  mediaUrl?: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  if (!mediaUrl || typeof mediaUrl !== 'string') return null;

  const inferMimeType = (nameOrExt: string): string => {
    const lower = nameOrExt.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/png';
  };

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
          return {
            buffer: fs.readFileSync(candidate),
            mimeType: inferMimeType(diskFileName),
            fileName: diskFileName,
          };
        }
      }
    }
  }

  const base64Match = mediaUrl.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i);
  if (base64Match && base64Match.length === 3) {
    const mimeType = base64Match[1].toLowerCase();
    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
    return {
      buffer: Buffer.from(base64Match[2], 'base64'),
      mimeType,
      fileName: `facebook-upload-${Date.now()}.${ext}`,
    };
  }

  return null;
}

async function publishLiveFacebookFeedPost(
  pageId: string,
  accessToken: string,
  message: string,
  linkUrl?: string
): Promise<{ externalPostId: string; externalPostUrl: string }> {
  const version = process.env.META_GRAPH_API_VERSION || 'v20.0';
  const baseUrl = `https://graph.facebook.com/${version}`;

  // Step 1: Validate Page node access (using fields valid for Page Access Token on v20.0)
  const valRes = await fetch(
    `${baseUrl}/${encodeURIComponent(pageId)}?fields=id,name,category&access_token=${encodeURIComponent(accessToken)}`
  );
  const valData: any = await valRes.json();
  if (!valRes.ok || valData?.error || !valData?.id) {
    throw new Error(valData?.error?.message || `Failed to validate Facebook Page ${pageId}`);
  }

  // Step 2: If an image binary is available, publish via POST /{pageId}/photos; otherwise /{pageId}/feed
  const resolvedImage = await resolveWorkerImageBinary(linkUrl);
  let pubRes: Response;

  if (resolvedImage) {
    const formData = new FormData();
    formData.append(
      'source',
      new Blob([new Uint8Array(resolvedImage.buffer)], { type: resolvedImage.mimeType }),
      resolvedImage.fileName
    );
    formData.append('message', message || '');
    formData.append('published', 'true');
    formData.append('access_token', accessToken);

    pubRes = await fetch(`${baseUrl}/${encodeURIComponent(pageId)}/photos`, {
      method: 'POST',
      body: formData,
    });
  } else {
    const body: Record<string, string> = {
      message: message || '',
      access_token: accessToken,
    };
    if (linkUrl && linkUrl.startsWith('http') && !linkUrl.includes('localhost') && !linkUrl.includes('127.0.0.1')) {
      body.link = linkUrl;
    }

    pubRes = await fetch(`${baseUrl}/${encodeURIComponent(pageId)}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const pubData: any = await pubRes.json();
  if (!pubRes.ok || pubData?.error || !(pubData?.id || pubData?.post_id)) {
    throw new Error(pubData?.error?.message || 'Facebook Graph API publish failed');
  }

  const externalPostId = String(pubData.post_id || pubData.id);
  let externalPostUrl = externalPostId.includes('_')
    ? `https://www.facebook.com/${externalPostId.split('_')[0]}/posts/${externalPostId.split('_')[1]}`
    : `https://www.facebook.com/${externalPostId}`;

  try {
    const permRes = await fetch(
      `${baseUrl}/${encodeURIComponent(externalPostId)}?fields=permalink_url&access_token=${encodeURIComponent(accessToken)}`
    );
    const permData: any = await permRes.json();
    if (permRes.ok && permData?.permalink_url) {
      externalPostUrl = permData.permalink_url;
    }
  } catch {}

  return { externalPostId, externalPostUrl };
}

export async function processPublishJob(jobData: { postId: string; brandId: string }) {
  console.log(`[Worker] Executing scheduled publishing job for Post: ${jobData.postId}`);

  const post = await db('posts').where({ id: jobData.postId }).first();
  if (!post) {
    throw new Error(`Post ${jobData.postId} not found`);
  }

  // Ensure post is approved or scheduled
  if (post.status !== 'approved' && post.status !== 'scheduled') {
    console.log(`[Worker] Post ${jobData.postId} status is ${post.status}. Skipping publish.`);
    return { skipped: true, reason: `Status is ${post.status}` };
  }

  // Set status to publishing
  await db('posts').where({ id: post.id }).update({ status: 'publishing' });

  const variants = await db('post_variants').where({ post_id: post.id });
  const results = [];

  for (const variant of variants) {
    if (variant.status === 'published' && isRealExternalPostId(variant.remote_post_id)) {
      results.push({
        success: true,
        remotePostId: variant.remote_post_id,
        remotePostUrl: variant.remote_post_url,
      });
      continue;
    }

    if (variant.platform === 'facebook') {
      const fbCreds = await resolveFacebookPageCredentials(post.brand_id);
      if (fbCreds) {
        let firstMediaUrl: string | undefined;
        try {
          const ids = typeof variant.media_asset_ids === 'string'
            ? JSON.parse(variant.media_asset_ids)
            : (variant.media_asset_ids || []);
          if (Array.isArray(ids) && ids.length > 0) {
            const asset = await db('media_assets').where({ id: ids[0] }).first();
            firstMediaUrl = asset?.public_url;
          }
        } catch {}

        const liveResult = await publishLiveFacebookFeedPost(fbCreds.pageId, fbCreds.accessToken, variant.content, firstMediaUrl);
        await db('publish_logs').insert({
          id: crypto.randomUUID(),
          post_variant_id: variant.id,
          attempt_number: 1,
          status: 'success',
          http_status: 200,
          response_payload: JSON.stringify({
            remotePostId: liveResult.externalPostId,
            remotePostUrl: liveResult.externalPostUrl,
            publishedAt: new Date().toISOString(),
            platform: 'facebook',
          }),
          error_message: null,
        });
        await db('post_variants')
          .where({ id: variant.id })
          .update({
            status: 'published',
            remote_post_id: liveResult.externalPostId,
            remote_post_url: liveResult.externalPostUrl,
            updated_at: new Date(),
          });
        results.push({
          success: true,
          remotePostId: liveResult.externalPostId,
          remotePostUrl: liveResult.externalPostUrl,
        });
        console.log(`[Worker] ✓ Live published variant facebook -> ${liveResult.externalPostUrl}`);
        continue;
      }
    }

    const result = await publishMockPost({
      postVariantId: variant.id,
      postId: post.id,
      platform: variant.platform,
      content: variant.content,
    });
    results.push(result);
    console.log(`[Worker] ✓ Published variant ${variant.platform} -> ${result.remotePostUrl}`);
  }

  const updatedVariants = await db('post_variants').where({ post_id: post.id });
  const anyRealPublished = updatedVariants.some((v: any) => v.status === 'published' && isRealExternalPostId(v.remote_post_id));
  const allRealPublished = updatedVariants.length > 0 && updatedVariants.every((v: any) => v.status === 'published' && isRealExternalPostId(v.remote_post_id));
  await db('posts')
    .where({ id: post.id })
    .update({
      status: allRealPublished ? 'published' : anyRealPublished ? 'partially_published' : 'sandbox',
      published_at: anyRealPublished ? new Date() : null,
      updated_at: new Date(),
    });

  return {
    postId: post.id,
    publishedCount: results.length,
    results,
  };
}

/**
 * Processes an individual publishing job from the `publishing_jobs` table.
 * Handles state transitions, retries with exponential backoff, and audit logging.
 */
export async function processUnifiedPublishingJob(jobId: string) {
  console.log(`[Worker] Processing unified publishing job: ${jobId}`);

  const job = await db('publishing_jobs').where({ id: jobId }).first();
  if (!job) {
    console.warn(`[Worker] Job ${jobId} not found.`);
    return;
  }

  if (job.status === 'published' || job.status === 'cancelled') {
    console.log(`[Worker] Job ${jobId} status is ${job.status}. Skipping.`);
    return;
  }

  const now = new Date();
  const attemptCount = (job.attempt_count || 0) + 1;

  // Atomic claim: strictly guarantee only one worker claims the job
  const affected = await db('publishing_jobs')
    .where({ id: jobId })
    .whereIn('status', ['scheduled', 'failed'])
    .update({
      status: 'publishing',
      attempt_count: attemptCount,
      updated_at: now,
    });

  if (affected === 0) {
    console.log(`[Worker] Job ${jobId} already claimed, published, or cancelled. Skipping.`);
    return { skipped: true, reason: 'Already claimed' };
  }

  let payload: any = {};
  try {
    payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload || {};
  } catch {
    payload = {};
  }

  try {
    let externalPostId = '';
    let externalPostUrl = '';
    let finalStatus: 'published' | 'sandbox' = 'sandbox';

    if (job.platform === 'facebook') {
      const fbCreds = await resolveFacebookPageCredentials(job.brand_id, job.account_id);
      if (fbCreds) {
        const messageText = payload.contentText || payload.content || '';
        const firstMedia = Array.isArray(payload.mediaUrls) ? payload.mediaUrls[0] : undefined;
        const liveRes = await publishLiveFacebookFeedPost(fbCreds.pageId, fbCreds.accessToken, messageText, firstMedia);
        externalPostId = liveRes.externalPostId;
        externalPostUrl = liveRes.externalPostUrl;
        if (isRealExternalPostId(externalPostId) && !isSandboxUrl(externalPostUrl)) {
          finalStatus = 'published';
        }
      }
    }

    if (!externalPostId) {
      // Fallback simulated sandbox ID when no live Meta credential is configured
      externalPostId = `sb_${job.platform}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      externalPostUrl = `https://${job.platform}.com/posts/${externalPostId}`;
      if (job.platform === 'facebook') {
        externalPostUrl = `https://www.facebook.com/${job.account_id}/posts/${externalPostId}`;
      } else if (job.platform === 'instagram') {
        externalPostUrl = `https://www.instagram.com/p/${externalPostId}`;
      }
      finalStatus = 'sandbox';
    }

    await db('publishing_jobs')
      .where({ id: jobId })
      .update({
        status: finalStatus,
        external_post_id: externalPostId,
        external_post_url: externalPostUrl,
        last_error: null,
        updated_at: new Date(),
      });

    // If linked to post_variant, update post_variant
    if (job.content_id) {
      await db('post_variants')
        .where({ id: job.content_id })
        .update({
          status: finalStatus,
          remote_post_id: externalPostId,
          remote_post_url: externalPostUrl,
          updated_at: new Date(),
        });
    }

    // If linked to post, update post
    if (job.post_id) {
      const vars = await db('post_variants').where({ post_id: job.post_id });
      const hasRealPublished = vars.some((v: any) => v.status === 'published' && isRealExternalPostId(v.remote_post_id));
      await db('posts')
        .where({ id: job.post_id })
        .update({
          status: hasRealPublished ? 'published' : 'sandbox',
          published_at: hasRealPublished ? new Date() : null,
          updated_at: new Date(),
        });
    }

    // Audit log
    await db('publishing_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: job.tenant_id,
      brand_id: job.brand_id,
      user_id: job.user_id,
      agent_id: 'worker_scheduler',
      platform: job.platform,
      account_id: job.account_id,
      action: 'worker_scheduled_publish',
      content_id: job.post_id || job.content_id || null,
      timestamp: new Date(),
      result: 'success',
      external_id: externalPostId,
      metadata: JSON.stringify({ jobId, externalPostUrl }),
      created_at: new Date(),
    });

    console.log(`[Worker] ✓ Successfully published job ${jobId} (${job.platform}) -> ${externalPostUrl}`);
  } catch (err: any) {
    const errorMsg = err?.message || 'Worker publishing failed';
    const isTransient = /rate limit|timeout|network|processing/i.test(errorMsg);
    const maxAttempts = job.max_attempts || 3;

    let nextRetryAt: Date | null = null;
    let newStatus = 'failed';

    if (isTransient && attemptCount < maxAttempts) {
      newStatus = 'scheduled';
      const delaySeconds = Math.pow(2, attemptCount) * 5;
      nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
      console.warn(`[Worker] Transient error on job ${jobId}. Retrying in ${delaySeconds}s (attempt ${attemptCount}/${maxAttempts}).`);
    } else {
      newStatus = attemptCount >= maxAttempts ? 'dead_letter' : 'failed';
      console.error(`[Worker] Permanent or exhausted error on job ${jobId} (status: ${newStatus}):`, errorMsg);
    }

    await db('publishing_jobs')
      .where({ id: jobId })
      .update({
        status: newStatus,
        last_error: errorMsg,
        next_retry_at: nextRetryAt,
        updated_at: new Date(),
      });

    // Audit log
    await db('publishing_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: job.tenant_id,
      brand_id: job.brand_id,
      user_id: job.user_id,
      agent_id: 'worker_scheduler',
      platform: job.platform,
      account_id: job.account_id,
      action: 'worker_scheduled_publish_error',
      content_id: job.post_id || job.content_id || null,
      timestamp: new Date(),
      result: 'failure',
      error: errorMsg,
      metadata: JSON.stringify({ jobId, isTransient, attemptCount }),
      created_at: new Date(),
    });
  }
}
