import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';

/**
 * Utility script to verify and backfill active tenant subscriptions
 * for any tenants created during dynamic test suites or isolated sandbox environments.
 */
async function syncTenantSubscriptions() {
  console.log('========================================================');
  console.log('       SOCIALFORGE TENANT SUBSCRIPTIONS SYNC TOOL       ');
  console.log('========================================================\n');

  const tenants = await db('tenants').select('id', 'name');
  const subs = await db('tenant_subscriptions').select('tenant_id');
  const subTenantIds = new Set(subs.map((s) => s.tenant_id));

  const missing = tenants.filter((t) => !subTenantIds.has(t.id));
  console.log(`[Status] Total tenants: ${tenants.length}, Subscribed: ${subs.length}, Missing: ${missing.length}`);

  if (missing.length === 0) {
    console.log('✓ All tenants have active subscriptions.');
    process.exit(0);
  }

  console.log('\n[Backfill] Ensuring subscription records for missing tenants:');
  for (const t of missing) {
    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: t.id,
      plan_id: 'free_trial',
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`  ✓ Created default 'free_trial' subscription for tenant ${t.id} (${t.name})`);
  }

  console.log('\n========================================================');
  console.log('       STATUS: ALL TENANT SUBSCRIPTIONS SYNCHRONIZED     ');
  console.log('========================================================\n');
  process.exit(0);
}

syncTenantSubscriptions().catch((err) => {
  console.error('[Error] Subscription sync failed:', err);
  process.exit(1);
});
