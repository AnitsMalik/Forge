import { test, expect } from '@playwright/test';

test.describe('Visitor Registration & Auth E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-bypass-rate-limit': 'test-runner' });
  });

  test('1. Visitor can toggle between Sign In and Create Agency modes', async ({ page }) => {
    await page.goto('/login');

    // Default mode is login
    await expect(page.locator('button:has-text("Sign In")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Create Agency")').first()).toBeVisible();

    // Click Create Agency tab
    await page.locator('button:has-text("Create Agency")').first().click();

    // Full name and agency inputs should now be visible
    await expect(page.locator('input[placeholder*="Sarah Connor"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Apex Agency"]')).toBeVisible();
  });

  test('2. Quick demo login successfully lands on dashboard and displays user profile', async ({ page }) => {
    await page.goto('/login');

    // Click Quick Demo Sign-in
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Wait for redirect to dashboard
    await page.waitForURL(/tab=dashboard/, { timeout: 15000 });

    // Verify dashboard welcome message or studio navigation
    await expect(page.locator('text=Studio').first()).toBeVisible({ timeout: 10000 });

    // Verify top-right user profile avatar
    const profileAvatar = page.locator('button').filter({ has: page.locator('.rounded-full, [style*="border-radius"]') }).first();
    await expect(profileAvatar).toBeVisible();
  });

  test('3. Direct /register route renders registration form cleanly', async ({ page }) => {
    await page.goto('/register');

    // Expect Create Agency form elements
    await expect(page.locator('button:has-text("Create Agency")').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Sarah Connor"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Apex Agency"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

});
