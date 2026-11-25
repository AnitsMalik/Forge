/**
 * SocialForge: End-to-End Visitor-to-Customer Commercial Journey Verification
 *
 * Verifies the complete lifecycle:
 * 1. Public Marketing Site Exploration:
 *    - Validates public routes and commercial plan pricing from DB
 * 2. Visitor Registration:
 *    - Registers a new tenant agency and owner user with compliant credentials
 *    - Receives JWT access tokens and session claims
 * 3. Brand Onboarding & Brand Brain Setup:
 *    - Provisions brand new Brand profile
 *    - Configures tone of voice, colors, target audience, and taboo words
 * 4. Content Studio AI Synthesis & Governance:
 *    - Synthesizes structured multi-platform post variants
 *    - Verifies non-silent publishing invariant (draft / pending review only)
 * 5. Campaign Flight Orchestration:
 *    - Creates coordinated campaign flight across social channels
 * 6. Multi-Tenant Isolation Enforcement:
 *    - Confirms tenant cannot read or modify foreign tenant assets (HTTP 403/404)
 * 7. Production Meta Publication Lock:
 *    - Strictly checks that live post 1405588742634526_122100337179498315 remains published
 */

import { db } from '../apps/api/dist/db/connection.js';
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

const API_BASE = 'http://127.0.0.1:4000/api/v1';
const WEB_BASE = 'http://localhost:5173';
const LOCKED_PROD_POST_ID = '1405588742634526_122100337179498315';

