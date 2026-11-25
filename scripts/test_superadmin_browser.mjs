import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runSuperadminBrowserAudit() {
  console.log('--- Starting Playwright UI/UX Audit for Superadmin Platform Operations ---');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Log in as Sarah (Superadmin)
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'sarah@apex.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 2. Navigate to Superadmin Operations Dashboard
    console.log('2. Navigating to Superadmin Operations page...');
    await page.goto('http://localhost:5173/admin/operations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'superadmin_audit_overview.png'),
      fullPage: true,
    });
    console.log('  -> Saved superadmin_audit_overview.png');

    // 3. Navigate to SIEM Exporters tab
    console.log('3. Navigating to SIEM Exporters tab...');
    const siemTab = await page.$('button:has-text("SIEM"), [role="tab"]:has-text("SIEM")');
    if (siemTab) {
      await siemTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'superadmin_audit_siem.png'),
        fullPage: true,
      });
      console.log('  -> Saved superadmin_audit_siem.png');
    }

    // 4. Navigate to DLP Policies tab
    console.log('4. Navigating to DLP tab...');
    const dlpTab = await page.$('button:has-text("DLP"), [role="tab"]:has-text("DLP")');
    if (dlpTab) {
      await dlpTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'superadmin_audit_dlp.png'),
        fullPage: true,
      });
      console.log('  -> Saved superadmin_audit_dlp.png');
    }

    // 5. Navigate to JIT Access tab
    console.log('5. Navigating to JIT Access tab...');
    const jitTab = await page.$('button:has-text("JIT Access"), [role="tab"]:has-text("JIT")');
    if (jitTab) {
      await jitTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'superadmin_audit_jit.png'),
        fullPage: true,
      });
      console.log('  -> Saved superadmin_audit_jit.png');
    }

    // 6. Navigate to WORM Vault tab
    console.log('6. Navigating to WORM Vault tab...');
    const wormTab = await page.$('button:has-text("WORM"), [role="tab"]:has-text("WORM")');
    if (wormTab) {
      await wormTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'superadmin_audit_worm.png'),
        fullPage: true,
      });
      console.log('  -> Saved superadmin_audit_worm.png');
    }

    // 7. Mobile Viewport (390px)
    console.log('7. Auditing mobile responsive view (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'superadmin_audit_mobile_390px.png'),
      fullPage: true,
    });
    console.log('  -> Saved superadmin_audit_mobile_390px.png');

  } finally {
    await browser.close();
  }

  console.log('--- Playwright UI/UX Audit for Superadmin Platform Operations Completed ---');
}

runSuperadminBrowserAudit().catch((err) => {
  console.error('Playwright Browser Audit Error:', err);
  process.exit(1);
});
