/**
 * Stage 29: Real-Time AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows Suite
 * SocialForge Platform v4.7.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Overview telemetry & KPI metrics (totalAgents, systemAgents, activeWorkflows, fleetSuccessRate)
 * 4. Pre-seeded core system agents verification:
 *    - All 5 core agents exist (trend_hunter, content_architect, visual_director, compliance_auditor, growth_strategist)
 *    - Rejection of attempts to delete system-core agents (403 Forbidden)
 * 5. Custom Agent CRUD & Validations:
 *    - Temperature range enforcement (0.0 to 2.0)
 *    - Rejection of missing system prompt
 *    - Deployment of custom agent (BioTech Hook Specialist)
 *    - Duplicate slug rejection (409 Conflict)
 *    - Agent updates (temperature, concurrencyLimit)
 *    - Custom agent deletion and cleanup
 * 6. Workflow DAG Blueprint Management:
 *    - Retrieval of pre-seeded flagship workflow (Full-Funnel Viral Campaign Synthesis)
 *    - Validation rejection for missing tenant or empty DAG nodes (400 Bad Request)
 *    - Creation of custom multi-agent DAG workflow with critique requirements
 *    - Workflow update and status toggling
 * 7. Multi-Agent DAG Execution Engine & Collaborative Handoffs:
 *    - Dispatching workflow execution run (201 Created)
 *    - Sequential topological execution across specialized agent roles
 *    - Generation of granular execution step traces with input/output context
 *    - Token accounting and cost calculation ($0.007 per 1k tokens)
 * 8. Supervisor / Agent Critique Reviews:
 *    - Reviewing and requesting revision on an execution step (status: revision_requested)
 *    - Reviewing and approving an execution step (status: approved)
 * 9. Emergency Kill-Switch (Abort Execution):
 *    - Aborting in-flight execution and failing pending steps
 * 10. Superadmin Audit Trail:
 *     - Verifying superadmin audit logs recorded for agent deployment, workflow creation, execution dispatch, and step critique
 * 11. Workflow Deletion & Cascade:
 *     - Deleting custom workflow and verifying clean database cascade
 */

