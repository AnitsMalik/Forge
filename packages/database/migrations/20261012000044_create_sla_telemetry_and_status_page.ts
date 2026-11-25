import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. system_status_components
  const hasComponents = await knex.schema.hasTable('system_status_components');
  if (!hasComponents) {
    await knex.schema.createTable('system_status_components', (table) => {
      table.string('id', 64).primary();
      table.string('name', 128).notNullable();
      table.string('description', 255).nullable();
      table.string('category', 64).notNullable().defaultTo('core');
      table.integer('display_order').notNullable().defaultTo(0);
      table.enu('status', ['operational', 'degraded_performance', 'partial_outage', 'major_outage', 'maintenance'])
        .notNullable()
        .defaultTo('operational');
      table.boolean('manual_override').notNullable().defaultTo(false);
      table.text('override_reason').nullable();
      table.string('override_by', 64).nullable();
      table.timestamp('override_at').nullable();
      table.decimal('uptime_percentage_30d', 5, 2).notNullable().defaultTo(99.99);
      table.decimal('uptime_percentage_90d', 5, 2).notNullable().defaultTo(99.98);
      table.integer('current_p95_latency_ms').notNullable().defaultTo(25);
      table.timestamp('last_probe_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed standard core components
    await knex('system_status_components').insert([
      {
        id: 'api_gateway',
        name: 'API Gateway & Ingestion Services',
        description: 'Core Express REST API endpoints, routing, and middleware pipelines',
        category: 'core',
        display_order: 1,
        status: 'operational',
        uptime_percentage_30d: 99.99,
        uptime_percentage_90d: 99.98,
        current_p95_latency_ms: 18,
      },
      {
        id: 'publishing_queue',
        name: 'Publishing Engine & Queue Workers',
        description: 'BullMQ asynchronous job dispatchers, video processing, and template renderers',
        category: 'core',
        display_order: 2,
        status: 'operational',
        uptime_percentage_30d: 99.97,
        uptime_percentage_90d: 99.95,
        current_p95_latency_ms: 32,
      },
      {
        id: 'ai_studio_engine',
        name: 'AI Studio & Prompt Synthesis Engine',
        description: 'OpenAI multi-model inference, brand voice persona synthesis, and advisor copilot',
        category: 'core',
        display_order: 3,
        status: 'operational',
        uptime_percentage_30d: 99.95,
        uptime_percentage_90d: 99.92,
        current_p95_latency_ms: 240,
      },
      {
        id: 'meta_adapter',
        name: 'Meta Graph & Instagram Publishing API',
        description: 'Official Facebook Graph API v21.0 & Instagram Business publishing connectors',
        category: 'social_adapters',
        display_order: 4,
        status: 'operational',
        uptime_percentage_30d: 99.94,
        uptime_percentage_90d: 99.90,
        current_p95_latency_ms: 85,
      },
      {
        id: 'tiktok_adapter',
        name: 'TikTok Video Publishing Gateway',
        description: 'Direct TikTok Content Posting API adapter and direct video upload handshakes',
        category: 'social_adapters',
        display_order: 5,
        status: 'operational',
        uptime_percentage_30d: 99.91,
        uptime_percentage_90d: 99.88,
        current_p95_latency_ms: 95,
      },
      {
        id: 'stripe_billing',
        name: 'Stripe Billing & Subscription Vault',
        description: 'Commercial subscription checkouts, webhook listeners, dunning, and invoice sync',
        category: 'core',
        display_order: 6,
        status: 'operational',
        uptime_percentage_30d: 99.99,
        uptime_percentage_90d: 99.99,
        current_p95_latency_ms: 45,
      },
      {
        id: 'database_storage',
        name: 'Relational Database & S3 Storage',
        description: 'Primary MySQL database cluster and MinIO S3 media asset storage buckets',
        category: 'infrastructure',
        display_order: 7,
        status: 'operational',
        uptime_percentage_30d: 99.99,
        uptime_percentage_90d: 99.99,
        current_p95_latency_ms: 12,
      },
      {
        id: 'cache_redis',
        name: 'Redis In-Memory State & Rate Limiter',
        description: 'High-speed BullMQ queues, Redlock distributed locking, and rate limiting counters',
        category: 'infrastructure',
        display_order: 8,
        status: 'operational',
        uptime_percentage_30d: 99.99,
        uptime_percentage_90d: 99.98,
        current_p95_latency_ms: 4,
      },
    ]);
  }

  // 2. system_sla_telemetry
  const hasTelemetry = await knex.schema.hasTable('system_sla_telemetry');
  if (!hasTelemetry) {
    await knex.schema.createTable('system_sla_telemetry', (table) => {
      table.string('id', 64).primary();
      table.string('component_id', 64).notNullable().index();
      table.timestamp('sample_timestamp').notNullable().defaultTo(knex.fn.now()).index();
      table.string('window_type', 32).notNullable().defaultTo('minute_5');
      table.string('status', 32).notNullable().defaultTo('operational');
      table.integer('latency_p50_ms').notNullable().defaultTo(15);
      table.integer('latency_p95_ms').notNullable().defaultTo(35);
      table.integer('latency_p99_ms').notNullable().defaultTo(85);
      table.integer('sample_count').notNullable().defaultTo(100);
      table.integer('error_count').notNullable().defaultTo(0);
      table.decimal('error_rate_pct', 5, 2).notNullable().defaultTo(0.00);
      table.boolean('is_probe').notNullable().defaultTo(false);
      table.json('metadata').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 3. system_maintenance_windows
  const hasMaintenance = await knex.schema.hasTable('system_maintenance_windows');
  if (!hasMaintenance) {
    await knex.schema.createTable('system_maintenance_windows', (table) => {
      table.string('id', 64).primary();
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.enu('impact_level', ['none', 'minor_degradation', 'expected_downtime'])
        .notNullable()
        .defaultTo('minor_degradation');
      table.json('impacted_components').notNullable();
      table.timestamp('scheduled_start_at').notNullable();
      table.timestamp('scheduled_end_at').notNullable();
      table.timestamp('actual_start_at').nullable();
      table.timestamp('actual_end_at').nullable();
      table.enu('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('scheduled');
      table.string('created_by', 64).notNullable();
      table.text('cancellation_reason').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 4. system_status_incidents
  const hasIncidents = await knex.schema.hasTable('system_status_incidents');
  if (!hasIncidents) {
    await knex.schema.createTable('system_status_incidents', (table) => {
      table.string('id', 64).primary();
      table.string('title', 255).notNullable();
      table.enu('severity', ['minor', 'major', 'critical']).notNullable().defaultTo('minor');
      table.json('impacted_components').notNullable();
      table.enu('current_status', ['investigating', 'identified', 'monitoring', 'resolved'])
        .notNullable()
        .defaultTo('investigating');
      table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('resolved_at').nullable();
      table.json('updates').notNullable();
      table.string('created_by', 64).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('system_status_incidents');
  await knex.schema.dropTableIfExists('system_maintenance_windows');
  await knex.schema.dropTableIfExists('system_sla_telemetry');
  await knex.schema.dropTableIfExists('system_status_components');
}
