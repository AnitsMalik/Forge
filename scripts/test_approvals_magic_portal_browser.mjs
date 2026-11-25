import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const SCREENSHOTS_DIR = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runBrowserAudit() {
  console.log('--- Starting Playwright UI/UX Audit for Approvals & Magic Portal ---');

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });

  const tenantId = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108'; // HOASP International

  // Ensure an active pending post and approval exists for visual rendering in the UI
  const testPostId = 'post-ui-appr-' + crypto.randomUUID().slice(0, 8);
  const testApprId = 'appr-ui-' + crypto.randomUUID().slice(0, 8);
  const magicToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);

  await conn.query(
    `INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, scheduled_for, created_at, updated_at)
     VALUES (?, ?, ?, 'a58ee49d-5d31-4135-817a-132e7cea5fe9', 'Aurora Borealis Winter Campaign 2026',
     'Unveiling the all-new Aurora Collection. Certified sustainable luxury, designed to withstand the arctic winter while maintaining flawless aesthetic balance. #Aurora2026 #SustainableLuxury',
     'in_review', DATE_ADD(NOW(), INTERVAL 3 DAY), NOW(), NOW())`,
    [testPostId, tenantId, brandId]
  );

  await conn.query(
    `INSERT INTO post_variants (id, post_id, platform, content, status, media_asset_ids, platform_specific_config, created_at, updated_at)
     VALUES ('var-ui-ig-1', ?, 'instagram', '✨ Step into timeless Nordic minimalism with the Aurora Collection. Handcrafted from 100% recycled titanium. Tap link in bio to pre-order.', 'draft', '[]', ?, NOW(), NOW())`,
    [
      testPostId,
      JSON.stringify({
        aspectRatio: '4:5',
        mediaUrls: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1080&q=80'],
      }),
    ]
  );

  await conn.query(
    `INSERT INTO post_variants (id, post_id, platform, content, status, media_asset_ids, platform_specific_config, created_at, updated_at)
     VALUES ('var-ui-fb-1', ?, 'facebook', 'Introducing Aurora Borealis 2026: The intersection of sustainable design and luxury performance. Discover the full lookbook today.', 'draft', '[]', ?, NOW(), NOW())`,
    [
      testPostId,
      JSON.stringify({
        aspectRatio: '16:9',
        mediaUrls: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'],
      }),
    ]
  );

  await conn.query(
    `INSERT INTO approval_requests (id, tenant_id, brand_id, post_id, entity_type, entity_id, requested_by, status, magic_token, magic_token_expires_at, expires_at, metadata, created_at)
     VALUES (?, ?, ?, ?, 'post', ?, 'a58ee49d-5d31-4135-817a-132e7cea5fe9', 'pending', ?, ?, ?, ?, NOW())`,
    [
      testApprId,
      tenantId,
      brandId,
      testPostId,
      testPostId,
      magicToken,
      expiresAt,
      expiresAt,
      JSON.stringify({
        brandName: 'HOASP International',
        caption: 'Unveiling the all-new Aurora Collection. Certified sustainable luxury.',
        platforms: ['instagram', 'facebook'],
      }),
    ]
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Log in to Web App
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'sarah@apex.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 2. Navigate to Approvals Page
    console.log('2. Navigating to Approvals page...');
    await page.goto('http://localhost:5173/approvals', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'approvals_audit_queue.png'),
      fullPage: true,
    });
    console.log('  -> Saved approvals_audit_queue.png');

    // 3. Click Preview Button on the approval card
    console.log('3. Opening approval preview modal...');
    const previewBtn = await page.$('button:has-text("Preview"), button:has-text("Inspect")');
    if (previewBtn) {
      await previewBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'approvals_audit_preview_drawer.png'),
      });
      console.log('  -> Saved approvals_audit_preview_drawer.png');

      // Close preview modal / drawer
      const closeBtn = await page.$('button:has-text("Close"), button[aria-label="Close"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Navigate to "Resolved" tab
    console.log('4. Navigating to Resolved approvals tab...');
    const resolvedTab = await page.$('button:has-text("Resolved"), [role="tab"]:has-text("Resolved")');
    if (resolvedTab) {
      await resolvedTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'approvals_audit_resolved.png'),
        fullPage: true,
      });
      console.log('  -> Saved approvals_audit_resolved.png');
    }

    // 5. Navigate to "Governance Audit" tab
    console.log('5. Navigating to Audit Log tab...');
    const auditTab = await page.$('button:has-text("Audit"), [role="tab"]:has-text("Audit")');
    if (auditTab) {
      await auditTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'approvals_audit_governance_log.png'),
        fullPage: true,
      });
      console.log('  -> Saved approvals_audit_governance_log.png');
    }

    // 6. Navigate to "Magic Review Links" tab
    console.log('6. Navigating to Magic Review Links tab...');
    const linksTab = await page.$('button:has-text("Magic Review"), button:has-text("Review Links"), [role="tab"]:has-text("Links")');
    if (linksTab) {
      await linksTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'approvals_audit_magic_links_tab.png'),
        fullPage: true,
      });
      console.log('  -> Saved approvals_audit_magic_links_tab.png');
    }

    // 7. Open Public Magic Review Portal (Passwordless Incognito Client Experience)
    console.log('7. Opening Passwordless Client Magic Review Portal...');
    const clientContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
    });
    const clientPage = await clientContext.newPage();
    await clientPage.goto(`http://localhost:5173/review/${magicToken}`, { waitUntil: 'networkidle' });
    await clientPage.waitForTimeout(1500);

    await clientPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'magic_portal_client_view.png'),
      fullPage: true,
    });
    console.log('  -> Saved magic_portal_client_view.png');

    // 8. Client performs interactive feedback: selects preset & requests changes
    console.log('8. Client interacts with preset and submits revision feedback...');
    const presetBtn = await clientPage.$('button:has-text("Please swap the promo discount code")');
    if (presetBtn) {
      await presetBtn.click();
      await clientPage.waitForTimeout(500);
    }

    await clientPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'magic_portal_feedback_interaction.png'),
    });
    console.log('  -> Saved magic_portal_feedback_interaction.png');

    // Submit changes
    const submitBtn = await clientPage.$('button:has-text("Request Changes")');
    if (submitBtn) {
      await submitBtn.click();
      await clientPage.waitForTimeout(2000);
      await clientPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'magic_portal_action_completed.png'),
        fullPage: true,
      });
      console.log('  -> Saved magic_portal_action_completed.png');
    }

    await clientContext.close();
  } finally {
    // Cleanup temporary UI fixtures
    await conn.query('DELETE FROM approval_comments WHERE approval_request_id = ?', [testApprId]);
    await conn.query('DELETE FROM approval_requests WHERE id = ?', [testApprId]);
    await conn.query('DELETE FROM post_variants WHERE post_id = ?', [testPostId]);
    await conn.query('DELETE FROM posts WHERE id = ?', [testPostId]);
    await conn.end();
    await browser.close();
  }

  console.log('--- Playwright UI/UX Audit for Approvals & Magic Portal Completed ---');
}

runBrowserAudit().catch((err) => {
  console.error('Playwright Browser Audit Error:', err);
  process.exit(1);
});
