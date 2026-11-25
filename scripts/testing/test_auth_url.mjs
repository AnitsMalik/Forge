import dotenv from 'dotenv';
dotenv.config();
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';

async function testConnectUrl() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  try {
    const url = metaOAuthService.getAuthorizationUrl(brandId);
    console.log('Authorization URL generated:');
    // Sanitize any secret from output
    const u = new URL(url);
    console.log('  Base:', u.origin + u.pathname);
    console.log('  client_id:', u.searchParams.get('client_id'));
    console.log('  redirect_uri:', u.searchParams.get('redirect_uri'));
    console.log('  scope:', u.searchParams.get('scope'));
    console.log('  state exists:', !!u.searchParams.get('state'));
  } catch (err) {
    console.error('Error generating auth url:', err);
  }
}
testConnectUrl();
