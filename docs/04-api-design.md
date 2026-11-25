# SocialForge — REST API Design Specification

## 1. API Architecture Conventions

- **Base URL**: `/api/v1`
- **Protocol**: HTTPS / JSON
- **Authentication**: `Authorization: Bearer <jwt_access_token>`
- **Tenant Context**: Automatically resolved via JWT claims or explicit header `X-Tenant-ID` for multi-tenant users.

### Standard Response Envelopes

#### Success Envelope (200, 201)
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-10-01T12:00:00.000Z",
    "page": 1,
    "limit": 20,
    "total": 85
  }
}
```

#### Async Accepted Envelope (202)
```json
{
  "success": true,
  "data": {
    "jobId": "job_c9a1841b-e260-4963-8a30-3cbe964b4c74",
    "status": "queued",
    "statusUrl": "/api/v1/jobs/job_c9a1841b-e260-4963-8a30-3cbe964b4c74"
  }
}
```

#### Error Envelope (400, 401, 403, 404, 422, 500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "scheduledFor",
        "issue": "Scheduled time must be at least 5 minutes in the future."
      }
    ]
  }
}
```

---

## 2. Authentication & Tenant Endpoints

### `POST /api/v1/auth/register`
Creates agency tenant and initial super-admin / agency owner account.
```json
// Request
{
  "email": "sarah@agency.com",
  "password": "SecurePassword123!",
  "fullName": "Sarah Connor",
  "agencyName": "Apex Digital Media",
  "agencySlug": "apex-digital"
}
// Response (201 Created)
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "sarah@agency.com", "fullName": "Sarah Connor" },
    "tenant": { "id": "uuid", "name": "Apex Digital Media", "slug": "apex-digital" },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "expiresIn": 900
    }
  }
}
```

### `POST /api/v1/auth/login`
Authenticates user and returns JWT pair.
```json
// Request
{ "email": "sarah@agency.com", "password": "SecurePassword123!" }
```

### `POST /api/v1/auth/refresh`
Refreshes expired access token using valid refresh token.
```json
// Request
{ "refreshToken": "eyJhbGciOi..." }
```

---

## 3. Brand & Brand Kit Management

### `GET /api/v1/brands`
Lists all brands belonging to the current tenant.

### `POST /api/v1/brands`
Creates a new Brand profile under the active tenant.
```json
// Request
{
  "name": "Luminary Glow Cosmetics",
  "slug": "luminary-glow",
  "industry": "Beauty & Skincare",
  "websiteUrl": "https://luminaryglow.com",
  "timezone": "America/New_York"
}
```

### `GET /api/v1/brands/:brandId/kit`
Fetches the brand identity kit (palette, fonts, tone, logos, taboo words).

### `PUT /api/v1/brands/:brandId/kit`
Updates brand kit parameters.
```json
// Request
{
  "toneOfVoice": {
    "formality": "approachable",
    "descriptors": ["empowering", "radiant", "scientific yet accessible"]
  },
  "primaryColors": {
    "primary": "#E11D48",
    "secondary": "#FB7185",
    "accent": "#FBBF24",
    "background": "#FFF1F2",
    "text": "#1E293B"
  },
  "fonts": {
    "heading": "Playfair Display",
    "body": "Plus Jakarta Sans"
  },
  "hashtagsDefault": ["#GlowUp", "#CleanBeauty", "#LuminarySkin"],
  "tabooWords": ["cheap", "miracle cure", "instant fix"],
  "disclaimers": "Results may vary. Dermatologist tested."
}
```

---

## 4. Media Asset Management & Presigned Uploads

### `POST /api/v1/brands/:brandId/media/presigned-url`
Generates a presigned S3/MinIO upload URL for direct browser-to-storage streaming.
```json
// Request
{
  "fileName": "hero_product_video.mp4",
  "mimeType": "video/mp4",
  "fileSizeBytes": 24500000,
  "mediaType": "video"
}
// Response (200 OK)
{
  "success": true,
  "data": {
    "uploadUrl": "http://localhost:9000/socialforge-media/tenant-1/brand-2/raw/uuid.mp4?X-Amz-Signature=...",
    "storageKey": "tenant-1/brand-2/raw/uuid.mp4",
    "expiresIn": 900
  }
}
```

### `POST /api/v1/brands/:brandId/media/confirm-upload`
Confirms direct upload completion and registers the asset in the database.

