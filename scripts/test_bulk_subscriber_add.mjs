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

  // Switch to Audience & Leads tab
  console.log('Switching to Audience & Leads tab...');
  const audienceTab = page.locator('button:has-text("Audience & Leads")');
  await audienceTab.click();
  await page.waitForTimeout(1500);

  // Click Add Subscriber button
  console.log('Opening Add Subscriber modal...');
  const addBtn = page.locator('button:has-text("Add Subscriber")').first();
  await addBtn.click();
  await page.waitForTimeout(1000);

  // Click Bulk Paste toggle
  console.log('Switching to Bulk Paste mode...');
  const bulkToggle = page.locator('button:has-text("Bulk Paste")');
  await bulkToggle.click();
  await page.waitForTimeout(500);

  // Paste multiple emails
  const bulkTextarea = page.locator('textarea[placeholder*="hoasptech@gmail.com"]');
  await bulkTextarea.fill('hoasptech@gmail.com\nElena Rostova <elena@acme.com>\ndeveloper@socialforge.ai\nSarah Connor <sarah@cybertech.org>');
  await page.waitForTimeout(600);

  // Capture modal with bulk emails
  const screenshotPath1 = path.join('C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917', 'verified_bulk_subscribers_modal.png');
  await page.screenshot({ path: screenshotPath1, fullPage: false });
  console.log('Saved modal screenshot:', screenshotPath1);

  // Click Add Subscribers button
  console.log('Submitting bulk subscribers...');
  const submitBtn = page.locator('button:has-text("Add 4 Subscribers")');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  // Capture updated audience table
  const screenshotPath2 = path.join('C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917', 'verified_bulk_subscribers_table.png');
  await page.screenshot({ path: screenshotPath2, fullPage: false });
  console.log('Saved table screenshot:', screenshotPath2);

  await browser.close();
  console.log('Bulk subscriber test completed successfully!');
})();

