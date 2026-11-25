import { test, expect } from '@playwright/test';

test.describe('Public Marketing Website E2E Tests', () => {

  test('1. Homepage loads hero, capability cards, and workflow pipeline', async ({ page }) => {
    await page.goto('/');

    // Check title and navbar
    await expect(page).toHaveTitle(/Your AI Social Marketing Team — SocialForge/);
    const navLogo = page.locator('text=SocialForge').first();
    await expect(navLogo).toBeVisible();

    // Check Hero Section
    const headline = page.locator('h1').first();
    await expect(headline).toContainText('Your AI Social Marketing Team');
    await expect(headline).toContainText('One Intelligent Platform');

    // Check CTA buttons
    const getStartedBtn = page.locator('a:has-text("Get Started Free")').first();
    await expect(getStartedBtn).toBeVisible();
    const exploreFeaturesBtn = page.locator('a:has-text("Explore Features")').first();
    await expect(exploreFeaturesBtn).toBeVisible();

    // Check Section 2: Core Features
    await expect(page.locator('text=Everything You Need to Grow on Social')).toBeVisible();
    await expect(page.locator('text=AI Content Creation').first()).toBeVisible();
    await expect(page.locator('text=Social Account Management').first()).toBeVisible();
    await expect(page.locator('text=Smart Scheduling').first()).toBeVisible();
    await expect(page.locator('text=Brand & Template Tools').first()).toBeVisible();
    await expect(page.locator('text=Analytics & Insights').first()).toBeVisible();
    await expect(page.locator('text=Marketing Automation').first()).toBeVisible();

    // Check Section 3: How It Works (3 Steps)
    await expect(page.locator('text=From Idea to Published in Three Simple Steps')).toBeVisible();
    await expect(page.locator('text=Connect').first()).toBeVisible();
    await expect(page.locator('text=Publish & Optimize').first()).toBeVisible();

    // Check Section 4: AI Agent Showcase
    await expect(page.locator('text=Meet Your AI Social Agent')).toBeVisible();
    await expect(page.locator('text=Explore the AI Agent').first()).toBeVisible();

    // Check Section 5: Ready to Make Social Marketing Smarter & Trust Strip
    await expect(page.locator('text=Ready to Make Social Marketing Smarter?')).toBeVisible();
    await expect(page.locator('text=Human approval workflows')).toBeVisible();
    await expect(page.locator('text=Privacy and data protection')).toBeVisible();

    // Check Footer with status indicator
    await expect(page.locator('text=All Systems Operational')).toBeVisible();
  });

  test('2. Pricing page toggles monthly/annual and verifies plan limits', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page).toHaveTitle(/Pricing & Subscription Plans — SocialForge/);
    await expect(page.locator('h1')).toContainText('Creators & Agencies');

    // Check initial monthly prices
    const starterPrice = page.locator('.pricing-card:has-text("Starter")').locator('text=$29').first();
    await expect(starterPrice).toBeVisible();

    const growthPrice = page.locator('.pricing-card:has-text("Growth")').locator('text=$79').first();
    await expect(growthPrice).toBeVisible();

    // Toggle to Annual Billing (20% discount)
    const annualBtn = page.locator('button:has-text("Annual Billing")');
    await annualBtn.click();

    // Verify discounted annual prices appear
    await expect(page.locator('.pricing-card:has-text("Starter")').locator('text=$24').first()).toBeVisible();
    await expect(page.locator('.pricing-card:has-text("Growth")').locator('text=$65').first()).toBeVisible();

    // Check Feature-by-Feature table
    await expect(page.locator('text=Feature-by-Feature Comparison')).toBeVisible();
    await expect(page.locator('text=Monthly AI Generation Credits')).toBeVisible();

    // Expand FAQ
    const faqQuestion = page.locator('text=How does the 14-day free trial work?');
    await expect(faqQuestion).toBeVisible();
  });

  test('3. Social Agent architecture page renders interactive workflow stepper', async ({ page }) => {
    await page.goto('/social-agent');

    await expect(page).toHaveTitle(/Autonomous Social Marketing Agent Architecture — SocialForge/);
    await expect(page.locator('h1')).toContainText('Social Marketing Agent');
    await expect(page.locator('text=Create branded content, manage campaigns')).toBeVisible();

    // Verify consolidated feature section
    await expect(page.locator('text=Everything Your Social Marketing Workflow Needs')).toBeVisible();
    await expect(page.locator('h3:has-text("AI Content Creation")')).toBeVisible();
    await expect(page.locator('h3:has-text("Campaign Planning & Scheduling")')).toBeVisible();
    await expect(page.locator('h3:has-text("Brand & Creative Tools")')).toBeVisible();
    await expect(page.locator('h3:has-text("Analytics & Optimization")')).toBeVisible();

    // Interactive 4-Stage Workflow Stepper
    await expect(page.locator('text=Interactive Workflow: From Business Data to Live Social Content')).toBeVisible();
    const stage3Btn = page.locator('button[role="tab"]:has-text("Review")');
    await expect(stage3Btn).toBeVisible();
    await stage3Btn.click();
    await expect(page.locator('text=STAGE 3 OF 4')).toBeVisible();
    await expect(page.locator('h3:has-text("Human Review & Approval")')).toBeVisible();

    // Toggle Technical Payload JSON
    const payloadBtn = page.locator('button:has-text("Show Technical Payload")');
    if (await payloadBtn.isVisible()) {
      await payloadBtn.click();
      await expect(page.locator('text=Normalized JSON Payload')).toBeVisible();
    }

    // Security and Human Oversight
    await expect(page.locator('text=Security and Human Oversight')).toBeVisible();
    await expect(page.locator('h3:has-text("Access Control")')).toBeVisible();
    await expect(page.locator('h3:has-text("Credential Protection")')).toBeVisible();
    await expect(page.locator('h3:has-text("Human Approval")')).toBeVisible();
    await expect(page.locator('h3:has-text("Auditability")')).toBeVisible();

    // FAQ Accordion
    const faqItem = page.locator('text=What can the SocialForge AI Agent do?');
    await expect(faqItem).toBeVisible();
    await faqItem.click();
    await expect(page.locator('text=intelligent marketing team member')).toBeVisible();

    // Final CTA
    await expect(page.locator('text=Ready to Simplify Your Social Marketing?')).toBeVisible();
  });

  test('4. Resources page filters guides and search queries', async ({ page }) => {
    await page.goto('/resources');

    await expect(page).toHaveTitle(/Resources, Guides & Documentation — SocialForge/);
    await expect(page.locator('h1')).toContainText('Resources, Guides & Architecture Docs');

    // Search filter interaction
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Meta');

    // Expect Meta connection guide to remain visible
    await expect(page.locator('text=Connecting Meta Facebook & Instagram in 5 Minutes')).toBeVisible();
  });

  test('5. Terms of Service page renders interactive fixed menu, active highlight, single answer display, and responsive layout', async ({ page }) => {
    // Desktop Viewport Test
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/terms');

    await expect(page).toHaveTitle(/Terms of Service — SocialForge/);
    const heading = page.locator('h1').first();
    await expect(heading).toContainText('Terms of Service');

    // Verify desktop reading card width accommodates split-grid layout (between 800px and 1240px)
    const card = page.locator('.legal-document-card');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(800);
      expect(box.width).toBeLessThanOrEqual(1240);
    }

    // Verify body font-size is within 15px - 16px
    const bodyP = page.locator('.legal-body-text').first();
    const fontSize = await bodyP.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(['15px', '16px']).toContain(fontSize);

    // Initial state: Section 1 tab is highlighted and Section 1 answer is visible
    const tab1 = page.locator('#tab-section-1');
    await expect(tab1).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#section-1')).toBeVisible();

    // Click Section 3 menu item
    const tab3 = page.locator('#tab-section-3');
    await tab3.click();

    // Verify Section 3 menu is now highlighted and ONLY Section 3 answer is displayed
    await expect(tab3).toHaveAttribute('aria-selected', 'true');
    await expect(tab1).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#section-3')).toBeVisible();
    await expect(page.locator('#section-1')).not.toBeVisible();

    // Click Next button to navigate to Section 4
    const nextBtn = page.locator('button:has-text("Next: Content & IP Ownership")');
    await nextBtn.click();
    await expect(page.locator('#tab-section-4')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#section-4')).toBeVisible();

    // Verify Mobile Viewport Test
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/terms');

    // Ensure no horizontal scrollbar/overflow on mobile
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalOverflow).toBe(false);

    // Verify active answer card is visible on mobile
    await expect(page.locator('#section-1')).toBeVisible();
  });

});

