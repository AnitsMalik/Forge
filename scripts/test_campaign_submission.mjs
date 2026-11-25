import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

  // Open Campaign Wizard
  console.log('Opening Campaign Wizard...');
  const createBtn = page.locator('button:has-text("+ Create Campaign"), button:has-text("+ Create First Campaign")').first();
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(1000);

    // Step 1 -> Step 2
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(800);

    // Step 2 -> Step 3
    await page.locator('button:has-text("Continue to Step 3")').click();
    await page.waitForTimeout(800);

    // Step 3 -> Step 4
    await page.locator('button:has-text("Continue to Step 4")').click();
    await page.waitForTimeout(1000);

    // Step 4 -> Step 5
    await page.locator('button:has-text("Continue to Step 5")').click();
    await page.waitForTimeout(1000);

    console.log('On Step 5: Submitting campaign...');
    const launchBtn = page.locator('button:has-text("Launch Bulk Campaign Now")').first();
    if (await launchBtn.isVisible()) {
      await launchBtn.click();
      await page.waitForTimeout(5000);
    }

    const screenshotPath = path.join('C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917', 'verified_campaign_submission_final.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved final screenshot:', screenshotPath);
  }

  await browser.close();
  console.log('Test completed successfully!');
})();
