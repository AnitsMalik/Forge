import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Palette,
  Globe,
  Clock,
  Layers,
  Sparkles,
  Settings,
  Share2,
  Calendar,
  BarChart2,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const BrandDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const brand = activeBrand || {
    id: id || 'brand-01',
    name: 'Acme Brand',
    slug: 'acme-brand',
    industry: 'B2B SaaS & Automation',
    websiteUrl: 'https://acme.com',
    timezone: 'UTC',
  };

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
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Brands</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">{brand.name}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/brands/settings')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Brand Settings</span>
        </button>
      </div>

      {/* Main Brand Overview Card */}
      <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <Palette className="w-3.5 h-3.5" />
              <span>Active Brand Workspace</span>
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {brand.name}
            </h1>
            <p className="text-slate-400 text-sm">
              Slug: <strong className="font-mono text-purple-300">/{brand.slug}</strong> • Industry: <strong className="text-slate-200">{brand.industry || 'General Marketing'}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-slate-400">Website URL</span>
            <p className="font-semibold text-white">{brand.websiteUrl || 'Not configured'}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-slate-400">Operating Timezone</span>
            <p className="font-semibold text-white">{brand.timezone || 'UTC'}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-slate-400">Brand Brain Status</span>
            <p className="font-semibold text-emerald-400">16-in-1 Kit Configured</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandDetail;
