import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. multi_master_nodes
  await knex.schema.createTable('multi_master_nodes', (table) => {
    table.string('id', 64).primary();
    table.string('node_name', 128).notNullable().unique();
    table.string('region', 64).notNullable();
    table.string('endpoint_url', 512).notNullable();
    table.string('sync_status', 32).notNullable().defaultTo('in_sync');
    table.integer('write_capacity_qps').notNullable().defaultTo(10000);
    table.integer('vector_clock_version').notNullable().defaultTo(1);
    table.integer('quorum_weight').notNullable().defaultTo(1);
    table.boolean('is_fenced').notNullable().defaultTo(false).index();
    table.timestamp('last_sync_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. vector_clock_states
  await knex.schema.createTable('vector_clock_states', (table) => {
    table.string('id', 64).primary();
    table.string('entity_type', 64).notNullable().index();
    table.string('entity_id', 64).notNullable().index();
    table.json('region_clocks').notNullable();
    table.string('causal_state', 32).notNullable().defaultTo('ordered');
    table.timestamp('last_write_timestamp').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. conflict_resolution_policies
  await knex.schema.createTable('conflict_resolution_policies', (table) => {
    table.string('id', 64).primary();
    table.string('policy_name', 128).notNullable().unique();
    table.string('entity_type', 64).notNullable().unique();
    table.string('resolution_strategy', 64).notNullable().defaultTo('lww_timestamp');
    table.string('tie_breaker_region', 64).notNullable().defaultTo('us-east-1');
    table.boolean('auto_resolve').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. distributed_convergence_logs
  await knex.schema.createTable('distributed_convergence_logs', (table) => {
    table.string('id', 64).primary();
    table.string('conflict_id', 64).notNullable().index();
    table.string('entity_type', 64).notNullable().index();
    table.string('entity_id', 64).notNullable().index();
    table.json('conflicting_regions').notNullable();
    table.string('winning_region', 64).notNullable();
    table.string('strategy_applied', 64).notNullable();
    table.integer('resolution_latency_ms').notNullable().defaultTo(0);
    table.string('convergence_status', 32).notNullable().defaultTo('resolved').index();
    table.json('details').nullable();
    table.timestamp('resolved_at').notNullable().defaultTo(knex.fn.now());
  });

  // Pre-seed multi_master_nodes
  await knex('multi_master_nodes').insert([
    {
      id: 'node-us-east-primary',
      node_name: 'Multi-Master Cluster (us-east-1 / N. Virginia)',
      region: 'us-east-1',
      endpoint_url: 'https://mm-node-useast.internal.socialforge.io/rpc',
      sync_status: 'in_sync',
      write_capacity_qps: 15000,
      vector_clock_version: 4820,
      quorum_weight: 2,
      is_fenced: false,
      last_sync_at: new Date(),
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'node-us-west-primary',
      node_name: 'Multi-Master Cluster (us-west-2 / Oregon)',
      region: 'us-west-2',
      endpoint_url: 'https://mm-node-uswest.internal.socialforge.io/rpc',
      sync_status: 'in_sync',
      write_capacity_qps: 12000,
      vector_clock_version: 4818,
      quorum_weight: 1,
      is_fenced: false,
      last_sync_at: new Date(),
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'node-eu-west-primary',
      node_name: 'Multi-Master Cluster (eu-west-1 / Ireland)',
      region: 'eu-west-1',
      endpoint_url: 'https://mm-node-euwest.internal.socialforge.io/rpc',
      sync_status: 'in_sync',
      write_capacity_qps: 10000,
      vector_clock_version: 4815,
      quorum_weight: 1,
      is_fenced: false,
      last_sync_at: new Date(),
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'node-ap-south-primary',
      node_name: 'Multi-Master Cluster (ap-south-1 / Mumbai)',
      region: 'ap-south-1',
      endpoint_url: 'https://mm-node-apsouth.internal.socialforge.io/rpc',
      sync_status: 'in_sync',
      write_capacity_qps: 8000,
      vector_clock_version: 4812,
      quorum_weight: 1,
      is_fenced: false,
      last_sync_at: new Date(),
      created_at: new Date('2026-03-01T00:00:00Z'),
    },
  ]);

  // Pre-seed conflict_resolution_policies
  await knex('conflict_resolution_policies').insert([
    {
      id: 'pol-campaign-schedule',
      policy_name: 'Campaign Publish Schedule Policy',
      entity_type: 'campaign_schedule',
      resolution_strategy: 'lww_timestamp',
      tie_breaker_region: 'us-east-1',
      auto_resolve: true,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'pol-post-variant-content',
      policy_name: 'Post Variant Text & Media Edit Policy',
      entity_type: 'post_variant_content',
      resolution_strategy: 'crdt_or_set',
      tie_breaker_region: 'us-east-1',
      auto_resolve: true,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'pol-tenant-quota-counter',
      policy_name: 'Tenant Usage & Quota Consumption Counter',
      entity_type: 'tenant_quota_counter',
      resolution_strategy: 'crdt_pn_counter',
      tie_breaker_region: 'us-east-1',
      auto_resolve: true,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'pol-permission-grant',
      policy_name: 'Security & Permission Grant Policy',
      entity_type: 'permission_grant',
      resolution_strategy: 'highest_priority_region',
      tie_breaker_region: 'us-east-1',
      auto_resolve: true,
      is_active: true,
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
  ]);

  // Pre-seed vector_clock_states
  await knex('vector_clock_states').insert([
    {
      id: 'vc-camp-001',
      entity_type: 'campaign_schedule',
      entity_id: 'camp-summer-launch-2026',
      region_clocks: JSON.stringify({ 'us-east-1': 14, 'us-west-2': 14, 'eu-west-1': 13, 'ap-south-1': 13 }),
      causal_state: 'ordered',
      last_write_timestamp: new Date(Date.now() - 3600000),
      last_updated_at: new Date(Date.now() - 3600000),
    },
    {
      id: 'vc-post-001',
      entity_type: 'post_variant_content',
      entity_id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164',
      region_clocks: JSON.stringify({ 'us-east-1': 42, 'us-west-2': 42, 'eu-west-1': 42, 'ap-south-1': 42 }),
      causal_state: 'ordered',
      last_write_timestamp: new Date(Date.now() - 7200000),
      last_updated_at: new Date(Date.now() - 7200000),
    },
    {
      id: 'vc-quota-001',
      entity_type: 'tenant_quota_counter',
      entity_id: 'tenant-enterprise-01',
      region_clocks: JSON.stringify({ 'us-east-1': 890, 'us-west-2': 720, 'eu-west-1': 410, 'ap-south-1': 150 }),
      causal_state: 'ordered',
      last_write_timestamp: new Date(Date.now() - 1800000),
      last_updated_at: new Date(Date.now() - 1800000),
    },
  ]);

  // Pre-seed distributed_convergence_logs
  await knex('distributed_convergence_logs').insert([
    {
      id: 'conv-log-001',
      conflict_id: 'conf-race-9901',
      entity_type: 'campaign_schedule',
      entity_id: 'camp-summer-launch-2026',
      conflicting_regions: JSON.stringify(['us-east-1', 'eu-west-1']),
      winning_region: 'us-east-1',
      strategy_applied: 'lww_timestamp',
      resolution_latency_ms: 14,
      convergence_status: 'resolved',
      details: JSON.stringify({ reason: 'Timestamp in us-east-1 was +210ms ahead of eu-west-1' }),
      resolved_at: new Date(Date.now() - 3600000),
    },
    {
      id: 'conv-log-002',
      conflict_id: 'conf-race-9902',
      entity_type: 'tenant_quota_counter',
      entity_id: 'tenant-enterprise-01',
      conflicting_regions: JSON.stringify(['us-west-2', 'ap-south-1']),
      winning_region: 'us-west-2',
      strategy_applied: 'crdt_pn_counter',
      resolution_latency_ms: 19,
      convergence_status: 'resolved',
      details: JSON.stringify({ merged_total: 1280, crdt_operation: 'merge_additions' }),
      resolved_at: new Date(Date.now() - 1800000),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('distributed_convergence_logs');
  await knex.schema.dropTableIfExists('conflict_resolution_policies');
  await knex.schema.dropTableIfExists('vector_clock_states');
  await knex.schema.dropTableIfExists('multi_master_nodes');
}
