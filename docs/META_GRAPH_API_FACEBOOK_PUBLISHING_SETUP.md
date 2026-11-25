# Meta Graph API Facebook Publishing Setup Guide (Option B)

This comprehensive guide documents the configuration, OAuth flow, permissions, App Review, and production deployment process for direct Facebook Page publishing in SocialForge via the official Meta Graph API v20.0.

---

## 1. Architecture & Security Invariants

SocialForge Option B implements official Meta Graph API direct publishing adhering strictly to Meta Developer policies and enterprise security best practices:

1. **Official OAuth 2.0**: Users authenticate via Meta's secure dialog (`https://www.facebook.com/v20.0/dialog/oauth`). **SocialForge NEVER asks for or stores user Facebook passwords.**
2. **Signed State**: Every OAuth initiation generates an HMAC-SHA256 signed state carrying tenant, brand, user ID, and timestamp to prevent CSRF.
3. **AES-256-GCM Secure Credential Vault**: Page Access Tokens are encrypted with unique 96-bit initialization vectors and 128-bit authentication tags in `connection_credentials`. Tokens are never exposed in plaintext or logged.
4. **Pre-Publish Diagnostics**: Before executing any publish request, the pre-publish validator verifies token expiration (Meta error 190), page existence (`GET /{page-id}`), and required tasks (`pages_manage_posts`, `pages_read_engagement`).
5. **Strict Confirmation Invariant (`isRealExternalPostId`)**: A post is **NEVER** marked as `published` in the database or UI unless Meta Graph API returns a genuine confirmed external ID (e.g., `{page_id}_{post_id}`). Mock/simulated IDs (`fb_post_*`, `mock_*`, dummy UUIDs) are rejected by publication integrity rules.
6. **Resilient Scheduling Queue**: Publishing is processed through BullMQ Redis queues (`publishing_jobs`) with automatic exponential backoff for rate limits and transient errors.
7. **No-API Manual Fallback**: If an organization does not yet have an approved Meta Developer App, Connect Hub provides an assisted No-API manual mode (download template & copy captions for 1-tap manual mobile/desktop upload).

---

## 2. Meta Developer App Creation

