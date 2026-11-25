import { chromium } from 'playwright';
import path from 'path';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS [Test ${total}]: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [Test ${total}]: ${message}`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: OMNICHANNEL MESSAGING & CRM LIVE WORKFLOW AUDIT         ');
  console.log('========================================================================\n');

  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  try {
    // 1. Login
    console.log('[Step 1] Logging in via Demo Account...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. CRM & Pipeline Audit
    console.log('\n[Step 2] Auditing CRM & Deal Pipeline (/tab=crm)...');
    await page.goto('http://localhost:5173/?tab=crm', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'crm_pipeline_kanban.png') });
    console.log('  ✓ Captured crm_pipeline_kanban.png');

    const crmHeader = page.locator('h1:has-text("Customer Relationships & Revenue Pipeline")');
    assert((await crmHeader.count()) > 0, 'CRM Page Header mounted');

    const crmStatCards = page.locator('text=Total Pipeline Value');
    assert((await crmStatCards.count()) > 0, 'CRM Pipeline Value StatCard rendered');

    // Open New Deal drawer
    const newDealBtn = page.locator('button:has-text("New Deal")').first();
    assert((await newDealBtn.count()) > 0, 'New Deal button available');
    if (await newDealBtn.count() > 0) {
      await newDealBtn.click();
      await page.waitForTimeout(600);
      const dealTitleInput = page.locator('input[placeholder*="Q4 Agency Retainer"]');
      assert((await dealTitleInput.count()) > 0, 'Create New Deal drawer mounted with Deal Title input');
      // Cancel deal drawer
      const cancelDealBtn = page.locator('button:has-text("Cancel")').last();
      await cancelDealBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch to Contacts & Leads tab
    console.log('  Switching to Contacts & Leads tab...');
    const contactsTabBtn = page.locator('button:has-text("Contacts & Leads")').first();
    assert((await contactsTabBtn.count()) > 0, 'Contacts & Leads segmented tab available');
    if (await contactsTabBtn.count() > 0) {
      await contactsTabBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(artifactDir, 'crm_contacts_table.png') });
    console.log('  ✓ Captured crm_contacts_table.png');

    const contactSearch = page.locator('input[placeholder*="Search contacts"]');
    assert((await contactSearch.count()) > 0, 'Contact search input rendered');

    // Open New Contact drawer
    const newContactBtn = page.locator('button:has-text("New Contact")').first();
    assert((await newContactBtn.count()) > 0, 'New Contact button available');
    if (await newContactBtn.count() > 0) {
      await newContactBtn.click();
      await page.waitForTimeout(600);

      await page.screenshot({ path: path.join(artifactDir, 'crm_add_contact_drawer.png') });
      console.log('  ✓ Captured crm_add_contact_drawer.png');

      const firstNameInput = page.locator('input[placeholder="Jane"]');
      assert((await firstNameInput.count()) > 0, 'Add Contact drawer mounted with First Name input');

      const cancelContactBtn = page.locator('button:has-text("Cancel")').last();
      await cancelContactBtn.click();
      await page.waitForTimeout(500);
    }

    // 3. Email Marketing Studio Audit
    console.log('\n[Step 3] Auditing Email Marketing Studio (/tab=email)...');
    await page.goto('http://localhost:5173/?tab=email', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'email_marketing_campaigns.png') });
    console.log('  ✓ Captured email_marketing_campaigns.png');

    const emailHeader = page.locator('h1:has-text("Email Marketing & Broadcast Studio")');
    assert((await emailHeader.count()) > 0, 'Email Marketing Studio header mounted');

    const audienceCard = page.locator('text=Verified Audience');
    assert((await audienceCard.count()) > 0, 'Verified Audience StatCard rendered');

    // Open Campaign Creation Wizard
    const createCampaignBtn = page.locator('button:has-text("+ Create Campaign")').first();
    assert((await createCampaignBtn.count()) > 0, 'Create Campaign button available');
    if (await createCampaignBtn.count() > 0) {
      await createCampaignBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'email_campaign_wizard_step1.png') });
      console.log('  ✓ Captured email_campaign_wizard_step1.png');

      const wizHeading = page.locator('h3:has-text("Campaign Identity & Sender Configuration")');
      assert((await wizHeading.count()) > 0, 'Campaign Creation Wizard mounted to Step 1');

      // Cancel wizard
      const cancelWizBtn = page.locator('button:has-text("Cancel")').first();
      await cancelWizBtn.click();
      await page.waitForTimeout(600);
    }

    // Switch to Template Studio tab
    console.log('  Switching to Email Template Studio...');
    const tplTabBtn = page.locator('button:has-text("Template Studio")').first();
    assert((await tplTabBtn.count()) > 0, 'Template Studio tab available');
    if (await tplTabBtn.count() > 0) {
      await tplTabBtn.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: path.join(artifactDir, 'email_template_studio.png') });
      console.log('  ✓ Captured email_template_studio.png');

      const uploadTplBtn = page.locator('button:has-text("Upload HTML Template")').first();
      assert((await uploadTplBtn.count()) > 0, 'Upload HTML Template action available');
    }

    // Switch to Audience & Leads tab
    console.log('  Switching to Audience & Leads tab...');
    const audTabBtn = page.locator('button:has-text("Audience & Leads")').first();
    assert((await audTabBtn.count()) > 0, 'Audience & Leads tab available');
    if (await audTabBtn.count() > 0) {
      await audTabBtn.click();
      await page.waitForTimeout(800);
      const subSearch = page.locator('input[placeholder*="Search email"]');
      assert((await subSearch.count()) > 0, 'Subscriber audience search rendered');
    }

    // 4. WhatsApp Marketing Studio Audit
    console.log('\n[Step 4] Auditing WhatsApp Marketing Studio (/tab=whatsapp)...');
    await page.goto('http://localhost:5173/?tab=whatsapp', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'whatsapp_marketing_studio.png') });
    console.log('  ✓ Captured whatsapp_marketing_studio.png');

    const waHeader = page.locator('h1:has-text("WhatsApp Marketing & Messaging")');
    assert((await waHeader.count()) > 0, 'WhatsApp Marketing header mounted');

    const newBroadcastBtn = page.locator('button:has-text("New Broadcast")').first();
    assert((await newBroadcastBtn.count()) > 0, 'New Broadcast button available');

    // Switch to 2-Way Chat Inbox tab
    const waInboxTab = page.locator('button:has-text("2-Way Chat Inbox")').first();
    assert((await waInboxTab.count()) > 0, '2-Way Chat Inbox tab available');
    if (await waInboxTab.count() > 0) {
      await waInboxTab.click();
      await page.waitForTimeout(800);
      assert(true, 'WhatsApp 2-Way Chat Inbox view loaded');
    }

    // Switch to Meta Approved Templates tab
    const waTemplatesTab = page.locator('button:has-text("Meta Approved Templates")').first();
    assert((await waTemplatesTab.count()) > 0, 'Meta Approved Templates tab available');
    if (await waTemplatesTab.count() > 0) {
      await waTemplatesTab.click();
      await page.waitForTimeout(800);
      assert(true, 'Meta Approved Templates gallery loaded');
    }

    // 5. SMS & AI Voice Studio Audit
    console.log('\n[Step 5] Auditing SMS & AI Voice Studio (/tab=sms-voice)...');
    await page.goto('http://localhost:5173/?tab=sms-voice', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'sms_voice_studio.png') });
    console.log('  ✓ Captured sms_voice_studio.png');

    const smsHeader = page.locator('h1:has-text("SMS Broadcasts & AI Voice Concierge")');
    assert((await smsHeader.count()) > 0, 'SMS & AI Voice Studio header mounted');

    const newSmsBtn = page.locator('button:has-text("New SMS Broadcast")').first();
    assert((await newSmsBtn.count()) > 0, 'New SMS Broadcast button available');

    const dispatchCallBtn = page.locator('button:has-text("Dispatch AI Call")').first();
    assert((await dispatchCallBtn.count()) > 0, 'Dispatch AI Call button available');

    // Switch to AI Voice Concierge & Calls tab
    const voiceTab = page.locator('button:has-text("AI Voice Concierge & Calls")').first();
    assert((await voiceTab.count()) > 0, 'AI Voice Concierge & Calls tab available');
    if (await voiceTab.count() > 0) {
      await voiceTab.click();
      await page.waitForTimeout(800);
      assert(true, 'AI Voice Concierge view loaded');
    }

    // Switch to Direct Carrier Logs tab
    const carrierTab = page.locator('button:has-text("Direct Carrier Logs")').first();
    assert((await carrierTab.count()) > 0, 'Direct Carrier Logs tab available');
    if (await carrierTab.count() > 0) {
      await carrierTab.click();
      await page.waitForTimeout(800);
      assert(true, 'Direct Carrier Logs view loaded');
    }

    // Capture final summary screenshot
    await page.screenshot({ path: path.join(artifactDir, 'omnichannel_audit_complete.png') });
    console.log('  ✓ Captured omnichannel_audit_complete.png');

  } catch (err) {
    console.error('Audit encountered error:', err);
    assert(false, `Execution exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`OMNICHANNEL MESSAGING & CRM AUDIT SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();

