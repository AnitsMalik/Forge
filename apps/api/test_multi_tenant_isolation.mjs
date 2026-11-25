import knex from 'knex';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validateSafeUrl, assertSafeUrl } from './src/utils/ssrfValidator.js';

const API_BASE = 'http://localhost:4000/api/v1';

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'socialforge_db',
    charset: 'utf8mb4',
  },
});

async function setupSecondaryTenant() {
  let tenantB = await db('tenants').where('slug', 'nexus-creative').first();
  if (!tenantB) {
    const tenantId = crypto.randomUUID();
    await db('tenants').insert({
      id: tenantId,
      name: 'Nexus Creative Studio',
      slug: 'nexus-creative',
      subscription_tier: 'agency_pro',
      settings: JSON.stringify({ primaryLocale: 'en-US' }),
    });
    tenantB = await db('tenants').where('id', tenantId).first();
  }

  let userB = await db('users').where('email', 'alex@nexus.com').first();
  if (!userB) {
    const userId = crypto.randomUUID();
    const hash = await bcrypt.hash('Password123!', 10);
    await db('users').insert({
      id: userId,
      email: 'alex@nexus.com',
      password_hash: hash,
      full_name: 'Alex Vance',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      is_active: true,
    });
    userB = await db('users').where('id', userId).first();
  }

  const existingTU = await db('tenant_users').where({ user_id: userB.id, tenant_id: tenantB.id }).first();
  if (!existingTU) {
    await db('tenant_users').where({ user_id: userB.id }).del();
    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantB.id,
      user_id: userB.id,
      role: 'agency_admin',
    });
  }

  let brandB = await db('brands').where({ tenant_id: tenantB.id, slug: 'echo-sound' }).first();
  if (!brandB) {
    const brandId = crypto.randomUUID();
    await db('brands').insert({
      id: brandId,
      tenant_id: tenantB.id,
      name: 'Echo Sound Labs',
      slug: 'echo-sound',
      industry: 'Audio & Music Hardware',
      website_url: 'https://echosound.example.com',
      timezone: 'America/Los_Angeles',
    });
    brandB = await db('brands').where('id', brandId).first();

    await db('brand_users').insert({
      id: crypto.randomUUID(),
      brand_id: brandB.id,
      user_id: userB.id,
      brand_role: 'brand_manager',
    });

    await db('brand_kits').insert({
      id: crypto.randomUUID(),
      brand_id: brandB.id,
      tone_of_voice: JSON.stringify({ formality: 'expert', descriptors: ['precise', 'acoustic', 'innovative'] }),
      target_audiences: JSON.stringify(['Audiophiles', 'Studio Producers']),
      primary_colors: JSON.stringify({ primary: '#0EA5E9', secondary: '#38BDF8', accent: '#F59E0B' }),
      fonts: JSON.stringify({ heading: 'Inter', body: 'Inter' }),
      logo_urls: JSON.stringify({ primary: 'https://placehold.co/400x120?text=Echo+Sound' }),
      hashtags_default: JSON.stringify(['#EchoSound', '#StudioAudio', '#ProAudio']),
      taboo_words: JSON.stringify(['cheap', 'tinny']),
      disclaimers: 'Engineered for audio fidelity.',
      guidelines: 'Focus on frequency response.',
    });

    await db('posts').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantB.id,
      brand_id: brandB.id,
      author_id: userB.id,
      title: 'Echo Pro Wireless Headphone Teaser',
      base_content: 'Studio acoustics in your pocket. The new Echo Pro drops this Friday.',
      status: 'draft',
    });
  }

  return { tenantB, userB, brandB };
}

