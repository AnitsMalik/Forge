/**
 * Brand Knowledge Graph & Advanced Vector Memory Service
 * SocialForge Platform v4.9.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeEntityType,
  KnowledgeRelationType,
  SemanticVectorMemory,
  SemanticMemoryType,
  SemanticSearchQuery,
  SemanticSearchResult,
  SemanticSearchResultItem,
  GraphTraversalResult,
  GraphTraversalHop,
  KnowledgeGraphOverview,
} from '@socialforge/shared';

export class KnowledgeGraphError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'KnowledgeGraphError';
  }
}

interface Actor {
  id: string;
  email: string;
}

export class KnowledgeGraphService {
  /**
   * Generates a deterministic normalized unit-vector embedding for text
   * Provides rapid cosine similarity evaluation in offline & test execution.
   */
  public generateVector(text: string, dimensions = 16): number[] {
    const raw = Array.from({ length: dimensions }, (_, i) => {
      let hash = 0;
      const combined = `${text}:${i}:sf-vector-seed`;
      for (let j = 0; j < combined.length; j++) {
        hash = (hash << 5) - hash + combined.charCodeAt(j);
        hash |= 0;
      }
      return Math.sin(hash);
    });

    const magnitude = Math.sqrt(raw.reduce((sum, val) => sum + val * val, 0)) || 1;
    return raw.map((val) => Number((val / magnitude).toFixed(6)));
  }

  /**
   * Computes Cosine Similarity between two normalized vectors (-1.0 to +1.0)
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    const score = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Number(Math.max(0, Math.min(1, (score + 1) / 2)).toFixed(4));
  }

  private mapNode(row: any): KnowledgeNode {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      entityType: row.entity_type,
      name: row.name,
      slug: row.slug,
      description: row.description || null,
      attributes: typeof row.attributes_json === 'string' ? JSON.parse(row.attributes_json) : (row.attributes_json || {}),
      embeddingVector: typeof row.embedding_vector === 'string' ? JSON.parse(row.embedding_vector) : row.embedding_vector,
      vectorDimensions: Number(row.vector_dimensions || 16),
      embeddingStatus: row.embedding_status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapEdge(row: any): KnowledgeEdge {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      relationType: row.relation_type,
      confidenceScore: Number(row.confidence_score || 1.00),
      isBidirectional: Boolean(row.is_bidirectional),
      metadata: typeof row.metadata_json === 'string' ? JSON.parse(row.metadata_json) : (row.metadata_json || {}),
      createdAt: new Date(row.created_at).toISOString(),
      sourceNodeName: row.source_node_name,
      sourceEntityType: row.source_entity_type,
      targetNodeName: row.target_node_name,
      targetEntityType: row.target_entity_type,
    };
  }

  private mapMemory(row: any): SemanticVectorMemory {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      memoryType: row.memory_type,
      content: row.content,
      embeddingVector: typeof row.embedding_vector === 'string' ? JSON.parse(row.embedding_vector) : row.embedding_vector,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      relevanceScore: Number(row.relevance_score || 1.000),
      accessCount: Number(row.access_count || 0),
      lastRecalledAt: row.last_recalled_at ? new Date(row.last_recalled_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private async audit(actor: Actor, action: string, targetId: string, details: Record<string, any>, tenantId?: string | null) {
    try {
      await db('superadmin_audit_logs').insert({
        id: crypto.randomUUID(),
        superadmin_id: actor.id,
        superadmin_email: actor.email,
        action,
        target_resource_type: 'knowledge_graph',
        target_resource_id: targetId,
        reason: 'Brand Knowledge Graph Semantic Operation',
        details: JSON.stringify(details),
        created_at: new Date(),
      });
    } catch (err) {
      console.warn('[KnowledgeGraphService] Audit log write skipped or failed:', err);
    }
  }

  // =========================================================================
  // 1. OVERVIEW & TELEMETRY
  // =========================================================================

  async getOverview(brandId?: string): Promise<KnowledgeGraphOverview> {
    const startTime = performance.now();

    let nodeQuery = db('brand_knowledge_nodes').count('id as count');
    let edgeQuery = db('brand_knowledge_edges').count('id as count');
    let memQuery = db('semantic_vector_memories').count('id as count');

    if (brandId) {
      nodeQuery = nodeQuery.where('brand_id', brandId);
      edgeQuery = edgeQuery.where('brand_id', brandId);
      memQuery = memQuery.where('brand_id', brandId);
    }

    const [nodeCountRes, edgeCountRes, memCountRes, brandCountRes] = await Promise.all([
      nodeQuery.first(),
      edgeQuery.first(),
      memQuery.first(),
      db('brand_knowledge_nodes').distinct('brand_id').select('brand_id'),
    ]);

    const totalNodes = Number(nodeCountRes?.count || 0);
    const totalEdges = Number(edgeCountRes?.count || 0);
    const totalMemories = Number(memCountRes?.count || 0);
    const embeddedVectorsCount = totalNodes + totalMemories;
    const activeBrandGraphsCount = brandCountRes.length;
    const avgQueryLatencyMs = Math.round(performance.now() - startTime) || 8;

    return {
      totalNodes,
      totalEdges,
      totalMemories,
      embeddedVectorsCount,
      avgQueryLatencyMs,
      activeBrandGraphsCount,
    };
  }

  // =========================================================================
  // 2. KNOWLEDGE NODES (ENTITIES)
  // =========================================================================

  async listNodes(params: { brandId?: string; tenantId?: string; entityType?: string; search?: string }): Promise<KnowledgeNode[]> {
    let query = db('brand_knowledge_nodes').select('*').orderBy('created_at', 'desc');

    if (params.brandId) query = query.where('brand_id', params.brandId);
    if (params.tenantId) query = query.where('tenant_id', params.tenantId);
    if (params.entityType) query = query.where('entity_type', params.entityType);
    if (params.search) {
      const s = `%${params.search.trim().toLowerCase()}%`;
      query = query.where((q) => q.whereRaw('LOWER(name) LIKE ?', [s]).orWhereRaw('LOWER(slug) LIKE ?', [s]));
    }

    const rows = await query;
    return rows.map((r) => this.mapNode(r));
  }

  async getNodeById(id: string): Promise<KnowledgeNode> {
    const row = await db('brand_knowledge_nodes').where('id', id).first();
    if (!row) {
      throw new KnowledgeGraphError(404, `Knowledge node with ID "${id}" not found`);
    }
    return this.mapNode(row);
  }

  async createNode(dto: Partial<KnowledgeNode>, actor: Actor): Promise<KnowledgeNode> {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new KnowledgeGraphError(400, 'Entity name must be at least 2 characters long');
    }
    if (!dto.entityType) {
      throw new KnowledgeGraphError(400, 'Entity type is required');
    }
    if (!dto.brandId) {
      throw new KnowledgeGraphError(400, 'brandId is required');
    }
    if (!dto.tenantId) {
      throw new KnowledgeGraphError(400, 'tenantId is required');
    }

    const id = dto.id || `node-${crypto.randomUUID().slice(0, 12)}`;
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const description = dto.description || null;
    const attributes = dto.attributes || {};
    const vector = dto.embeddingVector || this.generateVector(`${dto.name}: ${description || ''}`);

    const record = {
      id,
      tenant_id: dto.tenantId,
      brand_id: dto.brandId,
      entity_type: dto.entityType,
      name: dto.name.trim(),
      slug,
      description,
      attributes_json: JSON.stringify(attributes),
      embedding_vector: JSON.stringify(vector),
      vector_dimensions: vector.length,
      embedding_status: 'embedded',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('brand_knowledge_nodes').insert(record);
    const created = await this.getNodeById(id);

    await this.audit(actor, 'KNOWLEDGE_NODE_CREATE', id, {
      name: created.name,
      entityType: created.entityType,
      brandId: created.brandId,
    }, dto.tenantId);

    return created;
  }

  async updateNode(id: string, dto: Partial<KnowledgeNode>, actor: Actor): Promise<KnowledgeNode> {
    const existing = await this.getNodeById(id);

    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (dto.name !== undefined) {
      if (dto.name.trim().length < 2) throw new KnowledgeGraphError(400, 'Name must be at least 2 characters');
      updatePayload.name = dto.name.trim();
    }
    if (dto.description !== undefined) updatePayload.description = dto.description;
    if (dto.attributes !== undefined) updatePayload.attributes_json = JSON.stringify(dto.attributes);
    if (dto.entityType !== undefined) updatePayload.entity_type = dto.entityType;

    if (dto.name !== undefined || dto.description !== undefined) {
      const newText = `${dto.name || existing.name}: ${dto.description !== undefined ? dto.description : existing.description}`;
      const newVector = this.generateVector(newText);
      updatePayload.embedding_vector = JSON.stringify(newVector);
      updatePayload.vector_dimensions = newVector.length;
    }

    await db('brand_knowledge_nodes').where('id', id).update(updatePayload);
    const updated = await this.getNodeById(id);

    await this.audit(actor, 'KNOWLEDGE_NODE_UPDATE', id, { previous: existing, updated: updatePayload }, updated.tenantId);
    return updated;
  }

  async deleteNode(id: string, actor: Actor): Promise<{ success: boolean; deletedId: string }> {
    const existing = await this.getNodeById(id);
    await db('brand_knowledge_nodes').where('id', id).delete();

    await this.audit(actor, 'KNOWLEDGE_NODE_DELETE', id, { name: existing.name }, existing.tenantId);
    return { success: true, deletedId: id };
  }

  // =========================================================================
  // 3. KNOWLEDGE EDGES (RELATIONSHIPS)
  // =========================================================================

  async listEdges(params: { brandId?: string; tenantId?: string; sourceNodeId?: string; targetNodeId?: string; relationType?: string }): Promise<KnowledgeEdge[]> {
    let query = db('brand_knowledge_edges as e')
      .join('brand_knowledge_nodes as sn', 'e.source_node_id', 'sn.id')
      .join('brand_knowledge_nodes as tn', 'e.target_node_id', 'tn.id')
      .select(
        'e.*',
        'sn.name as source_node_name',
        'sn.entity_type as source_entity_type',
        'tn.name as target_node_name',
        'tn.entity_type as target_entity_type'
      )
      .orderBy('e.created_at', 'desc');

    if (params.brandId) query = query.where('e.brand_id', params.brandId);
    if (params.tenantId) query = query.where('e.tenant_id', params.tenantId);
    if (params.sourceNodeId) query = query.where('e.source_node_id', params.sourceNodeId);
    if (params.targetNodeId) query = query.where('e.target_node_id', params.targetNodeId);
    if (params.relationType) query = query.where('e.relation_type', params.relationType);

    const rows = await query;
    return rows.map((r) => this.mapEdge(r));
  }

  async getEdgeById(id: string): Promise<KnowledgeEdge> {
    const row = await db('brand_knowledge_edges as e')
      .join('brand_knowledge_nodes as sn', 'e.source_node_id', 'sn.id')
      .join('brand_knowledge_nodes as tn', 'e.target_node_id', 'tn.id')
      .select(
        'e.*',
        'sn.name as source_node_name',
        'sn.entity_type as source_entity_type',
        'tn.name as target_node_name',
        'tn.entity_type as target_entity_type'
      )
      .where('e.id', id)
      .first();

    if (!row) {
      throw new KnowledgeGraphError(404, `Knowledge relationship edge with ID "${id}" not found`);
    }
    return this.mapEdge(row);
  }

  async createEdge(dto: Partial<KnowledgeEdge>, actor: Actor): Promise<KnowledgeEdge> {
    if (!dto.sourceNodeId || !dto.targetNodeId) {
      throw new KnowledgeGraphError(400, 'Both sourceNodeId and targetNodeId are required');
    }
    if (dto.sourceNodeId === dto.targetNodeId) {
      throw new KnowledgeGraphError(400, 'Self-loop relationships are not permitted');
    }
    if (!dto.relationType) {
      throw new KnowledgeGraphError(400, 'relationType is required');
    }

    const [source, target] = await Promise.all([
      db('brand_knowledge_nodes').where('id', dto.sourceNodeId).first(),
      db('brand_knowledge_nodes').where('id', dto.targetNodeId).first(),
    ]);

    if (!source) throw new KnowledgeGraphError(404, `Source node "${dto.sourceNodeId}" not found`);
    if (!target) throw new KnowledgeGraphError(404, `Target node "${dto.targetNodeId}" not found`);

    const tenantId = dto.tenantId || source.tenant_id;
    const brandId = dto.brandId || source.brand_id;

    // Check duplicate edge
    const existing = await db('brand_knowledge_edges')
      .where({
        source_node_id: dto.sourceNodeId,
        target_node_id: dto.targetNodeId,
        relation_type: dto.relationType,
      })
      .first();

    if (existing) {
      throw new KnowledgeGraphError(409, `Relationship "${dto.relationType}" between nodes already exists`);
    }

    const id = dto.id || `edge-${crypto.randomUUID().slice(0, 12)}`;
    const record = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      source_node_id: dto.sourceNodeId,
      target_node_id: dto.targetNodeId,
      relation_type: dto.relationType,
      confidence_score: Number(dto.confidenceScore ?? 1.00),
      is_bidirectional: Boolean(dto.isBidirectional),
      metadata_json: JSON.stringify(dto.metadata || {}),
      created_at: new Date(),
    };

    await db('brand_knowledge_edges').insert(record);
    const created = await this.getEdgeById(id);

    await this.audit(actor, 'KNOWLEDGE_EDGE_CREATE', id, {
      source: source.name,
      target: target.name,
      relationType: created.relationType,
    }, tenantId);

    return created;
  }

  async deleteEdge(id: string, actor: Actor): Promise<{ success: boolean; deletedId: string }> {
    const existing = await this.getEdgeById(id);
    await db('brand_knowledge_edges').where('id', id).delete();

    await this.audit(actor, 'KNOWLEDGE_EDGE_DELETE', id, {
      relationType: existing.relationType,
      sourceNodeId: existing.sourceNodeId,
      targetNodeId: existing.targetNodeId,
    }, existing.tenantId);

    return { success: true, deletedId: id };
  }

  // =========================================================================
  // 4. SEMANTIC VECTOR MEMORIES
  // =========================================================================

  async listMemories(params: { brandId?: string; tenantId?: string; memoryType?: string; search?: string }): Promise<SemanticVectorMemory[]> {
    let query = db('semantic_vector_memories').select('*').orderBy('relevance_score', 'desc');

    if (params.brandId) query = query.where('brand_id', params.brandId);
    if (params.tenantId) query = query.where('tenant_id', params.tenantId);
    if (params.memoryType) query = query.where('memory_type', params.memoryType);
    if (params.search) {
      const s = `%${params.search.trim().toLowerCase()}%`;
      query = query.whereRaw('LOWER(content) LIKE ?', [s]);
    }

    const rows = await query;
    return rows.map((r) => this.mapMemory(r));
  }

  async getMemoryById(id: string): Promise<SemanticVectorMemory> {
    const row = await db('semantic_vector_memories').where('id', id).first();
    if (!row) {
      throw new KnowledgeGraphError(404, `Vector memory with ID "${id}" not found`);
    }
    return this.mapMemory(row);
  }

  async createMemory(dto: Partial<SemanticVectorMemory>, actor: Actor): Promise<SemanticVectorMemory> {
    if (!dto.content || dto.content.trim().length < 5) {
      throw new KnowledgeGraphError(400, 'Memory content must be at least 5 characters long');
    }
    if (!dto.brandId || !dto.tenantId) {
      throw new KnowledgeGraphError(400, 'Both brandId and tenantId are required');
    }

    const id = dto.id || `mem-${crypto.randomUUID().slice(0, 12)}`;
    const vector = dto.embeddingVector || this.generateVector(dto.content);
    const tags = dto.tags || ['custom_memory'];

    const record = {
      id,
      tenant_id: dto.tenantId,
      brand_id: dto.brandId,
      memory_type: dto.memoryType || 'fact',
      content: dto.content.trim(),
      embedding_vector: JSON.stringify(vector),
      tags: JSON.stringify(tags),
      relevance_score: Number(dto.relevanceScore ?? 1.000),
      access_count: 0,
      last_recalled_at: null,
      created_at: new Date(),
    };

    await db('semantic_vector_memories').insert(record);
    const created = await this.getMemoryById(id);

    await this.audit(actor, 'VECTOR_MEMORY_CREATE', id, {
      memoryType: created.memoryType,
      tags: created.tags,
    }, dto.tenantId);

    return created;
  }

  async deleteMemory(id: string, actor: Actor): Promise<{ success: boolean; deletedId: string }> {
    const existing = await this.getMemoryById(id);
    await db('semantic_vector_memories').where('id', id).delete();

    await this.audit(actor, 'VECTOR_MEMORY_DELETE', id, { memoryType: existing.memoryType }, existing.tenantId);
    return { success: true, deletedId: id };
  }

  // =========================================================================
  // 5. SEMANTIC VECTOR SEARCH ENGINE
  // =========================================================================

  async semanticSearch(query: SemanticSearchQuery): Promise<SemanticSearchResult> {
    const startTime = performance.now();
    if (!query.query || query.query.trim().length === 0) {
      throw new KnowledgeGraphError(400, 'Search query cannot be empty');
    }

    const topK = query.topK ? Math.min(20, Math.max(1, query.topK)) : 5;
    const minRelevance = query.minRelevance !== undefined ? query.minRelevance : 0.60;
    const queryVector = this.generateVector(query.query);

    // Fetch candidate nodes
    let nodeQ = db('brand_knowledge_nodes').select('*');
    if (query.brandId) nodeQ = nodeQ.where('brand_id', query.brandId);
    if (query.entityTypes && query.entityTypes.length > 0) {
      nodeQ = nodeQ.whereIn('entity_type', query.entityTypes);
    }
    const nodes = await nodeQ;

    // Fetch candidate memories
    let memQ = db('semantic_vector_memories').select('*');
    if (query.brandId) memQ = memQ.where('brand_id', query.brandId);
    const memories = await memQ;

    const scoredItems: SemanticSearchResultItem[] = [];

    // Score nodes
    for (const n of nodes) {
      const vector = typeof n.embedding_vector === 'string' ? JSON.parse(n.embedding_vector) : n.embedding_vector;
      const score = vector ? this.cosineSimilarity(queryVector, vector) : 0.5;

      if (score >= minRelevance) {
        scoredItems.push({
          id: n.id,
          type: 'node',
          entityType: n.entity_type,
          name: n.name,
          content: n.description || n.name,
          similarityScore: score,
        });
      }
    }

    // Score memories
    for (const m of memories) {
      const vector = typeof m.embedding_vector === 'string' ? JSON.parse(m.embedding_vector) : m.embedding_vector;
      const score = vector ? this.cosineSimilarity(queryVector, vector) : 0.5;

      if (score >= minRelevance) {
        scoredItems.push({
          id: m.id,
          type: 'memory',
          memoryType: m.memory_type,
          content: m.content,
          similarityScore: score,
          tags: typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags,
        });
      }
    }

    // Sort by highest similarity
    scoredItems.sort((a, b) => b.similarityScore - a.similarityScore);
    const results = scoredItems.slice(0, topK);
    const latencyMs = Math.round(performance.now() - startTime) || 4;

    return {
      query: query.query,
      topK,
      minRelevance,
      results,
      latencyMs,
    };
  }

  // =========================================================================
  // 6. MULTI-HOP GRAPH TRAVERSAL & CONTEXT SYNTHESIZER
  // =========================================================================

  async traverseGraph(rootNodeId: string, maxDepth = 2): Promise<GraphTraversalResult> {
    const startTime = performance.now();
    const rootNode = await this.getNodeById(rootNodeId);
    const depthLimit = Math.min(3, Math.max(1, maxDepth));

    const hops: GraphTraversalHop[] = [];
    const visited = new Set<string>([rootNodeId]);
    let queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= depthLimit) continue;

      const edges = await db('brand_knowledge_edges as e')
        .join('brand_knowledge_nodes as tn', 'e.target_node_id', 'tn.id')
        .select('e.target_node_id', 'e.relation_type', 'tn.name as target_name', 'tn.entity_type as target_type')
        .where('e.source_node_id', current.nodeId);

      for (const edge of edges) {
        if (!visited.has(edge.target_node_id)) {
          visited.add(edge.target_node_id);
          hops.push({
            nodeId: edge.target_node_id,
            nodeName: edge.target_name,
            entityType: edge.target_type,
            relationType: edge.relation_type,
            depth: current.depth + 1,
          });
          queue.push({ nodeId: edge.target_node_id, depth: current.depth + 1 });
        }
      }
    }

    // Synthesize Prompt Context for LLMs and AI Agents
    const contextLines: string[] = [
      `### Knowledge Context for Entity: ${rootNode.name} (${rootNode.entityType.toUpperCase()})`,
      `> ${rootNode.description || 'Core brand entity'}`,
      '',
      '#### Connected Semantic Relationships:',
    ];

    if (hops.length === 0) {
      contextLines.push('- No direct graph relationships connected.');
    } else {
      for (const h of hops) {
        contextLines.push(
          `- [Depth ${h.depth}] **${rootNode.name}** *${h.relationType}* **${h.nodeName}** (${h.entityType})`
        );
      }
    }

    const latencyMs = Math.round(performance.now() - startTime) || 6;

    return {
      rootNode,
      maxDepth: depthLimit,
      visitedNodesCount: visited.size,
      hops,
      synthesizedContextPrompt: contextLines.join('\n'),
      latencyMs,
    };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
