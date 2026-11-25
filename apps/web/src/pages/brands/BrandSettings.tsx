import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Save,
  CheckCircle2,
  Trash2,
  Globe,
  Clock,
  Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const BrandSettings: React.FC = () => {
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [name, setName] = useState(activeBrand?.name || 'Acme Brand');
  const [industry, setIndustry] = useState(activeBrand?.industry || 'B2B SaaS & Automation');
  const [websiteUrl, setWebsiteUrl] = useState(activeBrand?.websiteUrl || 'https://acme.com');
  const [timezone, setTimezone] = useState(activeBrand?.timezone || 'UTC');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate('/');
    }, 800);
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
            <span className="text-purple-400 font-semibold">Settings</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-md transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saved ? 'Saved!' : 'Save Brand'}</span>
        </button>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <Settings className="w-3.5 h-3.5" />
          <span>Workspace Parameters</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Brand Workspace Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure brand identifiers, industry domain, default publishing timezones, and integrations.
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Brand Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Industry Vertical
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Publishing Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST / EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
              <option value="Europe/London">Europe/London (GMT / BST)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BrandSettings;
