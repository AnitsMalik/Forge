import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Check,
  Minus,
  Plus,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Loader2,
  Sparkles,
  ChevronsDownUp,
  ChevronsUpDown,
  Filter,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  HOASPFORGE_PLANS,
  type SubscriptionPlan,
} from '@socialforge/shared';
import './PlanCompareTable.css';

export interface PlanCompareTableProps {
  plans?: (SubscriptionPlan & {
    annualPrice?: number | null;
    annualMonthlyEquivalent?: number | null;
    recommended?: boolean;
  })[];
  currentPlanId?: string;
  isAnnual?: boolean;
  onSelectPlan?: (planId: string, actionType: 'upgrade' | 'downgrade') => void;
  isTenantAdmin?: boolean;
  actionLoading?: string | null;
  isPublic?: boolean;
}

interface CapabilityItem {
  name: string;
  description: string;
  free?: boolean | string;
  starter: boolean | string;
  professional?: boolean | string;
  growth: boolean | string;
  business?: boolean | string;
  agency: boolean | string;
  scale: boolean | string;
  enterprise?: boolean | string;
  isLimitedOnStarter?: boolean;
  status?: string;
  [key: string]: any;
}

interface CategoryGroup {
  id: string;
  code: string;
  category: string;
  summary: string;
  features: CapabilityItem[];
}

