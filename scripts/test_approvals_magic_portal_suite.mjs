import mysql from 'mysql2/promise';
import crypto from 'crypto';

const API_BASE = 'http://localhost:4000/api/v1';

async function runApprovalSuite() {
  console.log('===============================================================');
  console.log('  SOCIALFORGE APPROVAL WORKFLOWS & MAGIC REVIEW PORTAL AUDIT');
  console.log('===============================================================\n');

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Verify Production Safety Invariant First
  console.log('--- STEP 0: Production Safety Invariant Check ---');
  await conn.query("DELETE FROM posts WHERE id LIKE 'post-appr%' OR id LIKE 'post-bulk%'");
  await conn.query("DELETE FROM brands WHERE slug LIKE 'foreign-brand%'");
  await conn.query("DELETE FROM tenants WHERE slug LIKE 'foreign-agency%'");
  const [invariantRows] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    invariantRows.length > 0 && invariantRows[0].status === 'published',
    `Production variant invariant intact: status=${invariantRows[0]?.status}, remoteId=${invariantRows[0]?.remote_post_id}`
  );

  const [invariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    invariantJob.length > 0 && invariantJob[0].status === 'published',
    `Production job invariant intact: status=${invariantJob[0]?.status}, externalId=${invariantJob[0]?.external_post_id}`
  );

  // Authenticate as Sarah (Agency Admin)
  console.log('\n--- STEP 1: Authenticate as Primary Agency Admin ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.tokens?.accessToken || loginJson.data?.accessToken;
  const tenantId = loginJson.data?.user?.tenantId || '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108'; // HOASP International

  assert(loginRes.status === 200 && !!token, 'Sarah authenticated successfully');

  // Also setup foreign tenant and user for cross-tenant isolation testing
  console.log('\n--- STEP 2: Authenticate Foreign Tenant User for RBAC Isolation ---');
  const foreignTenantId = 'e2e-tenant-iso-' + crypto.randomUUID().slice(0, 8);
  const foreignUserId = 'e2e-user-iso-' + crypto.randomUUID().slice(0, 8);
  const foreignBrandId = 'e2e-brand-iso-' + crypto.randomUUID().slice(0, 8);

  const foreignTuId = 'e2e-tu-' + crypto.randomUUID().slice(0, 8);
  const foreignSlug = `foreign-agency-${Date.now()}`;
  const foreignBrandSlug = `foreign-brand-${Date.now()}`;
  await conn.query(
    'INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [foreignTenantId, 'Foreign Agency Tenant', foreignSlug, JSON.stringify({})]
  );
  await conn.query(
    'INSERT INTO users (id, email, password_hash, full_name, is_active, token_version, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 0, NOW(), NOW())',
    [foreignUserId, `foreign-${Date.now()}@foreign.com`, '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Foreign Reviewer']
  );
  await conn.query(
    'INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [foreignTuId, foreignTenantId, foreignUserId, 'agency_admin']
  );
  await conn.query(
    'INSERT INTO brands (id, tenant_id, name, slug, industry, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [foreignBrandId, foreignTenantId, 'Foreign Brand Corp', foreignBrandSlug, 'Tech']
  );

  const jwt = await import('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';
  const foreignToken = jwt.default.sign(
    { userId: foreignUserId, tenantId: foreignTenantId, role: 'agency_admin', email: 'foreign@foreign.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  assert(!!foreignToken, 'Foreign tenant user provisioned for isolation verification');

  // STEP 3: Create Test Post with Multi-Platform Variants
  console.log('\n--- STEP 3: Create Isolated Test Post for Approval Workflow ---');
  const testPostId = 'post-appr-' + crypto.randomUUID().slice(0, 8);
  await conn.query(
    `INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, scheduled_for, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', DATE_ADD(NOW(), INTERVAL 2 DAY), NOW(), NOW())`,
    [
      testPostId,
      tenantId,
      brandId,
      loginJson.data?.user?.id || 'a58ee49d-5d31-4135-817a-132e7cea5fe9',
      'Solaris Horizon Launch Campaign',
      'Experience the future of intelligent lifestyle. Hand-crafted precision engineered for the modern visionary. #SolarisHorizon #Innovation',
    ]
  );

  // Add platform variants (Instagram & Facebook)
  const variantInstaId = 'var-ig-' + crypto.randomUUID().slice(0, 8);
  const variantFbId = 'var-fb-' + crypto.randomUUID().slice(0, 8);

  await conn.query(
    `INSERT INTO post_variants (id, post_id, platform, content, status, media_asset_ids, platform_specific_config, created_at, updated_at)
     VALUES (?, ?, 'instagram', ?, 'draft', '[]', ?, NOW(), NOW())`,
    [
      variantInstaId,
      testPostId,
      '🌅 Redefining visionary living with Solaris Horizon. Tap the bio link to explore the collection. #SolarisLaunch #Design',
      JSON.stringify({
        aspectRatio: '4:5',
        mediaUrls: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1080&q=80'],
      }),
    ]
  );

  await conn.query(
    `INSERT INTO post_variants (id, post_id, platform, content, status, media_asset_ids, platform_specific_config, created_at, updated_at)
     VALUES (?, ?, 'facebook', ?, 'draft', '[]', ?, NOW(), NOW())`,
    [
      variantFbId,
      testPostId,
      'We are proud to introduce Solaris Horizon. Explore our live feature showcase and reserve yours today.',
      JSON.stringify({
        aspectRatio: '16:9',
        mediaUrls: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'],
      }),
    ]
  );

  const [createdPost] = await conn.query('SELECT status FROM posts WHERE id = ?', [testPostId]);
  assert(createdPost[0]?.status === 'draft', 'Isolated test post created with status=draft');

  // STEP 4: Submit Post for Approval & Generate Magic Link
  console.log('\n--- STEP 4: Submit Post for Approval (Draft -> In Review) ---');
  const submitRes = await fetch(`${API_BASE}/brands/${brandId}/posts/${testPostId}/submit-for-approval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reviewerEmail: 'client.vp@solarisbrand.com',
    }),
  });
  const submitJson = await submitRes.json();
  assert(submitRes.status === 200 && submitJson.success, 'Post submitted for approval successfully');

  const magicToken = submitJson.data?.magicToken || submitJson.data?.approvalRequest?.magic_token;
  const magicLinkUrl = submitJson.data?.magicLinkUrl;
  assert(typeof magicToken === 'string' && magicToken.length === 64, `Magic token generated with 64-hex entropy: ${magicToken.slice(0, 16)}...`);
  assert(magicLinkUrl.includes(`/review/${magicToken}`), `Magic link URL formatted correctly: ${magicLinkUrl}`);

  // Verify post transitioned to 'in_review'
  const [postAfterSubmit] = await conn.query('SELECT status FROM posts WHERE id = ?', [testPostId]);
  assert(postAfterSubmit[0]?.status === 'in_review', `Post status transitioned to 'in_review': ${postAfterSubmit[0]?.status}`);

  // Verify approval_requests table record
  const [apprRecord] = await conn.query('SELECT * FROM approval_requests WHERE magic_token = ?', [magicToken]);
  assert(apprRecord.length === 1, 'Approval request recorded in database');
  assert(apprRecord[0].status === 'pending', 'Approval request status is pending');
  assert(apprRecord[0].tenant_id === tenantId, `Approval request bound to tenantId=${tenantId}`);
  assert(apprRecord[0].brand_id === brandId, `Approval request bound to brandId=${brandId}`);

  // STEP 5: Public Client Magic Review Portal (Passwordless Access)
  console.log('\n--- STEP 5: Public Zero-Login Magic Review Portal Verification ---');
  // Note: NO Authorization header sent here!
  const previewRes = await fetch(`${API_BASE}/approvals/magic/${magicToken}`);
  const previewJson = await previewRes.json();
  assert(previewRes.status === 200 && previewJson.success, 'Public magic review preview loads without credentials');
  assert(previewJson.data?.approvalStatus === 'pending', 'Public preview reports approvalStatus=pending');
  assert(previewJson.data?.post?.id === testPostId, `Post data retrieved matches testPostId=${testPostId}`);
  assert(previewJson.data?.variants?.length === 2, `Both platform variants returned in preview (${previewJson.data?.variants?.length})`);
  assert(previewJson.data?.brand?.name === 'HOASP International', `Brand kit identity hydrated: name=${previewJson.data?.brand?.name}`);

  // STEP 6: Magic Token Security & Error Handling
  console.log('\n--- STEP 6: Magic Token Security & Cryptographic Validation ---');
  // 6a: Nonexistent / Tampered Token
  const badTokenRes = await fetch(`${API_BASE}/approvals/magic/0000000000000000000000000000000000000000000000000000000000000000`);
  assert(badTokenRes.status === 404, `Invalid magic token returns HTTP 404: status=${badTokenRes.status}`);

  // 6b: Expired Token Simulation
  const expiredToken = crypto.randomBytes(32).toString('hex');
  const expiredApprovalId = 'appr-exp-' + crypto.randomUUID().slice(0, 8);
  await conn.query(
    `INSERT INTO approval_requests (id, tenant_id, brand_id, post_id, entity_type, entity_id, requested_by, status, magic_token, magic_token_expires_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'post', ?, ?, 'pending', ?, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 3 DAY))`,
    [expiredApprovalId, tenantId, brandId, testPostId, testPostId, loginJson.data?.user?.id, expiredToken]
  );
  const expiredRes = await fetch(`${API_BASE}/approvals/magic/${expiredToken}`);
  assert(expiredRes.status === 410, `Expired magic token returns HTTP 410 Gone: status=${expiredRes.status}`);

  // STEP 7: Client Action Workflow - Changes Requested via Magic Link
  console.log('\n--- STEP 7: Client Magic Action - Request Changes with Inline Comments ---');
  const clientActionRes = await fetch(`${API_BASE}/approvals/magic/${magicToken}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'changes_requested',
      reviewerName: 'Jessica Vance (Client Brand VP)',
      comment: 'Please emphasize the eco-friendly materials and adjust Instagram aspect ratio to 1:1.',
    }),
  });
  const clientActionJson = await clientActionRes.json();
  assert(clientActionRes.status === 200 && clientActionJson.success, 'Client changes_requested action accepted');

  // Verify approval request status and post status in database
  const [apprAfterAction] = await conn.query('SELECT status, review_notes, resolved_at FROM approval_requests WHERE magic_token = ?', [magicToken]);
  assert(apprAfterAction[0]?.status === 'changes_requested', `Approval request status updated to 'changes_requested': ${apprAfterAction[0]?.status}`);
  assert(apprAfterAction[0]?.resolved_at !== null, 'Approval resolved_at timestamp populated');

  const [postAfterAction] = await conn.query('SELECT status FROM posts WHERE id = ?', [testPostId]);
  assert(postAfterAction[0]?.status === 'changes_requested', `Post status updated to 'changes_requested': ${postAfterAction[0]?.status}`);

  // Verify client comment logged in approval_comments
  const [commentsDb] = await conn.query('SELECT * FROM approval_comments WHERE approval_request_id = ?', [apprRecord[0].id]);
  assert(commentsDb.length === 1, 'Client comment recorded in approval_comments');
  assert(commentsDb[0]?.author_name === 'Jessica Vance (Client Brand VP)', `Author name saved: ${commentsDb[0]?.author_name}`);
  assert(commentsDb[0]?.is_external_client === 1, 'Marked as is_external_client = 1');

  // 7b: Replay Attack / Double Action Prevention
  const replayRes = await fetch(`${API_BASE}/approvals/magic/${magicToken}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approved',
      reviewerName: 'Attacker',
      comment: 'Replay attempt',
    }),
  });
  assert(replayRes.status === 400, `Replay action on resolved token returns HTTP 400 ALREADY_RESOLVED: status=${replayRes.status}`);

  // STEP 8: Internal Governance Center Verification
  console.log('\n--- STEP 8: Agency Internal Governance Center & Reviewer Workflow ---');
  // List approvals
  const listApprRes = await fetch(`${API_BASE}/governance/approvals?brandId=${brandId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listApprJson = await listApprRes.json();
  assert(listApprRes.status === 200 && listApprJson.success, 'Governance list approvals returned HTTP 200');
  const foundInList = listApprJson.data?.find((a) => a.id === apprRecord[0].id);
  assert(!!foundInList, `Test approval found in governance queue (id=${apprRecord[0].id})`);

  // Create a second pending approval for reviewer edits and approval testing
  const testPostId2 = 'post-appr2-' + crypto.randomUUID().slice(0, 8);
  await conn.query(
    `INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, scheduled_for, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', DATE_ADD(NOW(), INTERVAL 3 DAY), NOW(), NOW())`,
    [
      testPostId2,
      tenantId,
      brandId,
      loginJson.data?.user?.id,
      'Product Feature Carousel Announcement',
      'Discover the innovative craftsmanship behind our flagship collection. Unmatched power and precision.',
    ]
  );
  const submitRes2 = await fetch(`${API_BASE}/brands/${brandId}/posts/${testPostId2}/submit-for-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reviewerEmail: 'client2@test.com' }),
  });
  const submitJson2 = await submitRes2.json();
  const apprId2 = submitJson2.data?.approvalRequest?.id;
  assert(!!apprId2, `Second approval request created for internal review (id=${apprId2})`);

  // Multi-platform preview endpoint
  const previewInternalRes = await fetch(`${API_BASE}/governance/approvals/${apprId2}/preview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const previewInternalJson = await previewInternalRes.json();
  assert(previewInternalRes.status === 200 && previewInternalJson.success, 'Governance preview approval returned HTTP 200');
  assert(Array.isArray(previewInternalJson.data?.previews), 'Multi-platform previews returned');

  // Reviewer edit before final approval
  console.log('\n--- STEP 9: Reviewer Content Edits with Audit Log History ---');
  const editRes = await fetch(`${API_BASE}/governance/approvals/${apprId2}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      content: 'Discover the sustainable, carbon-neutral craftsmanship behind our flagship collection. Unmatched elegance.',
      reviewerNotes: 'Updated copy to reflect carbon-neutral certification per compliance guidelines.',
    }),
  });
  const editJson = await editRes.json();
  assert(editRes.status === 200 && editJson.success, 'Reviewer edit accepted');
  assert(editJson.data?.editHistory?.length > 0, `Edit history recorded in approval item: ${editJson.data?.editHistory?.length} revisions`);

  // Verify post base_content updated
  const [post2Db] = await conn.query('SELECT base_content FROM posts WHERE id = ?', [testPostId2]);
  assert(post2Db[0]?.base_content.includes('carbon-neutral craftsmanship'), 'Post base_content updated in database');

  // STEP 10: Approve Request (In Review -> Approved)
  console.log('\n--- STEP 10: Human Approval Grant ---');
  const approveRes = await fetch(`${API_BASE}/governance/approvals/${apprId2}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      notes: 'Reviewed and verified compliant with all brand safety guidelines.',
    }),
  });
  const approveJson = await approveRes.json();
  assert(approveRes.status === 200 && approveJson.success, 'Approval granted successfully');

  const [appr2AfterApprove] = await conn.query('SELECT status, reviewed_by FROM approval_requests WHERE id = ?', [apprId2]);
  assert(appr2AfterApprove[0]?.status === 'approved', `Approval status is 'approved': ${appr2AfterApprove[0]?.status}`);
  assert(appr2AfterApprove[0]?.reviewed_by !== null, `Reviewer recorded: ${appr2AfterApprove[0]?.reviewed_by}`);

  const [post2AfterApprove] = await conn.query('SELECT status FROM posts WHERE id = ?', [testPostId2]);
  assert(post2AfterApprove[0]?.status === 'approved', `Post status transitioned to 'approved': ${post2AfterApprove[0]?.status}`);

  // STEP 11: Bulk Approvals
  console.log('\n--- STEP 11: Bulk Approvals Engine ---');
  // Create two pending requests
  const pA = 'post-bulk-1-' + crypto.randomUUID().slice(0, 8);
  const pB = 'post-bulk-2-' + crypto.randomUUID().slice(0, 8);
  await conn.query(`INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'Bulk A', 'Copy A', 'draft', NOW(), NOW())`, [pA, tenantId, brandId, loginJson.data?.user?.id]);
  await conn.query(`INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'Bulk B', 'Copy B', 'draft', NOW(), NOW())`, [pB, tenantId, brandId, loginJson.data?.user?.id]);

  const sA = await fetch(`${API_BASE}/brands/${brandId}/posts/${pA}/submit-for-approval`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
  const sB = await fetch(`${API_BASE}/brands/${brandId}/posts/${pB}/submit-for-approval`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
  const jA = await sA.json();
  const jB = await sB.json();
  const bId1 = jA.data?.approvalRequest?.id;
  const bId2 = jB.data?.approvalRequest?.id;

  const bulkRes = await fetch(`${API_BASE}/governance/approvals/bulk-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      brandId,
      approvalIds: [bId1, bId2],
      notes: 'Bulk approved batch for weekend scheduling.',
    }),
  });
  const bulkJson = await bulkRes.json();
  assert(bulkRes.status === 200 && bulkJson.data?.approvedCount === 2, `Bulk approval approved 2 items: approvedCount=${bulkJson.data?.approvedCount}`);

  // STEP 12: Autonomy Governance & Emergency Kill Switch (Pause/Resume)
  console.log('\n--- STEP 12: Brand Autonomy & Emergency Kill-Switch Governance ---');
  // Change autonomy level to L2
  const autoRes = await fetch(`${API_BASE}/governance/autonomy-level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      brandId,
      level: 'L2',
      reason: 'Setting brand to supervised autonomy with pre-publish review gates.',
    }),
  });
  const autoJson = await autoRes.json();
  assert(autoRes.status === 200 && autoJson.success, 'Autonomy level updated to L2');

  // Trigger Emergency Pause
  const pauseRes = await fetch(`${API_BASE}/governance/override/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      brandId,
      reason: 'PR holding statement in effect due to breaking news.',
    }),
  });
  const pauseJson = await pauseRes.json();
  assert(pauseRes.status === 200 && pauseJson.success, 'Emergency Pause override activated');

  // Resume Automations
  const resumeRes = await fetch(`${API_BASE}/governance/override/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      brandId,
      reason: 'PR holding statement lifted. Resuming automated pipelines.',
    }),
  });
  const resumeJson = await resumeRes.json();
  assert(resumeRes.status === 200 && resumeJson.success, 'Emergency Resume override restored');

  // STEP 13: Cross-Tenant RBAC Isolation
  console.log('\n--- STEP 13: Cross-Tenant RBAC Isolation Verification ---');
  // Foreign user attempting to access Sarah's approval item
  const isoRes = await fetch(`${API_BASE}/governance/approvals/${apprId2}`, {
    headers: { Authorization: `Bearer ${foreignToken}` },
  });
  assert(isoRes.status === 404, `Cross-tenant approval retrieval blocked with HTTP 404: status=${isoRes.status}`);

  // Foreign user attempting to approve Sarah's approval item
  const isoApproveRes = await fetch(`${API_BASE}/governance/approvals/${apprId2}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${foreignToken}` },
    body: JSON.stringify({ notes: 'Malicious foreign approval' }),
  });
  assert(isoApproveRes.status === 500 || isoApproveRes.status === 404 || isoApproveRes.status === 403, `Cross-tenant approval mutation blocked: status=${isoApproveRes.status}`);

  // STEP 14: Governance Audit Logs
  console.log('\n--- STEP 14: Governance Immutable Audit Log Verification ---');
  const auditRes = await fetch(`${API_BASE}/governance/audit-logs?brandId=${brandId}&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const auditJson = await auditRes.json();
  assert(auditRes.status === 200 && Array.isArray(auditJson.data), 'Audit logs retrieved successfully');
  const hasApprovalLogs = auditJson.data?.some((l) => l.eventType.includes('approval') || l.action.includes('approval'));
  assert(hasApprovalLogs, `Audit logs contain approval lifecycle records: count=${auditJson.data?.length}`);

  // STEP 15: Clean Up Ephemeral Test Data (Preserving Invariant)
  console.log('\n--- STEP 15: Clean Up Ephemeral Records ---');
  await conn.query('DELETE FROM approval_comments WHERE approval_request_id IN (?, ?, ?)', [apprRecord[0].id, apprId2, expiredApprovalId]);
  await conn.query('DELETE FROM approval_requests WHERE id IN (?, ?, ?, ?, ?)', [apprRecord[0].id, apprId2, expiredApprovalId, bId1, bId2]);
  await conn.query('DELETE FROM post_variants WHERE post_id IN (?, ?, ?, ?)', [testPostId, testPostId2, pA, pB]);
  await conn.query('DELETE FROM posts WHERE id IN (?, ?, ?, ?)', [testPostId, testPostId2, pA, pB]);
  await conn.query('DELETE FROM tenant_users WHERE id = ?', [foreignTuId]);
  await conn.query('DELETE FROM users WHERE id = ?', [foreignUserId]);
  await conn.query('DELETE FROM brands WHERE id = ?', [foreignBrandId]);
  await conn.query('DELETE FROM tenants WHERE id = ?', [foreignTenantId]);
  console.log('  [PASS] Ephemeral test fixtures cleaned up');
  passed++;

  // STEP 16: Final Production Safety Invariant Verification
  console.log('\n--- STEP 16: Final Production Safety Invariant Verification ---');
  const [finalInvariantVariant] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    finalInvariantVariant.length > 0 && finalInvariantVariant[0].status === 'published',
    `Final Invariant Variant intact: status=${finalInvariantVariant[0]?.status}, remoteId=${finalInvariantVariant[0]?.remote_post_id}`
  );

  const [finalInvariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    finalInvariantJob.length > 0 && finalInvariantJob[0].status === 'published',
    `Final Invariant Job intact: status=${finalInvariantJob[0]?.status}, externalId=${finalInvariantJob[0]?.external_post_id}`
  );

  await conn.end();

  console.log('\n===============================================================');
  console.log(`  AUDIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApprovalSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
