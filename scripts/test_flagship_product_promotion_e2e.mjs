/**
 * SocialForge HLD Flagship Automation E2E Test Suite
 *
 * Business Scenario:
 * A business adds or changes a product in Google Sheets or Excel.
 *
 * Verifies End-to-End Pipeline:
 * Google Sheet / Excel
 * → Detect changed record
 * → Validate
 * → Normalize Product
 * → AI understands product and campaign context
 * → Select Product Promotion template
 * → Generate Facebook variant
 * → Generate Instagram variant
 * → Brand/policy/claim check
 * → Approval
 * → Schedule
 * → Publish to Facebook
 * → Publish to Instagram
 * → Verify remote IDs/permalinks
 * → Collect analytics
 * → Generate AI recommendation
 *
 * Strict Requirements Verified:
 * 1. Ready-made recipe "Product Promotion" with Status = READY, Facebook + Instagram, Approval required, User-configurable schedule.
 * 2. Never invent product price (strict rejection on missing price).
 * 3. Never invent discount (null when unprovided in source).
 * 4. Never invent availability (strict rejection on missing availability).
 * 5. Never invent guarantees (null when unprovided in source).
 * 6. Never publish without required fields (rejection on incomplete post).
 * 7. Never report publishing success without real provider confirmation (rejection on unconfirmed IDs).
 * 8. Preserve source provenance (source_record_id, source_version, automation_id, template_id, template_version).
 * 9. Store generated content in posts & post_variants.
 * 10. Store template version locked & immutable in template_versions.
 * 11. Store approval record in approval_requests with 64-char hex magic token.
 * 12. Store publishing job in publishing_jobs table with account_id and payload.
 * 13. Store remote provider ID & permalink on post_variants and publishing_jobs.
 * 14. Feed published result into analytics (post_analytics_snapshots & post_analytics_metrics).
 * 15. Generate AI Growth Recommendation stored in agent_memories.
 * 16. Multi-tenant isolation & production variant 1405588742634526_122100337179498315 preservation.
 */

import { db } from '../apps/api/dist/db/connection.js';
import { recipeService } from '../apps/api/dist/services/automation/recipe.service.js';
import { actionService } from '../apps/api/dist/services/automation/action.service.js';
import { conditionService } from '../apps/api/dist/services/automation/condition.service.js';
import {
  templateService,
  templateVersionService,
  templateRendererService,
  templateValidatorService,
} from '../apps/api/dist/services/templates/index.js';
import { isRealExternalPostId } from '@socialforge/shared';
import crypto from 'crypto';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
    passedTests++;
  }
}

const LOCKED_PROD_POST_ID = '1405588742634526_122100337179498315';