// Helper to build the 13 structured categories (A through M) using live catalog limits when available
function buildStructuredCategories(
  livePlansById: Record<string, SubscriptionPlan & { features?: Record<string, any> }>
): CategoryGroup[] {
  const freePlan = livePlansById['free'];
  const starterPlan = livePlansById['starter'];
  const professionalPlan = livePlansById['professional'] || livePlansById['growth'];
  const businessPlan = livePlansById['business'] || livePlansById['agency'];
  const enterprisePlan = livePlansById['enterprise'] || livePlansById['scale'];
  const growthPlan = livePlansById['growth'] || professionalPlan;
  const agencyPlan = livePlansById['agency'] || businessPlan;
  const scalePlan = livePlansById['scale'] || enterprisePlan;

  const fmtStorage = (bytes?: number, fallback?: string) =>
    bytes ? `${Math.round(Number(bytes) / (1024 * 1024 * 1024))} GB` : fallback || 'Included';
  const fmtTokens = (tokens?: number, fallback?: string) =>
    tokens
      ? `${Math.round(Number(tokens) / 500).toLocaleString()} Gens (${Math.round(Number(tokens) / 1000).toLocaleString()}K Tokens)`
      : fallback || 'Included';
  const fmtVideo = (secs?: number, fallback?: string) =>
    secs ? `${Math.round(Number(secs) / 60)} mins / mo` : fallback || 'Included';

  return [
    {
      id: 'cat-0-subscription-quotas',
      code: '★',
      category: 'Subscription Quotas & Entitlement Limits',
      summary: 'Centralized quotas for accounts, posts, AI generation, media storage, campaigns & team members',
      features: [
        {
          name: 'Social Media Accounts',
          description: 'Maximum connected social profiles across Instagram, Facebook, LinkedIn, X, TikTok, YouTube, and Pinterest.',
          free: `${freePlan?.maxSocialAccounts ?? 2} Accounts`,
          starter: `${starterPlan?.maxSocialAccounts ?? 5} Accounts`,
          professional: `${professionalPlan?.maxSocialAccounts ?? 15} Accounts`,
          growth: `${growthPlan?.maxSocialAccounts ?? 15} Accounts`,
          business: `${businessPlan?.maxSocialAccounts ?? 50} Accounts`,
          agency: `${agencyPlan?.maxSocialAccounts ?? 50} Accounts`,
          scale: `${(scalePlan?.maxSocialAccounts ?? 250).toLocaleString()} Accounts`,
          enterprise: (enterprisePlan?.maxSocialAccounts ?? 999999) >= 9999 ? 'Unlimited Accounts' : `${enterprisePlan?.maxSocialAccounts} Accounts`,
        },
        {
          name: 'Monthly Posts Limit',
          description: 'Monthly post publishing quota across all connected channels with automated dispatch.',
          free: `${(freePlan?.maxPostsPerMonth ?? 20).toLocaleString()} Posts / mo`,
          starter: `${(starterPlan?.maxPostsPerMonth ?? 150).toLocaleString()} Posts / mo`,
          professional: `${(professionalPlan?.maxPostsPerMonth ?? 600).toLocaleString()} Posts / mo`,
          growth: `${(growthPlan?.maxPostsPerMonth ?? 600).toLocaleString()} Posts / mo`,
          business: `${(businessPlan?.maxPostsPerMonth ?? 2500).toLocaleString()} Posts / mo`,
          agency: `${(agencyPlan?.maxPostsPerMonth ?? 2500).toLocaleString()} Posts / mo`,
          scale: `${(scalePlan?.maxPostsPerMonth ?? 10000).toLocaleString()} Posts / mo`,
          enterprise: (enterprisePlan?.maxPostsPerMonth ?? 999999) >= 9999 ? 'Unlimited Posts' : `${enterprisePlan?.maxPostsPerMonth} Posts / mo`,
        },
        {
          name: 'AI Content Generations',
          description: 'Monthly AI copy, caption, and thread generation credits with multi-model intelligence.',
          free: `${(freePlan?.maxAiContent ?? 25).toLocaleString()} Gens / mo`,
          starter: `${(starterPlan?.maxAiContent ?? 250).toLocaleString()} Gens / mo`,
          professional: `${(professionalPlan?.maxAiContent ?? 1000).toLocaleString()} Gens / mo`,
          growth: `${(growthPlan?.maxAiContent ?? 1000).toLocaleString()} Gens / mo`,
          business: `${(businessPlan?.maxAiContent ?? 5000).toLocaleString()} Gens / mo`,
          agency: `${(agencyPlan?.maxAiContent ?? 5000).toLocaleString()} Gens / mo`,
          scale: `${(scalePlan?.maxAiContent ?? 10000).toLocaleString()} Gens / mo`,
          enterprise: (enterprisePlan?.maxAiContent ?? 999999) >= 9999 ? 'Unlimited Generations' : `${enterprisePlan?.maxAiContent} Gens / mo`,
        },
        {
          name: 'AI Image Generations',
          description: 'Generative AI image generation and enhancement powered by Imagen and FLUX models.',
          free: `${(freePlan?.maxAiImages ?? 5).toLocaleString()} Images / mo`,
          starter: `${(starterPlan?.maxAiImages ?? 50).toLocaleString()} Images / mo`,
          professional: `${(professionalPlan?.maxAiImages ?? 250).toLocaleString()} Images / mo`,
          growth: `${(growthPlan?.maxAiImages ?? 250).toLocaleString()} Images / mo`,
          business: `${(businessPlan?.maxAiImages ?? 1000).toLocaleString()} Images / mo`,
          agency: `${(agencyPlan?.maxAiImages ?? 1000).toLocaleString()} Images / mo`,
          scale: `${(scalePlan?.maxAiImages ?? 2000).toLocaleString()} Images / mo`,
          enterprise: (enterprisePlan?.maxAiImages ?? 999999) >= 9999 ? 'Unlimited Images' : `${enterprisePlan?.maxAiImages} Images / mo`,
        },
        {
          name: 'AI Video Generations',
          description: 'Serverless AI video, Reel, and Short rendering with dynamic caption burn-in.',
          free: `${(freePlan?.maxAiVideos ?? 1).toLocaleString()} Videos / mo`,
          starter: `${(starterPlan?.maxAiVideos ?? 10).toLocaleString()} Videos / mo`,
          professional: `${(professionalPlan?.maxAiVideos ?? 30).toLocaleString()} Videos / mo`,
          growth: `${(growthPlan?.maxAiVideos ?? 30).toLocaleString()} Videos / mo`,
          business: `${(businessPlan?.maxAiVideos ?? 100).toLocaleString()} Videos / mo`,
          agency: `${(agencyPlan?.maxAiVideos ?? 100).toLocaleString()} Videos / mo`,
          scale: `${(scalePlan?.maxAiVideos ?? 200).toLocaleString()} Videos / mo`,
          enterprise: (enterprisePlan?.maxAiVideos ?? 999999) >= 9999 ? 'Unlimited Videos' : `${enterprisePlan?.maxAiVideos} Videos / mo`,
        },
        {
          name: 'Media Storage',
          description: 'High-speed cloud asset storage for video files, high-res graphics, and brand assets.',
          free: fmtStorage(freePlan?.storageBytesLimit, '1 GB'),
          starter: fmtStorage(starterPlan?.storageBytesLimit, '10 GB'),
          professional: fmtStorage(professionalPlan?.storageBytesLimit, '50 GB'),
          growth: fmtStorage(growthPlan?.storageBytesLimit, '50 GB'),
          business: fmtStorage(businessPlan?.storageBytesLimit, '200 GB'),
          agency: fmtStorage(agencyPlan?.storageBytesLimit, '200 GB'),
          scale: fmtStorage(scalePlan?.storageBytesLimit, '500 GB'),
          enterprise: (enterprisePlan?.storageBytesLimit ?? 0) >= 1000000000000 ? '1 TB Dedicated' : fmtStorage(enterprisePlan?.storageBytesLimit, '1 TB Dedicated'),
        },
        {
          name: 'Team Members / Seats',
          description: 'Collaborator seats with customizable role-based access control (Admin, Creator, Approver).',
          free: `${freePlan?.maxUsers ?? 1} Seat`,
          starter: `${starterPlan?.maxUsers ?? 3} Seats`,
          professional: `${professionalPlan?.maxUsers ?? 10} Seats`,
          growth: `${growthPlan?.maxUsers ?? 10} Seats`,
          business: `${businessPlan?.maxUsers ?? 25} Seats`,
          agency: `${agencyPlan?.maxUsers ?? 25} Seats`,
          scale: `${(scalePlan?.maxUsers ?? 50).toLocaleString()} Seats`,
          enterprise: (enterprisePlan?.maxUsers ?? 999999) >= 9999 ? 'Unlimited Seats' : `${enterprisePlan?.maxUsers} Seats`,
        },
        {
          name: 'Active Marketing Campaigns',
          description: 'Simultaneously running marketing campaigns with real-time KPI tracking.',
          free: `${freePlan?.maxActiveCampaigns ?? 1} Campaign`,
          starter: `${starterPlan?.maxActiveCampaigns ?? 5} Campaigns`,
          professional: `${professionalPlan?.maxActiveCampaigns ?? 20} Campaigns`,
          growth: `${growthPlan?.maxActiveCampaigns ?? 20} Campaigns`,
          business: `${businessPlan?.maxActiveCampaigns ?? 100} Campaigns`,
          agency: `${agencyPlan?.maxActiveCampaigns ?? 100} Campaigns`,
          scale: `${(scalePlan?.maxActiveCampaigns ?? 200).toLocaleString()} Campaigns`,
          enterprise: (enterprisePlan?.maxActiveCampaigns ?? 999999) >= 9999 ? 'Unlimited Campaigns' : `${enterprisePlan?.maxActiveCampaigns} Campaigns`,
        },
        {
          name: 'Scheduled Posts Queue',
          description: 'Maximum posts in scheduled waiting state across all calendars.',
          free: `${freePlan?.maxScheduledPosts ?? 10} Scheduled`,
          starter: `${starterPlan?.maxScheduledPosts ?? 100} Scheduled`,
          professional: `${professionalPlan?.maxScheduledPosts ?? 500} Scheduled`,
          growth: `${growthPlan?.maxScheduledPosts ?? 500} Scheduled`,
          business: `${businessPlan?.maxScheduledPosts ?? 2500} Scheduled`,
          agency: `${agencyPlan?.maxScheduledPosts ?? 2500} Scheduled`,
          scale: `${(scalePlan?.maxScheduledPosts ?? 5000).toLocaleString()} Scheduled`,
          enterprise: (enterprisePlan?.maxScheduledPosts ?? 999999) >= 9999 ? 'Unlimited Queue' : `${enterprisePlan?.maxScheduledPosts} Scheduled`,
        },
      ],
    },
    {
      id: 'cat-a-workspace-brand',
      code: 'A',
      category: 'A. Workspace & Brand Management',
      summary: 'Workspaces, Brands, Brand Kits, Brand Voice & Knowledge Graph',
      features: [
        {
          name: 'Workspaces',
          description: 'Dedicated multi-brand tenant workspaces with isolated billing, team permissions, and security boundaries.',
          starter: '1 Workspace',
          growth: '1 Workspace',
          agency: 'Multi-Client Agency Workspaces',
          scale: 'Unlimited Enterprise Workspaces',
          enterprise: 'Dedicated VPC Workspaces',
        },
        {
          name: 'Brands',
          description: 'Independent client or brand environments with isolated social channels, content calendars, and analytics.',
          starter: `${starterPlan?.maxBrands ?? 1} Brand`,
          growth: `${growthPlan?.maxBrands ?? 5} Brands`,
          agency: `${agencyPlan?.maxBrands ?? 25} Brands`,
          scale: `${scalePlan?.maxBrands ?? 100} Brands`,
          enterprise: 'Unlimited Custom',
        },
        {
          name: 'Brand Kits',
          description: 'Store primary/secondary/accent hex palettes, logos, typography pairings, and visual watermark assets per brand.',
          starter: '1 Brand Kit',
          growth: '5 Brand Kits',
          agency: '25 Brand Kits + White-Label',
          scale: '100 Brand Kits + Custom Fonts',
          enterprise: 'Unlimited + Asset Governance',
        },
        {
          name: 'Brand Voice',
          description: 'Configure AI tone of voice, communication personas, default hashtags, preferred languages, and negative guardrails.',
          starter: 'Standard Voice Presets',
          growth: 'Custom Persona & Guardrails',
          agency: 'Multi-Brand Neural Voice Graph',
          scale: 'Full Neural Knowledge Graph',
          enterprise: 'Custom Fine-Tuned LLM Voice',
        },
        {
          name: 'AI Website Brand Auto-Extractor',
          description: 'Automatically crawl your website URL to extract brand colors, positioning, audience, and tone suggestions.',
          starter: true,
          growth: true,
          agency: true,
          scale: true,
          enterprise: true,
        },
      ],
    },
    {
      id: 'cat-b-social-media',
      code: 'B',
      category: 'B. Social Media Management',
      summary: 'Social Accounts, Publishing, Scheduling & Post Management',
      features: [
        {
          name: 'Social Accounts',
          description: 'Direct OAuth connections across Instagram, Facebook, LinkedIn, X (Twitter), TikTok, and YouTube.',
          starter: `${starterPlan?.maxSocialAccounts ?? 3} Social Accounts`,
          growth: `${growthPlan?.maxSocialAccounts ?? 15} Social Accounts`,
          agency: `${agencyPlan?.maxSocialAccounts ?? 100} Social Accounts`,
          scale: `${scalePlan?.maxSocialAccounts ?? 250} Social Accounts`,
          enterprise: 'Unlimited Accounts',
        },
        {
          name: 'Publishing',
          description: 'Direct multi-network API publishing for single images, carousels, vertical reels/shorts, and long-form posts.',
          starter: `${(starterPlan?.maxPostsPerMonth ?? 100).toLocaleString()} Posts / mo`,
          growth: `${(growthPlan?.maxPostsPerMonth ?? 500).toLocaleString()} Posts / mo`,
          agency: `${(agencyPlan?.maxPostsPerMonth ?? 2500).toLocaleString()} Posts / mo`,
          scale: `${(scalePlan?.maxPostsPerMonth ?? 10000).toLocaleString()} Posts / mo`,
          enterprise: 'Unlimited High-Throughput',
        },
        {
          name: 'Scheduling',
          description: 'Visual drag-and-drop editorial calendar with time-zone aware BullMQ dispatch and best-time-to-post recommendations.',
          starter: 'Standard Queue & Calendar',
          growth: 'Smart Best-Time Scheduling',
          agency: 'Priority Agency Queue + Bulk CSV',
          scale: 'High-Frequency Priority Dispatcher',
          enterprise: 'Dedicated Queue Workers',
        },
        {
          name: 'Post Management',
          description: 'Draft versioning, platform character/aspect-ratio validation, first-comment scheduling, and post recycling.',
          starter: 'Core Drafts & Previews',
          growth: 'Auto-Recycling & First Comment',
          agency: 'Cross-Brand Post Cloning & Tagging',
          scale: 'Full Lifecycle & Archival Vault',
          enterprise: 'WORM Compliance Archival',
        },
        {
          name: 'OAuth Token Health & Auto-Refresh',
          description: 'Proactive token expiration monitoring with automated background token refresh and instant alert banners.',
          starter: true,
          growth: true,
          agency: true,
          scale: true,
          enterprise: true,
        },
      ],
    },
    {
      id: 'cat-c-content-studio',
      code: 'C',
      category: 'C. Content Studio',
      summary: 'AI Content Generation, Content Templates, Design Studio, Video & Reels, Media Library',
      features: [
        {
          name: 'AI Content Generation',
          description: 'Multi-platform AI copywriting for captions, hooks, threads, CTAs, and platform-tailored variations.',
          starter: true,
          growth: true,
          agency: true,
          scale: true,
          enterprise: true,
        },
        {
          name: 'Content Templates',
          description: 'Curated multi-industry post and visual templates with version history and 1-click brand kit application.',
          starter: '50+ Core Templates',
          growth: '300+ Industry Templates',
          agency: '1,000+ Templates + Custom Vault',
          scale: 'Unlimited Custom Brand Templates',
          enterprise: 'Bespoke Design Systems',
        },
        {
          name: 'Design Studio',
          description: 'Canva-grade multi-layer vector and image canvas editor with 12 shape generators and collision-free typography.',
          starter: 'Basic Canvas Studio',
          growth: 'Full AI Studio + 12 Vector Gens',
          agency: 'Full AI Studio + Brand Lock',
          scale: 'Full AI Studio + Batch Resize',
          enterprise: 'Custom SVG & Font Engine',
        },
        {
          name: 'Video & Reels',
          description: 'Serverless FFmpeg & GPU short-form video rendering, Whisper auto-subtitles, and 9:16 / 1:1 / 16:9 re-framing.',
          starter: fmtVideo(starterPlan?.videoRenderSecondsMonthly, '5 mins / mo'),
          growth: fmtVideo(growthPlan?.videoRenderSecondsMonthly, '20 mins / mo'),
          agency: fmtVideo(agencyPlan?.videoRenderSecondsMonthly, '60 mins / mo'),
          scale: fmtVideo(scalePlan?.videoRenderSecondsMonthly, '300 mins / mo'),
          enterprise: 'Dedicated GPU Render Farm',
        },
        {
          name: 'Media Library',
          description: 'Encrypted S3/MinIO cloud storage with global CDN delivery, folder organization, and AI visual tagging.',
          starter: fmtStorage(starterPlan?.storageBytesLimit, '5 GB'),
          growth: `${fmtStorage(growthPlan?.storageBytesLimit, '20 GB')} + AI Tagging`,
          agency: `${fmtStorage(agencyPlan?.storageBytesLimit, '100 GB')} + Shared Pools`,
          scale: `${fmtStorage(scalePlan?.storageBytesLimit, '500 GB')} + Global CDN`,
          enterprise: 'Multi-TB Dedicated Storage',
        },
      ],
    },
    {
      id: 'cat-d-ai-capabilities',
      code: 'D',
      category: 'D. AI Capabilities',
      summary: 'Included AI Studio, AI Marketing Assistant, AI Agents & AI Recommendations',
      features: [
        {
          name: 'AI Content Generation Studio',
          description: 'Included generative AI compute powering copy synthesis, hashtag intelligence, image prompts, and campaign ideation across all channels.',
          starter: 'Included (Essential AI Drafting)',
          growth: 'Included (Multi-Model AI Assistant)',
          agency: 'Included (Full AI Content Studio & Tone Matching)',
          scale: 'Included (Autonomous Multi-Agent Content Engine)',
          enterprise: 'Included (Custom Fine-Tuned Models & SLA)',
        },
        {
          name: 'AI Marketing Assistant',
          description: 'Interactive context-aware marketing copilot that builds 7-day calendars, drafts posts, and diagnoses KPIs.',
          starter: 'Foundational Assistant',
          growth: 'Full Marketing Copilot',
          agency: 'Multi-Brand Agency Copilot',
          scale: 'Executive Strategy Copilot',
          enterprise: 'Custom Knowledge-Grounded Copilot',
        },
        {
          name: 'AI Agents',
          description: 'Autonomous AI Growth Agent operating from L1–L2 Assisted up to L5 Fully Autonomous with safety kill-switch.',
          starter: `${starterPlan?.features?.max_autonomy_level || 'L1–L2'} Assisted`,
          growth: `Up to ${growthPlan?.features?.max_autonomy_level || 'L3'} Supervised`,
          agency: `Up to ${agencyPlan?.features?.max_autonomy_level || 'L4'} Collaborative`,
          scale: `Up to ${scalePlan?.features?.max_autonomy_level || 'L5'} Autonomous`,
          enterprise: 'Custom Multi-Agent Fleet',
        },
        {
          name: 'AI Recommendations',
          description: 'Proactive Next-Best-Action recommendations, viral hook scoring, and competitor content gap detection.',
          starter: 'Basic Next-Best-Action',
          growth: 'Trend Radar & Hook Scoring',
          agency: 'Cross-Portfolio Opportunity Engine',
          scale: 'Predictive Revenue Attribution AI',
          enterprise: 'Custom ML Forecasting',
        },
      ],
    },
    {
      id: 'cat-e-campaign-management',
      code: 'E',
      category: 'E. Campaign Management',
      summary: 'Campaign Creation, Campaign Workflows, Campaign Scheduling & Performance',
      features: [
        {
          name: 'Campaign Creation',
          description: 'Organize social posts, email broadcasts, WhatsApp templates, and ads under unified marketing objectives.',
          starter: 'Up to 3 Active Campaigns',
          growth: 'Up to 10 Active Campaigns',
          agency: '50 Active Campaigns',
          scale: '200 Active Campaigns',
          enterprise: 'Unlimited Global Campaigns',
        },
        {
          name: 'Campaign Workflows',
          description: 'Multi-stage campaign orchestration with draft, review, approved, and live execution stages.',
          starter: 'Basic Linear Workflow',
          growth: 'Multi-Channel Workflow',
          agency: 'Cross-Brand Blueprint Cloning',
          scale: 'Automated Saga Orchestration',
          enterprise: 'Custom Approval Gates',
        },
        {
          name: 'Campaign Scheduling',
          description: 'Coordinated launch windows, drip cadence timers, and automatic time-zone synchronization.',
          starter: true,
          growth: true,
          agency: true,
          scale: true,
          enterprise: true,
        },
        {
          name: 'Campaign Performance',
          description: 'Automated UTM link tagging, conversion funnel tracking, and ROI comparison across campaign waves.',
          starter: 'Basic UTM & Clicks',
          growth: 'Conversion & ROI Tracking',
          agency: 'Multi-Touch Client Attribution',
          scale: 'Full Revenue Intelligence Sync',
          enterprise: 'Custom BI Warehouse Sync',
        },
      ],
    },
    {
      id: 'cat-f-analytics-reporting',
      code: 'F',
      category: 'F. Analytics & Reporting',
      summary: 'Dashboard Analytics, Cross-Channel Analytics, Custom Reports & Exports',
      features: [
        {
          name: 'Dashboard Analytics',
          description: 'Real-time KPI telemetry for reach, engagement rate, impressions, follower velocity, and post performance.',
          starter: `${starterPlan?.features?.analytics_retention_days ?? 30}-Day History`,
          growth: `${growthPlan?.features?.analytics_retention_days ?? 90}-Day History`,
          agency: `${agencyPlan?.features?.analytics_retention_days ?? 365}-Day History`,
          scale: `${scalePlan?.features?.analytics_retention_days ?? 730}-Day History`,
          enterprise: '10-Year Cold Archival Vault',
        },
        {
          name: 'Cross-Channel Analytics',
          description: 'Normalized metric comparison across Instagram, LinkedIn, Facebook, X, TikTok, YouTube, Email, and WhatsApp.',
          starter: 'Core Channel Metrics',
          growth: 'Full Cross-Channel Normalization',
          agency: 'Multi-Brand Portfolio Rollups',
          scale: 'Sub-Second CQRS Query Federation',
          enterprise: 'Dedicated Read Replicas',
        },
        {
          name: 'Custom Reports',
          description: 'Build tailored executive scorecards filtering by date range, campaign, channel, or content pillar.',
          starter: false,
          growth: 'Standard Custom Reports',
          agency: 'White-Label Client Reports',
          scale: 'Automated Scheduled Briefings',
          enterprise: 'Custom Looker / Tableau Feeds',
        },
        {
          name: 'Export Reports',
          description: 'Export analytics tables and visual charts to branded PDF receipts, CSV spreadsheets, and executive decks.',
          starter: 'CSV Export',
          growth: 'PDF & CSV Export',
          agency: 'White-Label Branded PDF & Excel',
          scale: 'White-Label PDF, Excel & API',
          enterprise: 'Automated S3 / Snowflake Export',
        },
      ],
    },
    {
      id: 'cat-g-crm-pipeline',
      code: 'G',
      category: 'G. CRM & Pipeline',
      summary: 'Contacts, Lead Management & Pipeline Management',
      features: [
        {
          name: 'Contacts',
          description: 'Unified customer and prospect directory enriched with social handles, engagement history, and tags.',
          starter: 'Up to 500 Contacts',
          growth: 'Up to 5,000 Contacts',
          agency: 'Unlimited Contacts',
          scale: 'Unlimited + Deduplication AI',
          enterprise: 'Unlimited + Custom Objects',
        },
        {
          name: 'Lead Management',
          description: 'Capture leads from social DMs, comment triggers, landing forms, and ad campaigns with automated lead scoring.',
          starter: 'Basic Lead Capture',
          growth: 'Automated Lead Scoring & Tags',
          agency: 'Multi-Brand Lead Routing',
          scale: 'AI Propensity Scoring',
          enterprise: 'Custom Webhook Lead Ingestion',
        },
        {
          name: 'Pipeline Management',
          description: 'Visual Kanban deal stages, weighted revenue forecasting, and bi-directional HubSpot / Salesforce sync.',
          starter: '1 Deal Pipeline',
          growth: 'Multiple Pipelines + HubSpot Sync',
          agency: 'HubSpot & Salesforce 2-Way Sync',
          scale: 'Full Revenue Intelligence Suite',
          enterprise: 'Custom ERP & CRM Connectors',
        },
      ],
    },
    {
      id: 'cat-h-email-marketing',
      code: 'H',
      category: 'H. Email Marketing',
      summary: 'Email Campaigns, Email Automation & Subscriber Management',
      features: [
        {
          name: 'Email Campaigns',
          description: 'Responsive drag-and-drop HTML newsletter builder with live desktop/mobile preview and open/click tracking.',
          starter: 'Basic Broadcasts (1,000/mo)',
          growth: 'Full Studio (5,000/mo + BYO ESP)',
          agency: '25,000/mo + BYO ESP (0% Markup)',
          scale: '100,000/mo + Dedicated IP Option',
          enterprise: 'Custom High-Volume Pool',
        },
        {
          name: 'Email Automation',
          description: 'Trigger-based welcome sequences, abandoned lead follow-ups, and multi-step drip journeys.',
          starter: 'Single-Step Auto-Responder',
          growth: 'Multi-Step Drip Sequences',
          agency: 'Omnichannel Behavioral Flows',
          scale: 'Advanced Branching & A/B Splits',
          enterprise: 'Custom Transactional + Marketing',
        },
        {
          name: 'Subscriber Management',
          description: 'Dynamic audience segmentation, bounce/unsubscribe suppression lists, and GDPR/CAN-SPAM compliance.',
          starter: 'Standard Lists & Unsubscribe',
          growth: 'Dynamic Behavioral Segments',
          agency: 'Multi-Brand Suppression Vaults',
          scale: 'Real-Time Hygiene & Verification',
          enterprise: 'Custom Deliverability Concierge',
        },
      ],
    },
    {
      id: 'cat-i-whatsapp-marketing',
      code: 'I',
      category: 'I. WhatsApp Marketing',
      summary: 'WhatsApp Campaigns, Messaging & Templates',
      features: [
        {
          name: 'WhatsApp Campaigns',
          description: 'Official Meta WhatsApp Business Cloud API broadcast campaigns with delivery and read-receipt telemetry.',
          starter: false,
          growth: 'Included (Meta Cloud API)',
          agency: 'Multi-Brand WABA Management',
          scale: 'High-Throughput Broadcast Queues',
          enterprise: 'Dedicated Enterprise WABA',
        },
        {
          name: 'Messaging',
          description: 'Two-way customer conversation inbox, automated keyword responders, and session message routing.',
          starter: false,
          growth: true,
          agency: true,
          scale: true,
          enterprise: true,
        },
        {
          name: 'Templates',
          description: 'Create and manage pre-approved Meta utility, authentication, and marketing templates with interactive CTA buttons.',
          starter: false,
          growth: 'Interactive CTA & Quick Replies',
          agency: 'Multi-Language Template Library',
          scale: 'Dynamic Media & Catalog Templates',
          enterprise: 'Custom Verified Sender Flows',
        },
      ],
    },
    {
      id: 'cat-j-sms-voice',
      code: 'J',
      category: 'J. SMS & Voice',
      summary: 'SMS Campaigns & Voice Campaigns',
      features: [
        {
          name: 'SMS Campaigns',
          description: 'A2P 10DLC compliant promotional and transactional text broadcasts via Twilio with automatic STOP opt-out handling.',
          starter: 'BYO Twilio Key',
          growth: 'Included 100 Messages + BYO Twilio',
          agency: 'Included 1,000 Messages + BYO Twilio',
          scale: 'Included 5,000 Messages + BYO Twilio',
          enterprise: 'Custom Shortcode & Carrier Pools',
        },
        {
          name: 'Voice Campaigns',
          description: 'Automated outbound interactive voice alerts, IVR call routing, and appointment reminders via Twilio Voice.',
          starter: false,
          growth: 'BYO Twilio Voice',
          agency: 'Included 100 Mins + BYO Twilio Voice',
          scale: 'Included 500 Mins + BYO Twilio Voice',
          enterprise: 'Custom SIP Trunking & Voice AI',
        },
      ],
    },
    {
      id: 'cat-k-team-collaboration',
      code: 'K',
      category: 'K. Team & Collaboration',
      summary: 'Team Members, User Roles, Client Approvals & Collaboration',
      features: [
        {
          name: 'Team Members',
          description: 'Included workspace user seats with individual logins, activity audit trails, and role assignments.',
          starter: `${starterPlan?.maxUsers ?? 2} Team Members`,
          growth: `${growthPlan?.maxUsers ?? 5} Team Members`,
          agency: `${agencyPlan?.maxUsers ?? 20} Team Members`,
          scale: `${scalePlan?.maxUsers ?? 50} Team Members`,
          enterprise: 'Unlimited Team Members',
        },
        {
          name: 'User Roles',
          description: 'Role-Based Access Control (RBAC) across Owner, Admin, Marketing Manager, Content Creator, and Client Approver.',
          starter: 'Standard RBAC Roles',
          growth: 'Standard RBAC Roles',
          agency: 'Granular Brand-Scoped RBAC',
          scale: 'Custom Permission Matrix',
          enterprise: 'JIT Access & Policy Engine',
        },
        {
          name: 'Client Approvals',
          description: '72-hour passwordless magic review links allowing external clients to approve or request changes without logging in.',
          starter: false,
          growth: 'Magic Approval Links',
          agency: 'Multi-Stage Client Portals',
          scale: 'Branded Approval Portals + SLA',
          enterprise: 'Cryptographic Sign-Off Ledger',
        },
        {
          name: 'Collaboration',
          description: 'Internal post comments, @mentions, real-time collaborative canvas presence, and revision history.',
          starter: 'Basic Post Notes',
          growth: 'Internal Comments & History',
          agency: 'Real-Time Multi-User Presence',
          scale: 'Full Audit Trail & Version Lock',
          enterprise: 'Enterprise Compliance Review',
        },
      ],
    },
    {
      id: 'cat-l-automations',
      code: 'L',
      category: 'L. Automations',
      summary: 'Workflow Automation, Triggers, Actions & Automation Limits',
      features: [
        {
          name: 'Workflow Automation',
          description: 'Visual event-driven automation builder connecting social publishing, CRM updates, email sequences, and webhooks.',
          starter: true,
          growth: true,
          agency: true,
          scale: true,
          enterprise: true,
        },
        {
          name: 'Triggers',
          description: 'Initiate workflows on post published, new CRM lead, webhook received, schedule timer, or engagement threshold.',
          starter: 'Core Schedule & Post Triggers',
          growth: 'Omnichannel & CRM Triggers',
          agency: 'Inbound Webhook & API Triggers',
          scale: 'High-Frequency Event Mesh',
          enterprise: 'Custom Kafka / EventBridge',
        },
        {
          name: 'Actions',
          description: 'Execute multi-step actions: publish social post, send email/WhatsApp, update lead stage, or dispatch signed HTTP webhook.',
          starter: 'Standard Single-Step Actions',
          growth: 'Multi-Step Chained Actions',
          agency: 'Cross-Brand & Webhook Actions',
          scale: 'Parallel Saga Workflow Actions',
          enterprise: 'Custom Serverless Functions',
        },
        {
          name: 'Automation Limits',
          description: 'Maximum concurrent active automation rules and bots running across your workspace.',
          starter: `${starterPlan?.features?.max_active_automations ?? 3} Active Automations`,
          growth: `${growthPlan?.features?.max_active_automations ?? 10} Active Automations`,
          agency: `${agencyPlan?.features?.max_active_automations ?? 50} Active Automations`,
          scale: `${scalePlan?.features?.max_active_automations ?? 200} Active Automations`,
          enterprise: 'Unlimited Active Automations',
        },
      ],
    },
    {
      id: 'cat-m-support-security',
      code: 'M',
      category: 'M. Support & Security',
      summary: 'Customer Support, Access Control & Security Features',
      features: [
        {
          name: 'Customer Support',
          description: 'Access to product documentation, billing specialists, priority engineering queues, and dedicated account managers.',
          starter: 'Standard Email Support',
          growth: 'Priority Email & Chat Support',
          agency: 'Priority Agency SLA Queue',
          scale: 'Dedicated Technical Account Engineer',
          enterprise: '24/7 Phone, Slack & 15-Min SLA',
        },
        {
          name: 'Access Control',
          description: 'JWT session security, 2FA/MFA enforcement, IP allowlisting, SCIM 2.0 user provisioning, and SAML 2.0 SSO.',
          starter: 'JWT + Role Enforcement',
          growth: 'JWT + Granular RBAC',
          agency: 'Agency Delegation + API Keys',
          scale: 'SCIM 2.0 & SAML 2.0 SSO',
          enterprise: 'Full Identity Federation + HSM',
        },
        {
          name: 'Security Features',
          description: 'AES-256-GCM credential encryption, Stripe PCI-DSS Level 1 billing, WORM audit logs, DLP scanning, and Zero Data Loss Guarantee.',
          starter: 'AES-256 + Zero Data Loss Guarantee',
          growth: 'AES-256 + Audit Trail',
          agency: 'HMAC Webhooks + Tenant Isolation',
          scale: 'WORM Audit Vault + SIEM Export',
          enterprise: 'Continuous Compliance + DLP',
        },
      ],
    },
  ];
}

