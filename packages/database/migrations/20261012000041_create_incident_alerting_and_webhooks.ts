import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // 1. INCIDENT_ALERT_CHANNELS
  const hasChannels = await knex.schema.hasTable('incident_alert_channels');
  if (!hasChannels) {
    await knex.schema.createTable('incident_alert_channels', (table) => {
      table.uuid('id').primary();
      table.string('name', 128).notNullable();
      table.string('channel_type', 32).notNullable(); // 'slack' | 'pagerduty' | 'email' | 'webhook'
      table.text('target').notNullable(); // Webhook URL, PagerDuty routing key, or email address
      table.text('secret_token').nullable(); // HMAC secret for generic webhooks
      table.boolean('is_active').notNullable().defaultTo(true);
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['channel_type'], 'idx_iac_type');
      table.index(['is_active'], 'idx_iac_active');
    });

    // Seed default channels
    await knex('incident_alert_channels').insert([
      {
        id: '10000000-0000-0000-0000-000000000001',
        name: 'DevOps Slack Alerts #alerts-ops',
        channel_type: 'slack',
        target: 'https://example.com/services/T00000000/B00000000/REDACTED_DEMO_SLACK_WEBHOOK_KEY',
        is_active: true,
        metadata: JSON.stringify({ channel: '#alerts-ops', color: '#ef4444' }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        name: 'PagerDuty High-Urgency Bridge',
        channel_type: 'pagerduty',
        target: 'pd-service-key-998877665544332211',
        is_active: true,
        metadata: JSON.stringify({ severityMapping: 'critical' }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        name: 'Platform Engineering Ops Email',
        channel_type: 'email',
        target: 'ops-alerts@socialforge.io,security@socialforge.io',
        is_active: true,
        metadata: JSON.stringify({ replyTo: 'no-reply@socialforge.io' }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  }

  // 2. INCIDENT_ALERT_RULES
  const hasRules = await knex.schema.hasTable('incident_alert_rules');
  if (!hasRules) {
    await knex.schema.createTable('incident_alert_rules', (table) => {
      table.uuid('id').primary();
      table.string('name', 128).notNullable();
      table.string('condition_type', 64).notNullable(); // 'rate_limit_spike' | 'dlq_threshold' | 'provider_outage' | 'worker_queue_backlog'
      table.integer('threshold_value').notNullable().defaultTo(1);
      table.integer('time_window_minutes').notNullable().defaultTo(5);
      table.integer('cooldown_minutes').notNullable().defaultTo(15);
      table.string('severity', 32).notNullable().defaultTo('high'); // 'low' | 'medium' | 'high' | 'critical'
      table.json('channel_ids').notNullable(); // Array of channel UUID strings
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('last_triggered_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['condition_type'], 'idx_iar_condition');
      table.index(['severity'], 'idx_iar_severity');
      table.index(['is_active'], 'idx_iar_active');
    });

    // Seed standard incident rules
    await knex('incident_alert_rules').insert([
      {
        id: '20000000-0000-0000-0000-000000000001',
        name: 'Provider Rate-Limit Spike (HTTP 429)',
        condition_type: 'rate_limit_spike',
        threshold_value: 3,
        time_window_minutes: 5,
        cooldown_minutes: 15,
        severity: 'high',
        channel_ids: JSON.stringify([
          '10000000-0000-0000-0000-000000000001',
          '10000000-0000-0000-0000-000000000003',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        name: 'Dead-Letter Queue (DLQ) Critical Ingestion',
        condition_type: 'dlq_threshold',
        threshold_value: 1,
        time_window_minutes: 1,
        cooldown_minutes: 10,
        severity: 'critical',
        channel_ids: JSON.stringify([
          '10000000-0000-0000-0000-000000000001',
          '10000000-0000-0000-0000-000000000002',
          '10000000-0000-0000-0000-000000000003',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        name: 'Provider Outage / SLA Degradation (<99%)',
        condition_type: 'provider_outage',
        threshold_value: 1,
        time_window_minutes: 5,
        cooldown_minutes: 30,
        severity: 'critical',
        channel_ids: JSON.stringify([
          '10000000-0000-0000-0000-000000000001',
          '10000000-0000-0000-0000-000000000002',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '20000000-0000-0000-0000-000000000004',
        name: 'Publishing Worker Queue Backlog Surge',
        condition_type: 'worker_queue_backlog',
        threshold_value: 20,
        time_window_minutes: 10,
        cooldown_minutes: 20,
        severity: 'medium',
        channel_ids: JSON.stringify([
          '10000000-0000-0000-0000-000000000001',
        ]),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  }

  // 3. INCIDENT_ALERT_EVENTS
  const hasEvents = await knex.schema.hasTable('incident_alert_events');
  if (!hasEvents) {
    await knex.schema.createTable('incident_alert_events', (table) => {
      table.uuid('id').primary();
      table.uuid('rule_id').nullable().references('id').inTable('incident_alert_rules').onDelete('SET NULL');
      table.string('title', 255).notNullable();
      table.string('severity', 32).notNullable(); // 'low' | 'medium' | 'high' | 'critical'
      table.string('condition_type', 64).notNullable();
      table.string('affected_provider', 64).nullable();
      table.uuid('affected_tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL');
      table.json('details').nullable();
      table.json('dispatched_channels').notNullable(); // Array of delivery statuses
      table.string('status', 32).notNullable().defaultTo('triggered'); // 'triggered' | 'acknowledged' | 'resolved'
      table.uuid('acknowledged_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('acknowledged_at').nullable();
      table.uuid('resolved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('resolved_at').nullable();
      table.text('resolution_note').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['status'], 'idx_iae_status');
      table.index(['severity'], 'idx_iae_severity');
      table.index(['condition_type'], 'idx_iae_condition');
      table.index(['affected_provider'], 'idx_iae_provider');
      table.index(['created_at'], 'idx_iae_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('incident_alert_events');
  await knex.schema.dropTableIfExists('incident_alert_rules');
  await knex.schema.dropTableIfExists('incident_alert_channels');
}
