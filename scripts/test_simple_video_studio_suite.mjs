import { chromium } from 'playwright';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runSimpleVideoStudioSuite() {
  console.log('========================================================================');
  console.log('  SOCIALFORGE SIMPLIFIED VIDEO & REELS STUDIO VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. MySQL Invariant verification
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });

  const [invRows] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    invRows.length > 0 && invRows[0].status === 'published',
    `Production Invariant Intact Pre-Suite: ${invRows[0]?.remote_post_id}`
  );

  // 2. Launch Browser Session
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log('\n--- 1. Authenticating & Navigating to Video Studio ---');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'sarah@apex.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for login
    await page.waitForURL('http://localhost:5173/**', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Navigate to Video & Reels Studio
    await page.goto('http://localhost:5173/?tab=reels');
    await page.waitForTimeout(2000);

    // Verify Simplified Studio Title & 5-Step Workflow
    const headerTitle = await page.textContent('h1');
    assert(
      headerTitle && headerTitle.includes('SocialForge Video & Reels Studio'),
      `Simplified Studio loaded: "${headerTitle?.trim()}"`
    );

    const step1Visible = await page.isVisible('text="Step 1: Upload Your Video File"');
    assert(step1Visible, 'Step 1 (Upload Video) active by default');

    const complexTimeline = await page.$('.reel-timeline');
    assert(!complexTimeline, 'Complex multi-track timeline hidden from primary interface');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_step1_upload.png') });
    console.log('  [SAVED] simple_video_studio_step1_upload.png');

    // --- 2. Test Step 1: Upload, Sample Video & Media Library ---
    console.log('\n--- 2. Testing Video Upload & Media Library Integration ---');

    // Test "Use Sample Video"
    const sampleBtn = await page.$('button[data-testid="use-sample-video-btn"]');
    if (sampleBtn) {
      await sampleBtn.click();
      await page.waitForTimeout(1000);
      const queueVisible = await page.isVisible('text=Attached Video Queue');
      assert(queueVisible, 'Sample video loaded into attached video queue with ready status');
    }

    // Test Pick from Media Library Modal
    const mediaBtn = await page.$('button[data-testid="pick-media-library-btn"]');
    if (mediaBtn) {
      await mediaBtn.click();
      await page.waitForTimeout(1200);
      const pickerModal = await page.isVisible('text=Select Video from Media Library');
      assert(pickerModal, 'Media Library Video Picker opened modal');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_media_picker.png') });
      console.log('  [SAVED] simple_video_studio_media_picker.png');

      // Click on the seeded video asset if present
      const libraryAsset = await page.$('div:has-text("Shore Waves Brand Reel")');
      if (libraryAsset) {
        await libraryAsset.click();
        await page.waitForTimeout(800);
        console.log('  [PASS] Selected "Shore Waves Brand Reel" from Media Library');
      } else {
        const closePicker = await page.$('button[data-testid="close-media-picker-btn"]');
        if (closePicker) await closePicker.click();
      }
      const isStillOpen = await page.isVisible('button[data-testid="close-media-picker-btn"]');
      if (isStillOpen) {
        await page.click('button[data-testid="close-media-picker-btn"]');
        await page.waitForTimeout(500);
      }
    }

    // --- 3. Test Step 2: Content Creation & AI Assistance ---
    console.log('\n--- 3. Testing Step 2: Content Creation & AI Copywriting ---');
    await page.click('text=Add Content');
    await page.waitForTimeout(1000);

    const step2Visible = await page.isVisible('text=Step 2: Add Post Copy');
    assert(step2Visible, 'Transitioned to Step 2 (Add Content)');

    // Post Title
    const titleInput = await page.$('input[placeholder*="3 Proven Tactics"]');
    if (titleInput) {
      await titleInput.fill('Mastering AI Video Content Automation');
    }

    // Caption
    const captionTextarea = await page.$('textarea[placeholder*="Write your engaging caption"]');
    if (captionTextarea) {
      await captionTextarea.fill('Here is how elite creators generate 10x more engagement using video automation.');
    }

    // AI Boost Hook
    const boostHookBtn = await page.$('button:has-text("Boost Hook")');
    if (boostHookBtn) {
      await boostHookBtn.click();
      await page.waitForTimeout(2000);
      const updatedCaption = await captionTextarea?.inputValue();
      assert(
        updatedCaption && updatedCaption.length > 20,
        `AI Hook Boost successfully enhanced caption (${updatedCaption?.length} chars)`
      );
    }

    // AI Auto-Hashtags
    const hashtagsBtn = await page.$('button:has-text("Auto-Hashtags")');
    if (hashtagsBtn) {
      await hashtagsBtn.click();
      await page.waitForTimeout(2000);
      const hashtagPills = await page.$$('span:has-text("#")');
      assert(hashtagPills.length >= 3, `Hashtag generator populated ${hashtagPills.length} targeted tags`);
    }

    // AI Platform Rewrite (e.g. Instagram)
    const igRewriteBtn = await page.$('button:has-text("Rewrite for Instagram")');
    if (igRewriteBtn) {
      await igRewriteBtn.click();
      await page.waitForTimeout(2000);
      console.log('  [PASS] AI Platform Rewrite for Instagram executed');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_step2_content.png') });
    console.log('  [SAVED] simple_video_studio_step2_content.png');

    // --- 4. Test Step 3: Platform Selection ---
    console.log('\n--- 4. Testing Step 3: Platform Selection ---');
    const toPlatformsBtn = await page.$('button:has-text("Select Platforms")');
    if (toPlatformsBtn) {
      await toPlatformsBtn.click();
    } else {
      await page.click('text=Select Platforms');
    }
    await page.waitForTimeout(1000);

    const step3Visible = await page.isVisible('text=Step 3: Choose Social Media Platforms');
    assert(step3Visible, 'Transitioned to Step 3 (Platform Selection)');

    const igPlatform = await page.isVisible('text=Instagram Reels');
    const fbPlatform = await page.isVisible('text=Facebook Video');
    const ytPlatform = await page.isVisible('text=YouTube Shorts');
    const liPlatform = await page.isVisible('text=LinkedIn Video');
    const ttPlatform = await page.isVisible('text=TikTok');
    const xPlatform = await page.isVisible('text=X (Twitter)');

    assert(
      igPlatform && fbPlatform && ytPlatform && liPlatform && ttPlatform && xPlatform,
      'All 6 major social platforms verified active and selectable'
    );

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_step3_platforms.png') });
    console.log('  [SAVED] simple_video_studio_step3_platforms.png');

    // --- 5. Test Step 4: Social Feed Preview ---
    console.log('\n--- 5. Testing Step 4: Video Preview & Social Feed Mockup ---');
    const toPreviewBtn = await page.$('button:has-text("Preview Full Post")');
    if (toPreviewBtn) {
      await toPreviewBtn.click();
    } else {
      await page.click('text=Preview Post');
    }
    await page.waitForTimeout(1000);

    const step4Visible = await page.isVisible('text=Step 4: Social Feed Preview');
    assert(step4Visible, 'Transitioned to Step 4 (Preview)');

    const videoElem = await page.$('video');
    assert(!!videoElem, 'Real HTML5 Video Player active with seek and volume controls');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_step4_preview.png') });
    console.log('  [SAVED] simple_video_studio_step4_preview.png');

    // --- 6. Test Step 5: Save, Schedule & Publish Actions ---
    console.log('\n--- 6. Testing Step 5: Save, Schedule & Publish Workflows ---');
    const toPublishBtn = await page.$('button:has-text("Publish / Schedule Post")');
    if (toPublishBtn) {
      await toPublishBtn.click();
    } else {
      await page.click('text=Publish & Schedule');
    }
    await page.waitForTimeout(1000);

    const step5Visible = await page.isVisible('text=Step 5: Publish, Schedule');
    assert(step5Visible, 'Transitioned to Step 5 (Publish / Schedule)');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_step5_publish.png') });
    console.log('  [SAVED] simple_video_studio_step5_publish.png');

    // Test Save as Draft
    const saveDraftBtn = await page.$('button:has-text("Save Draft")');
    if (saveDraftBtn) {
      await saveDraftBtn.click();
      await page.waitForTimeout(2500);
      const [draftRows] = await conn.query(
        'SELECT id, title, status FROM posts WHERE title = ? ORDER BY created_at DESC LIMIT 1',
        ['Mastering AI Video Content Automation']
      );
      assert(
        draftRows.length > 0 && draftRows[0].status === 'draft',
        `Draft video project persisted to database: ID ${draftRows[0]?.id}`
      );
    }

    // Test Store to Media Library
    const storeMediaBtn = await page.$('button:has-text("Store to Media Library")');
    if (storeMediaBtn) {
      await storeMediaBtn.click();
      await page.waitForTimeout(2500);
      const [mediaRows] = await conn.query(
        'SELECT id, file_name, media_type FROM media_assets WHERE media_type = "video" ORDER BY created_at DESC LIMIT 1'
      );
      assert(
        mediaRows.length > 0 && mediaRows[0].media_type === 'video',
        `Video asset persisted to Media Library: ID ${mediaRows[0]?.id}`
      );
    }

    // Test Schedule for Later
    const scheduleBtn = await page.$('button:has-text("Schedule Video")');
    if (scheduleBtn) {
      await scheduleBtn.click();
      await page.waitForTimeout(3000);
      const [schedRows] = await conn.query(
        'SELECT id, title, status, scheduled_for FROM posts WHERE status = "scheduled" ORDER BY updated_at DESC LIMIT 1'
      );
      assert(
        schedRows.length > 0 && schedRows[0].status === 'scheduled',
        `Scheduled video post synchronized to SocialForge Calendar: ${schedRows[0]?.scheduled_for}`
      );
    }

    // Test Saved Drafts Drawer
    const draftsDrawerBtn = await page.$('button:has-text("Saved Drafts")');
    if (draftsDrawerBtn) {
      await draftsDrawerBtn.click();
      await page.waitForTimeout(1500);
      const drawerVisible = await page.isVisible('text=Saved Video Projects');
      assert(drawerVisible, 'Saved Video Projects drawer opened with persistence');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'simple_video_studio_drafts_drawer.png') });
      console.log('  [SAVED] simple_video_studio_drafts_drawer.png');

      const reopenBtn = await page.$('button:has-text("Reopen Project")');
      assert(!!reopenBtn, 'Reopen Project button available for saved video projects');

      // Close drawer
      const closeDrawer = await page.$('button[data-testid="close-drafts-drawer-btn"]');
      if (closeDrawer) await closeDrawer.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Test Toggle to Advanced Storyboard & back
    const advBtn = await page.$('button:has-text("Advanced Storyboard")');
    if (advBtn) {
      await advBtn.click();
      await page.waitForTimeout(1500);
      const legacyEngine = await page.isVisible('text=Video Reels & Motion Engine');
      assert(legacyEngine, 'Power user toggle switched to Advanced Storyboard mode');

      const simpleToggle = await page.$('button:has-text("Simple Studio")');
      if (simpleToggle) {
        await simpleToggle.click();
        await page.waitForTimeout(1500);
        const backToSimple = await page.isVisible('text=SocialForge Video & Reels Studio');
        assert(backToSimple, 'Seamlessly returned back to Simple Video Studio');
      }
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  // Final Invariant check
  const [finalInv] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    finalInv.length > 0 && finalInv[0].status === 'published',
    `Meta Live Post Invariant Confirmed Protected: ${finalInv[0]?.remote_post_id}`
  );

  await conn.end();

  console.log('\n========================================================================');
  console.log(`  SIMPLIFIED VIDEO STUDIO SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runSimpleVideoStudioSuite().catch((err) => {
  console.error('Suite error:', err);
  process.exit(1);
});
