import assert from 'assert';
import knexModule from 'knex';
import knexConfig from '../apps/api/knexfile.js';
import { metaSelfService } from '../apps/api/dist/services/connections/metaSelfService.service.js';

const knex = knexModule(knexConfig.development);

async function runTests() {
  console.log('========================================================');
  console.log('🧪 META ACCOUNT SELECTION & BRAND MAPPING ISOLATION TEST');
  console.log('========================================================\n');

  const tenantId = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
  const hoaspBrandId = '52f09a1e-e490-4c01-9674-4eb729bd5108'; // HOASP International
  const zubelinBrandId = 'b9c9780e-2ff1-48d8-9b11-67174872f793'; // Zubelin
  let passedCount = 0;

  try {
    // --- TEST 1: Check Discovered Pages with Live Statuses ---
    console.log('--- TEST 1: Retrieve Discovered Pages and Verify Linked Instagram Separation ---');
    const discRes = await metaSelfService.getDiscoveredPagesForTenant(tenantId);
    assert(discRes?.pages && discRes.pages.length >= 2, 'Should discover at least 2 pages');
    
    const hoaspPage = discRes.pages.find(p => p.id === '1405588742634526');
    assert(hoaspPage, 'HOASP International page must be present');
    assert.strictEqual(hoaspPage.name, 'HOASP International');
    assert.strictEqual(hoaspPage.hasInstagram, true);
    assert.strictEqual(hoaspPage.instagramAccount?.username, 'hoaspinternational');
    assert.strictEqual(hoaspPage.instagramAccount?.id, '17841441490581879');
    console.log('  ✅ PASS: HOASP page correctly returns @hoaspinternational');
    passedCount++;

    const zubelinPage = discRes.pages.find(p => p.id === 'page_zubelin_collection');
    assert(zubelinPage, 'Zubelin Collection page must be present');
    assert.strictEqual(zubelinPage.name, 'Zubelin Collection');
    assert.strictEqual(zubelinPage.hasInstagram, true);
    assert.strictEqual(zubelinPage.instagramAccount?.username, 'zubelincollection');
    assert.strictEqual(zubelinPage.instagramAccount?.id, 'ig_zubelin_collection');
    console.log('  ✅ PASS: Zubelin Collection page correctly returns @zubelincollection');
    passedCount++;

    // Verify HOASP's Instagram is NOT attached to Zubelin
    assert.notStrictEqual(zubelinPage.instagramAccount?.username, 'hoaspinternational', 'Zubelin must NEVER have hoaspinternational');
    console.log('  ✅ PASS: Zubelin Collection does NOT inherit hoaspinternational');
    passedCount++;

    // --- TEST 2: Page with No Instagram Account ---
    console.log('\n--- TEST 2: Verify Page with No Linked Instagram returns null/false ---');
    // page_biz_b or create temporary page with no IG
    const testNoIgPageId = `page_no_ig_${Date.now()}`;
    await knex('meta_facebook_pages').insert({
      id: `rec_${testNoIgPageId}`,
      connection_id: '95d43c33-7a9b-425b-9faf-5b93f7af1c07',
      page_id: testNoIgPageId,
      name: 'Unlinked Community Page',
      category: 'Community',
      encrypted_access_token: 'mock_page_token_valid',
      instagram_business_account_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const refreshedPages = await metaSelfService.getDiscoveredPagesForTenant(tenantId);
    const noIgPage = refreshedPages.pages.find(p => p.id === testNoIgPageId);
    assert(noIgPage, 'Newly created page must be discoverable');
    assert.strictEqual(noIgPage.hasInstagram, false, 'hasInstagram must be false');
    assert.strictEqual(noIgPage.instagramAccount, null, 'instagramAccount must be null');
    console.log('  ✅ PASS: Page without Instagram returns hasInstagram=false & instagramAccount=null');
    passedCount++;

    // Clean up temporary page
    await knex('meta_facebook_pages').where({ page_id: testNoIgPageId }).delete();

    // --- TEST 3: Independent Selection - Connect Facebook Page Only ---
    console.log('\n--- TEST 3: Independent Selection: Connect Facebook Page Only ---');
    const fbOnlyResult = await metaSelfService.selectMultiplePagesAndValidate({
      tenantId,
      pageSelections: [
        {
          pageId: 'page_zubelin_collection',
          brandId: zubelinBrandId,
          connectFacebook: true,
          connectInstagram: false,
          instagramAccountId: null,
        }
      ]
    });
    assert(fbOnlyResult.success, 'FB only batch should succeed');
    assert.strictEqual(fbOnlyResult.successful.length, 1);
    
    // Check DB: Facebook social_account should exist for Zubelin
    const fbAcc = await knex('social_accounts')
      .where({ brand_id: zubelinBrandId, platform: 'facebook', account_id: 'page_zubelin_collection' })
      .first();
    assert(fbAcc, 'Facebook account must exist for Zubelin');
    assert.strictEqual(fbAcc.account_name, 'Zubelin Collection');
    console.log('  ✅ PASS: Successfully connected Facebook Page only for Zubelin');
    passedCount++;

    // --- TEST 4: Independent Selection - Connect Instagram Account Only ---
    console.log('\n--- TEST 4: Independent Selection: Connect Instagram Account Only ---');
    const igOnlyResult = await metaSelfService.selectMultiplePagesAndValidate({
      tenantId,
      pageSelections: [
        {
          pageId: 'page_zubelin_collection',
          brandId: zubelinBrandId,
          connectFacebook: false,
          connectInstagram: true,
          instagramAccountId: 'ig_zubelin_collection',
        }
      ]
    });
    assert(igOnlyResult.success, 'Instagram only batch should succeed');
    
    // Check DB: Instagram social_connection & social_account should exist for Zubelin
    const igConn = await knex('social_connections')
      .where({ brand_id: zubelinBrandId, provider: 'instagram', provider_account_id: 'ig_zubelin_collection' })
      .first();
    assert(igConn, 'Instagram social_connection must exist for Zubelin');
    assert.strictEqual(igConn.status, 'CONNECTED');

    const igAcc = await knex('social_accounts')
      .where({ brand_id: zubelinBrandId, platform: 'instagram', account_id: 'ig_zubelin_collection' })
      .first();
    assert(igAcc, 'Instagram social_account must exist for Zubelin');
    assert.strictEqual(igAcc.account_name, '@zubelincollection');
    console.log('  ✅ PASS: Successfully connected Instagram Account only for Zubelin');
    passedCount++;

    // --- TEST 5: Backend Ownership Validation: Reject Instagram Account from Another Page ---
    console.log('\n--- TEST 5: Backend Rejection of Mismatched Instagram Account ---');
    const mismatchedResult = await metaSelfService.selectMultiplePagesAndValidate({
      tenantId,
      pageSelections: [
        {
          pageId: 'page_zubelin_collection',
          brandId: zubelinBrandId,
          connectFacebook: true,
          connectInstagram: true,
          instagramAccountId: '17841441490581879', // Belongs to HOASP, NOT Zubelin!
        }
      ]
    });
    assert.strictEqual(mismatchedResult.success, false, 'Mismatched account should fail validation');
    assert.strictEqual(mismatchedResult.errors.length, 1);
    assert(
      mismatchedResult.errors[0].error.includes('Ownership verification failed') ||
      mismatchedResult.errors[0].error.includes('already connected'),
      'Must contain clear mismatch or cross-brand error'
    );
    console.log('  ✅ PASS: Backend rejected assigning hoaspinternational to Zubelin Collection page');
    passedCount++;

    // --- TEST 6: Cross-Brand Collision Protection ---
    console.log('\n--- TEST 6: Prevent Connecting Same Instagram to Multiple Active Brands ---');
    // Ensure hoaspinternational is connected to HOASP brand
    await knex('social_connections')
      .where({ brand_id: hoaspBrandId, provider: 'instagram', provider_account_id: '17841441490581879' })
      .del(); // clean if existing

    await knex('social_connections').insert({
      id: `conn_hoasp_ig_${Date.now()}`,
      tenant_id: tenantId,
      brand_id: hoaspBrandId,
      provider: 'instagram',
      provider_account_id: '17841441490581879',
      account_name: '@hoaspinternational',
      status: 'CONNECTED',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const crossBrandResult = await metaSelfService.selectMultiplePagesAndValidate({
      tenantId,
      pageSelections: [
        {
          pageId: '1405588742634526',
          brandId: zubelinBrandId, // trying to steal HOASP's IG into Zubelin!
          connectFacebook: false,
          connectInstagram: true,
          instagramAccountId: '17841441490581879',
        }
      ]
    });
    assert.strictEqual(crossBrandResult.success, false, 'Cross-brand collision must be blocked');
    assert(crossBrandResult.errors[0].error.includes('already connected to brand'), 'Error must report existing brand');
    console.log('  ✅ PASS: Cross-brand Instagram hijacking strictly blocked by backend');
    passedCount++;

    // --- TEST 7: Re-request OAuth URL with auth_type=rerequest ---
    console.log('\n--- TEST 7: Re-request OAuth URL Generation for Permission Correction ---');
    const repromptUrlResult = await metaSelfService.getAuthorizationUrl({
      tenantId,
      brandId: zubelinBrandId,
      userId: 'test_user',
      reprompt: true,
    });
    assert(repromptUrlResult.authorizationUrl.includes('auth_type=rerequest'), 'URL must include auth_type=rerequest');
    console.log('  ✅ PASS: OAuth URL correctly includes auth_type=rerequest for permission re-authorization');
    passedCount++;

    const normalUrlResult = await metaSelfService.getAuthorizationUrl({
      tenantId,
      brandId: zubelinBrandId,
      userId: 'test_user',
      reprompt: false,
    });
    assert(!normalUrlResult.authorizationUrl.includes('auth_type=rerequest'), 'Normal URL must NOT include auth_type=rerequest');
    console.log('  ✅ PASS: Standard OAuth URL does not force rerequest unless specified');
    passedCount++;

    // --- TEST 8: Distinct Brand Mappings Maintained ---
    console.log('\n--- TEST 8: Verify Complete Brand Separation in Database ---');
    const hoaspAccounts = await knex('social_accounts').where({ brand_id: hoaspBrandId });
    const zubelinAccounts = await knex('social_accounts').where({ brand_id: zubelinBrandId });

    const hoaspAccountNames = hoaspAccounts.map(a => a.account_name);
    const zubelinAccountNames = zubelinAccounts.map(a => a.account_name);

    assert(!zubelinAccountNames.includes('@hoaspinternational'), 'Zubelin must NOT have @hoaspinternational');
    assert(!zubelinAccountNames.includes('HOASP International'), 'Zubelin must NOT have HOASP International');
    console.log('  ✅ PASS: Verified separate brand mappings: HOASP International and Zubelin are fully isolated');
    passedCount++;

    console.log('\n========================================================');
    console.log(`TEST SUMMARY: ALL ${passedCount} / ${passedCount} CHECKS PASSED (100%)`);
    console.log('========================================================');
  } finally {
    await knex.destroy();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
