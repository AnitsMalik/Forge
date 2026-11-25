const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testCompareTable() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const artifactDir = 'C:\\Users\\Anit Malik\\.gemini\\antigravity\\brain\\7998be08-bfdd-4a01-a9eb-e19b8ed7f917';

  console.log('1. Navigating to public pricing page...');
  await page.goto('http://localhost:5173/pricing', { waitUntil: 'networkidle' });

  // Locate the compare table
  const compareTable = page.locator('#compare-table');
  await compareTable.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✓ Compare table found and visible!');

  // Scroll to compare table
  await compareTable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Take screenshot of compare table in initial state (Monthly)
  await compareTable.screenshot({
    path: path.join(artifactDir, 'compare_table_initial_monthly.png'),
  });
  console.log('✓ Captured compare_table_initial_monthly.png');

  // Verify search bar works
  console.log('2. Testing interactive search filter...');
  const searchInput = page.locator('.plan-compare-search-input');
  await searchInput.fill('video');
  await page.waitForTimeout(500);

  const resultsCount = await page.locator('.plan-compare-results-count').textContent();
  console.log('Results count with "video":', resultsCount);

  // Take screenshot of filtered search state
  await compareTable.screenshot({
    path: path.join(artifactDir, 'compare_table_search_video.png'),
  });
  console.log('✓ Captured compare_table_search_video.png');

  // Clear search
  const clearBtn = page.locator('.plan-compare-search-clear');
  await clearBtn.click();
  await page.waitForTimeout(500);
  const clearedCount = await page.locator('.plan-compare-results-count').textContent();
  console.log('Results count after clearing:', clearedCount);

  // Test Annual toggle
  console.log('3. Testing annual toggle on pricing page...');
  const annualToggle = page.locator('button.pricing-toggle-btn', { hasText: 'Annual Billing' });
  await annualToggle.click();
  await page.waitForTimeout(500);

  await compareTable.screenshot({
    path: path.join(artifactDir, 'compare_table_annual_pricing.png'),
  });
  console.log('✓ Captured compare_table_annual_pricing.png');

  // 4. Test authenticated billing page
  console.log('4. Testing authenticated billing page...');
  // Log in
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@brand1.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log('URL after login:', page.url());

  // Navigate directly to billing
  console.log('Navigating to billing...');
  await page.goto('http://localhost:5173/?tab=billing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Billing page loaded, current URL:', page.url());

  const billingCompareTable = page.locator('#compare-table');
  await billingCompareTable.waitFor({ state: 'visible', timeout: 10000 });
  await billingCompareTable.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Take screenshot in authenticated billing dashboard
  await billingCompareTable.screenshot({
    path: path.join(artifactDir, 'compare_table_authenticated_billing.png'),
  });
  console.log('✓ Captured compare_table_authenticated_billing.png');

  // Also take full dashboard screenshot showing cards + compare table
  await page.screenshot({
    path: path.join(artifactDir, 'billing_dashboard_with_compare_table.png'),
    fullPage: false,
  });
  console.log('✓ Captured billing_dashboard_with_compare_table.png');

  await browser.close();
  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
}

testCompareTable().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
