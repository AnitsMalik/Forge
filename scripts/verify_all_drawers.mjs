import { chromium } from 'playwright';
import path from 'path';

async function verifyAllDrawers() {
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917';

  const storageStatePath = path.join(artifactDir, 'storage_state.json');

  // Helper to login and navigate
  async function setupPage(viewport) {
    const context = await browser.newContext({ viewport, storageState: storageStatePath });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/email', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const section = page.locator('text=Connect Your Email Service');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    return { context, page };
  }

  // 1. Desktop Test for all 6 providers
  console.log('Testing 6 providers on Desktop (1440x900)...');
  const { page: deskPage, context: deskCtx } = await setupPage({ width: 1440, height: 900 });

  const providers = [
    { name: 'Amazon SES', file: 'drawer_ses_1440px.png' },
    { name: 'SendGrid', file: 'drawer_sendgrid_1440px.png' },
    { name: 'Brevo', file: 'drawer_brevo_1440px.png' },
    { name: 'Mailgun', file: 'drawer_mailgun_1440px.png' },
    { name: 'Gmail / Google Workspace', file: 'drawer_gmail_1440px.png' },
    { name: 'Custom SMTP', file: 'drawer_smtp_1440px.png' },
  ];

  for (const prov of providers) {
    console.log(`Checking drawer for ${prov.name}...`);
    const card = deskPage.locator(`.email-provider-card:has-text("${prov.name}")`);
    await card.locator('button:has-text("Connect")').click();
    await deskPage.waitForTimeout(600);
    await deskPage.screenshot({ path: path.join(artifactDir, prov.file) });
    console.log(`Saved ${prov.file}`);
    
    // Close drawer
    const closeBtn = deskPage.locator('.email-drawer-header button[title="Close Drawer"]');
    await closeBtn.click();
    await deskPage.waitForTimeout(400);
  }
  await deskCtx.close();

  // 2. Tablet Test (768x1024)
  console.log('Testing Tablet (768x1024)...');
  const { page: tabPage, context: tabCtx } = await setupPage({ width: 768, height: 1024 });
  const tabCard = tabPage.locator('.email-provider-card:has-text("Amazon SES")');
  await tabCard.locator('button:has-text("Connect")').click();
  await tabPage.waitForTimeout(600);
  await tabPage.screenshot({ path: path.join(artifactDir, 'drawer_tablet_768px.png') });
  console.log('Saved drawer_tablet_768px.png');
  await tabCtx.close();

  // 3. Mobile Test (375x812)
  console.log('Testing Mobile (375x812)...');
  const { page: mobPage, context: mobCtx } = await setupPage({ width: 375, height: 812 });
  const mobCard = mobPage.locator('.email-provider-card:has-text("Amazon SES")');
  await mobCard.locator('button:has-text("Connect")').click();
  await mobPage.waitForTimeout(600);
  await mobPage.screenshot({ path: path.join(artifactDir, 'drawer_mobile_375px.png') });
  console.log('Saved drawer_mobile_375px.png');
  await mobCtx.close();

  await browser.close();
  console.log('All drawer verification tests completed successfully!');
}

verifyAllDrawers().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
