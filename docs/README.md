# SocialForge — Documentation Index & Architecture Guide

Welcome to the **SocialForge** technical documentation library. Below is the complete index of architectural blueprints, technical specifications, and system designs.

---

## 🏛️ Flagship Architecture Documents

| Document | Description | Format |
| :--- | :--- | :--- |
| [**HLD.md**](file:///f:/SocialAgent/docs/HLD.md) | **High-Level Design (HLD) Master Specification**<br>Comprehensive C4 architectural blueprints (Context & Container), subsystem breakdown, multi-tenant isolation, entity relationship models, end-to-end dispatch sequence diagrams, and security architecture. | Master Architecture |
| [**02-system-architecture.md**](file:///f:/SocialAgent/docs/02-system-architecture.md) | System Topology, container network routing (`socialforge-net`), and data flow lifecycles. | Deep Dive |
| [**product-audit.md**](file:///f:/SocialAgent/docs/product-audit.md) | Full architectural and functional verification audit across all 10 core subsystems. | Audit Report |

---

## 📚 Technical Specification Modules

| Module File | Topic & Scope |
| :--- | :--- |
| [**00-project-overview.md**](file:///f:/SocialAgent/docs/00-project-overview.md) | Executive summary, target personas, core value propositions, and scope boundaries. |
| [**01-product-requirements.md**](file:///f:/SocialAgent/docs/01-product-requirements.md) | Product Requirements Document (PRD), user stories, and acceptance criteria. |
| [**03-database-design.md**](file:///f:/SocialAgent/docs/03-database-design.md) | MySQL 9.x/8.4 relational schema, table definitions, foreign key cascade rules, and indexing strategy. |
| [**04-api-design.md**](file:///f:/SocialAgent/docs/04-api-design.md) | RESTful API endpoint catalog, authentication schemes, request/response JSON schemas. |
| [**05-template-engine.md**](file:///f:/SocialAgent/docs/05-template-engine.md) | Headless Satori JSX-to-SVG & Sharp rendering pipeline for branded visual quotes and announcements. |
| [**06-ai-system.md**](file:///f:/SocialAgent/docs/06-ai-system.md) | OpenAI GPT-4o prompt engineering, Brand Kit voice compliance, and multi-format content synthesis. |
| [**07-video-rendering.md**](file:///f:/SocialAgent/docs/07-video-rendering.md) | Broadcast-grade native FFmpeg 9:16 vertical video compilation, ASS subtitle burn-in, and sidechain audio ducking. |
| [**08-social-integrations.md**](file:///f:/SocialAgent/docs/08-social-integrations.md) | Social network adapters: Meta Graph API (Instagram/Facebook), X (Twitter) API v2, LinkedIn UGC API, TikTok API, and Mock Sandbox. |
| [**09-security.md**](file:///f:/SocialAgent/docs/09-security.md) | Defense-in-depth: AES-256-GCM token encryption, SSRF protection for asset imports, sliding-window rate limiters, and Helmet headers. |
| [**10-testing.md**](file:///f:/SocialAgent/docs/10-testing.md) | Test automation strategy: multi-tenant isolation tests, analytics ingestion suite, and FFmpeg video pipeline verification. |
| [**11-deployment.md**](file:///f:/SocialAgent/docs/11-deployment.md) | Docker & Docker Compose production deployment guide, container matrix, and environment variable configuration. |
| [**12-development-roadmap.md**](file:///f:/SocialAgent/docs/12-development-roadmap.md) | Platform development roadmap, release phases, and future capability milestones. |
