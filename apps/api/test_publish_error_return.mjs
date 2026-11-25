import { metaPublishingService } from './dist/services/meta/publishing.js';
import { db } from './dist/db/connection.js';

async function testPublishErrorReturn() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const targetPageId = '1405588742634526';

  console.log('Testing publishSocialPost structured error return...');

  const result = await metaPublishingService.publishSocialPost(
    {
      platform: 'facebook',
      accountId: targetPageId,
      text: 'Test verification post',
      brandId,
    },
    { brandId }
  );

  console.log('Result Success:', result.success);
  console.log('Result HTTP Status:', result.httpStatus);
  console.log('Result Meta Code:', result.metaCode);
  console.log('Result Meta Type:', result.metaType);
  console.log('Result Safe Message:', result.safeMessage);
  console.log('Result FBTrace ID:', result.fbtraceId);
  console.log('Raw Response:', JSON.stringify(result.rawResponse));

  await db.destroy();
}

testPublishErrorReturn().catch(console.error);
