import { db } from '../apps/api/dist/db/connection.js';
import { metaSelfService } from '../apps/api/dist/services/connections/metaSelfService.service.js';
import { connectionService } from '../apps/api/dist/services/connections/connection.service.js';
import { credentialVaultService } from '../apps/api/dist/services/connections/credentialVault.service.js';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 CONNECT HUB MULTI-PAGE & DRAWER ARCHITECTURE TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Setup test tenant and multiple brands
  const tenantId = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
  const brand1 = await db('brands').where({ tenant_id: tenantId }).first();
  const brand2 = await db('brands').where({ tenant_id: tenantId }).whereNot({ id: brand1.id }).first();

  console.log(`[Test Setup] Tenant: ${tenantId}`);
  console.log(`[Test Setup] Brand 1: ${brand1?.name} (${brand1?.id})`);
  console.log(`[Test Setup] Brand 2: ${brand2?.name} (${brand2?.id})`);

  assert(brand1 && brand2, 'Tenant has at least two brands for agency multi-brand mapping test');

  // 2. Setup mock master Meta connection and discovered pages
  const masterConnId = 'conn_master_' + Date.now();
  const pageA_Id = 'page_biz_a_' + Date.now();
  const pageB_Id = 'page_biz_b_' + Date.now();
  const pageC_Id = 'page_biz_c_' + Date.now();
  const igAccA_Id = 'ig_acc_a_' + Date.now();

  const now = new Date();

  // Find a user for tenant
  const user = await db('users').first();

  // Insert master Facebook connection in meta_connections
  await db('meta_connections').insert({
    id: masterConnId,
    tenant_id: tenantId,
    brand_id: brand1.id,
    user_id: user?.id || 'mock_user_1',
    provider: 'meta',
    meta_user_id: 'meta_user_master_123',
    status: 'connected',
    created_at: now,
    updated_at: now,
  });

  // Insert master Facebook connection in social_connections in checking/connected state
  await db('social_connections').insert({
    id: masterConnId,
    tenant_id: tenantId,
    brand_id: brand1.id,
    provider: 'facebook',
    provider_account_id: 'meta_user_master_123',
    account_name: 'Agency Master Meta Account',
    status: 'CONNECTED',
    scopes: JSON.stringify(['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']),
    provider_account_metadata: JSON.stringify({ mode: 'master_account' }),
    created_at: now,
    updated_at: now,
  });

  // Insert 3 discovered Facebook Pages in meta_facebook_pages
  await db('meta_facebook_pages').insert([
    {
      id: 'mock_pg_rec_a_' + Date.now(),
      connection_id: masterConnId,
      page_id: pageA_Id,
      name: 'Alpha Retail Store Page',
      category: 'Retail & E-commerce',
      picture_url: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?w=200&q=80',
      tasks: JSON.stringify(['CREATE_CONTENT', 'MANAGE', 'MODERATE', 'ANALYZE']),
      encrypted_access_token: 'mock_page_token_valid',
      instagram_business_account_id: igAccA_Id,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'mock_pg_rec_b_' + Date.now(),
      connection_id: masterConnId,
      page_id: pageB_Id,
      name: 'Beta Global Tech Community',
      category: 'Software & Technology',
      picture_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&q=80',
      tasks: JSON.stringify(['CREATE_CONTENT', 'MANAGE', 'MODERATE']),
      encrypted_access_token: 'mock_page_token_valid',
      instagram_business_account_id: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'mock_pg_rec_c_' + Date.now(),
      connection_id: masterConnId,
      page_id: pageC_Id,
      name: 'Gamma Entertainment Live',
      category: 'Media & Entertainment',
      picture_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80',
      tasks: JSON.stringify(['CREATE_CONTENT', 'MANAGE']),
      encrypted_access_token: 'mock_page_token_valid',
      instagram_business_account_id: null,
      created_at: now,
      updated_at: now,
    },
  ]);

  // Insert linked Instagram account for Page A
  await db('meta_instagram_accounts').insert({
    id: 'mock_ig_rec_a_' + Date.now(),
    connection_id: masterConnId,
    page_id: pageA_Id,
    instagram_account_id: igAccA_Id,
    username: 'alpha_retail_official',
    name: 'Alpha Retail Store',
    profile_picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    followers_count: 34200,
    created_at: now,
    updated_at: now,
  });

  console.log('\n--- TEST 1: Retrieve Discovered Pages with Live Statuses ---');
  const discovered = await metaSelfService.getDiscoveredPagesForTenant(tenantId, masterConnId);
  assert(discovered.pages.length >= 3, `Retrieved ${discovered.pages.length} discovered pages`);
  const foundPageA = discovered.pages.find(p => p.id === pageA_Id);
  const foundPageB = discovered.pages.find(p => p.id === pageB_Id);
  assert(foundPageA && foundPageA.name === 'Alpha Retail Store Page', 'Page A present with correct name');
  assert(foundPageA.hasInstagram && foundPageA.instagramAccount !== null, 'Page A detects linked Instagram professional account');
  assert(foundPageB && foundPageB.name === 'Beta Global Tech Community', 'Page B present with correct name');

  console.log('\n--- TEST 2: Batch Connect Multiple Facebook Pages Mapped to Distinct Brands ---');
  // Map Page A -> Brand 1, Map Page B -> Brand 2
  const batchResult = await metaSelfService.selectMultiplePagesAndValidate({
    tenantId,
    connectionId: masterConnId,
    pageSelections: [
      {
        pageId: pageA_Id,
        brandId: brand1.id,
        instagramAccountId: foundPageA.instagramAccount.id,
      },
      {
        pageId: pageB_Id,
        brandId: brand2.id,
        instagramAccountId: null,
      },
    ],
  });

  console.log('batchResult:', JSON.stringify(batchResult, null, 2));

  assert(batchResult.success === true, 'Batch connection succeeded without errors');
  assert(batchResult.successful.length === 2, 'Exactly 2 page connections successfully created');

  const connPageA = batchResult.successful.find(s => s.pageId === pageA_Id);
  const connPageB = batchResult.successful.find(s => s.pageId === pageB_Id);

  assert(connPageA && connPageA.brandId === brand1.id, `Page A mapped to Brand 1 (${brand1.name})`);
  assert(connPageB && connPageB.brandId === brand2.id, `Page B mapped to Brand 2 (${brand2.name})`);
  assert(connPageA.connectionId !== connPageB.connectionId, 'Each Page connection receives an independent unique connectionId');

  // Verify DB social_connections rows
  const dbConnA = await db('social_connections').where({ id: connPageA.connectionId }).first();
  const dbConnB = await db('social_connections').where({ id: connPageB.connectionId }).first();

  assert(dbConnA && dbConnA.status === 'CONNECTED', 'Page A DB status is CONNECTED');
  assert(dbConnB && dbConnB.status === 'CONNECTED', 'Page B DB status is CONNECTED');
  assert(dbConnA.brand_id === brand1.id, 'Page A DB brand_id matches Brand 1');
  assert(dbConnB.brand_id === brand2.id, 'Page B DB brand_id matches Brand 2');

  // Verify social_accounts rows
  const fbAccountA = await db('social_accounts').where({ brand_id: brand1.id, platform: 'facebook', account_id: pageA_Id }).first();
  const fbAccountB = await db('social_accounts').where({ brand_id: brand2.id, platform: 'facebook', account_id: pageB_Id }).first();
  const igAccountA = await db('social_accounts').where({ brand_id: brand1.id, platform: 'instagram', account_id: igAccA_Id }).first();

  assert(fbAccountA && fbAccountA.account_name === 'Alpha Retail Store Page', 'Social account created for Page A on Brand 1');
  assert(fbAccountB && fbAccountB.account_name === 'Beta Global Tech Community', 'Social account created for Page B on Brand 2');
  assert(igAccountA && igAccountA.account_name === '@alpha_retail_official', 'Social account created for Instagram on Brand 1');

  // Verify Credential Vault encryption
  const credsA = await credentialVaultService.getCredentials(tenantId, dbConnA.credential_reference);
  const credsB = await credentialVaultService.getCredentials(tenantId, dbConnB.credential_reference);
  assert(credsA && credsA.accessToken === 'mock_page_token_valid', 'Page A has vaulted credentials');
  assert(credsB && credsB.accessToken === 'mock_page_token_valid', 'Page B has vaulted credentials');

  console.log('\n--- TEST 3: Verify Discovered Pages Status Updated with Brand Assignments ---');
  const updatedDiscovered = await metaSelfService.getDiscoveredPagesForTenant(tenantId, masterConnId);
  const updPageA = updatedDiscovered.pages.find(p => p.id === pageA_Id);
  const updPageB = updatedDiscovered.pages.find(p => p.id === pageB_Id);
  const updPageC = updatedDiscovered.pages.find(p => p.id === pageC_Id);

  assert(updPageA.connections.length === 1 && updPageA.connections[0].brandName === brand1.name, 'Page A reflects connected status to Brand 1');
  assert(updPageB.connections.length === 1 && updPageB.connections[0].brandName === brand2.name, 'Page B reflects connected status to Brand 2');
  assert(updPageC.connections.length === 0, 'Page C reflects Not Connected status');

  console.log('\n--- TEST 4: Connect Additional Page Later Without Re-authenticating ---');
  // Connect Page C to Brand 1 later
  const laterResult = await metaSelfService.selectMultiplePagesAndValidate({
    tenantId,
    connectionId: masterConnId,
    pageSelections: [
      {
        pageId: pageC_Id,
        brandId: brand1.id,
      },
    ],
  });

  assert(laterResult.success === true && laterResult.successful.length === 1, 'Successfully connected Page C later reusing master auth');
  const connPageC = laterResult.successful[0];
  assert(connPageC.brandId === brand1.id && connPageC.status === 'CONNECTED', 'Page C successfully connected to Brand 1');

  console.log('\n--- TEST 5: Independent Page Disconnection Isolation ---');
  // Disconnect Page A independently
  const disconnectRes = await connectionService.disconnectConnection(tenantId, connPageA.connectionId);
  assert(disconnectRes.status === 'DISCONNECTED', 'Page A successfully disconnected');

  const checkDbConnA = await db('social_connections').where({ id: connPageA.connectionId }).first();
  const checkDbConnB = await db('social_connections').where({ id: connPageB.connectionId }).first();
  const checkDbConnC = await db('social_connections').where({ id: connPageC.connectionId }).first();

  assert(checkDbConnA.status === 'DISCONNECTED', 'Page A is marked DISCONNECTED');
  assert(checkDbConnB.status === 'CONNECTED', 'Page B remains completely unaffected and active in CONNECTED state');
  assert(checkDbConnC.status === 'CONNECTED', 'Page C remains completely unaffected and active in CONNECTED state');

  console.log('\n--- TEST 6: Brand Ownership Validation & Security Enforcements ---');
  const fakeBrandResult = await metaSelfService.selectMultiplePagesAndValidate({
    tenantId,
    connectionId: masterConnId,
    pageSelections: [
      {
        pageId: pageA_Id,
        brandId: 'non-existent-brand-id',
      },
    ],
  });

  assert(fakeBrandResult.success === false, 'Batch failed gracefully when unauthorized or missing brandId is passed');
  assert(fakeBrandResult.errors.length === 1, 'Error recorded for unauthorized brandId');

  // Cleanup test rows
  await db('social_connections').whereIn('id', [masterConnId, connPageA.connectionId, connPageB.connectionId, connPageC.connectionId]).delete();
  await db('meta_connections').where({ id: masterConnId }).delete().catch(() => {});
  await db('social_accounts').whereIn('account_id', [pageA_Id, pageB_Id, pageC_Id]).delete();
  await db('meta_facebook_pages').whereIn('page_id', [pageA_Id, pageB_Id, pageC_Id]).delete();
  await db('meta_instagram_accounts').whereIn('page_id', [pageA_Id, pageB_Id, pageC_Id]).delete();

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
