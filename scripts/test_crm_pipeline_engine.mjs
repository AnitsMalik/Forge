import assert from 'assert';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { CrmService } from '../apps/api/dist/services/crm/crm.service.js';
import { hubspotConnector } from '../apps/api/dist/connectors/hubspot/HubSpotConnector.js';

console.log('========================================================');
console.log('🧪 VERIFYING NATIVE CRM & LEAD PIPELINE ENGINE');
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

  // Find or create test brand
  let testBrand = await db('brands').first();
  if (!testBrand) {
    console.error('No brands found in database to run CRM tests.');
    process.exit(1);
  }

  const tenantId = testBrand.tenant_id;
  const brandId = testBrand.id;

  const testContactEmail = `crm_test_${Date.now()}@socialforge.io`;
  let createdContactId = null;
  let createdDealId = null;
  let pipelineData = null;

  // --- 1. CONTACT CREATION & AUTO-ACTIVITY LOGGING ---
  console.log('--- TRACK 1: Contact Lifecycle & Activity Logging ---');

  await test('Create contact with initial activity creation', async () => {
    const contact = await CrmService.createContact(
      tenantId,
      brandId,
      {
        firstName: 'Sarah',
        lastName: 'Connor',
        email: testContactEmail,
        phone: '+1 555-0144',
        company: 'Cyberdyne Systems',
        jobTitle: 'VP of Marketing',
        status: 'lead',
        leadSource: 'facebook',
        tags: ['HighValue', 'SocialLead'],
      },
      'test_agent@socialforge.io'
    );

    assert.ok(contact);
    assert.strictEqual(contact.first_name, 'Sarah');
    assert.strictEqual(contact.email, testContactEmail);
    assert.strictEqual(contact.fullName, 'Sarah Connor');
    createdContactId = contact.id;

    // Verify activity was created
    const activities = await db('crm_activities').where({ contact_id: contact.id });
    assert.ok(activities.length >= 1);
    assert.strictEqual(activities[0].activity_type, 'NOTE');
  });

  await test('List and search contacts with filtering', async () => {
    const searchRes = await CrmService.listContacts(tenantId, brandId, {
      search: 'Cyberdyne',
      status: 'lead',
    });

    assert.ok(searchRes.contacts.length >= 1);
    const found = searchRes.contacts.find((c) => c.id === createdContactId);
    assert.ok(found);
    assert.strictEqual(found.company, 'Cyberdyne Systems');
  });

  await test('Update contact details', async () => {
    const updated = await CrmService.updateContact(tenantId, brandId, createdContactId, {
      status: 'prospect',
      jobTitle: 'Chief Marketing Officer',
    });

    assert.ok(updated);
    assert.strictEqual(updated.status, 'prospect');
    assert.strictEqual(updated.job_title, 'Chief Marketing Officer');
  });

  // --- 2. PIPELINE & STAGES CREATION ---
  console.log('\n--- TRACK 2: Sales Pipeline & Standard Stages ---');

  await test('Get or auto-create default pipeline and 6 standard stages', async () => {
    pipelineData = await CrmService.getPipelineBoard(tenantId, brandId);
    assert.ok(pipelineData);
    assert.ok(pipelineData.pipeline.id);
    assert.ok(Array.isArray(pipelineData.stages));
    assert.ok(pipelineData.stages.length >= 6);

    const stageNames = pipelineData.stages.map((s) => s.name);
    assert.ok(stageNames.includes('New Inbound Lead'));
    assert.ok(stageNames.includes('Closed Won'));
    assert.ok(stageNames.includes('Closed Lost'));
  });

  // --- 3. DEAL LIFECYCLE & KANBAN TRANSITIONS ---
  console.log('\n--- TRACK 3: Deal Lifecycle & Kanban Transitions ---');

  await test('Create opportunity deal attached to contact and initial stage', async () => {
    const firstStage = pipelineData.stages[0];
    const deal = await CrmService.createDeal(
      tenantId,
      brandId,
      {
        title: 'Q4 Enterprise Social Automation Retainer',
        value: 12500.0,
        currency: 'USD',
        stageId: firstStage.id,
        contactId: createdContactId,
        notes: 'Requested custom multi-channel arc with human-in-the-loop approvals.',
      },
      'sales_lead@socialforge.io'
    );

    assert.ok(deal);
    assert.strictEqual(deal.title, 'Q4 Enterprise Social Automation Retainer');
    assert.strictEqual(Number(deal.value), 12500);
    createdDealId = deal.id;

    // Verify in pipeline board
    const board = await CrmService.getPipelineBoard(tenantId, brandId);
    const stageWithDeal = board.stages.find((s) => s.id === firstStage.id);
    assert.ok(stageWithDeal);
    const foundDeal = stageWithDeal.deals.find((d) => d.id === createdDealId);
    assert.ok(foundDeal);
    assert.strictEqual(foundDeal.contact.fullName, 'Sarah Connor');
  });

  await test('Move deal stage to Closed Won with status update & activity audit', async () => {
    const wonStage = pipelineData.stages.find((s) => s.name === 'Closed Won');
    assert.ok(wonStage);

    const moved = await CrmService.moveDealStage(tenantId, brandId, createdDealId, wonStage.id, 'closer@socialforge.io');
    assert.ok(moved);
    assert.strictEqual(moved.status, 'WON');
    assert.strictEqual(moved.newStageId, wonStage.id);

    // Verify activity transition recorded
    const transitionActivity = await db('crm_activities')
      .where({ deal_id: createdDealId, activity_type: 'TASK' })
      .first();
    assert.ok(transitionActivity);
    assert.ok(transitionActivity.description.includes('Closed Won'));
  });

  // --- 4. MARKETING OBJECTS SYNC BRIDGE ---
  console.log('\n--- TRACK 4: Marketing Object Ingestion Bridge ---');

  await test('Sync marketing objects with object_type=lead into CRM contacts', async () => {
    // Insert a dummy lead marketing object to test ingestion bridge
    const objId = crypto.randomUUID();
    const testSyncEmail = `lead_sync_${Date.now()}@acme.com`;
    await db('marketing_objects').insert({
      id: objId,
      tenant_id: tenantId,
      brand_id: brandId,
      object_type: 'lead',
      source: 'google_sheets',
      title: 'Inbound Lead from Google Sheet',
      properties: JSON.stringify({ raw: true }),
      external_id: `sheet_row_${Date.now()}`,
      normalized_data: JSON.stringify({
        firstName: 'John',
        lastName: 'Smith',
        email: testSyncEmail,
        company: 'Smith Industries',
        phone: '+1 555-9876',
      }),
      created_at: new Date(),
      updated_at: new Date(),
    });

    const syncRes = await CrmService.syncMarketingObjectsToLeads(tenantId, brandId);
    assert.ok(syncRes);
    assert.ok(syncRes.syncedCount >= 1);

    // Verify contact exists in CRM
    const syncedContact = await db('crm_contacts').where({ email: testSyncEmail }).first();
    assert.ok(syncedContact);
    assert.strictEqual(syncedContact.first_name, 'John');
    assert.strictEqual(syncedContact.lead_source, 'sheets_import');

    // Clean up dummy marketing object and contact
    await db('marketing_objects').where({ id: objId }).del();
    await db('crm_contacts').where({ id: syncedContact.id }).del();
  });

  // --- 5. TENANT & BRAND ISOLATION ---
  console.log('\n--- TRACK 5: Strict Multi-Brand CRM Isolation ---');

  await test('Cross-brand isolation prevents leak of contacts and deals', async () => {
    const fakeBrandId = crypto.randomUUID();
    const crossBrandContacts = await CrmService.listContacts(tenantId, fakeBrandId);
    assert.strictEqual(crossBrandContacts.contacts.length, 0);

    const crossBrandContact = await CrmService.getContact(tenantId, fakeBrandId, createdContactId);
    assert.strictEqual(crossBrandContact, null);
  });

  // --- 6. HUBSPOT CRM CONNECTOR DISCOVERY ---
  console.log('\n--- TRACK 6: HubSpot CRM Connector Discovery ---');

  await test('HubSpot connector discovers contact stream and deal pipeline resources', async () => {
    const dummyConnId = crypto.randomUUID();
    const resources = await hubspotConnector.discoverResources({
      tenantId,
      brandId,
      connectionId: dummyConnId,
      credentials: { isSandbox: true },
    });

    assert.ok(Array.isArray(resources));
    assert.strictEqual(resources.length, 2);

    const contactStream = resources.find((r) => r.resourceType === 'crm_contacts_stream');
    assert.ok(contactStream);
    assert.strictEqual(contactStream.name, 'HubSpot Inbound Lead Stream');
    assert.strictEqual(contactStream.connectionId, dummyConnId);

    const dealPipeline = resources.find((r) => r.resourceType === 'deal_pipeline');
    assert.ok(dealPipeline);
    assert.strictEqual(dealPipeline.name, 'HubSpot Deal Pipeline');
    assert.strictEqual(dealPipeline.connectionId, dummyConnId);
  });

  // Cleanup test artifacts
  if (createdDealId) await db('crm_deals').where({ id: createdDealId }).del();
  if (createdContactId) await db('crm_contacts').where({ id: createdContactId }).del();

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
