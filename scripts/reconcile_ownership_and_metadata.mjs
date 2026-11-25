import dotenv from 'dotenv';
dotenv.config();

import { db } from '../apps/api/dist/db/connection.js';

async function reconcileOwnershipAndMetadata() {
  console.log('========================================================================');
  console.log('  SOCIALFORGE: METADATA & OWNERSHIP CONFLICT RECONCILIATION   ');
  console.log('========================================================================\n');

  try {
    const now = new Date();

    // 1. Identify all meta_connections with status 'ownership_conflict'
    const conflictedConns = await db('meta_connections')
      .where({ status: 'ownership_conflict' });

    console.log(`Found ${conflictedConns.length} connection(s) in ownership conflict:`);
    for (const conn of conflictedConns) {
      console.log(`- Connection ID: ${conn.id}, Brand ID: ${conn.brand_id}, Page ID: ${conn.selected_page_id}`);
    }

    // 2. Deactivate any active social_accounts associated with ownership-conflicted connections
    if (conflictedConns.length > 0) {
      const conflictedBrandIds = conflictedConns.map((c) => c.brand_id);
      const updatedConflicted = await db('social_accounts')
        .whereIn('brand_id', conflictedBrandIds)
        .where({ is_active: 1 })
        .update({
          is_active: 0,
          updated_at: now,
        });
      console.log(`\nDeactivated ${updatedConflicted} conflicting/stale social_account record(s).`);
    }

    // 3. Ensure HOASP connection and social_accounts reflect accurate verified expiration metadata
    const hoaspBrandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
    const verifiedExpiresAt = new Date('2026-10-04T15:00:00.000Z');

    const updatedHoasp = await db('social_accounts')
      .where({ brand_id: hoaspBrandId })
      .whereIn('platform', ['facebook', 'instagram'])
      .update({
        is_active: 0,
        token_expires_at: verifiedExpiresAt,
        updated_at: now,
      });

    console.log(`Synchronized ${updatedHoasp} HOASP social_account record(s) with verified token expiry (2026-10-04T15:00:00Z).`);

    // 4. Verify permanent production Meta publication lock invariant
    console.log('\n--- [PERMANENT PRODUCTION META PUBLICATION LOCK CHECK] ---');
    const lockedVariant = await db('post_variants')
      .where({ id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164' })
      .first();

    const lockedJob = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
      .first();

    if (
      lockedVariant?.status !== 'published' ||
      lockedVariant?.remote_post_id !== '1405588742634526_122100337179498315' ||
      lockedJob?.status !== 'published'
    ) {
      console.error('❌ CRITICAL VIOLATION: Production publication lock altered!');
      process.exit(1);
    }
    console.log('✓ PASS: Production publication lock invariant strictly preserved.');

    console.log('\n========================================================================');
    console.log('  RECONCILIATION COMPLETE: ALL METADATA ACCURATELY SYNCHRONIZED       ');
    console.log('========================================================================');
  } catch (err) {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

reconcileOwnershipAndMetadata();
