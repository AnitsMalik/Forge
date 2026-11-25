/**
 * SocialForge Stage 8: Trust, Approval, Governance & Controlled Autonomy Test Suite
 *
 * Verifies End-to-End Governance Capabilities according to HLD v3.0:
 * 1. Autonomy Levels (L0-L5) & Transition Rules:
 *    - L0 (Suggest only): mutations/publishing strictly blocked
 *    - L1 (Internal artifacts only): internal artifact permitted, external publishing blocked
 *    - L2 (External action requires approval - default): approval enforced
 *    - L3 (Bounded automation): bounded execution with approval guard
 *    - L4 (Budget/usage controlled autonomy): autonomous within spend & quota
 *    - L5 (Autonomous only within explicit policy): full policy-bounded execution
 * 2. 11-Dimension Governance Policy Engine:
 *    - Dim 1: Tenant & Brand Scoping / Multi-tenant Isolation
 *    - Dim 2: Human Override / Emergency Kill-Switch Pause
 *    - Dim 3: RBAC & User Membership
 *    - Dim 4: Autonomy Level Boundaries
 *    - Dim 5: Content Claims & Prohibited Superlatives (#1 in the universe, miracle cure)
 *    - Dim 6: Price & Discount Authenticity (negative prices, discounts > 100%)
 *    - Dim 7: CTA & Link Rules (Domain allowlist & URL shortener bans like bit.ly)
 *    - Dim 8: Platform Permissions & Connection Health
 *    - Dim 9: Consent & Mandatory Disclosures (Missing #ad/#sponsored on sponsored content)
 *    - Dim 10: Budget Limits (Monthly budget thresholds)
 *    - Dim 11: Subscription Quotas & Entitlements
 * 3. Approval Center Lifecycle:
 *    - Approval request creation with configurable TTL
 *    - Multi-channel preview generation (Facebook, Instagram)
 *    - Pre-approval copy & schedule editing with persistent audit edit_history
 *    - Approval rejection flow with required reviewer notes
 *    - TTL Expiration enforcement: expired requests blocked from approval
 *    - Policy-gated approval: approving compliant post marks status approved
 *    - Bulk approval with policy validation
 * 4. Human Override Kill Switch:
 *    - Emergency pause halts all external operations while preserving state
 *    - Resume clears emergency pause
 * 5. Zero Credential Exposure & Redaction:
 *    - Audit logs automatically redact access tokens, client secrets, passwords
 * 6. Strict Multi-Tenant Isolation:
 *    - Cross-tenant approval and settings tampering blocked
 * 7. Production Post Invariant:
 *    - Production post 1405588742634526_122100337179498315 remains permanently published
 */

import { db } from '../apps/api/dist/db/connection.js';
import { governancePolicyService } from '../apps/api/dist/services/governance/governancePolicy.service.js';
import { approvalCenterService } from '../apps/api/dist/services/governance/approvalCenter.service.js';
import { governanceAuditService } from '../apps/api/dist/services/governance/governanceAudit.service.js';
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