---

## 5. AI Content Studio Endpoints

### `POST /api/v1/brands/:brandId/ai/generate`
Dispatches an asynchronous multi-platform content generation request.
```json
// Request
{
  "prompt": "Announce our new Vitamin C Brightening Serum launch with 20% early-bird discount code GLOW20",
  "targetPlatforms": ["instagram", "x_twitter", "linkedin", "tiktok"],
  "campaignGoal": "drive_conversions",
  "includeHashtags": true
}
// Response (202 Accepted)
{
  "success": true,
  "data": {
    "jobId": "job_ai_91b72a",
    "statusUrl": "/api/v1/jobs/job_ai_91b72a"
  }
}
```

### `GET /api/v1/jobs/:jobId`
Polls background job status (AI generation, image rendering, video rendering).
```json
// Response (200 OK - Finished)
{
  "success": true,
  "data": {
    "jobId": "job_ai_91b72a",
    "status": "completed",
    "result": {
      "baseContent": "Unlock your most radiant skin...",
      "variants": {
        "x_twitter": "Dull skin? Not on our watch ✨ Say hello to our new Vitamin C Brightening Serum...",
        "linkedin": "We are thrilled to announce a major milestone in scientific skincare...",
        "instagram": "YOUR GLOW ERA STARTS NOW 🍊✨\n\nMeet the all-new Vitamin C Brightening Serum..."
      }
    }
  }
}
```

---

## 6. Dynamic Template Image Rendering

### `POST /api/v1/brands/:brandId/templates/render`
Generates a static graphic from dynamic template slots.
```json
// Request
{
  "templateId": "quote_card_modern",
  "aspectRatio": "1:1",
  "slots": {
    "quote": "Skincare is not an indulgence, it is daily healthcare for your largest organ.",
    "authorName": "Dr. Elena Rostova",
    "authorTitle": "Chief Dermatologist"
  }
}
// Response (202 Accepted)
{
  "success": true,
  "data": {
    "jobId": "job_render_img_45a",
    "statusUrl": "/api/v1/jobs/job_render_img_45a"
  }
}
```

---

## 7. Posts, Approval & Scheduling Endpoints

### `POST /api/v1/brands/:brandId/posts`
Creates a master post with platform variants.
```json
// Request
{
  "title": "Vitamin C Launch Campaign",
  "baseContent": "Master announcement copy...",
  "variants": [
    {
      "platform": "instagram",
      "content": "Instagram tailored caption...",
      "mediaAssetIds": ["uuid-image-1"]
    },
    {
      "platform": "x_twitter",
      "content": "X punchy tweet copy...",
      "mediaAssetIds": []
    }
  ]
}
```

### `POST /api/v1/posts/:postId/submit-for-approval`
Submits a draft post for internal or external review.
```json
// Request
{
  "reviewerEmail": "client@luminaryglow.com",
  "generateMagicLink": true
}
// Response (200 OK)
{
  "success": true,
  "data": {
    "approvalRequestId": "uuid",
    "status": "pending",
    "magicLinkUrl": "http://localhost:5173/review/magic_tok_a83fbc72"
  }
}
```

### `GET /api/v1/approvals/magic/:token`
Fetches post preview data for external clients using their magic token (no login required).

### `POST /api/v1/approvals/magic/:token/action`
Allows external client to approve or request changes with a comment.
```json
// Request
{
  "action": "changes_requested", // or 'approved'
  "comment": "Please replace the hashtag #CleanBeauty with #ClinicalSkincare."
}
```

### `POST /api/v1/posts/:postId/schedule`
Schedules an approved post for automated dispatch.
```json
// Request
{
  "scheduledFor": "2026-10-15T15:30:00Z"
}
```

### `GET /api/v1/brands/:brandId/calendar`
Fetches scheduled, published, and draft posts within a date range (`start`, `end`).

---

## 8. Social Connections & Mock Sandbox

### `GET /api/v1/brands/:brandId/social-accounts`
Returns all connected accounts (Meta, X, LinkedIn, TikTok, Mock Sandbox).

### `POST /api/v1/brands/:brandId/social-accounts/sandbox/toggle`
Activates or configures the built-in Mock Social Sandbox simulator.
```json
// Request
{
  "enabled": true,
  "simulateLatencyMs": 800,
  "simulateFailureRate": 0.0
}
```
