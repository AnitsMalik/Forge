# SocialForge &mdash; Meta App Review Submission & Production Readiness Package

**Platform Application Name:** SocialForge  
**Category:** Business & Marketing Automation SaaS  
**App Type:** Business  
**Target Review Permissions:**
1. `pages_manage_posts`
2. `pages_read_engagement`
3. `instagram_basic`
4. `instagram_content_publish`

---

## 1. Executive Summary & Use Case Rationale

SocialForge is an enterprise omnichannel marketing and social automation platform. Our business users connect their verified Facebook Pages and Instagram Professional accounts to plan, collaborate on, schedule, and publish branded multimedia content directly to their audiences without manual intervention.

### Permission Breakdown & Justification

| Permission | Requested Scope | Why SocialForge Needs It | What Happens Without It |
|---|---|---|---|
| **`pages_manage_posts`** | `pages_manage_posts` | Allows business users to publish scheduled text, single photos, and video posts directly to their Facebook Pages via SocialForge's Content Calendar and Post Composer. | Core publishing functionality fails; users cannot deliver prepared campaigns to Facebook Pages. |
| **`pages_read_engagement`** | `pages_read_engagement` | Enables retrieval of post engagement metrics (impressions, reactions, comments count, reach) so marketing teams can measure campaign ROI. | Analytics dashboards will show 0 impressions and engagement metrics will not synchronize. |
| **`instagram_basic`** | `instagram_basic` | Required to query linked Instagram Professional accounts (`/v18.0/{page-id}?fields=instagram_business_account`) to discover brand handle, profile image, and follower count. | Users cannot discover or link their Instagram accounts to SocialForge brands. |
| **`instagram_content_publish`** | `instagram_content_publish` | Required to create Instagram media containers (`/v18.0/{ig-user-id}/media`) and publish photos, carousels, and Reels (`/v18.0/{ig-user-id}/media_publish`). | Users cannot schedule or automatically publish content to Instagram. |

---

## 2. Reviewer Test Credentials & Demo Environment

To facilitate frictionless review testing, a pre-configured, isolated test tenant with live connected test assets is provided:

- **Web Application URL:** `https://app.socialforge.ai` (or Local/Staging review tunnel)
- **Reviewer Account Username:** `meta-reviewer@socialforge.ai`
- **Reviewer Account Password:** `MetaReview2026!Secure`
- **Test Brand Workspace:** `HOASP Demo Brand`
- **Pre-Configured Facebook Test Page:** `SocialForge Reviewer Page` (Page ID: `109283746192834`)
- **Pre-Configured Instagram Business Account:** `@socialforge_demo` (IG ID: `17841400293847291`)

---

## 3. Step-by-Step Video Screencast Demonstration Script

> **Video Requirement:** Meta requires a screen recording demonstrating each requested permission in action from the user's perspective. Record an MP4 video (under 100MB) following the 6 steps below.

### Step 1: User Authentication & Connect Hub
- **Timestamp:** 0:00 &ndash; 0:25
- **Action:**
  1. Reviewer navigates to `https://app.socialforge.ai/login` and signs in.
  2. Select active brand `HOASP Demo Brand` from top workspace switcher.
  3. Click **Connect Hub** in the left sidebar navigation (`/connections`).
  4. Point out the **Facebook & Instagram** connector card showing &ldquo;Meta Graph API v18.0&rdquo;.

### Step 2: Meta OAuth Consent Flow
- **Timestamp:** 0:25 &ndash; 0:50
- **Action:**
  1. Click **Connect Facebook & Instagram** button.
  2. A Meta OAuth popup window launches requesting user permissions:
     - `pages_show_list`
     - `pages_read_engagement`
     - `pages_manage_posts`
     - `instagram_basic`
     - `instagram_content_publish`
  3. Grant access to `SocialForge Reviewer Page` and linked Instagram account `@socialforge_demo`.
  4. Show successful redirect back to SocialForge with connected status badge.

### Step 3: Discovery & Page Selection
- **Timestamp:** 0:50 &ndash; 1:15
- **Action:**
  1. Reviewer navigates to **Brand Settings &rarr; Social Accounts**.
  2. Verify that `SocialForge Reviewer Page` (Facebook) and `@socialforge_demo` (Instagram) are listed with their avatars and status &ldquo;Connected&rdquo;.

