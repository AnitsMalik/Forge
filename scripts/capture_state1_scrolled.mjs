import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.goto('http://localhost:5173/?tab=dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const btn1 = page.locator('button:has-text("1. First-Time")');
  if (await btn1.isVisible()) {
    await btn1.click();
    await page.waitForTimeout(600);
  }

  // Capture full page
  await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state1_fullpage.png'), fullPage: true });
  console.log('Saved ftue_dashboard_state1_fullpage.png');

  // Scroll to AI assistant
  const aiWidget = page.locator('text=AI Marketing Assistant').first();
  if (await aiWidget.isVisible()) {
    await aiWidget.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'ftue_dashboard_state1_ai_assistant.png'), fullPage: false });
    console.log('Saved ftue_dashboard_state1_ai_assistant.png');
  }

  await browser.close();
}

main().catch(console.error);

