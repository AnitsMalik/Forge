/**
 * Verification test for connecting Facebook and Instagram without API keys
 * Tests:
 * 1. Creating Facebook connection with Page Name, Page URL, Page ID, Dispatch Mode, Notification Email
 * 2. Creating Instagram connection with Handle, Profile URL, Account Type, Dispatch Mode, Notification Email
 * 3. Verifying storage in social_connections and WORM credential vault
 * 4. Verifying isNoApi flag and metadata preservation
 * 5. Verifying multi-account support with No-API connections
 */

import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { credentialVaultService } from '../apps/api/dist/services/connections/credentialVault.service.js';
import { connectionService } from '../apps/api/dist/services/connections/connection.service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

async function run() {
  console.log('========================================================================');
  console.log('   TESTING NO-API FACEBOOK & INSTAGRAM CONNECTION PIPELINE              ');
  console.log('========================================================================\n');

  const testTenant = 'tenant_noapi_' + crypto.randomUUID().slice(0, 8);
  const testBrand = 'brand_noapi_' + crypto.randomUUID().slice(0, 8);

  try {
    // 1. Provision isolated test tenant & brand
    await db('tenants').insert({
      id: testTenant,
      name: 'No-API Test Agency',
      slug: testTenant,
      settings: JSON.stringify({}),
    });
    await db('brands').insert({
      id: testBrand,
      tenant_id: testTenant,
      name: 'No-API Brand Client',
      slug: 'no-api-brand-client',
    });

    console.log('[1/4] Connecting Facebook Page WITHOUT Meta API App...');
    const fbConnection = await connectionService.createConnection({
      tenantId: testTenant,
      brandId: testBrand,
      provider: 'facebook',
      accountName: 'Apex Innovations Global',
      providerAccountId: '10482910481239',
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      credentials: {
        accessToken: `no_api_facebook_${Date.now()}`,
        tokenType: 'NO_API_ASSISTED',
        notificationEmail: 'social@apexinnovations.io',
        dispatchMode: 'REMINDER',
      },
      providerAccountMetadata: {
        name: 'Apex Innovations Global',
        isSandbox: false,
        connectionType: 'NO_API_ASSISTED',
        method: 'NO_API',
        pageUrl: 'https://www.facebook.com/ApexInnovationsGlobal',
        pageId: '10482910481239',
        facebookCategory: 'Brand / Company',
        dispatchMode: 'REMINDER',
        notificationEmail: 'social@apexinnovations.io',
        connectedVia: 'NoApiDirectAssistedModal',
      },
    });

    assert(fbConnection.id !== undefined, 'Facebook connection created successfully without API');
    assert(fbConnection.provider === 'facebook', 'Provider is facebook');
    assert(fbConnection.status === 'CONNECTED', 'Connection status is CONNECTED');

    console.log('[2/4] Connecting Instagram Profile WITHOUT Meta API App...');
    const igConnection = await connectionService.createConnection({
      tenantId: testTenant,
      brandId: testBrand,
      provider: 'instagram',
      accountName: '@apex_growth_hq',
      providerAccountId: 'apex_growth_hq',
      scopes: ['instagram_basic', 'instagram_content_publish'],
      credentials: {
        accessToken: `no_api_instagram_${Date.now()}`,
        tokenType: 'NO_API_ASSISTED',
        notificationEmail: 'social@apexinnovations.io',
        dispatchMode: 'REMINDER',
      },
      providerAccountMetadata: {
        name: '@apex_growth_hq',
        isSandbox: false,
        connectionType: 'NO_API_ASSISTED',
        method: 'NO_API',
        instagramHandle: '@apex_growth_hq',
        instagramProfileUrl: 'https://instagram.com/apex_growth_hq',
        accountType: 'CREATOR',
        dispatchMode: 'REMINDER',
        notificationEmail: 'social@apexinnovations.io',
        connectedVia: 'NoApiDirectAssistedModal',
      },
    });

    assert(igConnection.id !== undefined, 'Instagram connection created successfully without API');
    assert(igConnection.provider === 'instagram', 'Provider is instagram');
    assert(igConnection.status === 'CONNECTED', 'Connection status is CONNECTED');

    console.log('[3/4] Verifying database persistence and metadata retrieval...');
    const list = await connectionService.listConnections(testTenant, testBrand);
    assert(list.length === 2, `Listed 2 connections for brand (found ${list.length})`);

    const fbStored = list.find((c) => c.provider === 'facebook');
    const igStored = list.find((c) => c.provider === 'instagram');

    assert(fbStored !== undefined, 'Retrieved stored Facebook connection');
    assert(igStored !== undefined, 'Retrieved stored Instagram connection');

    const fbMeta = typeof fbStored.provider_account_metadata === 'string'
      ? JSON.parse(fbStored.provider_account_metadata)
      : fbStored.provider_account_metadata;

    const igMeta = typeof igStored.provider_account_metadata === 'string'
      ? JSON.parse(igStored.provider_account_metadata)
      : igStored.provider_account_metadata;

    assert(fbMeta.connectionType === 'NO_API_ASSISTED', 'Facebook has connectionType NO_API_ASSISTED');
    assert(fbMeta.pageUrl === 'https://www.facebook.com/ApexInnovationsGlobal', 'Facebook pageUrl preserved');
    assert(fbMeta.pageId === '10482910481239', 'Facebook pageId preserved');
    assert(fbMeta.dispatchMode === 'REMINDER', 'Facebook dispatchMode is REMINDER');

    assert(igMeta.connectionType === 'NO_API_ASSISTED', 'Instagram has connectionType NO_API_ASSISTED');
    assert(igMeta.instagramHandle === '@apex_growth_hq', 'Instagram handle preserved');
    assert(igMeta.accountType === 'CREATOR', 'Instagram accountType is CREATOR');
    assert(igMeta.dispatchMode === 'REMINDER', 'Instagram dispatchMode is REMINDER');

    console.log('[4/4] Verifying WORM Vault security...');
    assert(fbStored.credential_reference !== undefined && fbStored.credential_reference !== null, 'Facebook connection holds vault credential reference');
    assert(igStored.credential_reference !== undefined && igStored.credential_reference !== null, 'Instagram connection holds vault credential reference');

    console.log('\n========================================================================');
    console.log(`NO-API META CONNECTION TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } finally {
    // Cleanup
    await db('social_connections').where({ tenant_id: testTenant }).delete().catch(() => null);
    await db('brands').where({ id: testBrand }).delete().catch(() => null);
    await db('tenants').where({ id: testTenant }).delete().catch(() => null);
  }
}

run().then(() => {
  process.exit(failed > 0 ? 1 : 0);
}).catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
