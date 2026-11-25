import { chromium } from 'playwright';
import path from 'path';

async function testClick() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917';

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Go to /email
  const emailNav = page.locator('text=Email Marketing').first();
  await emailNav.click();
  await page.waitForTimeout(2000);

  // 3. Scroll to Connect Your Email Service section
  const section = page.locator('text=Connect Your Email Service');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // 4. Click Connect on Amazon SES card
  const sesCard = page.locator('.email-provider-card:has-text("Amazon SES")');
  const connectBtn = sesCard.locator('button:has-text("Connect")');
  await connectBtn.click();
  await page.waitForTimeout(1000);

  // 5. Screenshot after clicking connect
  const screenshotPath = path.join(artifactDir, 'drawer_opened_ses.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved screenshot after clicking connect to ${screenshotPath}`);

  await browser.close();
}

testClick().catch((err) => {
  console.error('Click error:', err);
  process.exit(1);
});

