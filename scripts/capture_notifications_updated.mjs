import { chromium } from 'playwright';
import path from 'path';

async function captureNotificationTab() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.goto('http://localhost:5173/?tab=billing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const tabBtn = page.locator('.billing-nav-tab:has-text("Notifications & Alerts")');
  if (await tabBtn.isVisible()) {
    await tabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'billing_tab_notifications_updated.png'), fullPage: false });
    console.log('Saved billing_tab_notifications_updated.png');
  }

  const faqTabBtn = page.locator('.billing-nav-tab:has-text("FAQs & Support")');
  if (await faqTabBtn.isVisible()) {
    await faqTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'billing_tab_faqs_updated.png'), fullPage: false });
    console.log('Saved billing_tab_faqs_updated.png');
  }

  await browser.close();
  console.log('Done!');
}

captureNotificationTab().catch(err => {
  console.error(err);
  process.exit(1);
});

