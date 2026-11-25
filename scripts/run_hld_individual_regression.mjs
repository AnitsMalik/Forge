import { spawnSync } from 'child_process';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

const SCRIPTS = [
  { id: 1, name: 'Stage 1 Connect Hub', path: 'scripts/test_connect_hub_stage1.mjs' },
  { id: 2, name: 'Stage 2 Meta Self-Service', path: 'scripts/test_meta_self_service_stage2.mjs' },
  { id: 3, name: 'Stage 3 Data Connectors', path: 'scripts/test_data_source_connectors_stage3.mjs' },
  { id: 4, name: 'Stage 3 Business Data Ingestion', path: 'scripts/test_business_data_ingestion_stage3.mjs' },
  { id: 5, name: 'Stage 3 Marketing Synthesis', path: 'scripts/test_marketing_object_synthesis.mjs' },
  { id: 6, name: 'Stage 3 Worker Sync & Webhooks', path: 'scripts/test_worker_data_sync_and_webhooks.mjs' },
  { id: 7, name: 'Stage 2 Automation Engine', path: 'scripts/test_automation_stage2.mjs' },
  { id: 8, name: 'Stage 3 Autonomous AI Agent', path: 'scripts/test_ai_agent_stage3.mjs' },
  { id: 9, name: 'Stage 4 Template Studio', path: 'scripts/test_template_engine_stage4.mjs' },
  { id: 10, name: 'Stage 5 Durable Automation', path: 'scripts/test_automation_engine_stage5.mjs' },
  { id: 11, name: 'Flagship Product Workflow', path: 'scripts/test_flagship_product_workflow.mjs' },
  { id: 12, name: 'Golden Flagship E2E Journey', path: 'scripts/test_golden_flagship_e2e_journey.mjs' },
  { id: 13, name: 'Flagship Product Promotion E2E', path: 'scripts/test_flagship_product_promotion_e2e.mjs' },
  { id: 14, name: 'Stage 6 Unified Analytics', path: 'scripts/test_unified_analytics_stage6.mjs' },
  { id: 15, name: 'Stage 7 AI Automation Copilot', path: 'scripts/test_ai_copilot_automation_stage7.mjs' },
  { id: 16, name: 'Stage 8 Trust, Approval & Governance', path: 'scripts/test_governance_stage8.mjs' },
  { id: 17, name: 'Billing Database Model', path: 'scripts/test_billing_database_model.mjs' },
  { id: 18, name: 'HLD v3.0 Billing Hardening', path: 'scripts/test_billing_hld_v3_hardening.mjs' },
  { id: 19, name: 'Stage 9 Billing & Entitlements', path: 'scripts/test_billing_entitlements_stage9.mjs' },
  { id: 20, name: 'Stage 10 Growth Intelligence', path: 'scripts/test_growth_intelligence_stage10.mjs' },
  { id: 21, name: 'E2E Platform Journey', path: 'scripts/test_e2e_platform_journey.mjs' },
  { id: 22, name: 'Campaign Command Center', path: 'scripts/test_campaign_command_center.mjs' },
  { id: 23, name: 'Closed-Loop AI Marketing Advisor', path: 'scripts/test_closed_loop_ai_advisor.mjs' },
  { id: 24, name: 'Superadmin Operations', path: 'scripts/test_superadmin_operations.mjs' },
  { id: 25, name: 'Automated Incident Alerting & Webhooks', path: 'scripts/test_incident_alerting_stage16.mjs' },
  { id: 26, name: 'Enterprise Audit Compliance & RBAC', path: 'scripts/test_enterprise_compliance_stage17.mjs' },
  { id: 27, name: 'Social Webhooks & DLQ Replay', path: 'scripts/test_social_webhooks_stage18.mjs' },
  { id: 28, name: 'Enterprise SLA & Public Status Feeds', path: 'scripts/test_sla_status_stage19.mjs' },
  { id: 29, name: 'Disaster Recovery & Backup Vault', path: 'scripts/test_disaster_recovery_stage20.mjs' },
  { id: 30, name: 'Outbound Webhook Dispatcher Engine', path: 'scripts/test_outbound_webhooks_stage21.mjs' },
  { id: 31, name: 'Enterprise SSO & SAML Federation', path: 'scripts/test_enterprise_sso_stage22.mjs' },
  { id: 32, name: 'SCIM 2.0 Directory Sync', path: 'scripts/test_scim_directory_sync_stage23.mjs' },
  { id: 33, name: 'Enterprise SIEM Streaming & Telemetry', path: 'scripts/test_siem_streaming_stage24.mjs' },
  { id: 34, name: 'Enterprise Data Loss Prevention & Guardrails', path: 'scripts/test_dlp_guardrails_stage25.mjs' },
  { id: 35, name: 'Enterprise Custom Roles & Granular RBAC Engine', path: 'scripts/test_enterprise_custom_rbac_stage26.mjs' },
  { id: 36, name: 'Immutable WORM Audit Vault & Cryptographic Tamper-Evidence', path: 'scripts/test_worm_audit_vault_stage27.mjs' },
  { id: 37, name: 'Multi-Tenant Custom Domains & White-Label Agency Portals', path: 'scripts/test_custom_domains_stage28.mjs' },
  { id: 38, name: 'AI Agent Fleet Orchestration & Collaborative Workflows', path: 'scripts/test_agent_fleet_stage29.mjs' },
  { id: 39, name: 'Global Edge Caching & Content Delivery Network', path: 'scripts/test_edge_cache_stage30.mjs' },
  { id: 40, name: 'Brand Knowledge Graph & Advanced Vector Memory', path: 'scripts/test_knowledge_graph_stage31.mjs' },
  { id: 41, name: 'Enterprise Predictive Churn & Revenue Intelligence', path: 'scripts/test_revenue_intelligence_stage32.mjs' },
  { id: 42, name: 'Enterprise Global API Gateway & Dynamic Rate-Limiter', path: 'scripts/test_api_gateway_stage33.mjs' },
  { id: 43, name: 'Enterprise Multi-Region Disaster Failover & Live Replication Mesh', path: 'scripts/test_replication_mesh_stage34.mjs' },
  { id: 44, name: 'Enterprise Automated Chaos Engineering & Resiliency Testing', path: 'scripts/test_chaos_engineering_stage35.mjs' },
  { id: 45, name: 'Enterprise Zero-Trust Secret Rotation & KMS Mesh', path: 'scripts/test_secret_rotation_stage36.mjs' },
  { id: 46, name: 'Enterprise Multi-Cloud FinOps & Cost Attribution Engine', path: 'scripts/test_finops_cost_attribution_stage37.mjs' },
  { id: 47, name: 'Enterprise Continuous Compliance & Evidence Locker Mesh', path: 'scripts/test_continuous_compliance_stage38.mjs' },
  { id: 48, name: 'Enterprise Global Event Mesh & DLQ Replay Pipeline', path: 'scripts/test_event_mesh_dlq_stage39.mjs' },
  { id: 49, name: 'Enterprise Automated Database Partitioning & Cold-Tier Archival', path: 'scripts/test_database_partitioning_stage40.mjs' },
  { id: 50, name: 'Enterprise Real-Time Query Federation & CQRS Views Engine', path: 'scripts/test_query_federation_stage41.mjs' },
  { id: 51, name: 'Enterprise Active-Active Multi-Master Conflict Resolution Engine', path: 'scripts/test_multi_master_consistency_stage42.mjs' },
  { id: 52, name: 'Enterprise Zero-Trust JIT Access & Dual-Authorization Control Plane', path: 'scripts/test_jit_dual_auth_stage43.mjs' },
  { id: 53, name: 'Enterprise Cryptographic HSM Key Brokerage & Envelope Encryption', path: 'scripts/test_hsm_envelope_stage44.mjs' },
  { id: 54, name: 'Enterprise Multi-Cloud Distributed Object Storage Tiering & WORM Vault', path: 'scripts/test_object_storage_stage45.mjs' },
  { id: 55, name: 'Enterprise Neural Vector Embeddings & Hybrid RAG Knowledge Mesh', path: 'scripts/test_neural_rag_mesh_stage46.mjs' },
  { id: 56, name: 'Enterprise Real-Time Collaborative Canvas & Presence Gateway', path: 'scripts/test_collaborative_canvas_stage47.mjs' },
  { id: 57, name: 'Enterprise Real-Time Video Rendering & Cloud GPU Transcoding Mesh', path: 'scripts/test_video_rendering_stage48.mjs' },
  { id: 58, name: 'Enterprise Distributed Workflow Engine & Long-Running Saga Coordinator', path: 'scripts/test_saga_workflow_stage49.mjs' },
  { id: 59, name: 'Enterprise Cross-Region Active-Active Sharding & Autonomous Data Rebalancing Mesh', path: 'scripts/test_sharding_rebalance_stage50.mjs' },
  { id: 60, name: 'Omnichannel Social Connectors (TikTok, LinkedIn Pages & YouTube Shorts Direct Publishing)', path: 'scripts/test_omnichannel_social_connectors_stage52.mjs' },
  { id: 61, name: 'Automated Viral Content Prediction & A/B Variant Testing Engine', path: 'scripts/test_viral_prediction_and_ab_testing_stage54.mjs' }
];

