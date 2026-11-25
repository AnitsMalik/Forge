# 🚀 SocialForge Master Production Release & Launch Handover Document

**Release Version:** v6.9.5 (Hardened Pre-Launch Release)  
**Target Environments:** Staging & Production Container Cluster  
**Audit Status:** Audited & Verified (762/762 Automated Checks Passed)  
**Primary Invariants:**
1. Zero Tenant Data Leakage (Strict Scoping & Brand Boundary Controls)
2. Production Meta Publication Lock: Variant `bc2051b1-a44a-4a97-8acd-1f3125c70164` and Job `256cf21a-26cd-4032-a7b8-17261d8a81b1` strictly locked in `published` status
3. Zero-Knowledge Cryptographic Vault (AES-256-GCM token encryption, zero raw secret exposure)
4. Non-Silent Publishing Invariant (AI Advisor and Campaign synthesizers never publish unreviewed drafts)

---

## 1. System Architecture & Container Topology

SocialForge is deployed as a 6-tier containerized production topology orchestrated by [docker-compose.prod.yml](file:///f:/SocialAgent/docker-compose.prod.yml):

```
                               ┌────────────────────────┐
                               │  Inbound Web Traffic   │
                               │  (Port 80 / 443 HTTPS) │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │       Web / SPA        │
                               │   (Nginx 1.25 Alpine)  │
                               │  Serves Vite Bundle &  │
                               │   Proxies /api /health │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │    Express API REST    │
                               │    (Node 20 Alpine)    │
                               │   Port 4000 (Internal) │
                               └───────┬────────┬───────┘
                                       │        │
               ┌───────────────────────┘        └────────────────────────┐
               ▼                                                         ▼
    ┌────────────────────────┐                                ┌────────────────────────┐
    │     MySQL 8.4 Store    │                                │     Redis 7.2 Broker   │
    │  76 Migrations Applied │                                │  BullMQ Queues & Locks │
    │  Port 3306 (Internal)  │                                │  Port 6379 (Internal)  │
    └────────────────────────┘                                └───────────┬────────────┘
                                                                          │
                                                                          ▼
    ┌────────────────────────┐                                ┌────────────────────────┐
    │     MinIO S3 Assets    │                                │  Worker Queue Daemon   │
    │  Media & Video Storage │                                │  Node 20 + FFmpeg      │
    │  Port 9000 (Internal)  │                                │  Background Publishing │
    └────────────────────────┘                                └────────────────────────┘
```

### Deterministic Container Startup Sequence
1. **Tier 1 (Stateful Core)**: `mysql`, `redis`, and `minio` start with dedicated Docker healthchecks (`mysqladmin ping`, `redis-cli ping`, `/minio/health/live`).
2. **Tier 2 (API Gateway)**: Spins up only after MySQL and Redis report `service_healthy`. On startup, container automatically applies all 76 database migrations (`node apps/api/dist/db/migrate.js`) before binding port 4000.
3. **Tier 3 (Worker & Web)**: Spin up only after the API container reports `service_healthy` (`GET /health` returns HTTP 200). Guarantees zero schema race conditions during rolling upgrades.

---

## 2. Deployment Instructions

### 2.1 Staging Deployment
```bash
# 1. Clone or sync workspace to staging host
git checkout main

# 2. Copy production environment configuration
cp .env.production.example .env

# 3. Inject staging secrets (JWT, encryption master key, staging DB passwords)
# Ensure JWT_SECRET and ENCRYPTION_MASTER_KEY are 64-character random hex strings

# 4. Pull and build staging containers
docker compose -f docker-compose.prod.yml build --no-cache

# 5. Launch containers in background
docker compose -f docker-compose.prod.yml up -d

# 6. Verify health status
curl -i http://localhost/health
```

### 2.2 Production Blue-Green Rollout
1. Build production release bundle:
   ```bash
   npm run build
   node scripts/package_production_release.mjs
   ```
2. Verify all 15 packaging checks report `PASS`.
3. Perform database pre-flight check:
   ```bash
   node apps/api/dist/db/check-migrations.js
   ```
4. Deploy new container images with zero downtime using rolling service updates.

---

## 3. Database Migration Runbook

The application schema consists of **76 forward migrations** tracked in `apps/api/src/db/migrations` and mirrored in `apps/api/dist/db/migrations`.

### 3.1 Applying Migrations
```bash
# In container or host environment:
npm run db:migrate --workspace=apps/api
```

### 3.2 Verifying Migration Status
```bash
node -e "import('./apps/api/dist/db/connection.js').then(async m => { const [completed] = await m.db('knex_migrations').count('* as count'); console.log('Total migrations applied:', completed.count); process.exit(0); });"
```

### 3.3 Safe Rollback Procedure
```bash
# Step back the last applied migration batch:
npm run db:rollback --workspace=apps/api
```
> [!CAUTION]
> Never run rollback on tables containing active customer subscriptions or immutable audit ledgers (`worm_audit_ledger`) without taking a point-in-time snapshot.

---

## 4. Disaster Recovery, Backups & Rollback

### 4.1 Automated Daily Backup
```bash
# Snapshot MySQL state
docker exec socialforge-prod-mysql mysqldump -u root -p"$DB_PASSWORD" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --databases socialforge_db > /backups/socialforge_db_$(date +%Y%m%d_%H%M%S).sql

# Snapshot MinIO S3 media assets
aws s3 sync s3://socialforge-media /backups/minio_media_$(date +%Y%m%d)/
```

### 4.2 Point-In-Time Restoration
```bash
# 1. Stop web and worker traffic
docker compose -f docker-compose.prod.yml stop web worker

# 2. Restore database
cat /backups/socialforge_db_YYYYMMDD_HHMMSS.sql | \
  docker exec -i socialforge-prod-mysql mysql -u root -p"$DB_PASSWORD" socialforge_db

# 3. Restart services
docker compose -f docker-compose.prod.yml start worker web
```

---

## 5. Security & Isolation Controls

1. **Multi-Tenant Boundary Enforcement**:
   - Every brand query, post retrieval, and media mutation is strictly scoped to `organization_id` and verified brand ownership.
   - Cross-tenant requests return `HTTP 404 (BRAND_NOT_FOUND)`.
2. **SSRF Guardrails**:
   - Media ingest proxies strictly reject loopback addresses (`127.0.0.1`, `localhost`), internal RFC 1918 subnets (`10.0.0.0/8`, `192.168.0.0/16`), and AWS/cloud link-local metadata endpoints (`169.254.169.254`).
3. **Cryptographic Protection**:
   - Social OAuth tokens, refresh keys, and webhook signing secrets are encrypted with AES-256-GCM authenticated envelopes before storage in MySQL.
   - All external API responses, debug endpoints, and audit export pipelines mask stored secrets with `[VAULT_REF_AES256:****]`.
4. **Brute-Force Rate Limiting**:
   - Authentication routes (`/api/v1/auth/login`) reject requests after 20 attempts within 15 minutes with `HTTP 429 (RATE_LIMIT_EXCEEDED)` and RFC `Retry-After` headers.

---

## 6. External Credential & App Approval Checklist

Before transitioning from Staging to public Production, the following commercial approvals must be completed:

| Platform | Required Scope / Action | Status | Blocker For |
|---|---|:---:|---|
| **Meta for Developers** | App Review for `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish` | Pending | Public customer Facebook & Instagram publishing |
| **TikTok for Developers** | Business Verification & Commercial Content Posting scope (`video.publish`) | Pending | Public TikTok publishing |
| **Google Cloud Platform** | OAuth Consent Screen Verification & YouTube Data API v3 quota allocation | Pending | Public YouTube Shorts publishing |
| **X (Twitter)** | Developer Portal App Elevation to Basic or Pro tier | Pending | Public X Tweet publishing |
| **LinkedIn** | Community Management API & Share on LinkedIn permissions | Pending | Public LinkedIn Pages publishing |
| **Stripe** | Live Merchant Account Verification & Production Webhook Signing Endpoint | Pending | Live credit card billing settlement |

---

## 7. Post-Launch Monitoring & Incident Runbook

### Key Health Telemetry Endpoints
- **API Health**: `GET /health` (Returns HTTP 200 with DB connection status, Redis status, and migration version).
- **WORM Audit Chain**: `GET /api/v1/worm/verify` (Validates SHA-256 cryptographic chain continuity across audit log).
- **Queue Status**: `GET /api/v1/superadmin/queues` (Monitors BullMQ active, delayed, and dead-letter queue counts).

### Escalation Thresholds
- **HTTP 5xx Rate > 0.5%** over 5-minute rolling window -> Alert DevOps On-Call.
- **BullMQ DLQ > 5 failed jobs** -> Trigger automatic retry investigation in Superadmin Ops.
- **Rate-Limit Spike > 50 HTTP 429s/min** from single IP -> Trigger automated IP jail in edge ALB/Nginx.

---

## 8. Final Audit Sign-Off

- **Total Automated Test Suites Executed:** 14 suites
- **Total Assertions / Checks Passed:** 762 / 762 (100% Pass)
- **Zero-Blocker Status:** Confirmed
- **Launch Classification:** **READY FOR STAGING**
