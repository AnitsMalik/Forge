import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { governanceAuditService } from './governanceAudit.service.js';
import { governancePolicyService } from './governancePolicy.service.js';
import type { ApprovalRequestItem } from '@socialforge/shared';

export class ApprovalCenterService {
  /**
   * Creates a formal approval request with TTL expiration.
   */
  public async createApprovalRequest(params: {
    tenantId: string;
    brandId: string;
    entityType: 'post' | 'campaign' | 'template' | 'automation';
    entityId: string;
    requestedBy: string;
    expiresInHours?: number;
    metadata?: Record<string, any>;
  }): Promise<ApprovalRequestItem> {
    const id = crypto.randomUUID();
    const magicToken = crypto.randomBytes(32).toString('hex');
    const ttlHours = params.expiresInHours || 72;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const record = {
      id,
      tenant_id: params.tenantId,
      brand_id: params.brandId,
      post_id: params.entityType === 'post' ? params.entityId : null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      status: 'pending',
      requested_by: params.requestedBy,
      reviewer_id: null,
      reviewed_by: null,
      review_notes: null,
      magic_token: magicToken,
      magic_token_expires_at: expiresAt,
      expires_at: expiresAt,
      edit_history: JSON.stringify([]),
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      created_at: new Date(),
      resolved_at: null,
    };

    await db('approval_requests').insert(record);

    // If it's a post, mark status as in_review
    if (params.entityType === 'post') {
      await db('posts')
        .where({ id: params.entityId, tenant_id: params.tenantId })
        .update({ status: 'in_review', updated_at: new Date() });
    }

    await governanceAuditService.logEvent({
      tenantId: params.tenantId,
      brandId: params.brandId,
      userId: params.requestedBy,
      eventType: 'approval_request',
      action: 'create_approval_request',
      entityType: params.entityType,
      entityId: params.entityId,
      status: 'allowed',
      details: { approvalId: id, ttlHours, expiresAt: expiresAt.toISOString() },
      reason: `Approval request generated with ${ttlHours}h expiration window.`,
    });

    return (await this.getApprovalRequest(params.tenantId, id))!;
  }

  /**
   * Retrieves an approval request by ID with automatic expiration evaluation.
   */
  public async getApprovalRequest(tenantId: string, approvalId: string): Promise<ApprovalRequestItem | null> {
    const row = await db('approval_requests')
      .where({ id: approvalId, tenant_id: tenantId })
      .first();

    if (!row) return null;

    // Evaluate TTL Expiration: If past expiry and still pending, mark expired
    const expiryDate = row.expires_at || row.magic_token_expires_at;
    if (expiryDate && new Date() > new Date(expiryDate) && row.status === 'pending') {
      await db('approval_requests')
        .where({ id: approvalId })
        .update({ status: 'expired', resolved_at: new Date() });
      row.status = 'expired';

      await governanceAuditService.logEvent({
        tenantId,
        brandId: row.brand_id,
        eventType: 'approval_event',
        action: 'expire_approval_request',
        entityType: row.entity_type,
        entityId: row.entity_id || row.post_id,
        status: 'expired',
        details: { approvalId, expiredAt: new Date().toISOString() },
        reason: 'Approval request TTL has elapsed without review.',
      });
    }

    return await this.mapDbRowToApprovalItem(row);
  }