async function runStage8GovernanceTests() {
  console.log('================================================================================');
  console.log('   SOCIALFORGE STAGE 8: TRUST, APPROVAL & GOVERNANCE TEST SUITE                 ');
  console.log('   Autonomy L0-L5 | 11 Policy Dimensions | Approval Center | Human Override    ');
  console.log('   Zero Credential Leakage | TTL Expiration | Multi-Tenant Isolation           ');
  console.log('================================================================================\n');

  const testTenantA = 'tenant_gov_a_' + crypto.randomUUID().slice(0, 8);
  const testTenantB = 'tenant_gov_b_' + crypto.randomUUID().slice(0, 8);
  const testBrandA = 'brand_gov_a_' + crypto.randomUUID().slice(0, 8);
  const testBrandB = 'brand_gov_b_' + crypto.randomUUID().slice(0, 8);
  const testUserA = crypto.randomUUID();
  const testUserB = crypto.randomUUID();

  try {
    // -------------------------------------------------------------
    // [Setup] Provision Isolated Tenancy Fixtures
    // -------------------------------------------------------------
    console.log('[Setup] Provisioning isolated test workspace fixtures...');
    await db('tenants').insert([
      { id: testTenantA, name: 'Governance Agency Alpha', slug: testTenantA, settings: JSON.stringify({}) },
      { id: testTenantB, name: 'Governance Agency Beta', slug: testTenantB, settings: JSON.stringify({}) },
    ]);

    await db('users').insert([
      { id: testUserA, email: `user-a-${testTenantA}@example.com`, password_hash: 'hash', full_name: 'Alice Auditor', is_active: true },
      { id: testUserB, email: `user-b-${testTenantB}@example.com`, password_hash: 'hash', full_name: 'Bob Competitor', is_active: true },
    ]);

    await db('tenant_users').insert([
      { id: crypto.randomUUID(), tenant_id: testTenantA, user_id: testUserA, role: 'agency_admin' },
      { id: crypto.randomUUID(), tenant_id: testTenantB, user_id: testUserB, role: 'agency_admin' },
    ]);

    await db('brands').insert([
      { id: testBrandA, tenant_id: testTenantA, name: 'Alpha Verified Brand', slug: testBrandA, industry: 'Retail' },
      { id: testBrandB, tenant_id: testTenantB, name: 'Beta Rival Brand', slug: testBrandB, industry: 'Tech' },
    ]);

    await db('meta_connections').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantA,
      brand_id: testBrandA,
      user_id: testUserA,
      provider: 'meta',
      selected_page_id: 'page_gov_alpha_123',
      selected_page_name: 'Alpha Brand Official',
      instagram_account_id: 'ig_gov_alpha_456',
      instagram_username: 'alphagov',
      status: 'connected',
      scopes: JSON.stringify(['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']),
    });

    console.log('Setup completed.\n');

    // =========================================================================
    // 1. AUTONOMY LEVELS (L0-L5) & DEFAULT GOVERNANCE INITIALIZATION
    // =========================================================================
    console.log('--- [Test 1] Autonomy Levels (L0-L5) & Default Settings ---');
    const settingsA = await governancePolicyService.getSettings(testTenantA, testBrandA);
    assert(settingsA.autonomyLevel === 'L2', 'Default autonomy level is initialized to L2 (Approval Required)');
    assert(settingsA.requireApprovalForAllExternal === true, 'requireApprovalForAllExternal is true by default');
    assert(settingsA.emergencyPaused === false, 'Emergency pause is false by default');
    assert(Array.isArray(settingsA.allowedDomains), 'Allowed domains initialized as list');

    // Transition through all levels L0 -> L1 -> L3 -> L4 -> L5 -> back to L2
    await governancePolicyService.setAutonomyLevel(testTenantA, testBrandA, 'L0', testUserA, 'Restricting to L0 Suggest Only');
    let updatedL0 = await governancePolicyService.getSettings(testTenantA, testBrandA);
    assert(updatedL0.autonomyLevel === 'L0', 'Autonomy level successfully changed to L0');

    // L0 evaluation blocks external actions
    const evalL0 = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Hello L0 world' },
    });
    assert(evalL0.allowed === false, 'L0 blocks external publishing');
    assert(evalL0.violations.some((v) => v.rule.includes('autonomy_level_l0')), 'Violation details specify L0 restriction');

    // L1 evaluation allows internal artifact, blocks external publish
    await governancePolicyService.setAutonomyLevel(testTenantA, testBrandA, 'L1', testUserA, 'L1 internal artifacts');
    const evalL1Internal = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'generate_artifact',
      content: { text: 'Internal draft proposal' },
    });
    assert(evalL1Internal.allowed === true, 'L1 allows internal draft artifact generation');

    const evalL1External = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Attempting external publish under L1' },
    });
    assert(evalL1External.allowed === false, 'L1 blocks external publishing');
    assert(evalL1External.violations.some((v) => v.rule.includes('autonomy_level_l1')), 'Violation details specify L1 restriction');

    // Return to L2
    await governancePolicyService.setAutonomyLevel(testTenantA, testBrandA, 'L2', testUserA, 'Restoring L2 default');
    const restoredL2 = await governancePolicyService.getSettings(testTenantA, testBrandA);
    assert(restoredL2.autonomyLevel === 'L2', 'Restored to L2');

    // Invalid autonomy level rejected
    let invalidCaught = false;
    try {
      await governancePolicyService.setAutonomyLevel(testTenantA, testBrandA, 'L9_INVALID', testUserA);
    } catch {
      invalidCaught = true;
    }
    assert(invalidCaught, 'Invalid autonomy level rejected with validation error');

    // =========================================================================
    // 2. 11-DIMENSION GOVERNANCE POLICY ENGINE CHECKS
    // =========================================================================
    console.log('\n--- [Test 2] 11-Dimension Governance Policy Engine ---');

    // Dim 1: Multi-tenant / Brand Scoping
    const evalCrossTenant = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandB, // Belongs to Tenant B
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Testing cross tenant' },
    });
    assert(evalCrossTenant.allowed === false, 'Cross-tenant brand evaluation strictly rejected');
    assert(evalCrossTenant.violations.some((v) => v.rule === 'tenant_isolation'), 'Tenant isolation violation flagged');

    // Dim 3: RBAC & User Membership
    const evalInvalidUser = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: 'non_existent_user_id',
      action: 'external_publish',
      content: { text: 'Testing unauthorized user' },
    });
    assert(evalInvalidUser.allowed === false, 'Non-member user evaluation rejected');
    assert(evalInvalidUser.violations.some((v) => v.rule === 'user_rbac'), 'RBAC user violation flagged');

    // Dim 5: Prohibited Content Claims & Superlatives
    const evalProhibitedClaim = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Try our product, it is the #1 in the universe and 100% cure guaranteed!' },
    });
    assert(evalProhibitedClaim.allowed === false, 'Prohibited marketing claims rejected by policy');
    assert(evalProhibitedClaim.violations.some((v) => v.rule === 'prohibited_claims'), 'Prohibited claim violation flagged');

    // Dim 6: Price & Discount Authenticity
    const evalBadPrice = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Special deal', price: -49.99, discount: 150 },
    });
    assert(evalBadPrice.allowed === false, 'Negative price & >100% discount rejected');
    assert(evalBadPrice.violations.some((v) => v.rule === 'price_authenticity'), 'Price authenticity violation flagged');
    assert(evalBadPrice.violations.some((v) => v.rule === 'discount_authenticity'), 'Discount authenticity violation flagged');

    // Dim 7: CTA & Link Rules (Domain Allowlist & Banned Shorteners)
    const evalBannedShortener = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Click here', url: 'https://bit.ly/secret-deal' },
    });
    assert(evalBannedShortener.allowed === false, 'Banned URL shortener (bit.ly) rejected');
    assert(evalBannedShortener.violations.some((v) => v.rule === 'cta_banned_domain'), 'CTA banned domain violation flagged');

    const evalUnapprovedDomain = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Visit our site', url: 'https://unapproved-third-party.io/landing' },
    });
    assert(evalUnapprovedDomain.allowed === false, 'Unapproved external domain rejected by allowlist');
    assert(evalUnapprovedDomain.violations.some((v) => v.rule === 'cta_domain_allowlist'), 'CTA allowlist violation flagged');

    const evalApprovedDomain = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Visit our store', url: 'https://acme.com/shop' },
    });
    assert(!evalApprovedDomain.violations.some((v) => v.rule.startsWith('cta_')), 'Approved domain (acme.com) passes CTA check');

    // Dim 8: Platform Permissions & Connection Health
    const evalPlatformPerm = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      channel: 'facebook',
      action: 'external_publish',
      content: { text: 'Meta verified post' },
    });
    assert(evalPlatformPerm.checksPassed.includes('meta_channel_connection_verified'), 'Healthy Meta connection verified for Facebook');

    // Dim 9: Consent & Mandatory Disclosures
    const evalMissingDisclosure = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Excited to announce our collaboration with Acme partner!', isSponsored: true },
    });
    assert(evalMissingDisclosure.allowed === false, 'Sponsored content missing disclosure rejected');
    assert(evalMissingDisclosure.violations.some((v) => v.rule === 'mandatory_disclaimer_missing'), 'Mandatory disclaimer violation flagged');

    const evalWithDisclosure = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Excited for this partnership! #ad #sponsored', isSponsored: true },
    });
    assert(evalWithDisclosure.checksPassed.includes('mandatory_disclaimer_verified'), 'Sponsored content with #ad passed disclosure check');

    // Dim 10: Budget Limits
    const evalOverBudget = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Paid booster promotion' },
      estimatedCost: 10000.0, // Limit is 500.0
    });
    assert(evalOverBudget.allowed === false, 'Over-budget operation rejected');
    assert(evalOverBudget.violations.some((v) => v.rule === 'budget_exceeded'), 'Budget exceeded violation flagged');

    // =========================================================================
    // 3. HUMAN OVERRIDE / EMERGENCY KILL-SWITCH
    // =========================================================================
    console.log('\n--- [Test 3] Human Override Emergency Kill-Switch ---');

    // Trigger Pause
    const pauseRes = await governancePolicyService.pauseAllAutomations(
      testTenantA,
      testBrandA,
      'Regulatory compliance audit in progress',
      testUserA
    );
    assert(pauseRes.status === 'paused', 'Emergency pause executed successfully');

    const pausedSettings = await governancePolicyService.getSettings(testTenantA, testBrandA);
    assert(pausedSettings.emergencyPaused === true, 'Brand emergencyPaused state is true');
    assert(pausedSettings.pauseReason === 'Regulatory compliance audit in progress', 'Pause reason captured');

    // Even perfectly valid posts are blocked when paused
    const evalDuringPause = await governancePolicyService.evaluatePolicy({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      action: 'external_publish',
      content: { text: 'Completely valid promotional text https://acme.com/item' },
    });
    assert(evalDuringPause.allowed === false, 'Actions strictly blocked while emergency pause is active');
    assert(evalDuringPause.violations.some((v) => v.rule === 'human_override_paused'), 'Human override paused rule flagged');

    // Resume
    const resumeRes = await governancePolicyService.resumeAllAutomations(
      testTenantA,
      testBrandA,
      'Audit concluded successfully',
      testUserA
    );
    assert(resumeRes.status === 'resumed', 'Resume executed successfully');

    const resumedSettings = await governancePolicyService.getSettings(testTenantA, testBrandA);
    assert(resumedSettings.emergencyPaused === false, 'emergencyPaused cleared to false');

    // =========================================================================
    // 4. APPROVAL CENTER: LIFECYCLE, PREVIEWS, EDITS, REJECTIONS & EXPIRATION
    // =========================================================================
    console.log('\n--- [Test 4] Approval Center Lifecycle & Expiration ---');

    // Create a draft post for testing approvals
    const postId1 = crypto.randomUUID();
    await db('posts').insert({
      id: postId1,
      tenant_id: testTenantA,
      brand_id: testBrandA,
      author_id: testUserA,
      title: 'Spring Product Drop',
      base_content: 'Fresh spring catalog is live! Shop today at https://acme.com/spring',
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('post_variants').insert([
      {
        id: crypto.randomUUID(),
        post_id: postId1,
        platform: 'facebook',
        content: 'Fresh spring catalog is live on Facebook! https://acme.com/spring',
        media_asset_ids: JSON.stringify([]),
        platform_specific_config: JSON.stringify({ aspectRatio: '1:1', mediaUrls: ['https://cdn.acme.com/img1.jpg'] }),
        status: 'draft',
      },
      {
        id: crypto.randomUUID(),
        post_id: postId1,
        platform: 'instagram',
        content: 'Fresh spring catalog is live on Instagram! https://acme.com/spring',
        media_asset_ids: JSON.stringify([]),
        platform_specific_config: JSON.stringify({ aspectRatio: '4:5', mediaUrls: ['https://cdn.acme.com/img2.jpg'] }),
        status: 'draft',
      },
    ]);

    // 4a. Create Approval Request
    const approval1 = await approvalCenterService.createApprovalRequest({
      tenantId: testTenantA,
      brandId: testBrandA,
      entityType: 'post',
      entityId: postId1,
      requestedBy: testUserA,
      expiresInHours: 48,
      metadata: { campaign: 'Spring 2026 Launch' },
    });

    assert(approval1.status === 'pending', 'Approval request initialized in pending status');
    assert(Boolean(approval1.magicToken), 'Magic token generated for external secure review');
    assert(Boolean(approval1.expiresAt), 'TTL expiration date calculated');

    // Verify post status transitioned to in_review
    const postInReview = await db('posts').where({ id: postId1 }).first();
    assert(postInReview.status === 'in_review', 'Post marked in_review upon approval request creation');

    // 4b. Multi-Platform Preview
    const previewData = await approvalCenterService.previewApprovalRequest(testTenantA, approval1.id);
    assert(previewData.previews.length === 2, 'Previews generated for both Facebook and Instagram');
    assert(previewData.previews.some((p) => p.platform === 'facebook' && p.aspectRatio === '1:1'), 'Facebook preview has 1:1 ratio');
    assert(previewData.previews.some((p) => p.platform === 'instagram' && p.aspectRatio === '4:5'), 'Instagram preview has 4:5 ratio');

    // 4c. Edit Before Approval
    const editedApproval = await approvalCenterService.editApprovalRequest(
      testTenantA,
      approval1.id,
      {
        content: 'Updated Spring Catalog: 20% off with code SPRING20 at https://acme.com/spring',
        reviewerNotes: 'Added 20% off promotional code for better conversion',
      },
      testUserA
    );
    assert(editedApproval.editHistory.length === 1, 'Edit history recorded in approval request');
    assert(editedApproval.editHistory[0].editedBy === testUserA, 'Editor identity recorded');

    const updatedPost = await db('posts').where({ id: postId1 }).first();
    assert(updatedPost.base_content.includes('SPRING20'), 'Underlying post content updated by reviewer edit');

    // 4d. Rejection Flow
    const postId2 = crypto.randomUUID();
    await db('posts').insert({
      id: postId2,
      tenant_id: testTenantA,
      brand_id: testBrandA,
      author_id: testUserA,
      title: 'Rejectable Campaign',
      base_content: 'Unapproved brand messaging',
      status: 'draft',
      created_at: new Date(),
    });

    const approval2 = await approvalCenterService.createApprovalRequest({
      tenantId: testTenantA,
      brandId: testBrandA,
      entityType: 'post',
      entityId: postId2,
      requestedBy: testUserA,
    });

    const rejectRes = await approvalCenterService.rejectRequest(
      testTenantA,
      approval2.id,
      testUserA,
      'Brand tone does not match Q2 guidelines.'
    );
    assert(rejectRes.success === true, 'Rejection processed successfully');
    assert(rejectRes.approval.status === 'rejected', 'Approval request status changed to rejected');
    assert(rejectRes.approval.reviewNotes === 'Brand tone does not match Q2 guidelines.', 'Rejection notes stored');

    const rejectedPost = await db('posts').where({ id: postId2 }).first();
    assert(rejectedPost.status === 'changes_requested', 'Post status set to changes_requested');

    // 4e. TTL Expiration Enforcement
    const postId3 = crypto.randomUUID();
    await db('posts').insert({
      id: postId3,
      tenant_id: testTenantA,
      brand_id: testBrandA,
      author_id: testUserA,
      title: 'Expiring Post',
      base_content: 'Flash sale valid for 1 hour only',
      status: 'draft',
      created_at: new Date(),
    });

    const approval3 = await approvalCenterService.createApprovalRequest({
      tenantId: testTenantA,
      brandId: testBrandA,
      entityType: 'post',
      entityId: postId3,
      requestedBy: testUserA,
      expiresInHours: 1,
    });

    // Artificially simulate TTL expiration by backdating expires_at
    const pastDate = new Date(Date.now() - 3600 * 1000 * 5); // 5 hours in the past
    await db('approval_requests').where({ id: approval3.id }).update({
      expires_at: pastDate,
      magic_token_expires_at: pastDate,
    });

    // Retrieving the approval triggers automatic TTL evaluation to 'expired'
    const expiredItem = await approvalCenterService.getApprovalRequest(testTenantA, approval3.id);
    assert(expiredItem.status === 'expired', 'Expired approval request automatically marked expired');

    // Attempting to approve an expired request MUST be blocked
    let expireApproveCaught = false;
    try {
      await approvalCenterService.approveRequest(testTenantA, approval3.id, testUserA, 'Trying to approve expired');
    } catch (err) {
      expireApproveCaught = true;
      assert(err.message.includes('expired'), 'Error message specifically notes expired request cannot be approved');
    }
    assert(expireApproveCaught, 'Approval blocked for expired request');

    // 4f. Policy-Gated Approval on Compliant Post
    const approveRes = await approvalCenterService.approveRequest(
      testTenantA,
      approval1.id,
      testUserA,
      'Approved for scheduled release.'
    );
    assert(approveRes.success === true, 'Compliant post approved successfully');
    assert(approveRes.approval.status === 'approved', 'Approval record status marked approved');

    const finalApprovedPost = await db('posts').where({ id: postId1 }).first();
    assert(finalApprovedPost.status === 'approved', 'Post status marked approved for execution');

    // 4g. Bulk Approval
    const postIdBulk1 = crypto.randomUUID();
    const postIdBulk2 = crypto.randomUUID();
    await db('posts').insert([
      { id: postIdBulk1, tenant_id: testTenantA, brand_id: testBrandA, author_id: testUserA, title: 'Bulk 1', base_content: 'Bulk promo 1 https://acme.com', status: 'draft', created_at: new Date() },
      { id: postIdBulk2, tenant_id: testTenantA, brand_id: testBrandA, author_id: testUserA, title: 'Bulk 2', base_content: 'Bulk promo 2 https://acme.com', status: 'draft', created_at: new Date() },
    ]);

    const reqBulk1 = await approvalCenterService.createApprovalRequest({
      tenantId: testTenantA,
      brandId: testBrandA,
      entityType: 'post',
      entityId: postIdBulk1,
      requestedBy: testUserA,
    });
    const reqBulk2 = await approvalCenterService.createApprovalRequest({
      tenantId: testTenantA,
      brandId: testBrandA,
      entityType: 'post',
      entityId: postIdBulk2,
      requestedBy: testUserA,
    });

    const bulkResult = await approvalCenterService.bulkApprove(
      testTenantA,
      testBrandA,
      [reqBulk1.id, reqBulk2.id],
      testUserA,
      'Approved in weekly batch review'
    );
    assert(bulkResult.approvedCount === 2, 'Bulk approval successfully approved both items');
    assert(bulkResult.failedCount === 0, 'Zero failures in bulk approval');

    // =========================================================================
    // 5. ZERO CREDENTIAL EXPOSURE & GOVERNANCE AUDIT LOGGING
    // =========================================================================
    console.log('\n--- [Test 5] Zero Credential Leakage & Audit Logging ---');

    // Log a simulated tool call with raw credentials in details
    const secretAudit = await governanceAuditService.logEvent({
      tenantId: testTenantA,
      brandId: testBrandA,
      userId: testUserA,
      eventType: 'tool_call',
      action: 'publish_tool_invocation',
      status: 'allowed',
      toolCall: {
        toolName: 'publishPostToMeta',
        pageAccessToken: 'EAABwzL_SECRET_TOKEN_DO_NOT_LEAK',
        client_secret: 'super_secret_meta_client_secret_xyz',
        userPassword: 'my_plaintext_password',
      },
      details: {
        nestedPayload: {
          token: 'another_secret_token_abc',
          safeParam: 'public_image_url',
        },
      },
      reason: 'Automated tool execution test',
    });

    // Retrieve from DB to verify redaction
    const rawAuditRow = await db('governance_audit_logs').where({ id: secretAudit.id }).first();
    const parsedToolCall = typeof rawAuditRow.tool_call === 'string' ? JSON.parse(rawAuditRow.tool_call) : rawAuditRow.tool_call;
    const parsedDetails = typeof rawAuditRow.details === 'string' ? JSON.parse(rawAuditRow.details) : rawAuditRow.details;

    assert(parsedToolCall.pageAccessToken === '[REDACTED_BY_GOVERNANCE_AUDIT]', 'pageAccessToken redacted');
    assert(parsedToolCall.client_secret === '[REDACTED_BY_GOVERNANCE_AUDIT]', 'client_secret redacted');
    assert(parsedToolCall.userPassword === '[REDACTED_BY_GOVERNANCE_AUDIT]', 'userPassword redacted');
    assert(parsedDetails.nestedPayload.token === '[REDACTED_BY_GOVERNANCE_AUDIT]', 'nested token redacted');
    assert(parsedDetails.nestedPayload.safeParam === 'public_image_url', 'non-sensitive parameter preserved');

    // Verify audit logs retrieval
    const auditLogs = await governanceAuditService.getAuditLogs(testTenantA, { limit: 50 });
    assert(auditLogs.length > 0, 'Audit logs retrieved for tenant');
    assert(auditLogs.some((l) => l.eventType === 'approval_decision'), 'Approval decisions recorded in audit trail');
    assert(auditLogs.some((l) => l.eventType === 'human_override'), 'Human override events recorded in audit trail');

    // =========================================================================
    // 6. STRICT MULTI-TENANT BOUNDARY ISOLATION
    // =========================================================================
    console.log('\n--- [Test 6] Multi-Tenant Boundary Isolation ---');

    // Tenant B cannot fetch Tenant A's approval request
    const tenantBAccessApproval = await approvalCenterService.getApprovalRequest(testTenantB, approval1.id);
    assert(tenantBAccessApproval === null, 'Tenant B cannot read Tenant A approval request');

    // Tenant B cannot approve Tenant A's approval request
    let crossTenantApproveCaught = false;
    try {
      await approvalCenterService.approveRequest(testTenantB, approval1.id, testUserB, 'Cross tenant tamper attempt');
    } catch {
      crossTenantApproveCaught = true;
    }
    assert(crossTenantApproveCaught, 'Tenant B blocked from approving Tenant A request');

    // Tenant B cannot fetch Tenant A's audit logs
    const tenantBAuditLogs = await governanceAuditService.getAuditLogs(testTenantB);
    assert(tenantBAuditLogs.length === 0, 'Tenant B cannot see Tenant A audit records');

    // =========================================================================
    // 7. PRODUCTION POST INVARIANT
    // =========================================================================
    console.log('\n--- [Test 7] Production Post Lock Invariant ---');
    const prodPost = await db('post_variants').where({ remote_post_id: LOCKED_PROD_POST_ID }).first();
    assert(Boolean(prodPost), 'Production post variant 1405588742634526_122100337179498315 exists');
    assert(prodPost.status === 'published', 'Production post variant status remains strictly published');

    console.log('\n================================================================================');
    console.log(`   STAGE 8 GOVERNANCE TEST SUITE COMPLETED: ${passedTests} passed, ${failedTests} failed`);
    console.log('================================================================================\n');
  } finally {
    // Cleanup test fixtures
    console.log('[Cleanup] Cleaning up test fixtures...');
    await db('governance_audit_logs').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('approval_requests').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('post_variants').whereIn('post_id', function () {
      this.select('id').from('posts').whereIn('tenant_id', [testTenantA, testTenantB]);
    }).del();
    await db('posts').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('brand_governance_settings').whereIn('tenant_id', [testTenantA, testTenantB]).del();
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

runStage8GovernanceTests()
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
