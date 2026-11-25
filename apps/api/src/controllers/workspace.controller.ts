import type { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import { UsageTrackerService } from '../services/usageTracker.service.js';
import { EntitlementService } from '../services/entitlement.service.js';
import { hashPassword } from '../services/auth/passwordService.js';

export class WorkspaceController {
  /**
   * GET /api/v1/workspaces
   * Returns all workspaces (tenants) the authenticated user belongs to.
   */
  public static async listWorkspaces(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const activeTenantId = req.user?.tenantId;

      const memberships = await db('tenant_users')
        .join('tenants', 'tenant_users.tenant_id', 'tenants.id')
        .leftJoin('tenant_subscriptions', 'tenants.id', 'tenant_subscriptions.tenant_id')
        .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
        .where('tenant_users.user_id', userId)
        .select(
          'tenants.id as tenantId',
          'tenants.name as tenantName',
          'tenants.slug as tenantSlug',
          'tenant_users.role as userRole',
          'tenant_subscriptions.status as subscriptionStatus',
          'subscription_plans.id as planId',
          'subscription_plans.name as planName'
        );

      const workspaces = memberships.map((m) => ({
        id: m.tenantId,
        name: m.tenantName,
        slug: m.tenantSlug,
        role: m.userRole,
        planId: m.planId || 'free_trial',
        planName: m.planName || 'Free Trial',
        subscriptionStatus: m.subscriptionStatus || 'active',
        isActive: m.tenantId === activeTenantId,
      }));

      res.json({
        success: true,
        data: {
          activeTenantId,
          workspaces,
        },
      });
    } catch (err: any) {
      console.error('[WorkspaceController.listWorkspaces] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspaces' } });
    }
  }

  /**
   * POST /api/v1/workspaces/switch
   * Switches user context to another tenant they are an authorized member of.
   */
  public static async switchWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { tenantId } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      if (!tenantId || typeof tenantId !== 'string') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Target tenantId is required' } });
        return;
      }

      // Verify user membership in the target tenant
      const membership = await db('tenant_users')
        .join('tenants', 'tenant_users.tenant_id', 'tenants.id')
        .where({ 'tenant_users.user_id': userId, 'tenant_users.tenant_id': tenantId })
        .select('tenant_users.role', 'tenants.name as tenantName', 'tenants.slug as tenantSlug')
        .first();

      if (!membership) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not an authorized member of the requested workspace.',
          },
        });
        return;
      }

      // Query user email & is_superadmin
      const user = await db('users').where({ id: userId }).first();

      // Issue new JWT token with updated tenant context
      const newPayload = {
        userId,
        email: user?.email,
        tenantId,
        role: membership.role,
        isSuperAdmin: Boolean(user?.is_superadmin),
      };

      const accessToken = jwt.sign(newPayload, config.jwtSecret, {
        expiresIn: (config.jwtExpiresIn as any) || '15m',
      });

      // Update HttpOnly cookie
      res.cookie('sf_access_token', accessToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });

      // Fetch plan details for active tenant
      const plan = await UsageTrackerService.getTenantPlan(tenantId);

      res.json({
        success: true,
        data: {
          accessToken,
          activeWorkspace: {
            id: tenantId,
            name: membership.tenantName,
            slug: membership.tenantSlug,
            role: membership.role,
            plan: {
              id: plan.id,
              name: plan.name,
            },
          },
        },
      });
    } catch (err: any) {
      console.error('[WorkspaceController.switchWorkspace] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to switch workspace' } });
    }
  }

  /**
   * GET /api/v1/workspaces/quota
   * Returns real-time quota usage and plan limits for the active workspace.
   */
  public static async getActiveQuota(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const summary = await UsageTrackerService.getTenantQuotaSummary(tenantId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      console.error('[WorkspaceController.getActiveQuota] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspace quota' } });
    }
  }

  /**
   * GET /api/v1/workspaces/entitlements
   * Authoritatively returns full entitlement checks for the active workspace.
   */
  public static async getEntitlements(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const entitlements = await EntitlementService.getTenantEntitlements(tenantId);
      res.json({
        success: true,
        data: entitlements,
      });
    } catch (err: any) {
      console.error('[WorkspaceController.getEntitlements] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspace entitlements' } });
    }
  }

  /**
   * POST /api/v1/workspaces
   * Provisions a brand new agency workspace with default trial subscription and brand
   */
  public static async createWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { name, slug } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Workspace name is required.' } });
        return;
      }

      const baseSlug = (slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSlug = `${baseSlug || 'workspace'}-${Date.now().toString(36)}`;
      const newTenantId = crypto.randomUUID();

      await db.transaction(async (trx) => {
        // 1. Insert tenant
        await trx('tenants').insert({
          id: newTenantId,
          name: name.trim(),
          slug: uniqueSlug,
          settings: JSON.stringify({}),
          created_at: new Date(),
          updated_at: new Date(),
        });

        // 2. Link user as owner
        await trx('tenant_users').insert({
          id: crypto.randomUUID(),
          tenant_id: newTenantId,
          user_id: userId,
          role: 'owner',
          created_at: new Date(),
          updated_at: new Date(),
        });

        // 3. Provision free trial subscription
        const now = new Date();
        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        await trx('tenant_subscriptions').insert({
          id: crypto.randomUUID(),
          tenant_id: newTenantId,
          plan_id: 'free_trial',
          status: 'trialing',
          provider: 'system',
          current_period_start: now,
          current_period_end: trialEnd,
          trial_start_at: now,
          trial_end_at: trialEnd,
          cancel_at_period_end: false,
          created_at: now,
          updated_at: now,
        });

        // 4. Create default brand
        await trx('brands').insert({
          id: crypto.randomUUID(),
          tenant_id: newTenantId,
          name: `${name.trim()} Brand`,
          slug: `${uniqueSlug}-brand`,
          timezone: 'UTC',
          created_at: now,
          updated_at: now,
        });
      });

      res.status(201).json({
        success: true,
        data: {
          id: newTenantId,
          name: name.trim(),
          slug: uniqueSlug,
          role: 'owner',
          planId: 'free_trial',
        },
      });
    } catch (err: any) {
      console.error('[WorkspaceController.createWorkspace] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create workspace.' } });
    }
  }

  /**
   * GET /api/v1/workspaces/current
   * Returns current active workspace settings, membership role, and stats
   */
  public static async getCurrentWorkspaceSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const tenant = await db('tenants').where({ id: tenantId }).first();
      if (!tenant) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
        return;
      }

      const membership = await db('tenant_users').where({ tenant_id: tenantId, user_id: userId }).first();
      const plan = await UsageTrackerService.getTenantPlan(tenantId);
      const membersCount = await db('tenant_users').where({ tenant_id: tenantId }).count('id as cnt').first();
      const brandsCount = await db('brands').where({ tenant_id: tenantId }).count('id as cnt').first();

      res.status(200).json({
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          settings: typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}),
          role: membership?.role || 'editor',
          plan: {
            id: plan.id,
            name: plan.name,
            price: Number(plan.price),
          },
          stats: {
            membersCount: Number(membersCount?.cnt || 0),
            brandsCount: Number(brandsCount?.cnt || 0),
          },
        },
      });
    } catch (err: any) {
      console.error('[WorkspaceController.getCurrentWorkspaceSettings] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspace details.' } });
    }
  }

  /**
   * PUT /api/v1/workspaces/current
   * Updates workspace settings (name, slug, branding settings)
   */
  public static async updateCurrentWorkspaceSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const role = req.user?.role;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const isPrivileged = role === 'owner' || role === 'admin' || role === 'agency_admin' || (role as string) === 'agency_owner';
      if (!isPrivileged) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only workspace owners and admins can update settings.' } });
        return;
      }

      const { name, settings } = req.body;
      const updates: Record<string, any> = { updated_at: new Date() };
      if (name && typeof name === 'string' && name.trim()) {
        updates.name = name.trim();
      }
      if (settings && typeof settings === 'object') {
        updates.settings = JSON.stringify(settings);
      }

      await db('tenants').where({ id: tenantId }).update(updates);

      res.status(200).json({
        success: true,
        message: 'Workspace settings updated successfully.',
      });
    } catch (err: any) {
      console.error('[WorkspaceController.updateCurrentWorkspaceSettings] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update workspace settings.' } });
    }
  }

  /**
   * GET /api/v1/workspaces/members
   * Returns all active team members in the current workspace
   */
  public static async listMembers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const members = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', tenantId)
        .select(
          'tenant_users.id as membershipId',
          'users.id as userId',
          'users.email',
          'users.full_name as fullName',
          'tenant_users.role',
          'tenant_users.created_at as joinedAt'
        )
        .orderBy('tenant_users.created_at', 'asc');

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (err: any) {
      console.error('[WorkspaceController.listMembers] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspace members.' } });
    }
  }

  /**
   * POST /api/v1/workspaces/invites
   * Invites a new team member by email, strictly enforcing canCreateUser quota!
   */
  public static async inviteMember(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const callerUserId = req.user?.userId;
      const callerRole = req.user?.role;

      if (!tenantId || !callerUserId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const isPrivileged = callerRole === 'owner' || callerRole === 'admin' || callerRole === 'agency_admin' || (callerRole as string) === 'agency_owner';
      if (!isPrivileged) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only workspace owners and admins can invite team members.' } });
        return;
      }

      // Check User Quota via Entitlement Engine
      const quotaCheck = await EntitlementService.canCreateUser(tenantId);
      if (!quotaCheck.allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PLAN_LIMIT_EXCEEDED',
            message: quotaCheck.reason || 'Team member seat limit reached for your current plan.',
            entitlement: 'canCreateUser',
            resource: 'canCreateUser',
            current: quotaCheck.current,
            limit: quotaCheck.limit,
            remaining: quotaCheck.remaining,
            planId: quotaCheck.planId,
            planName: quotaCheck.planName,
            upgradeRequired: true,
          },
        });
        return;
      }

      const { email, role = 'editor' } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' } });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user is already a member
      const existingMember = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where({ 'tenant_users.tenant_id': tenantId, 'users.email': normalizedEmail })
        .first();

      if (existingMember) {
        res.status(400).json({
          success: false,
          error: { code: 'ALREADY_MEMBER', message: 'This user is already an active member of this workspace.' },
        });
        return;
      }

      // Generate secure 64-char token & 7-day expiration
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const inviteId = crypto.randomUUID();

      await db('workspace_invites').insert({
        id: inviteId,
        tenant_id: tenantId,
        email: normalizedEmail,
        role: ['owner', 'admin', 'agency_admin', 'editor', 'client_approver', 'viewer'].includes(role) ? role : 'editor',
        token,
        invited_by_user_id: callerUserId,
        status: 'pending',
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const origin = req.headers.origin || process.env.WEB_APP_URL || 'http://localhost:5173';
      const inviteUrl = `${origin}/invite/${token}`;

      res.status(201).json({
        success: true,
        data: {
          id: inviteId,
          email: normalizedEmail,
          role,
          token,
          expiresAt,
          inviteUrl,
        },
      });
    } catch (err: any) {
      console.error('[WorkspaceController.inviteMember] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create workspace invitation.' } });
    }
  }

  /**
   * GET /api/v1/workspaces/invites
   * Returns all pending invitations for the active workspace
   */
  public static async listInvites(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const invites = await db('workspace_invites')
        .where({ tenant_id: tenantId, status: 'pending' })
        .where('expires_at', '>', new Date())
        .select('id', 'email', 'role', 'token', 'expires_at as expiresAt', 'created_at as createdAt')
        .orderBy('created_at', 'desc');

      const origin = req.headers.origin || process.env.WEB_APP_URL || 'http://localhost:5173';
      const formatted = invites.map((inv) => ({
        ...inv,
        inviteUrl: `${origin}/invite/${inv.token}`,
      }));

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err: any) {
      console.error('[WorkspaceController.listInvites] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve invitations.' } });
    }
  }

  /**
   * DELETE /api/v1/workspaces/invites/:inviteId
   * Cancels a pending invitation
   */
  public static async cancelInvite(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const callerRole = req.user?.role;
      const { inviteId } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const isPrivileged = callerRole === 'owner' || callerRole === 'admin' || callerRole === 'agency_admin' || (callerRole as string) === 'agency_owner';
      if (!isPrivileged) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permission denied.' } });
        return;
      }

      await db('workspace_invites')
        .where({ id: inviteId, tenant_id: tenantId })
        .update({ status: 'revoked', updated_at: new Date() });

      res.status(200).json({
        success: true,
        message: 'Invitation cancelled successfully.',
      });
    } catch (err: any) {
      console.error('[WorkspaceController.cancelInvite] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel invitation.' } });
    }
  }

  /**
   * PATCH /api/v1/workspaces/members/:userId/role
   * Updates an existing member's role
   */
  public static async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const callerRole = req.user?.role;
      const callerUserId = req.user?.userId;
      const { userId } = req.params;
      const { role } = req.body;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const isOwner = callerRole === 'owner' || (callerRole as string) === 'agency_owner' || callerRole === 'admin' || callerRole === 'agency_admin';
      if (!isOwner) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only workspace owners can alter member roles.' } });
        return;
      }

      if (!['owner', 'admin', 'agency_admin', 'editor', 'client_approver', 'viewer'].includes(role)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid role specified.' } });
        return;
      }

      // If demoting self from owner, ensure at least one other owner exists
      if (callerUserId === userId && role !== 'owner') {
        const ownerCount = await db('tenant_users')
          .where({ tenant_id: tenantId, role: 'owner' })
          .count('id as cnt')
          .first();

        if (Number(ownerCount?.cnt || 0) <= 1) {
          res.status(400).json({
            success: false,
            error: { code: 'CANNOT_DEMOTE_LAST_OWNER', message: 'Workspace must have at least one owner.' },
          });
          return;
        }
      }

      await db('tenant_users')
        .where({ tenant_id: tenantId, user_id: userId })
        .update({ role, updated_at: new Date() });

      res.status(200).json({
        success: true,
        message: 'Member role updated successfully.',
      });
    } catch (err: any) {
      console.error('[WorkspaceController.updateMemberRole] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update member role.' } });
    }
  }

  /**
   * DELETE /api/v1/workspaces/members/:userId
   * Removes a member from the active workspace
   */
  public static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const callerRole = req.user?.role;
      const callerUserId = req.user?.userId;
      const { userId } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required' } });
        return;
      }

      const isPrivileged = callerRole === 'owner' || callerRole === 'admin' || callerRole === 'agency_admin' || (callerRole as string) === 'agency_owner';
      if (!isPrivileged) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permission denied.' } });
        return;
      }

      // Cannot remove yourself if you are an owner
      if (callerUserId === userId) {
        res.status(400).json({
          success: false,
          error: { code: 'CANNOT_REMOVE_SELF', message: 'You cannot remove yourself from your own workspace.' },
        });
        return;
      }

      const deleted = await db('tenant_users')
        .where({ tenant_id: tenantId, user_id: userId })
        .del();

      if (!deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found in workspace.' } });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Member removed from workspace.',
      });
    } catch (err: any) {
      console.error('[WorkspaceController.removeMember] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member.' } });
    }
  }

  /**
   * POST /api/v1/workspaces/invites/accept
   * Accepts invitation token and attaches user to workspace
   */
  public static async acceptInvite(req: Request, res: Response): Promise<void> {
    try {
      const { token, password, fullName } = req.body;
      if (!token || typeof token !== 'string') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invite token is required.' } });
        return;
      }

      const invite = await db('workspace_invites')
        .where({ token, status: 'pending' })
        .where('expires_at', '>', new Date())
        .first();

      if (!invite) {
        res.status(404).json({
          success: false,
          error: { code: 'INVALID_INVITE', message: 'This invitation is invalid or has expired.' },
        });
        return;
      }

      let userId = req.user?.userId;

      // If user is not already logged in, look up or create user
      if (!userId) {
        let existingUser = await db('users').where({ email: invite.email }).first();
        if (!existingUser) {
          if (!password || password.length < 8) {
            res.status(400).json({
              success: false,
              error: { code: 'PASSWORD_REQUIRED', message: 'Password must be at least 8 characters long.' },
            });
            return;
          }

          const passwordHash = await hashPassword(password);
          const newUserId = crypto.randomUUID();
          await db('users').insert({
            id: newUserId,
            email: invite.email,
            password_hash: passwordHash,
            full_name: fullName || invite.email.split('@')[0],
            is_superadmin: false,
            is_active: true,
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
          userId = newUserId;
        } else {
          userId = existingUser.id;
        }
      }

      // Add to tenant_users if not already a member
      const existingMember = await db('tenant_users')
        .where({ tenant_id: invite.tenant_id, user_id: userId })
        .first();

      if (!existingMember) {
        const sub = await EntitlementService.getResolvedSubscription(invite.tenant_id);
        const activeUsersCount = await db('tenant_users')
          .where({ tenant_id: invite.tenant_id })
          .count('user_id as count')
          .first();
        if (Number(activeUsersCount?.count || 0) >= sub.maxUsers) {
          res.status(403).json({
            success: false,
            error: {
              code: 'PLAN_LIMIT_EXCEEDED',
              message: `Workspace team seat limit of ${sub.maxUsers} reached for ${sub.planName}. Please ask the workspace owner to upgrade their subscription.`,
            },
          });
          return;
        }

        await db('tenant_users').insert({
          id: crypto.randomUUID(),
          tenant_id: invite.tenant_id,
          user_id: userId,
          role: invite.role,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Mark invite as accepted
      await db('workspace_invites')
        .where({ id: invite.id })
        .update({ status: 'accepted', updated_at: new Date() });

      // Query tenant details
      const tenant = await db('tenants').where({ id: invite.tenant_id }).first();

      // Issue access token for this workspace
      const newPayload = {
        userId,
        email: invite.email,
        tenantId: invite.tenant_id,
        role: invite.role,
      };

      const accessToken = jwt.sign(newPayload, config.jwtSecret, {
        expiresIn: (config.jwtExpiresIn as any) || '15m',
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          workspace: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            role: invite.role,
          },
        },
      });
    } catch (err: any) {
      console.error('[WorkspaceController.acceptInvite] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to accept invitation.' } });
    }
  }
}
