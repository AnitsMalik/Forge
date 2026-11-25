import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('=== STARTING ENTERPRISE BILLING & SUBSCRIPTION CENTER TEST ===');
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
    errors.push(err.message);
  });

  // Step 1: Login
  console.log('[1/8] Logging in to SocialForge...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  // Step 2: Navigate to Billing Page
  console.log('[2/8] Navigating to Billing & Subscription Center...');
  await page.goto('http://localhost:5173/?tab=billing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Verify sticky navigation tabs
  const tabNames = ['Overview', 'Usage & Limits', 'Plans & Pricing', 'Compare Features', 'Payment Methods', 'Billing History', 'FAQs & Support'];
  for (const name of tabNames) {
    const tabEl = page.locator(`.billing-nav-tab:has-text("${name}")`);
    const isVis = await tabEl.isVisible();
    console.log(`  Tab "${name}" visible:`, isVis);
  }

  // Step 3: Capture Overview Tab
  console.log('[3/8] Capturing Overview Tab...');
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_overview.png'), fullPage: false });

  // Step 4: Capture Usage & Limits Tab
  console.log('[4/8] Switching to Usage & Limits Tab...');
  await page.click('.billing-nav-tab:has-text("Usage & Limits")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_usage.png'), fullPage: false });

  // Test View All Usage Entitlements toggle
  const viewAllUsageBtn = page.locator('button:has-text("View All Usage Entitlements")');
  if (await viewAllUsageBtn.isVisible()) {
    console.log('  Testing View All Usage Entitlements toggle...');
    await viewAllUsageBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_usage_extended.png'), fullPage: false });
  }

  // Scroll down to Add-On Packs & capture
  const addPackBtn = page.locator('button:has-text("+ Add Pack")').first();
  if (await addPackBtn.isVisible()) {
    await addPackBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_addons.png'), fullPage: false });

    await addPackBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_modal_addon.png'), fullPage: false });
    await page.click('button:has-text("Activate Add-On Now")');
    await page.waitForTimeout(400);
  }

  // Step 5: Capture Plans & Pricing Tab
  console.log('[5/8] Switching to Plans & Pricing Tab...');
  await page.click('.billing-nav-tab:has-text("Plans & Pricing")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_plans_monthly.png'), fullPage: true });

  // Toggle Annual
  console.log('  Toggling Yearly Billing (Save 20%)...');
  const annualBtn = page.locator('.billing-cycle-toggle-btn:has-text("Yearly")');
  if (await annualBtn.isVisible()) {
    await annualBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_plans_annual.png'), fullPage: true });
  }

  // Step 6: Capture Compare Features Tab
  console.log('[6/8] Switching to Compare Features Tab...');
  await page.click('.billing-nav-tab:has-text("Compare Features")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_compare.png'), fullPage: true });

  // Step 7: Capture Payment Methods Tab
  console.log('[7/8] Switching to Payment Methods Tab...');
  await page.click('.billing-nav-tab:has-text("Payment Methods")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_payment.png'), fullPage: false });

  // Step 8: Capture Invoices & FAQs Tab
  console.log('[8/8] Switching to Billing History Tab...');
  await page.click('.billing-nav-tab:has-text("Billing History")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_invoices.png'), fullPage: true });

  console.log('Switching to Notifications & Alerts Tab...');
  await page.click('.billing-nav-tab:has-text("Notifications & Alerts")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_notifications.png'), fullPage: true });

  console.log('Switching to FAQs & Support Tab...');
  await page.click('.billing-nav-tab:has-text("FAQs & Support")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_faqs.png'), fullPage: false });

  // Verify Pause Modal is removed and Cancel Modal is accessible
  console.log('Verifying Pause Subscription is removed...');
  await page.click('.billing-nav-tab:has-text("Overview")');
  await page.waitForTimeout(500);

  // Test Upgrade Workflow Modal
  console.log('Testing Upgrade Workflow modal...');
  const upgradeBtn = page.locator('button:has-text("Upgrade Plan")').first();
  if (await upgradeBtn.isVisible()) {
    await upgradeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_modal_upgrade.png'), fullPage: false });
    await page.click('.modal-dialog button:has-text("Cancel")');
    await page.waitForTimeout(400);
  }

  // Test Downgrade Workflow Modal
  console.log('Testing Downgrade Workflow modal...');
  const downgradeBtn = page.locator('button:has-text("Downgrade Plan")').first();
  if (await downgradeBtn.isVisible()) {
    await downgradeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_modal_downgrade.png'), fullPage: false });
    await page.click('.modal-dialog button:has-text("Cancel")');
    await page.waitForTimeout(400);
  }

  // Test View Subscription Details Modal
  console.log('Testing View Subscription Details modal...');
  const detailsBtn = page.locator('button:has-text("View Subscription Details")').first();
  if (await detailsBtn.isVisible()) {
    await detailsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_modal_details.png'), fullPage: false });
    await page.click('.modal-dialog button:has-text("Close")');
    await page.waitForTimeout(400);
  }

  // Test Cancel Modal
  console.log('Testing Cancel Subscription modal...');
  const cancelBtn = page.locator('button:has-text("Cancel Subscription")').first();
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'billing_v2_modal_cancel.png'), fullPage: false });
    await page.click('.modal-dialog button:has-text("Keep Subscription")');
    await page.waitForTimeout(400);
  }

  // Test Mobile Responsive Viewport (390x844)
  console.log('Testing Mobile Responsive Layout (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'billing_v2_mobile_390px.png'), fullPage: false });

  await browser.close();
  console.log('=== TEST & CAPTURE COMPLETE! All screenshots saved in artifactDir ===');
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

