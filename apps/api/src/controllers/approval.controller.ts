import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { SubmitApprovalSchema, MagicLinkActionSchema } from '@socialforge/shared';
import { governanceAuditService } from '../services/governance/governanceAudit.service.js';

export async function submitForApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { postId } = req.params;
    const validated = SubmitApprovalSchema.parse(req.body);

    const post = await db('posts').where({ id: postId, tenant_id: tenantId }).first();
    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const brand = post.brand_id ? await db('brands').where({ id: post.brand_id }).first() : null;
    const magicToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    const approvalId = crypto.randomUUID();

    await db.transaction(async (trx) => {
      // Update post status
      await trx('posts').where({ id: postId }).update({
        status: 'in_review',
        updated_at: new Date(),
      });

      // Create approval request with complete metadata and tenant binding
      await trx('approval_requests').insert({
        id: approvalId,
        tenant_id: tenantId,
        brand_id: post.brand_id,
        post_id: postId,
        entity_type: 'post',
        entity_id: postId,
        requested_by: userId,
        status: 'pending',
        magic_token: magicToken,
        magic_token_expires_at: expiresAt,
        expires_at: expiresAt,
        edit_history: JSON.stringify([]),
        metadata: JSON.stringify({
          brandName: brand?.name || 'Primary Brand',
          reviewerEmail: validated?.reviewerEmail,
          caption: post.base_content || post.content || '',
        }),
      });
    });

    await governanceAuditService.logEvent({
      tenantId,
      brandId: post.brand_id,
      userId,
      eventType: 'approval_request',
      action: 'create_approval_request',
      entityType: 'post',
      entityId: postId,
      status: 'allowed',
      details: { approvalId, magicToken, expiresAt: expiresAt.toISOString(), reviewerEmail: validated?.reviewerEmail },
      reason: 'Post submitted for magic client review and internal approval.',
    });

    const approvalRequest = await db('approval_requests').where({ id: approvalId }).first();
    const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
    const magicLinkUrl = `${webAppUrl}/review/${magicToken}`;

    return res.status(200).json({
      success: true,
      data: {
        approvalRequest,
        magicToken,
        magicLinkUrl,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMagicPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;

    const approval = await db('approval_requests')
      .where({ magic_token: token })
      .first();

    if (!approval) {
      throw new AppError(404, 'TOKEN_NOT_FOUND', 'Invalid or expired magic review link');
    }

    const expiry = approval.magic_token_expires_at || approval.expires_at;
    if (expiry && new Date() > new Date(expiry)) {
      throw new AppError(410, 'TOKEN_EXPIRED', 'This review link has expired');
    }

    const postId = approval.post_id || approval.entity_id;
    const post = await db('posts').where({ id: postId }).first();
    if (!post) {
      throw new AppError(404, 'POST_NOT_FOUND', 'Post not found');
    }

    const brand = post.brand_id ? await db('brands').where({ id: post.brand_id }).first() : null;
    const brandKit = brand ? await db('brand_kits').where({ brand_id: brand.id }).first() : null;
    const variants = await db('post_variants').where({ post_id: post.id }).select('*');
    const comments = await db('approval_comments')
      .where({ approval_request_id: approval.id })
      .orderBy('created_at', 'asc')
      .select('*');

    return res.status(200).json({
      success: true,
      data: {
        approvalStatus: approval.status,
        post,
        brand: brand
          ? {
              name: brand.name,
              logoUrls: typeof brandKit?.logo_urls === 'string' ? JSON.parse(brandKit.logo_urls) : brandKit?.logo_urls || null,
              colors: typeof brandKit?.primary_colors === 'string' ? JSON.parse(brandKit.primary_colors) : brandKit?.primary_colors || null,
            }
          : { name: 'Client Review', logoUrls: null, colors: null },
        variants,
        comments,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function actOnMagicLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const validated = MagicLinkActionSchema.parse(req.body);

    const approval = await db('approval_requests')
      .where({ magic_token: token })
      .first();

    if (!approval) {
      throw new AppError(404, 'TOKEN_NOT_FOUND', 'Invalid magic review link');
    }

    if (approval.status !== 'pending') {
      throw new AppError(400, 'ALREADY_RESOLVED', `This request has already been ${approval.status}`);
    }

    const expiry = approval.magic_token_expires_at || approval.expires_at;
    if (expiry && new Date() > new Date(expiry)) {
      throw new AppError(410, 'TOKEN_EXPIRED', 'This review link has expired');
    }

    const postId = approval.post_id || approval.entity_id;

    await db.transaction(async (trx) => {
      // Record client comment if provided
      if (validated.comment) {
        await trx('approval_comments').insert({
          id: crypto.randomUUID(),
          approval_request_id: approval.id,
          author_name: validated.reviewerName,
          is_external_client: true,
          comment: validated.comment,
        });
      }

      // Update approval status
      await trx('approval_requests')
        .where({ id: approval.id })
        .update({
          status: validated.action,
          review_notes: validated.comment || (validated.action === 'approved' ? 'Approved via Magic Review Portal' : 'Changes requested via Magic Review Portal'),
          resolved_at: new Date(),
        });

      // Update post status
      if (postId) {
        const postStatus = validated.action === 'approved' ? 'approved' : 'changes_requested';
        await trx('posts')
          .where({ id: postId })
          .update({
            status: postStatus,
            updated_at: new Date(),
          });
      }
    });

    if (approval.tenant_id) {
      await governanceAuditService.logEvent({
        tenantId: approval.tenant_id,
        brandId: approval.brand_id,
        eventType: 'approval_decision',
        action: validated.action === 'approved' ? 'magic_portal_approve' : 'magic_portal_changes_requested',
        entityType: approval.entity_type || 'post',
        entityId: postId,
        status: validated.action === 'approved' ? 'approved' : 'rejected',
        details: { approvalId: approval.id, reviewerName: validated.reviewerName, comment: validated.comment },
        reason: `Client acted via passwordless Magic Review Portal: ${validated.action}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        action: validated.action,
        message:
          validated.action === 'approved'
            ? 'Post has been approved!'
            : 'Changes requested have been submitted to the creative team.',
      },
    });
  } catch (err) {
    return next(err);
  }
}
