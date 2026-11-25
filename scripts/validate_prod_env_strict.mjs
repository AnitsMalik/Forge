import fs from 'node:fs';
import path from 'node:path';

export function validateProdEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }

  const errors = [];
  const warnings = [];

  // Check 1: NODE_ENV
  if (env.NODE_ENV !== 'production') {
    errors.push(`NODE_ENV must be 'production' (got '${env.NODE_ENV}')`);
  }

  // Check 2: WEB_APP_URL HTTPS
  if (!env.WEB_APP_URL || !env.WEB_APP_URL.startsWith('https://')) {
    errors.push(`WEB_APP_URL must enforce HTTPS protocol (e.g. https://app.domain.com)`);
  }

  // Check 3: DB_PASSWORD
  if (!env.DB_PASSWORD || env.DB_PASSWORD === 'root' || env.DB_PASSWORD.includes('PASSWORD_HERE')) {
    errors.push('DB_PASSWORD must be a secure production password');
  }

  // Check 4: JWT_SECRET
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.includes('GENERATE_')) {
    errors.push('JWT_SECRET must be at least 32 characters long and not a placeholder');
  }

  // Check 5: ENCRYPTION_MASTER_KEY
  if (!env.ENCRYPTION_MASTER_KEY || !/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_MASTER_KEY)) {
    errors.push('ENCRYPTION_MASTER_KEY must be exactly 64 hex characters (32 bytes AES-256-GCM)');
  }

  // Check 6: S3 Configuration
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    errors.push('S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY must be configured');
  }

  // Check 7: Stripe
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY) {
    warnings.push('Stripe keys are placeholders; monetization will require real live Stripe API keys');
  }

  // Check 8: Meta
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    warnings.push('Meta App ID and Secret should be populated with production App credentials');
  }

  // Check 9: SMTP
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    warnings.push('SMTP server should be configured for live email OTP delivery');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    auditedCount: Object.keys(env).length,
  };
}

// If run directly
if (process.argv[1]?.endsWith('validate_prod_env_strict.mjs')) {
  const target = process.argv[2] || '.env.production.secure';
  const result = validateProdEnvFile(target);
  console.log(`Audited ${result.auditedCount} environment variables in ${target}:`);
  if (result.valid) {
    console.log('✓ Strict production validation PASSED!');
  } else {
    console.error('❌ Validation failed with errors:');
    result.errors.forEach(e => console.error(`  - ${e}`));
  }
  if (result.warnings.length > 0) {
    console.log('⚠️ Production Deployment Notes:');
    result.warnings.forEach(w => console.log(`  * ${w}`));
  }
  process.exit(result.valid ? 0 : 1);
}
