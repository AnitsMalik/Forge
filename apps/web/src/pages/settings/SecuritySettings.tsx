import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Key,
  Lock,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Copy
} from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('sf_live_9a8f27b9c01824d5e89');
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <span className="text-purple-400 font-semibold">Security & API</span>
          </div>
        </div>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Access Control & Encryption</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Security & API Keys
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage two-factor authentication, active login sessions, and workspace developer tokens.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* 2FA Card */}
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span>Two-Factor Authentication (2FA)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Protect agency credentials with an authenticator app (Google Authenticator, 1Password).
              </p>
            </div>

            <button
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                twoFactorEnabled
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
            </button>
          </div>
        </div>

        {/* Developer API Key Card */}
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              <span>Workspace API Key</span>
            </h2>
            <p className="text-xs text-slate-400">
              Used to authenticate external automation runners, webhooks, and Zapier integrations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              readOnly
              className="flex-1 bg-[#131926] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-purple-300 font-mono"
            />
            <button
              onClick={copyKey}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-200 transition flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-purple-400" />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
