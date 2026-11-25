# 🐳 SocialForge — Commercial SaaS Docker Production Deployment & Operations Guide (v6.9.0)

This guide provides operational procedures for deploying, managing, and scaling SocialForge using the containerized multi-tenant commercial SaaS production stack (v6.9.0).

---

## 1. Container Topology Architecture

The production stack consists of **6 isolated services** networked over a private bridge (`socialforge-prod-net`):

| Container Name | Base Image | Role | Port | Health Check | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `socialforge-prod-mysql` | `mysql:8.4` | Primary Relational DB | `3308:3306` | `mysqladmin ping` | None |
| `socialforge-prod-redis` | `redis:7.2-alpine` | Queue Broker & Lock Manager | `6379:6379` | `redis-cli ping` | None |
| `socialforge-prod-minio` | `minio/minio:latest` | S3 Media Asset Storage | `9000`, `9001` | `/minio/health/live` | None |
| `socialforge-prod-api` | Node 20 Alpine (Multi-Stage) | Express REST API Gateway + Migrations | `4000:4000` | `GET /health` | `mysql`, `redis` (healthy) |
| `socialforge-prod-worker` | Node 20 Alpine + FFmpeg | BullMQ Queue & Video Engine | Internal | `pgrep` process monitor | `mysql`, `redis`, `api` (healthy) |
| `socialforge-prod-web` | Nginx Alpine (Multi-Stage) | React 18 SPA + Marketing Site + Reverse Proxy | `80:80` | `GET /health` via wget | `api` (healthy) |

### Startup Sequencing
1. **Infrastructure Tier (`mysql`, `redis`, `minio`)**: Spin up with health probes.
2. **API Tier (`api`)**: Waits for MySQL and Redis to report `service_healthy`. On startup, automatically executes all 85 database migrations (`node apps/api/dist/db/migrate.js`) covering Stages 1 through 50, HLD v3.0 Billing & Entitlements, Omnichannel Communications (Email, WhatsApp, SMS/Voice), and Unified Onboarding before starting the Express server.
3. **Application & Worker Tier (`worker`, `web`)**: Wait for the API container to report `service_healthy` (`/health` returns HTTP 200 with all migrations applied). This guarantees zero database schema race conditions.

---

## 2. Prerequisites & Environment Configuration

### Install Docker & Docker Compose
Ensure Docker Engine (v24+) and Docker Compose (v2.20+) are installed:
```bash
docker --version
docker compose version
```

### Commercial SaaS Environment File (`.env`)
Create or review your `.env` configuration file in the repository root:
```ini
# Core Environment
NODE_ENV=production
PORT=4000
WEB_APP_URL=https://app.socialforge.ai

# MySQL Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_strong_mysql_password
DB_NAME=socialforge_db

# Redis
REDIS_URL=redis://redis:6379

# MinIO / AWS S3 Media Storage
S3_ENDPOINT=http://minio:9000
S3_BUCKET=socialforge-media
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=your_strong_minio_secret

# Security & Cryptography
JWT_SECRET=your_32_byte_cryptographically_secure_jwt_secret!
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key

# SaaS Commercial Stripe Billing Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Monthly Price IDs
STRIPE_PRICE_ID_STARTER=price_starter_monthly
STRIPE_PRICE_ID_GROWTH=price_growth_monthly
STRIPE_PRICE_ID_AGENCY=price_agency_monthly
STRIPE_PRICE_ID_SCALE=price_scale_monthly
STRIPE_PRICE_ID_ENTERPRISE=price_enterprise_custom
# Annual Price IDs
STRIPE_PRICE_ID_STARTER_ANNUAL=price_starter_annual
STRIPE_PRICE_ID_GROWTH_ANNUAL=price_growth_annual
STRIPE_PRICE_ID_AGENCY_ANNUAL=price_agency_annual
STRIPE_PRICE_ID_SCALE_ANNUAL=price_scale_annual

# Omnichannel Communications
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_API_TOKEN=...

# Meta Social Publishing & Analytics Integration
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_GRAPH_API_VERSION=v20.0
META_DEV_ACCESS_TOKEN=your_meta_developer_token
META_TEST_MODE=false
```

