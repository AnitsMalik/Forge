import http from 'http';
import url from 'url';
import crypto from 'crypto';

const PORT = Number(process.env.MOCK_META_PORT) || 4005;

let requestCount = 0;
let simulatedLatencyMs = 2; // Fast baseline for load testing
let simulateRateLimitThreshold = Infinity; // Trigger rate limit after N requests if set

const server = http.createServer((req, res) => {
  requestCount++;
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '';
  const query = parsed.query || {};

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-bypass-rate-limit, x-mock-meta-error');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Inject simulated network delay
  const delay = simulatedLatencyMs > 0 ? simulatedLatencyMs : 0;
  setTimeout(() => {
    handleRequest(req, res, pathname, query);
  }, delay);
});

function handleRequest(req, res, pathname, query) {
  // Check for rate limit simulation
  const mockErrorHeader = req.headers['x-mock-meta-error'];
  if (mockErrorHeader === 'rate_limit' || requestCount > simulateRateLimitThreshold) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: {
        message: '(#17) User request limit reached',
        type: 'OAuthException',
        code: 17,
        fbtrace_id: 'mock_trace_' + crypto.randomBytes(6).toString('hex'),
      },
    }));
    return;
  }

  // Health endpoint
  if (pathname === '/health' || pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'SocialForge Mock Meta Provider Gateway',
      port: PORT,
      requestsHandled: requestCount,
      simulatedLatencyMs,
    }));
    return;
  }

  // 1. OAuth Dialog Redirect Simulation: /v20.0/dialog/oauth
  if (pathname.includes('/dialog/oauth')) {
    const redirectUri = query.redirect_uri;
    const state = query.state;
    if (!redirectUri) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Missing redirect_uri', code: 100 } }));
      return;
    }
    const mockAuthCode = 'mock_auth_code_' + crypto.randomBytes(8).toString('hex');
    const redirectTarget = new URL(redirectUri);
    redirectTarget.searchParams.append('code', mockAuthCode);
    if (state) redirectTarget.searchParams.append('state', state);

    res.writeHead(302, { Location: redirectTarget.toString() });
    res.end();
    return;
  }

  // 2. Token Exchange: /v20.0/oauth/access_token
  if (pathname.includes('/oauth/access_token')) {
    const code = query.code;
    const grantType = query.grant_type;
    const fbExchangeToken = query.fb_exchange_token;

    // Simulate invalid code error
    if (code === 'invalid_code' || mockErrorHeader === 'invalid_code') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          message: 'Invalid verification code format.',
          type: 'OAuthException',
          code: 100,
        },
      }));
      return;
    }

    if (grantType === 'fb_exchange_token' || fbExchangeToken) {
      // Long-lived token response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        access_token: 'EAAG_mock_long_lived_60d_' + crypto.randomBytes(16).toString('hex'),
        token_type: 'bearer',
        expires_in: 5184000, // 60 days
      }));
      return;
    }

    // Short-lived token response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      access_token: 'EAAG_mock_short_lived_1h_' + crypto.randomBytes(16).toString('hex'),
      token_type: 'bearer',
      expires_in: 3600, // 1 hour
    }));
    return;
  }

  // 3. Token Debugger: /v20.0/debug_token
  if (pathname.includes('/debug_token')) {
    const inputToken = query.input_token || '';
    if (inputToken.includes('expired') || mockErrorHeader === 'expired_token') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          app_id: '1785874552561096',
          is_valid: false,
          error: {
            code: 190,
            error_subcode: 463,
            message: 'Session has expired.',
          },
        },
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: {
        app_id: '1785874552561096',
        type: 'USER',
        application: 'SocialForge Staging Gateway Mock',
        data_access_expires_at: Math.floor(Date.now() / 1000) + 7776000,
        expires_at: Math.floor(Date.now() / 1000) + 5184000,
        is_valid: true,
        scopes: [
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish',
          'public_profile',
        ],
        user_id: 'mock_meta_user_' + crypto.randomBytes(6).toString('hex'),
      },
    }));
    return;
  }

  // 4. Accounts & Pages Discovery: /v20.0/me/accounts
  if (pathname.includes('/me/accounts')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: [
        {
          id: '1405588742634526',
          name: 'HOASP International',
          category: 'Non-profit Organization',
          access_token: 'mock_page_token_hoasp_' + crypto.randomBytes(12).toString('hex'),
          tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'],
          picture: {
            data: {
              url: 'https://mock-graph.facebook.com/hoasp/picture.jpg',
            },
          },
          instagram_business_account: {
            id: '17841441490581879',
            username: 'hoaspinternational',
            name: 'HOASP International',
            profile_picture_url: 'https://mock-graph.facebook.com/ig/picture.jpg',
            followers_count: 12500,
          },
        },
      ],
      paging: {
        cursors: {
          before: 'mock_cursor_before',
          after: 'mock_cursor_after',
        },
      },
    }));
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: {
      message: `Endpoint ${pathname} not found on Mock Meta Provider Gateway`,
      type: 'OAuthException',
      code: 404,
    },
  }));
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`========================================================================`);
  console.log(`  MOCK META PROVIDER GATEWAY ACTIVE ON http://127.0.0.1:${PORT}        `);
  console.log(`  - OAuth Dialog: http://127.0.0.1:${PORT}/v20.0/dialog/oauth         `);
  console.log(`  - Token Exchange: http://127.0.0.1:${PORT}/v20.0/oauth/access_token  `);
  console.log(`  - Debug Token: http://127.0.0.1:${PORT}/v20.0/debug_token           `);
  console.log(`  - Me Accounts: http://127.0.0.1:${PORT}/v20.0/me/accounts           `);
  console.log(`========================================================================`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
