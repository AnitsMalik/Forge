import { chromium } from 'playwright';
import path from 'path';

async function runResponsive() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917';

  // Helper for a single viewport
  async function testViewport(width, height, name) {
    console.log(`Testing ${name} (${width}x${height})...`);
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();

    // 1. Login
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('text=1-Click Demo Login');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(2500);
    }

    // On mobile/tablet, open sidebar if collapsed
    const emailNav = page.locator('text=Email Marketing').first();
    if (!(await emailNav.isVisible())) {
      const toggleBtn = page.locator('button[aria-label="Toggle sidebar"]');
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
        await page.waitForTimeout(600);
      }
    }

    await emailNav.click();
    await page.waitForTimeout(2000);

    const section = page.locator('text=Connect Your Email Service');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const sesCard = page.locator('.email-provider-card:has-text("Amazon SES")');
    await sesCard.locator('button:has-text("Connect")').click();
    await page.waitForTimeout(800);

    const filename = `drawer_${name}_${width}px.png`;
    await page.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Successfully saved ${filename}`);

    await context.close();
  }

  await testViewport(375, 812, 'mobile');

  await browser.close();
  console.log('All responsive tests completed!');
}

runResponsive().catch((err) => {
  console.error('Responsive test error:', err);
  process.exit(1);
});
