# SocialForge — Comprehensive Product Audit

**Document Path**: `/docs/product-audit.md`  
**Classification System**: `KEEP` | `IMPROVE` | `MERGE` | `REPLACE` | `REMOVE` | `MISSING`  
**Priority Tiers**: `P0` (Critical) | `P1` (High) | `P2` (Medium) | `P3` (Later)  

---

## 1. Executive Summary

This product audit evaluates all 36 functional modules and capabilities across SocialForge against the product vision: **"Turn one business idea into a complete social media campaign"** with the feeling of an **"AI Marketing Assistant"** (V1 Self-Serve Single-User Model).

Every feature is assessed rigorously on technical architecture, user value, UX quality, and alignment with the streamlined V1 model without deleting foundational infrastructure needed for future scale.

---

## 2. Feature-by-Feature Product Audit

### Feature 1: Multi-Tenant Organizations & Workspace Model
- **Current implementation**: Knex `tenants` & `tenant_users` tables. JWT payload carries `tenantId`. Middleware enforces row-level tenant boundary.
- **Current user value**: Low for a self-serve single user; foundational for future SaaS multi-tenancy.
- **Technical quality**: High. Clean relational foreign keys and composite indexes.
- **UX quality**: Neutral. Hidden from the user during daily usage.
- **Duplicate functionality**: None.
- **Problems**: Creates unnecessary mental overhead if exposed as an "Agency" switching interface in a single-user V1 app.
- **Recommendation**: **KEEP**
- **Priority**: **P2**
- **Reason**: Keep the underlying database isolation and security architecture intact, but treat the organization simply as the user's "Personal Workspace" in the V1 UI.

---

