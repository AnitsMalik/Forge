import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  console.log('Navigating to Email Marketing...');
  const emailNav = page.locator('text=Email Marketing').first();
  await emailNav.click();
  await page.waitForTimeout(3000);

  // Take screenshot of connected dashboard & provider cards
  const screenshotPath1 = path.join('C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917', 'verified_connected_dashboard.png');
  await page.screenshot({ path: screenshotPath1, fullPage: false });
  console.log('Saved screenshot 1:', screenshotPath1);

  // Open Campaign Wizard and jump to Step 4
  console.log('Opening Campaign Wizard...');
  const createBtn = page.locator('button:has-text("+ Create Campaign"), button:has-text("+ Create First Campaign")').first();
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(1000);

    // Step 1 -> Step 2
    const step2Btn = page.locator('button:has-text("Continue to Step 2")');
    if (await step2Btn.isVisible()) {
      await step2Btn.click();
      await page.waitForTimeout(800);
    }

    // Step 2 -> Step 3
    const step3Btn = page.locator('button:has-text("Continue to Step 3")');
    if (await step3Btn.isVisible()) {
      await step3Btn.click();
      await page.waitForTimeout(800);
    }

    // Step 3 -> Step 4
    const step4Btn = page.locator('button:has-text("Continue to Step 4")');
    if (await step4Btn.isVisible()) {
      await step4Btn.click();
      await page.waitForTimeout(1500);
    }

    // Now on Step 4: Preview & Test
    console.log('On Step 4: Testing preview and bulk emails...');

    // Type bulk emails into test email input
    const testInput = page.locator('input[placeholder*="Enter test recipient email"]');
    if (await testInput.isVisible()) {
      await testInput.fill('hoasptech@gmail.com, test.team@socialforge.ai, founder@brand.io');
      await page.waitForTimeout(800);
    }

    // Capture Step 4 preview screenshot
    const screenshotPath2 = path.join('C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917', 'verified_step4_preview_bulk.png');
    await page.screenshot({ path: screenshotPath2, fullPage: false });
    console.log('Saved screenshot 2:', screenshotPath2);
  } else {
    console.warn('Could not find create campaign button');
  }

  await browser.close();
  console.log('Verification script completed successfully!');
})();
