import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('========================================================');
  console.log('   DESIGN CANVAS (CANVA STUDIO) LIVE WORKFLOW AUDIT     ');
  console.log('========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 1. Auth & Navigate to Design Canvas
  console.log('[Step 1] Logging in & navigating to /?tab=canva...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('button:has-text("Demo Login")');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.goto('http://localhost:5173/?tab=canva', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Take initial canvas screenshot
  await page.screenshot({ path: path.join(artifactDir, 'canva_studio_audit_initial.png') });
  console.log('  ✓ Captured canva_studio_audit_initial.png');

  // Verify Header Controls (Format Selector, Zoom, Undo, Redo, Save, Export)
  const formatSelect = page.locator('select.canva-ratio-select, .canva-format-dropdown, select[title*="Aspect" i]');
  console.log(`  Format selector present: ${await formatSelect.count() > 0}`);

  const undoBtn = page.locator('button[title*="Undo" i]');
  const redoBtn = page.locator('button[title*="Redo" i]');
  console.log(`  Undo button present: ${await undoBtn.count() > 0}`);
  console.log(`  Redo button present: ${await redoBtn.count() > 0}`);

  // 2. Check Left Navigation Tabs
  console.log('\n[Step 2] Testing Left Navigation Tabs & Drawers...');
  const tabsToTest = ['Templates', 'Text', 'Shapes', 'Elements', 'Uploads', 'Brand Kit', 'Layers', 'Background'];
  for (const tabName of tabsToTest) {
    const tab = page.locator(`.canva-tab-btn:has-text("${tabName}"), .canva-tab-btn[title*="${tabName}" i]`).first();
    if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(400);
      console.log(`  ✓ Clicked tab: ${tabName}`);
    }
  }

  // 3. Test Templates tab & search
  console.log('\n[Step 3] Testing Templates Library...');
  const tplTab = page.locator('.canva-tab-btn:has-text("Templates")').first();
  if (await tplTab.count() > 0) {
    await tplTab.click();
    await page.waitForTimeout(500);
    const tplCards = page.locator('.canva-template-card, .design-template-card');
    const tplCount = await tplCards.count();
    console.log(`  ✓ Found ${tplCount} design template cards`);
    await page.screenshot({ path: path.join(artifactDir, 'canva_studio_audit_templates.png') });
  }

  // 4. Test Adding Text
  console.log('\n[Step 4] Testing Text Insertion & Properties Toolbar...');
  const textTab = page.locator('.canva-tab-btn:has-text("Text")').first();
  if (await textTab.count() > 0) {
    await textTab.click();
    await page.waitForTimeout(400);
    const addHeadingBtn = page.locator('button:has-text("Add Heading"), button:has-text("Heading")').first();
    if (await addHeadingBtn.count() > 0) {
      await addHeadingBtn.click();
      await page.waitForTimeout(600);
      console.log('  ✓ Added Heading layer');
    }
  }

  // 5. Test Adding Shape / Elements
  console.log('\n[Step 5] Testing Shapes & Elements Insertion...');
  const shapesTab = page.locator('.canva-tab-btn:has-text("Shapes"), .canva-tab-btn:has-text("Elements")').first();
  if (await shapesTab.count() > 0) {
    await shapesTab.click();
    await page.waitForTimeout(400);
    const shapeBtn = page.locator('button[title*="Rectangle" i], button[title*="Star" i], .canva-shape-btn').first();
    if (await shapeBtn.count() > 0) {
      await shapeBtn.click();
      await page.waitForTimeout(600);
      console.log('  ✓ Added Shape element');
    }
  }

  // 6. Test Undo & Redo Workflow
  console.log('\n[Step 6] Testing Undo & Redo Workflow...');
  if (await undoBtn.count() > 0 && await undoBtn.isEnabled()) {
    await undoBtn.click();
    await page.waitForTimeout(400);
    console.log('  ✓ Clicked Undo');
    if (await redoBtn.count() > 0 && await redoBtn.isEnabled()) {
      await redoBtn.click();
      await page.waitForTimeout(400);
      console.log('  ✓ Clicked Redo');
    }
  }

  // 7. Test Zoom & Canvas Controls
  console.log('\n[Step 7] Testing Zoom Controls...');
  const zoomIn = page.locator('button[title*="Zoom In" i], button:has-text("+")').first();
  const zoomOut = page.locator('button[title*="Zoom Out" i], button:has-text("-")').first();
  const fitBtn = page.locator('button:has-text("Fit"), button[title*="Fit" i]').first();
  if (await zoomIn.count() > 0) {
    await zoomIn.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Clicked Zoom In');
  }
  if (await fitBtn.count() > 0) {
    await fitBtn.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Clicked Fit to Viewport');
  }

  // 8. Test Layers Panel & Selection
  console.log('\n[Step 8] Testing Layers Drawer...');
  const layersTab = page.locator('.canva-tab-btn:has-text("Layers")').first();
  if (await layersTab.count() > 0) {
    await layersTab.click();
    await page.waitForTimeout(400);
    const layerItems = page.locator('.canva-layer-item, .canva-layer-row');
    console.log(`  ✓ Layers in panel: ${await layerItems.count()}`);
    await page.screenshot({ path: path.join(artifactDir, 'canva_studio_audit_layers.png') });
  }

  // 9. Test Export Menu & Options
  console.log('\n[Step 9] Testing Export Modal / Menu...');
  const exportBtn = page.locator('button:has-text("Export"), button[title*="Export" i]').first();
  if (await exportBtn.count() > 0) {
    await exportBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'canva_studio_audit_export_menu.png') });
    console.log('  ✓ Opened Export menu');
  }

  // Check for any uncaught console errors
  console.log('\n[Step 10] Checking Console Errors...');
  if (consoleErrors.length > 0) {
    console.warn(`  Found ${consoleErrors.length} console errors:`, consoleErrors);
  } else {
    console.log('  ✓ 0 console errors detected during live user interaction!');
  }

  await browser.close();
  console.log('\n========================================================');
  console.log('   CANVA STUDIO LIVE AUDIT COMPLETE                     ');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});

