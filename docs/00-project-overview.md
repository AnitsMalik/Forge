# SocialForge — Project Overview

## 1. Executive Summary

**SocialForge** is an enterprise-grade, multi-tenant AI social media platform designed for digital marketing agencies, multi-brand conglomerates, and high-velocity content creators. The platform unifies the full content lifecycle into a single, cohesive workflow:

```
[Brand Identity & Kit]
         │
         ▼
[AI Multimodal Generation (Text, Images, Short-Form Video)]
         │
         ▼
[Internal & External Client Review / Approval Engine]
         │
         ▼
[Timezone-Aware Scheduling & Resilient Dispatch]
         │
         ▼
[Cross-Platform Publishing & Performance Analytics]
```

By decoupling raw creative ideation from manual asset assembly and multi-account posting, SocialForge reduces agency content production cycles from days to minutes while enforcing brand governance and multi-tier client approvals.

---

## 2. Core Value Propositions

- **Multi-Brand Governance**: Manage dozens of distinct brands under a single agency subscription. Each brand possesses isolated brand kits (palettes, typography, logos, tone of voice, prohibited terms, and hashtags).
- **Multimodal AI Content Generation**: Leverage OpenAI with custom prompt engineering to generate platform-adapted copy, hashtag clouds, dynamic image templates, and short-form video scripts tailored to each social network's unique constraints.
- **Dynamic Asset Generation**: Built-in template rendering for visual quote cards/announcements and an automated FFmpeg video rendering engine for 9:16 short-form video content (captions, dynamic voiceover ducking, brand bumpers).
- **Zero-Friction Client Approvals**: Seamless external client collaboration through authenticated, single-use magic links without requiring client stakeholder accounts.
- **Resilient Multi-Platform Dispatch**: Asynchronous scheduling with timezone awareness, exponential backoff retries, and rate-limit mitigation across Meta (Instagram/Facebook), X (Twitter), LinkedIn, TikTok, and YouTube.
- **Sandbox Mock Simulation**: A complete local mock social network simulator that allows full end-to-end testing of scheduling, publishing, and analytics without needing live third-party developer credentials.

---

## 3. Target User Personas & Permissions

| Persona | Description | Primary Workflows |
| :--- | :--- | :--- |
| **Agency Executive / Admin** | Owner or senior operations lead managing the agency workspace. | Tenant setup, subscription management, brand creation, team assignments, global compliance. |
| **Brand Manager** | Leads social media strategy for 1 or more specific brands. | Brand Kit setup, social account OAuth connection, campaign planning, internal approval sign-off. |
| **Content Creator / Copywriter** | Generates posts, visual assets, and video content. | AI prompt generation, post composer, template rendering, submitting posts for review. |
| **Client Approver (External)** | External stakeholder / client representative. | Reviewing post drafts via magic link, requesting revisions, approving posts for publishing. |
| **Analyst / Viewer** | Stakeholder interested in performance and reporting. | Viewing content calendar, monitoring publishing status, tracking post engagement analytics. |

---

## 4. Technology Stack & Key Decisions

- **Frontend**: React 18+, TypeScript, Vite, Vanilla CSS design tokens & modular components (high aesthetic glassmorphism, responsive dark mode).
- **Backend API**: Node.js, Express, TypeScript (RESTful architecture, modular routing, JWT auth).
- **Database**: MySQL 9.x / 8.4 (`socialforge_db`, port: 3308/3306) with strict foreign keys, multi-tenant row isolation, and index optimization.
- **Queue & Async Processing**: Redis 7 + BullMQ for delayed scheduling, AI generation, and heavy media workloads.
- **Storage**: S3-compatible Object Storage (MinIO for local dev, AWS S3 / Cloudflare R2 for production) with presigned upload URLs.
- **AI Engine**: OpenAI API (GPT-4o / GPT-4o-mini) utilizing Structured JSON Outputs.
- **Image Template Rendering**: Headless SVG/HTML to image rendering using Satori + Resvg / Sharp.
- **Video Pipeline**: FFmpeg automated rendering subprocess (vertical 9:16 aspect ratio, audio mixing, subtitle burning, watermark stamping).
- **Containerization**: Docker & Docker Compose orchestrating all services and backing datastores for unified local development and production deployment.

---

## 5. Scope Boundaries & Non-Goals

### In-Scope for SocialForge:
- Multi-tenant data segregation with agency $\rightarrow$ brand hierarchy.
- Persistent brand kits driving AI prompt constraints and visual styling.
- Multi-variant post composer with live platform character counters and previews.
- Dynamic image template generation (quote cards, announcements, carousels).
- FFmpeg automated short-form video rendering with subtitle burn-in.
- Multi-tier approval state machine with magic link client portal.
- Timezone-aware scheduling engine powered by BullMQ.
- Real platform adapters (Meta, X, LinkedIn, TikTok, YouTube) + Mock Sandbox Simulator.
- Post engagement tracking and basic analytics dashboard.

### Non-Goals (Explicitly Out-of-Scope for Initial Version):
- Direct real-time Direct Message (DM) / inbox conversation management (social listening/customer support suite).
- Native mobile apps (iOS/Android native binaries; mobile responsiveness is handled via responsive web application).
- Live streaming broadcast routing (RTMP/HLS broadcast forwarding).
- Complex custom video editor UI (timeline scrubbing, multi-track cutting; video generation is template/recipe driven).
