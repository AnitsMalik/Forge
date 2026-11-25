import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. collaborative_canvas_rooms
  await knex.schema.createTable('collaborative_canvas_rooms', (table) => {
    table.string('id', 64).primary();
    table.string('room_name', 128).notNullable();
    table.string('target_brand_id', 64).notNullable().index();
    table.string('template_id', 64).nullable().index();
    table.integer('current_revision').notNullable().defaultTo(0);
    table.integer('active_peers_count').notNullable().defaultTo(0);
    table.boolean('is_locked').notNullable().defaultTo(false);
    table.string('status', 32).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. canvas_document_snapshots
  await knex.schema.createTable('canvas_document_snapshots', (table) => {
    table.string('id', 64).primary();
    table.string('room_id', 64).notNullable().index();
    table.integer('revision').notNullable().defaultTo(0);
    table.text('elements_payload', 'longtext').notNullable();
    table.integer('total_elements_count').notNullable().defaultTo(0);
    table.string('checksum_sha256', 128).notNullable();
    table.timestamp('compacted_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. operational_transformation_ops
  await knex.schema.createTable('operational_transformation_ops', (table) => {
    table.string('id', 64).primary();
    table.string('room_id', 64).notNullable().index();
    table.string('client_id', 128).notNullable();
    table.string('op_type', 64).notNullable();
    table.string('target_layer_id', 64).notNullable().index();
    table.integer('base_revision').notNullable().defaultTo(0);
    table.integer('applied_revision').notNullable().defaultTo(0);
    table.text('payload', 'mediumtext').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. active_user_presence_sessions
  await knex.schema.createTable('active_user_presence_sessions', (table) => {
    table.string('id', 64).primary();
    table.string('room_id', 64).notNullable().index();
    table.string('user_id', 64).notNullable().index();
    table.string('user_email', 255).notNullable();
    table.string('display_name', 128).notNullable();
    table.float('cursor_position_x').notNullable().defaultTo(0);
    table.float('cursor_position_y').notNullable().defaultTo(0);
    table.string('current_selected_layer_id', 64).nullable();
    table.timestamp('last_heartbeat_at').notNullable().defaultTo(knex.fn.now());
    table.string('connection_status', 32).notNullable().defaultTo('connected');
  });

  // Pre-seed Canvas Rooms
  await knex('collaborative_canvas_rooms').insert([
    {
      id: 'room-brand-launch-reel-01',
      room_name: 'Product Launch 9:16 Vertical Reel Studio',
      target_brand_id: 'brand-flagship-001',
      template_id: 'template-reel-flagship-01',
      current_revision: 5,
      active_peers_count: 3,
      is_locked: false,
      status: 'active',
      created_at: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: 'room-instagram-story-template',
      room_name: 'Instagram Story Flash Sale Dynamic Canvas',
      target_brand_id: 'brand-flagship-001',
      template_id: 'template-story-flash-02',
      current_revision: 12,
      active_peers_count: 2,
      is_locked: false,
      status: 'active',
      created_at: new Date('2026-09-05T00:00:00Z'),
    },
    {
      id: 'room-q4-product-banner',
      room_name: 'Q4 Global Product Display Ad Board',
      target_brand_id: 'brand-flagship-001',
      template_id: null,
      current_revision: 2,
      active_peers_count: 0,
      is_locked: false,
      status: 'idle',
      created_at: new Date('2026-09-10T00:00:00Z'),
    },
  ]);

  // Pre-seed Snapshots with initial element layers
  const initialLayers = [
    {
      id: 'layer-bg-gradient',
      type: 'shape',
      name: 'Background Gradient',
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      props: { fill: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' },
    },
    {
      id: 'layer-title-headline',
      type: 'text',
      name: 'Hero Hook Headline',
      x: 120,
      y: 380,
      width: 840,
      height: 180,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      props: { text: 'REVOLUTIONIZE YOUR WORKFLOW', font: 'Inter', fontSize: 52, color: '#f8fafc', fontWeight: 800 },
    },
    {
      id: 'layer-product-mockup',
      type: 'image',
      name: 'Flagship UI Mockup',
      x: 140,
      y: 620,
      width: 800,
      height: 700,
      rotation: -2,
      opacity: 1,
      zIndex: 2,
      props: { url: 'https://cdn.socialforge.io/assets/mockup_3d_render.png', cornerRadius: 24 },
    },
  ];

  await knex('canvas_document_snapshots').insert([
    {
      id: 'snap-reel-01-v0',
      room_id: 'room-brand-launch-reel-01',
      revision: 5,
      elements_payload: JSON.stringify(initialLayers),
      total_elements_count: 3,
      checksum_sha256: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      compacted_at: new Date('2026-10-21T08:00:00Z'),
    },
    {
      id: 'snap-story-02-v0',
      room_id: 'room-instagram-story-template',
      revision: 12,
      elements_payload: JSON.stringify(initialLayers.slice(0, 2)),
      total_elements_count: 2,
      checksum_sha256: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
      compacted_at: new Date('2026-10-21T09:00:00Z'),
    },
  ]);

  // Pre-seed Operational Transformation Ops
  await knex('operational_transformation_ops').insert([
    {
      id: 'op-seed-001',
      room_id: 'room-brand-launch-reel-01',
      client_id: 'client-peer-alpha',
      op_type: 'update_transform',
      target_layer_id: 'layer-title-headline',
      base_revision: 4,
      applied_revision: 5,
      payload: JSON.stringify({ x: 120, y: 380, rotation: 0 }),
      created_at: new Date('2026-10-21T08:15:00Z'),
    },
    {
      id: 'op-seed-002',
      room_id: 'room-instagram-story-template',
      client_id: 'client-peer-beta',
      op_type: 'style_change',
      target_layer_id: 'layer-title-headline',
      base_revision: 11,
      applied_revision: 12,
      payload: JSON.stringify({ color: '#38bdf8', fontSize: 56 }),
      created_at: new Date('2026-10-21T09:12:00Z'),
    },
  ]);

  // Pre-seed Presence Sessions
  await knex('active_user_presence_sessions').insert([
    {
      id: 'presence-seed-01',
      room_id: 'room-brand-launch-reel-01',
      user_id: 'usr-designer-01',
      user_email: 'designer.lead@socialforge.io',
      display_name: 'Elena Rostova (Motion Lead)',
      cursor_position_x: 245.5,
      cursor_position_y: 410.0,
      current_selected_layer_id: 'layer-title-headline',
      last_heartbeat_at: new Date(),
      connection_status: 'connected',
    },
    {
      id: 'presence-seed-02',
      room_id: 'room-brand-launch-reel-01',
      user_id: 'usr-copywriter-02',
      user_email: 'copy.specialist@socialforge.io',
      display_name: 'Marcus Vance (Copy Lead)',
      cursor_position_x: 610.0,
      cursor_position_y: 840.2,
      current_selected_layer_id: 'layer-product-mockup',
      last_heartbeat_at: new Date(),
      connection_status: 'connected',
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('active_user_presence_sessions');
  await knex.schema.dropTableIfExists('operational_transformation_ops');
  await knex.schema.dropTableIfExists('canvas_document_snapshots');
  await knex.schema.dropTableIfExists('collaborative_canvas_rooms');
}
