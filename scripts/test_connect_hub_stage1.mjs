/**
 * SocialForge HLD Stage 1: Connect Hub Comprehensive Automated Test Suite
 * Validates:
 * 1. Database schema & migrations
 * 2. Secure credential storage (AES-256-GCM envelope encryption at rest, zero leakage)
 * 3. 7-state connection state machine
 * 4. Provider-neutral connector interface (all 10 methods)
 * 5. Connection lifecycle audit logging in connection_events
 * 6. Tenant and brand ownership enforcement (zero cross-tenant leakage)
 * 7. Reconnect and disconnect operations
 * 8. Connection health API and aggregated tenant summary
 * 9. Resource discovery and selection
 * 10. Preservation of existing Meta publishing and analytics
 */

import { db } from '../apps/api/dist/db/connection.js';
import { credentialVaultService } from '../apps/api/dist/services/connections/credentialVault.service.js';
import { connectionService } from '../apps/api/dist/services/connections/connection.service.js';
import { connectionHealthService } from '../apps/api/dist/services/connections/connectionHealth.service.js';
import { resourceDiscoveryService } from '../apps/api/dist/services/connections/resourceDiscovery.service.js';
import { ConnectorRegistry } from '../apps/api/dist/connectors/index.js';
import { GenericOAuth2Connector } from '../apps/api/dist/connectors/core/GenericOAuth2Connector.js';
import crypto from 'crypto';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`  PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('   SOCIALFORGE STAGE 1: CONNECT HUB AUTOMATED TEST SUITE       ');
  console.log('===============================================================\n');

  // Test setup IDs
  const testTenantA = 'tenant_test_a_' + crypto.randomUUID().slice(0, 8);
  const testTenantB = 'tenant_test_b_' + crypto.randomUUID().slice(0, 8);
  const testBrandA = 'brand_test_a_' + crypto.randomUUID().slice(0, 8);
  const testBrandB = 'brand_test_b_' + crypto.randomUUID().slice(0, 8);

  try {
    // Seed test tenants & brands in DB
    await db('tenants').insert([
      { id: testTenantA, name: 'Connect Hub Test Tenant A', slug: testTenantA, settings: JSON.stringify({}) },
      { id: testTenantB, name: 'Connect Hub Test Tenant B', slug: testTenantB, settings: JSON.stringify({}) },
    ]);
    await db('brands').insert([
      { id: testBrandA, tenant_id: testTenantA, name: 'Brand A', slug: testBrandA },
      { id: testBrandB, tenant_id: testTenantB, name: 'Brand B', slug: testBrandB },
    ]);

    // -------------------------------------------------------------
    // TEST SUITE 1: Schema & Migration Verification
    // -------------------------------------------------------------
    console.log('[1/10] Verifying database schema & Connect Hub migration...');
    const connColumns = await db('social_connections').columnInfo();
    assert(connColumns.credential_reference !== undefined, 'social_connections has credential_reference column');
    assert(connColumns.provider_account_metadata !== undefined, 'social_connections has provider_account_metadata column');
    assert(connColumns.expires_at !== undefined, 'social_connections has expires_at column');
    assert(connColumns.last_health_check_at !== undefined, 'social_connections has last_health_check_at column');
    assert(connColumns.last_error !== undefined, 'social_connections has last_error column');
    assert(connColumns.brand_id.nullable === true, 'social_connections.brand_id is nullable for workspace-level connections');

    const credColumns = await db('connection_credentials').columnInfo();
    assert(credColumns.id !== undefined, 'connection_credentials has id column (credential_reference)');
    assert(credColumns.encrypted_data !== undefined, 'connection_credentials has encrypted_data');
    assert(credColumns.iv !== undefined, 'connection_credentials has iv');
    assert(credColumns.auth_tag !== undefined, 'connection_credentials has auth_tag');
    assert(credColumns.key_version !== undefined, 'connection_credentials has encryption key_version');

    const eventColumns = await db('connection_events').columnInfo();
    assert(eventColumns.brand_id.nullable === true, 'connection_events.brand_id is nullable');

    // -------------------------------------------------------------
    // TEST SUITE 2 & 3: Connection Creation, State Machine & Secure Credential Vault
    // -------------------------------------------------------------
    console.log('\n[2/10] Verifying Credential Vault encryption and zero-leakage security...');
    const testSecretPayload = {
      accessToken: 'ya29.a0ARrdaM8_super_secret_token_1234567890',
      refreshToken: '1//0gM7secret_refresh_token_abcdefghijklmnop',
      clientSecret: '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XYZ',
      tokenType: 'Bearer',
      expiresIn: 3600,
    };

    const conn = await connectionService.createConnection({
      tenantId: testTenantA,
      brandId: testBrandA,
      provider: 'google-drive',
      credentials: testSecretPayload,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      providerAccountMetadata: { email: 'marketing@tenantA.com', name: 'Google Workspace' },
    });
    assert(conn.status === 'CONNECTED', 'Connection created in initial CONNECTED state');
    assert(conn.credential_reference && conn.credential_reference.startsWith('cred_'), 'Vault returned valid credential reference token cred_<uuid>');

    const storedRef = conn.credential_reference;

    // Inspect database row directly to confirm ciphertext at rest
    const rawCredRow = await db('connection_credentials').where({ id: storedRef }).first();
    assert(rawCredRow !== undefined, 'Credential row exists in connection_credentials');
    assert(rawCredRow.tenant_id === testTenantA, 'Credential row matches tenant_id');
    assert(!rawCredRow.encrypted_data.includes('ya29.a0ARrdaM8'), 'Plaintext accessToken NOT present in database payload');
    assert(!rawCredRow.encrypted_data.includes('GOCSPX-super'), 'Plaintext clientSecret NOT present in database payload');
    assert(rawCredRow.iv && rawCredRow.iv.length === 32, 'AES-256-GCM IV is 16 bytes hex (32 chars)');
    assert(rawCredRow.auth_tag && rawCredRow.auth_tag.length === 32, 'AES-256-GCM Auth Tag is 16 bytes hex (32 chars)');

    // Decrypt credentials via server-side vault
    const decryptedCreds = await credentialVaultService.getCredentials(testTenantA, storedRef);
    assert(decryptedCreds.accessToken === testSecretPayload.accessToken, 'Vault successfully decrypts accessToken');
    assert(decryptedCreds.refreshToken === testSecretPayload.refreshToken, 'Vault successfully decrypts refreshToken');

    // Verify masking helper
    const masked = credentialVaultService.maskCredentials(decryptedCreds);
    assert(!masked.accessToken.includes('super_secret_token'), 'Masked accessToken does not leak raw secret substring');
    assert(masked.clientSecret.startsWith('••••') && !masked.clientSecret.includes('super_classified_secret'), 'Masked clientSecret is redacted and does not leak raw secret');

    // Cross-tenant vault isolation check
    let crossTenantVaultBlocked = false;
    try {
      await credentialVaultService.getCredentials(testTenantB, storedRef);
    } catch (err) {
      crossTenantVaultBlocked = true;
    }
    assert(crossTenantVaultBlocked, 'Tenant B is blocked from decrypting Tenant A credentials');

    // -------------------------------------------------------------
    // TEST SUITE 3: Connection State Machine (7 States)
    // -------------------------------------------------------------
    console.log('\n[3/10] Verifying 7-state connection state machine transitions...');

    const expectedStates = [
      'CHECKING',
      'CONNECTED',
      'NEEDS_ATTENTION',
      'REAUTH_REQUIRED',
      'PERMISSION_MISSING',
      'RATE_LIMITED',
      'DISCONNECTED',
      'CONNECTED',
    ];

    for (const targetState of expectedStates) {
      const updated = await connectionService.transitionStatus(testTenantA, conn.id, targetState, `Transition to ${targetState}`);
      assert(updated.status === targetState, `Successfully transitioned state to ${targetState}`);
    }

    // -------------------------------------------------------------
    // TEST SUITE 4: Provider-Neutral Connector Interface (All 10 Methods)
    // -------------------------------------------------------------
    console.log('\n[4/10] Verifying 10-method Provider-Neutral Connector interface...');
    const gdriveConnector = ConnectorRegistry.get('google-drive');
    assert(gdriveConnector !== undefined, 'Google Drive connector is registered in ConnectorRegistry');

    // 1. getAuthorizationUrl()
    const authUrlRes = await gdriveConnector.getAuthorizationUrl({
      tenantId: testTenantA,
      brandId: testBrandA,
      redirectUri: 'https://app.socialforge.com/callback',
      scopes: ['drive.readonly'],
    });
    assert(authUrlRes.url && authUrlRes.url.startsWith('https://accounts.google.com'), 'getAuthorizationUrl returns valid provider URL');

    // 2. handleCallback()
    const callbackRes = await gdriveConnector.handleCallback({
      tenantId: testTenantA,
      brandId: testBrandA,
      code: 'mock_auth_code_123',
      redirectUri: 'https://app.socialforge.com/callback',
    });
    assert(callbackRes.credentials && callbackRes.credentials.accessToken, 'handleCallback exchanges code for credentials');

    // 3. refreshCredential()
    const refreshRes = await gdriveConnector.refreshCredential({
      tenantId: testTenantA,
      connectionId: conn.id,
      currentCredentials: decryptedCreds,
    });
    assert(refreshRes.success === true && refreshRes.credentials !== undefined, 'refreshCredential successfully refreshes tokens');

    // 4. testConnection()
    const testRes = await gdriveConnector.testConnection({
      tenantId: testTenantA,
      connectionId: conn.id,
      credentials: decryptedCreds,
    });
    assert(testRes.success === true && testRes.status === 'CONNECTED', 'testConnection executes and returns verified status');

    // 5. discoverResources()
    const resources = await gdriveConnector.discoverResources({
      tenantId: testTenantA,
      connectionId: conn.id,
      brandId: testBrandA,
      credentials: decryptedCreds,
    });
    assert(Array.isArray(resources) && resources.length > 0, 'discoverResources returns list of remote resources');

    // 6. fetch()
    const fetchRes = await gdriveConnector.fetch({
      tenantId: testTenantA,
      connectionId: conn.id,
      endpoint: '/files',
      credentials: decryptedCreds,
    });
    assert(fetchRes.status === 200, 'fetch resolves server-side credentials and executes provider API call');

    // 7. normalize()
    const rawData = { external_id: 'file_99', title: 'Q4 Marketing Strategy.pdf' };
    const normalized = await gdriveConnector.normalize({ rawPayload: rawData, targetSchema: 'document' });
    assert(normalized.schema === 'document' && normalized.data.external_id === 'file_99', 'normalize produces canonical model');

    // 8. subscribe()
    const subRes = await gdriveConnector.subscribe({
      tenantId: testTenantA,
      connectionId: conn.id,
      webhookUrl: 'https://api.socialforge.com/webhooks/gdrive',
      events: ['file_change'],
      credentials: decryptedCreds,
    });
    assert(subRes.subscribed === true && subRes.subscriptionId !== undefined, 'subscribe registers webhook notification channel');

    // 9. healthCheck()
    const healthRes = await gdriveConnector.healthCheck({
      tenantId: testTenantA,
      connectionId: conn.id,
      credentials: decryptedCreds,
    });
    assert(healthRes.status === 'CONNECTED', 'healthCheck returns active CONNECTED status');

    // 10. disconnect()
    const discRes = await gdriveConnector.disconnect({
      tenantId: testTenantA,
      connectionId: conn.id,
      credentials: decryptedCreds,
    });
    assert(discRes.success === true, 'disconnect successfully invalidates remote session');

    // -------------------------------------------------------------
    // TEST SUITE 5: Connection Lifecycle Audit Logging
    // -------------------------------------------------------------
    console.log('\n[5/10] Verifying Connection Lifecycle Audit Logging in connection_events...');
    const events = await db('connection_events').where({ connection_id: conn.id }).orderBy('created_at', 'desc');
    assert(events.length > 0, `Recorded ${events.length} lifecycle audit events in connection_events`);

    // Verify no raw tokens leaked in audit log payload
    for (const evt of events) {
      const detailsStr = JSON.stringify(evt.details || {});
      assert(!detailsStr.includes('super_secret_token'), `Event ${evt.event_type} does not leak token in details`);
      assert(!detailsStr.includes('super_classified_secret'), `Event ${evt.event_type} does not leak secret in details`);
    }

    // -------------------------------------------------------------
    // TEST SUITE 6: Strict Tenant & Brand Isolation
    // -------------------------------------------------------------
    console.log('\n[6/10] Verifying Tenant & Brand Boundary Enforcement...');
    // Create Connection for Tenant B
    const connB = await connectionService.createConnection({
      tenantId: testTenantB,
      brandId: testBrandB,
      provider: 'shopify',
      status: 'CONNECTED',
      credentialReference: storedRef,
      scopes: ['read_products'],
      providerAccountMetadata: { shop: 'tenant-b.myshopify.com' },
    });

    // Tenant A tries to get Tenant B's connection -> must return null
    const crossTenantGet = await connectionService.getConnectionById(testTenantA, connB.id);
    assert(crossTenantGet === null, 'Tenant A cannot retrieve Tenant B connection (strictly scoped by tenant_id)');

    // Tenant A tries to disconnect Tenant B's connection -> must throw error
    let crossDisconnectBlocked = false;
    try {
      await connectionService.disconnectConnection(testTenantA, connB.id);
    } catch (err) {
      crossDisconnectBlocked = true;
    }
    assert(crossDisconnectBlocked, 'Tenant A is blocked from disconnecting Tenant B connection');

    // -------------------------------------------------------------
    // TEST SUITE 7: Reconnect & Disconnect Operations
    // -------------------------------------------------------------
    console.log('\n[7/10] Verifying Reconnect and Disconnect Operations...');
    const discResult = await connectionService.disconnectConnection(testTenantA, conn.id);
    assert(discResult.disconnected === true && discResult.status === 'DISCONNECTED', 'disconnectConnection transitions to DISCONNECTED');

    const verifyDisconnected = await connectionService.getConnectionById(testTenantA, conn.id);
    assert(verifyDisconnected.status === 'DISCONNECTED', 'Database confirms connection is DISCONNECTED');

    // Reconnect connection
    const reconnectResult = await connectionService.reconnectConnection(testTenantA, conn.id);
    assert(reconnectResult.reconnected === true || reconnectResult.authorizationUrl !== undefined, 'reconnectConnection re-authorizes connection');

    // -------------------------------------------------------------
    // TEST SUITE 8: Connection Health Engine & Tenant-Wide Summary
    // -------------------------------------------------------------
    console.log('\n[8/10] Verifying Connection Health Engine & Tenant-wide Summary...');
    const healthResult = await connectionHealthService.checkConnectionHealth(testTenantA, conn.id);
    assert(healthResult.status !== undefined && typeof healthResult.latencyMs === 'number', 'checkConnectionHealth performs active check');

    const updatedConn = await connectionService.getConnectionById(testTenantA, conn.id);
    assert(updatedConn.last_health_check_at !== null, 'social_connections.last_health_check_at updated with timestamp');

    const tenantHealth = await connectionHealthService.getHealthSummary(testTenantA);
    assert(tenantHealth.totalConnections >= 1, 'Tenant health summary includes all connections for tenant');
    assert(tenantHealth.overallStatus !== undefined, 'Tenant health summary provides overallStatus status');

    // -------------------------------------------------------------
    // TEST SUITE 9: Resource Discovery & Selection
    // -------------------------------------------------------------
    console.log('\n[9/10] Verifying Resource Discovery and Selection Sync...');
    const discovered = await resourceDiscoveryService.discoverAndPersistResources(testTenantA, conn.id);
    assert(discovered.length >= 2, 'Resource discovery finds and saves external resources');

    const dbResources = await resourceDiscoveryService.listDiscoveredResources(testTenantA, conn.id);
    assert(dbResources.length >= 2, 'connector_resources contains discovered resources');

    // Toggle resource selection
    const firstResourceId = dbResources[0].id;
    const selected = await resourceDiscoveryService.toggleResourceSelection(testTenantA, firstResourceId, true);
    assert(selected.isSelected === true, 'Resource selection successfully updated');

    // -------------------------------------------------------------
    // TEST SUITE 10: Preservation of Existing Data & Safety
    // -------------------------------------------------------------
    console.log('\n[10/10] Verifying preservation of existing Meta publishing & analytics...');
    const metaConnCount = await db('meta_connections').count('id as count').first();
    assert(Number(metaConnCount.count) > 0, 'Existing meta_connections records are preserved');

    const lockedVariant = await db('post_variants').where({ remote_post_id: '1405588742634526_122100337179498315' }).first();
    assert(lockedVariant !== undefined, 'Locked production post variant 1405588742634526_122100337179498315 remains intact');
    assert(lockedVariant.status === 'published', 'Locked post variant status remains published');

    console.log('\n===============================================================');
    console.log(`   TEST RUN COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED       `);
    console.log('===============================================================\n');
  } finally {
    // Clean up test data
    console.log('Cleaning up test tenant data...');
    await db('connection_events').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('connector_resources').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('social_connections').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('connection_credentials').whereIn('tenant_id', [testTenantA, testTenantB]).del();
    await db('brands').whereIn('id', [testBrandA, testBrandB]).del();
    await db('tenants').whereIn('id', [testTenantA, testTenantB]).del();
    await db.destroy();
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
