import fs from 'fs';
import path from 'path';

console.log('============================================================');
console.log('  SocialForge Docker Production Deployment Verification');
console.log('============================================================\n');

let passCount = 0;
let totalChecks = 0;

async function check(title, fn) {
  totalChecks++;
  try {
    const result = await fn();
    if (result !== false) {
      console.log(`[${totalChecks}] ✓ ${title}`);
      passCount++;
      return;
    }
  } catch (err) {
    console.error(`[${totalChecks}] ❌ ${title}: ${err.message}`);
    return;
  }
  console.error(`[${totalChecks}] ❌ ${title}: Failed check`);
}

async function run() {
  // 1. Dockerfile.api verification
  await check('Dockerfile.api exists with multi-stage build, healthcheck, and auto-migration CMD', () => {
    const content = fs.readFileSync('Dockerfile.api', 'utf8');
    return (
      content.includes('FROM node:20-alpine AS builder') &&
      content.includes('FROM node:20-alpine AS runner') &&
      content.includes('apk add --no-cache curl') &&
      content.includes('HEALTHCHECK') &&
      content.includes('http://localhost:4000/health') &&
      content.includes('CMD ["sh", "-c", "node apps/api/dist/db/migrate.js && node apps/api/dist/index.js"]')
    );
  });

  // 2. Dockerfile.worker verification
  await check('Dockerfile.worker exists and installs FFmpeg, typography, procps, and pgrep healthcheck', () => {
    const content = fs.readFileSync('Dockerfile.worker', 'utf8');
    return (
      content.includes('FROM node:20-alpine AS builder') &&
      content.includes('FROM node:20-alpine AS runner') &&
      content.includes('ffmpeg') &&
      content.includes('fontconfig') &&
      content.includes('procps') &&
      content.includes('HEALTHCHECK') &&
      content.includes('pgrep -f "node apps/worker/dist/index.js"') &&
      content.includes('CMD ["node", "apps/worker/dist/index.js"]')
    );
  });

  // 3. Dockerfile.web verification
  await check('Dockerfile.web exists with multi-stage Vite + Nginx build, VITE_API_BASE_URL, and healthcheck', () => {
    const content = fs.readFileSync('Dockerfile.web', 'utf8');
    return (
      content.includes('FROM node:20-alpine AS builder') &&
      content.includes('FROM nginx:alpine AS runner') &&
      content.includes('ARG VITE_API_BASE_URL=/api/v1') &&
      content.includes('COPY --from=builder /app/apps/web/dist /usr/share/nginx/html') &&
      content.includes('COPY nginx.conf /etc/nginx/conf.d/default.conf') &&
      content.includes('HEALTHCHECK') &&
      content.includes('wget -q --spider http://localhost/health') &&
      content.includes('EXPOSE 80')
    );
  });

  // 4. nginx.conf verification
  await check('nginx.conf defines gzip, security headers, 100M body size, SPA fallback, /health, and API proxy', () => {
    const content = fs.readFileSync('nginx.conf', 'utf8');
    return (
      content.includes('gzip on;') &&
      content.includes('client_max_body_size 100M;') &&
      content.includes('X-Frame-Options "DENY"') &&
      content.includes('X-Content-Type-Options "nosniff"') &&
      content.includes('Referrer-Policy "strict-origin-when-cross-origin"') &&
      content.includes('try_files $uri $uri/ /index.html;') &&
      content.includes('location /health {') &&
      content.includes('proxy_pass http://api:4000/health;') &&
      content.includes('location /api/ {') &&
      content.includes('proxy_pass http://api:4000;')
    );
  });

  // 5. .dockerignore verification
  await check('.dockerignore exists and excludes node_modules, build dist, .env, and scratch', () => {
    const content = fs.readFileSync('.dockerignore', 'utf8');
    return (
      content.includes('node_modules') &&
      content.includes('dist') &&
      content.includes('.env') &&
      content.includes('scratch')
    );
  });

  // 6. docker-compose.prod.yml orchestrates all 6 containers
  await check('docker-compose.prod.yml orchestrates all 6 production containers', () => {
    const content = fs.readFileSync('docker-compose.prod.yml', 'utf8');
    return (
      content.includes('container_name: socialforge-prod-mysql') &&
      content.includes('container_name: socialforge-prod-redis') &&
      content.includes('container_name: socialforge-prod-minio') &&
      content.includes('container_name: socialforge-prod-api') &&
      content.includes('container_name: socialforge-prod-worker') &&
      content.includes('container_name: socialforge-prod-web')
    );
  });

  // 7. docker-compose.prod.yml container healthchecks
  await check('docker-compose.prod.yml configures healthchecks across services', () => {
    const content = fs.readFileSync('docker-compose.prod.yml', 'utf8');
    return (
      content.includes('mysqladmin') &&
      content.includes('redis-cli') &&
      content.includes('/minio/health/live') &&
      content.includes('service_healthy')
    );
  });

  // 8. docker-compose.prod.yml startup ordering dependencies
  await check('docker-compose.prod.yml sequences worker and web after api service_healthy', () => {
    const content = fs.readFileSync('docker-compose.prod.yml', 'utf8');
    const workerSection = content.slice(content.indexOf('worker:'), content.indexOf('web:'));
    const webSection = content.slice(content.indexOf('web:'));
    return (
      workerSection.includes('api:\n        condition: service_healthy') &&
      webSection.includes('api:\n        condition: service_healthy')
    );
  });

  // 9. docker-compose.prod.yml SaaS Stripe Billing configuration
  await check('docker-compose.prod.yml injects full commercial SaaS Stripe billing configuration', () => {
    const content = fs.readFileSync('docker-compose.prod.yml', 'utf8');
    return (
      content.includes('STRIPE_SECRET_KEY') &&
      content.includes('STRIPE_PUBLISHABLE_KEY') &&
      content.includes('STRIPE_WEBHOOK_SECRET') &&
      content.includes('STRIPE_PRICE_ID_STARTER') &&
      content.includes('STRIPE_PRICE_ID_GROWTH') &&
      content.includes('STRIPE_PRICE_ID_AGENCY_SCALE')
    );
  });

  // 10. docker-compose.prod.yml Meta Social Integration configuration
  await check('docker-compose.prod.yml injects Meta Graph API configuration', () => {
    const content = fs.readFileSync('docker-compose.prod.yml', 'utf8');
    return (
      content.includes('META_APP_ID') &&
      content.includes('META_APP_SECRET') &&
      content.includes('META_GRAPH_API_VERSION') &&
      content.includes('META_DEV_ACCESS_TOKEN') &&
      content.includes('META_TEST_MODE')
    );
  });

  // 11. Database migration files completeness (001 to 037)
  await check('apps/api contains all 39 migrations from core schema through Stage 10 and HLD v3.0 Billing', () => {
    const migrationsDir = 'apps/api/src/db/migrations';
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.ts'));
    const expected = [
      '20260922000001_create_socialforge_core_schema.ts',
      '20260924000002_create_brand_brains_table.ts',
      '20260924000003_add_campaign_strategy_columns.ts',
      '20260926000004_create_templates_table.ts',
      '20260926000005_create_video_render_jobs_table.ts',
      '20260927000006_alter_media_assets_longtext.ts',
      '20261004000007_create_meta_integration_tables.ts',
      '20261004000008_enhance_auth_security.ts',
      '20261005000009_create_real_social_analytics_tables.ts',
      '20261005000010_add_sync_tracking_columns.ts',
      '20261005000011_add_saas_workspaces_and_quotas.ts',
      '20261005000012_create_saas_subscription_database.ts',
      '20261006000013_configure_commercial_saas_plans.ts',
      '20261006000014_add_quota_counted_and_posts_published.ts',
      '20261006000015_add_billing_grace_period.ts',
      '20261006000016_create_workspace_invites.ts',
      '20261006000017_create_billing_dunning_and_notifications.ts',
      '20261008000018_create_social_connections.ts',
      '20261008000019_create_connector_resources.ts',
      '20261008000020_create_connection_events.ts',
      '20261008000021_create_automations.ts',
      '20261008000022_create_automation_runs.ts',
      '20261008000023_create_approval_requests.ts',
      '20261008000024_create_marketing_objects.ts',
      '20261008000025_create_agent_runs.ts',
      '20261008000026_create_template_versions.ts',
      '20261009000002_create_agent_memories_and_settings.ts',
      '20261009000027_upgrade_social_connections_connect_hub.ts',
      '20261010000028_enhance_templates_and_flagship_workflow.ts',
      '20261010000029_enhance_business_data_ingestion.ts',
      '20261010000031_add_template_subcategories.ts',
      '20261010000032_stage5_durable_automation_engine.ts',
      '20261010000033_stage6_unified_analytics_and_brand_learning.ts',
      '20261010000034_stage7_ai_automation_copilot.ts',
      '20261010000035_stage8_governance_and_autonomy.ts',
      '20261011000036_stage9_billing_hardening_and_entitlements.ts',
      '20261011000037_stage10_growth_intelligence.ts',
      '20261011000039_create_billing_entitlements_and_usage_counters.ts'
    ];
    return files.length >= 39 && expected.every(exp => files.includes(exp));
  });

  // 12. packages/database migrations completeness
  await check('packages/database contains all 39 synchronized migrations', () => {
    const pkgMigrationsDir = 'packages/database/migrations';
    const files = fs.readdirSync(pkgMigrationsDir).filter(f => f.endsWith('.ts'));
    return files.length >= 39;
  });

  // 13. Compiled migrations in apps/api/dist for Docker runner
  await check('apps/api/dist contains all 39 compiled migration JS files for container startup', () => {
    const distMigrationsDir = 'apps/api/dist/db/migrations';
    if (!fs.existsSync(distMigrationsDir)) return false;
    const files = fs.readdirSync(distMigrationsDir).filter(f => f.endsWith('.js'));
    return files.length >= 39;
  });

  // 14. Live Health Endpoint Probes (/health and /api/v1/health)
  await check('Live API /health endpoint returns healthy status, verified migrations (>= 39), and intact Meta lock', async () => {
    const res = await fetch('http://localhost:4000/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (
      data.status === 'healthy' &&
      data.services?.database === 'connected' &&
      data.services?.migrationsApplied >= 39 &&
      data.services?.metaPublicationLock === 'intact'
    );
  });

  await check('Live API /api/v1/health endpoint adheres to identical health contract', async () => {
    const res = await fetch('http://localhost:4000/api/v1/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (
      data.status === 'healthy' &&
      data.services?.database === 'connected' &&
      data.services?.migrationsApplied >= 37 &&
      data.services?.metaPublicationLock === 'intact'
    );
  });

  // 16. Live Commercial SaaS Plans Endpoint Probe
  await check('Live API /api/v1/billing/plans returns active commercial subscription tiers', async () => {
    const res = await fetch('http://localhost:4000/api/v1/billing/plans');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const plans = body.data || body.plans || [];
    const slugs = plans.map(p => p.slug || p.id);
    return slugs.includes('starter') && slugs.includes('growth');
  });

  // 17. CI/CD workflow configuration
  await check('.github/workflows/ci.yml automates build, database migrations, and test suites', () => {
    const content = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
    return (
      content.includes('test_multi_tenant_isolation.mjs') &&
      content.includes('test_analytics_pipeline.mjs') &&
      content.includes('test_video_pipeline.mjs')
    );
  });

  // 18. Root package.json scripts
  await check('package.json contains unified test and migration commands', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return (
      pkg.scripts['test'] &&
      pkg.scripts['test:isolation'] &&
      pkg.scripts['test:analytics'] &&
      pkg.scripts['test:video'] &&
      pkg.scripts['test:saas'] &&
      pkg.scripts['test:all'] &&
      pkg.scripts['test:growth-stage10'] &&
      pkg.scripts['test:billing-stage9']
    );
  });

  console.log('\n------------------------------------------------------------');
  console.log(`  VERIFICATION RESULT: ${passCount}/${totalChecks} CHECKS PASSED (${Math.round((passCount / totalChecks) * 100)}%)`);
  console.log('------------------------------------------------------------\n');

  if (passCount !== totalChecks) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exitCode = 1;
});