### Feature 2: User Authentication & JWT Sessions
- **Current implementation**: Email/password authentication using bcrypt (10 rounds) in [`auth.controller.ts`](file:///f:/SocialAgent/apps/api/src/controllers/auth.controller.ts), signed JWT access token (15m) + refresh token (7d).
- **Current user value**: High. Secures user accounts and brand workspaces.
- **Technical quality**: High. Compliant JWT signing and verification with brute-force rate limiting.
- **UX quality**: High. Modern login screen with quick demo login buttons and theme switcher.
- **Duplicate functionality**: None.
- **Problems**: Refresh token rotation endpoint is partially implemented but does not persist refresh tokens to a database revocation table.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: Critical user authentication gate; rock-solid for V1.

---

### Feature 3: Brand Management & Profiles
- **Current implementation**: `brands` table with `name`, `slug`, `industry`, `website_url`, and `timezone`. CRUD in [`brand.controller.ts`](file:///f:/SocialAgent/apps/api/src/controllers/brand.controller.ts).
- **Current user value**: Critical. Provides the foundational business context for all AI generation.
- **Technical quality**: High. Includes timezone definitions and tenant scoping.
- **UX quality**: Good. Clean sidebar brand switcher dropdown.
- **Duplicate functionality**: None.
- **Problems**: Timezone is captured but not easily edited in the frontend UI without modifying the database.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Add inline timezone, website, and industry editing directly in the Brand Kit settings view so the AI assistant always has up-to-date business context.

---

### Feature 4: Brand Kit Governance (Colors, Fonts, Tone, Taboo Words)
- **Current implementation**: [`BrandKitPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/BrandKitPage.tsx) managing 5-point color palette, Google Fonts, formality, tone descriptors, taboo words, and disclaimers.
- **Current user value**: Extremely High. Guarantees that AI-generated copy and visual designs match brand identity.
- **Technical quality**: High. JSON storage with automatic fallback defaults.
- **UX quality**: High. Visual color pickers, font selectors, and interactive tag chips.
- **Duplicate functionality**: None.
- **Problems**: Taboo word scrubbing currently acts on single posts; needs to be applied automatically across full multi-post campaigns.
- **Recommendation**: **IMPROVE**
- **Priority**: **P0**
- **Reason**: Enhance brand kit injection to feed directly into the Campaign Strategy Arc and ensure all posts in a campaign adhere to brand governance.

---

### Feature 5: AI Single-Post Copy Generation
- **Current implementation**: [`aiCopyService.ts`](file:///f:/SocialAgent/apps/api/src/services/aiCopyService.ts) and [`promptBuilder.ts`](file:///f:/SocialAgent/apps/worker/src/engines/ai/promptBuilder.ts) using OpenAI `gpt-4o` with structured JSON output and heuristic fallback.
- **Current user value**: Moderate. Produces good individual post captions with platform variants.
- **Technical quality**: High. Resilient fallback engine when OpenAI API key is not present.
- **UX quality**: Good within [`ContentStudioPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/ContentStudioPage.tsx).
- **Duplicate functionality**: Overlaps with the target Campaign Generator.
- **Problems**: Generates only **one isolated post** at a time. Feels like an "AI Caption Generator" rather than an "AI Marketing Assistant".
- **Recommendation**: **MERGE**
- **Priority**: **P0**
- **Reason**: Merge this copy engine into the new **AI Campaign Strategy & Batch Generation Engine** so that one business idea generates a sequence of 3–5 coordinated posts, while retaining single-post refinement inside the editor.

---

### Feature 6: AI Copy Transformations (Shorten, Viral, Professional, etc.)
- **Current implementation**: `AiCopyService.transformCopy()` implementing 5 operations: `shorten`, `viral`, `professional`, `engagement_question`, `optimize_hashtags`.
- **Current user value**: High. Gives creators 1-click power to polish text for specific channels.
- **Technical quality**: High. Deterministic and LLM-assisted transforms.
- **UX quality**: High. Clean dropdown action buttons in the Content Studio editor.
- **Duplicate functionality**: None.
- **Problems**: Only accessible when inspecting an individual post in Content Studio.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: Highly valuable post-polishing utility. Keep intact and available in the post editor.

---

### Feature 7: AI Hashtag Intelligence & Categorization
- **Current implementation**: `AiCopyService.extractHashtags()` returning tiered tags: High-Reach, Niche, Branded, and a recommended bundle.
- **Current user value**: High. Eliminates hashtag research friction.
- **Technical quality**: High. Categorizes tags based on topic detection and brand kit defaults.
- **UX quality**: Good. Modal selector with 1-click bundle insertion.
- **Duplicate functionality**: None.
- **Problems**: Does not display platform-specific hashtag limits (e.g. max 30 for Instagram vs max 2-3 for X).
- **Recommendation**: **IMPROVE**
- **Priority**: **P2**
- **Reason**: Enforce platform hashtag etiquette (e.g. recommending 3-5 for LinkedIn, 1-2 for X, 10-15 for Instagram) during campaign generation.

---

### Feature 8: Satori Dynamic Image Template Engine
- **Current implementation**: Headless JSX $\to$ SVG $\to$ PNG rendering in [`satoriTemplateEngine.ts`](file:///f:/SocialAgent/apps/api/src/services/satoriTemplateEngine.ts) via Satori and Sharp (`<200ms`).
- **Current user value**: High. Instant, programmatic branded graphic creation.
- **Technical quality**: Excellent. Multi-aspect ratio support (1:1, 4:5, 1.91:1, 9:16) with brand palette injection.
- **UX quality**: Good. Fast live SVG previewer in the frontend.
- **Duplicate functionality**: Complements Canva Studio (automated templates vs freeform canvas).
- **Problems**: Templates are currently selected manually per post rather than suggested by the campaign generator.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Have the AI Campaign Assistant automatically pair the optimal template (e.g. Quote Card for thought leadership, Stat Highlight for social proof, Announcement Banner for product launch) with each post in the campaign.

---

### Feature 9: Canva Studio (Visual Design Editor)
- **Current implementation**: [`CanvaStudioModal.tsx`](file:///f:/SocialAgent/apps/web/src/components/CanvaStudioModal.tsx) and [`CanvaStudioPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/CanvaStudioPage.tsx) in primary sidebar navigation.
- **Current user value**: Extremely High. Full creative control over graphics, banners, and carousels.
- **Technical quality**: High. Multi-layer canvas, typography controls, vector shapes, stock library, PNG export.
- **UX quality**: High. Embedded full-page layout + floating modal mode.
- **Duplicate functionality**: None.
- **Problems**: Doesn't currently link back to a specific Campaign ID when saving assets.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Allow saving Canva designs directly to a specific Campaign and attaching them to that campaign's posts.

---

### Feature 10: Reel Motion Studio (Vertical 9:16 Video Editor)
- **Current implementation**: [`ReelMotionStudioModal.tsx`](file:///f:/SocialAgent/apps/web/src/components/ReelMotionStudioModal.tsx) and [`ReelMotionStudioPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/ReelMotionStudioPage.tsx) in primary sidebar navigation.
- **Current user value**: Extremely High. Enables short-form vertical video creation for TikTok, Reels, and Shorts.
- **Technical quality**: High. Scene storyboard editor, kinetic motion captions, ambient B-roll selection, audio ducking controls.
- **UX quality**: High. Phone frame preview with live playback and tabs.
- **Duplicate functionality**: None.
- **Problems**: AI Storyboard generator currently only takes a single post's text.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Allow the AI Campaign Assistant to suggest a ready-to-render vertical Reel script as one of the stages in a product launch or promo campaign.

---

### Feature 11: Native FFmpeg Video Composition Pipeline
- **Current implementation**: [`videoComposer.ts`](file:///f:/SocialAgent/apps/worker/src/engines/video/videoComposer.ts) with dual-stream Gaussian boxblur, hardcoded ASS subtitle burning, and stereo sidechain ducking (`-12dB`).
- **Current user value**: High. High-end video output with zero third-party video SaaS API costs.
- **Technical quality**: Excellent. Robust filtergraphs, CPU stability guards (`concurrency: 2`), and static MP4/poster serving.
- **UX quality**: High. Progress indicators and static URL delivery.
- **Duplicate functionality**: None.
- **Problems**: None. Engine is rock-solid.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: Core multimedia processing engine for vertical short-form video.

---

### Feature 12: Media Asset Management & Storage
- **Current implementation**: [`mediaController.ts`](file:///f:/SocialAgent/apps/api/src/controllers/mediaController.ts) and [`MediaLibraryPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/MediaLibraryPage.tsx). Presigned S3/MinIO upload URLs and local `/uploads` disk fallback.
- **Current user value**: High. Centralized repository of brand imagery, logos, and rendered videos.
- **Technical quality**: High. Preserves metadata, aspect ratios, and dimensions.
- **UX quality**: High. Grid layout, type filter badges, upload zone, asset preview.
- **Duplicate functionality**: None.
- **Problems**: Assets are tagged by brand but cannot currently be grouped or filtered by `campaign_id`.
- **Recommendation**: **IMPROVE**
- **Priority**: **P2**
- **Reason**: Add optional `campaign_id` tagging to media assets so creators can view all media belonging to a specific campaign.

---

### Feature 13: Post & Variant Data Architecture
- **Current implementation**: Knex `posts` and `post_variants` tables. Relational 1-to-many relationship with platform-specific configs.
- **Current user value**: Critical. Foundation for multi-platform social media distribution.
- **Technical quality**: High. Composite unique constraints (`uq_post_platform_variant`), cascade deletes, indexed foreign keys.
- **UX quality**: High. Multi-platform tabs in the UI.
- **Duplicate functionality**: None.
- **Problems**: `posts.campaign_id` column already exists in MySQL schema, but is left unused in UI queries.
- **Recommendation**: **IMPROVE**
- **Priority**: **P0**
- **Reason**: Activate the existing `campaign_id` relation to organize posts into coherent campaigns.

---

### Feature 14: Content Studio (Single-Post Editor)
- **Current implementation**: [`ContentStudioPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/ContentStudioPage.tsx).
- **Current user value**: High for granular editing; weak as a campaign workflow.
- **Technical quality**: High. 2,400+ lines of robust variant handling, previews, and attachments.
- **UX quality**: Good, but cluttered with too many isolated generation modals.
- **Duplicate functionality**: Overlaps with the target Campaign Hub.
- **Problems**: Treats content creation as disconnected single posts.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Keep Content Studio as the **post-level detail editor**, while directing top-level campaign creation through the new Campaigns Hub.

---

### Feature 15: Interactive Content Calendar
- **Current implementation**: [`CalendarPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/CalendarPage.tsx). Month, Week, Day, and List views with drag-and-drop rescheduling.
- **Current user value**: High. Essential for visual scheduling and timeline management.
- **Technical quality**: High. Pure React date-math without bulky third-party calendar dependencies.
- **UX quality**: High. Color-coded platform pills, post status badges, quick-schedule popover.
- **Duplicate functionality**: None.
- **Problems**: Scheduled posts cannot currently be filtered or color-coded by Campaign.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Add a "Campaign Filter" and campaign badge to calendar cards so users can visualize an entire campaign's timeline at a glance.

---

### Feature 16: Timezone-Aware Scheduling Engine
- **Current implementation**: `schedulePost()` in [`post.controller.ts`](file:///f:/SocialAgent/apps/api/src/controllers/post.controller.ts) parsing brand local time and storing UTC timestamps.
- **Current user value**: High. Eliminates timezone confusion for global publishing.
- **Technical quality**: High. Standardized ISO-8601 UTC storage in `TIMESTAMPTZ`.
- **UX quality**: High. Clear brand timezone badge in the top navigation bar.
- **Duplicate functionality**: None.
- **Problems**: Scheduling currently happens post-by-post.
- **Recommendation**: **IMPROVE**
- **Priority**: **P0**
- **Reason**: Add **1-Click Campaign Batch Scheduling** (e.g., schedule a 5-post campaign across Mon/Wed/Fri at optimal times automatically).

---

### Feature 17: Background Job Queues & Worker Poller
- **Current implementation**: BullMQ workers for publishing, video rendering, and analytics in [`apps/worker/src/index.ts`](file:///f:/SocialAgent/apps/worker/src/index.ts) with direct MySQL polling fallback (5s interval).
- **Current user value**: High. Offloads heavy media compilation and manages delayed publishing.
- **Technical quality**: Excellent. Zero-failure local dev without requiring Redis, but production-scalable with BullMQ.
- **UX quality**: Asynchronous background operations with status polling.
- **Duplicate functionality**: None.
- **Problems**: None. Architecture is exceptionally robust.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: High-availability core worker engine.

---

### Feature 18: Social Platform Integrations & OAuth Vault
- **Current implementation**: [`socialAccount.controller.ts`](file:///f:/SocialAgent/apps/api/src/controllers/socialAccount.controller.ts) and [`SocialChannelsPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/SocialChannelsPage.tsx). AES-256-GCM token encryption at rest.
- **Current user value**: Critical. Links the platform to Instagram, X, LinkedIn, and TikTok.
- **Technical quality**: High. Hardened cryptographic key handling with IV and authentication tags.
- **UX quality**: High. Connection cards, token status, permission badges.
- **Duplicate functionality**: None.
- **Problems**: None.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: Essential foundation for real-world and sandbox social publishing.

---

### Feature 19: Social Sandbox Simulator
- **Current implementation**: [`mockSandboxAdapter.ts`](file:///f:/SocialAgent/apps/api/src/services/adapters/mockSandboxAdapter.ts). Zero-credential simulated publishing with realistic network latencies and remote URLs.
- **Current user value**: Extremely High. Allows self-serve users to experience the entire publishing and analytics workflow immediately without connecting live social APIs.
- **Technical quality**: High. Adheres strictly to the `SocialPlatformAdapter` interface.
- **UX quality**: High. 1-click sandbox account seeding.
- **Duplicate functionality**: None.
- **Problems**: None.
- **Recommendation**: **KEEP**
- **Priority**: **P0**
- **Reason**: Pivotal for self-serve onboarding and risk-free campaign testing.

---

### Feature 20: Publishing Dispatcher & Retry Policies
- **Current implementation**: `publishPostNow()` in API and `processPublishJob()` in worker. Exponential backoff retry policies.
- **Current user value**: High. Reliable post dispatching with audit trails in `publish_logs`.
- **Technical quality**: High. Error categorization and response payload archiving.
- **UX quality**: Real-time status update to `published`.
- **Duplicate functionality**: None.
- **Problems**: None.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: Core publishing pipeline.

---

### Feature 21: Collaborative Review & Client Magic Link Portal
- **Current implementation**: [`approval.controller.ts`](file:///f:/SocialAgent/apps/api/src/controllers/approval.controller.ts), [`ApprovalsPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/ApprovalsPage.tsx), and [`MagicReviewPortal.tsx`](file:///f:/SocialAgent/apps/web/src/pages/MagicReviewPortal.tsx).
- **Current user value**: Low for a single-user creator; high for future agency/team tier.
- **Technical quality**: High. 72-hour high-entropy tokens, zero-login mobile UI, structured comment threads.
- **UX quality**: High, but clutters the primary navigation for a single-user app.
- **Duplicate functionality**: None.
- **Problems**: Distracts from the self-serve single-user marketing assistant workflow.
- **Recommendation**: **MERGE / DE-PRIORITIZE IN UI**
- **Priority**: **P3**
- **Reason**: Keep all backend routes, database tables, and portal code intact, but remove "Approvals" from the primary left sidebar navigation to keep the V1 workflow streamlined.

---

### Feature 22: Analytics Engine (Time-Series, Funnels & CSV Export)
- **Current implementation**: [`analyticsController.ts`](file:///f:/SocialAgent/apps/api/src/controllers/analyticsController.ts) and [`AnalyticsPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/AnalyticsPage.tsx). 14-day daily curves, Share of Voice, format intelligence, 5-stage conversion funnel.
- **Current user value**: High. Provides clear feedback on post performance.
- **Technical quality**: High. Vector SVG charting with zero charting library dependencies, CSV export streams.
- **UX quality**: High. Modern glassmorphic KPI cards and interactive point hover cards.
- **Duplicate functionality**: None.
- **Problems**: Analytics currently reports raw numbers, but does **not provide AI insights** or suggest what to do next.
- **Recommendation**: **IMPROVE**
- **Priority**: **P1**
- **Reason**: Add an **"AI Marketing Insights"** summary card that analyzes the top-performing formats and suggests the next campaign topic/hook.

---

### Feature 23: Dashboard Command Center
- **Current implementation**: [`DashboardPage.tsx`](file:///f:/SocialAgent/apps/web/src/pages/DashboardPage.tsx).
- **Current user value**: Moderate. Shows general stats and quick action buttons.
- **Technical quality**: High. Clean state handling and quick navigation.
- **UX quality**: High. Responsive glassmorphic layout.
- **Duplicate functionality**: None.
- **Problems**: Displays isolated post counts rather than **Active Campaigns** and marketing assistant recommendations.
- **Recommendation**: **IMPROVE**
- **Priority**: **P0**
- **Reason**: Evolve into a true **AI Marketing Assistant Command Center** showing Active Campaigns, campaign progress bars (e.g. 3/5 published), and a "Start New Campaign" hero prompt.

---

### Feature 24: Dual Theme Color System (Dark & White)
- **Current implementation**: [`ThemeContext.tsx`](file:///f:/SocialAgent/apps/web/src/context/ThemeContext.tsx) and CSS tokens in [`index.css`](file:///f:/SocialAgent/apps/web/src/index.css).
- **Current user value**: High. Complete aesthetic personalization with zero eye-strain.
- **Technical quality**: High. CSS variables with smooth transitions and `localStorage` persistence.
- **UX quality**: High. Quick toggle in TopNav, Sidebar footer, and Login screen.
- **Duplicate functionality**: None.
- **Problems**: None.
- **Recommendation**: **KEEP**
- **Priority**: **P2**
- **Reason**: Delivers premium visual polish and accessibility.

---

### Feature 25: Campaign Management Hub (MISSING CORE FEATURE)
- **Current implementation**: **Does not exist in UI or API**. Only the database table `campaigns` and foreign key `posts.campaign_id` exist.
- **Current user value**: Currently zero because it is inaccessible.
- **Technical quality**: Database schema is ready (`id`, `brand_id`, `name`, `description`, `start_date`, `end_date`, `status`).
- **UX quality**: Non-existent.
- **Duplicate functionality**: None.
- **Problems**: Without this, the app cannot deliver its core promise: *"Turn one business idea into a complete social media campaign."*
- **Recommendation**: **MISSING (P0 - CRITICAL BUILD)**
- **Priority**: **P0**
- **Reason**: **The centerpiece of the application**. Must build:
  1. `campaign.controller.ts` and `/api/v1/brands/:brandId/campaigns` endpoints.
  2. `CampaignsPage.tsx` with active campaign list, status badges, and campaign detail views.
  3. One-click "New Campaign" launcher.

---

### Feature 26: AI Campaign Strategy & Narrative Arc Generator (MISSING CORE FEATURE)
- **Current implementation**: **Does not exist**. The AI engine only generates single posts from single prompts.
- **Current user value**: Currently zero.
- **Technical quality**: Needs to be built into `AiCopyService` and `promptBuilder.ts`.
- **UX quality**: Non-existent.
- **Duplicate functionality**: None.
- **Problems**: Users currently have to think of 5 separate post ideas themselves to run a campaign.
- **Recommendation**: **MISSING (P0 - CRITICAL BUILD)**
- **Priority**: **P0**
- **Reason**: **Core AI differentiation**. Takes **one business idea / goal** (e.g. *"Launch our new SPF 50 Mineral Sunscreen with a 20% discount"*) and synthesizes a **4-to-5 post strategic narrative arc**:
  - *Post 1: Problem / Teaser Hook* (Why chemical sunscreens irritate skin)
  - *Post 2: Product Reveal & Science* (Introducing 100% zinc oxide formula)
  - *Post 3: Social Proof / Trial Highlight* (98% of testers reported zero white cast)
  - *Post 4: Urgency / Launch Offer* (Code SUN20 for 20% off launch week orders)
  - With matched design suggestions and recommended posting schedule!

---

### Feature 27: Closed-Loop AI Marketing Advisor & Insights (MISSING FEATURE)
- **Current implementation**: **Does not exist**. Analytics only displays raw graphs.
- **Current user value**: Currently zero.
- **Technical quality**: Needs to be built on top of `analyticsController.ts`.
- **UX quality**: Non-existent.
- **Duplicate functionality**: None.
- **Problems**: The workflow ends at publishing. It does not complete the loop: *Analytics $\to$ AI Insights $\to$ Next Campaign*.
- **Recommendation**: **MISSING (P1 - HIGH)**
- **Priority**: **P1**
- **Reason**: Completes the feedback loop by analyzing published campaign telemetry, highlighting top-performing hooks, and suggesting the next campaign idea.

---

### Feature 28: Billing & Payment Gateway
- **Current implementation**: `subscription_tier` string field in database. No payment gateway integration.
- **Current user value**: Neutral. Allows full access without billing barriers.
- **Technical quality**: Clean schema field.
- **UX quality**: Frictionless.
- **Duplicate functionality**: None.
- **Problems**: None for V1.
- **Recommendation**: **KEEP AS INTERNAL TIER / DEFER STRIPE TO V2**
- **Priority**: **P3**
- **Reason**: As specified in the product model: *"For V1 this is a SELF-SERVE SINGLE-USER APPLICATION. Do not add unnecessary enterprise complexity."*

---

### Feature 29: Production Hardening, Security & Rate Limiting
- **Current implementation**: SSRF prevention utility ([`ssrfValidator.ts`](file:///f:/SocialAgent/apps/api/src/utils/ssrfValidator.ts)), Helmet security headers, sliding-window in-memory rate limiters (`authRateLimiter`, `generalApiRateLimiter`).
- **Current user value**: High. Protects application from abuse, brute force, and cloud metadata exploitation.
- **Technical quality**: High. 100% test pass rate in security test suite.
- **UX quality**: Transparent to legitimate users.
- **Duplicate functionality**: None.
- **Problems**: None.
- **Recommendation**: **KEEP**
- **Priority**: **P1**
- **Reason**: Essential production baseline security.

---

### Feature 30: Containerization & CI/CD Pipeline
- **Current implementation**: Multi-stage `Dockerfile.api`, `Dockerfile.worker` (with system FFmpeg), `Dockerfile.web` (with Nginx reverse proxy), `docker-compose.prod.yml`, GitHub Actions workflow (`ci.yml`).
- **Current user value**: High. 1-command deployment and automated testing.
- **Technical quality**: High. 9/9 automated verification checks passed.
- **UX quality**: Operational.
- **Duplicate functionality**: None.
- **Problems**: None.
- **Recommendation**: **KEEP**
- **Priority**: **P2**
- **Reason**: Ensures production portability and CI stability.

---

## 3. Summary Classification Table

| Feature Name | Category | Recommendation | Priority | Impact / Action |
| :--- | :---: | :---: | :---: | :--- |
| **Campaign Management Hub** | Core Journey | **MISSING** | **P0** | **Build Campaign Controller, API routes, and frontend Campaigns Page.** |
| **AI Campaign Strategy Arc Generator** | Core AI | **MISSING** | **P0** | **Build 1-Idea $\to$ Multi-Post Narrative Strategy Generator.** |
| **1-Click Campaign Batch Scheduler** | Scheduling | **IMPROVE** | **P0** | **Schedule all campaign posts across calendar in one action.** |
| **Brand Kit Governance** | Brand Context | **IMPROVE** | **P0** | **Feed brand voice directly into multi-post campaign generation.** |
| **Dashboard Command Center** | Core Journey | **IMPROVE** | **P0** | **Refocus to display Active Campaigns & Next Action recommendations.** |
| **Social Sandbox Simulator** | Publishing | **KEEP** | **P0** | **Retain zero-credential publishing simulation for risk-free testing.** |
| **AI Single-Post Copy Generator** | Content Studio | **MERGE** | **P1** | **Merge into Campaign Generator; retain in Studio for post refinement.** |
| **AI Copy Transformations** | Content Studio | **KEEP** | **P1** | **Preserve 1-click text transforms in the post editor.** |
| **Canva Studio (Design Editor)** | Creative Design | **IMPROVE** | **P1** | **Link visual design assets directly to Campaign IDs.** |
| **Reel Motion Studio (Video Editor)**| Creative Video | **IMPROVE** | **P1** | **Allow AI Campaign Assistant to suggest Reel scripts in campaigns.** |
| **Native FFmpeg 9:16 Pipeline** | Worker Engine | **KEEP** | **P1** | **Retain broadcast-grade vertical video processing.** |
| **Satori Graphic Templates Engine** | Worker Engine | **IMPROVE** | **P1** | **Auto-pair optimal template with each campaign post.** |
| **Interactive Content Calendar** | Scheduling | **IMPROVE** | **P1** | **Add Campaign Filter & visual campaign color badges.** |
| **Social Accounts & OAuth Vault** | Integrations | **KEEP** | **P1** | **Preserve AES-256 encrypted social credential vault.** |
| **Closed-Loop AI Marketing Advisor** | Analytics | **MISSING** | **P1** | **Build post-campaign analytics insights recommending next ideas.** |
| **User Authentication & JWT** | Auth & Session | **KEEP** | **P1** | **Retain bcrypt + JWT authentication cycle.** |
| **Brand Profiles & Settings** | Brand Context | **IMPROVE** | **P1** | **Add inline editing for timezone, website, and industry.** |
| **Production Security & Hardening** | Security | **KEEP** | **P1** | **Retain SSRF guards, rate limiting, and Helmet headers.** |
| **Multi-Tenant DB Architecture** | Foundation | **KEEP** | **P2** | **Keep row-level tenant boundary; treat as Personal Workspace in UI.** |
| **Dual Theme System (Dark & White)**| UI System | **KEEP** | **P2** | **Retain instant theme switcher and CSS tokens.** |
| **Media Asset Management** | Storage | **IMPROVE** | **P2** | **Add optional campaign-level tagging to media assets.** |
| **AI Hashtag Intelligence** | Content Studio | **IMPROVE** | **P2** | **Enforce platform-specific hashtag count etiquette.** |
| **Container & CI/CD Topology** | DevOps | **KEEP** | **P2** | **Retain Docker Compose stack and GitHub Actions workflow.** |
| **Client Magic Link Review Portal** | Agency Tool | **MERGE / DE-PRIORITIZE**| **P3** | **Preserve in code; remove from primary daily sidebar navigation.** |
| **Billing / Stripe Gateway** | Commercial | **KEEP AS INTERNAL**| **P3** | **Defer external payment gateway until post-V1.** |

---

## 4. Phase-by-Phase Roadmap to Deliver V1 Vision

Following the classification above, here is the non-destructive implementation sequence:

1. **Step 1 (P0 Core Backend)**: Build `campaign.controller.ts`, register `/api/v1/brands/:brandId/campaigns`, and implement `generateCampaignStrategy()` in `aiCopyService.ts`.
2. **Step 2 (P0 Core Frontend)**: Build `CampaignsPage.tsx` with the **1-Idea $\to$ Campaign Strategy Wizard** (Idea $\to$ Goal $\to$ 3–5 Post Arc $\to$ 1-Click Generate).
3. **Step 3 (P0 Dashboard Update)**: Update `DashboardPage.tsx` to highlight Active Campaigns, progress bars, and the AI Assistant quick-launch card.
4. **Step 4 (P1 Studio & Design Pairing)**: Allow attaching Canva graphics and Reel scripts to specific campaign posts.
5. **Step 5 (P1 Calendar Integration)**: Enable 1-click batch scheduling of entire campaigns with visual campaign badges on the calendar.
6. **Step 6 (P1 Closed-Loop Insights)**: Add the AI Marketing Advisor panel to `AnalyticsPage.tsx` linking performance back into the next campaign recommendation.
