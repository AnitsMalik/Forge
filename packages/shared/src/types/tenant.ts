export type TenantRole =
  | 'owner'
  | 'admin'
  | 'agency_admin'
  | 'editor'
  | 'brand_manager'
  | 'creator'
  | 'client_approver'
  | 'viewer';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: 'trial' | 'standard' | 'agency_pro' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  createdAt: Date;
  updatedAt: Date;
}
