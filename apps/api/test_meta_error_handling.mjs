import assert from 'node:assert';
import { MetaClient } from './dist/services/meta/metaClient.js';
import { normalizeMetaError, redactTokens, MetaIntegrationError } from './dist/services/meta/errors.js';
import { MetaPublishingService } from './dist/services/meta/publishing.js';

console.log('=== RUNNING META ERROR HANDLING & PUBLISHING TEST SUITE ===\n');

async function runTests() {
  const metaClient = new MetaClient({ testMode: false });
  const publishingService = new MetaPublishingService();

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Redaction of access tokens and secrets
  // -------------------------------------------------------------
  test('Token Redaction: Never logs or leaks raw tokens or secrets', () => {
    const rawMsg = 'Error with access_token=EAAG1234567890abcdef12345 in URL';
    const redacted = redactTokens(rawMsg);
    if (redacted.includes('EAAG1234567890abcdef12345')) {
      throw new Error(`Token leaked in: ${redacted}`);
    }
    if (!redacted.includes('access_token=[REDACTED_TOKEN]') && !redacted.includes('[REDACTED_META_TOKEN]')) {
      throw new Error(`Expected redaction placeholder, got: ${redacted}`);
    }

    const simMsg = 'Malformed access token EAAG_simulated_fresh_page_access_token_1405588742634526_1791129307505';
    const redactedSim = redactTokens(simMsg);
    if (redactedSim.includes('EAAG_simulated')) {
      throw new Error(`Simulated token leaked in: ${redactedSim}`);
    }
    if (!redactedSim.includes('[REDACTED_META_TOKEN]')) {
      throw new Error(`Expected [REDACTED_META_TOKEN], got: ${redactedSim}`);
    }
  });

  // -------------------------------------------------------------
  // TEST 2: Meta OAuthException error handling
  // -------------------------------------------------------------
  await asyncTest('Meta OAuthException: Captures status, code, type, safeMessage, fbtraceId', async () => {
    MetaClient.clearMocks();
    MetaClient.registerMock('oauth_test_endpoint', () => {
      const err = new Error('OAuth error');
      (err).status = 400;
      (err).error = {
        message: 'Malformed access token EAAG_simulated_fresh_page_access_token_1405588742634526_1791129307505',
        type: 'OAuthException',
        code: 190,
        fbtrace_id: 'ABL2uxkc8YF7fTBB6ghBece',
      };
      throw err;
    });

    try {
      await metaClient.get('oauth_test_endpoint', {}, 'mock_test_token');
      throw new Error('Expected get() to throw');
    } catch (err) {
      if (!(err instanceof MetaIntegrationError)) {
        throw new Error('Expected MetaIntegrationError instance');
      }
      if (err.httpStatus !== 401 && err.httpStatus !== 400) {
        throw new Error(`Expected httpStatus 401/400, got ${err.httpStatus}`);
      }
      if (err.rawMetaCode !== 190) {
        throw new Error(`Expected rawMetaCode 190, got ${err.rawMetaCode}`);
      }
      if (err.metaType !== 'OAuthException') {
        throw new Error(`Expected metaType OAuthException, got ${err.metaType}`);
      }
      if (err.fbtraceId !== 'ABL2uxkc8YF7fTBB6ghBece') {
        throw new Error(`Expected fbtraceId ABL2uxkc8YF7fTBB6ghBece, got ${err.fbtraceId}`);
      }
      if (err.safeMessage.includes('EAAG_simulated')) {
        throw new Error('Token leaked in safeMessage');
      }
      if (err.safeMessage.includes('unexpected Meta Graph API error')) {
        throw new Error('Message replaced with generic unexpected error');
      }
    } finally {
      MetaClient.clearMocks();
    }
  });

  // -------------------------------------------------------------
  // TEST 3: Invalid / Expired Token
  // -------------------------------------------------------------
  await asyncTest('Invalid Token: Captures token expiry and subcode 463', async () => {
    MetaClient.clearMocks();
    MetaClient.registerMock('expired_token_endpoint', () => {
      const err = new Error('Session expired');
      (err).status = 401;
      (err).error = {
        message: 'Error validating access token: Session has expired on Friday, 02-Oct-26 15:00:00 PDT.',
        type: 'OAuthException',
        code: 190,
        error_subcode: 463,
        fbtrace_id: 'EXP_TRACE_9999',
      };
      throw err;
    });

    try {
      await metaClient.get('expired_token_endpoint', {}, 'mock_test_token');
      throw new Error('Expected get() to throw');
    } catch (err) {
      if (err.metaCode !== 'META_TOKEN_EXPIRED') {
        throw new Error(`Expected code META_TOKEN_EXPIRED, got ${err.metaCode}`);
      }
      if (err.rawMetaCode !== 190) {
        throw new Error(`Expected rawMetaCode 190, got ${err.rawMetaCode}`);
      }
      if (err.metaSubcode !== 463) {
        throw new Error(`Expected metaSubcode 463, got ${err.metaSubcode}`);
      }
      if (err.fbtraceId !== 'EXP_TRACE_9999') {
        throw new Error(`Expected fbtraceId EXP_TRACE_9999, got ${err.fbtraceId}`);
      }
      if (err.safeMessage.includes('unexpected Meta Graph API error')) {
        throw new Error('Message replaced with generic unexpected error');
      }
    } finally {
      MetaClient.clearMocks();
    }
  });

  // -------------------------------------------------------------
  // TEST 4: Missing Permission
  // -------------------------------------------------------------
  await asyncTest('Missing Permission: Captures code 200/10 and permission message', async () => {
    MetaClient.clearMocks();
    MetaClient.registerMock('missing_perm_endpoint', () => {
      const err = new Error('Permission denied');
      (err).status = 403;
      (err).error = {
        message: '(#200) Requires pages_manage_posts permission to manage the object',
        type: 'OAuthException',
        code: 200,
        fbtrace_id: 'PERM_TRACE_4444',
      };
      throw err;
    });

    try {
      await metaClient.get('missing_perm_endpoint', {}, 'mock_test_token');
      throw new Error('Expected get() to throw');
    } catch (err) {
      if (err.metaCode !== 'META_PERMISSION_DENIED') {
        throw new Error(`Expected code META_PERMISSION_DENIED, got ${err.metaCode}`);
      }
      if (err.httpStatus !== 403) {
        throw new Error(`Expected httpStatus 403, got ${err.httpStatus}`);
      }
      if (err.rawMetaCode !== 200) {
        throw new Error(`Expected rawMetaCode 200, got ${err.rawMetaCode}`);
      }
      if (err.fbtraceId !== 'PERM_TRACE_4444') {
        throw new Error(`Expected fbtraceId PERM_TRACE_4444, got ${err.fbtraceId}`);
      }
      if (!err.safeMessage.includes('pages_manage_posts')) {
        throw new Error(`Expected safeMessage to mention pages_manage_posts, got: ${err.safeMessage}`);
      }
    } finally {
      MetaClient.clearMocks();
    }
  });

  // -------------------------------------------------------------
  // TEST 5: Invalid Page ID
  // -------------------------------------------------------------
  await asyncTest('Invalid Page ID: Captures code 803 and page not found', async () => {
    MetaClient.clearMocks();
    MetaClient.registerMock('invalid_page_endpoint', () => {
      const err = new Error('Page not found');
      (err).status = 404;
      (err).error = {
        message: '(#803) Some of the aliases you requested do not exist: 9999999999999',
        type: 'OAuthException',
        code: 803,
        fbtrace_id: 'PAGE_TRACE_8888',
      };
      throw err;
    });

    try {
      await metaClient.get('invalid_page_endpoint', {}, 'mock_test_token');
      throw new Error('Expected get() to throw');
    } catch (err) {
      if (err.metaCode !== 'META_PAGE_NOT_FOUND') {
        throw new Error(`Expected code META_PAGE_NOT_FOUND, got ${err.metaCode}`);
      }
      if (err.httpStatus !== 404) {
        throw new Error(`Expected httpStatus 404, got ${err.httpStatus}`);
      }
      if (err.rawMetaCode !== 803) {
        throw new Error(`Expected rawMetaCode 803, got ${err.rawMetaCode}`);
      }
      if (err.fbtraceId !== 'PAGE_TRACE_8888') {
        throw new Error(`Expected fbtraceId PAGE_TRACE_8888, got ${err.fbtraceId}`);
      }
      if (!err.safeMessage.includes('aliases you requested do not exist')) {
        throw new Error(`Expected real message in safeMessage, got: ${err.safeMessage}`);
      }
    } finally {
      MetaClient.clearMocks();
    }
  });

  // -------------------------------------------------------------
  // TEST 6: Generic Meta API error
  // -------------------------------------------------------------
  await asyncTest('Generic Meta API Error: Preserves Meta message without generic unexpected error', async () => {
    MetaClient.clearMocks();
    MetaClient.registerMock('generic_api_endpoint', () => {
      const err = new Error('Meta API error');
      (err).status = 400;
      (err).error = {
        message: '(#1) An unknown internal Meta processing error has occurred.',
        type: 'FacebookApiException',
        code: 1,
        fbtrace_id: 'GEN_TRACE_1111',
      };
      throw err;
    });

    try {
      await metaClient.get('generic_api_endpoint', {}, 'mock_test_token');
      throw new Error('Expected get() to throw');
    } catch (err) {
      if (err.metaCode !== 'META_API_ERROR') {
        throw new Error(`Expected code META_API_ERROR, got ${err.metaCode}`);
      }
      if (err.rawMetaCode !== 1) {
        throw new Error(`Expected rawMetaCode 1, got ${err.rawMetaCode}`);
      }
      if (err.metaType !== 'FacebookApiException') {
        throw new Error(`Expected metaType FacebookApiException, got ${err.metaType}`);
      }
      if (err.fbtraceId !== 'GEN_TRACE_1111') {
        throw new Error(`Expected fbtraceId GEN_TRACE_1111, got ${err.fbtraceId}`);
      }
      if (err.safeMessage.includes('An unexpected Meta Graph API error occurred while processing your request')) {
        throw new Error('Requirement 4 violated: Useful error was replaced with generic unexpected error');
      }
      if (!err.safeMessage.includes('unknown internal Meta processing error')) {
        throw new Error(`Expected Meta message preserved, got: ${err.safeMessage}`);
      }
    } finally {
      MetaClient.clearMocks();
    }
  });

  // -------------------------------------------------------------
  // TEST 7: Successful Facebook publish flow
  // -------------------------------------------------------------
  await asyncTest('Successful publish: Pre-publish GET Page validation and POST /{page-id}/feed', async () => {
    MetaClient.clearMocks();
    let validatedPage = false;
    let publishedFeed = false;
    const targetPageId = '1405588742634526';

    MetaClient.registerMock(`^${targetPageId}$`, (params) => {
      if (params && params.fields && params.fields.includes('name')) {
        validatedPage = true;
        return {
          id: targetPageId,
          name: 'HOASP International',
          tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'],
        };
      }
      return null;
    });

    MetaClient.registerMock(`^${targetPageId}/feed$`, (params, body) => {
      publishedFeed = true;
      if (!body?.message) {
        throw new Error('Expected body.message');
      }
      return {
        id: `${targetPageId}_feed_post_1001`,
        post_id: `${targetPageId}_feed_post_1001`,
      };
    });

    // Test calling publishToFacebookPage via publishingService
    const res = await (publishingService).publishToFacebookPage(
      targetPageId,
      'Test Facebook publish content',
      [],
      'valid_mock_page_token'
    );

    if (!validatedPage) {
      throw new Error('Requirement 9 violated: GET /{page-id}?fields=id,name was not called before publishing');
    }
    if (!publishedFeed) {
      throw new Error('Requirement 11 violated: POST /{page-id}/feed was not called');
    }
    if (res.externalPostId !== `${targetPageId}_feed_post_1001`) {
      throw new Error(`Expected externalPostId, got ${res.externalPostId}`);
    }
    if (!res.externalPostUrl.includes('1405588742634526_feed_post_1001')) {
      throw new Error(`Expected externalPostUrl with post ID, got ${res.externalPostUrl}`);
    }

    MetaClient.clearMocks();
  });

  // -------------------------------------------------------------
  // TEST 8: Missing publishing permissions fails pre-validation
  // -------------------------------------------------------------
  await asyncTest('Permission check: Fails if page tasks lack CREATE_CONTENT / MANAGE', async () => {
    MetaClient.clearMocks();
    const targetPageId = '1405588742634526';

    MetaClient.registerMock(`^${targetPageId}$`, () => {
      return {
        id: targetPageId,
        name: 'HOASP International (Read Only)',
        tasks: ['ANALYZE'], // Lacks CREATE_CONTENT / MANAGE
      };
    });

    try {
      await (publishingService).publishToFacebookPage(
        targetPageId,
        'Test publish with insufficient perms',
        [],
        'valid_mock_page_token'
      );
      throw new Error('Expected publishToFacebookPage to fail due to missing tasks');
    } catch (err) {
      if (err.metaCode !== 'META_PERMISSION_DENIED') {
        throw new Error(`Expected META_PERMISSION_DENIED, got ${err.metaCode}`);
      }
      if (err.httpStatus !== 403) {
        throw new Error(`Expected httpStatus 403, got ${err.httpStatus}`);
      }
      if (!err.safeMessage.includes('pages_manage_posts')) {
        throw new Error(`Expected safeMessage to mention pages_manage_posts, got: ${err.safeMessage}`);
      }
    } finally {
      MetaClient.clearMocks();
    }
  });

  console.log(`\n🎉 All tests passed! (${passed}/${total})`);
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
