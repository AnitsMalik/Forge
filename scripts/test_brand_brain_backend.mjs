import assert from 'assert';
import { db } from '../apps/api/dist/db/connection.js';
import { BrandBrainService } from '../apps/api/dist/services/brandBrainService.js';

let passed = 0;
let total = 0;

function check(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS [Test ${total}]: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [Test ${total}]: ${message}`);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: BRAND BRAIN 16-DIMENSION ENGINE & API SUITE             ');
  console.log('========================================================================\n');

  try {
    const brand = await db('brands').first();
    assert(brand, 'At least one brand must exist');
    console.log(`Testing Brand: "${brand.name}" (ID: ${brand.id})\n`);

    // 1. Fetch Brand Brain
    console.log('[Track 1] Retrieving 16-dimension Brand Brain...');
    const brain = await BrandBrainService.getBrandBrain(brand.id);
    check(brain !== null && typeof brain === 'object', 'BrandBrain object successfully fetched or auto-initialized');
    check(brain.brandId === brand.id, 'BrandBrain linked to correct brand ID');
    check(Boolean(brain.businessProfile), 'Dimension 1: Business profile exists');
    check(Array.isArray(brain.products), 'Dimension 2: Products list exists');
    check(Array.isArray(brain.services), 'Dimension 3: Services list exists');
    check(Array.isArray(brain.usps), 'Dimension 4: USPs list exists');
    check(Boolean(brain.targetAudience), 'Dimension 5: Target audience exists');
    check(Array.isArray(brain.painPoints), 'Dimension 6: Pain points exists');
    check(Array.isArray(brain.brandValues), 'Dimension 7: Brand values exists');
    check(Boolean(brain.tone), 'Dimension 8: Tone configuration exists');
    check(Boolean(brain.writingStyle), 'Dimension 9: Writing style exists');
    check(Array.isArray(brain.languages), 'Dimension 10: Target languages exists');
    check(Array.isArray(brain.ctaPreferences), 'Dimension 11: Call to Action preferences exists');
    check(Boolean(brain.emojiPreferences), 'Dimension 12: Emoji preferences exists');
    check(Boolean(brain.hashtagPreferences), 'Dimension 13: Hashtag preferences exists');
    check(Array.isArray(brain.topicsToAvoid), 'Dimension 14: Topics to avoid safety guardrails exists');
    check(Boolean(brain.visualIdentity), 'Dimension 15: Visual identity design system exists');
    check(Array.isArray(brain.contentPillars), 'Dimension 16: Content pillars exists');

    // 2. Test AI System Prompt Builder
    console.log('\n[Track 2] Generating Centralized AI System Prompt...');
    const aiPrompt = BrandBrainService.buildAiContextPrompt(brain);
    check(typeof aiPrompt === 'string' && aiPrompt.length > 100, `AI Prompt constructed (${aiPrompt.length} chars)`);
    check(aiPrompt.includes(brain.businessProfile.name || brand.name), 'AI Prompt includes Brand/Company name');
    check(aiPrompt.includes('STRICT BRAND SAFETY') || aiPrompt.includes('SAFETY'), 'AI Prompt includes Safety Guardrails section');

    // 3. Test Brand Brain Updates and Persistence
    console.log('\n[Track 3] Updating Brand Brain & Verifying Persistence...');
    const testTag = `#TestTag_${Date.now()}`;
    const updatedBrainPayload = {
      ...brain,
      hashtagPreferences: {
        ...brain.hashtagPreferences,
        defaultTags: [...(brain.hashtagPreferences.defaultTags || []), testTag],
      },
    };

    const savedBrain = await BrandBrainService.updateBrandBrain(brand.id, updatedBrainPayload);
    check(savedBrain.hashtagPreferences.defaultTags.includes(testTag), 'Updated tag reflected in returned Brand Brain');

    // Re-fetch directly from DB to verify persistence
    const refetched = await BrandBrainService.getBrandBrain(brand.id);
    check(refetched.hashtagPreferences.defaultTags.includes(testTag), 'Updated tag successfully persisted to database');

    // Clean up added test tag
    const cleanTags = refetched.hashtagPreferences.defaultTags.filter(t => t !== testTag);
    await BrandBrainService.updateBrandBrain(brand.id, {
      ...refetched,
      hashtagPreferences: {
        ...refetched.hashtagPreferences,
        defaultTags: cleanTags,
      },
    });
    console.log('  ✓ Cleaned up test tag fixture');

  } catch (err) {
    console.error('Track failure:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }

  console.log('\n========================================================================');
  console.log(`   BRAND BRAIN BACKEND RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed < total) process.exit(1);
}

run();
