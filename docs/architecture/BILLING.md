# Billing & Subscription Architecture

## Overview
SocialForge SaaS billing architecture provides multi-tenant subscription tiers, usage metering, automated dunning recovery, customer self-service portals, and superadmin governance.

## Components
- **Stripe Billing Provider (`stripeBillingProvider.ts`)**: Integrates Stripe Subscriptions, Checkout Sessions, Customer Portals, and webhooks.
- **Entitlement Service (`entitlement.service.ts`)**: Fast in-memory cached checks for plan feature gates and quota limits.
- **Usage Tracker (`usageTracker.service.ts`)**: Metered tracking of AI tokens, published posts, connected channels, and storage bytes.
- **Dunning Service (`dunning.service.ts`)**: Manages grace periods, payment retry schedules, automated notification emails, and workspace status transitions (`active` -> `past_due` -> `unpaid` -> `canceled`).
- **Webhook DLQ (`webhookDlq.service.ts`)**: Dead-letter queue with exponential backoff retries for dropped or erroneous billing webhook events.
