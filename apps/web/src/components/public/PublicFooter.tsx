import React from 'react';
import {
  Sparkles,
  Shield,
  Activity,
  ArrowRight,
  ExternalLink,
  Github,
  Twitter,
  Linkedin,
  CheckCircle,
} from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer
      className="public-footer"
      style={{
        background: 'var(--bg-canvas, #07090e)',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '64px',
        paddingBottom: '40px',
        color: 'var(--text-secondary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '240px',
          background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand Column */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <img
                src="/logo.svg"
                alt="HoaspForge Logo"
                style={{ width: '32px', height: '32px', borderRadius: '8px' }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  background: 'var(--gradient-brand)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                HoaspForge
              </span>
            </div>
            <p
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                marginBottom: '20px',
                maxWidth: '280px',
              }}
            >
              The intelligent AI social marketing team in one unified platform. Designed for multi-brand agencies and high-growth creators.
            </p>

            {/* Live Operational Status Pill */}
            <a
              href="/status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                  animation: 'pulseGlow 2s infinite',
                }}
              />
              <span>All Systems Operational</span>
            </a>
          </div>

          {/* Product Links */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                marginBottom: '18px',
              }}
            >
              Product
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><a href="/#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Features</a></li>
              <li><a href="/social-agent" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>AI Agent</a></li>
              <li><a href="/resources#meta" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Integrations</a></li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                marginBottom: '18px',
              }}
            >
              Solutions
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><a href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Solo Creators</a></li>
              <li><a href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Marketing Teams</a></li>
              <li><a href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Digital Agencies</a></li>
              <li><a href="/pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Enterprise Scale</a></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                marginBottom: '18px',
              }}
            >
              Resources
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><a href="/resources#api" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Documentation</a></li>
              <li><a href="/resources" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Guides</a></li>
              <li><a href="/pricing#faq" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Help Center</a></li>
              <li><a href="/status" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>System Status</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                marginBottom: '18px',
              }}
            >
              Company
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><a href="/#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>About</a></li>
              <li><a href="/contact" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Contact</a></li>
              <li><a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Privacy Policy</a></li>
              <li><a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s' }}>Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} HoaspForge Platform. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
            <a href="/resources#security-vault" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Security Overview</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
