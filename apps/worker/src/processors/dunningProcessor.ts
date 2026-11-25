import crypto from 'node:crypto';
import { db } from '../db/connection.js';

const GRACE_PERIOD_HOURS = 120; // 5 days

export async function processDunningEvaluation(): Promise<{
  pastDueCount: number;
  stage2Sent: number;
  suspendedCount: number;
}> {
  try {
    const pastDueSubs = await db('tenant_subscriptions')
      .where({ status: 'past_due' })
      .orWhereNotNull('past_due_since');

    let stage2Sent = 0;
    let suspendedCount = 0;

    for (const sub of pastDueSubs) {
      if (sub.status !== 'past_due' && !sub.past_due_since) continue;

      const pastDueTime = sub.past_due_since
        ? new Date(sub.past_due_since).getTime()
        : new Date(sub.updated_at).getTime();

      const hoursElapsed = Math.floor((Date.now() - pastDueTime) / (3600 * 1000));
      const tenantId = sub.tenant_id;

      // Find billing recipients for tenant
      const recipients = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', tenantId)
        .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
        .where('users.is_active', 1)
        .select('users.id', 'users.email', 'users.full_name as fullName');

      // STAGE 3: >= 120 hours elapsed -> AUTOMATIC SUSPENSION
      if (hoursElapsed >= GRACE_PERIOD_HOURS) {
        await db('tenant_subscriptions')
          .where({ id: sub.id })
          .update({
            status: 'expired',
            updated_at: new Date(),
          });

        for (const recipient of recipients) {
          // Check if stage 3 event already logged in last 24h
          const existing = await db('billing_dunning_events')
            .where({
              tenant_id: tenantId,
              event_type: 'grace_expired_suspension',
              stage: 3,
              recipient_email: recipient.email,
            })
            .first();

          if (!existing) {
            await db('billing_dunning_events').insert({
              id: crypto.randomUUID(),
              tenant_id: tenantId,
              subscription_id: sub.provider_subscription_id || sub.id,
              event_type: 'grace_expired_suspension',
              stage: 3,
              status: 'sent',
              recipient_email: recipient.email,
              subject: 'Account Suspended: Payment grace period expired',
              payload: JSON.stringify({
                hoursElapsed,
                suspendedAt: new Date().toISOString(),
              }),
              created_at: new Date(),
              sent_at: new Date(),
            });
            suspendedCount++;
          }
        }

        // Add or update in-app alert
        const existingAlert = await db('billing_notifications')
          .where({ tenant_id: tenantId, type: 'account_suspended', is_dismissed: false })
          .first();

        if (!existingAlert) {
          await db('billing_notifications').insert({
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            type: 'account_suspended',
            title: 'Account Workflows Suspended',
            message: 'Your 5-day grace period has expired. Publishing and automation features have been suspended. Please update your billing details immediately to restore access.',
            severity: 'critical',
            action_url: '/settings/billing',
            action_label: 'Reactivate Account',
            is_read: false,
            is_dismissed: false,
            created_at: new Date(),
          });
        }
        continue;
      }

      // STAGE 2: >= 48 hours elapsed -> URGENT REMINDER
      if (hoursElapsed >= 48 && hoursElapsed < GRACE_PERIOD_HOURS) {
        const daysRemaining = Math.max(1, Math.ceil((GRACE_PERIOD_HOURS - hoursElapsed) / 24));

        for (const recipient of recipients) {
          const existing = await db('billing_dunning_events')
            .where({
              tenant_id: tenantId,
              event_type: 'grace_warning_day3',
              stage: 2,
              recipient_email: recipient.email,
            })
            .first();

          if (!existing) {
            await db('billing_dunning_events').insert({
              id: crypto.randomUUID(),
              tenant_id: tenantId,
              subscription_id: sub.provider_subscription_id || sub.id,
              event_type: 'grace_warning_day3',
              stage: 2,
              status: 'sent',
              recipient_email: recipient.email,
              subject: `Urgent: ${daysRemaining} days remaining before your SocialForge workspace is suspended`,
              payload: JSON.stringify({
                hoursElapsed,
                daysRemaining,
              }),
              created_at: new Date(),
              sent_at: new Date(),
            });
            stage2Sent++;
          }
        }
      }
    }

    return {
      pastDueCount: pastDueSubs.length,
      stage2Sent,
      suspendedCount,
    };
  } catch (err) {
    console.error('[Worker Dunning Processor] Error evaluating past-due subscriptions:', err);
    return { pastDueCount: 0, stage2Sent: 0, suspendedCount: 0 };
  }
}
