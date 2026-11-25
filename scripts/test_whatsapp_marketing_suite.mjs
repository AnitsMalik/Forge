import assert from 'assert';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { WhatsAppService } from '../apps/api/dist/services/whatsapp/whatsapp.service.js';
import { CrmService } from '../apps/api/dist/services/crm/crm.service.js';

console.log('========================================================');
console.log('🧪 VERIFYING META WHATSAPP CLOUD API MARKETING SUITE');
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

  const testPhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;
  let testContactId = null;
  let customTemplateId = null;
  let createdCampaignId = null;

  // --- 1. WABA ACCOUNT CONNECTION & SEEDING ---
  console.log('--- TRACK 1: WABA Account Provisioning & Templates ---');

  await test('Connect or auto-provision WhatsApp Business Account (WABA)', async () => {
    const acc = await WhatsAppService.getAccountStatus(tenantId, brandId);
    assert.ok(acc, 'WABA account should exist');
    assert.ok(acc.waba_id, 'Should have waba_id');
    assert.strictEqual(acc.status, 'CONNECTED');
    assert.strictEqual(acc.quality_rating, 'GREEN');
  });

  await test('Verify automatic seeding of Meta approved default templates', async () => {
    const templates = await WhatsAppService.listTemplates(tenantId, brandId);
    assert.ok(Array.isArray(templates));
    assert.ok(templates.length >= 2, 'Should have at least 2 seeded default templates');
    const vip = templates.find((t) => t.name === 'vip_offer_broadcast');
    assert.ok(vip, 'vip_offer_broadcast template must be present');
    assert.strictEqual(vip.category, 'MARKETING');
    assert.strictEqual(vip.status, 'APPROVED');
  });

  await test('Create custom WhatsApp Marketing Template with CTA buttons', async () => {
    const custom = await WhatsAppService.createTemplate(tenantId, brandId, {
      name: `flash_drop_${Date.now()}`,
      category: 'MARKETING',
      language: 'en_US',
      headerType: 'TEXT',
      bodyText: 'Hey {{1}}! SocialForge Autumn Collection just dropped. Get 30% off before midnight!',
      footerText: 'Reply STOP to unsubscribe',
      buttons: [
        { type: 'URL', text: 'Shop Collection', url: 'https://socialforge.ai/drop' }
      ]
    });

    assert.ok(custom);
    assert.ok(custom.id);
    customTemplateId = custom.id;
    assert.strictEqual(custom.status, 'APPROVED');
  });

  // --- 2. CRM AUDIENCE INGESTION & BROADCAST DISPATCH ---
  console.log('\n--- TRACK 2: CRM Lead Ingestion & WhatsApp Broadcasts ---');

  await test('Ensure test CRM Contact with E.164 phone number exists', async () => {
    const contact = await CrmService.createContact(tenantId, brandId, {
      firstName: 'Sophia',
      lastName: 'Sterling',
      email: `sophia_${Date.now()}@example.com`,
      phone: testPhone,
      leadSource: 'whatsapp_campaign',
      tags: ['VIP', 'WhatsApp-OptIn'],
    });

    assert.ok(contact);
    assert.strictEqual(contact.phone, testPhone);
    testContactId = contact.id;
  });

  await test('Create and dispatch WhatsApp broadcast campaign to CRM contacts', async () => {
    const campaign = await WhatsAppService.createCampaign(tenantId, brandId, {
      name: `Black Friday Flash Broadcast ${Date.now()}`,
      templateId: customTemplateId,
    });

    assert.ok(campaign);
    assert.strictEqual(campaign.status, 'DRAFT');
    createdCampaignId = campaign.id;

    // Dispatch broadcast
    const dispatchResult = await WhatsAppService.dispatchCampaign(tenantId, brandId, createdCampaignId);
    assert.ok(dispatchResult);
    assert.ok(dispatchResult.dispatched >= 1, 'Should dispatch to at least 1 contact with phone number');

    const updated = await db('whatsapp_campaigns').where({ id: createdCampaignId }).first();
    assert.strictEqual(updated.status, 'COMPLETED');
    assert.ok(updated.sent_count >= 1);
  });

  // --- 3. 2-WAY CONVERSATIONAL CHAT & WEBHOOKS ---
  console.log('\n--- TRACK 3: 2-Way Messaging & Customer Inbound Webhooks ---');

  await test('Send direct outbound message via WhatsApp Cloud API', async () => {
    const sendRes = await WhatsAppService.sendMessage(tenantId, brandId, {
      to: testPhone,
      type: 'text',
      body: 'Your VIP personal shopping concierge is standing by to help!',
      contactId: testContactId,
    });

    assert.ok(sendRes);
    assert.strictEqual(sendRes.status, 'SENT');
    assert.ok(sendRes.wamId.startsWith('wamid.HBgL'));
  });

  await test('Simulate inbound customer reply webhook and verify CRM lead activity auto-log', async () => {
    const inboundReply = await WhatsAppService.receiveInboundReply(
      tenantId,
      brandId,
      testPhone,
      'I want to upgrade my tier to Platinum! Can someone call me?'
    );

    assert.ok(inboundReply);
    assert.strictEqual(inboundReply.direction, 'INBOUND');
    assert.strictEqual(inboundReply.contact_id, testContactId);

    // Verify CRM activity was recorded
    const crmActivity = await db('crm_activities')
      .where({ contact_id: testContactId, activity_type: 'SOCIAL_LEAD' })
      .orderBy('created_at', 'desc')
      .first();

    assert.ok(crmActivity, 'CRM activity should be recorded for inbound reply');
    assert.strictEqual(crmActivity.activity_type, 'SOCIAL_LEAD');
    assert.ok(crmActivity.description.includes('Customer replied on WhatsApp'));
  });

  await test('List active 2-way conversation threads and message history', async () => {
    const threads = await WhatsAppService.listConversations(tenantId, brandId);
    assert.ok(Array.isArray(threads));
    assert.ok(threads.length >= 1, 'Should have at least 1 conversation thread');

    const cleanTestPhone = testPhone.replace(/[^\d+]/g, '');
    const thread = threads.find((t) => t.phoneNumber === cleanTestPhone);
    assert.ok(thread, `Thread for ${cleanTestPhone} must exist`);
    assert.strictEqual(thread.contactName, 'Sophia Sterling');

    const messages = await WhatsAppService.getThreadMessages(tenantId, brandId, testPhone);
    assert.ok(Array.isArray(messages));
    assert.ok(messages.length >= 2, 'Should contain outbound broadcast/chat and inbound reply');
    const hasOutbound = messages.some((m) => m.direction === 'OUTBOUND');
    const hasInbound = messages.some((m) => m.direction === 'INBOUND');
    assert.ok(hasOutbound, 'Should have outbound messages');
    assert.ok(hasInbound, 'Should have inbound messages');
  });

  // --- 4. MULTI-TENANT ISOLATION ---
  console.log('\n--- TRACK 4: Multi-Tenant Data Isolation ---');

  await test('Enforce strict tenant boundary: foreign tenant cannot access WhatsApp data', async () => {
    const foreignTenantId = crypto.randomUUID();
    const foreignBrandId = crypto.randomUUID();

    const foreignCampaigns = await WhatsAppService.listCampaigns(foreignTenantId, foreignBrandId);
    assert.strictEqual(foreignCampaigns.length, 0, 'Foreign tenant must not see campaigns');

    const foreignThreads = await WhatsAppService.listConversations(foreignTenantId, foreignBrandId);
    assert.strictEqual(foreignThreads.length, 0, 'Foreign tenant must not see conversation threads');
  });

  console.log('\n========================================================');
  console.log(`RESULTS: ${passed}/${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('========================================================\n');

  process.exit(passed === total ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

