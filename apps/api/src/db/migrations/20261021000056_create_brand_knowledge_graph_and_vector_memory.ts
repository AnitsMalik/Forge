import type { Knex } from 'knex';

/**
 * Phase 31: Advanced Vector Search, Semantic Memory & Real-Time Brand Knowledge Graph (v4.9.0)
 *
 * Tables:
 * - brand_knowledge_nodes: Entities in the Brand Knowledge Graph (Brand, Product, Persona, Campaign, Claim, etc.)
 * - brand_knowledge_edges: Directional semantic relationships between entities (promotes, targets, validates, etc.)
 * - semantic_vector_memories: High-dimensional vector memories & facts for contextual agent recall
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Knowledge Graph Nodes
  if (!(await knex.schema.hasTable('brand_knowledge_nodes'))) {
    await knex.schema.createTable('brand_knowledge_nodes', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_bkn_tenant');
      table.string('brand_id', 36).notNullable().references('id').inTable('brands').onDelete('CASCADE').index('idx_bkn_brand');
      table.string('entity_type', 32).notNullable().index('idx_bkn_entity_type');
      table.string('name', 128).notNullable();
      table.string('slug', 64).notNullable().index('idx_bkn_slug');
      table.text('description').nullable();
      table.json('attributes_json').notNullable();
      table.json('embedding_vector').nullable();
      table.integer('vector_dimensions').notNullable().defaultTo(1536);
      table.string('embedding_status', 32).notNullable().defaultTo('embedded').index('idx_bkn_emb_status');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Knowledge Graph Edges (Relationships)
  if (!(await knex.schema.hasTable('brand_knowledge_edges'))) {
    await knex.schema.createTable('brand_knowledge_edges', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_bke_tenant');
      table.string('brand_id', 36).notNullable().references('id').inTable('brands').onDelete('CASCADE').index('idx_bke_brand');
      table.string('source_node_id', 36).notNullable().references('id').inTable('brand_knowledge_nodes').onDelete('CASCADE').index('idx_bke_source');
      table.string('target_node_id', 36).notNullable().references('id').inTable('brand_knowledge_nodes').onDelete('CASCADE').index('idx_bke_target');
      table.string('relation_type', 32).notNullable().index('idx_bke_relation');
      table.decimal('confidence_score', 3, 2).notNullable().defaultTo(1.00);
      table.boolean('is_bidirectional').notNullable().defaultTo(false);
      table.json('metadata_json').notNullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 3. Semantic Vector Memories
  if (!(await knex.schema.hasTable('semantic_vector_memories'))) {
    await knex.schema.createTable('semantic_vector_memories', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_svm_tenant');
      table.string('brand_id', 36).notNullable().references('id').inTable('brands').onDelete('CASCADE').index('idx_svm_brand');
      table.string('memory_type', 32).notNullable().index('idx_svm_type');
      table.text('content').notNullable();
      table.json('embedding_vector').nullable();
      table.json('tags').notNullable();
      table.decimal('relevance_score', 4, 3).notNullable().defaultTo(1.000);
      table.integer('access_count').notNullable().defaultTo(0);
      table.dateTime('last_recalled_at').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Seed Flagship Brand Knowledge Graph if brand exists with valid 36-char tenant FK
  const existingBrand = await knex('brands')
    .join('tenants', 'brands.tenant_id', 'tenants.id')
    .whereRaw('CHAR_LENGTH(brands.tenant_id) = 36')
    .select('brands.id', 'brands.tenant_id', 'brands.name')
    .first();
  if (existingBrand) {
    const existingNodes = await knex('brand_knowledge_nodes').where('brand_id', existingBrand.id).count('id as count').first();
    if (Number(existingNodes?.count || 0) === 0) {
      const tenantId = existingBrand.tenant_id;
      const brandId = existingBrand.id;

      // Deterministic synthetic 16-element normalized embedding for test/seed
      const makeVector = (seed: number) => {
        const v = Array.from({ length: 16 }, (_, i) => Math.sin(seed + i * 0.7));
        const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
        return v.map((val) => Number((val / norm).toFixed(6)));
      };

      const nodes = [
        {
          id: 'node-lumina-brand-01',
          tenant_id: tenantId,
          brand_id: brandId,
          entity_type: 'brand',
          name: existingBrand.name || 'Lumina Wellness',
          slug: 'lumina-wellness',
          description: 'Premium functional longevity, cellular vitality and holistic wellness nutrition brand.',
          attributes_json: JSON.stringify({ category: 'Nutraceuticals', founded: 2023, primaryMarket: 'US/EU' }),
          embedding_vector: JSON.stringify(makeVector(1)),
          vector_dimensions: 16,
          embedding_status: 'embedded',
        },
        {
          id: 'node-puremarine-prod-02',
          tenant_id: tenantId,
          brand_id: brandId,
          entity_type: 'product',
          name: 'PureMarine Collagen Peptide Elixir',
          slug: 'puremarine-collagen',
          description: 'Wild-caught deep-sea marine collagen tri-peptides formulated with bioactive hyaluronic acid.',
          attributes_json: JSON.stringify({ sku: 'LUM-PMC-001', price: 68.00, format: 'Liquid Sachet' }),
          embedding_vector: JSON.stringify(makeVector(2)),
          vector_dimensions: 16,
          embedding_status: 'embedded',
        },
        {
          id: 'node-biohack-persona-03',
          tenant_id: tenantId,
          brand_id: brandId,
          entity_type: 'target_persona',
          name: 'Biohacking Longevity Achievers',
          slug: 'biohackers-longevity',
          description: 'High-performing executives and wellness enthusiasts aged 28-52 optimizing cellular biomarkers and skin elasticity.',
          attributes_json: JSON.stringify({ ageRange: '28-52', householdIncome: '$120k+', keyPainPoint: 'Cellular aging & joint stiffness' }),
          embedding_vector: JSON.stringify(makeVector(3)),
          vector_dimensions: 16,
          embedding_status: 'embedded',
        },
        {
          id: 'node-bioavail-valueprop-04',
          tenant_id: tenantId,
          brand_id: brandId,
          entity_type: 'value_prop',
          name: '98% Absorption Tri-Peptide Bioavailability',
          slug: '98-percent-bioavailability',
          description: 'Hydrolyzed to sub-1000 Dalton molecular weight for rapid bloodstream uptake within 15 minutes.',
          attributes_json: JSON.stringify({ metric: 'Dalton Weight < 1000 Da', absorptionRate: '98%' }),
          embedding_vector: JSON.stringify(makeVector(4)),
          vector_dimensions: 16,
          embedding_status: 'embedded',
        },
        {
          id: 'node-verified-claim-05',
          tenant_id: tenantId,
          brand_id: brandId,
          entity_type: 'verified_claim',
          name: 'Triple Third-Party Lab Certified Purity',
          slug: 'third-party-lab-tested',
          description: 'Every batch is verified by ISO-17025 accredited labs for zero heavy metals, mercury, and microplastics.',
          attributes_json: JSON.stringify({ labAccreditation: 'ISO-17025', heavyMetalsPass: true, certNumber: 'ISO-2026-LUM88' }),
          embedding_vector: JSON.stringify(makeVector(5)),
          vector_dimensions: 16,
          embedding_status: 'embedded',
        },
        {
          id: 'node-banned-claim-06',
          tenant_id: tenantId,
          brand_id: brandId,
          entity_type: 'banned_claim',
          name: 'Cures Severe Arthritis & Reverses All Aging',
          slug: 'banned-cure-disease-claim',
          description: 'Strict FDA/FTC regulatory ban: Never claim our nutritional supplements cure, treat, or prevent chronic pathologies.',
          attributes_json: JSON.stringify({ violationRisk: 'CRITICAL', legalNotice: 'FDA Warning Risk' }),
          embedding_vector: JSON.stringify(makeVector(6)),
          vector_dimensions: 16,
          embedding_status: 'embedded',
        },
      ];

      await knex('brand_knowledge_nodes').insert(nodes);

      // Relationships (Edges)
      const edges = [
        {
          id: 'edge-lum-pmc-01',
          tenant_id: tenantId,
          brand_id: brandId,
          source_node_id: 'node-lumina-brand-01',
          target_node_id: 'node-puremarine-prod-02',
          relation_type: 'promotes',
          confidence_score: 1.00,
          is_bidirectional: false,
          metadata_json: JSON.stringify({ priority: 'flagship_q4' }),
        },
        {
          id: 'edge-pmc-biohack-02',
          tenant_id: tenantId,
          brand_id: brandId,
          source_node_id: 'node-puremarine-prod-02',
          target_node_id: 'node-biohack-persona-03',
          relation_type: 'targets',
          confidence_score: 0.95,
          is_bidirectional: false,
          metadata_json: JSON.stringify({ campaignTier: 'primary' }),
        },
        {
          id: 'edge-pmc-valprop-03',
          tenant_id: tenantId,
          brand_id: brandId,
          source_node_id: 'node-puremarine-prod-02',
          target_node_id: 'node-bioavail-valueprop-04',
          relation_type: 'has_feature',
          confidence_score: 1.00,
          is_bidirectional: false,
          metadata_json: JSON.stringify({ anchorClaim: true }),
        },
        {
          id: 'edge-valprop-claim-04',
          tenant_id: tenantId,
          brand_id: brandId,
          source_node_id: 'node-bioavail-valueprop-04',
          target_node_id: 'node-verified-claim-05',
          relation_type: 'validates',
          confidence_score: 0.98,
          is_bidirectional: false,
          metadata_json: JSON.stringify({ certRequired: true }),
        },
        {
          id: 'edge-lum-prohibit-05',
          tenant_id: tenantId,
          brand_id: brandId,
          source_node_id: 'node-lumina-brand-01',
          target_node_id: 'node-banned-claim-06',
          relation_type: 'prohibits',
          confidence_score: 1.00,
          is_bidirectional: false,
          metadata_json: JSON.stringify({ strictEnforcement: true }),
        },
      ];

      await knex('brand_knowledge_edges').insert(edges);

      // Seed Semantic Memories
      const memories = [
        {
          id: 'mem-lum-collagen-fact-01',
          tenant_id: tenantId,
          brand_id: brandId,
          memory_type: 'fact',
          content: 'PureMarine Collagen uses sustainable deep-sea cod skin hydrolysate from MSC-certified North Atlantic fisheries.',
          embedding_vector: JSON.stringify(makeVector(7)),
          tags: JSON.stringify(['sustainability', 'marine-collagen', 'sourcing']),
          relevance_score: 1.000,
          access_count: 14,
        },
        {
          id: 'mem-lum-hook-insight-02',
          tenant_id: tenantId,
          brand_id: brandId,
          memory_type: 'top_hook',
          content: 'Opening question hook: "Why 90% of standard bovine collagen pills pass right through your digestive tract unabsorbed..." drives 3.4x higher 3-second watch time on TikTok and Reels.',
          embedding_vector: JSON.stringify(makeVector(8)),
          tags: JSON.stringify(['top_hook', 'short_form_video', 'bioavailability']),
          relevance_score: 0.965,
          access_count: 32,
        },
        {
          id: 'mem-lum-voice-rule-03',
          tenant_id: tenantId,
          brand_id: brandId,
          memory_type: 'brand_voice_rule',
          content: 'Tone must always remain scientifically authoritative, optimistic, and refined. Avoid clickbait hyperbole or sounding like infomercial sales.',
          embedding_vector: JSON.stringify(makeVector(9)),
          tags: JSON.stringify(['brand_voice', 'editorial_guidelines', 'compliance']),
          relevance_score: 0.980,
          access_count: 28,
        },
        {
          id: 'mem-lum-feedback-04',
          tenant_id: tenantId,
          brand_id: brandId,
          memory_type: 'customer_feedback',
          content: 'Verified buyer survey (n=1,240): 87% reported visible nail strength improvements within 21 days; citrus peach flavor preferred by 94%.',
          embedding_vector: JSON.stringify(makeVector(10)),
          tags: JSON.stringify(['social_proof', 'clinical_survey', 'flavor']),
          relevance_score: 0.920,
          access_count: 19,
        },
      ];

      await knex('semantic_vector_memories').insert(memories);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('semantic_vector_memories');
  await knex.schema.dropTableIfExists('brand_knowledge_edges');
  await knex.schema.dropTableIfExists('brand_knowledge_nodes');
}
