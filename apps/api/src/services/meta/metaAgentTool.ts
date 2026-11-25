import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { metaPublishingService } from './publishing.js';
import { MetaIntegrationError } from './errors.js';
import type { MetaPublishPayload, MetaPublishResult } from '@socialforge/shared';

export interface AgentPublishInput {
  platform: 'facebook' | 'instagram';
  brand_id: string;
  account_id?: string;
  text?: string;
  caption?: string;
  media_urls?: string[];
  scheduled_at?: string | null;
  agent_id?: string;
  require_approval?: boolean;
}

export class MetaAgentTool {
  /**
   * AI Agent Tool Definition Schema (for OpenAI / Gemini / Function Calling).
   */
  public static getToolDefinition() {
    return {
      name: 'publish_social_content',
      description:
        'Publishes or schedules social media content to an authorized Facebook Page or Instagram Professional account. Resolves credentials securely on the backend without exposing raw tokens.',
      parameters: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            enum: ['facebook', 'instagram'],
            description: 'The target social platform.',
          },
          brand_id: {
            type: 'string',
            description: 'The SocialForge Brand UUID.',
          },
          account_id: {
            type: 'string',
            description:
              'Optional Facebook Page ID or Instagram Account ID. If omitted, uses the currently selected Meta account for the brand.',
          },
          text: {
            type: 'string',
            description: 'Post text content for Facebook.',
          },
          caption: {
            type: 'string',
            description: 'Post caption for Instagram.',
          },
          media_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Public HTTPS URLs of images or videos to publish.',
          },
          scheduled_at: {
            type: 'string',
            description: 'ISO 8601 timestamp for scheduling. Null for immediate publishing.',
          },
          require_approval: {
            type: 'boolean',
            description: 'Whether human approval is required before publishing.',
          },
        },
        required: ['platform', 'brand_id'],
      },
    };
  }

  /**
   * Executes the `publish_social_content` AI agent action.
   */
  public async execute(
    input: AgentPublishInput,
    userId?: string
  ): Promise<{
    success: boolean;
    status: string;
    message: string;
    postId?: string;
    jobId?: string;
    externalPostUrl?: string;
    approvalRequired?: boolean;
  }> {
    const { platform, brand_id, media_urls = [], scheduled_at, agent_id = 'ai_social_agent' } = input;
    const contentText = input.caption || input.text || '';

    // 1. Verify Brand exists
    const brand = await db('brands').where({ id: brand_id }).first();
    if (!brand) {
      throw new Error(`Brand ${brand_id} not found.`);
    }

    // 2. Resolve Meta Connection & Account ID
    const connection = await db('meta_connections').where({ brand_id }).first();
    if (!connection) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: 'No Meta account connected for this brand. Connect a Facebook Page in Social Channels first.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    let targetAccountId = input.account_id;
    if (!targetAccountId) {
      if (platform === 'facebook') {
        targetAccountId = connection.selected_page_id;
      } else if (platform === 'instagram') {
        targetAccountId = connection.instagram_account_id;
      }
    }

    if (!targetAccountId) {
      throw new MetaIntegrationError({
        code: platform === 'instagram' ? 'META_INSTAGRAM_NOT_CONNECTED' : 'META_PAGE_NOT_FOUND',
        userMessage: `No selected ${platform} account found for this brand. Please select an active account in Social Channels.`,
        httpStatus: 400,
        isTransient: false,
      });
    }

    const effectiveUserId = userId || connection.user_id;

    // 3. Check Approval Policy: require_approval_before_publish
    const requireApproval =
      input.require_approval !== undefined
        ? input.require_approval
        : Boolean(connection.require_approval_before_publish ?? true);

    // Create SocialForge Post record
    const postId = crypto.randomUUID();
    const postVariantId = crypto.randomUUID();
    const now = new Date();

    const initialStatus = requireApproval ? 'pending_approval' : scheduled_at ? 'scheduled' : 'publishing';

    await db('posts').insert({
      id: postId,
      tenant_id: brand.tenant_id,
      brand_id,
      author_id: effectiveUserId,
      title: `AI Agent Post: ${contentText.slice(0, 40)}...`,
      base_content: contentText,
      status: initialStatus,
      scheduled_for: scheduled_at ? new Date(scheduled_at) : null,
      created_at: now,
      updated_at: now,
    });

    await db('post_variants').insert({
      id: postVariantId,
      post_id: postId,
      platform,
      content: contentText,
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ mediaUrls: media_urls }),
      status: requireApproval ? 'pending' : 'publishing',
      created_at: now,
      updated_at: now,
    });

    // If human review is required, pause execution and create approval request
    if (requireApproval) {
      const approvalId = crypto.randomUUID();
      await db('approval_requests').insert({
        id: approvalId,
        post_id: postId,
        requested_by: effectiveUserId,
        status: 'pending',
        created_at: now,
      });

      // Audit log: AI generated content awaiting approval
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: brand.tenant_id,
        brand_id,
        user_id: effectiveUserId,
        agent_id,
        platform,
        account_id: targetAccountId,
        action: 'ai_draft_generated_awaiting_approval',
        content_id: postId,
        timestamp: now,
        result: 'pending',
        metadata: JSON.stringify({ approvalId, requireApproval: true }),
        created_at: now,
      });

      return {
        success: true,
        status: 'pending_approval',
        message: 'Content generated successfully by AI Social Agent. Waiting for human approval before publishing.',
        postId,
        approvalRequired: true,
      };
    }

    // 4. Auto-Approval / Direct Dispatch
    const payload: MetaPublishPayload = {
      platform,
      accountId: targetAccountId,
      text: contentText,
      caption: contentText,
      mediaUrls: media_urls,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : null,
      brandId: brand_id,
      postId,
      postVariantId,
    };

    const publishResult: MetaPublishResult = await metaPublishingService.publishSocialPost(
      payload,
      {
        tenantId: brand.tenant_id,
        brandId: brand_id,
        userId: effectiveUserId,
        connectionId: connection.id,
        agentId: agent_id,
      }
    );

    return {
      success: publishResult.success,
      status: publishResult.status,
      message: publishResult.success
        ? `Successfully dispatched ${platform} post!`
        : `Publishing failed: ${publishResult.errorMessage}`,
      postId,
      externalPostUrl: publishResult.externalPostUrl,
      approvalRequired: false,
    };
  }
}

export const metaAgentTool = new MetaAgentTool();
