import type { Knex } from 'knex';

/**
 * Phase 35: Enterprise Automated Chaos Engineering, Resiliency Testing & Fault Injection Engine (v5.3.0)
 *
 * Tables:
 * - chaos_experiments: Experiment definitions, blast radius boundaries, fault types, and safety tripwires
 * - chaos_fault_executions: Real-time and historical telemetry of fault injection sessions, impact metrics, and recovery logs
 * - chaos_tripwire_events: Emergency circuit-breaker trip records and rollback actions
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Chaos Experiments
  if (!(await knex.schema.hasTable('chaos_experiments'))) {
    await knex.schema.createTable('chaos_experiments', (table) => {
      table.string('id', 36).primary();
      table.string('name', 160).notNullable();
      table.string('target_subsystem', 48).notNullable().index('idx_ce_subsystem');
      table.string('fault_type', 48).notNullable().index('idx_ce_fault');
      table.integer('blast_radius_percent').notNullable().defaultTo(10);
      table.string('target_tenant_id', 36).nullable().references('id').inTable('tenants').onDelete('SET NULL').index('idx_ce_tenant');
      table.json('fault_config').notNullable();
      table.integer('duration_seconds').notNullable().defaultTo(60);
      table.string('status', 32).notNullable().defaultTo('draft').index('idx_ce_status');
      table.json('tripwire_thresholds').notNullable();
      table.decimal('resilience_score', 5, 2).nullable();
      table.dateTime('started_at').nullable();
      table.dateTime('completed_at').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Chaos Fault Executions
  if (!(await knex.schema.hasTable('chaos_fault_executions'))) {
    await knex.schema.createTable('chaos_fault_executions', (table) => {
      table.string('id', 36).primary();
      table.string('experiment_id', 36).notNullable().references('id').inTable('chaos_experiments').onDelete('CASCADE').index('idx_cfe_exp');
      table.string('subsystem', 48).notNullable();
      table.string('fault_type', 48).notNullable();
      table.integer('affected_requests_count').notNullable().defaultTo(0);
      table.integer('injected_latency_ms_avg').notNullable().defaultTo(0);
      table.string('tripped_threshold', 160).nullable();
      table.boolean('emergency_aborted').notNullable().defaultTo(false);
      table.decimal('recovery_time_seconds', 6, 2).notNullable().defaultTo(0.00);
      table.json('execution_logs').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now()).index('idx_cfe_created');
    });
  }

  // 3. Chaos Tripwire Events
  if (!(await knex.schema.hasTable('chaos_tripwire_events'))) {
    await knex.schema.createTable('chaos_tripwire_events', (table) => {
      table.string('id', 36).primary();
      table.string('experiment_id', 36).notNullable().references('id').inTable('chaos_experiments').onDelete('CASCADE').index('idx_cte_exp');
      table.string('metric_name', 64).notNullable();
      table.decimal('observed_value', 10, 2).notNullable();
      table.decimal('threshold_value', 10, 2).notNullable();
      table.string('action_taken', 32).notNullable().defaultTo('emergency_aborted');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Pre-seed Core Chaos Experiments
  const existingExp = await knex('chaos_experiments').count('id as count').first();
  if (Number(existingExp?.count || 0) === 0) {
    const now = new Date();
    const systemExperiments = [
      {
        id: 'exp-gw-burst-01',
        name: 'API Gateway Token Bucket Saturation & Rate Limiter Stress',
        target_subsystem: 'api_gateway',
        fault_type: 'token_exhaustion',
        blast_radius_percent: 15,
        target_tenant_id: null,
        fault_config: JSON.stringify({ tokenConsumptionMultiplier: 5, retryPenaltySimulated: 10 }),
        duration_seconds: 45,
        status: 'completed',
        tripwire_thresholds: JSON.stringify({
          max_error_rate_percent: 25,
          max_p99_latency_ms: 1200,
          auto_rollback: true,
        }),
        resilience_score: 98.50,
        started_at: new Date(Date.now() - 3600000),
        completed_at: new Date(Date.now() - 3555000),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'exp-db-lag-02',
        name: 'Multi-Region DB Asynchronous Replication Lag Injection',
        target_subsystem: 'database_mesh',
        fault_type: 'latency_spike',
        blast_radius_percent: 20,
        target_tenant_id: null,
        fault_config: JSON.stringify({ simulatedLagMs: 250, targetRegion: 'eu-central-1' }),
        duration_seconds: 60,
        status: 'draft',
        tripwire_thresholds: JSON.stringify({
          max_error_rate_percent: 15,
          max_p99_latency_ms: 2500,
          auto_rollback: true,
        }),
        resilience_score: null,
        started_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'exp-webhook-503-03',
        name: 'Social Webhook Ingress Transient 503 Outage & DLQ Ingestion',
        target_subsystem: 'social_webhook',
        fault_type: 'service_unavailable_503',
        blast_radius_percent: 10,
        target_tenant_id: null,
        fault_config: JSON.stringify({ dropRatePercent: 40, fallbackToDlq: true }),
        duration_seconds: 30,
        status: 'draft',
        tripwire_thresholds: JSON.stringify({
          max_error_rate_percent: 20,
          max_p99_latency_ms: 1500,
          auto_rollback: true,
        }),
        resilience_score: null,
        started_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'exp-ai-timeout-04',
        name: 'LLM Multi-Agent Fleet High Latency Timeout & Retry Circuit',
        target_subsystem: 'ai_orchestrator',
        fault_type: 'latency_spike',
        blast_radius_percent: 25,
        target_tenant_id: null,
        fault_config: JSON.stringify({ latencySpikeMs: 8000, affectedAgentRoles: ['trend_hunter', 'visual_director'] }),
        duration_seconds: 90,
        status: 'draft',
        tripwire_thresholds: JSON.stringify({
          max_error_rate_percent: 30,
          max_p99_latency_ms: 8500,
          auto_rollback: true,
        }),
        resilience_score: null,
        started_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
    ];

    await knex('chaos_experiments').insert(systemExperiments);

    // Initial Execution Log for exp-gw-burst-01
    await knex('chaos_fault_executions').insert({
      id: 'exec-burst-001',
      experiment_id: 'exp-gw-burst-01',
      subsystem: 'api_gateway',
      fault_type: 'token_exhaustion',
      affected_requests_count: 1420,
      injected_latency_ms_avg: 42,
      tripped_threshold: null,
      emergency_aborted: false,
      recovery_time_seconds: 1.80,
      execution_logs: JSON.stringify([
        { timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'INFO', message: 'Injected 5x token consumption multiplier into /api/v1/posts/*' },
        { timestamp: new Date(Date.now() - 3580000).toISOString(), level: 'INFO', message: 'Token buckets accurately depleted, returning HTTP 429 with Retry-After' },
        { timestamp: new Date(Date.now() - 3555000).toISOString(), level: 'SUCCESS', message: 'Duration elapsed. Tokens proportional refill verified at 1.00 token/sec. Zero crash detected.' },
      ]),
      created_at: now,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chaos_tripwire_events');
  await knex.schema.dropTableIfExists('chaos_fault_executions');
  await knex.schema.dropTableIfExists('chaos_experiments');
}
