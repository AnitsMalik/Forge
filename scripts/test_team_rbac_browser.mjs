import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const SCREENSHOTS_DIR = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runBrowserTeamAudit() {
  console.log('--- Starting Playwright UI/UX Audit for Team & Workspace Governance ---');

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });

  const tenantId = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';

  // Seed two additional active team members and a pending invite for rich visual UI verification
  const u1Id = 'u-ui-team-1-' + crypto.randomUUID().slice(0, 8);
  const u2Id = 'u-ui-team-2-' + crypto.randomUUID().slice(0, 8);
  const inviteId = 'inv-ui-team-' + crypto.randomUUID().slice(0, 8);
  const inviteToken = crypto.randomBytes(32).toString('hex');

  await conn.query(
    'INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
    [u1Id, 'elena.rodriguez@apexdigital.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Elena Rodriguez']
  );
  await conn.query(
    'INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [crypto.randomUUID(), tenantId, u1Id, 'editor']
  );

  await conn.query(
    'INSERT INTO users (id, email, password_hash, full_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
    [u2Id, 'marcus.vance@brandclient.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Marcus Vance']
  );
  await conn.query(
    'INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [crypto.randomUUID(), tenantId, u2Id, 'client_approver']
  );

  await conn.query(
    `INSERT INTO workspace_invites (id, tenant_id, email, role, token, invited_by_user_id, status, expires_at, created_at, updated_at)
     VALUES (?, ?, 'claire.compliance@apexpartners.com', 'admin', ?, 'a58ee49d-5d31-4135-817a-132e7cea5fe9', 'pending', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW())`,
    [inviteId, tenantId, inviteToken]
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Log in
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'sarah@apex.com');
    await page.fill('input[type="password"], input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 2. Navigate to Team & Workspace Management Page
    console.log('2. Navigating to Team page...');
    await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'team_audit_dashboard.png'),
      fullPage: true,
    });
    console.log('  -> Saved team_audit_dashboard.png');

    // 3. Open Invite Member Modal
    console.log('3. Opening Invite Member modal...');
    const inviteBtn = await page.$('button:has-text("Invite Member")');
    if (inviteBtn) {
      await inviteBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'team_audit_invite_modal.png'),
      });
      console.log('  -> Saved team_audit_invite_modal.png');

      // Fill in invite form
      await page.fill('input[type="email"]', 'dev.lead@socialforge.io');
      await page.selectOption('select', 'admin');
      await page.waitForTimeout(400);

      // Submit invite
      const sendBtn = await page.$('button:has-text("Send Invitation")');
      if (sendBtn) {
        await sendBtn.click();
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'team_audit_invite_generated.png'),
        });
        console.log('  -> Saved team_audit_invite_generated.png');
      }

      // Close modal
      const closeBtn = await page.$('button:has-text("Done"), button:has-text("Close"), button[aria-label="Close"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Trigger Member Removal Confirmation Modal
    console.log('4. Triggering member remove confirmation dialog...');
    const removeBtns = await page.$$('button:has-text("Remove")');
    if (removeBtns.length > 0) {
      await removeBtns[0].click();
      await page.waitForTimeout(600);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'team_audit_remove_confirm_modal.png'),
      });
      console.log('  -> Saved team_audit_remove_confirm_modal.png');

      // Cancel removal modal
      const cancelBtn = await page.$('button:has-text("Cancel")');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // 5. Mobile Viewport Audit (390px)
    console.log('5. Auditing mobile responsive layout (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'team_audit_mobile_390px.png'),
      fullPage: true,
    });
    console.log('  -> Saved team_audit_mobile_390px.png');

  } finally {
    // Cleanup temporary visual fixtures
    await conn.query('DELETE FROM workspace_invites WHERE id = ? OR email = ?', [inviteId, 'dev.lead@socialforge.io']);
    await conn.query('DELETE FROM tenant_users WHERE user_id IN (?, ?)', [u1Id, u2Id]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?)', [u1Id, u2Id]);
    await conn.end();
    await browser.close();
  }

  console.log('--- Playwright UI/UX Audit for Team & Workspace Governance Completed ---');
}

runBrowserTeamAudit().catch((err) => {
  console.error('Playwright Browser Team Audit Error:', err);
  process.exit(1);
});
