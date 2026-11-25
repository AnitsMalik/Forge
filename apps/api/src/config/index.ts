import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export const config = {
  port: process.env.PORT ? (isNaN(Number(process.env.PORT)) ? process.env.PORT : Number(process.env.PORT)) : 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  encryptionMasterKey:
    process.env.ENCRYPTION_MASTER_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  database: {
    client: 'mysql2',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || (process.env.NODE_ENV === 'production' ? 3306 : 3308),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'socialforge_db',
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    bucket: process.env.S3_BUCKET || 'socialforge-media',
    accessKey: process.env.S3_ACCESS_KEY || 'minio_admin',
    secretKey: process.env.S3_SECRET_KEY || 'minio_secure_password',
    region: process.env.S3_REGION || 'us-east-1',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN || process.env.META_WA_API_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    wabaId: process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    graphApiVersion: process.env.WHATSAPP_API_VERSION || process.env.META_GRAPH_API_VERSION || 'v20.0',
    graphApiBaseUrl: process.env.WHATSAPP_BASE_URL || process.env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com',
  },
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    graphApiBaseUrl: process.env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com',
    graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v20.0',
    oauthRedirectUri:
      process.env.META_OAUTH_REDIRECT_URI ||
      'http://localhost:4000/api/v1/integrations/meta/callback',
    devAccessToken: process.env.META_DEV_ACCESS_TOKEN || '',
    testMode:
      process.env.META_TEST_MODE === 'false'
        ? false
        : process.env.META_TEST_MODE === 'true' || !process.env.META_APP_ID || process.env.NODE_ENV === 'test',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter_monthly',
      starterAnnual: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || 'price_starter_annual',
      growth: process.env.STRIPE_PRICE_ID_GROWTH || 'price_growth_monthly',
      growthAnnual: process.env.STRIPE_PRICE_ID_GROWTH_ANNUAL || 'price_growth_annual',
      agency: process.env.STRIPE_PRICE_ID_AGENCY || 'price_agency_monthly',
      agencyAnnual: process.env.STRIPE_PRICE_ID_AGENCY_ANNUAL || 'price_agency_annual',
      agency_scale: process.env.STRIPE_PRICE_ID_AGENCY_SCALE || 'price_agency_scale_monthly',
      scale: process.env.STRIPE_PRICE_ID_SCALE || 'price_scale_monthly',
      scaleAnnual: process.env.STRIPE_PRICE_ID_SCALE_ANNUAL || 'price_scale_annual',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_custom',
    },
  },
};

