import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. event_mesh_topics
  await knex.schema.createTable('event_mesh_topics', (table) => {
    table.string('id', 64).primary();
    table.string('topic_name', 128).notNullable().unique().index();
    table.integer('partition_count').notNullable().defaultTo(8);
    table.integer('retention_hours').notNullable().defaultTo(72);
    table.string('schema_validation', 32).notNullable().defaultTo('strict');
    table.string('status', 32).notNullable().defaultTo('active').index();
    table.bigInteger('total_published').notNullable().defaultTo(0);
    table.decimal('throughput_per_sec', 10, 2).notNullable().defaultTo(0.00);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. event_mesh_subscriptions
  await knex.schema.createTable('event_mesh_subscriptions', (table) => {
    table.string('id', 64).primary();
    table.string('topic_id', 64).notNullable().index();
    table.string('topic_name', 128).notNullable().index();
    table.string('subscriber_name', 128).notNullable().index();
    table.string('endpoint_url', 512).notNullable();
    table.string('delivery_mode', 32).notNullable().defaultTo('push');
    table.string('circuit_breaker_status', 32).notNullable().defaultTo('closed').index();
    table.integer('max_retries').notNullable().defaultTo(5);
    table.integer('concurrency_limit').notNullable().defaultTo(10);
    table.integer('ack_timeout_ms').notNullable().defaultTo(5000);
    table.bigInteger('delivered_count').notNullable().defaultTo(0);
    table.integer('failure_count').notNullable().defaultTo(0);
    table.integer('dlq_count').notNullable().defaultTo(0);
    table.timestamp('last_delivery_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. event_mesh_dead_letter_queue
  await knex.schema.createTable('event_mesh_dead_letter_queue', (table) => {
    table.string('id', 64).primary();
    table.string('subscription_id', 64).notNullable().index();
    table.string('topic_name', 128).notNullable().index();
    table.string('subscriber_name', 128).notNullable().index();
    table.string('event_id', 128).notNullable().index();
    table.string('idempotency_key', 128).notNullable().index();
    table.json('payload').notNullable();
    table.json('headers').nullable();
    table.string('failure_reason', 512).notNullable();
    table.integer('retry_count').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('quarantined').index();
    table.text('last_error').nullable();
    table.timestamp('first_failed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_retried_at').nullable();
    table.timestamp('resolved_at').nullable();
  });

  // 4. event_mesh_idempotency_keys
  await knex.schema.createTable('event_mesh_idempotency_keys', (table) => {
    table.string('id', 64).primary();
    table.string('idempotency_key', 128).notNullable().unique().index();
    table.string('topic_name', 128).notNullable().index();
    table.string('event_id', 128).notNullable().index();
    table.string('consumer_id', 128).notNullable().index();
    table.string('status', 32).notNullable().defaultTo('committed').index();
    table.string('response_digest', 128).nullable();
    table.timestamp('expires_at').notNullable().index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  const now = new Date();
  const futureExpires = new Date(Date.now() + 86400000 * 7); // 7 days ahead

  // Pre-seed Core Topics
  const topics = [
    {
      id: 'top-posts-published',
      topic_name: 'posts.published',
      partition_count: 8,
      retention_hours: 72,
      schema_validation: 'strict',
      status: 'active',
      total_published: 14250,
      throughput_per_sec: 45.20,
      created_at: now,
      updated_at: now
    },
    {
      id: 'top-social-webhook',
      topic_name: 'social.webhook.received',
      partition_count: 16,
      retention_hours: 48,
      schema_validation: 'strict',
      status: 'active',
      total_published: 92400,
      throughput_per_sec: 112.50,
      created_at: now,
      updated_at: now
    },
    {
      id: 'top-analytics-ingested',
      topic_name: 'analytics.ingested',
      partition_count: 8,
      retention_hours: 168,
      schema_validation: 'relaxed',
      status: 'active',
      total_published: 240000,
      throughput_per_sec: 280.00,
      created_at: now,
      updated_at: now
    },
    {
      id: 'top-billing-invoiced',
      topic_name: 'billing.invoiced',
      partition_count: 4,
      retention_hours: 720,
      schema_validation: 'strict',
      status: 'active',
      total_published: 3850,
      throughput_per_sec: 4.10,
      created_at: now,
      updated_at: now
    },
    {
      id: 'top-security-audit',
      topic_name: 'security.audit.logged',
      partition_count: 4,
      retention_hours: 2160,
      schema_validation: 'strict',
      status: 'active',
      total_published: 68900,
      throughput_per_sec: 22.80,
      created_at: now,
      updated_at: now
    }
  ];

  await knex('event_mesh_topics').insert(topics);

  // Pre-seed Subscriptions
  const subscriptions = [
    {
      id: 'sub-post-cache-invalidator',
      topic_id: 'top-posts-published',
      topic_name: 'posts.published',
      subscriber_name: 'edge-cache-service',
      endpoint_url: 'https://internal.socialforge.io/hooks/edge-cache/invalidate',
      delivery_mode: 'push',
      circuit_breaker_status: 'closed',
      max_retries: 5,
      concurrency_limit: 20,
      ack_timeout_ms: 3000,
      delivered_count: 14245,
      failure_count: 5,
      dlq_count: 0,
      last_delivery_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'sub-webhook-verifier',
      topic_id: 'top-social-webhook',
      topic_name: 'social.webhook.received',
      subscriber_name: 'meta-graph-pipeline',
      endpoint_url: 'https://internal.socialforge.io/hooks/meta-graph/consume',
      delivery_mode: 'push',
      circuit_breaker_status: 'closed',
      max_retries: 5,
      concurrency_limit: 25,
      ack_timeout_ms: 5000,
      delivered_count: 92380,
      failure_count: 20,
      dlq_count: 2,
      last_delivery_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'sub-analytics-rollup',
      topic_id: 'top-analytics-ingested',
      topic_name: 'analytics.ingested',
      subscriber_name: 'clickhouse-stream-worker',
      endpoint_url: 'https://internal.socialforge.io/hooks/clickhouse/batch-insert',
      delivery_mode: 'push',
      circuit_breaker_status: 'closed',
      max_retries: 3,
      concurrency_limit: 50,
      ack_timeout_ms: 8000,
      delivered_count: 239950,
      failure_count: 50,
      dlq_count: 1,
      last_delivery_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'sub-invoice-stripe-sync',
      topic_id: 'top-billing-invoiced',
      topic_name: 'billing.invoiced',
      subscriber_name: 'stripe-ledger-adapter',
      endpoint_url: 'https://internal.socialforge.io/hooks/billing/ledger-sync',
      delivery_mode: 'push',
      circuit_breaker_status: 'closed',
      max_retries: 5,
      concurrency_limit: 10,
      ack_timeout_ms: 10000,
      delivered_count: 3848,
      failure_count: 2,
      dlq_count: 0,
      last_delivery_at: now,
      created_at: now,
      updated_at: now
    },
    {
      id: 'sub-siem-forwarder',
      topic_id: 'top-security-audit',
      topic_name: 'security.audit.logged',
      subscriber_name: 'splunk-hec-producer',
      endpoint_url: 'https://internal.socialforge.io/hooks/siem/hec-collector',
      delivery_mode: 'push',
      circuit_breaker_status: 'closed',
      max_retries: 5,
      concurrency_limit: 15,
      ack_timeout_ms: 5000,
      delivered_count: 68900,
      failure_count: 0,
      dlq_count: 0,
      last_delivery_at: now,
      created_at: now,
      updated_at: now
    }
  ];

  await knex('event_mesh_subscriptions').insert(subscriptions);

  // Pre-seed Dead-Letter Queue initial records
  const dlqRecords = [
    {
      id: 'dlq-wh-fb-signature-mismatch',
      subscription_id: 'sub-webhook-verifier',
      topic_name: 'social.webhook.received',
      subscriber_name: 'meta-graph-pipeline',
      event_id: 'evt-meta-wh-988412',
      idempotency_key: 'idem-fb-sha256-invalid-001',
      payload: JSON.stringify({
        object: 'page',
        entry: [{ id: '108482019482', time: 1734891100, changes: [{ field: 'feed', value: { post_id: '108482019482_99210' } }] }]
      }),
      headers: JSON.stringify({ 'x-hub-signature-256': 'sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }),
      failure_reason: 'HMAC-SHA256 signature mismatch from remote IP 157.240.22.35',
      retry_count: 5,
      status: 'quarantined',
      last_error: 'InvalidSignatureError: Payload tamper check failed for Facebook Page Feed webhook',
      first_failed_at: new Date(Date.now() - 3600000 * 4),
      last_retried_at: new Date(Date.now() - 3600000 * 2),
      resolved_at: null
    },
    {
      id: 'dlq-wh-ig-payload-malformed',
      subscription_id: 'sub-webhook-verifier',
      topic_name: 'social.webhook.received',
      subscriber_name: 'meta-graph-pipeline',
      event_id: 'evt-ig-wh-441092',
      idempotency_key: 'idem-ig-media-drop-002',
      payload: JSON.stringify({
        object: 'instagram',
        entry: [{ id: '1784140029381', time: 1734892200, changes: [{ field: 'comments', value: { text: 'Inquiry on price' } }] }]
      }),
      headers: JSON.stringify({ 'x-hub-signature-256': 'sha256=ValidSigHash481920' }),
      failure_reason: "JsonSchemaValidationError: missing required field 'entry[0].changes[0].value.media_id'",
      retry_count: 4,
      status: 'quarantined',
      last_error: 'SchemaValidationException: Malformed Instagram Graph webhook structure',
      first_failed_at: new Date(Date.now() - 3600000 * 6),
      last_retried_at: new Date(Date.now() - 3600000 * 3),
      resolved_at: null
    },
    {
      id: 'dlq-analytics-schema-overflow',
      subscription_id: 'sub-analytics-rollup',
      topic_name: 'analytics.ingested',
      subscriber_name: 'clickhouse-stream-worker',
      event_id: 'evt-ch-stream-33910',
      idempotency_key: 'idem-ch-int-overflow-003',
      payload: JSON.stringify({
        metric: 'post_impressions',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        impression_count: '18446744073709551616'
      }),
      headers: JSON.stringify({ 'x-client-worker': 'analytics-agent-node-04' }),
      failure_reason: 'ClickHouseInsertError: UInt64 overflow on field impression_count',
      retry_count: 3,
      status: 'quarantined',
      last_error: 'DB::Exception: Value 18446744073709551616 is out of bounds for UInt64',
      first_failed_at: new Date(Date.now() - 3600000 * 8),
      last_retried_at: new Date(Date.now() - 3600000 * 4),
      resolved_at: null
    }
  ];

  await knex('event_mesh_dead_letter_queue').insert(dlqRecords);

  // Pre-seed Idempotency Records
  const idempotencyRecords = [
    {
      id: 'idem-rec-001',
      idempotency_key: 'idem-prod-post-lock-pub',
      topic_name: 'posts.published',
      event_id: 'evt-meta-lock-256cf21a',
      consumer_id: 'meta-graph-pipeline',
      status: 'committed',
      response_digest: 'sha256:88fb827e8a93bc2051b1a44a',
      expires_at: futureExpires,
      created_at: now
    }
  ];

  await knex('event_mesh_idempotency_keys').insert(idempotencyRecords);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_mesh_idempotency_keys');
  await knex.schema.dropTableIfExists('event_mesh_dead_letter_queue');
  await knex.schema.dropTableIfExists('event_mesh_subscriptions');
  await knex.schema.dropTableIfExists('event_mesh_topics');
}
