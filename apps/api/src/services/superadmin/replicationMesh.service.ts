/**
 * Enterprise Multi-Region Disaster Failover & Live Active-Active Database Replication Mesh Service
 * SocialForge Platform v5.2.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import type {
  ReplicationNode,
  ReplicationNodeRole,
  ReplicationNodeStatus,
  ReplicationHeartbeatEvent,
  FailoverQuorumEvent,
  MeshTopologyTelemetry,
  CreateReplicationNodeInput,
  UpdateReplicationNodeInput,
  FailoverExecutionRequest,
  FailoverSimulationResult,
} from '@socialforge/shared';

export class ReplicationMeshError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ReplicationMeshError';
  }
}

interface Actor {
  id: string;
  email: string;
}

export class ReplicationMeshService {
  private mapNode(row: any): ReplicationNode {
    return {
      id: row.id,
      region_code: row.region_code,
      node_name: row.node_name,
      role: row.role as ReplicationNodeRole,
      status: row.status as ReplicationNodeStatus,
      replication_lag_ms: Number(row.replication_lag_ms || 0),
      applied_gtid_set: row.applied_gtid_set,
      retrieved_gtid_set: row.retrieved_gtid_set,
      ip_address: row.ip_address,
      port: Number(row.port || 3306),
      is_write_eligible: Boolean(row.is_write_eligible),
      heartbeat_interval_sec: Number(row.heartbeat_interval_sec || 5),
      last_heartbeat_at: row.last_heartbeat_at ? new Date(row.last_heartbeat_at).toISOString() : new Date().toISOString(),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private mapHeartbeat(row: any): ReplicationHeartbeatEvent {
    return {
      id: row.id,
      node_id: row.node_id,
      region_code: row.region_code,
      lag_ms: Number(row.lag_ms || 0),
      commit_throughput_tps: Number(row.commit_throughput_tps || 0),
      cpu_utilization_percent: Number(row.cpu_utilization_percent || 0),
      network_rtt_ms: Number(row.network_rtt_ms || 0),
      status: row.status as ReplicationNodeStatus,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private mapFailover(row: any): FailoverQuorumEvent {
    return {
      id: row.id,
      incident_id: row.incident_id,
      triggered_by: row.triggered_by,
      previous_leader_id: row.previous_leader_id || null,
      promoted_leader_id: row.promoted_leader_id,
      quorum_votes_for: Number(row.quorum_votes_for || 0),
      quorum_votes_against: Number(row.quorum_votes_against || 0),
      quorum_nodes_total: Number(row.quorum_nodes_total || 0),
      outcome: row.outcome,
      split_brain_mitigated: Boolean(row.split_brain_mitigated),
      fencing_token: Number(row.fencing_token || 1000),
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details || null,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private async auditLog(
    actor: Actor,
    action: string,
    targetResourceId: string,
    reason: string,
    details?: any
  ): Promise<void> {
    try {
      await db('superadmin_audit_logs').insert({
        id: crypto.randomUUID(),
        superadmin_id: actor.id,
        superadmin_email: actor.email,
        action,
        target_resource_type: 'replication_mesh',
        target_resource_id: targetResourceId,
        reason,
        details: details ? JSON.stringify(details) : null,
        created_at: new Date(),
      });
    } catch (err: any) {
      console.warn('[ReplicationMeshService] Audit log failed:', err.message);
    }
  }

  // 1. Telemetry Overview
  async getTopologyTelemetry(): Promise<MeshTopologyTelemetry> {
    const nodes = await db('replication_mesh_nodes').select('*');
    const totalNodes = nodes.length;
    const healthyNodes = nodes.filter((n) => n.status === 'healthy').length;
    const leaderRow = nodes.find((n) => n.role === 'leader_primary') || null;
    const leaderNode = leaderRow ? this.mapNode(leaderRow) : null;

    const nonLeaderNodes = nodes.filter((n) => n.role !== 'leader_primary' && n.role !== 'witness_arbiter');
    const totalLag = nonLeaderNodes.reduce((acc, curr) => acc + Number(curr.replication_lag_ms || 0), 0);
    const averageLagMs = nonLeaderNodes.length > 0 ? Math.round(totalLag / nonLeaderNodes.length) : 0;
    const maxLagMs = nonLeaderNodes.reduce((max, curr) => Math.max(max, Number(curr.replication_lag_ms || 0)), 0);

    let quorumStatus: 'quorate' | 'degraded_quorum' | 'lost_quorum' = 'lost_quorum';
    if (totalNodes > 0) {
      const quorumThreshold = totalNodes / 2;
      if (healthyNodes > quorumThreshold) {
        quorumStatus = 'quorate';
      } else if (healthyNodes === Math.floor(quorumThreshold)) {
        quorumStatus = 'degraded_quorum';
      } else {
        quorumStatus = 'lost_quorum';
      }
    }

    const uniqueRegions = new Set(nodes.map((n) => n.region_code));

    const failoverRows = await db('failover_quorum_events')
      .orderBy('created_at', 'desc')
      .limit(10);
    const recentFailovers = failoverRows.map((r) => this.mapFailover(r));

    const crossRegionRTTMs: Record<string, number> = {
      'us-east-1 <-> us-west-2': 54.3,
      'us-east-1 <-> eu-central-1': 88.6,
      'us-east-1 <-> ap-southeast-1': 172.1,
      'us-east-1 <-> us-central-1': 22.4,
    };

    return {
      totalNodes,
      healthyNodes,
      leaderNode,
      averageLagMs,
      maxLagMs,
      quorumStatus,
      activeRegionCount: uniqueRegions.size,
      recentFailovers,
      crossRegionRTTMs,
    };
  }

  // 2. Node Operations
  async getNodes(filter?: { region_code?: string; role?: string; status?: string }): Promise<ReplicationNode[]> {
    let query = db('replication_mesh_nodes').select('*').orderBy('created_at', 'asc');
    if (filter?.region_code) {
      query = query.where({ region_code: filter.region_code });
    }
    if (filter?.role) {
      query = query.where({ role: filter.role });
    }
    if (filter?.status) {
      query = query.where({ status: filter.status });
    }
    const rows = await query;
    return rows.map((r) => this.mapNode(r));
  }

  async getNodeById(id: string): Promise<ReplicationNode> {
    const row = await db('replication_mesh_nodes').where({ id }).first();
    if (!row) {
      throw new ReplicationMeshError(404, `Replication node not found with ID ${id}`);
    }
    return this.mapNode(row);
  }

  async createNode(actor: Actor, input: CreateReplicationNodeInput): Promise<ReplicationNode> {
    if (!input.region_code || typeof input.region_code !== 'string') {
      throw new ReplicationMeshError(400, 'region_code is required and must be a valid identifier.');
    }
    if (!input.node_name || typeof input.node_name !== 'string' || input.node_name.trim().length < 3) {
      throw new ReplicationMeshError(400, 'node_name must be at least 3 characters long.');
    }
    if (!['leader_primary', 'hot_standby', 'read_replica', 'witness_arbiter'].includes(input.role)) {
      throw new ReplicationMeshError(400, `Invalid role: ${input.role}`);
    }
    if (!input.ip_address || typeof input.ip_address !== 'string') {
      throw new ReplicationMeshError(400, 'ip_address is required.');
    }

    const existingName = await db('replication_mesh_nodes')
      .where({ node_name: input.node_name.trim() })
      .first();
    if (existingName) {
      throw new ReplicationMeshError(409, `Node with name "${input.node_name}" already exists.`);
    }

    // If new node is specified as leader_primary, demote any existing leader
    if (input.role === 'leader_primary') {
      await db('replication_mesh_nodes')
        .where({ role: 'leader_primary' })
        .update({
          role: 'hot_standby',
          is_write_eligible: false,
          updated_at: new Date(),
        });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    await db('replication_mesh_nodes').insert({
      id,
      region_code: input.region_code.trim().toLowerCase(),
      node_name: input.node_name.trim(),
      role: input.role,
      status: 'healthy',
      replication_lag_ms: input.role === 'leader_primary' ? 0 : 5,
      applied_gtid_set: input.applied_gtid_set || '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
      retrieved_gtid_set: input.retrieved_gtid_set || '3a7b91d2-0001-44e1-b4f0-82a17fbc9901:1-245890',
      ip_address: input.ip_address.trim(),
      port: input.port || 3306,
      is_write_eligible: input.role === 'leader_primary' ? true : Boolean(input.is_write_eligible),
      heartbeat_interval_sec: input.heartbeat_interval_sec || 5,
      last_heartbeat_at: now,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: now,
      updated_at: now,
    });

    await this.auditLog(
      actor,
      'CREATE_REPLICATION_NODE',
      id,
      `Provisioned database node ${input.node_name} in region ${input.region_code} with role ${input.role}`
    );

    return this.getNodeById(id);
  }

  async updateNode(actor: Actor, id: string, input: UpdateReplicationNodeInput): Promise<ReplicationNode> {
    const existing = await db('replication_mesh_nodes').where({ id }).first();
    if (!existing) {
      throw new ReplicationMeshError(404, `Replication node not found with ID ${id}`);
    }

    const updates: any = { updated_at: new Date() };

    if (input.status) {
      if (!['healthy', 'degraded', 'failing', 'offline', 'recovering'].includes(input.status)) {
        throw new ReplicationMeshError(400, `Invalid status: ${input.status}`);
      }
      updates.status = input.status;
    }

    if (input.role) {
      if (!['leader_primary', 'hot_standby', 'read_replica', 'witness_arbiter'].includes(input.role)) {
        throw new ReplicationMeshError(400, `Invalid role: ${input.role}`);
      }
      if (input.role === 'leader_primary' && existing.role !== 'leader_primary') {
        // Demote existing leader
        await db('replication_mesh_nodes')
          .where({ role: 'leader_primary' })
          .update({
            role: 'hot_standby',
            is_write_eligible: false,
            updated_at: new Date(),
          });
        updates.is_write_eligible = true;
      }
      updates.role = input.role;
    }

    if (typeof input.replication_lag_ms === 'number') {
      if (input.replication_lag_ms < 0) {
        throw new ReplicationMeshError(400, 'replication_lag_ms cannot be negative.');
      }
      updates.replication_lag_ms = input.replication_lag_ms;
    }

    if (typeof input.is_write_eligible === 'boolean') {
      updates.is_write_eligible = input.is_write_eligible;
    }

    if (input.applied_gtid_set) updates.applied_gtid_set = input.applied_gtid_set;
    if (input.retrieved_gtid_set) updates.retrieved_gtid_set = input.retrieved_gtid_set;
    if (input.metadata) updates.metadata = JSON.stringify(input.metadata);

    await db('replication_mesh_nodes').where({ id }).update(updates);

    await this.auditLog(
      actor,
      'UPDATE_REPLICATION_NODE',
      id,
      `Updated node parameters for ${existing.node_name}`,
      updates
    );

    return this.getNodeById(id);
  }

  async deleteNode(actor: Actor, id: string): Promise<{ deleted: boolean; id: string }> {
    const existing = await db('replication_mesh_nodes').where({ id }).first();
    if (!existing) {
      throw new ReplicationMeshError(404, `Replication node not found with ID ${id}`);
    }

    if (existing.role === 'leader_primary') {
      throw new ReplicationMeshError(
        400,
        `Cannot delete active leader_primary node "${existing.node_name}". Perform failover election first.`
      );
    }

    await db('replication_mesh_nodes').where({ id }).delete();

    await this.auditLog(
      actor,
      'DELETE_REPLICATION_NODE',
      id,
      `Decommissioned and deleted node ${existing.node_name} from region ${existing.region_code}`
    );

    return { deleted: true, id };
  }

  // 3. Heartbeats
  async recordHeartbeat(
    actor: Actor,
    nodeId: string,
    data: Partial<ReplicationHeartbeatEvent>
  ): Promise<ReplicationHeartbeatEvent> {
    const node = await db('replication_mesh_nodes').where({ id: nodeId }).first();
    if (!node) {
      throw new ReplicationMeshError(404, `Replication node not found with ID ${nodeId}`);
    }

    const lagMs = typeof data.lag_ms === 'number' ? data.lag_ms : node.replication_lag_ms;
    const status = (data.status as ReplicationNodeStatus) || (lagMs > 100 ? 'degraded' : 'healthy');
    const now = new Date();

    // Update node health
    await db('replication_mesh_nodes').where({ id: nodeId }).update({
      replication_lag_ms: lagMs,
      status,
      last_heartbeat_at: now,
      updated_at: now,
    });

    const hbId = crypto.randomUUID();
    await db('replication_heartbeat_events').insert({
      id: hbId,
      node_id: nodeId,
      region_code: node.region_code,
      lag_ms: lagMs,
      commit_throughput_tps: data.commit_throughput_tps || 250.0,
      cpu_utilization_percent: data.cpu_utilization_percent || 25.0,
      network_rtt_ms: data.network_rtt_ms || 10.0,
      status,
      created_at: now,
    });

    const inserted = await db('replication_heartbeat_events').where({ id: hbId }).first();
    return this.mapHeartbeat(inserted);
  }

  async getHeartbeats(nodeId?: string, limit = 50): Promise<ReplicationHeartbeatEvent[]> {
    let query = db('replication_heartbeat_events').orderBy('created_at', 'desc').limit(limit);
    if (nodeId) {
      query = query.where({ node_id: nodeId });
    }
    const rows = await query;
    return rows.map((r) => this.mapHeartbeat(r));
  }

  // 4. Failover Simulation & Execution
  async simulateFailover(candidateNodeId: string): Promise<FailoverSimulationResult> {
    const candidateRow = await db('replication_mesh_nodes').where({ id: candidateNodeId }).first();
    if (!candidateRow) {
      throw new ReplicationMeshError(404, `Candidate node not found with ID ${candidateNodeId}`);
    }
    const candidateNode = this.mapNode(candidateRow);

    const leaderRow = await db('replication_mesh_nodes').where({ role: 'leader_primary' }).first();
    const currentLeader = leaderRow ? this.mapNode(leaderRow) : null;

    const allNodes = await db('replication_mesh_nodes').select('*');
    const healthyCount = allNodes.filter((n) => n.status === 'healthy').length;
    const totalCount = allNodes.length;

    const quorumVotesFor = healthyCount;
    const quorumVotesAgainst = totalCount - healthyCount;
    const quorate = quorumVotesFor > totalCount / 2;

    const lagMs = candidateNode.replication_lag_ms;
    const warnings: string[] = [];

    let verdict: 'SAFE_FOR_FAILOVER' | 'ELEVATED_RISK_LAG' | 'QUORUM_UNAVAILABLE' | 'SPLIT_BRAIN_RISK' =
      'SAFE_FOR_FAILOVER';

    if (candidateNode.role === 'witness_arbiter') {
      verdict = 'SPLIT_BRAIN_RISK';
      warnings.push('Witness arbiter nodes cannot be promoted to leader_primary.');
    } else if (candidateNode.status === 'offline' || candidateNode.status === 'failing') {
      verdict = 'SPLIT_BRAIN_RISK';
      warnings.push(`Candidate node is in ${candidateNode.status} state. High risk of split-brain.`);
    } else if (!quorate) {
      verdict = 'QUORUM_UNAVAILABLE';
      warnings.push(
        `Quorum threshold not met (${quorumVotesFor}/${totalCount} votes). Failover cannot guarantee consensus.`
      );
    } else if (lagMs > 30) {
      verdict = 'ELEVATED_RISK_LAG';
      warnings.push(
        `Replication lag is ${lagMs}ms (threshold 30ms). Minor asynchronous replication loss possible.`
      );
    }

    const lastFailover = await db('failover_quorum_events')
      .orderBy('fencing_token', 'desc')
      .first();
    const nextFencingToken = (Number(lastFailover?.fencing_token) || 1000) + 1;

    return {
      eligible: verdict === 'SAFE_FOR_FAILOVER' || verdict === 'ELEVATED_RISK_LAG',
      currentLeader,
      candidateNode,
      replicationLagMs: lagMs,
      estimatedDataLossSeconds: Math.round((lagMs / 1000) * 100) / 100,
      quorumVotesEstimated: {
        for: quorumVotesFor,
        against: quorumVotesAgainst,
        total: totalCount,
        quorate,
      },
      fencingTokenAllocated: nextFencingToken,
      verdict,
      warnings,
    };
  }

  async executeFailover(
    actor: Actor,
    request: FailoverExecutionRequest
  ): Promise<{
    success: boolean;
    promotedNode: ReplicationNode;
    previousLeader: ReplicationNode | null;
    failoverEvent: FailoverQuorumEvent;
  }> {
    if (!request.promoted_node_id) {
      throw new ReplicationMeshError(400, 'promoted_node_id is required.');
    }
    if (!request.reason || request.reason.trim().length < 5) {
      throw new ReplicationMeshError(400, 'A valid failover reason (minimum 5 characters) is required.');
    }

    const candidate = await db('replication_mesh_nodes').where({ id: request.promoted_node_id }).first();
    if (!candidate) {
      throw new ReplicationMeshError(404, `Candidate node not found with ID ${request.promoted_node_id}`);
    }

    if (candidate.role === 'witness_arbiter') {
      throw new ReplicationMeshError(400, 'Witness arbiter nodes cannot be promoted to leader_primary.');
    }

    if ((candidate.status === 'offline' || candidate.status === 'failing') && !request.force) {
      throw new ReplicationMeshError(
        400,
        `Candidate node is currently ${candidate.status}. Pass force=true to override safety guardrails.`
      );
    }

    // Demote current leader
    const currentLeader = await db('replication_mesh_nodes').where({ role: 'leader_primary' }).first();
    const now = new Date();

    if (currentLeader && currentLeader.id !== candidate.id) {
      await db('replication_mesh_nodes').where({ id: currentLeader.id }).update({
        role: 'hot_standby',
        is_write_eligible: false,
        updated_at: now,
      });
    }

    // Promote candidate
    await db('replication_mesh_nodes').where({ id: candidate.id }).update({
      role: 'leader_primary',
      status: 'healthy',
      replication_lag_ms: 0,
      is_write_eligible: true,
      last_heartbeat_at: now,
      updated_at: now,
    });

    // Fencing token increment
    const lastEvent = await db('failover_quorum_events').orderBy('fencing_token', 'desc').first();
    const fencingToken = (Number(lastEvent?.fencing_token) || 1000) + 1;

    const allNodes = await db('replication_mesh_nodes').select('id', 'status');
    const votesFor = allNodes.filter((n) => n.status === 'healthy').length;
    const incidentId = `FAILOVER-${Date.now().toString(36).toUpperCase()}`;

    const eventId = crypto.randomUUID();
    await db('failover_quorum_events').insert({
      id: eventId,
      incident_id: incidentId,
      triggered_by: 'manual_superadmin_override',
      previous_leader_id: currentLeader ? currentLeader.id : null,
      promoted_leader_id: candidate.id,
      quorum_votes_for: votesFor,
      quorum_votes_against: allNodes.length - votesFor,
      quorum_nodes_total: allNodes.length,
      outcome: 'promoted',
      split_brain_mitigated: true,
      fencing_token: fencingToken,
      details: JSON.stringify({
        reason: request.reason,
        forced: Boolean(request.force),
        operator_id: actor.id,
        operator_email: actor.email,
      }),
      created_at: now,
    });

    await this.auditLog(
      actor,
      'EXECUTE_FAILOVER',
      candidate.id,
      `Executed failover promotion of node ${candidate.node_name}. Reason: ${request.reason}`,
      { fencingToken, incidentId, previousLeaderId: currentLeader?.id }
    );

    const promotedNode = await this.getNodeById(candidate.id);
    const previousNode = currentLeader ? await this.getNodeById(currentLeader.id) : null;
    const failoverEventRow = await db('failover_quorum_events').where({ id: eventId }).first();

    return {
      success: true,
      promotedNode,
      previousLeader: previousNode,
      failoverEvent: this.mapFailover(failoverEventRow),
    };
  }

  async getFailoverEvents(limit = 50): Promise<FailoverQuorumEvent[]> {
    const rows = await db('failover_quorum_events').orderBy('created_at', 'desc').limit(limit);
    return rows.map((r) => this.mapFailover(r));
  }
}

export const replicationMeshService = new ReplicationMeshService();
