import assert from 'assert';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { EmailMarketingService } from '../apps/api/dist/services/emailMarketing/emailMarketing.service.js';
import { CrmService } from '../apps/api/dist/services/crm/crm.service.js';

console.log('========================================================');
console.log('🧪 VERIFYING OMNICHANNEL EMAIL MARKETING SUITE');
console.log('========================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  const testBrand = await db('brands').first();
  if (!testBrand) {
    console.error('No brands found in database.');
    process.exit(1);
  }

  const tenantId = testBrand.tenant_id;
  const brandId = testBrand.id;

  const testSubEmail = `email_sub_${Date.now()}@socialforge.io`;
  let createdSubId = null;
  let createdCampaignId = null;
  let deliveryId = null;

  // --- 1. SUBSCRIBER MANAGEMENT ---
  console.log('--- TRACK 1: Audience & Subscriber Management ---');

  await test('Create email subscriber with idempotency', async () => {
    const sub = await EmailMarketingService.createSubscriber(tenantId, brandId, {
      email: testSubEmail,
      firstName: 'Elena',
      lastName: 'Rostova',
      source: 'manual',
      tags: ['VIP', 'Newsletter'],
    });

    assert.ok(sub);
    assert.strictEqual(sub.email, testSubEmail);
    assert.strictEqual(sub.first_name, 'Elena');
    assert.strictEqual(sub.status, 'SUBSCRIBED');
    createdSubId = sub.id;

    // Idempotent upsert with name change
    const updatedSub = await EmailMarketingService.createSubscriber(tenantId, brandId, {
      email: testSubEmail,
      firstName: 'Elena Maria',
    });
    assert.strictEqual(updatedSub.first_name, 'Elena Maria');
  });

  await test('Bulk import subscribers with deduplication and normalization', async () => {
    const bulkList = [
      { email: `bulk_user_1_${Date.now()}@testcorp.com`, firstName: 'John', lastName: 'Doe' },
      { email: `bulk_user_2_${Date.now()}@testcorp.com`, firstName: 'Jane', lastName: 'Smith' },
      { email: `bulk_user_1_${Date.now()}@testcorp.com`, firstName: 'John Duplicate' }, // duplicate
    ];

    const bulkRes = await EmailMarketingService.bulkImportSubscribers(tenantId, brandId, bulkList);
    assert.ok(bulkRes);
    assert.strictEqual(bulkRes.imported, 2); // 2 unique entries
    assert.strictEqual(bulkRes.total, 3);

    // Clean up
    for (const b of bulkList) {
      await db('email_subscribers').where({ email: b.email }).del();
    }
  });

  await test('List subscribers with search filtering', async () => {
    const res = await EmailMarketingService.listSubscribers(tenantId, brandId, {
      search: testSubEmail,
      status: 'SUBSCRIBED',
    });

    assert.ok(res.subscribers.length >= 1);
    const found = res.subscribers.find((s) => s.email === testSubEmail);
    assert.ok(found);
    assert.strictEqual(found.fullName, 'Elena Maria Rostova');
  });

  await test('Sync CRM Contacts into Audience Subscribers', async () => {
    const crmContactEmail = `crm_email_${Date.now()}@socialforge.io`;
    const contact = await CrmService.createContact(tenantId, brandId, {
      firstName: 'Marcus',
      lastName: 'Aurelius',
      email: crmContactEmail,
      company: 'Stoic Digital',
      status: 'prospect',
    });

    const syncRes = await EmailMarketingService.syncFromCrmContacts(tenantId, brandId);
    assert.ok(syncRes);
    assert.ok(syncRes.synced >= 1);

    const syncedSub = await db('email_subscribers').where({ email: crmContactEmail }).first();
    assert.ok(syncedSub);
    assert.strictEqual(syncedSub.first_name, 'Marcus');
    assert.strictEqual(syncedSub.source, 'crm_sync');

    // Clean up temporary contact & subscriber
    await db('crm_contacts').where({ id: contact.id }).del();
    await db('email_subscribers').where({ id: syncedSub.id }).del();
  });

  // --- 2. TEMPLATE ENGINE & BLOCK COMPILER ---
  console.log('\n--- TRACK 2: Template Gallery & Responsive Block Compiler ---');

  await test('Seed & list default responsive email templates', async () => {
    const templates = await EmailMarketingService.listTemplates(tenantId, brandId);
    assert.ok(Array.isArray(templates));
    assert.ok(templates.length >= 2);

    const newsletter = templates.find((t) => t.category === 'newsletter');
    assert.ok(newsletter);
    assert.ok(newsletter.htmlContent.includes('{{brandName}}'));
    assert.ok(newsletter.htmlContent.includes('{{unsubscribeUrl}}'));
  });

  await test('Compile visual blocks JSON into responsive HTML email', async () => {
    const compiledHtml = EmailMarketingService.compileBlocksToHtml(
      [
        { id: '1', type: 'header', content: 'Brand Weekly Dispatch' },
        { id: '2', type: 'text', content: 'Here is your weekly summary of marketing velocity.' },
        { id: '3', type: 'button', content: 'View Strategy Deck', props: { url: 'https://brand.com/deck' } },
        { id: '4', type: 'divider' },
        { id: '5', type: 'social' },
      ],
      'SocialForge Brand',
      '#6366f1'
    );

    assert.ok(compiledHtml.includes('Brand Weekly Dispatch'));
    assert.ok(compiledHtml.includes('View Strategy Deck'));
    assert.ok(compiledHtml.includes('https://brand.com/deck'));
    assert.ok(compiledHtml.includes('#6366f1'));
    assert.ok(compiledHtml.includes('{{unsubscribeUrl}}'));
  });

  // --- 3. CAMPAIGN CREATION, SENDING & TELEMETRY ---
  console.log('\n--- TRACK 3: Campaign Lifecycle & ESP Broadcast Delivery ---');

  await test('Create draft broadcast campaign', async () => {
    const campaign = await EmailMarketingService.createCampaign(tenantId, brandId, {
      name: 'Q4 Product Showcase Newsletter',
      subject: 'Announcing Our New Product Line 🚀',
      previewText: 'Exclusive preview inside',
      fromName: 'Executive Team',
      fromEmail: 'updates@brand.com',
      htmlContent: '<h1>Hello {{firstName}}!</h1><p>Welcome to {{brandName}}.</p><a href="{{unsubscribeUrl}}">Unsubscribe</a>',
    });

    assert.ok(campaign);
    assert.strictEqual(campaign.name, 'Q4 Product Showcase Newsletter');
    assert.strictEqual(campaign.status, 'DRAFT');
    createdCampaignId = campaign.id;
  });

  await test('Dispatch campaign to active subscribers & record delivery', async () => {
    const sendResult = await EmailMarketingService.sendCampaign(tenantId, brandId, createdCampaignId);
    assert.ok(sendResult);
    assert.strictEqual(sendResult.campaignId, createdCampaignId);
    assert.ok(sendResult.deliveredCount >= 1);

    // Verify campaign status updated to SENT
    const campaign = await db('email_campaigns').where({ id: createdCampaignId }).first();
    assert.strictEqual(campaign.status, 'SENT');
    assert.ok(campaign.sent_at);

    // Verify delivery record was created
    const delivery = await db('email_deliveries')
      .where({ campaign_id: createdCampaignId, subscriber_id: createdSubId })
      .first();

    assert.ok(delivery);
    assert.strictEqual(delivery.status, 'DELIVERED');
    assert.ok(delivery.esp_message_id.startsWith('msg_'));
    deliveryId = delivery.id;
  });

  await test('Track email open and click telemetry', async () => {
    await EmailMarketingService.trackOpen(deliveryId);
    await EmailMarketingService.trackClick(deliveryId);

    const updatedDelivery = await db('email_deliveries').where({ id: deliveryId }).first();
    assert.strictEqual(updatedDelivery.status, 'CLICKED');
    assert.ok(updatedDelivery.opened_at);
    assert.ok(updatedDelivery.clicked_at);

    const updatedCampaign = await db('email_campaigns').where({ id: createdCampaignId }).first();
    assert.strictEqual(updatedCampaign.opened_count, 1);
    assert.strictEqual(updatedCampaign.clicked_count, 1);
  });

  // --- 4. MULTI-BRAND ISOLATION ---
  console.log('\n--- TRACK 4: Multi-Brand Email Marketing Isolation ---');

  await test('Cross-brand isolation prevents leak of subscribers and campaigns', async () => {
    const fakeBrandId = crypto.randomUUID();
    const otherSubscribers = await EmailMarketingService.listSubscribers(tenantId, fakeBrandId);
    assert.strictEqual(otherSubscribers.subscribers.length, 0);

    const otherCampaigns = await EmailMarketingService.listCampaigns(tenantId, fakeBrandId);
    assert.strictEqual(otherCampaigns.length, 0);
  });

  // Cleanup test artifacts
  if (createdCampaignId) await db('email_campaigns').where({ id: createdCampaignId }).del();
  if (createdSubId) await db('email_subscribers').where({ id: createdSubId }).del();

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================');

  await db.destroy();

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await db.destroy();
  process.exit(1);
});

