/**
 * SocialForge Stage 7: AI Automation Copilot Test Suite
 *
 * Verifies End-to-End Copilot Capabilities:
 * 1. Natural Language Intent Extraction:
 *    "Whenever a new product is added to my Google Sheet, use Product Promotion and publish to Instagram/Facebook every weekday at 7 PM."
 *    -> Trigger: New product (Google Sheets / Excel)
 *    -> Template: Product Promotion (tpl-product-flagship)
 *    -> Channels: Instagram + Facebook
 *    -> Schedule: Weekdays 7 PM (0 19 * * 1-5)
 *    -> Approval: Required
 *    -> Condition: Status = READY
 * 2. Available Connectors Check (Zero Raw Credential Exposure)
 * 3. Available Template Check (Tenant/Brand scope enforcement)
 * 4. Policy & Marketing Claim Validation (Prohibited claims rejection)
 * 5. Quota Validation & Plan Estimation
 * 6. Permission Validation (Tenant user role check)
 * 7. Structured Workflow Plan Generation (Plan created, NO direct publishing)
 * 8. Auditable Tool Calls Logged in Database
 * 9. Dry-Run Test Simulation (Mock verification without external mutations)
 * 10. Edit Structured Plan (Guards enforce non-bypassable approval)
 * 11. User Activation (Instantiates live automation in automations table)
 * 12. Plan Cancellation & Rejection Guards
 * 13. Strict Multi-Tenant Boundary Isolation & Production Post Invariant
 */

import { db } from '../apps/api/dist/db/connection.js';
import { copilotAutomationService } from '../apps/api/dist/services/automation/copilotAutomation.service.js';
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

const LOCKED_PROD_POST_ID = '1405588742634526_122100337179498315';

