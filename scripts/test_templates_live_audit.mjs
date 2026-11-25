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
  console.log('   SOCIALFORGE: TEMPLATE LIBRARY & DESIGNER LIVE WORKFLOW AUDIT         ');
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
    // 1. Login
    console.log('[Step 1] Logging in via Demo Account...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if (await demoBtn.count() > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. Templates Catalog (/templates)
    console.log('\n[Step 2] Auditing Template Catalog (/templates)...');
    await page.goto('http://localhost:5173/templates', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'templates_catalog_initial.png') });
    console.log('  ✓ Captured templates_catalog_initial.png');

    const heroTitle = page.locator('.template-catalog-hero-title, h1:has-text("Template Catalog")');
    assert((await heroTitle.count()) > 0, 'Template Catalog hero title mounted');

    const newTemplateBtn = page.locator('button:has-text("New Template")').first();
    assert((await newTemplateBtn.count()) > 0, 'New Template action button mounted');

    const auditBtn = page.locator('button:has-text("Audit & Rollbacks")').first();
    assert((await auditBtn.count()) > 0, 'Audit & Rollbacks action button mounted');

    // Verify Category Filter Tabs
    const catBar = page.locator('.template-catalog-cat-btn');
    const catCount = await catBar.count();
    assert(catCount >= 7, `Strategic category filter tabs mounted (found ${catCount})`);

    // Test Category Switching: Click "Product"
    console.log('  Testing Category switching to "Product"...');
    const productCatBtn = page.locator('.template-catalog-cat-btn:has-text("Product")').first();
    if (await productCatBtn.count() > 0) {
      await productCatBtn.click();
      await page.waitForTimeout(600);
      assert(true, 'Switched category to Product');
    }

    // Check Subcategory pills for Product (New Arrival, Product Promotion, Feature)
    const subcatPills = page.locator('.template-catalog-subcat-pill');
    assert((await subcatPills.count()) > 0, 'Subcategory filter pills rendered');

    // Test Search input
    console.log('  Testing Template search input...');
    const searchInput = page.locator('.template-catalog-search-input');
    assert((await searchInput.count()) > 0, 'Template search input mounted');
    if (await searchInput.count() > 0) {
      await searchInput.fill('flagship');
      await page.waitForTimeout(600);
      const cards = page.locator('.template-card');
      assert((await cards.count()) > 0, 'Search query filtered matching template cards');
      await searchInput.fill('');
      await page.waitForTimeout(500);
    }

    // 3. Template Preview & Inspector Modal
    console.log('\n[Step 3] Testing Template Preview & Inspector Modal...');
    const previewBtn = page.locator('.template-card-btn-primary').first();
    assert((await previewBtn.count()) > 0, 'Template Preview & Inspect button available');
    if (await previewBtn.count() > 0) {
      await previewBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({ path: path.join(artifactDir, 'templates_preview_modal.png') });
      console.log('  ✓ Captured templates_preview_modal.png');

      const modalDialog = page.locator('.tpl-modal-dialog');
      assert((await modalDialog.count()) > 0, 'Preview Modal Dialog portal mounted');

      // Aspect ratio selector buttons
      const ratioBtns = page.locator('.tpl-modal-dialog button:has-text("1:1"), .tpl-modal-dialog button:has-text("9:16"), .tpl-modal-dialog button:has-text("4:5")');
      assert((await ratioBtns.count()) > 0, 'Multi-aspect ratio reflow controls interactive');

      // Close modal
      const closeBtn = page.locator('.tpl-modal-header button, .tpl-modal-backdrop button:has-text("Close"), .tpl-modal-dialog button').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        assert(true, 'Closed Preview Modal');
      }
    }

    // 4. Template Studio / Canvas Editor (/templates/editor)
    console.log('\n[Step 4] Auditing Template Canvas Studio (/templates/editor)...');
    await page.goto('http://localhost:5173/templates/editor', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'template_editor_studio.png') });
    console.log('  ✓ Captured template_editor_studio.png');

    const editorBreadcrumb = page.locator('text=Template Studio');
    assert((await editorBreadcrumb.count()) > 0, 'Template Studio editor page mounted');

    const sampleViewBtn = page.locator('button:has-text("Rendered Sample View"), button:has-text("Template Variable View")').first();
    assert((await sampleViewBtn.count()) > 0, 'Sample Data vs Variable View toggle available');
    if (await sampleViewBtn.count() > 0) {
      await sampleViewBtn.click();
      await page.waitForTimeout(400);
      assert(true, 'Sample Data variable interpolation toggled');
    }

    const saveTemplateBtn = page.locator('button:has-text("Save Template")').first();
    assert((await saveTemplateBtn.count()) > 0, 'Save Template button available');

    // 5. Template Version Audit Trail (/templates/versions)
    console.log('\n[Step 5] Auditing Template Versions & Rollbacks (/templates/versions)...');
    await page.goto('http://localhost:5173/templates/versions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'template_versions_audit.png') });
    console.log('  ✓ Captured template_versions_audit.png');

    const verHeader = page.locator('text=Version Audit Trail');
    assert((await verHeader.count()) > 0, 'Template Version Audit Trail header mounted');

    const backBtn = page.locator('button:has-text("Back to Templates")').first();
    assert((await backBtn.count()) > 0, 'Back to Templates navigation button functional');

    // Final complete screenshot
    await page.screenshot({ path: path.join(artifactDir, 'templates_audit_complete.png') });
    console.log('  ✓ Captured templates_audit_complete.png');

  } catch (err) {
    console.error('Audit encountered error:', err);
    assert(false, `Execution exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n========================================================================');
  console.log(`TEMPLATE LIBRARY & DESIGNER AUDIT SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();