### Step 1: Create a Meta Developer Account
1. Go to [developers.facebook.com](https://developers.facebook.com).
2. Log in with your corporate Facebook account and complete developer account verification.

### Step 2: Create a New App
1. Click **My Apps** > **Create App**.
2. When asked **"What do you want your app to do?"**, select **"Other"**, then click **Next**.
3. Select App Type: **"Business"** (Crucial: Business apps support Facebook Login for Business and Page management).
4. Provide your App Details:
   - **App Name**: `SocialForge Production` (or your company name)
   - **App Contact Email**: `security@yourdomain.com`
   - **Business Account**: Select your verified Meta Business Account (recommended for production).
5. Click **Create App**.

---

## 3. Product Setup & OAuth Redirect Configuration

### Facebook Login for Business
1. In the App Dashboard sidebar, click **Add Product**.
2. Locate **Facebook Login for Business** and click **Set Up**.
3. In the left navigation, click **Facebook Login for Business** > **Settings**.
4. Under **Client OAuth Settings**:
   - Enable **Client OAuth Login**: `Yes`
   - Enable **Web OAuth Login**: `Yes`
   - Enable **Enforce HTTPS**: `Yes` (Required by Meta; `http://localhost` is allowed for development)
5. Add **Valid OAuth Redirect URIs**:
   - **Development**: `http://localhost:4000/api/v1/integrations/meta/callback`
   - **Production**: `https://api.yourdomain.com/api/v1/integrations/meta/callback`
6. Click **Save Changes**.

---

## 4. Required Permissions & Scopes

SocialForge requires the following Meta Graph API scopes for complete Facebook Page publishing and performance monitoring:

| Scope | Category | Purpose in SocialForge |
|---|---|---|
| `public_profile` | Default | Identifies the authenticated Facebook user |
| `pages_show_list` | Standard / Advanced | Retrieves the list of Facebook Pages managed by the user |
| `pages_read_engagement` | Advanced | Validates Page accessibility and reads post metrics/insights |
| `pages_manage_posts` | Advanced | **Required for direct feed publishing (`POST /{page-id}/feed`)** |
| `instagram_basic` | Advanced *(Optional)* | Identifies Instagram Professional accounts connected to Pages |
| `instagram_content_publish` | Advanced *(Optional)* | Direct container-based publishing to Instagram Professional accounts |

---

## 5. Meta App Review & Verification Requirements

### Development Mode vs. Live Production Mode

- **Development Mode**:
  - Only developers, administrators, and designated **Testers** listed in **App Roles** can connect Pages and publish posts.
  - No App Review is required for internal testing with developer and tester accounts.
  - To test without App Review:
    1. In the Meta Dashboard, go to **App Roles** > **Roles**.
    2. Click **Add Testers** or **Add Developers** and enter the Facebook account ID/username of the page administrator.
    3. The user must accept the invite at [developers.facebook.com/requests](https://developers.facebook.com/requests).

- **Production Live Mode (General Public Availability)**:
  - Requires **Business Verification** and **App Review** approval by Meta.

### App Review Submission Checklist

To submit for App Review for `pages_manage_posts` and `pages_read_engagement`:

1. **Business Verification**:
   - Navigate to **App Settings** > **Basic** > **Verification**.
   - Upload official company documentation (Certificate of Incorporation, Business License, or Utility Bill matching the business name and address).
2. **App Details & Legal**:
   - **Privacy Policy URL**: Must explicitly mention social media token storage, data retention, and zero sale of personal data.
   - **User Data Deletion Callback URL**: Provide `https://api.yourdomain.com/api/v1/integrations/meta/data-deletion` (implements Meta HMAC SHA-256 data deletion confirmation).
   - **App Icon**: 1024x1024 px PNG.
3. **Screencast Video (Required by Meta Reviewers)**:
   - Record a 2 to 3-minute video showing:
     1. Navigating to SocialForge **Connect Hub**.
     2. Clicking **"Connect Facebook Page"**.
     3. Logging into Facebook via the official Meta dialog showing permissions requested (`pages_show_list`, `pages_manage_posts`, `pages_read_engagement`).
     4. Selecting the Facebook Page in the Page picker.
     5. Creating a template post in SocialForge Studio/Composer and scheduling it or clicking "Publish Now".
     6. Navigating to the live Facebook Page and refreshing to show the published post with caption and media.
4. **Step-by-Step Test Instructions**:
   - Provide test credentials or invite the Meta reviewer's test user to a staging brand.

---

## 6. SocialForge Environment Variables

Add the following environment variables to your root `.env` or production secrets vault:

```env
# Meta Graph API Credentials
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_GRAPH_API_VERSION=v20.0
META_GRAPH_API_BASE_URL=https://graph.facebook.com

# Backend OAuth Callback URL (Must match Meta Dashboard Redirect URI)
META_OAUTH_REDIRECT_URI=https://api.yourdomain.com/api/v1/integrations/meta/callback

# Test Mode Control
# Set to 'false' in production so calls go to real Meta endpoints.
# Set to 'true' in automated CI/test environments to use local stubs without unauthorized live posting.
META_TEST_MODE=false

# Master Vault Encryption Key (AES-256-GCM 32-byte hex)
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

---

## 7. Error Handling & Troubleshooting Runbook

| Error Code | Error Subcode | Root Cause | SocialForge Automated Handling & User Action |
|---|---|---|---|
| `190` | `463` | User Access Token expired after 60 days | Connection marked `reauth_required`. Pre-publish validator blocks posting. Actionable alert displays in Connect Hub with "Re-authorize" button. |
| `190` | `467` | User changed Facebook password or revoked app in Facebook Settings | Connection marked `reauth_required`. User prompted to reconnect. |
| `200` | Any | User did not grant `pages_manage_posts` or user is not Page admin | Status set to `permission_required`. User prompted to re-run OAuth dialog and ensure all Pages and permissions are checked. |
| `4` / `17` / `341` | Any | Meta Graph API Rate Limit exceeded | Publishing job automatically delayed with exponential backoff via BullMQ queue. Alert displayed on Calendar. |
| `368` | Any | Meta spam filter or temporarily restricted Page | Publishing job status marked `failed` with actionable message: *"Page is temporarily restricted by Meta policies."* |
| `100` | `33` | Page ID not found or deleted | Account flagged as inactive in `social_accounts`. Connect Hub alerts user to rediscover Pages. |

---

## 8. Verification Status Summary

| Area | Verified in Codebase | Requires Meta Approval / Live Credentials |
|---|---|---|
| **Connect Facebook Page Button** | ✅ Verified in Connect Hub UI (`ConnectHub.tsx`) | None (Active) |
| **Meta OAuth 2.0 Flow** | ✅ Verified URL & signed state generation | Live App ID & App Secret in production |
| **Eligible Page Discovery** | ✅ Verified API endpoint & UI selection dialog | Real Facebook Pages managed by user |
| **AES-256-GCM Credential Vault** | ✅ Verified 16-byte IV & 16-byte auth tag in DB | Encryption master key configured |
| **Pre-Publish Validator** | ✅ Verified permissions (`pages_manage_posts`) check | Valid Page Token from Meta |
| **Publishing Queue Integration** | ✅ Verified BullMQ job scheduling & status | Redis instance running |
| **Publication Integrity** | ✅ Verified strict invariant (`isRealExternalPostId`) | Live post confirmation from Meta |
| **Manual Fallback Mode** | ✅ Verified No-API assisted download & reminder | None (Always functional) |
| **Live General Public Access** | ⏳ Architecture ready | Requires Meta Business Verification & App Review |
