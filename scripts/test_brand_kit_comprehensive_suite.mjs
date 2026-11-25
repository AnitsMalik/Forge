import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const DB_CONFIG = {
  host: 'localhost',
  port: 3308,
  user: 'root',
  password: 'root',
  database: 'socialforge_db'
};

async function main() {
  console.log('================================================================================');
  console.log('SOCIALFORGE BRAND KIT & MULTI-BRAND IDENTITY ENGINE COMPREHENSIVE TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    // ---------------------------------------------------------------------------
    // Step 0: Authenticate Primary Admin (Sarah - Apex Digital)
    // ---------------------------------------------------------------------------
    console.log('[Setup] Authenticating primary tenant admin (sarah@apex.com)...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' })
    });
    assert(loginRes.status === 200, 'Primary admin login returns HTTP 200');
    const loginJson = await loginRes.json();
    const primaryToken = loginJson.data?.tokens?.accessToken;
    assert(Boolean(primaryToken), 'Obtained valid JWT accessToken');

    const primaryHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${primaryToken}`
    };

    // ---------------------------------------------------------------------------
    // Test 1: List Brands & Multi-Brand Catalog (GET /api/v1/brands)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 1: List Brands & Multi-Brand Catalog (GET /api/v1/brands) ---');
    const brandsRes = await fetch(`${API_BASE}/brands`, { headers: primaryHeaders });
    assert(brandsRes.status === 200, 'GET /brands returned HTTP 200');
    const brandsJson = await brandsRes.json();
    assert(brandsJson.success === true, 'Response indicates success: true');
    assert(Array.isArray(brandsJson.data) && brandsJson.data.length >= 3, `Primary workspace contains ${brandsJson.data.length} brands (>= 3 verified)`);

    const hoaspBrand = brandsJson.data.find(b => b.id === '52f09a1e-e490-4c01-9674-4eb729bd5108');
    assert(Boolean(hoaspBrand), 'Verified primary anchor brand HOASP International exists');
    assert(hoaspBrand.industry === 'Beauty & Skincare', 'HOASP brand industry correctly identified as Beauty & Skincare');
    assert(hoaspBrand.timezone === 'Asia/Kolkata', 'HOASP brand timezone verified as Asia/Kolkata');

    // ---------------------------------------------------------------------------
    // Test 2: Retrieve Brand by ID with Brand Kit (GET /api/v1/brands/:id)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 2: Retrieve Brand by ID with Brand Kit (GET /api/v1/brands/:id) ---');
    const hoaspDetailRes = await fetch(`${API_BASE}/brands/${hoaspBrand.id}`, { headers: primaryHeaders });
    assert(hoaspDetailRes.status === 200, 'GET /brands/:id returned HTTP 200');
    const hoaspDetail = await hoaspDetailRes.json();
    assert(hoaspDetail.success === true, 'Brand detail request succeeded');
    assert(hoaspDetail.data?.kit !== null && typeof hoaspDetail.data?.kit === 'object', 'Brand Kit is attached to brand response');

    const kit = hoaspDetail.data.kit;
    const colors = typeof kit.primary_colors === 'string' ? JSON.parse(kit.primary_colors) : kit.primary_colors;
    const fonts = typeof kit.fonts === 'string' ? JSON.parse(kit.fonts) : kit.fonts;
    const tone = typeof kit.tone_of_voice === 'string' ? JSON.parse(kit.tone_of_voice) : kit.tone_of_voice;

    assert(colors?.primary === '#E11D48', `Brand primary color verified (${colors?.primary})`);
    assert(fonts?.heading === 'Playfair Display', `Brand heading font verified (${fonts?.heading})`);
    assert(fonts?.body === 'Plus Jakarta Sans', `Brand body font verified (${fonts?.body})`);
    assert(tone?.formality === 'approachable', `Brand tone formality verified (${tone?.formality})`);
    assert(Array.isArray(tone?.descriptors) && tone.descriptors.includes('radiant'), 'Tone descriptors include radiant');

    // ---------------------------------------------------------------------------
    // Test 3: 16-Dimension Centralized Brand Brain (GET /api/v1/brands/:id/brain)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 3: 16-Dimension Centralized Brand Brain (GET /api/v1/brands/:id/brain) ---');
    const brainRes = await fetch(`${API_BASE}/brands/${hoaspBrand.id}/brain`, { headers: primaryHeaders });
    assert(brainRes.status === 200, 'GET /brands/:id/brain returned HTTP 200');
    const brainJson = await brainRes.json();
    assert(brainJson.success === true, 'Brand Brain endpoint returned success: true');
    const brain = brainJson.data;

    assert(brain.brandId === hoaspBrand.id, 'BrandBrain is strictly mapped to HOASP brand ID');
    assert(brain.businessProfile?.name?.length > 0, 'Dimension 1: Business Profile contains verified name');
    assert(Array.isArray(brain.products), `Dimension 2: Product Catalog array present (${brain.products.length} products)`);
    assert(Array.isArray(brain.services), 'Dimension 3: Service Offerings array present');
    assert(Array.isArray(brain.usps) && brain.usps.length >= 3, `Dimension 4: Unique Selling Propositions populated (${brain.usps.length} USPs)`);
    assert(brain.targetAudience?.primary?.length > 0, 'Dimension 5: Primary Target Audience defined');
    assert(Array.isArray(brain.painPoints) && brain.painPoints.length >= 2, `Dimension 6: Customer Pain Points defined (${brain.painPoints.length} items)`);
    assert(Array.isArray(brain.brandValues) && brain.brandValues.length >= 2, `Dimension 7: Core Brand Values defined (${brain.brandValues.length} values)`);
    assert(brain.tone?.formality !== undefined, 'Dimension 8: Tone Formality defined');
    assert(brain.writingStyle?.guidelines?.length > 0, 'Dimension 9: Writing Style Guidelines present');
    assert(Array.isArray(brain.languages) && brain.languages.length >= 1, `Dimension 10: Supported Languages configured (${brain.languages.join(', ')})`);
    assert(Array.isArray(brain.ctaPreferences) && brain.ctaPreferences.length >= 2, `Dimension 11: Call to Action Preferences populated (${brain.ctaPreferences.length} CTAs)`);
    assert(brain.emojiPreferences?.usage !== undefined, 'Dimension 12: Emoji Preferences configured');
    assert(brain.hashtagPreferences?.brandTag?.startsWith('#'), `Dimension 13: Brand Tag configured (${brain.hashtagPreferences?.brandTag})`);
    assert(Array.isArray(brain.topicsToAvoid) && brain.topicsToAvoid.length >= 3, `Dimension 14: Taboo Topics / Safety Guardrails defined (${brain.topicsToAvoid.length} rules)`);
    assert(Boolean(brain.visualIdentity?.colors?.primary), 'Dimension 15: Visual Identity Design System active');
    assert(Array.isArray(brain.contentPillars) && brain.contentPillars.length >= 3, `Dimension 16: Content Pillars populated (${brain.contentPillars.length} pillars)`);

    // ---------------------------------------------------------------------------
    // Test 4: Live AI Context Synthesis (GET /api/v1/brands/:id/brain/ai-context)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 4: Centralized AI Context Prompt Generation ---');
    const aiCtxRes = await fetch(`${API_BASE}/brands/${hoaspBrand.id}/brain/ai-context`, { headers: primaryHeaders });
    assert(aiCtxRes.status === 200, 'GET /brands/:id/brain/ai-context returned HTTP 200');
    const aiCtxJson = await aiCtxRes.json();
    assert(aiCtxJson.success === true, 'AI context generation succeeded');
    const prompt = aiCtxJson.data?.systemPrompt;
    assert(typeof prompt === 'string' && prompt.length > 500, `Synthesized system prompt is substantive (${prompt.length} chars)`);
    assert(prompt.includes('CENTRALIZED BRAND BRAIN GOVERNANCE CONTEXT'), 'Prompt includes Brand Brain governance header');
    assert(prompt.includes('BRAND IDENTITY & MISSION'), 'Prompt includes Brand Identity & Mission section');
    assert(prompt.includes('TARGET AUDIENCE & PAIN POINTS'), 'Prompt includes Target Audience & Pain Points');
    assert(prompt.includes('VOICE, TONE & WRITING STYLE'), 'Prompt includes Voice, Tone & Writing Style section');
    assert(prompt.includes('CONTENT PILLARS & THEMATIC GOALS'), 'Prompt includes Content Pillars & Thematic Goals');
    assert(prompt.includes('STRICT BRAND SAFETY & NEGATIVE CONSTRAINTS'), 'Prompt includes Strict Brand Safety Guardrails');

    // ---------------------------------------------------------------------------
    // Test 5: Ephemeral Brand Creation, Update & Deletion Lifecycle
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 5: Ephemeral Brand Creation, Update & Deletion Lifecycle ---');
    const testSlug = `audit-brand-${Date.now()}`;
    const createRes = await fetch(`${API_BASE}/brands`, {
      method: 'POST',
      headers: primaryHeaders,
      body: JSON.stringify({
        name: 'Ephemeral Audit Brand',
        slug: testSlug,
        industry: 'FinTech Software',
        websiteUrl: 'https://audit-fintech.example.com',
        timezone: 'America/New_York'
      })
    });
    assert(createRes.status === 201, 'POST /brands created brand with HTTP 201');
    const createJson = await createRes.json();
    assert(createJson.success === true, 'Brand creation returned success: true');
    const createdBrandId = createJson.data?.id;
    assert(Boolean(createdBrandId), `Created ephemeral brand ID: ${createdBrandId}`);

    // Verify auto-initialized Brand Kit in DB
    const [kitRow] = await conn.execute('SELECT * FROM brand_kits WHERE brand_id = ?', [createdBrandId]);
    assert(kitRow.length === 1, 'Brand Kit automatically initialized in database upon brand creation');

    // Update Brand Metadata
    const updateRes = await fetch(`${API_BASE}/brands/${createdBrandId}`, {
      method: 'PUT',
      headers: primaryHeaders,
      body: JSON.stringify({
        name: 'Ephemeral Audit Brand (Updated)',
        industry: 'Enterprise Security'
      })
    });
    assert(updateRes.status === 200, 'PUT /brands/:id updated metadata with HTTP 200');
    const updateJson = await updateRes.json();
    assert(updateJson.data?.name === 'Ephemeral Audit Brand (Updated)', 'Updated brand name confirmed');
    assert(updateJson.data?.industry === 'Enterprise Security', 'Updated brand industry confirmed');

    // ---------------------------------------------------------------------------
    // Test 6: Brand Kit Direct Configuration (PUT /api/v1/brands/:id/kit)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 6: Brand Kit Direct Configuration (PUT /api/v1/brands/:id/kit) ---');
    const kitUpdateRes = await fetch(`${API_BASE}/brands/${createdBrandId}/kit`, {
      method: 'PUT',
      headers: primaryHeaders,
      body: JSON.stringify({
        primaryColors: {
          primary: '#10B981',
          secondary: '#065F46',
          accent: '#F59E0B',
          background: '#F0FDF4',
          text: '#064E3B'
        },
        fonts: {
          heading: 'Montserrat',
          body: 'Open Sans'
        },
        toneOfVoice: {
          formality: 'authoritative',
          descriptors: ['secure', 'compliant', 'institutional']
        },
        hashtagsDefault: ['#FintechSecurity', '#DataCompliance'],
        tabooWords: ['unsecure', 'guaranteed profit', 'zero risk']
      })
    });
    assert(kitUpdateRes.status === 200, 'PUT /brands/:id/kit returned HTTP 200');
    const kitUpdateJson = await kitUpdateRes.json();
    assert(kitUpdateJson.success === true, 'Brand kit updated successfully');

    // Verify persistence in DB
    const [updatedKitDb] = await conn.execute('SELECT * FROM brand_kits WHERE brand_id = ?', [createdBrandId]);
    const parsedColors = typeof updatedKitDb[0]?.primary_colors === 'string'
      ? JSON.parse(updatedKitDb[0]?.primary_colors)
      : updatedKitDb[0]?.primary_colors;
    assert(parsedColors?.primary === '#10B981', 'Updated primary color persisted to DB (#10B981)');

    const parsedFonts = typeof updatedKitDb[0]?.fonts === 'string'
      ? JSON.parse(updatedKitDb[0]?.fonts)
      : updatedKitDb[0]?.fonts;
    assert(parsedFonts?.heading === 'Montserrat', 'Updated heading font persisted to DB (Montserrat)');

    // ---------------------------------------------------------------------------
    // Test 7: Brand Brain Synchronization (PUT /api/v1/brands/:id/brain)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 7: Brand Brain Synchronization (PUT /api/v1/brands/:id/brain) ---');
    const brainUpdateRes = await fetch(`${API_BASE}/brands/${createdBrandId}/brain`, {
      method: 'PUT',
      headers: primaryHeaders,
      body: JSON.stringify({
        businessProfile: {
          name: 'Ephemeral Audit Brand (Updated)',
          tagline: 'Zero-Trust Financial Protection',
          mission: 'Guarding institutional wealth through military-grade encryption.',
          industry: 'Enterprise Security',
          websiteUrl: 'https://audit-fintech.example.com'
        },
        products: [
          { name: 'Shield Vault Pro', description: 'Quantum-safe cryptographic storage', price: '$999/mo', category: 'Security' }
        ],
        services: [
          { name: 'Penetration Auditing', description: 'Real-time red-team validation', deliverables: ['Full Audit Report', 'Remediation Plan'] }
        ],
        usps: [
          'SOC-2 Type II Certified Architecture',
          'Zero-Knowledge End-to-End Encryption'
        ],
        targetAudience: {
          primary: 'Chief Information Security Officers',
          demographics: ['Enterprises with $50M+ ARR', 'Financial Institutions']
        },
        painPoints: [
          'Regulatory non-compliance penalties',
          'Ransomware and data breach liabilities'
        ],
        brandValues: [
          'Uncompromising Confidentiality',
          'Continuous Verification'
        ],
        tone: {
          formality: 'authoritative',
          descriptors: ['rigorous', 'institutional', 'unshakeable']
        },
        writingStyle: {
          guidelines: 'Speak with executive authority. Never use informal slang.',
          sentenceStructure: 'short_punchy',
          vocabularyLevel: 'technical',
          pointOfView: 'first_person_plural'
        },
        languages: ['English (US)', 'German (Germany)'],
        ctaPreferences: [
          'Schedule an executive security briefing',
          'Download the SOC-2 compliance whitepaper'
        ],
        emojiPreferences: {
          usage: 'minimal',
          signatureEmojis: ['🔒', '🛡️', '⚡']
        },
        hashtagPreferences: {
          brandTag: '#ShieldVault',
          defaultTags: ['#CyberSecurity', '#EnterpriseFintech'],
          bannedTags: ['#crypto', '#moonshot'],
          maxCount: 4
        },
        topicsToAvoid: [
          'guaranteed returns',
          'speculative investments',
          'unhackable'
        ],
        visualIdentity: {
          colors: {
            primary: '#10B981',
            secondary: '#065F46',
            accent: '#F59E0B',
            background: '#F0FDF4',
            text: '#064E3B'
          },
          fonts: {
            heading: 'Montserrat',
            body: 'Open Sans'
          },
          logoUrls: {}
        },
        contentPillars: [
          {
            title: 'Threat Intelligence Briefings',
            description: 'Weekly breakdowns of zero-day exploits and mitigation patterns.',
            weightPercentage: 50,
            sampleTopics: ['Analyzing the latest API breaches', 'Post-quantum cryptography standards']
          },
          {
            title: 'Compliance & Governance',
            description: 'Guidance on SEC cyber disclosure and DORA requirements.',
            weightPercentage: 50,
            sampleTopics: ['Preparing for 2027 DORA audits', 'Board-level cyber risk metrics']
          }
        ]
      })
    });
    assert(brainUpdateRes.status === 200, 'PUT /brands/:id/brain returned HTTP 200');
    const brainUpdateJson = await brainUpdateRes.json();
    assert(brainUpdateJson.success === true, 'Brand Brain saved successfully');
    assert(brainUpdateJson.data?.businessProfile?.tagline === 'Zero-Trust Financial Protection', 'Brand Brain tagline persisted');
    assert(brainUpdateJson.data?.products?.length === 1, 'Product catalog updated with 1 item');
    assert(brainUpdateJson.data?.contentPillars?.length === 2, 'Content pillars updated with 2 pillars');

    // ---------------------------------------------------------------------------
    // Test 8: SSRF Security on Website Extraction
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 8: SSRF Security on Website Extraction ---');
    // Test 8a: Localhost blocked
    const ssrfLocalRes = await fetch(`${API_BASE}/brands/${createdBrandId}/brain/extract-website`, {
      method: 'POST',
      headers: primaryHeaders,
      body: JSON.stringify({ url: 'http://localhost:4000/internal-admin' })
    });
    assert(ssrfLocalRes.status === 400 || ssrfLocalRes.status === 500, 'SSRF attack against localhost blocked');
    const ssrfLocalJson = await ssrfLocalRes.json();
    assert(ssrfLocalJson.error?.message?.includes('SSRF Security Guard') || ssrfLocalJson.error !== undefined, 'Localhost request rejected with SSRF security message');

    // Test 8b: Cloud metadata IP (169.254.169.254) blocked
    const ssrfCloudRes = await fetch(`${API_BASE}/brands/${createdBrandId}/brain/extract-website`, {
      method: 'POST',
      headers: primaryHeaders,
      body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' })
    });
    assert(ssrfCloudRes.status === 400 || ssrfCloudRes.status === 500, 'SSRF attack against AWS/GCP link-local metadata blocked');

    // Test 8c: Private RFC-1918 subnet IP (10.0.0.1) blocked
    const ssrfPrivateRes = await fetch(`${API_BASE}/brands/${createdBrandId}/brain/extract-website`, {
      method: 'POST',
      headers: primaryHeaders,
      body: JSON.stringify({ url: 'http://10.0.0.1/admin' })
    });
    assert(ssrfPrivateRes.status === 400 || ssrfPrivateRes.status === 500, 'SSRF attack against private subnet IP blocked');

    // ---------------------------------------------------------------------------
    // Test 9: Cross-Module AI Integration & Taboo Word Scrubbing
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 9: AI Copy Service Taboo Word Enforcement ---');
    const { AiCopyService } = await import('../apps/api/dist/services/aiCopyService.js');
    const { BrandBrainService } = await import('../apps/api/dist/services/brandBrainService.js');

    const hoaspBrainObj = await BrandBrainService.getBrandBrain(hoaspBrand.id);
    const textWithTaboo = 'Try our miracle cure and instant fix for radiant skin today!';
    const scrubResult = AiCopyService.scrubTabooWords(textWithTaboo, hoaspBrainObj.topicsToAvoid);

    assert(scrubResult.detectedWords.length >= 2, `Taboo words detected: ${scrubResult.detectedWords.join(', ')}`);
    assert(scrubResult.detectedWords.includes('miracle cure'), 'Detected taboo word "miracle cure"');
    assert(scrubResult.detectedWords.includes('instant fix'), 'Detected taboo word "instant fix"');
    assert(!scrubResult.scrubbedText.includes('miracle cure'), 'Scrubbed text eliminated "miracle cure"');
    assert(!scrubResult.scrubbedText.includes('instant fix'), 'Scrubbed text eliminated "instant fix"');
    assert(scrubResult.scrubbedText.includes('clinically tested solution'), 'Scrubbed text injected compliant alternative ("clinically tested solution")');

    // ---------------------------------------------------------------------------
    // Test 10: Multi-Tenant Brand Isolation
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 10: Multi-Tenant Brand Isolation ---');
    const foreignTenantId = crypto.randomUUID();
    const foreignUserId = crypto.randomUUID();

    await conn.execute(
      'INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, "{}", NOW(), NOW())',
      [foreignTenantId, 'Foreign Security Workspace', `sec-tenant-${Date.now()}`]
    );
    await conn.execute(
      'INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, "$argon2id$mock", "Foreign Security User", 0, 1, NOW(), NOW())',
      [foreignUserId, `sec-user-${Date.now()}@security.com`]
    );

    const foreignToken = jwt.sign(
      { userId: foreignUserId, email: 'attacker@foreign.com', tenantId: foreignTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const foreignHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${foreignToken}`
    };

    // Foreign tenant tries to access HOASP brand
    const crossAccessRes = await fetch(`${API_BASE}/brands/${hoaspBrand.id}`, { headers: foreignHeaders });
    assert(crossAccessRes.status === 404, `Cross-tenant brand access blocked with HTTP 404 (received ${crossAccessRes.status})`);
    const crossAccessJson = await crossAccessRes.json();
    assert(crossAccessJson.error?.code === 'BRAND_NOT_FOUND', 'Error code is BRAND_NOT_FOUND');

    // Foreign tenant tries to update HOASP brand brain
    const crossBrainRes = await fetch(`${API_BASE}/brands/${hoaspBrand.id}/brain`, {
      method: 'PUT',
      headers: foreignHeaders,
      body: JSON.stringify({ businessProfile: { name: 'Hacked Brand' } })
    });
    assert(crossBrainRes.status === 404, `Cross-tenant brain modification blocked with HTTP 404 (received ${crossBrainRes.status})`);

    // Teardown foreign test records
    await conn.execute('DELETE FROM users WHERE id = ?', [foreignUserId]);
    await conn.execute('DELETE FROM tenants WHERE id = ?', [foreignTenantId]);

    // ---------------------------------------------------------------------------
    // Test 11: Ephemeral Brand Teardown & Clean Deletion
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 11: Ephemeral Brand Teardown & Clean Deletion ---');
    const deleteRes = await fetch(`${API_BASE}/brands/${createdBrandId}`, {
      method: 'DELETE',
      headers: primaryHeaders
    });
    assert(deleteRes.status === 200, 'DELETE /brands/:id returned HTTP 200');
    const deleteJson = await deleteRes.json();
    assert(deleteJson.success === true, 'Brand deleted successfully');

    // Verify cascaded cleanup
    const [deletedBrand] = await conn.execute('SELECT id FROM brands WHERE id = ?', [createdBrandId]);
    assert(deletedBrand.length === 0, 'Brand successfully removed from database');

    // ---------------------------------------------------------------------------
    // Test 12: Strict Meta Publication Invariant Safety Check
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 12: Strict Meta Publication Invariant Safety Check ---');
    const [invVariant] = await conn.execute(
      'SELECT id, post_id, platform, status, remote_post_id FROM post_variants WHERE id = ?',
      ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
    );
    assert(invVariant.length === 1, 'Production invariant variant exists');
    assert(invVariant[0]?.status === 'published', `Variant status is published (current: ${invVariant[0]?.status})`);
    assert(invVariant[0]?.remote_post_id === '1405588742634526_122100337179498315', 'Variant remote_post_id matches Meta live post ID');

    const [invJob] = await conn.execute(
      'SELECT id, tenant_id, brand_id, platform, status, external_post_id FROM publishing_jobs WHERE id = ?',
      ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
    );
    assert(invJob.length === 1, 'Production invariant job exists');
    assert(invJob[0]?.status === 'published', `Publishing job status is published (current: ${invJob[0]?.status})`);
    assert(invJob[0]?.external_post_id === '1405588742634526_122100337179498315', 'Job external_post_id matches Meta live post ID');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await conn.end();
  }

  console.log('\n================================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================================');

  if (failed > 0) process.exit(1);
}

main().catch(console.error);
