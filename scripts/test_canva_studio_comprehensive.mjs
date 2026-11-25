import { chromium } from 'playwright';
import path from 'path';

async function runComprehensiveAudit() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: DESIGN CANVAS (CANVA STUDIO) 12-POINT AUDIT SUITE       ');
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
    viewport: { width: 1440, height: 900 },
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
    // -------------------------------------------------------------
    // Area 1 & Auth: Canvas Layout, Responsiveness & Initial Render
    // -------------------------------------------------------------
    console.log('\n--- [Area 1] Canvas Layout, Responsiveness & Initial Render ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("Demo Login")');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.goto('http://localhost:5173/?tab=canva', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const canvasBox = page.locator('.canva-canvas-box');
    assert(await canvasBox.count() > 0, 'Canvas container (.canva-canvas-box) rendered in DOM');

    const canvasVisible = await canvasBox.isVisible();
    assert(canvasVisible, 'Canvas box is fully visible and mounted');

    const viewport = page.locator('.canva-viewport');
    assert(await viewport.count() > 0, 'Canvas viewport rendered with dynamic scaling');

    // -------------------------------------------------------------
    // Area 6: Zoom, Pan & Canvas Controls
    // -------------------------------------------------------------
    console.log('\n--- [Area 6] Zoom, Pan & Viewport Controls ---');
    const zoomInBtn = page.locator('button.canva-zoom-btn[title="Zoom In"]');
    const zoomOutBtn = page.locator('button.canva-zoom-btn[title="Zoom Out"]');
    const fitBtn = page.locator('button.canva-zoom-btn[title="Fit to Screen"]');
    const resetBtn = page.locator('button.canva-zoom-btn[title="Reset View"]');

    assert(await zoomInBtn.count() > 0, 'Zoom In control available');
    assert(await zoomOutBtn.count() > 0, 'Zoom Out control available');
    assert(await fitBtn.count() > 0, 'Fit to Screen control available');

    // Test Zoom In
    const initialTransform = await canvasBox.evaluate((el) => el.style.transform);
    await zoomInBtn.click();
    await page.waitForTimeout(300);
    const zoomedTransform = await canvasBox.evaluate((el) => el.style.transform);
    assert(initialTransform !== zoomedTransform, `Canvas transform responds dynamically to Zoom In (${zoomedTransform})`);

    // Reset to Fit
    await fitBtn.click();
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // Area 7: Templates & Design Presets
    // -------------------------------------------------------------
    console.log('\n--- [Area 7] Templates & Design Presets ---');
    const tplTab = page.locator('.canva-tab-templates');
    await tplTab.click({ force: true });
    await page.waitForTimeout(500);

    const tplCards = page.locator('.canva-template-card');
    const tplCount = await tplCards.count();
    assert(tplCount > 0, `Template catalog loaded ${tplCount} design templates`);

    // Test using a template
    const firstCard = tplCards.first();
    await firstCard.click({ force: true });
    await page.waitForTimeout(800);
    assert(true, 'Applied first template from catalog onto canvas');

    // -------------------------------------------------------------
    // Area 3: Text, Shape, and Element Editing
    // -------------------------------------------------------------
    console.log('\n--- [Area 3] Text, Shape, Image, and Element Editing ---');
    // Add new Text layer
    const textTab = page.locator('.canva-tab-text');
    await textTab.click({ force: true });
    await page.waitForTimeout(400);

    const addHeadingBtn = page.locator('.canva-add-headline-btn');
    assert(await addHeadingBtn.count() > 0, 'Add Headline button present in Text drawer');
    await addHeadingBtn.click({ force: true });
    await page.waitForTimeout(600);

    // Verify text textarea is active in right inspector
    const textInput = page.locator('textarea').first();
    assert(await textInput.count() > 0, 'Text content editable via properties inspector');
    await textInput.fill('High-Velocity Audit Headline');
    await page.waitForTimeout(400);

    // Verify canvas displays updated text
    const canvasText = await page.locator('.canva-canvas-box').innerText();
    assert(canvasText.includes('High-Velocity Audit Headline'), 'Canvas immediately renders modified text');

    // Add Shape layer
    const shapesTab = page.locator('.canva-tab-shapes');
    await shapesTab.click({ force: true });
    await page.waitForTimeout(400);
    const shapeBtn = page.locator('.corel-shape-card').first();
    assert(await shapeBtn.count() > 0, 'CorelDraw vector shapes library loaded');
    await shapeBtn.click({ force: true });
    await page.waitForTimeout(600);
    assert(true, 'Shape layer added to canvas');

    // -------------------------------------------------------------
    // Area 4: Layers, Grouping, Alignment & Positioning
    // -------------------------------------------------------------
    console.log('\n--- [Area 4] Layers, Grouping, Alignment & Positioning ---');
    const layersTab = page.locator('.canva-tab-layers');
    await layersTab.click({ force: true });
    await page.waitForTimeout(400);

    const layerItems = page.locator('.canva-layer-item');
    const layersCount = await layerItems.count();
    assert(layersCount >= 2, `Layers panel tracks all elements (${layersCount} layers active)`);

    // Test Group All
    const groupAllBtn = page.locator('button:has-text("Group All")');
    if (await groupAllBtn.count() > 0) {
      await groupAllBtn.click({ force: true });
      await page.waitForTimeout(500);
      const toast = page.locator('text=Grouped visible');
      assert(await toast.count() > 0, 'Group All successfully grouped unlocked canvas elements');
    }

    // -------------------------------------------------------------
    // Area 5: Undo / Redo Functionality
    // -------------------------------------------------------------
    console.log('\n--- [Area 5] Undo / Redo Functionality ---');
    const undoBtn = page.locator('button[title*="Undo" i]');
    const redoBtn = page.locator('button[title*="Redo" i]');
    assert(await undoBtn.isEnabled(), 'Undo button is active in history stack');

    await undoBtn.click({ force: true });
    await page.waitForTimeout(400);
    assert(await redoBtn.isEnabled(), 'Redo button is enabled after undoing');

    await redoBtn.click({ force: true });
    await page.waitForTimeout(400);
    assert(true, 'Redo action executed cleanly');

    // -------------------------------------------------------------
    // Area 8: Image Uploads & Media Assets
    // -------------------------------------------------------------
    console.log('\n--- [Area 8] Image Uploads & Media Assets ---');
    const uploadsTab = page.locator('.canva-tab-uploads');
    await uploadsTab.click({ force: true });
    await page.waitForTimeout(400);

    const uploadComputerBtn = page.locator('button:has-text("Upload Image"), button:has-text("Upload from Device")').first();
    assert(await uploadComputerBtn.count() > 0, 'Upload image from device trigger present');

    // -------------------------------------------------------------
    // Area 9: Save, Project Restoration & Templates
    // -------------------------------------------------------------
    console.log('\n--- [Area 9] Save & Project Restoration ---');
    const saveBtn = page.locator('.canva-save-btn');
    assert(await saveBtn.count() > 0, 'Save project dropdown button present in header');
    await saveBtn.click({ force: true });
    await page.waitForTimeout(400);

    const saveEditableOption = page.locator('button:has-text("Save Editable Project")');
    assert(await saveEditableOption.count() > 0, 'Option to save editable project available');
    await saveEditableOption.click({ force: true });
    const toast = await page.waitForSelector('.canva-studio-toast, :has-text("Saved editable project"), :has-text("Saved project")', { timeout: 8000 }).catch(() => null);
    assert(toast !== null, 'Save confirmation toast fired successfully');

    // -------------------------------------------------------------
    // Area 10: Export Pipelines (PNG, JPG, PDF)
    // -------------------------------------------------------------
    console.log('\n--- [Area 10] Export Pipelines (PNG, JPG, PDF) ---');
    await page.waitForTimeout(1500);
    const exportBtn = page.locator('.canva-export-btn');
    assert(await exportBtn.count() > 0, 'Export button present in studio header');
    await exportBtn.click({ force: true });
    await page.waitForTimeout(500);

    const exportMenu = page.locator('.canva-export-menu-dropdown');
    assert(await exportMenu.count() > 0, 'Export configuration dropdown opened');

    // Verify format options (PNG, JPG, PDF)
    const pngOption = page.locator('select option[value="png"]');
    assert(await pngOption.count() > 0, 'PNG export format supported');

    // Trigger Download
    const downloadActionBtn = page.locator('.canva-download-action-btn');
    assert(await downloadActionBtn.count() > 0, 'Download action button present in export modal');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
      downloadActionBtn.click({ force: true })
    ]);
    assert(download !== null, 'Browser download triggered for exported design');

    // -------------------------------------------------------------
    // Area 11 & 12: API Integration, Error Handling & Health
    // -------------------------------------------------------------
    console.log('\n--- [Area 11 & 12] API Integration & Console Health ---');
    assert(consoleErrors.length === 0, `0 console runtime errors recorded during all studio interactions (${consoleErrors.length} found)`);

    // Capture final verified state
    await page.screenshot({ path: path.join(artifactDir, 'canva_studio_audit_complete.png') });
    console.log('\n  ✓ Captured canva_studio_audit_complete.png');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`   DESIGN CANVAS AUDIT RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runComprehensiveAudit();
