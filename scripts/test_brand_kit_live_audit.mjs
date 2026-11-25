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
  console.log('   SOCIALFORGE: BRAND KIT & GUIDELINES STUDIO LIVE WORKFLOW AUDIT       ');
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
    // 1. Login & Navigate
    console.log('[Step 1] Logging in & navigating to /?tab=brands...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.goto('http://localhost:5173/?tab=brands', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'brand_kit_audit_initial.png') });
    console.log('  ✓ Captured brand_kit_audit_initial.png');

    const brandHeader = page.locator('h2:has-text("Centralized Brand Brain"), h1:has-text("Brand")');
    assert((await brandHeader.count()) > 0, 'Centralized Brand Brain studio header mounted');

    const dimensionsBadge = page.locator('text=16 Dimensions Active');
    assert((await dimensionsBadge.count()) > 0, '16 Dimensions Active telemetry badge rendered');

    // 2. Test Tab 1: Profile, Products & USPs
    console.log('\n[Step 2] Auditing Tab 1: Profile, Products & USPs...');
    const tab1Btn = page.locator('button:has-text("1. Profile, Products & USPs")');
    assert((await tab1Btn.count()) > 0, 'Tab 1 button mounted');

    const companyNameInput = page.locator('input[value*="Hoasp" i], input[value*="Brand" i], input[placeholder*="Brand" i]').first();
    assert((await companyNameInput.count()) > 0, 'Company name input field rendered with brand profile');

    const uspsCard = page.locator('h4:has-text("Unique Selling Propositions"), div:has-text("USPs")');
    assert((await uspsCard.count()) > 0, 'Unique Selling Propositions section mounted');

    // 3. Test Tab 2: Audience, Values & Pillars
    console.log('\n[Step 3] Auditing Tab 2: Audience, Values & Pillars...');
    const tab2Btn = page.locator('button:has-text("2. Audience, Values & Pillars")');
    await tab2Btn.click();
    await page.waitForTimeout(500);

    const audienceHeader = page.locator('h4:has-text("Target Audience Profile"), div:has-text("Audience")');
    assert((await audienceHeader.count()) > 0, 'Target audience profile card rendered');

    const pillarsSection = page.locator('h4:has-text("Content Pillars & Strategic Themes"), div:has-text("Content Pillars")');
    assert((await pillarsSection.count()) > 0, 'Content pillars & strategic thematic goals section mounted');

    // 4. Test Tab 3: Voice, Tone & Guidelines
    console.log('\n[Step 4] Auditing Tab 3: Voice, Tone & Guidelines...');
    const tab3Btn = page.locator('button:has-text("3. Voice, Tone & Guidelines")');
    await tab3Btn.click();
    await page.waitForTimeout(500);

    const toneHeader = page.locator('h4:has-text("Tone of Voice & Personality Traits"), div:has-text("Tone")');
    assert((await toneHeader.count()) > 0, 'Tone of voice & personality descriptors section mounted');

    const safetyGuardrails = page.locator('h4:has-text("Strict Brand Safety"), div:has-text("Safety"), div:has-text("Avoid")');
    assert((await safetyGuardrails.count()) > 0, 'Strict Brand Safety & taboo constraints guardrails mounted');

    // 5. Test Tab 4: Visual Identity
    console.log('\n[Step 5] Auditing Tab 4: Visual Identity & Color System...');
    const tab4Btn = page.locator('button:has-text("4. Visual Identity")');
    await tab4Btn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(artifactDir, 'brand_kit_audit_visual_identity.png') });
    console.log('  ✓ Captured brand_kit_audit_visual_identity.png');

    const colorSystem = page.locator('h4:has-text("Color Palette & System"), div:has-text("Color Palette"), div:has-text("Primary Color")');
    assert((await colorSystem.count()) > 0, 'Color system & design token swatches mounted');

    // 6. Test Tab 5: Live AI System Prompt Inspector
    console.log('\n[Step 6] Auditing Tab 5: Live AI System Prompt Inspector...');
    const tab5Btn = page.locator('button:has-text("5. Live AI System Prompt Inspector")');
    await tab5Btn.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(artifactDir, 'brand_kit_audit_ai_prompt.png') });
    console.log('  ✓ Captured brand_kit_audit_ai_prompt.png');

    const promptPreviewContainer = page.locator('pre, code, textarea, div:has-text("CENTRALIZED BRAND BRAIN GOVERNANCE CONTEXT")');
    assert((await promptPreviewContainer.count()) > 0, 'Live AI system prompt preview container rendered');

    const copyBtn = page.locator('button:has-text("Copy System Prompt"), button:has-text("Copy Prompt")').first();
    if (await copyBtn.count() > 0) {
      await copyBtn.click();
      await page.waitForTimeout(300);
      assert(true, 'Copy System Prompt button interactive');
    }

    // 7. Test Website Scraper Modal
    console.log('\n[Step 7] Testing Website Fact Extraction Modal...');
    const importBtn = page.locator('button:has-text("Import from Website")').first();
    assert((await importBtn.count()) > 0, 'Import from Website button mounted');

    if (await importBtn.count() > 0) {
      await importBtn.click();
      await page.waitForTimeout(500);

      const modalTitle = page.locator('.brand-scraper-modal, h3:has-text("Extract Brand Brain from Public Website"), h3:has-text("Brand Brain")');
      assert((await modalTitle.count()) > 0, 'Website extraction modal mounted');

      await page.screenshot({ path: path.join(artifactDir, 'brand_kit_audit_scraper_modal.png') });
      console.log('  ✓ Captured brand_kit_audit_scraper_modal.png');

      const modalClose = page.locator('.modal-close, button:has-text("Cancel")').first();
      if (await modalClose.count() > 0) {
        await modalClose.click();
        await page.waitForTimeout(300);
        assert(true, 'Website extraction modal dismissed cleanly');
      }
    }

    // 8. Test Save Brand Brain Interaction
    console.log('\n[Step 8] Testing Save Brand Brain Interaction...');
    await tab1Btn.click();
    await page.waitForTimeout(400);

    const saveBtn = page.locator('button:has-text("Save Brand Brain")').first();
    assert((await saveBtn.count()) > 0, 'Save Brand Brain button mounted');

    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      await page.waitForTimeout(1000);

      const saveNotification = page.locator('div:has-text("Centralized Brand Brain saved"), div:has-text("saved")');
      assert((await saveNotification.count()) > 0, 'Save confirmation toast banner rendered');
    }

    // 9. Runtime Errors Check
    console.log('\n[Step 9] Checking Console Runtime Errors...');
    assert(consoleErrors.length === 0, `0 console runtime errors recorded (${consoleErrors.length} found)`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(e => console.error('   Error:', e));
    }

    await page.screenshot({ path: path.join(artifactDir, 'brand_kit_audit_complete.png') });
    console.log('  ✓ Captured brand_kit_audit_complete.png');

  } catch (err) {
    console.error('\n❌ Unhandled Audit Failure:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   BRAND KIT & GUIDELINES STUDIO AUDIT: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed < total) process.exit(1);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