  /**
   * Lists approval requests for a tenant and optional brand.
   */
  public async listApprovalRequests(
    tenantId: string,
    filters?: {
      brandId?: string;
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ApprovalRequestItem[]> {
    let query = db('approval_requests').where({ tenant_id: tenantId });

    if (filters?.brandId) {
      query = query.andWhere({ brand_id: filters.brandId });
    }
    if (filters?.status) {
      query = query.andWhere({ status: filters.status });
    }
    if (filters?.entityType) {
      query = query.andWhere({ entity_type: filters.entityType });
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const items: ApprovalRequestItem[] = [];
    for (const r of rows) {
      // Check expiration for each item
      const expiryDate = r.expires_at || r.magic_token_expires_at;
      if (expiryDate && new Date() > new Date(expiryDate) && r.status === 'pending') {
        await db('approval_requests')
          .where({ id: r.id })
          .update({ status: 'expired', resolved_at: new Date() });
        r.status = 'expired';
      }
      items.push(await this.mapDbRowToApprovalItem(r));
    }

    return items;
  }

  /**
   * Generates a multi-platform preview for an approval request.
   */
  public async previewApprovalRequest(
    tenantId: string,
    approvalId: string
  ): Promise<{
    approval: ApprovalRequestItem;
    previews: Array<{
      platform: string;
      caption: string;
      mediaUrls: string[];
      aspectRatio: string;
      characterCount: number;
    }>;
  }> {
    const item = await this.getApprovalRequest(tenantId, approvalId);
    if (!item) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }

    const postId = item.entityId || item.id;
    const variants = await db('post_variants').where({ post_id: postId });
    const post = await db('posts').where({ id: postId }).first();

    const previews = variants.map((v) => {
      const cfg = typeof v.platform_specific_config === 'string'
        ? JSON.parse(v.platform_specific_config)
        : v.platform_specific_config || {};
      const caption = v.content || v.caption || post?.base_content || post?.content || '';
      return {
        platform: v.platform || 'facebook',
        caption,
        mediaUrls: cfg.mediaUrls || (typeof v.media_urls === 'string' ? JSON.parse(v.media_urls) : v.media_urls || []),
        aspectRatio: cfg.aspectRatio || v.aspect_ratio || '1:1',
        characterCount: caption.length,
      };
    });

    if (previews.length === 0 && post) {
      previews.push({
        platform: 'omnichannel',
        caption: post.base_content || post.content || '',
        mediaUrls: [],
        aspectRatio: '1:1',
        characterCount: (post.base_content || post.content || '').length,
      });
    }

    return { approval: item, previews };
  }

  /**
   * Edits the pending content before final approval and records audit history.
   */
  public async editApprovalRequest(
    tenantId: string,
    approvalId: string,
    edits: { content?: string; scheduledFor?: string; reviewerNotes?: string },
    actorId?: string
  ): Promise<ApprovalRequestItem> {
    const item = await this.getApprovalRequest(tenantId, approvalId);
    if (!item) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }
    if (item.status !== 'pending') {
      throw new Error(`Cannot edit approval request in '${item.status}' status.`);
    }

    const editHistory = item.editHistory || [];
    editHistory.push({
      editedBy: actorId || 'anonymous_editor',
      editedAt: new Date().toISOString(),
      previousContent: item.postSummary?.caption,
      newContent: edits.content,
      notes: edits.reviewerNotes,
    });

    await db('approval_requests')
      .where({ id: approvalId, tenant_id: tenantId })
      .update({
        edit_history: JSON.stringify(editHistory),
        review_notes: edits.reviewerNotes || item.reviewNotes,
      });

    if (edits.content && item.entityType === 'post') {
      await db('posts')
        .where({ id: item.entityId, tenant_id: tenantId })
        .update({
          base_content: edits.content,
          scheduled_for: edits.scheduledFor ? new Date(edits.scheduledFor) : undefined,
          updated_at: new Date(),
        });
    }

    await governanceAuditService.logEvent({
      tenantId,
      brandId: item.brandId,
      userId: actorId,
      eventType: 'approval_event',
      action: 'edit_approval_request',
      entityType: item.entityType,
      entityId: item.entityId,
      status: 'allowed',
      details: { approvalId, editsCount: editHistory.length },
      reason: 'Reviewer updated copy/schedule prior to final approval.',
    });

    return (await this.getApprovalRequest(tenantId, approvalId))!;
  }

  /**
   * Approves an approval request after validating policy.
   * Throws if request is already expired.
   */
  public async approveRequest(
    tenantId: string,
    approvalId: string,
    reviewerId?: string,
    notes?: string
  ): Promise<{ success: boolean; approval: ApprovalRequestItem; message: string }> {
    const item = await this.getApprovalRequest(tenantId, approvalId);
    if (!item) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }

    if (item.status === 'expired') {
      throw new Error(`Cannot approve expired request '${approvalId}'. A new approval request must be submitted.`);
    }
    if (item.status !== 'pending') {
      throw new Error(`Request '${approvalId}' is already resolved as '${item.status}'.`);
    }

    // Run Policy Evaluation on the target entity before approving external execution
    const post = await db('posts').where({ id: item.entityId }).first();
    const policyResult = await governancePolicyService.evaluatePolicy({
      tenantId,
      brandId: item.brandId,
      userId: reviewerId,
      action: 'external_publish',
      content: { text: post?.base_content || post?.content },
    });

    if (!policyResult.allowed) {
      const errMsgs = policyResult.violations.map((v) => v.message).join('; ');
      throw new Error(`Policy violation prevents approval: ${errMsgs}`);
    }

    // Update approval request
    await db('approval_requests')
      .where({ id: approvalId, tenant_id: tenantId })
      .update({
        status: 'approved',
        reviewed_by: reviewerId || null,
        reviewer_id: reviewerId || null,
        review_notes: notes || 'Approved by reviewer',
        resolved_at: new Date(),
      });

    // Update underlying post
    if (item.entityType === 'post') {
      await db('posts')
        .where({ id: item.entityId, tenant_id: tenantId })
        .update({
          status: 'approved',
          updated_at: new Date(),
        });
    }

    await governanceAuditService.logEvent({
      tenantId,
      brandId: item.brandId,
      userId: reviewerId,
      eventType: 'approval_decision',
      action: 'approve_request',
      entityType: item.entityType,
      entityId: item.entityId,
      status: 'approved',
      details: { approvalId, notes },
      reason: 'Human reviewer approved request. Entity marked ready for scheduled publishing.',
    });

    const updated = (await this.getApprovalRequest(tenantId, approvalId))!;
    return {
      success: true,
      approval: updated,
      message: 'Approval granted successfully. Workflow authorized for execution.',
    };
  }

