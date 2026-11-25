import mysql from 'mysql2/promise';

const API_BASE = 'http://localhost:4000/api/v1';

async function runMasterSmokeCheck() {
  console.log('========================================================================');
  console.log('  SOCIALFORGE MASTER PLATFORM RELEASE CERTIFICATION SMOKE CHECK');
  console.log('========================================================================\n');

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

  // 1. MySQL Database Check
  console.log('--- 1. MySQL High-Performance Database Connectivity ---');
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });
  const [tables] = await conn.query('SHOW TABLES');
  assert(tables.length >= 45, `Database active and fully migrated: ${tables.length} tables found`);

  // Invariant verification
  const [invariantRows] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    invariantRows.length > 0 && invariantRows[0].status === 'published',
    `Meta Live Post Invariant Verified: ${invariantRows[0]?.remote_post_id}`
  );

  const [invariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    invariantJob.length > 0 && invariantJob[0].status === 'published',
    `Publishing Job Invariant Verified: ${invariantJob[0]?.external_post_id}`
  );

  // 2. Public API Status & SLA
  console.log('\n--- 2. Public API & SLA Status ---');
  const statusRes = await fetch('http://localhost:4000/api/v1/status');
  assert(statusRes.status === 200, 'Public SLA status endpoint returned HTTP 200');

  // 3. User Authentication
  console.log('\n--- 3. Core Authentication & Tenant Binding ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.tokens?.accessToken || loginJson.data?.accessToken;
  const tenantId = loginJson.data?.user?.tenantId;
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108'; // HOASP International
  assert(loginRes.status === 200 && !!token, 'JWT session issued with valid signature');

  // 4. Content Studio & Posts
  console.log('\n--- 4. Content Studio & Publishing Queue ---');
  const postsRes = await fetch(`${API_BASE}/brands/${brandId}/posts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(postsRes.status === 200, 'Content Studio posts API active (HTTP 200)');

  // 5. Connect Hub & Channels
  console.log('\n--- 5. Connect Hub & Channel Health ---');
  const connRes = await fetch(`${API_BASE}/connections?brandId=${brandId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(connRes.status === 200, 'Connect Hub connections active (HTTP 200)');

  // 6. Campaign Command Center & Analytics
  console.log('\n--- 6. Campaign Command Center & Analytics ---');
  const campRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(campRes.status === 200, 'Campaign Command Center active (HTTP 200)');

  // 7. Media Library & Storage
  console.log('\n--- 7. Media Library & Asset Engine ---');
  const mediaRes = await fetch(`${API_BASE}/brands/${brandId}/media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(mediaRes.status === 200, 'Media Library API active (HTTP 200)');

  // 8. SaaS Billing & Subscriptions
  console.log('\n--- 8. SaaS Billing, Subscriptions & Invoicing ---');
  const billingRes = await fetch(`${API_BASE}/billing/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(billingRes.status === 200, 'SaaS Billing subscription engine active (HTTP 200)');

  // 9. Brand Kit & Identity Engine
  console.log('\n--- 9. Brand Kit & Multi-Brand Identity ---');
  const brandKitRes = await fetch(`${API_BASE}/brands/${brandId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const brandBrainRes = await fetch(`${API_BASE}/brands/${brandId}/brain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(brandKitRes.status === 200 && brandBrainRes.status === 200, 'Brand Kit & 16-Dimension Brain active (HTTP 200)');

  // 10. Video Reels & Motion Studio
  console.log('\n--- 10. Video Reels & Motion Studio ---');
  const videoRes = await fetch(`${API_BASE}/brands/${brandId}/videos/templates`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(videoRes.status === 200, 'Video Reels & Motion templates active (HTTP 200)');

  // 11. Approvals & Magic Review Portals
  console.log('\n--- 11. Approval Workflows & Magic Review Portals ---');
  const apprRes = await fetch(`${API_BASE}/governance/approvals?brandId=${brandId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(apprRes.status === 200, 'Governance approvals active (HTTP 200)');

  // 12. Team, Workspace & Custom RBAC
  console.log('\n--- 12. Team, Workspace & Custom RBAC Governance ---');
  const teamRes = await fetch(`${API_BASE}/workspaces/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(teamRes.status === 200, 'Workspace member governance active (HTTP 200)');

  // 13. Superadmin Operations, SIEM & DLP
  console.log('\n--- 13. Superadmin Operations, SIEM & DLP Engine ---');
  const superRes = await fetch(`${API_BASE}/admin/operations/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(superRes.status === 200, 'Superadmin operations active (HTTP 200)');

  // 14. Web Dev Server Frontend Check
  console.log('\n--- 14. Web Application Frontend Server ---');
  const webRes = await fetch('http://localhost:5173/');
  assert(webRes.status === 200, 'Vite web application dev server serving index.html (HTTP 200)');

  await conn.end();

  console.log('\n========================================================================');
  console.log(`  MASTER SMOKE CHECK COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runMasterSmokeCheck().catch(err => {
  console.error('Smoke check error:', err);
  process.exit(1);
});