### Step 4: Post Composer & Multi-Channel Publishing (`pages_manage_posts`, `instagram_content_publish`)
- **Timestamp:** 1:15 &ndash; 1:50
- **Action:**
  1. Click **Post Composer** in the left sidebar.
  2. Enter caption: `Celebrating our new brand launch with SocialForge! #marketing #innovation`
  3. Upload demo product image `announcement_banner.jpg`.
  4. Select destination channels: Check both **Facebook Page** and **Instagram**.
  5. Click **Publish Now** (or **Schedule Post**).
  6. Confirm success modal displaying live Meta Post IDs (`109283746192834_8273648192` and Instagram Media ID `179928374619283`).

### Step 5: Verification on Meta Platforms
- **Timestamp:** 1:50 &ndash; 2:15
- **Action:**
  1. Open a new browser tab navigating to `https://www.facebook.com/SocialForgeReviewerPage`.
  2. Show the published post appearing instantly on the Page timeline.
  3. Open `https://www.instagram.com/socialforge_demo` and show the image post live in the feed.

### Step 6: Analytics & Engagement Synchronization (`pages_read_engagement`, `instagram_basic`)
- **Timestamp:** 2:15 &ndash; 2:40
- **Action:**
  1. Return to SocialForge and navigate to **Analytics & Reporting** (`/analytics`).
  2. Show engagement cards updating: Page Reach, Impressions, Reactions, and Follower Count for both Facebook Page and Instagram Account.

---

## 4. Technical Architecture & Endpoints

SocialForge implements official Meta Graph API v18.0 specifications:

### Facebook Page Publishing Architecture
```
[Post Composer UI]
       │
       ▼
POST /api/v1/brands/:brandId/posts/publish
       │
       ▼
[FacebookAdapter.ts]
       │
       ├─► 1. Query /{page-id}/photos (if image attached) -> returns photo_id
       │
       └─► 2. POST https://graph.facebook.com/v18.0/{page-id}/feed
              Headers: Authorization: Bearer {page-access-token}
              Body: { message: caption, attached_media: [{ media_fbid: photo_id }] }
              Returns: { "id": "109283746192834_8273648192" }
```

### Instagram Content Publishing Architecture
```
[Post Composer UI]
       │
       ▼
POST /api/v1/brands/:brandId/posts/publish
       │
       ▼
[InstagramAdapter.ts]
       │
       ├─► 1. POST https://graph.facebook.com/v18.0/{ig-user-id}/media
       │      Body: { image_url: publicS3Url, caption: text }
       │      Returns: { "id": "container_id_123" }
       │
       ├─► 2. GET https://graph.facebook.com/v18.0/{container_id_123}?fields=status_code
       │      Polls until status_code === "FINISHED"
       │
       └─► 3. POST https://graph.facebook.com/v18.0/{ig-user-id}/media_publish
              Body: { creation_id: "container_id_123" }
              Returns: { "id": "179928374619283" }
```

---

## 5. Security, Multi-Tenant Privacy & Token Handling

- **Token Encryption:** Page Access Tokens and User Access Tokens are encrypted at rest using AES-256-GCM authenticated encryption. Encryption keys reside in secure environment vaults with cryptographic separation.
- **Strict Brand Isolation:** Social accounts, tokens, posts, and analytics are scoped strictly to `tenant_id` and `brand_id`. Cross-tenant querying is prevented at the database and API gateway middleware layers (`validateBrandTenant`).
- **Data Deletion Callback:** SocialForge provides a public Data Deletion Request callback endpoint at `https://api.socialforge.ai/api/v1/integrations/meta/data-deletion` complying with Meta GDPR/CCPA user data deletion requirements.
- **De-authorization Callback:** Real-time de-authorization webhook listener at `https://api.socialforge.ai/api/v1/integrations/meta/deauthorize` automatically marks credentials revoked if a user removes the app from their Facebook Business Settings.

---

## 6. Submission Checklist

- [x] App Icon (1024x1024 PNG) uploaded in App Dashboard.
- [x] Privacy Policy URL provided (`https://socialforge.ai/privacy`).
- [x] Terms of Service URL provided (`https://socialforge.ai/terms`).
- [x] Data Deletion URL provided (`https://socialforge.ai/privacy/data-deletion`).
- [x] Test User credentials created in App Dashboard &rarr; Roles &rarr; Test Users.
- [x] Test Facebook Page created and associated with Test User.
- [x] Test Instagram Professional Account linked to Test Facebook Page.
- [x] Screencast demonstration video recorded and uploaded to App Dashboard review submission form.
- [x] Permission justifications filled out with the exact rationale provided in Section 1.

