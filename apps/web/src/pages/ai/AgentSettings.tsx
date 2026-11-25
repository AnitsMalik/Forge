import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  Bot,
  Save,
  CheckCircle2,
  Sliders,
  Cpu,
  Lock
} from 'lucide-react';

export const AgentSettings: React.FC = () => {
  const navigate = useNavigate();

  const [model, setModel] = useState('claude-3-5-sonnet');
  const [temperature, setTemperature] = useState(0.7);
  const [requireApprovalForDrops, setRequireApprovalForDrops] = useState(true);
  const [maxWeeklyAutoPosts, setMaxWeeklyAutoPosts] = useState(7);
  const [strictnessLevel, setStrictnessLevel] = useState(90);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      navigate('/ai');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ai')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Growth Agent</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Autonomous Intelligence</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Governance & Boundaries</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-xl shadow-md transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saved ? 'Saved!' : 'Save Governance'}</span>
        </button>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Agent Boundaries & Alignment</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Agent Governance & Policy Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Define autonomous operating thresholds, human-in-the-loop triggers, and model intelligence parameters.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Model Selection */}
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-7 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Underlying LLM Engine</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Highest nuance & copycraft' },
              { id: 'gpt-4o', name: 'GPT-4o', desc: 'High-speed reasoning' },
              { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', desc: 'Long-context multimodal' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`p-4 rounded-xl border text-left transition ${
                  model === m.id
                    ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                    : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                }`}
              >
                <p className="text-sm font-bold">{m.name}</p>
                <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Autonomous Boundaries */}
        <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-7 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Human-in-the-Loop Safeguards</span>
          </h2>

          <div className="space-y-4 text-sm">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#131926]/70 border border-white/5 cursor-pointer">
              <div>
                <p className="font-semibold text-white">Require Approval for Product Drops & Offers</p>
                <p className="text-xs text-slate-400">Routes promotional posts to Client Approval Portal before scheduling.</p>
              </div>
              <input
                type="checkbox"
                checked={requireApprovalForDrops}
                onChange={(e) => setRequireApprovalForDrops(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </label>

            <div className="p-4 rounded-xl bg-[#131926]/70 border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-white">Max Autonomous Posts / Week</span>
                <span className="font-mono text-purple-400 font-bold">{maxWeeklyAutoPosts} posts</span>
              </div>
              <input
                type="range"
                min="1"
                max="21"
                value={maxWeeklyAutoPosts}
                onChange={(e) => setMaxWeeklyAutoPosts(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#131926]/70 border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-white">Brand Voice Adherence Strictness</span>
                <span className="font-mono text-emerald-400 font-bold">{strictnessLevel}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={strictnessLevel}
                onChange={(e) => setStrictnessLevel(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-xs text-slate-400">Ensures strict enforcement of vocabulary, forbidden phrases, and tone rules from Brand Brain.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;
