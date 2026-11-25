import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  Terminal,
  Activity,
  ChevronRight,
  Search
} from 'lucide-react';

interface AgentRunLog {
  id: string;
  agentType: string;
  prompt: string;
  status: 'completed' | 'running' | 'failed';
  tokensUsed: number;
  durationMs: number;
  timestamp: string;
  toolCallsSummary: string;
}

export const AgentRuns: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [search, setSearch] = useState('');

  const runs: AgentRunLog[] = [
    {
      id: 'agent-run-501',
      agentType: 'Growth Manager',
      prompt: 'Analyze top performing posts from last 14 days and generate 3 counter-narrative hooks',
      status: 'completed',
      tokensUsed: 1420,
      durationMs: 840,
      timestamp: 'Today at 09:02 AM',
      toolCallsSummary: 'analytics.queryMetrics(), brandBrain.getVoiceRules(), content.generateVariants()',
    },
    {
      id: 'agent-run-500',
      agentType: 'Audience Strategy Agent',
      prompt: 'Detect audience fatigue on product reels and suggest format shifts',
      status: 'completed',
      tokensUsed: 2180,
      durationMs: 1120,
      timestamp: 'Yesterday at 05:40 PM',
      toolCallsSummary: 'analytics.getRetentionCurves(), templates.recommendFormats()',
    },
    {
      id: 'agent-run-499',
      agentType: 'Content Synthesis Agent',
      prompt: 'Draft 5-part carousel breakdown from case study URL',
      status: 'completed',
      tokensUsed: 3410,
      durationMs: 1680,
      timestamp: '2 days ago',
      toolCallsSummary: 'scraper.extractArticle(), content.splitCarouselSlides(), approvals.queue()',
    },
    {
      id: 'agent-run-498',
      agentType: 'Growth Manager',
      prompt: 'Automated weekly schedule optimizer',
      status: 'completed',
      tokensUsed: 980,
      durationMs: 490,
      timestamp: '3 days ago',
      toolCallsSummary: 'calendar.findOptimalSlots(), scheduler.realignPosts()',
    },
  ];

  const filtered = runs.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.prompt.toLowerCase().includes(search.toLowerCase()) && !r.agentType.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
            <span className="text-purple-400 font-semibold">Agent Telemetry</span>
          </div>
        </div>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
          <History className="w-3.5 h-3.5" />
          <span>Execution Telemetry</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Autonomous Agent Run Logs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Detailed audit trail of model reasoning, tool invocations, token utilization, and output artifacts.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['all', 'completed', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                filter === s
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompt or agent type..."
            className="w-full bg-[#131926] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Runs List Card */}
      <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="divide-y divide-white/5">
          {filtered.map((run) => (
            <div key={run.id} className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4 first:pt-0 last:pb-0">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {run.status}
                  </span>
                  <span className="text-xs font-mono text-purple-400 font-semibold">{run.id}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs font-semibold text-slate-200">{run.agentType}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400 font-mono">{run.tokensUsed} tokens</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400 font-mono">{run.durationMs}ms</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">{run.timestamp}</span>
                </div>

                <p className="text-sm font-semibold text-white">"{run.prompt}"</p>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-purple-300">
                  <span className="text-slate-500">Tools: </span>
                  {run.toolCallsSummary}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentRuns;
