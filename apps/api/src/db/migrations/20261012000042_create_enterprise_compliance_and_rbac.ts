import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Compliance Data Export Jobs
  const hasExportJobs = await knex.schema.hasTable('compliance_export_jobs');
  if (!hasExportJobs) {
    await knex.schema.createTable('compliance_export_jobs', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().index();
      table.string('requester_id', 36).notNullable();
      table.string('requester_email', 255).notNullable();
      table.enum('export_type', ['full_tenant', 'gdpr_sar', 'soc2_audit', 'analytics_raw']).notNullable();
      table.enum('status', ['pending', 'processing', 'completed', 'failed', 'expired']).defaultTo('pending').index();
      table.enum('format', ['zip_json', 'zip_csv', 'json']).defaultTo('zip_json');
      table.text('artifact_url').nullable();
      table.string('artifact_sha256', 64).nullable();
      table.bigInteger('file_size_bytes').nullable();
      table.integer('record_count').defaultTo(0);
      table.timestamp('expires_at').nullable();
      table.text('error_message').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
    });
  }

  // 2. Data Retention Policies
  const hasRetentionPolicies = await knex.schema.hasTable('compliance_retention_policies');
  if (!hasRetentionPolicies) {
    await knex.schema.createTable('compliance_retention_policies', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().index();
      table.string('data_category', 64).notNullable(); // audit_logs, analytics_telemetry, published_posts, media_assets, compliance_exports
      table.integer('retention_days').notNullable();
      table.boolean('auto_purge_enabled').defaultTo(false);
      table.integer('grace_period_days').defaultTo(14);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 3. Compliance Purge Certificates (Tamper-Evident Right to Erasure Proof)
  const hasPurgeCerts = await knex.schema.hasTable('compliance_purge_certificates');
  if (!hasPurgeCerts) {
    await knex.schema.createTable('compliance_purge_certificates', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().index();
      table.string('policy_id', 36).nullable();
      table.string('data_category', 64).notNullable();
      table.integer('records_purged').notNullable();
      table.string('requester_email', 255).notNullable();
      table.string('certificate_signature', 128).notNullable(); // HMAC SHA-256 seal
      table.timestamp('purge_timestamp').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 4. Granular Custom Roles & Permissions Matrix
  const hasCustomRoles = await knex.schema.hasTable('custom_roles_and_permissions');
  if (!hasCustomRoles) {
    await knex.schema.createTable('custom_roles_and_permissions', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().index(); // null for system template roles
      table.string('role_slug', 64).notNullable().unique();
      table.string('role_name', 128).notNullable();
      table.text('description').nullable();
      table.json('permissions').notNullable(); // list of permission slugs
      table.boolean('is_system').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 5. Audit Trail Integrity Checkpoints (Tamper-evident Merkle Checkpoints)
  const hasCheckpoints = await knex.schema.hasTable('audit_trail_integrity_checkpoints');
  if (!hasCheckpoints) {
    await knex.schema.createTable('audit_trail_integrity_checkpoints', (table) => {
      table.string('id', 36).primary();
      table.string('audit_table', 64).notNullable().index();
      table.string('last_audit_id', 36).notNullable();
      table.bigInteger('record_count').notNullable();
      table.string('merkle_root_hash', 64).notNullable();
      table.string('signature', 128).notNullable();
      table.timestamp('verified_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Seed default system roles and permission sets
  const now = new Date();
  const seedRoles = [
    {
      id: '20000000-0000-0000-0000-000000000001',
      tenant_id: null,
      role_slug: 'compliance_officer',
      role_name: 'Compliance Officer',
      description: 'Authorized legal & data compliance role with audit verification and SAR export privileges.',
      permissions: JSON.stringify([
        'audit:read',
        'audit:verify',
        'compliance:export',
        'compliance:purge',
        'tenants:read',
      ]),
      is_system: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      tenant_id: null,
      role_slug: 'external_auditor',
      role_name: 'External Auditor',
      description: 'Time-bound read-only inspection access for SOC2/ISO compliance auditors.',
      permissions: JSON.stringify([
        'audit:read',
        'audit:verify',
        'tenants:read',
        'reports:read',
      ]),
      is_system: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      tenant_id: null,
      role_slug: 'billing_manager',
      role_name: 'Billing & Procurement Manager',
      description: 'Financial controls, subscriptions, plan upgrades, and invoice downloads.',
      permissions: JSON.stringify([
        'billing:manage',
        'invoices:download',
        'usage:read',
        'tenants:read',
      ]),
      is_system: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      tenant_id: null,
      role_slug: 'brand_director',
      role_name: 'Brand & Creative Director',
      description: 'Brand kits, template approvals, campaign orchestration, and publishing approvals.',
      permissions: JSON.stringify([
        'brand:manage',
        'templates:manage',
        'campaigns:orchestrate',
        'posts:publish',
        'posts:approve',
      ]),
      is_system: true,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const role of seedRoles) {
    const existing = await knex('custom_roles_and_permissions').where({ role_slug: role.role_slug }).first();
    if (!existing) {
      await knex('custom_roles_and_permissions').insert(role);
    }
  }

  // Seed default Global Retention Policies
  const seedPolicies = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      tenant_id: null,
      data_category: 'audit_logs',
      retention_days: 730, // 2 years for SOC2 / ISO compliance
      auto_purge_enabled: false,
      grace_period_days: 30,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      tenant_id: null,
      data_category: 'analytics_telemetry',
      retention_days: 365, // 1 year of granular telemetry
      auto_purge_enabled: false,
      grace_period_days: 14,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      tenant_id: null,
      data_category: 'compliance_exports',
      retention_days: 7, // 7 days for generated export bundles
      auto_purge_enabled: true,
      grace_period_days: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const policy of seedPolicies) {
    const existing = await knex('compliance_retention_policies')
      .where({ data_category: policy.data_category, tenant_id: null })
      .first();
    if (!existing) {
      await knex('compliance_retention_policies').insert(policy);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_trail_integrity_checkpoints');
  await knex.schema.dropTableIfExists('custom_roles_and_permissions');
  await knex.schema.dropTableIfExists('compliance_purge_certificates');
  await knex.schema.dropTableIfExists('compliance_retention_policies');
  await knex.schema.dropTableIfExists('compliance_export_jobs');
}
