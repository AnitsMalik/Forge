import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function captureScreenshots() {
  const screenshotDir = path.resolve('C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

  // Log in
  await page.fill('input[type="email"]', 'sarah@apex.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  console.log('Logged in successfully, navigating to Media Library...');

  // Navigate to Media Library tab
  await page.goto('http://localhost:5173/?tab=media', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // If not on media, click sidebar button
  const mediaNav = await page.$('button:has-text("Media Library"), a:has-text("Media Library"), [data-tab="media"]');
  if (mediaNav) {
    await mediaNav.click();
    await page.waitForTimeout(2000);
  }

  // 1. Grid View with Storage Quota Banner
  console.log('Capturing Media Library Grid View...');
  await page.screenshot({
    path: path.join(screenshotDir, 'media_library_grid_view.png'),
    fullPage: false,
  });

  // 2. List View Table
  console.log('Switching to List View...');
  const listBtn = await page.$('button[title="List View"]');
  if (listBtn) {
    await listBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'media_library_list_view.png'),
      fullPage: false,
    });
  }

  // 3. Bulk Selection & Floating Bar
  console.log('Selecting multiple assets for bulk action bar...');
  const checkboxes = await page.$$('.ml-list-table tbody input[type="checkbox"]');
  if (checkboxes.length >= 2) {
    await checkboxes[0].click();
    await checkboxes[1].click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(screenshotDir, 'media_library_bulk_selection.png'),
      fullPage: false,
    });
  }

  // Switch back to grid
  const gridBtn = await page.$('button[title="Grid View"]');
  if (gridBtn) {
    await gridBtn.click();
    await page.waitForTimeout(1000);
  }

  // 4. Asset Details & Preview Modal
  console.log('Opening Asset Details & Preview Modal...');
  const previewEyeBtn = await page.$('.ml-card button[title="Preview asset details"]');
  if (previewEyeBtn) {
    await previewEyeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'media_library_preview_modal.png'),
      fullPage: false,
    });
    // Close preview modal
    const closeBtn = await page.$('.modal-dialog button.modal-close');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(800);
    }
  }

  // 5. Organize Folder & Tags Modal
  console.log('Opening Organize Folder & Tags Modal...');
  const organizeBtn = await page.$('.ml-card button[title="Organize: Folder & Tags"]');
  if (organizeBtn) {
    await organizeBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'media_library_organize_modal.png'),
      fullPage: false,
    });
    const cancelBtn = await page.$('button:has-text("Cancel")');
    if (cancelBtn) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  }

  await browser.close();
  console.log('All Media Library screenshots captured successfully!');
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
