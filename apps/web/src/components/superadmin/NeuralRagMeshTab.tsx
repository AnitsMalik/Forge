/**
 * Enterprise Distributed Semantic Search, Neural Vector Embedding Ingestion & Hybrid RAG Knowledge Mesh Tab
 * HoaspForge Platform v6.4.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Cpu,
  Database,
  Layers,
  Search,
  Zap,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  BookOpen,
  X,
  Plus,
  Send,
  Target,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  NeuralEmbeddingModel,
  RagKnowledgeCollection,
  SemanticVectorEmbedding,
  HybridSearchQueryLog,
  NeuralRagTelemetry,
  EmbeddingProviderType,
  VectorDistanceMetric,
  VectorIndexType,
  HybridSearchQueryResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'collections' | 'models' | 'hybrid_sandbox' | 'ingestion';

export const NeuralRagMeshTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('collections');

  // Telemetry
  const [telemetry, setTelemetry] = useState<NeuralRagTelemetry | null>(null);

  // Collections
  const [collections, setCollections] = useState<RagKnowledgeCollection[]>([]);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [newColName, setNewColName] = useState('enterprise-product-catalog-kb');
  const [newColModelId, setNewColModelId] = useState('');
  const [newColMetric, setNewColMetric] = useState<VectorDistanceMetric>('cosine');
  const [newColIndex, setNewColIndex] = useState<VectorIndexType>('hnsw');
  const [newColImmutable, setNewColImmutable] = useState(false);

  // Models
  const [models, setModels] = useState<NeuralEmbeddingModel[]>([]);
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);
  const [newModelName, setNewModelName] = useState('AWS Titan Text Embeddings v2 (1024d)');
  const [newModelProvider, setNewModelProvider] = useState<EmbeddingProviderType>('aws_bedrock');
  const [newModelFamily, setNewModelFamily] = useState('titan-embed-text-v2');
  const [newModelDims, setNewModelDims] = useState(1024);
  const [newModelTokens, setNewModelTokens] = useState(8192);
  const [newModelCost, setNewModelCost] = useState(0.08);

  // Hybrid Search Sandbox
  const [sandboxColId, setSandboxColId] = useState('');
  const [searchQuery, setSearchQuery] = useState('What visual aesthetic and tone should be used for product launches?');
  const [topK, setTopK] = useState(5);
  const [denseWeight, setDenseWeight] = useState(0.7);
  const [sparseWeight, setSparseWeight] = useState(0.3);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<HybridSearchQueryResult | null>(null);

  // Ingestion
  const [ingestColId, setIngestColId] = useState('');
  const [ingestDocId, setIngestDocId] = useState('doc-launch-strategy-2026');
  const [ingestText, setIngestText] = useState('Launch Strategy: Maintain bold high-contrast visuals with vibrant cyan accents and emphasize real customer testimonials.');
  const [ingesting, setIngesting] = useState(false);
  const [queryLogs, setQueryLogs] = useState<HybridSearchQueryLog[]>([]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, colsRes, modelsRes, logsRes] = await Promise.all([
        api.adminOps.getNeuralRagTelemetry(),
        api.adminOps.listKnowledgeCollections(),
        api.adminOps.listNeuralModels(),
        api.adminOps.listHybridSearchLogs(),
      ]);

      setTelemetry(telRes);
      setCollections(colsRes);
      setModels(modelsRes);
      setQueryLogs(logsRes);

      if (colsRes.length > 0) {
        if (!sandboxColId) setSandboxColId(colsRes[0].id);
        if (!ingestColId) setIngestColId(colsRes[0].id);
      }
      if (modelsRes.length > 0 && !newColModelId) {
        setNewColModelId(modelsRes[0].id);
      }
    } catch (err: any) {
      showToast(`Failed to load Neural RAG topology: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [sandboxColId, ingestColId, newColModelId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create Collection
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createKnowledgeCollection({
        collection_name: newColName,
        model_id: newColModelId,
        distance_metric: newColMetric,
        index_type: newColIndex,
        is_immutable: newColImmutable,
      });

      showToast(`Knowledge collection '${newColName}' created`, 'success');
      setShowCreateCollectionModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Register Model
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createNeuralModel({
        model_name: newModelName,
        provider_type: newModelProvider,
        model_family: newModelFamily,
        dimension_size: Number(newModelDims),
        max_input_tokens: Number(newModelTokens),
        cost_per_million_tokens: Number(newModelCost),
        is_active: true,
      });

      showToast(`Neural embedding model '${newModelName}' registered`, 'success');
      setShowCreateModelModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Execute Hybrid Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxColId || !searchQuery) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await api.adminOps.executeHybridSearch({
        collection_id: sandboxColId,
        query_text: searchQuery,
        top_k: Number(topK),
        dense_weight: Number(denseWeight),
        sparse_weight: Number(sparseWeight),
      });

      setSearchResult(res);
      showToast(`Found ${res.results_count} relevant vectors in ${res.latency_ms}ms`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  };

  // Ingest Embedding
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestColId || !ingestDocId || !ingestText) return;
    setIngesting(true);
    try {
      await api.adminOps.ingestVectorEmbedding({
        collection_id: ingestColId,
        document_id: ingestDocId,
        content_text: ingestText,
        metadata: { ingested_via: 'superadmin_console', timestamp: new Date().toISOString() },
      });

      showToast('Semantic vector chunk ingested and indexed into RAG mesh', 'success');
      setIngestText('');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-flex' }}>
              <Brain size={22} color="#a855f7" />
            </span>
            Enterprise Distributed Semantic Search & Neural RAG Knowledge Mesh
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Hybrid dense-sparse vector indexing, Reciprocal Rank Fusion (RRF), sub-50ms Brand Brain retrieval, & multi-model embeddings.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ display: 'inline-flex' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </span>
          Refresh Mesh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Knowledge Collections</span>
            <span style={{ display: 'inline-flex' }}><BookOpen size={18} color="#38bdf8" /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '8px' }}>
            {telemetry?.total_collections ?? 3}
          </div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
            Brand Brain & Compliance Collections
          </div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indexed Vectors</span>
            <span style={{ display: 'inline-flex' }}><Database size={18} color="#a855f7" /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#a855f7', marginTop: '8px' }}>
            {(telemetry?.total_vectors_indexed ?? 5720).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            HNSW multi-layer semantic graphs
          </div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Embedding Models</span>
            <span style={{ display: 'inline-flex' }}><Cpu size={18} color="#22c55e" /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e', marginTop: '8px' }}>
            {telemetry?.total_embedding_models ?? 3}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            OpenAI, Cohere, BGE Triton cluster
          </div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Query Latency</span>
            <span style={{ display: 'inline-flex' }}><Zap size={18} color="#f59e0b" /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', marginTop: '8px' }}>
            {telemetry?.avg_query_latency_ms ?? 14.2} ms
          </div>
          <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
            {telemetry?.hybrid_rrf_recall_accuracy ?? 96.8}% RRF precision accuracy
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
        <button
          onClick={() => setSubTab('collections')}
          style={{
            backgroundColor: subTab === 'collections' ? '#1e293b' : 'transparent',
            color: subTab === 'collections' ? '#a855f7' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><BookOpen size={14} /></span>
          Knowledge Collections ({collections.length})
        </button>

        <button
          onClick={() => setSubTab('models')}
          style={{
            backgroundColor: subTab === 'models' ? '#1e293b' : 'transparent',
            color: subTab === 'models' ? '#a855f7' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><Cpu size={14} /></span>
          Neural Embedding Models ({models.length})
        </button>

        <button
          onClick={() => setSubTab('hybrid_sandbox')}
          style={{
            backgroundColor: subTab === 'hybrid_sandbox' ? '#1e293b' : 'transparent',
            color: subTab === 'hybrid_sandbox' ? '#a855f7' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><Search size={14} /></span>
          Hybrid Search & RRF Rank Fusion Sandbox
        </button>

        <button
          onClick={() => setSubTab('ingestion')}
          style={{
            backgroundColor: subTab === 'ingestion' ? '#1e293b' : 'transparent',
            color: subTab === 'ingestion' ? '#a855f7' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><FileText size={14} /></span>
          Vector Ingestion & Latency Logs
        </button>
      </div>

      {/* Sub-Tab 1: Collections */}
      {subTab === 'collections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#cbd5e1' }}>
              Vector Knowledge Bases with Partitioned Semantic Indices
            </span>
            <button
              onClick={() => setShowCreateCollectionModal(true)}
              style={{
                backgroundColor: '#9333ea',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ display: 'inline-flex' }}><Plus size={14} /></span>
              Create Knowledge Collection
            </button>
          </div>

          <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Collection Name</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Model Binding</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Distance Metric</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Index Type</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Vectors</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#020617' }}>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 500, fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-flex' }}><Brain size={15} color="#a855f7" /></span>
                        {c.collection_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Tenant: {c.target_tenant_id}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8', fontFamily: 'monospace' }}>{c.model_id}</td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      <span style={{ backgroundColor: '#1e293b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                        {c.distance_metric}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#f8fafc' }}>
                      <span style={{ backgroundColor: '#1e1b4b', color: '#a855f7', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                        {c.index_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 600 }}>
                      {c.total_vectors_count.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ backgroundColor: '#064e3b', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        Ready
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Models */}
      {subTab === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#cbd5e1' }}>
              Configured Neural Embedding Models & Vector Inference Clusters
            </span>
            <button
              onClick={() => setShowCreateModelModal(true)}
              style={{
                backgroundColor: '#9333ea',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ display: 'inline-flex' }}><Cpu size={14} /></span>
              Register Embedding Model
            </button>
          </div>

          <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Model Name</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Provider / Family</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Dimensions</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Max Tokens</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Cost / 1M Tokens</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#020617' }}>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-flex' }}><Cpu size={15} color="#22c55e" /></span>
                        {m.model_name}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8' }}>
                      <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>{m.provider_type}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{m.model_family}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontFamily: 'monospace' }}>
                      {m.dimension_size}d
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {m.max_input_tokens.toLocaleString()} tokens
                    </td>
                    <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 600 }}>
                      ${m.cost_per_million_tokens.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ backgroundColor: '#064e3b', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        Active {m.is_default ? '(Default)' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Hybrid Search Sandbox */}
      {subTab === 'hybrid_sandbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex' }}><Search size={16} color="#a855f7" /></span>
              Hybrid Dense + Sparse Reciprocal Rank Fusion (RRF) Tester
            </h4>
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Target Collection</label>
                  <select
                    value={sandboxColId}
                    onChange={(e) => setSandboxColId(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.collection_name} ({c.total_vectors_count} vecs)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Query Text</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Top-K Results: {topK}</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Dense Weight: {denseWeight}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={denseWeight}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setDenseWeight(d);
                      setSparseWeight(Math.round((1 - d) * 100) / 100);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Sparse (Lexical) Weight: {sparseWeight}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sparseWeight}
                    onChange={(e) => {
                      const s = Number(e.target.value);
                      setSparseWeight(s);
                      setDenseWeight(Math.round((1 - s) * 100) / 100);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: searching ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}><Sparkles size={14} /></span>
                  {searching ? 'Ranking...' : 'Execute Hybrid Query'}
                </button>
              </div>
            </form>

            {searchResult && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#a855f7', fontWeight: 600 }}>
                    Retrieved {searchResult.results_count} Vector Chunks (Latency: {searchResult.latency_ms} ms)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Ranked by RRF (Dense Cosine $\times$ {denseWeight} + Lexical BM25 $\times$ {sparseWeight})
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResult.items.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ backgroundColor: '#9333ea', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace' }}>
                            {item.document_id} [chunk {item.chunk_index}]
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                          <span style={{ color: '#22c55e' }}>Dense: {item.dense_score}</span>
                          <span style={{ color: '#f59e0b' }}>Sparse: {item.sparse_score}</span>
                          <span style={{ color: '#a855f7', fontWeight: 600 }}>RRF Score: {item.rrf_combined_score}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#f8fafc', lineHeight: '1.4' }}>
                        {item.content_text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Ingestion & Logs */}
      {subTab === 'ingestion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex' }}><FileText size={16} color="#38bdf8" /></span>
              Ingest Document Chunk into Vector Collection
            </h4>
            <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Target Collection</label>
                  <select
                    value={ingestColId}
                    onChange={(e) => setIngestColId(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.collection_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Document ID</label>
                  <input
                    type="text"
                    value={ingestDocId}
                    onChange={(e) => setIngestDocId(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Chunk Text Content</label>
                <textarea
                  rows={3}
                  value={ingestText}
                  onChange={(e) => setIngestText(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={ingesting}
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: ingesting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}><Send size={14} /></span>
                  {ingesting ? 'Indexing...' : 'Index Semantic Vector'}
                </button>
              </div>
            </form>
          </div>

          {/* Audit Logs */}
          <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Recent Hybrid Search Queries & Performance Telemetry
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#020617', borderBottom: '1px solid #1e293b' }}>
                <tr>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>Query Text</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>Collection</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>Weights (D/S)</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>Latency</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>Results</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>Operator</th>
                </tr>
              </thead>
              <tbody>
                {queryLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#020617' }}>
                    <td style={{ padding: '10px 14px', color: '#f8fafc', fontWeight: 500 }}>{log.query_text}</td>
                    <td style={{ padding: '10px 14px', color: '#a855f7', fontFamily: 'monospace' }}>{log.collection_id}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{log.dense_weight} / {log.sparse_weight}</td>
                    <td style={{ padding: '10px 14px', color: '#22c55e', fontWeight: 600 }}>{log.latency_ms} ms</td>
                    <td style={{ padding: '10px 14px', color: '#38bdf8' }}>{log.total_results_found} found</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{log.operator_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Collection */}
      {showCreateCollectionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Create Knowledge Collection</h3>
              <button onClick={() => setShowCreateCollectionModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex' }}><X size={18} /></span>
              </button>
            </div>
            <form onSubmit={handleCreateCollection} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Collection Name</label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Embedding Model Binding</label>
                <select
                  value={newColModelId}
                  onChange={(e) => setNewColModelId(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.model_name} ({m.dimension_size}d)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Distance Metric</label>
                  <select
                    value={newColMetric}
                    onChange={(e) => setNewColMetric(e.target.value as VectorDistanceMetric)}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="cosine">Cosine Similarity</option>
                    <option value="euclidean">Euclidean (L2)</option>
                    <option value="dot_product">Dot Product</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Index Type</label>
                  <select
                    value={newColIndex}
                    onChange={(e) => setNewColIndex(e.target.value as VectorIndexType)}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="hnsw">HNSW Graph</option>
                    <option value="ivf_flat">IVF Flat</option>
                    <option value="brute_force">Exact Brute Force</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateCollectionModal(false)}
                  style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Model */}
      {showCreateModelModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Register Embedding Model</h3>
              <button onClick={() => setShowCreateModelModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <span style={{ display: 'inline-flex' }}><X size={18} /></span>
              </button>
            </div>
            <form onSubmit={handleCreateModel} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Model Name</label>
                <input
                  type="text"
                  required
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Provider</label>
                <select
                  value={newModelProvider}
                  onChange={(e) => setNewModelProvider(e.target.value as EmbeddingProviderType)}
                  style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="cohere">Cohere</option>
                  <option value="huggingface_local">HuggingFace / Triton Local</option>
                  <option value="aws_bedrock">AWS Bedrock</option>
                  <option value="custom_triton">Custom Triton Endpoint</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Dimensions</label>
                  <input
                    type="number"
                    value={newModelDims}
                    onChange={(e) => setNewModelDims(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Max Tokens</label>
                  <input
                    type="number"
                    value={newModelTokens}
                    onChange={(e) => setNewModelTokens(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Cost / 1M Tokens</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newModelCost}
                    onChange={(e) => setNewModelCost(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModelModal(false)}
                  style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Register Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
