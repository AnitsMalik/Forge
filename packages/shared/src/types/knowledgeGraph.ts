/**
 * Brand Knowledge Graph & Advanced Vector Memory Types
 * Phase 31 - SocialForge Semantic Knowledge & Vector Retrieval Engine
 */

export type KnowledgeEntityType =
  | 'brand'
  | 'product'
  | 'target_persona'
  | 'campaign'
  | 'competitor'
  | 'content_pillar'
  | 'value_prop'
  | 'verified_claim'
  | 'banned_claim';

export type KnowledgeRelationType =
  | 'promotes'
  | 'targets'
  | 'competes_with'
  | 'validates'
  | 'contradicts'
  | 'belongs_to'
  | 'has_pillar'
  | 'has_feature'
  | 'prohibits';

export type KnowledgeEmbeddingStatus = 'pending' | 'embedded' | 'failed';

export type SemanticMemoryType =
  | 'fact'
  | 'campaign_insight'
  | 'customer_feedback'
  | 'brand_voice_rule'
  | 'top_hook';

export interface KnowledgeNode {
  id: string;
  tenantId: string;
  brandId: string;
  entityType: KnowledgeEntityType;
  name: string;
  slug: string;
  description: string | null;
  attributes: Record<string, any>;
  embeddingVector?: number[] | null;
  vectorDimensions: number;
  embeddingStatus: KnowledgeEmbeddingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEdge {
  id: string;
  tenantId: string;
  brandId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KnowledgeRelationType;
  confidenceScore: number;
  isBidirectional: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  // Hydrated joins
  sourceNodeName?: string;
  sourceEntityType?: KnowledgeEntityType;
  targetNodeName?: string;
  targetEntityType?: KnowledgeEntityType;
}

export interface SemanticVectorMemory {
  id: string;
  tenantId: string;
  brandId: string;
  memoryType: SemanticMemoryType;
  content: string;
  embeddingVector?: number[] | null;
  tags: string[];
  relevanceScore: number;
  accessCount: number;
  lastRecalledAt: string | null;
  createdAt: string;
}

export interface SemanticSearchQuery {
  query: string;
  brandId?: string;
  entityTypes?: KnowledgeEntityType[];
  topK?: number;
  minRelevance?: number;
}

export interface SemanticSearchResultItem {
  id: string;
  type: 'node' | 'memory';
  entityType?: KnowledgeEntityType;
  memoryType?: SemanticMemoryType;
  name?: string;
  content: string;
  similarityScore: number;
  tags?: string[];
  connectedEntitiesCount?: number;
}

export interface SemanticSearchResult {
  query: string;
  topK: number;
  minRelevance: number;
  results: SemanticSearchResultItem[];
  latencyMs: number;
}

export interface GraphTraversalHop {
  nodeId: string;
  nodeName: string;
  entityType: KnowledgeEntityType;
  relationType: KnowledgeRelationType;
  depth: number;
}

export interface GraphTraversalResult {
  rootNode: KnowledgeNode;
  maxDepth: number;
  visitedNodesCount: number;
  hops: GraphTraversalHop[];
  synthesizedContextPrompt: string;
  latencyMs: number;
}

export interface KnowledgeGraphOverview {
  totalNodes: number;
  totalEdges: number;
  totalMemories: number;
  embeddedVectorsCount: number;
  avgQueryLatencyMs: number;
  activeBrandGraphsCount: number;
}
