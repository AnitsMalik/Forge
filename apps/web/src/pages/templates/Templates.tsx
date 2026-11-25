import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutTemplate,
  Sparkles,
  Layers,
  Search,
  Copy,
  Globe,
  Building2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Maximize2,
  Palette,
  FileCheck2,
  Bot,
  Lock,
  Tag,
  Monitor,
  Flame,
  PenTool,
} from 'lucide-react';
import { api } from '../../services/api';
import { CANONICAL_STAGE4_TEMPLATE_CATALOG } from '../../constants/stage4TemplateCatalog.js';


interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  aspectRatio: string;
  dimensions?: { width: number; height: number };
  scope?: string;
  supportedPlatforms?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  brandTokens?: {
    primary?: string;
    accent?: string;
    background?: string;
    fontFamily?: string;
  };
  aiInstructions?: string;
  claimRestrictions?: string[];
  ctaRules?: string[];
  approvalPolicy?: string;
  status?: string;
  activeVersion?: number;
  isCustom?: boolean;
  isBuiltIn?: boolean;
  tags?: string[];
  layers?: any[];
  visualComponents?: any[];
  background?: {
    type?: string;
    value?: string;
    overlayOpacity?: number;
  };
}

const CATEGORY_MAP: Record<string, { label: string; subcategories: { key: string; label: string }[] }> = {
  product: {
    label: 'Product',
    subcategories: [
      { key: 'new_arrival', label: 'New Arrival' },
      { key: 'product_promotion', label: 'Product Promotion' },
      { key: 'feature', label: 'Feature' },
    ],
  },
  offer: {
    label: 'Offer',
    subcategories: [
      { key: 'discount', label: 'Discount' },
      { key: 'festival', label: 'Festival' },
      { key: 'limited_time', label: 'Limited Time' },
    ],
  },
  education: {
    label: 'Education',
    subcategories: [
      { key: 'tip', label: 'Tip' },
      { key: 'how_to', label: 'How-to' },
      { key: 'myth_vs_fact', label: 'Myth vs Fact' },
    ],
  },
  trust: {
    label: 'Trust',
    subcategories: [
      { key: 'testimonial', label: 'Testimonial' },
      { key: 'review', label: 'Review' },
      { key: 'case_study', label: 'Case Study' },
    ],
  },
  company: {
    label: 'Company',
    subcategories: [
      { key: 'announcement', label: 'Announcement' },
      { key: 'milestone', label: 'Milestone' },
      { key: 'hiring', label: 'Hiring' },
    ],
  },
  event: {
    label: 'Event',
    subcategories: [
      { key: 'webinar', label: 'Webinar' },
      { key: 'workshop', label: 'Workshop' },
      { key: 'launch', label: 'Launch' },
    ],
  },
  vertical: {
    label: 'Vertical',
    subcategories: [
      { key: 'property', label: 'Property' },
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'course', label: 'Course' },
      { key: 'service', label: 'Service' },
    ],
  },
};

