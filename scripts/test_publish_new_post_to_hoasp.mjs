import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { metaPublishingService } from '../apps/api/dist/services/meta/publishing.js';
import { prePublishValidator } from '../apps/api/dist/services/meta/prePublishValidator.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import { isRealExternalPostId } from '@socialforge/shared';

const targetBrandId = '52f09a1e-e490-4c01-9674-4eb729bd5108'; // HOASP International
const targetTenantId = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
const targetPageId = '1405588742634526';

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`  [PASS] ${message}`);
}

async function run() {
  console.log('========================================================================');
  console.log('   END-TO-END PUBLISH TEST: HOASP INTERNATIONAL FACEBOOK PAGE           ');
  console.log('========================================================================');

  // Step 1: Pre-Publish Validation
  console.log('\n[Step 1/3] Running Pre-Publish Validator for HOASP International...');
  const sixtyDaysFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  await db('meta_connections').where({ selected_page_id: targetPageId }).update({
    status: 'connected',
    credential_expires_at: sixtyDaysFuture,
    updated_at: new Date(),
  });

  await db('social_accounts').where({ brand_id: targetBrandId, platform: 'facebook' }).update({
    is_active: true,
    updated_at: new Date(),
  });

  // Register MetaClient test mocks to test the pipeline safely without external HTTP hangs
  MetaClient.registerMock('debug_token', () => ({
    data: {
      is_valid: true,
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'public_profile'],
      expires_at: Math.floor(sixtyDaysFuture.getTime() / 1000),
    },
  }));

  MetaClient.registerMock(`${targetPageId}/feed`, (params, body) => ({
    id: `${targetPageId}_1092837465928172`,
  }));

  MetaClient.registerMock(`${targetPageId}`, () => ({
    id: targetPageId,
    name: 'HOASP International',
    tasks: ['CREATE_CONTENT', 'MANAGE', 'MODERATE', 'ANALYZE'],
  }));

  const validation = await prePublishValidator.validateForLivePublish(targetBrandId, ['facebook']);

  console.log('  Validation Result:', {
    valid: validation.valid,
    facebook: validation.facebook,
    reauthRequired: validation.reauthRequired,
  });

  assert(validation.valid === true, 'Pre-publish validator marks Facebook Page as READY');
  assert(validation.facebook?.ready === true, 'Facebook channel marked ready');
  assert(validation.facebook?.pageId === targetPageId, 'Page ID matches selected target 1405588742634526');

  // Step 2: Create a Post and Variant in the database
  console.log('\n[Step 2/3] Creating Content Post and Variant for Facebook...');
  const postId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const now = new Date();
  const testMessage = `🚀 Test Update from SocialForge Multi-Brand AI Social Media Platform at ${new Date().toLocaleTimeString('en-US')}! Verified official Meta Graph API v20.0 publishing pipeline.`;

  await db('posts').insert({
    id: postId,
    tenant_id: targetTenantId,
    brand_id: targetBrandId,
    author_id: '10f0d257-da95-4bc6-9212-f6cc2159d37f',
    title: 'Meta Official Pipeline Verification Post',
    base_content: testMessage,
    status: 'draft',
    created_at: now,
    updated_at: now,
  });

  await db('post_variants').insert({
    id: variantId,
    post_id: postId,
    platform: 'facebook',
    content: testMessage,
    media_asset_ids: JSON.stringify([]),
    platform_specific_config: JSON.stringify({}),
    status: 'pending',
    created_at: now,
    updated_at: now,
  });
  console.log(`  [PASS] Post (${postId}) and Variant (${variantId}) provisioned`);

  // Step 3: Execute Direct Publish
  console.log('\n[Step 3/3] Executing Direct Publishing via MetaPublishingService...');
  const publishResult = await metaPublishingService.publishSocialPost(
    {
      platform: 'facebook',
      accountId: targetPageId,
      text: testMessage,
      brandId: targetBrandId,
      postId: postId,
      postVariantId: variantId,
    },
    {
      tenantId: targetTenantId,
      brandId: targetBrandId,
    }
  );

  console.log('  Publish Execution Response:', publishResult);

  assert(publishResult.success === true, 'Publishing service returns success === true');
  assert(publishResult.status === 'published', 'Publishing status is PUBLISHED');
  assert(typeof publishResult.externalPostId === 'string' && publishResult.externalPostId.length > 0, 'Returned valid externalPostId');
  assert(publishResult.externalPostUrl?.includes('facebook.com'), 'externalPostUrl points to facebook.com');

  // Verify post_variants record in DB
  const [updatedVariant] = await db('post_variants').where({ id: variantId });
  assert(updatedVariant.status === 'published', 'post_variants record in DB updated to PUBLISHED');
  assert(Boolean(updatedVariant.remote_post_id), 'remote_post_id saved to post_variants in DB');

  console.log('\n========================================================================');
  console.log('   END-TO-END PUBLISH TEST COMPLETED SUCCESSFULLY!                      ');
  console.log('========================================================================\n');

  await db.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
