import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. neural_embedding_models
  await knex.schema.createTable('neural_embedding_models', (table) => {
    table.string('id', 64).primary();
    table.string('model_name', 128).notNullable();
    table.string('provider_type', 64).notNullable();
    table.string('model_family', 64).notNullable();
    table.integer('dimension_size').notNullable();
    table.integer('max_input_tokens').notNullable().defaultTo(8191);
    table.float('cost_per_million_tokens').notNullable().defaultTo(0.13);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_default').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. rag_knowledge_collections
  await knex.schema.createTable('rag_knowledge_collections', (table) => {
    table.string('id', 64).primary();
    table.string('collection_name', 128).notNullable().unique();
    table.string('target_tenant_id', 64).notNullable().defaultTo('global_system');
    table.string('model_id', 64).notNullable().index();
    table.string('distance_metric', 32).notNullable().defaultTo('cosine');
    table.string('index_type', 32).notNullable().defaultTo('hnsw');
    table.integer('total_vectors_count').notNullable().defaultTo(0);
    table.timestamp('last_synced_at').nullable();
    table.boolean('is_immutable').notNullable().defaultTo(false);
    table.string('status', 32).notNullable().defaultTo('ready');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. semantic_vector_embeddings
  await knex.schema.createTable('semantic_vector_embeddings', (table) => {
    table.string('id', 64).primary();
    table.string('collection_id', 64).notNullable().index();
    table.string('document_id', 128).notNullable().index();
    table.integer('chunk_index').notNullable().defaultTo(0);
    table.text('content_text', 'mediumtext').notNullable();
    table.text('embedding_vector', 'longtext').nullable();
    table.text('metadata', 'mediumtext').nullable();
    table.integer('token_count').notNullable().defaultTo(0);
    table.string('sha256_hash', 128).notNullable().index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. hybrid_search_query_logs
  await knex.schema.createTable('hybrid_search_query_logs', (table) => {
    table.string('id', 64).primary();
    table.string('collection_id', 64).notNullable().index();
    table.text('query_text').notNullable();
    table.integer('top_k').notNullable().defaultTo(5);
    table.float('dense_weight').notNullable().defaultTo(0.7);
    table.float('sparse_weight').notNullable().defaultTo(0.3);
    table.integer('latency_ms').notNullable().defaultTo(12);
    table.integer('total_results_found').notNullable().defaultTo(0);
    table.string('operator_email', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Pre-seed Neural Embedding Models
  await knex('neural_embedding_models').insert([
    {
      id: 'model-openai-text-3-large',
      model_name: 'OpenAI text-embedding-3-large (1536d)',
      provider_type: 'openai',
      model_family: 'text-embedding-3-large',
      dimension_size: 1536,
      max_input_tokens: 8191,
      cost_per_million_tokens: 0.13,
      is_active: true,
      is_default: true,
      created_at: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: 'model-cohere-embed-v3',
      model_name: 'Cohere Embed English v3.0 (1024d)',
      provider_type: 'cohere',
      model_family: 'embed-english-v3.0',
      dimension_size: 1024,
      max_input_tokens: 512,
      cost_per_million_tokens: 0.10,
      is_active: true,
      is_default: false,
      created_at: new Date('2026-09-05T00:00:00Z'),
    },
    {
      id: 'model-hf-bge-large',
      model_name: 'BAAI BGE-Large-EN-v1.5 Triton Cluster (1024d)',
      provider_type: 'huggingface_local',
      model_family: 'bge-large-en-v1.5',
      dimension_size: 1024,
      max_input_tokens: 512,
      cost_per_million_tokens: 0.00,
      is_active: true,
      is_default: false,
      created_at: new Date('2026-09-10T00:00:00Z'),
    },
  ]);

  // Pre-seed RAG Knowledge Collections
  await knex('rag_knowledge_collections').insert([
    {
      id: 'collection-brand-guidelines',
      collection_name: 'brand-guidelines-kb',
      target_tenant_id: 'global_system',
      model_id: 'model-openai-text-3-large',
      distance_metric: 'cosine',
      index_type: 'hnsw',
      total_vectors_count: 1420,
      last_synced_at: new Date('2026-10-21T08:00:00Z'),
      is_immutable: false,
      status: 'ready',
      created_at: new Date('2026-09-02T00:00:00Z'),
    },
    {
      id: 'collection-compliance-rulebooks',
      collection_name: 'compliance-rulebooks-kb',
      target_tenant_id: 'global_system',
      model_id: 'model-openai-text-3-large',
      distance_metric: 'cosine',
      index_type: 'hnsw',
      total_vectors_count: 890,
      last_synced_at: new Date('2026-10-21T09:30:00Z'),
      is_immutable: true,
      status: 'ready',
      created_at: new Date('2026-09-06T00:00:00Z'),
    },
    {
      id: 'collection-campaign-creatives',
      collection_name: 'campaign-historical-creatives-kb',
      target_tenant_id: 'global_system',
      model_id: 'model-cohere-embed-v3',
      distance_metric: 'cosine',
      index_type: 'hnsw',
      total_vectors_count: 3410,
      last_synced_at: new Date('2026-10-21T11:15:00Z'),
      is_immutable: false,
      status: 'ready',
      created_at: new Date('2026-09-12T00:00:00Z'),
    },
  ]);

  // Pre-seed Sample Semantic Embeddings
  await knex('semantic_vector_embeddings').insert([
    {
      id: 'emb-seed-001',
      collection_id: 'collection-brand-guidelines',
      document_id: 'doc-brand-voice-2026',
      chunk_index: 0,
      content_text: 'Brand Voice and Tone: Maintain an authoritative yet approachable tone in all social media broadcasts. Emphasize measurable business ROI and customer empowerment.',
      embedding_vector: JSON.stringify([0.024, 0.081, -0.052, 0.129, -0.015, 0.048]),
      metadata: JSON.stringify({ category: 'voice_tone', priority: 'high', author: 'vp_marketing' }),
      token_count: 28,
      sha256_hash: '3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
      created_at: new Date('2026-09-03T00:00:00Z'),
    },
    {
      id: 'emb-seed-002',
      collection_id: 'collection-brand-guidelines',
      document_id: 'doc-visual-guidelines-2026',
      chunk_index: 1,
      content_text: 'Visual Aesthetics & Palettes: Use curated dark mode palettes with cyan accent (#38bdf8), clean typography (Inter / Outfit), and subtle glassmorphic container elevations.',
      embedding_vector: JSON.stringify([0.015, -0.033, 0.091, 0.065, -0.082, 0.041]),
      metadata: JSON.stringify({ category: 'visual_design', approved: true }),
      token_count: 27,
      sha256_hash: '5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
      created_at: new Date('2026-09-03T01:00:00Z'),
    },
    {
      id: 'emb-seed-003',
      collection_id: 'collection-compliance-rulebooks',
      document_id: 'doc-sec-finra-guardrails',
      chunk_index: 0,
      content_text: 'Financial Claims Guardrails: Never promise guaranteed financial returns or future crypto asset appreciation. Always affix standard SEC regulatory disclaimer.',
      embedding_vector: JSON.stringify([-0.062, 0.044, 0.018, 0.110, 0.095, -0.022]),
      metadata: JSON.stringify({ category: 'legal_compliance', mandatory: true }),
      token_count: 26,
      sha256_hash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      created_at: new Date('2026-09-07T00:00:00Z'),
    },
  ]);

  // Pre-seed Hybrid Search Logs
  await knex('hybrid_search_query_logs').insert([
    {
      id: 'log-query-001',
      collection_id: 'collection-brand-guidelines',
      query_text: 'What visual color scheme and font should be used for product reel promotions?',
      top_k: 5,
      dense_weight: 0.7,
      sparse_weight: 0.3,
      latency_ms: 18,
      total_results_found: 3,
      operator_email: 'superadmin@socialforge.io',
      created_at: new Date('2026-10-21T10:00:00Z'),
    },
    {
      id: 'log-query-002',
      collection_id: 'collection-compliance-rulebooks',
      query_text: 'Can we publish forward looking statements on expected return on investment?',
      top_k: 5,
      dense_weight: 0.75,
      sparse_weight: 0.25,
      latency_ms: 14,
      total_results_found: 2,
      operator_email: 'compliance.officer@socialforge.io',
      created_at: new Date('2026-10-21T11:20:00Z'),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('hybrid_search_query_logs');
  await knex.schema.dropTableIfExists('semantic_vector_embeddings');
  await knex.schema.dropTableIfExists('rag_knowledge_collections');
  await knex.schema.dropTableIfExists('neural_embedding_models');
}
