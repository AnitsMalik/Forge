import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditResults = {
  timestamp: new Date().toISOString(),
  modulesTested: 0,
  passed: 0,
  failed: 0,
  details: [],
  consoleErrors: [],
  failedRequests: [],
  accessibilityViolations: [],
};

async function runPlaywrightAudit() {
  console.log('========================================================================');
  console.log(' STARTING BROWSER AUDIT ACROSS ALL 25 HOASPFORGE MODULES & ROUTES');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Capture console logs & errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('ResizeObserver')) {
        auditResults.consoleErrors.push({ url: page.url(), message: text });
      }
    }
  });

  // Capture failed network requests
  page.on('requestfailed', (req) => {
    auditResults.failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText || 'Unknown error',
    });
  });

  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      auditResults.failedRequests.push({
        url: res.url(),
        status: res.status(),
      });
    }
  });

  // Track each module test
  async function testRoute(name, url, options = {}) {
    auditResults.modulesTested++;
    console.log(`\nTesting [${auditResults.modulesTested}] ${name} -> ${url}`);
    const itemResult = { name, url, status: 'PASS', checks: [], screenshot: null };

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(options.waitMs || 800);

      // Check for blank page or uncaught error boundary
      const bodyText = await page.innerText('body');
      if (bodyText.includes('Something went wrong') || bodyText.includes('Uncaught Error')) {
        throw new Error(`React Error Boundary caught an exception on ${url}`);
      }

      // Check expected selector
      if (options.expectedSelector) {
        const el = page.locator(options.expectedSelector).first();
        const visible = await el.isVisible().catch(() => false);
        if (!visible) {
          throw new Error(`Expected selector "${options.expectedSelector}" was not visible.`);
        }
        itemResult.checks.push(`Selector "${options.expectedSelector}" is visible.`);
      }

      // Check basic accessibility: buttons have accessible names, inputs have labels
      const missingAria = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const namelessButtons = buttons.filter(b => !b.innerText.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'));
        return namelessButtons.length;
      });
      if (missingAria > 0) {
        itemResult.checks.push(`Found ${missingAria} button(s) without text or aria-label.`);
      }

      // Capture screenshot
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const screenshotPath = path.join(SCREENSHOT_DIR, `${safeName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      itemResult.screenshot = screenshotPath;
      itemResult.checks.push(`Rendered successfully. Captured screenshot: ${safeName}.png`);

      auditResults.passed++;
      console.log(`  ✓ PASS: ${name}`);
    } catch (err) {
      auditResults.failed++;
      itemResult.status = 'FAIL';
      itemResult.error = err.message;
      console.error(`  ❌ FAIL: ${name}: ${err.message}`);
    }

    auditResults.details.push(itemResult);
  }

  // TRACK 1: Public Marketing & Auth Pages
  console.log('\n--- TRACK 1: PUBLIC PAGES & AUTHENTICATION ---');
  await testRoute('Public Marketing Homepage', 'http://localhost:5173/', { expectedSelector: 'text=Your AI Social Marketing Team' });
  await testRoute('Public Pricing Page', 'http://localhost:5173/pricing', { expectedSelector: 'text=Pricing' });
  await testRoute('Public Social Agent Showcase', 'http://localhost:5173/social-agent', { expectedSelector: 'text=Meet Your AI' });
  await testRoute('Public Resources Page', 'http://localhost:5173/resources', { expectedSelector: 'text=Resources' });
  await testRoute('Public Terms Page', 'http://localhost:5173/terms', { expectedSelector: 'text=Terms of Service' });
  await testRoute('Public Privacy Page', 'http://localhost:5173/privacy', { expectedSelector: 'text=Privacy Policy' });
  await testRoute('Public System Status Page', 'http://localhost:5173/status', { expectedSelector: 'text=Systems Operational' });
  await testRoute('Login Page', 'http://localhost:5173/login', { expectedSelector: 'input[type="email"]' });

  // PERFORM AUTHENTICATION WITH SUPERADMIN SARAH
  console.log('\n--- AUTHENTICATING INTO HOASPFORGE APPLICATION (SUPERADMIN) ---');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'sarah@apex.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(2000);

  // TRACK 2: The 25 Core Functional Modules
  console.log('\n--- TRACK 2: THE 25 HOASPFORGE CORE FUNCTIONAL MODULES ---');
  await testRoute('1. Dashboard & KPI Intelligence', 'http://localhost:5173/?tab=dashboard', { waitMs: 1500 });
  await testRoute('2. Workspace & Team Management', 'http://localhost:5173/?tab=team', { waitMs: 1000 });
  await testRoute('3. Brand Management & Kit', 'http://localhost:5173/?tab=brands', { waitMs: 1200 });
  await testRoute('4. Connect Hub (Channels)', 'http://localhost:5173/?tab=connections', { waitMs: 1200 });
  await testRoute('5. Connection Health Monitor', 'http://localhost:5173/?tab=connection-health', { waitMs: 1000 });
  await testRoute('6. Content Studio & Composer', 'http://localhost:5173/?tab=studio', { waitMs: 1500 });
  await testRoute('7. Social Calendar & Publishing', 'http://localhost:5173/?tab=calendar', { waitMs: 1500 });
  await testRoute('8. Campaign Management', 'http://localhost:5173/?tab=campaigns', { waitMs: 1200 });
  await testRoute('9. Analytics & Reports', 'http://localhost:5173/?tab=analytics', { waitMs: 1500 });
  await testRoute('10. Growth Intelligence', 'http://localhost:5173/analytics/growth', { waitMs: 1500 });
  await testRoute('11. AI Design Studio (Canva)', 'http://localhost:5173/?tab=canva', { waitMs: 2000 });
  await testRoute('12. Video and Reels Studio', 'http://localhost:5173/?tab=reels', { waitMs: 2000 });
  await testRoute('13. Template Catalog', 'http://localhost:5173/?tab=templates', { waitMs: 1200 });
  await testRoute('14. Media Library', 'http://localhost:5173/?tab=media', { waitMs: 1200 });
  await testRoute('15. Brand Brain & Identity', 'http://localhost:5173/brands/settings', { waitMs: 1200 });
  await testRoute('16. CRM and Sales Pipeline', 'http://localhost:5173/?tab=crm', { waitMs: 1200 });
  await testRoute('17. Email Marketing', 'http://localhost:5173/?tab=email', { waitMs: 1200 });
  await testRoute('18. WhatsApp Marketing', 'http://localhost:5173/?tab=whatsapp', { waitMs: 1200 });
  await testRoute('19. SMS and Voice Marketing', 'http://localhost:5173/?tab=sms-voice', { waitMs: 1200 });
  await testRoute('20. AI Growth Agent', 'http://localhost:5173/?tab=ai', { waitMs: 1500 });
  await testRoute('21. Workflow Automations', 'http://localhost:5173/?tab=automations', { waitMs: 1200 });
  await testRoute('22. Marketing Data Catalog', 'http://localhost:5173/?tab=data', { waitMs: 1200 });
  await testRoute('23. Client Approvals Portal', 'http://localhost:5173/?tab=approvals', { waitMs: 1200 });
  await testRoute('24. Billing and Subscriptions', 'http://localhost:5173/?tab=billing', { waitMs: 1500 });
  await testRoute('25. SuperAdmin Operations', 'http://localhost:5173/?tab=admin-operations', { waitMs: 1500 });

  // TRACK 3: Responsive Viewport Testing across 9 Viewports
  console.log('\n--- TRACK 3: RESPONSIVE VIEWPORT CHECKS (9 SIZES) ---');
  const viewports = [
    { name: '1920x1080_FHD', width: 1920, height: 1080 },
    { name: '1440x900_MacBook', width: 1440, height: 900 },
    { name: '1366x768_HD', width: 1366, height: 768 },
    { name: '1024x768_Tablet_Landscape', width: 1024, height: 768 },
    { name: '768x1024_Tablet_Portrait', width: 768, height: 1024 },
    { name: '430x932_iPhone_Pro_Max', width: 430, height: 932 },
    { name: '390x844_iPhone_14', width: 390, height: 844 },
    { name: '375x812_iPhone_Mini', width: 375, height: 812 },
    { name: '320x640_Mobile_Small', width: 320, height: 640 },
  ];

  for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/?tab=dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    const vpScreenshot = path.join(SCREENSHOT_DIR, `responsive_${vp.name}.png`);
    await page.screenshot({ path: vpScreenshot });
    console.log(`  ${hasHorizontalScroll ? '⚠️ Overflow detected' : '✓ Clean layout'} | Screenshot: responsive_${vp.name}.png`);
  }

  await browser.close();

  // Write audit summary
  fs.writeFileSync(
    'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/scratch/playwright_audit_results.json',
    JSON.stringify(auditResults, null, 2)
  );

  console.log('\n========================================================================');
  console.log(` AUDIT EXECUTION FINISHED: ${auditResults.passed} PASSED / ${auditResults.failed} FAILED`);
  console.log(` Console Errors: ${auditResults.consoleErrors.length}`);
  console.log(` Failed Requests: ${auditResults.failedRequests.length}`);
  console.log('========================================================================\n');
}

runPlaywrightAudit().catch((err) => {
  console.error('Fatal Playwright audit error:', err);
  process.exit(1);
});
