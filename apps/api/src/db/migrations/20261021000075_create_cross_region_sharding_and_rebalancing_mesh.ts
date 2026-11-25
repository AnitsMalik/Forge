import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. database_shards
  await knex.schema.createTable('database_shards', (table) => {
    table.string('id', 64).primary();
    table.string('shard_name', 128).notNullable();
    table.string('region', 64).notNullable();
    table.string('host_endpoint', 255).notNullable();
    table.string('status', 32).notNullable().defaultTo('online').index();
    table.integer('allocated_vnodes').notNullable().defaultTo(0);
    table.integer('total_keys_count').notNullable().defaultTo(0);
    table.bigInteger('storage_size_bytes').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. shard_routing_ranges
  await knex.schema.createTable('shard_routing_ranges', (table) => {
    table.string('id', 64).primary();
    table.string('shard_id', 64).notNullable().index();
    table.bigInteger('hash_range_start').notNullable();
    table.bigInteger('hash_range_end').notNullable();
    table.string('vnode_id', 64).notNullable().index();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. distributed_transactions
  await knex.schema.createTable('distributed_transactions', (table) => {
    table.string('id', 64).primary();
    table.string('coordinator_node_id', 64).notNullable();
    table.string('target_tenant_id', 64).notNullable().index();
    table.string('status', 32).notNullable().defaultTo('preparing').index();
    table.json('participating_shards').notNullable();
    table.json('payload').notNullable();
    table.text('error_message', 'mediumtext').nullable();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });

  // 4. shard_rebalance_migrations
  await knex.schema.createTable('shard_rebalance_migrations', (table) => {
    table.string('id', 64).primary();
    table.string('source_shard_id', 64).notNullable().index();
    table.string('target_shard_id', 64).notNullable().index();
    table.string('vnode_id', 64).notNullable().index();
    table.integer('keys_migrated').notNullable().defaultTo(0);
    table.integer('total_keys').notNullable().defaultTo(0);
    table.integer('progress_percent').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('in_progress').index();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });

  // Seed Initial 3 Regional Shards
  await knex('database_shards').insert([
    {
      id: 'shard-us-east-01',
      shard_name: 'US-East (N. Virginia) Primary Shard',
      region: 'us-east-1',
      host_endpoint: 'useast1-db-shard.internal:3308',
      status: 'online',
      allocated_vnodes: 12,
      total_keys_count: 854000,
      storage_size_bytes: 48234496000,
      created_at: knex.fn.now(),
    },
    {
      id: 'shard-eu-west-02',
      shard_name: 'EU-West (Frankfurt) Secondary Shard',
      region: 'eu-central-1',
      host_endpoint: 'eucentral1-db-shard.internal:3308',
      status: 'online',
      allocated_vnodes: 10,
      total_keys_count: 621000,
      storage_size_bytes: 35433480000,
      created_at: knex.fn.now(),
    },
    {
      id: 'shard-ap-south-03',
      shard_name: 'AP-South (Singapore) Edge Shard',
      region: 'ap-southeast-1',
      host_endpoint: 'apsouth1-db-shard.internal:3308',
      status: 'online',
      allocated_vnodes: 10,
      total_keys_count: 412000,
      storage_size_bytes: 22548576000,
      created_at: knex.fn.now(),
    },
  ]);

  // Seed 32 Virtual Node Routing Ranges across 32-bit consistent hash ring (0 to 4294967295)
  const shardIds = ['shard-us-east-01', 'shard-eu-west-02', 'shard-ap-south-03'];
  const totalVnodes = 32;
  const ringSize = 4294967296;
  const step = Math.floor(ringSize / totalVnodes);

  const routingRows = [];
  for (let i = 0; i < totalVnodes; i++) {
    const start = i * step;
    const end = i === totalVnodes - 1 ? 4294967295 : (i + 1) * step - 1;
    // Map shards cyclically: 12 to shard 0, 10 to shard 1, 10 to shard 2
    let targetShard = shardIds[0];
    if (i >= 12 && i < 22) targetShard = shardIds[1];
    else if (i >= 22) targetShard = shardIds[2];

    routingRows.push({
      id: `srr-vnode-${String(i).padStart(2, '0')}`,
      shard_id: targetShard,
      hash_range_start: start,
      hash_range_end: end,
      vnode_id: `vnode-${String(i).padStart(2, '0')}`,
      is_active: true,
      created_at: knex.fn.now(),
    });
  }

  await knex('shard_routing_ranges').insert(routingRows);

  // Seed Sample Distributed 2PC Transactions
  await knex('distributed_transactions').insert([
    {
      id: 'dtx-2pc-8821a',
      coordinator_node_id: 'coord-core-node-01',
      target_tenant_id: 'tenant-enterprise-global',
      status: 'committed',
      participating_shards: JSON.stringify([
        { shard_id: 'shard-us-east-01', shard_name: 'US-East Primary', region: 'us-east-1', vote: 'prepared', latency_ms: 12 },
        { shard_id: 'shard-eu-west-02', shard_name: 'EU-West Secondary', region: 'eu-central-1', vote: 'prepared', latency_ms: 48 },
      ]),
      payload: JSON.stringify({ op: 'MULTI_TENANT_QUOTA_RESERVATION', amount: 50000 }),
      error_message: null,
      started_at: new Date(Date.now() - 3600000),
      completed_at: new Date(Date.now() - 3599820),
    },
    {
      id: 'dtx-2pc-9943b',
      coordinator_node_id: 'coord-core-node-02',
      target_tenant_id: 'tenant-apac-fintech',
      status: 'aborted',
      participating_shards: JSON.stringify([
        { shard_id: 'shard-us-east-01', shard_name: 'US-East Primary', region: 'us-east-1', vote: 'prepared', latency_ms: 14 },
        { shard_id: 'shard-ap-south-03', shard_name: 'AP-South Edge', region: 'ap-southeast-1', vote: 'aborted', latency_ms: 220 },
      ]),
      payload: JSON.stringify({ op: 'CROSS_REGION_DATA_PARTITION', keyspace: 'tenant_apac_v2' }),
      error_message: 'Participant shard-ap-south-03 timed out during 2PC prepare phase',
      started_at: new Date(Date.now() - 1800000),
      completed_at: new Date(Date.now() - 1799750),
    },
  ]);

  // Seed Sample Rebalance Migration
  await knex('shard_rebalance_migrations').insert([
    {
      id: 'mig-reb-vnode-04',
      source_shard_id: 'shard-us-east-01',
      target_shard_id: 'shard-eu-west-02',
      vnode_id: 'vnode-04',
      keys_migrated: 48500,
      total_keys: 48500,
      progress_percent: 100,
      status: 'completed',
      started_at: new Date(Date.now() - 7200000),
      completed_at: new Date(Date.now() - 7140000),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('shard_rebalance_migrations');
  await knex.schema.dropTableIfExists('distributed_transactions');
  await knex.schema.dropTableIfExists('shard_routing_ranges');
  await knex.schema.dropTableIfExists('database_shards');
}
