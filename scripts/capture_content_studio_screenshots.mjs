import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Capturing Content Studio screenshots...');
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

  // Navigate to Content Studio tab
  console.log('Navigating to /?tab=studio...');
  await page.goto('http://localhost:5173/?tab=studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Stage 1: Idea & Brief
  await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage1_desktop.png'), fullPage: false });
  console.log('Saved content_studio_stage1_desktop.png');

  // 2. Stage 2: AI Copywriter
  const step2Btn = page.locator('button.cs-step-btn:has-text("AI Copywriter")');
  if (await step2Btn.isVisible()) {
    console.log('Clicking Stage 2...');
    await step2Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage2_copywriter.png'), fullPage: false });
    console.log('Saved content_studio_stage2_copywriter.png');
  } else {
    console.log('Stage 2 button not visible!');
  }

  // 3. Stage 3: Multichannel
  const step3Btn = page.locator('button.cs-step-btn:has-text("Multichannel")');
  if (await step3Btn.isVisible()) {
    console.log('Clicking Stage 3...');
    await step3Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage3_multichannel.png'), fullPage: false });
    console.log('Saved content_studio_stage3_multichannel.png');
  }

  // 4. Stage 4: Visuals & Media
  const step4Btn = page.locator('button.cs-step-btn:has-text("Visuals & Media")');
  if (await step4Btn.isVisible()) {
    console.log('Clicking Stage 4...');
    await step4Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage4_visuals.png'), fullPage: false });
    console.log('Saved content_studio_stage4_visuals.png');
  }

  // 5. Stage 5: Review & Schedule
  const step5Btn = page.locator('button.cs-step-btn:has-text("Review & Schedule")');
  if (await step5Btn.isVisible()) {
    console.log('Clicking Stage 5...');
    await step5Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'content_studio_stage5_schedule.png'), fullPage: false });
    console.log('Saved content_studio_stage5_schedule.png');
  }

  // 6. Full Page View
  const fullViewToggle = page.locator('button.cs-stepper-toggle');
  if (await fullViewToggle.isVisible()) {
    console.log('Toggling Full Page View...');
    await fullViewToggle.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'content_studio_fullview_desktop.png'), fullPage: false });
    console.log('Saved content_studio_fullview_desktop.png');
  }

  // 7. Mobile Viewport (sharing context)
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto('http://localhost:5173/?tab=studio', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(artifactDir, 'content_studio_mobile.png'), fullPage: false });
  console.log('Saved content_studio_mobile.png');

  await browser.close();
  console.log('Done capturing all Content Studio screenshots!');
}

main().catch(console.error);
