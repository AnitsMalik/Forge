import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. saga_workflow_definitions
  await knex.schema.createTable('saga_workflow_definitions', (table) => {
    table.string('id', 64).primary();
    table.string('workflow_name', 128).notNullable();
    table.string('workflow_type', 64).notNullable();
    table.text('description', 'mediumtext').notNullable();
    table.integer('total_steps_count').notNullable().defaultTo(0);
    table.string('failure_strategy', 64).notNullable().defaultTo('backward_compensation');
    table.text('steps_configuration', 'longtext').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. state_machine_instances
  await knex.schema.createTable('state_machine_instances', (table) => {
    table.string('id', 64).primary();
    table.string('workflow_definition_id', 64).notNullable().index();
    table.string('target_tenant_id', 64).notNullable().index();
    table.string('correlation_id', 128).notNullable().index();
    table.integer('current_step_index').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('active').index();
    table.json('input_payload').notNullable();
    table.json('state_payload').notNullable();
    table.text('error_details', 'mediumtext').nullable();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });

  // 3. workflow_step_executions
  await knex.schema.createTable('workflow_step_executions', (table) => {
    table.string('id', 64).primary();
    table.string('instance_id', 64).notNullable().index();
    table.integer('step_index').notNullable();
    table.string('step_name', 128).notNullable();
    table.string('status', 32).notNullable().defaultTo('pending').index();
    table.integer('attempt_count').notNullable().defaultTo(1);
    table.integer('duration_ms').notNullable().defaultTo(0);
    table.json('input_payload').notNullable();
    table.json('output_payload').notNullable();
    table.text('error_message', 'mediumtext').nullable();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });

  // 4. saga_compensating_transactions
  await knex.schema.createTable('saga_compensating_transactions', (table) => {
    table.string('id', 64).primary();
    table.string('instance_id', 64).notNullable().index();
    table.integer('step_index').notNullable();
    table.string('step_name', 128).notNullable();
    table.string('compensation_action', 255).notNullable();
    table.string('status', 32).notNullable().defaultTo('compensated').index();
    table.text('reason', 'mediumtext').notNullable();
    table.timestamp('executed_at').notNullable().defaultTo(knex.fn.now());
  });

  // Seed initial workflow definitions
  const omnichannelSteps = [
    { step_index: 0, step_name: 'Transcode Video & Media Assets', action_service: 'gpu-transcoding-mesh', action_endpoint: '/api/v1/gpu/transcode', compensation_endpoint: '/api/v1/gpu/cleanup-artifacts', timeout_seconds: 30, retry_attempts: 2 },
    { step_index: 1, step_name: 'AI Content & Guardrail Evaluation', action_service: 'neural-rag-mesh', action_endpoint: '/api/v1/rag/guardrail-verify', compensation_endpoint: '/api/v1/rag/invalidate-audit', timeout_seconds: 15, retry_attempts: 1 },
    { step_index: 2, step_name: 'Brand Governance & Compliance Clearance', action_service: 'compliance-locker', action_endpoint: '/api/v1/compliance/verify', compensation_endpoint: '/api/v1/compliance/revoke-signature', timeout_seconds: 20, retry_attempts: 1 },
    { step_index: 3, step_name: 'Multi-Platform Publication (Meta/X/LinkedIn)', action_service: 'social-connector-hub', action_endpoint: '/api/v1/connectors/dispatch-batch', compensation_endpoint: '/api/v1/connectors/rollback-publication', timeout_seconds: 45, retry_attempts: 3 },
    { step_index: 4, step_name: 'Outbound Webhook & Analytics Dispatch', action_service: 'event-mesh-router', action_endpoint: '/api/v1/events/publish-saga-end', compensation_endpoint: '/api/v1/events/emit-reversal-event', timeout_seconds: 15, retry_attempts: 2 }
  ];

  const onboardingSteps = [
    { step_index: 0, step_name: 'Provision Tenant Database Partition', action_service: 'database-partition-mesh', action_endpoint: '/api/v1/db/create-partition', compensation_endpoint: '/api/v1/db/drop-partition', timeout_seconds: 30, retry_attempts: 2 },
    { step_index: 1, step_name: 'Generate Tenant HSM Root DEK', action_service: 'hsm-broker', action_endpoint: '/api/v1/hsm/generate-dek', compensation_endpoint: '/api/v1/hsm/shred-dek', timeout_seconds: 10, retry_attempts: 1 },
    { step_index: 2, step_name: 'Provision Distributed S3 Bucket', action_service: 'object-storage-vault', action_endpoint: '/api/v1/storage/provision-bucket', compensation_endpoint: '/api/v1/storage/deprovision-bucket', timeout_seconds: 25, retry_attempts: 2 },
    { step_index: 3, step_name: 'Configure SAML 2.0 SSO Entity Id', action_service: 'sso-federation-hub', action_endpoint: '/api/v1/sso/register-realm', compensation_endpoint: '/api/v1/sso/deregister-realm', timeout_seconds: 15, retry_attempts: 1 }
  ];

  const billingUpgradeSteps = [
    { step_index: 0, step_name: 'Authorize Stripe Payment Hold', action_service: 'stripe-billing-gateway', action_endpoint: '/api/v1/billing/hold-funds', compensation_endpoint: '/api/v1/billing/release-hold', timeout_seconds: 20, retry_attempts: 2 },
    { step_index: 1, step_name: 'Recalculate Workspace Quotas & Entitlements', action_service: 'entitlement-manager', action_endpoint: '/api/v1/entitlements/upgrade-limits', compensation_endpoint: '/api/v1/entitlements/restore-limits', timeout_seconds: 10, retry_attempts: 1 },
    { step_index: 2, step_name: 'Reconfigure API Gateway Token Bucket', action_service: 'api-gateway-mesh', action_endpoint: '/api/v1/gateway/resize-bucket', compensation_endpoint: '/api/v1/gateway/revert-bucket', timeout_seconds: 15, retry_attempts: 2 },
    { step_index: 3, step_name: 'Capture Payment & Issue Invoice Receipt', action_service: 'stripe-billing-gateway', action_endpoint: '/api/v1/billing/capture-payment', compensation_endpoint: '/api/v1/billing/refund-charge', timeout_seconds: 25, retry_attempts: 2 }
  ];

  await knex('saga_workflow_definitions').insert([
    {
      id: 'wf-def-omnichannel-campaign-saga',
      workflow_name: 'Omnichannel Campaign Asset Orchestration Saga',
      workflow_type: 'campaign_publishing',
      description: 'End-to-end transactional orchestration across generative AI rendering, moderation validation, multi-social platform publication, and analytics webhook registration.',
      total_steps_count: 5,
      failure_strategy: 'backward_compensation',
      steps_configuration: JSON.stringify(omnichannelSteps),
      is_active: true,
      created_at: knex.fn.now()
    },
    {
      id: 'wf-def-tenant-onboarding-pipeline',
      workflow_name: 'Enterprise Tenant Zero-Trust Provisioning Pipeline',
      workflow_type: 'tenant_provisioning',
      description: 'Autonomous state machine provisioning isolated HSM data encryption keys, SAML 2.0 IdP mappings, dedicated S3 storage buckets, and RBAC security bounds.',
      total_steps_count: 4,
      failure_strategy: 'backward_compensation',
      steps_configuration: JSON.stringify(onboardingSteps),
      is_active: true,
      created_at: knex.fn.now()
    },
    {
      id: 'wf-def-billing-tier-upgrade-saga',
      workflow_name: 'Commercial Subscription Tier Upgrade & Quota Expansion',
      workflow_type: 'billing_orchestration',
      description: 'Distributed 2PC/Saga workflow ensuring stripe payment reservation, entitlement adjustments, dynamic rate-limiting bucket sizing, and CRM sync.',
      total_steps_count: 4,
      failure_strategy: 'backward_compensation',
      steps_configuration: JSON.stringify(billingUpgradeSteps),
      is_active: true,
      created_at: knex.fn.now()
    }
  ]);

  // Seed sample state machine instances
  await knex('state_machine_instances').insert([
    {
      id: 'wf-inst-omnichannel-001',
      workflow_definition_id: 'wf-def-omnichannel-campaign-saga',
      target_tenant_id: 'tenant-enterprise-global',
      correlation_id: 'corr-saga-live-7721',
      current_step_index: 5,
      status: 'completed',
      input_payload: JSON.stringify({ campaign_id: 'cmp-2026-q4-launch', channel_targets: ['meta', 'linkedin', 'x'] }),
      state_payload: JSON.stringify({ rendered_asset_id: 'ast-video-4k-91', moderation_passed: true, published_post_ids: ['post-meta-881', 'post-x-221'] }),
      error_details: null,
      started_at: new Date(Date.now() - 3600000),
      completed_at: new Date(Date.now() - 3512000)
    },
    {
      id: 'wf-inst-tenant-provision-002',
      workflow_definition_id: 'wf-def-tenant-onboarding-pipeline',
      target_tenant_id: 'tenant-apac-fintech',
      correlation_id: 'corr-saga-onboard-9943',
      current_step_index: 2,
      status: 'active',
      input_payload: JSON.stringify({ company_name: 'APAC FinTech Solutions', plan: 'enterprise_plus', region: 'ap-southeast-1' }),
      state_payload: JSON.stringify({ partition_created: true, hsm_dek_id: 'dek-hsm-90412-active' }),
      error_details: null,
      started_at: new Date(Date.now() - 120000),
      completed_at: null
    },
    {
      id: 'wf-inst-billing-upgrade-003',
      workflow_definition_id: 'wf-def-billing-tier-upgrade-saga',
      target_tenant_id: 'tenant-emea-retail',
      correlation_id: 'corr-saga-billing-fail-1082',
      current_step_index: 2,
      status: 'compensated',
      input_payload: JSON.stringify({ target_tier: 'enterprise_growth', billing_interval: 'annual', card_token: 'tok_visa_emea_test' }),
      state_payload: JSON.stringify({ stripe_auth_hold_id: 'ch_hold_88291a', compensation_completed: true }),
      error_details: 'Gateway token bucket provisioning timed out after 15000ms',
      started_at: new Date(Date.now() - 86400000),
      completed_at: new Date(Date.now() - 86370000)
    }
  ]);

  // Seed sample step executions
  await knex('workflow_step_executions').insert([
    // For Instance 1 (Completed)
    {
      id: 'wse-omni-001-0',
      instance_id: 'wf-inst-omnichannel-001',
      step_index: 0,
      step_name: 'Transcode Video & Media Assets',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 18420,
      input_payload: JSON.stringify({ raw_media_uri: 's3://media/raw/vid_881.mov' }),
      output_payload: JSON.stringify({ transcoded_uri: 's3://media/transcoded/vid_881_1080p.mp4' }),
      error_message: null,
      started_at: new Date(Date.now() - 3600000),
      completed_at: new Date(Date.now() - 3581580)
    },
    {
      id: 'wse-omni-001-1',
      instance_id: 'wf-inst-omnichannel-001',
      step_index: 1,
      step_name: 'AI Content & Guardrail Evaluation',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 3200,
      input_payload: JSON.stringify({ prompt: 'Q4 Product Showcase campaign caption' }),
      output_payload: JSON.stringify({ toxic_score: 0.01, passed: true }),
      error_message: null,
      started_at: new Date(Date.now() - 3581500),
      completed_at: new Date(Date.now() - 3578300)
    },
    {
      id: 'wse-omni-001-2',
      instance_id: 'wf-inst-omnichannel-001',
      step_index: 2,
      step_name: 'Brand Governance & Compliance Clearance',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 5400,
      input_payload: JSON.stringify({ policy_pack: 'soc2_and_gdpr' }),
      output_payload: JSON.stringify({ compliance_stamp_hash: 'sha256-a9f82bc' }),
      error_message: null,
      started_at: new Date(Date.now() - 3578200),
      completed_at: new Date(Date.now() - 3572800)
    },
    {
      id: 'wse-omni-001-3',
      instance_id: 'wf-inst-omnichannel-001',
      step_index: 3,
      step_name: 'Multi-Platform Publication (Meta/X/LinkedIn)',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 32000,
      input_payload: JSON.stringify({ channels: ['meta', 'x', 'linkedin'] }),
      output_payload: JSON.stringify({ meta_post_id: 'post-meta-881', x_post_id: 'post-x-221' }),
      error_message: null,
      started_at: new Date(Date.now() - 3572700),
      completed_at: new Date(Date.now() - 3540700)
    },
    {
      id: 'wse-omni-001-4',
      instance_id: 'wf-inst-omnichannel-001',
      step_index: 4,
      step_name: 'Outbound Webhook & Analytics Dispatch',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 28700,
      input_payload: JSON.stringify({ event_type: 'CAMPAIGN_PUBLISHED' }),
      output_payload: JSON.stringify({ dispatched_events: 3 }),
      error_message: null,
      started_at: new Date(Date.now() - 3540600),
      completed_at: new Date(Date.now() - 3511900)
    },
    // For Instance 2 (Active)
    {
      id: 'wse-tenant-002-0',
      instance_id: 'wf-inst-tenant-provision-002',
      step_index: 0,
      step_name: 'Provision Tenant Database Partition',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 14200,
      input_payload: JSON.stringify({ tenant_id: 'tenant-apac-fintech' }),
      output_payload: JSON.stringify({ partition_schema: 'part_apac_fintech_v1' }),
      error_message: null,
      started_at: new Date(Date.now() - 120000),
      completed_at: new Date(Date.now() - 105800)
    },
    {
      id: 'wse-tenant-002-1',
      instance_id: 'wf-inst-tenant-provision-002',
      step_index: 1,
      step_name: 'Generate Tenant HSM Root DEK',
      status: 'succeeded',
      attempt_count: 1,
      duration_ms: 4800,
      input_payload: JSON.stringify({ hsm_slot: 'slot-primary-01' }),
      output_payload: JSON.stringify({ dek_id: 'dek-hsm-90412-active' }),
      error_message: null,
      started_at: new Date(Date.now() - 105700),
      completed_at: new Date(Date.now() - 100900)
    },
    {
      id: 'wse-tenant-002-2',
      instance_id: 'wf-inst-tenant-provision-002',
      step_index: 2,
      step_name: 'Provision Distributed S3 Bucket',
      status: 'executing',
      attempt_count: 1,
      duration_ms: 0,
      input_payload: JSON.stringify({ bucket_name: 'tenant-apac-fintech-vault' }),
      output_payload: JSON.stringify({}),
      error_message: null,
      started_at: new Date(Date.now() - 100800),
      completed_at: null
    },
    // For Instance 3 (Compensated)
    {
      id: 'wse-billing-003-0',
      instance_id: 'wf-inst-billing-upgrade-003',
      step_index: 0,
      step_name: 'Authorize Stripe Payment Hold',
      status: 'compensated',
      attempt_count: 1,
      duration_ms: 8200,
      input_payload: JSON.stringify({ amount_cents: 29900 }),
      output_payload: JSON.stringify({ hold_id: 'ch_hold_88291a' }),
      error_message: null,
      started_at: new Date(Date.now() - 86400000),
      completed_at: new Date(Date.now() - 86391800)
    },
    {
      id: 'wse-billing-003-1',
      instance_id: 'wf-inst-billing-upgrade-003',
      step_index: 1,
      step_name: 'Recalculate Workspace Quotas & Entitlements',
      status: 'compensated',
      attempt_count: 1,
      duration_ms: 3100,
      input_payload: JSON.stringify({ max_posts: 10000 }),
      output_payload: JSON.stringify({ quota_updated: true }),
      error_message: null,
      started_at: new Date(Date.now() - 86391700),
      completed_at: new Date(Date.now() - 86388600)
    },
    {
      id: 'wse-billing-003-2',
      instance_id: 'wf-inst-billing-upgrade-003',
      step_index: 2,
      step_name: 'Reconfigure API Gateway Token Bucket',
      status: 'failed',
      attempt_count: 3,
      duration_ms: 15000,
      input_payload: JSON.stringify({ token_burst: 200 }),
      output_payload: JSON.stringify({}),
      error_message: 'Gateway token bucket provisioning timed out after 15000ms',
      started_at: new Date(Date.now() - 86388500),
      completed_at: new Date(Date.now() - 86373500)
    }
  ]);

  // Seed sample compensating transactions
  await knex('saga_compensating_transactions').insert([
    {
      id: 'sct-comp-003-1',
      instance_id: 'wf-inst-billing-upgrade-003',
      step_index: 1,
      step_name: 'Recalculate Workspace Quotas & Entitlements',
      compensation_action: 'Restore workspace entitlement quotas to previous tier limits',
      status: 'compensated',
      reason: 'Saga backward rollback triggered due to step 2 failure',
      executed_at: new Date(Date.now() - 86372000)
    },
    {
      id: 'sct-comp-003-0',
      instance_id: 'wf-inst-billing-upgrade-003',
      step_index: 0,
      step_name: 'Authorize Stripe Payment Hold',
      compensation_action: 'Release authorized Stripe payment hold ch_hold_88291a',
      status: 'compensated',
      reason: 'Saga backward rollback triggered due to step 2 failure',
      executed_at: new Date(Date.now() - 86370000)
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('saga_compensating_transactions');
  await knex.schema.dropTableIfExists('workflow_step_executions');
  await knex.schema.dropTableIfExists('state_machine_instances');
  await knex.schema.dropTableIfExists('saga_workflow_definitions');
}
