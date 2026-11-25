import type { Knex } from 'knex';

/**
 * Phase 29: Real-Time AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows (v4.7.0)
 *
 * Tables:
 * - agent_fleet_definitions:   Autonomous AI agent catalog, system roles, tool policies, concurrency
 * - agent_fleet_workflows:     Multi-agent DAG workflow blueprints with critique loops & token limits
 * - agent_workflow_executions: Workflow execution instances, status, token usage, final payload
 * - agent_execution_steps:     Granular step traces, agent handoff context, critique reviews, latency
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Agent Fleet Definitions Catalog
  if (!(await knex.schema.hasTable('agent_fleet_definitions'))) {
    await knex.schema.createTable('agent_fleet_definitions', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_agent_fleet_tenant');
      table.string('name', 128).notNullable();
      table.string('slug', 64).notNullable().unique('uq_agent_fleet_slug');
      table.string('role', 64).notNullable().index('idx_agent_fleet_role');
      table.text('description').nullable();
      table.text('system_prompt').notNullable();
      table.string('model_name', 64).notNullable().defaultTo('gpt-4o');
      table.decimal('temperature', 3, 2).notNullable().defaultTo(0.70);
      table.integer('max_tokens_per_turn').notNullable().defaultTo(4096);
      table.json('tool_permissions_json').notNullable();
      table.string('status', 32).notNullable().defaultTo('idle').index('idx_agent_fleet_status');
      table.integer('concurrency_limit').notNullable().defaultTo(5);
      table.boolean('is_system').notNullable().defaultTo(false);
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Agent Fleet Workflows (DAG Blueprints)
  if (!(await knex.schema.hasTable('agent_fleet_workflows'))) {
    await knex.schema.createTable('agent_fleet_workflows', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_agent_wf_tenant');
      table.string('name', 128).notNullable();
      table.text('description').nullable();
      table.string('trigger_type', 32).notNullable().defaultTo('manual');
      table.string('status', 32).notNullable().defaultTo('active').index('idx_agent_wf_status');
      table.json('dag_config_json').notNullable();
      table.integer('max_budget_tokens').notNullable().defaultTo(50000);
      table.integer('timeout_seconds').notNullable().defaultTo(300);
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 3. Workflow Executions
  if (!(await knex.schema.hasTable('agent_workflow_executions'))) {
    await knex.schema.createTable('agent_workflow_executions', (table) => {
      table.string('id', 36).primary();
      table.string('workflow_id', 36).notNullable().references('id').inTable('agent_fleet_workflows').onDelete('CASCADE');
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_wf_exec_tenant');
      table.string('trigger_event', 128).notNullable().defaultTo('manual_dispatch');
      table.string('status', 32).notNullable().defaultTo('running').index('idx_wf_exec_status');
      table.integer('total_tokens_used').notNullable().defaultTo(0);
      table.decimal('execution_cost_usd', 10, 4).notNullable().defaultTo(0.0000);
      table.dateTime('started_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('completed_at').nullable();
      table.integer('duration_ms').nullable();
      table.text('error_message').nullable();
      table.json('final_output_json').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now()).index('idx_wf_exec_created');
    });
  }

  // 4. Execution Step Traces & Collaborative Critique Logs
  if (!(await knex.schema.hasTable('agent_execution_steps'))) {
    await knex.schema.createTable('agent_execution_steps', (table) => {
      table.string('id', 36).primary();
      table.string('execution_id', 36).notNullable().references('id').inTable('agent_workflow_executions').onDelete('CASCADE').index('idx_step_execution');
      table.string('agent_id', 36).notNullable().references('id').inTable('agent_fleet_definitions').onDelete('CASCADE');
      table.string('agent_role', 64).notNullable();
      table.string('step_name', 128).notNullable();
      table.integer('step_index').notNullable().defaultTo(0);
      table.json('input_context_json').nullable();
      table.json('output_context_json').nullable();
      table.json('critique_feedback_json').nullable();
      table.string('status', 32).notNullable().defaultTo('running').index('idx_step_status');
      table.integer('tokens_used').notNullable().defaultTo(0);
      table.integer('latency_ms').notNullable().defaultTo(0);
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('completed_at').nullable();
    });
  }

  // Pre-seed 5 System AI Agents
  const now = new Date();
  const systemAgents = [
    {
      id: 'agnt-sys-trend-01',
      tenant_id: null,
      name: 'TrendHunter Alpha',
      slug: 'trend-hunter-alpha',
      role: 'trend_hunter',
      description: 'Scans live social feeds, hashtag velocity, audience sentiment, and viral competitor hooks.',
      system_prompt: 'You are TrendHunter Alpha. Identify high-momentum social trends, emerging topics, and viral angles with citation and velocity scores.',
      model_name: 'gpt-4o',
      temperature: 0.85,
      max_tokens_per_turn: 4096,
      tool_permissions_json: JSON.stringify(['social_trends_api', 'keyword_explorer', 'google_search', 'audience_graph']),
      status: 'idle',
      concurrency_limit: 10,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'agnt-sys-content-02',
      tenant_id: null,
      name: 'Content Architect Pro',
      slug: 'content-architect-pro',
      role: 'content_architect',
      description: 'Drafts high-conversion social copy, narrative frameworks, opening hooks, and audience CTAs.',
      system_prompt: 'You are Content Architect Pro. Synthesize compelling, platform-tailored copy using behavioral psychology and hook-retain-reward structures.',
      model_name: 'claude-3-5-sonnet',
      temperature: 0.70,
      max_tokens_per_turn: 6144,
      tool_permissions_json: JSON.stringify(['brand_voice_memory', 'template_library', 'sentiment_analyzer']),
      status: 'idle',
      concurrency_limit: 10,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'agnt-sys-visual-03',
      tenant_id: null,
      name: 'Visual Creative Director',
      slug: 'visual-creative-director',
      role: 'visual_director',
      description: 'Synthesizes visual art direction, typography layouts, color palettes, and Midjourney/Flux image prompts.',
      system_prompt: 'You are Visual Creative Director. Formulate cinematic, on-brand creative briefs and precise image prompt matrices matching brand guidelines.',
      model_name: 'gpt-4o',
      temperature: 0.75,
      max_tokens_per_turn: 4096,
      tool_permissions_json: JSON.stringify(['image_generation_api', 'color_palette_extractor', 'aspect_ratio_optimizer']),
      status: 'idle',
      concurrency_limit: 8,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'agnt-sys-compliance-04',
      tenant_id: null,
      name: 'Compliance Guardrail Agent',
      slug: 'compliance-guardrail-agent',
      role: 'compliance_auditor',
      description: 'Audits multi-agent outputs against FTC disclosure rules, copyright policies, hallucination checks, and brand safety.',
      system_prompt: 'You are Compliance Guardrail Agent. Strictly review content for deceptive claims, FTC disclosure compliance, offensive content, or hallucinated statistics. Approve or request revision with line-by-line critique.',
      model_name: 'gpt-4o',
      temperature: 0.10,
      max_tokens_per_turn: 4096,
      tool_permissions_json: JSON.stringify(['dlp_scanner', 'legal_precedent_checker', 'hallucination_detector']),
      status: 'idle',
      concurrency_limit: 15,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'agnt-sys-growth-05',
      tenant_id: null,
      name: 'Growth Strategist & Optimizer',
      slug: 'growth-strategist-optimizer',
      role: 'growth_strategist',
      description: 'Calculates optimal publishing time windows, distribution hashtags, cross-posting schedules, and audience segment targeting.',
      system_prompt: 'You are Growth Strategist & Optimizer. Maximize reach and conversion by optimizing posting schedules, distribution cadences, and algorithmic hooks.',
      model_name: 'gpt-4o',
      temperature: 0.40,
      max_tokens_per_turn: 4096,
      tool_permissions_json: JSON.stringify(['historical_performance_analytics', 'schedule_optimizer', 'audience_clustering']),
      status: 'idle',
      concurrency_limit: 10,
      is_system: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  for (const agent of systemAgents) {
    const exists = await knex('agent_fleet_definitions').where({ slug: agent.slug }).first();
    if (!exists) {
      await knex('agent_fleet_definitions').insert(agent);
    }
  }

  // Pre-seed a flagship workflow for the first available tenant
  const tenant = await knex('tenants').first('id');
  if (tenant) {
    const wfId = 'wf-flagship-viral-01';
    const existingWf = await knex('agent_fleet_workflows').where({ id: wfId }).first();
    if (!existingWf) {
      const dagConfig = {
        entryNodes: ['step_trend_scan'],
        nodes: [
          {
            id: 'step_trend_scan',
            agentRole: 'trend_hunter',
            stepName: 'Live Viral Trend Analysis',
            promptTemplate: 'Analyze high-velocity topics and competitor breakout hooks in the wellness and lifestyle niche.',
            dependencies: [],
          },
          {
            id: 'step_content_synthesis',
            agentRole: 'content_architect',
            stepName: 'Multi-Variant Copy Generation',
            promptTemplate: 'Using trend signals from step_trend_scan, generate 3 high-converting post copies with storytelling hooks.',
            dependencies: ['step_trend_scan'],
          },
          {
            id: 'step_visual_brief',
            agentRole: 'visual_director',
            stepName: 'Visual Art Direction Brief',
            promptTemplate: 'Create a visual composition brief and generative image prompt matching the synthesized copy.',
            dependencies: ['step_content_synthesis'],
          },
          {
            id: 'step_compliance_audit',
            agentRole: 'compliance_auditor',
            stepName: 'Safety & Regulatory Compliance Sign-off',
            promptTemplate: 'Inspect all synthesized copy and visual prompts for FTC disclosures, brand safety, and factual claims.',
            dependencies: ['step_content_synthesis', 'step_visual_brief'],
            requiresCritique: true,
            critiqueAgentRole: 'compliance_auditor',
          },
          {
            id: 'step_growth_schedule',
            agentRole: 'growth_strategist',
            stepName: 'Distribution Timing & Velocity Optimization',
            promptTemplate: 'Determine peak engagement release windows and algorithmic hashtag clusters for maximum organic reach.',
            dependencies: ['step_compliance_audit'],
          },
        ],
        outputFormat: 'campaign_bundle',
      };

      await knex('agent_fleet_workflows').insert({
        id: wfId,
        tenant_id: tenant.id,
        name: 'Full-Funnel Viral Campaign Synthesis',
        description: 'Autonomous 5-agent collaborative pipeline: Trend Hunter -> Content Architect -> Visual Director -> Compliance Guard -> Growth Strategist.',
        trigger_type: 'manual',
        status: 'active',
        dag_config_json: JSON.stringify(dagConfig),
        max_budget_tokens: 30000,
        timeout_seconds: 180,
        created_at: now,
        updated_at: now,
      });

      // Pre-seed an initial completed sample execution run with step traces
      const execId = 'exec-sample-run-01';
      await knex('agent_workflow_executions').insert({
        id: execId,
        workflow_id: wfId,
        tenant_id: tenant.id,
        trigger_event: 'manual_dispatch',
        status: 'completed',
        total_tokens_used: 12450,
        execution_cost_usd: 0.0872,
        started_at: new Date(Date.now() - 300000),
        completed_at: new Date(Date.now() - 250000),
        duration_ms: 50000,
        error_message: null,
        final_output_json: JSON.stringify({
          campaignTitle: 'Spring Awakening Wellness Series',
          targetAudience: 'Holistic wellness enthusiasts (25-45)',
          trendScore: 94.5,
          recommendedHook: 'Why 87% of high performers swapped coffee for adaptogenic morning tonics',
          complianceStatus: 'APPROVED_WITH_DISCLOSURES',
          scheduledSlot: '2026-10-22T08:30:00Z',
        }),
        created_at: now,
      });

      // Pre-seed execution step traces
      const sampleSteps = [
        {
          id: 'step-run-01-trend',
          execution_id: execId,
          agent_id: 'agnt-sys-trend-01',
          agent_role: 'trend_hunter',
          step_name: 'Live Viral Trend Analysis',
          step_index: 0,
          input_context_json: JSON.stringify({ niche: 'wellness' }),
          output_context_json: JSON.stringify({ topTrend: 'Adaptogenic Morning Tonics', velocityScore: 94.5 }),
          critique_feedback_json: null,
          status: 'completed',
          tokens_used: 2400,
          latency_ms: 3200,
          created_at: now,
          completed_at: now,
        },
        {
          id: 'step-run-02-copy',
          execution_id: execId,
          agent_id: 'agnt-sys-content-02',
          agent_role: 'content_architect',
          step_name: 'Multi-Variant Copy Generation',
          step_index: 1,
          input_context_json: JSON.stringify({ trend: 'Adaptogenic Morning Tonics' }),
          output_context_json: JSON.stringify({ copyVariants: 3, primaryHook: 'Why 87% swapped coffee...' }),
          critique_feedback_json: null,
          status: 'completed',
          tokens_used: 3500,
          latency_ms: 4500,
          created_at: now,
          completed_at: now,
        },
        {
          id: 'step-run-03-visual',
          execution_id: execId,
          agent_id: 'agnt-sys-visual-03',
          agent_role: 'visual_director',
          step_name: 'Visual Art Direction Brief',
          step_index: 2,
          input_context_json: JSON.stringify({ concept: 'Adaptogenic Tonics' }),
          output_context_json: JSON.stringify({ palette: ['#0d9488', '#f59e0b'], prompt: 'Cinematic golden hour wellness flatlay...' }),
          critique_feedback_json: null,
          status: 'completed',
          tokens_used: 2100,
          latency_ms: 2800,
          created_at: now,
          completed_at: now,
        },
        {
          id: 'step-run-04-compliance',
          execution_id: execId,
          agent_id: 'agnt-sys-compliance-04',
          agent_role: 'compliance_auditor',
          step_name: 'Safety & Regulatory Compliance Sign-off',
          step_index: 3,
          input_context_json: JSON.stringify({ copyToAudit: 'Why 87% swapped coffee...' }),
          output_context_json: JSON.stringify({ compliant: true, disclosureAppended: '#ad #wellnesspartner' }),
          critique_feedback_json: JSON.stringify({ note: 'Passed FTC claims audit. Mandatory disclosures appended.' }),
          status: 'approved',
          tokens_used: 1950,
          latency_ms: 2100,
          created_at: now,
          completed_at: now,
        },
        {
          id: 'step-run-05-growth',
          execution_id: execId,
          agent_id: 'agnt-sys-growth-05',
          agent_role: 'growth_strategist',
          step_name: 'Distribution Timing & Velocity Optimization',
          step_index: 4,
          input_context_json: JSON.stringify({ platform: 'instagram_reels' }),
          output_context_json: JSON.stringify({ bestTime: '08:30 AM EST', optimalHashtags: ['#mindfulliving', '#dailywellness'] }),
          critique_feedback_json: null,
          status: 'completed',
          tokens_used: 2500,
          latency_ms: 3100,
          created_at: now,
          completed_at: now,
        },
      ];

      for (const step of sampleSteps) {
        await knex('agent_execution_steps').insert(step);
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agent_execution_steps');
  await knex.schema.dropTableIfExists('agent_workflow_executions');
  await knex.schema.dropTableIfExists('agent_fleet_workflows');
  await knex.schema.dropTableIfExists('agent_fleet_definitions');
}
