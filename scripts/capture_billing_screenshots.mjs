import { chromium } from 'playwright';
import path from 'path';

async function captureBilling() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    console.log('Clicking demo login...');
    await demoBtn.click();
    await page.waitForTimeout(2500);
  }

  console.log('Navigating to /?tab=billing...');
  await page.goto('http://localhost:5173/?tab=billing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(artifactDir, 'billing_overview_current.png'), fullPage: false });
  console.log('Saved billing_overview_current.png');

  // Let's also test mobile view
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'billing_mobile_current.png'), fullPage: false });
  console.log('Saved billing_mobile_current.png');

  await browser.close();
  console.log('Done capturing billing screenshots!');
}

captureBilling().catch(err => {
  console.error(err);
  process.exit(1);
});
