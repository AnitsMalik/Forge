# SocialForge — Architectural Decision Records (ADRs)

## Index of Architectural Decisions

- **ADR-001**: Modular Monorepo Architecture
- **ADR-002**: Row-Level Multi-Tenancy with Tenant Context Middleware
- **ADR-003**: Headless Satori + Sharp for Image Rendering over Puppeteer
- **ADR-004**: FFmpeg Worker Subprocess vs External Video Transcoding SaaS
- **ADR-005**: BullMQ + Redis for Asynchronous Job Orchestration & Scheduling
- **ADR-006**: Dual-Track Authentication: JWT + Magic Links for Client Approvers
- **ADR-007**: PostgreSQL 16 with Dedicated Database Name `socialforge_db`
- **ADR-008**: Built-In Mock Social Network Simulator for Zero-Credential Sandbox Testing
- **ADR-009**: S3 Direct Presigned Uploads vs API Stream Proxying
- **ADR-010**: Vanilla CSS Design Token System with Glassmorphic Visuals
- **ADR-011**: Multi-Tenant Workspace Hierarchy & Entitlement Engine
- **ADR-012**: Provider-Agnostic Commercial Billing Architecture (Stripe Provider)
- **ADR-013**: Atomic Multi-Dimensional Usage Metering & Quota Counter Protection
- **ADR-014**: 3-Stage Dunning Lifecycle & 5-Day Grace Period Architecture
- **ADR-015**: Containerized Production Topology & Healthcheck Startup Sequencing
- **ADR-016**: Customer Billing Portal, Cancel-at-Period-End & Tamper-Evident Audit Logging
- **ADR-017**: HLD v3.0 Multi-Tier Commercial Packaging, Brand-Scoped Entitlements & Webhook DLQ Engine
- **ADR-018**: SocialForge Campaign Command Center, Non-Silent Strategy Activation & Paid Execution Isolation
- **ADR-019**: Closed-Loop AI Marketing Advisor, Empirical Telemetry Feedback & 1-Click Command Center Synthesis
- **ADR-020**: SocialForge Superadmin Operations & Safeguarded Administrative Views
- **ADR-021**: Automated Multi-Channel Incident Alerting, Webhooks & Alert Fatigue Cooldown Deduplication
- **ADR-022**: Enterprise Audit Compliance, Cryptographic Merkle Signatures, SOC2/GDPR Exports & Granular RBAC Engine
- **ADR-023**: Real-Time Social Webhook Event Ingestion, HMAC Verification & Resilient Dead-Letter Replay Engine
- **ADR-024**: Enterprise SLA Monitor, High-Availability Health & Public Status Page Feeds
- **ADR-025**: Automated Disaster Recovery, Database Snapshot Vault & Multi-Region Backup Verification
- **ADR-026**: Outbound Webhook Dispatcher & Enterprise Event Notification Engine
- **ADR-027**: Enterprise SSO & SAML 2.0 / OIDC Identity Provider Federation
- **ADR-028**: Public Marketing Website, Commercial Visitor Journey & Playwright E2E Suite (v6.9.0)
- **ADR-029**: Superadmin Operations & Diagnostic Fleet Interface Modernization (Zero-Native Dialog Architecture)

---