async function runCopilotTests() {
  console.log('================================================================================');
  console.log('   SOCIALFORGE STAGE 7: AI AUTOMATION COPILOT VERIFICATION SUITE              ');
  console.log('   Natural Language -> Intent -> Connectors -> Template -> Policy -> Quota     ');
  console.log('   -> Structured Plan -> Audit Logs -> Test -> Edit -> Activate -> Cancel       ');
  console.log('================================================================================\n');

  const testTenantA = 'tenant_copilot_a_' + crypto.randomUUID().slice(0, 8);
  const testTenantB = 'tenant_copilot_b_' + crypto.randomUUID().slice(0, 8);
  const testBrandA = 'brand_copilot_a_' + crypto.randomUUID().slice(0, 8);
  const testBrandB = 'brand_copilot_b_' + crypto.randomUUID().slice(0, 8);
  const testUserA = crypto.randomUUID();
  const testUserB = crypto.randomUUID();

  try {
    // -------------------------------------------------------------
    // [Setup] Provision Isolated Tenancy Fixtures
    // -------------------------------------------------------------
    console.log('[Setup] Provisioning isolated test workspace & brand fixtures...');
    await db('tenants').insert([
      { id: testTenantA, name: 'Copilot Agency Alpha', slug: testTenantA, settings: JSON.stringify({}) },
      { id: testTenantB, name: 'Copilot Agency Beta', slug: testTenantB, settings: JSON.stringify({}) },
    ]);

    await db('users').insert([
      { id: testUserA, email: `user-a-${testTenantA}@example.com`, password_hash: 'hash', full_name: 'Alice Creator', is_active: true },
      { id: testUserB, email: `user-b-${testTenantB}@example.com`, password_hash: 'hash', full_name: 'Bob Competitor', is_active: true },
    ]);

    await db('tenant_users').insert([
      { id: crypto.randomUUID(), tenant_id: testTenantA, user_id: testUserA, role: 'agency_admin' },
      { id: crypto.randomUUID(), tenant_id: testTenantB, user_id: testUserB, role: 'agency_admin' },
    ]);

    await db('brands').insert([
      { id: testBrandA, tenant_id: testTenantA, name: 'Alpha Brand Cosmetics', slug: testBrandA, industry: 'Beauty' },
      { id: testBrandB, tenant_id: testTenantB, name: 'Beta Competitor Brand', slug: testBrandB, industry: 'Fashion' },
    ]);

    // Setup active Meta connection for Brand A
    await db('meta_connections').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantA,
      brand_id: testBrandA,
      user_id: testUserA,
      provider: 'meta',
      selected_page_id: 'page_alpha_123',
      selected_page_name: 'Alpha Cosmetics Official',
      instagram_account_id: 'ig_alpha_456',
      instagram_username: 'alphacosmetics',
      status: 'connected',
      scopes: JSON.stringify(['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic']),
    });

    // -------------------------------------------------------------
    // [1/8] Verifying Database Schema for copilot_automation_plans
    // -------------------------------------------------------------
    console.log('\n[1/8] Verifying Database Schema for copilot_automation_plans...');
    const hasTable = await db.schema.hasTable('copilot_automation_plans');
    assert(hasTable, 'copilot_automation_plans table exists in database');

    const hasPromptCol = await db.schema.hasColumn('copilot_automation_plans', 'prompt');
    const hasIntentCol = await db.schema.hasColumn('copilot_automation_plans', 'extracted_intent');
    const hasPlanCol = await db.schema.hasColumn('copilot_automation_plans', 'structured_plan');
    const hasValidationCol = await db.schema.hasColumn('copilot_automation_plans', 'validation_report');
    const hasToolsCol = await db.schema.hasColumn('copilot_automation_plans', 'tool_calls');
    const hasTestCol = await db.schema.hasColumn('copilot_automation_plans', 'test_results');

    assert(hasPromptCol, 'copilot_automation_plans has prompt column');
    assert(hasIntentCol, 'copilot_automation_plans has extracted_intent column');
    assert(hasPlanCol, 'copilot_automation_plans has structured_plan column');
    assert(hasValidationCol, 'copilot_automation_plans has validation_report column');
    assert(hasToolsCol, 'copilot_automation_plans has tool_calls column');
    assert(hasTestCol, 'copilot_automation_plans has test_results column');

    // -------------------------------------------------------------
    // [2/8] Natural Language Input & Intent Extraction
    // -------------------------------------------------------------
    console.log('\n[2/8] Converting Natural Language Prompt into Structured Automation Plan...');
    const userPrompt = 'Whenever a new product is added to my Google Sheet, use Product Promotion and publish to Instagram/Facebook every weekday at 7 PM.';

    const plan = await copilotAutomationService.generateAutomationPlan(
      testTenantA,
      testBrandA,
      testUserA,
      { prompt: userPrompt, brandId: testBrandA }
    );

    assert(Boolean(plan.id), 'Copilot plan generated with unique ID');
    assert(plan.tenantId === testTenantA, 'Plan scoped to Tenant A');
    assert(plan.brandId === testBrandA, 'Plan scoped to Brand A');
    assert(plan.prompt === userPrompt, 'Preserves original natural language prompt');
    assert(plan.status === 'validated', 'Initial plan status is validated');

    // Intent assertions
    const intent = plan.extractedIntent;
    assert(intent.triggerSource === 'google_sheets_or_excel', 'Extracted trigger source is Google Sheets / Excel');
    assert(intent.triggerType === 'datasource_change', 'Extracted trigger type is datasource_change');
    assert(intent.templateName === 'Product Promotion', 'Extracted template name is "Product Promotion"');
    assert(intent.channels.includes('instagram') && intent.channels.includes('facebook'), 'Extracted channels include Instagram and Facebook');
    assert(intent.schedule.includes('Weekdays') && intent.schedule.includes('7 PM'), 'Extracted schedule is "Weekdays 7 PM"');
    assert(intent.cronExpression === '0 19 * * 1-5', 'Extracted cron expression is 0 19 * * 1-5');
    assert(intent.approvalRequired === true, 'Approval requirement is strictly Required (true)');
    assert(intent.statusCondition === 'READY', 'Condition requires Status = READY');

    // -------------------------------------------------------------
    // [3/8] Structured Workflow Plan Validation & Anti-Hallucination
    // -------------------------------------------------------------
    console.log('\n[3/8] Verifying Structured Workflow Definition & Guardrails...');
    const workflow = plan.structuredPlan;
    assert(Boolean(workflow.name), 'Structured workflow has name');
    assert(workflow.trigger.type === 'datasource_change', 'Workflow trigger type matches datasource_change');
    assert(workflow.conditions.length >= 1, 'Workflow includes status condition');
    assert(workflow.conditions[0].field === 'status' && workflow.conditions[0].value === 'READY', 'Condition enforces status = READY');
    assert(workflow.actions.length >= 8, 'Workflow compiles at least 8 action steps');

    // Step sequence verification
    const actionTypes = workflow.actions.map((a) => a.type);
    assert(actionTypes.includes('normalize_product'), 'Workflow includes normalize_product step');
    assert(actionTypes.includes('ai_product_understanding'), 'Workflow includes ai_product_understanding step');
    assert(actionTypes.includes('render_template'), 'Workflow includes render_template step');
    assert(actionTypes.includes('policy_claim_check'), 'Workflow includes policy_claim_check step');
    assert(actionTypes.includes('create_post'), 'Workflow includes create_post step');
    assert(actionTypes.includes('approval_gate'), 'Workflow includes approval_gate step');
    assert(actionTypes.includes('schedule_post'), 'Workflow includes schedule_post step');
    assert(actionTypes.includes('publish_meta'), 'Workflow includes publish_meta step');
    assert(actionTypes.includes('collect_analytics'), 'Workflow includes collect_analytics step');
    assert(actionTypes.includes('generate_ai_recommendation'), 'Workflow includes generate_ai_recommendation step');

    // Strict non-bypassable guards
    assert(workflow.approvalPolicy.required === true, 'AI cannot bypass approval (approvalPolicy.required is true)');
    assert(workflow.approvalPolicy.method === 'magic_link', 'Approval method defaults to magic link sign-off');

    // -------------------------------------------------------------
    // [4/8] Auditable Tool Calls Logged in Database
    // -------------------------------------------------------------
    console.log('\n[4/8] Verifying Auditable Tool Calls Logged During Generation...');
    assert(Array.isArray(plan.toolCalls) && plan.toolCalls.length >= 4, 'Plan records auditable tool calls');
    const toolNames = plan.toolCalls.map((tc) => tc.toolName);

    assert(toolNames.includes('permissions.validateUserRole'), 'Tool logged: permissions.validateUserRole');
    assert(toolNames.includes('connectors.checkAvailableConnections'), 'Tool logged: connectors.checkAvailableConnections');
    assert(toolNames.includes('templates.checkCatalogAvailability'), 'Tool logged: templates.checkCatalogAvailability');
    assert(toolNames.includes('policy.validateBrandRulesAndClaims'), 'Tool logged: policy.validateBrandRulesAndClaims');
    assert(toolNames.includes('quotas.evaluateAutomationLimits'), 'Tool logged: quotas.evaluateAutomationLimits');

    // Verify zero credentials exposed in tool calls audit log
    const connAudit = plan.toolCalls.find((tc) => tc.toolName === 'connectors.checkAvailableConnections');
    assert(connAudit.result.zeroCredentialsExposed === true, 'Connector check verifies zero credentials exposed');
    assert(!JSON.stringify(plan.toolCalls).includes('access_token'), 'Zero access_token leaked in tool calls');
    assert(!JSON.stringify(plan.toolCalls).includes('client_secret'), 'Zero client_secret leaked in tool calls');

    // -------------------------------------------------------------
    // [5/8] Dry-Run Test Plan Execution
    // -------------------------------------------------------------
    console.log('\n[5/8] Executing Dry-Run Test Simulation...');
    const testResult = await copilotAutomationService.testPlan(testTenantA, plan.id, {
      product_name: 'Organic Radiance Facial Serum',
      price: '$54.00',
      availability: 'in_stock',
      status: 'READY',
      row_id: 'row_101',
    });

    assert(testResult.testStatus === 'passed', 'Dry-run test passed successfully');
    assert(testResult.stepSimulations.length >= 5, 'Executed all step simulations');
    assert(testResult.stepSimulations.every((s) => s.status === 'success'), 'All simulated steps succeeded');

    const updatedPlanAfterTest = await copilotAutomationService.getPlan(testTenantA, plan.id);
    assert(updatedPlanAfterTest.status === 'tested', 'Plan status updated to "tested" after successful dry-run');
    assert(Boolean(updatedPlanAfterTest.testResults), 'testResults persisted in database');

    // Test rejection on failing condition
    const failingTestResult = await copilotAutomationService.testPlan(testTenantA, plan.id, {
      product_name: 'Draft Product',
      price: '$10.00',
      availability: 'in_stock',
      status: 'DRAFT',
    });
    assert(failingTestResult.testStatus === 'failed', 'Dry-run fails when sample status is DRAFT');

    // -------------------------------------------------------------
    // [6/8] Edit Structured Plan
    // -------------------------------------------------------------
    console.log('\n[6/8] Editing Structured Plan Before Activation...');
    const editedPlan = await copilotAutomationService.editPlan(testTenantA, plan.id, {
      structuredPlan: {
        name: 'Custom Product Promotion Campaign (Edited)',
        scheduleConfig: {
          humanReadable: 'Weekdays 8 PM',
          cronExpression: '0 20 * * 1-5',
        },
      },
    });

    assert(editedPlan.structuredPlan.name === 'Custom Product Promotion Campaign (Edited)', 'Plan name updated successfully');
    assert(editedPlan.structuredPlan.scheduleConfig.humanReadable === 'Weekdays 8 PM', 'Schedule updated to Weekdays 8 PM');
    assert(editedPlan.structuredPlan.approvalPolicy.required === true, 'Guards enforce approval remains required after edit');

    // -------------------------------------------------------------
    // [7/8] User Activation into Live Automation Engine
    // -------------------------------------------------------------
    console.log('\n[7/8] Activating Plan into Live Automation Engine...');
    const activation = await copilotAutomationService.activatePlan(testTenantA, plan.id);
    assert(activation.status === 'active', 'Activation returned active status');
    assert(Boolean(activation.automationId), 'Created live automation ID');

    // Verify row in automations table
    const liveAutomation = await db('automations').where({ id: activation.automationId }).first();
    assert(Boolean(liveAutomation), 'Live automation record exists in automations table');
    assert(liveAutomation.tenant_id === testTenantA, 'Live automation belongs to Tenant A');
    assert(liveAutomation.brand_id === testBrandA, 'Live automation belongs to Brand A');
    assert(liveAutomation.status === 'active', 'Live automation is active');
    assert(liveAutomation.trigger_type === 'datasource_change', 'Live automation has correct trigger_type');

    // Verify plan status in database
    const activatedPlan = await copilotAutomationService.getPlan(testTenantA, plan.id);
    assert(activatedPlan.status === 'activated', 'Plan status updated to "activated" in database');
    assert(activatedPlan.automationId === activation.automationId, 'Plan links to live automation ID');

    // -------------------------------------------------------------
    // [8/8] Cancellation, Multi-Tenant Boundaries & Production Guard
    // -------------------------------------------------------------
    console.log('\n[8/8] Verifying Plan Cancellation, Security Boundaries & Production Guard...');
    // Create second plan for cancellation test
    const plan2 = await copilotAutomationService.generateAutomationPlan(
      testTenantA,
      testBrandA,
      testUserA,
      { prompt: 'Whenever an announcement is posted, draft a Facebook post.', brandId: testBrandA }
    );
    assert(plan2.status === 'validated', 'Plan 2 created');

    const cancelledPlan = await copilotAutomationService.cancelPlan(testTenantA, plan2.id, 'User changed mind');
    assert(cancelledPlan.status === 'cancelled', 'Plan 2 status updated to cancelled');

    let activationErrorCaught = false;
    try {
      await copilotAutomationService.activatePlan(testTenantA, plan2.id);
    } catch {
      activationErrorCaught = true;
    }
    assert(activationErrorCaught, 'Cannot activate a cancelled plan');

    // Multi-tenant boundary checks
    const crossTenantPlan = await copilotAutomationService.getPlan(testTenantB, plan.id);
    assert(crossTenantPlan === null, 'Tenant B cannot read Tenant A copilot plan (returns null)');

    let crossTenantEditBlocked = false;
    try {
      await copilotAutomationService.editPlan(testTenantB, plan.id, { structuredPlan: { name: 'Hacked' } });
    } catch {
      crossTenantEditBlocked = true;
    }
    assert(crossTenantEditBlocked, 'Tenant B is blocked from editing Tenant A plan');

    let crossTenantActivateBlocked = false;
    try {
      await copilotAutomationService.activatePlan(testTenantB, plan.id);
    } catch {
      crossTenantActivateBlocked = true;
    }
    assert(crossTenantActivateBlocked, 'Tenant B is blocked from activating Tenant A plan');

    // Policy check rejects prohibited claims
    let policyRejectionCaught = false;
    try {
      const policyPlan = await copilotAutomationService.generateAutomationPlan(
        testTenantA,
        testBrandA,
        testUserA,
        { prompt: 'Create an automation for guaranteed profit and miracle cure products on Instagram.', brandId: testBrandA }
      );
      if (policyPlan.validationReport.issues.length > 0) {
        policyRejectionCaught = true;
      }
    } catch {
      policyRejectionCaught = true;
    }
    assert(policyRejectionCaught, 'Policy engine flags prohibited marketing claims');

    // Production Post Lock Invariant
    const prodPost = await db('post_variants').where({ remote_post_id: LOCKED_PROD_POST_ID }).first();
    assert(Boolean(prodPost), 'Production post variant exists');
    assert(prodPost.status === 'published', 'Production post variant status remains strictly published');

    console.log('\n================================================================================');
    console.log(`   STAGE 7 TEST SUITE COMPLETED: ${passedTests} passed, ${failedTests} failed`);
    console.log('================================================================================\n');
  } finally {
    // Cleanup test fixtures
    console.log('[Cleanup] Cleaning up test fixtures...');
    await db('copilot_automation_plans').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('automations').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('meta_connections').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('brands').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('tenant_users').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('users').whereIn('id', [testUserA, testUserB]).del();
    await db('tenants').whereIn('id', [testTenantA, testTenantB]).del();
    console.log('Cleanup completed successfully.');
    await db.destroy();
    console.log('Database connection closed.');
  }
}

runCopilotTests()
  .then(() => {
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Test suite failed:', err);
    try {
      await db.destroy();
    } catch {}
    process.exit(1);
  });
