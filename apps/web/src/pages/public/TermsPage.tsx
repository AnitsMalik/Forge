import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Scale,
  ArrowUp,
  Mail,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Share2,
  FileText,
  Lock,
  CreditCard,
  AlertTriangle,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { PublicFooter } from '../../components/public/PublicFooter.js';
import { usePageMeta } from '../../hooks/index.js';

interface SectionNavItem {
  id: string;
  num: string;
  title: string;
  icon: LucideIcon;
}

const SECTION_NAV: SectionNavItem[] = [
  { id: 'section-1', num: '1', title: 'Acceptance of Terms', icon: FileText },
  { id: 'section-2', num: '2', title: 'Service & AI Autonomy', icon: Sparkles },
  { id: 'section-3', num: '3', title: 'Third-Party Integrations', icon: Share2 },
  { id: 'section-4', num: '4', title: 'Content & IP Ownership', icon: Lock },
  { id: 'section-5', num: '5', title: 'Subscriptions & Billing', icon: CreditCard },
  { id: 'section-6', num: '6', title: 'Acceptable Use & Security', icon: ShieldCheck },
  { id: 'section-7', num: '7', title: 'Disclaimers & Liability', icon: AlertTriangle },
  { id: 'section-8', num: '8', title: 'Privacy, Contact & Law', icon: Building2 },
];

