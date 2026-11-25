/**
 * Stage 37: Enterprise Multi-Cloud Infrastructure FinOps, Real-Time Cost Attribution & Resource Rightsizing Engine Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. FinOps Telemetry & Metric Assertions (spend, budgets, utilization, projections, margins)
 * 4. Pre-seeded Core Multi-Cloud Accounts (AWS, GCP, Cloudflare, OpenAI)
 * 5. Single Cloud Cost Account Deep Inspection & Provider Filtering
 * 6. Account Provisioning, Status Transitions & Validation Guardrails
 * 7. Protected Core Cloud Account Decommission Guards
 * 8. Real-Time Tenant Cost Attribution & Unit Margin Economics
 * 9. Resource Rightsizing Lifecycle Engine (pending -> applied / dismissed)
 * 10. In-Memory What-If Growth & Margin Simulation Sandbox
 * 11. Superadmin Audit Trail Ledger & Event Tracking
 * 12. Complete Database Cleanup & Test Idempotency
 */

import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

// Target Meta Invariant Identifiers
const TARGET_VARIANT_ID = 'bc2051b1-a44a-4a97-8acd-1f3125c70164';
const EXPECTED_REMOTE_POST_ID = '1405588742634526_122100337179498315';
const TARGET_JOB_ID = '256cf21a-26cd-4032-a7b8-17261d8a81b1';

let passedTests = 0;
function logPass(msg) {
  console.log(`  ✓ PASS: ${msg}`);
  passedTests++;
}

async function verifyMetaLock(connection, phase = 'PRE') {
  const [variantRows] = await connection.execute(
    'SELECT id, remote_post_id, status, platform FROM post_variants WHERE id = ?',
    [TARGET_VARIANT_ID]
  );
  assert(variantRows.length > 0, `[Meta Lock ${phase}] Variant ${TARGET_VARIANT_ID} must exist`);
  const variant = variantRows[0];
  assert.strictEqual(
    variant.remote_post_id,
    EXPECTED_REMOTE_POST_ID,
    `[Meta Lock ${phase}] Variant remote_post_id must match ${EXPECTED_REMOTE_POST_ID}`
  );
  logPass(`[Meta Lock ${phase}] Variant exists with remote_post_id = ${EXPECTED_REMOTE_POST_ID}`);

  assert.strictEqual(
    variant.status,
    'published',
    `[Meta Lock ${phase}] Variant status must be strictly 'published'`
  );
  logPass(`[Meta Lock ${phase}] Variant status is strictly "published" (found: ${variant.status})`);

  const [jobRows] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [TARGET_JOB_ID]
  );
  assert(jobRows.length > 0, `[Meta Lock ${phase}] Publishing job ${TARGET_JOB_ID} must exist`);
  const job = jobRows[0];
  logPass(`[Meta Lock ${phase}] Publishing job exists with ID = ${TARGET_JOB_ID}`);

  assert.strictEqual(
    job.status,
    'published',
    `[Meta Lock ${phase}] Job status must be strictly 'published'`
  );
  logPass(`[Meta Lock ${phase}] Job status is strictly "published" (found: ${job.status})`);
}

