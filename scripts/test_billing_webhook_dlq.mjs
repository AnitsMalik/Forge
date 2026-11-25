import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../apps/api/dist/config/index.js';
import { WebhookDlqService } from '../apps/api/dist/services/billing/webhookDlq.service.js';

const uuidv4 = () => crypto.randomUUID();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = config.jwtSecret;

async function main() {
  console.log('========================================================================');
  console.log('SOCIALFORGE — BILLING WEBHOOK RETRY, DEAD-LETTER QUEUE & RECOVERY SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const connection = await mysql.createConnection(DB_CONFIG);

  const testTenantId = uuidv4();
  const standardUserId = uuidv4();
  const superadminUserId = uuidv4();

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Test Fixtures
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating test tenant and users (standard vs superadmin)...');

    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [testTenantId, 'DLQ Verification Workspace', `dlq-test-${Date.now()}`]
    );

    const [plans] = await connection.execute(`SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1`);
    const planId = plans[0]?.id || 'starter';

    await connection.execute(
      `INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 'stripe', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NOW(), NOW())`,
      [uuidv4(), testTenantId, planId]
    );

    // Standard User
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Regular Member', 0, 1, NOW(), NOW())`,
      [standardUserId, `reg.${Date.now()}@example.com`]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'creator', NOW(), NOW())`,
      [uuidv4(), testTenantId, standardUserId]
    );

    // Superadmin User
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Super Admin', 1, 1, NOW(), NOW())`,
      [superadminUserId, `dlq.super.${Date.now()}@socialforge.io`]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), testTenantId, superadminUserId]
    );

    const signToken = (userId, tenantId, role, isSuperAdmin = false) => {
      return jwt.sign({ userId, tenantId, role, email: `${role}@test.com`, isSuperAdmin }, JWT_SECRET, {
        expiresIn: '1h',
      });
    };

    const tokenStandard = signToken(standardUserId, testTenantId, 'creator', false);
    const tokenSuperadmin = signToken(superadminUserId, testTenantId, 'owner', true);

    // Ensure DLQ table exists
    await WebhookDlqService.ensureTable();

    // -------------------------------------------------------------------------
    // 2. Test: Security & Authorization Guards on DLQ Endpoints
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Security: Unauthenticated request rejection...');
    const unauthRes = await fetch(`${API_BASE}/admin/billing/dlq`);
    assert(unauthRes.status === 401, 'Unauthenticated request receives HTTP 401 Unauthorized');

    console.log('\n[Test 2] Security: Non-superadmin access rejection...');
    const nonAdminRes = await fetch(`${API_BASE}/admin/billing/dlq`, {
      headers: { Authorization: `Bearer ${tokenStandard}` },
    });
    assert(nonAdminRes.status === 403, 'Non-superadmin receives HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // 3. Test: Ingestion and Delivery Recording on Webhook Arrival
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Webhook Delivery Recording & Successful Processing...');
    const sampleEventId = `evt_test_${Date.now()}`;
    const validWebhookPayload = {
      id: sampleEventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${Date.now()}`,
          client_reference_id: testTenantId,
          metadata: { tenantId: testTenantId, planId: 'growth' },
          subscription: `sub_mock_${Date.now()}`,
          customer: `cus_mock_${Date.now()}`,
        },
      },
    };

    const webhookRes = await fetch(`${API_BASE}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWebhookPayload),
    });

    assert(webhookRes.status === 200, `Webhook receiver returned HTTP 200 (got ${webhookRes.status})`);
    const webhookJson = await webhookRes.json();
    assert(webhookJson.received === true, 'Webhook confirmed received');
    assert(typeof webhookJson.deliveryId === 'string', `Recorded deliveryId: ${webhookJson.deliveryId}`);

    // Verify delivery table state
    const [delivRows] = await connection.execute(
      `SELECT * FROM billing_webhook_deliveries WHERE id = ?`,
      [webhookJson.deliveryId]
    );
    assert(delivRows.length === 1, 'Delivery record exists in billing_webhook_deliveries');
    assert(delivRows[0].status === 'processed', `Delivery status is "processed" (got "${delivRows[0].status}")`);
    assert(delivRows[0].attempts === 1, 'Delivery attempts count is 1');
    assert(delivRows[0].provider_event_id === sampleEventId, 'Provider event ID recorded');

    // Duplicate Webhook Submission -> Idempotency Guard
    const dupRes = await fetch(`${API_BASE}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validWebhookPayload),
    });
    const dupJson = await dupRes.json();
    assert(dupJson.duplicate === true, 'Duplicate webhook recognized and skipped idempotently');

    // -------------------------------------------------------------------------
    // 4. Test: Transient Failure & Exponential Backoff Retry Scheduling
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Transient Webhook Failure & Exponential Backoff Scheduling...');
    const failingEventId = `evt_fail_${Date.now()}`;
    // Malformed object that triggers an error in domain handler (missing data object)
    const failingPayload = {
      id: failingEventId,
      type: 'invoice.payment_failed',
      // data missing so accessing event.data.object throws TypeError
    };

    const failDeliveryId = await WebhookDlqService.recordIncoming('stripe', failingPayload);
    const failRes = await WebhookDlqService.processDelivery(failDeliveryId);

    assert(failRes.success === false, 'Failing delivery correctly reported failure');
    assert(failRes.deadLetter === false, 'Not dead-lettered on initial failure (attempt 1/5)');
    assert(failRes.attempts === 1, 'Attempts count is 1');
    assert(failRes.nextRetryAt !== null, 'Next retry timestamp scheduled');

    const [failRows] = await connection.execute(
      `SELECT status, attempts, next_retry_at, last_error FROM billing_webhook_deliveries WHERE id = ?`,
      [failDeliveryId]
    );
    assert(failRows[0].status === 'failed', `Delivery status is "failed" (got "${failRows[0].status}")`);
    assert(failRows[0].last_error !== null, `Error logged: ${failRows[0].last_error.slice(0, 40)}...`);

    // -------------------------------------------------------------------------
    // 5. Test: Dead-Letter Queue (DLQ) Transition after Max Attempts
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Dead-Letter Queue Transition upon Exceeding Max Attempts (5/5)...');
    // Set attempts to 4 so next execution triggers attempt 5 (max)
    await connection.execute(
      `UPDATE billing_webhook_deliveries SET attempts = 4 WHERE id = ?`,
      [failDeliveryId]
    );

    const dlqRes = await WebhookDlqService.processDelivery(failDeliveryId);
    assert(dlqRes.success === false, 'Final attempt failed as expected');
    assert(dlqRes.deadLetter === true, 'Delivery transitioned to deadLetter = true');
    assert(dlqRes.attempts === 5, 'Attempts reached max (5)');

    const [dlqCheck] = await connection.execute(
      `SELECT status, next_retry_at FROM billing_webhook_deliveries WHERE id = ?`,
      [failDeliveryId]
    );
    assert(dlqCheck[0].status === 'dead_letter', `Database confirms status is "dead_letter" (got "${dlqCheck[0].status}")`);
    assert(dlqCheck[0].next_retry_at === null, 'Next retry cleared upon moving to DLQ');

    // -------------------------------------------------------------------------
    // 6. Test: Superadmin DLQ Telemetry & Deliveries Listing
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Superadmin DLQ Telemetry & Listing Endpoints...');
    const statsRes = await fetch(`${API_BASE}/admin/billing/dlq/stats`, {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(statsRes.status === 200, 'GET /admin/billing/dlq/stats returned HTTP 200');
    const statsJson = await statsRes.json();
    assert(statsJson.success === true, 'Stats response success is true');
    assert(statsJson.data.total >= 2, `Total deliveries recorded: ${statsJson.data.total}`);
    assert(statsJson.data.processed >= 1, `Processed deliveries recorded: ${statsJson.data.processed}`);
    assert(statsJson.data.deadLetter >= 1, `Dead letter deliveries recorded: ${statsJson.data.deadLetter}`);

    const listRes = await fetch(`${API_BASE}/admin/billing/dlq?status=dead_letter`, {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(listRes.status === 200, 'GET /admin/billing/dlq returned HTTP 200');
    const listJson = await listRes.json();
    assert(listJson.success === true, 'List response success is true');
    assert(Array.isArray(listJson.data.items), 'Deliveries returned as array');
    const dlItem = listJson.data.items.find((item) => item.id === failDeliveryId);
    assert(dlItem !== undefined, 'Dead letter item found in listing');
    assert(dlItem.status === 'dead_letter', 'Item status is dead_letter');

    // -------------------------------------------------------------------------
    // 7. Test: Manual Replay from Dead-Letter Queue
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Manual DLQ Replay with Idempotency Guard & Payload Recovery...');
    // Attempting to replay an already processed event without force should fail
    const replayProcessedRes = await fetch(`${API_BASE}/admin/billing/dlq/${webhookJson.deliveryId}/replay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSuperadmin}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false }),
    });
    assert(replayProcessedRes.status === 400, 'Replaying already processed delivery rejected with HTTP 400 (idempotency guard)');

    // Fix the payload for the dead-lettered event so it can successfully process
    const repairedPayload = {
      id: failingEventId,
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: `in_fixed_${Date.now()}`,
          customer: `cus_fixed_${Date.now()}`,
          subscription: `sub_fixed_${Date.now()}`,
          amount_due: 7900,
          currency: 'usd',
          status: 'open',
          metadata: { tenantId: testTenantId },
        },
      },
    };

    await connection.execute(
      `UPDATE billing_webhook_deliveries SET payload = ? WHERE id = ?`,
      [JSON.stringify(repairedPayload), failDeliveryId]
    );

    const replayRes = await fetch(`${API_BASE}/admin/billing/dlq/${failDeliveryId}/replay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSuperadmin}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    });

    assert(replayRes.status === 200, 'Replaying repaired dead-letter event returns HTTP 200 OK');
    const replayJson = await replayRes.json();
    assert(replayJson.data.success === true, 'Replay execution reported success = true');
    assert(replayJson.data.status === 'processed', 'Delivery updated to status = "processed"');

    // -------------------------------------------------------------------------
    // 8. Test: Batch Replay & Discard DLQ Endpoints
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Batch Replay & Discard Endpoints...');
    const replayAllRes = await fetch(`${API_BASE}/admin/billing/dlq/replay-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSuperadmin}`, 'Content-Type': 'application/json' },
    });
    assert(replayAllRes.status === 200, 'POST /admin/billing/dlq/replay-all returns HTTP 200 OK');

    // Create disposable dead letter to test discard
    const discardDelivId = await WebhookDlqService.recordIncoming('stripe', { type: 'test.discard' });
    await connection.execute(
      `UPDATE billing_webhook_deliveries SET status = 'dead_letter' WHERE id = ?`,
      [discardDelivId]
    );

    const discardRes = await fetch(`${API_BASE}/admin/billing/dlq/${discardDelivId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(discardRes.status === 200, 'DELETE /admin/billing/dlq/:id returns HTTP 200 OK');
    const [discardCheck] = await connection.execute(
      `SELECT status FROM billing_webhook_deliveries WHERE id = ?`,
      [discardDelivId]
    );
    assert(discardCheck[0].status === 'discarded', 'Delivery status marked "discarded"');

    // -------------------------------------------------------------------------
    // 9. Test: Production Meta Publication Integrity Lock
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Verifying Production Meta Publication Lock...');
    const [metaVariants] = await connection.execute(
      `SELECT remote_post_id, status FROM post_variants WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(metaVariants.length === 1, 'Real Meta production post variant strictly exists in database');
    assert(metaVariants[0].status === 'published', 'Real Meta production post variant status is "published"');

    console.log('\n[Cleanup] Cleaning test records...');
  } finally {
    try {
      if (testTenantId) {
        await connection.execute(`DELETE FROM billing_webhook_deliveries WHERE tenant_id = ?`, [testTenantId]);
        await connection.execute(`DELETE FROM tenant_subscriptions WHERE tenant_id = ?`, [testTenantId]);
        await connection.execute(`DELETE FROM tenant_users WHERE tenant_id = ?`, [testTenantId]);
        await connection.execute(`DELETE FROM users WHERE id IN (?, ?)`, [standardUserId, superadminUserId]);
        await connection.execute(`DELETE FROM tenants WHERE id = ?`, [testTenantId]);
      }
    } catch {
      // Ignored
    }
    await connection.end();
  }

  console.log('\n========================================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
