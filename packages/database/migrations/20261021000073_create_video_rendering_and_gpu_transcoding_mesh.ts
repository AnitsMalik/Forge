import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. gpu_transcode_nodes
  await knex.schema.createTable('gpu_transcode_nodes', (table) => {
    table.string('id', 64).primary();
    table.string('node_name', 128).notNullable();
    table.string('provider', 64).notNullable();
    table.string('gpu_device_model', 128).notNullable();
    table.string('acceleration_type', 64).notNullable();
    table.float('total_vram_gb').notNullable().defaultTo(16.0);
    table.float('allocated_vram_gb').notNullable().defaultTo(0.0);
    table.integer('active_jobs_count').notNullable().defaultTo(0);
    table.integer('max_concurrent_jobs').notNullable().defaultTo(4);
    table.string('status', 32).notNullable().defaultTo('healthy');
    table.timestamp('last_heartbeat_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. motion_composition_templates
  await knex.schema.createTable('motion_composition_templates', (table) => {
    table.string('id', 64).primary();
    table.string('template_name', 128).notNullable();
    table.string('target_brand_id', 64).notNullable().index();
    table.string('default_aspect_ratio', 16).notNullable().defaultTo('9:16');
    table.float('duration_seconds').notNullable().defaultTo(15.0);
    table.text('composition_layers_payload', 'longtext').notNullable();
    table.integer('total_layers_count').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. gpu_video_render_jobs
  await knex.schema.createTable('gpu_video_render_jobs', (table) => {
    table.string('id', 64).primary();
    table.string('job_name', 128).notNullable();
    table.string('target_brand_id', 64).notNullable().index();
    table.string('template_id', 64).nullable().index();
    table.string('aspect_ratio', 16).notNullable().defaultTo('9:16');
    table.integer('resolution_width').notNullable().defaultTo(1080);
    table.integer('resolution_height').notNullable().defaultTo(1920);
    table.integer('fps').notNullable().defaultTo(30);
    table.float('duration_seconds').notNullable().defaultTo(15.0);
    table.string('codec', 32).notNullable().defaultTo('h264');
    table.string('gpu_node_id', 64).nullable().index();
    table.integer('progress_percent').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('queued').index();
    table.text('output_asset_url', 'mediumtext').nullable();
    table.bigInteger('file_size_bytes').notNullable().defaultTo(0);
    table.integer('render_time_ms').notNullable().defaultTo(0);
    table.text('error_message').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });

  // 4. rendered_video_artifacts
  await knex.schema.createTable('rendered_video_artifacts', (table) => {
    table.string('id', 64).primary();
    table.string('render_job_id', 64).notNullable().index();
    table.string('artifact_label', 128).notNullable();
    table.string('resolution', 32).notNullable();
    table.integer('bitrate_kbps').notNullable().defaultTo(5000);
    table.string('format', 32).notNullable().defaultTo('mp4');
    table.text('storage_url').notNullable();
    table.string('checksum_sha256', 128).notNullable();
    table.bigInteger('size_bytes').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Pre-seed GPU Transcode Nodes
  await knex('gpu_transcode_nodes').insert([
    {
      id: 'gpu-node-aws-nvenc-01',
      node_name: 'AWS US-East G4dn Dedicated Transcoder',
      provider: 'aws_g4dn',
      gpu_device_model: 'NVIDIA T4 Tensor Core',
      acceleration_type: 'nvidia_nvenc',
      total_vram_gb: 16.0,
      allocated_vram_gb: 4.0,
      active_jobs_count: 1,
      max_concurrent_jobs: 4,
      status: 'healthy',
      last_heartbeat_at: new Date(),
    },
    {
      id: 'gpu-node-gcp-a100-02',
      node_name: 'GCP Europe-West A2 Supercomputer Cluster',
      provider: 'gcp_a100',
      gpu_device_model: 'NVIDIA A100-SXM4-80GB',
      acceleration_type: 'nvidia_nvenc',
      total_vram_gb: 80.0,
      allocated_vram_gb: 16.0,
      active_jobs_count: 2,
      max_concurrent_jobs: 8,
      status: 'healthy',
      last_heartbeat_at: new Date(),
    },
    {
      id: 'gpu-node-onprem-rtx-03',
      node_name: 'On-Prem Dedicated Edge RTX-4090 Pod',
      provider: 'on_prem_rtx',
      gpu_device_model: 'NVIDIA GeForce RTX 4090',
      acceleration_type: 'nvidia_nvenc',
      total_vram_gb: 24.0,
      allocated_vram_gb: 0.0,
      active_jobs_count: 0,
      max_concurrent_jobs: 4,
      status: 'healthy',
      last_heartbeat_at: new Date(),
    },
  ]);

  // Pre-seed Motion Composition Templates
  const reelLayers = [
    {
      id: 'layer-intro-bg',
      name: 'Dynamic 3D Particle Loop',
      type: 'video',
      startTimeSeconds: 0,
      durationSeconds: 15,
      properties: { speed: 1.0, loop: true, opacity: 0.95 },
    },
    {
      id: 'layer-headline-motion',
      name: 'Kinetic Typography Headline',
      type: 'text',
      startTimeSeconds: 1.5,
      durationSeconds: 6.0,
      properties: { text: 'UNLEASH THE REVOLUTION', font: 'Outfit', animation: 'kinetic_slide_up', color: '#f8fafc' },
    },
    {
      id: 'layer-audio-soundtrack',
      name: 'Synthwave High-BPM Score',
      type: 'audio',
      startTimeSeconds: 0,
      durationSeconds: 15,
      properties: { volume: 0.85, fadeInSeconds: 0.5 },
    },
  ];

  await knex('motion_composition_templates').insert([
    {
      id: 'template-motion-reel-916',
      template_name: 'Product Launch 9:16 Vertical Reel',
      target_brand_id: 'brand-flagship-001',
      default_aspect_ratio: '9:16',
      duration_seconds: 15.0,
      composition_layers_payload: JSON.stringify(reelLayers),
      total_layers_count: 3,
      is_active: true,
      created_at: new Date('2026-10-01T00:00:00Z'),
    },
    {
      id: 'template-motion-square-11',
      template_name: 'Flash Sale 1:1 Square Feed Video',
      target_brand_id: 'brand-flagship-001',
      default_aspect_ratio: '1:1',
      duration_seconds: 10.0,
      composition_layers_payload: JSON.stringify(reelLayers.slice(0, 2)),
      total_layers_count: 2,
      is_active: true,
      created_at: new Date('2026-10-05T00:00:00Z'),
    },
    {
      id: 'template-motion-landscape-169',
      template_name: 'Brand Narrative 16:9 Landscape Video',
      target_brand_id: 'brand-flagship-001',
      default_aspect_ratio: '16:9',
      duration_seconds: 30.0,
      composition_layers_payload: JSON.stringify(reelLayers),
      total_layers_count: 3,
      is_active: true,
      created_at: new Date('2026-10-10T00:00:00Z'),
    },
  ]);

  // Pre-seed GPU Video Render Jobs
  await knex('gpu_video_render_jobs').insert([
    {
      id: 'job-render-reel-flagship-01',
      job_name: 'Flagship Q4 Product Reel',
      target_brand_id: 'brand-flagship-001',
      template_id: 'template-motion-reel-916',
      aspect_ratio: '9:16',
      resolution_width: 1080,
      resolution_height: 1920,
      fps: 30,
      duration_seconds: 15.0,
      codec: 'h264',
      gpu_node_id: 'gpu-node-aws-nvenc-01',
      progress_percent: 100,
      status: 'completed',
      output_asset_url: 'https://cdn.socialforge.io/renders/job-render-reel-flagship-01/master_1080p.mp4',
      file_size_bytes: 18450200,
      render_time_ms: 3240,
      error_message: null,
      created_at: new Date('2026-10-21T06:00:00Z'),
      completed_at: new Date('2026-10-21T06:00:03.240Z'),
    },
    {
      id: 'job-render-flash-square-02',
      job_name: 'Flash Discount Countdown Video',
      target_brand_id: 'brand-flagship-001',
      template_id: 'template-motion-square-11',
      aspect_ratio: '1:1',
      resolution_width: 1080,
      resolution_height: 1080,
      fps: 60,
      duration_seconds: 10.0,
      codec: 'hevc_h265',
      gpu_node_id: 'gpu-node-gcp-a100-02',
      progress_percent: 65,
      status: 'rendering',
      output_asset_url: null,
      file_size_bytes: 0,
      render_time_ms: 0,
      error_message: null,
      created_at: new Date('2026-10-21T07:30:00Z'),
      completed_at: null,
    },
    {
      id: 'job-render-landscape-03',
      job_name: 'Executive Brand Keynote Teaser',
      target_brand_id: 'brand-flagship-001',
      template_id: 'template-motion-landscape-169',
      aspect_ratio: '16:9',
      resolution_width: 1920,
      resolution_height: 1080,
      fps: 30,
      duration_seconds: 30.0,
      codec: 'h264',
      gpu_node_id: null,
      progress_percent: 0,
      status: 'queued',
      output_asset_url: null,
      file_size_bytes: 0,
      render_time_ms: 0,
      error_message: null,
      created_at: new Date('2026-10-21T08:00:00Z'),
      completed_at: null,
    },
  ]);

  // Pre-seed Rendered Video Artifacts
  await knex('rendered_video_artifacts').insert([
    {
      id: 'art-reel-01-master-1080p',
      render_job_id: 'job-render-reel-flagship-01',
      artifact_label: '1080p Master MP4',
      resolution: '1080x1920',
      bitrate_kbps: 6500,
      format: 'mp4',
      storage_url: 'https://cdn.socialforge.io/renders/job-render-reel-flagship-01/master_1080p.mp4',
      checksum_sha256: 'c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
      size_bytes: 18450200,
      created_at: new Date('2026-10-21T06:00:03Z'),
    },
    {
      id: 'art-reel-01-hls-playlist',
      render_job_id: 'job-render-reel-flagship-01',
      artifact_label: 'Adaptive Bitrate HLS Stream',
      resolution: 'Adaptive',
      bitrate_kbps: 3500,
      format: 'hls_playlist',
      storage_url: 'https://cdn.socialforge.io/renders/job-render-reel-flagship-01/master.m3u8',
      checksum_sha256: 'd2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
      size_bytes: 4200150,
      created_at: new Date('2026-10-21T06:00:03Z'),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rendered_video_artifacts');
  await knex.schema.dropTableIfExists('gpu_video_render_jobs');
  await knex.schema.dropTableIfExists('motion_composition_templates');
  await knex.schema.dropTableIfExists('gpu_transcode_nodes');
}
