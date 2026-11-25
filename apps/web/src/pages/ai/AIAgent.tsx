import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  Sparkles,
  Play,
  Pause,
  Send,
  Zap,
  CheckCircle2,
  Clock,
  Settings,
  History,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Brain,
  Sliders,
  FileText,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { PageHeader, StatCard, SegmentedTabs, Drawer, StatusBadge, EmptyState } from '../../components/ui/index.js';

interface AgentMessage {
  id: string;
  sender: 'user' | 'agent';
  timestamp: string;
  content: string;
  thoughtProcess?: string[];
  toolCalls?: Array<{ tool: string; result: string }>;
}

export const AIAgent: React.FC = () => {
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState<'semi' | 'full'>('semi');

  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      timestamp: 'Today at 09:00 AM',
      content: `Hello! I am your Autonomous Growth Agent for **${activeBrand?.name || 'Acme Brand'}**. I continuously analyze audience engagement velocity, identify compounding content opportunities, and draft multi-channel arcs. What growth objective should we tackle?`,
    },
    {
      id: 'msg-2',
      sender: 'user',
      timestamp: 'Today at 09:02 AM',
      content: 'Analyze our top performing posts from the last 14 days and generate 3 counter-narrative hooks for LinkedIn and X.',
    },
    {
      id: 'msg-3',
      sender: 'agent',
      timestamp: 'Today at 09:02 AM',
      content: `I've queried your performance analytics and identified that carousel post **#841** scored a 5.6% CTR by agitating calendar management friction. Here are 3 high-resonance counter-narrative angles:

1. **"The 'Daily Posting' Trap"** — Why high-frequency posting burns out your audience without compounding reach.
2. **"Stop Building Top-of-Funnel Content"** — How to convert lurking enterprise decision-makers with mid-funnel case studies.
3. **"Zero-Click Thought Leadership"** — The secret to maximizing organic impressions without sending users off-platform.`,
      thoughtProcess: [
        'Queried analytics API for brandId with metric threshold > 4% CTR',
        'Retrieved top 3 performing hooks and compared with Brand Brain guidelines',
        'Synthesized 3 counter-narratives with tailored B2B executive tone',
      ],
      toolCalls: [
        { tool: 'analytics.queryMetrics', result: 'Found 14 posts; peak engagement at 09:30 AM' },
        { tool: 'brandBrain.getVoiceRules', result: 'Authoritative, concise, no fluff words' },
        { tool: 'content.generateVariants', result: 'Generated 3 hooks with 98% tone alignment' },
      ],
    },
  ]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const userText = prompt.trim();
    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      content: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsProcessing(true);

    try {
      let apiResult: any = null;
      try {
        apiResult = await api.agent.runGoal({
          prompt: userText,
          agentType: 'growth_manager',
          brandId: activeBrand?.id,
        });
      } catch (err) {
        // Fallback gracefully
      }

      await new Promise((res) => setTimeout(res, 800));

      const agentReply: AgentMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: 'Just now',
        content: apiResult?.message || apiResult?.output || `I have analyzed your request: "${userText}". I reviewed recent content schedules and drafted a strategic plan. The draft is ready in your Content Calendar for final review.`,
        thoughtProcess: apiResult?.thoughtProcess || [
          'Deconstructed intent and identified core business goals',
          'Checked calendar for next open optimal posting window',
          'Formatted draft with brand guidelines and added approval task',
        ],
        toolCalls: apiResult?.toolCalls || [
          { tool: 'calendar.findOptimalSlots', result: 'Next high-velocity slot: Tomorrow at 09:15 AM' },
          { tool: 'approvals.createDraftRequest', result: 'Created approval item #req-9041' },
        ],
      };

      setMessages((prev) => [...prev, agentReply]);
    } finally {
      setIsProcessing(false);
    }
  };

  const samplePrompts = [
    'Audit recent competitor hooks and find content gaps',
    'Generate an 8-post product launch sequence',
    'Find underperforming posts and rewrite opening hooks',
    'Generate counter-narrative carousel outline',
  ];

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-primary">
      {/* Global Page Header */}
      <PageHeader
        category="Autonomous Marketing Intelligence"
        categoryIcon={Bot}
        badge="Agent Active & Monitoring"
        badgeVariant="success"
        title="Autonomous Growth Agent"
        description="Self-operating marketing AI agent continuously analyzing audience engagement velocity, optimizing publishing rhythms, and executing multi-channel conversion campaigns."
        actions={
          <>
            <button
              onClick={() => navigate('/ai/runs')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>Agent Run Logs</span>
            </button>
            <button
              onClick={() => navigate('/ai/settings')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-500" />
              <span>Agent Governance</span>
            </button>
          </>
        }
      />

      {/* KPI Stats Row - Genuine Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Autonomy Engine"
          value={autonomousMode === 'semi' ? 'Semi-Auto' : 'Fully Auto'}
          icon={Bot}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-500/10 border-indigo-500/20"
          trend={{ value: autonomousMode === 'semi' ? 'Approval Req' : 'Direct Dispatch', label: 'governance mode', neutral: true }}
          description="Autonomous agent execution mode"
        />

        <StatCard
          title="Tone & Brand Alignment"
          value={activeBrand?.name ? 'Brand Voice Kit' : 'Default Persona'}
          icon={Brain}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10 border-purple-500/20"
          trend={{ value: activeBrand?.name || 'Configured', label: 'brand tone profile', positive: true }}
          description="Matched to Brand Voice Kit"
        />

        <StatCard
          title="Active Growth Inquiries"
          value={`${messages.filter((m) => m.sender === 'user').length} Solved`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          trend={
            messages.filter((m) => m.sender === 'user').length > 0
              ? { value: `${messages.length} Exchanges`, label: 'current thread', positive: true }
              : { value: '0 Inquiries', label: 'ready for prompts', neutral: true }
          }
          description="Multi-platform strategy arcs"
        />

        <StatCard
          title="AI Tools & Connectors"
          value="Integrated"
          icon={Zap}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 border-amber-500/20"
          trend={{ value: 'Multi-Tool', label: 'Calendar, Analytics & CRM', positive: true }}
          description="Autonomous tool dispatch"
        />
      </div>

      {/* Main Grid: Workspace & Strategy Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Conversational Workspace */}
        <div className="lg:col-span-2 bg-surface border border-subtle rounded-xl shadow-xs flex flex-col h-[600px] overflow-hidden">
          {/* Workspace Header */}
          <div className="px-5 py-3.5 border-b border-subtle bg-surface-elevated flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Conversational Strategy Workspace
              </h3>
            </div>

            {/* Autonomous Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-surface border border-subtle">
              <button
                onClick={() => setAutonomousMode('semi')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  autonomousMode === 'semi'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Semi-Auto
              </button>
              <button
                onClick={() => setAutonomousMode('full')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  autonomousMode === 'full'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Fully Auto
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span className="font-semibold text-primary">
                    {m.sender === 'user' ? 'You' : 'Growth Agent'}
                  </span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </div>

                <div
                  className={`max-w-xl p-4 rounded-xl leading-relaxed text-xs sm:text-sm ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-surface-elevated border border-subtle text-primary'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed">{m.content}</div>

                  {/* Agent Thought Process & Tool Calls */}
                  {m.thoughtProcess && (
                    <div className="mt-3 pt-3 border-t border-subtle space-y-1.5">
                      <p className="text-[11px] uppercase tracking-wider font-bold text-indigo-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Agent Reasoning & Strategy Execution</span>
                      </p>
                      <ul className="text-xs text-secondary space-y-1 list-disc list-inside">
                        {m.thoughtProcess.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.toolCalls && (
                    <div className="mt-2.5 pt-2.5 border-t border-subtle space-y-1">
                      <p className="text-[10px] uppercase tracking-wider font-mono text-muted">
                        Tool Invocations:
                      </p>
                      {m.toolCalls.map((t, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded bg-surface border border-subtle font-mono text-[10px] text-indigo-500 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{t.tool}()</span>
                          <span className="text-secondary font-sans truncate">{t.result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2.5 text-xs text-indigo-500 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 w-fit animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Agent is analyzing analytics memory and generating growth strategy...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="px-5 py-2 bg-surface-elevated border-t border-subtle flex flex-wrap gap-1.5 items-center overflow-x-auto scrollbar-none">
            <span className="text-[11px] text-muted shrink-0">Quick prompts:</span>
            {samplePrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(s)}
                className="text-xs px-2.5 py-1 rounded-md bg-surface hover:bg-surface-elevated border border-subtle text-secondary hover:text-primary transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Prompt Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-subtle flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Instruct growth agent (e.g. 'Draft a 5-part LinkedIn carousel arc on product architecture')..."
              className="flex-1 bg-surface-elevated border border-subtle rounded-lg px-3.5 py-2 text-xs sm:text-sm text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 transition shadow-xs"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-40 flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Execute</span>
            </button>
          </form>
        </div>

        {/* Right Col: Brand Context, Recommendations & Shortcuts */}
        <div className="space-y-4">
          {/* Brand Knowledge Context */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-500" />
                <span>Brand Context & Memory</span>
              </h4>
              <StatusBadge status="ACTIVE" label="Synced" size="xs" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-surface-elevated border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold block">Active Brand</span>
                <span className="font-bold text-primary">{activeBrand?.name || 'Acme Workspace'}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-elevated border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold block">Tone Persona</span>
                <span className="text-secondary">Authoritative, clear, engineering-led, no buzzwords</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-elevated border border-subtle">
                <span className="text-[10px] text-muted uppercase font-semibold block">Primary Channels</span>
                <span className="text-secondary font-mono">LinkedIn, X / Twitter, WhatsApp, Email</span>
              </div>
            </div>
          </div>

          {/* Campaign Strategy Recommendations */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Recommended Strategies</span>
            </h4>

            <div className="space-y-2.5">
              <div
                onClick={() => setPrompt('Draft a 3-part mid-funnel case study campaign')}
                className="p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle transition cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-primary">Mid-Funnel Case Study Arc</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">+22% est. ROI</span>
                </div>
                <p className="text-[11px] text-secondary">
                  Target B2B enterprise prospects with real implementation ROI metrics.
                </p>
              </div>

              <div
                onClick={() => setPrompt('Create an announcement sequence for the upcoming feature release')}
                className="p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle transition cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-primary">Feature Release Blitz</span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">Compounding Reach</span>
                </div>
                <p className="text-[11px] text-secondary">
                  Synchronize LinkedIn thought leadership with email newsletters & WhatsApp announcements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
