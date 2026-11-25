import React, { useState } from 'react';
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Building2,
  Users,
  Bot,
  Zap,
  Lock,
  CheckCircle2,
  Layers,
  Database,
  Video,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Sliders,
  ExternalLink,
  Shield,
  CreditCard,
} from 'lucide-react';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { PublicFooter } from '../../components/public/PublicFooter.js';
import { usePageMeta } from '../../hooks/index.js';
import {
  HOASPFORGE_PLANS,
  HOASPFORGE_USAGE_ADDONS,
  HOASPFORGE_21_MODULES,
} from '@socialforge/shared';
import { PlanCompareTable } from '../../components/billing/PlanCompareTable.js';
import './PricingPage.css';

export const PricingPage: React.FC = () => {
  usePageMeta({
    title: 'Subscription Pricing & Feature Packaging — HoaspForge by HOASP International',
    description: 'Transparent commercial pricing for HoaspForge: Starter ($59/mo), Growth ($99/mo), Agency Pro ($249/mo), and Scale ($499/mo). 21 marketing modules, 116 catalogued core features, 14-day free trial.',
    canonicalPath: '/pricing',
  });

  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const planKeys: (keyof typeof HOASPFORGE_PLANS)[] = ['starter', 'growth', 'agency', 'scale'];

  const faqs = [
    {
      q: 'How does the 14-day free evaluation work?',
      a: 'All plans include a full-featured 14-day trial with full access to our AI Design Studio, multi-channel calendar, Brand Brain, CRM, and approval magic links. No credit card commitment is required, and you can switch tiers or cancel at any time.',
    },
    {
      q: 'How does switching between Monthly and Annual billing work?',
      a: 'Choosing annual billing saves up to 20% (equivalent to approximately two months free). Upgrades take effect immediately with pro-rated billing via Stripe. Downgrades take effect at the conclusion of your pre-paid period.',
    },
    {
      q: 'How do usage-based add-ons and Bring-Your-Own (BYO) providers work?',
      a: 'HoaspForge operates a sustainable, transparent cost model. For variable third-party services like high-volume email delivery (SendGrid, Amazon SES, Mailgun, Postmark, Resend), WhatsApp (Meta Cloud API), and SMS (Twilio), you can connect your own provider API credentials with 0% platform markup. Alternatively, convenient platform metered packs are available.',
    },
    {
      q: 'Why does HoaspForge not display raw AI token counters?',
      a: 'We believe customers should focus on marketing outcomes rather than calculating raw AI tokens. All plans include standard generative capabilities (copywriting, captions, hashtags, design assistance) governed by internal fair-use safeguards without exposing technical token arithmetic.',
    },
    {
      q: 'How do Client Review Magic Links work for agencies?',
      a: 'Growth, Agency Pro, and Scale plans feature encrypted 72-hour magic review links. You can share interactive post drafts and campaigns with external clients for approval or feedback on desktop and mobile without requiring them to create a login account or purchase a paid seat.',
    },
    {
      q: 'What is the Zero Data Deletion Guarantee?',
      a: 'If you ever decide to pause or downgrade your plan, your historical posts, brand assets, connected channels, and analytics records remain safely stored in read-only mode so you never lose your marketing assets.',
    },
  ];

  return (
    <div className="pricing-page-root">
      <PublicNavbar currentPath="/pricing" />

      <main style={{ paddingBottom: '96px' }}>
        {/* Glow backdrop */}
        <div className="pricing-hero-glow" />

        {/* HERO SECTION */}
        <section className="pricing-hero">
          <div className="pricing-container">
            <div className="pricing-pretitle">
              <Sparkles size={14} />
              <span>HoaspForge by HOASP International</span>
            </div>

            <h1 className="pricing-hero-title">
              Omnichannel Marketing Operating System <span className="pricing-gradient-text">Pricing</span>
            </h1>

            <p className="pricing-hero-desc">
              21 unified modules, 116 core marketing capabilities, and 12 canvas vector generators.
              Choose the right capacity for your brands, team seats, and publishing volume.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="pricing-toggle-wrap">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`pricing-toggle-btn ${!isAnnual ? 'active' : ''}`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`pricing-toggle-btn ${isAnnual ? 'active' : ''}`}
              >
                Annual Billing
              </button>
              <span className="pricing-savings-pill">
                SAVE UP TO 20% (~2 MONTHS FREE)
              </span>
            </div>
          </div>
        </section>

        {/* 4 CORE PLAN CARDS */}
        <section className="pricing-container">
          <div className="pricing-grid">
            {planKeys.map((key) => {
              const plan = HOASPFORGE_PLANS[key];
              const price = isAnnual ? plan.annualMonthlyPrice : plan.monthlyPrice;
              const isPopular = plan.isPopular;
              const isAgency = plan.isBestValue;

              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${
                    isPopular ? 'featured-popular' : isAgency ? 'featured-agency' : ''
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`pricing-badge ${
                        isPopular ? 'badge-popular' : 'badge-agency'
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div className="pricing-card-header">
                    <h2 className="pricing-card-title">{plan.name}</h2>
                    <div className="pricing-card-tagline">{plan.tagline}</div>
                    <p className="pricing-card-desc">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="pricing-price-block">
                    <div className="pricing-price-num-row">
                      <span className="pricing-price-amount">${price}</span>
                      <span className="pricing-price-unit">/ month</span>
                    </div>
                    <div className="pricing-price-billing-note">
                      {isAnnual
                        ? `Billed annually ($${price * 12}/year)`
                        : 'Billed monthly, cancel anytime'}
                    </div>
                  </div>

                  {/* Verified Plan Limits Box */}
                  <div className="pricing-quotas-box">
                    <div className="pricing-quota-row">
                      <span className="pricing-quota-label">Brand Workspaces</span>
                      <span className="pricing-quota-val">{plan.limits.brands}</span>
                    </div>
                    <div className="pricing-quota-row">
                      <span className="pricing-quota-label">Team Seats</span>
                      <span className="pricing-quota-val">{plan.limits.seats}</span>
                    </div>
                    <div className="pricing-quota-row">
                      <span className="pricing-quota-label">Social Accounts</span>
                      <span className="pricing-quota-val">{plan.limits.socialAccounts}</span>
                    </div>
                    <div className="pricing-quota-row">
                      <span className="pricing-quota-label">Monthly Posts</span>
                      <span className="pricing-quota-val">
                        {plan.limits.monthlyPosts.toLocaleString()}
                      </span>
                    </div>
                    <div className="pricing-quota-row">
                      <span className="pricing-quota-label">Cloud Storage</span>
                      <span className="pricing-quota-val">{plan.limits.storageGb} GB</span>
                    </div>
                    <div className="pricing-quota-row">
                      <span className="pricing-quota-label">Active Automations</span>
                      <span className="pricing-quota-val">{plan.limits.automations}</span>
                    </div>
                  </div>

                  {/* Feature Highlights */}
                  <ul className="pricing-feature-list">
                    {plan.keyHighlights.map((highlight, idx) => (
                      <li key={idx} className="pricing-feature-item">
                        <Check size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Action */}
                  <a
                    href={`/register?plan=${plan.id}&interval=${isAnnual ? 'year' : 'month'}`}
                    className={`pricing-cta-btn ${
                      isPopular
                        ? 'pricing-cta-primary'
                        : isAgency
                          ? 'pricing-cta-blue'
                          : 'pricing-cta-secondary'
                    }`}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              );
            })}
          </div>

          {/* ENTERPRISE SECTION */}
          <div className="pricing-enterprise-banner">
            <div className="pricing-ent-left">
              <span className="pricing-ent-badge">Custom Tailored</span>
              <h3 className="pricing-ent-title">Enterprise Operating Architecture</h3>
              <p className="pricing-ent-desc">
                For global holding companies, multi-region brands, and regulated organizations.
                Includes custom brand allocations, dedicated GPU render clusters, SCIM directory synchronization,
                continuous compliance WORM vaults, custom MSA, and dedicated 24/7 technical advisory.
              </p>
            </div>
            <a
              href="mailto:enterprise@hoasp.com?subject=hoaspForge%20Enterprise%20Inquiry"
              className="pricing-cta-btn pricing-cta-primary"
              style={{ minWidth: '220px', width: 'auto' }}
            >
              <span>Contact Sales</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* USAGE-BASED SERVICES SECTION (Sustainable Cost Model) */}
          <div className="pricing-usage-section">
            <h2 className="pricing-section-title">Usage-Based Services &amp; Add-Ons</h2>
            <p className="pricing-section-subtitle">
              Transparent, sustainable pricing for high-volume delivery. Never worry about surprise bills.
              Connect your own email, SMS, and WhatsApp provider accounts with 0% platform markup.
            </p>

            <div className="pricing-usage-grid">
              {HOASPFORGE_USAGE_ADDONS.map((addon) => (
                <div key={addon.id} className="pricing-usage-card">
                  <div className="pricing-usage-card-top">
                    <span className="pricing-usage-name">{addon.name}</span>
                    <span className="pricing-usage-model-tag">{addon.providerModel}</span>
                  </div>
                  <p className="pricing-usage-desc">{addon.description}</p>
                  <div className="pricing-usage-rate-box">
                    <span className="pricing-usage-rate-label">Overage / Unit Rate</span>
                    <span className="pricing-usage-rate-val">{addon.overageRate}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <strong>Note:</strong> {addon.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 21-MODULE FEATURE MATRIX & INTERACTIVE COMPARE TABLE */}
          <div className="pricing-matrix-section">
            <h2 className="pricing-section-title">Compare All Plan Capabilities</h2>
            <p className="pricing-section-subtitle">
              Interactive breakdown of all 116 catalogued core features and resource capacities across our 21 architectural modules.
            </p>

            <PlanCompareTable isAnnual={isAnnual} isPublic={true} />
          </div>

          {/* FREQUENTLY ASKED QUESTIONS */}
          <div className="pricing-faq-section">
            <h2 className="pricing-section-title">Frequently Asked Questions</h2>
            <p className="pricing-section-subtitle">
              Clear answers regarding our subscriptions, trials, providers, and data protections.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="pricing-faq-item">
                    <button
                      type="button"
                      className="pricing-faq-question"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={18}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          color: isOpen ? '#a855f7' : '#94a3b8',
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div className="pricing-faq-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
