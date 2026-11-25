import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar } from './components/Sidebar.js';
import { TopNav } from './components/TopNav.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { CampaignsPage } from './pages/CampaignsPage.js';
import { ContentStudioPage } from './pages/ContentStudioPage.js';
import { BrandKitPage } from './pages/BrandKitPage.js';
import { CalendarPage } from './pages/CalendarPage.js';
import { ApprovalsPage } from './pages/ApprovalsPage.js';
import { MediaLibraryPage } from './pages/MediaLibraryPage.js';
import { CanvaStudioPage } from './pages/CanvaStudioPage.js';
import { ReelMotionStudioPage } from './pages/ReelMotionStudioPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { SocialChannelsPage } from './pages/SocialChannelsPage.js';
import { MagicReviewPortal } from './pages/MagicReviewPortal.js';
import { LoginPage } from './pages/LoginPage.js';
import { BillingPage } from './pages/BillingPage.js';
import { AdminBillingPage } from './pages/AdminBillingPage.js';
import { SuperadminOperationsPage } from './pages/SuperadminOperationsPage.js';
import { StatusPage } from './pages/StatusPage.js';
import { TeamPage } from './pages/TeamPage.js';
import { InviteAcceptancePage } from './pages/InviteAcceptancePage.js';
import { PastDueBanner } from './components/PastDueBanner.js';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { CampaignDetail } from './pages/campaigns/CampaignDetail.js';
import { CreateCampaign } from './pages/campaigns/CreateCampaign.js';
import { CampaignAnalytics } from './pages/campaigns/CampaignAnalytics.js';
import { Automations } from './pages/automations/Automations.js';
import { CreateAutomation } from './pages/automations/CreateAutomation.js';
import { AutomationDetail } from './pages/automations/AutomationDetail.js';
import { AutomationRuns } from './pages/automations/AutomationRuns.js';
import { AutomationTemplates } from './pages/automations/AutomationTemplates.js';
import { Templates } from './pages/templates/Templates.js';
import { TemplateEditor } from './pages/templates/TemplateEditor.js';
import { TemplatePreview } from './pages/templates/TemplatePreview.js';
import { TemplateVersions } from './pages/templates/TemplateVersions.js';
import { ConnectHub } from './pages/connections/ConnectHub.js';
import { ConnectionDetail } from './pages/connections/ConnectionDetail.js';
import { SelectResources } from './pages/connections/SelectResources.js';
import { ConnectionHealth } from './pages/connections/ConnectionHealth.js';
import { ApprovalDetail } from './pages/approvals/ApprovalDetail.js';
import { ApprovalHistory } from './pages/approvals/ApprovalHistory.js';
import { AIAgent } from './pages/ai/AIAgent.js';
import { AgentRuns } from './pages/ai/AgentRuns.js';
import { AgentSettings } from './pages/ai/AgentSettings.js';
import { GrowthIntelligence } from './pages/analytics/GrowthIntelligence.js';
import { PostAnalytics } from './pages/analytics/PostAnalytics.js';
import { Plans } from './pages/billing/Plans.js';
import { Usage } from './pages/billing/Usage.js';
import { Invoices } from './pages/billing/Invoices.js';
import { BrandDetail } from './pages/brands/BrandDetail.js';
import { BrandSettings } from './pages/brands/BrandSettings.js';
import { WorkspaceSettings } from './pages/settings/WorkspaceSettings.js';
import { SecuritySettings } from './pages/settings/SecuritySettings.js';
import { NotificationSettings } from './pages/settings/NotificationSettings.js';
import { MarketingObjects } from './pages/data/MarketingObjects.js';
import { CRMPage } from './pages/crm/CRMPage.js';
import { EmailMarketingPage } from './pages/email/EmailMarketingPage.js';
import { WhatsAppPage } from './pages/whatsapp/WhatsAppPage.js';
import { SMSVoicePage } from './pages/smsVoice/SMSVoicePage.js';
import { HomePage } from './pages/public/HomePage.js';
import { PricingPage } from './pages/public/PricingPage.js';
import { SocialAgentPage } from './pages/public/SocialAgentPage.js';
import { ResourcesPage } from './pages/public/ResourcesPage.js';
import { TermsPage } from './pages/public/TermsPage.js';
import { PrivacyPage } from './pages/public/PrivacyPage.js';
import { ContactPage } from './pages/public/ContactPage.js';
import { UnifiedOnboardingWizard } from './pages/onboarding/UnifiedOnboardingWizard.js';

const ConnectionsRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const query = searchParams.toString();
    navigate(`/?tab=connections${query ? `&${query}` : ''}`, { replace: true });
  }, [searchParams, navigate]);
  return null;
};

const ConnectionsHealthRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const query = searchParams.toString();
    navigate(`/?tab=connection-health${query ? `&${query}` : ''}`, { replace: true });
  }, [searchParams, navigate]);
  return null;
};

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab) return tab;
      const p = window.location.pathname;
      if (p === '/onboarding' || new URLSearchParams(window.location.search).get('onboarding') === 'true') return 'onboarding';
      if (p === '/content/studio' || p === '/studio') return 'studio';
      if (p === '/canva') return 'canva';
      if (p === '/connections' || p === '/channels') return 'connections';
      if (p === '/connections/health') return 'connection-health';
    }
    return 'dashboard';
  });
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });
  const [navContext, setNavContext] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const tplId = new URLSearchParams(window.location.search).get('templateId');
      if (tplId) return { templateId: tplId };
    }
    return null;
  });
  const [magicToken, setMagicToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      return search.get('magic') || search.get('magicToken') || null;
    }
    return null;
  });
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const queryToken = search.get('invite') || search.get('token') || search.get('inviteToken');
      if (queryToken) return queryToken;
      const p = window.location.pathname;
      if (p.startsWith('/invite/')) {
        return p.replace('/invite/', '').trim() || null;
      }
    }
    return null;
  });
  const [isStatusPage, setIsStatusPage] = useState<boolean>(() => {
    const p = typeof window !== 'undefined' ? window.location.pathname : '';
    return p === '/status' || p === '/system-status';
  });
  const [isAuthPage, setIsAuthPage] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    return p === '/login' || p === '/signin' || p === '/register' || p === '/signup' || p === '/forgot-password';
  });
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 992 : false;
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 992) {
        return true;
      }
      return localStorage.getItem('sf_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Keep tab state synchronized with URL search params and history changes
  useEffect(() => {
    const syncTabFromUrl = () => {
      if (typeof window === 'undefined') return;
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      const tplId = new URLSearchParams(window.location.search).get('templateId');
      const p = window.location.pathname;

      setCurrentPath(p);
      setIsStatusPage(p === '/status' || p === '/system-status' || tabParam === 'status');

      if (tabParam) {
        setCurrentTab(tabParam);
      } else if (p === '/onboarding') {
        setCurrentTab('onboarding');
      } else if (p === '/content/studio' || p === '/studio') {
        setCurrentTab('studio');
      } else if (p === '/canva') {
        setCurrentTab('canva');
      } else if (p === '/connections' || p === '/channels') {
        setCurrentTab('connections');
      } else if (p === '/connections/health') {
        setCurrentTab('connection-health');
      }

      if (tplId) {
        setNavContext((prev: any) => ({ ...prev, templateId: tplId }));
      }

      const search = new URLSearchParams(window.location.search);
      const mTok = search.get('magic') || search.get('magicToken');
      if (mTok) setMagicToken(mTok);
      const invTok = search.get('invite') || search.get('token') || search.get('inviteToken');
      if (invTok) {
        setInviteToken(invTok);
      } else if (p.startsWith('/invite/')) {
        setInviteToken(p.replace('/invite/', '').trim());
      }
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  // Auto-collapse sidebar on smaller screens when resized
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 992;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigate = (tab: string, context?: any) => {
    setNavContext(context || { _navAt: Date.now() });
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.pushState({}, '', url.toString());
      } catch (e) {
        // ignore navigation history sync error
      }
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sf_sidebar_collapsed', String(next));
      } catch (err) {
        // ignore storage error
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check URL path for direct /login, /review/:token or /invite/:token access
  useEffect(() => {
    const path = window.location.pathname;
    setCurrentPath(path);
    if (path === '/status' || path === '/system-status') {
      setIsStatusPage(true);
    } else if (path === '/login' || path === '/signin' || path === '/register' || path === '/signup' || path === '/forgot-password') {
      setIsAuthPage(true);
    } else if (path.startsWith('/review/')) {
      const token = path.replace('/review/', '').trim();
      if (token) {
        setMagicToken(token);
      }
    } else if (path.startsWith('/invite/')) {
      const token = path.replace('/invite/', '').trim();
      if (token) {
        setInviteToken(token);
      }
    } else if (path === '/admin/operations' || path === '/admin-operations' || path === '/superadmin') {
      setCurrentTab('admin-operations');
    } else if (path === '/admin/billing' || path === '/admin-billing') {
      setCurrentTab('admin-billing');
    } else if (path === '/billing' || path === '/settings/billing') {
      setCurrentTab('billing');
    }

    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setCurrentTab(tabParam);
    } else if (searchParams.get('checkout') === 'success' || searchParams.get('session_id') || searchParams.get('success') === 'true') {
      setCurrentTab('billing');
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      const path = window.location.pathname;
      if (path === '/status' || path === '/system-status') {
        setIsStatusPage(true);
      } else if (path === '/login' || path === '/signin' || path === '/register' || path === '/signup' || path === '/forgot-password') {
        setIsAuthPage(true);
      } else {
        setIsStatusPage(false);
        setIsAuthPage(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If viewing standalone public status page
  if (isStatusPage) {
    return <StatusPage />;
  }

  // If viewing standalone client review magic link
  if (magicToken) {
    return (
      <MagicReviewPortal
        token={magicToken}
        onExit={() => {
          setMagicToken(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // If viewing standalone invite onboarding
  if (inviteToken) {
    return (
      <InviteAcceptancePage
        token={inviteToken}
        onAccepted={() => {
          setInviteToken(null);
          window.history.pushState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  // Public Marketing Website Routes
  const hasTabParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tab');
  const isMarketingHome = (currentPath === '/' || currentPath === '') && !hasTabParam;
  const isPricing = currentPath === '/pricing';
  const isSocialAgent = currentPath === '/social-agent';
  const isResources = currentPath === '/resources';
  const isTerms = currentPath === '/terms' || currentPath === '/terms-of-service';
  const isPrivacy = currentPath === '/privacy' || currentPath === '/privacy-policy';
  const isContact = currentPath === '/contact' || currentPath === '/support';

  if (isMarketingHome) {
    return <HomePage />;
  }
  if (isPricing) {
    return <PricingPage />;
  }
  if (isSocialAgent) {
    return <SocialAgentPage />;
  }
  if (isResources) {
    return <ResourcesPage />;
  }
  if (isTerms) {
    return <TermsPage />;
  }
  if (isPrivacy) {
    return <PrivacyPage />;
  }
  if (isContact) {
    return <ContactPage />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.svg" alt="HoaspForge" style={{ width: '48px', height: '48px', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Connecting to HoaspForge...</p>
        </div>
      </div>
    );
  }

  // If explicitly navigating to login / register
  if (isAuthPage) {
    const initialMode =
      typeof window !== 'undefined' && (window.location.pathname === '/register' || window.location.pathname === '/signup')
        ? 'register'
        : typeof window !== 'undefined' && window.location.pathname === '/forgot-password'
        ? 'forgot'
        : 'login';

    return <LoginPage initialMode={initialMode} />;
  }

  // If attempting to access protected app routes while unauthenticated
  if (!user) {
    return <LoginPage initialMode="login" />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />
        <Route path="/campaigns/create" element={<CreateCampaign />} />
        <Route path="/campaigns/:campaignId/analytics" element={<CampaignAnalytics />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/automations/create" element={<CreateAutomation />} />
        <Route path="/automations/runs" element={<AutomationRuns />} />
        <Route path="/automations/templates" element={<AutomationTemplates />} />
        <Route path="/automations/:id" element={<AutomationDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/editor" element={<TemplateEditor />} />
        <Route path="/templates/editor/:id" element={<TemplateEditor />} />
        <Route path="/templates/preview" element={<TemplatePreview />} />
        <Route path="/templates/versions" element={<TemplateVersions />} />
        <Route path="/connections" element={<ConnectionsRedirect />} />
        <Route path="/connections/resources" element={<SelectResources />} />
        <Route path="/connections/health" element={<ConnectionsHealthRedirect />} />
        <Route path="/connections/:id" element={<ConnectionDetail />} />
        <Route path="/approvals/history" element={<ApprovalHistory />} />
        <Route path="/approvals/:id" element={<ApprovalDetail />} />
        <Route path="/ai" element={<AIAgent />} />
        <Route path="/ai/runs" element={<AgentRuns />} />
        <Route path="/ai/settings" element={<AgentSettings />} />
        <Route path="/analytics/growth" element={<GrowthIntelligence />} />
        <Route path="/analytics/posts/:id" element={<PostAnalytics />} />
        <Route path="/billing/plans" element={<Plans />} />
        <Route path="/billing/usage" element={<Usage />} />
        <Route path="/billing/invoices" element={<Invoices />} />
        <Route path="/brands/settings" element={<BrandSettings />} />
        <Route path="/brands/:id" element={<BrandDetail />} />
        <Route path="/settings/workspace" element={<WorkspaceSettings />} />
        <Route path="/settings/security" element={<SecuritySettings />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/data" element={<MarketingObjects />} />
        <Route path="/data/catalog" element={<MarketingObjects />} />
        <Route path="/data/marketing-objects" element={<MarketingObjects />} />
        <Route path="/onboarding" element={<UnifiedOnboardingWizard onNavigate={handleNavigate} onExit={() => handleNavigate('dashboard')} />} />
        <Route path="*" element={(
          <div className="app-container">
            {/* Mobile backdrop */}
            {isMobile && !isSidebarCollapsed && (
              <div
                className="sidebar-mobile-backdrop active"
                onClick={toggleSidebar}
                aria-label="Close sidebar"
              />
            )}
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={(tab) => {
                handleNavigate(tab);
                if (typeof window !== 'undefined' && window.innerWidth <= 992) {
                  setIsSidebarCollapsed(true);
                }
              }}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
            />
            <div className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''} ${currentTab === 'canva' || currentTab === 'reels' || currentTab === 'onboarding' ? 'fullscreen-studio' : ''}`}>
              <PastDueBanner onNavigate={handleNavigate} />
              {currentTab !== 'canva' && currentTab !== 'reels' && currentTab !== 'onboarding' && (
                <TopNav
                  onNewPostClick={() => handleNavigate('studio')}
                  isSidebarCollapsed={isSidebarCollapsed}
                  onToggleSidebar={toggleSidebar}
                  onNavigate={handleNavigate}
                />
              )}
              <main className={`page-body ${currentTab === 'canva' || currentTab === 'reels' || currentTab === 'onboarding' ? 'page-body-fullscreen' : ''}`}>
                {currentTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
                {currentTab === 'campaigns' && (
                  <CampaignsPage
                    onNavigate={handleNavigate}
                    initialContext={navContext}
                  />
                )}
                {currentTab === 'studio' && (
                  <ContentStudioPage
                    onNavigate={handleNavigate}
                    initialPost={navContext?.post}
                    initialAsset={navContext?.attachedMediaAsset || navContext?.attachedVideoAsset || navContext?.asset}
                  />
                )}
                {currentTab === 'canva' && (
                  <CanvaStudioPage
                    onNavigate={handleNavigate}
                    initialText={
                      navContext?.initialText ||
                      (navContext?.post?.title
                        ? `${navContext.post.title}\n\n${navContext.post.variants?.[0]?.content || navContext.post.baseContent || ''}`
                        : undefined)
                    }
                  />
                )}
                {currentTab === 'reels' && (
                  <ReelMotionStudioPage
                    onNavigate={handleNavigate}
                    campaignId={navContext?.campaignId || navContext?.post?.campaign_id}
                    campaignName={navContext?.campaignName}
                    postId={navContext?.post?.id}
                    initialText={
                      navContext?.initialText ||
                      (navContext?.post?.title
                        ? `${navContext.post.title}\n\n${navContext.post.variants?.[0]?.content || navContext.post.baseContent || ''}`
                        : undefined)
                    }
                  />
                )}
                {currentTab === 'media' && <MediaLibraryPage onNavigate={handleNavigate} />}
                {(currentTab === 'channels' || currentTab === 'connections') && (
                  <ConnectHub onNavigate={handleNavigate} initialContext={navContext} />
                )}
                {(currentTab === 'connection-health' || currentTab === 'connections-health') && <ConnectionHealth />}
                {currentTab === 'analytics' && <AnalyticsPage onNavigate={handleNavigate} />}
                {currentTab === 'brands' && <BrandKitPage />}
                {currentTab === 'calendar' && (
                  <CalendarPage
                    onNavigate={handleNavigate}
                    onOpenMagicPortal={(token) => setMagicToken(token)}
                    initialContext={navContext}
                  />
                )}
                {currentTab === 'approvals' && (
                  <ApprovalsPage
                    onOpenMagicPortal={(token) => setMagicToken(token)}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentTab === 'billing' && <BillingPage onNavigate={handleNavigate} />}
                {currentTab === 'admin-billing' && <AdminBillingPage />}
                {currentTab === 'admin-operations' && <SuperadminOperationsPage />}
                {currentTab === 'team' && <TeamPage onNavigate={handleNavigate} />}
                {currentTab === 'automations' && <Automations onNavigate={handleNavigate} />}
                {currentTab === 'crm' && <CRMPage />}
                {currentTab === 'email' && <EmailMarketingPage />}
                {currentTab === 'whatsapp' && <WhatsAppPage />}
                {currentTab === 'sms-voice' && <SMSVoicePage />}
                {currentTab === 'templates' && <Templates />}
                {currentTab === 'ai' && <AIAgent />}
                {(currentTab === 'data' || currentTab === 'marketing-objects') && <MarketingObjects />}
                {currentTab === 'onboarding' && (
                  <UnifiedOnboardingWizard
                    onNavigate={handleNavigate}
                    onExit={() => handleNavigate('dashboard')}
                  />
                )}
              </main>
            </div>
          </div>
        )} />
      </Routes>
    </BrowserRouter>
  );
};


export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};
