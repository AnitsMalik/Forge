import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Verifying Content Studio reduced and colorful tabs...');
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

  // 1. Stage 1 View (Light Mode)
  await page.screenshot({
    path: path.join(artifactDir, 'content_studio_tabs_stage1_light.png'),
    fullPage: false
  });
  console.log('Saved content_studio_tabs_stage1_light.png');

  // 2. Stage 3 (Multichannel) View - Shows both Stepper tabs + Platform Channel tabs + Device mockup tabs
  const step3Btn = page.locator('button.cs-step-btn:has-text("Multichannel")');
  if (await step3Btn.isVisible()) {
    console.log('Clicking Step 3 Multichannel...');
    await step3Btn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(artifactDir, 'content_studio_tabs_stage3_multichannel_light.png'),
      fullPage: false
    });
    console.log('Saved content_studio_tabs_stage3_multichannel_light.png');

    // Also click Instagram channel tab to showcase Instagram gradient active state
    const igTab = page.locator('.cs-channel-tab.channel-instagram');
    if (await igTab.isVisible()) {
      await igTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(artifactDir, 'content_studio_tabs_instagram_active.png'),
        fullPage: false
      });
      console.log('Saved content_studio_tabs_instagram_active.png');
    }
  }

  // 3. Switch to Dark Mode
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(artifactDir, 'content_studio_tabs_stage3_dark.png'),
    fullPage: false
  });
  console.log('Saved content_studio_tabs_stage3_dark.png');

  await browser.close();
  console.log('All verification captures completed successfully!');
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
