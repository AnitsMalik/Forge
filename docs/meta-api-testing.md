# Meta Graph API Testing & Development Token Guide

This guide explains how to safely test Meta social publishing in SocialForge using Graph API Explorer tokens and the automated mock test engine **without ever hard-coding or committing access tokens**.

---

## Security First: Strict Token Safety Rules

SocialForge implements strict defense-in-depth measures to prevent token leakage:

1. **NEVER Hard-Code Tokens**: Tokens must never be placed in source code or committed to Git.
2. **NEVER Expose in Frontend**: Tokens are stripped from all API responses before leaving the backend controller.
3. **NEVER Print in Logs**: The backend `redactTokens()` engine inspects all log messages, URLs, query strings, and error payloads, replacing tokens with `[REDACTED_META_TOKEN]`.
4. **Encrypted at Rest**: All access tokens are encrypted with AES-256-GCM using `ENCRYPTION_MASTER_KEY` before database persistence.

---

## 1. Generating a Test Token in Graph API Explorer

When developing locally or running live integration verification, you can generate a temporary development token from the Meta Graph API Explorer:

1. Navigate to the [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. In the top-right toolbar:
   - **Meta App**: Select your `SocialForge` developer app.
   - **User or Page**: Select `User Token`.
3. In the **Permissions** panel, add the required scopes:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
   - `public_profile`
4. Click **Generate Access Token**.
5. Approve the Meta dialog to grant access to your test Facebook Page and connected Instagram Professional account.

> **Warning**: Graph API Explorer tokens are short-lived (1–2 hours). Treat them as temporary development credentials only. Never architect production authentication around manually copied tokens.

---

## 2. Using `META_DEV_ACCESS_TOKEN` Securely

To test with your developer token without going through the web OAuth redirect flow:

### Option A: Local `.env` Configuration (Recommended for Headless CLI)
Add your token to your local `.env` file (which is excluded from Git via `.gitignore`):

```bash
# In f:\SocialAgent\.env
META_DEV_ACCESS_TOKEN=EAAG...your_explorer_token_here...
META_TEST_MODE=false
```

SocialForge's server will inspect this token, exchange it for a long-lived credential, discover authorized Pages and Instagram accounts, and populate the integration state without committing secrets.

### Option B: Social Channels UI Importer
You can also import your development token directly from the SocialForge web interface:

1. Open the SocialForge web app at `http://localhost:5173`.
2. Navigate to **Social Channels** (`/channels`).
3. On the **Meta (Facebook & Instagram)** integration card, click **[Import Dev Token]**.
4. Paste your Graph API Explorer token and click **Import & Sync**.
5. SocialForge securely transmits the token over POST to `/api/v1/integrations/meta/dev-token`, encrypts it in the database with AES-256-GCM, and discovers your Facebook Pages immediately.

---

## 3. Automated Test Suite (All 15 Scenarios)

SocialForge comes with a comprehensive test suite covering all required Meta publishing scenarios:

### Run the Test Suite
From the repository root, run:

```bash
node apps/api/test_meta_integration.mjs
```

### Covered Test Scenarios:

| # | Scenario | Verification Method |
|---|---|---|
| 1 | **OAuth State Validation** | Generates HMAC-SHA256 signed state; verifies authentic state; detects tampered signature; rejects expired state (>15 min) |
| 2 | **Meta Callback Code Exchange** | Exchanges authorization code; inspects token scopes; encrypts with AES-256-GCM |
| 3 | **Facebook Page Discovery** | Queries `/me/accounts`; verifies response returns safe metadata (`id`, `name`, `category`, `pictureUrl`); asserts 0 access tokens leaked in response |
| 4 | **Instagram Account Discovery** | Discovers linked Instagram account (`ig_77889900`, `@socialforge_hq`); verifies publishing capability |
| 5 | **Facebook Publishing** | Publishes text feed post, photo post, and video post; verifies external post IDs |
| 6 | **Instagram Publishing** | Full container-based workflow: container creation → polling `status_code: 'FINISHED'` → publish container → fetch permalink |
| 7 | **Invalid Credentials** | Simulates Meta error 190 subcode 490; asserts normalized `META_AUTH_REQUIRED` (HTTP 401); verifies token redaction |
| 8 | **Expired Credentials** | Simulates Meta error 190 subcode 463; asserts normalized `META_TOKEN_EXPIRED` (HTTP 401) |
| 9 | **Missing Permissions** | Simulates Meta error 200/10; asserts normalized `META_PERMISSION_DENIED` (HTTP 403) |
| 10 | **Missing Instagram Account** | Attempts Instagram publish to Page without linked IG; asserts normalized `META_INSTAGRAM_NOT_CONNECTED` |
| 11 | **Invalid Media Validation** | Rejects non-media files (`.exe`, `.pdf`) and out-of-spec aspect ratios (e.g. 5.0) before calling Meta |
| 12 | **Meta Rate Limits** | Simulates error 4/17; asserts normalized `META_RATE_LIMIT` (HTTP 429) with `retryAfterSeconds` |
| 13 | **Retry Behavior** | Validates exponential backoff delay calculation for transient vs non-transient errors |
| 14 | **Scheduled Jobs Workflow** | Schedules post in future; verifies worker ignores future jobs and picks up due jobs |
| 15 | **Duplicate Publishing Prevention**| Verifies jobs in `published` status cannot be executed again |
| 16 | **Mock Engine Isolation** | Verifies zero external network requests when running in test mode |

---

## 4. How the Mock Engine Works

The `MetaClient` class includes a built-in mock response engine (`MetaMockClient`) activated when `testMode: true`:

- **Zero Network Flakiness**: Unit tests do not depend on Meta developer server uptime or live rate limits.
- **Dynamic Handlers**: Custom mock error scenarios can be registered dynamically via `MetaClient.registerMock(pattern, handler)`.
- **Automatic Fallback**: If `META_APP_ID` is not configured in local environment, SocialForge automatically defaults to mock mode so development is frictionless.

---

## 5. Token Redaction Engine Demonstration

The token redaction utility in `apps/api/src/services/meta/errors.ts` uses regex pattern matching to sanitize strings:

```typescript
import { redactTokens } from './services/meta/errors.js';

// Input with sensitive parameters:
const url = 'https://graph.facebook.com/v20.0/me/accounts?access_token=EAAG1234567890abcdef123';
console.log(redactTokens(url));
// Output:
// 'https://graph.facebook.com/v20.0/me/accounts?access_token=[REDACTED_TOKEN]'
```

Any standard Meta User or Page access token matching `EAAG...` or `EAA...` is automatically masked across all application logging output.
