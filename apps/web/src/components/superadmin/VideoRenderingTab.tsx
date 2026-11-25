/**
 * Multi-Tenant Real-Time Video Rendering Pipeline, Dynamic Motion Graphics & Cloud GPU Transcoding Mesh Tab
 * HoaspForge Platform v6.6.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Film,
  Cpu,
  Layers,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Sliders,
  Download,
  Server,
  X,
  FileVideo,
  Sparkles,
  Maximize2,
  Gauge,
  HardDrive,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  GpuVideoRenderJob,
  MotionCompositionTemplate,
  GpuTranscodeNode,
  RenderedVideoArtifact,
  VideoRenderingTelemetry,
  VideoAspectRatio,
  VideoCodecType,
  GpuAccelerationType,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'jobs' | 'nodes' | 'templates' | 'sandbox';

export const VideoRenderingTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('jobs');

  // Telemetry
  const [telemetry, setTelemetry] = useState<VideoRenderingTelemetry | null>(null);

  // Jobs
  const [jobs, setJobs] = useState<GpuVideoRenderJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJobDetail, setSelectedJobDetail] = useState<{ job: GpuVideoRenderJob; artifacts: RenderedVideoArtifact[] } | null>(null);

  // Nodes & Templates
  const [nodes, setNodes] = useState<GpuTranscodeNode[]>([]);
  const [templates, setTemplates] = useState<MotionCompositionTemplate[]>([]);

  // Modals
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [newJobName, setNewJobName] = useState('New Product Reel 9:16');
  const [newJobBrandId, setNewJobBrandId] = useState('brand-flagship-001');
  const [newJobAspectRatio, setNewJobAspectRatio] = useState<VideoAspectRatio>('9:16');
  const [newJobTemplateId, setNewJobTemplateId] = useState<string>('');
  const [newJobFps, setNewJobFps] = useState<number>(30);
  const [newJobDuration, setNewJobDuration] = useState<number>(15);
  const [newJobCodec, setNewJobCodec] = useState<VideoCodecType>('h264');

  const [showRegisterNodeModal, setShowRegisterNodeModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState('AWS G4dn US-West Cluster');
  const [newNodeProvider, setNewNodeProvider] = useState('aws_g4dn');
  const [newNodeModel, setNewNodeModel] = useState('NVIDIA T4 Tensor Core');
  const [newNodeVram, setNewNodeVram] = useState<number>(16.0);
  const [newNodeMaxJobs, setNewNodeMaxJobs] = useState<number>(4);

  // Sandbox State
  const [sandboxAspect, setSandboxAspect] = useState<VideoAspectRatio>('9:16');
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulatingRender, setSimulatingRender] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, jobsRes, nodesRes, templatesRes] = await Promise.all([
        api.adminOps.getVideoRenderingTelemetry(),
        api.adminOps.listVideoRenderJobs(),
        api.adminOps.listGpuNodes(),
        api.adminOps.listMotionTemplates(),
      ]);

      setTelemetry(telRes);
      setJobs(jobsRes);
      setNodes(nodesRes);
      setTemplates(templatesRes);

      const activeJobId = selectedJobId || (jobsRes.length > 0 ? jobsRes[0].id : '');
      if (activeJobId) {
        setSelectedJobId(activeJobId);
        const detail = await api.adminOps.getVideoRenderJob(activeJobId);
        setSelectedJobDetail(detail);
      }
      if (templatesRes.length > 0 && !newJobTemplateId) {
        setNewJobTemplateId(templatesRes[0].id);
      }
    } catch (err: any) {
      showToast(`Failed to load Video Rendering topology: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, newJobTemplateId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Select Job
  const handleSelectJob = async (jobId: string) => {
    setSelectedJobId(jobId);
    try {
      const detail = await api.adminOps.getVideoRenderJob(jobId);
      setSelectedJobDetail(detail);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Dispatch Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const job = await api.adminOps.createVideoRenderJob({
        job_name: newJobName,
        target_brand_id: newJobBrandId,
        template_id: newJobTemplateId || undefined,
        aspect_ratio: newJobAspectRatio,
        fps: Number(newJobFps),
        duration_seconds: Number(newJobDuration),
        codec: newJobCodec,
      });

      showToast(`Render job '${job.job_name}' dispatched to GPU node`, 'success');
      setShowCreateJobModal(false);
      setSelectedJobId(job.id);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Cancel Job
  const handleCancelJob = async (jobId: string) => {
    try {
      await api.adminOps.cancelVideoRenderJob(jobId);
      showToast(`Render job '${jobId}' cancelled`, 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Register Node
  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const node = await api.adminOps.registerGpuNode({
        node_name: newNodeName,
        provider: newNodeProvider,
        gpu_device_model: newNodeModel,
        acceleration_type: 'nvidia_nvenc',
        total_vram_gb: Number(newNodeVram),
        max_concurrent_jobs: Number(newNodeMaxJobs),
      });

      showToast(`GPU Node '${node.node_name}' registered to mesh`, 'success');
      setShowRegisterNodeModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Simulate Sandbox Render
  const handleSimulateSandboxRender = async () => {
    setSimulatingRender(true);
    try {
      const job = await api.adminOps.createVideoRenderJob({
        job_name: `Interactive Sandbox Render (${sandboxAspect})`,
        target_brand_id: 'brand-flagship-001',
        aspect_ratio: sandboxAspect,
        fps: 30,
        duration_seconds: 15,
        codec: 'h264',
      });

      showToast(`Rendering initiated on GPU cluster...`, 'info');

      // Update to 50%
      await new Promise((r) => setTimeout(r, 600));
      await api.adminOps.updateVideoJobProgress(job.id, { progress_percent: 50, status: 'transcoding' });

      // Update to 100%
      await new Promise((r) => setTimeout(r, 600));
      const finished = await api.adminOps.updateVideoJobProgress(job.id, {
        progress_percent: 100,
        status: 'completed',
        render_time_ms: 2450,
        file_size_bytes: 18450000,
      });

      setSelectedJobId(finished.id);
      showToast(`Render complete in 2,450ms (4.8x real-time speedup)!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSimulatingRender(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', color: '#f43f5e' }}>
              <Film size={24} />
            </span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
              Multi-Tenant Real-Time Video Rendering & Cloud GPU Transcoding Mesh
            </h2>
            <span
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid rgba(244, 63, 94, 0.3)',
              }}
            >
              v6.6.0 NVENC
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Distributed hardware-accelerated video composition, Remotion rendering, multi-resolution export profiles, and adaptive HLS packaging.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ display: 'inline-flex' }}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></span>
            Refresh Mesh
          </button>

          <button
            onClick={() => setShowCreateJobModal(true)}
            style={{
              backgroundColor: '#f43f5e',
              color: '#ffffff',
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
            Dispatch Render Job
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>ACTIVE TRANSCODE JOBS</span>
            <span style={{ display: 'inline-flex', color: '#f43f5e' }}><Activity size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {(telemetry?.total_active_jobs ?? 0) + (telemetry?.total_queued_jobs ?? 0)}
          </div>
          <div style={{ color: '#fb7185', fontSize: '11px', marginTop: '4px' }}>
            {telemetry?.total_active_jobs ?? 0} rendering, {telemetry?.total_queued_jobs ?? 0} queued
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>ONLINE GPU NODES</span>
            <span style={{ display: 'inline-flex', color: '#38bdf8' }}><Server size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.online_gpu_nodes ?? nodes.length}
          </div>
          <div style={{ color: '#38bdf8', fontSize: '11px', marginTop: '4px' }}>
            NVIDIA NVENC hardware nodes active
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>24H RENDER VOLUME</span>
            <span style={{ display: 'inline-flex', color: '#a855f7' }}><FileVideo size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.total_rendered_videos_24h ?? 1}
          </div>
          <div style={{ color: '#a855f7', fontSize: '11px', marginTop: '4px' }}>
            Completed video artifacts
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>NVENC SPEEDUP / LATENCY</span>
            <span style={{ display: 'inline-flex', color: '#10b981' }}><Zap size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.avg_render_speedup_factor ?? 4.8}x
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            {telemetry?.avg_job_latency_ms ?? 3240}ms avg render duration
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
        <button
          onClick={() => setSubTab('jobs')}
          style={{
            backgroundColor: subTab === 'jobs' ? '#1e293b' : 'transparent',
            color: subTab === 'jobs' ? '#f43f5e' : '#94a3b8',
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
          <span style={{ display: 'inline-flex' }}><Video size={14} /></span>
          Render Pipeline & Job Queue ({jobs.length})
        </button>

        <button
          onClick={() => setSubTab('nodes')}
          style={{
            backgroundColor: subTab === 'nodes' ? '#1e293b' : 'transparent',
            color: subTab === 'nodes' ? '#f43f5e' : '#94a3b8',
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
          GPU Transcoding Node Cluster ({nodes.length})
        </button>

        <button
          onClick={() => setSubTab('templates')}
          style={{
            backgroundColor: subTab === 'templates' ? '#1e293b' : 'transparent',
            color: subTab === 'templates' ? '#f43f5e' : '#94a3b8',
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
          <span style={{ display: 'inline-flex' }}><Layers size={14} /></span>
          Motion Composition Templates ({templates.length})
        </button>

        <button
          onClick={() => setSubTab('sandbox')}
          style={{
            backgroundColor: subTab === 'sandbox' ? '#1e293b' : 'transparent',
            color: subTab === 'sandbox' ? '#f43f5e' : '#94a3b8',
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
          <span style={{ display: 'inline-flex' }}><Sparkles size={14} /></span>
          Interactive Composition Sandbox & Artifacts
        </button>
      </div>

      {/* Sub-Tab 1: Render Pipeline & Job Queue */}
      {subTab === 'jobs' && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              In-Flight & Completed Render Queue
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Showing {jobs.length} jobs
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Job Details</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Aspect & Resolution</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Codec & FPS</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>GPU Node</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Progress</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      backgroundColor: selectedJobId === job.id ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-flex', color: '#f43f5e' }}><Film size={14} /></span>
                        {job.job_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{job.id} • {job.duration_seconds}s</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {job.aspect_ratio}
                      </span>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {job.resolution_width}x{job.resolution_height}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {job.codec.toUpperCase()} @ {job.fps}fps
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                      {job.gpu_node_id || <span style={{ color: '#64748b' }}>Pending allocation</span>}
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: '130px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: '#0f172a', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${job.progress_percent}%`,
                              backgroundColor: job.status === 'completed' ? '#10b981' : '#f43f5e',
                              height: '100%',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>{job.progress_percent}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor:
                            job.status === 'completed'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : job.status === 'rendering'
                              ? 'rgba(244, 63, 94, 0.15)'
                              : job.status === 'transcoding'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : 'rgba(148, 163, 184, 0.15)',
                          color:
                            job.status === 'completed'
                              ? '#34d399'
                              : job.status === 'rendering'
                              ? '#fb7185'
                              : job.status === 'transcoding'
                              ? '#c084fc'
                              : '#94a3b8',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            handleSelectJob(job.id);
                            setSubTab('sandbox');
                          }}
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          View
                        </button>
                        {(job.status === 'queued' || job.status === 'rendering') && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: GPU Transcoding Node Cluster */}
      {subTab === 'nodes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
              Connected GPU Transcoding Acceleration Nodes
            </h3>
            <button
              onClick={() => setShowRegisterNodeModal(true)}
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ display: 'inline-flex' }}><Plus size={12} /></span>
              Register GPU Node
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {nodes.map((node) => {
              const vramPercent = Math.round((node.allocated_vram_gb / (node.total_vram_gb || 1)) * 100);
              return (
                <div
                  key={node.id}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                        {node.node_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Provider: {node.provider} • ID: {node.id}
                      </div>
                    </div>
                    <span
                      style={{
                        backgroundColor: node.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: node.status === 'healthy' ? '#10b981' : '#ef4444',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {node.status}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', borderRadius: '6px', padding: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                      <span>GPU Hardware:</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{node.gpu_device_model}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                      <span>Acceleration:</span>
                      <span style={{ color: '#fb7185', fontWeight: 600 }}>{node.acceleration_type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                      <span>Active Jobs:</span>
                      <span>{node.active_jobs_count} / {node.max_concurrent_jobs} concurrent</span>
                    </div>
                  </div>

                  {/* VRAM Gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      <span>VRAM Allocation: {node.allocated_vram_gb} GB / {node.total_vram_gb} GB</span>
                      <span style={{ fontWeight: 600, color: vramPercent > 80 ? '#ef4444' : '#10b981' }}>{vramPercent}%</span>
                    </div>
                    <div style={{ backgroundColor: '#0f172a', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${vramPercent}%`,
                          backgroundColor: vramPercent > 80 ? '#ef4444' : '#6366f1',
                          height: '100%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Motion Composition Templates */}
      {subTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                    {tmpl.template_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Brand: {tmpl.target_brand_id}
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {tmpl.default_aspect_ratio}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                Duration: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{tmpl.duration_seconds}s</span> • Layers: <span style={{ fontWeight: 600, color: '#f43f5e' }}>{tmpl.total_layers_count}</span>
              </div>

              {/* Composition Layer List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tmpl.composition_layers_payload.map((layer) => (
                  <div
                    key={layer.id}
                    style={{
                      backgroundColor: '#0f172a',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#f8fafc' }}>{layer.name}</span>
                    <span style={{ color: '#94a3b8' }}>{layer.type} ({layer.durationSeconds}s)</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-Tab 4: Interactive Composition Sandbox & Artifacts */}
      {subTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 360px', gap: '20px' }}>
          {/* Main Visual Composition Player Preview */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                  GPU Hardware Composition Canvas Preview
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Target Aspect Ratio: <span style={{ color: '#f43f5e', fontWeight: 600 }}>{sandboxAspect}</span> • Engine: <span style={{ color: '#38bdf8', fontWeight: 600 }}>NVIDIA NVENC Accelerated</span>
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['9:16', '1:1', '16:9'] as VideoAspectRatio[]).map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setSandboxAspect(ar)}
                    style={{
                      backgroundColor: sandboxAspect === ar ? '#f43f5e' : '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Viewport Frame */}
            <div
              style={{
                width: '100%',
                height: '380px',
                backgroundColor: '#090d16',
                borderRadius: '8px',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Dynamic Aspect Ratio Box */}
              <div
                style={{
                  height: sandboxAspect === '9:16' ? '340px' : sandboxAspect === '1:1' ? '280px' : '200px',
                  width: sandboxAspect === '9:16' ? '190px' : sandboxAspect === '1:1' ? '280px' : '355px',
                  backgroundColor: '#1e1b4b',
                  borderRadius: '6px',
                  border: '2px solid #6366f1',
                  boxShadow: '0 0 24px rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  boxSizing: 'border-box',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#a5b4fc', fontWeight: 600 }}>
                  <span>4K READY</span>
                  <span>30 FPS</span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    NEXT-GEN BRAND LAUNCH
                  </div>
                  <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px', fontWeight: 600 }}>
                    #HoaspForgeDynamicReel
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      backgroundColor: 'rgba(244, 63, 94, 0.8)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ display: 'inline-flex' }}>{isPlaying ? <Pause size={12} /> : <Play size={12} />}</span>
                    {isPlaying ? 'Pause' : 'Play Preview'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Simulate GPU Transcoding Workload:
              </span>
              <button
                onClick={handleSimulateSandboxRender}
                disabled={simulatingRender}
                style={{
                  backgroundColor: '#f43f5e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: simulatingRender ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'inline-flex' }}><Zap size={14} className={simulatingRender ? 'animate-bounce' : ''} /></span>
                {simulatingRender ? 'Transcoding on GPU...' : 'Simulate 1080p GPU Transcode'}
              </button>
            </div>
          </div>

          {/* Right Artifact & Job Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                Render Job Forensics & Artifacts
              </h4>

              {selectedJobDetail ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ backgroundColor: '#0f172a', borderRadius: '6px', padding: '10px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      {selectedJobDetail.job.job_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Status: <span style={{ color: '#10b981', fontWeight: 600 }}>{selectedJobDetail.job.status}</span> • Render Time: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedJobDetail.job.render_time_ms}ms</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Resolution: {selectedJobDetail.job.resolution_width}x{selectedJobDetail.job.resolution_height} ({selectedJobDetail.job.aspect_ratio})
                    </div>
                  </div>

                  <h5 style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                    Compiled Video Artifacts ({selectedJobDetail.artifacts.length})
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedJobDetail.artifacts.map((art) => (
                      <div
                        key={art.id}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{art.artifact_label}</span>
                          <span style={{ fontSize: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '3px' }}>
                            {art.format}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Bitrate: {art.bitrate_kbps} kbps • Size: {(art.size_bytes / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', wordBreak: 'break-all' }}>
                          SHA-256: {art.checksum_sha256}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>Select a job from the pipeline to inspect artifacts</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Render Job */}
      {showCreateJobModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Dispatch Cloud GPU Video Render Job
              </h3>
              <button
                onClick={() => setShowCreateJobModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}><X size={18} /></span>
              </button>
            </div>

            <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                  Job Name
                </label>
                <input
                  type="text"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    Target Brand ID
                  </label>
                  <input
                    type="text"
                    value={newJobBrandId}
                    onChange={(e) => setNewJobBrandId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    Aspect Ratio
                  </label>
                  <select
                    value={newJobAspectRatio}
                    onChange={(e) => setNewJobAspectRatio(e.target.value as VideoAspectRatio)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="9:16">9:16 (Vertical Reel / Story)</option>
                    <option value="1:1">1:1 (Square Feed Post)</option>
                    <option value="16:9">16:9 (Landscape Video)</option>
                    <option value="4:5">4:5 (Portrait Feed)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    Codec
                  </label>
                  <select
                    value={newJobCodec}
                    onChange={(e) => setNewJobCodec(e.target.value as VideoCodecType)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="h264">H.264 (Maximum Compatibility)</option>
                    <option value="hevc_h265">H.265 / HEVC (High Efficiency)</option>
                    <option value="av1">AV1 (Next-Gen Open Standard)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    FPS
                  </label>
                  <input
                    type="number"
                    value={newJobFps}
                    onChange={(e) => setNewJobFps(Number(e.target.value))}
                    min={24}
                    max={60}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateJobModal(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#f43f5e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Dispatch to GPU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register GPU Node */}
      {showRegisterNodeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Register Cloud GPU Node to Cluster
              </h3>
              <button
                onClick={() => setShowRegisterNodeModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}><X size={18} /></span>
              </button>
            </div>

            <form onSubmit={handleRegisterNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                  Node Name
                </label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                  GPU Hardware Device
                </label>
                <input
                  type="text"
                  value={newNodeModel}
                  onChange={(e) => setNewNodeModel(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    VRAM Capacity (GB)
                  </label>
                  <input
                    type="number"
                    value={newNodeVram}
                    onChange={(e) => setNewNodeVram(Number(e.target.value))}
                    min={8}
                    max={128}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    Max Concurrency
                  </label>
                  <input
                    type="number"
                    value={newNodeMaxJobs}
                    onChange={(e) => setNewNodeMaxJobs(Number(e.target.value))}
                    min={1}
                    max={16}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterNodeModal(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#f43f5e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