const CATEGORIES = ['All', 'Product', 'Offer', 'Education', 'Trust', 'Company', 'Event', 'Vertical'];

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateItem[]>(CANONICAL_STAGE4_TEMPLATE_CATALOG as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewRatio, setPreviewRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('1:1');
  const [previewBindings, setPreviewBindings] = useState<Record<string, string>>({});

  const fetchTemplates = async () => {
    try {
      const catKey = selectedCategory !== 'All' ? selectedCategory.toLowerCase() : undefined;
      const res = await api.templates.list(undefined, {
        category: catKey,
        q: searchQuery.trim() || undefined,
      });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (list.length > 0) {
        const mergedMap = new Map<string, TemplateItem>();
        (CANONICAL_STAGE4_TEMPLATE_CATALOG as any[]).forEach((t) => mergedMap.set(t.id, t));
        list.forEach((t: any) => {
          const existing = mergedMap.get(t.id) || {};
          mergedMap.set(t.id, { ...existing, ...t });
        });
        setTemplates(Array.from(mergedMap.values()));
        setError(null);
      }
    } catch (err: any) {
      console.warn('[Templates] Backend template catalog sync notice:', err.message);
      // Graceful fallback: we keep the preloaded CANONICAL_STAGE4_TEMPLATE_CATALOG active!
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleDuplicate = async (templateId: string, name: string) => {
    setDuplicatingId(templateId);
    try {
      await api.templates.duplicate(templateId, undefined, `${name} (Copy)`);
      await fetchTemplates();
    } catch (err: any) {
      setError(`Duplication failed: ${err.message}`);
    } finally {
      setDuplicatingId(null);
    }
  };

  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'All') {
      const allSubs: { key: string; label: string }[] = [];
      Object.values(CATEGORY_MAP).forEach((c) => {
        allSubs.push(...c.subcategories);
      });
      return allSubs;
    }
    const cat = CATEGORY_MAP[selectedCategory.toLowerCase()];
    return cat ? cat.subcategories : [];
  }, [selectedCategory]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      // Category match
      const tCat = (t.category || '').toLowerCase();
      const matchesCat =
        selectedCategory === 'All' ||
        tCat === selectedCategory.toLowerCase() ||
        (selectedCategory.toLowerCase() === 'product' && tCat === 'product_promotion');

      // Subcategory match
      const tSub = (t.subcategory || '').toLowerCase();
      const matchesSub =
        selectedSubcategory === 'All' ||
        tSub === selectedSubcategory.toLowerCase() ||
        t.id.includes(selectedSubcategory.toLowerCase());

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        (t.subcategory && t.subcategory.toLowerCase().includes(q));

      return matchesCat && matchesSub && matchesSearch;
    });
  }, [templates, selectedCategory, selectedSubcategory, searchQuery]);

  const openPreview = (tpl: TemplateItem) => {
    setPreviewTemplate(tpl);
    setPreviewRatio((tpl.aspectRatio as any) || '1:1');
    const initialBindings: Record<string, string> = {};
    if (tpl.requiredFields) {
      tpl.requiredFields.forEach((f) => {
        if (f.includes('price')) initialBindings[f] = '$49.99';
        else if (f.includes('name') || f.includes('headline')) initialBindings[f] = 'Lumina Aura Radiance';
        else if (f.includes('benefit')) initialBindings[f] = 'Instantly revives dull skin barrier in 24 hours';
        else if (f.includes('discount')) initialBindings[f] = '25% OFF';
        else initialBindings[f] = 'Sample Value';
      });
    }
    setPreviewBindings(initialBindings);
  };

  const getGradientForCategory = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'product':
      case 'product_promotion':
        return 'from-blue-900/80 via-indigo-950 to-slate-900';
      case 'offer':
        return 'from-amber-900/80 via-orange-950 to-slate-900';
      case 'education':
        return 'from-emerald-900/80 via-teal-950 to-slate-900';
      case 'trust':
        return 'from-cyan-900/80 via-sky-950 to-slate-900';
      case 'company':
        return 'from-violet-900/80 via-purple-950 to-slate-900';
      case 'event':
        return 'from-fuchsia-900/80 via-pink-950 to-slate-900';
      case 'vertical':
        return 'from-rose-900/80 via-red-950 to-slate-900';
      default:
        return 'from-slate-900 via-indigo-950/40 to-slate-900';
    }
  };

  const getSubcategoryBadgeColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'product':
      case 'product_promotion':
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
      case 'offer':
        return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
      case 'education':
        return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
      case 'trust':
        return 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20';
      case 'company':
        return 'text-violet-300 bg-violet-500/10 border-violet-500/20';
      case 'event':
        return 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/20';
      case 'vertical':
        return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="template-catalog-container">
      {/* Navigation Breadcrumb & Header */}
      <div className="template-catalog-nav-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            className="template-catalog-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div style={{ height: '18px', width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            <span>Visual Engine</span>
            <span>/</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Stage 4 Template Catalog</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="template-catalog-badge-pill">
            <ShieldCheck className="w-4 h-4" />
            <span>Versioned Immutable Templates</span>
          </div>
          <button
            onClick={() => navigate('/templates/editor')}
            className="template-catalog-action-btn"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.4)',
              color: '#ffffff',
            }}
            title="Create a new custom template in Canvas Studio"
          >
            <PenTool className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span>New Template</span>
          </button>
          <button
            onClick={() => navigate('/templates/versions')}
            className="template-catalog-action-btn"
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span>Audit & Rollbacks</span>
          </button>
        </div>
      </div>

      {/* Hero Banner with Controlled System Artifact Guard */}
      <div className="template-catalog-hero">
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '840px' }}>
          <div className="template-catalog-hero-stage-badge">
            <Sparkles className="w-4 h-4" />
            <span>HoaspForge HLD Stage 4: Versioned Template Engine</span>
          </div>
          <h1 className="template-catalog-hero-title">
            Canonical Multi-Platform Template Catalog
          </h1>
          <p className="template-catalog-hero-desc">
            Enterprise design templates across 7 strategic categories and 22 subcategories. Enforces WCAG 2.1 AA luminance contrast scoring, multi-platform coordinate reflows, claim restrictions, CTA rules, and immutable version branching.
          </p>
          <div className="template-catalog-hero-tags">
            <span className="template-catalog-hero-tag protected">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Mutation Protected: Read & Populate Only</span>
            </span>
            <span className="template-catalog-hero-tag snapshots">
              <Lock className="w-3.5 h-3.5" />
              <span>Immutable Post-Use Snapshots</span>
            </span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="template-catalog-filters-row">
          {/* Main 7 Categories */}
          <div className="template-catalog-category-bar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubcategory('All');
                  }}
                  className={`template-catalog-cat-btn ${isSelected ? 'active' : ''}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Bar with nested icon */}
          <form onSubmit={handleSearchSubmit} className="template-catalog-search-wrapper">
            <Search className="template-catalog-search-icon" />
            <input
              type="text"
              placeholder="Search templates, tokens, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="template-catalog-search-input"
            />
          </form>
        </div>

        {/* Subcategory Pills */}
        {availableSubcategories.length > 0 && (
          <div className="template-catalog-subcategories-bar">
            <span className="template-catalog-subcat-label">
              Subcategory:
            </span>
            <button
              onClick={() => setSelectedSubcategory('All')}
              className={`template-catalog-subcat-pill ${selectedSubcategory === 'All' ? 'active' : ''}`}
            >
              All Subcategories
            </button>
            {availableSubcategories.map((sub) => {
              const isSelected = selectedSubcategory.toLowerCase() === sub.key.toLowerCase();
              return (
                <button
                  key={sub.key}
                  onClick={() => setSelectedSubcategory(sub.key)}
                  className={`template-catalog-subcat-pill ${isSelected ? 'active' : ''}`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Notice (if any) */}
      {error && (
        <div style={{ padding: '12px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span>{error}</span>
          <button
            onClick={() => fetchTemplates()}
            style={{ padding: '4px 12px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="template-catalog-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="template-card"
              style={{ height: '340px', padding: '24px', opacity: 0.6 }}
            >
              <div style={{ height: '20px', width: '40%', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }} />
              <div style={{ height: '140px', width: '100%', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }} />
              <div style={{ height: '36px', width: '100%', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Template Grid */}
      {!loading && filtered.length > 0 && (
        <div className="template-catalog-grid">
          {filtered.map((t) => {
            const isFlagship = t.id === 'tpl-product-flagship';
            const isCustom = t.isCustom;
            const scope = t.scope || (isCustom ? 'Tenant' : 'Global');
            const platforms = t.supportedPlatforms || ['facebook', 'instagram'];
            const reqFields = t.requiredFields || [];
            const subName = t.subcategory ? t.subcategory.replace('_', ' ') : 'General';

            return (
              <div
                key={t.id}
                className={`template-card ${isFlagship ? 'flagship' : ''}`}
              >
                {/* Visual Preview Header Card */}
                <div
                  className="template-card-header"
                  style={{
                    background: isFlagship
                      ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(67, 56, 202, 0.6) 50%, rgba(124, 58, 237, 0.4) 100%)'
                      : 'linear-gradient(135deg, rgba(13, 17, 27, 0.95) 0%, rgba(30, 41, 59, 0.6) 50%, rgba(88, 28, 135, 0.3) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.6)', color: '#ffffff', backdropFilter: 'blur(8px)' }}>
                        {t.aspectRatio || '1:1'}
                      </span>
                      {scope === 'global' ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Globe className="w-2.5 h-2.5" />
                          <span>Global</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 className="w-2.5 h-2.5" />
                          <span>Custom</span>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isFlagship && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#facc15', background: 'rgba(250, 204, 21, 0.15)', border: '1px solid rgba(250, 204, 21, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Flagship</span>
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
                        v{t.activeVersion || 1}
                      </span>
                    </div>
                  </div>

                  {/* Template Title & Category / Subcategory Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: '#c084fc', letterSpacing: '0.05em' }}>
                        {t.category.toUpperCase()}
                      </span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>•</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#d8b4fe' }}>
                        {subName}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                      {t.name}
                    </h3>
                    {t.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details & Specs */}
                <div className="template-card-body">
                  {/* Platforms & Variables */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Networks:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {platforms.map((p) => (
                          <span
                            key={p}
                            style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {reqFields.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', color: 'var(--text-muted)' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Bindings:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                          {reqFields.slice(0, 3).map((f) => (
                            <span
                              key={f}
                              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}
                            >
                              {`{{${f}}}`}
                            </span>
                          ))}
                          {reqFields.length > 3 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              +{reqFields.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="template-card-actions">
                    <button
                      onClick={() => openPreview(t)}
                      className="template-card-btn-primary"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview & Inspect</span>
                    </button>

                    <button
                      onClick={() => navigate(`/templates/versions?templateId=${t.id}`)}
                      className="template-card-btn-secondary"
                      title="View immutable versions & platform variant bundles"
                    >
                      <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                      <span>v{t.activeVersion || 1}</span>
                    </button>

                    <button
                      onClick={() => handleDuplicate(t.id, t.name)}
                      disabled={duplicatingId === t.id}
                      className="template-card-btn-secondary"
                      title="Duplicate Template"
                      style={{ padding: '0 10px' }}
                    >
                      <Copy
                        className={`w-3.5 h-3.5 ${duplicatingId === t.id ? 'animate-spin' : ''
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="template-catalog-empty-card">
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.25)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>No Matching Templates</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px' }}>
            No templates found matching your category filter or search query.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedSubcategory('All');
              setSearchQuery('');
              fetchTemplates();
            }}
            className="template-catalog-cat-btn active"
            style={{ marginTop: '8px' }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Template Preview & Inspector Modal */}
      {previewTemplate && createPortal(
        <div className="tpl-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPreviewTemplate(null); }}>
          <div className="tpl-modal-dialog">
            {/* Modal Header */}
            <div className="tpl-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', fontWeight: 800 }}>
                      {previewTemplate.category}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {previewTemplate.subcategory || 'General'}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 800 }}>
                      Active (v{previewTemplate.activeVersion || 1})
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0', letterSpacing: '-0.01em' }}>
                    {previewTemplate.name}
                  </h2>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate(`/templates/editor/${previewTemplate.id}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)' }}
                  title="Open in Template Canvas Studio"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Use in Studio</span>
                </button>
                <button
                  onClick={() => {
                    setPreviewTemplate(null);
                    window.location.href = `/?tab=studio&templateId=${previewTemplate.id}`;
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
                  title="Compose a live post with this template in Content Studio"
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>Create Post</span>
                </button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="modal-close"
                  title="Close preview"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="tpl-modal-body">
              {/* Left Column: Visual Canvas Preview */}
              <div className="tpl-modal-canvas-col">
                {/* Ratio Switcher */}
                <div className="tpl-modal-ratio-bar">
                  {(['1:1', '4:5', '9:16', '16:9'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setPreviewRatio(r)}
                      className={`tpl-modal-ratio-btn ${previewRatio === r ? 'active' : ''}`}
                    >
                      {r === '1:1' && <Maximize2 className="w-3 h-3" />}
                      {r === '4:5' && <Smartphone className="w-3 h-3" />}
                      {r === '9:16' && <Smartphone className="w-3 h-3" />}
                      {r === '16:9' && <Monitor className="w-3 h-3" />}
                      <span>{r}</span>
                    </button>
                  ))}
                </div>

                {/* Simulated Visual Canvas */}
                <div
                  className={`tpl-modal-canvas ratio-${previewRatio.replace(':', '-')}`}
                  style={{
                    background:
                      previewTemplate.background?.value ||
                      'linear-gradient(135deg, #07090e 0%, #1e1b4b 60%, #4338ca 100%)',
                    fontFamily:
                      previewTemplate.brandTokens?.fontFamily || "'Outfit', sans-serif",
                  }}
                >
                  {/* Badge Layer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: previewTemplate.brandTokens?.accent || '#facc15',
                        color: '#0f172a',
                      }}
                    >
                      {previewBindings['discount'] || 'FEATURED'}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {previewRatio} Canvas
                    </span>
                  </div>

                  {/* Headline & Body Layer */}
                  <div style={{ textAlign: 'center', margin: 'auto 0', zIndex: 2 }}>
                    <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.25, margin: '0 0 8px 0' }}>
                      {previewBindings['product_name'] ||
                        previewBindings['headline'] ||
                        previewTemplate.name}
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#38bdf8', fontWeight: 700, margin: 0 }}>
                      {previewBindings['price'] ? `Starting at ${previewBindings['price']}` : 'Exclusive Release'}
                    </p>
                  </div>

                  {/* CTA Layer */}
                  <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <button
                      style={{
                        width: '100%',
                        padding: '10px 0',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                        backgroundColor: previewTemplate.brandTokens?.primary || '#6366f1',
                      }}
                    >
                      {previewTemplate.ctaRules?.[0] || 'Explore Now ➔'}
                    </button>
                  </div>
                </div>

                {/* Canvas Dimension Spec */}
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Standard Resolution:{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {previewRatio === '1:1'
                      ? '1080 × 1080 px'
                      : previewRatio === '4:5'
                        ? '1080 × 1350 px'
                        : previewRatio === '9:16'
                          ? '1080 × 1920 px'
                          : '1200 × 675 px'}
                  </span>
                </div>
              </div>

              {/* Right Column: Template Inspector & Parameters */}
              <div className="tpl-modal-inspector-col">
                {/* Brand Tokens Palette */}
                <div className="tpl-modal-section-card">
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                    <span>Brand Tokens & Palette</span>
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: previewTemplate.brandTokens?.primary || '#6366f1' }}
                        title="Primary Token"
                      />
                      <span>Primary: {previewTemplate.brandTokens?.primary || '#6366f1'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: previewTemplate.brandTokens?.accent || '#facc15' }}
                        title="Accent Token"
                      />
                      <span>Accent: {previewTemplate.brandTokens?.accent || '#facc15'}</span>
                    </div>
                  </div>
                </div>

                {/* Required Fields Dynamic Binder Tester */}
                <div className="tpl-modal-section-card">
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <FileCheck2 className="w-3.5 h-3.5" style={{ color: 'var(--accent-emerald)' }} />
                    <span>Required Field Validation Tester</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {previewTemplate.requiredFields && previewTemplate.requiredFields.length > 0 ? (
                      previewTemplate.requiredFields.map((field) => (
                        <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{`{{${field}}}`}</span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 className="w-3 h-3" /> Required
                            </span>
                          </label>
                          <input
                            type="text"
                            value={previewBindings[field] || ''}
                            onChange={(e) =>
                              setPreviewBindings({ ...previewBindings, [field]: e.target.value })
                            }
                            className="tpl-modal-input"
                            placeholder={`Enter test ${field}...`}
                          />
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>No strict required fields declared.</p>
                    )}
                  </div>
                </div>

                {/* AI Instructions */}
                {previewTemplate.aiInstructions && (
                  <div className="tpl-modal-section-card">
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Bot className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} />
                      <span>AI Instructions</span>
                    </h4>
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.78rem', color: '#7dd3fc', lineHeight: 1.5 }}>
                      {previewTemplate.aiInstructions}
                    </div>
                  </div>
                )}

                {/* Policy Governance: Claims & CTAs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  {/* Claim Restrictions */}
                  <div className="tpl-modal-section-card">
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Claim Restrictions</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {previewTemplate.claimRestrictions && previewTemplate.claimRestrictions.length > 0 ? (
                        previewTemplate.claimRestrictions.slice(0, 3).map((c, i) => (
                          <div key={i} style={{ fontSize: '0.72rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✕</span>
                            <span>{c}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>None declared</span>
                      )}
                    </div>
                  </div>

                  {/* CTA Rules */}
                  <div className="tpl-modal-section-card">
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approved CTAs</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {previewTemplate.ctaRules && previewTemplate.ctaRules.length > 0 ? (
                        previewTemplate.ctaRules.slice(0, 3).map((cta, i) => (
                          <div key={i} style={{ fontSize: '0.72rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✓</span>
                            <span>{cta}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Flexible CTAs</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Agent Restriction Notice */}
                <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.76rem', color: '#d8b4fe', lineHeight: 1.5 }}>
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
                  <div>
                    <strong style={{ color: '#ffffff' }}>Controlled System Artifact:</strong> AI agents are restricted from modifying template definitions directly. AI may search, select, and populate template parameters, but template schemas remain immutable.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Templates;
