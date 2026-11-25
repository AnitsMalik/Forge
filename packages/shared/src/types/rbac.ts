/**
 * Enterprise Custom Roles & Granular RBAC Permissions Types
 * SocialForge Platform v4.4.0
 */

export type PermissionCategory =
  | 'posts'
  | 'templates'
  | 'automations'
  | 'connections'
  | 'analytics'
  | 'brand'
  | 'compliance'
  | 'security'
  | 'team'
  | 'billing'
  | 'system';

export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PermissionDefinition {
  slug: string;
  name: string;
  category: PermissionCategory;
  description: string;
  riskLevel: PermissionRiskLevel;
  dependencies?: string[];
}

export interface EnterpriseCustomRole {
  id: string;
  tenantId: string | null;
  roleSlug: string;
  roleName: string;
  description: string | null;
  permissions: string[];
  parentRoleSlug?: string | null;
  isSystem: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type OverrideEffect = 'allow' | 'deny';

export interface UserPermissionOverride {
  id: string;
  tenantId: string;
  userId: string;
  userEmail?: string;
  userFullName?: string;
  permissionSlug: string;
  effect: OverrideEffect;
  reason: string | null;
  createdBy: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface UserEffectivePermissions {
  userId: string;
  tenantId: string;
  baseRole: string;
  customRoles: Array<{ id: string; roleSlug: string; roleName: string }>;
  effectivePermissions: string[];
  explicitDenies: string[];
  explicitAllows: string[];
  evaluatedAt: string;
}

export interface RbacSimulationRequest {
  tenantId?: string;
  userId?: string;
  baseRole?: string;
  hypotheticalRoles?: string[];
  hypotheticalOverrides?: Array<{ permissionSlug: string; effect: OverrideEffect }>;
  targetPermission: string;
}

export interface RbacSimulationResult {
  allowed: boolean;
  reason: string;
  matchedGrant?: string;
  blockedByDeny?: boolean;
  inheritedFrom?: string;
  evaluatedPermissionsCount: number;
}

export interface RbacOverviewMetrics {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  totalUsersWithCustomRoles: number;
  totalActiveOverrides: number;
  totalCatalogPermissions: number;
}

export interface CreateEnterpriseRoleDto {
  targetTenantId?: string | null;
  roleSlug: string;
  roleName: string;
  description?: string;
  permissions: string[];
  parentRoleSlug?: string | null;
  confirmation?: boolean;
}

export interface UpdateCustomRoleDto {
  roleName?: string;
  description?: string;
  permissions?: string[];
  parentRoleSlug?: string | null;
}

export interface AssignUserCustomRoleDto {
  tenantId: string;
  userId: string;
  roleId: string;
}

export interface CreatePermissionOverrideDto {
  tenantId: string;
  userId: string;
  permissionSlug: string;
  effect: OverrideEffect;
  reason?: string;
  expiresInDays?: number;
}
