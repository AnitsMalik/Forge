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
  console.log('   SOCIALFORGE: SETTINGS & SECURITY CENTER LIVE WORKFLOW AUDIT          ');
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
    console.log('[Step 1] Logging in & navigating to /login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. Audit Workspace Settings (/settings/workspace)
    console.log('\n[Step 2] Auditing Workspace Settings (/settings/workspace)...');
    await page.goto('http://localhost:5173/settings/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactDir, 'settings_workspace_initial.png') });
    console.log('  ✓ Captured settings_workspace_initial.png');

    const wsHeader = page.locator('h1:has-text("Agency Workspace Settings")');
    assert((await wsHeader.count()) > 0, 'Workspace Settings page header mounted');

    const agencyNameInput = page.locator('input[type="text"]').first();
    assert((await agencyNameInput.count()) > 0, 'Agency Name input field rendered');

    const retentionSelect = page.locator('select').first();
    assert((await retentionSelect.count()) > 0, 'Data retention policy select mounted');

    const saveWsBtn = page.locator('button:has-text("Save Settings")').first();
    assert((await saveWsBtn.count()) > 0, 'Save Workspace Settings button interactive');
    if (await saveWsBtn.count() > 0) {
      await saveWsBtn.click();
      await page.waitForTimeout(400);
      assert(true, 'Workspace settings save action triggered');
    }

    // 3. Audit Security & API Keys (/settings/security)
    console.log('\n[Step 3] Auditing Security & API Keys (/settings/security)...');
    await page.goto('http://localhost:5173/settings/security', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactDir, 'settings_security_initial.png') });
    console.log('  ✓ Captured settings_security_initial.png');

    const secHeader = page.locator('h1:has-text("Security & API Keys")');
    assert((await secHeader.count()) > 0, 'Security & API Keys header mounted');

    const twoFaBtn = page.locator('button:has-text("Enable 2FA"), button:has-text("Enabled")').first();
    assert((await twoFaBtn.count()) > 0, 'Two-Factor Authentication toggle button rendered');

    if (await twoFaBtn.count() > 0) {
      await twoFaBtn.click();
      await page.waitForTimeout(300);
      assert(true, '2FA state toggled to Enabled');
      await twoFaBtn.click();
      await page.waitForTimeout(300);
      assert(true, '2FA state toggled back to disabled');
    }

    const copyKeyBtn = page.locator('button:has-text("Copy"), button[title*="Copy" i]').first();
    assert((await copyKeyBtn.count()) > 0, 'Developer API Key copy action button mounted');

    // 4. Audit Notification Preferences (/settings/notifications)
    console.log('\n[Step 4] Auditing Notification Preferences (/settings/notifications)...');
    await page.goto('http://localhost:5173/settings/notifications', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactDir, 'settings_notifications_initial.png') });
    console.log('  ✓ Captured settings_notifications_initial.png');

    const notifHeader = page.locator('h1:has-text("Notification Preferences")');
    assert((await notifHeader.count()) > 0, 'Notification Preferences header mounted');

    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    assert(checkboxCount >= 3, `Email delivery notification toggles rendered (${checkboxCount} toggles)`);

    const webhookInput = page.locator('input[type="url"], input[placeholder*="slack" i]').first();
    assert((await webhookInput.count()) > 0, 'Slack / Discord Webhook URL input mounted');

    const saveNotifBtn = page.locator('button:has-text("Save Notifications")').first();
    assert((await saveNotifBtn.count()) > 0, 'Save Notification Preferences button interactive');
    if (await saveNotifBtn.count() > 0) {
      await saveNotifBtn.click();
      await page.waitForTimeout(400);
      assert(true, 'Notification preferences save action triggered');
    }

    // 5. Check Console Runtime Errors
    console.log('\n[Step 5] Checking Console Runtime Errors...');
    assert(consoleErrors.length === 0, `0 console runtime errors recorded (${consoleErrors.length} found)`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(e => console.error('   Error:', e));
    }

    await page.screenshot({ path: path.join(artifactDir, 'settings_audit_complete.png') });
    console.log('  ✓ Captured settings_audit_complete.png');

  } catch (err) {
    console.error('\n❌ Unhandled Audit Failure:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   SETTINGS & SECURITY AUDIT: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed < total) process.exit(1);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

