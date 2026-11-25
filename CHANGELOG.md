# SocialForge Platform Changelog

All notable changes to the SocialForge multi-brand AI social media platform will be documented in this file.

## [6.9.5] - 2026-10-27

### Final Pre-Launch Audit & Production Hardening
- **Public Legal & Operational Pages**:
  - Implemented dedicated [TermsPage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/TermsPage.tsx) featuring SaaS service agreements, autonomy levels (L0–L5), IP ownership, and 14-day trial policies.
  - Implemented dedicated [PrivacyPage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/PrivacyPage.tsx) featuring GDPR/CCPA disclosures, zero-trust AES-256-GCM token storage guarantees, and subprocessor transparency.
  - Implemented dedicated [ContactPage.tsx](file:///f:/SocialAgent/apps/web/src/pages/public/ContactPage.tsx) featuring direct enterprise support routing, incident SLA tiers, and operational status links.
  - Wired routes into [App.tsx](file:///f:/SocialAgent/apps/web/src/App.tsx) and updated [PublicFooter.tsx](file:///f:/SocialAgent/apps/web/src/components/public/PublicFooter.tsx).
- **Security & Rate-Limiting Hardening**:
  - Hardened in-memory sliding-window auth limiter to 20 attempts / 15-min window with automated HTTP 429 backoff headers.
  - Added timezone tolerance in Superadmin Operations to prevent local vs MySQL UTC offset filtering of active rate limits.
  - Expanded WORM Audit Vault simulation ceiling to 250,000 records to support enterprise ledger volume without HTTP 413 exceptions.
- **Verification & Invariant Preservation**:
  - 14 test suites and 762 individual checks executed and verified passing (100% success rate).
  - Production Meta post variant `bc2051b1-a44a-4a97-8acd-1f3125c70164` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1` strictly preserved in `published` status.

---

## [6.9.4] - 2026-10-23

### Superadmin Operations & Diagnostic Fleet Interface Modernization
- **Zero Browser-Native Dialog Guarantee**:
  - Completely eradicated 100% of browser-native `alert()`, `confirm()`, and `prompt()` dialogs across the entire web application (`apps/web/src`).
- **Reusable Accessible Dialog Infrastructure**:
  - Created [ConfirmDialogModal](file:///f:/SocialAgent/apps/web/src/components/superadmin/ConfirmDialogModal.tsx): Accessible, glassmorphic modal supporting danger/warning/primary variants, consequence explanations, loading spinners, and keyboard (`Escape`)/backdrop dismissal.
  - Created [PromptDialogModal](file:///f:/SocialAgent/apps/web/src/components/superadmin/PromptDialogModal.tsx): Interactive justification capture modal with live character-count validation and disabled-button loading states for sensitive DLQ purges.
- **Superadmin Operations & Diagnostic Fleet Modernization**:
  - Modernized [SuperadminOperationsPage](file:///f:/SocialAgent/apps/web/src/components/SuperadminOperationsPage.tsx): Replaced 60 blocking alerts with glassmorphic toast notifications, replaced DLQ prompt with `PromptDialogModal`, and replaced 7 destructive operations (webhooks, SSO, SCIM token revocation/rotation, SIEM, DLP policies, custom roles) with `ConfirmDialogModal`.
  - Modernized 13 Diagnostic Fleet tabs: Agent Fleet, Chaos Engineering, Custom Domains, Database Archival, Event Mesh, Replication Mesh, Revenue Intelligence, FinOps, Continuous Compliance, API Gateway, Knowledge Graph, JIT Access, and Edge Cache.
  - Extended parity across `TeamPage`, `MediaLibraryPage`, `CalendarPage`, and `ReelMotionStudioModal`.
- **Quality Verification & Invariant Proofs**:
  - Production build: `tsc && vite build` built cleanly in 9.79s with 0 errors.
  - Integration Journey Suite: 27 / 27 tests passed (100% success).
  - Production Meta Lock Invariants: Variant `bc2051b1-a44a-4a97-8acd-1f3125c70164` and job `256cf21a-26cd-4032-a7b8-17261d8a81b1` verified locked in `published` status.

---

## [6.9.3] - 2026-10-23

### In-App Navigation Architecture & Operational Dashboard Polish
- **Sidebar Information Architecture & Grouping (`apps/web/src/components/Sidebar.tsx`)**:
  - Reorganized flat 18-item navigation list into 4 distinct functional domains:
    1. *Workspace*: Dashboard, Campaigns, Content Calendar, Analytics & KPIs.
    2. *Creative Suite*: Content Studio, AI Design Studio, Reel Studio, Brand Brain, Media & Graphics, Template Engine.
    3. *Automation & Data*: Growth Agent, Automations, Connect Hub, Marketing Data, Approvals & Magic Links.
    4. *Settings & Team*: Settings → Billing, Team & Members, plus conditional Superadmin Ops & Revenue.
  - Added clean uppercase category headers with proper hierarchy in expanded mode.
  - Implemented vertical scroll handling (`overflow-y: auto`) to eliminate item clipping on lower viewport heights.
  - Added subtle horizontal dividers between groups in collapsed sidebar mode with flyout tooltips intact.
- **Operational Dashboard Command Center (`apps/web/src/pages/DashboardPage.tsx`)**:
  - Replaced static placeholder numbers with live operational metrics computed directly from MySQL database and active brand context:
    - *Connected Channels*: Live connected profiles from `api.socialAccounts.list(activeBrand.id)`.
    - *Client Review Queue*: Active count of pending draft reviews (`in_review`).
    - *Scheduled Queue*: In-flight posts queue + active multi-post campaign arcs.
    - *Published Posts*: Total published social posts with verified reach metrics.
  - Added dynamic "Action Required" notification banner when client drafts await review or when brand channels need initial connection.
  - Added primary `"Create Post"` CTA linking directly to Content Studio alongside secondary campaign and design tools.
  - Enriched right-hand dashboard sidebar with a live *Connected Social Channels* widget showing platform pills, account handles, and active health dots alongside the *Brand Brain Kit* summary.
- **Regression & Quality Verification**:
  - Web client production build (`tsc && vite build`): **0 errors (built in 20.42s)**.
  - Playwright browser E2E test suite: **7 / 7 tests passed (100% in 14.9s)**.
  - Visitor Commercial Journey: **38 / 38 checks passed (100%)**.
  - Production smoke test: **17 / 17 checks passed (100%)**.
  - Production Meta lock invariants: 2 / 2 verified strictly intact in `published` status.

---

## [6.9.2] - 2026-10-23

### AI Social Marketing Agent Page Redesign & Streamlining
- **Streamlined Hero & Product Preview**:
  - Concise heading (*"Meet Your AI Social Marketing Agent"*) with subtle gradient accents and updated value proposition.
  - Actionable conversion CTAs: *"Get Started Free"* (links to `/register`) and *"Explore How It Works"* (smooth-scrolls to `#workflow`).
  - Integrated theme-adaptive workspace preview card highlighting active agent status, Brand Kit context (*Apex Sustainable Living*), *L3 Supervised Autonomy*, and human review portals.
- **Consolidated 4-Card Feature Section (2x2 Grid)**:
  - Replaced eight verbose sections with one unified section (*"Everything Your Social Marketing Workflow Needs"*).
  - Responsive two-column grid on desktop featuring:
    1. *AI Content Creation* (platform-specific content generation with brand guidelines).
    2. *Campaign Planning & Scheduling* (omnichannel campaign organization and delayed BullMQ queues).
    3. *Brand & Creative Tools* (consistent social assets using Satori & Sharp dynamic templates).
    4. *Analytics & Optimization* (performance monitoring, winning copy detection, and closed-loop feedback).
- **Simplified 4-Stage Interactive Workflow**:
  - Re-architected into 4 intuitive stages: *Connect* $\to$ *Generate* $\to$ *Review* $\to$ *Publish & Measure*.
  - Accessible tabbed navigation with previous/next controls and state preview.
  - Optional *Show Technical Payload* toggle providing on-demand JSON inspection while keeping the primary interface clean.
- **Security & Human Oversight Governance**:
  - Four verified enterprise trust categories: *Access Control*, *Credential Protection*, *Human Approval*, and *Auditability*.
- **Optimized 5-Question FAQ Accordion**:
  - Reduced visible accordion to 5 primary questions covering agent capabilities, supported platforms, human review mandate, data sources, and AES-256-GCM encryption.
- **Final Conversion CTA**:
  - Added compact pre-footer section (*"Ready to Simplify Your Social Marketing?"*) with dual buttons for trial registration and pricing tiers.
- **Regression & Quality Verification**:
  - Full individual HLD regression suite: **4,254 / 4,254 assertions passed (100% in 71.94s)** across all 61 stages.
  - Playwright browser E2E test suite: **7 / 7 tests passed (100% in 12.0s)**.
  - Production Meta lock invariants: 2 / 2 verified strictly intact in `published` status.

---

## [6.9.1] - 2026-10-22

### Minimalist SaaS Homepage Redesign & Public Suite Alignment
- **Homepage Redesign**:
  - Re-architected the homepage into a focused, conversion-driven 5-section layout (Hero, 6 Core Features, 3-Step Workflow, AI Agent Showcase, and Final CTA with Compact Trust Strip).
  - Streamlined hero copy to headline and supporting text with subtle purple-to-blue gradient accents.
  - Removed dense Content Studio preview per user direction, providing a spacious and minimal layout.
  - Consolidated disparate problem/solution matrices and 10 capability badges into 6 essential feature cards (*AI Content Creation*, *Social Account Management*, *Smart Scheduling*, *Brand & Template Tools*, *Analytics & Insights*, *Marketing Automation*).
  - Simplified the 8-step pipeline into a 3-step timeline (*Connect*, *Create*, *Publish & Optimize*).
  - Integrated compact 4-item trust strip (*Human approval workflows*, *Secure account connections*, *Access controls*, *Privacy and data protection*).
- **Public Marketing Suite Polish**:
  - Aligned `/pricing`, `/social-agent`, and `/resources` with the unified design token system and compact trust strips.
  - Refined top navigation into four primary routes (*Features*, *Product*, *Pricing*, *Resources*) and compact 4-column footer (*Product*, *Solutions*, *Resources*, *Company*).
- **Platform Verification & Invariant Certification**:
  - Executed all 61 individual regression suites: **4,252 / 4,252 assertions passed (100% in 49.24s)**.
  - Playwright browser E2E tests: 7/7 passed on Chromium (100%).
  - Visitor-to-Customer commercial journey: 38/38 checks passed (100%).
  - CI/CD production smoke tests: 17/17 checks passed (100%).
  - Production packaging and Docker orchestration: 15/15 and 18/18 checks passed (100%).
  - Production Meta post variant (`1405588742634526_122100337179498315`) and job (`256cf21a-26cd-4032-a7b8-17261d8a81b1`) strictly verified intact in `published` status.

---

## [6.9.0] - 2026-10-22

### Public Marketing Website & Full Funnel Release
- **Public Marketing Website Implementation**:
  - Built high-performance, dark-mode first public marketing pages inspired by modern AI product designs (ChatGPT, Gemini):
    - **Home (`/`)**: Hero with interactive Content Studio preview, Problem/Solution matrix, 10 platform capability cards, 8-stage visual workflow pipeline.
    - **Pricing (`/pricing`)**: Sourced directly from live database commercial tiers ($29 Starter, $79 Growth, $249 Agency Pro, $599 Scale), monthly/annual toggle (20% discount), comparison matrix, and 7 Stripe billing FAQs.
    - **Social Agent (`/social-agent`)**: Technical deep-dive across Sections A through L (Ingestion, AI Generation, Campaigns, Automation Rules, Satori Templates, 72h Magic Review Governance, Meta Publishing, Security Vault, and interactive workflow stepper).
    - **Resources (`/resources`)**: Searchable knowledge hub with setup guides, category filters, and live operational status integration.
- **TopNav & Sidebar Layout Polish**:
  - Integrated header profile trigger with glassmorphic dropdown card containing user profile, workspace switcher, and sign-out controls.
  - Streamlined sidebar by removing redundant workspace container.
- **Dynamic SEO & Social Sharing (OpenGraph)**:
  - Added rich OpenGraph and Twitter Card metadata in `apps/web/index.html`.
  - Implemented `usePageMeta` hook for dynamic route titles and canonical tags.
- **AI Token Tracking & Metering Integration**:
  - Remediated token accounting in `AiCopyController`, recording real-time AI token usage into `tenant_usage_counters` upon content synthesis.
  - Updated Pricing page to display intuitive "AI Generations / Credits" alongside exact token capacities.
- **Automated Visitor-to-Customer Journey**:
  - Created `scripts/test_visitor_to_customer_journey.mjs` verifying discovery $\to$ registration $\to$ brand onboarding $\to$ AI post generation $\to$ campaign flight activation $\to$ tenant isolation $\to$ Meta lock invariant (38/38 checks passed).
- **Security Hardening**:
  - Patched critical `shell-quote` vulnerability via `npm audit fix`.
  - Re-verified AES-256-GCM envelope encryption for all social connection credentials.
- **Full Platform Regression Pass**:
  - Executed all 59 individual stage suites (`npm run test:regression`) with **4,207 / 4,207 assertions passing (100%)** in 51.80s.
  - Production Meta Post (`1405588742634526_122100337179498315`) and Job (`256cf21a-26cd-4032-a7b8-17261d8a81b1`) verified locked in `published`.

---

## [6.8.0] - 2026-10-21

### Distributed Systems, Sharding & 2PC Mesh Milestone (Phase 50)
- Implemented cross-region database sharding with 32 virtual vnodes and consistent hashing.
- Integrated Two-Phase Commit (2PC) distributed coordinator supporting prepare/commit transactions across regional shards.
- Added autonomous live data rebalancing drills and Superadmin Operations Hub tab.
- Reached 50/50 roadmap milestones completed.

---

## [3.0.0] - 2026-10-20

### Commercial SaaS Multi-Tenancy & Stripe Billing Platform
- Integrated Stripe billing provider abstraction with idempotent webhook handlers.
- Built multi-dimensional usage tracking (`posts_published`, `ai_tokens_consumed`, `video_render_seconds`, `storage_bytes_used`).
- Implemented PlanGuard middleware enforcing HTTP 403 `PLAN_LIMIT_EXCEEDED` across all resource tiers.
- Delivered zero-data-loss subscription downgrade policy and automated 5-day dunning grace period.

---

## [1.0.0] - 2026-10-18

### Initial MVP Release
- Multi-tenant brand governance with Brand Kit (colors, typography, tone of voice, taboo words).
- BullMQ queue infrastructure with OpenAI structured copy generation.
- Dynamic Satori + Resvg/Sharp image template rendering engine.
- 72-hour high-entropy magic link client review portal.
- Timezone-aware calendar scheduling and Meta Graph API adapter.