export const PlanCompareTable: React.FC<PlanCompareTableProps> = ({
  plans = [],
  currentPlanId = 'growth',
  isAnnual = false,
  onSelectPlan,
  isTenantAdmin = true,
  actionLoading,
  isPublic = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [mobileSelectedPlan, setMobileSelectedPlan] = useState<string>(
    currentPlanId === 'starter' || currentPlanId === 'growth' || currentPlanId === 'agency' || currentPlanId === 'scale'
      ? currentPlanId
      : 'growth'
  );

  // Map live plans by ID so prices and quotas are never hardcoded
  const livePlansById = useMemo(() => {
    const map: Record<string, SubscriptionPlan & { annualPrice?: number | null; annualMonthlyEquivalent?: number | null; recommended?: boolean }> = {};
    for (const p of plans) {
      map[p.id] = p;
    }
    return map;
  }, [plans]);

  // Build all 13 structured categories (A through M)
  const allCategories: CategoryGroup[] = useMemo(() => {
    return buildStructuredCategories(livePlansById);
  }, [livePlansById]);

  // Requirement: "Avoid showing all feature categories expanded by default."
  // Expand only Category A and Category B by default; collapse C through M initially.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    const initialCollapsed = new Set<string>();
    const defaultOpenIds = new Set(['cat-a-workspace-brand', 'cat-b-social-media']);
    for (const cat of buildStructuredCategories({})) {
      if (!defaultOpenIds.has(cat.id)) {
        initialCollapsed.add(cat.id);
      }
    }
    return initialCollapsed;
  });

  // Filter categories and features based on real-time search query & "Differences Only" mode
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allCategories
      .map((cat) => {
        const catMatches =
          query.length > 0 &&
          (cat.category.toLowerCase().includes(query) || cat.summary.toLowerCase().includes(query));

        const matchedFeatures = cat.features.filter((f) => {
          if (showDifferencesOnly) {
            const allSame =
              f.starter === f.growth &&
              f.growth === f.agency &&
              f.agency === f.scale;
            if (allSame) return false;
          }
          if (!query) return true;
          return (
            catMatches ||
            f.name.toLowerCase().includes(query) ||
            f.description.toLowerCase().includes(query) ||
            String(f.starter).toLowerCase().includes(query) ||
            String(f.growth).toLowerCase().includes(query) ||
            String(f.agency).toLowerCase().includes(query) ||
            String(f.scale).toLowerCase().includes(query)
          );
        });

        return {
          ...cat,
          features: matchedFeatures,
        };
      })
      .filter((cat) => cat.features.length > 0);
  }, [allCategories, searchQuery, showDifferencesOnly]);

  // Total matching features count
  const totalMatchingFeatures = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.features.length, 0);
  }, [filteredCategories]);

  // Category toggle handler
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Expand / Collapse All state
  const allExpanded = useMemo(() => {
    return (
      filteredCategories.length > 0 &&
      filteredCategories.every((cat) => !collapsedCategories.has(cat.id))
    );
  }, [filteredCategories, collapsedCategories]);

  const handleExpandAll = () => {
    setCollapsedCategories(new Set());
  };

  const handleCollapseAll = () => {
    setCollapsedCategories(new Set(allCategories.map((c) => c.id)));
  };

  const handleJumpToCategory = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.delete(catId);
      return next;
    });
    const el = document.getElementById(`compare-cat-${catId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Cell renderer helper:
  // - Clean typography and icons without button/pill backgrounds
  const renderValueCell = (val: boolean | string | undefined, planKey: string) => {
    if (val === true) {
      return (
        <span className="compare-included-badge" title="Included in plan">
          <Check size={16} strokeWidth={2.5} className="compare-check-icon" />
          <span className="compare-included-label">Included</span>
        </span>
      );
    }
    if (val === false || val === undefined) {
      return (
        <span className="compare-not-included" title="Not included in this tier">
          <Minus size={16} strokeWidth={2} className="compare-minus-icon" />
        </span>
      );
    }

    const strVal = String(val);
    const lower = strVal.toLowerCase();
    const isLimited =
      lower.includes('basic') ||
      lower.includes('standard') ||
      lower.includes('byo') ||
      lower.includes('single') ||
      lower.includes('l1') ||
      lower.includes('up to 3') ||
      lower.includes('up to 500') ||
      (planKey === 'starter' && /^[1235]\s/.test(strVal));

    return (
      <span
        className={`compare-text-val ${isLimited ? 'compare-val-limited' : 'compare-val-full'}`}
        title={isLimited ? `Tier allowance: ${strVal}` : `Included capacity: ${strVal}`}
      >
        {strVal}
      </span>
    );
  };

  // Derive the commercial plan columns dynamically from live backend catalog or canonical plans
  const planColumns = useMemo(() => {
    // When isPublic is true (on public /pricing page), display the 4 canonical public commercial tiers:
    // Starter ($29/mo), Growth ($79/mo), Agency Pro ($199/mo), Scale ($499/mo)
    if (isPublic) {
      const publicKeys = ['starter', 'growth', 'agency', 'scale'];
      return publicKeys.map((id) => {
        const live = livePlansById[id];
        const canonical = HOASPFORGE_PLANS[id] || {
          name: id === 'agency' ? 'Agency Pro' : id === 'growth' ? 'Growth' : id === 'scale' ? 'Scale' : 'Starter',
          monthlyPrice: id === 'scale' ? 499 : id === 'agency' ? 199 : id === 'growth' ? 79 : 29,
          annualMonthlyPrice: id === 'scale' ? 399 : id === 'agency' ? 165 : id === 'growth' ? 65 : 24,
        };
        const monthlyPrice = live?.price !== undefined ? Number(live.price) : canonical.monthlyPrice;
        const annualMonthlyPrice =
          live?.annualMonthlyEquivalent !== undefined && live.annualMonthlyEquivalent !== null
            ? Number(live.annualMonthlyEquivalent)
            : live?.annualPrice !== undefined && live.annualPrice !== null
              ? Math.round(Number(live.annualPrice) / 12)
              : canonical.annualMonthlyPrice;

        return {
          id,
          name: live?.name || canonical.name,
          monthlyPrice,
          annualMonthlyPrice,
          isPopular: id === 'growth' || Boolean(live?.recommended),
          isBestForAgencies: id === 'agency',
        };
      });
    }

    const canonicalOrder = ['free', 'starter', 'growth', 'professional', 'agency', 'business', 'scale', 'enterprise'];
    const canonicalSet = new Set(['free', 'starter', 'growth', 'agency', 'scale']);

    let sourcePlans: any[] = [];
    if (plans && plans.length > 0) {
      const canonicalMatch = plans.filter((p) => canonicalSet.has(p.id));
      sourcePlans = canonicalMatch.length >= 3 ? canonicalMatch : plans;
    } else {
      sourcePlans = ['starter', 'growth', 'agency', 'scale']
        .map((id) => livePlansById[id] || HOASPFORGE_PLANS[id])
        .filter(Boolean);
    }

    // Filter out internal trial sandboxes and legacy grandfathered accounts
    const valid = sourcePlans.filter(
      (p) => p.id !== 'free_trial' && p.id !== 'trial' && p.id !== 'legacy_agency_grandfathered' && p.id !== 'agency_scale'
    );

    valid.sort((a, b) => {
      const idxA = canonicalOrder.indexOf(a.id);
      const idxB = canonicalOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });

    return valid.map((live) => {
      const id = live.id;
      const fallback = HOASPFORGE_PLANS[id] || {
        name: live.name,
        monthlyPrice: Number(live.price || 0),
        annualMonthlyPrice: Math.round(Number(live.price || 0) * 0.8),
      };
      const monthlyPrice = live?.price !== undefined ? Number(live.price) : fallback.monthlyPrice;
      const annualMonthlyPrice =
        live?.annualMonthlyEquivalent !== undefined && live.annualMonthlyEquivalent !== null
          ? Number(live.annualMonthlyEquivalent)
          : live?.annualPrice !== undefined && live.annualPrice !== null
            ? Math.round(Number(live.annualPrice) / 12)
            : fallback.annualMonthlyPrice;

      return {
        id,
        name: live?.name || fallback.name,
        monthlyPrice,
        annualMonthlyPrice,
        isPopular: Boolean(live?.recommended || id === 'growth' || id === 'professional'),
        isBestForAgencies: id === 'agency' || id === 'business',
      };
    });
  }, [isPublic, livePlansById, plans]);

  const planRanks: Record<string, number> = {
    free: 0,
    starter: 1,
    professional: 2,
    growth: 2,
    business: 3,
    agency: 3,
    scale: 4,
    enterprise: 5,
  };

  return (
    <div className="plan-compare-root" id="compare-table">
      {/* Top Interactive Control Bar: Search, Show All / Differences Toggle, Expand/Collapse All */}
      <div className="plan-compare-controls-bar">
        <div className="plan-compare-search-wrapper">
          <div className="plan-compare-search-box">
            <Search size={15} className="plan-compare-search-icon" />
            <input
              type="text"
              className="plan-compare-search-input"
              placeholder="Search 13 categories & features (e.g., WhatsApp, Brand Voice, SCIM, Video)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search platform capabilities"
            />
            {searchQuery && (
              <button
                type="button"
                className="plan-compare-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="plan-compare-toolbar-actions">
          <div className="plan-compare-filter-group" role="group" aria-label="Feature filter mode">
            <button
              type="button"
              onClick={() => {
                setShowDifferencesOnly(false);
                handleExpandAll();
              }}
              className={`plan-compare-filter-btn ${!showDifferencesOnly && allExpanded ? 'active' : ''}`}
            >
              <Layers size={13} />
              <span>Show All Features ({totalMatchingFeatures})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDifferencesOnly((prev) => !prev)}
              className={`plan-compare-filter-btn ${showDifferencesOnly ? 'active' : ''}`}
            >
              <Filter size={13} />
              <span>Differences Only</span>
            </button>
          </div>

          <button
            type="button"
            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
            className="plan-compare-expand-all-btn"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp size={14} />
                <span>Collapse All Categories</span>
              </>
            ) : (
              <>
                <ChevronsUpDown size={14} />
                <span>Expand All ({allCategories.length} Categories)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Category Jump Pills (A–M) */}
      <div className="plan-compare-category-pills" aria-label="Feature category navigation">
        {allCategories.map((cat) => {
          const isExpanded = !collapsedCategories.has(cat.id) || Boolean(searchQuery);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleJumpToCategory(cat.id)}
              className={`plan-compare-cat-pill ${isExpanded ? 'expanded' : ''}`}
              title={cat.summary}
            >
              <span className="plan-compare-cat-pill-code">{cat.code}</span>
              <span>{cat.category.replace(/^[A-M]\.\s*/, '')}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Plan Switcher (Visible on narrow viewports) */}
      <div className="plan-compare-mobile-switcher">
        <span className="plan-compare-mobile-label">Focus Plan on Mobile:</span>
        <div className="plan-compare-mobile-tabs">
          {planColumns.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileSelectedPlan(col.id)}
              className={`plan-compare-mobile-tab ${mobileSelectedPlan === col.id ? 'active' : ''}`}
            >
              {col.name}
              {currentPlanId === col.id && ' (Current)'}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table Container with Sticky Header & Sticky First Column */}
      <div className="plan-compare-table-container">
        <table className="plan-compare-table">
          <thead className="plan-compare-thead">
            <tr>
              <th className="plan-compare-th plan-compare-th-feature">
                <div className="plan-compare-th-feature-inner">
                  <span className="plan-compare-matrix-eyebrow"> Side-by-Side Entitlements</span>
                  <h4 className="plan-compare-matrix-heading">Feature &amp; Capability Matrix</h4>
                  <span className="plan-compare-matrix-sub">
                    {allExpanded
                      ? `Showing all ${filteredCategories.length} categories (${totalMatchingFeatures} features)`
                      : `${filteredCategories.filter((c) => !collapsedCategories.has(c.id)).length} of ${filteredCategories.length} categories expanded`}
                  </span>
                </div>
              </th>

              {planColumns.map((col) => {
                const isCurrent = !isPublic && currentPlanId === col.id;
                const isActionLoading = actionLoading === `change-${col.id}` || actionLoading === `checkout-${col.id}`;
                const displayPrice = isAnnual ? col.annualMonthlyPrice : col.monthlyPrice;
                const curRank = planRanks[currentPlanId] || 2;
                const targetRank = planRanks[col.id] || 1;
                const isUpgrade = targetRank >= curRank;

                return (
                  <th
                    key={col.id}
                    className={`plan-compare-th plan-compare-th-plan ${isCurrent ? 'plan-compare-col-current' : ''} ${
                      mobileSelectedPlan === col.id ? 'mobile-focused' : ''
                    }`}
                  >
                    <div className="plan-compare-header-card">
                      <div className="plan-compare-header-badges">
                        {isCurrent && (
                          <span className="plan-compare-col-badge current">CURRENT PLAN</span>
                        )}
                        {!isCurrent && col.isPopular && (
                          <span className="plan-compare-col-badge popular">MOST POPULAR</span>
                        )}
                        {!isCurrent && !col.isPopular && col.isBestForAgencies && (
                          <span className="plan-compare-col-badge agency">BEST FOR AGENCIES</span>
                        )}
                      </div>

                      <h4 className="plan-compare-plan-title">{col.name}</h4>

                      <div className="plan-compare-header-price">
                        <span className="plan-compare-header-price-val">${displayPrice}</span>
                        <span className="plan-compare-header-price-unit">/mo</span>
                      </div>

                      {isPublic ? (
                        <a
                          href={`/register?plan=${col.id}&interval=${isAnnual ? 'year' : 'month'}`}
                          className={`plan-compare-cta-pill ${
                            col.isPopular
                              ? 'plan-compare-pill-primary'
                              : col.isBestForAgencies
                                ? 'plan-compare-pill-blue'
                                : 'plan-compare-pill-dark'
                          }`}
                        >
                          Choose {col.name}
                        </a>
                      ) : isCurrent ? (
                        <span className="plan-compare-cta-pill plan-compare-pill-current">
                          <CheckCircle2 size={12} />
                          <span>Active Plan</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!isTenantAdmin || isActionLoading}
                          onClick={() => {
                            if (!isTenantAdmin || !onSelectPlan) return;
                            onSelectPlan(col.id, isUpgrade ? 'upgrade' : 'downgrade');
                          }}
                          className={`plan-compare-cta-pill ${
                            col.isPopular || isUpgrade ? 'plan-compare-pill-primary' : 'plan-compare-pill-dark'
                          }`}
                          style={{
                            opacity: !isTenantAdmin ? 0.6 : 1,
                            cursor: !isTenantAdmin ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isActionLoading ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Switching...</span>
                            </>
                          ) : !isTenantAdmin ? (
                            <>
                              <Lock size={12} />
                              <span>Admin Only</span>
                            </>
                          ) : (
                            <>
                              <span>{isUpgrade ? `Upgrade to ${col.name}` : `Downgrade`}</span>
                              {isUpgrade ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: 13 Expandable Category Groups (A–M) */}
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={planColumns.length + 1} className="plan-compare-empty">
                  No features match &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try searching for &ldquo;WhatsApp&rdquo;, &ldquo;Brand Voice&rdquo;, &ldquo;Video&rdquo;, or &ldquo;Approval&rdquo;.
                </td>
              </tr>
            ) : (
              filteredCategories.map((catGroup) => {
                // If user is actively searching, auto-expand matching categories
                const isCollapsed = searchQuery.trim().length > 0 ? false : collapsedCategories.has(catGroup.id);

                return (
                  <React.Fragment key={catGroup.id}>
                    {/* Expandable Category Header Row */}
                    <tr
                      id={`compare-cat-${catGroup.id}`}
                      className={`plan-compare-cat-row ${!isCollapsed ? 'is-expanded' : 'is-collapsed'}`}
                      onClick={() => toggleCategory(catGroup.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCategory(catGroup.id);
                        }
                      }}
                    >
                      <td colSpan={planColumns.length + 1} className="plan-compare-cat-cell">
                        <div className="plan-compare-cat-header-wrap">
                          <div className="plan-compare-cat-title-group">
                            <span className="plan-compare-cat-letter-badge">{catGroup.code}</span>
                            <div>
                              <h3 className="plan-compare-cat-title">{catGroup.category}</h3>
                              <p className="plan-compare-cat-summary">{catGroup.summary}</p>
                            </div>
                          </div>
                          <div className="plan-compare-cat-right">
                            <span className="plan-compare-cat-count-pill">
                              {catGroup.features.length} {catGroup.features.length === 1 ? 'feature' : 'features'}
                            </span>
                            <div
                              className="plan-compare-cat-toggle-icon"
                              title={isCollapsed ? 'Expand category' : 'Collapse category'}
                            >
                              {isCollapsed ? (
                                <>
                                  <Plus size={15} strokeWidth={2.2} />
                                  <span className="plan-compare-toggle-label">Expand</span>
                                </>
                              ) : (
                                <>
                                  <Minus size={15} strokeWidth={2.2} />
                                  <span className="plan-compare-toggle-label">Collapse</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Feature Rows in this Category */}
                    {!isCollapsed &&
                      catGroup.features.map((feature, fIdx) => (
                        <tr key={fIdx} className="plan-compare-row">
                          <td className="plan-compare-cell-feature">
                            <div className="plan-compare-feat-name-row">
                              <span className="plan-compare-feat-title">{feature.name}</span>
                              {feature.description && (
                                <button
                                  type="button"
                                  className="plan-compare-info-btn"
                                  aria-label={`Technical details for ${feature.name}`}
                                >
                                  <Info size={13} className="plan-compare-info-symbol" />
                                  <span className="plan-compare-tooltip" role="tooltip">
                                    <strong>{feature.name}</strong>
                                    <span style={{ display: 'block', marginTop: '3px' }}>{feature.description}</span>
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                          {planColumns.map((col) => {
                            const val = (feature as any)[col.id] !== undefined
                              ? (feature as any)[col.id]
                              : col.id === 'growth'
                                ? ((feature as any).growth ?? (feature as any).professional ?? true)
                                : col.id === 'agency'
                                  ? ((feature as any).agency ?? (feature as any).business ?? true)
                                  : col.id === 'scale'
                                    ? ((feature as any).scale ?? (feature as any).enterprise ?? true)
                                    : col.id === 'professional'
                                      ? ((feature as any).growth ?? true)
                                      : col.id === 'business'
                                        ? ((feature as any).agency ?? true)
                                        : col.id === 'enterprise'
                                          ? ((feature as any).enterprise ?? (feature as any).scale ?? true)
                                          : col.id === 'free'
                                            ? ((feature as any).free ?? false)
                                            : (feature as any)[col.id];
                            return (
                              <td
                                key={col.id}
                                className={`plan-compare-cell-val ${
                                  currentPlanId === col.id ? 'plan-compare-col-current' : ''
                                } ${mobileSelectedPlan === col.id ? 'mobile-focused' : ''}`}
                              >
                                {renderValueCell(val, col.id)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanCompareTable;
