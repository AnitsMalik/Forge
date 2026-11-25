import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Check & Alter custom_roles_and_permissions to support inheritance and tenant-scoping
  const hasCustomRoles = await knex.schema.hasTable('custom_roles_and_permissions');
  if (hasCustomRoles) {
    const hasParentRole = await knex.schema.hasColumn('custom_roles_and_permissions', 'parent_role_slug');
    if (!hasParentRole) {
      await knex.schema.alterTable('custom_roles_and_permissions', (table) => {
        table.string('parent_role_slug', 64).nullable().after('permissions');
      });
    }
  }

  // 2. Table: tenant_user_custom_roles
  const hasUserRoles = await knex.schema.hasTable('tenant_user_custom_roles');
  if (!hasUserRoles) {
    await knex.schema.createTable('tenant_user_custom_roles', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().index();
      table.string('user_id', 36).notNullable().index();
      table.string('role_id', 36).notNullable().index();
      table.string('assigned_by', 36).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'user_id', 'role_id'], 'uq_tenant_user_role');
    });
  }

  // 3. Table: tenant_user_permission_overrides
  const hasOverrides = await knex.schema.hasTable('tenant_user_permission_overrides');
  if (!hasOverrides) {
    await knex.schema.createTable('tenant_user_permission_overrides', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().index();
      table.string('user_id', 36).notNullable().index();
      table.string('permission_slug', 64).notNullable();
      table.enum('effect', ['allow', 'deny']).notNullable().defaultTo('allow');
      table.string('reason', 255).nullable();
      table.string('created_by', 36).nullable();
      table.timestamp('expires_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'user_id', 'permission_slug'], 'uq_user_perm_override');
    });
  }

  // 4. Seed standard enterprise system roles
  const now = new Date();
  const additionalSystemRoles = [
    {
      id: '20000000-0000-0000-0000-000000000005',
      tenant_id: null,
      role_slug: 'security_lead',
      role_name: 'Enterprise Security Lead',
      description: 'Comprehensive cybersecurity controls, SIEM exports, SSO federation, SCIM sync, and DLP policy management.',
      permissions: JSON.stringify([
        'siem:manage',
        'siem:read',
        'dlp:manage',
        'dlp:read',
        'dlp:quarantine_review',
        'sso:manage',
        'sso:read',
        'scim:manage',
        'scim:read',
        'audit:read',
        'audit:verify',
      ]),
      parent_role_slug: null,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000006',
      tenant_id: null,
      role_slug: 'content_moderator',
      role_name: 'Content Policy & DLP Moderator',
      description: 'Reviews quarantined drafts, inspects sensitive content detections, and approves sanitized content releases.',
      permissions: JSON.stringify([
        'dlp:read',
        'dlp:quarantine_review',
        'posts:read',
        'posts:approve',
        'audit:read',
      ]),
      parent_role_slug: null,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000007',
      tenant_id: null,
      role_slug: 'growth_analyst',
      role_name: 'Growth & Analytics Lead',
      description: 'Read-only business intelligence analytics, campaign attribution insights, and exportable data dashboards.',
      permissions: JSON.stringify([
        'analytics:read',
        'analytics:export',
        'reports:read',
        'campaigns:read',
      ]),
      parent_role_slug: null,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const role of additionalSystemRoles) {
    const existing = await knex('custom_roles_and_permissions').where({ role_slug: role.role_slug }).first();
    if (!existing) {
      await knex('custom_roles_and_permissions').insert(role);
    }
  }

  // Pre-seed a sample tenant custom role with inheritance for testing
  const demoCustomRole = {
    id: '30000000-0000-0000-0000-000000000001',
    tenant_id: '0842e532-e6cf-4cc1-b8ce-4c4546a10a97', // Nexus Creative Studio
    role_slug: 'junior_editor_nexus',
    role_name: 'Junior Content Editor',
    description: 'Draft authoring and template usage under Brand Director supervision',
    permissions: JSON.stringify(['posts:create', 'posts:edit', 'templates:read']),
    parent_role_slug: null,
    is_system: 0,
    created_at: now,
    updated_at: now,
  };

  const existingDemo = await knex('custom_roles_and_permissions').where({ role_slug: demoCustomRole.role_slug }).first();
  if (!existingDemo) {
    await knex('custom_roles_and_permissions').insert(demoCustomRole);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenant_user_permission_overrides');
  await knex.schema.dropTableIfExists('tenant_user_custom_roles');
  await knex('custom_roles_and_permissions')
    .whereIn('role_slug', ['security_lead', 'content_moderator', 'growth_analyst', 'junior_editor_nexus'])
    .delete();
}