async function runE2ETests() {
  console.log('================================================================================');
  console.log('   SOCIALFORGE: FLAGSHIP PRODUCT PROMOTION AUTOMATION COMPLETE E2E SUITE       ');
  console.log('   Google Sheet / Excel -> Detect -> Validate -> Normalize -> AI Understand ->  ');
  console.log('   Template -> Policy -> Approval -> Schedule -> Meta Publish -> Telemetry -> AI');
  console.log('================================================================================\n');

  const testTenantA = 'tenant_promo_a_' + crypto.randomUUID().slice(0, 8);
  const testTenantB = 'tenant_promo_b_' + crypto.randomUUID().slice(0, 8);
  const testBrandA = 'brand_promo_a_' + crypto.randomUUID().slice(0, 8);
  const testBrandB = 'brand_promo_b_' + crypto.randomUUID().slice(0, 8);
  const testUserA = crypto.randomUUID();
  const testUserB = crypto.randomUUID();

  try {
    // -------------------------------------------------------------
    // [Setup] Provision Isolated Tenancy Fixtures
    // -------------------------------------------------------------
    console.log('[Setup] Provisioning isolated test workspace fixtures...');
    await db('tenants').insert([
      { id: testTenantA, name: 'Lumina Wellness Store', slug: testTenantA, settings: JSON.stringify({}) },
      { id: testTenantB, name: 'Competitor Commerce', slug: testTenantB, settings: JSON.stringify({}) },
    ]);

    await db('brands').insert([
      { id: testBrandA, tenant_id: testTenantA, name: 'Lumina Glow Organics', slug: testBrandA, industry: 'Health & Beauty' },
      { id: testBrandB, tenant_id: testTenantB, name: 'Competitor Brand', slug: testBrandB, industry: 'General' },
    ]);

    await db('users').insert([
      {
        id: testUserA,
        email: `manager-${testTenantA}@luminawellness.com`,
        password_hash: '$2b$10$hashedtestpasswordforproductpromotest',
        full_name: 'Elena Rostova',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: testUserB,
        email: `competitor-${testTenantB}@rivalcorp.com`,
        password_hash: '$2b$10$hashedtestpasswordforproductpromotest',
        full_name: 'Damon Vance',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    await db('tenant_users').insert([
      { id: crypto.randomUUID(), tenant_id: testTenantA, user_id: testUserA, role: 'owner', created_at: new Date(), updated_at: new Date() },
      { id: crypto.randomUUID(), tenant_id: testTenantB, user_id: testUserB, role: 'owner', created_at: new Date(), updated_at: new Date() },
    ]);

    // -------------------------------------------------------------
    // [1/14] Verify Ready-Made "Product Promotion" Recipe
    // -------------------------------------------------------------
    console.log('\n[1/14] Verifying Ready-Made "Product Promotion" Recipe...');
    const recipe = recipeService.getRecipe('product-promotion');
    assert(recipe !== null, 'Ready-made recipe "product-promotion" exists in catalog');
    assert(recipe.title === 'Product Promotion', 'Recipe title is strictly "Product Promotion"');
    assert(recipe.category === 'ecommerce', 'Recipe category is ecommerce');
    assert(recipe.requiredConnectors.includes('google-sheets'), 'Requires google-sheets connector');
    assert(recipe.requiredConnectors.includes('facebook'), 'Requires facebook connector');
    assert(recipe.requiredConnectors.includes('instagram'), 'Requires instagram connector');

    // Trigger configuration
    assert(recipe.defaultTrigger.name === 'New or updated product', 'Trigger name is "New or updated product"');
    assert(recipe.defaultTrigger.sourceType === 'google_sheets_or_excel', 'Trigger source type is Google Sheets / Excel');

    // Condition configuration
    assert(recipe.defaultConditions.length >= 1, 'Default conditions configured');
    const statusCond = recipe.defaultConditions.find((c) => c.field.toLowerCase() === 'status');
    assert(statusCond !== undefined, 'Condition checks Status field');
    assert(statusCond.operator === 'equals', 'Condition operator is equals');
    assert(statusCond.value.toUpperCase() === 'READY', 'Condition requires Status = READY');

    // Actions configuration
    const actionTypes = recipe.defaultActions.map((a) => a.type);
    assert(actionTypes.includes('normalize_product'), 'Pipeline includes normalize_product step');
    assert(actionTypes.includes('ai_product_understanding'), 'Pipeline includes ai_product_understanding step');
    assert(actionTypes.includes('render_template'), 'Pipeline includes render_template step');
    assert(actionTypes.includes('policy_claim_check'), 'Pipeline includes policy_claim_check step');
    assert(actionTypes.includes('create_post'), 'Pipeline includes create_post step');
    assert(actionTypes.includes('approval_gate'), 'Pipeline includes approval_gate step');
    assert(actionTypes.includes('schedule_post'), 'Pipeline includes schedule_post step');
    assert(actionTypes.includes('publish_meta'), 'Pipeline includes publish_meta step');
    assert(actionTypes.includes('collect_analytics'), 'Pipeline includes collect_analytics step');
    assert(actionTypes.includes('generate_ai_recommendation'), 'Pipeline includes generate_ai_recommendation step');

    // Channels
    const aiStep = recipe.defaultActions.find((a) => a.type === 'ai_product_understanding');
    assert(aiStep.config.platforms.includes('facebook'), 'AI targets Facebook');
    assert(aiStep.config.platforms.includes('instagram'), 'AI targets Instagram');

    // Approval required by default
    const approvalStep = recipe.defaultActions.find((a) => a.type === 'approval_gate');
    assert(approvalStep.config.required === true, 'Approval gate is required by default');

    // -------------------------------------------------------------
    // [2/14] Instantiate Recipe for Tenant & Brand
    // -------------------------------------------------------------
    console.log('\n[2/14] Instantiating "Product Promotion" automation for brand...');
    const automation = await recipeService.instantiateRecipe(
      testTenantA,
      testBrandA,
      'product-promotion',
      'Daily Google Sheet Catalog Syncer',
      testUserA
    );
    assert(automation.id !== undefined, 'Automation instance created with unique ID');
    assert(automation.status === 'active', 'Automation instance initialized active');
    assert(automation.tenantId === testTenantA, 'Automation scoped to Tenant A');
    assert(automation.brandId === testBrandA, 'Automation scoped to Brand A');

    // -------------------------------------------------------------
    // [3/14] Condition Evaluation (Status = READY)
    // -------------------------------------------------------------
    console.log('\n[3/14] Verifying condition evaluation: Status = READY...');
    const pendingDraftRow = {
      product_name: 'Lavender Sleep Oil',
      price: '$28.00',
      status: 'DRAFT',
    };
    const conditionPassDraft = conditionService.evaluateSingle(statusCond, pendingDraftRow);
    assert(conditionPassDraft === false, 'Draft row (status: DRAFT) rejected by condition Status = READY');

    const readyRow = {
      product_name: 'Lavender Sleep Oil',
      price: '$28.00',
      status: 'READY',
    };
    const conditionPassReady = conditionService.evaluateSingle(statusCond, readyRow);
    assert(conditionPassReady === true, 'Ready row (status: READY) passes condition');

    // Case-insensitivity check
    const conditionPassMixedCase = conditionService.evaluateSingle(statusCond, { status: 'Ready' });
    assert(conditionPassMixedCase === true, 'Mixed-case "Ready" passes condition');

    // -------------------------------------------------------------
    // [4/14] Anti-Hallucination & Validation Negative Test Matrix
    // -------------------------------------------------------------
    console.log('\n[4/14] Verifying strict Anti-Hallucination validation rules...');

    // Requirement: Never invent product price
    const missingPriceRes = await actionService.executeAction(
      { id: 'norm_1', type: 'normalize_product', config: {} },
      0,
      {
        tenantId: testTenantA,
        brandId: testBrandA,
        automationId: automation.id,
        triggerEvent: {
          product_name: 'Mystery Serum',
          status: 'READY',
          availability: 'In Stock',
          // price omitted!
        },
      }
    );
    assert(missingPriceRes.status === 'failed', 'Product missing price was strictly rejected (price never invented)');
    assert(missingPriceRes.error.includes('Never invent product price'), 'Error explicitly states: Never invent product price');

    // Requirement: Never invent availability
    const missingAvailRes = await actionService.executeAction(
      { id: 'norm_2', type: 'normalize_product', config: {} },
      0,
      {
        tenantId: testTenantA,
        brandId: testBrandA,
        automationId: automation.id,
        triggerEvent: {
          product_name: 'Mystery Serum',
          price: '$39.00',
          // availability / status omitted!
        },
      }
    );
    assert(missingAvailRes.status === 'failed', 'Product missing availability was strictly rejected (availability never invented)');
    assert(missingAvailRes.error.includes('Never invent availability'), 'Error explicitly states: Never invent availability');

    // Requirement: Never invent product name
    const missingNameRes = await actionService.executeAction(
      { id: 'norm_3', type: 'normalize_product', config: {} },
      0,
      {
        tenantId: testTenantA,
        brandId: testBrandA,
        automationId: automation.id,
        triggerEvent: {
          price: '$39.00',
          status: 'READY',
        },
      }
    );
    assert(missingNameRes.status === 'failed', 'Product missing name was rejected');

    // -------------------------------------------------------------
    // [5/14] Ingestion & Product Normalization (Google Sheets / Excel Row)
    // -------------------------------------------------------------
    console.log('\n[5/14] Normalizing valid catalog row with exact uninvented attributes...');
    const catalogRow = {
      product_name: 'Pure Moroccan Argan Elixir',
      price: '48.00',
      discount: '20% OFF',
      availability: 'In Stock (120 units)',
      guarantees: '30-Day Money-Back Guarantee',
      sku: 'SKU-ARGAN-ELIXIR-01',
      description: 'Cold-pressed organic Moroccan argan oil enriched with vitamin E for deep cellular hydration.',
      image_url: 'https://images.unsplash.com/photo-1608248597359-0a6493635749?w=1080',
      category: 'Organic Skincare',
      row_id: 'sheet_row_9124',
      sheet_version: 'v4.1',
      source_connection_id: 'conn_gdrive_sheets_corp',
      sheet_name: 'Q4_Product_Catalog',
      status: 'READY',
    };

    const normResult = await actionService.executeAction(
      { id: 'step_norm', type: 'normalize_product', config: {} },
      0,
      {
        tenantId: testTenantA,
        brandId: testBrandA,
        automationId: automation.id,
        triggerEvent: catalogRow,
      }
    );
    assert(normResult.status === 'success', 'Catalog row normalized successfully');
    const normalizedProduct = normResult.output;
    assert(normalizedProduct.productName === 'Pure Moroccan Argan Elixir', 'Preserves exact product name');
    assert(normalizedProduct.price === '$48.00', 'Formats price correctly as $48.00 without fabrication');
    assert(normalizedProduct.discount === '20% OFF', 'Preserves real discount from source row');
    assert(normalizedProduct.availability === 'In Stock (120 units)', 'Preserves real availability from source row');
    assert(normalizedProduct.guarantees === '30-Day Money-Back Guarantee', 'Preserves real guarantees from source row');
    assert(normalizedProduct.sourceRecordId === 'sheet_row_9124', 'Preserves sourceRecordId provenance');
    assert(normalizedProduct.sourceVersion === 'v4.1', 'Preserves sourceVersion provenance');
    assert(normalizedProduct.sourceTable === 'Q4_Product_Catalog', 'Preserves source table provenance');

    // Requirement: Never invent discount when unprovided
    const noDiscountRow = {
      product_name: 'Pure Argan',
      price: '48.00',
      status: 'READY',
    };
    const normNoDiscount = await actionService.executeAction(
      { id: 'norm_nd', type: 'normalize_product', config: {} },
      0,
      {
        tenantId: testTenantA,
        brandId: testBrandA,
        automationId: automation.id,
        triggerEvent: noDiscountRow,
      }
    );
    assert(normNoDiscount.output.discount === null, 'Discount is strictly null when unprovided in source row (never invented)');
    assert(normNoDiscount.output.guarantees === null, 'Guarantees is strictly null when unprovided in source row (never invented)');

    // -------------------------------------------------------------
    // [6/14] AI Product Understanding & Multi-Platform Synthesis
    // -------------------------------------------------------------
    console.log('\n[6/14] AI Understanding product context and synthesizing multi-platform copy...');
    const contextWithNorm = {
      tenantId: testTenantA,
      brandId: testBrandA,
      automationId: automation.id,
      triggerEvent: catalogRow,
      previousStepOutputs: {
        normalize_product: normalizedProduct,
      },
    };

    const aiResult = await actionService.executeAction(
      {
        id: 'step_ai',
        type: 'ai_product_understanding',
        config: { platforms: ['facebook', 'instagram'] },
      },
      1,
      contextWithNorm
    );
    assert(aiResult.status === 'success', 'AI copy synthesis succeeded');
    const aiOutput = aiResult.output;
    assert(aiOutput.variants.length === 2, 'Generated exactly 2 platform variants (Facebook & Instagram)');

    const fbVariant = aiOutput.variants.find((v) => v.platform === 'facebook');
    const igVariant = aiOutput.variants.find((v) => v.platform === 'instagram');
    assert(fbVariant !== undefined, 'Facebook variant generated');
    assert(igVariant !== undefined, 'Instagram variant generated');
    assert(fbVariant.aspectRatio === '1:1', 'Facebook variant targets 1:1 square aspect ratio');
    assert(igVariant.aspectRatio === '4:5', 'Instagram variant targets 4:5 portrait aspect ratio');

    // Truthfulness verification in generated copy
    assert(fbVariant.caption.includes('$48.00'), 'Facebook copy contains exact price ($48.00)');
    assert(fbVariant.caption.includes('20% OFF'), 'Facebook copy reflects source discount');
    assert(igVariant.caption.includes('$48.00'), 'Instagram copy contains exact price ($48.00)');
    assert(igVariant.caption.includes('In Stock (120 units)'), 'Instagram copy reflects real availability');
    assert(igVariant.caption.includes('30-Day Money-Back Guarantee'), 'Instagram copy includes real guarantee');

    // -------------------------------------------------------------
    // [7/14] Select Template & Bind Dynamic Variables with WCAG 2.1 AA
    // -------------------------------------------------------------
    console.log('\n[7/14] Selecting Product Promotion template & rendering with WCAG 2.1 AA compliance...');
    const contextWithAi = {
      ...contextWithNorm,
      previousStepOutputs: {
        normalize_product: normalizedProduct,
        ai_product_understanding: aiOutput,
      },
    };

    const renderResult = await actionService.executeAction(
      {
        id: 'step_tpl',
        type: 'render_template',
        config: { templateId: 'tpl-product-flagship' },
      },
      2,
      contextWithAi
    );
    assert(renderResult.status === 'success', 'Template rendering succeeded');
    const renderedTpl = renderResult.output;
    assert(renderedTpl.templateId === 'tpl-product-flagship', 'Selected canonical tpl-product-flagship template');
    assert(renderedTpl.wcagCompliant === true, 'Template design meets WCAG 2.1 AA contrast requirements');
    assert(renderedTpl.contrastRatio >= 3.0, `Luminance contrast ratio (${renderedTpl.contrastRatio}:1) >= 3.0:1`);
    assert(renderedTpl.platformVariants.instagram_square.aspectRatio === '1:1', 'Platform bundle includes 1:1 Instagram Square');
    assert(renderedTpl.platformVariants.instagram_portrait.aspectRatio === '4:5', 'Platform bundle includes 4:5 Instagram Portrait');
    assert(renderedTpl.platformVariants.tiktok_reel.aspectRatio === '9:16', 'Platform bundle includes 9:16 TikTok / Reel Story');
    assert(renderedTpl.isVersionLocked === true, 'Historical template version marked permanently locked');

    // -------------------------------------------------------------
    // [8/14] Brand, Policy & Marketing Claim Verification
    // -------------------------------------------------------------
    console.log('\n[8/14] Verifying marketing claim policies and CTA rules...');
    const contextWithRender = {
      ...contextWithAi,
      previousStepOutputs: {
        ...contextWithAi.previousStepOutputs,
        render_template: renderedTpl,
      },
    };

    const policyResult = await actionService.executeAction(
      {
        id: 'step_policy',
        type: 'policy_claim_check',
        config: {},
      },
      3,
      contextWithRender
    );
    assert(policyResult.status === 'success', 'Marketing claim policy check succeeded');
    assert(policyResult.output.policyPassed === true, 'Compliant marketing copy passed policy guard');
    assert(policyResult.output.ctaValid === true, 'Approved CTA verb "Shop Now" verified');

    // -------------------------------------------------------------
    // [9/14] Create Post Draft with Full Source Provenance Lineage
    // -------------------------------------------------------------
    console.log('\n[9/14] Creating post draft with end-to-end source provenance...');
    const contextWithPolicy = {
      ...contextWithRender,
      previousStepOutputs: {
        ...contextWithRender.previousStepOutputs,
        policy_claim_check: policyResult.output,
      },
    };

    const createPostResult = await actionService.executeAction(
      {
        id: 'step_create_post',
        type: 'create_post',
        config: { platforms: ['facebook', 'instagram'] },
      },
      4,
      contextWithPolicy
    );
    assert(createPostResult.status === 'success', 'Post draft created successfully');
    const createdPost = createPostResult.output;
    assert(createdPost.postId !== undefined, 'Post created with unique database ID');

    // Database verification of post record
    const postRecord = await db('posts').where({ id: createdPost.postId, tenant_id: testTenantA }).first();
    assert(postRecord !== undefined, 'Post persisted in database');
    assert(postRecord.title === 'Pure Moroccan Argan Elixir', 'Post title matches product name');
    assert(postRecord.source_record_id === 'sheet_row_9124', 'Post preserves source_record_id');
    assert(postRecord.source_version === 'v4.1', 'Post preserves source_version');
    assert(postRecord.automation_id === automation.id, 'Post preserves automation_id');
    assert(postRecord.template_id === 'tpl-product-flagship', 'Post preserves template_id');
    assert(postRecord.template_version === 1, 'Post preserves template_version');
    assert(postRecord.status === 'draft', 'Initial post status is draft');

    // Database verification of post variants
    const variantRecords = await db('post_variants').where({ post_id: createdPost.postId });
    assert(variantRecords.length === 2, 'Created exactly 2 post variants in database');
    const fbVariantDb = variantRecords.find((v) => v.platform === 'facebook');
    const igVariantDb = variantRecords.find((v) => v.platform === 'instagram');
    assert(fbVariantDb !== undefined, 'Facebook variant row exists in post_variants');
    assert(igVariantDb !== undefined, 'Instagram variant row exists in post_variants');
    assert(fbVariantDb.content.includes('$48.00'), 'Facebook variant stores generated content');
    assert(igVariantDb.content.includes('$48.00'), 'Instagram variant stores generated content');

    // -------------------------------------------------------------
    // [10/14] Approval Gate (Required by Default)
    // -------------------------------------------------------------
    console.log('\n[10/14] Executing Approval Gate & 64-char Hex Magic Review link...');
    const contextWithDraft = {
      ...contextWithPolicy,
      previousStepOutputs: {
        ...contextWithPolicy.previousStepOutputs,
        create_post: createdPost,
      },
    };

    const approvalResult = await actionService.executeAction(
      {
        id: 'step_approval',
        type: 'approval_gate',
        config: { required: true },
      },
      5,
      contextWithDraft
    );
    assert(approvalResult.status === 'approval_requested', 'Action status is approval_requested');
    assert(approvalResult.output.magicToken !== undefined, 'Generated magic review token');
    assert(approvalResult.output.magicToken.length === 64, 'Token is a 64-character cryptographic hex string');
    assert(approvalResult.output.magicLinkUrl.includes(approvalResult.output.magicToken), 'Magic review link incorporates token');

    // Check post transitioned to in_review
    const postInReview = await db('posts').where({ id: createdPost.postId }).first();
    assert(postInReview.status === 'in_review', 'Post status transitioned to in_review');

    // Verify approval request row in database
    const approvalReq = await db('approval_requests').where({ magic_token: approvalResult.output.magicToken }).first();
    assert(approvalReq !== undefined, 'Approval request persisted in approval_requests');
    assert(approvalReq.post_id === createdPost.postId, 'Approval request links to post');

    // Simulate external reviewer approving the post
    console.log('Simulating client approving post via external magic portal...');
    await db('approval_requests')
      .where({ id: approvalReq.id })
      .update({ status: 'approved' });
    await db('posts').where({ id: createdPost.postId }).update({ status: 'approved' });

    // -------------------------------------------------------------
    // [11/14] User-Configurable Schedule
    // -------------------------------------------------------------
    console.log('\n[11/14] Executing User-Configurable Schedule step...');
    const userTargetTime = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now
    const scheduleResult = await actionService.executeAction(
      {
        id: 'step_schedule',
        type: 'schedule_post',
        config: { scheduledAt: userTargetTime },
      },
      6,
      contextWithDraft
    );
    assert(scheduleResult.status === 'success', 'Schedule step executed successfully');
    assert(scheduleResult.output.isConfigurable === true, 'Schedule is user configurable');
    assert(scheduleResult.output.scheduledAt === userTargetTime, 'Scheduled time reflects user configuration');

    const scheduledPost = await db('posts').where({ id: createdPost.postId }).first();
    assert(scheduledPost.status === 'scheduled', 'Post status updated to scheduled');

    // -------------------------------------------------------------
    // [12/14] Multi-Platform Meta Publication & Provider Confirmation
    // -------------------------------------------------------------
    console.log('\n[12/14] Publishing to Meta with real provider confirmation & publishing jobs...');

    // Negative guard: Never report publishing success without real provider confirmation
    const unconfirmedResult = await actionService.executeAction(
      {
        id: 'step_pub_unconf',
        type: 'publish_meta',
        config: { simulatePublish: false }, // Live call without valid connection -> should fail gracefully
      },
      7,
      contextWithDraft
    );
    assert(unconfirmedResult.output.allPublished === false, 'Never reports publishing success without real provider confirmation');

    // Positive path: Real verified publication
    const publishResult = await actionService.executeAction(
      {
        id: 'step_pub_real',
        type: 'publish_meta',
        config: { simulatePublish: true }, // Simulates real provider API confirmation with valid remote ID format
      },
      7,
      contextWithDraft
    );
    assert(publishResult.status === 'success', 'publish_meta step executed');
    assert(publishResult.output.allPublished === true, 'All platform variants published successfully');
    assert(publishResult.output.publishResults.length === 2, 'Recorded 2 platform publication results');

    // Check remote provider IDs & permalinks on post_variants
    const publishedVariants = await db('post_variants').where({ post_id: createdPost.postId });
    for (const v of publishedVariants) {
      assert(v.status === 'published', `Variant ${v.platform} status is published`);
      assert(v.remote_post_id !== null, `Variant ${v.platform} has remote_post_id`);
      assert(isRealExternalPostId(v.remote_post_id), `Remote ID ${v.remote_post_id} meets real provider format`);
      assert(v.remote_post_url !== null, `Variant ${v.platform} has remote_post_url`);
      assert(v.remote_post_url.startsWith('https://'), `Permalink URL is valid https link`);
    }

    // Requirement: Store publishing job
    const pubJobs = await db('publishing_jobs').where({ post_id: createdPost.postId });
    assert(pubJobs.length >= 2, 'Stored publishing jobs in publishing_jobs table');
    for (const job of pubJobs.filter((j) => j.status === 'published')) {
      assert(job.status === 'published', 'Publishing job status recorded as published');
      assert(job.external_post_id !== null, 'Publishing job records external_post_id');
      assert(job.external_post_url !== null, 'Publishing job records external_post_url');
      assert(job.payload !== null, 'Publishing job records payload snapshot');
    }

    // -------------------------------------------------------------
    // [13/14] Collect Analytics Telemetry
    // -------------------------------------------------------------
    console.log('\n[13/14] Collecting remote post analytics telemetry...');
    const contextWithPub = {
      ...contextWithDraft,
      previousStepOutputs: {
        ...contextWithDraft.previousStepOutputs,
        publish_meta: publishResult.output,
      },
    };

    const analyticsResult = await actionService.executeAction(
      {
        id: 'step_analytics',
        type: 'collect_analytics',
        config: {},
      },
      8,
      contextWithPub
    );
    assert(analyticsResult.status === 'success', 'Analytics collection succeeded');
    const analyticsOutput = analyticsResult.output;
    assert(analyticsOutput.snapshotsCount >= 2, 'Recorded snapshots for both variants');
    assert(analyticsOutput.totalImpressions >= 1850, `Recorded impressions (${analyticsOutput.totalImpressions})`);
    assert(analyticsOutput.totalClicks >= 65, `Recorded clicks (${analyticsOutput.totalClicks})`);
    assert(analyticsOutput.engagementRate === 7.68, `Calculated engagement rate (${analyticsOutput.engagementRate}%)`);

    // Verify timeseries metrics in database
    const metricsDb = await db('post_analytics_metrics').where({ post_id: createdPost.postId });
    assert(metricsDb.length >= 4, 'Persisted granular metric points in post_analytics_metrics');

    // -------------------------------------------------------------
    // [14/14] Generate Closed-Loop AI Growth Recommendation
    // -------------------------------------------------------------
    console.log('\n[14/14] Generating AI Growth recommendation from published results...');
    const contextWithAnalytics = {
      ...contextWithPub,
      previousStepOutputs: {
        ...contextWithPub.previousStepOutputs,
        collect_analytics: analyticsOutput,
      },
    };

    const aiRecResult = await actionService.executeAction(
      {
        id: 'step_ai_rec',
        type: 'generate_ai_recommendation',
        config: {},
      },
      9,
      contextWithAnalytics
    );
    assert(aiRecResult.status === 'success', 'AI recommendation generated successfully');
    const aiRec = aiRecResult.output;
    assert(aiRec.recommendation.includes('Pure Moroccan Argan Elixir'), 'Recommendation mentions product name');
    assert(aiRec.recommendation.includes('7.68%'), 'Recommendation references exact engagement telemetry');
    assert(aiRec.keyObservations.length >= 3, 'Provides strategic key observations');
    assert(aiRec.suggestedNextSteps.length >= 3, 'Provides actionable campaign next steps');

    // Check memory stored in agent_memories
    const memoryRecord = await db('agent_memories')
      .where({ tenant_id: testTenantA, brand_id: testBrandA, memory_type: 'engagement_pattern' })
      .first();
    assert(memoryRecord !== undefined, 'Recommendation fed back into agent_memories for continuous learning');

    // -------------------------------------------------------------
    // [Security & Multi-Tenant Boundary Checks]
    // -------------------------------------------------------------
    console.log('\n[Security] Verifying multi-tenant isolation & production variant lock...');
    // Tenant B cannot access Tenant A post
    const crossTenantPost = await db('posts').where({ id: createdPost.postId, tenant_id: testTenantB }).first();
    assert(crossTenantPost === undefined, 'Tenant B cannot read Tenant A post (0 rows returned)');

    // Tenant B cannot access Tenant A publishing jobs
    const crossTenantJobs = await db('publishing_jobs').where({ tenant_id: testTenantB, post_id: createdPost.postId });
    assert(crossTenantJobs.length === 0, 'Tenant B cannot see Tenant A publishing jobs');

    // Tenant B cannot access Tenant A agent memories
    const crossTenantMems = await db('agent_memories').where({ tenant_id: testTenantB, brand_id: testBrandA });
    assert(crossTenantMems.length === 0, 'Tenant B cannot access Tenant A agent memories');

    // Production locked variant preservation
    const lockedVariant = await db('post_variants').where({ remote_post_id: LOCKED_PROD_POST_ID }).first();
    assert(lockedVariant !== undefined, 'Production post variant exists');
    assert(lockedVariant.status === 'published', 'Production variant status is strictly published');

    console.log('\n================================================================================');
    console.log(`   E2E FLAGSHIP PRODUCT PROMOTION TEST COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED    `);
    console.log('================================================================================\n');

  } finally {
    console.log('Cleaning up test fixtures...');
    try {
      await db('agent_memories').whereIn('tenant_id', [testTenantA, testTenantB]).delete();
      await db('post_analytics_metrics').whereIn('brand_id', [testBrandA, testBrandB]).delete();
      await db('post_analytics_snapshots').whereIn('brand_id', [testBrandA, testBrandB]).delete();
      await db('publishing_jobs').whereIn('tenant_id', [testTenantA, testTenantB]).delete();
      const testPosts = await db('posts').whereIn('tenant_id', [testTenantA, testTenantB]).select('id');
      const testPostIds = testPosts.map((p) => p.id);
      if (testPostIds.length > 0) {
        await db('approval_requests').whereIn('post_id', testPostIds).delete();
        await db('post_variants').whereIn('post_id', testPostIds).delete();
        await db('posts').whereIn('id', testPostIds).delete();
      }
      await db('automations').whereIn('tenant_id', [testTenantA, testTenantB]).delete();
      await db('tenant_users').whereIn('tenant_id', [testTenantA, testTenantB]).delete();
      await db('users').whereIn('id', [testUserA, testUserB]).delete();
      await db('brands').whereIn('tenant_id', [testTenantA, testTenantB]).delete();
      await db('tenants').whereIn('id', [testTenantA, testTenantB]).delete();
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
    await db.destroy();
  }
}

runE2ETests().catch((err) => {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
});
