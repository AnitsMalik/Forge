/**
 * Enterprise Custom Roles & Granular RBAC Permissions Engine Service
 * SocialForge Platform v4.4.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import { ROLE_PERMISSIONS, TenantRole } from '@socialforge/shared';
import type {
  PermissionDefinition,
  EnterpriseCustomRole,
  UserPermissionOverride,
  UserEffectivePermissions,
  RbacSimulationRequest,
  RbacSimulationResult,
  RbacOverviewMetrics,
  CreateEnterpriseRoleDto,
  UpdateCustomRoleDto,
  AssignUserCustomRoleDto,
  CreatePermissionOverrideDto,
} from '@socialforge/shared';

// Master Catalog of 40+ Fine-Grained Permissions
export const PERMISSION_REGISTRY: PermissionDefinition[] = [
  // Posts & Publishing
  { slug: 'posts:read', name: 'View Posts & Drafts', category: 'posts', description: 'Read-only access to post calendars, drafts, and publication queues', riskLevel: 'low' },
  { slug: 'posts:create', name: 'Create Post Drafts', category: 'posts', description: 'Author new social post concepts, drafts, and copy variations', riskLevel: 'low' },
  { slug: 'posts:edit', name: 'Edit Posts & Captions', category: 'posts', description: 'Modify post captions, hashtags, scheduled times, and assets', riskLevel: 'low' },
  { slug: 'posts:delete', name: 'Delete Posts', category: 'posts', description: 'Permanently remove draft or queued social media posts', riskLevel: 'medium' },
  { slug: 'posts:approve', name: 'Approve Outbound Posts', category: 'posts', description: 'Grant editorial or compliance clearance for queued posts', riskLevel: 'medium' },
  { slug: 'posts:publish', name: 'Direct Live Publish', category: 'posts', description: 'Publish content directly to live connected social platforms', riskLevel: 'high' },
  { slug: 'posts:schedule', name: 'Schedule Publication', category: 'posts', description: 'Assign publication slots and automated delivery queues', riskLevel: 'low' },

  // Templates & Brand Brain
  { slug: 'templates:read', name: 'View Design Templates', category: 'templates', description: 'Access template library and typography styles', riskLevel: 'low' },
  { slug: 'templates:create', name: 'Create Templates', category: 'templates', description: 'Build reusable creative templates and layouts', riskLevel: 'low' },
  { slug: 'templates:edit', name: 'Edit Templates', category: 'templates', description: 'Update template parameters, placeholders, and styling', riskLevel: 'low' },
  { slug: 'templates:delete', name: 'Delete Templates', category: 'templates', description: 'Remove design templates from the library', riskLevel: 'medium' },
  { slug: 'brand:read', name: 'View Brand Brain', category: 'brand', description: 'Read brand tone, target audience, and style rules', riskLevel: 'low' },
  { slug: 'brand:manage', name: 'Configure Brand Brain', category: 'brand', description: 'Edit voice, identity, prohibited topics, and tone', riskLevel: 'medium' },

  // Automations & Agent Copilot
  { slug: 'automations:read', name: 'View Automations', category: 'automations', description: 'Inspect trigger rules, schedules, and run history', riskLevel: 'low' },
  { slug: 'automations:create', name: 'Create Automations', category: 'automations', description: 'Build event-driven content generation pipelines', riskLevel: 'medium' },
  { slug: 'automations:trigger', name: 'Trigger Automations', category: 'automations', description: 'Manually invoke autonomous workflow executions', riskLevel: 'medium' },
  { slug: 'automations:delete', name: 'Delete Automations', category: 'automations', description: 'Remove automation pipelines', riskLevel: 'medium' },
  { slug: 'agent:run', name: 'Execute AI Copilot', category: 'automations', description: 'Prompt AI agent for creative ideation and rewriting', riskLevel: 'low' },

  // Social Connections & Integrations
  { slug: 'connections:read', name: 'View Connected Accounts', category: 'connections', description: 'View connected Facebook, Instagram, LinkedIn profiles', riskLevel: 'low' },
  { slug: 'connections:manage', name: 'Manage Integrations', category: 'connections', description: 'Authorize, re-authenticate, or refresh social tokens', riskLevel: 'high' },
  { slug: 'connections:disconnect', name: 'Disconnect Channels', category: 'connections', description: 'Revoke channel authorizations and disconnect feeds', riskLevel: 'high' },

  // Analytics & Reporting
  { slug: 'analytics:read', name: 'View Analytics', category: 'analytics', description: 'Access engagement, reach, and follower growth dashboards', riskLevel: 'low' },
  { slug: 'analytics:export', name: 'Export Analytics', category: 'analytics', description: 'Download CSV/JSON raw telemetry datasets', riskLevel: 'medium' },
  { slug: 'reports:read', name: 'Read Reports', category: 'analytics', description: 'Inspect executive summaries and monthly reports', riskLevel: 'low' },
  { slug: 'campaigns:read', name: 'View Campaigns', category: 'analytics', description: 'Access marketing campaigns and attribution data', riskLevel: 'low' },
  { slug: 'campaigns:orchestrate', name: 'Orchestrate Campaigns', category: 'analytics', description: 'Launch and reallocate multi-channel ad budgets', riskLevel: 'medium' },

  // Cybersecurity, SIEM & DLP Guardrails
  { slug: 'siem:read', name: 'View SIEM Destinations', category: 'security', description: 'Inspect security telemetry exporters and dispatch logs', riskLevel: 'medium' },
  { slug: 'siem:manage', name: 'Configure SIEM Exporters', category: 'security', description: 'Add or modify Splunk, Datadog, Syslog, or Elastic streams', riskLevel: 'high' },
  { slug: 'dlp:read', name: 'View DLP Policies', category: 'security', description: 'Inspect sensitive data policies and incident telemetry', riskLevel: 'medium' },
  { slug: 'dlp:manage', name: 'Configure DLP Rules', category: 'security', description: 'Create and update PII/PCI credential redaction policies', riskLevel: 'high' },
  { slug: 'dlp:quarantine_review', name: 'Review DLP Quarantines', category: 'security', description: 'Approve sanitized release or reject quarantined content', riskLevel: 'high' },
  { slug: 'dlp:override', name: 'Override DLP Guardrails', category: 'security', description: 'Bypass content security guardrails under emergency authorization', riskLevel: 'critical' },
  { slug: 'sso:read', name: 'View SSO Configurations', category: 'security', description: 'View SAML 2.0 and OIDC federated identity providers', riskLevel: 'medium' },
  { slug: 'sso:manage', name: 'Configure Enterprise SSO', category: 'security', description: 'Update IdP metadata, ACS bindings, and certificate rotation', riskLevel: 'high' },
  { slug: 'scim:read', name: 'View SCIM Sync Status', category: 'security', description: 'View automated workforce provisioning logs and token status', riskLevel: 'medium' },
  { slug: 'scim:manage', name: 'Manage SCIM Tokens', category: 'security', description: 'Generate or revoke SCIM 2.0 directory bearer tokens', riskLevel: 'high' },

  // Compliance & Audit
  { slug: 'audit:read', name: 'Inspect Audit Logs', category: 'compliance', description: 'View immutable system and superadmin operational audit records', riskLevel: 'medium' },
  { slug: 'audit:verify', name: 'Verify Audit Checkpoints', category: 'compliance', description: 'Validate Merkle-tree cryptographic integrity seals', riskLevel: 'high' },
  { slug: 'compliance:export', name: 'Generate Compliance Exports', category: 'compliance', description: 'Trigger GDPR SAR and SOC2 Type II compliance data bundles', riskLevel: 'high' },
  { slug: 'compliance:purge', name: 'Execute Data Purges', category: 'compliance', description: 'Perform tamper-evident cryptographic data purges', riskLevel: 'critical' },

  // Team, Workspace & Billing
  { slug: 'team:read', name: 'View Team Members', category: 'team', description: 'List workspace users, avatars, and membership status', riskLevel: 'low' },
  { slug: 'team:invite', name: 'Invite Team Members', category: 'team', description: 'Issue workspace invites with designated roles', riskLevel: 'low' },
  { slug: 'team:roles_manage', name: 'Manage Member Roles', category: 'team', description: 'Assign custom roles and configure permission overrides', riskLevel: 'high' },
  { slug: 'team:remove', name: 'Remove Team Members', category: 'team', description: 'Revoke workspace access and offboard users', riskLevel: 'medium' },
  { slug: 'billing:read', name: 'View Billing & Invoices', category: 'billing', description: 'Access subscription tiers, payment methods, and invoices', riskLevel: 'low' },
  { slug: 'billing:manage', name: 'Manage Subscriptions', category: 'billing', description: 'Change commercial plans, purchase addon seats, manage cards', riskLevel: 'high' },
  { slug: 'invoices:download', name: 'Download Invoices', category: 'billing', description: 'Download billing tax invoices and receipts', riskLevel: 'low' },

  // System Superuser
  { slug: 'tenants:read', name: 'Read Tenant Metadata', category: 'system', description: 'Inspect tenant slugs, quotas, and entitlements', riskLevel: 'low' },
  { slug: 'tenants:manage', name: 'Configure Tenant Settings', category: 'system', description: 'Modify enterprise tenant quotas, modules, and domain routing', riskLevel: 'high' },
  { slug: 'rbac:manage', name: 'Manage RBAC Engine', category: 'system', description: 'Create, update, or deprecate custom roles and matrix permissions', riskLevel: 'high' },
  { slug: '*', name: 'Full Platform Superuser', category: 'system', description: 'Unrestricted administrative access to all platform resources', riskLevel: 'critical' },
];

export class RbacService {
  /**
   * Return entire permissions catalog
   */
  listPermissions(): PermissionDefinition[] {
    return PERMISSION_REGISTRY;
  }

  /**
   * Telemetry Overview Metrics
   */
  async getOverview(tenantId?: string): Promise<RbacOverviewMetrics> {
    const rolesQuery = db('custom_roles_and_permissions');
    if (tenantId) {
      rolesQuery.where((qb: any) => qb.where({ tenant_id: tenantId }).orWhereNull('tenant_id'));
    }
    const roles = await rolesQuery.select('id', 'is_system', 'tenant_id');

    const totalRoles = roles.length;
    const systemRoles = roles.filter((r: any) => Boolean(r.is_system)).length;
    const customRoles = totalRoles - systemRoles;

    // Users with assigned custom roles
    let userRolesQuery = db('tenant_user_custom_roles');
    if (tenantId) {
      userRolesQuery = userRolesQuery.where({ tenant_id: tenantId });
    }
    const userRoleRows = await userRolesQuery.countDistinct('user_id as count').first();
    const totalUsersWithCustomRoles = Number(userRoleRows?.count || 0);

    // Active permission overrides
    let overridesQuery = db('tenant_user_permission_overrides');
    if (tenantId) {
      overridesQuery = overridesQuery.where({ tenant_id: tenantId });
    }
    overridesQuery = overridesQuery.where((qb: any) =>
      qb.whereNull('expires_at').orWhere('expires_at', '>', new Date())
    );
    const overridesRows = await overridesQuery.count('id as count').first();
    const totalActiveOverrides = Number(overridesRows?.count || 0);

    return {
      totalRoles,
      systemRoles,
      customRoles,
      totalUsersWithCustomRoles,
      totalActiveOverrides,
      totalCatalogPermissions: PERMISSION_REGISTRY.length,
    };
  }

  /**
   * List all roles with optional filtering and user assignment counts
   */
  async listRoles(filter?: { tenantId?: string; search?: string }): Promise<EnterpriseCustomRole[]> {
    let query = db('custom_roles_and_permissions').orderBy('is_system', 'desc').orderBy('created_at', 'asc');

    if (filter?.tenantId) {
      query = query.where((qb: any) => qb.where({ tenant_id: filter.tenantId }).orWhereNull('tenant_id'));
    }

    if (filter?.search) {
      const term = `%${filter.search.toLowerCase()}%`;
      query = query.where((qb: any) =>
        qb.whereRaw('LOWER(role_slug) LIKE ?', [term]).orWhereRaw('LOWER(role_name) LIKE ?', [term])
      );
    }

    const rows = await query;

    // Get assignment counts
    const assignmentCounts = await db('tenant_user_custom_roles')
      .groupBy('role_id')
      .select('role_id', db.raw('COUNT(DISTINCT user_id) as user_count'));

    const countMap = new Map<string, number>();
    for (const r of assignmentCounts as any[]) {
      countMap.set(r.role_id, Number(r.user_count || 0));
    }

    return rows.map((r: any) => {
      let permissions: string[] = [];
      try {
        permissions = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions || [];
      } catch {
        permissions = [];
      }

      return {
        id: r.id,
        tenantId: r.tenant_id,
        roleSlug: r.role_slug,
        roleName: r.role_name,
        description: r.description,
        permissions,
        parentRoleSlug: r.parent_role_slug || null,
        isSystem: Boolean(r.is_system),
        userCount: countMap.get(r.id) || 0,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });
  }

  /**
   * Get single role by ID or slug
   */
  async getRole(idOrSlug: string, tenantId?: string): Promise<EnterpriseCustomRole | null> {
    let query = db('custom_roles_and_permissions').where((qb: any) =>
      qb.where({ id: idOrSlug }).orWhere({ role_slug: idOrSlug })
    );

    if (tenantId) {
      query = query.andWhere((qb: any) => qb.where({ tenant_id: tenantId }).orWhereNull('tenant_id'));
    }

    const r = await query.first();
    if (!r) return null;

    let permissions: string[] = [];
    try {
      permissions = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions || [];
    } catch {
      permissions = [];
    }

    const userCountRow = await db('tenant_user_custom_roles')
      .where({ role_id: r.id })
      .countDistinct('user_id as count')
      .first();

    return {
      id: r.id,
      tenantId: r.tenant_id,
      roleSlug: r.role_slug,
      roleName: r.role_name,
      description: r.description,
      permissions,
      parentRoleSlug: r.parent_role_slug || null,
      isSystem: Boolean(r.is_system),
      userCount: Number(userCountRow?.count || 0),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  /**
   * Create custom role
   */
  async createCustomRole(
    dto: CreateEnterpriseRoleDto,
    actor: { id: string; email: string }
  ): Promise<EnterpriseCustomRole> {
    const slug = dto.roleSlug.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    if (!slug) {
      throw new Error('Role slug must contain valid alphanumeric or underscore characters.');
    }
    if (!dto.roleName || !dto.roleName.trim()) {
      throw new Error('Role name is required.');
    }
    if (!dto.permissions || dto.permissions.length === 0) {
      throw new Error('At least one permission must be assigned to the custom role.');
    }

    // Check if role slug already exists
    const existing = await db('custom_roles_and_permissions').where({ role_slug: slug }).first();
    if (existing) {
      throw new Error(`Role with slug "${slug}" already exists.`);
    }

    // Validate parent role if specified
    if (dto.parentRoleSlug) {
      const parent = await db('custom_roles_and_permissions').where({ role_slug: dto.parentRoleSlug }).first();
      if (!parent) {
        throw new Error(`Parent role "${dto.parentRoleSlug}" does not exist.`);
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db('custom_roles_and_permissions').insert({
      id,
      tenant_id: dto.targetTenantId || null,
      role_slug: slug,
      role_name: dto.roleName.trim(),
      description: dto.description?.trim() || null,
      permissions: JSON.stringify(dto.permissions),
      parent_role_slug: dto.parentRoleSlug || null,
      is_system: 0,
      created_at: now,
      updated_at: now,
    });

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'create_custom_role',
      target_resource_type: 'role',
      target_resource_id: id,
      reason: `Created custom RBAC role ${dto.roleName} (${slug})`,
      details: JSON.stringify({
        roleSlug: slug,
        permissionsCount: dto.permissions.length,
        parentRoleSlug: dto.parentRoleSlug || null,
        targetTenantId: dto.targetTenantId || null,
      }),
      created_at: now,
    });

    return {
      id,
      tenantId: dto.targetTenantId || null,
      roleSlug: slug,
      roleName: dto.roleName.trim(),
      description: dto.description?.trim() || null,
      permissions: dto.permissions,
      parentRoleSlug: dto.parentRoleSlug || null,
      isSystem: false,
      userCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  /**
   * Update custom role (Prevents mutating is_system roles)
   */
  async updateCustomRole(
    id: string,
    dto: UpdateCustomRoleDto,
    actor: { id: string; email: string }
  ): Promise<EnterpriseCustomRole> {
    const role = await db('custom_roles_and_permissions').where({ id }).first();
    if (!role) {
      throw new Error(`Role with id "${id}" not found.`);
    }

    if (Boolean(role.is_system)) {
      throw new Error('System roles are immutable and cannot be modified or reconfigured.');
    }

    const updates: Record<string, any> = {
      updated_at: new Date(),
    };

    if (dto.roleName !== undefined) {
      if (!dto.roleName.trim()) throw new Error('Role name cannot be empty.');
      updates.role_name = dto.roleName.trim();
    }

    if (dto.description !== undefined) {
      updates.description = dto.description.trim() || null;
    }

    if (dto.permissions !== undefined) {
      if (!dto.permissions.length) throw new Error('Role must retain at least one permission.');
      updates.permissions = JSON.stringify(dto.permissions);
    }

    if (dto.parentRoleSlug !== undefined) {
      if (dto.parentRoleSlug === role.role_slug) {
        throw new Error('A role cannot inherit from itself.');
      }
      if (dto.parentRoleSlug) {
        const parent = await db('custom_roles_and_permissions').where({ role_slug: dto.parentRoleSlug }).first();
        if (!parent) throw new Error(`Parent role "${dto.parentRoleSlug}" does not exist.`);
      }
      updates.parent_role_slug = dto.parentRoleSlug || null;
    }

    await db('custom_roles_and_permissions').where({ id }).update(updates);

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'update_custom_role',
      target_resource_type: 'role',
      target_resource_id: id,
      reason: `Updated custom RBAC role ${role.role_name} (${role.role_slug})`,
      details: JSON.stringify(updates),
      created_at: new Date(),
    });

    return (await this.getRole(id))!;
  }

  /**
   * Delete custom role (Prevents deleting is_system roles)
   */
  async deleteCustomRole(
    id: string,
    actor: { id: string; email: string }
  ): Promise<{ success: boolean; message: string }> {
    const role = await db('custom_roles_and_permissions').where({ id }).first();
    if (!role) {
      throw new Error(`Role with id "${id}" not found.`);
    }

    if (Boolean(role.is_system)) {
      throw new Error('System roles cannot be deleted to protect platform governance integrity.');
    }

    // Clean up user assignments
    const deletedAssignments = await db('tenant_user_custom_roles').where({ role_id: id }).delete();

    // Delete role record
    await db('custom_roles_and_permissions').where({ id }).delete();

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'delete_custom_role',
      target_resource_type: 'role',
      target_resource_id: id,
      reason: `Deleted custom RBAC role ${role.role_name} (${role.role_slug}), unassigned ${deletedAssignments} user(s)`,
      details: JSON.stringify({ roleSlug: role.role_slug, deletedAssignments }),
      created_at: new Date(),
    });

    return {
      success: true,
      message: `Custom role "${role.role_name}" successfully deleted. ${deletedAssignments} user assignment(s) revoked.`,
    };
  }

  /**
   * User Role Assignments
   */
  async listUserAssignments(tenantId: string): Promise<any[]> {
    const rows = await db('tenant_user_custom_roles')
      .join('users', 'tenant_user_custom_roles.user_id', 'users.id')
      .join('custom_roles_and_permissions', 'tenant_user_custom_roles.role_id', 'custom_roles_and_permissions.id')
      .where('tenant_user_custom_roles.tenant_id', tenantId)
      .select(
        'tenant_user_custom_roles.id',
        'tenant_user_custom_roles.tenant_id as tenantId',
        'tenant_user_custom_roles.user_id as userId',
        'users.email as userEmail',
        'users.full_name as userFullName',
        'custom_roles_and_permissions.id as roleId',
        'custom_roles_and_permissions.role_slug as roleSlug',
        'custom_roles_and_permissions.role_name as roleName',
        'tenant_user_custom_roles.assigned_by as assignedBy',
        'tenant_user_custom_roles.created_at as createdAt'
      )
      .orderBy('tenant_user_custom_roles.created_at', 'desc');

    return rows.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  async assignUserCustomRole(
    dto: AssignUserCustomRoleDto,
    actor: { id: string; email: string }
  ): Promise<any> {
    const role = await db('custom_roles_and_permissions').where({ id: dto.roleId }).first();
    if (!role) {
      throw new Error(`Role with id "${dto.roleId}" not found.`);
    }

    const membership = await db('tenant_users')
      .where({ tenant_id: dto.tenantId, user_id: dto.userId })
      .first();
    if (!membership) {
      throw new Error('Target user is not an active member of this tenant workspace.');
    }

    const existingAssignment = await db('tenant_user_custom_roles')
      .where({ tenant_id: dto.tenantId, user_id: dto.userId, role_id: dto.roleId })
      .first();

    if (existingAssignment) {
      return {
        id: existingAssignment.id,
        tenantId: dto.tenantId,
        userId: dto.userId,
        roleId: dto.roleId,
        roleName: role.role_name,
        alreadyAssigned: true,
      };
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db('tenant_user_custom_roles').insert({
      id,
      tenant_id: dto.tenantId,
      user_id: dto.userId,
      role_id: dto.roleId,
      assigned_by: actor.id,
      created_at: now,
    });

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'assign_custom_role',
      target_resource_type: 'user',
      target_resource_id: dto.userId,
      reason: `Assigned custom role ${role.role_name} (${role.role_slug}) to user`,
      details: JSON.stringify({ tenantId: dto.tenantId, roleId: dto.roleId, roleSlug: role.role_slug }),
      created_at: now,
    });

    return {
      id,
      tenantId: dto.tenantId,
      userId: dto.userId,
      roleId: dto.roleId,
      roleName: role.role_name,
      roleSlug: role.role_slug,
      assignedAt: now.toISOString(),
    };
  }

  async unassignUserCustomRole(
    assignmentId: string,
    actor: { id: string; email: string }
  ): Promise<{ success: boolean; message: string }> {
    const assignment = await db('tenant_user_custom_roles').where({ id: assignmentId }).first();
    if (!assignment) {
      throw new Error(`Assignment with id "${assignmentId}" not found.`);
    }

    await db('tenant_user_custom_roles').where({ id: assignmentId }).delete();

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'unassign_custom_role',
      target_resource_type: 'user',
      target_resource_id: assignment.user_id,
      reason: 'Revoked custom role assignment',
      details: JSON.stringify(assignment),
      created_at: new Date(),
    });

    return { success: true, message: 'Custom role assignment successfully revoked.' };
  }

  /**
   * User Permission Overrides
   */
  async listUserOverrides(tenantId: string): Promise<UserPermissionOverride[]> {
    const rows = await db('tenant_user_permission_overrides')
      .leftJoin('users', 'tenant_user_permission_overrides.user_id', 'users.id')
      .where('tenant_user_permission_overrides.tenant_id', tenantId)
      .select(
        'tenant_user_permission_overrides.id',
        'tenant_user_permission_overrides.tenant_id as tenantId',
        'tenant_user_permission_overrides.user_id as userId',
        'users.email as userEmail',
        'users.full_name as userFullName',
        'tenant_user_permission_overrides.permission_slug as permissionSlug',
        'tenant_user_permission_overrides.effect',
        'tenant_user_permission_overrides.reason',
        'tenant_user_permission_overrides.created_by as createdBy',
        'tenant_user_permission_overrides.expires_at as expiresAt',
        'tenant_user_permission_overrides.created_at as createdAt'
      )
      .orderBy('tenant_user_permission_overrides.created_at', 'desc');

    return rows.map((r: any) => ({
      ...r,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  async createPermissionOverride(
    dto: CreatePermissionOverrideDto,
    actor: { id: string; email: string }
  ): Promise<UserPermissionOverride> {
    if (!dto.permissionSlug) {
      throw new Error('Permission slug is required.');
    }
    if (!['allow', 'deny'].includes(dto.effect)) {
      throw new Error('Override effect must be either "allow" or "deny".');
    }

    const membership = await db('tenant_users')
      .where({ tenant_id: dto.tenantId, user_id: dto.userId })
      .first();
    if (!membership) {
      throw new Error('Target user is not an active member of this tenant workspace.');
    }

    let expiresAt: Date | null = null;
    if (dto.expiresInDays && dto.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + dto.expiresInDays * 86400 * 1000);
    }

    const existing = await db('tenant_user_permission_overrides')
      .where({
        tenant_id: dto.tenantId,
        user_id: dto.userId,
        permission_slug: dto.permissionSlug,
      })
      .first();

    const now = new Date();

    if (existing) {
      await db('tenant_user_permission_overrides')
        .where({ id: existing.id })
        .update({
          effect: dto.effect,
          reason: dto.reason || existing.reason,
          created_by: actor.id,
          expires_at: expiresAt,
          created_at: now,
        });

      return {
        id: existing.id,
        tenantId: dto.tenantId,
        userId: dto.userId,
        permissionSlug: dto.permissionSlug,
        effect: dto.effect,
        reason: dto.reason || existing.reason,
        createdBy: actor.id,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        createdAt: now.toISOString(),
      };
    }

    const id = crypto.randomUUID();
    await db('tenant_user_permission_overrides').insert({
      id,
      tenant_id: dto.tenantId,
      user_id: dto.userId,
      permission_slug: dto.permissionSlug,
      effect: dto.effect,
      reason: dto.reason || null,
      created_by: actor.id,
      expires_at: expiresAt,
      created_at: now,
    });

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'create_permission_override',
      target_resource_type: 'user',
      target_resource_id: dto.userId,
      reason: `Configured explicit ${dto.effect.toUpperCase()} override for "${dto.permissionSlug}"`,
      details: JSON.stringify({ tenantId: dto.tenantId, permission: dto.permissionSlug, effect: dto.effect }),
      created_at: now,
    });

    return {
      id,
      tenantId: dto.tenantId,
      userId: dto.userId,
      permissionSlug: dto.permissionSlug,
      effect: dto.effect,
      reason: dto.reason || null,
      createdBy: actor.id,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      createdAt: now.toISOString(),
    };
  }

  async deletePermissionOverride(
    overrideId: string,
    actor: { id: string; email: string }
  ): Promise<{ success: boolean }> {
    const override = await db('tenant_user_permission_overrides').where({ id: overrideId }).first();
    if (!override) {
      throw new Error(`Permission override "${overrideId}" not found.`);
    }

    await db('tenant_user_permission_overrides').where({ id: overrideId }).delete();

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action: 'delete_permission_override',
      target_resource_type: 'user',
      target_resource_id: override.user_id,
      reason: `Revoked explicit override for ${override.permission_slug}`,
      details: JSON.stringify(override),
      created_at: new Date(),
    });

    return { success: true };
  }

  /**
   * Core Granular Permission Evaluation Engine
   * Evaluates base role + custom roles + parent inheritance + overrides (Deny > Allow)
   */
  async resolveEffectivePermissions(
    tenantId: string,
    userId: string
  ): Promise<UserEffectivePermissions> {
    const membership = await db('tenant_users')
      .where({ tenant_id: tenantId, user_id: userId })
      .first();

    const baseRole = membership?.role || 'viewer';

    // 1. Base Role Permissions
    const grantedSet = new Set<string>();

    // Map base permissions from shared ROLE_PERMISSIONS
    const basePermissions = ROLE_PERMISSIONS[baseRole as TenantRole] || [];
    for (const p of basePermissions) {
      grantedSet.add(p);
      // Map legacy slugs to modern granular slugs
      if (p === 'create_post') grantedSet.add('posts:create');
      if (p === 'edit_post') grantedSet.add('posts:edit');
      if (p === 'approve_post') grantedSet.add('posts:approve');
      if (p === 'publish_post') grantedSet.add('posts:publish');
      if (p === 'view_analytics') grantedSet.add('analytics:read');
      if (p === 'view_reports') grantedSet.add('reports:read');
      if (p === 'manage_templates') grantedSet.add('templates:read').add('templates:create').add('templates:edit');
      if (p === 'manage_connections') grantedSet.add('connections:read').add('connections:manage');
      if (p === 'manage_automations') grantedSet.add('automations:read').add('automations:create').add('automations:trigger');
      if (p === 'run_agent') grantedSet.add('agent:run');
      if (p === 'manage_team') grantedSet.add('team:read').add('team:invite').add('team:roles_manage');
      if (p === 'manage_billing') grantedSet.add('billing:read').add('billing:manage');
      if (p === 'manage_tenant') grantedSet.add('tenants:read').add('tenants:manage');
    }

    if (baseRole === 'owner') {
      grantedSet.add('*');
    }

    // 2. Custom Roles Assigned
    const customRoleRows = await db('tenant_user_custom_roles')
      .join('custom_roles_and_permissions', 'tenant_user_custom_roles.role_id', 'custom_roles_and_permissions.id')
      .where({ 'tenant_user_custom_roles.tenant_id': tenantId, 'tenant_user_custom_roles.user_id': userId })
      .select(
        'custom_roles_and_permissions.id',
        'custom_roles_and_permissions.role_slug',
        'custom_roles_and_permissions.role_name',
        'custom_roles_and_permissions.permissions',
        'custom_roles_and_permissions.parent_role_slug'
      );

    const customRolesList: Array<{ id: string; roleSlug: string; roleName: string }> = [];

    for (const r of customRoleRows) {
      customRolesList.push({ id: r.id, roleSlug: r.role_slug, roleName: r.role_name });
      let perms: string[] = [];
      try {
        perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions || [];
      } catch {
        perms = [];
      }
      for (const p of perms) {
        grantedSet.add(p);
      }

      // Check inheritance
      if (r.parent_role_slug) {
        const parentRole = await db('custom_roles_and_permissions')
          .where({ role_slug: r.parent_role_slug })
          .first();
        if (parentRole) {
          try {
            const parentPerms = typeof parentRole.permissions === 'string'
              ? JSON.parse(parentRole.permissions)
              : parentRole.permissions || [];
            for (const pp of parentPerms) {
              grantedSet.add(pp);
            }
          } catch {}
        }
      }
    }

    // 3. User Permission Overrides
    const overrideRows = await db('tenant_user_permission_overrides')
      .where({ tenant_id: tenantId, user_id: userId })
      .where((qb: any) => qb.whereNull('expires_at').orWhere('expires_at', '>', new Date()));

    const explicitDenies: string[] = [];
    const explicitAllows: string[] = [];

    for (const ov of overrideRows) {
      if (ov.effect === 'deny') {
        explicitDenies.push(ov.permission_slug);
      } else if (ov.effect === 'allow') {
        explicitAllows.push(ov.permission_slug);
      }
    }

    // Apply explicit allows
    for (const ea of explicitAllows) {
      grantedSet.add(ea);
    }

    // Apply explicit denies (Deny takes absolute precedence)
    for (const ed of explicitDenies) {
      grantedSet.delete(ed);
    }

    return {
      userId,
      tenantId,
      baseRole,
      customRoles: customRolesList,
      effectivePermissions: Array.from(grantedSet),
      explicitDenies,
      explicitAllows,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fast Boolean Permission Check
   */
  async hasEffectivePermission(
    tenantId: string,
    userId: string,
    requiredPermission: string
  ): Promise<boolean> {
    const effective = await this.resolveEffectivePermissions(tenantId, userId);

    // If explicitly denied, immediately return false
    if (effective.explicitDenies.includes(requiredPermission) || effective.explicitDenies.includes('*')) {
      return false;
    }

    // Wildcard superuser match
    if (effective.effectivePermissions.includes('*')) {
      return true;
    }

    // Direct match
    if (effective.effectivePermissions.includes(requiredPermission)) {
      return true;
    }

    // Prefix wildcard match (e.g. "posts:*" matches "posts:create")
    const parts = requiredPermission.split(':');
    if (parts.length > 1) {
      const wildcard = `${parts[0]}:*`;
      if (effective.effectivePermissions.includes(wildcard)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sandbox RBAC Simulation Inspector
   */
  async simulatePermissionEvaluation(req: RbacSimulationRequest): Promise<RbacSimulationResult> {
    const target = req.targetPermission;
    if (!target) {
      throw new Error('targetPermission is required for RBAC simulation.');
    }

    // If userId and tenantId provided, start with live state
    let grantedSet = new Set<string>();
    let explicitDenies = new Set<string>();
    let explicitAllows = new Set<string>();
    let inheritedFrom: string | undefined = undefined;

    if (req.baseRole) {
      const basePerms = ROLE_PERMISSIONS[req.baseRole as TenantRole] || [];
      for (const p of basePerms) {
        grantedSet.add(p);
      }
      if (req.baseRole === 'owner') grantedSet.add('*');
    }

    // Add hypothetical custom roles
    if (req.hypotheticalRoles && req.hypotheticalRoles.length > 0) {
      for (const slug of req.hypotheticalRoles) {
        const role = await db('custom_roles_and_permissions').where({ role_slug: slug }).first();
        if (role) {
          try {
            const perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions || [];
            for (const p of perms) grantedSet.add(p);

            if (role.parent_role_slug) {
              const parent = await db('custom_roles_and_permissions').where({ role_slug: role.parent_role_slug }).first();
              if (parent) {
                const parentPerms = typeof parent.permissions === 'string' ? JSON.parse(parent.permissions) : parent.permissions || [];
                for (const pp of parentPerms) grantedSet.add(pp);
                if (parentPerms.includes(target)) {
                  inheritedFrom = role.parent_role_slug;
                }
              }
            }
          } catch {}
        }
      }
    }

    // Apply hypothetical overrides
    if (req.hypotheticalOverrides) {
      for (const ov of req.hypotheticalOverrides) {
        if (ov.effect === 'deny') explicitDenies.add(ov.permissionSlug);
        if (ov.effect === 'allow') explicitAllows.add(ov.permissionSlug);
      }
    }

    // Deny check first
    if (explicitDenies.has(target) || explicitDenies.has('*')) {
      return {
        allowed: false,
        reason: `Explicit DENY override for "${target}" takes absolute precedence.`,
        blockedByDeny: true,
        evaluatedPermissionsCount: grantedSet.size + explicitAllows.size,
      };
    }

    // Explicit allow
    if (explicitAllows.has(target)) {
      return {
        allowed: true,
        reason: `Explicit ALLOW override granted for "${target}".`,
        matchedGrant: `override:allow:${target}`,
        evaluatedPermissionsCount: grantedSet.size + explicitAllows.size,
      };
    }

    // Wildcard superuser grant
    if (grantedSet.has('*')) {
      return {
        allowed: true,
        reason: 'Permitted via platform wildcard superuser grant (*).',
        matchedGrant: '*',
        evaluatedPermissionsCount: grantedSet.size,
      };
    }

    // Direct match
    if (grantedSet.has(target)) {
      return {
        allowed: true,
        reason: `Permission granted via assigned role matrix.`,
        matchedGrant: target,
        inheritedFrom,
        evaluatedPermissionsCount: grantedSet.size,
      };
    }

    // Prefix wildcard
    const parts = target.split(':');
    if (parts.length > 1) {
      const wildcard = `${parts[0]}:*`;
      if (grantedSet.has(wildcard)) {
        return {
          allowed: true,
          reason: `Permission granted via domain wildcard (${wildcard}).`,
          matchedGrant: wildcard,
          evaluatedPermissionsCount: grantedSet.size,
        };
      }
    }

    return {
      allowed: false,
      reason: `Permission "${target}" not granted by any assigned role or explicit allow override.`,
      evaluatedPermissionsCount: grantedSet.size,
    };
  }
}

export const rbacService = new RbacService();
