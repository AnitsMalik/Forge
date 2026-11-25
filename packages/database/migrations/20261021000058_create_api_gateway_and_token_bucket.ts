import type { Knex } from 'knex';

/**
 * Phase 33: Enterprise Global API Gateway, Dynamic Rate-Limiter & Token Bucket Throttling Engine (v5.1.0)
 *
 * Tables:
 * - api_gateway_routes: Routing rules, rate limit tiers, burst caps, auth strategies & timeouts
 * - api_token_bucket_quotas: Tenant token buckets for dynamic rate limiting with continuous proportional refill
 * - api_throttle_audit_logs: High-fidelity telemetry of 429 throttle events, burst exhaustion, and client origins
 */

export async function up(knex: Knex): Promise<void> {
  // 1. API Gateway Routes
  if (!(await knex.schema.hasTable('api_gateway_routes'))) {
    await knex.schema.createTable('api_gateway_routes', (table) => {
      table.string('id', 36).primary();
      table.string('route_path', 160).notNullable().unique('uq_agr_path').index('idx_agr_path');
      table.string('service_name', 64).notNullable().defaultTo('content_service').index('idx_agr_service');
      table.string('auth_strategy', 32).notNullable().defaultTo('jwt_bearer');
      table.string('rate_limit_tier', 32).notNullable().defaultTo('standard').index('idx_agr_tier');
      table.integer('requests_per_minute').notNullable().defaultTo(60);
      table.integer('burst_capacity').notNullable().defaultTo(15);
      table.boolean('cors_enabled').notNullable().defaultTo(true);
      table.boolean('is_active').notNullable().defaultTo(true).index('idx_agr_active');
      table.integer('timeout_ms').notNullable().defaultTo(10000);
      table.text('description').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Token Bucket Quotas
  if (!(await knex.schema.hasTable('api_token_bucket_quotas'))) {
    await knex.schema.createTable('api_token_bucket_quotas', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_atbq_tenant');
      table.string('route_id', 36).notNullable().references('id').inTable('api_gateway_routes').onDelete('CASCADE').index('idx_atbq_route');
      table.decimal('available_tokens', 8, 2).notNullable().defaultTo(15.00);
      table.integer('max_capacity').notNullable().defaultTo(15);
      table.decimal('refill_rate_per_sec', 8, 2).notNullable().defaultTo(1.00);
      table.dateTime('last_refill_at').notNullable().defaultTo(knex.fn.now());
      table.integer('total_requests_allowed').notNullable().defaultTo(0);
      table.integer('total_requests_throttled').notNullable().defaultTo(0);
      table.boolean('is_throttled').notNullable().defaultTo(false).index('idx_atbq_throttled');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'route_id'], 'uq_atbq_tenant_route');
    });
  }

  // 3. Throttle Audit Logs
  if (!(await knex.schema.hasTable('api_throttle_audit_logs'))) {
    await knex.schema.createTable('api_throttle_audit_logs', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().references('id').inTable('tenants').onDelete('SET NULL').index('idx_atal_tenant');
      table.string('route_path', 160).notNullable().index('idx_atal_route');
      table.string('client_ip', 64).notNullable().defaultTo('127.0.0.1');
      table.integer('requested_tokens').notNullable().defaultTo(1);
      table.decimal('remaining_tokens', 8, 2).notNullable().defaultTo(0.00);
      table.string('throttle_reason', 255).notNullable();
      table.integer('http_status').notNullable().defaultTo(429).index('idx_atal_status');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Seed Flagship Gateway Routes
  const existingRoutes = await knex('api_gateway_routes').count('id as count').first();
  if (Number(existingRoutes?.count || 0) === 0) {
    const now = new Date();
    const systemRoutes = [
      {
        id: 'route-core-posts-01',
        route_path: '/api/v1/posts/*',
        service_name: 'publishing_service',
        auth_strategy: 'jwt_bearer',
        rate_limit_tier: 'high_throughput',
        requests_per_minute: 300,
        burst_capacity: 50,
        cors_enabled: true,
        is_active: true,
        timeout_ms: 8000,
        description: 'Core social media content generation, publishing, and scheduling API.',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'route-ai-synthesis-02',
        route_path: '/api/v1/ai/*',
        service_name: 'ai_agent_service',
        auth_strategy: 'jwt_bearer',
        rate_limit_tier: 'standard',
        requests_per_minute: 60,
        burst_capacity: 15,
        cors_enabled: true,
        is_active: true,
        timeout_ms: 25000,
        description: 'Real-time LLM copy synthesis, multi-agent fleet collaboration, and image prompts.',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'route-analytics-telemetry-03',
        route_path: '/api/v1/analytics/*',
        service_name: 'analytics_service',
        auth_strategy: 'jwt_bearer',
        rate_limit_tier: 'high_throughput',
        requests_per_minute: 600,
        burst_capacity: 100,
        cors_enabled: true,
        is_active: true,
        timeout_ms: 6000,
        description: 'High-frequency telemetry ingestion, social metrics, and brand baseline tracking.',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'route-webhooks-ingress-04',
        route_path: '/api/v1/webhooks/*',
        service_name: 'webhook_service',
        auth_strategy: 'public',
        rate_limit_tier: 'standard',
        requests_per_minute: 120,
        burst_capacity: 30,
        cors_enabled: true,
        is_active: true,
        timeout_ms: 5000,
        description: 'Public social platform webhook ingress with HMAC signature verification.',
        created_at: now,
        updated_at: now,
      },
    ];

    await knex('api_gateway_routes').insert(systemRoutes);

    // Pre-seed initial token bucket quotas for first valid 36-char tenant
    const validTenants = await knex('tenants')
      .whereRaw('CHAR_LENGTH(id) = 36')
      .select('id', 'name')
      .limit(3);

    if (validTenants.length > 0) {
      const flagshipTenant = validTenants[0];
      const initialBuckets = systemRoutes.map((r) => ({
        id: `tb-${flagshipTenant.id.slice(0, 8)}-${r.id.slice(6, 18)}`,
        tenant_id: flagshipTenant.id,
        route_id: r.id,
        available_tokens: r.burst_capacity,
        max_capacity: r.burst_capacity,
        refill_rate_per_sec: Number((r.requests_per_minute / 60).toFixed(2)),
        last_refill_at: now,
        total_requests_allowed: 142,
        total_requests_throttled: 0,
        is_throttled: false,
        created_at: now,
        updated_at: now,
      }));

      await knex('api_token_bucket_quotas').insert(initialBuckets);

      // Seed initial sample throttle audit log
      await knex('api_throttle_audit_logs').insert({
        id: 'log-sample-throttle-01',
        tenant_id: flagshipTenant.id,
        route_path: '/api/v1/ai/*',
        client_ip: '192.168.1.100',
        requested_tokens: 1,
        remaining_tokens: 0.00,
        throttle_reason: 'Token bucket capacity exhausted (15/15 burst tokens consumed)',
        http_status: 429,
        created_at: new Date(Date.now() - 3600000),
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_throttle_audit_logs');
  await knex.schema.dropTableIfExists('api_token_bucket_quotas');
  await knex.schema.dropTableIfExists('api_gateway_routes');
}