console.log('========================================================================');
console.log('       SOCIALFORGE FULL INDIVIDUAL HLD REGRESSION SUITE RUNNER         ');
console.log('========================================================================\n');

const suiteStartTime = performance.now();
const results = [];

function parseTestCounts(output, scriptPath) {
  let passed = 0;
  let failed = 0;
  let total = 0;

  // Patterns seen across test scripts
  // Pattern 1: TEST RESULTS: X PASSED, Y FAILED (TOTAL: Z)
  const p1 = output.match(/(?:TEST RESULTS|COMPLETE|TOTAL VERIFIED ASSERTIONS|TOTAL|TESTS):\s*(\d+)\s*PASSED[,\s]+(\d+)\s*FAILED/i);
  if (p1) {
    passed = parseInt(p1[1], 10);
    failed = parseInt(p1[2], 10);
    total = passed + failed;
    return { passed, failed, total, skipped: 0 };
  }

  // Pattern 2: [Result] X passed, Y failed
  const p2 = output.match(/(\d+)\s*passed[,\s]+(\d+)\s*failed/i);
  if (p2) {
    passed = parseInt(p2[1], 10);
    failed = parseInt(p2[2], 10);
    total = passed + failed;
    return { passed, failed, total, skipped: 0 };
  }

  // Pattern 3: count check markers "PASS:" or "✓" or "[PASS]" or "PASS"
  const passMatches = output.match(/(?:(?:^|\s)(?:✓|PASS:|\[PASS\])\s*.*)/gm) || [];
  const failMatches = output.match(/(?:(?:^|\s)(?:✗|FAIL:|\[FAIL\])\s*.*)/gm) || [];

  if (passMatches.length > 0 || failMatches.length > 0) {
    passed = passMatches.length;
    failed = failMatches.length;
    total = passed + failed;
    return { passed, failed, total, skipped: 0 };
  }

  return { passed: 0, failed: 0, total: 0, skipped: 0 };
}

