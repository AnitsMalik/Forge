import React from 'react';
import {
  Shield,
  Lock,
  Key,
  Database,
  FileCheck,
  CheckCircle,
  Eye,
  Server,
  UserCheck,
} from 'lucide-react';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { PublicFooter } from '../../components/public/PublicFooter.js';
import { usePageMeta } from '../../hooks/index.js';

export const PrivacyPage: React.FC = () => {
  usePageMeta({
    title: 'Privacy Policy — HoaspForge',
    description: 'Learn how HoaspForge collects, encrypts, processes, and protects your personal data, OAuth credentials, and marketing assets.',
    canonicalPath: '/privacy',
  });

  return (
    <div className="public-page-root" style={{ minHeight: '100vh', background: 'var(--bg-canvas, #07090e)', color: 'var(--text-primary)' }}>
      <PublicNavbar currentPath="/privacy" />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 24px 96px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '16px',
            }}
          >
            <Shield size={16} />
            <span>Data Protection &amp; Privacy</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
              fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '12px',
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Last Updated: October 27, 2026 • Platform Version v6.9.0
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-surface, #0f131a)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '40px',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
          }}
        >
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              1. Overview &amp; Data Controller
            </h2>
            <p>
              HoaspForge (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy and ensuring zero exposure of sensitive authentication credentials. This Privacy Policy outlines our practices regarding data collection, processing, and storage across our multi-tenant SaaS infrastructure.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              2. Data We Collect
            </h2>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Account Credentials:</strong> Full name, verified email address, organization name, and hashed passwords (using bcrypt with 10 salt rounds).</li>
              <li><strong>OAuth Platform Tokens:</strong> Access tokens and refresh tokens granted during social connection flows (Meta Graph API, X, LinkedIn, YouTube, TikTok).</li>
              <li><strong>Brand &amp; Marketing Context:</strong> Brand voice directives, taboo word lists, personas, uploaded media assets, and product catalog synchronization records.</li>
              <li><strong>Audit &amp; Telemetry Logs:</strong> Timestamped action events, IP addresses, user agents, and cryptographic WORM verification receipts.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              3. Zero-Trust Credential Encryption
            </h2>
            <p>
              OAuth access tokens and refresh tokens are encrypted at rest using <strong>AES-256-GCM envelope encryption</strong> with unique 12-byte initialization vectors (IV) and 16-byte authentication tags per record. Tokens are never logged in plaintext or exposed across public APIs. Telemetry endpoints strictly display masked identifiers (e.g., <code>[VAULT_REF_AES256:****6a6e]</code>).
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              4. How We Use Your Data
            </h2>
            <p>We process customer information solely to:</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Provide, maintain, and secure the HoaspForge application.</li>
              <li>Execute scheduled social publications and process engagement analytics.</li>
              <li>Generate AI copy adaptations matching your Brand Brain guidelines.</li>
              <li>Facilitate client review magic links with 72-hour cryptographic token expiration.</li>
              <li>Enforce subscription limits and maintain tamper-evident compliance audit ledgers.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              5. Third-Party Subprocessors
            </h2>
            <p>We engage vetted subprocessors strictly under binding Data Protection Agreements (DPAs):</p>
            <ul style={{ paddingLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Stripe:</strong> Payment processing and subscription invoicing. No raw credit card data touches HoaspForge servers.</li>
              <li><strong>OpenAI:</strong> LLM generation for post copy and caption variations. Customer prompt data is not used for model training under enterprise agreements.</li>
              <li><strong>Cloud Storage:</strong> Encrypted object storage for uploaded image and video assets.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              6. Your Privacy Rights (GDPR &amp; CCPA)
            </h2>
            <p>
              Depending on your jurisdiction, you have the right to request access to, correction of, or deletion of your personal data; to export your media and post archives; and to revoke third-party social connections at any time with immediate token disposal.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              7. Contact Our Privacy Officer
            </h2>
            <p>
              To exercise privacy rights or report a security concern, contact our privacy desk at <a href="mailto:privacy@hoaspforge.com" style={{ color: '#10b981' }}>privacy@hoaspforge.com</a>.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
