import assert from 'assert';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { EmailMarketingService } from '../apps/api/dist/services/emailMarketing/emailMarketing.service.js';

console.log('========================================================');
console.log('🧪 VERIFYING EMAIL PROVIDER CONNECTION REDESIGN');
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

  const brand = await db('brands').first();
  if (!brand) {
    console.error('No brands found in database.');
    process.exit(1);
  }

  const tenantId = brand.tenant_id;
  const brandId = brand.id;

  // Clean initial state for test
  await db('email_esp_configs').where({ brand_id: brandId }).del();

  // Test 1: Initial state is NOT_CONNECTED
  await test('Initial state correctly reports NOT_CONNECTED', async () => {
    const res = await EmailMarketingService.getEspConfig(tenantId, brandId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.connectionState, 'NOT_CONNECTED');
    assert.strictEqual(res.isLiveDelivery, false);
  });

  // Test 2: Connect provider (e.g. Amazon SES / SendGrid) with AES-256 encryption
  await test('Save provider credentials with AES-256-GCM encryption & DNS generation', async () => {
    const saved = await EmailMarketingService.saveEspConfig(tenantId, brandId, {
      provider: 'ses',
      region: 'us-east-1',
      domain: 'hoaspinternational.com',
      smtpUser: 'AKIAIOSFODNN7EXAMPLE',
      smtpPass: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      fromName: 'Hoasp International',
      fromEmail: 'newsletter@hoaspinternational.com',
      dailyQuota: 50000,
    });

    assert.strictEqual(saved.success, true);
    // Requirement #8: Never show Connected until real provider verification succeeds
    assert.strictEqual(saved.connectionState, 'ACTION_REQUIRED');
    assert.strictEqual(saved.config.provider, 'ses');
    assert.strictEqual(saved.config.domain, 'hoaspinternational.com');
    assert.strictEqual(saved.config.dailyQuota, 50000);
    assert.ok(saved.config.dnsRecords && saved.config.dnsRecords.length >= 3);

    // Verify secret is encrypted in database (should contain IV:Tag:Cipher format)
    const rawRow = await db('email_esp_configs').where({ brand_id: brandId }).first();
    assert.ok(rawRow.smtp_pass && rawRow.smtp_pass.includes(':'), 'Password must be stored encrypted');
    assert.notStrictEqual(rawRow.smtp_pass, 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'Password must never be plaintext');
  });

  // Test 3: Domain DNS Verification
  await test('Domain verification generates and persists SPF/DKIM/DMARC records', async () => {
    const dnsRes = await EmailMarketingService.verifyDomainDns(tenantId, brandId, 'hoaspinternational.com');
    assert.strictEqual(dnsRes.success, true);
    assert.strictEqual(dnsRes.domain, 'hoaspinternational.com');
    assert.strictEqual(dnsRes.domainStatus, 'VERIFIED');
    assert.ok(dnsRes.dnsRecords.some((r) => r.purpose.includes('SPF')));
    assert.ok(dnsRes.dnsRecords.some((r) => r.purpose.includes('DKIM')));
    assert.ok(dnsRes.dnsRecords.some((r) => r.purpose.includes('DMARC')));
  });

  // Test 4: Remember connection across future campaign sends
  await test('Campaign automatically uses connected provider without requesting credentials again', async () => {
    // Create subscriber
    const subEmail = `auto_reuse_${Date.now()}@hoaspinternational.com`;
    const sub = await EmailMarketingService.createSubscriber(tenantId, brandId, {
      email: subEmail,
      firstName: 'Target',
    });

    // Create and dispatch campaign
    const camp = await EmailMarketingService.createCampaign(tenantId, brandId, {
      name: 'Automated Provider Reuse Campaign',
      subject: 'Welcome to SocialForge',
      fromName: 'Hoasp International',
      fromEmail: 'newsletter@hoaspinternational.com',
      htmlContent: '<p>Hello {{firstName}}</p>',
    });

    const sendRes = await EmailMarketingService.sendCampaign(tenantId, brandId, camp.id, {
      targetSubscriberIds: [sub.id],
    });

    assert.strictEqual(sendRes.recipientCount, 1);
    // Verifies campaign used saved SES provider
    const delivery = await db('email_deliveries').where({ campaign_id: camp.id }).first();
    assert.ok(delivery, 'Delivery record created');
    assert.ok(delivery.esp_message_id, 'ESP Message ID generated using saved provider');

    // Clean up subscriber and campaign
    await db('email_deliveries').where({ campaign_id: camp.id }).del();
    await db('email_campaigns').where({ id: camp.id }).del();
    await db('email_subscribers').where({ id: sub.id }).del();
  });

  // Test 5: Disconnect provider cleanly resets brand to Sandbox
  await test('Disconnect provider cleanly resets workspace to Sandbox simulation', async () => {
    const disconnRes = await EmailMarketingService.disconnectEspConfig(tenantId, brandId);
    assert.strictEqual(disconnRes.success, true);

    const postDisconn = await EmailMarketingService.getEspConfig(tenantId, brandId);
    assert.strictEqual(postDisconn.connectionState, 'NOT_CONNECTED');
    assert.strictEqual(postDisconn.isLiveDelivery, false);
  });

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================\n');

  await db.destroy();
  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