for (const s of SCRIPTS) {
  process.stdout.write(`[${s.id}/${SCRIPTS.length}] Running: ${s.path} ... `);
  const start = performance.now();
  const res = spawnSync('node', [s.path], {
    encoding: 'utf-8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024
  });
  const durationMs = performance.now() - start;
  const durationSec = (durationMs / 1000).toFixed(2);

  const fullOutput = (res.stdout || '') + '\n' + (res.stderr || '');
  const counts = parseTestCounts(fullOutput, s.path);

  const isSuccess = res.status === 0 && counts.failed === 0;
  const statusStr = isSuccess ? 'PASS' : 'FAIL';

  results.push({
    id: s.id,
    name: s.name,
    script: s.path,
    tests: counts.total,
    passed: counts.passed,
    failed: counts.failed,
    skipped: counts.skipped,
    durationMs: Math.round(durationMs),
    durationSec: parseFloat(durationSec),
    status: statusStr,
    exitCode: res.status
  });

  console.log(`${statusStr} (${counts.passed}/${counts.total} passed in ${durationSec}s)`);

  if (!isSuccess) {
    console.error(`\n--- FAILURE DETAILS FOR ${s.path} ---`);
    console.error(fullOutput.slice(-2000));
    console.error('-------------------------------------------\n');
  }
}

const totalDurationSec = ((performance.now() - suiteStartTime) / 1000).toFixed(2);

console.log('\n========================================================================');
console.log('                   INDIVIDUAL SCRIPT EXECUTION REPORT                   ');
console.log('========================================================================\n');

console.log(
  'Script'.padEnd(50) +
  'Tests'.padStart(8) +
  'Passed'.padStart(8) +
  'Failed'.padStart(8) +
  'Skipped'.padStart(9) +
  'Duration'.padStart(12) +
  'Status'.padStart(10)
);
console.log('-'.repeat(105));

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;

for (const r of results) {
  totalTests += r.tests;
  totalPassed += r.passed;
  totalFailed += r.failed;
  totalSkipped += r.skipped;

  console.log(
    r.script.padEnd(50) +
    String(r.tests).padStart(8) +
    String(r.passed).padStart(8) +
    String(r.failed).padStart(8) +
    String(r.skipped).padStart(9) +
    (r.durationSec + 's').padStart(12) +
    r.status.padStart(10)
  );
}

console.log('-'.repeat(105));
console.log(
  'TOTAL'.padEnd(50) +
  String(totalTests).padStart(8) +
  String(totalPassed).padStart(8) +
  String(totalFailed).padStart(8) +
  String(totalSkipped).padStart(9) +
  (totalDurationSec + 's').padStart(12) +
  (totalFailed === 0 ? 'PASS' : 'FAIL').padStart(10)
);

const reportData = {
  totalScripts: SCRIPTS.length,
  totalTests,
  totalPassed,
  totalFailed,
  totalSkipped,
  totalDurationSec: parseFloat(totalDurationSec),
  results
};

fs.writeFileSync('scripts/hld_regression_results.json', JSON.stringify(reportData, null, 2), 'utf-8');
console.log('\n[Saved] Detailed JSON metrics saved to scripts/hld_regression_results.json');

process.exit(totalFailed === 0 ? 0 : 1);