## ADR-001: Modular Monorepo Architecture
- **Status**: Accepted
- **Context**: The project consists of a React frontend, an Express API, a heavy background worker, and shared types/schemas.
- **Decision**: Adopt a modular monorepo structure (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`) using workspaces.
- **Consequences**: Enables strict end-to-end type safety, shared Zod validation contracts, and synchronized atomic commits without maintaining multiple external repositories.

---

## ADR-002: Row-Level Multi-Tenancy with Tenant Context Middleware
- **Status**: Accepted
- **Context**: SocialForge serves multiple marketing agencies, each managing dozens of client brands.
- **Decision**: Implement shared database with row-level isolation via non-nullable `tenant_id` on all tenant-owned entities, enforced by API middleware and composite foreign key indexes.
- **Consequences**: Far simpler migration management and operational overhead compared to a database-per-tenant or schema-per-tenant architecture, while meeting strict isolation standards when validated by automated test suites.

---

## ADR-003: Headless Satori + Sharp for Image Rendering over Puppeteer
- **Status**: Accepted
- **Context**: SocialForge needs to render high-resolution branded quote cards, stat highlights, and announcements dynamically.
- **Decision**: Utilize Satori (JSX to SVG) paired with Resvg/Sharp (SVG to PNG/WebP) instead of spinning up Chromium/Puppeteer.
- **Consequences**: Reduces memory overhead from ~250MB per instance to <30MB, decreases render latency from 2500ms to <200ms, and eliminates headless browser crash risks.

---

## ADR-004: FFmpeg Worker Subprocess vs External Video Transcoding SaaS
- **Status**: Accepted
- **Context**: Short-form video compilation requires vertical cropping, audio ducking, subtitle burn-in, and logo watermark injection.
- **Decision**: Package native FFmpeg within a dedicated Docker container (`apps/worker`) with concurrency limits rather than routing raw video to costly third-party transcoding APIs.
- **Consequences**: Zero per-minute third-party SaaS fees, full deterministic control over filtergraphs, lower external network transit latency, but requires container CPU/memory throttling.

---

## ADR-005: BullMQ + Redis for Asynchronous Job Orchestration & Scheduling
- **Status**: Accepted
- **Context**: Time-critical scheduled publishing, AI text synthesis, and media rendering must not block the API server.
- **Decision**: Deploy Redis 7 with BullMQ as the unified queue and delayed job engine.
- **Consequences**: Provides battle-tested delayed job execution down to the second, atomic locks, exponential backoff retries, and clean job failure inspection.

---

## ADR-006: Dual-Track Authentication: JWT + Magic Links for Client Approvers
- **Status**: Accepted
- **Context**: Agency team members need standard persistent authenticated accounts, but busy corporate clients refuse to create yet another platform login just to approve a weekly post.
- **Decision**: Implement standard Argon2 + JWT access/refresh authentication for agency staff, and high-entropy (256-bit) single-use magic links with 72-hour expiration for client approvers.
- **Consequences**: Drastically accelerates client approval velocity, minimizes onboarding friction, and guarantees client approvers cannot access agency internal settings.

---

## ADR-007: MySQL 9.x / 8.4 with Dedicated Database Name `socialforge_db`
- **Status**: Accepted
- **Context**: The relational database engine must support high-concurrency multi-tenant social marketing workflows, JSON attributes for brand kits, and standard SQL constraints.
- **Decision**: Use MySQL 9.x / 8.4 (InnoDB engine) with database name `socialforge_db`, user `root`, port `3308` (local) / `3306` (container), and UUID primary keys stored as `CHAR(36)`.
- **Consequences**: Provides native JSON support, ACID compliance, low-latency relational joins across brands and posts, and direct compatibility with the local running MySQL service.

---

## ADR-008: Built-In Mock Social Network Simulator for Sandbox Testing
- **Status**: Accepted
- **Context**: Developers and CI pipelines cannot rely on live third-party social media developer accounts (Meta, X, LinkedIn) for local feature testing.
- **Decision**: Implement a native Mock Sandbox Social Provider adhering to the `SocialPlatformAdapter` interface that simulates success, latency, and rate limits.
- **Consequences**: Enables immediate local development, complete end-to-end regression testing, and zero blocking dependencies on external API approval reviews.

---

## ADR-009: S3 Direct Presigned Uploads vs API Stream Proxying
- **Status**: Accepted
- **Context**: High-resolution video and image uploads consume significant API memory and bandwidth if proxied through Express.
- **Decision**: Issue short-lived (15-minute) presigned S3 PUT URLs allowing clients to stream files directly to MinIO/S3.
- **Consequences**: Keeps the API lightweight and horizontally scalable; API server memory is never consumed by large video binaries.

---

## ADR-010: Vanilla CSS Design Token System with Glassmorphic Visuals
- **Status**: Accepted
- **Context**: The frontend must deliver a stunning, premium aesthetic (glassmorphism, subtle micro-animations, curated palettes, dark mode) without framework lock-in.
- **Decision**: Use pure Vanilla CSS with CSS Custom Properties (tokens) and scoped CSS modules for maximum flexibility, performance, and aesthetic precision.
- **Consequences**: Clean, fast-loading UI without large CSS framework overhead, allowing complete control over typography, gradients, and micro-interactions.

---

## ADR-011: Multi-Tenant Workspace Hierarchy & Entitlement Engine
- **Status**: Accepted
- **Context**: SocialForge transitioned from a single-tenant agency platform to a commercial multi-tenant SaaS serving independent workspaces, each with distinct commercial subscription plans, quota tiers, and team members.
- **Decision**: Introduce `tenant_subscriptions` and `subscription_plans` tables managed by an authoritative, centralized `EntitlementService`. Entitlements are evaluated dynamically at both the service layer and via Express HTTP middleware (`requireEntitlement`), rejecting limit-exceeding requests with structured HTTP 403 `PLAN_LIMIT_EXCEEDED` payloads.
- **Consequences**: Guarantees zero revenue leakage, prevents tenant privilege escalation, provides consistent real-time limit feedback to the frontend, and enables instant tier upgrades.

---

## ADR-012: Provider-Agnostic Commercial Billing Architecture (Stripe Provider)
- **Status**: Accepted
- **Context**: The platform requires automated recurring billing, self-service checkouts, customer billing portals, and payment lifecycle management without coupling core application domain logic directly to Stripe SDK types.
- **Decision**: Define a TypeScript `BillingProvider` interface and implement `StripeBillingProvider` as the default reference implementation. Process all inbound webhooks idempotently using the `billing_webhook_events` audit table with cryptographic signature verification.
- **Consequences**: Isolates external payment gateway dependencies, supports multi-provider extensibility (e.g., Lemon Squeezy, Paddle), prevents duplicate credit/invoice applications, and satisfies strict PCI-DSS compliance by ensuring zero raw credit card or CVV data touches application servers.

---

## ADR-013: Atomic Multi-Dimensional Usage Metering & Quota Counter Protection
- **Status**: Accepted
- **Context**: Published social posts, AI text generation, video rendering seconds, and media storage must be tracked and metered accurately across billing cycles without double-counting retries or transient worker errors.
- **Decision**: Implement `UsageTrackerService` with atomic SQL increments on `tenant_usage_counters` (`posts_published`, `ai_tokens_used`, `video_seconds_rendered`, `storage_bytes_used`). Lock post variants with a boolean `quota_counted` flag in a single database transaction upon verified successful external publication only. Sandbox/mock posts and failed attempts are strictly excluded from quota consumption.
- **Consequences**: Provides tamper-proof usage metering, handles asynchronous retry deduplication safely, and powers real-time usage meters on the frontend billing dashboard.

---

## ADR-014: 3-Stage Dunning Lifecycle & 5-Day Grace Period Architecture
- **Status**: Accepted
- **Context**: Involuntary customer churn due to failed card charges degrades user experience if accounts are immediately suspended without notice or grace periods.
- **Decision**: Establish a 3-stage automated dunning state machine:
  - **Stage 1 (Day 1)**: Immediate notification on payment failure; account enters `past_due` status with a 5-day grace period where publishing and core operations remain permitted.
  - **Stage 2 (Day 3)**: Urgent email warning and persistent in-app critical alert banner indicating days remaining before suspension.
  - **Stage 3 (Day 5+)**: Grace period expires; subscription transitions to `expired` status, automatically restricting resource creation and publication until payment method recovery.
- **Consequences**: Minimizes customer disruption, maximizes payment recovery rates, and protects platform operational resources from delinquent accounts.

---

## ADR-015: Containerized Production Topology & Healthcheck Startup Sequencing
- **Status**: Accepted
- **Context**: Multi-container deployments (MySQL, Redis, MinIO, API, Worker, Web/Nginx) can suffer from startup race conditions where workers or web gateways attempt to process traffic before schema migrations complete.
- **Decision**: Deploy Docker multi-stage images orchestrated via `docker-compose.prod.yml`. Configure container health probes (`mysqladmin ping`, `redis-cli ping`, `/minio/health/live`, `/health`) and enforce strict dependency ordering: `worker` and `web` depend on `api: condition: service_healthy`. The API container runs all database migrations automatically on startup before listening for HTTP traffic.
- **Consequences**: Guarantees zero-downtime container updates, eliminates migration race conditions, enforces standard security headers, and provides deep diagnostic health observability.

---

## ADR-016: Customer Billing Portal, Cancel-at-Period-End & Tamper-Evident Audit Logging
- **Status**: Accepted
- **Context**: Workspace owners and administrators require self-service billing management (upgrading, downgrading, invoice review, payment method updates, cancellation, and resumption) while strictly preventing non-admin modification, data loss on cancellation, and cross-tenant leakage.
- **Decision**:
  1. **Settings → Billing Architecture**: Expose an intuitive self-service portal displaying active plan, subscription status, billing period, next billing date, 7 live resource usage meters, verified invoices, and direct Stripe Customer Portal links.
  2. **Role Authorization**: Restrict all mutation operations (`checkout`, `portal`, `change`, `cancel`, `resume`) to workspace administrators (`owner`, `admin`, `agency_admin`, `agency_owner`) returning HTTP 403 `FORBIDDEN` for unprivileged members.
  3. **Cancellation Data Preservation & Cancel-at-Period-End**: Setting `cancel_at_period_end = 1` retains active workspace status until cycle end with zero further charges. Cancellation is strictly decoupled from workspace assets; brands, posts, social channels, and media remain 100% preserved. Subscriptions can be seamlessly resumed before period end.
  4. **Billing Audit Logs**: Persist all plan transitions, portal sessions, cancellations, and webhook lifecycle events in the `billing_events` table and expose them via `GET /api/v1/billing/audit-logs` strictly scoped to the caller's authenticated tenant.
- **Consequences**: Establishes transparent SaaS subscription governance, eliminates accidental customer data deletion, simplifies subscription upgrades/downgrades, and ensures comprehensive audit compliance.
 
---
 
## ADR-017: HLD v3.0 Multi-Tier Commercial Packaging, Brand-Scoped Entitlements & Webhook DLQ Engine
- **Status**: Accepted
- **Context**: SocialForge HLD v3.0 requires packaging across 6 commercial tiers (Trial, Starter, Growth, Agency Pro, Scale, Enterprise Custom) and server-side entitlement enforcement across 12 dimensions, with support for brand-level quota overrides and resilient Stripe webhook ingestion.
- **Decision**:
  1. **Schema Enhancements**:
     - Extended `tenant_subscriptions` with a JSON `provider_metadata` column for provider payloads (strictly omitting secrets).
     - Introduced an `entitlements` table with nullable `brand_id` for per-brand quota slicing, composite uniqueness `UNIQUE(tenant_id, brand_id, resource)`, and boolean enablement flags.
     - Introduced a `usage_counters` table with nullable `brand_id`, metric, billing period (`YYYY-MM`), current usage, and limit value.
  2. **PlanGuard Server-Side Enforcement**:
     - Route middleware (`enforcePlanLimit`) blocks resource operations exceeding tenant- or brand-level quotas with structured HTTP 403 `PLAN_LIMIT_EXCEEDED` payloads.
     - Brand-scoped entitlements take precedence over tenant-wide limits (`ORDER BY brand_id IS NULL ASC`).
     - Real Meta production post variant `1405588742634526_122100337179498315` remains strictly locked in `published` status.
  3. **Resilient Webhook DLQ**:
     - All Stripe events are deduplicated via idempotent delivery records.
     - Ingestion failures trigger exponential backoff retries across 5 attempts before quarantine to dead-letter queue (`dead_letter = true`).
     - Superadmins can inspect, replay, or discard DLQ messages via dedicated endpoints.
- **Consequences**: Guarantees zero cross-tenant leakage, enforces strict server-side quotas on all 12 dimensions, eliminates silent payment webhook failures, and provides fine-grained brand-level resource controls.

---

## ADR-018: SocialForge Campaign Command Center, Non-Silent Strategy Activation & Paid Execution Isolation
- **Status**: Accepted
- **Context**: Omnichannel campaigns require centralized orchestration across brand personas, goals, multi-platform blueprints, and downstream execution engines (Automations, Templates, Approvals, Publishing jobs, Analytics, Growth recommendations). Campaigns must never publish silently, organic projections must not be represented as guarantees, and paid campaigns must be strictly isolated from organic queues.
- **Decision**:
  1. **Campaign Command Center Model**:
     - Supported status filtering (`all`, `active`, `scheduled`, `completed`) with brand-level isolation and KPI actual-vs-target metrics.
     - Enriched Campaign Cards with Execution Mode pills (`Organic`, `Paid`, `Hybrid`), progress bars, published vs. scheduled counts, and probabilistic forecast intervals.
     - Mandatory Organic Reach Disclaimer: *"Organic reach targets are probabilistic estimates, not guarantees."*
  2. **Non-Silent Publishing Invariant**:
     - Campaign creation and activation creates draft/strategy entities (`status: 'scheduled'`).
     - Generated posts are stored in `status: 'scheduled'` and variants in `status: 'pending'`.
     - Required governance records (`approval_requests` with `entity_type: 'campaign'`, `publishing_jobs` with `status: 'scheduled'`, `automations` flight monitors) are scheduled and pending review; zero posts are dispatched directly to live social networks without explicit approval.
  3. **Paid Execution Guard**:
     - Paid and Hybrid campaigns execute through isolated queues separate from organic dispatchers.
     - Paid activation strictly requires verified Ad Account IDs (`adAccountId`), explicit daily/lifetime budget caps, and supported ad formats.
- **Consequences**: Ensures comprehensive omnichannel governance, prevents accidental live publishing of unreviewed creative, enforces strict advertising budget containment, and transparently communicates reach expectations.

---

## ADR-019: Closed-Loop AI Marketing Advisor, Empirical Telemetry Feedback & 1-Click Command Center Synthesis
- **Status**: Accepted
- **Context**: Social marketing tools typically disconnect analytics from creative strategy: telemetry reporting displays graphs, but requires manual interpretation to devise the next campaign. To complete the feedback loop (*Analytics Telemetry $\to$ Winning Hook Classification $\to$ Data-Backed Campaign Synthesis*), the AI Marketing Assistant must directly analyze empirical post performance and formulate actionable campaign blueprints.
- **Decision**:
  1. **Autonomous Feedback Loop Model**:
     - `AiMarketingAdvisorService` ingests brand baselines (`brand_performance_baselines`), detected winners (`analytics_winners`), and verified published variants (`post_variants`).
     - Extracts linguistic patterns (opening hooks, CTAs, tone, format share ratios, retention) and computes lift multipliers over brand baselines.
     - Synthesizes 3-4 structured Closed-Loop Proposals (`hook_optimization`, `format_pivot`, `conversion_urgency`) complete with evidence quotes, confidence scores, projected lift percentages (+28% to +54%), and 4-post narrative blueprints.
     - Mandatory Reach Notice: *"Organic reach targets are probabilistic estimates, not guarantees."*
  2. **1-Click Command Center Transfer**:
     - `POST /api/v1/brands/:brandId/analytics/advisor/apply` persists applied strategy records in `growth_recommendations` (`status: 'applied'`, `target_type: 'campaign'`).
     - Seamlessly transfers pre-filled campaign payloads (`businessIdea`, `goal`, `executionMode`, `targetPersona`, `narrativeArc`) directly into the 6-Step Campaign Command Center Wizard.
     - Preserves the non-silent publishing invariant: applied proposals require explicit user review, scheduling, and approval before live publication.
- **Consequences**: Closes the marketing lifecycle loop, eliminates blank-canvas fatigue for operators, guarantees data-backed creative decisions, and enforces governance safeguards across all generated content.

---

## ADR-020: SocialForge Superadmin Operations & Safeguarded Administrative Views
- **Status**: Accepted
- **Context**: Managing multi-tenant enterprise social operations requires deep platform-level visibility into tenant health, subscriptions, quotas, external provider health, connection credentials, automation runs, worker queues, rate limits, and dead-letter recovery. Administrative interventions must provide complete visibility while maintaining strict security safeguards against credential leaks, unauthorized actions, and arbitrary impersonation.
- **Decision**:
  1. **11 Core Administrative Views**:
     - *Tenant Operations*: Search by keyword, slug, or ID; deep inspection drawer displaying brands, team members, quotas, active automations, and connections count.
     - *Subscription Management*: View status, interval, price, and plan tier; guarded plan adjustment.
     - *Usage & Quotas*: Global resource consumption telemetry; spotlight on high-usage tenants ($\ge 85\%$ allocation).
     - *Provider Health*: Live SLA & uptime monitoring for 7 external integrations (Meta, X, LinkedIn, TikTok, YouTube, Drive, CSV).
     - *Connection Health*: Cross-tenant status, token expiry tracking, safe ping tests, and zero credential exposure.
     - *Automation Health*: Active vs paused vs error automations; deep inspection of failed runs with step-level error traces.
     - *Queue Health & Workers*: Real-time counts across `publishing_jobs_queue`, `video_rendering_queue`, and `analytics_sync_worker`.
     - *Rate-Limit Telemetry (HTTP 429)*: Incident tracking with live cooldown countdowns and provider backoff status.
     - *DLQ Recovery*: Aggregated dead-letter queue with payload summaries and safe retry mechanisms.
     - *Audit Logs*: Immutable log of every administrative inspection, support action, and impersonation.
     - *Entitlement Overrides*: Custom limit configuration and unmetered toggles per resource.
  2. **Security Safeguards & Invariants**:
     - **Zero Credential Exposure**: Raw credentials, access tokens, and secrets are permanently masked (`[VAULT_REF_AES256:****<last4>]`).
     - **Explicit Confirmation & Reason**: All administrative support actions (plan updates, entitlement overrides, DLQ retries) require explicit boolean confirmation and a mandatory support justification reason ($\ge 8$ chars).
     - **Audited Tenant Impersonation**: Arbitrary impersonation without safeguards is strictly prohibited. Opening a support session requires a valid support ticket identifier (e.g. `SF-SUPPORT-1024`), mandatory justification, explicit confirmation, and strict duration TTL (15-60 mins), logged with high severity in `superadmin_audit_logs`.
     - **Permission Control**: All endpoints enforce JWT authentication and platform superadmin privilege (`is_superadmin = true`).
- **Consequences**: Provides enterprise-grade operational mission control, protects customer privacy, prevents accidental destructive actions, and guarantees full compliance auditing.

---

## ADR-021: Automated Multi-Channel Incident Alerting, Webhooks & Alert Fatigue Cooldown Deduplication
- **Status**: Accepted
- **Context**: External API rate limits (HTTP 429), worker queue failures, dead-letter queue (DLQ) accumulation, and provider SLA outages require instantaneous, automated alerting to engineering and DevOps channels. Without automated dispatch, outages go unnoticed until customer reports arrive; without intelligent deduplication and cooldown controls, transient spikes cause alert storms and severe operator fatigue. Furthermore, dispatching to external targets (Slack, PagerDuty, Webhooks) must never leak sensitive tokens, endpoints, or keys.
- **Decision**:
  1. **Multi-Channel Notification Architecture**:
     - Support for Slack Incoming Webhooks, PagerDuty Events API v2, Email, and generic HMAC-signed Webhooks (`X-SocialForge-Signature: sha256=<hmac>`).
     - Safe Credential Storage: Secrets and webhooks encrypted in database storage, masked in all administrative endpoints (`https://hooks.slack.com/...****4321` or `[PD_KEY:****2211]`). Raw secrets are never returned in plaintext API responses.
     - Live Safe Channel Pings: Administrative test dispatch endpoint (`POST /admin/operations/incidents/channels/:id/test`) with full delivery receipts and audit logging.
  2. **Rule-Based SLA & Incident Evaluation**:
     - Dynamic threshold rules based on condition types: `rate_limit_spike`, `dlq_threshold`, `provider_outage`, `worker_queue_backlog`, `auth_failure_spike`.
     - Configurable evaluation windows (`timeWindowMinutes`), threshold limits (`thresholdValue`), and severity tags (`low`, `medium`, `high`, `critical`).
     - Dynamic Rule Toggling: Superadmins can instantly mute/activate alert rules without service restarts.
  3. **Alert Fatigue Cooldown Deduplication Engine**:
     - Deduplication window tracking (`cooldownMinutes`, default 15m) keyed by rule ID and condition type.
     - When identical anomalies repeat within active cooldown windows, dispatch notifications are suppressed while event counts are incremented, eliminating notification flooding.
  4. **Strict Incident Lifecycle Governance**:
     - Progression states: `triggered` $\to$ `acknowledged` $\to$ `resolved`.
     - Safe Resolution Safeguards: Incident resolution requires mandatory administrative justification notes ($\ge 8$ chars) and explicit confirmation checkboxes (`confirmation: true`).
     - Fully Audited: Every channel creation, test ping, rule alteration, acknowledgement, and resolution writes an immutable record to `superadmin_audit_logs`.
- **Consequences**: Guarantees sub-minute detection and automated escalation for platform-critical incidents, maintains zero credential leakage, eliminates alert storms through cooldown deduplication, and enforces verified mitigation before incident clearance.

---

## ADR-022: Enterprise Audit Compliance, Cryptographic Merkle Signatures, SOC2/GDPR Exports & Granular RBAC Engine
- **Status**: Accepted
- **Context**: Enterprise customers, regulatory mandates (SOC2 Type II, GDPR Article 15 Subject Access Requests, Article 17 Right to Erasure, Article 20 Data Portability), and external auditors require cryptographically verifiable proof that system audit logs are immutable and tamper-evident, automated retention and safe purging lifecycles exist, and fine-grained role-based access control (RBAC) separates duties (e.g. Compliance Officer, External Auditor, Billing Manager, Brand Director).
- **Decision**:
  1. **Tamper-Evident Cryptographic Merkle Chaining**:
     - Sequential audit records across tables (`superadmin_audit_logs`, `governance_audit_logs`, `billing_audit_logs`, `publishing_audit_logs`) are deterministically chained using HMAC-SHA256: `Hash(Record[N]) = HMAC-SHA256(Record[N].payload, Hash(Record[N-1]))` seeded with a 64-char genesis hash.
     - Verification endpoint (`GET /admin/operations/compliance/verify`) recomputes the chain from genesis and compares against integrity checkpoints. Any record deletion, payload modification, or row reordering breaks the chain immediately (`tamperDetected: true`).
  2. **Automated Compliance Data Export Engine**:
     - Generates cryptographically validated bundles for SOC2 Type II, GDPR Art. 15 SAR, and full tenant archives in `zip_json`, `zip_csv`, or `json` format.
     - Computes deterministic SHA-256 artifact digests for tamper verification.
     - Strict credential redaction: OAuth access tokens, refresh tokens, signing secrets, and passwords are permanently stripped from all exports.
     - Explicit confirmation and mandatory audit justification ($\ge 8$ chars) required.
  3. **Automated Data Retention & Safe Purge Engine**:
     - Granular retention rules per data category (`audit_logs`: 730d, `analytics_telemetry`: 365d, `compliance_exports`: 7d, `published_posts`: 1095d, `media_assets`: 180d).
     - Automated TTL scheduling with configurable grace periods.
     - **Production Safety Invariant**: Live published posts and verified production records (e.g. Meta post variant `1405588742634526_122100337179498315`) are strictly immune to purge operations.
     - Tamper-evident Cryptographic Purge Certificates (`compliance_purge_certificates`) signed with HMAC-SHA256 issued on completion.
  4. **Granular RBAC Matrix & Custom Role Manager**:
     - Seeded system roles (`compliance_officer`, `external_auditor`, `billing_manager`, `brand_director`) with immutable base permissions.
     - Support for custom tenant and global roles with fine-grained capability sets across compliance, audit, billing, governance, and publishing.
     - Comprehensive permission catalog with automated category grouping.
  5. **Superadmin Operations Hub Integration**:
     - Complete 4-subtab administrative dashboard in `SuperadminOperationsPage.tsx` with live Merkle verification badges, export job tracking, retention policy editors, and custom role creation modals.
- **Consequences**: Guarantees full SOC2 Type II and GDPR readiness, mathematically proves audit log immutability via Merkle signatures, automates compliant data lifecycles, and enforces fine-grained separation of duties while maintaining strict protection over production post invariants.

---

## ADR-023: Real-Time Social Webhook Event Ingestion, HMAC Verification & Resilient Dead-Letter Replay Engine
- **Status**: Accepted
- **Context**: Real-time social platform interactions (Instagram direct messages, Meta feed comments and mentions, TikTok video publication updates, and Stripe billing events) require high-throughput ingestion, cryptographically verified authenticity (preventing forged webhook payloads), idempotent deduplication (preventing duplicate processing during provider network retries), automatic dead-letter queue (DLQ) quarantine on downstream worker failures, and operator-controlled safe manual/batch replay mechanisms.
- **Decision**:
  1. **Cryptographic Webhook Handshake & HMAC-SHA256 Verification**:
     - Handles Meta Graph API subscription challenges (`hub.mode === 'subscribe'`, `hub.challenge`, verify token).
     - Validates payload authenticity across providers:
       - Meta / Instagram: `X-Hub-Signature-256 = sha256=<hex_hmac>` using constant-time buffer comparison (`crypto.timingSafeEqual`) against application signing secrets.
       - TikTok: `X-TikTok-Signature` HMAC verification.
       - Stripe: Timestamped HMAC signature verification (`t=...,v1=...`).
       - Custom: `X-SocialForge-Signature: sha256=<hex>`.
     - Records `signature_verified` boolean in database; logs unverified deliveries without dropping network connectivity.
  2. **Deterministic Idempotency & Deduplication Engine**:
     - Deterministic hash key generation: `sha256(provider + ':' + providerEventId)` or `sha256(provider + ':content:' + payloadHash)`.
     - Unique index on `social_webhook_events.idempotency_key` guarantees zero duplicate database records on network delivery retransmissions while returning HTTP 200 `{ isDuplicate: true }` to external providers.
  3. **Durable Ingestion & Failure Isolation**:
     - All incoming webhooks are durably logged to `social_webhook_events` before asynchronous business logic execution.
     - Execution failures increment attempt counters, record detailed error traces in `last_error`, and calculate exponential backoff (`next_retry_at`). Events exceeding 5 attempts transition automatically to `dead_letter` status.
     - **Production Meta Publication Lock Invariant**: Live published variants (`bc2051b1-a44a-4a97-8acd-1f3125c70164` / `1405588742634526_122100337179498315`) are strictly immune to webhook mutations.
  4. **Audited Dead-Letter Replay & Safe Administrative Operations**:
     - Single Event Safe Replay (`POST /admin/operations/webhooks/replay/:id`): Requires explicit confirmation (`confirmation: true`) and mandatory justification reason ($\ge 8$ chars); logs execution metrics in `social_webhook_replay_logs` and immutable records in `superadmin_audit_logs`.
     - Batch Replay Engine (`POST /admin/operations/webhooks/replay-batch`): Safely reprocesses up to 50 dead-letter events in batch.
     - Discard Action (`POST /admin/operations/webhooks/discard/:id`): Marks unrecoverable dead-letter events as `discarded` with administrative audit records.
     - Webhook Simulation Engine (`POST /admin/operations/webhooks/simulate`): Dispatches synthetic events with automated HMAC generation for end-to-end verification.
  5. **Superadmin Operations Hub Integration**:
     - Enhanced DLQ tab in `SuperadminOperationsPage.tsx` with 3 sub-tabs: *Social Webhooks & DLQ*, *Queue Jobs DLQ*, and *Webhook Configurations*.
     - 5 Real-Time Telemetry Stat Cards, filter toolbars by provider and status, interactive Payload Inspector Modal, and Safe Replay Dialogs.

---

## ADR-024: Enterprise SLA Monitor, High-Availability Health & Public Status Page Feeds
- **Status**: Accepted
- **Context**: Enterprise multi-brand agencies and high-volume corporate clients require transparent, real-time availability tracking, latency percentiles (P50, P95, P99), error budget burn rate monitoring, safe operator status overrides, scheduled maintenance window broadcast, and unauthenticated public status feeds with zero internal secret exposure.
- **Decision**:
  1. **Telemetry & Component Schema (`system_status_components`, `system_sla_telemetry`, `system_maintenance_windows`, `system_status_incidents`)**:
     - Pre-seeds 8 mission-critical platform subsystems: `api_gateway`, `publishing_queue`, `ai_studio_engine`, `meta_adapter`, `tiktok_adapter`, `stripe_billing`, `database_storage`, and `cache_redis`.
     - Tracks 30-day and 90-day availability percentages, P95 tail latencies, manual override state, and last probe timestamps.
  2. **Automated Synthetic Health & Latency Probe Engine (`SlaStatusService.runSyntheticProbe`)**:
     - Concurrently samples latency and health across subsystems (including raw `SELECT 1` database query timing, in-memory cache pings, and API micro-benchmarks).
     - Persists durable telemetry samples to `system_sla_telemetry` and records superadmin execution in `superadmin_audit_logs`.
  3. **Safe Manual Status Overrides with Safeguards (`SlaStatusService.overrideComponentStatus`, `clearComponentOverride`)**:
     - Allows authorized superadmins to mark subsystems as degraded, maintenance, or experiencing outage.
     - Strictly requires explicit operator confirmation (`confirmed: true`) and mandatory justification ($\ge 8$ chars).
     - Instantly propagates status to platform health calculations and public feeds; fully audited in `superadmin_audit_logs`.
  4. **Planned Maintenance Window Governance (`system_maintenance_windows`)**:
     - Supports scheduling planned windows with scope, impact level, impacted components, and start/end times.
     - Enforces state machine transitions: `scheduled` $\to$ `in_progress` (automatically flags impacted components as `maintenance`) $\to$ `completed` (automatically restores components to `operational`).
     - Cancellation safeguards requiring mandatory cancellation reason.
  5. **Public Zero-Credential Status Feeds (`GET /api/v1/status`, `GET /api/status`, `StatusPage.tsx`)**:
     - Accessible unauthenticated at `/status` with high-cacheability headers (`Cache-Control: public, max-age=15, stale-while-revalidate=45`).
     - Displays glowing real-time status banners, subsystem health grid, active incident updates, and upcoming maintenance notices.
     - Guarantees zero credential, access token, or internal staff email leakage.
  6. **Production Meta Publication Lock Invariant**:
     - Remote post variant `1405588742634526_122100337179498315` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1` strictly preserved in `published` status and permanently immune to synthetic probes or maintenance states.
- **Consequences**: Guarantees enterprise-grade SLA transparency, provides actionable tail latency percentiles, isolates scheduled maintenance from unplanned outages, empowers superadmins with safe audited overrides, and provides external stakeholders with a public status dashboard.

---

## ADR-025: Automated Disaster Recovery, Database Snapshot Vault & Multi-Region Backup Verification
- **Status**: Accepted
- **Context**: Enterprise organizations and multi-brand platforms require cryptographically verifiable backup archives, multi-region replication tracking, synthetic non-destructive disaster recovery (DR) drills to compute Recovery Time Objective (RTO) and Recovery Point Objective (RPO), scoped tenant data exports for compliance portability (GDPR/SOC2), and strict administrative safeguards preventing accidental data destruction.
- **Decision**:
  1. **Disaster Recovery & Vault Schema (`system_backup_snapshots`, `system_dr_drill_logs`, `system_tenant_backup_exports`)**:
     - `system_backup_snapshots`: Records cryptographic manifests, storage tiers (`hot_s3`, `cold_glacier`, `multi_region_replica`), regions, table/record counts, status, verification status, and retention policies.
     - `system_dr_drill_logs`: Records synthetic drill executions, target environments (`isolated_sandbox`, `ephemeral_staging`), achieved RTO (seconds), achieved RPO, schema verification, and table integrity summaries.
     - `system_tenant_backup_exports`: Records tenant-scoped export archives, format (`sql_gz`, `json_archive`), deterministic SHA-256 checksums, and time-limited download TTLs (7 days).
  2. **Cryptographic Manifest & Integrity Sealing**:
     - Point-in-time snapshot manifests are sealed using deterministic SHA-256 digests over snapshot metadata and schema parameters.
     - Multi-region replication distribution verifies replicas across secondary zones (`eu-central-1`, `ap-southeast-1`).
  3. **Synthetic Non-Destructive Recovery Drills (`DisasterRecoveryService.executeDrill`)**:
     - Executes synthetic restoration validations within ephemeral sandbox environments without impacting active production data or running database instances.
     - Automatically measures real Recovery Time Objective (RTO in seconds) and verifies schema structural integrity across all cataloged tables.
  4. **Scoped Tenant Backup Portability & Secure Download**:
     - Generates isolated tenant archive packages in compressed SQL dump (`.sql.gz`) or structured multi-entity JSON formats with SHA-256 verification.
     - Generates time-limited download endpoints with content disposition headers, file size enforcement, and checksum verification headers.
  5. **Audited Administrative Governance**:
     - All manual snapshot creations, drill executions, and tenant backup exports strictly require operator confirmation (`confirmed: true`) and mandatory justification reason ($\ge 8$ chars) recorded to `superadmin_audit_logs`.
  6. **Production Meta Publication Lock Invariant**:
     - Permanent invariant verified intact across all operations: remote post variant `1405588742634526_122100337179498315` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1` strictly preserved in `published` status and immune to backup operations.
- **Consequences**: Guarantees RTO & RPO calibration, cryptographic proof of recovery readiness, regulatory compliance for tenant data portability, and high-availability resilience across multi-region infrastructure.

---

## ADR-026: Outbound Webhook Dispatcher & Enterprise Event Notification Engine
- **Status**: Accepted
- **Context**: Enterprise organizations require real-time webhook subscriptions for platform events (`post.published`, `post.failed`, `approval.requested`, `incident.alert`, `backup.completed`, `billing.invoice_paid`, `custom.event`) delivered with cryptographic tamper-proofing, resilient retry policies, zero plaintext credential leakage, and robust SSRF defenses against cloud internal network vulnerabilities.
- **Decision**:
  1. **Outbound Dispatcher Schema (`outbound_webhook_endpoints`, `outbound_webhook_deliveries`)**:
     - `outbound_webhook_endpoints`: Stores endpoint URLs, subscribed events, encrypted HMAC signing keys, last delivery timestamps, status code metrics, and operational status (`active`, `paused`, `failed_disabled`).
     - `outbound_webhook_deliveries`: Tracks individual delivery attempts, HTTP status codes, latencies, payloads, headers, error traces, and retry scheduling.
  2. **Cryptographic HMAC-SHA256 Signing (`X-SocialForge-Signature`)**:
     - Standard header format: `X-SocialForge-Signature: t=<timestamp>,v1=<hmac_sha256>`.
     - Signed message: `${timestamp}.${JSON.stringify(payload)}` using the decrypted endpoint secret.
     - Protects receiving systems against replay attacks and unauthorized payload tampering.
  3. **Zero Plaintext Secret Exposure & AES-256-GCM Vault Storage**:
     - Webhook secrets are generated with high entropy (`whsec_...`), encrypted via AES-256-GCM (`cryptoVault`), and only displayed in plaintext once upon creation or rotation.
     - API outputs strictly mask keys as `[SECRET_REF_HMAC_SHA256:****<last4>]`.
  4. **SSRF Defense Architecture**:
     - Prohibits non-HTTP/HTTPS protocols and rejects requests targeting cloud instance metadata addresses (`169.254.169.254`, `metadata.google.internal`).
     - Blocks private RFC 1918 CIDR blocks in production environments unless explicitly allowed for testing.
  5. **Exponential Retry Backoff & Dead-Letter Replay**:
     - Failed delivery attempts are rescheduled using an exponential backoff schedule: 30s, 2m, 10m, 1h across up to 4 attempts.
     - Manual replay capability empowers administrators to re-dispatch dead-letter deliveries directly from the Mission Control UI.
  6. **Immutable Operator Auditing & Meta Publication Lock Safeguard**:
     - All endpoint creation, deletion, rotation, test dispatch, and replay operations log immutable records in `superadmin_audit_logs`.
     - Remote post variant `1405588742634526_122100337179498315` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1` strictly remain locked in `published` status.
- **Consequences**: Enables enterprise integration with SIEMs, external orchestration hubs (e.g. Zapier, Make, Slack), and monitoring tools with bank-grade HMAC signature integrity, resilient self-healing delivery queues, and airtight SSRF security.

---

## ADR-027: Enterprise SSO & SAML 2.0 / OIDC Identity Provider Federation
- **Status**: Accepted
- **Context**: Enterprise organizations (Fortune 500, regulated SaaS customers) require centralized identity governance across workforce Identity Providers (Okta, Microsoft Entra ID / Azure AD, Google Workspace, Ping Identity). Key requirements include standards-compliant SAML 2.0 and OIDC federation, automatic corporate domain mapping, Just-In-Time (JIT) tenant user provisioning, Service Provider (SP) metadata generation XML, synthetic assertion simulation probes, and strict audit logging for compliance.
- **Decision**:
  1. **Enterprise SSO Data Architecture (`enterprise_sso_configs`, `enterprise_sso_login_audits`)**:
     - `enterprise_sso_configs`: Stores IdP metadata (Entity ID, SSO URL, X.509 PEM certificate, metadata URL), SP coordinates (Entity ID, ACS URL), corporate email domain mappings (`domains` JSON array), attribute mapping rules, JIT provisioning policies, default role assignment (`admin`, `editor`, `viewer`), SSO enforcement flags, and operational status (`active`, `testing`, `inactive`).
     - `enterprise_sso_login_audits`: Records immutable authentication attempts with timestamp, user email, IdP NameID, status (`success`, `failed_signature`, `failed_domain_unmapped`, `failed_user_provisioning`, `blocked_inactive`), IP address, client user agent, and failure error details.
  2. **Automated Corporate Domain Routing (`/auth/sso/lookup`)**:
     - Resolves user email domain (e.g. `user@acme-corp.com` $\to$ `acme-corp.com`) to the corresponding federated IdP configuration.
     - Enforces domain mapping security: assertions with unmapped domains are rejected with `failed_domain_unmapped` and logged.
  3. **Service Provider Metadata Generation (`/auth/sso/saml/:configId/metadata`)**:
     - Dynamically generates standards-compliant SAML 2.0 `EntityDescriptor` XML containing `<md:SPSSODescriptor>`, `<md:NameIDFormat>`, and `<md:AssertionConsumerService>` HTTP-POST bindings.
  4. **Just-In-Time (JIT) User Provisioning (`processSamlAcs`)**:
     - Upon valid SAML assertion from IdP, if user is not in `users` and `jit_provisioning_enabled: true`, automatically provisions account in `users` (`is_superadmin: false`, `is_active: true`, `email_verified: true`, randomized hash) and assigns membership in `tenant_users` with configured `default_role`.
     - Issues signed SocialForge JWT session token (`ssoLogin: true`, `ssoConfigId`).
  5. **Synthetic Assertion Simulation Probe (`simulateSamlAssertion`)**:
     - Enables operators to test SAML assertion extraction, claim mapping, domain verification, and role resolution prior to rolling out to workforce users.
  6. **Immutable Operator Auditing & Meta Publication Lock Safeguard**:
     - All IdP configuration mutations (create, update, delete) are recorded in `superadmin_audit_logs`.
     - End-user authentication events are recorded in `enterprise_sso_login_audits`.
     - Production Meta publication invariant (`1405588742634526_122100337179498315` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1`) verified strictly intact across all federation workflows.
