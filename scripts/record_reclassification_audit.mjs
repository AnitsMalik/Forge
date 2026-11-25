import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  console.log('Recording audit log entries for all data reclassifications...');
  const now = new Date();

  // Find first user to associate system audit logs
  const adminUser = await db('users').first();
  const userId = adminUser ? adminUser.id : '00000000-0000-0000-0000-000000000000';

  let addedVariants = 0;
  let addedPosts = 0;
  let addedJobs = 0;
  let addedPreserved = 0;
  let addedConflicts = 0;

  // 1. Audit records for sandbox variants
  const sandboxVariants = await db('post_variants')
    .leftJoin('posts', 'post_variants.post_id', 'posts.id')
    .leftJoin('brands', 'posts.brand_id', 'brands.id')
    .where('post_variants.status', 'sandbox')
    .select(
      'post_variants.id',
      'post_variants.post_id',
      'post_variants.platform',
      'post_variants.remote_post_id',
      'post_variants.remote_post_url',
      'posts.brand_id',
      'brands.tenant_id'
    );

  for (const v of sandboxVariants) {
    const existing = await db('publishing_audit_logs')
      .where({ action: 'audit_reclassify_variant_sandbox', content_id: v.id })
      .first();

    if (!existing) {
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: v.tenant_id || '00000000-0000-0000-0000-000000000000',
        brand_id: v.brand_id || '00000000-0000-0000-0000-000000000000',
        user_id: userId,
        agent_id: 'production_integrity_agent',
        platform: v.platform,
        account_id: v.remote_post_id || 'sandbox_account',
        action: 'audit_reclassify_variant_sandbox',
        content_id: v.id,
        timestamp: now,
        result: 'reclassified_to_sandbox',
        external_id: v.remote_post_id || null,
        error: null,
        metadata: JSON.stringify({
          reason: 'Historical mock/sandbox artifact reclassified to preserve production publication integrity',
          postId: v.post_id,
          originalRemoteId: v.remote_post_id,
          originalRemoteUrl: v.remote_post_url,
        }),
        created_at: now,
      });
      addedVariants++;
    }
  }

  // 2. Audit records for sandbox posts
  const sandboxPosts = await db('posts')
    .leftJoin('brands', 'posts.brand_id', 'brands.id')
    .where('posts.status', 'sandbox')
    .select('posts.id', 'posts.brand_id', 'posts.title', 'brands.tenant_id');

  for (const p of sandboxPosts) {
    const existing = await db('publishing_audit_logs')
      .where({ action: 'audit_reclassify_post_sandbox', content_id: p.id })
      .first();

    if (!existing) {
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: p.tenant_id || '00000000-0000-0000-0000-000000000000',
        brand_id: p.brand_id || '00000000-0000-0000-0000-000000000000',
        user_id: userId,
        agent_id: 'production_integrity_agent',
        platform: 'all',
        account_id: 'all',
        action: 'audit_reclassify_post_sandbox',
        content_id: p.id,
        timestamp: now,
        result: 'reclassified_to_sandbox',
        external_id: null,
        error: null,
        metadata: JSON.stringify({
          reason: 'Post has no confirmed real production publications; reclassified to sandbox',
          title: p.title,
        }),
        created_at: now,
      });
      addedPosts++;
    }
  }

  // 3. Audit records for sandbox publishing jobs
  const sandboxJobs = await db('publishing_jobs')
    .where('status', 'sandbox')
    .select('id', 'tenant_id', 'brand_id', 'platform', 'account_id', 'content_id', 'post_id', 'external_post_id');

  for (const j of sandboxJobs) {
    const existing = await db('publishing_audit_logs')
      .where({ action: 'audit_reclassify_job_sandbox', content_id: j.id })
      .first();

    if (!existing) {
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: j.tenant_id,
        brand_id: j.brand_id,
        user_id: userId,
        agent_id: 'production_integrity_agent',
        platform: j.platform,
        account_id: j.account_id || 'sandbox_account',
        action: 'audit_reclassify_job_sandbox',
        content_id: j.id,
        timestamp: now,
        result: 'reclassified_to_sandbox',
        external_id: j.external_post_id || null,
        error: null,
        metadata: JSON.stringify({
          reason: 'Historical job executed in sandbox/mock mode; reclassified to preserve production integrity',
          postId: j.post_id,
          variantId: j.content_id,
        }),
        created_at: now,
      });
      addedJobs++;
    }
  }

  // 4. Audit record for preserved real publication
  const realPubVariant = await db('post_variants')
    .leftJoin('posts', 'post_variants.post_id', 'posts.id')
    .leftJoin('brands', 'posts.brand_id', 'brands.id')
    .where('post_variants.remote_post_id', '1405588742634526_122100337179498315')
    .select('post_variants.*', 'posts.brand_id', 'brands.tenant_id')
    .first();

  if (realPubVariant) {
    const existing = await db('publishing_audit_logs')
      .where({ action: 'audit_preserve_real_publication', content_id: realPubVariant.id })
      .first();

    if (!existing) {
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: realPubVariant.tenant_id,
        brand_id: realPubVariant.brand_id,
        user_id: userId,
        agent_id: 'production_integrity_agent',
        platform: 'facebook',
        account_id: '1405588742634526',
        action: 'audit_preserve_real_publication',
        content_id: realPubVariant.id,
        timestamp: now,
        result: 'preserved_as_published',
        external_id: '1405588742634526_122100337179498315',
        error: null,
        metadata: JSON.stringify({
          reason: 'Confirmed real external Meta publication; status preserved strictly as published',
          url: realPubVariant.remote_post_url,
          postId: realPubVariant.post_id,
        }),
        created_at: now,
      });
      addedPreserved++;
    }
  }

  // 5. Audit records for flagged ownership conflicts
  const conflictConns = await db('meta_connections')
    .where('status', 'ownership_conflict')
    .select('*');

  for (const c of conflictConns) {
    const existing = await db('publishing_audit_logs')
      .where({ action: 'flag_meta_page_ownership_conflict', content_id: c.id })
      .first();

    if (!existing) {
      await db('publishing_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: c.tenant_id,
        brand_id: c.brand_id,
        user_id: userId,
        agent_id: 'production_integrity_agent',
        platform: 'facebook',
        account_id: c.selected_page_id,
        action: 'flag_meta_page_ownership_conflict',
        content_id: c.id,
        timestamp: now,
        result: 'flagged_ownership_conflict',
        external_id: c.selected_page_id,
        error: 'Ownership conflict: Meta Page is associated with multiple brands/tenants. Disconnect not performed automatically.',
        metadata: JSON.stringify({
          pageId: c.selected_page_id,
          reason: 'Duplicate Meta Page ownership detected across tenants; publishing blocked until resolved',
        }),
        created_at: now,
      });
      addedConflicts++;
    }
  }

  console.log(`Audit records recorded:`);
  console.log(`- Sandbox variants: ${addedVariants}`);
  console.log(`- Sandbox posts: ${addedPosts}`);
  console.log(`- Sandbox jobs: ${addedJobs}`);
  console.log(`- Preserved real publications: ${addedPreserved}`);
  console.log(`- Flagged ownership conflicts: ${addedConflicts}`);

  const totalAudit = await db('publishing_audit_logs').count('* as count').first();
  console.log(`Total publishing_audit_logs in database: ${totalAudit?.count}`);

  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
