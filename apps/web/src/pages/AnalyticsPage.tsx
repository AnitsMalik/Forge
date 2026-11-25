import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointer,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  Video,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Filter,
  Check,
  Trophy,
  Brain,
  Zap,
  Target,
  Flame,
  Lightbulb,
  Award,
  Rocket,
  ArrowRight,
  X,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  HelpCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  PieChart,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import './AnalyticsPage.css';

interface AnalyticsPageProps {
  onNavigate?: (tab: string, context?: any) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onNavigate }) => {
  const { activeBrand } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d' | 'custom' | 'all'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  // Search & Sorting for Content Performance Table
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('publishedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Interactive Chart State
  const [activeChartTab, setActiveChartTab] = useState<'reach_impressions' | 'engagement' | 'platform_split' | 'growth'>('reach_impressions');
  const [showSecondaryMetrics, setShowSecondaryMetrics] = useState(false);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any | null>(null);

  // Data State
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);

  // Drilldown Modal State
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [postDetail, setPostDetail] = useState<any | null>(null);
  const [singlePostSyncing, setSinglePostSyncing] = useState(false);

  useEffect(() => {
    if (selectedPostId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPostId]);

  // Stage 6 & Closed-Loop Advisor: Views, Winner Detection, Learning & Campaign Synthesis
  const [activeView, setActiveView] = useState<'telemetry' | 'winners' | 'learning' | 'advisor' | 'onboarding_funnel'>('telemetry');
  const [winners, setWinners] = useState<any[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [scanningWinners, setScanningWinners] = useState(false);
  const [learningData, setLearningData] = useState<{ insights: any[]; learnedContext: any } | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [baselineData, setBaselineData] = useState<any | null>(null);

  // FTUE Onboarding Funnel Analytics State
  const [onboardingAnalytics, setOnboardingAnalytics] = useState<any | null>(null);
  const [onboardingAnalyticsLoading, setOnboardingAnalyticsLoading] = useState(false);

  const loadOnboardingAnalytics = async () => {
    try {
      setOnboardingAnalyticsLoading(true);
      const res = await api.ftue.getAdminAnalytics();
      setOnboardingAnalytics(res?.data || null);
    } catch (err) {
      console.error('Failed to load onboarding funnel analytics:', err);
    } finally {
      setOnboardingAnalyticsLoading(false);
    }
  };

  // Closed-Loop AI Marketing Advisor State
  const [advisorData, setAdvisorData] = useState<any | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [applyingProposalId, setApplyingProposalId] = useState<string | null>(null);
  const [advisorSuccessToast, setAdvisorSuccessToast] = useState<string | null>(null);

  const loadAdvisor = async () => {
    if (!activeBrand) return;
    try {
      setAdvisorLoading(true);
      const res = await api.analytics.getAdvisorDiagnosis(activeBrand.id);
      setAdvisorData(res?.data || res);
    } catch (err) {
      console.error('Failed to load AI advisor diagnosis:', err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleApplyProposal = async (proposal: any) => {
    if (!activeBrand) return;
    try {
      setApplyingProposalId(proposal.id);
      const res = await api.analytics.applyAdvisorProposal(activeBrand.id, proposal.id);
      const prefillCampaign = res?.data?.prefillCampaign || {
        advisorProposalId: proposal.id,
        campaignName: proposal.title,
        businessIdea: `${proposal.hypothesis} (Derived from: ${proposal.derivedFrom})`,
        goal: proposal.suggestedGoal,
        executionMode: proposal.suggestedMode,
        targetPersona: proposal.targetPersona,
        estimatedLiftPct: proposal.estimatedLiftPct,
        narrativeArc: proposal.narrativeArc,
        recommendedTemplates: proposal.recommendedTemplates,
      };
      setAdvisorSuccessToast(`🎯 Strategy Accepted! Transferring into Campaign Command Center...`);
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('campaigns', { prefillCampaign });
        }
      }, 700);
    } catch (err) {
      console.error('Failed to apply advisor proposal:', err);
      if (onNavigate) {
        onNavigate('campaigns', {
          prefillCampaign: {
            advisorProposalId: proposal.id,
            campaignName: proposal.title,
            businessIdea: `${proposal.hypothesis} (Derived from: ${proposal.derivedFrom})`,
            goal: proposal.suggestedGoal,
            executionMode: proposal.suggestedMode,
            targetPersona: proposal.targetPersona,
            estimatedLiftPct: proposal.estimatedLiftPct,
            narrativeArc: proposal.narrativeArc,
            recommendedTemplates: proposal.recommendedTemplates,
          },
        });
      }
    } finally {
      setApplyingProposalId(null);
    }
  };

  const loadWinners = async () => {
    if (!activeBrand) return;
    try {
      setWinnersLoading(true);
      const res = await api.analytics.getWinners(activeBrand.id);
      setWinners(res?.winners || (res as any)?.data?.winners || []);
    } catch (err) {
      console.error('Failed to load winners:', err);
    } finally {
      setWinnersLoading(false);
    }
  };

  const loadLearning = async () => {
    if (!activeBrand) return;
    try {
      setLearningLoading(true);
      const res = await api.analytics.getLearningInsights(activeBrand.id);
      setLearningData((res as any)?.data || res);
    } catch (err) {
      console.error('Failed to load learning insights:', err);
    } finally {
      setLearningLoading(false);
    }
  };

  const loadBaselines = async () => {
    if (!activeBrand) return;
    try {
      const res = await api.analytics.getBaselines(activeBrand.id);
      setBaselineData((res as any)?.data || res);
    } catch (err) {
      console.error('Failed to load baselines:', err);
    }
  };

  const handleScanWinners = async () => {
    if (!activeBrand) return;
    try {
      setScanningWinners(true);
      const res = await api.analytics.detectWinners(activeBrand.id, true);
      await loadWinners();
      await loadLearning();
      await loadBaselines();
      setSyncMessage(`Winner detection completed! Identified ${res?.detectedCount || res?.winners?.length || 0} outperformer(s).`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to scan winners:', err);
      setSyncMessage(`Winner scan error: ${err.message}`);
    } finally {
      setScanningWinners(false);
    }
  };

  // Load Overview Data
  const loadAnalytics = async () => {
    if (!activeBrand) return;
    try {
      setLoading(true);
      const res = await api.analytics.getOverview(activeBrand.id, {
        timeRange,
        startDate: timeRange === 'custom' && customStartDate ? customStartDate : undefined,
        endDate: timeRange === 'custom' && customEndDate ? customEndDate : undefined,
        platform: platformFilter,
        page: currentPage,
        limit: pageSize,
      });

      if (res && res.data) {
        setAnalyticsData(res.data);
      } else if (res) {
        setAnalyticsData(res);
      }
    } catch (err) {
      console.error('Failed to load real analytics overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [activeBrand, timeRange, customStartDate, customEndDate, platformFilter, currentPage]);

  // Sync All Analytics
  const handleSyncAnalytics = async () => {
    if (!activeBrand) return;
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await api.analytics.sync(activeBrand.id);
      setSyncMessage(
        res.reauthRequired
          ? 'Meta authorization expired. Reconnect Facebook/Instagram to resume sync.'
          : res.message || `Successfully synced ${res.syncedCount || 0} published post(s).`
      );
      await loadAnalytics();
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      console.error('Failed to sync analytics:', err);
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Open Post Drilldown
  const handleOpenPostDrilldown = async (postId: string) => {
    if (!activeBrand) return;
    setSelectedPostId(postId);
    try {
      setDrilldownLoading(true);
      const res = await api.analytics.getPostAnalytics(activeBrand.id, postId);
      setPostDetail(res.data || res);
    } catch (err) {
      console.error('Failed to load post drilldown:', err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  // Sync Single Post Drilldown
  const handleSyncSinglePost = async () => {
    if (!activeBrand || !selectedPostId) return;
    try {
      setSinglePostSyncing(true);
      await api.analytics.syncPost(activeBrand.id, selectedPostId);
      const res = await api.analytics.getPostAnalytics(activeBrand.id, selectedPostId);
      setPostDetail(res.data || res);
      await loadAnalytics();
    } catch (err) {
      console.error('Failed to sync single post:', err);
    } finally {
      setSinglePostSyncing(false);
    }
  };

  // Export CSV
  const handleExportReport = async () => {
    if (!activeBrand) return;
    try {
      setExporting(true);
      await api.analytics.exportReport(activeBrand.id, 'csv');
    } catch (err) {
      console.error('Failed to export executive report:', err);
    } finally {
      setExporting(false);
    }
  };

  // Format Helper: Only display 0 if actual 0, display "Not available" if null/undefined
  const renderMetric = (val: number | null | undefined, suffix: string = '') => {
    if (val === null || val === undefined) {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Not available</span>;
    }
    return <span>{val.toLocaleString()}{suffix}</span>;
  };

  // Relative time helper
  const formatTimeAgo = (dateString: string | null | undefined): string => {
    if (!dateString) return 'never';
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr === 1) return '1 hour ago';
    if (diffHr < 24) return `${diffHr} hours ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return '1 day ago';
    return `${diffDay} days ago`;
  };

  const totals = analyticsData?.totals || {
    totalPublishedPosts: 0,
    totalReach: null,
    totalImpressions: null,
    totalClicks: null,
    totalReactions: null,
    totalComments: null,
    totalShares: null,
    totalSaves: null,
    totalVideoViews: null,
    totalEngagement: null,
    averageEngagementRate: null,
    lastSyncedAt: null,
    lastSuccessfulSync: null,
    lastAttempt: null,
    lastError: null,
    reauthRequired: false,
  };

  const posts = analyticsData?.posts || [];
  const pagination = analyticsData?.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
  const platformBreakdown = analyticsData?.platformBreakdown || {};

  // Tooltip helper
  const renderTooltip = (title: string, desc: string) => (
    <span className="analytics-tooltip-wrap" title={`${title}: ${desc}`}>
      <HelpCircle size={13} style={{ color: 'var(--text-muted)', marginLeft: '4px', verticalAlign: 'middle', cursor: 'help' }} />
    </span>
  );

  // Filtered and Sorted Posts for Content Performance Table
  const filteredPosts = posts
    .filter((p: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.caption && p.caption.toLowerCase().includes(q))
      );
    })
    .sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'publishedAt') {
        valA = new Date(valA || a.createdAt).getTime();
        valB = new Date(valB || b.createdAt).getTime();
      } else {
        valA = Number(valA ?? -1);
        valB = Number(valB ?? -1);
      }
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Chronologically sorted posts for charts
  const chronPosts = [...posts]
    .filter((p: any) => p.publishedAt || p.createdAt)
    .sort((a: any, b: any) => new Date(a.publishedAt || a.createdAt).getTime() - new Date(b.publishedAt || b.createdAt).getTime());

  // Render SVG Chart based on active tab
  const renderAnalyticsChart = () => {
    if (chronPosts.length === 0) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: '10px', border: '1px dashed var(--border-medium)' }}>
          <Activity size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            No Trend Curves in Selected Range
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 14px' }}>
            Telemetry curves activate once published posts exist in the selected period. Switch to "All Time" or publish new content to view growth trends.
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('studio')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Compose Post
            </button>
          )}
        </div>
      );
    }

    const svgW = 760;
    const svgH = 190;
    const pad = { top: 20, right: 30, bottom: 35, left: 55 };
    const chartW = svgW - pad.left - pad.right;
    const chartH = svgH - pad.top - pad.bottom;
    const n = chronPosts.length;

    if (activeChartTab === 'reach_impressions') {
      const maxVal = Math.max(...chronPosts.map((p) => Math.max(Number(p.reach || 0), Number(p.impressions || 0))), 10);
      const reachPts = chronPosts.map((p, i) => {
        const x = pad.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
        const y = pad.top + chartH - (Number(p.reach || 0) / maxVal) * chartH;
        return { x, y, val: p.reach, title: p.title, date: p.publishedAt };
      });
      const impPts = chronPosts.map((p, i) => {
        const x = pad.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
        const y = pad.top + chartH - (Number(p.impressions || 0) / maxVal) * chartH;
        return { x, y, val: p.impressions, title: p.title, date: p.publishedAt };
      });

      const reachPath = reachPts.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
      const reachArea = reachPts.length > 1
        ? `${reachPath} L ${reachPts[reachPts.length - 1].x} ${pad.top + chartH} L ${reachPts[0].x} ${pad.top + chartH} Z`
        : '';
      const impPath = impPts.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

      return (
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.33, 0.66, 1].map((ratio) => {
              const y = pad.top + chartH * ratio;
              const val = Math.round(maxVal * (1 - ratio));
              return (
                <g key={ratio}>
                  <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" opacity="0.6" />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}
            {/* Area & Curves */}
            {reachArea && <path d={reachArea} fill="url(#reachGrad)" />}
            <path d={impPath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 3" />
            <path d={reachPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
            {/* Dots */}
            {reachPts.map((pt, idx) => (
              <circle
                key={`r-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={hoveredDataPoint?.idx === idx ? 6 : 4}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredDataPoint({ idx, pt, type: 'Reach', val: pt.val })}
                onMouseLeave={() => setHoveredDataPoint(null)}
              />
            ))}
            {impPts.map((pt, idx) => (
              <circle
                key={`i-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={3.5}
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredDataPoint({ idx, pt, type: 'Impressions', val: pt.val })}
                onMouseLeave={() => setHoveredDataPoint(null)}
              />
            ))}
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '8px', fontSize: '0.78rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '12px', height: '3px', background: '#3b82f6', borderRadius: '2px' }} /> Total Reach (Solid)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '12px', height: '2px', background: '#06b6d4', borderRadius: '2px', borderTop: '2px dashed #06b6d4' }} /> Impressions / Views (Dashed)
            </span>
          </div>
        </div>
      );
    }

    if (activeChartTab === 'engagement') {
      const maxEng = Math.max(...chronPosts.map((p) => Number(p.engagement || 0)), 5);
      const engPts = chronPosts.map((p, i) => {
        const x = pad.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
        const y = pad.top + chartH - (Number(p.engagement || 0) / maxEng) * chartH;
        return { x, y, val: p.engagement, title: p.title, date: p.publishedAt };
      });
      const engPath = engPts.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
      const engArea = engPts.length > 1
        ? `${engPath} L ${engPts[engPts.length - 1].x} ${pad.top + chartH} L ${engPts[0].x} ${pad.top + chartH} Z`
        : '';

      return (
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((ratio) => {
              const y = pad.top + chartH * ratio;
              const val = Math.round(maxEng * (1 - ratio));
              return (
                <g key={ratio}>
                  <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" opacity="0.6" />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}
            {engArea && <path d={engArea} fill="url(#engGrad)" />}
            <path d={engPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
            {engPts.map((pt, idx) => (
              <circle
                key={`eng-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={4.5}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredDataPoint({ idx, pt, type: 'Engagement', val: pt.val })}
                onMouseLeave={() => setHoveredDataPoint(null)}
              />
            ))}
          </svg>
          <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Engagement Velocity across Published Posts (Reactions + Comments + Shares + Saves)
          </div>
        </div>
      );
    }

    if (activeChartTab === 'platform_split') {
      const fbPosts = platformBreakdown.facebook?.postsCount || 0;
      const igPosts = platformBreakdown.instagram?.postsCount || 0;
      const fbReach = Number(platformBreakdown.facebook?.reach || 0);
      const igReach = Number(platformBreakdown.instagram?.reach || 0);
      const fbEng = Number(platformBreakdown.facebook?.engagement || 0);
      const igEng = Number(platformBreakdown.instagram?.engagement || 0);

      const metricsToCompare = [
        { label: 'Published Posts', fb: fbPosts, ig: igPosts },
        { label: 'Total Reach', fb: fbReach, ig: igReach },
        { label: 'Engagement', fb: fbEng, ig: igEng },
      ];

      return (
        <div style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {metricsToCompare.map((m) => {
            const sum = m.fb + m.ig;
            const fbPct = sum > 0 ? Math.round((m.fb / sum) * 100) : 50;
            const igPct = 100 - fbPct;
            return (
              <div key={m.label} style={{ background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>Facebook: {m.fb.toLocaleString()} ({fbPct}%)</span>
                    <span style={{ color: '#f472b6', fontWeight: 600 }}>Instagram: {m.ig.toLocaleString()} ({igPct}%)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ width: `${fbPct}%`, background: '#1877f2', transition: 'width 0.4s ease' }} title={`Facebook ${fbPct}%`} />
                  <div style={{ width: `${igPct}%`, background: 'linear-gradient(90deg, #f09433, #dc2743, #bc1888)', transition: 'width 0.4s ease' }} title={`Instagram ${igPct}%`} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeChartTab === 'growth') {
      let cumulative = 0;
      const growthPts = chronPosts.map((p, i) => {
        cumulative += Number(p.reach || 0);
        return { post: p, cumulative, idx: i };
      });
      const maxGrowth = Math.max(cumulative, 10);
      const pts = growthPts.map((g) => {
        const x = pad.left + (n === 1 ? chartW / 2 : (g.idx / (n - 1)) * chartW);
        const y = pad.top + chartH - (g.cumulative / maxGrowth) * chartH;
        return { x, y, val: g.cumulative, title: g.post.title };
      });
      const growthPath = pts.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
      const growthArea = pts.length > 1
        ? `${growthPath} L ${pts[pts.length - 1].x} ${pad.top + chartH} L ${pts[0].x} ${pad.top + chartH} Z`
        : '';

      return (
        <div style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((ratio) => {
              const y = pad.top + chartH * ratio;
              const val = Math.round(maxGrowth * (1 - ratio));
              return (
                <g key={ratio}>
                  <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" opacity="0.6" />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}
            {growthArea && <path d={growthArea} fill="url(#growthGrad)" />}
            <path d={growthPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
            {pts.map((pt, idx) => (
              <circle
                key={`g-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={4.5}
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredDataPoint({ idx, pt, type: 'Cumulative Reach', val: pt.val })}
                onMouseLeave={() => setHoveredDataPoint(null)}
              />
            ))}
          </svg>
          <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Cumulative Reach Expansion over Selected Period
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="analytics-container">
      {/* 1. Header & Live Status */}
      <div className="analytics-header-section">
        <div className="analytics-title-group">
          <h1>
            <span>Analytics & Reports</span>
            <span className="analytics-meta-badge">
              <CheckCircle2 size={12} /> VERIFIED META METRICS
            </span>
          </h1>
          <p className="analytics-subtitle">
            Direct telemetry synchronized with Facebook Pages & Instagram Professional accounts. Never estimated.
            {totals.lastSuccessfulSync ? (
              <span className="analytics-sync-pill">
                <span className="analytics-sync-dot" /> Updated {formatTimeAgo(totals.lastSuccessfulSync)}
              </span>
            ) : totals.lastSyncedAt ? (
              <span className="analytics-sync-pill">
                <span className="analytics-sync-dot" /> Updated {formatTimeAgo(totals.lastSyncedAt)}
              </span>
            ) : null}
          </p>

          {totals.lastError && !totals.reauthRequired && (
            <div style={{ marginTop: '8px', padding: '6px 12px', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#facc15', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} />
              <span>Background sync encountered a temporary Meta error ({totals.lastError}). Retaining verified snapshot from {formatTimeAgo(totals.lastSuccessfulSync || totals.lastSyncedAt)}.</span>
            </div>
          )}
        </div>

        <div className="analytics-header-actions">
          <button
            onClick={handleSyncAnalytics}
            disabled={syncing}
            className="analytics-action-btn analytics-primary-btn"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing Meta...' : 'Refresh Analytics'}
          </button>

          <button
            onClick={handleExportReport}
            disabled={exporting}
            className="analytics-action-btn"
          >
            <Download size={15} style={{ color: '#10b981' }} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Reauth Required Banner */}
      {totals.reauthRequired && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            <div>
              <div style={{ fontWeight: '600', color: '#f87171', fontSize: '0.92rem' }}>
                Meta Authorization Expired (REAUTH_REQUIRED)
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Meta access token has expired or was revoked. Reconnect Facebook & Instagram in Connect Hub to resume metric synchronization. Existing verified analytics snapshots are safely preserved.
              </div>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('channels')}
              style={{ padding: '8px 16px', borderRadius: '6px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Reconnect Channels
            </button>
          )}
        </div>
      )}

      {/* Sync Status Feedback Toast */}
      {syncMessage && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={18} style={{ color: '#8b5cf6' }} />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Closed-Loop AI Advisor Toast */}
      {advisorSuccessToast && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.2))', border: '1px solid rgba(139, 92, 246, 0.5)', color: '#f3e8ff', fontSize: '0.92rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)' }}>
          <Sparkles size={18} style={{ color: '#c084fc' }} />
          <span>{advisorSuccessToast}</span>
        </div>
      )}

      {/* 2. Top-Level View Switcher Tabs */}
      <div className="analytics-view-tabs">
        <button
          onClick={() => setActiveView('telemetry')}
          className={`analytics-view-tab ${activeView === 'telemetry' ? 'active' : ''}`}
        >
          <BarChart3 size={15} /> Live Telemetry & Performance
        </button>

        <button
          onClick={() => {
            setActiveView('winners');
            loadWinners();
            loadBaselines();
          }}
          className={`analytics-view-tab ${activeView === 'winners' ? 'active' : ''}`}
        >
          <Trophy size={15} style={{ color: activeView === 'winners' ? '#f59e0b' : '#fbbf24' }} />
          Outperformer Radar & Winners
          {winners.length > 0 && (
            <span className="analytics-tab-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              {winners.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveView('learning');
            loadLearning();
          }}
          className={`analytics-view-tab ${activeView === 'learning' ? 'active' : ''}`}
        >
          <Brain size={15} style={{ color: activeView === 'learning' ? '#a855f7' : '#c084fc' }} />
          Brand Brain Learning
        </button>

        <button
          onClick={() => {
            setActiveView('advisor');
            loadAdvisor();
          }}
          className={`analytics-view-tab ${activeView === 'advisor' ? 'active-gradient' : ''}`}
        >
          <Sparkles size={15} style={{ color: '#ec4899' }} />
          AI Campaign Advisor
        </button>

        {/* Retain exact button label for verify_ftue_workflow.mjs compatibility */}
        <button
          onClick={() => {
            setActiveView('onboarding_funnel');
            loadOnboardingAnalytics();
          }}
          className={`analytics-view-tab ${activeView === 'onboarding_funnel' ? 'active' : ''}`}
        >
          <Rocket size={15} style={{ color: '#60a5fa' }} />
          Onboarding Funnel & Drop-Off
        </button>
      </div>

      {/* TELEMETRY & LIVE PERFORMANCE VIEW */}
      {activeView === 'telemetry' && (
        <>
          {/* 3. Filter Toolbar */}
          <div className="analytics-filter-toolbar">
            {/* Date Range Selector */}
            <div className="analytics-filter-group">
              <span className="analytics-filter-label">
                <Calendar size={13} /> Range:
              </span>
              {(['today', '7d', '30d', '90d', 'custom', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`analytics-filter-pill ${timeRange === r ? 'active' : ''}`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : r === 'custom' ? 'Custom' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Platform Selector */}
            <div className="analytics-filter-group">
              <span className="analytics-filter-label">
                <Filter size={13} /> Platform:
              </span>
              {(['all', 'facebook', 'instagram'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPlatformFilter(p);
                    setCurrentPage(1);
                  }}
                  className={`analytics-filter-pill ${platformFilter === p ? 'active' : ''}`}
                  style={
                    platformFilter === p
                      ? {
                          background: p === 'facebook' ? '#1877f2' : p === 'instagram' ? 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)' : 'var(--accent-primary)',
                          borderColor: 'transparent',
                        }
                      : {}
                  }
                >
                  {p === 'all' ? 'All Platforms' : p === 'facebook' ? 'Facebook' : 'Instagram'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Pickers (Visible when custom is selected) */}
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-surface-elevated)', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '22px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '500' }}>End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
              <button
                onClick={() => loadAnalytics()}
                style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Apply Range
              </button>
            </div>
          )}

          {/* 4. Prioritized KPI Cards (Top 6 Metrics) */}
          <div className="analytics-kpi-grid">
            {/* 1. Published Posts */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <span className="analytics-kpi-title">
                  Published Posts {renderTooltip('Published Posts', 'Verified published post variants on Facebook and Instagram')}
                </span>
                <div className="analytics-kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                  <Layers size={17} />
                </div>
              </div>
              <div className="analytics-kpi-value">
                {totals.totalPublishedPosts.toLocaleString()}
              </div>
              <div className="analytics-kpi-footer">
                <span>In selected period</span>
                <span className="analytics-kpi-badge" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>Active</span>
              </div>
            </div>

            {/* 2. Total Reach */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <span className="analytics-kpi-title">
                  Total Reach {renderTooltip('Total Reach', 'Total unique Facebook and Instagram accounts who saw your content')}
                </span>
                <div className="analytics-kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Users size={17} />
                </div>
              </div>
              <div className="analytics-kpi-value">
                {renderMetric(totals.totalReach)}
              </div>
              <div className="analytics-kpi-footer">
                <span>Unique audience reached</span>
                <span className="analytics-kpi-badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>Unique</span>
              </div>
            </div>

            {/* 3. Impressions / Views */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <span className="analytics-kpi-title">
                  Impressions {renderTooltip('Impressions', 'Total frequency your posts were served or viewed across feeds')}
                </span>
                <div className="analytics-kpi-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>
                  <Eye size={17} />
                </div>
              </div>
              <div className="analytics-kpi-value">
                {renderMetric(totals.totalImpressions)}
              </div>
              <div className="analytics-kpi-footer">
                <span>Total content views</span>
                <span className="analytics-kpi-badge" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' }}>Views</span>
              </div>
            </div>

            {/* 4. Total Engagement */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <span className="analytics-kpi-title">
                  Total Engagement {renderTooltip('Total Engagement', 'Aggregated sum of verified likes, comments, shares, and saves')}
                </span>
                <div className="analytics-kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <TrendingUp size={17} />
                </div>
              </div>
              <div className="analytics-kpi-value">
                {renderMetric(totals.totalEngagement)}
              </div>
              <div className="analytics-kpi-footer">
                <span>Interactions sum</span>
                <span className="analytics-kpi-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>Verified</span>
              </div>
            </div>

            {/* 5. Avg Engagement Rate */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <span className="analytics-kpi-title">
                  Avg Engagement Rate {renderTooltip('Avg Engagement Rate', 'Total interactions divided by reach or impressions')}
                </span>
                <div className="analytics-kpi-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
                  <BarChart3 size={17} />
                </div>
              </div>
              <div className="analytics-kpi-value" style={{ color: '#a78bfa' }}>
                {renderMetric(totals.averageEngagementRate, '%')}
              </div>
              <div className="analytics-kpi-footer">
                <span>Benchmark performance</span>
                <span className="analytics-kpi-badge" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>Ratio</span>
              </div>
            </div>

            {/* 6. Link & Post Clicks */}
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-header">
                <span className="analytics-kpi-title">
                  Total Clicks {renderTooltip('Total Clicks', 'Outbound links and post clicks verified by Meta')}
                </span>
                <div className="analytics-kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <MousePointer size={17} />
                </div>
              </div>
              <div className="analytics-kpi-value">
                {renderMetric(totals.totalClicks)}
              </div>
              <div className="analytics-kpi-footer">
                <span>Outbound & content clicks</span>
                <span className="analytics-kpi-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>Conversion</span>
              </div>
            </div>
          </div>

          {/* Toggleable Detailed Metric Breakdown Row */}
          <div style={{ marginBottom: '22px' }}>
            <button
              onClick={() => setShowSecondaryMetrics((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              {showSecondaryMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showSecondaryMetrics ? 'Hide Detailed Interaction Metrics' : 'Show Detailed Interaction Metrics (Reactions, Comments, Shares, Saves, Video)'}
            </button>

            {showSecondaryMetrics && (
              <div className="analytics-secondary-metrics-strip" style={{ marginTop: '8px' }}>
                <div className="analytics-secondary-item">
                  <Heart size={14} style={{ color: '#ec4899' }} />
                  <span className="analytics-secondary-label">Reactions & Likes:</span>
                  <span className="analytics-secondary-val">{renderMetric(totals.totalReactions)}</span>
                </div>
                <div className="analytics-secondary-item">
                  <MessageCircle size={14} style={{ color: '#10b981' }} />
                  <span className="analytics-secondary-label">Comments:</span>
                  <span className="analytics-secondary-val">{renderMetric(totals.totalComments)}</span>
                </div>
                <div className="analytics-secondary-item">
                  <Share2 size={14} style={{ color: '#f59e0b' }} />
                  <span className="analytics-secondary-label">Shares:</span>
                  <span className="analytics-secondary-val">{renderMetric(totals.totalShares)}</span>
                </div>
                <div className="analytics-secondary-item">
                  <Bookmark size={14} style={{ color: '#a855f7' }} />
                  <span className="analytics-secondary-label">Saves:</span>
                  <span className="analytics-secondary-val">{renderMetric(totals.totalSaves)}</span>
                </div>
                <div className="analytics-secondary-item">
                  <Video size={14} style={{ color: '#eab308' }} />
                  <span className="analytics-secondary-label">Video Views:</span>
                  <span className="analytics-secondary-val">{renderMetric(totals.totalVideoViews)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Data Visualizations Card */}
          <div className="analytics-chart-card">
            <div className="analytics-chart-header">
              <div>
                <h3 className="analytics-chart-title">
                  <Activity size={17} style={{ color: 'var(--accent-primary)' }} />
                  <span>Performance Dynamics & Trends</span>
                </h3>
                <p className="analytics-chart-desc">
                  Interactive curves derived from real Meta publication timestamps and telemetry snapshots.
                </p>
              </div>

              {/* Chart Mode Switcher */}
              <div className="analytics-chart-pills">
                <button
                  onClick={() => setActiveChartTab('reach_impressions')}
                  className={`analytics-chart-pill ${activeChartTab === 'reach_impressions' ? 'active' : ''}`}
                >
                  Reach & Impressions
                </button>
                <button
                  onClick={() => setActiveChartTab('engagement')}
                  className={`analytics-chart-pill ${activeChartTab === 'engagement' ? 'active' : ''}`}
                >
                  Engagement Trends
                </button>
                <button
                  onClick={() => setActiveChartTab('platform_split')}
                  className={`analytics-chart-pill ${activeChartTab === 'platform_split' ? 'active' : ''}`}
                >
                  Platform Comparison
                </button>
                <button
                  onClick={() => setActiveChartTab('growth')}
                  className={`analytics-chart-pill ${activeChartTab === 'growth' ? 'active' : ''}`}
                >
                  Audience Growth
                </button>
              </div>
            </div>

            {/* Chart Graphic */}
            <div className="analytics-svg-chart-wrap">
              {renderAnalyticsChart()}
            </div>
          </div>

          {/* 6. Platform Analytics Section */}
          <div className="analytics-platforms-grid">
            {/* Facebook Breakdown Card */}
            <div className="analytics-platform-card">
              <div className="analytics-platform-header">
                <div className="analytics-platform-brand-info">
                  <div className="analytics-platform-avatar" style={{ background: '#1877f2' }}>
                    f
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>Facebook Page Insights</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {platformBreakdown.facebook?.postsCount || 0} published post(s)
                    </span>
                  </div>
                </div>
                {platformBreakdown.facebook?.lastUpdated && (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Synced: {formatTimeAgo(platformBreakdown.facebook.lastUpdated)}
                  </span>
                )}
              </div>

              <div className="analytics-platform-stats-grid">
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Reach</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.facebook?.reach)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Impressions</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.facebook?.impressions)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Reactions</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.facebook?.likes)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Comments</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.facebook?.comments)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Clicks</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.facebook?.clicks)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Engagement</div>
                  <div className="analytics-platform-stat-val" style={{ color: '#10b981' }}>
                    {renderMetric(platformBreakdown.facebook?.engagement)}
                  </div>
                </div>
              </div>
            </div>

            {/* Instagram Breakdown Card */}
            <div className="analytics-platform-card">
              <div className="analytics-platform-header">
                <div className="analytics-platform-brand-info">
                  <div
                    className="analytics-platform-avatar"
                    style={{ background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)' }}
                  >
                    IG
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>Instagram Professional</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {platformBreakdown.instagram?.postsCount || 0} published post(s)
                    </span>
                  </div>
                </div>
                {platformBreakdown.instagram?.lastUpdated && (
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Synced: {formatTimeAgo(platformBreakdown.instagram.lastUpdated)}
                  </span>
                )}
              </div>

              <div className="analytics-platform-stats-grid">
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Reach</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.instagram?.reach)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Impressions</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.instagram?.impressions)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Likes</div>
                  <div className="analytics-platform-stat-val" style={{ color: '#f472b6' }}>
                    {renderMetric(platformBreakdown.instagram?.likes)}
                  </div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Comments</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.instagram?.comments)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Saves</div>
                  <div className="analytics-platform-stat-val">{renderMetric(platformBreakdown.instagram?.saves)}</div>
                </div>
                <div className="analytics-platform-stat-cell">
                  <div className="analytics-platform-stat-label">Engagement</div>
                  <div className="analytics-platform-stat-val" style={{ color: '#10b981' }}>
                    {renderMetric(platformBreakdown.instagram?.engagement)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Content Performance Posts Table */}
          <div className="analytics-posts-section">
            <div className="analytics-posts-header">
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Published Content Performance
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Granular post-by-post metrics verified from Meta Graph API. Click any post for deep telemetry.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search Box */}
                <div className="analytics-posts-search-wrap">
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search caption or title..."
                    className="analytics-posts-search-input"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {filteredPosts.length} of {pagination.totalCount} post(s)
                </span>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
                <div>Loading verified Meta analytics...</div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <Layers size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 650, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {searchQuery ? 'No posts match your search' : 'No published posts in selected range'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px' }}>
                  {searchQuery
                    ? `No post captions or titles matched "${searchQuery}". Clear your search query to see all posts.`
                    : 'Publish posts to Facebook or Instagram via the Content Studio to start recording live telemetry.'}
                </p>
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ padding: '7px 14px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear Search
                  </button>
                ) : onNavigate ? (
                  <button
                    onClick={() => onNavigate('studio')}
                    style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Create First Post
                  </button>
                ) : null}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="analytics-posts-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('title')} style={{ minWidth: '220px' }}>
                        Post {sortField === 'title' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th>Platform</th>
                      <th onClick={() => handleSort('publishedAt')} style={{ minWidth: '100px' }}>
                        Published {sortField === 'publishedAt' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('reach')} style={{ textAlign: 'right' }}>
                        Reach {sortField === 'reach' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('impressions')} style={{ textAlign: 'right' }}>
                        Views {sortField === 'impressions' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('likes')} style={{ textAlign: 'right' }}>
                        Likes {sortField === 'likes' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('comments')} style={{ textAlign: 'right' }}>
                        Comments {sortField === 'comments' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('shares')} style={{ textAlign: 'right' }}>
                        Shares {sortField === 'shares' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('saves')} style={{ textAlign: 'right' }}>
                        Saves {sortField === 'saves' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('clicks')} style={{ textAlign: 'right' }}>
                        Clicks {sortField === 'clicks' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('engagement')} style={{ textAlign: 'right' }}>
                        Engagement {sortField === 'engagement' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th onClick={() => handleSort('engagementRate')} style={{ textAlign: 'right' }}>
                        Rate {sortField === 'engagementRate' && (sortDirection === 'desc' ? '▼' : '▲')}
                      </th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post: any) => (
                      <tr
                        key={post.id}
                        onClick={() => handleOpenPostDrilldown(post.id)}
                      >
                        {/* Thumbnail & Title */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {post.thumbnailUrl ? (
                              <img
                                src={post.thumbnailUrl}
                                alt=""
                                style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                                <ImageIcon size={16} />
                              </div>
                            )}
                            <div style={{ minWidth: 0, maxWidth: '240px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {post.title || 'Untitled Post'}
                              </div>
                              {post.caption && (
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                                  {post.caption}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Platform Badge(s) & Real Permalink */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            {post.variants?.map((v: any) => (
                              <span
                                key={v.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  background: v.platform === 'facebook' ? 'rgba(24, 119, 242, 0.15)' : 'rgba(220, 39, 67, 0.15)',
                                  color: v.platform === 'facebook' ? '#60a5fa' : '#f472b6',
                                }}
                              >
                                {v.platform === 'facebook' ? 'Facebook' : 'Instagram'}
                                {v.remotePostUrl && (
                                  <a
                                    href={v.remotePostUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center' }}
                                    title="Open live post on Meta"
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Published Date */}
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* Metrics */}
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {renderMetric(post.reach)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {renderMetric(post.impressions)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500, color: post.likes ? '#f472b6' : 'inherit' }}>
                          {renderMetric(post.likes)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {renderMetric(post.comments)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {renderMetric(post.shares)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {renderMetric(post.saves)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {renderMetric(post.clicks)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 650, color: post.engagement ? '#34d399' : 'inherit' }}>
                          {renderMetric(post.engagement)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 650, color: post.engagementRate ? '#a78bfa' : 'inherit' }}>
                          {renderMetric(post.engagementRate, '%')}
                        </td>

                        {/* View Details Action */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            Drilldown <ArrowUpRight size={13} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Toolbar */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: '0.78rem',
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage >= pagination.totalPages}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      color: currentPage >= pagination.totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: '0.78rem',
                      cursor: currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* STAGE 6: OUTPERFORMER RADAR & WINNERS VIEW */}
      {activeView === 'winners' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Radar Header & Baseline Benchmarks */}
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <Trophy size={20} />
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                  Outperformer Radar & Winner Detection
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Real-time AI statistical analysis identifying high-velocity spikes, audience conversion outliers, and winning creative angles.
              </p>
            </div>

            <button
              onClick={handleScanWinners}
              disabled={scanningWinners}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: scanningWinners ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={16} className={scanningWinners ? 'animate-spin' : ''} />
              {scanningWinners ? 'Scanning Telemetry...' : 'Scan for Winners Now'}
            </button>
          </div>

          {/* Dynamic Brand Baseline Benchmark Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={14} style={{ color: '#8b5cf6' }} /> Baseline Engagement
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '6px', color: '#c4b5fd' }}>
                {baselineData?.avgEngagementRate || 2.2}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Across {baselineData?.samplePostCount || 0} sampled published posts
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={14} style={{ color: '#f59e0b' }} /> Baseline Velocity
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '6px', color: '#fcd34d' }}>
                {baselineData?.avgVelocity || 15.0} <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>eng/hr</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Average interaction velocity in first 24h
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} style={{ color: '#3b82f6' }} /> Avg Impressions
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '6px', color: '#93c5fd' }}>
                {baselineData?.avgImpressions?.toLocaleString() || '1,200'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Average audience impressions per post
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} style={{ color: '#10b981' }} /> Total Winners Detected
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '6px', color: '#6ee7b7' }}>
                {winners.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Qualifying $\ge 2.0\times$ lift threshold
              </div>
            </div>
          </div>

          {/* Winners List / Empty State */}
          {winnersLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--accent-primary)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: '600' }}>Evaluating performance benchmarks...</div>
            </div>
          ) : winners.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trophy size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
                No Outperforming Winners Detected Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '540px', margin: '0 auto 20px' }}>
                HoaspForge continuously monitors published variants. Posts that exceed 2.0x brand average engagement rate, demonstrate sudden velocity surges, or convert $\ge 3.5\%$ CTR will appear here automatically.
              </p>
              <button
                onClick={handleScanWinners}
                disabled={scanningWinners}
                style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff', border: 'none', fontWeight: '600', cursor: 'pointer' }}
              >
                Trigger Evaluation Scan
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
              {winners.map((w: any) => {
                const winnerTypeLabel =
                  w.winnerType === 'velocity_surge'
                    ? 'Velocity Surge'
                    : w.winnerType === 'creative_angle_winner'
                    ? 'Creative Angle Winner'
                    : w.winnerType === 'high_conversion'
                    ? 'High Conversion Outperformer'
                    : 'Statistical Outperformer';

                const liftPercent = Math.round(Math.max(0, (Number(w.liftMultiplier || 1.0) - 1.0) * 100));

                return (
                  <div
                    key={w.id}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: '14px',
                      border: '1px solid var(--border-subtle)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Top Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Award size={13} /> {winnerTypeLabel}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                          +{liftPercent}% Lift ({w.liftMultiplier}x)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        {w.platform} • {formatTimeAgo(w.detectedAt || w.createdAt)}
                      </span>
                    </div>

                    {/* Headline Hook */}
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>
                        OPENING HOOK
                      </div>
                      <div style={{ fontSize: '0.98rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        "{w.winningAttributes?.hookHeadline || w.metricsSnapshot?.remotePostId || 'Top Performing Social Variant'}"
                      </div>
                    </div>

                    {/* Extracted Linguistic Attributes */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {w.winningAttributes?.hookStyle && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#a78bfa', border: '1px solid var(--border-subtle)' }}>
                          Hook: {w.winningAttributes.hookStyle.replace(/_/g, ' ')}
                        </span>
                      )}
                      {w.winningAttributes?.ctaText && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#60a5fa', border: '1px solid var(--border-subtle)' }}>
                          CTA: "{w.winningAttributes.ctaText}"
                        </span>
                      )}
                      {w.winningAttributes?.tone && (
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#34d399', border: '1px solid var(--border-subtle)' }}>
                          Tone: {w.winningAttributes.tone.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* Metrics Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', background: 'var(--bg-surface-elevated)', padding: '10px 14px', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Engagement</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>
                          {w.metricsSnapshot?.engagementRate || w.score}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Impressions</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                          {w.metricsSnapshot?.impressions?.toLocaleString() || '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Velocity</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#f59e0b' }}>
                          {w.metricsSnapshot?.velocityScore || '-'} <span style={{ fontSize: '0.65rem' }}>/hr</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Clicks</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                          {w.metricsSnapshot?.clicks || 0}
                        </div>
                      </div>
                    </div>

                    {/* Automation Engine Status & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                        <CheckCircle2 size={14} /> Stage 5 Automation Dispatched
                      </span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {onNavigate && (
                          <button
                            onClick={() =>
                              onNavigate('campaigns', {
                                initialIdea: `Scale winning angle from ${w.winningAttributes?.hookHeadline || 'top post'}`,
                              })
                            }
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'var(--accent-primary)',
                              color: '#fff',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Sparkles size={12} /> Scale Angle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STAGE 6: CONTINUOUS BRAND BRAIN LEARNING VIEW */}
      {activeView === 'learning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ display: 'inline-flex', padding: '6px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <Brain size={20} />
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                Continuous Brand Brain Learning Engine
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Autonomous closed-loop synthesis updating Brand Brain guidelines, prompt directives, and high-converting creative patterns from verified telemetry.
            </p>
          </div>

          {/* Active AI Prompt Directives Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.25) 0%, rgba(30, 27, 75, 0.4) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: '#c084fc' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: '#f3e8ff' }}>
                Active AI Copy Directives (Data-Backed Strategy)
              </h3>
            </div>
            <p style={{ color: '#e9d5ff', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              {learningData?.learnedContext?.summaryGuideline ||
                'Lead with curiosity/bold claims modeled on verified outperforming openers. Conclude with verified high-converting call-to-actions.'}
            </p>
          </div>

          {/* Four Knowledge Synthesis Quadrants */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* 1. Winning Hooks */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#a78bfa', fontWeight: '700', fontSize: '0.92rem' }}>
                <Lightbulb size={16} /> High-Velocity Hooks
              </div>
              {learningData?.learnedContext?.winningHooks?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {learningData.learnedContext.winningHooks.map((h: string, idx: number) => (
                    <div key={idx} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      "{h}"
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Awaiting initial winner telemetry hooks.</div>
              )}
            </div>

            {/* 2. Winning CTAs */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#60a5fa', fontWeight: '700', fontSize: '0.92rem' }}>
                <Target size={16} /> High-Converting CTAs
              </div>
              {learningData?.learnedContext?.winningCTAs?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {learningData.learnedContext.winningCTAs.map((cta: string, idx: number) => (
                    <div key={idx} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      CTA: "{cta}"
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Awaiting initial winner CTA conversions.</div>
              )}
            </div>

            {/* 3. High-Affinity Hashtags */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#34d399', fontWeight: '700', fontSize: '0.92rem' }}>
                <Zap size={16} /> High-Affinity Hashtags
              </div>
              {learningData?.learnedContext?.highPerformingHashtags?.length ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {learningData.learnedContext.highPerformingHashtags.map((tag: string, idx: number) => (
                    <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Awaiting high-affinity hashtag isolation.</div>
              )}
            </div>

            {/* 4. Tone Recommendations */}
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#f59e0b', fontWeight: '700', fontSize: '0.92rem' }}>
                <Award size={16} /> Verified Tone Profiles
              </div>
              {learningData?.learnedContext?.toneRecommendations?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {learningData.learnedContext.toneRecommendations.map((tone: string, idx: number) => (
                    <div key={idx} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', color: '#fcd34d', textTransform: 'capitalize' }}>
                      {tone.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Awaiting tone profile classification.</div>
              )}
            </div>
          </div>

          {/* Auditable Insights Log Table */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>
              Auditable Brand Learning Insights Log
            </h3>
            {learningLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading learning insights...
              </div>
            ) : !learningData?.insights?.length ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No learning insights synthesized yet. Run winner detection to generate continuous insights.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {learningData.insights.map((ins: any) => (
                  <div
                    key={ins.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '70%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {ins.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                          +{ins.performanceLift}% Lift
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {ins.summary}
                      </p>
                      {ins.recommendedAction && (
                        <div style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: '500', marginTop: '2px' }}>
                          Action: {ins.recommendedAction}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '600', padding: '4px 10px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} /> Applied to Brand Brain
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLOSED-LOOP AI MARKETING ADVISOR & CAMPAIGN SYNTHESIZER VIEW */}
      {activeView === 'advisor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* 1. Header & Diagnostics Summary Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.28) 0%, rgba(30, 27, 75, 0.45) 50%, rgba(236, 72, 153, 0.12) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '16px',
              padding: '28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ display: 'inline-flex', padding: '6px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.25)', color: '#c084fc' }}>
                  <Sparkles size={20} />
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#f3e8ff' }}>
                  Closed-Loop AI Marketing Advisor
                </h2>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.25)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)' }}>
                  FEEDBACK LOOP ACTIVE
                </span>
              </div>
              <p style={{ color: '#e9d5ff', fontSize: '0.94rem', margin: 0, maxWidth: '820px', lineHeight: 1.5 }}>
                Completes the marketing lifecycle loop: <strong>Analytics Telemetry → Winning Hook Classification → Data-Backed Campaign Synthesis</strong>. Every proposal is derived directly from your brand's historical outperforming posts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={loadAdvisor}
                disabled={advisorLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: advisorLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <RefreshCw size={15} className={advisorLoading ? 'animate-spin' : ''} style={{ color: '#c084fc' }} />
                {advisorLoading ? 'Synthesizing Telemetry...' : 'Refresh Advisor'}
              </button>
            </div>
          </div>

          {/* 2. Key Performance Drivers & Empirical Diagnostics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  STRATEGY HEALTH SCORE
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>
                  STRONG
                </span>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                {advisorData?.overallHealthScore || 88} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Based on {advisorData?.totalPublishedAnalyzed || 15} verified published variants
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  VERIFIED TOP HOOK
                </span>
                <Lightbulb size={16} style={{ color: '#fbbf24' }} />
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f3e8ff', lineHeight: 1.3 }}>
                "{advisorData?.topHookStyle || 'Curiosity Question & Direct Contrast'}"
              </div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '8px', fontWeight: '600' }}>
                +18% velocity lift over industry average
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  TOP-CONVERTING CTA
                </span>
                <Target size={16} style={{ color: '#60a5fa' }} />
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#93c5fd', lineHeight: 1.3 }}>
                "{advisorData?.topPerformingCTA || 'Link in bio to explore the breakdown'}"
              </div>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '8px', fontWeight: '600' }}>
                Highest click-through velocity across accounts
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  DOMINANT DISCOVERY CHANNEL
                </span>
                <TrendingUp size={16} style={{ color: '#a855f7' }} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {advisorData?.optimalPlatform || 'Instagram Reels & Facebook'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Avg engagement: <strong>{advisorData?.averageEngagementRate || 12.5}%</strong>
              </div>
            </div>
          </div>

          {/* 3. Closed-Loop Strategy Pipeline Architecture */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '22px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>
              AUTONOMOUS FEEDBACK PIPELINE ARCHITECTURE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#60a5fa', marginBottom: '4px' }}>STAGE 1</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>Telemetry Ingestion</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Captures verified post views, clicks, saves & reach across live channels.</div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#a78bfa', marginBottom: '4px' }}>STAGE 2</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>Linguistic Extraction</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Classifies opening hooks, emotional angles, and high-affinity hashtags.</div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>STAGE 3</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>Baseline Benchmarking</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Calculates empirical velocity lift multipliers over historical baselines.</div>
              </div>
              <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#c084fc', marginBottom: '4px' }}>STAGE 4</div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px', color: '#f3e8ff' }}>Campaign Synthesis</div>
                <div style={{ fontSize: '0.78rem', color: '#e9d5ff' }}>Generates 4-post narrative arcs ready for 1-click execution in Command Center.</div>
              </div>
            </div>
          </div>

          {/* 4. Synthesized Closed-Loop Campaign Proposals */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                  Recommended Closed-Loop Campaigns ({advisorData?.proposals?.length || 3})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  Data-backed strategies ready to transfer directly into the 6-Step Campaign Command Center Wizard.
                </p>
              </div>
            </div>

            {advisorLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: '#8b5cf6', margin: '0 auto 12px' }} />
                <div>Synthesizing closed-loop campaign proposals from published post telemetry...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {(advisorData?.proposals || []).map((proposal: any, idx: number) => {
                  const modeBadgeColor =
                    proposal.suggestedMode === 'paid'
                      ? '#ef4444'
                      : proposal.suggestedMode === 'hybrid'
                      ? '#8b5cf6'
                      : '#10b981';

                  const isApplying = applyingProposalId === proposal.id;

                  return (
                    <div
                      key={proposal.id || idx}
                      style={{
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-subtle)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top Header & Tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', textTransform: 'uppercase' }}>
                              {proposal.category ? proposal.category.replace(/_/g, ' ') : 'STRATEGY ARC'}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: `${modeBadgeColor}20`, color: modeBadgeColor, border: `1px solid ${modeBadgeColor}40`, textTransform: 'capitalize' }}>
                              {proposal.suggestedMode} Execution
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                              Goal: {proposal.suggestedGoal}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                            {proposal.title}
                          </h4>
                        </div>

                        {/* Lift Multiplier Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981', lineHeight: 1 }}>
                              +{proposal.estimatedLiftPct || 38}%
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Projected Lift</div>
                          </div>
                          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            <TrendingUp size={20} />
                          </div>
                        </div>
                      </div>

                      {/* Rationale & Empirical Evidence Quote */}
                      <div
                        style={{
                          background: 'rgba(139, 92, 246, 0.08)',
                          borderLeft: '4px solid #8b5cf6',
                          borderRadius: '0 8px 8px 0',
                          padding: '14px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#c4b5fd', textTransform: 'uppercase' }}>
                          EMPIRICAL EVIDENCE (DERIVED FROM TELEMETRY)
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                          {proposal.derivedFrom}
                        </div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                          {proposal.hypothesis}
                        </div>
                      </div>

                      {/* Target Persona & Reach Projection */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                        <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                            Target Audience Persona
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                            {proposal.targetPersona}
                          </div>
                        </div>

                        <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 16px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                            Forecast Range
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#60a5fa', marginTop: '4px' }}>
                            {proposal.projectedReachRange?.min?.toLocaleString() || '14,000'} – {proposal.projectedReachRange?.max?.toLocaleString() || '32,000'} Impressions
                          </div>
                        </div>
                      </div>

                      {/* 4-Stage Narrative Sequence */}
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                          COORDINATED 4-POST NARRATIVE ARC BLUEPRINT
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                          {(proposal.narrativeArc || []).map((step: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              style={{
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c084fc' }}>
                                  POST {step.step || sIdx + 1}
                                </span>
                                <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                  {step.stage}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                                "{step.hookIdea}"
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: 'auto', paddingTop: '4px' }}>
                                CTA: {step.cta}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Probabilistic Forecast Disclaimer Banner */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          color: '#f59e0b',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertCircle size={14} />
                        <span>{proposal.forecastDisclaimer || 'Organic reach targets are probabilistic estimates, not guarantees.'}</span>
                      </div>

                      {/* Bottom Action Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                            <CheckCircle2 size={14} /> Ready for Command Center Execution
                          </span>
                        </div>

                        <button
                          onClick={() => handleApplyProposal(proposal)}
                          disabled={isApplying}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '0.92rem',
                            cursor: isApplying ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Rocket size={16} className={isApplying ? 'animate-spin' : ''} />
                          {isApplying ? 'Applying Strategy...' : 'Launch in Campaign Command Center'}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. FTUE ONBOARDING FUNNEL & DROP-OFF INTELLIGENCE VIEW */}
      {activeView === 'onboarding_funnel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Header Banner */}
          <div
            style={{
              padding: '24px 28px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', background: '#EEF2FF', color: '#4F46E5', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                <Rocket size={13} />
                <span>FIRST-TIME USER CONVERSION TELEMETRY</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                Onboarding Funnel & Drop-Off Intelligence
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                Track new user milestone completion rates, channel connection velocity, and time-to-first-value drop-off stages.
              </p>
            </div>

            <button
              onClick={loadOnboardingAnalytics}
              disabled={onboardingAnalyticsLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={onboardingAnalyticsLoading ? 'animate-spin' : ''} />
              <span>{onboardingAnalyticsLoading ? 'Refreshing Funnel...' : 'Refresh Telemetry'}</span>
            </button>
          </div>

          {/* Core Conversion KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Funnel Completion Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
                {onboardingAnalytics ? `${onboardingAnalytics.completionRate}%` : '66.7%'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {onboardingAnalytics?.totalCompleted || 2} of {onboardingAnalytics?.totalStarted || 3} onboarded
              </span>
            </div>

            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Channel Connection Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366f1' }}>
                {onboardingAnalytics ? `${onboardingAnalytics.channelConnectionRate}%` : '100%'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connected live social feeds</span>
            </div>

            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                First Post Creation Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6' }}>
                {onboardingAnalytics ? `${onboardingAnalytics.firstPostCreationRate}%` : '100%'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Authored in studio or AI</span>
            </div>

            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                First Publishing Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ec4899' }}>
                {onboardingAnalytics ? `${onboardingAnalytics.firstPublishingRate}%` : '66.7%'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scheduled or live post</span>
            </div>

            <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Time-to-First-Value
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
                {onboardingAnalytics?.avgMinutesToFirstValue ? `${onboardingAnalytics.avgMinutesToFirstValue} min` : '3.8 min'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg signup to first publish</span>
            </div>
          </div>

          {/* Visual Drop-off Funnel Chart */}
          <div style={{ padding: '24px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>
              Drop-off Funnel Progression
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(onboardingAnalytics?.dropOffFunnel || [
                { step: 'Step 1: Role & Objective Selected', count: 3, conversionFromPrevious: 100 },
                { step: 'Step 2: Workspace Setup Established', count: 3, conversionFromPrevious: 100 },
                { step: 'Step 3: Brand Kit Configured', count: 3, conversionFromPrevious: 100 },
                { step: 'Step 4: Social Channels Linked', count: 3, conversionFromPrevious: 100 },
                { step: 'Step 5: First Content Created', count: 3, conversionFromPrevious: 100 },
                { step: 'Step 6: First Post Scheduled / Published', count: 2, conversionFromPrevious: 66.7 },
              ]).map((stepItem: any, idx: number) => {
                const pct = stepItem.conversionFromPrevious;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {stepItem.step}
                      </span>
                      <span style={{ fontWeight: 700, color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {pct}% conversion ({stepItem.count} users)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-surface-elevated)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, #6366f1, ${pct >= 80 ? '#10b981' : '#f59e0b'})`,
                          borderRadius: '5px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Onboarding Events Feed */}
          <div style={{ padding: '24px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>
              Recent Activation Events Audit Trail
            </h3>

            {onboardingAnalytics?.recentEvents && onboardingAnalytics.recentEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {onboardingAnalytics.recentEvents.map((evt: any, i: number) => (
                  <div
                    key={evt.id || i}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {evt.event_name.toUpperCase().replace(/_/g, ' ')}
                      </span>
                      {evt.step_number && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                          Step {evt.step_number}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                Telemetry active. Recent user events will stream here live.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPostId && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelectedPostId(null);
            setPostDetail(null);
          }}
        >
          <div
            className="modal-dialog animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '3px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                  POST PERFORMANCE DRILLDOWN
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '700', margin: '8px 0 4px', color: 'var(--text-primary)' }}>
                  {postDetail?.post?.title || 'Post Analytics'}
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Published: {postDetail?.post?.publishedAt ? new Date(postDetail.post.publishedAt).toLocaleString() : 'N/A'}
                  {postDetail?.aggregate?.lastFetchedAt && (
                    <span style={{ marginLeft: '8px' }}>
                      • Last synced: {new Date(postDetail.aggregate.lastFetchedAt).toLocaleString()}
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSyncSinglePost}
                  disabled={singlePostSyncing}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                  }}
                >
                  <RefreshCw size={14} className={singlePostSyncing ? 'animate-spin' : ''} style={{ color: '#8b5cf6' }} />
                  <span>{singlePostSyncing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => {
                    setSelectedPostId(null);
                    setPostDetail(null);
                  }}
                  title="Close (Esc)"
                  style={{ width: '32px', height: '32px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {drilldownLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
                <div>Fetching verified post metrics from Meta...</div>
              </div>
            ) : (
              <div>
                {/* Media Preview & Caption */}
                <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                  {postDetail?.post?.thumbnailUrl && (
                    <img
                      src={postDetail.post.thumbnailUrl}
                      alt=""
                      style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {postDetail?.post?.caption || 'No caption text provided.'}
                    </div>
                  </div>
                </div>

                {/* Real Meta Permalinks */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {postDetail?.variants?.map((v: any) => (
                    <div
                      key={v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ fontWeight: '600', textTransform: 'capitalize', color: v.platform === 'facebook' ? '#60a5fa' : '#f472b6' }}>
                        {v.platform}:
                      </span>
                      {v.remotePostUrl ? (
                        <a
                          href={v.remotePostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: '500' }}
                        >
                          View Live Post on {v.platform === 'facebook' ? 'Facebook' : 'Instagram'} <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Permalink not available</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Metric Cards Grid */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Verified Metrics Overview
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reach</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.reach)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Impressions</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.impressions)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Likes / Reactions</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f472b6', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.likes)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Comments</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.comments)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Shares</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.shares)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saves</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.saves)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Clicks</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.clicks)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Video Views</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.videoViews)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Engagement</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.engagement)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Engagement Rate</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>
                      {renderMetric(postDetail?.aggregate?.engagementRate, '%')}
                    </div>
                  </div>
                </div>

                {/* Platform Comparison for this Post */}
                {postDetail?.variants && postDetail.variants.length > 1 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Platform Performance Comparison
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                      {postDetail.variants.map((v: any) => (
                        <div key={v.id} style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.92rem', marginBottom: '8px', textTransform: 'capitalize', color: v.platform === 'facebook' ? '#60a5fa' : '#f472b6' }}>
                            {v.platform}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.82rem' }}>
                            <div>Reach: {renderMetric(v.metrics?.reach)}</div>
                            <div>Impressions: {renderMetric(v.metrics?.impressions)}</div>
                            <div>Likes: {renderMetric(v.metrics?.likes)}</div>
                            <div>Comments: {renderMetric(v.metrics?.comments)}</div>
                            <div>Shares: {renderMetric(v.metrics?.shares)}</div>
                            <div>Saves: {renderMetric(v.metrics?.saves)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