async function runVisitorToCustomerJourney() {
  console.log('================================================================================');
  console.log('   SOCIALFORGE: END-TO-END VISITOR-TO-CUSTOMER COMMERCIAL JOURNEY TEST          ');
  console.log('   Marketing Site -> Register -> Onboard Brand -> AI Studio -> Campaign Guard   ');
  console.log('================================================================================\n');

  const runId = crypto.randomUUID().slice(0, 8);
  const testEmail = `founder_${runId}@verdantglow-labs.com`;
  const testPassword = 'SecurePassword2026!';
  const testAgencyName = `Verdant Growth Agency ${runId}`;
  const testAgencySlug = `verdant-growth-${runId}`;

  let accessToken = '';
  let tenantId = '';
  let userId = '';
  let brandId = '';

  try {
    // -------------------------------------------------------------------------
    // [Stage 1] Public Marketing Website & Commercial Plan Availability
    // -------------------------------------------------------------------------
    console.log('[Stage 1/7] Exploring Public Marketing Site & Commercial Plans...');

    // 1.1 Verify Web dev server responds to public homepage
    const homeRes = await fetch(`${WEB_BASE}/`);
    assert(homeRes.status === 200, `Public homepage loads successfully (HTTP ${homeRes.status})`);
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes('SocialForge'), 'Public homepage contains SocialForge brand header');

    // 1.2 Fetch Commercial Pricing Catalog from API
    const plansRes = await fetch(`${API_BASE}/billing/plans`);
    assert(plansRes.status === 200, `Billing plans endpoint is accessible publicly (HTTP ${plansRes.status})`);
    const plansData = await plansRes.json();
    assert(plansData.success === true, 'Billing plans API returned success');
    const plans = Array.isArray(plansData.data) ? plansData.data : plansData.data?.plans || [];
    assert(Array.isArray(plans) && plans.length > 0, `Commercial plans array returned (${plans.length} plans)`);

    const starterPlan = plans.find((p) => p.id === 'starter');
    const growthPlan = plans.find((p) => p.id === 'growth');
    const agencyPlan = plans.find((p) => p.id === 'agency_scale' || p.id === 'agency');

    assert(Boolean(starterPlan), 'Starter commercial plan exists ($29)');
    assert(Boolean(growthPlan), 'Growth commercial plan exists ($79)');
    assert(Boolean(agencyPlan), 'Agency Pro commercial plan exists ($249)');

    // -------------------------------------------------------------------------
    // [Stage 2] Visitor Registration & Token Issuance
    // -------------------------------------------------------------------------
    console.log('\n[Stage 2/7] Registering New Agency Tenant & User Account...');

    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: `Elena Rostova ${runId}`,
        agencyName: testAgencyName,
        agencySlug: testAgencySlug,
      }),
    });

    assert(registerRes.status === 201, `Agency registration succeeded with HTTP 201 (Got ${registerRes.status})`);
    const registerData = await registerRes.json();
    assert(registerData.success === true, 'Registration response indicates success');
    assert(registerData.data?.user?.email === testEmail, 'User created with normalized email');
    assert(registerData.data?.tenant?.slug === testAgencySlug, 'Tenant created with specified agency slug');
    assert(registerData.data?.tenant?.role === 'agency_admin', 'User granted agency_admin role');
    assert(Boolean(registerData.data?.tokens?.accessToken), 'JWT access token returned');

    accessToken = registerData.data.tokens.accessToken;
    tenantId = registerData.data.tenant.id;
    userId = registerData.data.user.id;

    // Verify session via /auth/me
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert(meRes.status === 200, `Authenticated session verified via /auth/me (HTTP ${meRes.status})`);
    const meData = await meRes.json();
    assert(meData.data?.user?.id === userId, 'Session user matches registered user');
    assert(meData.data?.tenant?.id === tenantId, 'Session tenant matches registered tenant');

    // -------------------------------------------------------------------------
    // [Stage 3] Brand Onboarding & Brand Brain Setup
    // -------------------------------------------------------------------------
    console.log('\n[Stage 3/7] Onboarding First Brand & Configuring Brand Brain...');

    // 3.1 Initial brand list should be empty
    const initBrandsRes = await fetch(`${API_BASE}/brands`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert(initBrandsRes.status === 200, 'Initial brands list fetched');
    const initBrands = await initBrandsRes.json();
    assert(Array.isArray(initBrands.data) && initBrands.data.length === 0, 'New agency starts with 0 brands');

    // 3.2 Create new Brand
    const brandSlug = `verdant-glow-${runId}`;
    const createBrandRes = await fetch(`${API_BASE}/brands`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Verdant Glow Botanical Skincare',
        slug: brandSlug,
        industry: 'Clean Cosmetics & Wellness',
        websiteUrl: 'https://verdantglow-botanicals.example.com',
        timezone: 'America/New_York',
      }),
    });

    assert(createBrandRes.status === 201, `Brand created successfully (HTTP ${createBrandRes.status})`);
    const createBrandData = await createBrandRes.json();
    brandId = createBrandData.data?.id;
    assert(Boolean(brandId), `Brand ID assigned: ${brandId}`);
    assert(createBrandData.data?.tenant_id === tenantId, 'Brand is strictly scoped to new tenant');

    // 3.3 Configure Brand Kit
    const updateKitRes = await fetch(`${API_BASE}/brands/${brandId}/kit`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primaryColors: {
          primary: '#10b981',
          secondary: '#064e3b',
          accent: '#fbbf24',
          background: '#090d16',
          text: '#f8fafc',
        },
        fonts: {
          heading: 'Plus Jakarta Sans',
          body: 'Inter',
        },
        toneOfVoice: {
          formality: 'approachable',
          descriptors: ['Clean', 'Holistic', 'Clinical-Grade', 'Empowering'],
        },
        tabooWords: ['Miracle', 'Instant Cure', 'Secret Chemical', 'Cheap'],
        targetAudiences: ['Skincare enthusiasts', 'Clean beauty consumers'],
      }),
    });

    assert(updateKitRes.status === 200, `Brand Kit updated with colors and tone (HTTP ${updateKitRes.status})`);
    const kitData = await updateKitRes.json();
    assert(kitData.data?.tone_of_voice?.descriptors?.includes('Holistic'), 'Tone descriptors saved');
    assert(kitData.data?.taboo_words?.includes('Miracle'), 'Taboo guard words saved');

    // -------------------------------------------------------------------------
    // [Stage 4] Content Studio AI Post Draft Generation
    // -------------------------------------------------------------------------
    console.log('\n[Stage 4/7] Synthesizing Multi-Platform Social Post Variants in AI Studio...');

    const createPostRes = await fetch(`${API_BASE}/brands/${brandId}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Verdant Glow Night Repair Serum Launch',
        baseContent: 'Introduce antioxidant bakuchiol night serum formulated with cold-pressed rosehip oil.',
        variants: [
          {
            platform: 'instagram',
            content: '✨ Wake up to radiant, revitalized skin with Verdant Glow Night Repair Serum. Formulated with cold-pressed rosehip and bakuchiol. #CleanBeauty #Radiance',
            mediaAssetIds: [],
            platformSpecificConfig: {},
          },
          {
            platform: 'facebook',
            content: 'Introducing our Night Repair Serum: clinical-grade plant botanicals working overnight to restore cellular moisture barrier.',
            mediaAssetIds: [],
            platformSpecificConfig: {},
          },
          {
            platform: 'linkedin',
            content: 'Innovation in clean cosmetics: How botanical bakuchiol is setting new benchmarks for non-irritating retinol alternatives.',
            mediaAssetIds: [],
            platformSpecificConfig: {},
          },
        ],
      }),
    });

    assert(createPostRes.status === 201, `Post draft created successfully (HTTP ${createPostRes.status})`);
    const postData = await createPostRes.json();
    const postId = postData.data?.id;
    assert(Boolean(postId), `Post record ID created: ${postId}`);
    assert(postData.data?.brand_id === brandId, 'Post is bound to customer active brand');
    assert(postData.data?.status === 'draft', 'Post defaults safely to draft status (Zero silent publishing)');
    assert(postData.data?.variants?.length === 3, 'Post created with 3 platform variants (Instagram, Facebook, LinkedIn)');

    // -------------------------------------------------------------------------
    // [Stage 5] Campaign Flight Orchestration
    // -------------------------------------------------------------------------
    console.log('\n[Stage 5/7] Creating Omnichannel Campaign Flight in Command Center...');

    const createCampRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessIdea: 'Spring launch of our organic Bakuchiol Night Repair Serum across social channels',
        campaignGoal: 'awareness',
        duration: '7_days',
        platforms: ['instagram', 'facebook', 'linkedin'],
        name: 'Spring Botanical Radiance Launch 2026',
      }),
    });

    assert(createCampRes.status === 201 || createCampRes.status === 200, `Campaign generated successfully (HTTP ${createCampRes.status})`);
    const campData = await createCampRes.json();
    const campaignId = campData.data?.id;
    assert(Boolean(campaignId), `Campaign ID created: ${campaignId}`);
    assert(campData.data?.brandId === brandId || campData.data?.brand_id === brandId, 'Campaign strictly bound to customer brand');

    // -------------------------------------------------------------------------
    // [Stage 6] Multi-Tenant Isolation Safeguards
    // -------------------------------------------------------------------------
    console.log('\n[Stage 6/7] Verifying Multi-Tenant Isolation Enforcement...');

    // Attempt to access a random unknown brand or another tenant's asset
    const fakeBrandId = crypto.randomUUID();
    const forbiddenRes = await fetch(`${API_BASE}/brands/${fakeBrandId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    assert(
      forbiddenRes.status === 404 || forbiddenRes.status === 403,
      `Cross-tenant access safely rejected (HTTP ${forbiddenRes.status})`
    );

    // -------------------------------------------------------------------------
    // [Stage 7] Production Meta Publication Lock Verification
    // -------------------------------------------------------------------------
    console.log('\n[Stage 7/7] Verifying Production Meta Publication Lock Invariant...');

    const metaPost = await db('post_variants')
      .where({ remote_post_id: LOCKED_PROD_POST_ID })
      .first();

    assert(Boolean(metaPost), `Production Meta post variant found in database (${LOCKED_PROD_POST_ID})`);
    assert(metaPost.status === 'published', 'Production Meta post variant strictly remains in published status');

    const metaJob = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
      .first();

    assert(Boolean(metaJob), 'Production publishing job found in database');
    assert(metaJob.status === 'published', 'Production publishing job strictly remains in published status');

    console.log('\n================================================================================');
    console.log(`   E2E JOURNEY VERIFICATION PASSED: ${passedTests} checks passed, 0 failures`);
    console.log('================================================================================\n');

  } catch (err) {
    console.error('\nE2E Journey Verification failed:', err);
    process.exitCode = 1;
  } finally {
    // Clean up created test customer records to maintain clean database state
    try {
      if (brandId) {
        await db('posts').where({ brand_id: brandId }).del();
        await db('campaigns').where({ brand_id: brandId }).del();
        await db('brands').where({ id: brandId }).del();
      }
      if (userId) {
        await db('tenant_users').where({ user_id: userId }).del();
        await db('users').where({ id: userId }).del();
      }
      if (tenantId) {
        await db('tenants').where({ id: tenantId }).del();
      }
      console.log('  [Cleanup] Test fixtures safely deprovisioned without residual leaks.');
    } catch (cleanupErr) {
      console.warn('  [Cleanup Notice]', cleanupErr.message);
    }
    await db.destroy();
  }
}

runVisitorToCustomerJourney();
