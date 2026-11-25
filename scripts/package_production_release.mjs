import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('   SOCIALFORGE: DOCKER PRODUCTION RELEASE PACKAGING & VERIFICATION      ');
console.log('   Release Version: v6.9.0                                              ');
console.log('========================================================================\n');

let passCount = 0;
let totalChecks = 0;

function check(title, condition, extraInfo = '') {
  totalChecks++;
  if (condition) {
    console.log(`[PASS ${totalChecks.toString().padStart(2, '0')}] ✓ ${title} ${extraInfo}`);
    passCount++;
  } else {
    console.error(`[FAIL ${totalChecks.toString().padStart(2, '0')}] ❌ ${title} ${extraInfo}`);
  }
}

async function run() {
  // 1. Dockerfile.api Check
  const dockerApi = fs.readFileSync('Dockerfile.api', 'utf8');
  check(
    'Dockerfile.api multi-stage production build & runner',
    dockerApi.includes('FROM node:20-alpine AS builder') &&
    dockerApi.includes('FROM node:20-alpine AS runner') &&
    dockerApi.includes('HEALTHCHECK') &&
    dockerApi.includes('node apps/api/dist/db/migrate.js')
  );

  // 2. Dockerfile.web Check
  const dockerWeb = fs.readFileSync('Dockerfile.web', 'utf8');
  check(
    'Dockerfile.web Vite + Nginx multi-stage bundle',
    dockerWeb.includes('FROM node:20-alpine AS builder') &&
    dockerWeb.includes('FROM nginx:alpine AS runner') &&
    dockerWeb.includes('COPY --from=builder /app/apps/web/dist /usr/share/nginx/html') &&
    dockerWeb.includes('COPY nginx.conf /etc/nginx/conf.d/default.conf')
  );

  // 3. Dockerfile.worker Check
  const dockerWorker = fs.readFileSync('Dockerfile.worker', 'utf8');
  check(
    'Dockerfile.worker FFmpeg & BullMQ queue runner',
    dockerWorker.includes('ffmpeg') &&
    dockerWorker.includes('fontconfig') &&
    dockerWorker.includes('procps') &&
    dockerWorker.includes('pgrep -f "node apps/worker/dist/index.js"')
  );

  // 4. nginx.conf Reverse Proxy Check
  const nginxConf = fs.readFileSync('nginx.conf', 'utf8');
  check(
    'nginx.conf SPA fallback, security headers & API proxy pass',
    nginxConf.includes('try_files $uri $uri/ /index.html;') &&
    nginxConf.includes('proxy_pass http://api:4000;') &&
    nginxConf.includes('proxy_pass http://api:4000/health;') &&
    nginxConf.includes('client_max_body_size 100M;')
  );

  // 5. docker-compose.prod.yml Service Orchestration Check
  const composeProd = fs.readFileSync('docker-compose.prod.yml', 'utf8');
  const services = ['mysql:', 'redis:', 'minio:', 'api:', 'worker:', 'web:'];
  check(
    'docker-compose.prod.yml defines all 6 isolated production services',
    services.every(s => composeProd.includes(s))
  );

  // 6. Startup Dependency Sequencing Check
  check(
    'docker-compose.prod.yml enforces zero-race startup sequencing',
    composeProd.includes('api:\n        condition: service_healthy') &&
    composeProd.includes('mysql:\n        condition: service_healthy') &&
    composeProd.includes('redis:\n        condition: service_healthy')
  );

  // 7. Migration File Counts Across Monorepo
  const srcMigrations = fs.readdirSync('apps/api/src/db/migrations').filter(f => f.endsWith('.ts'));
  const distMigrations = fs.readdirSync('apps/api/dist/db/migrations').filter(f => f.endsWith('.js'));
  const pkgMigrations = fs.readdirSync('packages/database/migrations').filter(f => f.endsWith('.ts'));

  check(
    'apps/api/src/db/migrations contains all 76 production migrations',
    srcMigrations.length >= 76,
    `(${srcMigrations.length} files)`
  );

  check(
    'apps/api/dist/db/migrations contains compiled JS migrations for runner',
    distMigrations.length >= 75,
    `(${distMigrations.length} files)`
  );

  check(
    'packages/database/migrations synchronized for container runtime',
    pkgMigrations.length >= 75,
    `(${pkgMigrations.length} files)`
  );

  // 8. Compiled Build Artifacts Check
  check(
    'apps/web/dist compiled production SPA exists',
    fs.existsSync('apps/web/dist/index.html') && fs.existsSync('apps/web/dist/assets')
  );

  check(
    'apps/api/dist compiled production Express API exists',
    fs.existsSync('apps/api/dist/index.js') && fs.existsSync('apps/api/dist/db/migrate.js')
  );

  check(
    'packages/shared/dist compiled types and contracts exist',
    fs.existsSync('packages/shared/dist/index.js') || fs.existsSync('packages/shared/dist/index.d.ts')
  );

  // 9. Production Environment Template
  check(
    '.env.production.example complete with Stripe, S3, and Meta keys',
    fs.existsSync('.env.production.example') &&
    fs.readFileSync('.env.production.example', 'utf8').includes('STRIPE_SECRET_KEY') &&
    fs.readFileSync('.env.production.example', 'utf8').includes('META_APP_ID')
  );

  // 10. Operations & Deployment Guide
  check(
    'DOCKER_DEPLOYMENT_GUIDE.md up-to-date with v6.9.0 procedures',
    fs.readFileSync('DOCKER_DEPLOYMENT_GUIDE.md', 'utf8').includes('v6.9.0') &&
    fs.readFileSync('DOCKER_DEPLOYMENT_GUIDE.md', 'utf8').includes('75')
  );

  // 11. Live Production Meta Lock Invariant
  try {
    const res = await fetch('http://localhost:4000/api/v1/health');
    const health = await res.json();
    check(
      'Live API reports healthy status and intact Meta publication lock',
      health.status === 'healthy' && health.services?.metaPublicationLock === 'intact',
      `(${health.services?.metaPublicationLock})`
    );
  } catch (err) {
    check('Live API health check', false, `(Fetch error: ${err.message})`);
  }

  console.log('\n========================================================================');
  console.log(`   PACKAGING RESULT: ${passCount} / ${totalChecks} CHECKS PASSED (${Math.round((passCount / totalChecks) * 100)}%)`);
  console.log('========================================================================\n');

  if (passCount !== totalChecks) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Packaging verification error:', err);
  process.exit(1);
});
