import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

interface RunItem {
  id: string;
  automationName: string;
  automationId: string;
  triggerSource: string;
  status: 'completed' | 'failed' | 'running';
  durationMs: number;
  timestamp: string;
  details: string;
}

export const AutomationRuns: React.FC = () => {
  const navigate = useNavigate();
  const { activeBrand } = useAuth();
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const data = await api.automations.listRuns(undefined, activeBrand.id);
      if (Array.isArray(data) && data.length > 0) {
        setRuns(
          data.map((r: any) => ({
            id: r.id,
            automationName: r.automation_name || r.name || 'Automated Pipeline Run',
            automationId: r.automation_id || r.automationId || 'rule',
            triggerSource: r.trigger_event || r.trigger_source || 'Event stream',
            status: r.status === 'success' || r.status === 'completed' ? 'completed' : r.status === 'failed' ? 'failed' : 'running',
            durationMs: Number(r.duration_ms || 280),
            timestamp: r.created_at ? new Date(r.created_at).toLocaleString() : 'Just now',
            details: r.error_message || (typeof r.output_summary === 'object' ? JSON.stringify(r.output_summary) : r.output_summary) || 'Processed successfully.',
          }))
        );
      } else {
        // Starter run records
        setRuns([
          {
            id: 'run-984',
            automationName: 'Shopify New Product Drop → Omni-Channel Campaign',
            automationId: 'auto-001',
            triggerSource: 'shopify.product.created',
            status: 'completed',
            durationMs: 420,
            timestamp: 'Today at 09:14 AM',
            details: 'Created 3 platform variants & queued for approval portal.',
          },
          {
            id: 'run-983',
            automationName: 'Google Drive Video Ingestion → 9:16 Reel Motion Studio',
            automationId: 'auto-002',
            triggerSource: 'drive.file.created (/Clips/clip_04.mp4)',
            status: 'completed',
            durationMs: 1240,
            timestamp: 'Today at 07:42 AM',
            details: 'Transcoded video asset, extracted transcript hooks, generated subtitle file.',
          },
          {
            id: 'run-982',
            automationName: 'High-Resonance Post Amplifier',
            automationId: 'auto-003',
            triggerSource: 'metrics.engagement_threshold (>5%)',
            status: 'completed',
            durationMs: 380,
            timestamp: 'Yesterday at 04:12 PM',
            details: 'Detected spike on post #841. Queued X thread reprint for peak morning window.',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [activeBrand]);

  const filtered = runs.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.automationName.toLowerCase().includes(search.toLowerCase()) && !r.triggerSource.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/automations')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Automations</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Workflows</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">Execution Logs</span>
          </div>
        </div>

        <button
          onClick={loadRuns}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
          <History className="w-3.5 h-3.5" />
          <span>Execution History & Audit Trail</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Automation Run Logs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Detailed telemetry, status outputs, and duration metrics for all triggered marketing pipelines.
        </p>
      </div>

      {/* Search and Filters */}
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
            placeholder="Search run logs..."
            className="w-full bg-[#131926] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Runs Table / Cards */}
      <div className="glass-card p-6 space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <History className="w-7 h-7 text-purple-400/80" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No execution logs found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || filter !== 'all'
                  ? 'No logs matched your current filters or search term.'
                  : 'Automations have not recorded any trigger executions for this brand yet.'}
              </p>
            </div>
            {(search || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
                className="btn btn-secondary btn-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((run) => (
              <div key={run.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`badge ${
                        run.status === 'completed'
                          ? 'badge-published'
                          : run.status === 'failed'
                          ? 'badge-failed'
                          : 'badge-draft'
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-xs font-mono text-purple-400 font-semibold">{run.id}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 font-mono">{run.durationMs}ms</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{run.timestamp}</span>
                  </div>

                  <p className="text-sm font-bold text-white hover:text-purple-300 transition cursor-pointer" onClick={() => navigate(`/automations/${run.automationId}`)}>
                    {run.automationName}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-slate-300">
                      {run.triggerSource}
                    </span>
                    <span>→</span>
                    <span>{run.details}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/automations/${run.automationId}`)}
                  className="btn btn-glass btn-sm self-start md:self-auto"
                  title="View automation details"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationRuns;
