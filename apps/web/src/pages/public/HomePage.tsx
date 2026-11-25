import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Palette,
  ShieldCheck,
  Share2,
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  ChevronRight,
  Lock,
  Workflow,
  TrendingUp,
} from 'lucide-react';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { PublicFooter } from '../../components/public/PublicFooter.js';
import { usePageMeta } from '../../hooks/index.js';

export const HomePage: React.FC = () => {
  usePageMeta({
    title: 'Your AI Social Marketing Team — HoaspForge',
    description: 'Autonomous AI social marketing, multi-tenant brand governance, dynamic template rendering, and Meta Graph API publishing for modern agencies.',
    canonicalPath: '/',
  });

  return (
    <div className="public-page-root" style={{ minHeight: '100vh', background: 'var(--bg-canvas, #07090e)', color: 'var(--text-primary)' }}>
      {/* 1. Sticky Navigation */}
      <PublicNavbar currentPath="/" />

      <main>
        {/* =========================================================================
            SECTION 1: HERO
            ========================================================================= */}
        <section
          style={{
            position: 'relative',
            paddingTop: '64px',
            paddingBottom: '80px',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Subtle Radial Ambient Glow */}
          <div className="hero-glow-bg" />

          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              padding: '0 24px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Headline */}
            <h1
              style={{
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                maxWidth: '920px',
                margin: '0 auto 20px auto',
              }}
            >
              Your AI Social Marketing Team.{' '}
              <span className="gradient-text">One Intelligent Platform.</span>
            </h1>

            {/* Supporting Text */}
            <p
              style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                maxWidth: '720px',
                margin: '0 auto 36px auto',
                fontWeight: 400,
              }}
            >
              Create content, manage social accounts, automate publishing, and track performance—all from one AI-powered workspace.
            </p>

            {/* Primary & Secondary Calls to Action */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '52px',
              }}
            >
              <a
                href="/register"
                className="btn btn-primary"
                style={{
                  padding: '14px 30px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '1rem',
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
                href="#features"
                className="btn btn-secondary"
                style={{
                  padding: '14px 28px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Explore Features</span>
              </a>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: CORE FEATURES (6 ESSENTIAL CARDS)
            ========================================================================= */}
        <section
          id="features"
          style={{
            padding: '80px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface, #0d111b)',
          }}
        >
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '52px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Core Capabilities
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  marginTop: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                Everything You Need to Grow on Social
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', margin: '12px auto 0 auto', fontSize: '1.05rem', lineHeight: 1.5 }}>
                One intelligent workspace for creating, publishing, and improving your social media marketing.
              </p>
            </div>

            {/* 6 Essential Feature Cards */}
            <div className="features-grid-6">
              {[
                {
                  icon: Sparkles,
                  title: 'AI Content Creation',
                  desc: 'Generate engaging captions, posts, and social content with AI.',
                  link: '/social-agent#content',
                },
                {
                  icon: Share2,
                  title: 'Social Account Management',
                  desc: 'Manage connected social accounts from one centralized workspace.',
                  link: '/resources#meta',
                },
                {
                  icon: Clock,
                  title: 'Smart Scheduling',
                  desc: 'Plan and schedule content across supported social platforms.',
                  link: '/social-agent#publishing',
                },
                {
                  icon: Palette,
                  title: 'Brand & Template Tools',
                  desc: 'Maintain consistent messaging and branding across campaigns.',
                  link: '/social-agent#templates',
                },
                {
                  icon: BarChart3,
                  title: 'Analytics & Insights',
                  desc: 'Understand content performance and identify opportunities to improve.',
                  link: '/social-agent#analytics',
                },
                {
                  icon: Workflow,
                  title: 'Marketing Automation',
                  desc: 'Simplify repetitive marketing tasks with intelligent workflows.',
                  link: '/social-agent#automation',
                },
              ].map((feat, idx) => {
                const IconComp = feat.icon;
                return (
                  <div key={idx} className="public-feature-card">
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(139, 92, 246, 0.12)',
                        border: '1px solid rgba(139, 92, 246, 0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)',
                        marginBottom: '18px',
                      }}
                    >
                      <IconComp size={22} />
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {feat.title}
                    </h3>

                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1, marginBottom: '18px' }}>
                      {feat.desc}
                    </p>

                    <a
                      href={feat.link}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        transition: 'gap 0.2s ease',
                      }}
                    >
                      <span>Explore details</span>
                      <ChevronRight size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: HOW IT WORKS (3 SIMPLE STEPS)
            ========================================================================= */}
        <section
          style={{
            padding: '84px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-canvas, #07090e)',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Simple Workflow
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                  fontWeight: 800,
                  marginTop: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                From Idea to Published in Three Simple Steps
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '12px auto 0 auto', fontSize: '1rem' }}>
                A streamlined, automated workflow designed to keep your brand active and engaging.
              </p>
            </div>

            <div className="steps-container-3">
              {[
                {
                  step: '01',
                  title: 'Connect',
                  desc: 'Connect your social accounts and organize your brand.',
                },
                {
                  step: '02',
                  title: 'Create',
                  desc: 'Generate AI-powered content, customize it, and plan your posts.',
                },
                {
                  step: '03',
                  title: 'Publish & Optimize',
                  desc: 'Publish across supported platforms and use analytics to improve performance.',
                },
              ].map((item) => (
                <div key={item.step} className="step-card-3">
                  <div className="step-number-badge">{item.step}</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: AI AGENT SHOWCASE
            ========================================================================= */}
        <section
          style={{
            padding: '88px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'linear-gradient(180deg, var(--bg-surface, #0d111b) 0%, rgba(139, 92, 246, 0.04) 100%)',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="agent-showcase-grid">
              {/* Left Column: Headline, Supporting Text & 3 Concise Benefits */}
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(139, 92, 246, 0.18)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    marginBottom: '16px',
                  }}
                >
                  <Bot size={14} />
                  <span>Intelligent Assistant</span>
                </div>

                <h2
                  style={{
                    fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                    fontSize: 'clamp(2rem, 3.5vw, 2.7rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    marginBottom: '16px',
                  }}
                >
                  Meet Your <span className="gradient-text">AI Social Agent</span>
                </h2>

                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }}>
                  Your intelligent marketing assistant helps you create content, plan campaigns, and streamline your social media workflow.
                </p>

                {/* 3 Concise Benefits */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                  {[
                    'Create content tailored to your brand.',
                    'Plan and organize marketing campaigns.',
                    'Turn performance insights into actionable improvements.',
                  ].map((benefit, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle size={14} color="#10b981" />
                      </div>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="/social-agent"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '13px 26px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  <span>Explore the AI Agent</span>
                  <ArrowRight size={16} />
                </a>
              </div>

              {/* Right Column: AI Agent Interface Preview with Subtle Purple Glow */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated, #0d111b)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: 'var(--radius-lg, 16px)',
                  padding: '24px',
                  boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agent Reasoning Log</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Live Synthesis
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ color: '#a5b4fc' }}>&gt; Analyzing brand guidelines for &quot;Aura Sustainable Living&quot;...</div>
                  <div>&gt; Applied persona tone: Inspiring, Eco-Conscious, Confident</div>
                  <div>&gt; Verified taboo filter: 0 policy violations detected</div>
                  <div>&gt; Generated 3 native copy variants with relevant hashtag clusters</div>
                  <div style={{ color: '#10b981' }}>&gt; Rendered branded graphic card (1080x1080) in 184ms</div>
                  <div style={{ color: 'var(--text-muted)' }}>&gt; Ready for team approval &amp; scheduled publishing</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: FINAL CALL TO ACTION & COMPACT TRUST STRIP
            ========================================================================= */}
        <section
          style={{
            padding: '88px 24px 64px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'radial-gradient(ellipse at 50% 100%, rgba(139, 92, 246, 0.18) 0%, transparent 65%), var(--bg-surface, #0d111b)',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: '16px',
              }}
            >
              Ready to Make Social Marketing Smarter?
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '36px' }}>
              Spend less time managing social media and more time growing your brand.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '56px',
              }}
            >
              <a
                href="/register"
                className="btn btn-primary"
                style={{
                  padding: '14px 32px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '1rem',
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
                  fontSize: '1rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Explore Plans</span>
              </a>
            </div>

            {/* Compact Trust Strip immediately above footer */}
            <div className="trust-strip">
              <div className="trust-strip-item">
                <ShieldCheck size={18} color="#10b981" />
                <span>Human approval workflows</span>
              </div>
              <div className="trust-strip-item">
                <Lock size={18} color="#10b981" />
                <span>Secure account connections</span>
              </div>
              <div className="trust-strip-item">
                <Users size={18} color="#10b981" />
                <span>Access controls</span>
              </div>
              <div className="trust-strip-item">
                <CheckCircle size={18} color="#10b981" />
                <span>Privacy and data protection</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 2. Professional Footer */}
      <PublicFooter />
    </div>
  );
};