---

## 3. Stripe Webhook & Inbound Configuration

1. In the **Stripe Dashboard**, navigate to **Developers > Webhooks > Add destination**.
2. Configure the webhook endpoint URL:
   ```
   https://app.socialforge.ai/api/v1/billing/webhook
   ```
3. Subscribe to the required billing lifecycle events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (`whsec_...`) and assign it to `STRIPE_WEBHOOK_SECRET` in your `.env`.

> [!NOTE]
> All incoming Stripe webhooks are idempotently processed using the `billing_webhook_events` audit table to prevent duplicate billing credit applications or duplicate dunning emails.

---

## 4. Launching the Production Stack

### Step 1: Build and Launch Containers
Execute the production Compose configuration in detached mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 2: Verify Container Health
Check container statuses and verify that dependencies show `healthy`:
```bash
docker compose -f docker-compose.prod.yml ps
```
Expected output:
```
NAME                      IMAGE                      STATUS                   PORTS
socialforge-prod-mysql    mysql:8.4                  Up (healthy)             0.0.0.0:3308->3306/tcp
socialforge-prod-redis    redis:7.2-alpine           Up (healthy)             0.0.0.0:6379->6379/tcp
socialforge-prod-minio    minio/minio:latest         Up (healthy)             0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
socialforge-prod-api      socialforge-api            Up (healthy)             0.0.0.0:4000->4000/tcp
socialforge-prod-worker   socialforge-worker         Up (healthy)
socialforge-prod-web      socialforge-web            Up (healthy)             0.0.0.0:80->80/tcp
```

### Step 3: Run Verification Suite
Run the automated Docker verification test to validate all configuration and live health probes:
```bash
node scripts/verify_docker_setup.mjs
```

---

## 5. Health Monitoring & Diagnostic Probes

The API exposes dual health endpoints with deep diagnostic checks:
- `GET /health` (Internal probe for Nginx and Docker healthchecks)
- `GET /api/v1/health` (External API diagnostic endpoint)

### Health Payload Structure
```json
{
  "status": "healthy",
  "timestamp": "2026-10-11T02:05:10.554Z",
  "uptimeSeconds": 1684,
  "environment": "production",
  "services": {
    "api": "up",
    "database": "connected",
    "migrationsApplied": 75,
    "metaPublicationLock": "intact"
  }
}
```

- **HTTP 200 OK**: All services functional, database connected, all 75 migrations applied, and production publication lock intact.
- **HTTP 503 Service Unavailable**: Database disconnected, pending migrations, or publication lock compromised.

---

## 6. Operational Maintenance & Scaling

### Scaling Background Workers
To scale video rendering and queue processing horizontally:
```bash
docker compose -f docker-compose.prod.yml up -d --scale worker=3
```

### Viewing Logs
```bash
# Stream API server logs
docker compose -f docker-compose.prod.yml logs -f api

# Stream BullMQ & FFmpeg worker logs
docker compose -f docker-compose.prod.yml logs -f worker

# Stream Web / Nginx proxy logs
docker compose -f docker-compose.prod.yml logs -f web
```

### Zero-Downtime Rolling Update
```bash
# 1. Pull latest code
git pull origin main

# 2. Build and restart API (runs migrations)
docker compose -f docker-compose.prod.yml up -d --build --no-deps api

# 3. Wait for API healthy, then restart worker and web
docker compose -f docker-compose.prod.yml up -d --build --no-deps worker web
```

### Persistent Data Volumes
- `mysqldata`: InnoDB data files and transaction logs
- `redisdata`: Append-Only File (AOF) durable persistence
- `miniodata`: Encrypted media uploads
- `uploadsdata`: Rendered H.264 MP4 videos and poster thumbnails
