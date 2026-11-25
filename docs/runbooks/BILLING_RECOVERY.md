# Billing & Dunning Recovery Runbook

## Overview
Procedures for addressing payment failures, invoice sync errors, and workspace suspension overrides.

## Investigation
- Check tenant subscription state in `subscriptions` and `tenants` tables.
- Inspect Stripe dashboard for corresponding customer ID.
- Verify whether webhooks were dropped or failed during dunning cycle.

## Resolution
1. **Manual Sync**:
   - Re-fetch subscription status from Stripe API and reconcile local DB record.
2. **Grace Period Extension**:
   - Update `grace_period_ends_at` to grant temporary customer access while payment method issues are resolved.
3. **Re-activate Workspace**:
   - If payment succeeded externally, transition status back to `active`.
