import assert from 'assert';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { SmsVoiceService } from '../apps/api/dist/services/smsVoice/smsVoice.service.js';
import { CrmService } from '../apps/api/dist/services/crm/crm.service.js';

console.log('========================================================');
console.log('🧪 VERIFYING A2P 10DLC SMS & AI VOICE CALLING SUITE');
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
  let createdCampaignId = null;

  // --- 1. A2P 10DLC SENDER & SEGMENT ENCODING ---
  console.log('--- TRACK 1: A2P 10DLC Sender & GSM-7 Compliance ---');

  await test('Retrieve or auto-provision 10DLC Brand Sender', async () => {
    const sender = await SmsVoiceService.getSenderStatus(tenantId, brandId);
    assert.ok(sender, 'Sender should exist');
    assert.ok(sender.phone_number);
    assert.strictEqual(sender.sender_type, '10DLC');
    assert.strictEqual(sender.a2p_registration_status, 'APPROVED');
  });

  await test('Validate GSM-7 segment calculator and opt-out keyword check', async () => {
    const shortBody = 'Flash sale is live! Shop now at https://socialforge.ai Reply STOP to cancel';
    const shortCalc = SmsVoiceService.calculateSegments(shortBody);
    assert.strictEqual(shortCalc.segments, 1);
    assert.strictEqual(shortCalc.hasOptOut, true);

    const longBody = 'A'.repeat(200);
    const longCalc = SmsVoiceService.calculateSegments(longBody);
    assert.strictEqual(longCalc.segments, 2);
    assert.strictEqual(longCalc.hasOptOut, false);
  });

  await test('Create SMS campaign with auto-enforced A2P opt-out footer', async () => {
    const campaign = await SmsVoiceService.createCampaign(tenantId, brandId, {
      name: `VIP SMS Drop ${Date.now()}`,
      body: 'Get 25% off all new arrivals today with code SOCIALVIP.',
    });

    assert.ok(campaign);
    assert.ok(campaign.body.includes('Reply STOP to cancel'), 'Opt-out keyword must be appended');
    assert.strictEqual(campaign.status, 'DRAFT');
    createdCampaignId = campaign.id;
  });

  // --- 2. CRM CONTACT BROADCAST & INBOUND SIMULATION ---
  console.log('\n--- TRACK 2: CRM Lead Broadcast & Inbound Processing ---');

  await test('Ensure test CRM Contact exists with valid phone number', async () => {
    const contact = await CrmService.createContact(tenantId, brandId, {
      firstName: 'Alexander',
      lastName: 'Vance',
      email: `alexander_${Date.now()}@example.com`,
      phone: testPhone,
      leadSource: 'sms_campaign',
      tags: ['SMS-Subscribed'],
    });

    assert.ok(contact);
    testContactId = contact.id;
  });

  await test('Dispatch SMS campaign to CRM contacts and verify delivery', async () => {
    const dispatchRes = await SmsVoiceService.dispatchCampaign(tenantId, brandId, createdCampaignId);
    assert.ok(dispatchRes);
    assert.ok(dispatchRes.dispatched >= 1);

    const updated = await db('sms_campaigns').where({ id: createdCampaignId }).first();
    assert.strictEqual(updated.status, 'COMPLETED');
    assert.ok(updated.sent_count >= 1);
  });

  await test('Send single outbound SMS message and verify carrier message SID', async () => {
    const msg = await SmsVoiceService.sendSms(tenantId, brandId, {
      to: testPhone,
      body: 'Your executive onboarding concierge is ready. Reply STOP to cancel',
      contactId: testContactId,
    });

    assert.ok(msg);
    assert.strictEqual(msg.status, 'SENT');
    assert.ok(msg.sid.startsWith('SM'));
  });

  await test('Receive inbound STOP message and verify automatic CRM contact opt-out tag', async () => {
    const inboundRes = await SmsVoiceService.receiveInboundSms(tenantId, brandId, {
      from: testPhone,
      body: 'STOP',
    });

    assert.ok(inboundRes);
    assert.strictEqual(inboundRes.isOptOut, true);

    // Verify contact in CRM received SMS-OptOut tag
    const contact = await db('crm_contacts').where({ id: testContactId }).first();
    const tags = typeof contact.tags === 'string' ? JSON.parse(contact.tags || '[]') : contact.tags || [];
    assert.ok(tags.includes('SMS-OptOut'), 'Contact must receive SMS-OptOut tag');
  });

  // --- 3. AUTONOMOUS AI VOICE CONCIERGE & APPOINTMENT BOOKING ---
  console.log('\n--- TRACK 3: Autonomous AI Voice Concierge & Calling ---');

  await test('Provision and verify AI Voice Agent configuration', async () => {
    const agent = await SmsVoiceService.getVoiceAgent(tenantId, brandId);
    assert.ok(agent);
    assert.strictEqual(agent.voice_persona, 'Nova - Warm Concierge');
    assert.ok(agent.is_active);
  });

  await test('Trigger AI Outbound Call, verify transcript and CRM deal pipeline conversion', async () => {
    const call = await SmsVoiceService.triggerVoiceCall(tenantId, brandId, {
      to: testPhone,
      contactId: testContactId,
      objective: 'Executive Demo Walkthrough',
    });

    assert.ok(call);
    assert.ok(call.call_sid.startsWith('CA'));
    assert.ok(call.duration_seconds >= 60);
    assert.strictEqual(call.outcome, 'APPOINTMENT_BOOKED');
    assert.ok(call.transcript.includes('Nova (AI)'));
    assert.ok(call.ai_summary.toLowerCase().includes('booked'));

    // Verify CRM pipeline deal was automatically created!
    const deal = await db('crm_deals')
      .where({ contact_id: testContactId })
      .orderBy('created_at', 'desc')
      .first();

    assert.ok(deal, 'Deal must be auto-created in CRM deal pipeline when appointment is booked');
    assert.ok(deal.title.includes('Demo Scheduled'));
    assert.strictEqual(Number(deal.value), 4800);
  });

  await test('List voice calls and verify complete audit trail', async () => {
    const calls = await SmsVoiceService.listVoiceCalls(tenantId, brandId);
    assert.ok(Array.isArray(calls));
    assert.ok(calls.length >= 1);
    assert.ok(calls.some((c) => c.outcome === 'APPOINTMENT_BOOKED'));
  });

  // --- 4. MULTI-TENANT ISOLATION ---
  console.log('\n--- TRACK 4: Multi-Tenant Data Isolation ---');

  await test('Enforce strict tenant boundary: foreign tenant cannot access SMS or Voice data', async () => {
    const foreignTenantId = crypto.randomUUID();
    const foreignBrandId = crypto.randomUUID();

    const foreignCampaigns = await SmsVoiceService.listCampaigns(foreignTenantId, foreignBrandId);
    assert.strictEqual(foreignCampaigns.length, 0);

    const foreignCalls = await SmsVoiceService.listVoiceCalls(foreignTenantId, foreignBrandId);
    assert.strictEqual(foreignCalls.length, 0);
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
