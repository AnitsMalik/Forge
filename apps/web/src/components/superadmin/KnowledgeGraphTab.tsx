/**
 * Brand Knowledge Graph & Advanced Vector Memory Tab
 * HoaspForge Platform v4.9.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Database,
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Trash2,
  Eye,
  Sliders,
  Cpu,
  Compass,
  FileText,
  Activity,
  Globe,
  CornerDownRight,
  Send,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeEntityType,
  KnowledgeRelationType,
  SemanticVectorMemory,
  SemanticMemoryType,
  SemanticSearchResult,
  GraphTraversalResult,
  KnowledgeGraphOverview,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'viewer' | 'entities' | 'memories' | 'sandbox';

export const KnowledgeGraphTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('viewer');

  // Overview Telemetry
  const [overview, setOverview] = useState<KnowledgeGraphOverview | null>(null);

  // Accessible Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Nodes & Edges
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Memories
  const [memories, setMemories] = useState<SemanticVectorMemory[]>([]);
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>('');

  // Modals
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [nodeForm, setNodeForm] = useState({
    name: '',
    entityType: 'product' as KnowledgeEntityType,
    description: '',
    attributesStr: '{"category": "wellness"}',
  });

  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [edgeForm, setEdgeForm] = useState({
    sourceNodeId: '',
    targetNodeId: '',
    relationType: 'promotes' as KnowledgeRelationType,
    confidenceScore: 1.0,
  });

  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [memoryForm, setMemoryForm] = useState({
    memoryType: 'fact' as SemanticMemoryType,
    content: '',
    tagsStr: 'brand_fact, anchor',
  });

  // Vector Search & Sandbox
  const [sandboxQuery, setSandboxQuery] = useState('collagen absorption rate');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SemanticSearchResult | null>(null);

  const [traversingNodeId, setTraversingNodeId] = useState('');
  const [traversalDepth, setTraversalDepth] = useState(2);
  const [traversing, setTraversing] = useState(false);
  const [traversalResult, setTraversalResult] = useState<GraphTraversalResult | null>(null);

  // Load Data
  const loadOverview = useCallback(async () => {
    try {
      const data = await api.adminOps.getKnowledgeGraphOverview();
      setOverview(data);
    } catch (err: any) {
      showToast(`Failed to load knowledge graph overview: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadNodes = useCallback(async () => {
    try {
      const data = await api.adminOps.listKnowledgeNodes({
        entityType: entityFilter || undefined,
        search: searchQuery.trim() || undefined,
      });
      setNodes(data);
      if (data.length > 0 && !selectedNode) {
        setSelectedNode(data[0]);
        setTraversingNodeId(data[0].id);
      }
    } catch (err: any) {
      showToast(`Failed to load knowledge nodes: ${err.message}`, 'error');
    }
  }, [entityFilter, searchQuery, selectedNode, showToast]);

  const loadEdges = useCallback(async () => {
    try {
      const data = await api.adminOps.listKnowledgeEdges();
      setEdges(data);
    } catch (err: any) {
      showToast(`Failed to load relationships: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadMemories = useCallback(async () => {
    try {
      const data = await api.adminOps.listVectorMemories({
        memoryType: memoryTypeFilter || undefined,
      });
      setMemories(data);
    } catch (err: any) {
      showToast(`Failed to load vector memories: ${err.message}`, 'error');
    }
  }, [memoryTypeFilter, showToast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadOverview(), loadNodes(), loadEdges(), loadMemories()]);
    setLoading(false);
  }, [loadOverview, loadNodes, loadEdges, loadMemories]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handlers
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodes[0]) {
      showToast('Need at least one existing brand context to create nodes', 'error');
      return;
    }
    try {
      let attributes = {};
      try {
        attributes = JSON.parse(nodeForm.attributesStr);
      } catch {
        // Fallback
      }
      await api.adminOps.createKnowledgeNode({
        brandId: nodes[0].brandId,
        tenantId: nodes[0].tenantId,
        name: nodeForm.name.trim(),
        entityType: nodeForm.entityType,
        description: nodeForm.description.trim(),
        attributes,
      });
      showToast(`Knowledge entity "${nodeForm.name}" created`, 'success');
      setNodeModalOpen(false);
      setNodeForm({ name: '', entityType: 'product', description: '', attributesStr: '{}' });
      loadNodes();
      loadOverview();
    } catch (err: any) {
      showToast(`Failed to create node: ${err.message}`, 'error');
    }
  };

  const handleDeleteNode = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Knowledge Graph Entity',
      description: 'Are you sure you want to delete this entity from the knowledge graph? Incident and edge associations referencing this node will be unlinked.',
      confirmText: 'Delete Entity',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteKnowledgeNode(id);
          showToast('Entity deleted from knowledge graph', 'success');
          if (selectedNode?.id === id) setSelectedNode(null);
          loadNodes();
          loadEdges();
          loadOverview();
        } catch (err: any) {
          showToast(`Failed to delete node: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleCreateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edgeForm.sourceNodeId || !edgeForm.targetNodeId) {
      showToast('Please select both source and target entities', 'error');
      return;
    }
    try {
      const source = nodes.find((n) => n.id === edgeForm.sourceNodeId);
      if (!source) return;
      await api.adminOps.createKnowledgeEdge({
        tenantId: source.tenantId,
        brandId: source.brandId,
        sourceNodeId: edgeForm.sourceNodeId,
        targetNodeId: edgeForm.targetNodeId,
        relationType: edgeForm.relationType,
        confidenceScore: Number(edgeForm.confidenceScore),
      });
      showToast('Relationship edge added to graph', 'success');
      setEdgeModalOpen(false);
      loadEdges();
      loadOverview();
    } catch (err: any) {
      showToast(`Failed to create edge: ${err.message}`, 'error');
    }
  };

  const handleDeleteEdge = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Relationship Edge',
      description: 'Delete this semantic relationship? The connected entities will remain in the knowledge graph.',
      confirmText: 'Delete Relationship',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteKnowledgeEdge(id);
          showToast('Relationship deleted', 'success');
          loadEdges();
          loadOverview();
        } catch (err: any) {
          showToast(`Failed to delete edge: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodes[0]) return;
    try {
      const tags = memoryForm.tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      await api.adminOps.createVectorMemory({
        tenantId: nodes[0].tenantId,
        brandId: nodes[0].brandId,
        memoryType: memoryForm.memoryType,
        content: memoryForm.content.trim(),
        tags,
      });
      showToast('High-dimensional vector memory embedded and stored', 'success');
      setMemoryModalOpen(false);
      setMemoryForm({ memoryType: 'fact', content: '', tagsStr: '' });
      loadMemories();
      loadOverview();
    } catch (err: any) {
      showToast(`Failed to store memory: ${err.message}`, 'error');
    }
  };

  const handleDeleteMemory = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Vector Memory',
      description: 'Delete this vector memory? It will no longer be retrieved during semantic retrieval or agent prompting.',
      confirmText: 'Delete Memory',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteVectorMemory(id);
          showToast('Memory item deleted', 'success');
          loadMemories();
          loadOverview();
        } catch (err: any) {
          showToast(`Failed to delete memory: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleExecuteSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await api.adminOps.semanticSearchKnowledge({
        query: sandboxQuery.trim(),
        topK: 5,
        minRelevance: 0.55,
      });
      setSearchResult(res);
      showToast(`Retrieved ${res.results.length} semantic matches in ${res.latencyMs}ms`, 'info');
    } catch (err: any) {
      showToast(`Search failed: ${err.message}`, 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleExecuteTraversal = async () => {
    if (!traversingNodeId) return;
    setTraversing(true);
    try {
      const res = await api.adminOps.traverseKnowledgeGraph({
        rootNodeId: traversingNodeId,
        maxDepth: traversalDepth,
      });
      setTraversalResult(res);
      showToast(`Graph traversal resolved: ${res.visitedNodesCount} nodes reachable`, 'info');
    } catch (err: any) {
      showToast(`Traversal failed: ${err.message}`, 'error');
    } finally {
      setTraversing(false);
    }
  };

  const entityTypeColors: Record<KnowledgeEntityType, { bg: string; text: string }> = {
    brand: { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc' },
    product: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' },
    target_persona: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' },
    campaign: { bg: 'rgba(234, 179, 8, 0.2)', text: '#facc15' },
    competitor: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171' },
    content_pillar: { bg: 'rgba(14, 165, 233, 0.2)', text: '#38bdf8' },
    value_prop: { bg: 'rgba(249, 115, 22, 0.2)', text: '#fb923c' },
    verified_claim: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' },
    banned_claim: { bg: 'rgba(225, 29, 72, 0.2)', text: '#fb7185' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. TOP TELEMETRY STAT CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Knowledge Entities</span>
            <Share2 size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? overview.totalNodes : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#c084fc' }}>
            Active Semantic Graph Nodes
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Graph Relationships</span>
            <Compass size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? overview.totalEdges : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#60a5fa' }}>
            Multi-Hop Directional Edges
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Vector Memory Bank</span>
            <Database size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? `${overview.embeddedVectorsCount}` : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#34d399' }}>
            High-Dim Embedded Memories & Facts
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Cosine Query Latency</span>
            <Zap size={18} color="#eab308" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? `${overview.avgQueryLatencyMs} ms` : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981' }}>
            Real-Time Sub-10ms In-Memory Dot Product
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS NAVIGATION & ACTIONS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'viewer', label: 'Semantic Graph Viewer', icon: Share2 },
            { id: 'entities', label: 'Knowledge Entities', icon: Layers },
            { id: 'memories', label: 'Vector Memories', icon: Database },
            { id: 'sandbox', label: 'Vector Search & Traversal Sandbox', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`subtab-kg-${tab.id}`}
                onClick={() => setSubTab(tab.id as SubTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: active ? '#c084fc' : '#94a3b8',
                  border: active ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadAll()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            id="btn-add-entity"
            onClick={() => setNodeModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#a855f7',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Add Entity
          </button>

          <button
            id="btn-add-relationship"
            onClick={() => setEdgeModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Share2 size={15} />
            Connect Nodes
          </button>

          <button
            id="btn-add-memory"
            onClick={() => setMemoryModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Database size={15} />
            Ingest Memory
          </button>
        </div>
      </div>

      {/* 3. SUB-TAB CONTENT */}

      {/* SUB-TAB A: SEMANTIC GRAPH VIEWER */}
      {subTab === 'viewer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Interactive Graph Canvas representation */}
          <div
            style={{
              background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px',
              minHeight: '480px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                Brand Semantic Knowledge Topology
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {nodes.length} Nodes • {edges.length} Relationships
              </span>
            </div>

            {/* Semantic Node Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '14px',
                flex: 1,
                alignContent: 'start',
              }}
            >
              {nodes.map((node) => {
                const color = entityTypeColors[node.entityType] || { bg: 'rgba(255,255,255,0.1)', text: '#fff' };
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node);
                      setTraversingNodeId(node.id);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                      border: isSelected ? '2px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 16px rgba(168, 85, 247, 0.4)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: color.bg,
                        color: color.text,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {node.entityType}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {node.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                      {node.description ? node.description.slice(0, 50) + '...' : 'No description'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Relationship edge list beneath canvas */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Active Multi-Hop Connections:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {edges.map((edge) => (
                  <div
                    key={edge.id}
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#cbd5e1',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>{edge.sourceNodeName}</span>
                    <span style={{ color: '#38bdf8', fontStyle: 'italic' }}>{edge.relationType}</span>
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>{edge.targetNodeName}</span>
                    <button
                      onClick={() => handleDeleteEdge(edge.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: '4px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Node Inspector Drawer */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                Entity Inspector
              </h3>
              {selectedNode && (
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Entity Name</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                    {selectedNode.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {selectedNode.slug} • {selectedNode.entityType}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Semantic Description</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4, marginTop: '4px' }}>
                    {selectedNode.description || 'No description provided.'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    Key Attributes & Metadata
                  </div>
                  <pre
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#a855f7',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedNode.attributes, null, 2)}
                  </pre>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    Vector Embedding Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981' }}>
                    <CheckCircle2 size={14} color="#10b981" />
                    Embedded (16-Dim Unit Vector)
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                Select an entity node from the graph to inspect its semantic properties.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB B: KNOWLEDGE ENTITIES CATALOG */}
      {subTab === 'entities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entities by name or slug..."
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 36px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            >
              <option value="">All Entity Types</option>
              <option value="brand">Brand</option>
              <option value="product">Product</option>
              <option value="target_persona">Target Persona</option>
              <option value="value_prop">Value Prop</option>
              <option value="verified_claim">Verified Claim</option>
              <option value="banned_claim">Banned Claim</option>
              <option value="content_pillar">Content Pillar</option>
              <option value="competitor">Competitor</option>
            </select>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Entity Name</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Slug</th>
                  <th style={{ padding: '12px 16px' }}>Semantic Description</th>
                  <th style={{ padding: '12px 16px' }}>Vector</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => {
                  const color = entityTypeColors[node.entityType] || { bg: 'rgba(255,255,255,0.1)', text: '#fff' };
                  return (
                    <tr
                      key={node.id}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{node.name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: color.bg,
                            color: color.text,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {node.entityType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                        {node.slug}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1', maxWidth: '300px' }}>
                        {node.description || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#10b981', fontSize: '11px' }}>
                        16-Dim OK
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteNode(node.id)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB C: VECTOR MEMORIES */}
      {subTab === 'memories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Semantic Memory Content</th>
                  <th style={{ padding: '12px 16px' }}>Tags</th>
                  <th style={{ padding: '12px 16px' }}>Relevance</th>
                  <th style={{ padding: '12px 16px' }}>Recalls</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memories.map((mem) => (
                  <tr
                    key={mem.id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {mem.memoryType}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#f8fafc', maxWidth: '420px', lineHeight: 1.4 }}>
                      {mem.content}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {mem.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: '11px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: '#94a3b8',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#38bdf8', fontWeight: 600 }}>
                      {mem.relevanceScore.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                      {mem.accessCount}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB D: VECTOR SEARCH & TRAVERSAL SANDBOX */}
      {subTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Cosine Search Sandbox */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} color="#60a5fa" />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                Cosine Vector Search Sandbox
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Search across both Brand Knowledge Graph nodes and semantic memory vectors using unit cosine similarity.
            </p>

            <form onSubmit={handleExecuteSemanticSearch} style={{ display: 'flex', gap: '10px' }}>
              <input
                id="input-sandbox-search"
                type="text"
                value={sandboxQuery}
                onChange={(e) => setSandboxQuery(e.target.value)}
                placeholder="e.g. collagen absorption rate or third party testing"
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
              <button
                id="btn-run-vector-search"
                type="submit"
                disabled={searching}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Search
              </button>
            </form>

            {searchResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Retrieved {searchResult.results.length} matches in {searchResult.latencyMs}ms:
                </div>
                {searchResult.results.map((res) => (
                  <div
                    key={res.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                        {res.type}: {res.entityType || res.memoryType}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                        Similarity: {(res.similarityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#f8fafc' }}>
                      {res.name ? <strong>{res.name} — </strong> : null}
                      {res.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multi-Hop Traversal Synthesizer */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="#a855f7" />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                Graph Multi-Hop Context Synthesizer
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Traverse directional relationships from a root entity and synthesize prompt-ready markdown context for AI agents.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                id="select-traversal-root"
                value={traversingNodeId}
                onChange={(e) => setTraversingNodeId(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.entityType})
                  </option>
                ))}
              </select>

              <button
                id="btn-run-traversal"
                onClick={handleExecuteTraversal}
                disabled={traversing || !traversingNodeId}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#a855f7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Traverse & Synthesize
              </button>
            </div>

            {traversalResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Synthesized Markdown Prompt Context ({traversalResult.hops.length} relationship hops):
                </div>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {traversalResult.synthesizedContextPrompt}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODALS */}

      {/* MODAL 1: ADD KNOWLEDGE ENTITY */}
      {nodeModalOpen && (
        <div
          id="modal-add-entity"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>
                Add Knowledge Entity
              </h3>
              <button
                onClick={() => setNodeModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Entity Name
                </label>
                <input
                  type="text"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  placeholder="e.g. PureMarine Liquid Sachet"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Entity Type
                </label>
                <select
                  value={nodeForm.entityType}
                  onChange={(e) => setNodeForm({ ...nodeForm, entityType: e.target.value as KnowledgeEntityType })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="brand">Brand</option>
                  <option value="product">Product</option>
                  <option value="target_persona">Target Persona</option>
                  <option value="value_prop">Value Prop</option>
                  <option value="verified_claim">Verified Claim</option>
                  <option value="banned_claim">Banned Claim</option>
                  <option value="content_pillar">Content Pillar</option>
                  <option value="competitor">Competitor</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Semantic Description
                </label>
                <textarea
                  value={nodeForm.description}
                  onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                  placeholder="Detailed facts and anchors for this entity..."
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setNodeModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#a855f7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Create Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE RELATIONSHIP */}
      {edgeModalOpen && (
        <div
          id="modal-add-relationship"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>
                Connect Knowledge Entities
              </h3>
              <button
                onClick={() => setEdgeModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEdge} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Source Entity
                </label>
                <select
                  value={edgeForm.sourceNodeId}
                  onChange={(e) => setEdgeForm({ ...edgeForm, sourceNodeId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Select source entity...</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.entityType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Relationship Type
                </label>
                <select
                  value={edgeForm.relationType}
                  onChange={(e) => setEdgeForm({ ...edgeForm, relationType: e.target.value as KnowledgeRelationType })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="promotes">promotes</option>
                  <option value="targets">targets</option>
                  <option value="has_feature">has_feature</option>
                  <option value="validates">validates</option>
                  <option value="competes_with">competes_with</option>
                  <option value="contradicts">contradicts</option>
                  <option value="has_pillar">has_pillar</option>
                  <option value="prohibits">prohibits</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Target Entity
                </label>
                <select
                  value={edgeForm.targetNodeId}
                  onChange={(e) => setEdgeForm({ ...edgeForm, targetNodeId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Select target entity...</option>
                  {nodes
                    .filter((n) => n.id !== edgeForm.sourceNodeId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.entityType})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEdgeModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INGEST VECTOR MEMORY */}
      {memoryModalOpen && (
        <div
          id="modal-add-memory"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>
                Ingest Semantic Vector Memory
              </h3>
              <button
                onClick={() => setMemoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Memory Classification
                </label>
                <select
                  value={memoryForm.memoryType}
                  onChange={(e) => setMemoryForm({ ...memoryForm, memoryType: e.target.value as SemanticMemoryType })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="fact">Brand Fact</option>
                  <option value="top_hook">Top-Performing Hook</option>
                  <option value="brand_voice_rule">Tone-of-Voice Guideline</option>
                  <option value="campaign_insight">Campaign Analytics Insight</option>
                  <option value="customer_feedback">Verified Customer Feedback</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Memory Content (To be embedded into vector space)
                </label>
                <textarea
                  value={memoryForm.content}
                  onChange={(e) => setMemoryForm({ ...memoryForm, content: e.target.value })}
                  placeholder="e.g. Clinical trial data shows 87% improvement in dermal hydration within 28 days..."
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Tags (comma-separated for hybrid search filtering)
                </label>
                <input
                  type="text"
                  value={memoryForm.tagsStr}
                  onChange={(e) => setMemoryForm({ ...memoryForm, tagsStr: e.target.value })}
                  placeholder="hydration, clinical_trial, skincare"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMemoryModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Embed & Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accessible Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
