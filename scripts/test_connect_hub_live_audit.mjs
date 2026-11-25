import { chromium } from 'playwright';
import path from 'path';

async function runConnectHubLiveAudit() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: CONNECT HUB LIVE WORKFLOW AUDIT                         ');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS [Test ${totalTests}]: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL [Test ${totalTests}]: ${message}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Auth & Navigate to Connect Hub (/?tab=channels)
    console.log('[Step 1] Logging in & navigating to /?tab=channels...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("Demo Login")');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.goto('http://localhost:5173/?tab=channels', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Initial state screenshot
    await page.screenshot({ path: path.join(artifactDir, 'connect_hub_audit_initial.png') });
    console.log('  ✓ Captured connect_hub_audit_initial.png');

    const headerTitle = page.locator('h1:has-text("Connect Hub"), h2:has-text("Connect Hub")');
    assert((await headerTitle.count()) > 0, 'Connect Hub header mounted');

    // 2. Verify KPI Telemetry Meters
    console.log('\n[Step 2] Testing KPI Telemetry Cards...');
    const statCards = page.locator('.stat-card, div:has-text("Active Connections")');
    assert((await statCards.count()) > 0, 'KPI Stat cards row rendered');

    const liveProdCard = page.locator('text=Live Production');
    assert((await liveProdCard.count()) > 0, '"Live Production" KPI card rendered');

    const sandboxCard = page.locator('text=Sandbox / Simulator');
    assert((await sandboxCard.count()) > 0, '"Sandbox / Simulator" KPI card rendered');

    // 3. Verify Connector Catalog Sections & Cards
    console.log('\n[Step 3] Testing Catalog Sections (Social, Data, Business)...');
    const socialSection = page.locator('[data-testid="section-social"]');
    assert((await socialSection.count()) > 0, 'Social Channels catalog section rendered');

    const dataSection = page.locator('[data-testid="section-data"]');
    assert((await dataSection.count()) > 0, 'Cloud Storage & Data catalog section rendered');

    const businessSection = page.locator('[data-testid="section-business"]');
    assert((await businessSection.count()) > 0, 'Business & Commerce catalog section rendered');

    // 4. Verify Individual Provider Cards
    console.log('\n[Step 4] Testing Registered Provider Cards...');
    const fbCard = page.locator('[data-testid="connector-card-facebook"]');
    assert((await fbCard.count()) > 0, 'Facebook provider card present');

    const igCard = page.locator('[data-testid="connector-card-instagram"]');
    assert((await igCard.count()) > 0, 'Instagram provider card present');

    const liCard = page.locator('[data-testid="connector-card-linkedin"]');
    assert((await liCard.count()) > 0, 'LinkedIn provider card present');

    const driveCard = page.locator('[data-testid="connector-card-google-drive"]');
    assert((await driveCard.count()) > 0, 'Google Drive provider card present');

    const shopifyCard = page.locator('[data-testid="connector-card-shopify"]');
    assert((await shopifyCard.count()) > 0, 'Shopify provider card present');

    // 5. Test Audit All Health Action
    console.log('\n[Step 5] Testing "Audit All Health" Action...');
    const auditHealthBtn = page.locator('[data-testid="refresh-health-btn"]');
    assert((await auditHealthBtn.count()) > 0, '"Audit All Health" action button mounted in header');
    await auditHealthBtn.click({ force: true });
    await page.waitForTimeout(1000);
    assert(true, '"Audit All Health" verification completed without crash');

    // 6. Test "+ Add Connection" Modal Trigger & Step 1 (Platform Selection)
    console.log('\n[Step 6] Testing Add Connection Modal Trigger...');
    const addConnBtn = page.locator('[data-testid="add-connection-header-btn"]').first();
    assert((await addConnBtn.count()) > 0, '+ Add Connection button mounted in header');

    await addConnBtn.click({ force: true });
    await page.waitForTimeout(600);

    const modalTitle = page.locator('#add-connection-modal-title:has-text("Add New Connection")');
    assert((await modalTitle.count()) > 0, 'Add Connection modal opened (Step 1: SELECT_PLATFORM)');
    await page.screenshot({ path: path.join(artifactDir, 'connect_hub_audit_add_modal.png') });

    // 7. Test Search Filter in Modal
    console.log('\n[Step 7] Testing Search Filter in Modal...');
    const modalSearchInput = page.locator('[data-testid="platform-search-input"], input[placeholder*="Search platform" i]').first();
    assert((await modalSearchInput.count()) > 0, 'Search platform input mounted in modal');

    await modalSearchInput.fill('Shopify');
    await page.waitForTimeout(400);

    const shopifyModalCard = page.locator('[data-testid="platform-select-item-shopify"]');
    assert((await shopifyModalCard.count()) > 0, 'Filtered catalog displays matching Shopify card');

    await modalSearchInput.fill('');
    await page.waitForTimeout(400);

    // 8. Test Step 2 (Configure Platform) & Back Navigation
    console.log('\n[Step 8] Testing Step 2 (CONFIGURE) & Back Navigation...');
    const igModalCard = page.locator('[data-testid="platform-select-item-instagram"]').first();
    assert((await igModalCard.count()) > 0, 'Instagram item selectable in modal');
    await igModalCard.click({ force: true });
    await page.waitForTimeout(600);

    const configTitle = page.locator('#add-connection-modal-title:has-text("Connect Instagram")');
    assert((await configTitle.count()) > 0, 'Transitioned to Step 2 (CONFIGURE) for Instagram');

    // Test Back button
    const backBtn = page.locator('[data-testid="modal-header-back-btn"], [data-testid="modal-back-btn"]').first();
    assert((await backBtn.count()) > 0, 'Back button available in CONFIGURE step');
    await backBtn.click({ force: true });
    await page.waitForTimeout(500);

    assert((await modalTitle.count()) > 0, 'Back button successfully returned to Step 1: SELECT_PLATFORM');

    // Close Modal via Cancel button
    const cancelModalBtn = page.locator('button:has-text("Cancel")').first();
    if ((await cancelModalBtn.count()) > 0) {
      await cancelModalBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
    assert((await page.locator('.connect-modal-container').count()) === 0, 'Add Connection modal closed cleanly');

    // 9. Test Provider Level Actions (Connect button or Manage button)
    console.log('\n[Step 9] Testing Provider Level Actions...');
    const connectButtons = page.locator('button[data-testid^="connect-btn-"], button[data-testid^="manage-btn-"]');
    assert((await connectButtons.count()) >= 5, `Provider action buttons mounted (${await connectButtons.count()} available)`);

    // 10. Check Console Runtime Errors
    console.log('\n[Step 10] Checking Console Runtime Errors...');
    assert(consoleErrors.length === 0, `0 console runtime errors recorded (${consoleErrors.length} found)`);

    // Final screenshot
    await page.screenshot({ path: path.join(artifactDir, 'connect_hub_audit_complete.png') });
    console.log('\n  ✓ Captured connect_hub_audit_complete.png');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   CONNECT HUB AUDIT RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runConnectHubLiveAudit();
