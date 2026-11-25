# Meta Graph API Integration & Setup Guide (SocialForge)

This guide documents the end-to-end setup required to configure Meta (Facebook & Instagram) social media publishing for SocialForge. It covers Meta Developer App creation, permissions configuration, Instagram Professional account linking, App Review, Business Verification, and production deployment best practices.

---

## Table of Contents

1. [Create Meta Developer App](#1-create-meta-developer-app)
2. [Configure Facebook Login & Meta Products](#2-configure-facebook-login--meta-products)
3. [Configure OAuth Redirect URI](#3-configure-oauth-redirect-uri)
4. [Configure Required Permissions](#4-configure-required-permissions)
5. [Connect Facebook Page](#5-connect-facebook-page)
6. [Connect Instagram Professional Account](#6-connect-instagram-professional-account)
7. [App Review & Submission Process](#7-app-review--submission-process)
8. [Business Verification Checklist](#8-business-verification-checklist)
9. [Production Deployment Checklist](#9-production-deployment-checklist)
10. [Reconnection & Error Recovery Workflow](#10-reconnection--error-recovery-workflow)

---

## 1. Create Meta Developer App

SocialForge uses a single multi-tenant Meta Developer App to authorize customer Facebook Pages and Instagram Professional accounts. **Do not create one Meta Developer App per customer.**

1. Navigate to the [Meta for Developers Portal](https://developers.facebook.com/).
2. Log in with your verified Facebook administrator account.
3. Click **My Apps** → **Create App**.
4. Select **Other** as the use case, then choose **Business** as the app type (this unlocks Page and Instagram publishing APIs).
5. Specify your App details:
   - **App Display Name**: `SocialForge`
   - **App Contact Email**: `security@socialforge.io` (or your company email)
   - **Business Account**: Associate with your verified Meta Business Account.
6. Click **Create App** and complete the security verification.

---

## 2. Configure Facebook Login & Meta Products

Inside your App Dashboard (`https://developers.facebook.com/apps/<APP_ID>/dashboard/`):

1. Locate **Add Products to Your App**.
2. Find **Facebook Login for Business** and click **Set Up**.
3. Under the left navigation, select **Facebook Login for Business** → **Settings**.
4. Configure the client settings:
   - **Client OAuth Login**: `Yes`
   - **Web OAuth Login**: `Yes`
   - **Enforce HTTPS**: `Yes` (strictly enforced by Meta in production)
   - **Use Strict Mode for Redirect URIs**: `Yes`
   - **Embedded Browser OAuth Login**: `Yes`

---

## 3. Configure OAuth Redirect URI

Add the exact callback URIs to the **Valid OAuth Redirect URIs** field in the Facebook Login Settings:

### Local Development
```text
http://localhost:4000/api/v1/integrations/meta/callback
http://localhost:4000/api/integrations/meta/callback
```

### Staging & Production
```text
https://api.yourdomain.com/api/v1/integrations/meta/callback
https://api.yourdomain.com/api/integrations/meta/callback
```

> **Security Note**: Meta rejects wildcards or non-exact URI matches. The URI configured in your environment variable `META_OAUTH_REDIRECT_URI` must match one of these registered entries character-for-character.

---

## 4. Configure Required Permissions

SocialForge requests **only** the minimum permissions required for social content discovery and publishing:

| Permission Name | Category | Purpose in SocialForge |
|---|---|---|
| `pages_show_list` | Facebook Page | Discovers Facebook Pages managed by the user |
| `pages_read_engagement` | Facebook Page | Inspects Page status, analytics, and metadata |
| `pages_manage_posts` | Facebook Page | Publishes text, photo, and video posts to Facebook Pages |
| `instagram_basic` | Instagram | Discovers linked Instagram Professional accounts & profile details |
| `instagram_content_publish` | Instagram | Creates media containers and publishes Instagram feed posts and reels |
| `public_profile` | User Profile | Basic Facebook identity verification during OAuth |

> **Principle of Least Privilege**: Never request permissions your app does not use (e.g. `pages_manage_metadata` or `ads_management` until Marketing API integration is formally launched).

---

## 5. Connect Facebook Page

To allow SocialForge to publish to a Facebook Page:

1. The user authenticating through OAuth must hold an **Administrator** or **Editor** role on the Facebook Page (with full content creation tasks).
2. During the OAuth flow (`GET /api/v1/integrations/meta/connect`), Meta presents the Business Login dialog where the user selects the Pages they grant access to.
3. SocialForge exchanges the short-lived user token for a **60-day long-lived User Access Token**.
4. When querying `/me/accounts` with a long-lived user token, Meta issues **Page Access Tokens that do not expire** (unless the user revokes permissions or changes their password).
5. SocialForge encrypts these Page tokens server-side using **AES-256-GCM** before saving to the database.

---

## 6. Connect Instagram Professional Account

Instagram Graph API publishing **only** works with **Instagram Professional Accounts** (Business or Creator accounts) linked to a Facebook Page. Personal Instagram accounts are not supported by Meta Graph API.

### How to Link Instagram to a Facebook Page:
1. Open [Meta Business Suite](https://business.facebook.com/) or the Facebook Page Settings.
2. Go to **Page Settings** → **Linked Accounts** → **Instagram**.
3. Click **Connect Account** and log in to the Instagram account.
4. If the Instagram account is currently Personal, follow the prompt to convert it to a **Professional (Business or Creator) Account**.
5. Ensure the toggle **Allow access to Instagram messages and content in Meta Business Suite** is enabled.

### Verification in SocialForge:
When the user selects their Facebook Page in the SocialForge UI, SocialForge queries:
```http
GET /{page-id}?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count}
```
If linked, SocialForge displays the `@username`, avatar, and follower count with a green `Eligible for Instagram Publishing` badge. If no Instagram Professional account is linked, SocialForge clearly displays an actionable alert instructing the user how to link their account in Meta Business Suite.

---

## 7. App Review & Submission Process

While your Meta App is in **Development Mode**, only users with Developer, Tester, or Administrator roles in your Meta App can log in. To open SocialForge to all public customers, you must submit for **App Review**.

### Required Permissions for App Review:
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `instagram_basic`
- `instagram_content_publish`

### Steps for Submission:
1. In the App Dashboard, go to **App Review** → **Permissions and Features**.
2. Request Advanced Access for each permission listed above.
3. Provide a clear screencast showing:
   - User clicking "Connect Meta" in SocialForge.
   - Meta Business Login dialog with requested permissions.
   - Selecting a Facebook Page and previewing the connected Instagram account.
   - The SocialForge AI agent generating and publishing a post to both platforms.
4. Provide test credentials or an invite to a test Facebook Page.
5. Provide detailed explanation text for why SocialForge needs each scope.

---

## 8. Business Verification Checklist

Advanced Access to `pages_manage_posts` and `instagram_content_publish` requires **Meta Business Verification**:

1. Navigate to [Meta Business Settings](https://business.facebook.com/settings/) → **Security Center**.
2. Click **Start Verification**.
3. Provide official company documents:
   - Certificate of Incorporation / Business Registration
   - Official utility bill or bank statement showing legal company name and address
   - Phone number verification (SMS or phone call)
4. Verify your domain (via DNS TXT record or HTML file upload).
5. Business verification typically takes 1–3 business days.

---

## 9. Production Deployment Checklist

Before going live:

- [ ] Set `NODE_ENV=production` in your server environment.
- [ ] Set `META_TEST_MODE=false`.
- [ ] Generate a secure 64-character hex master key for `ENCRYPTION_MASTER_KEY` (`openssl rand -hex 32`).
- [ ] Verify `META_APP_ID` and `META_APP_SECRET` match your live production Meta App credentials.
- [ ] Verify `META_OAUTH_REDIRECT_URI` uses `https://` and matches the production domain.
- [ ] Ensure `META_DEV_ACCESS_TOKEN` is blank or unset in production environments.
- [ ] Verify background worker (`apps/worker`) is running and polling `publishing_jobs`.
- [ ] Confirm public media storage (S3/MinIO) returns public HTTPS URLs for uploaded assets.

---

## 10. Reconnection & Error Recovery Workflow

Meta access tokens can become invalid under any of the following circumstances:
- Password change by the Facebook account owner
- 60-day expiration of short-lived/user tokens
- User manually removes SocialForge permissions in Facebook Settings
- Security checkpoint triggered on the Facebook account

### How SocialForge Handles Reconnection:
1. When Meta returns error code `190` or subcode `463` / `490`, the backend automatically marks `meta_connections.status = 'expired'`.
2. The user sees an amber alert on the Social Channels dashboard: *"Your Meta connection needs to be re-authorized."*
3. The user clicks **[Reconnect]**, which launches a fresh OAuth handshake.
4. The existing `meta_connections` record is updated with new encrypted tokens and validity timestamps without losing past publishing history or scheduled jobs.
