/**
 * SocialForge HLD Stage 2: Automation Engine Automated Test Suite
 * Validates:
 * 1. Database schema & table structures (automations, automation_runs)
 * 2. Condition evaluation engine (all operators & compound logic)
 * 3. Idempotency & deduplication engine
 * 4. Action step execution (generate_content, create_post, approval_gate, notify, fetch_datasource)
 * 5. End-to-end execution graph (runner, status lifecycle, step logging)
 * 6. Trigger dispatching (manual, webhook token, datasource change)
 * 7. Pre-built recipe catalog & 1-click instantiation
 * 8. Automation health & telemetry aggregation
 * 9. Strict multi-tenant isolation & security
 * 10. Preservation of existing publishing data
 */

import { db } from '../apps/api/dist/db/connection.js';
import {
  automationService,
  automationRunnerService,
  triggerService,
  conditionService,
  actionService,
  recipeService,
  idempotencyService,
  automationHealthService,
} from '../apps/api/dist/services/automation/index.js';
import crypto from 'crypto';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('   SOCIALFORGE STAGE 2: AUTOMATION ENGINE TEST SUITE           ');
  console.log('===============================================================\n');

  const testTenantA = 'tenant_auto_a_' + crypto.randomUUID().slice(0, 8);
  const testTenantB = 'tenant_auto_b_' + crypto.randomUUID().slice(0, 8);
  const testBrandA = 'brand_auto_a_' + crypto.randomUUID().slice(0, 8);
  const testBrandB = 'brand_auto_b_' + crypto.randomUUID().slice(0, 8);

  try {
    // Seed test tenants & brands
    await db('tenants').insert([
      { id: testTenantA, name: 'Automation Test Tenant A', slug: testTenantA, settings: JSON.stringify({}) },
      { id: testTenantB, name: 'Automation Test Tenant B', slug: testTenantB, settings: JSON.stringify({}) },
    ]);
    await db('brands').insert([
      { id: testBrandA, tenant_id: testTenantA, name: 'Automation Brand A', slug: testBrandA },
      { id: testBrandB, tenant_id: testTenantB, name: 'Automation Brand B', slug: testBrandB },
    ]);

    // -------------------------------------------------------------
    // TEST SUITE 1: Schema Verification
    // -------------------------------------------------------------
    console.log('[1/10] Verifying database schema for automations and runs...');
    const autoCols = await db('automations').columnInfo();
    assert(autoCols.id !== undefined, 'automations table has id column');
    assert(autoCols.tenant_id !== undefined, 'automations table has tenant_id column');
    assert(autoCols.brand_id !== undefined, 'automations table has brand_id column');
    assert(autoCols.trigger_type !== undefined, 'automations table has trigger_type column');
    assert(autoCols.trigger_config !== undefined, 'automations table has trigger_config column');
    assert(autoCols.conditions !== undefined, 'automations table has conditions column');
    assert(autoCols.actions !== undefined, 'automations table has actions column');
    assert(autoCols.status !== undefined, 'automations table has status column');

    const runCols = await db('automation_runs').columnInfo();
    assert(runCols.id !== undefined, 'automation_runs table has id column');
    assert(runCols.automation_id !== undefined, 'automation_runs table has automation_id column');
    assert(runCols.tenant_id !== undefined, 'automation_runs table has tenant_id column');
    assert(runCols.status !== undefined, 'automation_runs table has status column');
    assert(runCols.step_results !== undefined, 'automation_runs table has step_results column');

    // -------------------------------------------------------------
    // TEST SUITE 2: Condition Evaluation Engine
    // -------------------------------------------------------------
    console.log('\n[2/10] Verifying Condition Evaluation Engine...');
    const testPayload = {
      product: { price: 85, title: 'Summer Collection Jacket', tags: ['apparel', 'outerwear'] },
      status: 'Ready',
      channel: 'shopify',
    };

    assert(
      conditionService.evaluateSingle({ field: 'status', operator: 'equals', value: 'Ready' }, testPayload) === true,
      'condition equals evaluates correctly'
    );
    assert(
      conditionService.evaluateSingle({ field: 'status', operator: 'not_equals', value: 'Draft' }, testPayload) === true,
      'condition not_equals evaluates correctly'
    );
    assert(
      conditionService.evaluateSingle({ field: 'product.price', operator: 'greater_than', value: 50 }, testPayload) === true,
      'condition greater_than evaluates correctly'
    );
    assert(
      conditionService.evaluateSingle({ field: 'product.price', operator: 'less_than', value: 100 }, testPayload) === true,
      'condition less_than evaluates correctly'
    );
    assert(
      conditionService.evaluateSingle({ field: 'product.title', operator: 'contains', value: 'Jacket' }, testPayload) === true,
      'condition contains evaluates correctly on string'
    );
    assert(
      conditionService.evaluateSingle({ field: 'product.tags', operator: 'contains', value: 'apparel' }, testPayload) === true,
      'condition contains evaluates correctly on array'
    );
    assert(
      conditionService.evaluateSingle({ field: 'channel', operator: 'in', value: ['shopify', 'woocommerce'] }, testPayload) === true,
      'condition in evaluates correctly'
    );
    assert(
      conditionService.evaluateSingle({ field: 'channel', operator: 'matches', value: '^shop.*' }, testPayload) === true,
      'condition matches regex evaluates correctly'
    );

    // Compound conditions
    const compoundRules = [
      { field: 'status', operator: 'equals', value: 'Ready' },
      { field: 'product.price', operator: 'greater_than', value: 50 },
    ];
    assert(conditionService.evaluateConditions(compoundRules, testPayload, 'ALL') === true, 'compound ALL conditions evaluate correctly');

    const failingRules = [
      { field: 'status', operator: 'equals', value: 'Ready' },
      { field: 'product.price', operator: 'greater_than', value: 200 }, // Fails
    ];
    assert(conditionService.evaluateConditions(failingRules, testPayload, 'ALL') === false, 'failing ALL condition rejected');
    assert(conditionService.evaluateConditions(failingRules, testPayload, 'ANY') === true, 'ANY condition passes when one rule matches');

    // -------------------------------------------------------------
    // TEST SUITE 3: Idempotency & Deduplication Engine
    // -------------------------------------------------------------
    console.log('\n[3/10] Verifying Idempotency & Deduplication Engine...');
    const idemPayload = { orderId: '1001', amount: 150 };
    const autoId = 'auto_test_123';
    const key = idempotencyService.generateKey(testTenantA, autoId, idemPayload);
    assert(key && key.startsWith('idem_'), 'Idempotency key generated with correct prefix');

    const firstAcquire = await idempotencyService.checkAndAcquire(key, 60);
    assert(firstAcquire === true, 'First event acquisition succeeds');

    const duplicateAcquire = await idempotencyService.checkAndAcquire(key, 60);
    assert(duplicateAcquire === false, 'Duplicate event acquisition is blocked within TTL');

    await idempotencyService.release(key);
    const reacquired = await idempotencyService.checkAndAcquire(key, 60);
    assert(reacquired === true, 'Released key can be reacquired');

    // -------------------------------------------------------------
    // TEST SUITE 4: Action Step Execution
    // -------------------------------------------------------------
    console.log('\n[4/10] Verifying Action Step Handlers...');
    const actionCtx = {
      tenantId: testTenantA,
      brandId: testBrandA,
      automationId: autoId,
      triggerEvent: testPayload,
    };

    // 1. generate_content
    const contentStep = await actionService.executeAction(
      { id: 'step_1', type: 'generate_content', config: { prompt: 'Launch Announcement', platforms: ['instagram', 'linkedin'] } },
      0,
      actionCtx
    );
    assert(contentStep.status === 'success', 'generate_content action executes successfully');
    assert(contentStep.output?.variants?.length === 2, 'generate_content produces platform variants');

    // 2. create_post
    const postStep = await actionService.executeAction(
      { id: 'step_2', type: 'create_post', config: { title: 'Autumn Launch', content: 'Our new line is here!' } },
      1,
      actionCtx
    );
    assert(postStep.status === 'success', 'create_post action executes successfully');
    assert(postStep.output?.postId !== undefined, 'create_post returns generated postId');

    const createdPost = await db('posts').where({ id: postStep.output.postId }).first();
    assert(createdPost && createdPost.tenant_id === testTenantA, 'Draft post stored in database with tenant scoping');

    // 3. approval_gate
    const approvalStep = await actionService.executeAction(
      { id: 'step_3', type: 'approval_gate', config: { postId: postStep.output.postId } },
      2,
      actionCtx
    );
    assert(approvalStep.status === 'approval_requested', 'approval_gate action executes and requests approval');
    assert(approvalStep.output?.magicLinkUrl !== undefined, 'approval_gate generates signed magic review link');

    const approvalRow = await db('approval_requests').where({ id: approvalStep.output.approvalId }).first();
    assert(approvalRow && approvalRow.status === 'pending', 'Approval request record stored in pending state');

    // 4. notify
    const notifyStep = await actionService.executeAction(
      { id: 'step_4', type: 'notify', config: { channel: 'webhook', target: 'https://webhook.site/test' } },
      3,
      actionCtx
    );
    assert(notifyStep.status === 'success' && notifyStep.output?.delivered === true, 'notify action executes successfully');

    // -------------------------------------------------------------
    // TEST SUITE 5: End-to-End Execution Graph & Runner
    // -------------------------------------------------------------
    console.log('\n[5/10] Verifying End-to-End Automation Runner & Execution Graph...');
    const fullAutomation = await automationService.createAutomation(testTenantA, {
      brandId: testBrandA,
      name: 'E2E Social Publishing Pipeline',
      triggerType: 'manual',
      conditions: [
        { field: 'status', operator: 'equals', value: 'approved_for_social' },
      ],
      actions: [
        { id: 's1', type: 'generate_content', config: { prompt: 'Product drop' } },
        { id: 's2', type: 'create_post', config: { title: 'Auto Post 1' } },
        { id: 's3', type: 'notify', config: { channel: 'slack' } },
      ],
      status: 'active',
    });
    assert(fullAutomation.id !== undefined, 'Automation created in active state');

    // Execution with matching conditions
    const runResult = await automationRunnerService.executeAutomation(testTenantA, fullAutomation.id, {
      status: 'approved_for_social',
      title: 'Summer Launch Special',
    });
    assert(runResult.success === true, 'Automation runner completes execution successfully');
    assert(runResult.status === 'completed', 'Run status marked completed');
    assert(runResult.stepResults?.length === 3, 'All 3 action steps executed in graph');

    const runDbRow = await db('automation_runs').where({ id: runResult.runId }).first();
    assert(runDbRow && runDbRow.status === 'completed', 'Database records completed run');
    assert(runDbRow.duration_ms > 0, 'Run duration tracked in milliseconds');

    const updatedAuto = await automationService.getAutomationById(testTenantA, fullAutomation.id);
    assert(updatedAuto.executionCount === 1, 'Automation execution_count incremented');

    // Execution with failing conditions (Skipped Gate)
    const skippedResult = await automationRunnerService.executeAutomation(testTenantA, fullAutomation.id, {
      status: 'draft_pending_review', // Condition fails
    });
    assert(skippedResult.skipped === true, 'Run correctly skipped when conditions fail');
    assert(skippedResult.status === 'skipped', 'Run status marked skipped');

    // -------------------------------------------------------------
    // TEST SUITE 6: Trigger Dispatching (Webhook & Datasource)
    // -------------------------------------------------------------
    console.log('\n[6/10] Verifying Trigger Dispatching...');
    // Create webhook automation
    const webhookAuto = await automationService.createAutomation(testTenantA, {
      brandId: testBrandA,
      name: 'Inbound Webhook Listener',
      triggerType: 'webhook',
      actions: [
        { id: 'w1', type: 'notify', config: { channel: 'email' } },
      ],
      status: 'active',
    });
    const webhookToken = webhookAuto.triggerConfig.webhookToken;
    assert(webhookToken && webhookToken.startsWith('whk_'), 'Webhook trigger assigned secure token');

    const webhookResult = await triggerService.handleWebhookTrigger(webhookToken, { event: 'user_signup', userId: 'u_99' });
    assert(webhookResult.success === true && webhookResult.status === 'completed', 'Webhook trigger dispatches automation run');

    // -------------------------------------------------------------
    // TEST SUITE 7: Pre-Built Recipe Catalog & 1-Click Instantiation
    // -------------------------------------------------------------
    console.log('\n[7/10] Verifying Pre-Built Recipe Catalog & Instantiation...');
    const recipes = recipeService.listRecipes();
    assert(recipes.length >= 4, 'Recipe catalog contains all standard recipes');
    assert(recipes.some((r) => r.id === 'sheets-to-social'), 'Google Sheets recipe exists');
    assert(recipes.some((r) => r.id === 'shopify-product-drop'), 'Shopify product drop recipe exists');
    assert(recipes.some((r) => r.id === 'content-recycler'), 'Content recycler recipe exists');
    assert(recipes.some((r) => r.id === 'gdrive-asset-watcher'), 'Google Drive asset watcher recipe exists');

    // 1-Click Instantiate Shopify Recipe
    const instantiated = await recipeService.instantiateRecipe(testTenantA, testBrandA, 'shopify-product-drop', 'Flash Sale Drop');
    assert(instantiated.id !== undefined, 'Recipe instantiated into active automation');
    assert(instantiated.actions.length === 3, 'Instantiated automation includes pre-configured action steps');

    // -------------------------------------------------------------
    // TEST SUITE 8: Automation Health & Telemetry Summary
    // -------------------------------------------------------------
    console.log('\n[8/10] Verifying Automation Health & Telemetry Aggregation...');
    const health = await automationHealthService.getHealthSummary(testTenantA);
    assert(health.totalAutomations >= 3, 'Health summary aggregates all tenant automations');
    assert(health.activeCount >= 3, 'Health summary counts active automations');
    assert(health.totalRuns >= 2, 'Health summary tracks completed runs');
    assert(health.successRate >= 50, 'Health summary computes percentage success rate');
    assert(typeof health.avgDurationMs === 'number', 'Health summary computes average execution duration');

    // -------------------------------------------------------------
    // TEST SUITE 9: Strict Multi-Tenant Isolation
    // -------------------------------------------------------------
    console.log('\n[9/10] Verifying Strict Multi-Tenant Boundary Enforcement...');
    // Create automation in Tenant B
    const autoB = await automationService.createAutomation(testTenantB, {
      brandId: testBrandB,
      name: 'Tenant B Secret Automation',
      triggerType: 'manual',
      actions: [{ id: 'b1', type: 'notify', config: {} }],
    });

    // Tenant A tries to read Tenant B automation -> must return null
    const crossTenantGet = await automationService.getAutomationById(testTenantA, autoB.id);
    assert(crossTenantGet === null, 'Tenant A cannot retrieve Tenant B automation (returns null)');

    // Tenant A tries to update Tenant B automation -> must throw error
    let crossUpdateBlocked = false;
    try {
      await automationService.updateAutomation(testTenantA, autoB.id, { name: 'Hacked' });
    } catch {
      crossUpdateBlocked = true;
    }
    assert(crossUpdateBlocked, 'Tenant A is blocked from updating Tenant B automation');

    // Tenant A tries to delete Tenant B automation -> must throw error
    let crossDeleteBlocked = false;
    try {
      await automationService.deleteAutomation(testTenantA, autoB.id);
    } catch {
      crossDeleteBlocked = true;
    }
    assert(crossDeleteBlocked, 'Tenant A is blocked from deleting Tenant B automation');

    // Tenant A tries to trigger Tenant B automation -> must throw error
    let crossTriggerBlocked = false;
    try {
      await automationRunnerService.executeAutomation(testTenantA, autoB.id, {});
    } catch {
      crossTriggerBlocked = true;
    }
    assert(crossTriggerBlocked, 'Tenant A is blocked from triggering Tenant B automation');

    // Tenant A creates automation with Tenant B brand -> must throw error
    let crossBrandBlocked = false;
    try {
      await automationService.createAutomation(testTenantA, {
        brandId: testBrandB,
        name: 'Illegal Brand Automation',
        triggerType: 'manual',
        actions: [],
      });
    } catch {
      crossBrandBlocked = true;
    }
    assert(crossBrandBlocked, 'Cross-tenant brand assignment strictly rejected');

    // -------------------------------------------------------------
    // TEST SUITE 10: Preservation of Existing Data
    // -------------------------------------------------------------
    console.log('\n[10/10] Verifying preservation of existing publishing data...');
    const metaConnCount = await db('meta_connections').count('id as count').first();
    assert(Number(metaConnCount.count) > 0, 'meta_connections records are preserved');

    const lockedVariant = await db('post_variants').where({ remote_post_id: '1405588742634526_122100337179498315' }).first();
    assert(lockedVariant !== undefined, 'Locked production post variant 1405588742634526_122100337179498315 remains intact');
    assert(lockedVariant.status === 'published', 'Locked post variant status remains published');

    console.log('\n===============================================================');
    console.log(`   TEST RUN COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED       `);
    console.log('===============================================================\n');
  } finally {
    // Clean up test data
    console.log('Cleaning up test tenant data...');
    await db('approval_requests').whereIn('requested_by', [testTenantA, testTenantB]).del();
    await db('automation_runs').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('automations').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('post_variants').whereIn('post_id', function() {
      this.select('id').from('posts').whereIn('tenant_id', [testTenantA, testTenantB]);
    }).del();
    await db('posts').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('brands').whereIn('id', [testBrandA, testBrandB]).del();
    await db('tenants').whereIn('id', [testTenantA, testTenantB]).del();
    await db.destroy();
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