export const TermsPage: React.FC = () => {
  usePageMeta({
    title: 'Terms of Service — HoaspForge',
    description: 'Read the official HoaspForge Terms of Service governing platform access, AI autonomy, multi-channel publishing, billing, and acceptable use.',
    canonicalPath: '/terms',
  });

  const [activeSection, setActiveSection] = useState<string>('section-1');

  // Sync with window.location.hash on mount or hash change
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && SECTION_NAV.some((item) => item.id === hash)) {
        setActiveSection(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectSection = (id: string) => {
    setActiveSection(id);
    window.location.hash = id;
    const contentElement = document.getElementById('terms-content-pane');
    if (contentElement) {
      contentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentIndex = SECTION_NAV.findIndex((item) => item.id === activeSection);
  const currentNav = SECTION_NAV[currentIndex] || SECTION_NAV[0];
  const CurrentIcon = currentNav.icon;

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectSection(SECTION_NAV[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < SECTION_NAV.length - 1) {
      handleSelectSection(SECTION_NAV[currentIndex + 1].id);
    }
  };

  return (
    <div className="public-page-root" style={{ minHeight: '100vh', background: 'var(--bg-canvas, #07090e)', color: 'var(--text-primary)' }}>
      <PublicNavbar currentPath="/terms" />

      {/* Hero Glow Accent */}
      <div className="hero-glow-bg" style={{ opacity: 0.5 }} />

      <main className="legal-page-container">
        {/* Header Banner */}
        <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.28)',
              color: 'var(--accent-primary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '14px',
            }}
          >
            <Scale size={16} />
            <span>Legal Agreement</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
              fontSize: 'clamp(2.3rem, 4.5vw, 3.4rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', fontWeight: 500 }}>
            Effective Date: October 27, 2026 &bull; Platform Version: v6.9.0
          </p>
        </div>

        {/* Master-Detail Split Grid */}
        <div className="legal-split-layout">
          {/* Left Column: Fixed / Sticky Interactive Menu */}
          <aside className="legal-sidebar-sticky">
            <div className="legal-sidebar-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)' }}>
                  Table of Sections
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {currentIndex + 1} of {SECTION_NAV.length}
                </span>
              </div>

              {/* Navigation Menu Buttons */}
              <nav role="tablist" aria-label="Terms of Service Sections" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SECTION_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      id={`tab-${item.id}`}
                      aria-selected={isActive}
                      aria-controls={item.id}
                      onClick={() => handleSelectSection(item.id)}
                      className={`legal-nav-pill ${isActive ? 'active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="legal-nav-badge">{item.num}</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: isActive ? 600 : 500 }}>
                          {item.title}
                        </span>
                      </div>
                      <ChevronRight size={14} className="legal-nav-chevron" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Platform Trust Highlights */}
            <div className="legal-sidebar-card">
              <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', marginBottom: '14px' }}>
                Guarantees at a Glance
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>100% Asset &amp; Brand Copy Ownership</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Human Approval Gates (L1–L5)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>14-Day Free Evaluation Period</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>AES-256-GCM Vault for All Tokens</span>
                </div>
              </div>
            </div>

            {/* Contact Support Mini Card */}
            <div className="legal-sidebar-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%), var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.92rem', marginBottom: '6px' }}>
                <Mail size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Need Legal Support?</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                Questions regarding custom SLAs or compliance?
              </p>
              <a
                href="mailto:legal@hoaspforge.com"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
                }}
              >
                legal@hoaspforge.com
              </a>
            </div>
          </aside>

          {/* Right Column: Active Answer Display Pane */}
          <div id="terms-content-pane" className="legal-content-column">
            <article
              id={activeSection}
              role="tabpanel"
              aria-labelledby={`tab-${activeSection}`}
              className="legal-document-card legal-answer-card"
            >
              {/* Active Section Header */}
              <div className="legal-section-header">
                <span className="legal-section-num">{currentNav.num}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CurrentIcon size={22} style={{ color: 'var(--accent-primary)' }} />
                  <h2 className="legal-section-title">{currentNav.title}</h2>
                </div>
              </div>

              {/* Dynamic Answer Content per Active Menu */}
              {activeSection === 'section-1' && (
                <div>
                  <p className="legal-body-text">
                    These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the HoaspForge platform, including its websites, applications, APIs, AI features, and integrations (collectively, the &ldquo;Service&rdquo;).
                  </p>
                  <p className="legal-body-text">
                    By using the Service, you agree to these Terms. If acting on behalf of an organization or entity, you represent that you are authorized to bind that entity. You are responsible for safeguarding your credentials and providing accurate account information.
                  </p>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    HoaspForge may update these Terms periodically. Material changes will be communicated in advance where required by law, and continued use constitutes acceptance.
                  </p>
                </div>
              )}

              {activeSection === 'section-2' && (
                <div>
                  <p className="legal-body-text">
                    HoaspForge provides tools for social media management, AI-assisted content creation, scheduling, analytics, and automation.
                  </p>
                  <p className="legal-body-text">
                    The Service supports AI autonomy levels from L1 (human-driven) through L5 (autonomous agent loops). You are responsible for configuring review controls, selecting appropriate automation settings, and reviewing content prior to publication.
                  </p>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    You remain responsible for all content published through your connected channels, and feature availability may vary by plan tier and third-party API permissions.
                  </p>
                </div>
              )}

              {activeSection === 'section-3' && (
                <div>
                  <p className="legal-body-text">
                    The Service integrates with Meta (Facebook &amp; Instagram), X, LinkedIn, YouTube, TikTok, and other platforms. Your use of these integrations is subject to their respective developer terms, policies, and rate limits.
                  </p>
                  <p className="legal-body-text" style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    You are responsible for:
                  </p>
                  <ul className="legal-list">
                    <li className="legal-list-item">Maintaining valid account permissions and granting necessary access.</li>
                    <li className="legal-list-item">Complying with third-party platform rules and community guidelines.</li>
                    <li className="legal-list-item">Ensuring all published media and copy are lawful.</li>
                  </ul>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    HoaspForge is not liable for service disruptions, API suspensions, or policy changes initiated by third-party platforms.
                  </p>
                </div>
              )}

              {activeSection === 'section-4' && (
                <div>
                  <h3 className="legal-subsection-title">4.1 Your Content</h3>
                  <p className="legal-body-text">
                    You retain all ownership rights in your uploaded brand assets, media, and copy (&ldquo;User Content&rdquo;). You grant HoaspForge a limited operational license to host, process, and transmit your content solely to provide and maintain the Service.
                  </p>

                  <h3 className="legal-subsection-title">4.2 AI-Generated Content</h3>
                  <p className="legal-body-text">
                    HoaspForge does not claim ownership of AI outputs generated for your account. AI outputs may be similar across users and are not guaranteed to be unique or copyrightable. You are responsible for reviewing AI content before commercial distribution.
                  </p>

                  <h3 className="legal-subsection-title">4.3 HoaspForge Intellectual Property</h3>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    HoaspForge and its licensors retain all rights, title, and interest in the platform software, architecture, branding, trademarks, and documentation.
                  </p>
                </div>
              )}

              {activeSection === 'section-5' && (
                <div>
                  <h3 className="legal-subsection-title">5.1 Subscription Plans &amp; Free Trials</h3>
                  <p className="legal-body-text">
                    HoaspForge offers tiered subscriptions (Starter, Growth, Agency Pro, and Scale). Eligible accounts receive a 14-day free trial with full terms disclosed during onboarding.
                  </p>

                  <h3 className="legal-subsection-title">5.2 Billing, Renewal &amp; Changes</h3>
                  <p className="legal-body-text">
                    Paid subscriptions are billed in advance on recurring cycles via secure payment processors (such as Stripe) and renew automatically. Upgrades take effect immediately with prorated charges; downgrades take effect at the conclusion of the active billing cycle.
                  </p>

                  <h3 className="legal-subsection-title">5.3 Cancellation &amp; Data Access</h3>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    You can cancel your subscription at any time via account settings. Cancellation stops future renewals without retroactive refunds for active periods. Post-cancellation, historical content remains accessible in read-only status in accordance with our data retention policy.
                  </p>
                </div>
              )}

              {activeSection === 'section-6' && (
                <div>
                  <p className="legal-body-text" style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    You agree not to use the Service to:
                  </p>
                  <ul className="legal-list">
                    <li className="legal-list-item">Publish unlawful, fraudulent, harassing, or deceptive content.</li>
                    <li className="legal-list-item">Circumvent subscription quotas, tenant isolation boundaries, or security controls.</li>
                    <li className="legal-list-item">Distribute malware, spam, or engage in unauthorized automated harvesting.</li>
                    <li className="legal-list-item">Violate policies established by connected social networks.</li>
                  </ul>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    HoaspForge reserves the right to investigate violations and suspend accounts where necessary to safeguard users, platform integrity, or legal compliance.
                  </p>
                </div>
              )}

              {activeSection === 'section-7' && (
                <div>
                  <h3 className="legal-subsection-title">7.1 Availability &amp; AI Disclaimers</h3>
                  <p className="legal-body-text">
                    The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. AI predictions, performance scores, and reach analytics are probabilistic estimates and do not guarantee specific business or audience outcomes.
                  </p>

                  <h3 className="legal-subsection-title">7.2 Limitation of Liability</h3>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    To the maximum extent permitted by applicable law, HoaspForge is not liable for indirect, incidental, special, or consequential damages resulting from third-party outages, API changes, or reliance on AI outputs.
                  </p>
                </div>
              )}

              {activeSection === 'section-8' && (
                <div>
                  <h3 className="legal-subsection-title">8.1 Privacy &amp; Data Governance</h3>
                  <p className="legal-body-text">
                    Our data processing and token security practices are governed by the HoaspForge Privacy Policy. All OAuth tokens and tenant credentials are encrypted using AES-256-GCM.
                  </p>

                  <h3 className="legal-subsection-title">8.2 Legal Contact</h3>
                  <div className="legal-contact-callout">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                      <Mail size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>HoaspForge Legal Desk</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Email:{' '}
                      <a
                        href="mailto:legal@hoaspforge.com"
                        style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        legal@hoaspforge.com
                      </a>
                    </div>
                  </div>

                  <h3 className="legal-subsection-title">8.3 Governing Law</h3>
                  <p className="legal-body-text" style={{ marginBottom: 0 }}>
                    These Terms are governed by the laws of the jurisdiction of the contracting entity, with disputes resolved through good-faith negotiation and confidential dispute resolution.
                  </p>
                </div>
              )}

              {/* Bottom Pagination Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '40px',
                  paddingTop: '24px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                {currentIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md, 8px)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous: {SECTION_NAV[currentIndex - 1].title}</span>
                  </button>
                ) : <div />}

                {currentIndex < SECTION_NAV.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md, 8px)',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>Next: {SECTION_NAV[currentIndex + 1].title}</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </article>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