async function runStage37Tests() {
  console.log('\n========================================================================');
  console.log('--- STAGE 37: Enterprise Multi-Cloud FinOps & Rightsizing Test Suite ---');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 0. Ensure test environment cleanliness
    await connection.execute("DELETE FROM cloud_cost_accounts WHERE id LIKE 'acc-test-%' OR account_name LIKE 'Test %'");
    await connection.execute("UPDATE finops_rightsizing_recommendations SET status = 'pending', applied_at = NULL");

    // 1. Meta Lock PRE-verification
    console.log('[1/11] Verifying Production Meta Publication Lock (PRE-CHECK)...');
    await verifyMetaLock(connection, 'PRE');

    // Fetch superadmin and standard user
    const [superadminRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadminRows.length > 0, 'Must have at least one active superadmin user');
    const superadmin = superadminRows[0];
    logPass('Found active superadmin user');

    const [memberRows] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(memberRows.length > 0, 'Must have at least one active regular user');
    const regularUser = memberRows[0];
    logPass('Found active regular tenant member');

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperAdmin: true },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const regularToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, isSuperAdmin: false, tenantId: regularUser.tenant_id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 2. Superadmin Security & RBAC Guardrails
    console.log('\n[2/11] Testing Superadmin Security & RBAC Guardrails...');
    const resNoAuth = await fetch(`${BASE_URL}/admin/operations/finops/telemetry`);
    assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated request must return 401 Unauthorized');
    logPass('Unauthenticated access blocked with 401 Unauthorized');

    const resForbidden = await fetch(`${BASE_URL}/admin/operations/finops/telemetry`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, 'Regular user must return 403 Forbidden');
    logPass('Non-superadmin user blocked with 403 Forbidden');

    const resAuth = await fetch(`${BASE_URL}/admin/operations/finops/telemetry`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAuth.status, 200, 'Superadmin request must return 200 OK');
    const telemetryBody = await resAuth.json();
    assert.strictEqual(telemetryBody.success, true, 'Telemetry response must indicate success');
    logPass('Superadmin authentication successfully granted (200 OK)');

    // 3. FinOps Telemetry Assertions
    console.log('\n[3/11] Validating FinOps KPI Telemetry & Run-Rate Engine...');
    const tel = telemetryBody.data;
    assert(typeof tel.totalMonthlySpend === 'number', 'totalMonthlySpend must be a number');
    logPass(`totalMonthlySpend verified ($${tel.totalMonthlySpend})`);
    assert(typeof tel.totalMonthlyBudget === 'number', 'totalMonthlyBudget must be a number');
    logPass(`totalMonthlyBudget verified ($${tel.totalMonthlyBudget})`);
    assert(typeof tel.budgetUtilizationPercent === 'number', 'budgetUtilizationPercent must be a number');
    logPass(`budgetUtilizationPercent verified (${tel.budgetUtilizationPercent}%)`);
    assert(typeof tel.projectedMonthEndSpend === 'number', 'projectedMonthEndSpend must be a number');
    logPass(`projectedMonthEndSpend verified ($${tel.projectedMonthEndSpend})`);
    assert(tel.activeAccountsCount >= 4, `activeAccountsCount must be >= 4 (found ${tel.activeAccountsCount})`);
    logPass(`activeAccountsCount verified (${tel.activeAccountsCount} accounts)`);
    assert(tel.totalRightsizingSavingsMonthly > 0, 'totalRightsizingSavingsMonthly must be > 0');
    logPass(`totalRightsizingSavingsMonthly verified ($${tel.totalRightsizingSavingsMonthly}/mo)`);
    assert(tel.averageTenantGrossMarginPercent > 80, `averageTenantGrossMarginPercent must be > 80 (found ${tel.averageTenantGrossMarginPercent}%)`);
    logPass(`averageTenantGrossMarginPercent verified (${tel.averageTenantGrossMarginPercent}%)`);
    assert(typeof tel.spendByProvider === 'object', 'spendByProvider must be an object');
    assert(tel.spendByProvider.aws > 0, 'AWS spend must be > 0');
    logPass(`spendByProvider.aws verified ($${tel.spendByProvider.aws})`);
    assert(tel.spendByProvider.gcp > 0, 'GCP spend must be > 0');
    logPass(`spendByProvider.gcp verified ($${tel.spendByProvider.gcp})`);
    assert(tel.spendByProvider.cloudflare > 0, 'Cloudflare spend must be > 0');
    logPass(`spendByProvider.cloudflare verified ($${tel.spendByProvider.cloudflare})`);
    assert(tel.spendByProvider.openai_anthropic > 0, 'OpenAI/Anthropic spend must be > 0');
    logPass(`spendByProvider.openai_anthropic verified ($${tel.spendByProvider.openai_anthropic})`);
    assert(typeof tel.spendByCategory === 'object', 'spendByCategory must be an object');
    assert(tel.spendByCategory.core_platform > 0, 'core_platform category spend must be > 0');
    logPass(`spendByCategory.core_platform verified ($${tel.spendByCategory.core_platform})`);
    assert(tel.spendByCategory.ai_inference > 0, 'ai_inference category spend must be > 0');
    logPass(`spendByCategory.ai_inference verified ($${tel.spendByCategory.ai_inference})`);
    assert(tel.spendByCategory.tenant_workload > 0, 'tenant_workload category spend must be > 0');
    logPass(`spendByCategory.tenant_workload verified ($${tel.spendByCategory.tenant_workload})`);
    assert(tel.spendByCategory.media_storage > 0, 'media_storage category spend must be > 0');
    logPass(`spendByCategory.media_storage verified ($${tel.spendByCategory.media_storage})`);
    assert(tel.spendByCategory.edge_traffic > 0, 'edge_traffic category spend must be > 0');
    logPass(`spendByCategory.edge_traffic verified ($${tel.spendByCategory.edge_traffic})`);
    assert(Array.isArray(tel.topSpendingTenants), 'topSpendingTenants must be an array');
    assert(tel.topSpendingTenants.length > 0, 'topSpendingTenants must contain items');
    logPass(`topSpendingTenants contains ${tel.topSpendingTenants.length} tenants`);

    // 4. Pre-seeded Cloud Cost Accounts
    console.log('\n[4/11] Inspecting Pre-Seeded Multi-Cloud Accounts...');
    const resAccounts = await fetch(`${BASE_URL}/admin/operations/finops/accounts`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAccounts.status, 200, 'List accounts must return 200 OK');
    const accountsBody = await resAccounts.json();
    assert.strictEqual(accountsBody.success, true);
    const accounts = accountsBody.data;
    assert(accounts.length >= 4, `Must have at least 4 pre-seeded accounts (found ${accounts.length})`);

    const awsAccount = accounts.find((a) => a.id === 'acc-aws-prod-01');
    assert(awsAccount, 'acc-aws-prod-01 must exist');
    assert.strictEqual(awsAccount.provider, 'aws');
    assert.strictEqual(awsAccount.monthly_budget, 12500.00);
    assert.strictEqual(awsAccount.current_month_spend, 4820.50);
    logPass('Pre-seeded AWS production account verified (acc-aws-prod-01, $12,500 budget)');

    const gcpAccount = accounts.find((a) => a.id === 'acc-gcp-ai-02');
    assert(gcpAccount, 'acc-gcp-ai-02 must exist');
    assert.strictEqual(gcpAccount.provider, 'gcp');
    assert.strictEqual(gcpAccount.monthly_budget, 8000.00);
    logPass('Pre-seeded GCP AI account verified (acc-gcp-ai-02, $8,000 budget)');

    const cfAccount = accounts.find((a) => a.id === 'acc-cf-edge-03');
    assert(cfAccount, 'acc-cf-edge-03 must exist');
    assert.strictEqual(cfAccount.provider, 'cloudflare');
    assert.strictEqual(cfAccount.monthly_budget, 2000.00);
    logPass('Pre-seeded Cloudflare edge account verified (acc-cf-edge-03, $2,000 budget)');

    const aiAccount = accounts.find((a) => a.id === 'acc-openai-tokens-04');
    assert(aiAccount, 'acc-openai-tokens-04 must exist');
    assert.strictEqual(aiAccount.provider, 'openai_anthropic');
    assert.strictEqual(aiAccount.monthly_budget, 6500.00);
    logPass('Pre-seeded OpenAI / Anthropic account verified (acc-openai-tokens-04, $6,500 budget)');

    // 5. Account Filtering & Single Fetch
    console.log('\n[5/11] Testing Cloud Account Provider Filtering & Single Account Fetch...');
    const resAwsFilter = await fetch(`${BASE_URL}/admin/operations/finops/accounts?provider=aws`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    const awsFilterBody = await resAwsFilter.json();
    assert(awsFilterBody.data.every((a) => a.provider === 'aws'), 'All filtered accounts must have provider=aws');
    logPass(`Provider filtering verified (?provider=aws returned ${awsFilterBody.data.length} accounts)`);

    const resSingleAccount = await fetch(`${BASE_URL}/admin/operations/finops/accounts/acc-aws-prod-01`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resSingleAccount.status, 200);
    const singleBody = await resSingleAccount.json();
    assert.strictEqual(singleBody.data.id, 'acc-aws-prod-01');
    logPass('Single account retrieval verified by ID (acc-aws-prod-01)');

    const resNotFound = await fetch(`${BASE_URL}/admin/operations/finops/accounts/non-existent-account-id`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resNotFound.status, 404, 'Non-existent account must return 404');
    logPass('Non-existent account returns 404 Not Found');

    // 6. Account Creation, Validation & Budget Status Transitions
    console.log('\n[6/11] Testing Account Creation, Input Validation & Status Transitions...');
    // Validation: missing name
    const resBadName = await fetch(`${BASE_URL}/admin/operations/finops/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ provider: 'aws', account_id: '123456', account_name: 'a', monthly_budget: 1000 }),
    });
    assert.strictEqual(resBadName.status, 400);
    logPass('Account name validation enforced (< 3 chars rejected with 400)');

    // Validation: invalid provider
    const resBadProvider = await fetch(`${BASE_URL}/admin/operations/finops/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ provider: 'oracle_cloud', account_id: '123456', account_name: 'Test Account', monthly_budget: 1000 }),
    });
    assert.strictEqual(resBadProvider.status, 400);
    logPass('Unsupported cloud provider rejected with 400');

    // Create valid custom account
    const createRes = await fetch(`${BASE_URL}/admin/operations/finops/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        provider: 'azure',
        account_id: 'sub-test-corp-01',
        account_name: 'Test Azure Workloads',
        monthly_budget: 2000,
        current_month_spend: 500,
      }),
    });
    assert.strictEqual(createRes.status, 201, 'Account creation must return 201 Created');
    const createdAccount = (await createRes.json()).data;
    assert(createdAccount.id.startsWith('acc-'), 'Generated ID must start with acc-');
    assert.strictEqual(createdAccount.status, 'active');
    logPass(`Custom cloud account created successfully (ID: ${createdAccount.id}, status: active)`);

    // Update account budget & spend to trigger warning_budget (> 85%)
    const updateRes1 = await fetch(`${BASE_URL}/admin/operations/finops/accounts/${createdAccount.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        current_month_spend: 1800, // 90% of 2000
      }),
    });
    assert.strictEqual(updateRes1.status, 200);
    const updated1 = (await updateRes1.json()).data;
    assert.strictEqual(updated1.status, 'warning_budget', 'Spend > 85% must trigger status: warning_budget');
    logPass(`Account status transition verified: warning_budget (spend=$1800, budget=$2000, 90%)`);

    // Update account spend to trigger exceeded_budget (> 100%)
    const updateRes2 = await fetch(`${BASE_URL}/admin/operations/finops/accounts/${createdAccount.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        current_month_spend: 2150, // 107.5% of 2000
      }),
    });
    assert.strictEqual(updateRes2.status, 200);
    const updated2 = (await updateRes2.json()).data;
    assert.strictEqual(updated2.status, 'exceeded_budget', 'Spend > budget must trigger status: exceeded_budget');
    logPass(`Account status transition verified: exceeded_budget (spend=$2150, budget=$2000, 107.5%)`);

    // 7. Core Production Account Deletion Protection
    console.log('\n[7/11] Testing Core Account Deletion Protection & Custom Account Deletion...');
    const resDeleteCore = await fetch(`${BASE_URL}/admin/operations/finops/accounts/acc-aws-prod-01`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resDeleteCore.status, 400, 'Attempt to delete protected core account must return 400');
    logPass('Core production account protected against deletion (acc-aws-prod-01 rejected with 400)');

    // Delete custom account
    const resDeleteCustom = await fetch(`${BASE_URL}/admin/operations/finops/accounts/${createdAccount.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resDeleteCustom.status, 200, 'Custom account deletion must return 200');
    logPass(`Custom test account deleted successfully (${createdAccount.id})`);

    // 8. Tenant Cost Attribution & Unit Economics
    console.log('\n[8/11] Validating Real-Time Tenant Cost Attribution & Unit Economics...');
    const resAttributions = await fetch(`${BASE_URL}/admin/operations/finops/tenant-attributions`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAttributions.status, 200);
    const attributions = (await resAttributions.json()).data;
    assert(attributions.length >= 2, `Must have at least 2 tenant attributions (found ${attributions.length})`);

    const firstTenant = attributions[0];
    assert(firstTenant, 'First tenant attribution must exist');
    assert(firstTenant.total_spend > 0, 'First tenant total_spend must be > 0');
    assert(firstTenant.ai_spend > 0, 'First tenant ai_spend must be > 0');
    assert(firstTenant.cost_per_post > 0, 'First tenant cost_per_post must be > 0');
    assert(firstTenant.gross_margin_percent > 85, `First tenant gross_margin_percent must be > 85 (found ${firstTenant.gross_margin_percent}%)`);
    logPass(`Tenant cost attribution verified: ${firstTenant.tenant_name} (Total Spend=$${firstTenant.total_spend}, AI Spend=$${firstTenant.ai_spend}, Unit Cost/Post=$${firstTenant.cost_per_post}, Gross Margin=${firstTenant.gross_margin_percent}%)`);

    // Filter by period
    const resPeriod = await fetch(`${BASE_URL}/admin/operations/finops/tenant-attributions?period=2026-10`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    const periodAttributions = (await resPeriod.json()).data;
    assert(periodAttributions.every((t) => t.reporting_period === '2026-10'), 'All rows must have reporting_period=2026-10');
    logPass(`Period filtering verified (?period=2026-10 returned ${periodAttributions.length} rows)`);

    // 9. Resource Rightsizing Lifecycle Engine
    console.log('\n[9/11] Testing Resource Rightsizing Lifecycle Engine (Pending -> Applied / Dismissed)...');
    const resRightsizing = await fetch(`${BASE_URL}/admin/operations/finops/rightsizing`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resRightsizing.status, 200);
    const rightsizingList = (await resRightsizing.json()).data;
    assert(rightsizingList.length >= 3, `Must have at least 3 rightsizing recommendations (found ${rightsizingList.length})`);

    const r1 = rightsizingList.find((r) => r.id === 'rs-aurora-db-01');
    assert(r1, 'rs-aurora-db-01 must exist');
    assert.strictEqual(r1.resource_type, 'database_aurora');
    assert.strictEqual(r1.projected_savings_monthly, 420.00);
    logPass('Pre-seeded Aurora DB rightsizing recommendation verified (rs-aurora-db-01, $420/mo savings)');

    const targetRec = rightsizingList.find((r) => r.id === 'rs-s3-tiering-03');
    assert(targetRec, 'rs-s3-tiering-03 must exist');
    assert.strictEqual(targetRec.status, 'pending');
    logPass(`Pre-seeded recommendation verified: rs-s3-tiering-03 (${targetRec.recommendation_action}, projected savings: $${targetRec.projected_savings_monthly}/mo)`);

    // Apply recommendation
    const resApply = await fetch(`${BASE_URL}/admin/operations/finops/rightsizing/rs-s3-tiering-03/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resApply.status, 200);
    const appliedRec = (await resApply.json()).data;
    assert.strictEqual(appliedRec.status, 'applied');
    assert(appliedRec.applied_at !== null, 'applied_at must be populated');
    logPass('Rightsizing recommendation applied (status transitioned to "applied", applied_at recorded)');

    // Dismiss recommendation
    const resDismiss = await fetch(`${BASE_URL}/admin/operations/finops/rightsizing/rs-redis-cluster-02/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resDismiss.status, 200);
    const dismissedRec = (await resDismiss.json()).data;
    assert.strictEqual(dismissedRec.status, 'dismissed');
    logPass('Rightsizing recommendation dismissed (status transitioned to "dismissed")');

    // Status filtering
    const resAppliedFilter = await fetch(`${BASE_URL}/admin/operations/finops/rightsizing?status=applied`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    const appliedFiltered = (await resAppliedFilter.json()).data;
    assert(appliedFiltered.every((r) => r.status === 'applied'), 'Filtered items must have status=applied');
    logPass(`Status filtering verified (?status=applied returned ${appliedFiltered.length} items)`);

    const resDismissedFilter = await fetch(`${BASE_URL}/admin/operations/finops/rightsizing?status=dismissed`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    const dismissedFiltered = (await resDismissedFilter.json()).data;
    assert(dismissedFiltered.every((r) => r.status === 'dismissed'), 'Filtered items must have status=dismissed');
    logPass(`Status filtering verified (?status=dismissed returned ${dismissedFiltered.length} items)`);

    // Error on non-existent recommendation
    const resNonExistentApply = await fetch(`${BASE_URL}/admin/operations/finops/rightsizing/non-existent-rec/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resNonExistentApply.status, 400);
    logPass('Applying non-existent rightsizing recommendation rejected with 400');

    // 10. In-Memory What-If Growth & Margin Simulation Sandbox
    console.log('\n[10/11] Testing In-Memory What-If Growth & Margin Simulation Sandbox...');
    // Default simulation
    const resSimDefault = await fetch(`${BASE_URL}/admin/operations/finops/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resSimDefault.status, 200);
    const defaultSim = (await resSimDefault.json()).data;
    assert.strictEqual(defaultSim.simulated, true);
    assert.strictEqual(defaultSim.simulatedPostGrowthPercent, 50);
    assert.strictEqual(defaultSim.simulatedAiTokenGrowthPercent, 75);
    logPass('Default simulation scenario executed (postGrowth=+50%, aiGrowth=+75%)');
    const resSim = await fetch(`${BASE_URL}/admin/operations/finops/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        target_tenant_id: '0842e532-e6cf-4cc1-b8ce-4c4546a10a97',
        post_growth_percent: 100, // +100%
        ai_token_growth_percent: 150, // +150%
      }),
    });
    assert.strictEqual(resSim.status, 200);
    const simBody = await resSim.json();
    assert.strictEqual(simBody.success, true);
    const sim = simBody.data;
    assert.strictEqual(sim.simulated, true);
    assert.strictEqual(sim.simulatedPostGrowthPercent, 100);
    assert.strictEqual(sim.simulatedAiTokenGrowthPercent, 150);
    assert(sim.projectedMonthlyCost > sim.currentMonthlyCost, 'Projected cost must be greater than current cost');
    assert(sim.projectedGrossMarginPercent > 80, `Projected gross margin must remain > 80% (found ${sim.projectedGrossMarginPercent}%)`);
    assert(sim.estimatedUnitCostPerPost > 0, 'Estimated unit cost per post must be > 0');
    assert(Array.isArray(sim.recommendations), 'Simulation must include architectural recommendations');
    assert(sim.recommendations.length >= 3, 'Must have at least 3 architectural recommendations');
    logPass(`Growth simulator validated (+100% posts, +150% AI tokens -> Cost=$${sim.projectedMonthlyCost}, Margin=${sim.projectedGrossMarginPercent}%, Unit Cost=$${sim.estimatedUnitCostPerPost}/post)`);

    // 11. Superadmin Audit Trail Ledger & Meta Lock POST-verification
    console.log('\n[11/11] Verifying Superadmin Audit Trail Ledger & Meta Publication Lock (POST-CHECK)...');
    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type, target_resource_id, reason FROM superadmin_audit_logs WHERE target_resource_type = 'finops' ORDER BY created_at DESC LIMIT 10"
    );
    assert(auditRows.length > 0, 'Must have recorded audit log entries for finops operations');
    const auditActions = auditRows.map((r) => r.action);
    assert(auditActions.includes('CREATE_CLOUD_COST_ACCOUNT'), 'Must include CREATE_CLOUD_COST_ACCOUNT audit action');
    assert(auditActions.includes('UPDATE_CLOUD_COST_ACCOUNT'), 'Must include UPDATE_CLOUD_COST_ACCOUNT audit action');
    assert(auditActions.includes('DELETE_CLOUD_COST_ACCOUNT'), 'Must include DELETE_CLOUD_COST_ACCOUNT audit action');
    assert(auditActions.includes('APPLY_RIGHTSIZING_RECOMMENDATION'), 'Must include APPLY_RIGHTSIZING_RECOMMENDATION audit action');
    assert(auditActions.includes('DISMISS_RIGHTSIZING_RECOMMENDATION'), 'Must include DISMISS_RIGHTSIZING_RECOMMENDATION audit action');
    logPass(`Superadmin audit ledger verified with ${auditRows.length} recent FinOps action events`);

    // Cleanup DB state
    await connection.execute("DELETE FROM cloud_cost_accounts WHERE id LIKE 'acc-test-%' OR account_name LIKE 'Test %'");
    await connection.execute("UPDATE finops_rightsizing_recommendations SET status = 'pending', applied_at = NULL");
    logPass('Database cleaned up and restored to baseline state');

    // POST Meta Lock
    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`--- STAGE 37 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED WITH 100% SUCCESS ---`);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage37Tests().catch((err) => {
  console.error('\n❌ STAGE 37 TEST SUITE FAILED:', err);
  process.exit(1);
});