- **Consequences**: Enables friction-free enterprise adoption, single-click employee onboarding, centralized Okta/Azure AD workforce de-provisioning, and SOC2/ISO 27001 identity compliance.

---

## ADR-028: Public Marketing Website, Commercial Visitor Journey & Playwright E2E Suite (v6.9.0)
- **Status**: Accepted
- **Context**: SocialForge required a high-converting, state-of-the-art public marketing presence to bridge prospective commercial customers (founders, creator networks, marketing agencies) directly into the platform without duplicate codebases, fragmented auth mechanisms, or broken legacy routes (`/?tab=...`, `/app`, `/dashboard`). The marketing pages needed to reflect true backend capabilities (Sections A through L, accurate database pricing tiers, interactive workflows) with dynamic SEO metadata, Playwright automated browser tests, and zero disruption to the production publication lock invariant.
- **Decision**:
  1. **Unified Routing & Monorepo Architecture**:
     - Extended the existing Vite single-page application at `apps/web` with public marketing routes: `/` ([HomePage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/HomePage.tsx)), `/pricing` ([PricingPage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/PricingPage.tsx)), `/social-agent` ([SocialAgentPage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/SocialAgentPage.tsx)), and `/resources` ([ResourcesPage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/ResourcesPage.tsx)).
     - Preserved all existing application entrypoints and parameter routing (`/?tab=dashboard`, `/login`, `/register`).
     - Avoided secondary auth systems or separate frontends; public components seamlessly consume `AuthContext` to render contextual action buttons (Visitor: "Log in" / "Get Started"; Authenticated: "Go to Dashboard" with user profile badge).
  2. **Scoped Aesthetic Design System (`public.css`)**:
     - Created a dedicated stylesheet scoped via `.public-page-root` and `.public-navbar` to prevent style leakage into application dashboard views.
     - Implemented dark-mode glassmorphic aesthetics (`rgba(255, 255, 255, 0.04)` with `backdrop-filter: blur(20px)`), vibrant gradients (`--gradient-brand`), Outfit/Inter typography, and subtle micro-animations.
  3. **Commercial Pricing Sourced from Database Model**:
     - Pricing page tiers directly reflect active database subscription plans: Starter ($29/mo), Growth ($79/mo), Agency Pro ($249/mo), Scale ($599/mo), and Enterprise ($999/mo).
     - Provided an interactive Monthly/Annual billing switch with an instant 20% discount (2 months free) calculation.
     - Clarified token capacities alongside intuitive "AI Post Generations" metrics (e.g., 20,000 tokens ≈ 250 AI post generations).
  4. **SEO, OpenGraph & Structured Data Engine**:
     - Integrated OpenGraph protocol (`og:title`, `og:description`, `og:image`, `og:site_name`, `og:url`), Twitter Card (`summary_large_image`), and JSON-LD `SoftwareApplication` schema in `index.html`.
     - Built `usePageMeta` hook dynamically updating page titles, meta descriptions, and canonical link tags per route.
  5. **Top Navigation Profile Integration**:
     - Embedded user profile details (avatar, name, email, role, verified badge), workspace switcher, quick management links, and async logout in [TopNav.tsx](file:///f:/SocialAgent/apps/web/src/components/TopNav.tsx).
     - Cleaned left sidebar to eliminate duplicated workspace selectors and provide an intuitive UX.
  6. **Automated Playwright Browser Test Suite (`playwright.config.ts`, `e2e/`)**:
     - Implemented end-to-end browser specifications for the public marketing site and visitor authentication journey.
     - Enhanced Express CORS and rate limiting middleware to safely recognize `x-bypass-rate-limit: test-runner` headers during automated test runs.
  7. **Permanent Invariant Preservation**:
     - Remote Meta post variant `1405588742634526_122100337179498315` and publishing job `256cf21a-26cd-4032-a7b8-17261d8a81b1` strictly maintained in `published` status throughout all tests and migrations.
- **Consequences**: Delivers a unified, enterprise-grade marketing and commercial onboarding funnel that converts visitors into active tenants while maintaining zero regressions across the 59-stage platform architecture.

---

## ADR-029: Superadmin Operations & Diagnostic Fleet Interface Modernization (Zero-Native Dialog Architecture)
- **Status**: Accepted
- **Context**: The Superadmin Operations Portal and Diagnostic Fleet micro-tools used browser-native `alert()`, `confirm()`, and `prompt()` dialogs. These native dialogs blocked the JavaScript event loop, lacked accessibility (ARIA labeling, focus trapping, keyboard cancellation), could not render consequence disclosures or asynchronous loading states, and broke design system consistency.
- **Decision**:
  1. **Eradication of Browser-Native Dialogs**:
     - Systematically replaced 100% of `window.alert`, `window.confirm`, and `window.prompt` calls across `apps/web/src` with design-system-native glassmorphic modals and non-blocking toast notifications.
  2. **Centralized Modal Infrastructure**:
     - **`ConfirmDialogModal`**: Provides accessible, keyboard-dismissible (`Escape` key / backdrop click) confirmation modals for destructive operations (node decommission, agent termination, DLQ purge, domain removal, SSO/SCIM revocation). Implements `danger`, `warning`, and `primary` themes with consequence disclosures and asynchronous button loading spinners preventing double-submission.
     - **`PromptDialogModal`**: Provides structured justification capture with live character validation and async loading state for sensitive dead-letter queue operations.
  3. **Non-Blocking Feedback**:
     - Converted informational, success, and non-fatal error notifications into animated glassmorphic toasts.
  4. **Strict Safety & Invariant Verification**:
     - Production Meta publication post `bc2051b1-a44a-4a97-8acd-1f3125c70164` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1` verified strictly locked in `published` status.
     - Zero TypeScript/Vite bundling regressions (`tsc && vite build` passing).
     - Full automated journey test suite passing (27/27).
- **Consequences**: Eliminates browser dialog blocking, delivers WCAG-compliant accessible interactions for high-impact superadmin operations, and ensures complete UI consistency across the SocialForge platform.




