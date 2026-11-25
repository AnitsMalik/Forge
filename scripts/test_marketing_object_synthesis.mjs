/**
 * SocialForge: Marketing Object AI Synthesis & Automation Triggers Test Suite
 * Connects Stage 3 Normalized Marketing Objects to AI Copy Synthesis,
 * Template Rendering, Post Creation with Full Lineage, and Automation Triggers.
 */

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../apps/api/dist/config/index.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const uuidv4 = () => crypto.randomUUID();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: MARKETING OBJECT AI SYNTHESIS & AUTOMATION SUITE       ');
  console.log('   Stage 3 Data -> AI Copy -> Templates -> Post Lineage -> Triggers    ');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  const tenantAId = 'tenant_syn_a_' + uuidv4().slice(0, 8);
  const tenantBId = 'tenant_syn_b_' + uuidv4().slice(0, 8);
  const userAId = 'user_syn_a_' + uuidv4().slice(0, 8);
  const userBId = 'user_syn_b_' + uuidv4().slice(0, 8);
  const brandAId = 'brand_syn_a_' + uuidv4().slice(0, 8);
  const brandBId = 'brand_syn_b_' + uuidv4().slice(0, 8);

  let tokenA = '';
  let tokenB = '';

  let productId = '';
  let offerId = '';
  let reviewId = '';
  let eventId = '';
  let invalidObjId = '';

  try {
    const now = new Date();
    // [Setup] Provisioning test fixtures
    console.log('[1/8] Provisioning isolated test fixtures and auth sessions...');

    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Tenant Synthesizer A', tenantAId]
    );
    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantBId, 'Tenant Synthesizer B', tenantBId]
    );

    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'User A', 0, 1, NOW(), NOW())`,
      [userAId, `user-synth-a-${Date.now()}@socialforge.io`]
    );
    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'User B', 0, 1, NOW(), NOW())`,
      [userBId, `user-synth-b-${Date.now()}@socialforge.io`]
    );

    await db.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), tenantAId, userAId]
    );
    await db.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), tenantBId, userBId]
    );

    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Brand Glow A', ?, NOW(), NOW())`,
      [brandAId, tenantAId, `glow-a-${brandAId}`]
    );
    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Brand Glow B', ?, NOW(), NOW())`,
      [brandBId, tenantBId, `glow-b-${brandBId}`]
    );

    tokenA = jwt.sign(
      { userId: userAId, email: 'usera@socialforge.io', tenantId: tenantAId, role: 'owner' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    tokenB = jwt.sign(
      { userId: userBId, email: 'userb@socialforge.io', tenantId: tenantBId, role: 'owner' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    assert(tokenA.length > 20, 'Generated valid auth JWT for Tenant A');
    assert(tokenB.length > 20, 'Generated valid auth JWT for Tenant B');

    // [2/8] Populating Normalized Marketing Objects
    console.log('\n[2/8] Creating Normalized Marketing Objects across multiple types...');

    // 1. Valid Product
    productId = crypto.randomUUID();
    const productData = {
      name: 'Wireless Noise Canceling Headphones',
      price: '$249.99',
      priceAmount: 249.99,
      currency: 'USD',
      discount: '25% OFF',
      sku: 'SKU-HEADPHONE-PRO',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      url: 'https://store.glow.com/products/headphones',
      availability: 'in_stock',
      status: 'active',
      description: 'Studio-grade spatial audio with 40-hour ultra-long battery life.',
    };

    await db.execute(
      `INSERT INTO marketing_objects (
        id, tenant_id, brand_id, source, object_type, title, source_record_id, source_version,
        status, properties, normalized_data, provenance, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        tenantAId,
        brandAId,
        'google_sheets',
        'Product',
        productData.name,
        'sheet_row_12',
        'v1.0',
        'valid',
        JSON.stringify(productData),
        JSON.stringify(productData),
        JSON.stringify({ source: 'google_sheets', row: 12 }),
        'idemp_product_1',
        now,
        now,
      ]
    );

    // 2. Valid Offer
    offerId = crypto.randomUUID();
    const offerData = {
      title: 'Spring Flash Sale 2026',
      discount_code: 'SPRING30',
      discount_value: '30%',
      end_date: 'Sunday Midnight',
      terms: 'Applicable to orders over $100.',
    };

    await db.execute(
      `INSERT INTO marketing_objects (
        id, tenant_id, brand_id, source, object_type, title, source_record_id, source_version,
        status, properties, normalized_data, provenance, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        offerId,
        tenantAId,
        brandAId,
        'excel',
        'Offer',
        offerData.title,
        'excel_offer_5',
        'v1.0',
        'valid',
        JSON.stringify(offerData),
        JSON.stringify(offerData),
        JSON.stringify({ source: 'excel', file: 'Offers.xlsx' }),
        'idemp_offer_1',
        now,
        now,
      ]
    );

    // 3. Valid Customer Review
    reviewId = crypto.randomUUID();
    const reviewData = {
      reviewer_name: 'Elena Rostova',
      rating: 5,
      review_text: 'The best headphones I have ever purchased. The sound immersion is astonishing!',
    };

    await db.execute(
      `INSERT INTO marketing_objects (
        id, tenant_id, brand_id, source, object_type, title, source_record_id, source_version,
        status, properties, normalized_data, provenance, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewId,
        tenantAId,
        brandAId,
        'csv',
        'Customer Review',
        `Review by ${reviewData.reviewer_name}`,
        'csv_rev_9',
        'v1.0',
        'valid',
        JSON.stringify(reviewData),
        JSON.stringify(reviewData),
        JSON.stringify({ source: 'csv' }),
        'idemp_review_1',
        now,
        now,
      ]
    );

    // 4. Valid Event
    eventId = crypto.randomUUID();
    const eventData = {
      name: 'Global Creators Summit 2026',
      start_time: 'October 25, 2026 at 10:00 AM EST',
      location: 'Metropolitan Convention Center & Virtual Livestream',
    };

    await db.execute(
      `INSERT INTO marketing_objects (
        id, tenant_id, brand_id, source, object_type, title, source_record_id, source_version,
        status, properties, normalized_data, provenance, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        tenantAId,
        brandAId,
        'google_drive',
        'Event',
        eventData.name,
        'drive_evt_4',
        'v1.0',
        'valid',
        JSON.stringify(eventData),
        JSON.stringify(eventData),
        JSON.stringify({ source: 'google_drive' }),
        'idemp_event_1',
        now,
        now,
      ]
    );

    // 5. Invalid Object
    invalidObjId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO marketing_objects (
        id, tenant_id, brand_id, source, object_type, title, source_record_id, source_version,
        status, properties, normalized_data, validation_errors, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invalidObjId,
        tenantAId,
        brandAId,
        'csv',
        'Product',
        'Broken Item',
        'row_err_1',
        'v1.0',
        'invalid',
        JSON.stringify({ title: 'Broken Item' }),
        JSON.stringify({}),
        JSON.stringify([{ field: 'price', message: 'Missing price' }]),
        'idemp_broken_1',
        now,
        now,
      ]
    );

    assert(productId !== '', 'Product marketing object persisted in database');
    assert(offerId !== '', 'Offer marketing object persisted in database');
    assert(reviewId !== '', 'Customer Review marketing object persisted in database');
    assert(eventId !== '', 'Event marketing object persisted in database');
    assert(invalidObjId !== '', 'Invalid marketing object persisted in database');

    // [3/8] Synthesizing Multi-Platform Social Post from Normalized Product
    console.log('\n[3/8] Synthesizing Multi-Platform Social Post from Product...');
    const synthRes = await request(`/data/objects/${productId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        platforms: ['facebook', 'instagram'],
      }),
    });

    assert(synthRes.status === 200, `POST /data/objects/:id/synthesize-post returns 200 (got ${synthRes.status})`);
    assert(synthRes.data.success === true, 'Synthesis returned success: true');
    assert(synthRes.data.data.postId !== undefined, 'Post was created with unique ID');
    assert(synthRes.data.data.objectType === 'Product', 'Post is linked to Product object type');
    assert(synthRes.data.data.variants.length === 2, 'Generated exactly 2 platform variants (Facebook & Instagram)');

    const igVariant = synthRes.data.data.variants.find((v) => v.platform === 'instagram');
    const fbVariant = synthRes.data.data.variants.find((v) => v.platform === 'facebook');

    assert(igVariant !== undefined, 'Instagram variant present');
    assert(igVariant.aspectRatio === '4:5', 'Instagram variant formatted for 4:5 portrait');
    assert(igVariant.caption.includes('Wireless Noise Canceling Headphones'), 'Instagram caption contains product name');
    assert(igVariant.caption.includes('$249.99'), 'Instagram caption formatted with normalized price');
    assert(igVariant.caption.includes('#ShopNow'), 'Instagram caption includes relevant call to action hashtag');

    assert(fbVariant !== undefined, 'Facebook variant present');
    assert(fbVariant.caption.includes('New Arrival'), 'Facebook caption synthesizes benefit-driven intro');

    // [4/8] Verifying Post Lineage, Template Versioning & Provenance
    console.log('\n[4/8] Verifying Post Database Lineage and Provenance Lineage...');
    const [postRows] = await db.execute(`SELECT * FROM posts WHERE id = ?`, [synthRes.data.data.postId]);
    assert(postRows.length === 1, 'Post record found in posts table');

    const createdPost = postRows[0];
    assert(createdPost.source_record_id === 'sheet_row_12', 'Lineage: source_record_id preserved intact');
    assert(createdPost.source_version === 'v1.0', 'Lineage: source_version preserved intact');
    assert(createdPost.template_id === 'tpl-product-flagship', 'Template: Canonical product template tpl-product-flagship applied');
    assert(createdPost.template_version === 1, 'Template: Template version tracked');

    const prov = typeof createdPost.provenance === 'string' ? JSON.parse(createdPost.provenance) : createdPost.provenance;
    assert(prov.marketingObjectId === productId, 'Provenance: Linked back to marketing_objects ID');
    assert(prov.objectType === 'Product', 'Provenance: Records Product object type');
    assert(prov.source === 'google_sheets', 'Provenance: Preserved origin source (google_sheets)');
    assert(prov.aiModel === 'SocialForge-MarketingSynthesizer-v3', 'Provenance: Records AI synthesizer model');

    // Check post variants in database
    const [variantDbRows] = await db.execute(`SELECT * FROM post_variants WHERE post_id = ?`, [synthRes.data.data.postId]);
    assert(variantDbRows.length === 2, 'Database: 2 post_variants persisted in post_variants table');

    // Security Check: Zero Credential Exposure
    const allContent = JSON.stringify(postRows) + JSON.stringify(variantDbRows);
    assert(!allContent.includes('access_token'), 'Security: Zero access tokens in post or variant content');
    assert(!allContent.includes('secret'), 'Security: Zero secrets in post or variant content');
    assert(!allContent.includes('password'), 'Security: Zero passwords in post or variant content');

    // [5/8] Specialized Copy across Multiple Object Types (Offer, Review, Event)
    console.log('\n[5/8] Verifying Domain-Specific AI Synthesis across Offer, Review, Event...');

    // Offer
    const offerSynth = await request(`/data/objects/${offerId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(offerSynth.status === 200, 'Offer synthesis returns 200');
    const offerIg = offerSynth.data.data.variants.find((v) => v.platform === 'instagram');
    assert(offerIg.caption.includes('SPRING30'), 'Offer copy includes discount promo code SPRING30');
    assert(offerIg.caption.includes('30% OFF'), 'Offer copy includes discount percentage 30% OFF');

    // Customer Review
    const reviewSynth = await request(`/data/objects/${reviewId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(reviewSynth.status === 200, 'Customer Review synthesis returns 200');
    const reviewIg = reviewSynth.data.data.variants.find((v) => v.platform === 'instagram');
    assert(reviewIg.caption.includes('⭐⭐⭐⭐⭐'), 'Review copy formats 5-star emoji rating');
    assert(reviewIg.caption.includes('Elena Rostova'), 'Review copy attributes quote to reviewer name');

    // Event
    const eventSynth = await request(`/data/objects/${eventId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(eventSynth.status === 200, 'Event synthesis returns 200');
    const eventIg = eventSynth.data.data.variants.find((v) => v.platform === 'instagram');
    assert(eventIg.caption.includes('Global Creators Summit 2026'), 'Event copy highlights event title');
    assert(eventIg.caption.includes('October 25, 2026'), 'Event copy specifies event date and time');

    // [6/8] Client Approval Gate & Magic Link Generation
    console.log('\n[6/8] Verifying Client Approval Gate & 72-hour Magic Link Generation...');
    const approvalSynth = await request(`/data/objects/${productId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        requireApproval: true,
      }),
    });

    assert(approvalSynth.status === 200, 'Synthesis with requireApproval returns 200');
    assert(approvalSynth.data.data.status === 'in_review', 'Post status transitioned to "in_review"');
    assert(approvalSynth.data.data.approvalLink !== undefined, 'Generated client approval link');
    assert(approvalSynth.data.data.approvalLink.includes('/review/'), 'Approval link contains /review/ endpoint');

    const [approvalRows] = await db.execute(`SELECT * FROM approval_requests WHERE post_id = ?`, [approvalSynth.data.data.postId]);
    assert(approvalRows.length === 1, 'Approval request persisted in approval_requests table');
    assert(approvalRows[0].magic_token.length === 64, 'Generated high-entropy 64-char hex magic token');
    assert(approvalRows[0].status === 'pending', 'Approval status is initially "pending"');

    // [7/8] Policy Enforcement, Validation Protection & Batch Synthesis
    console.log('\n[7/8] Verifying Policy Enforcement, Validation Protection & Batch Synthesis...');

    // 1. Prohibited Claim Violation
    const badClaimSynth = await request(`/data/objects/${productId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        customPrompt: 'Guaranteed profit in 24 hours!',
      }),
    });
    assert(badClaimSynth.status === 400, 'Prohibited marketing claim was caught and rejected with HTTP 400');
    assert(badClaimSynth.data.error.includes('guaranteed profit'), 'Error message specifies prohibited claim');

    // 2. Synthesize on Invalid Marketing Object
    const invalidSynth = await request(`/data/objects/${invalidObjId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(invalidSynth.status === 400, 'Synthesis on invalid marketing object rejected with HTTP 400');
    assert(invalidSynth.data.error.includes('validation errors'), 'Error explains that validation errors must be remediated');

    // 3. Batch Synthesis
    const batchSynth = await request(`/data/objects/batch-synthesize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        brandId: brandAId,
        objectIds: [productId, offerId, reviewId],
      }),
    });
    assert(batchSynth.status === 200, 'POST /data/objects/batch-synthesize returns 200');
    assert(batchSynth.data.data.length === 3, 'Batch synthesis successfully generated 3 posts');

    // [8/8] Multi-Tenant Scoping & Production Integrity
    console.log('\n[8/8] Verifying Multi-Tenant Scoping & Production Meta Lock...');

    // Tenant B cannot synthesize Tenant A object
    const crossTenantSynth = await request(`/data/objects/${productId}/synthesize-post`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossTenantSynth.status === 400 || crossTenantSynth.status === 404, 'Tenant B is strictly BLOCKED from synthesizing Tenant A object');

    // Preservation of Locked Production Post
    const [prodRows] = await db.execute(
      `SELECT remote_post_id, status FROM post_variants WHERE remote_post_id = ?`,
      ['1405588742634526_122100337179498315']
    );
    assert(prodRows.length > 0, 'Production locked post variant exists');
    assert(prodRows[0].status === 'published', 'Production locked post variant remains published');

    console.log('\n========================================================================');
    console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n*** TEST RUN ERROR ***:', err);
    failed++;
  } finally {
    console.log('Cleaning up test fixtures...');
    try {
      await db.execute(`DELETE FROM approval_requests WHERE post_id IN (SELECT id FROM posts WHERE tenant_id IN (?, ?))`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM post_variants WHERE post_id IN (SELECT id FROM posts WHERE tenant_id IN (?, ?))`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM posts WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM marketing_objects WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM ingestion_audit_logs WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM brands WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM users WHERE id IN (?, ?)`, [userAId, userBId]);
      await db.execute(`DELETE FROM tenants WHERE id IN (?, ?)`, [tenantAId, tenantBId]);
      console.log('Cleanup completed successfully.');
    } catch (e) {
      console.error('Cleanup warning:', e.message);
    }
    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
