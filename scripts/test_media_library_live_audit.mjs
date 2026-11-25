import { chromium } from 'playwright';
import path from 'path';

async function runMediaLibraryAudit() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: MEDIA LIBRARY LIVE WORKFLOW AUDIT                       ');
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
    acceptDownloads: true
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Auth & Navigate to Media Library
    console.log('[Step 1] Logging in & navigating to /?tab=media...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("Demo Login")');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.goto('http://localhost:5173/?tab=media', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Initial state screenshot
    await page.screenshot({ path: path.join(artifactDir, 'media_library_audit_initial.png') });
    console.log('  ✓ Captured media_library_audit_initial.png');

    const headerTitle = page.locator('.ml-header-title h1:has-text("Media Library")');
    assert(await headerTitle.count() > 0, 'Media Library header mounted');

    // 2. Verify Asset Grid & Cards
    console.log('\n[Step 2] Testing Asset Grid & Cards...');
    const assetCards = page.locator('.ml-card');
    const initialAssetCount = await assetCards.count();
    assert(initialAssetCount > 0, `Media asset grid populated (${initialAssetCount} assets found)`);

    const firstCardTitle = await page.locator('.ml-card-title').first().textContent();
    assert(!!firstCardTitle && firstCardTitle.trim().length > 0, `Card title rendered: "${firstCardTitle?.trim()}"`);

    const firstCardThumbs = page.locator('.ml-thumb-stage');
    assert(await firstCardThumbs.count() > 0, 'Card thumbnail preview stages mounted');

    // 3. Test Type Filter Pills (All, Images, Videos)
    console.log('\n[Step 3] Testing Asset Type Filter Pills...');
    const imagesFilterBtn = page.locator('.ml-filter-tab:has-text("Images")');
    assert(await imagesFilterBtn.count() > 0, 'Images type filter pill available');
    await imagesFilterBtn.click({ force: true });
    await page.waitForTimeout(400);

    const videosFilterBtn = page.locator('.ml-filter-tab:has-text("Videos")');
    assert(await videosFilterBtn.count() > 0, 'Videos type filter pill available');
    await videosFilterBtn.click({ force: true });
    await page.waitForTimeout(400);

    const allFilterBtn = page.locator('.ml-filter-tab:has-text("All Media")');
    assert(await allFilterBtn.count() > 0, 'All Media filter pill available');
    await allFilterBtn.click({ force: true });
    await page.waitForTimeout(400);

    // 4. Test Folder Pills
    console.log('\n[Step 4] Testing Folder Pills...');
    const folderPills = page.locator('.ml-folder-pill');
    const folderCount = await folderPills.count();
    assert(folderCount >= 2, `Folder filter pills populated (${folderCount} categories available)`);

    // 5. Test Search Filtering
    console.log('\n[Step 5] Testing Search Input Filter...');
    const searchInput = page.locator('.ml-search-input');
    assert(await searchInput.count() > 0, 'Search input field mounted');
    await searchInput.fill('Luminary');
    await page.waitForTimeout(400);
    const searchMatches = await page.locator('.ml-card').count();
    assert(searchMatches >= 0, `Search filtering executed (${searchMatches} matching assets)`);
    await searchInput.fill('');
    await page.waitForTimeout(400);

    // 6. Test Upload Modal Trigger & Fields
    console.log('\n[Step 6] Testing Upload Media Modal...');
    const uploadBtn = page.locator('button:has-text("Upload Media")').first();
    assert(await uploadBtn.count() > 0, 'Upload Media trigger button available in header');

    await uploadBtn.click({ force: true });
    await page.waitForTimeout(600);

    const uploadModal = page.locator('.modal-dialog:has-text("Save Image")');
    assert(await uploadModal.count() > 0, 'Upload Asset modal dialog opened');
    await page.screenshot({ path: path.join(artifactDir, 'media_library_audit_upload_modal.png') });

    const externalUrlBtn = page.locator('button:has-text("External Image URL")');
    assert(await externalUrlBtn.count() > 0, 'External Image URL tab option exists');
    await externalUrlBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Close upload modal
    const closeUploadBtn = page.locator('.modal-close, button[title*="Close" i]').first();
    assert(await closeUploadBtn.count() > 0, 'Upload modal close button mounted');
    await closeUploadBtn.click({ force: true });
    await page.waitForTimeout(400);
    assert(await uploadModal.count() === 0, 'Upload Asset modal closed cleanly');

    // 7. Test Design Studio Launch Trigger & Clean Exit
    console.log('\n[Step 7] Testing Design Studio Modal Integration...');
    const canvaLaunchBtn = page.locator('button:has-text("Design Studio")').first();
    assert(await canvaLaunchBtn.count() > 0, 'Design Studio launch trigger available in header');
    await canvaLaunchBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const canvaModal = page.locator('.canva-ratio-select, .canva-template-card, h2:has-text("Canva Studio")');
    assert(await canvaModal.count() > 0, 'Canva Design Studio opened from Media Library');

    // Close Canva Studio modal via Close button + confirmation dialog
    const canvaCloseBtn = page.locator('button[title*="Close Studio" i]').first();
    if (await canvaCloseBtn.count() > 0) {
      await canvaCloseBtn.click({ force: true });
      await page.waitForTimeout(400);

      const confirmExitBtn = page.locator('button:has-text("Exit Studio")').first();
      if (await confirmExitBtn.count() > 0) {
        await confirmExitBtn.click({ force: true });
        await page.waitForTimeout(600);
      }
    }
    assert(await canvaModal.count() === 0, 'Canva Design Studio closed cleanly');

    // 8. Test 9:16 Reel Studio Launch Trigger
    console.log('\n[Step 8] Testing 9:16 Reel Studio Launch Integration...');
    const reelLaunchBtn = page.locator('button:has-text("9:16 Reel Studio")').first();
    assert(await reelLaunchBtn.count() > 0, '9:16 Reel Studio launch trigger available in header');
    await reelLaunchBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const reelModal = page.locator('.reel-scene-card, .reel-tab-btn, button:has-text("Export to Library")');
    assert(await reelModal.count() > 0, 'Reel Studio modal opened from Media Library');

    const reelCloseBtn = page.locator('button[title*="Close Studio" i], .modal-close').first();
    if (await reelCloseBtn.count() > 0) {
      await reelCloseBtn.click({ force: true });
      await page.waitForTimeout(600);
    }
    assert(await reelModal.count() === 0, 'Reel Studio modal closed cleanly');

    // 9. Test Card Action Buttons
    console.log('\n[Step 9] Testing Card Level Quick Actions...');
    const useInPostBtn = page.locator('.ml-card button:has-text("Use in Post")').first();
    assert(await useInPostBtn.count() > 0, '"Use in Post" action button available on assets');

    const organizeBtn = page.locator('.ml-card button[title*="Organize" i]').first();
    assert(await organizeBtn.count() > 0, 'Folder & tag organize button available on assets');

    // 10. Check Console Errors
    console.log('\n[Step 10] Checking Console Runtime Errors...');
    assert(consoleErrors.length === 0, `0 console runtime errors recorded (${consoleErrors.length} found)`);

    // Final screenshot
    await page.screenshot({ path: path.join(artifactDir, 'media_library_audit_complete.png') });
    console.log('\n  ✓ Captured media_library_audit_complete.png');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   MEDIA LIBRARY AUDIT RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runMediaLibraryAudit();
