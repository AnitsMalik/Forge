import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Code,
  FileText,
  ShieldCheck,
  Share2,
  Workflow,
  Search,
  CheckCircle,
  Activity,
  Layers,
  Database,
  Lock,
  Users,
} from 'lucide-react';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { PublicFooter } from '../../components/public/PublicFooter.js';
import { usePageMeta } from '../../hooks/index.js';

export const ResourcesPage: React.FC = () => {
  usePageMeta({
    title: 'Resources, Guides & Documentation — HoaspForge',
    description: 'Explore setup guides, multi-channel social playbooks, technical architecture, and real-time operational status for the HoaspForge marketing platform.',
    canonicalPath: '/resources',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const resources = [
    {
      category: 'guides',
      title: 'Connecting Meta Facebook & Instagram in 5 Minutes',
      desc: 'Complete walkthrough of the OAuth v20.0 authorization process, permission requirements, and page resource selection.',
      readTime: '4 min read',
      tag: 'Setup Guide',
      link: '/resources#meta-guide',
    },
    {
      category: 'guides',
      title: 'Google Sheets & Product Catalog Synchronization',
      desc: 'How to structure your Google Sheet headers, configure auto-sync polling intervals, and map SKU fields to Marketing Objects.',
      readTime: '6 min read',
      tag: 'Data Connectors',
      link: '/resources#sheets-guide',
    },
    {
      category: 'playbooks',
      title: 'Brand Brain: Enforcing Voice, Tone & Taboo Words',
      desc: 'Configure brand personas, tone directives, and automated taboo word filters to keep AI generations on-brand.',
      readTime: '5 min read',
      tag: 'AI Prompting',
      link: '/resources#brand-brain',
    },
    {
      category: 'playbooks',
      title: 'Client Review Portals & 72-Hour Magic Links',
      desc: 'A complete guide to frictionless client sign-offs on mobile and desktop without requiring external clients to have paid seats.',
      readTime: '3 min read',
      tag: 'Workflows',
      link: '/resources#magic-links',
    },
    {
      category: 'technical',
      title: 'Social Platform Adapter Architecture & Concurrency',
      desc: 'Technical specification of the unified SocialPlatformAdapter interface, BullMQ delayed workers, and Redlock concurrency.',
      readTime: '8 min read',
      tag: 'Architecture',
      link: '/resources#adapter-architecture',
    },
    {
      category: 'technical',
      title: 'AES-256-GCM Envelope Encryption & Vault Security',
      desc: 'How HoaspForge secures OAuth tokens at rest using AES-GCM envelope encryption with distinct IVs and auth tags.',
      readTime: '7 min read',
      tag: 'Security',
      link: '/resources#security-vault',
    },
  ];

  const filteredResources = resources.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="public-page-root" style={{ minHeight: '100vh', background: 'var(--bg-canvas, #07090e)', color: 'var(--text-primary)' }}>
      {/* 1. Navigation */}
      <PublicNavbar currentPath="/resources" />

      <main style={{ paddingBottom: '96px' }}>
        {/* =========================================================================
            HERO & SEARCH SECTION
            ========================================================================= */}
        <section
          style={{
            position: 'relative',
            paddingTop: '64px',
            paddingBottom: '48px',
            textAlign: 'center',
          }}
        >
          <div className="hero-glow-bg" />

          <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Knowledge &amp; Documentation Hub
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                maxWidth: '840px',
                margin: '12px auto 20px auto',
              }}
            >
              Resources, Guides &amp; <span className="gradient-text">Architecture Docs</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto 36px auto', lineHeight: 1.6 }}>
              Everything you need to master HoaspForge—from setting up Meta connections to architecting automated client approval pipelines.
            </p>

            {/* Search Input Bar */}
            <div
              style={{
                maxWidth: '560px',
                margin: '0 auto 32px auto',
                position: 'relative',
              }}
            >
              <input
                type="text"
                placeholder="Search guides, technical docs, and tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="resource-search-input"
              />
              <Search
                size={18}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Resources' },
                { id: 'guides', label: 'Setup Guides' },
                { id: 'playbooks', label: 'Playbooks & Best Practices' },
                { id: 'technical', label: 'Technical Architecture' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`resource-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            RESOURCES GRID
            ========================================================================= */}
        <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px', marginBottom: '80px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredResources.map((item, index) => (
              <div
                key={index}
                className="public-feature-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {item.tag}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {item.readTime}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                    {item.desc}
                  </p>
                </div>

                <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                  <a
                    href={item.link}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--accent-primary)',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <span>Read Article</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compact Trust Strip */}
        <section style={{ maxWidth: '1240px', margin: '0 auto 48px auto', padding: '0 24px' }}>
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
        </section>

        {/* =========================================================================
            LIVE SYSTEM STATUS CALLOUT
            ========================================================================= */}
        <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div className="system-status-callout">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <Activity size={24} />
              </div>
              <div>
                <div className="status-title">
                  HoaspForge Real-Time System Status
                </div>
                <div className="status-desc">
                  Meta Graph API v20.0, BullMQ Workers, and MySQL Shard Mesh are operating with 99.98% uptime.
                </div>
              </div>
            </div>

            <a
              href="/status"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>View Live Health Dashboard</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </section>
      </main>

      {/* 2. Footer */}
      <PublicFooter />
    </div>
  );
};
