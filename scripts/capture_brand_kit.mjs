import { chromium } from 'playwright';
import path from 'path';

async function captureBrandKit() {
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

  await page.goto('http://localhost:5173/?tab=brands', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(artifactDir, 'brand_kit_current.png'), fullPage: false });
  console.log('Saved brand_kit_current.png');

  await browser.close();
}

captureBrandKit().catch(err => {
  console.error(err);
  process.exit(1);
});

