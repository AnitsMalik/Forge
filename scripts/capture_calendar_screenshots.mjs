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
  console.log('Logged in successfully, navigating to Calendar tab...');

  // Navigate to Calendar via URL query param
  await page.goto('http://localhost:5173/?tab=calendar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // If not on calendar, click sidebar calendar button
  const calendarNav = await page.$('button:has-text("Calendar"), a:has-text("Calendar"), [data-tab="calendar"]');
  if (calendarNav) {
    await calendarNav.click();
    await page.waitForTimeout(2000);
  }

  // 1. Monthly Calendar View
  console.log('Capturing Monthly Calendar View...');
  await page.screenshot({
    path: path.join(screenshotDir, 'calendar_monthly_view.png'),
    fullPage: false,
  });

  // 2. Weekly Calendar View
  console.log('Switching to Weekly View...');
  const weekBtn = await page.$('button.calendar-view-btn:has-text("Week")');
  if (weekBtn) {
    await weekBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'calendar_weekly_view.png'),
      fullPage: false,
    });
  }

  // 3. Daily Calendar View
  console.log('Switching to Daily View...');
  const dayBtn = await page.$('button.calendar-view-btn:has-text("Day")');
  if (dayBtn) {
    await dayBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'calendar_daily_view.png'),
      fullPage: false,
    });
  }

  // 4. List / Publishing Queue View
  console.log('Switching to Publishing Queue List View...');
  const listBtn = await page.$('button.calendar-view-btn:has-text("Queue"), button.calendar-view-btn:has-text("List")');
  if (listBtn) {
    await listBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'calendar_publishing_queue_view.png'),
      fullPage: false,
    });
  }

  // 5. Post Detail / Reschedule Modal
  console.log('Opening Post Details modal...');
  // Switch back to month view
  const monthBtn = await page.$('button.calendar-view-btn:has-text("Month")');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click on a post card or post chip
  const postItem = await page.$('.calendar-post-chip, .calendar-post-card, [data-post-id]');
  if (postItem) {
    await postItem.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotDir, 'calendar_post_detail_modal.png'),
      fullPage: false,
    });
  }

  console.log('All screenshots captured successfully!');
  await browser.close();
}

captureScreenshots().catch(console.error);
