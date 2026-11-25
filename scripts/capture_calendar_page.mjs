import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Capturing optimized Calendar pages...');
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  // Desktop Calendar View
  await page.goto('http://localhost:5173/?tab=calendar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(artifactDir, 'calendar_optimized_desktop.png'), fullPage: false });
  console.log('Saved calendar_optimized_desktop.png');

  // Test Filters toggle
  const filterBtn = page.locator('.calendar-filter-btn');
  if (await filterBtn.isVisible()) {
    await filterBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactDir, 'calendar_optimized_filters_expanded.png'), fullPage: false });
    console.log('Saved calendar_optimized_filters_expanded.png');
    await filterBtn.click(); // collapse
    await page.waitForTimeout(200);
  }

  // Test Week View
  const weekBtn = page.locator('.calendar-view-btn:has-text("Week")');
  if (await weekBtn.isVisible()) {
    await weekBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'calendar_optimized_week.png'), fullPage: false });
    console.log('Saved calendar_optimized_week.png');
    await page.locator('.calendar-view-btn:has-text("Month")').click();
  }

  // Mobile View
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'calendar_optimized_mobile.png'), fullPage: false });
  console.log('Saved calendar_optimized_mobile.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error capturing calendar:', err);
  process.exit(1);
});
