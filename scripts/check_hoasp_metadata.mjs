import dotenv from 'dotenv';
dotenv.config();

import { db } from '../apps/api/dist/db/connection.js';

async function checkHoaspMetadata() {
  console.log('========================================================================');
  console.log('       HOASP INTERNATIONAL: METADATA & CONNECTION AUDIT         ');
  console.log('========================================================================\n');

  try {
    // 1. Brands matching HOASP
    const brands = await db('brands')
      .where('name', 'like', '%HOASP%')
      .orWhere('id', '52f09a1e-e490-4c01-9674-4eb729bd5108')
      .select('id', 'tenant_id', 'name', 'slug', 'created_at', 'updated_at');

    console.log('--- [1. BRANDS] ---');
    console.table(brands);
    console.log('');

    const brandIds = brands.map((b) => b.id);
    const tenantIds = [...new Set(brands.map((b) => b.tenant_id).filter(Boolean))];

    // 2. Tenant record
    console.log('--- [2. TENANTS] ---');
    const tenants = await db('tenants')
      .whereIn('id', tenantIds)
      .select('id', 'name', 'slug', 'created_at', 'updated_at');
    console.table(tenants);
    console.log('');

    // 3. Meta Connections
    console.log('--- [3. META CONNECTIONS] ---');
    const connections = await db('meta_connections')
      .whereIn('brand_id', brandIds);

    if (connections.length === 0) {
      console.log('No meta_connections found for HOASP brand(s).');
    } else {
      console.table(
        connections.map((c) => ({
          id: c.id,
          tenant_id: c.tenant_id,
          brand_id: c.brand_id,
          selected_page_id: c.selected_page_id,
          selected_page_name: c.selected_page_name,
          instagram_account_id: c.instagram_account_id,
          status: c.status,
          has_user_token: !!c.encrypted_user_access_token,
          has_page_token: !!c.encrypted_page_access_token,
          updated_at: c.updated_at ? new Date(c.updated_at).toISOString() : '',
        }))
      );
    }
    console.log('');

    // 4. Meta Facebook Pages
    console.log('--- [4. META FACEBOOK PAGES] ---');
    const pages = await db('meta_facebook_pages').select('*');

    if (pages.length === 0) {
      console.log('No meta_facebook_pages found.');
    } else {
      console.table(
        pages.map((p) => ({
          id: p.id,
          connection_id: p.connection_id || p.meta_connection_id || p.brand_id,
          page_id: p.page_id,
          name: p.name,
          ig_business_id: p.instagram_business_account_id,
          is_selected: p.is_selected,
          has_token: !!p.encrypted_access_token,
          updated_at: p.updated_at ? new Date(p.updated_at).toISOString() : '',
        }))
      );
    }
    console.log('');

    // 5. Meta Instagram Accounts
    console.log('--- [5. META INSTAGRAM ACCOUNTS] ---');
    const igAccounts = await db('meta_instagram_accounts').select('*');
    if (igAccounts.length === 0) {
      console.log('No meta_instagram_accounts found.');
    } else {
      console.table(
        igAccounts.map((i) => ({
          id: i.id,
          instagram_account_id: i.instagram_account_id,
          username: i.username,
          name: i.name,
          page_id: i.page_id,
          updated_at: i.updated_at ? new Date(i.updated_at).toISOString() : '',
        }))
      );
    }
    console.log('');

    // 6. Social Accounts
    console.log('--- [6. SOCIAL ACCOUNTS] ---');
    let socialQuery = db('social_accounts');
    if (brandIds.length > 0) {
      socialQuery = socialQuery.whereIn('brand_id', brandIds).orWhere('account_id', '1405588742634526');
    } else {
      socialQuery = socialQuery.where('account_id', '1405588742634526');
    }
    const socialAccounts = await socialQuery.select(
      'id',
      'brand_id',
      'platform',
      'account_id',
      'account_name',
      'is_active',
      'token_expires_at',
      'updated_at'
    );

    if (socialAccounts.length === 0) {
      console.log('No social_accounts found.');
    } else {
      console.table(
        socialAccounts.map((s) => ({
          id: s.id,
          brand_id: s.brand_id,
          platform: s.platform,
          account_id: s.account_id,
          account_name: s.account_name,
          is_active: s.is_active,
          token_expires_at: s.token_expires_at ? new Date(s.token_expires_at).toISOString() : 'none',
          updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : '',
        }))
      );
    }
    console.log('');

    // 7. Duplicate Page Ownership & Tenant Conflict Check
    console.log('--- [7. CROSS-TENANT PAGE OWNERSHIP & CONFLICT CHECK] ---');
    const conflictingConnections = await db('meta_connections')
      .where({ selected_page_id: '1405588742634526' });

    console.log('Connections referencing Page 1405588742634526:');
    for (const c of conflictingConnections) {
      const b = await db('brands').where({ id: c.brand_id }).first();
      const t = await db('tenants').where({ id: c.tenant_id }).first();
      console.log(`- Connection ID: ${c.id} | Status: ${c.status}`);
      console.log(`  Tenant: "${t?.name}" (${t?.id}) | Brand: "${b?.name}" (${b?.id})`);
    }

    const conflictingSocial = await db('social_accounts')
      .where({ account_id: '1405588742634526' });

    console.log('\nSocial Accounts referencing Page 1405588742634526:');
    for (const s of conflictingSocial) {
      const b = await db('brands').where({ id: s.brand_id }).first();
      const t = await db('tenants').where({ id: b?.tenant_id }).first();
      console.log(`- Social Account ID: ${s.id} | Platform: ${s.platform} | Active: ${s.is_active}`);
      console.log(`  Tenant: "${t?.name}" (${t?.id}) | Brand: "${b?.name}" (${b?.id})`);
      console.log(`  Expires At: ${s.token_expires_at ? new Date(s.token_expires_at).toISOString() : 'none'}`);
    }
    console.log('');

    // 8. Production Post & Publication Lock Invariant
    console.log('--- [8. PRODUCTION PUBLICATION LOCK INVARIANT] ---');
    const lockedVariant = await db('post_variants')
      .where({ id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164' })
      .first();

    const lockedJob = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
      .first();

    console.log(`Variant bc2051b1...: status = "${lockedVariant?.status}", remote_id = "${lockedVariant?.remote_post_id}"`);
    console.log(`Publishing Job 256cf21a...: status = "${lockedJob?.status}", platform = "${lockedJob?.platform}"`);

    const isLockIntact =
      lockedVariant?.status === 'published' &&
      lockedVariant?.remote_post_id === '1405588742634526_122100337179498315' &&
      lockedJob?.status === 'published';

    console.log(`\nLock Status: ${isLockIntact ? '✅ LOCKED & INTACT' : '❌ VIOLATION DETECTED'}`);

    console.log('\n========================================================================');
    console.log('AUDIT COMPLETE: All metadata safely retrieved without credential exposure.');
    console.log('========================================================================');
  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    await db.destroy();
  }
}

checkHoaspMetadata();
