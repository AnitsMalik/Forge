import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  ShoppingBag,
  Clock,
  Activity,
  FolderSync,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Check,
  Send,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { UpgradeModal } from '../../components/UpgradeModal.js';

type TriggerCategory = 'webhook' | 'schedule' | 'metric' | 'storage';

interface ActionStep {
  id: string;
  type: string;
  title: string;
  description: string;
}

export const CreateAutomation: React.FC = () => {
  const navigate = useNavigate();
  const { activeBrand } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerCategory, setTriggerCategory] = useState<TriggerCategory>('webhook');
  const [triggerEvent, setTriggerEvent] = useState('shopify.product.created');
  const [cronSchedule, setCronSchedule] = useState('0 9 * * 1'); // Monday 9am
  const [metricThreshold, setMetricThreshold] = useState('5.0');
  const [actions, setActions] = useState<ActionStep[]>([
    {
      id: 'step-1',
      type: 'ai_generate',
      title: 'AI Multi-Angle Hook & Copy Synthesis',
      description: 'Generates tailored copy variants for Instagram, LinkedIn, and X.',
    },
    {
      id: 'step-2',
      type: 'approval_queue',
      title: 'Human Review & Approval Gateway',
      description: 'Queues generated draft in Approvals Portal with Magic Link notification.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  const addAction = (type: string, title: string, desc: string) => {
    const newStep: ActionStep = {
      id: `step-${Date.now()}`,
      type,
      title,
      description: desc,
    };
    setActions([...actions, newStep]);
  };

  const removeAction = (id: string) => {
    if (actions.length > 1) {
      setActions(actions.filter((a) => a.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.automations.create({
        name,
        description,
        trigger_type: triggerCategory === 'schedule' ? 'schedule' : triggerCategory === 'webhook' ? 'webhook' : triggerCategory,
        trigger_config: {
          category: triggerCategory,
          event: triggerEvent,
          cron: cronSchedule,
          threshold: metricThreshold,
        },
        action_type: actions[0]?.type || 'ai_generate',
        action_config: {
          steps: actions,
        },
        brandId: activeBrand?.id,
      });
      setSuccess('Automation workflow created successfully in MySQL!');
      setTimeout(() => {
        navigate('/automations');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to create automation:', err);
      const isPlanLimit =
        err.message?.includes('PLAN_LIMIT_EXCEEDED') ||
        err.message?.includes('limit') ||
        err.code === 'PLAN_LIMIT_EXCEEDED' ||
        err.status === 403;

      if (isPlanLimit) {
        setUpgradeReason(err.message || 'Active automation limit reached for your current subscription plan.');
        setShowUpgradeModal(true);
      } else {
        setError(err.message || 'Failed to create automation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
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
              <span className="text-purple-400 font-semibold">New Pipeline</span>
            </div>
          </div>
        </div>

        {/* Title Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow Builder</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Configure New Automation
          </h1>
          <p className="text-slate-400 text-sm">
            Set up an event trigger, define AI processing steps, and configure automatic multi-channel actions.
          </p>
        </div>

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Fundamentals */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white">1. Workflow Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shopify New Product Drop → Omni-Channel Campaign"
                  required
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Briefly state when this automation fires and what outcome it delivers..."
                  className="w-full bg-[#131926] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Trigger Source */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 backdrop-blur-xl shadow-xl">
            <h2 className="text-lg font-bold text-white">2. Select Trigger Event</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setTriggerCategory('webhook')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                  triggerCategory === 'webhook'
                    ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                    : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                }`}
              >
                <ShoppingBag className="w-5 h-5 text-[#95BF47]" />
                <div>
                  <p className="text-sm font-bold">App Webhook</p>
                  <p className="text-xs text-slate-400 mt-1">Shopify, WooCommerce, Stripe</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTriggerCategory('schedule')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                  triggerCategory === 'schedule'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                }`}
              >
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-bold">Scheduled Cron</p>
                  <p className="text-xs text-slate-400 mt-1">Daily, weekly, or custom cron</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTriggerCategory('storage')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                  triggerCategory === 'storage'
                    ? 'bg-amber-600/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                }`}
              >
                <FolderSync className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-bold">Cloud Sync</p>
                  <p className="text-xs text-slate-400 mt-1">Google Drive, Sheets, Dropbox</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTriggerCategory('metric')}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                  triggerCategory === 'metric'
                    ? 'bg-pink-600/15 border-pink-500 text-white shadow-lg shadow-pink-500/10'
                    : 'bg-[#131926]/60 border-white/5 hover:border-white/20 text-slate-300'
                }`}
              >
                <Activity className="w-5 h-5 text-pink-400" />
                <div>
                  <p className="text-sm font-bold">Analytics Metric</p>
                  <p className="text-xs text-slate-400 mt-1">Engagement rate, viral spike</p>
                </div>
              </button>
            </div>

            {/* Trigger Configuration options based on category */}
            <div className="p-4 rounded-xl bg-[#131926]/60 border border-white/5 space-y-3">
              {triggerCategory === 'webhook' && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Event Topic
                  </label>
                  <select
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    className="w-full bg-[#0d111b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="shopify.product.created">Shopify: Product Created or Published</option>
                    <option value="shopify.inventory.low">Shopify: Inventory Low (Urgency Drop)</option>
                    <option value="woocommerce.product.created">WooCommerce: New Catalog Item</option>
                    <option value="stripe.subscription.created">Stripe: New Pro Customer Onboarding</option>
                  </select>
                </div>
              )}

              {triggerCategory === 'schedule' && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Schedule Recurrence
                  </label>
                  <select
                    value={cronSchedule}
                    onChange={(e) => setCronSchedule(e.target.value)}
                    className="w-full bg-[#0d111b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="0 9 * * 1">Every Monday at 09:00 AM</option>
                    <option value="0 18 * * 5">Every Friday at 06:00 PM (Weekend drop)</option>
                    <option value="0 8 * * *">Every Day at 08:00 AM</option>
                    <option value="0 0 1 * *">First day of every month</option>
                  </select>
                </div>
              )}

              {triggerCategory === 'metric' && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Engagement Threshold (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={metricThreshold}
                    onChange={(e) => setMetricThreshold(e.target.value)}
                    className="w-full bg-[#0d111b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Fires when any post surpasses this engagement benchmark within 6 hours.</p>
                </div>
              )}

              {triggerCategory === 'storage' && (
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-300 mb-2">
                    Target Folder
                  </label>
                  <input
                    type="text"
                    defaultValue="/HoaspForge_Raw_Clips/"
                    className="w-full bg-[#0d111b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Monitors connected Google Drive folder for newly uploaded .mp4 or .mov files.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Action Sequence */}
          <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">3. Action Sequence Steps</h2>
              <span className="text-xs text-slate-400">{actions.length} steps configured</span>
            </div>

            <div className="space-y-3">
              {actions.map((act, index) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#131926]/70 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{act.title}</p>
                      <p className="text-xs text-slate-400">{act.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAction(act.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition"
                    title="Remove step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add action step buttons */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  addAction(
                    'ai_generate',
                    'AI Post & Carousel Generator',
                    'Translates event attributes into platform-native hook copy.'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Add AI Synthesis</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  addAction(
                    'approval_queue',
                    'Queue for Approval Portal',
                    'Creates review request with email / magic link notification.'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Add Approval Step</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  addAction(
                    'direct_publish',
                    'Publish to Channels Immediately',
                    'Publishes directly to configured brand social accounts.'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Auto-Publish</span>
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/automations')}
              className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2.5 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-95 rounded-xl shadow-lg shadow-purple-500/25 transition disabled:opacity-50 transform hover:-translate-y-0.5"
            >
              <Zap className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Activating Workflow...' : 'Create & Activate Automation'}</span>
            </button>
          </div>
        </form>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Add More Automations"
        reason={upgradeReason}
      />
    </div>
  );
};

export default CreateAutomation;
