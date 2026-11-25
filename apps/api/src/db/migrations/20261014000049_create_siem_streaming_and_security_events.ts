import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. siem_destinations
  const hasDestinations = await knex.schema.hasTable('siem_destinations');
  if (!hasDestinations) {
    await knex.schema.createTable('siem_destinations', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).nullable().index();
      table.string('name', 255).notNullable();
      table.string('destination_type', 32).notNullable(); // splunk_hec, datadog_logs, syslog_rfc5424, elastic_ecs, generic_webhook
      table.string('payload_format', 32).notNullable(); // json_ecs, cef, splunk_event, rfc5424_syslog, datadog_json
      table.string('endpoint_url', 1024).notNullable();
      table.text('encrypted_auth_secret').notNullable();
      table.string('secret_prefix', 32).notNullable();
      table.json('categories').notNullable(); // ['audit', 'auth', 'compliance', 'security', 'publishing', 'system']
      table.string('min_severity', 16).notNullable().defaultTo('info');
      table.integer('batch_size').notNullable().defaultTo(50);
      table.integer('rate_limit_per_min').notNullable().defaultTo(1000);
      table.enu('status', ['active', 'paused', 'degraded', 'failed']).notNullable().defaultTo('active');
      table.bigInteger('total_events_delivered').defaultTo(0);
      table.bigInteger('total_events_failed').defaultTo(0);
      table.timestamp('last_success_at').nullable();
      table.timestamp('last_failure_at').nullable();
      table.text('last_error_message').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Pre-seed enterprise SIEM destinations
    await knex('siem_destinations').insert([
      {
        id: 'siem-dest-splunk-prod01',
        tenant_id: null,
        name: 'Enterprise SOC Splunk HEC Stream',
        destination_type: 'splunk_hec',
        payload_format: 'splunk_event',
        endpoint_url: 'https://http-inputs-splunk.internal.soc.corp/services/collector/event',
        encrypted_auth_secret: 'vault:aes256gcm:mocked_splunk_hec_secret_token_abcdef123456',
        secret_prefix: 'Splunk-HEC:****3456',
        categories: JSON.stringify(['audit', 'auth', 'compliance', 'security']),
        min_severity: 'info',
        batch_size: 50,
        rate_limit_per_min: 2000,
        status: 'active',
        total_events_delivered: 12480,
        total_events_failed: 0,
        last_success_at: knex.fn.now(),
        last_failure_at: null,
        last_error_message: null,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
      {
        id: 'siem-dest-datadog-sec02',
        tenant_id: null,
        name: 'Datadog Cloud SIEM & Security Log Ingest',
        destination_type: 'datadog_logs',
        payload_format: 'datadog_json',
        endpoint_url: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
        encrypted_auth_secret: 'vault:aes256gcm:mocked_datadog_api_key_778899aabbcc',
        secret_prefix: 'DD-API-Key:****bbcc',
        categories: JSON.stringify(['auth', 'security', 'system']),
        min_severity: 'warning',
        batch_size: 100,
        rate_limit_per_min: 1500,
        status: 'active',
        total_events_delivered: 4120,
        total_events_failed: 2,
        last_success_at: knex.fn.now(),
        last_failure_at: null,
        last_error_message: null,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      },
    ]);
  }

  // 2. siem_delivery_logs
  const hasDeliveryLogs = await knex.schema.hasTable('siem_delivery_logs');
  if (!hasDeliveryLogs) {
    await knex.schema.createTable('siem_delivery_logs', (table) => {
      table.string('id', 64).primary();
      table.string('destination_id', 64).notNullable().index();
      table.integer('events_count').notNullable();
      table.integer('status_code').notNullable();
      table.integer('latency_ms').notNullable();
      table.enu('status', ['delivered', 'failed', 'retrying']).notNullable().defaultTo('delivered');
      table.text('error_message').nullable();
      table.string('digest_sha256', 64).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    });

    // Pre-seed sample delivery logs
    await knex('siem_delivery_logs').insert([
      {
        id: 'siem-log-seed-01',
        destination_id: 'siem-dest-splunk-prod01',
        events_count: 50,
        status_code: 200,
        latency_ms: 42,
        status: 'delivered',
        error_message: null,
        digest_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        created_at: new Date(Date.now() - 3600000),
      },
      {
        id: 'siem-log-seed-02',
        destination_id: 'siem-dest-datadog-sec02',
        events_count: 24,
        status_code: 202,
        latency_ms: 68,
        status: 'delivered',
        error_message: null,
        digest_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        created_at: new Date(Date.now() - 1800000),
      },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('siem_delivery_logs');
  await knex.schema.dropTableIfExists('siem_destinations');
}
