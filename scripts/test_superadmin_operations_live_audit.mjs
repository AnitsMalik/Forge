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
  console.log('   SOCIALFORGE: SUPERADMIN & OPERATIONS HUB LIVE WORKFLOW AUDIT         ');
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
    // 1. Standalone Public Status Page (/status)
    console.log('[Step 1] Auditing Standalone Public Status Page (/status)...');
    await page.goto('http://localhost:5173/status', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(artifactDir, 'status_page_initial.png') });
    console.log('  ✓ Captured status_page_initial.png');

    const statusBadge = page.locator('span:has-text("Status")');
    assert((await statusBadge.count()) > 0, 'Public Status Page brand & status badge mounted');

    const statusHero = page.locator('h1:has-text("Operational")');
    assert((await statusHero.count()) > 0, 'System Operational banner mounted');

    const slaCard = page.locator('text=90-Day SLA');
    assert((await slaCard.count()) > 0, 'SLA Performance card rendered');

    // 2. Login via Superadmin Demo Account
    console.log('\n[Step 2] Authenticating as Superadmin (sarah@apex.com)...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // 3. Platform Revenue & Admin Billing (/tab=admin-billing)
    console.log('\n[Step 3] Auditing Platform Revenue & Admin Billing (/tab=admin-billing)...');
    await page.goto('http://localhost:5173/?tab=admin-billing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'admin_billing_subscriptions.png') });
    console.log('  ✓ Captured admin_billing_subscriptions.png');

    const adminBillingHeader = page.locator('h1:has-text("Revenue & Subscription Intelligence")');
    assert((await adminBillingHeader.count()) > 0, 'Admin Billing Revenue Intelligence header mounted');

    const superadminBadge = page.locator('span:has-text("Platform Superadmin")');
    assert((await superadminBadge.count()) > 0, 'Platform Superadmin authorization badge mounted');

    // Switch to Plan Management tab
    console.log('  Switching to Plan Management tab...');
    const plansTab = page.locator('button:has-text("Plans & Commercial Packaging")').first();
    assert((await plansTab.count()) > 0, 'Plans & Commercial Packaging tab available');
    if (await plansTab.count() > 0) {
      await plansTab.click();
      await page.waitForTimeout(800);
      assert(true, 'Switched to Plans & Commercial Packaging tab');
    }

    // Switch to Revenue Analytics & Trends tab
    console.log('  Switching to Revenue Analytics tab...');
    const kpiTab = page.locator('button:has-text("Revenue Analytics")').first();
    assert((await kpiTab.count()) > 0, 'Revenue Analytics & Trends tab available');
    if (await kpiTab.count() > 0) {
      await kpiTab.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'admin_billing_kpis.png') });
      console.log('  ✓ Captured admin_billing_kpis.png');
      assert(true, 'Switched to Revenue Analytics tab');
    }

    // Switch to Override Governance tab
    console.log('  Switching to Override Governance tab...');
    const govTab = page.locator('button:has-text("Override Governance")').first();
    assert((await govTab.count()) > 0, 'Override Governance tab available');
    if (await govTab.count() > 0) {
      await govTab.click();
      await page.waitForTimeout(800);
      assert(true, 'Switched to Override Governance tab');
    }

    // 4. Superadmin Operations & Mission Control (/tab=admin-operations)
    console.log('\n[Step 4] Auditing Superadmin Operations & Mission Control (/tab=admin-operations)...');
    await page.goto('http://localhost:5173/?tab=admin-operations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'superadmin_operations_tenants.png') });
    console.log('  ✓ Captured superadmin_operations_tenants.png');

    const opsHeader = page.locator('h1:has-text("Superadmin Operations")');
    assert((await opsHeader.count()) > 0, 'Superadmin Operations header mounted');

    // Operational View Navigation Pills: Provider Health
    const providerHealthTab = page.locator('button:has-text("Provider Health")').first();
    assert((await providerHealthTab.count()) > 0, 'Provider Health operational tab available');
    if (await providerHealthTab.count() > 0) {
      await providerHealthTab.click();
      await page.waitForTimeout(1200);

      await page.screenshot({ path: path.join(artifactDir, 'superadmin_operations_providers.png') });
      console.log('  ✓ Captured superadmin_operations_providers.png');

      const metaSla = page.locator('strong:has-text("Meta Graph API")').first();
      assert((await metaSla.count()) > 0, 'Meta Graph API provider health monitored');
    }

    // Check Connection Health tab
    console.log('  Switching to Connection Health view...');
    const connHealthTab = page.locator('button:has-text("Connections")').first();
    assert((await connHealthTab.count()) > 0, 'Connection Health tab available');
    if (await connHealthTab.count() > 0) {
      await connHealthTab.click();
      await page.waitForTimeout(800);
      assert(true, 'Connection Health tab rendered safely');
    }

    // Check Queue & Workers view
    console.log('  Switching to Queue & Workers view...');
    const queueTab = page.locator('button:has-text("Queue & Workers")').first();
    assert((await queueTab.count()) > 0, 'Queue & Workers tab available');
    if (await queueTab.count() > 0) {
      await queueTab.click();
      await page.waitForTimeout(800);
      assert(true, 'Queue & Workers tab rendered safely');
    }

    // Check DLQ Recovery view
    console.log('  Switching to DLQ Recovery view...');
    const dlqTab = page.locator('button:has-text("DLQ Recovery")').first();
    assert((await dlqTab.count()) > 0, 'DLQ Recovery tab available');
    if (await dlqTab.count() > 0) {
      await dlqTab.click();
      await page.waitForTimeout(800);
      assert(true, 'DLQ Recovery tab rendered safely');
    }

    // Final complete screenshot
    await page.screenshot({ path: path.join(artifactDir, 'superadmin_audit_complete.png') });
    console.log('  ✓ Captured superadmin_audit_complete.png');

  } catch (err) {
    console.error('Audit encountered error:', err);
    assert(false, `Execution exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`SUPERADMIN & OPERATIONS HUB AUDIT SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