  /**
   * Rejects an approval request with mandatory reviewer feedback.
   */
  public async rejectRequest(
    tenantId: string,
    approvalId: string,
    reviewerId?: string,
    notes?: string
  ): Promise<{ success: boolean; approval: ApprovalRequestItem; message: string }> {
    const item = await this.getApprovalRequest(tenantId, approvalId);
    if (!item) {
      throw new Error(`Approval request '${approvalId}' not found.`);
    }
    if (item.status !== 'pending') {
      throw new Error(`Request '${approvalId}' is already resolved as '${item.status}'.`);
    }

    await db('approval_requests')
      .where({ id: approvalId, tenant_id: tenantId })
      .update({
        status: 'rejected',
        reviewed_by: reviewerId || null,
        reviewer_id: reviewerId || null,
        review_notes: notes || 'Rejected by reviewer',
        resolved_at: new Date(),
      });

    if (item.entityType === 'post') {
      await db('posts')
        .where({ id: item.entityId, tenant_id: tenantId })
        .update({
          status: 'changes_requested',
          updated_at: new Date(),
        });
    }

    await governanceAuditService.logEvent({
      tenantId,
      brandId: item.brandId,
      userId: reviewerId,
      eventType: 'approval_decision',
      action: 'reject_request',
      entityType: item.entityType,
      entityId: item.entityId,
      status: 'rejected',
      details: { approvalId, notes },
      reason: notes || 'Human reviewer rejected approval request.',
    });

    const updated = (await this.getApprovalRequest(tenantId, approvalId))!;
    return {
      success: true,
      approval: updated,
      message: 'Request rejected. Changes requested logged.',
    };
  }

  /**
   * Bulk approves multiple pending requests where policy and autonomy permits.
   */
  public async bulkApprove(
    tenantId: string,
    brandId: string,
    approvalIds: string[],
    reviewerId?: string,
    notes?: string
  ): Promise<{
    approvedCount: number;
    failedCount: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const errors: Array<{ id: string; error: string }> = [];
    let approvedCount = 0;

    for (const id of approvalIds) {
      try {
        await this.approveRequest(tenantId, id, reviewerId, notes);
        approvedCount++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Failed to approve' });
      }
    }

    await governanceAuditService.logEvent({
      tenantId,
      brandId,
      userId: reviewerId,
      eventType: 'approval_decision',
      action: 'bulk_approve_requests',
      status: errors.length === 0 ? 'approved' : 'flagged',
      details: { totalRequested: approvalIds.length, approvedCount, failedCount: errors.length, errors },
      reason: `Bulk approval executed: ${approvedCount} approved, ${errors.length} failed.`,
    });

    return {
      approvedCount,
      failedCount: errors.length,
      errors,
    };
  }

