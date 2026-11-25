import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';

const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const tenantId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000001';

const url = metaOAuthService.getAuthorizationUrl(tenantId, brandId, userId);
console.log('AUTHORIZATION_URL:', url);
process.exit(0);
