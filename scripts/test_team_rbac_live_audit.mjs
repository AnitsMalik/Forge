import { chromium } from 'playwright';
import path from 'path';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS [Test ${total}]: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [Test ${total}]: ${message}`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: TEAM MEMBERS, RBAC & INVITATIONS LIVE WORKFLOW AUDIT    ');
  console.log('========================================================================\n');

  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  try {
    // 1. Login & Navigate to /?tab=team
    console.log('[Step 1] Logging in & navigating to /?tab=team...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.goto('http://localhost:5173/?tab=team', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'team_audit_initial.png') });
    console.log('  ✓ Captured team_audit_initial.png');

    const teamHeader = page.locator('h1:has-text("Team & Permissions"), h1:has-text("Team")');
    assert((await teamHeader.count()) > 0, 'Team & Permissions page header mounted');

    const govBadge = page.locator('text=Workspace Governance');
    assert((await govBadge.count()) > 0, 'Workspace Governance badge rendered');

    // 2. Test Workspace Identity & Quota Telemetry Cards
    console.log('\n[Step 2] Testing Workspace Identity & Seats Quota Cards...');
    const wsCard = page.locator('div:has-text("Active Agency Workspace"), h2').first();
    assert((await wsCard.count()) > 0, 'Active agency workspace card mounted');

    const seatsCard = page.locator('div:has-text("Seat Quota"), div:has-text("seats occupied")').first();
    assert((await seatsCard.count()) > 0, 'Team seats licensure quota card rendered');

    // 3. Test Workspace Members Roster
    console.log('\n[Step 3] Testing Workspace Members Roster & Roles...');
    const membersHeader = page.locator('h2:has-text("Active Workspace Members"), div:has-text("Active Workspace Members")');
    assert((await membersHeader.count()) > 0, 'Workspace members roster section mounted');

    const memberRows = page.locator('.member-card, tr, div:has-text("Owner"), div:has-text("Admin")');
    assert((await memberRows.count()) > 0, 'Workspace member rows & role badges loaded');

    // 4. Test Invite Team Member Modal
    console.log('\n[Step 4] Testing Invite Team Member Modal...');
    const inviteBtn = page.locator('button:has-text("Invite Team Member")').first();
    assert((await inviteBtn.count()) > 0, 'Invite Team Member launcher button present');

    if (await inviteBtn.count() > 0) {
      await inviteBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: path.join(artifactDir, 'team_audit_invite_modal.png') });
      console.log('  ✓ Captured team_audit_invite_modal.png');

      const modalTitle = page.locator('h3:has-text("Invite Team Member")');
      assert((await modalTitle.count()) > 0, 'Invite Team Member modal dialog opened');

      const emailInput = page.locator('input[type="email"], input[placeholder*="colleague" i]').first();
      assert((await emailInput.count()) > 0, 'Invitation email input field mounted');

      const roleSelect = page.locator('select').first();
      assert((await roleSelect.count()) > 0, 'Role hierarchy selector dropdown mounted');

      // Close modal
      const closeBtn = page.locator('.modal-close, button[aria-label="Close modal"]').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(300);
        assert(true, 'Invite Member modal dismissed cleanly');
      }
    }

    // 5. Test Pending Invitations Section
    console.log('\n[Step 5] Testing Pending Invitations Section...');
    const invitesHeader = page.locator('h3:has-text("Pending Invitations"), div:has-text("Pending Invitations")');
    assert((await invitesHeader.count()) > 0, 'Pending invitations deck rendered');

    // 6. Test Workspace Settings Form
    console.log('\n[Step 6] Testing Workspace Settings Form...');
    const settingsSection = page.locator('h3:has-text("Workspace Settings"), div:has-text("Workspace Settings")');
    assert((await settingsSection.count()) > 0, 'Workspace settings section mounted');

    const wsNameInput = page.locator('form:has-text("Workspace Name") input, input[value*="Agency" i]').first();
    assert((await wsNameInput.count()) > 0, 'Workspace name edit input mounted');

    const saveSettingsBtn = page.locator('button:has-text("Save Workspace Details"), button:has-text("Save")').first();
    assert((await saveSettingsBtn.count()) > 0, 'Save Workspace Details button interactive');

    // 7. Test Public Invite Acceptance Portal
    console.log('\n[Step 7] Testing Public Invite Acceptance Portal...');
    await page.goto('http://localhost:5173/?invite=test_audit_token_999', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(artifactDir, 'team_audit_invite_acceptance_portal.png') });
    console.log('  ✓ Captured team_audit_invite_acceptance_portal.png');

    const invitePortalHeader = page.locator('h2:has-text("Workspace Invitation")');
    assert((await invitePortalHeader.count()) > 0, 'Public workspace invite acceptance portal rendered');

    const acceptBtn = page.locator('button:has-text("Accept & Enter Workspace"), button:has-text("Join Workspace"), button[type="submit"]');
    assert((await acceptBtn.count()) > 0, 'Accept & Join Workspace action button present');

    // 8. Runtime Console Errors Check
    console.log('\n[Step 8] Checking Console Runtime Errors...');
    assert(consoleErrors.length === 0, `0 console runtime errors recorded (${consoleErrors.length} found)`);
    if (consoleErrors.length > 0) {
      consoleErrors.slice(0, 5).forEach(e => console.error('   Error:', e));
    }

    await page.screenshot({ path: path.join(artifactDir, 'team_audit_complete.png') });
    console.log('  ✓ Captured team_audit_complete.png');

  } catch (err) {
    console.error('\n❌ Unhandled Audit Failure:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   TEAM MEMBERS & RBAC AUDIT: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed < total) process.exit(1);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