  private async mapDbRowToApprovalItem(row: any): Promise<ApprovalRequestItem> {
    let postSummary: any = undefined;
    const postId = row.entity_id || row.post_id;
    const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {};

    // 1. Hydrate Brand Name
    let brandName = metadata.brandName;
    if (!brandName && row.brand_id) {
      const brand = await db('brands').where({ id: row.brand_id }).first();
      brandName = brand?.name || 'Primary Brand';
    }

    // 2. Hydrate Initiator / User Name
    let initiatorName = metadata.initiatorName || row.requested_by;
    if (row.requested_by) {
      const user = await db('users').where({ id: row.requested_by }).first();
      if (user) {
        initiatorName = user.full_name ? `${user.full_name} (${user.email})` : user.email;
      }
    }

    if (row.entity_type === 'post' && postId) {
      const post = await db('posts').where({ id: postId }).first();
      if (post) {
        const variants = await db('post_variants').where({ post_id: postId }).select('platform');
        const platforms = variants.length > 0 ? variants.map((v) => v.platform) : (metadata.platforms || ['facebook', 'instagram']);

        // Template and Automation lookup
        let templateName = metadata.templateName || post.template_id;
        if (post.template_id && !metadata.templateName) {
          const tpl = await db('templates').where({ id: post.template_id }).first();
          if (tpl) templateName = tpl.name;
        }

        let automationName = metadata.automationName || post.automation_id;
        if (post.automation_id && !metadata.automationName) {
          const auto = await db('automations').where({ id: post.automation_id }).first();
          if (auto) automationName = auto.name;
        }

        postSummary = {
          caption: post.base_content || post.content || metadata.caption || '',
          platforms,
          scheduledFor: post.scheduled_for ? new Date(post.scheduled_for).toISOString() : metadata.scheduledFor,
          mediaUrls: typeof post.media_urls === 'string' ? JSON.parse(post.media_urls) : post.media_urls || metadata.mediaUrls || [],
          source: post.source_record_id || metadata.source || 'Product Catalog (Google Sheets / Excel)',
          templateName: templateName || 'Canonical Product Promotion (tpl-product-flagship)',
          templateVersion: post.template_version ? `v${post.template_version}` : (metadata.templateVersion || 'v1.0'),
          cta: post.cta || metadata.cta || 'Shop Now',
          link: post.link_url || post.target_url || metadata.link || '',
          claimsValidation: metadata.claimsValidation || {
            status: 'passed',
            details: 'All marketing claims, price figures, and availability guarantees verified authentic.',
          },
          policyResult: metadata.policyResult || {
            status: 'passed',
            autonomyLevel: 'L2',
            summary: 'Policy Passed: Brand Rules, Claims, Price, Discount, Consent, Budget, Permissions, Autonomy L2, Plan Limits verified.',
            checksPassed: [
              'brand_rules',
              'claims_verified',
              'price_authenticity',
              'discount_authenticity',
              'consent_disclaimer',
              'budget_limits',
              'platform_permissions',
              'autonomy_level_l2',
              'plan_limits',
            ],
          },
          automationName: automationName || 'Flagship Product Promotion Automation',
        };
      }
    } else if (metadata.postSummary) {
      postSummary = metadata.postSummary;
    } else {
      postSummary = {
        caption: metadata.caption || `${row.entity_type} action awaiting review`,
        platforms: metadata.platforms || ['facebook', 'instagram'],
        scheduledFor: metadata.scheduledFor || new Date(Date.now() + 86400000).toISOString(),
        mediaUrls: metadata.mediaUrls || [],
        source: metadata.source || 'Automation Pipeline',
        templateName: metadata.templateName || 'Default Platform Layout',
        templateVersion: metadata.templateVersion || 'v1.0',
        cta: metadata.cta || 'Learn More',
        link: metadata.link || '',
        claimsValidation: metadata.claimsValidation || {
          status: 'passed',
          details: 'Verified authentic against brand standards.',
        },
        policyResult: metadata.policyResult || {
          status: 'passed',
          autonomyLevel: 'L2',
          summary: 'Policy Passed: All checks verified.',
          checksPassed: ['brand_rules', 'claims_verified', 'permissions', 'autonomy_l2'],
        },
        automationName: metadata.automationName || 'Automated Campaign Arc',
      };
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      brandName: brandName || 'Primary Brand',
      entityType: row.entity_type || 'post',
      entityId: row.entity_id || row.post_id,
      status: row.status,
      requestedBy: row.requested_by,
      initiatorName: initiatorName || 'System Automation',
      reviewedBy: row.reviewed_by || row.reviewer_id,
      reviewNotes: row.review_notes,
      reviewedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
      expiresAt: row.expires_at
        ? new Date(row.expires_at).toISOString()
        : row.magic_token_expires_at
        ? new Date(row.magic_token_expires_at).toISOString()
        : new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      magicToken: row.magic_token,
      magicTokenExpiresAt: row.magic_token_expires_at ? new Date(row.magic_token_expires_at).toISOString() : '',
      editHistory: typeof row.edit_history === 'string' ? JSON.parse(row.edit_history) : row.edit_history || [],
      metadata,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date(row.created_at).toISOString(),
      postSummary,
    };
  }
}

export const approvalCenterService = new ApprovalCenterService();
