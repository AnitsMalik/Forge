import { chromium } from 'playwright';
import path from 'path';

async function captureAllBillingTabs() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  const tabs = [
    { name: 'usage', label: 'Usage & Limits' },
    { name: 'plans', label: 'Plans & Pricing' },
    { name: 'compare', label: 'Compare Features' },
    { name: 'payment', label: 'Payment Methods' },
    { name: 'invoices', label: 'Billing History' },
    { name: 'notifications', label: 'Notifications & Alerts' },
    { name: 'faqs', label: 'FAQs & Support' }
  ];

  for (const t of tabs) {
    console.log(`Navigating to tab ${t.name}...`);
    await page.goto(`http://localhost:5173/?tab=billing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tabBtn = page.locator(`.billing-nav-tab:has-text("${t.label}")`);
    if (await tabBtn.isVisible()) {
      await tabBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactDir, `billing_tab_${t.name}.png`), fullPage: false });
      console.log(`Saved billing_tab_${t.name}.png`);
    }
  }

  await browser.close();
  console.log('All billing tab screenshots captured successfully!');
}

captureAllBillingTabs().catch(err => {
  console.error(err);
  process.exit(1);
});

