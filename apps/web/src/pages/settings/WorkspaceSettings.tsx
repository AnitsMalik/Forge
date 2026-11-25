import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Save,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const WorkspaceSettings: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const [agencyName, setAgencyName] = useState(tenant?.name || 'Growth Forge Agency');
  const [agencySlug, setAgencySlug] = useState(tenant?.slug || 'growth-forge');
  const [dataRetentionDays, setDataRetentionDays] = useState('90');
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
            <span>Settings</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Workspace</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-md transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saved ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <Building className="w-3.5 h-3.5" />
          <span>Organization Governance</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Agency Workspace Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage agency tenant parameters, organization URL slug, and data retention policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Agency Name
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Workspace URL Slug
            </label>
            <div className="flex items-center">
              <span className="px-3.5 py-2.5 bg-white/5 border border-r-0 border-white/10 rounded-l-xl text-xs text-slate-400 font-mono">
                app.hoaspforge.com/org/
              </span>
              <input
                type="text"
                value={agencySlug}
                onChange={(e) => setAgencySlug(e.target.value)}
                className="flex-1 bg-[#131926] border border-white/10 rounded-r-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              Analytics Telemetry Retention
            </label>
            <select
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(e.target.value)}
              className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days (Recommended)</option>
              <option value="365">365 Days (Annual Archive)</option>
              <option value="unlimited">Unlimited (Enterprise Plan)</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};

export default WorkspaceSettings;
