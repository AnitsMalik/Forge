import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Rocket,
  PenTool,
  Palette,
  Calendar as CalendarIcon,
  CheckCircle2,
  LogOut,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  BarChart3,
  Share2,
  LayoutTemplate,
  Video,
  Sun,
  Moon,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  CreditCard,
  Users,
  TrendingUp,
  Zap,
  Bot,
  Database,
  Layers,
  ShieldCheck,
  Mail,
  MessageSquare,
  PhoneCall,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, tenant, brands, activeBrand, setActiveBrand, logout, refreshBrands } = useAuth();
  const {
    theme,
    setTheme,
    sidebarBg,
    setSidebarBg,
    headerBg,
    setHeaderBg,
    accentColor,
    setAccentColor,
    resetCustomTheme,
  } = useTheme();
  const [isThemePopupOpen, setIsThemePopupOpen] = useState(false);

  // Create Brand Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSlug, setNewBrandSlug] = useState('');
  const [newBrandSlugManual, setNewBrandSlugManual] = useState(false);
  const [newBrandIndustry, setNewBrandIndustry] = useState('');
  const [newBrandWebsite, setNewBrandWebsite] = useState('');
  const [newBrandTimezone, setNewBrandTimezone] = useState('Asia/Kolkata');
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);
  const [isDeleteBrandModalOpen, setIsDeleteBrandModalOpen] = useState(false);
  const [sidebarToast, setSidebarToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showSidebarToast = (message: string, type: 'error' | 'success' = 'error') => {
    setSidebarToast({ message, type });
    setTimeout(() => setSidebarToast(null), 3500);
  };

  const handleCreateBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim() || !newBrandSlug.trim()) return;

    try {
      setIsSubmittingBrand(true);
      const created = await api.brands.create({
        name: newBrandName.trim(),
        slug: newBrandSlug.trim().toLowerCase(),
        industry: newBrandIndustry.trim() || undefined,
        websiteUrl: newBrandWebsite.trim() || undefined,
        timezone: newBrandTimezone || 'Asia/Kolkata',
      });

      await refreshBrands();
      if (created) {
        setActiveBrand(created);
      }
      setIsCreateModalOpen(false);
      setNewBrandName('');
      setNewBrandSlug('');
      setNewBrandSlugManual(false);
      setNewBrandIndustry('');
      setNewBrandWebsite('');
      showSidebarToast(`Brand "${created.name}" created and activated!`, 'success');
    } catch (err: any) {
      showSidebarToast('Failed to create brand: ' + err.message, 'error');
    } finally {
      setIsSubmittingBrand(false);
    }
  };

  // Delete Brand State & Handler
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);

  const handleDeleteActiveBrand = () => {
    if (!activeBrand) return;
    if (brands.length <= 1) {
      showSidebarToast('Cannot delete brand. You must have at least one active brand in your workspace.', 'error');
      return;
    }
    setIsDeleteBrandModalOpen(true);
  };

  const executeDeleteBrand = async () => {
    if (!activeBrand) return;
    try {
      setIsDeletingBrand(true);
      await api.brands.delete(activeBrand.id);
      const deletedName = activeBrand.name;
      const remaining = brands.filter((b) => b.id !== activeBrand.id);
      if (remaining.length > 0) {
        setActiveBrand(remaining[0]);
      }
      setIsDeleteBrandModalOpen(false);
      await refreshBrands();
      showSidebarToast(`Brand "${deletedName}" removed.`, 'success');
    } catch (err: any) {
      showSidebarToast('Failed to delete brand: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsDeletingBrand(false);
    }
  };

  // Collapsed Sidebar Hover Flyout States
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const [hoveredBrand, setHoveredBrand] = useState(false);
  const [hoveredProfile, setHoveredProfile] = useState(false);

  // Collapsible Navigation Groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sf_sidebar_collapsed_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('sf_sidebar_collapsed_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    desc?: string;
  }

  interface NavGroup {
    id: string;
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      id: 'workspace',
      title: 'Core Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Live KPIs, performance & overview' },
        { id: 'calendar', label: 'Posts & Calendar', icon: CalendarIcon, desc: 'Planner, scheduled & published queue' },
        { id: 'campaigns', label: 'Campaigns', icon: Rocket, desc: 'Omnichannel multi-day campaigns' },
        { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, desc: 'Channel performance & conversion reports' },
      ],
    },
    {
      id: 'creative',
      title: 'Content & Creative',
      items: [
        { id: 'studio', label: 'Content Studio', icon: PenTool, desc: 'Post composer & copywriting suite' },
        { id: 'canva', label: 'Design Canvas', icon: LayoutTemplate, desc: 'Vector layout & visual canvas' },
        { id: 'reels', label: 'Video & Reels', icon: Video, desc: 'Vertical 9:16 short-form video studio' },
        { id: 'templates', label: 'Templates', icon: Layers, desc: 'Locked layouts, brand tokens & WCAG AA' },
        { id: 'media', label: 'Media Library', icon: ImageIcon, desc: 'Assets, dynamic SVGs & image storage' },
        { id: 'brands', label: 'Brand Brain', icon: Palette, desc: 'Voice, identity guidelines & brand kits' },
      ],
    },
    {
      id: 'audience',
      title: 'Channels & Audience',
      items: [
        { id: 'channels', label: 'Connect Hub', icon: Share2, desc: 'Social channels, cloud data & connections' },
        { id: 'approvals', label: 'Client Approvals', icon: CheckCircle2, desc: 'Client review portal & magic links' },
        { id: 'crm', label: 'CRM & Pipeline', icon: Users, desc: 'Contacts, lead stages & visual deal Kanban' },
        { id: 'onboarding', label: 'Quick Onboarding', icon: Sparkles, desc: 'Unified brand & channel setup wizard' },
      ],
    },
    {
      id: 'ai-automation',
      title: 'AI & Automation',
      items: [
        { id: 'ai', label: 'Growth Agent', icon: Bot, desc: 'Autonomous intelligence & recommendations' },
        { id: 'automations', label: 'Automations', icon: Zap, desc: 'Trigger-action workflow pipelines' },
        { id: 'data', label: 'Marketing Data', icon: Database, desc: 'Google Sheets, Drive & CSV sync' },
      ],
    },
    {
      id: 'messaging',
      title: 'Messaging & Outreach',
      items: [
        { id: 'email', label: 'Email Marketing', icon: Mail, desc: 'Newsletters, broadcasts & subscriber lists' },
        { id: 'whatsapp', label: 'WhatsApp Marketing', icon: MessageSquare, desc: 'Meta Cloud API broadcasts & 2-way inbox' },
        { id: 'sms-voice', label: 'SMS & Voice', icon: PhoneCall, desc: 'A2P 10DLC messaging & voice concierge' },
      ],
    },
    {
      id: 'settings',
      title: 'Workspace & Admin',
      items: [
        { id: 'billing', label: 'Billing & Plans', icon: CreditCard, desc: 'Subscriptions, tiers, quotas & invoices' },
        { id: 'team', label: 'Team & Roles', icon: Users, desc: 'Agency seats, roles & invitations' },
        ...(user?.isSuperAdmin
          ? [
              { id: 'admin-operations', label: 'Superadmin Ops', icon: ShieldCheck, desc: 'Tenants, provider health, DLQ & audit vaults' },
              { id: 'admin-billing', label: 'Platform Revenue', icon: TrendingUp, desc: 'Global MRR, ARR & revenue intelligence' },
            ]
          : []),
      ],
    },
  ];

  const navItems = navGroups.flatMap((group) => group.items);


  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Logo & Platform Title */}
      {isCollapsed ? (
        <div
          style={{
            padding: '16px 0',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            onClick={onToggleCollapse}
            title="Expand sidebar (Ctrl+B)"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <img src="/logo.svg" alt="HoaspForge Logo" style={{ width: '22px', height: '22px' }} />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.15)',
              }}
            >
              <img src="/logo.svg" alt="HoaspForge Logo" style={{ width: '20px', height: '20px' }} />
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 750,
                    fontSize: '1.05rem',
                    letterSpacing: '-0.025em',
                    color: 'var(--text-primary)',
                  }}
                >
                  HoaspForge
                </span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'rgba(139, 92, 246, 0.12)',
                    border: '1px solid rgba(139, 92, 246, 0.28)',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  v6.9
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.66rem',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.02em',
                  fontWeight: 500,
                  marginTop: '1px',
                }}
              >
                Marketing Operating System
              </div>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="sidebar-collapse-toggle-btn"
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>
      )}

      {/* Brand Selector */}
      {isCollapsed ? (
        <div
          style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
          }}
          onMouseEnter={() => setHoveredBrand(true)}
          onMouseLeave={() => setHoveredBrand(false)}
        >
          <button
            onClick={() => {
              if (brands.length > 1) {
                const currentIndex = brands.findIndex((b) => b.id === activeBrand?.id);
                const nextIndex = (currentIndex + 1) % brands.length;
                setActiveBrand(brands[nextIndex]);
              }
            }}
            aria-label={`Active Brand: ${activeBrand?.name || 'Brand'}`}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25))',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#ffffff',
              fontWeight: 750,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {activeBrand?.name ? activeBrand.name.charAt(0).toUpperCase() : 'B'}
          </button>

          {/* Collapsed Brand Hover Menu */}
          {hoveredBrand && (
            <div
              className="sidebar-hover-flyout"
              style={{
                position: 'absolute',
                left: '56px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 9999,
                minWidth: '200px',
                background: 'var(--bg-surface-elevated, #13141f)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 12px rgba(139, 92, 246, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-5px',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(45deg)',
                  width: '8px',
                  height: '8px',
                  background: 'var(--bg-surface-elevated, #13141f)',
                  borderLeft: '1px solid rgba(139, 92, 246, 0.35)',
                  borderBottom: '1px solid rgba(139, 92, 246, 0.35)',
                }}
              />
              <div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Active Brand
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {activeBrand?.name || 'Brand'}
                </div>
              </div>
              {brands.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Switch Brand:</div>
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBrand(b);
                        setHoveredBrand(false);
                      }}
                      style={{
                        background: b.id === activeBrand?.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: b.id === activeBrand?.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: b.id === activeBrand?.id ? 700 : 500,
                        fontSize: '0.78rem',
                        padding: '4px 8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{b.name}</span>
                      {b.id === activeBrand?.id && <span style={{ fontSize: '0.65rem' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '8px 10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                }}
              >
                Active Brand
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewBrandName('');
                    setNewBrandSlug('');
                    setNewBrandSlugManual(false);
                    setIsCreateModalOpen(true);
                  }}
                  title="Create New Brand"
                  aria-label="Create New Brand"
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '5px',
                    background: 'rgba(139, 92, 246, 0.12)',
                    border: '1px solid rgba(139, 92, 246, 0.28)',
                    color: 'var(--accent-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    padding: 0,
                  }}
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActiveBrand}
                  disabled={isDeletingBrand || brands.length <= 1}
                  title={
                    brands.length <= 1
                      ? 'Cannot delete the only remaining brand'
                      : `Delete ${activeBrand?.name || 'brand'}`
                  }
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '5px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: brands.length <= 1 || isDeletingBrand ? 'not-allowed' : 'pointer',
                    opacity: brands.length <= 1 ? 0.35 : 1,
                    transition: 'all 0.15s ease',
                    padding: 0,
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Brand Dropdown with Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3))',
                  border: '1px solid rgba(139, 92, 246, 0.45)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {activeBrand?.name ? activeBrand.name.charAt(0).toUpperCase() : 'B'}
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <select
                  className="form-select"
                  value={activeBrand?.id || ''}
                  onChange={(e) => {
                    const selected = brands.find((b) => b.id === e.target.value);
                    if (selected) setActiveBrand(selected);
                  }}
                  style={{
                    padding: '4px 22px 4px 6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    appearance: 'none',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id} style={{ background: 'var(--bg-surface-elevated, #13141f)', color: 'var(--text-primary)' }}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  color="var(--text-secondary)"
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      {isCollapsed ? (
        <nav
          style={{
            padding: '14px 0',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            position: 'relative',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {navGroups.map((group, groupIdx) => (
            <React.Fragment key={group.title}>
              {groupIdx > 0 && (
                <div
                  style={{
                    width: '32px',
                    height: '1px',
                    background: 'var(--border-subtle)',
                    margin: '6px 0',
                    opacity: 0.7,
                  }}
                />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const isHovered = hoveredNavId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{ position: 'relative', width: '46px', height: '40px' }}
                    onMouseEnter={() => setHoveredNavId(item.id)}
                    onMouseLeave={() => setHoveredNavId(null)}
                  >
                    <button
                      onClick={() => {
                        setCurrentTab(item.id);
                        setHoveredNavId(null);
                      }}
                      aria-label={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        borderRadius: '8px',
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(139, 92, 246, 0.08))'
                          : isHovered
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        border: isActive
                          ? '1px solid rgba(139, 92, 246, 0.45)'
                          : isHovered
                          ? '1px solid var(--border-medium)'
                          : '1px solid transparent',
                        boxShadow: isActive ? '0 0 12px rgba(139, 92, 246, 0.25)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <Icon size={19} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                    </button>

                    {/* Collapsed Nav Item Hover Flyout */}
                    {isHovered && (
                      <div
                        className="sidebar-hover-flyout"
                        style={{
                          position: 'absolute',
                          left: '54px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 9999,
                          minWidth: '180px',
                          maxWidth: '260px',
                          background: 'var(--bg-surface-elevated, #13141f)',
                          border: '1px solid rgba(139, 92, 246, 0.35)',
                          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 12px rgba(139, 92, 246, 0.15)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          textAlign: 'left',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentTab(item.id);
                          setHoveredNavId(null);
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: '-5px',
                            top: '50%',
                            transform: 'translateY(-50%) rotate(45deg)',
                            width: '8px',
                            height: '8px',
                            background: 'var(--bg-surface-elevated, #13141f)',
                            borderLeft: '1px solid rgba(139, 92, 246, 0.35)',
                            borderBottom: '1px solid rgba(139, 92, 246, 0.35)',
                          }}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.label}
                        </span>
                        {item.desc && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              lineHeight: 1.3,
                              whiteSpace: 'normal',
                            }}
                          >
                            {item.desc}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      ) : (
        <nav
          style={{
            padding: '12px 10px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {navGroups.map((group) => {
            const isGroupCollapsed = !!collapsedGroups[group.id] && !group.items.some((i) => i.id === currentTab);
            return (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  onClick={() => toggleGroup(group.id)}
                  title={`${isGroupCollapsed ? 'Expand' : 'Collapse'} ${group.title}`}
                  style={{
                    fontSize: '0.62rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    padding: '6px 8px 4px 10px',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    size={11}
                    style={{
                      transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: 0.6,
                    }}
                  />
                </div>
                {!isGroupCollapsed && group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.16) 0%, rgba(139, 92, 246, 0.04) 100%)'
                        : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: isActive ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 600 : 450,
                      textAlign: 'left',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '18%',
                          bottom: '18%',
                          width: '3px',
                          borderRadius: '0 3px 3px 0',
                          background: 'var(--accent-primary)',
                          boxShadow: '0 0 8px var(--accent-primary)',
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, paddingLeft: isActive ? '3px' : '0' }}>
                      <Icon
                        size={17}
                        color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}
                        style={{ flexShrink: 0, transition: 'color 0.15s ease' }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
        </nav>
      )}

      {/* User Profile & Controls */}
      {isCollapsed ? (
        <div
          style={{
            padding: '14px 0',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
          }}
        >
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredProfile(true)}
            onMouseLeave={() => setHoveredProfile(false)}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                alt={user?.fullName || 'User Avatar'}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-full)',
                  objectFit: 'cover',
                  border: '1px solid var(--border-medium)',
                  cursor: 'pointer',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid var(--bg-surface)',
                }}
                title="Online"
              />
            </div>
            {hoveredProfile && (
              <div
                className="sidebar-hover-flyout"
                style={{
                  position: 'absolute',
                  left: '52px',
                  bottom: '0',
                  zIndex: 9999,
                  minWidth: '180px',
                  background: 'var(--bg-surface-elevated, #13141f)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 12px rgba(139, 92, 246, 0.15)',
                  borderRadius: '8px',
                  padding: '9px 13px',
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '-5px',
                    bottom: '12px',
                    transform: 'rotate(45deg)',
                    width: '8px',
                    height: '8px',
                    background: 'var(--bg-surface-elevated, #13141f)',
                    borderLeft: '1px solid rgba(139, 92, 246, 0.35)',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.35)',
                  }}
                />
                <div style={{ fontWeight: 650, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                  {user?.fullName || 'Sarah Connor'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {user?.isSuperAdmin || (user as any)?.is_superadmin
                    ? 'Global Superadmin'
                    : user?.role === 'agency_admin' || user?.role === 'owner'
                    ? 'Agency Owner'
                    : user?.role === 'admin'
                    ? 'Admin'
                    : user?.role
                    ? String(user.role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Brand Manager'}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsThemePopupOpen((prev) => !prev)}
            title="Customize Application Theme & Colors"
            aria-label="Customize theme color"
            className="theme-icon-btn"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: isThemePopupOpen ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
              border: isThemePopupOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              color: isThemePopupOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Palette size={15} />
          </button>
          <button
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="theme-icon-btn"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                alt={user?.fullName || 'User Avatar'}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-full)',
                  objectFit: 'cover',
                  border: '1px solid var(--border-medium)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid var(--bg-surface)',
                }}
                title="Online"
              />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.fullName || 'Sarah Connor'}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.isSuperAdmin || (user as any)?.is_superadmin
                  ? 'Global Superadmin'
                  : user?.role === 'agency_admin' || user?.role === 'owner'
                  ? 'Agency Owner'
                  : user?.role === 'admin'
                  ? 'Admin'
                  : user?.role
                  ? String(user.role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  : 'Brand Manager'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => setIsThemePopupOpen((prev) => !prev)}
              title="Customize Application Theme & Colors"
              aria-label="Customize theme color"
              className="theme-icon-btn"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: isThemePopupOpen ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: isThemePopupOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                color: isThemePopupOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Palette size={15} />
            </button>
            <button
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="theme-icon-btn"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Theme Customizer Popup (Anchored at Bottom-Left Menu Bar) */}
      {isThemePopupOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'transparent',
            }}
            onClick={() => setIsThemePopupOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                bottom: '66px',
                left: isCollapsed ? '80px' : '14px',
                width: '286px',
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(139, 92, 246, 0.38)',
                borderRadius: '16px',
                boxShadow: '0 24px 48px -8px rgba(0, 0, 0, 0.75), 0 0 18px rgba(139, 92, 246, 0.18)',
                padding: '16px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a78bfa',
                    }}
                  >
                    <Palette size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                      Theme Customizer
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                      Personalize workspace colors
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsThemePopupOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: 'none',
                    color: '#94a3b8',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* 1. Application Mode (Light / Dark) */}
              <div>
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#94a3b8',
                    marginBottom: '6px',
                  }}
                >
                  Application Mode
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: theme === 'light' ? 'rgba(139, 92, 246, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                      border: theme === 'light' ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: theme === 'light' ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    <Sun size={13} color={theme === 'light' ? '#fbbf24' : '#94a3b8'} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: theme === 'dark' ? 'rgba(139, 92, 246, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                      border: theme === 'dark' ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: theme === 'dark' ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    <Moon size={13} color={theme === 'dark' ? '#a78bfa' : '#94a3b8'} />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* 2. Left Menu Panel Background */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#94a3b8',
                    }}
                  >
                    Left Menu Background
                  </span>
                  <label
                    title="Pick custom color"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.65rem',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <span>Custom</span>
                    <input
                      type="color"
                      value={sidebarBg.startsWith('#') ? sidebarBg : '#090d16'}
                      onChange={(e) => setSidebarBg(e.target.value)}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: 0,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: 'transparent',
                      }}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                  {[
                    { color: '#090d16', label: 'Midnight' },
                    { color: '#0f172a', label: 'Slate Navy' },
                    { color: '#1e1b4b', label: 'Deep Indigo' },
                    { color: '#18181b', label: 'Obsidian' },
                    { color: '#062c21', label: 'Emerald Dark' },
                    { color: '#2a0f1d', label: 'Royal Plum' },
                    { color: '#ffffff', label: 'Pure White' },
                    { color: '#f1f5f9', label: 'Soft Slate' },
                  ].map((preset) => {
                    const isSelected = sidebarBg.toLowerCase() === preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.color}
                        type="button"
                        title={preset.label}
                        onClick={() => setSidebarBg(preset.color)}
                        style={{
                          width: '100%',
                          height: '25px',
                          borderRadius: '7px',
                          background: preset.color,
                          border: isSelected
                            ? '2px solid #a78bfa'
                            : '1px solid rgba(255, 255, 255, 0.22)',
                          boxShadow: isSelected ? '0 0 0 2px rgba(139, 92, 246, 0.35)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 3. Top Header Background */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#94a3b8',
                    }}
                  >
                    Top Header Background
                  </span>
                  <label
                    title="Pick custom header color"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.65rem',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <span>Custom</span>
                    <input
                      type="color"
                      value={headerBg && headerBg.startsWith('#') ? headerBg : '#090d16'}
                      onChange={(e) => setHeaderBg(e.target.value)}
                      style={{
                        width: '18px',
                        height: '18px',
                        padding: 0,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: 'transparent',
                      }}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                  {[
                    { color: 'default', label: 'Auto Glass', preview: 'linear-gradient(135deg, #1e293b 50%, #f8fafc 50%)' },
                    { color: '#090d16', label: 'Midnight', preview: '#090d16' },
                    { color: '#0f172a', label: 'Slate Navy', preview: '#0f172a' },
                    { color: '#1e1b4b', label: 'Deep Indigo', preview: '#1e1b4b' },
                    { color: '#18181b', label: 'Obsidian', preview: '#18181b' },
                    { color: '#062c21', label: 'Emerald Dark', preview: '#062c21' },
                    { color: '#ffffff', label: 'Pure White', preview: '#ffffff' },
                    { color: '#f8fafc', label: 'Soft Frost', preview: '#f8fafc' },
                  ].map((preset) => {
                    const isSelected = headerBg.toLowerCase() === preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.color}
                        type="button"
                        title={preset.label}
                        onClick={() => setHeaderBg(preset.color)}
                        style={{
                          width: '100%',
                          height: '25px',
                          borderRadius: '7px',
                          background: preset.preview,
                          border: isSelected
                            ? '2px solid #a78bfa'
                            : '1px solid rgba(255, 255, 255, 0.22)',
                          boxShadow: isSelected ? '0 0 0 2px rgba(139, 92, 246, 0.35)' : 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 4. Primary Brand Accent */}
              <div>
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#94a3b8',
                    marginBottom: '6px',
                  }}
                >
                  Theme Accent Color
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {[
                    { color: '#8b5cf6', label: 'Violet' },
                    { color: '#6366f1', label: 'Indigo' },
                    { color: '#0ea5e9', label: 'Ocean Blue' },
                    { color: '#10b981', label: 'Emerald' },
                    { color: '#f43f5e', label: 'Rose' },
                    { color: '#f59e0b', label: 'Amber' },
                  ].map((preset) => {
                    const isSelected = accentColor.toLowerCase() === preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.color}
                        type="button"
                        title={preset.label}
                        onClick={() => setAccentColor(preset.color)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '999px',
                          background: preset.color,
                          border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                          boxShadow: isSelected ? `0 0 10px ${preset.color}` : 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={resetCustomTheme}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    color: '#cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                  }}
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={() => setIsThemePopupOpen(false)}
                  style={{
                    background: 'var(--accent-primary, #8b5cf6)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '5px 14px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Create Brand Modal */}
      {isCreateModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={18} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Create New Brand</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBrandSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Brand Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. HOASP International"
                  value={newBrandName}
                  onChange={(e) => {
                    setNewBrandName(e.target.value);
                    if (!newBrandSlugManual) {
                      setNewBrandSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-|-$/g, '')
                      );
                    }
                  }}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Brand Slug / Identifier *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. hoasp-international"
                  value={newBrandSlug}
                  onChange={(e) => {
                    setNewBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''));
                    setNewBrandSlugManual(true);
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Industry (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Technology, Education, Agency"
                  value={newBrandIndustry}
                  onChange={(e) => setNewBrandIndustry(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Website URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com"
                  value={newBrandWebsite}
                  onChange={(e) => setNewBrandWebsite(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Brand Timezone</label>
                <select
                  className="form-select"
                  value={newBrandTimezone}
                  onChange={(e) => setNewBrandTimezone(e.target.value)}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
                  <option value="America/New_York">America/New_York (EST/EDT, UTC-05:00)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT, UTC-08:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST, UTC+00:00)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingBrand}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingBrand}>
                  {isSubmittingBrand ? 'Creating Brand...' : 'Create & Activate Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Brand Confirmation Modal */}
      {isDeleteBrandModalOpen && activeBrand && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsDeleteBrandModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: '#f87171' }}>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)' }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Delete Brand
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Irreversible workspace action</span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete brand <strong style={{ color: 'var(--text-primary)' }}>"{activeBrand.name}"</strong>? All associated campaigns, social post drafts, and Brand Brain rules will be permanently removed.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsDeleteBrandModalOpen(false)}
                disabled={isDeletingBrand}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={executeDeleteBrand}
                disabled={isDeletingBrand}
              >
                {isDeletingBrand ? 'Deleting Brand...' : 'Yes, Delete Brand'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sidebar Toast */}
      {sidebarToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: sidebarToast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {sidebarToast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{sidebarToast.message}</span>
        </div>
      )}

    </aside>
  );
};

