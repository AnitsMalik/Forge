import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  Shield,
  CreditCard,
  BookOpen,
  Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';

interface PublicNavbarProps {
  currentPath?: string;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ currentPath: propPath }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const pathname = propPath || (typeof window !== 'undefined' ? window.location.pathname : '/');

  // Track scroll position to enhance navbar blur on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 868) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinks = [
    { label: 'Features', href: '/#features', icon: Sparkles },
    { label: 'Product', href: '/social-agent', icon: Bot },
    { label: 'Pricing', href: '/pricing', icon: CreditCard },
    { label: 'Resources', href: '/resources', icon: BookOpen },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`public-navbar ${isScrolled ? 'scrolled' : ''}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: isScrolled
          ? 'var(--bg-glass-card, rgba(13, 17, 27, 0.88))'
          : 'var(--bg-glass, rgba(7, 9, 14, 0.72))',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Brand Logo & Title */}
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <img
            src="/logo.svg"
            alt="HoaspForge Logo"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.35)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'var(--gradient-brand)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.1,
              }}
            >
              HoaspForge
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              AI Social Marketing
            </span>
          </div>
        </a>

        {/* Center: Desktop Navigation Links */}
        <nav
          className="public-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`public-nav-link ${active ? 'active' : ''}`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Actions (Theme Toggle + Auth CTAs) */}
        <div
          className="public-nav-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              transition: 'all 0.2s ease',
            }}
          >
            {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#8b5cf6" />}
          </button>

          {/* Conditional CTAs based on login state */}
          {user ? (
            <a
              href="/?tab=dashboard"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.86rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              }}
            >
              <LayoutDashboard size={15} />
              <span>Go to Dashboard</span>
              <ArrowRight size={14} />
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="public-nav-login-btn"
              >
                Log in
              </a>

              <a
                href="/register"
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={14} />
              </a>
            </>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="public-mobile-toggle"
            aria-label="Toggle mobile navigation menu"
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileMenuOpen && (
        <div
          className="public-mobile-menu animate-fade-in"
          style={{
            background: 'var(--bg-surface-elevated, #0d111b)',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-medium)',
            padding: '18px 24px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const IconComp = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    background: active ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                    textDecoration: 'none',
                    border: active ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                  }}
                >
                  {IconComp && <IconComp size={16} color="var(--accent-primary)" />}
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {user ? (
              <a
                href="/?tab=dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <LayoutDashboard size={16} />
                <span>Go to Dashboard</span>
              </a>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  Log in
                </a>
                <a
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
