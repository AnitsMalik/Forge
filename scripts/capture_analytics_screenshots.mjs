import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';

  // 1. Desktop 1440x900
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.goto('http://localhost:5173/?tab=analytics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(artifactDir, 'analytics_redesigned_desktop.png'), fullPage: false });
  console.log('Saved analytics_redesigned_desktop.png');

  // Switch to Engagement chart tab to show interactivity
  const engTab = page.locator('button:has-text("Engagement Trends")');
  if (await engTab.isVisible()) {
    await engTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'analytics_redesigned_chart_engagement.png'), fullPage: false });
    console.log('Saved analytics_redesigned_chart_engagement.png');
  }

  // Switch to Platform Comparison chart tab
  const compTab = page.locator('button:has-text("Platform Comparison")');
  if (await compTab.isVisible()) {
    await compTab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'analytics_redesigned_chart_comparison.png'), fullPage: false });
    console.log('Saved analytics_redesigned_chart_comparison.png');
  }

  // Toggle secondary metrics
  const toggleBtn = page.locator('button:has-text("Show Detailed Interaction Metrics")');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'analytics_redesigned_secondary_metrics.png'), fullPage: false });
    console.log('Saved analytics_redesigned_secondary_metrics.png');
  }

  // 2. Mobile 390x844
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/?tab=analytics', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(artifactDir, 'analytics_redesigned_mobile.png'), fullPage: false });
  console.log('Saved analytics_redesigned_mobile.png');

  await browser.close();
  console.log('All analytics audit screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

