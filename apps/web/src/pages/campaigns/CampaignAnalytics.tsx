import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  Eye,
  MousePointer,
  Sparkles,
  Share2,
  Calendar,
  Layers,
  BarChart2,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface MetricCard {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: any;
  color: string;
}

interface PlatformMetric {
  name: string;
  color: string;
  impressions: string;
  clicks: string;
  engagementRate: string;
  topFormat: string;
}

export const CampaignAnalytics: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | 'all'>('14d');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [campaignId, timeRange]);

  const metrics: MetricCard[] = [
    {
      label: 'Total Impressions',
      value: '142,850',
      change: '+24.6% vs previous arc',
      isPositive: true,
      icon: Eye,
      color: 'from-purple-500 to-indigo-500',
    },
    {
      label: 'Audience Engagements',
      value: '16,420',
      change: '+31.2% interaction velocity',
      isPositive: true,
      icon: Sparkles,
      color: 'from-pink-500 to-rose-500',
    },
    {
      label: 'Verified Link Clicks',
      value: '3,840',
      change: '+14.8% inbound traffic',
      isPositive: true,
      icon: MousePointer,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Average Campaign CTR',
      value: '2.69%',
      change: '+0.8% benchmark beat',
      isPositive: true,
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  const platformBreakdown: PlatformMetric[] = [
    {
      name: 'LinkedIn',
      color: '#0A66C2',
      impressions: '64,200',
      clicks: '2,100',
      engagementRate: '4.8%',
      topFormat: 'Multi-slide Document Carousel',
    },
    {
      name: 'Instagram',
      color: '#E1306C',
      impressions: '42,900',
      clicks: '980',
      engagementRate: '5.2%',
      topFormat: '15-second Micro-Reel Hook',
    },
    {
      name: 'X (Twitter)',
      color: '#1DA1F2',
      impressions: '24,150',
      clicks: '540',
      engagementRate: '2.4%',
      topFormat: '5-part Agitation Thread',
    },
    {
      name: 'Facebook',
      color: '#1877F2',
      impressions: '11,600',
      clicks: '220',
      engagementRate: '1.9%',
      topFormat: 'Long-form Founder Story',
    },
  ];

  const topPosts = [
    {
      id: 'p-1',
      title: 'Day 1: Are you still spending 12 hours a week manually drafting calendars?',
      platform: 'LinkedIn',
      impressions: '38,400',
      engagements: '3,120',
      ctr: '4.9%',
      highlight: 'Top Organic Reach',
    },
    {
      id: 'p-2',
      title: 'Day 3: The 3-stage funnel every agency owner needs in 2026',
      platform: 'Instagram',
      impressions: '29,800',
      engagements: '2,840',
      ctr: '5.6%',
      highlight: 'Highest Click-Through',
    },
    {
      id: 'p-3',
      title: 'Day 7: How one team grew organic inbound pipeline by 3.8x in 30 days',
      platform: 'LinkedIn',
      impressions: '22,400',
      engagements: '1,960',
      ctr: '3.8%',
      highlight: 'Best Inbound Conversion',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/campaigns/${campaignId || 'cmp-demo-001'}`)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Campaign Arc</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Dashboard
            </button>
            <div className="h-4 w-[1px] bg-white/15" />
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
              <span>Campaigns</span>
              <span>/</span>
              <span>{campaignId || 'Detail'}</span>
              <span>/</span>
              <span className="text-purple-400 font-semibold">Analytics</span>
            </div>
          </div>

          {/* Time range switcher */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xl">
            {(['7d', '14d', '30d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg uppercase tracking-wider transition ${
                  timeRange === r
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-2">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Compounding Arc Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Campaign Analytics & Attribution
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Cross-platform breakdown of reach, audience velocity, and conversion signals for campaign <span className="font-mono text-purple-300">#{campaignId}</span>.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-200 transition self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export Report</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-400 text-sm">Aggregating multi-platform metrics...</p>
          </div>
        ) : (
          <>
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl transition-all duration-200 hover:border-purple-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                        {m.label}
                      </p>
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${m.color} text-white shadow-md`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl md:text-3xl font-extrabold text-white">{m.value}</p>
                      <p className="text-xs font-medium text-emerald-400 mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{m.change}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Platform Performance Breakdown */}
            <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-400" />
                    <span>Channel Velocity & Attribution</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Normalized performance across target distribution platforms
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {platformBreakdown.map((plat) => (
                  <div
                    key={plat.name}
                    className="p-5 rounded-xl bg-[#131926]/70 border border-white/5 space-y-4 hover:border-white/15 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plat.color }}
                        />
                        <span className="font-bold text-sm text-white">{plat.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        {plat.engagementRate} ER
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Impressions:</span>
                        <span className="font-semibold text-white">{plat.impressions}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Link Clicks:</span>
                        <span className="font-semibold text-white">{plat.clicks}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[11px] text-slate-400">Top Format:</p>
                      <p className="text-xs font-medium text-slate-200 mt-0.5">{plat.topFormat}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing Sequence Posts */}
            <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                <span>Top Resonance Posts in Sequence</span>
              </h2>

              <div className="divide-y divide-white/5">
                {topPosts.map((post) => (
                  <div
                    key={post.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {post.platform}
                        </span>
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {post.highlight}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 mt-1">{post.title}</p>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-slate-400">
                      <div>
                        <p className="text-[11px] text-slate-400">Impressions</p>
                        <p className="text-sm font-bold text-white mt-0.5">{post.impressions}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Interactions</p>
                        <p className="text-sm font-bold text-purple-400 mt-0.5">{post.engagements}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">CTR</p>
                        <p className="text-sm font-bold text-pink-400 mt-0.5">{post.ctr}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CampaignAnalytics;
