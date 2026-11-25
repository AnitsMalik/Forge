import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Capturing Campaigns screenshots...');
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';

  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('button:has-text("Demo Login")');
  if (await demoBtn.isVisible()) {
    console.log('Logging in via Demo Login...');
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  // Navigate to Campaigns tab
  console.log('Navigating to /?tab=campaigns...');
  await page.goto('http://localhost:5173/?tab=campaigns', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Desktop AI Generator Tab
  await page.screenshot({ path: path.join(artifactDir, 'campaigns_generator_desktop.png'), fullPage: false });
  console.log('Saved campaigns_generator_desktop.png');

  // 2. Click "Active Campaigns" tab
  const activeTabBtn = page.locator('button.cp-tab-btn:has-text("Active Campaigns")');
  if (await activeTabBtn.isVisible()) {
    await activeTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'campaigns_optimized_desktop.png'), fullPage: false });
    console.log('Saved campaigns_optimized_desktop.png');
  }

  // 3. Click "Campaign Arc" tab
  const arcTabBtn = page.locator('button.cp-tab-btn:has-text("Arc")');
  if (await arcTabBtn.isVisible()) {
    await arcTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'campaigns_arc_drilldown_desktop.png'), fullPage: false });
    console.log('Saved campaigns_arc_drilldown_desktop.png');
  }

  // 4. Mobile viewport
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto('http://localhost:5173/?tab=campaigns', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(artifactDir, 'campaigns_optimized_mobile.png'), fullPage: false });
  console.log('Saved campaigns_optimized_mobile.png');

  await browser.close();
  console.log('Done capturing Campaigns screenshots!');
}

main().catch(console.error);

