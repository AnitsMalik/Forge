import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart2,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  Sparkles
} from 'lucide-react';

export const PostAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Analytics</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Posts</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">{id || 'POST-841'}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Single-Post Performance Telemetry</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Post Performance Deep-Dive
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Detailed reach breakdown, engagement velocity, and retention metrics for post <strong className="text-slate-200">#{id || 'POST-841'}</strong>.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Impressions', value: '38,420', icon: Eye, color: 'text-purple-400' },
          { label: 'Likes & Reactions', value: '1,940', icon: Heart, color: 'text-pink-400' },
          { label: 'Comments', value: '312', icon: MessageCircle, color: 'text-blue-400' },
          { label: 'Shares / Reposts', value: '428', icon: Share2, color: 'text-emerald-400' },
          { label: 'Saves / Bookmarks', value: '890', icon: Bookmark, color: 'text-amber-400' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-5 rounded-2xl bg-[#0d111b]/80 border border-white/10 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
                <span>{m.label}</span>
                <Icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-bold text-white mt-3">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* Post Content Review & Hook Breakdown */}
      <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Post Content & Resonance Factors</span>
        </h2>

        <div className="p-5 rounded-xl bg-[#131926]/70 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Published: Oct 04, 2026 at 09:15 AM (Peak Window)</span>
            <span className="text-emerald-400 font-bold">5.6% CTR (Outperformed benchmark by 1.8x)</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            "Are you still spending 12 hours a week manually drafting calendars? Here is the exact 3-stage funnel architecture high-growth agencies use in 2026..."
          </p>
        </div>
      </div>
    </div>
  );
};

export default PostAnalytics;
