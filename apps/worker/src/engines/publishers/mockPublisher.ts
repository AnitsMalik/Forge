import crypto from 'crypto';
import { db } from '../../db/connection.js';

export interface MockPublishInput {
  postVariantId: string;
  postId: string;
  platform: string;
  content: string;
}

export interface MockPublishResult {
  success: boolean;
  remotePostId: string;
  remotePostUrl: string;
}

export async function publishMockPost(input: MockPublishInput): Promise<MockPublishResult> {
  const remotePostId = `mock_${input.platform}_${crypto.randomBytes(6).toString('hex')}`;
  const remotePostUrl = `https://mock.socialforge.local/${input.platform}/p/${remotePostId}`;

  // Log successful publishing event in MySQL
  await db('publish_logs').insert({
    id: crypto.randomUUID(),
    post_variant_id: input.postVariantId,
    attempt_number: 1,
    status: 'success',
    http_status: 200,
    response_payload: JSON.stringify({
      remotePostId,
      remotePostUrl,
      publishedAt: new Date().toISOString(),
      platform: input.platform,
    }),
    error_message: null,
  });

  // Update Post Variant status to sandbox
  await db('post_variants')
    .where({ id: input.postVariantId })
    .update({
      status: 'sandbox',
      remote_post_id: remotePostId,
      remote_post_url: remotePostUrl,
      updated_at: new Date(),
    });

  // Check if any non-sandbox variants remain
  const pendingVariants = await db('post_variants')
    .where({ post_id: input.postId, status: 'pending' })
    .count('id as count')
    .first();

  const remaining = Number(pendingVariants?.count || 0);
  if (remaining === 0) {
    const vars = await db('post_variants').where({ post_id: input.postId });
    const hasPublished = vars.some((v: any) => v.status === 'published');
    await db('posts')
      .where({ id: input.postId })
      .update({
        status: hasPublished ? 'published' : 'sandbox',
        published_at: hasPublished ? new Date() : null,
        updated_at: new Date(),
      });
  }

  return {
    success: true,
    remotePostId,
    remotePostUrl,
  };
}
