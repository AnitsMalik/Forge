/**
 * Multi-Tenant Real-Time Video Rendering Pipeline, Dynamic Motion Graphics & Cloud GPU Transcoding Mesh Types
 * SocialForge Platform v6.6.0
 */

export type VideoRenderJobStatus = 'queued' | 'rendering' | 'transcoding' | 'completed' | 'failed' | 'cancelled';
export type VideoAspectRatio = '9:16' | '1:1' | '16:9' | '4:5';
export type VideoCodecType = 'h264' | 'hevc_h265' | 'av1' | 'prores';
export type GpuAccelerationType = 'nvidia_nvenc' | 'apple_videotoolbox' | 'intel_qsv' | 'vaapi_linux' | 'cpu_software';
export type GpuTranscodeNodeStatus = 'healthy' | 'busy' | 'draining' | 'offline';
export type VideoArtifactFormat = 'mp4' | 'webm' | 'hls_playlist';

export interface MotionCompositionLayer {
  id: string;
  name: string;
  type: 'video' | 'text' | 'image' | 'audio' | 'effect';
  startTimeSeconds: number;
  durationSeconds: number;
  properties: Record<string, any>;
}

export interface GpuVideoRenderJob {
  id: string;
  job_name: string;
  target_brand_id: string;
  template_id: string | null;
  aspect_ratio: VideoAspectRatio;
  resolution_width: number;
  resolution_height: number;
  fps: number;
  duration_seconds: number;
  codec: VideoCodecType;
  gpu_node_id: string | null;
  progress_percent: number;
  status: VideoRenderJobStatus;
  output_asset_url: string | null;
  file_size_bytes: number;
  render_time_ms: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MotionCompositionTemplate {
  id: string;
  template_name: string;
  target_brand_id: string;
  default_aspect_ratio: VideoAspectRatio;
  duration_seconds: number;
  composition_layers_payload: MotionCompositionLayer[];
  total_layers_count: number;
  is_active: boolean;
  created_at: string;
}

export interface GpuTranscodeNode {
  id: string;
  node_name: string;
  provider: string; // e.g., 'aws_g4dn', 'gcp_a100', 'azure_ncv3', 'on_prem_rtx'
  gpu_device_model: string; // e.g., 'NVIDIA T4 Tensor Core', 'NVIDIA A100-SXM4-80GB', 'RTX 4090'
  acceleration_type: GpuAccelerationType;
  total_vram_gb: number;
  allocated_vram_gb: number;
  active_jobs_count: number;
  max_concurrent_jobs: number;
  status: GpuTranscodeNodeStatus;
  last_heartbeat_at: string;
}

export interface RenderedVideoArtifact {
  id: string;
  render_job_id: string;
  artifact_label: string; // e.g., '1080p Master MP4', '720p Mobile Preview', 'Adaptive HLS Stream'
  resolution: string; // e.g., '1080x1920', '720x1280'
  bitrate_kbps: number;
  format: VideoArtifactFormat;
  storage_url: string;
  checksum_sha256: string;
  size_bytes: number;
  created_at: string;
}

export interface VideoRenderingTelemetry {
  total_active_jobs: number;
  total_queued_jobs: number;
  online_gpu_nodes: number;
  total_rendered_videos_24h: number;
  avg_render_speedup_factor: number;
  avg_job_latency_ms: number;
}

export interface CreateRenderJobInput {
  job_name: string;
  target_brand_id: string;
  template_id?: string;
  aspect_ratio: VideoAspectRatio;
  fps?: number;
  duration_seconds?: number;
  codec?: VideoCodecType;
  preferred_gpu_node_id?: string;
}

export interface CreateMotionTemplateInput {
  template_name: string;
  target_brand_id: string;
  default_aspect_ratio: VideoAspectRatio;
  duration_seconds: number;
  composition_layers?: MotionCompositionLayer[];
}

export interface RegisterGpuNodeInput {
  node_name: string;
  provider: string;
  gpu_device_model: string;
  acceleration_type: GpuAccelerationType;
  total_vram_gb: number;
  max_concurrent_jobs?: number;
}

export interface UpdateJobProgressInput {
  job_id: string;
  progress_percent: number;
  status?: VideoRenderJobStatus;
  output_asset_url?: string;
  file_size_bytes?: number;
  render_time_ms?: number;
  error_message?: string;
}
