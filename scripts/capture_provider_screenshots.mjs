import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 1440, height: 900, name: '1440px' },
    { width: 1024, height: 800, name: '1024px' },
    { width: 768, height: 1024, name: '768px' },
    { width: 375, height: 812, name: '375px' },
  ];

  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917';

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // 1. Go to login
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);

    // 2. Click 1-Click Demo Login if present
    const demoBtn = page.locator('text=1-Click Demo Login');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForURL('**/?*', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 3. Click Email Marketing in sidebar or navigate directly
    const emailNav = page.locator('a[href="/email"], button:has-text("Email Marketing")').first();
    if (await emailNav.isVisible()) {
      await emailNav.click();
    } else {
      await page.goto('http://localhost:5173/email', { waitUntil: 'networkidle' }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    // 4. Scroll to Connect Your Email Service section
    const section = page.locator('text=Connect Your Email Service');
    if (await section.isVisible()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    }

    const screenshotPath = path.join(artifactDir, `email_provider_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved screenshot for ${vp.name} to ${screenshotPath}`);

    await context.close();
  }

  await browser.close();
}

capture().catch((err) => {
  console.error('Playwright error:', err);
  process.exit(1);
});
