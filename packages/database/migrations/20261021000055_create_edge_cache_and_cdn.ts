import type { Knex } from 'knex';

/**
 * Phase 30: Global Multi-Region Edge Caching & Real-Time Content Distribution Network (v4.8.0)
 *
 * Tables:
 * - edge_cache_nodes: Global edge PoP nodes across multiple regions with health, latency & SSL
 * - edge_cache_rules: Dynamic cache routing policies, TTL, SWR (stale-while-revalidate), and tag rules
 * - edge_purge_logs: Immutable cache invalidation audit trail for URL/tag/all purges
 * - edge_traffic_metrics: Time-series telemetry tracking cache hit ratios, bandwidth, offload % & p95 latency
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Edge Cache PoP Nodes
  if (!(await knex.schema.hasTable('edge_cache_nodes'))) {
    await knex.schema.createTable('edge_cache_nodes', (table) => {
      table.string('id', 36).primary();
      table.string('node_code', 32).notNullable().unique('uq_edge_node_code');
      table.string('name', 128).notNullable();
      table.string('region', 64).notNullable().index('idx_edge_node_region');
      table.string('status', 32).notNullable().defaultTo('online').index('idx_edge_node_status');
      table.string('ip_address', 64).notNullable();
      table.integer('latency_ms').notNullable().defaultTo(20);
      table.decimal('hit_ratio', 5, 2).notNullable().defaultTo(95.00);
      table.decimal('uptime_percent', 5, 2).notNullable().defaultTo(99.99);
      table.integer('capacity_gb').notNullable().defaultTo(500);
      table.integer('used_gb').notNullable().defaultTo(120);
      table.integer('active_connections').notNullable().defaultTo(0);
      table.boolean('ssl_active').notNullable().defaultTo(true);
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Edge Cache Rules & Policies
  if (!(await knex.schema.hasTable('edge_cache_rules'))) {
    await knex.schema.createTable('edge_cache_rules', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_edge_rule_tenant');
      table.string('rule_name', 128).notNullable();
      table.integer('priority').notNullable().defaultTo(100).index('idx_edge_rule_priority');
      table.string('route_pattern', 255).notNullable();
      table.string('cache_tier', 32).notNullable().defaultTo('edge_memory');
      table.integer('ttl_seconds').notNullable().defaultTo(300);
      table.integer('swr_seconds').notNullable().defaultTo(60);
      table.json('cache_tags').notNullable();
      table.boolean('bypass_on_auth').notNullable().defaultTo(true);
      table.json('bypass_methods').notNullable();
      table.boolean('is_enabled').notNullable().defaultTo(true).index('idx_edge_rule_enabled');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 3. Edge Purge & Invalidation Logs
  if (!(await knex.schema.hasTable('edge_purge_logs'))) {
    await knex.schema.createTable('edge_purge_logs', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_edge_purge_tenant');
      table.string('purge_type', 32).notNullable().index('idx_edge_purge_type');
      table.json('targets').notNullable();
      table.string('status', 32).notNullable().defaultTo('completed').index('idx_edge_purge_status');
      table.string('reason', 255).notNullable();
      table.string('requested_by', 36).notNullable();
      table.integer('nodes_affected').notNullable().defaultTo(0);
      table.dateTime('completed_at').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 4. Edge Traffic Telemetry Metrics
  if (!(await knex.schema.hasTable('edge_traffic_metrics'))) {
    await knex.schema.createTable('edge_traffic_metrics', (table) => {
      table.string('id', 36).primary();
      table.dateTime('time_bucket').notNullable().index('idx_edge_metric_bucket');
      table.string('edge_node_id', 36).nullable().references('id').inTable('edge_cache_nodes').onDelete('SET NULL').index('idx_edge_metric_node');
      table.integer('total_requests').notNullable().defaultTo(0);
      table.integer('cache_hits').notNullable().defaultTo(0);
      table.integer('cache_misses').notNullable().defaultTo(0);
      table.integer('cache_bypasses').notNullable().defaultTo(0);
      table.bigInteger('bandwidth_bytes').notNullable().defaultTo(0);
      table.decimal('origin_offload_percent', 5, 2).notNullable().defaultTo(0);
      table.integer('p95_latency_ms').notNullable().defaultTo(0);
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Pre-seed Global Edge Nodes
  const existingNodes = await knex('edge_cache_nodes').count('id as count').first();
  if (Number(existingNodes?.count || 0) === 0) {
    const seedNodes = [
      {
        id: 'node-iad-01-us-east',
        node_code: 'iad-edge-01',
        name: 'US East (N. Virginia Edge Gateway)',
        region: 'us-east-1',
        status: 'online',
        ip_address: '198.51.100.14',
        latency_ms: 12,
        hit_ratio: 96.40,
        uptime_percent: 99.99,
        capacity_gb: 1024,
        used_gb: 342,
        active_connections: 4850,
        ssl_active: true,
      },
      {
        id: 'node-sfo-02-us-west',
        node_code: 'sfo-edge-02',
        name: 'US West (Oregon Edge Gateway)',
        region: 'us-west-2',
        status: 'online',
        ip_address: '198.51.100.28',
        latency_ms: 18,
        hit_ratio: 94.80,
        uptime_percent: 99.98,
        capacity_gb: 1024,
        used_gb: 280,
        active_connections: 3200,
        ssl_active: true,
      },
      {
        id: 'node-fra-03-eu-west',
        node_code: 'fra-edge-03',
        name: 'Europe Central (Frankfurt Edge Gateway)',
        region: 'eu-central-1',
        status: 'online',
        ip_address: '203.0.113.88',
        latency_ms: 16,
        hit_ratio: 95.10,
        uptime_percent: 100.00,
        capacity_gb: 768,
        used_gb: 210,
        active_connections: 2750,
        ssl_active: true,
      },
      {
        id: 'node-lhr-04-eu-uk',
        node_code: 'lhr-edge-04',
        name: 'UK & Western Europe (London Edge Gateway)',
        region: 'eu-west-2',
        status: 'online',
        ip_address: '203.0.113.92',
        latency_ms: 14,
        hit_ratio: 93.90,
        uptime_percent: 99.99,
        capacity_gb: 768,
        used_gb: 195,
        active_connections: 2100,
        ssl_active: true,
      },
      {
        id: 'node-sin-05-ap-se',
        node_code: 'sin-edge-05',
        name: 'Asia Pacific (Singapore Edge Hub)',
        region: 'ap-southeast-1',
        status: 'online',
        ip_address: '192.0.2.145',
        latency_ms: 24,
        hit_ratio: 91.80,
        uptime_percent: 99.97,
        capacity_gb: 512,
        used_gb: 165,
        active_connections: 1850,
        ssl_active: true,
      },
      {
        id: 'node-tyo-06-ap-ne',
        node_code: 'tyo-edge-06',
        name: 'East Asia (Tokyo Edge Hub)',
        region: 'ap-northeast-1',
        status: 'online',
        ip_address: '192.0.2.190',
        latency_ms: 22,
        hit_ratio: 92.60,
        uptime_percent: 99.99,
        capacity_gb: 512,
        used_gb: 150,
        active_connections: 1600,
        ssl_active: true,
      },
    ];
    await knex('edge_cache_nodes').insert(seedNodes);
  }

  // Pre-seed Default Edge Caching Rules
  const existingRules = await knex('edge_cache_rules').count('id as count').first();
  if (Number(existingRules?.count || 0) === 0) {
    const seedRules = [
      {
        id: 'rule-static-assets-01',
        tenant_id: null,
        rule_name: 'Static Assets & Media CDN',
        priority: 10,
        route_pattern: '/assets/*',
        cache_tier: 'edge_ssd',
        ttl_seconds: 86400, // 24 hours
        swr_seconds: 3600,
        cache_tags: JSON.stringify(['assets', 'static', 'media']),
        bypass_on_auth: false,
        bypass_methods: JSON.stringify(['POST', 'PUT', 'DELETE', 'PATCH']),
        is_enabled: true,
      },
      {
        id: 'rule-system-status-02',
        tenant_id: null,
        rule_name: 'Public Status & SLA Telemetry Feed',
        priority: 20,
        route_pattern: '/api/v1/status*',
        cache_tier: 'edge_memory',
        ttl_seconds: 30, // 30s TTL
        swr_seconds: 15,
        cache_tags: JSON.stringify(['status', 'telemetry', 'sla']),
        bypass_on_auth: false,
        bypass_methods: JSON.stringify(['POST', 'PUT', 'DELETE']),
        is_enabled: true,
      },
      {
        id: 'rule-white-label-03',
        tenant_id: null,
        rule_name: 'White-Label Branding Configurations',
        priority: 30,
        route_pattern: '/api/v1/public/white-label/*',
        cache_tier: 'edge_memory',
        ttl_seconds: 300, // 5 min TTL
        swr_seconds: 60,
        cache_tags: JSON.stringify(['white-label', 'branding', 'tenant-portal']),
        bypass_on_auth: false,
        bypass_methods: JSON.stringify(['POST', 'PUT', 'DELETE']),
        is_enabled: true,
      },
      {
        id: 'rule-worm-verify-04',
        tenant_id: null,
        rule_name: 'Public WORM Cryptographic Proof Verification',
        priority: 40,
        route_pattern: '/api/v1/public/worm-verify/*',
        cache_tier: 'edge_memory',
        ttl_seconds: 600, // 10 min TTL
        swr_seconds: 120,
        cache_tags: JSON.stringify(['worm', 'cryptographic-proof', 'compliance']),
        bypass_on_auth: false,
        bypass_methods: JSON.stringify(['POST', 'PUT', 'DELETE']),
        is_enabled: true,
      },
    ];
    await knex('edge_cache_rules').insert(seedRules);
  }

  // Pre-seed an initial audit purge record
  const existingPurges = await knex('edge_purge_logs').count('id as count').first();
  if (Number(existingPurges?.count || 0) === 0) {
    await knex('edge_purge_logs').insert({
      id: 'purge-init-bootstrap-01',
      tenant_id: null,
      purge_type: 'tag',
      targets: JSON.stringify(['white-label', 'branding']),
      status: 'completed',
      reason: 'Fleet bootstrap initial cache warm & tag synchronization',
      requested_by: 'system_bootstrap',
      nodes_affected: 6,
      completed_at: knex.fn.now(),
      created_at: knex.fn.now(),
    });
  }

  // Pre-seed 24 hours of edge traffic metrics
  const existingMetrics = await knex('edge_traffic_metrics').count('id as count').first();
  if (Number(existingMetrics?.count || 0) === 0) {
    const seedMetrics = [];
    const now = new Date();
    for (let i = 24; i >= 1; i--) {
      const bucketTime = new Date(now.getTime() - i * 3600 * 1000);
      const totalReq = 45000 + Math.floor(Math.sin(i / 3) * 15000) + Math.floor(Math.random() * 2000);
      const hits = Math.floor(totalReq * (0.92 + (Math.random() * 0.04)));
      const misses = Math.floor(totalReq * 0.05);
      const bypasses = totalReq - hits - misses;
      const bandwidth = BigInt(totalReq) * BigInt(48000 + Math.floor(Math.random() * 8000));
      const offload = Number(((hits / totalReq) * 100).toFixed(2));
      const latency = 16 + Math.floor(Math.random() * 8);

      seedMetrics.push({
        id: `metric-seed-${i}-${bucketTime.getTime()}`,
        time_bucket: bucketTime,
        edge_node_id: 'node-iad-01-us-east',
        total_requests: totalReq,
        cache_hits: hits,
        cache_misses: misses,
        cacheBypasses: bypasses,
        bandwidth_bytes: bandwidth.toString(),
        origin_offload_percent: offload,
        p95_latency_ms: latency,
        created_at: bucketTime,
      });
    }

    // Remap cacheBypasses to cache_bypasses
    const normalizedMetrics = seedMetrics.map(m => ({
      id: m.id,
      time_bucket: m.time_bucket,
      edge_node_id: m.edge_node_id,
      total_requests: m.total_requests,
      cache_hits: m.cache_hits,
      cache_misses: m.cache_misses,
      cache_bypasses: m.cacheBypasses,
      bandwidth_bytes: m.bandwidth_bytes,
      origin_offload_percent: m.origin_offload_percent,
      p95_latency_ms: m.p95_latency_ms,
      created_at: m.created_at,
    }));

    await knex('edge_traffic_metrics').insert(normalizedMetrics);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('edge_traffic_metrics');
  await knex.schema.dropTableIfExists('edge_purge_logs');
  await knex.schema.dropTableIfExists('edge_cache_rules');
  await knex.schema.dropTableIfExists('edge_cache_nodes');
}
