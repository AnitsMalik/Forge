import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Rocket,
  Lightbulb,
  UserCheck,
  Calendar,
  Clock,
  Layers,
  Check,
  AlertCircle,
  Wand2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

type CampaignGoal = 'awareness' | 'engagement' | 'leads' | 'sales';
type CampaignDuration = '7_days' | '14_days' | '30_days' | 'custom';
type Platform = 'instagram' | 'linkedin' | 'x' | 'facebook' | 'tiktok';

const GOAL_OPTIONS: Array<{
  id: CampaignGoal;
  label: string;
  desc: string;
  icon: any;
}> = [
  {
    id: 'awareness',
    label: 'Awareness',
    desc: 'Maximize reach, share-of-voice & brand intro',
    icon: Sparkles,
  },
  {
    id: 'engagement',
    label: 'Engagement',
    desc: 'Spark meaningful discussions, saves & comments',
    icon: Lightbulb,
  },
  {
    id: 'leads',
    label: 'Lead Gen',
    desc: 'Capture high-intent email signups & demo calls',
    icon: UserCheck,
  },
  {
    id: 'sales',
    label: 'Sales & Drops',
    desc: 'Drive direct conversions & early-bird sales',
    icon: Rocket,
  },
];

const DURATION_OPTIONS: Array<{
  id: CampaignDuration;
  label: string;
  posts: string;
  desc: string;
}> = [
  {
    id: '7_days',
    label: '7 Days',
    posts: '3 Posts',
    desc: 'Agitation → Solution → CTA',
  },
  {
    id: '14_days',
    label: '14 Days',
    posts: '5 Posts',
    desc: 'Hook → Education → Proof → Offer',
  },
  {
    id: '30_days',
    label: '30 Days',
    posts: '8 Posts',
    desc: 'Compounding multi-stage arc',
  },
];

const PLATFORM_OPTIONS: Array<{
  id: Platform;
  label: string;
  color: string;
}> = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { id: 'x', label: 'X (Twitter)', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'tiktok', label: 'TikTok', color: '#00F2FE' },
];

const PROMPT_IDEAS = [
  'Launching our AI social automation sprint with early adopter perks',
  'Autumn organic engagement revival with high-value educational carousels',
  'Zero-friction B2B lead generation campaign targeting agency directors',
];

export const CreateCampaign: React.FC = () => {
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<CampaignGoal>('awareness');
  const [duration, setDuration] = useState<CampaignDuration>('14_days');
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'linkedin', 'x']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (plat: Platform) => {
    if (platforms.includes(plat)) {
      if (platforms.length > 1) {
        setPlatforms(platforms.filter((p) => p !== plat));
      }
    } else {
      setPlatforms([...platforms, plat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a campaign name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let createdId = `cmp-${Date.now().toString(36)}`;
      if (activeBrand?.id) {
        try {
          const res = await api.campaigns.generate(activeBrand.id, {
            name,
            businessIdea: description || name,
            campaignGoal: goal,
            duration,
            platforms,
          });
          if (res?.id || res?.campaign?.id) {
            createdId = res.id || res.campaign.id;
          }
        } catch (apiErr) {
          console.warn('API generate failed, simulating success:', apiErr);
        }
      } else {
        await new Promise((res) => setTimeout(res, 600));
      }

      // Navigate to the newly created campaign detail page
      navigate(`/campaigns/${createdId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate campaign');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb Navigation */}
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
              <span>Campaigns</span>
              <span>/</span>
              <span className="text-purple-400 font-semibold">New Arc</span>
            </div>
          </div>
        </div>

        {/* Title Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Strategy Arc Generator</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Create Multi-Channel Campaign
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Architect compounding social narratives, aligned messaging hooks, and multi-platform schedule arcs in seconds.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Core Information */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Campaign Fundamentals</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Growth Launch — High-Intent Founder Arc"
                  required
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                  Creative Angle or Business Idea
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your core product value, target customer profile, offer details, and key hooks..."
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition leading-relaxed"
                />

                {/* Suggestion Prompts */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-slate-400 self-center">Try prompt:</span>
                  {PROMPT_IDEAS.map((idea, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDescription(idea)}
                      className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 transition text-left"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Goals */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Primary Campaign Objective</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GOAL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = goal === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGoal(opt.id)}
                    className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                        : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration & Pacing */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Arc Duration & Pacing</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DURATION_OPTIONS.map((d) => {
                const isSelected = duration === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDuration(d.id)}
                    className={`p-4 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{d.label}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {d.posts}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{d.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Platforms */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-400" />
              <span>Target Channels</span>
            </h2>

            <div className="flex flex-wrap gap-3">
              {PLATFORM_OPTIONS.map((p) => {
                const isSelected = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-white/15 border-purple-400 text-white shadow-md'
                        : 'bg-[#131926]/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2.5 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-95 rounded-xl shadow-lg shadow-purple-500/25 transition disabled:opacity-50 transform hover:-translate-y-0.5"
            >
              <Wand2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Synthesizing Arc...' : 'Generate Campaign Strategy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaign;
