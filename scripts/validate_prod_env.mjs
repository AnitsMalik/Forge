import fs from 'fs';
import path from 'path';

const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'WEB_APP_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_URL',
  'JWT_SECRET',
  'ENCRYPTION_MASTER_KEY',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
];

const INSECURE_DEFAULTS = {
  DB_PASSWORD: ['root', 'password', '123456', 'admin'],
  JWT_SECRET: ['production_secure_jwt_secret_32_characters_long_!', 'secret', 'changeme'],
  ENCRYPTION_MASTER_KEY: [
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    '0000000000000000000000000000000000000000000000000000000000000000',
  ],
  S3_SECRET_KEY: ['minio_secure_password', 'password'],
};

export function validateEnvironment(envFilePath) {
  console.log('================================================================');
  console.log(`🔐 Validating Production Environment File: ${envFilePath}`);
  console.log('================================================================\n');

  if (!fs.existsSync(envFilePath)) {
    console.error(`❌ ERROR: Environment file not found: ${envFilePath}`);
    return { valid: false, errors: [`File not found: ${envFilePath}`] };
  }

  const content = fs.readFileSync(envFilePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  }

  const errors = [];
  const warnings = [];

  // Check required keys
  for (const key of REQUIRED_VARS) {
    if (!env[key]) {
      errors.push(`Missing mandatory variable: ${key}`);
    }
  }

  // Check for insecure default fallbacks
  for (const [key, badVals] of Object.entries(INSECURE_DEFAULTS)) {
    const val = env[key];
    if (val && badVals.includes(val)) {
      errors.push(`CRITICAL SECURITY DEFECT: Variable '${key}' uses insecure default fallback string!`);
    }
  }

  // Check JWT secret length
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production.');
  }

  // Check encryption master key format (64-char hex)
  if (env.ENCRYPTION_MASTER_KEY) {
    const isHex64 = /^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_MASTER_KEY);
    if (!isHex64) {
      errors.push('ENCRYPTION_MASTER_KEY must be a valid 64-character hexadecimal string (32 bytes).');
    }
  }

  // Check NODE_ENV
  if (env.NODE_ENV && env.NODE_ENV !== 'production') {
    warnings.push(`NODE_ENV is set to '${env.NODE_ENV}'. Expected 'production'.`);
  }

  // Check Stripe Keys
  if (!env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY is empty. Commercial checkout and webhook billing will operate in disabled mode.');
  }

  console.log(`Validation Results:`);
  console.log(`  Variables Audited: ${Object.keys(env).length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}\n`);

  if (errors.length > 0) {
    console.error('❌ VALIDATION FAILED:');
    errors.forEach((e) => console.error(`  - ${e}`));
  } else {
    console.log('✅ ALL PRODUCTION ENVIRONMENT CHECKS PASSED!');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️ Warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate_prod_env.mjs')) {
  const targetFile = process.argv[2] || '.env';
  const result = validateEnvironment(path.resolve(targetFile));
  if (!result.valid) {
    process.exit(1);
  }
}