async function runMultiTenantIsolationSuite() {
  console.log('============================================================');
  console.log('  SocialForge Phase 10: Multi-Tenant Security & Isolation');
  console.log('============================================================\n');

  // 1. Setup Tenant B
  console.log('1. Provisioning / resolving secondary isolated tenant (Nexus Creative)...');
  const { tenantB, userB, brandB } = await setupSecondaryTenant();
  console.log(`   ✓ Tenant B: "${tenantB.name}" (${tenantB.id})`);
  console.log(`   ✓ User B:   "${userB.email}" (Role: agency_admin)`);
  console.log(`   ✓ Brand B:  "${brandB.name}" (${brandB.id})\n`);

  // 2. Authenticate Master Admin (Tenant A) & Alex (Tenant B)
  console.log('2. Authenticating both tenant principals...');
  const authA = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'singh.ninex@gmail.com', password: 'Access@123' }),
  }).then((r) => r.json());

  const tokenA = authA.data.tokens.accessToken;
  console.log('   ✓ User A (singh.ninex@gmail.com / Master Superadmin) authenticated.');

  const authB = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@nexus.com', password: 'Password123!' }),
  }).then((r) => r.json());

  const tokenB = authB.data.tokens.accessToken;
  console.log('   ✓ User B (Alex Vance / Nexus Creative) authenticated.\n');

  // 3. Resolve Tenant A Brand & Post
  console.log('3. Resolving Tenant A target resources...');
  const brandsARes = await fetch(`${API_BASE}/brands`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then((r) => r.json());

  const brandA = brandsARes.data[0];
  if (!brandA) throw new Error('Tenant A has no brands seeded');
  console.log(`   ✓ Brand A: "${brandA.name}" (ID: ${brandA.id})`);

  const postsARes = await fetch(`${API_BASE}/brands/${brandA.id}/posts`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then((r) => r.json());

  const postA = postsARes.data[0];
  console.log(`   ✓ Post A:  "${postA?.title || 'Sample Post'}" (ID: ${postA?.id || 'none'})\n`);

  // 4. Cross-Tenant Isolation Tests (Token B -> Brand A)
  console.log('4. Running Cross-Tenant Boundary Probing (Tenant B -> Tenant A resources)...');

  const crossTenantEndpoints = [
    {
      name: 'Direct Brand Inspection',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}`,
      body: null,
    },
    {
      name: 'Brand Kit Mutation',
      method: 'PUT',
      url: `${API_BASE}/brands/${brandA.id}/kit`,
      body: { guidelines: 'Compromised by Tenant B' },
    },
    {
      name: 'Post Variant Listing',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}/posts`,
      body: null,
    },
    {
      name: 'Single Post Drilldown',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}/posts/${postA?.id || 'any-id'}`,
      body: null,
    },
    {
      name: 'Unauthorized Post Creation',
      method: 'POST',
      url: `${API_BASE}/brands/${brandA.id}/posts`,
      body: { title: 'Spam from Tenant B', baseContent: 'Hacked', platforms: ['x_twitter'] },
    },
    {
      name: 'Media Asset Access',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}/media`,
      body: null,
    },
    {
      name: 'Analytics & KPI Telemetry',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}/analytics/overview`,
      body: null,
    },
    {
      name: 'Short-Form Video Engine',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}/videos/templates`,
      body: null,
    },
    {
      name: 'Connected Social Accounts',
      method: 'GET',
      url: `${API_BASE}/brands/${brandA.id}/social-accounts`,
      body: null,
    },
    {
      name: 'AI Copy Generation',
      method: 'POST',
      url: `${API_BASE}/brands/${brandA.id}/ai/generate`,
      body: { prompt: 'Steal brand voice' },
    },
  ];

  let testIndex = 1;
  for (const ep of crossTenantEndpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });

    const json = await res.json().catch(() => ({}));

    // Must return 404 to guarantee complete existence blindness (no data leakage)
    if (res.status !== 404) {
      throw new Error(
        `Multi-Tenant Isolation Breach on [${ep.method} ${ep.url}]! Expected HTTP 404, received ${res.status}: ${JSON.stringify(json)}`
      );
    }

    console.log(`   [4.${testIndex++}] ${ep.name.padEnd(30)} -> HTTP 404 Blocked (${json.error?.code || 'BLOCKED'}) ✓`);
  }
  console.log();

  // 5. Tenant Data Scoping (Self-access verification)
  console.log('5. Verifying Legitimate Tenant Scoping (Each tenant sees only their own data)...');

  const listB = await fetch(`${API_BASE}/brands`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  }).then((r) => r.json());

  const brandBIds = listB.data.map((b) => b.id);
  if (brandBIds.includes(brandA.id)) {
    throw new Error('Tenant B brand list contains Tenant A brand!');
  }
  if (!brandBIds.includes(brandB.id)) {
    throw new Error('Tenant B brand list does not contain Tenant B brand!');
  }
  console.log(`   ✓ Tenant B sees exactly ${listB.data.length} brand: "${listB.data[0].name}" (Zero leakage).`);

  const listA = await fetch(`${API_BASE}/brands`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  }).then((r) => r.json());

  const brandAIds = listA.data.map((b) => b.id);
  if (brandAIds.includes(brandB.id)) {
    throw new Error('Tenant A brand list contains Tenant B brand!');
  }
  console.log(`   ✓ Tenant A sees exactly ${listA.data.length} brand: "${listA.data[0].name}" (Zero leakage).\n`);

  // 6. SSRF Protection Tests
  console.log('6. Verifying SSRF Protection Guards...');
  const maliciousUrls = [
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:4000/api/v1/auth/login',
    'http://127.0.0.1:3308',
    'http://10.0.0.1/admin',
    'http://192.168.1.1/router',
    'ftp://public.example.com/file',
  ];

  for (const url of maliciousUrls) {
    const check = validateSafeUrl(url);
    if (check.isSafe) {
      throw new Error(`SSRF guard failed to block malicious URL: ${url}`);
    }
    console.log(`   ✓ Blocked SSRF attempt: ${url.padEnd(45)} -> Reason: ${check.reason}`);
  }

  const validUrl = 'https://images.unsplash.com/photo-1494790108377';
  const validCheck = validateSafeUrl(validUrl);
  if (!validCheck.isSafe) {
    throw new Error(`SSRF guard rejected valid HTTPS URL: ${validUrl}`);
  }
  console.log(`   ✓ Permitted valid CDN URL: ${validUrl} -> OK\n`);

  // 7. Security Headers Verification
  console.log('7. Verifying Hardened HTTP Security Headers...');
  const secRes = await fetch(`${API_BASE}/health`);
  const headers = secRes.headers;

  const expectedHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-dns-prefetch-control': 'off',
  };

  for (const [key, expectedVal] of Object.entries(expectedHeaders)) {
    const val = headers.get(key);
    if (!val || !val.toLowerCase().includes(expectedVal.toLowerCase())) {
      throw new Error(`Expected header '${key}: ${expectedVal}', found '${val}'`);
    }
    console.log(`   ✓ Header: ${key.padEnd(25)} = "${val}"`);
  }

  const poweredBy = headers.get('x-powered-by');
  if (poweredBy) {
    throw new Error(`Server leaked X-Powered-By header: ${poweredBy}`);
  }
  console.log(`   ✓ Header: x-powered-by              = (Hidden/Masked) ✓\n`);

  // 8. Rate Limiting Protection Verification
  console.log('8. Verifying In-Memory Sliding-Window Rate Limiting (Brute-Force Shield)...');
  let rateLimitedCount = 0;
  for (let i = 0; i < 25; i++) {
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'probe@test.com', password: 'wrong' }),
    });

    if (r.status === 429) {
      rateLimitedCount++;
      const json = await r.json();
      if (rateLimitedCount === 1) {
        console.log(`   ✓ Threshold exceeded at request #${i + 1} -> HTTP 429 received (${json.error?.code})`);
        console.log(`     - Retry-After header: ${r.headers.get('retry-after')}s`);
        console.log(`     - RateLimit-Limit:    ${r.headers.get('ratelimit-limit')}`);
        console.log(`     - RateLimit-Remaining:${r.headers.get('ratelimit-remaining')}`);
      }
    }
  }

  if (rateLimitedCount === 0) {
    throw new Error('Rate limiter failed to trigger HTTP 429 after 25 rapid requests');
  }
  console.log(`   ✓ Rate Limiter successfully suppressed ${rateLimitedCount} excess requests with HTTP 429.\n`);

  // Clear rate limit store so subsequent test suites can run without waiting
  await fetch(`${API_BASE}/internal/reset-rate-limits`, { method: 'POST' }).catch(() => {});

  console.log('============================================================');
  console.log('  ALL MULTI-TENANT ISOLATION & SECURITY TESTS PASSED (100%)');
  console.log('============================================================\n');
  await db.destroy();
}

runMultiTenantIsolationSuite().catch(async (err) => {
  console.error('\n❌ Multi-Tenant Isolation Test Failed:', err);
  await db.destroy();
  process.exit(1);
});