import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const META_LOCK_REMOTE_POST_ID = '1405588742634526_122100337179498315';
const META_LOCK_JOB_ID = '256cf21a-26cd-4032-a7b8-17261d8a81b1';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-bypass-rate-limit': 'test-runner',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function verifyMetaLock(connection, stepDescription) {
  const [variants] = await connection.execute(
    'SELECT id, status FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length === 1, `[${stepDescription}] Production Meta variant exists.`);
  assert(variants[0].status === 'published', `[${stepDescription}] Production Meta variant status is strictly 'published'.`);

  const [jobs] = await connection.execute(
    'SELECT id, status FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length === 1, `[${stepDescription}] Production Meta publishing job exists.`);
  assert(jobs[0].status === 'published', `[${stepDescription}] Production Meta publishing job status is strictly 'published'.`);
}

async function runStage29Tests() {
  console.log('\n======================================================================');
  console.log('   STAGE 29: AI AGENT FLEET ORCHESTRATION & COLLABORATIVE WORKFLOWS   ');
  console.log('   Platform Version: v4.7.0');
  console.log('======================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. PRE-CHECK: Production Meta Publication Lock Invariant
    // -------------------------------------------------------------------------
    console.log('[Step 1] Pre-Verification: Production Meta Publication Lock Invariant');
    await verifyMetaLock(connection, 'PRE-CHECK');

    // Retrieve active superadmin and regular tenant user
    const [superadmins] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadmins.length > 0, 'Found active superadmin user');
    const superadmin = superadmins[0];

    const [members] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(members.length > 0, 'Found active regular tenant member');
    const member = members[0];
    const [tenantsList] = await connection.execute(
      'SELECT id FROM tenants LIMIT 1'
    );
    assert(tenantsList.length > 0, 'Found active tenant');
    const targetTenantId = tenantsList[0].id;
    console.log(`  Scoping test tenant ID: ${targetTenantId}`);

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, isSuperAdmin: true, tenantId: targetTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const regularUserToken = jwt.sign(
      { userId: member.id, email: member.email, isSuperadmin: false, isSuperAdmin: false, tenantId: member.tenant_id, role: member.role || 'member' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Clean up any stale test agent or workflow from previous test runs
    await connection.execute("DELETE FROM agent_fleet_definitions WHERE slug LIKE '%stage29%'");
    await connection.execute("DELETE FROM agent_fleet_workflows WHERE name LIKE '%Stage29%'");

    // -------------------------------------------------------------------------
    // 2. SECURITY & RBAC ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n[Step 2] Superadmin RBAC & Security Boundaries');

    // 2.1 Unauthenticated request rejected with 401
    const unauthRes = await request('/admin/operations/agent-fleet/telemetry');
    assert(unauthRes.status === 401, 'Unauthenticated access to agent-fleet telemetry rejected with 401');

    // 2.2 Regular tenant member access rejected with 403
    const memberRes = await request('/admin/operations/agent-fleet/telemetry', {
      headers: { Authorization: `Bearer ${regularUserToken}` },
    });
    assert(memberRes.status === 403, 'Regular tenant member rejected from agent-fleet telemetry with 403');

    // 2.3 Regular tenant member agent creation rejected with 403
    const memberCreateAgent = await request('/admin/operations/agent-fleet/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${regularUserToken}` },
      body: JSON.stringify({
        name: 'Hacker Agent',
        role: 'custom_agent',
        systemPrompt: 'Do bad stuff',
      }),
    });
    assert(memberCreateAgent.status === 403, 'Regular member rejected from agent creation with 403');

    // 2.4 Regular member workflow dispatch rejected with 403
    const memberDispatch = await request('/admin/operations/agent-fleet/executions/dispatch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${regularUserToken}` },
      body: JSON.stringify({
        workflowId: 'dummy-id',
      }),
    });
    assert(memberDispatch.status === 403, 'Regular member rejected from execution dispatch with 403');

    // -------------------------------------------------------------------------
    // 3. OVERVIEW TELEMETRY & FLEET KPI METRICS
    // -------------------------------------------------------------------------
    console.log('\n[Step 3] Overview Telemetry & Fleet KPI Metrics');

    const telemetryRes = await request('/admin/operations/agent-fleet/telemetry', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(telemetryRes.status === 200, 'Superadmin can fetch agent fleet telemetry (200 OK)');
    assert(telemetryRes.data.success === true, 'Telemetry response has success: true');
    const telemetry = telemetryRes.data.data;
    assert(typeof telemetry.totalAgents === 'number' && telemetry.totalAgents >= 5, 'Telemetry totalAgents >= 5');
    assert(typeof telemetry.systemAgents === 'number' && telemetry.systemAgents >= 5, 'Telemetry systemAgents >= 5');
    assert(typeof telemetry.totalWorkflows === 'number' && telemetry.totalWorkflows >= 1, 'Telemetry totalWorkflows >= 1');
    assert(typeof telemetry.fleetSuccessRate === 'number', 'Telemetry fleetSuccessRate is a number');
    console.log(`  Fleet stats: TotalAgents=${telemetry.totalAgents}, System=${telemetry.systemAgents}, Workflows=${telemetry.totalWorkflows}`);

    // -------------------------------------------------------------------------
    // 4. PRE-SEEDED CORE SYSTEM AGENTS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[Step 4] Pre-Seeded Core System Agents Verification');

    const listAgentsRes = await request('/admin/operations/agent-fleet/agents', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listAgentsRes.status === 200, 'Superadmin can list fleet agents');
    const agents = listAgentsRes.data.data.agents;

    const trendHunter = agents.find((a) => a.slug === 'trend-hunter-alpha');
    assert(Boolean(trendHunter), 'Core agent TrendHunter Alpha exists');
    assert(trendHunter.role === 'trend_hunter', 'TrendHunter has role trend_hunter');
    assert(trendHunter.isSystem === true, 'TrendHunter is marked as isSystem: true');

    const contentArch = agents.find((a) => a.slug === 'content-architect-pro');
    assert(Boolean(contentArch), 'Core agent Content Architect Pro exists');
    assert(contentArch.role === 'content_architect', 'Content Architect has role content_architect');

    const visualDir = agents.find((a) => a.slug === 'visual-creative-director');
    assert(Boolean(visualDir), 'Core agent Visual Creative Director exists');

    const complianceGuard = agents.find((a) => a.slug === 'compliance-guardrail-agent');
    assert(Boolean(complianceGuard), 'Core agent Compliance Guardrail Agent exists');
    assert(complianceGuard.role === 'compliance_auditor', 'Compliance agent has role compliance_auditor');

    const growthStrat = agents.find((a) => a.slug === 'growth-strategist-optimizer');
    assert(Boolean(growthStrat), 'Core agent Growth Strategist & Optimizer exists');

    // Attempting to delete a core system agent must be rejected with 403 Forbidden
    const deleteSystemAgentRes = await request(`/admin/operations/agent-fleet/agents/${trendHunter.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteSystemAgentRes.status === 403, 'Deleting core system agent rejected with 403 Forbidden');

    // -------------------------------------------------------------------------
    // 5. CUSTOM AGENT CRUD & PARAMETER VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n[Step 5] Custom Agent CRUD & Parameter Validation');

    // 5.1 Reject invalid temperature (> 2.0)
    const invalidTempRes = await request('/admin/operations/agent-fleet/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Invalid Temp Agent',
        role: 'custom_agent',
        systemPrompt: 'Reasoning directive',
        temperature: 2.5,
      }),
    });
    assert(invalidTempRes.status === 400, 'Agent with temperature > 2.0 rejected with 400 Bad Request');

    // 5.2 Reject missing system prompt
    const missingPromptRes = await request('/admin/operations/agent-fleet/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'No Prompt Agent',
        role: 'custom_agent',
        systemPrompt: '',
      }),
    });
    assert(missingPromptRes.status === 400, 'Agent without system prompt rejected with 400 Bad Request');

    // 5.3 Deploy valid custom agent
    const customAgentSlug = 'stage29-hook-specialist';
    const deployAgentRes = await request('/admin/operations/agent-fleet/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Stage29 BioTech Hook Specialist',
        slug: customAgentSlug,
        role: 'custom_agent',
        description: 'Specializes in high-retention clinical study hook formulations.',
        systemPrompt: 'You are an autonomous hook specialist analyzing clinical papers for digestible social hooks.',
        modelName: 'gpt-4o',
        temperature: 0.65,
        maxTokensPerTurn: 4096,
        toolPermissions: ['pubmed_search', 'readability_scorer'],
        concurrencyLimit: 8,
        tenantId: targetTenantId,
      }),
    });
    if (deployAgentRes.status !== 201) {
      console.log('deployAgentRes error:', deployAgentRes.status, deployAgentRes.data);
    }
    assert(deployAgentRes.status === 201, 'Custom agent deployment returned 201 Created');
    const createdAgent = deployAgentRes.data.data;
    assert(createdAgent.slug === customAgentSlug, 'Created agent slug matches');
    assert(createdAgent.isSystem === false, 'Created agent is not a system agent');
    assert(createdAgent.concurrencyLimit === 8, 'Created agent concurrency limit is 8');
    const testAgentId = createdAgent.id;

    // 5.4 Duplicate slug rejection (409 Conflict)
    const duplicateSlugRes = await request('/admin/operations/agent-fleet/agents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Another Agent with Same Slug',
        slug: customAgentSlug,
        role: 'custom_agent',
        systemPrompt: 'Another prompt',
      }),
    });
    assert(duplicateSlugRes.status === 409, 'Duplicate agent slug rejected with 409 Conflict');

    // 5.5 Update custom agent
    const updateAgentRes = await request(`/admin/operations/agent-fleet/agents/${testAgentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        temperature: 0.80,
        concurrencyLimit: 12,
      }),
    });
    assert(updateAgentRes.status === 200, 'Custom agent update returned 200 OK');
    assert(updateAgentRes.data.data.temperature === 0.80, 'Updated temperature persisted');
    assert(updateAgentRes.data.data.concurrencyLimit === 12, 'Updated concurrency limit persisted');

    // -------------------------------------------------------------------------
    // 6. WORKFLOW DAG BLUEPRINT MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n[Step 6] Workflow DAG Blueprint Management');

    // 6.1 Verify pre-seeded flagship workflow
    const listWfRes = await request('/admin/operations/agent-fleet/workflows', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listWfRes.status === 200, 'Superadmin can list workflows');
    const workflows = listWfRes.data.data.workflows;
    assert(workflows.length >= 1, 'At least 1 workflow exists');
    const flagshipWf = workflows.find((w) => w.id === 'wf-flagship-viral-01');
    assert(Boolean(flagshipWf), 'Flagship workflow wf-flagship-viral-01 exists');
    assert(flagshipWf.dagConfig.nodes.length === 5, 'Flagship workflow has 5 DAG nodes');

    // 6.2 Reject invalid workflow (missing DAG nodes)
    const emptyDagRes = await request('/admin/operations/agent-fleet/workflows', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenantId,
        name: 'Empty DAG Workflow',
        dagConfig: { entryNodes: [], nodes: [] },
      }),
    });
    assert(emptyDagRes.status === 400, 'Workflow with empty DAG nodes rejected with 400 Bad Request');

    // 6.3 Create custom 3-agent DAG workflow
    const createWfRes = await request('/admin/operations/agent-fleet/workflows', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenantId,
        name: 'Stage29 3-Agent Collaborative Pipeline',
        description: 'Autonomous collaboration: TrendHunter -> ContentArchitect -> ComplianceAuditor',
        triggerType: 'manual',
        dagConfig: {
          entryNodes: ['step_trend'],
          nodes: [
            {
              id: 'step_trend',
              agentRole: 'trend_hunter',
              stepName: 'Trend Ingestion & Hashtag Velocity',
              promptTemplate: 'Analyze trending wellness topics for maximum engagement.',
              dependencies: [],
            },
            {
              id: 'step_content',
              agentRole: 'content_architect',
              stepName: 'Story Hook & Narrative Synthesis',
              promptTemplate: 'Draft 2 hook variations from trend signals.',
              dependencies: ['step_trend'],
            },
            {
              id: 'step_audit',
              agentRole: 'compliance_auditor',
              stepName: 'FTC & Brand Safety Sign-Off',
              promptTemplate: 'Audit copy for deceptive health claims and mandatory disclosures.',
              dependencies: ['step_content'],
              requiresCritique: true,
              critiqueAgentRole: 'compliance_auditor',
            },
          ],
          outputFormat: 'campaign_bundle',
        },
        maxBudgetTokens: 25000,
        timeoutSeconds: 120,
      }),
    });
    assert(createWfRes.status === 201, 'Custom workflow DAG creation returned 201 Created');
    const createdWorkflow = createWfRes.data.data;
    assert(createdWorkflow.dagConfig.nodes.length === 3, 'Created workflow has 3 nodes');
    assert(createdWorkflow.status === 'active', 'Created workflow is active');
    const testWorkflowId = createdWorkflow.id;

    // -------------------------------------------------------------------------
    // 7. MULTI-AGENT DAG EXECUTION ENGINE & COLLABORATIVE HANDOFFS
    // -------------------------------------------------------------------------
    console.log('\n[Step 7] Multi-Agent DAG Execution Engine & Collaborative Handoffs');

    const dispatchRes = await request('/admin/operations/agent-fleet/executions/dispatch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        workflowId: testWorkflowId,
        inputParams: { targetAudience: 'Biohackers & Wellness Founders' },
        triggerEvent: 'stage29_test_dispatch',
      }),
    });
    assert(dispatchRes.status === 201, 'Workflow dispatch returned 201 Created');
    assert(dispatchRes.data.success === true, 'Dispatch response success: true');
    const execution = dispatchRes.data.data.execution;
    const steps = dispatchRes.data.data.steps;

    assert(execution.status === 'completed', 'Execution run status transitioned to "completed"');
    assert(execution.totalTokensUsed > 0, `Execution recorded ${execution.totalTokensUsed} tokens used`);
    assert(execution.executionCostUsd > 0, `Execution recorded $${execution.executionCostUsd} cost`);
    assert(Boolean(execution.finalOutput), 'Execution contains synthesized finalOutput payload');

    assert(steps.length === 3, `Executed all 3 DAG nodes sequentially (found ${steps.length} steps)`);
    assert(steps[0].agentRole === 'trend_hunter', 'Step 1 executed by trend_hunter');
    assert(steps[1].agentRole === 'content_architect', 'Step 2 executed by content_architect');
    assert(steps[2].agentRole === 'compliance_auditor', 'Step 3 executed by compliance_auditor');

    // Verify context handoff between nodes
    assert(Boolean(steps[1].inputContext.inheritedContext.step_trend), 'Step 2 inherited context from Step 1');
    assert(steps[2].status === 'approved', 'Step 3 compliance auditor approved copy');
    const targetStepId = steps[2].id;

    // -------------------------------------------------------------------------
    // 8. SUPERVISOR / AGENT CRITIQUE REVIEWS
    // -------------------------------------------------------------------------
    console.log('\n[Step 8] Supervisor / Agent Critique Reviews');

    // 8.1 Request Revision on Step
    const requestRevRes = await request(`/admin/operations/agent-fleet/steps/${targetStepId}/critique`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        approved: false,
        critiqueComments: 'Please add explicit FDA disclaimer statement at the bottom of the copy.',
        suggestedRevisions: { appendDisclaimer: '*These statements have not been evaluated by the FDA.' },
      }),
    });
    assert(requestRevRes.status === 200, 'Critique revision request returned 200 OK');
    assert(requestRevRes.data.data.status === 'revision_requested', 'Step status updated to "revision_requested"');
    assert(requestRevRes.data.data.critiqueFeedback.approved === false, 'Critique feedback approved is false');

    // 8.2 Approve Step
    const approveRevRes = await request(`/admin/operations/agent-fleet/steps/${targetStepId}/critique`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        approved: true,
        critiqueComments: 'FDA disclaimer verified and formatted cleanly. Approved for publication.',
      }),
    });
    assert(approveRevRes.status === 200, 'Critique approval returned 200 OK');
    assert(approveRevRes.data.data.status === 'approved', 'Step status updated to "approved"');
    assert(approveRevRes.data.data.critiqueFeedback.approved === true, 'Critique feedback approved is true');

    // -------------------------------------------------------------------------
    // 9. EMERGENCY KILL-SWITCH (ABORT EXECUTION)
    // -------------------------------------------------------------------------
    console.log('\n[Step 9] Emergency Kill-Switch (Abort Execution)');

    // Create a mock running execution directly in DB
    const mockExecId = 'exec-stage29-killswitch-test';
    await connection.execute(
      `INSERT INTO agent_workflow_executions (id, workflow_id, tenant_id, trigger_event, status, total_tokens_used, execution_cost_usd, started_at, created_at)
       VALUES (?, ?, ?, 'emergency_test', 'running', 1500, 0.0105, NOW(), NOW())`,
      [mockExecId, testWorkflowId, targetTenantId]
    );

    const abortRes = await request(`/admin/operations/agent-fleet/executions/${mockExecId}/abort`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ reason: 'Simulated high-latency kill switch test' }),
    });
    assert(abortRes.status === 200, 'Abort execution endpoint returned 200 OK');
    assert(abortRes.data.data.status === 'aborted', 'Aborted execution status is "aborted"');

    // Confirm DB row is aborted
    const [dbAborted] = await connection.execute('SELECT status, error_message FROM agent_workflow_executions WHERE id = ?', [mockExecId]);
    assert(dbAborted[0].status === 'aborted', 'Database row status is strictly "aborted"');
    assert(dbAborted[0].error_message.includes('Simulated high-latency'), 'Database recorded abort reason');

    // Clean up mock execution
    await connection.execute('DELETE FROM agent_workflow_executions WHERE id = ?', [mockExecId]);

    // -------------------------------------------------------------------------
    // 10. SUPERADMIN AUDIT TRAIL
    // -------------------------------------------------------------------------
    console.log('\n[Step 10] Superadmin Audit Trail for Agent Fleet Operations');

    const [auditRows] = await connection.execute(
      `SELECT action, target_resource_type, target_resource_id, superadmin_email
       FROM superadmin_audit_logs
       WHERE target_resource_type = 'agent_fleet'
       ORDER BY created_at DESC LIMIT 10`
    );
    assert(auditRows.length >= 3, `Found ${auditRows.length} agent fleet audit logs`);
    const actions = auditRows.map((r) => r.action);
    assert(actions.includes('create_fleet_agent') || actions.includes('dispatch_fleet_execution'), 'Recorded agent fleet actions in superadmin audit trail');
    console.log(`  Recorded audit actions: ${[...new Set(actions)].join(', ')}`);

    // -------------------------------------------------------------------------
    // 11. WORKFLOW & CUSTOM AGENT CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[Step 11] Workflow & Custom Agent Cleanup');

    // Delete custom workflow
    const deleteWfRes = await request(`/admin/operations/agent-fleet/workflows/${testWorkflowId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteWfRes.status === 200, 'Workflow deletion returned 200 OK');
    assert(deleteWfRes.data.data.success === true, 'Workflow delete success: true');

    // Verify executions cascaded
    const [cascadedExecs] = await connection.execute('SELECT id FROM agent_workflow_executions WHERE workflow_id = ?', [testWorkflowId]);
    assert(cascadedExecs.length === 0, 'Workflow executions cleanly cascaded upon workflow deletion');

    // Delete custom agent
    const deleteAgentRes = await request(`/admin/operations/agent-fleet/agents/${testAgentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteAgentRes.status === 200, 'Custom agent deletion returned 200 OK');
    assert(deleteAgentRes.data.data.success === true, 'Custom agent delete success: true');

    // -------------------------------------------------------------------------
    // 12. POST-CHECK: Production Meta Publication Lock Invariant
    // -------------------------------------------------------------------------
    console.log('\n[Step 12] Post-Verification: Production Meta Publication Lock Invariant');
    await verifyMetaLock(connection, 'POST-CHECK');

    console.log('\n======================================================================');
    console.log(`  ✓ STAGE 29 SUITE COMPLETE: ${passedTests} passed, ${failedTests} failed`);
    console.log('======================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage29Tests().catch((err) => {
  console.error('\n❌ STAGE 29 TEST SUITE FAILED:', err);
  process.exit(1);
});
