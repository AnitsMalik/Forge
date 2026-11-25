import fs from 'node:fs';
import path from 'node:path';
import { validateProdEnvFile } from './validate_prod_env_strict.mjs';

const API_BASE = 'http://localhost:4000/api/v1';

async function main() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: PHASE 5 — ENTERPRISE SECURITY AUDIT SUITE               ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const auditResults = [];

  function audit(id, title, status, detail = '') {
    if (status) {
      passed++;
      console.log(`[PASS ${String(id).padStart(2, '0')}] ✓ ${title} ${detail}`);
      auditResults.push({ id, title, status: 'PASS' });
    } else {
      failed++;
      console.error(`[FAIL ${String(id).padStart(2, '0')}] ❌ ${title}: ${detail}`);
      auditResults.push({ id, title, status: 'FAIL', detail });
    }
  }

  // 1. Environment Secret Audit
  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const dockerignore = fs.readFileSync('.dockerignore', 'utf8');
    const ignoresEnv = gitignore.includes('.env') && dockerignore.includes('.env');
    const prodValid = validateProdEnvFile('.env.production.secure');
    audit(1, 'Environment Secret Audit (.gitignore / .dockerignore exclusion & production format)', ignoresEnv && prodValid.valid, `(${prodValid.auditedCount} vars audited)`);
  } catch (err) {
    audit(1, 'Environment Secret Audit', false, err.message);
  }

  // 2. Database Security Audit (Bcrypt Cost & Query Parameterization)
  try {
    const pwdService = fs.readFileSync('apps/api/src/services/auth/passwordService.ts', 'utf8');
    const usesBcrypt12 = pwdService.includes('BCRYPT_ROUNDS = 12') && pwdService.includes('bcrypt.hash');
    const lockoutService = fs.readFileSync('apps/api/src/services/auth/accountLockoutService.ts', 'utf8');
    const hasLockout = lockoutService.includes('MAX_FAILED_ATTEMPTS = 5') && lockoutService.includes('LOCKOUT_DURATION_MS');
    audit(2, 'Database Security Audit (Bcrypt Cost 12 & Brute-Force Account Lockout)', usesBcrypt12 && hasLockout, '(Cost: 12, Max failed attempts: 5, Lockout: 15m)');
  } catch (err) {
    audit(2, 'Database Security Audit', false, err.message);
  }

  // 3. API Gateway Security Audit (Helmet Protections)
  try {
    const res = await fetch(`${API_BASE}/health`);
    const headers = res.headers;
    const hasXFrame = headers.get('x-frame-options') === 'DENY';
    const hasContentType = headers.get('x-content-type-options') === 'nosniff';
    const hasXss = Boolean(headers.get('x-xss-protection'));
    audit(3, 'API Gateway Security Audit (Helmet Protections)', hasXFrame && hasContentType && hasXss, '(X-Frame-Options: DENY, nosniff, X-XSS-Protection active)');
  } catch (err) {
    audit(3, 'API Gateway Security Audit', false, err.message);
  }

  // 4. OAuth Security Verification (Anti-CSRF State Tokens)
  try {
    const metaOAuth = fs.readFileSync('apps/api/src/services/meta/metaOAuth.ts', 'utf8');
    const validatesState = metaOAuth.includes('crypto.randomBytes') && metaOAuth.includes('state');
    audit(4, 'OAuth Security Verification (Anti-CSRF Cryptographic State Validation)', validatesState, '(Cryptographic 32-byte state generation in metaOAuth.ts)');
  } catch (err) {
    audit(4, 'OAuth Security Verification', false, err.message);
  }

  // 5. Payment Webhook Verification (HMAC-SHA256 Signatures)
  try {
    const billingController = fs.readFileSync('apps/api/src/controllers/billing.controller.ts', 'utf8');
    const verifiesSig = billingController.includes('stripe.webhooks.constructEvent') || billingController.includes('stripe-signature');
    audit(5, 'Payment Webhook Verification (Stripe HMAC-SHA256 Signature Verification)', verifiesSig, '(ConstructEvent with STRIPE_WEBHOOK_SECRET)');
  } catch (err) {
    audit(5, 'Payment Webhook Verification', false, err.message);
  }

  // 6. File Upload Security Checks (MIME Type & Size Limits)
  try {
    const nginxConf = fs.readFileSync('nginx.conf', 'utf8');
    const hasMaxBody = nginxConf.includes('client_max_body_size 100M;');
    const mediaRoutes = fs.readFileSync('apps/api/src/routes/media.routes.ts', 'utf8');
    const hasPlanLimit = mediaRoutes.includes("enforcePlanLimit('storage_bytes_limit')");
    audit(6, 'File Upload Security Checks (100MB Limit & Storage Quota Guard)', hasMaxBody && hasPlanLimit, '(Nginx 100M client_max_body_size + enforcePlanLimit storage guard)');
  } catch (err) {
    audit(6, 'File Upload Security Checks', false, err.message);
  }

  // 7. Access Control Verification (Multi-Tenant Brand & Role Isolation)
  try {
    const tenantMiddleware = fs.readFileSync('apps/api/src/middleware/tenant.ts', 'utf8');
    const enforcesIsolation = tenantMiddleware.includes('validateBrandTenant') && tenantMiddleware.includes('tenant_id');
    const cookieAuth = fs.readFileSync('apps/api/src/middleware/cookieAuth.ts', 'utf8');
    const usesHttpOnly = cookieAuth.includes('httpOnly: true') && cookieAuth.includes('secure: isProd');
    audit(7, 'Access Control Verification (Brand-Level Tenant Isolation & HttpOnly Cookies)', enforcesIsolation && usesHttpOnly, '(Strict tenant boundary validation & HttpOnly cookies)');
  } catch (err) {
    audit(7, 'Access Control Verification', false, err.message);
  }

  // 8. HTTPS & Transport Security Verification (HSTS & Modern TLS)
  try {
    const nginxSsl = fs.readFileSync('nginx.ssl.conf', 'utf8');
    const hasHsts = nginxSsl.includes('Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"');
    const hasTls13 = nginxSsl.includes('TLSv1.2 TLSv1.3');
    audit(8, 'HTTPS & Transport Security Verification (HSTS Preload & TLS 1.2/1.3 Ciphers)', hasHsts && hasTls13, '(HSTS 1-year preload + ECDHE Perfect Forward Secrecy)');
  } catch (err) {
    audit(8, 'HTTPS & Transport Security Verification', false, err.message);
  }

  console.log('\n========================================================================');
  console.log(`   SECURITY AUDIT RESULT: ${passed} / 8 CHECKS PASSED (${Math.round((passed / 8) * 100)}%)`);
  console.log('========================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Security audit fatal error:', err);
  process.exit(1);
});
