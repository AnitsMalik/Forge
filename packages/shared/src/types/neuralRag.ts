/**
 * Enterprise Distributed Semantic Search, Neural Vector Embedding Ingestion & Hybrid RAG Knowledge Mesh Types
 * SocialForge Platform v6.4.0
 */

export type EmbeddingProviderType = 'openai' | 'cohere' | 'huggingface_local' | 'aws_bedrock' | 'custom_triton';
export type VectorDistanceMetric = 'cosine' | 'euclidean' | 'dot_product';
export type VectorIndexType = 'hnsw' | 'ivf_flat' | 'brute_force';

export interface NeuralEmbeddingModel {
  id: string;
  model_name: string;
  provider_type: EmbeddingProviderType;
  model_family: string;
  dimension_size: number;
  max_input_tokens: number;
  cost_per_million_tokens: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export interface RagKnowledgeCollection {
  id: string;
  collection_name: string;
  target_tenant_id: string;
  model_id: string;
  distance_metric: VectorDistanceMetric;
  index_type: VectorIndexType;
  total_vectors_count: number;
  last_synced_at: string | null;
  is_immutable: boolean;
  status: 'ready' | 'indexing' | 'degraded';
  created_at: string;
}

export interface SemanticVectorEmbedding {
  id: string;
  collection_id: string;
  document_id: string;
  chunk_index: number;
  content_text: string;
  embedding_vector?: number[];
  metadata: Record<string, any>;
  token_count: number;
  sha256_hash: string;
  created_at: string;
}

export interface HybridSearchQueryLog {
  id: string;
  collection_id: string;
  query_text: string;
  top_k: number;
  dense_weight: number;
  sparse_weight: number;
  latency_ms: number;
  total_results_found: number;
  operator_email: string;
  created_at: string;
}

export interface NeuralRagTelemetry {
  total_collections: number;
  total_vectors_indexed: number;
  total_embedding_models: number;
  avg_query_latency_ms: number;
  hybrid_rrf_recall_accuracy: number;
  model_distribution: Record<EmbeddingProviderType, number>;
}

export interface CreateModelInput {
  model_name: string;
  provider_type: EmbeddingProviderType;
  model_family: string;
  dimension_size: number;
  max_input_tokens?: number;
  cost_per_million_tokens?: number;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateCollectionInput {
  collection_name: string;
  target_tenant_id?: string;
  model_id: string;
  distance_metric?: VectorDistanceMetric;
  index_type?: VectorIndexType;
  is_immutable?: boolean;
}

export interface IngestVectorEmbeddingInput {
  collection_id: string;
  document_id: string;
  chunk_index?: number;
  content_text: string;
  metadata?: Record<string, any>;
  custom_vector?: number[];
}

export interface IngestVectorBatchResult {
  indexed_count: number;
  skipped_duplicates: number;
  collection_id: string;
  total_collection_vectors: number;
  duration_ms: number;
}

export interface HybridSearchQueryInput {
  collection_id: string;
  query_text: string;
  top_k?: number;
  dense_weight?: number;
  sparse_weight?: number;
  rrf_k?: number;
}

export interface HybridSearchResultItem {
  id: string;
  document_id: string;
  chunk_index: number;
  content_text: string;
  metadata: Record<string, any>;
  dense_score: number;
  sparse_score: number;
  rrf_combined_score: number;
}

export interface HybridSearchQueryResult {
  query_text: string;
  collection_id: string;
  collection_name: string;
  results_count: number;
  latency_ms: number;
  items: HybridSearchResultItem[];
}
