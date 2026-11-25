import type { Knex } from 'knex';

/**
 * Phase 34: Enterprise Multi-Region Disaster Failover & Live Active-Active Database Replication Mesh (v5.2.0)
 *
 * Tables:
 * - replication_mesh_nodes: Global topology of database nodes, roles, replication lag, and GTID offsets
 * - replication_heartbeat_events: Telemetry log of continuous node health, TPS, lag, and round-trip latency
 * - failover_quorum_events: Raft-style quorum election records, fencing tokens, and split-brain resolution trails
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Replication Mesh Nodes
  if (!(await knex.schema.hasTable('replication_mesh_nodes'))) {
    await knex.schema.createTable('replication_mesh_nodes', (table) => {
      table.string('id', 36).primary();
      table.string('region_code', 32).notNullable().index('idx_rmn_region');
      table.string('node_name', 96).notNullable().unique('uq_rmn_name');
      table.string('role', 32).notNullable().defaultTo('read_replica').index('idx_rmn_role');
      table.string('status', 32).notNullable().defaultTo('healthy').index('idx_rmn_status');
      table.integer('replication_lag_ms').notNullable().defaultTo(0);
      table.string('applied_gtid_set', 255).notNullable().defaultTo('00000000-0000-0000-0000-000000000001:1-1000');
      table.string('retrieved_gtid_set', 255).notNullable().defaultTo('00000000-0000-0000-0000-000000000001:1-1000');
      table.string('ip_address', 64).notNullable().defaultTo('10.0.1.10');
      table.integer('port').notNullable().defaultTo(3306);
      table.boolean('is_write_eligible').notNullable().defaultTo(false);
      table.integer('heartbeat_interval_sec').notNullable().defaultTo(5);
      table.dateTime('last_heartbeat_at').notNullable().defaultTo(knex.fn.now());
      table.json('metadata').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Replication Heartbeat Events
  if (!(await knex.schema.hasTable('replication_heartbeat_events'))) {
    await knex.schema.createTable('replication_heartbeat_events', (table) => {
      table.string('id', 36).primary();
      table.string('node_id', 36).notNullable().references('id').inTable('replication_mesh_nodes').onDelete('CASCADE').index('idx_rhe_node');
      table.string('region_code', 32).notNullable().index('idx_rhe_region');
      table.integer('lag_ms').notNullable().defaultTo(0);
      table.decimal('commit_throughput_tps', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('cpu_utilization_percent', 5, 2).notNullable().defaultTo(0.00);
      table.decimal('network_rtt_ms', 6, 2).notNullable().defaultTo(0.00);
      table.string('status', 32).notNullable().defaultTo('healthy');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now()).index('idx_rhe_created');
    });
  }

  // 3. Failover Quorum Events
  if (!(await knex.schema.hasTable('failover_quorum_events'))) {
    await knex.schema.createTable('failover_quorum_events', (table) => {
      table.string('id', 36).primary();
      table.string('incident_id', 64).notNullable().index('idx_fqe_incident');
      table.string('triggered_by', 48).notNullable().defaultTo('automated_health_monitor');
      table.string('previous_leader_id', 36).nullable().references('id').inTable('replication_mesh_nodes').onDelete('SET NULL');
      table.string('promoted_leader_id', 36).notNullable().references('id').inTable('replication_mesh_nodes').onDelete('CASCADE');
      table.integer('quorum_votes_for').notNullable().defaultTo(3);
      table.integer('quorum_votes_against').notNullable().defaultTo(0);
      table.integer('quorum_nodes_total').notNullable().defaultTo(5);
      table.string('outcome', 32).notNullable().defaultTo('promoted').index('idx_fqe_outcome');
      table.boolean('split_brain_mitigated').notNullable().defaultTo(true);
      table.integer('fencing_token').notNullable().defaultTo(1001);
      table.json('details').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Pre-seed Core Replication Mesh Topology
  const existingNodes = await knex('replication_mesh_nodes').count('id as count').first();
  if (Number(existingNodes?.count || 0) === 0) {
    const now = new Date();
    const systemNodes = [
      {
        id: 'node-iad-leader-01',
        region_code: 'us-east-1',
        node_name: 'iad-db-primary-01',
        role: 'leader_primary',
        status: 'healthy',
        replication_lag_ms: 0,
        applied_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
        retrieved_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
        ip_address: '10.100.1.10',
        port: 3306,
        is_write_eligible: true,
        heartbeat_interval_sec: 5,
        last_heartbeat_at: now,
        metadata: JSON.stringify({ provider: 'aws', datacenter: 'us-east-1a', engine_version: 'MySQL 8.4-LTS' }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'node-pdx-standby-02',
        region_code: 'us-west-2',
        node_name: 'pdx-db-standby-02',
        role: 'hot_standby',
        status: 'healthy',
        replication_lag_ms: 12,
        applied_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245888',
        retrieved_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
        ip_address: '10.101.1.10',
        port: 3306,
        is_write_eligible: true,
        heartbeat_interval_sec: 5,
        last_heartbeat_at: now,
        metadata: JSON.stringify({ provider: 'aws', datacenter: 'us-west-2b', engine_version: 'MySQL 8.4-LTS' }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'node-fra-replica-03',
        region_code: 'eu-central-1',
        node_name: 'fra-db-replica-03',
        role: 'read_replica',
        status: 'healthy',
        replication_lag_ms: 38,
        applied_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245882',
        retrieved_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245886',
        ip_address: '10.102.1.10',
        port: 3306,
        is_write_eligible: false,
        heartbeat_interval_sec: 5,
        last_heartbeat_at: now,
        metadata: JSON.stringify({ provider: 'aws', datacenter: 'eu-central-1a', engine_version: 'MySQL 8.4-LTS' }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'node-sin-replica-04',
        region_code: 'ap-southeast-1',
        node_name: 'sin-db-replica-04',
        role: 'read_replica',
        status: 'healthy',
        replication_lag_ms: 64,
        applied_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245875',
        retrieved_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245880',
        ip_address: '10.103.1.10',
        port: 3306,
        is_write_eligible: false,
        heartbeat_interval_sec: 5,
        last_heartbeat_at: now,
        metadata: JSON.stringify({ provider: 'aws', datacenter: 'ap-southeast-1b', engine_version: 'MySQL 8.4-LTS' }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'node-ord-witness-05',
        region_code: 'us-central-1',
        node_name: 'ord-db-witness-05',
        role: 'witness_arbiter',
        status: 'healthy',
        replication_lag_ms: 0,
        applied_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
        retrieved_gtid_set: '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
        ip_address: '10.104.1.10',
        port: 3306,
        is_write_eligible: false,
        heartbeat_interval_sec: 5,
        last_heartbeat_at: now,
        metadata: JSON.stringify({ provider: 'gcp', datacenter: 'us-central1-c', role_description: 'Tie-breaker Quorum Witness' }),
        created_at: now,
        updated_at: now,
      },
    ];

    await knex('replication_mesh_nodes').insert(systemNodes);

    // Initial heartbeats
    const initialHeartbeats = [
      {
        id: 'hb-iad-01',
        node_id: 'node-iad-leader-01',
        region_code: 'us-east-1',
        lag_ms: 0,
        commit_throughput_tps: 420.50,
        cpu_utilization_percent: 41.20,
        network_rtt_ms: 1.20,
        status: 'healthy',
        created_at: now,
      },
      {
        id: 'hb-pdx-02',
        node_id: 'node-pdx-standby-02',
        region_code: 'us-west-2',
        lag_ms: 12,
        commit_throughput_tps: 415.00,
        cpu_utilization_percent: 28.50,
        network_rtt_ms: 54.30,
        status: 'healthy',
        created_at: now,
      },
      {
        id: 'hb-fra-03',
        node_id: 'node-fra-replica-03',
        region_code: 'eu-central-1',
        lag_ms: 38,
        commit_throughput_tps: 185.00,
        cpu_utilization_percent: 22.00,
        network_rtt_ms: 88.60,
        status: 'healthy',
        created_at: now,
      },
      {
        id: 'hb-sin-04',
        node_id: 'node-sin-replica-04',
        region_code: 'ap-southeast-1',
        lag_ms: 64,
        commit_throughput_tps: 120.00,
        cpu_utilization_percent: 18.40,
        network_rtt_ms: 172.10,
        status: 'healthy',
        created_at: now,
      },
      {
        id: 'hb-ord-05',
        node_id: 'node-ord-witness-05',
        region_code: 'us-central-1',
        lag_ms: 0,
        commit_throughput_tps: 0.00,
        cpu_utilization_percent: 4.10,
        network_rtt_ms: 22.40,
        status: 'healthy',
        created_at: now,
      },
    ];

    await knex('replication_heartbeat_events').insert(initialHeartbeats);

    // Initial Quorum election history record
    await knex('failover_quorum_events').insert({
      id: 'fqe-bootstrap-01',
      incident_id: 'INC-BOOTSTRAP-QUORUM-001',
      triggered_by: 'automated_health_monitor',
      previous_leader_id: null,
      promoted_leader_id: 'node-iad-leader-01',
      quorum_votes_for: 4,
      quorum_votes_against: 0,
      quorum_nodes_total: 5,
      outcome: 'promoted',
      split_brain_mitigated: true,
      fencing_token: 1001,
      details: JSON.stringify({ notes: 'Initial cluster consensus bootstrap quorum reached successfully.' }),
      created_at: now,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('failover_quorum_events');
  await knex.schema.dropTableIfExists('replication_heartbeat_events');
  await knex.schema.dropTableIfExists('replication_mesh_nodes');
}
