import { chromium } from 'playwright';
import path from 'path';

async function testAllProvidersPersistence() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Login
  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  const demoBtn = page.locator('text=1-Click Demo Login');
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Go to /email
  const emailNav = page.locator('text=Email Marketing').first();
  await emailNav.click();
  await page.waitForTimeout(2000);

  const providersToTest = [
    {
      id: 'gmail',
      name: 'Gmail / Google Workspace',
      step2Keyword: 'Google Gmail Address',
      step3Keyword: 'Google Workspace / Gmail Sender Identity',
      antiKeyword: 'AWS Region',
    },
    {
      id: 'ses',
      name: 'Amazon SES',
      step2Keyword: 'AWS Region',
      step3Keyword: 'Amazon SES',
      antiKeyword: 'Google Gmail Address',
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      step2Keyword: 'SendGrid API Key',
      step3Keyword: 'SendGrid DNS Verification',
      antiKeyword: 'AWS Region',
    },
    {
      id: 'brevo',
      name: 'Brevo',
      step2Keyword: 'Brevo API Key',
      step3Keyword: 'Brevo DNS Verification',
      antiKeyword: 'AWS Region',
    },
    {
      id: 'mailgun',
      name: 'Mailgun',
      step2Keyword: 'Mailgun API Key',
      step3Keyword: 'Mailgun DNS Verification',
      antiKeyword: 'AWS Region',
    },
    {
      id: 'smtp',
      name: 'Custom SMTP',
      step2Keyword: 'SMTP Host',
      step3Keyword: 'Custom SMTP DNS Verification',
      antiKeyword: 'AWS Region',
    },
  ];

  for (const prov of providersToTest) {
    console.log(`\n======================================================`);
    console.log(`🧪 TESTING WIZARD PERSISTENCE: ${prov.name} (${prov.id})`);
    console.log(`======================================================`);

    // Scroll to section
    const section = page.locator('text=Connect Your Email Service');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // Click Connect on provider card
    const card = page.locator(`.email-provider-card:has-text("${prov.name}")`);
    await card.locator('button:has-text("Connect")').click();
    await page.waitForTimeout(800);

    // Verify Drawer Header shows this provider in Step 2
    const headerTitle = await page.locator('.email-drawer-header h2').textContent();
    console.log(`Step 2 Header: "${headerTitle}"`);
    if (!headerTitle.includes(prov.name)) {
      throw new Error(`Expected Step 2 header to include "${prov.name}", got "${headerTitle}"`);
    }

    // Verify Step 2 shows the provider-specific field
    const step2Match = await page.locator(`.email-drawer-body:has-text("${prov.step2Keyword}")`).count();
    if (step2Match === 0) {
      throw new Error(`Step 2 missing expected field: ${prov.step2Keyword}`);
    }

    // Advance to Step 3 using Stepper or Save & Connect
    console.log(`Advancing to Step 3...`);
    const step3Nav = page.locator('.email-drawer-panel button:has-text("3. Verify")');
    await step3Nav.click();
    await page.waitForTimeout(600);

    // Check Step 3 Header & Content
    const step3Header = await page.locator('.email-drawer-header h2').textContent();
    console.log(`Step 3 Header: "${step3Header}"`);
    if (prov.id === 'gmail' && step3Header.includes('Amazon SES')) {
      throw new Error(`CRITICAL BUG: Step 3 header switched to Amazon SES for Gmail!`);
    }

    // Verify Step 3 displays provider-specific verification
    const step3Match = await page.locator(`.email-drawer-body:has-text("${prov.step3Keyword}")`).count();
    if (step3Match === 0) {
      throw new Error(`Step 3 missing expected content: "${prov.step3Keyword}"`);
    }

    // Verify Step 3 NEVER displays antiKeyword (e.g. AWS Region or wrong provider fields)
    const antiMatch = await page.locator(`.email-drawer-body:has-text("${prov.antiKeyword}")`).count();
    if (antiMatch > 0) {
      throw new Error(`Step 3 unexpectedly contains foreign provider content: "${prov.antiKeyword}"`);
    }

    // Go Back to Step 2
    console.log(`Navigating Back to Step 2...`);
    const backBtn = page.locator('.email-drawer-footer button:has-text("Back to Credentials")');
    await backBtn.click();
    await page.waitForTimeout(500);

    const backStep2Header = await page.locator('.email-drawer-header h2').textContent();
    console.log(`Back Step 2 Header: "${backStep2Header}"`);
    if (!backStep2Header.includes(prov.name)) {
      throw new Error(`Back to Step 2 failed: header is "${backStep2Header}", expected "${prov.name}"`);
    }

    // Continue again to Step 3
    console.log(`Navigating forward to Step 3 again...`);
    await step3Nav.click();
    await page.waitForTimeout(500);

    // Advance to Step 4 (Test)
    console.log(`Advancing to Step 4...`);
    const step4Nav = page.locator('.email-drawer-panel button:has-text("4. Test")');
    await step4Nav.click();
    await page.waitForTimeout(500);

    const step4Header = await page.locator('.email-drawer-header h2').textContent();
    console.log(`Step 4 Header: "${step4Header}"`);
    if (!step4Header.includes(prov.name)) {
      throw new Error(`Step 4 header does not include provider name: "${step4Header}"`);
    }

    // Advance to Step 5 (Done)
    console.log(`Advancing to Step 5...`);
    const step5Nav = page.locator('.email-drawer-panel button:has-text("5. Done")');
    await step5Nav.click();
    await page.waitForTimeout(500);

    const step5Body = await page.locator('.email-drawer-body').textContent();
    if (!step5Body.includes(prov.name)) {
      throw new Error(`Step 5 body missing provider name: "${step5Body}"`);
    }

    // Capture screenshot of Step 3 for verification
    await step3Nav.click();
    await page.waitForTimeout(400);
    const screenshotPath = path.join(artifactDir, `wizard_step3_${prov.id}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: wizard_step3_${prov.id}.png`);

    // Close drawer
    const closeBtn = page.locator('.email-drawer-header button[title="Close Drawer"]');
    await closeBtn.click();
    await page.waitForTimeout(600);

    console.log(`✅ ${prov.name} PASSED complete wizard lifecycle without provider switches!`);
  }

  await browser.close();
  console.log(`\n🎉 ALL 6 PROVIDERS VERIFIED: Zero provider switches across every step!`);
}

testAllProvidersPersistence().catch((err) => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});

