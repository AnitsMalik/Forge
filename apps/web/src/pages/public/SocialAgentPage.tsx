import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Database,
  Workflow,
  Palette,
  ShieldCheck,
  Share2,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Lock,
  Target,
  Eye,
  FileText,
  Code,
  Layers,
  ExternalLink,
  Smartphone,
  Check,
} from 'lucide-react';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { PublicFooter } from '../../components/public/PublicFooter.js';
import { usePageMeta } from '../../hooks/index.js';

export const SocialAgentPage: React.FC = () => {
  usePageMeta({
    title: 'Autonomous Social Marketing Agent Architecture — HoaspForge',
    description: 'Meet your AI Social Marketing Agent. Create branded content, manage campaigns, and streamline social publishing from one intelligent workspace with human oversight built in.',
    canonicalPath: '/social-agent',
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [showPayloadInspector, setShowPayloadInspector] = useState<boolean>(false);

  // 4 Clearly Presented Workflow Stages
  const workflowSteps = [
    {
      id: 'connect',
      stepNumber: '1',
      navLabel: 'Connect',
      title: 'Business Data Ingestion',
      subtitle: 'Google Sheets, CSV & Shopify Sync',
      description:
        'HoaspForge continuously monitors your connected business catalogs—ingesting rows from Google Sheets, CSV uploads, or Shopify webhooks—and normalizes product attributes into immutable Marketing Objects.',
      highlights: [
        'Real-time row-by-row sync from Google Sheets & CSV catalogs',
        'Automatic Shopify product webhook ingestion',
        'Strict SKU normalization with source traceability',
        'Direct mapping of prices, attributes, and product imagery',
      ],
      previewBadge: 'Data Source Synchronized',
      previewContent: {
        source: 'Google Sheets (Inventory Sync)',
        item: 'EcoFlask Titan (SKU: ECO-32)',
        price: '$38.00 USD',
        status: 'In Stock • Catalog Normalized',
      },
      code: JSON.stringify(
        {
          source: 'google_sheets',
          sku: 'ECO-32',
          title: 'EcoFlask Titan',
          price: 38.0,
          inventory_status: 'in_stock',
          normalized_at: '2026-10-23T09:00:00Z',
        },
        null,
        2
      ),
    },
    {
      id: 'generate',
      stepNumber: '2',
      navLabel: 'Generate',
      title: 'AI Content & Creative Synthesis',
      subtitle: 'Platform-Native Copy & Visual Templates',
      description:
        'Structured AI models synthesize platform-tailored copy for Instagram and Facebook while Satori dynamically renders 1080x1080 visual assets using your Brand Kit fonts, color palette, and logo watermark.',
      highlights: [
        'Instagram variants with visual hooks & hashtag clusters',
        'Facebook conversational stories with link call-to-actions',
        'Satori & Sharp server-side image rendering at 1080x1080',
        'Automated Brand Kit voice compliance & taboo word checks',
      ],
      previewBadge: 'Content & Visuals Composed',
      previewContent: {
        source: 'OpenAI + Satori Graphics Engine',
        item: 'Aura Sustainable Living • Eco-Hydration',
        price: 'Instagram & Facebook Variants',
        status: 'Brand Voice: Inspiring • Taboo Words: 0 Violations',
      },
      code: JSON.stringify(
        {
          brand: 'Aura Eco',
          template: 'stat_highlight',
          dimensions: '1080x1080',
          copy_variants: {
            instagram: 'Ditch single-use plastic with EcoFlask Titan. Cold for 24h, designed for good.',
            hashtags: ['#ZeroWaste', '#SustainableLiving', '#EcoFlask'],
            facebook: 'Ready to elevate your daily routine? Discover how EcoFlask Titan helps the planet.',
          },
          policy_check: 'passed',
        },
        null,
        2
      ),
    },
    {
      id: 'review',
      stepNumber: '3',
      navLabel: 'Review',
      title: 'Human Review & Approval',
      subtitle: '72-Hour Zero-Login Magic Review Portal',
      description:
        'Before any content goes live, HoaspForge generates a high-entropy, 72-hour magic review portal. Clients and managers can preview posts on mobile, request edits, or click Approve without needing a paid seat.',
      highlights: [
        'Zero-login magic links with 72-hour cryptographic expiration',
        'Mobile-first responsive card previews with live copy & images',
        'One-tap Approve or Request Changes with audit trail',
        'Autonomy ceiling enforcement guaranteeing zero silent publishing',
      ],
      previewBadge: 'Supervised Sign-Off Portal',
      previewContent: {
        source: 'Magic Review Portal (72h Expiry)',
        item: 'Reviewer: client@brand.com',
        price: 'Status: Approved by Marketing Director',
        status: 'Autonomy Ceiling: L3 (Supervised Review Mandate)',
      },
      code: JSON.stringify(
        {
          review_token: 'mrv_e982f1b8a719c4d293847',
          status: 'approved',
          reviewer_email: 'client@brand.com',
          review_channel: 'magic_review_portal',
          approved_at: '2026-10-23T09:15:00Z',
          silent_publishing_shield: 'active',
        },
        null,
        2
      ),
    },
    {
      id: 'publish',
      stepNumber: '4',
      navLabel: 'Publish & Measure',
      title: 'Publish & Measure',
      subtitle: 'Meta Graph API Dispatch & Performance Telemetry',
      description:
        'BullMQ queue workers decrypt AES-256-GCM tokens to dispatch approved posts to Facebook and Instagram at the optimal scheduled time. Telemetry pollers track reach and engagement to optimize subsequent campaigns.',
      highlights: [
        'Direct publishing to Facebook Pages & Instagram Professional',
        'Timezone-aware queue workers with concurrency locks',
        'Factual reach, impressions, clicks & engagement telemetry',
        'Algorithmic winner detection powering closed-loop AI learning',
      ],
      previewBadge: 'Published & Performance Tracked',
      previewContent: {
        source: 'Meta Graph API v20.0 Dispatcher',
        item: 'Remote Post ID: 1405588742634526_122100337179498315',
        price: 'Reach: 48,200 • Engagement: 4.8%',
        status: 'Winner Detected • Optimization Score: 94/100',
      },
      code: JSON.stringify(
        {
          dispatched_to: ['facebook_page', 'instagram_professional'],
          remote_post_id: '1405588742634526_122100337179498315',
          status: 'published',
          reach: 48200,
          engagement_rate: '4.8%',
          winner_score: 94,
          closed_loop_feedback: 'incorporated',
        },
        null,
        2
      ),
    },
  ];

  // 5 Concise, Accurate FAQs
  const faqs = [
    {
      q: 'What can the HoaspForge AI Agent do?',
      a: 'The HoaspForge AI Agent acts as an intelligent marketing team member. It continuously monitors your business data sources, interprets your Brand Kit guidelines, synthesizes platform-native copy for Instagram and Facebook, renders on-brand visual creatives, routes drafts through client review portals, and schedules publication with real-time performance tracking.',
    },
    {
      q: 'Which social platforms are supported?',
      a: 'HoaspForge natively integrates with Meta Graph API v20.0, supporting publishing to Facebook Pages and Instagram Professional (Creator & Business) accounts, alongside a mock sandbox environment for end-to-end dry-run testing without publishing live.',
    },
    {
      q: 'Can I review content before it is published?',
      a: 'Yes. HoaspForge enforces a Human Approval Mandate through zero-login 72-hour magic review links. Stakeholders and clients can inspect post copy, view rendered visuals, and approve or request edits from any mobile device before anything is queued for live dispatch.',
    },
    {
      q: 'What data sources can I connect?',
      a: 'You can synchronize product catalogs and marketing data from Google Sheets, upload CSV or Excel files, and ingest Shopify product catalog webhooks. Every item is normalized into a traceable Marketing Object linked directly to the generated post.',
    },
    {
      q: 'How are connected accounts and credentials protected?',
      a: 'OAuth access tokens and API keys are encrypted at rest using AES-256-GCM envelope encryption with unique initialization vectors and authentication tags. Database records are strictly partitioned by tenant ID, and user sessions are defended with brute-force lockout safeguards.',
    },
  ];

  const currentStep = workflowSteps[activeWorkflowStep];

  return (
    <div className="public-page-root" style={{ minHeight: '100vh', background: 'var(--bg-canvas, #07090e)', color: 'var(--text-primary)' }}>
      {/* 1. Navigation */}
      <PublicNavbar currentPath="/social-agent" />

      <main style={{ paddingBottom: '96px' }}>
        {/* =========================================================================
            SECTION 1: HERO SECTION
            ========================================================================= */}
        <section
          style={{
            position: 'relative',
            paddingTop: '48px',
            paddingBottom: '40px',
            textAlign: 'center',
          }}
        >
          <div className="hero-glow-bg" />

          <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
            <div className="hero-pill-badge">
              <Bot size={14} color="var(--accent-primary)" />
              <span>Autonomous Social Marketing Architecture</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                maxWidth: '860px',
                margin: '12px auto 18px auto',
              }}
            >
              Meet Your AI <span className="gradient-text">Social Marketing Agent</span>
            </h1>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.15rem',
                maxWidth: '740px',
                margin: '0 auto 32px auto',
                lineHeight: 1.6,
              }}
            >
              Create branded content, manage campaigns, and streamline social publishing from one intelligent workspace—with human oversight built in.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '44px' }}>
              <a
                href="/register"
                className="btn btn-primary"
                style={{
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </a>

              <a
                href="#workflow"
                className="btn btn-secondary"
                style={{
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Explore How It Works</span>
              </a>
            </div>

            {/* Concise Product Preview Card */}
            <div
              className="glass-card"
              style={{
                maxWidth: '960px',
                margin: '0 auto',
                borderRadius: 'var(--radius-xl, 20px)',
                border: '1px solid var(--border-subtle)',
                padding: '24px 28px',
                textAlign: 'left',
                background: 'var(--bg-surface-elevated, #0d111b)',
                boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Top preview bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    HoaspForge Agent Workspace
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '10px' }}>
                    Aura Sustainable Living
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(139, 92, 246, 0.18)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    Autonomy: L3 Supervised
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                    Human Approval Required
                  </span>
                </div>
              </div>

              {/* Preview columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'var(--bg-surface, rgba(0, 0, 0, 0.03))', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    1. Data Catalog Ingestion
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    EcoFlask Titan (32oz)
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Synced from Google Sheets row #14 • In Stock ($38) • Zero Waste Collection
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface, rgba(0, 0, 0, 0.03))', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    2. AI Creative Synthesis
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Instagram &amp; Facebook Variants
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    1080x1080 Satori template composed with brand hex #8B5CF6 &amp; zero taboo words.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface, rgba(0, 0, 0, 0.03))', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                    3. Supervised Publishing
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    72h Magic Review Portal
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Approved by client • Meta Graph API scheduled for brand peak engagement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: CONSOLIDATED FEATURES (4 CARDS IN 2X2 GRID)
            ========================================================================= */}
        <section
          id="features"
          style={{
            padding: '64px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface, #0d111b)',
          }}
        >
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Core Capabilities
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  marginTop: '10px',
                  letterSpacing: '-0.02em',
                }}
              >
                Everything Your Social Marketing Workflow Needs
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '12px auto 0 auto', fontSize: '1.02rem', lineHeight: 1.6 }}>
                Four core capabilities unified into one intelligent, brand-safe engine.
              </p>
            </div>

            {/* 4 Feature Cards in 2-Column Responsive Grid */}
            <div className="agent-features-grid-2x2">
              {/* Card 1: AI Content Creation */}
              <div id="content" className="agent-feature-card-modern">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={24} color="#8b5cf6" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                    Structured Generation
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
                  AI Content Creation
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  Generate platform-specific content while maintaining brand guidelines.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Platform-Native Variants:</strong> Visual Instagram hooks &amp; conversational Facebook stories</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Brand Voice Guardrails:</strong> Adheres strictly to configured tone and style guides</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Taboo Word Filters:</strong> Automated rejection of prohibited terms and marketing claims</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Catalog Grounding:</strong> Factual synthesis linked to genuine product catalog SKUs</span>
                  </li>
                </ul>
              </div>

              {/* Card 2: Campaign Planning & Scheduling */}
              <div id="publishing" className="agent-feature-card-modern">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Target size={24} color="#3b82f6" />
                  </div>
                  <span id="automation" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                    Strategic Distribution
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
                  Campaign Planning &amp; Scheduling
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  Organize campaigns and coordinate publishing across supported platforms.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Omnichannel Flights:</strong> Group posts by theme, target audience, and flight dates</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>BullMQ Delayed Queues:</strong> Fault-tolerant worker execution with retry backoff</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Timezone Dispatcher:</strong> Coordinates dispatches to match brand-local active hours</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Idempotency Locks:</strong> Distributed locks preventing duplicate publication anomalies</span>
                  </li>
                </ul>
              </div>

              {/* Card 3: Brand & Creative Tools */}
              <div id="templates" className="agent-feature-card-modern">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Palette size={24} color="#10b981" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                    Dynamic Studio
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
                  Brand &amp; Creative Tools
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  Create consistent social assets using supported templates and creative tools.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Satori &amp; Sharp Engine:</strong> High-resolution server-side image rendering at 1080x1080</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Turnkey Templates:</strong> Quote Cards, Stat Highlights, and Announcement layouts</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Multi-Format Outputs:</strong> 1:1 Square, 4:5 Portrait, and 16:9 Landscape ratios</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Brand Asset Injection:</strong> Automatic insertion of official fonts, hex codes, and logos</span>
                  </li>
                </ul>
              </div>

              {/* Card 4: Analytics & Optimization */}
              <div id="analytics" className="agent-feature-card-modern">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BarChart3 size={24} color="#f59e0b" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                    Growth Intelligence
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>
                  Analytics &amp; Optimization
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  Monitor performance and identify opportunities to improve future campaigns.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Factual Metrics:</strong> Verified impressions, reach, engagement rates, and link clicks</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Algorithmic Winner Detection:</strong> Automated scoring of top-performing post variants</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Clear Metric Separation:</strong> Clear boundary between factual numbers and AI suggestions</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} color="#10b981" />
                    <span><strong>Closed-Loop Feedback:</strong> High-performing copy structures inform next generation cycle</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: SIMPLIFIED INTERACTIVE WORKFLOW (4 CLEAR STAGES)
            ========================================================================= */}
        <section
          id="workflow"
          style={{
            padding: '72px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-canvas, #07090e)',
          }}
        >
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                End-to-End Pipeline
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  marginTop: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                Interactive Workflow: From Business Data to Live Social Content
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '12px auto 0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
                Step through the four-stage pipeline to inspect how HoaspForge connects, generates, reviews, and publishes.
              </p>
            </div>

            {/* 4-Step Accessible Navigation Bar */}
            <div className="workflow-nav-bar" role="tablist" aria-label="Workflow Stages">
              {workflowSteps.map((step, idx) => {
                const isActive = activeWorkflowStep === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    id={`workflow-tab-${step.id}`}
                    aria-selected={isActive}
                    aria-controls={`workflow-panel-${step.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveWorkflowStep(idx)}
                    className={`workflow-nav-btn ${isActive ? 'active' : ''}`}
                  >
                    <span className="workflow-step-badge-num">{step.stepNumber}</span>
                    <span>{step.navLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Workflow Stage Panel */}
            <div
              id={`workflow-panel-${currentStep.id}`}
              role="tabpanel"
              aria-labelledby={`workflow-tab-${currentStep.id}`}
              className="glass-card animate-fade-in"
              style={{
                borderRadius: 'var(--radius-xl, 20px)',
                padding: '36px',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                background: 'var(--bg-surface-elevated, #0d111b)',
                boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7)',
              }}
            >
              <div className="workflow-panel-grid">
                {/* Left: Stage Details & Controls */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.78rem', width: 'fit-content', marginBottom: '14px' }}>
                    <span>STAGE {currentStep.stepNumber} OF 4</span>
                    <span>•</span>
                    <span>{currentStep.navLabel.toUpperCase()}</span>
                  </div>

                  <h3 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    {currentStep.title}
                  </h3>
                  <div style={{ fontSize: '0.94rem', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '16px' }}>
                    {currentStep.subtitle}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '24px' }}>
                    {currentStep.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                    {currentStep.highlights.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        <Check size={16} color="#10b981" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stepper Navigation Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={activeWorkflowStep === 0}
                      onClick={() => setActiveWorkflowStep((prev) => Math.max(0, prev - 1))}
                      className="btn btn-secondary"
                      style={{ padding: '9px 18px', fontSize: '0.88rem' }}
                    >
                      Previous Stage
                    </button>
                    <button
                      type="button"
                      disabled={activeWorkflowStep === workflowSteps.length - 1}
                      onClick={() => setActiveWorkflowStep((prev) => Math.min(workflowSteps.length - 1, prev + 1))}
                      className="btn btn-primary"
                      style={{ padding: '9px 18px', fontSize: '0.88rem' }}
                    >
                      Next Stage
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPayloadInspector((prev) => !prev)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 14px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginLeft: 'auto',
                      }}
                    >
                      <Code size={14} />
                      <span>{showPayloadInspector ? 'Hide Payload JSON' : 'Show Technical Payload'}</span>
                    </button>
                  </div>
                </div>

                {/* Right: Functional Preview Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg, 16px)',
                      padding: '24px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                          Workflow State Preview
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                          {currentStep.previewBadge}
                        </span>
                      </div>

                      <div style={{ padding: '16px', background: 'var(--bg-surface, rgba(0, 0, 0, 0.03))', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Active Source</div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                          {currentStep.previewContent.source}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Target Object</div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-secondary)', marginBottom: '12px' }}>
                          {currentStep.previewContent.item}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Configuration &amp; Metrics</div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {currentStep.previewContent.price}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                      <CheckCircle size={15} />
                      <span>{currentStep.previewContent.status}</span>
                    </div>
                  </div>

                  {/* Optional Technical JSON Inspector (Collapsible) */}
                  {showPayloadInspector && (
                    <div
                      className="animate-fade-in"
                      style={{
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '10px', color: 'var(--text-muted)' }}>
                        <span>Normalized JSON Payload</span>
                        <span style={{ color: '#10b981' }}>Validated Schema</span>
                      </div>
                      <pre style={{ margin: 0, color: '#38bdf8', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: '200px' }}>
                        {currentStep.code}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: SECURITY AND HUMAN OVERSIGHT (4 CATEGORIES)
            ========================================================================= */}
        <section
          id="security"
          style={{
            padding: '72px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface, #0d111b)',
          }}
        >
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '44px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Trust &amp; Governance
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  marginTop: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                Security and Human Oversight
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', margin: '12px auto 0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
                Enterprise safeguards and supervision mechanisms built directly into the agent architecture.
              </p>
            </div>

            {/* 4 Concise Categories */}
            <div className="security-trust-grid-4">
              {/* Category 1: Access Control */}
              <div className="security-trust-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={18} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Access Control
                  </h3>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Strict multi-tenant middleware enforces tenant and brand-level isolation on every query, paired with customizable role-based access permissions.
                </p>
              </div>

              {/* Category 2: Credential Protection */}
              <div className="security-trust-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={18} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Credential Protection
                  </h3>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Social OAuth tokens are encrypted at rest using AES-256-GCM envelope encryption with unique initialization vectors and authentication tags.
                </p>
              </div>

              {/* Category 3: Human Approval */}
              <div className="security-trust-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={18} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Human Approval
                  </h3>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Supervised autonomy ceilings (L1–L5) and 72-hour zero-login magic review portals guarantee client sign-off with zero silent publishing.
                </p>
              </div>

              {/* Category 4: Auditability */}
              <div className="security-trust-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', marginBottom: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Auditability
                  </h3>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  Immutable audit logging records all administrative actions, review decisions, and publishing dispatches with timestamps and IP signatures.
                </p>
              </div>
            </div>

            {/* Technical Documentation Link */}
            <div style={{ textAlign: 'center', marginTop: '36px' }}>
              <a
                href="/resources"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                }}
              >
                <span>Learn more in our Technical Architecture &amp; Security Documentation</span>
                <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: FAQ (5 CONCISE QUESTIONS)
            ========================================================================= */}
        <section id="faq" style={{ maxWidth: '860px', margin: '0 auto', padding: '72px 24px 0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Frequently Asked Questions
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading, "Outfit", sans-serif)', fontSize: '2.1rem', fontWeight: 800, marginTop: '8px' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className={`faq-item ${isOpen ? 'open' : ''}`}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenFaq(isOpen ? null : index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={18}
                      color="var(--text-secondary)"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  {isOpen && (
                    <div
                      id={`faq-answer-${index}`}
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            SECTION 6: FINAL CONVERSION CTA
            ========================================================================= */}
        <section style={{ maxWidth: '1060px', margin: '72px auto 0 auto', padding: '0 24px' }}>
          <div className="agent-final-cta-card">
            <h2
              style={{
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '14px',
                color: 'var(--text-primary)',
              }}
            >
              Ready to Simplify Your Social Marketing?
            </h2>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.08rem',
                maxWidth: '640px',
                margin: '0 auto 32px auto',
                lineHeight: 1.6,
              }}
            >
              Bring content creation, campaign planning, and social publishing into one intelligent workflow.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <a
                href="/register"
                className="btn btn-primary"
                style={{
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </a>

              <a
                href="/pricing"
                className="btn btn-secondary"
                style={{
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Explore Plans</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 2. Footer */}
      <PublicFooter />
    </div>
  );
};
