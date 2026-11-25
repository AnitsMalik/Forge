import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';

async function main() {
  const devToken = process.env.META_DEV_ACCESS_TOKEN;
  console.log('META_DEV_ACCESS_TOKEN present:', Boolean(devToken), 'length:', devToken?.length);
  if (devToken) {
    try {
      const dbg = await metaTokenManager.debugToken(devToken);
      console.log('ENV devToken debug:', {
        isValid: dbg.isValid,
        expiresAt: dbg.expiresAt,
        scopes: dbg.scopes,
        appId: dbg.appId,
        userId: dbg.userId
      });
    } catch (e) {
      console.log('ENV devToken error:', e.message);
    }
  }
}
main();
