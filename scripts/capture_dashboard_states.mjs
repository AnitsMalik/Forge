import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2500);
  }

  // Navigate to Dashboard
  console.log('Navigating to dashboard...');
  const dashNav = page.locator('button:has-text("Dashboard")').first();
  if (await dashNav.isVisible()) {
    await dashNav.click();
  } else {
    await page.goto('http://localhost:5173/?tab=dashboard', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());
  const bodyText = await page.innerText('body');
  console.log('Body text sample:', bodyText.substring(0, 300).replace(/\n+/g, ' '));
  await page.screenshot({ path: path.join(artifactDir, 'current_after_login.png') });

  // Check buttons on page
  const btn1 = page.locator('button:has-text("1. First-Time")');
  console.log('btn1 visible:', await btn1.isVisible());
  if (await btn1.isVisible()) {
    await btn1.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state1_first_time.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state1_first_time.png');
  }

  const btn2 = page.locator('button:has-text("2. Getting Started")');
  console.log('btn2 visible:', await btn2.isVisible());
  if (await btn2.isVisible()) {
    await btn2.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state2_getting_started.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state2_getting_started.png');
  }

  const btn3 = page.locator('button:has-text("3. Active User")');
  console.log('btn3 visible:', await btn3.isVisible());
  if (await btn3.isVisible()) {
    await btn3.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state3_active.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state3_active.png');
  }

  await browser.close();
}

main().catch(console.error);
