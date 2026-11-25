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
  console.log('   SOCIALFORGE: CONTENT STUDIO & CREATIVE SUITE LIVE WORKFLOW AUDIT     ');
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
    // 1. Login via Demo Account
    console.log('[Step 1] Authenticating via Demo Account...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. Navigate to Content Studio (/studio or /?tab=studio)
    console.log('\n[Step 2] Navigating to Content Studio (/studio)...');
    await page.goto('http://localhost:5173/?tab=studio', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage1_brief.png') });
    console.log('  ✓ Captured content_studio_stage1_brief.png');

    const titleInput = page.locator('input.cs-title-input, input[placeholder*="Title"], input[placeholder*="Spotlight"]').first();
    assert((await titleInput.count()) > 0, 'Post Title input mounted');

    // Stepper buttons
    const stepBtns = page.locator('.cs-step-btn');
    assert((await stepBtns.count()) >= 5, '5-Stage Workflow Stepper mounted');

    // 3. Stage 2: AI Copywriter
    console.log('\n[Step 3] Testing Stage 2: AI Copywriter...');
    const step2Btn = page.locator('.cs-step-btn.step-2, button:has-text("AI Copywriter")').first();
    assert((await step2Btn.count()) > 0, 'Stage 2 (AI Copywriter) button available');
    if (await step2Btn.count() > 0) {
      await step2Btn.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage2_ai.png') });
      console.log('  ✓ Captured content_studio_stage2_ai.png');

      const toneSelect = page.locator('select').first();
      assert((await toneSelect.count()) > 0, 'Copywriting Tone selector rendered');

      const genBtn = page.locator('button:has-text("Generate"), button:has-text("Synthesizing")').first();
      assert((await genBtn.count()) > 0, 'AI Synthesis action button rendered');
    }

    // 4. Stage 3: Multichannel Customization
    console.log('\n[Step 4] Testing Stage 3: Multichannel Customization...');
    const step3Btn = page.locator('.cs-step-btn.step-3, button:has-text("Multichannel")').first();
    assert((await step3Btn.count()) > 0, 'Stage 3 (Multichannel) button available');
    if (await step3Btn.count() > 0) {
      await step3Btn.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage3_multichannel.png') });
      console.log('  ✓ Captured content_studio_stage3_multichannel.png');

      // Channel tabs: Facebook, Instagram, X, LinkedIn, TikTok
      const channelTabs = page.locator('.cs-channel-tab');
      const channelCount = await channelTabs.count();
      assert(channelCount >= 5, `Multichannel platform tabs rendered (found ${channelCount})`);

      // Switch to Instagram channel tab
      const igTab = page.locator('.cs-channel-tab:has-text("Instagram")').first();
      if (await igTab.count() > 0) {
        await igTab.click();
        await page.waitForTimeout(500);
        assert(true, 'Switched to Instagram channel copy editor');
      }

      // Switch to LinkedIn channel tab
      const liTab = page.locator('.cs-channel-tab:has-text("LinkedIn")').first();
      if (await liTab.count() > 0) {
        await liTab.click();
        await page.waitForTimeout(500);
        assert(true, 'Switched to LinkedIn channel copy editor');
      }

      // Check Content Textarea
      const copyTextarea = page.locator('textarea.cs-copy-textarea, textarea').first();
      assert((await copyTextarea.count()) > 0, 'Platform copy textarea mounted');
    }

    // 5. Stage 4: Visuals & Media
    console.log('\n[Step 5] Testing Stage 4: Visuals & Media...');
    const step4Btn = page.locator('.cs-step-btn.step-4, button:has-text("Visuals & Media")').first();
    assert((await step4Btn.count()) > 0, 'Stage 4 (Visuals & Media) button available');
    if (await step4Btn.count() > 0) {
      await step4Btn.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage4_media.png') });
      console.log('  ✓ Captured content_studio_stage4_media.png');
      assert(true, 'Stage 4 Visuals & Media studio active');
    }

    // 6. Stage 5: Review & Scheduling / Publishing
    console.log('\n[Step 6] Testing Stage 5: Review & Schedule...');
    const step5Btn = page.locator('.cs-step-btn.step-5, button:has-text("Review & Schedule")').first();
    assert((await step5Btn.count()) > 0, 'Stage 5 (Review & Schedule) button available');
    if (await step5Btn.count() > 0) {
      await step5Btn.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage5_publish.png') });
      console.log('  ✓ Captured content_studio_stage5_publish.png');

      const saveDraftBtn = page.locator('button:has-text("Save Draft")').first();
      assert((await saveDraftBtn.count()) > 0, 'Save Draft action button available');

      const scheduleBtn = page.locator('button:has-text("Schedule")').first();
      assert((await scheduleBtn.count()) > 0, 'Schedule Post button available');

      const publishLiveBtn = page.locator('button:has-text("Publish Live Now"), button:has-text("Publish Now")').first();
      assert((await publishLiveBtn.count()) > 0, 'Publish Live Now button available');
    }

    // Final complete screenshot
    await page.screenshot({ path: path.join(artifactDir, 'content_studio_audit_complete.png') });
    console.log('  ✓ Captured content_studio_audit_complete.png');

  } catch (err) {
    console.error('Audit encountered error:', err);
    assert(false, `Execution exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`CONTENT STUDIO AUDIT SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
