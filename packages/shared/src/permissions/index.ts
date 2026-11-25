import { TenantRole } from '../types/tenant.js';

export type Permission =
  | 'manage_tenant'
  | 'manage_billing'
  | 'manage_team'
  | 'manage_connections'
  | 'manage_automations'
  | 'manage_templates'
  | 'run_agent'
  | 'create_post'
  | 'edit_post'
  | 'approve_post'
  | 'publish_post'
  | 'view_analytics'
  | 'view_reports';

export const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  owner: [
    'manage_tenant',
    'manage_billing',
    'manage_team',
    'manage_connections',
    'manage_automations',
    'manage_templates',
    'run_agent',
    'create_post',
    'edit_post',
    'approve_post',
    'publish_post',
    'view_analytics',
    'view_reports',
  ],
  admin: [
    'manage_tenant',
    'manage_billing',
    'manage_team',
    'manage_connections',
    'manage_automations',
    'manage_templates',
    'run_agent',
    'create_post',
    'edit_post',
    'approve_post',
    'publish_post',
    'view_analytics',
    'view_reports',
  ],
  agency_admin: [
    'manage_team',
    'manage_connections',
    'manage_automations',
    'manage_templates',
    'run_agent',
    'create_post',
    'edit_post',
    'approve_post',
    'publish_post',
    'view_analytics',
    'view_reports',
  ],
  editor: [
    'create_post',
    'edit_post',
    'manage_templates',
    'run_agent',
    'view_analytics',
  ],
  brand_manager: [
    'manage_connections',
    'manage_automations',
    'manage_templates',
    'run_agent',
    'create_post',
    'edit_post',
    'approve_post',
    'publish_post',
    'view_analytics',
    'view_reports',
  ],
  creator: [
    'create_post',
    'edit_post',
    'run_agent',
    'view_analytics',
  ],
  client_approver: [
    'approve_post',
    'view_reports',
  ],
  viewer: [
    'view_analytics',
    'view_reports',
  ],
};

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
