import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. jit_access_requests
  await knex.schema.createTable('jit_access_requests', (table) => {
    table.string('id', 64).primary();
    table.string('requester_id', 64).notNullable().index();
    table.string('requester_email', 255).notNullable();
    table.string('target_role', 64).notNullable();
    table.string('elevation_tier', 32).notNullable().defaultTo('elevated_admin');
    table.string('justification', 512).notNullable();
    table.integer('requested_duration_minutes').notNullable().defaultTo(60);
    table.string('status', 32).notNullable().defaultTo('pending_approval').index();
    table.string('approver_id', 64).nullable();
    table.string('approver_email', 255).nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. ephemeral_credential_leases
  await knex.schema.createTable('ephemeral_credential_leases', (table) => {
    table.string('id', 64).primary();
    table.string('request_id', 64).notNullable().index();
    table.string('operator_email', 255).notNullable();
    table.string('elevation_tier', 32).notNullable().defaultTo('elevated_admin');
    table.string('token_signature', 255).notNullable();
    table.timestamp('issued_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.string('status', 32).notNullable().defaultTo('active').index();
    table.boolean('revocable').notNullable().defaultTo(true);
  });

  // 3. dual_authorization_rules
  await knex.schema.createTable('dual_authorization_rules', (table) => {
    table.string('id', 64).primary();
    table.string('action_name', 128).notNullable().unique();
    table.string('description', 255).notNullable();
    table.string('target_resource_type', 64).notNullable();
    table.integer('required_approvers').notNullable().defaultTo(2);
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. jit_audit_sessions
  await knex.schema.createTable('jit_audit_sessions', (table) => {
    table.string('id', 64).primary();
    table.string('lease_id', 64).notNullable().index();
    table.string('operator_email', 255).notNullable();
    table.string('action_performed', 128).notNullable();
    table.string('resource_affected', 255).notNullable();
    table.string('ip_address', 64).notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    table.string('signature', 255).notNullable();
  });

  // Pre-seed dual_authorization_rules
  await knex('dual_authorization_rules').insert([
    {
      id: 'rule-post-purge',
      action_name: 'production_post_purge',
      description: 'Purging production live published social posts',
      target_resource_type: 'post_variants',
      required_approvers: 2,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'rule-billing-override',
      action_name: 'billing_plan_override',
      description: 'Overriding SaaS subscription plans or billing grace limits',
      target_resource_type: 'billing',
      required_approvers: 2,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'rule-dr-failover',
      action_name: 'disaster_recovery_failover',
      description: 'Executing manual cross-region DR failover routing',
      target_resource_type: 'disaster_recovery',
      required_approvers: 2,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'rule-secret-rotation',
      action_name: 'master_secret_rotation',
      description: 'Rotating master KMS envelope encryption secrets',
      target_resource_type: 'secret_vault',
      required_approvers: 2,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
  ]);

  // Pre-seed jit_access_requests
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 45 * 60 * 1000);
  await knex('jit_access_requests').insert([
    {
      id: 'req-jit-001',
      requester_id: 'user-ops-lead-01',
      requester_email: 'ops-lead@socialforge.io',
      target_role: 'superadmin',
      elevation_tier: 'elevated_admin',
      justification: 'Investigating delayed webhook processing queue backlog',
      requested_duration_minutes: 60,
      status: 'approved',
      approver_id: 'user-sec-lead-01',
      approver_email: 'security-lead@socialforge.io',
      approved_at: new Date(now.getTime() - 15 * 60 * 1000),
      expires_at: expiresAt,
      created_at: new Date(now.getTime() - 20 * 60 * 1000),
    },
    {
      id: 'req-jit-002',
      requester_id: 'user-devops-02',
      requester_email: 'devops@socialforge.io',
      target_role: 'compliance_officer',
      elevation_tier: 'standard_ops',
      justification: 'Quarterly SOC2 evidence verification audit export',
      requested_duration_minutes: 120,
      status: 'pending_approval',
      approver_id: null,
      approver_email: null,
      approved_at: null,
      expires_at: null,
      created_at: new Date(now.getTime() - 5 * 60 * 1000),
    },
  ]);

  // Pre-seed ephemeral_credential_leases
  await knex('ephemeral_credential_leases').insert([
    {
      id: 'lease-jit-001',
      request_id: 'req-jit-001',
      operator_email: 'ops-lead@socialforge.io',
      elevation_tier: 'elevated_admin',
      token_signature: 'sig_hmac_sha256_d8923a10e8f00192',
      issued_at: new Date(now.getTime() - 15 * 60 * 1000),
      expires_at: expiresAt,
      status: 'active',
      revocable: true,
    },
  ]);

  // Pre-seed jit_audit_sessions
  await knex('jit_audit_sessions').insert([
    {
      id: 'sess-jit-001',
      lease_id: 'lease-jit-001',
      operator_email: 'ops-lead@socialforge.io',
      action_performed: 'INSPECT_DLQ_PAYLOADS',
      resource_affected: 'event_mesh_dead_letter_queue',
      ip_address: '10.0.4.12',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000),
      signature: 'sig_audit_9812739418afbc99',
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('jit_audit_sessions');
  await knex.schema.dropTableIfExists('dual_authorization_rules');
  await knex.schema.dropTableIfExists('ephemeral_credential_leases');
  await knex.schema.dropTableIfExists('jit_access_requests');
}
