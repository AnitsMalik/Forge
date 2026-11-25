import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Starting Playwright FTUE end-to-end audit...');
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Authenticate
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    console.log('Clicking demo login...');
    await demoBtn.click();
    await page.waitForTimeout(2500);
  }

  // 2. Open Onboarding Wizard (Step 1)
  console.log('Navigating to Onboarding Wizard...');
  await page.goto('http://localhost:5173/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Capture Step 1
  await page.screenshot({ path: path.join(artifactDir, 'ftue_step1_welcome.png'), fullPage: false });
  console.log('Saved ftue_step1_welcome.png');

  // Click "Get Started" to go to Step 2
  const getStartedBtn = page.locator('button:has-text("Get Started")');
  if (await getStartedBtn.isVisible()) {
    await getStartedBtn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(artifactDir, 'ftue_step2_workspace.png'), fullPage: false });
  console.log('Saved ftue_step2_workspace.png');

  // Click "Save & Continue" to go to Step 3
  const saveStep2Btn = page.locator('button:has-text("Save & Continue")');
  if (await saveStep2Btn.isVisible()) {
    await saveStep2Btn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(artifactDir, 'ftue_step3_brand_kit.png'), fullPage: false });
  console.log('Saved ftue_step3_brand_kit.png');

  // Click "Save Brand Kit" to go to Step 4
  const saveStep3Btn = page.locator('button:has-text("Save Brand Kit")');
  if (await saveStep3Btn.isVisible()) {
    await saveStep3Btn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(artifactDir, 'ftue_step4_channels.png'), fullPage: false });
  console.log('Saved ftue_step4_channels.png');

  // Click "Continue" to go to Step 5
  const continueStep4Btn = page.locator('button:has-text("Continue")').last();
  if (await continueStep4Btn.isVisible()) {
    await continueStep4Btn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(artifactDir, 'ftue_step5_content_studio.png'), fullPage: false });
  console.log('Saved ftue_step5_content_studio.png');

  // Click "Continue to Scheduling" to go to Step 6
  const continueStep5Btn = page.locator('button:has-text("Continue to Scheduling")');
  if (await continueStep5Btn.isVisible()) {
    await continueStep5Btn.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(artifactDir, 'ftue_step6_schedule.png'), fullPage: false });
  console.log('Saved ftue_step6_schedule.png');

  // 3. Test Dashboard States
  console.log('Navigating to Dashboard...');
  await page.goto('http://localhost:5173/?tab=dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Switch to State 1: First-Time User
  const state1Btn = page.locator('button:has-text("1. First-Time")');
  if (await state1Btn.isVisible()) {
    await state1Btn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state1_first_time.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state1_first_time.png');
  }

  // Switch to State 2: Getting Started
  const state2Btn = page.locator('button:has-text("2. Getting Started")');
  if (await state2Btn.isVisible()) {
    await state2Btn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state2_getting_started.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state2_getting_started.png');
  }

  // Switch to State 3: Active User
  const state3Btn = page.locator('button:has-text("3. Active User")');
  if (await state3Btn.isVisible()) {
    await state3Btn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state3_active.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state3_active.png');
  }

  // 4. Test Analytics Onboarding Funnel View
  console.log('Navigating to Analytics...');
  await page.goto('http://localhost:5173/?tab=analytics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const funnelTabBtn = page.locator('button:has-text("Onboarding Funnel & Drop-Off")');
  if (await funnelTabBtn.isVisible()) {
    await funnelTabBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_analytics_onboarding_funnel.png'), fullPage: false });
    console.log('Saved ftue_analytics_onboarding_funnel.png');
  }

  await browser.close();
  console.log('All FTUE verification screenshots captured successfully!');
}

main().catch((err) => {
  console.error('FTUE verification failed:', err);
  process.exit(1);
});

