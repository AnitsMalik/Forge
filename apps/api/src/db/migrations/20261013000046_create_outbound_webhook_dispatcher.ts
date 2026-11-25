import { Knex } from 'knex';
import { encryptSecret } from '../../services/cryptoVault.js';

export async function up(knex: Knex): Promise<void> {
  // 1. outbound_webhook_endpoints
  const hasEndpoints = await knex.schema.hasTable('outbound_webhook_endpoints');
  if (!hasEndpoints) {
    await knex.schema.createTable('outbound_webhook_endpoints', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).nullable().index();
      table.string('name', 255).notNullable();
      table.string('url', 1024).notNullable();
      table.text('secret').notNullable(); // AES-256-GCM encrypted
      table.string('secret_last4', 8).notNullable();
      table.json('events').notNullable(); // array of subscribed event types
      table.enu('status', ['active', 'paused', 'failed_disabled'])
        .notNullable()
        .defaultTo('active');
      table.integer('failure_count').notNullable().defaultTo(0);
      table.timestamp('last_delivery_at').nullable();
      table.integer('last_status_code').nullable();
      table.json('metadata').nullable();
      table.string('created_by', 64).notNullable().defaultTo('superadmin');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed initial enterprise webhook endpoints
    const seedSecret1 = 'whsec_prod_live_8f3a9e2c4b1d70e5';
    const seedSecret2 = 'whsec_stg_relay_9c8b7a6d5e4f3210';
    const encrypted1 = encryptSecret(seedSecret1);
    const encrypted2 = encryptSecret(seedSecret2);

    await knex('outbound_webhook_endpoints').insert([
      {
        id: 'whk-prod-enterprise-siem-01',
        tenant_id: null,
        name: 'Acme Corp Enterprise SIEM / Security Hub',
        url: 'https://security.acme-corp.internal/api/v1/socialforge-events',
        secret: encrypted1,
        secret_last4: seedSecret1.slice(-4),
        events: JSON.stringify([
          'post.published',
          'post.failed',
          'approval.requested',
          'incident.alert',
          'backup.completed',
          'billing.invoice_paid',
        ]),
        status: 'active',
        failure_count: 0,
        last_delivery_at: new Date(),
        last_status_code: 200,
        metadata: JSON.stringify({
          environment: 'production',
          tlsVerify: true,
          retryPolicy: 'exponential_backoff_4x',
        }),
        created_by: 'system_bootstrap',
      },
      {
        id: 'whk-staging-datadog-relay-02',
        tenant_id: null,
        name: 'Datadog Ops Event Ingestion Hub',
        url: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
        secret: encrypted2,
        secret_last4: seedSecret2.slice(-4),
        events: JSON.stringify(['incident.alert', 'post.failed']),
        status: 'active',
        failure_count: 0,
        last_delivery_at: new Date(Date.now() - 3600000),
        last_status_code: 202,
        metadata: JSON.stringify({
          environment: 'staging',
          tlsVerify: true,
        }),
        created_by: 'system_bootstrap',
      },
    ]);
  }

  // 2. outbound_webhook_deliveries
  const hasDeliveries = await knex.schema.hasTable('outbound_webhook_deliveries');
  if (!hasDeliveries) {
    await knex.schema.createTable('outbound_webhook_deliveries', (table) => {
      table.string('id', 64).primary();
      table.string('endpoint_id', 64).notNullable().index();
      table.string('tenant_id', 64).nullable().index();
      table.string('event_type', 64).notNullable().index();
      table.json('payload').notNullable();
      table.string('signature', 255).notNullable();
      table.enu('status', ['pending', 'delivered', 'failed', 'retrying'])
        .notNullable()
        .defaultTo('pending');
      table.integer('status_code').nullable();
      table.integer('attempt_count').notNullable().defaultTo(1);
      table.integer('max_attempts').notNullable().defaultTo(4);
      table.timestamp('next_retry_at').nullable();
      table.integer('request_duration_ms').nullable();
      table.text('response_body').nullable();
      table.text('error_message').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed sample delivery log for initial telemetry
    const now = new Date();
    await knex('outbound_webhook_deliveries').insert([
      {
        id: 'del-seed-001',
        endpoint_id: 'whk-prod-enterprise-siem-01',
        tenant_id: null,
        event_type: 'incident.alert',
        payload: JSON.stringify({
          event: 'incident.alert',
          timestamp: now.toISOString(),
          data: {
            incidentId: 'inc-sample-001',
            severity: 'sev2_degraded',
            title: 'SLA Latency Warning on Meta Graph Node',
          },
        }),
        signature: 't=1791811626,v1=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        status: 'delivered',
        status_code: 200,
        attempt_count: 1,
        max_attempts: 4,
        next_retry_at: null,
        request_duration_ms: 142,
        response_body: JSON.stringify({ received: true, event_id: 'ack-88123' }),
        error_message: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('outbound_webhook_deliveries');
  await knex.schema.dropTableIfExists('outbound_webhook_endpoints');
}
