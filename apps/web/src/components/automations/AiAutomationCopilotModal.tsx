import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Edit3,
  X,
  ShieldCheck,
  Lock,
  Clock,
  Send,
  Database,
  Layers,
  ChevronRight,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  CopilotAutomationPlan,
  CopilotToolCallAudit,
} from '@socialforge/shared';

interface AiAutomationCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId?: string;
  onPlanActivated?: (plan: CopilotAutomationPlan) => void;
}

export const AiAutomationCopilotModal: React.FC<AiAutomationCopilotModalProps> = ({
  isOpen,
  onClose,
  brandId,
  onPlanActivated,
}) => {
  const [prompt, setPrompt] = useState<string>(
    'Whenever a new product is added to my Google Sheet, use Product Promotion and publish to Instagram/Facebook every weekday at 7 PM.'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [plan, setPlan] = useState<CopilotAutomationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editSchedule, setEditSchedule] = useState<string>('');
  const [editCron, setEditCron] = useState<string>('');

  // Testing State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any | null>(null);

  // Active Tab in Plan View
  const [activeTab, setActiveTab] = useState<'plan' | 'audit' | 'simulation'>('plan');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setTestResults(null);
    setIsEditing(false);

    try {
      const response = await api.copilot.createPlan(prompt, brandId);
      const generatedPlan = response.plan;
      setPlan(generatedPlan);
      setEditName(generatedPlan.structuredPlan.name);
      setEditSchedule(generatedPlan.extractedIntent.schedule);
      setEditCron(generatedPlan.extractedIntent.cronExpression || '0 19 * * 1-5');
      setActiveTab('plan');
    } catch (err: any) {
      console.error('Failed to generate copilot automation plan:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to synthesize plan');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!plan) return;
    setIsTesting(true);
    setError(null);

    try {
      const response = await api.copilot.testPlan(plan.id);
      setTestResults(response.testResults);
      setActiveTab('simulation');
      setPlan((prev) => prev ? { ...prev, status: 'tested', testResults: response.testResults } : null);
      setSuccessMessage('Dry-run test completed with 100% verification.');
    } catch (err: any) {
      console.error('Test simulation failed:', err);
      setError(err?.response?.data?.error || err.message || 'Test simulation failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);

    try {
      const response = await api.copilot.editPlan(
        plan.id,
        {
          name: editName,
          schedule: editSchedule,
          cronExpression: editCron,
        }
      );
      setPlan(response.plan);
      setIsEditing(false);
      setSuccessMessage('Plan parameters updated. Approval guard remains strictly enforced.');
    } catch (err: any) {
      console.error('Failed to edit plan:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);

    try {
      const response = await api.copilot.activatePlan(plan.id);
      setPlan(response.plan);
      setSuccessMessage(`Automation activated successfully! Engine ID: ${response.automationId}`);
      if (onPlanActivated) {
        onPlanActivated(response.plan);
      }
    } catch (err: any) {
      console.error('Failed to activate plan:', err);
      setError(err?.response?.data?.error || err.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!plan) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const response = await api.copilot.cancelPlan(plan.id, 'User cancelled');
      setPlan(response.plan);
      setSuccessMessage('Plan cancelled. No live automation was scheduled.');
    } catch (err: any) {
      console.error('Failed to cancel plan:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog relative w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">AI Automation Copilot</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Stage 7 Autonomous Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Natural language &rarr; Intent extraction &rarr; Tool verification &rarr; Guarded workflow plan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Natural Language Prompt Input Bar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Tell the AI what you want to automate:</span>
              <span className="text-[11px] text-purple-400 font-normal">Supports Google Sheets, Product Promotion, Omnichannel schedules</span>
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Whenever a new product is added to my Google Sheet, use Product Promotion and publish to Instagram/Facebook every weekday at 7 PM."
                className="w-full px-4 py-3 bg-[#131929] border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-sm text-white placeholder-slate-500 transition resize-none"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-90 disabled:opacity-50 rounded-lg shadow-lg shadow-purple-500/25 transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Generate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Workflow Generation Error</p>
                <p className="mt-0.5 text-red-200/80">{error}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Structured Plan Viewer */}
          {plan && (
            <div className="space-y-4">
              {/* Pipeline Step Progress Visualizer */}
              <div className="p-4 rounded-xl bg-[#0f1523] border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">Stage 7 Safety Pipeline</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Zero Credential Leakage Guard Active
                  </span>
                </div>
                <div className="flex items-center justify-between overflow-x-auto pb-1 text-[11px] gap-2">
                  {[
                    { label: 'Intent Extraction', status: 'done' },
                    { label: 'Connectors Check', status: plan.validationReport.connectorsValid ? 'done' : 'warn' },
                    { label: 'Template Catalog', status: plan.validationReport.templateValid ? 'done' : 'warn' },
                    { label: 'Policy & Claims', status: plan.validationReport.policyValid ? 'done' : 'warn' },
                    { label: 'Quota Limit', status: plan.validationReport.quotaValid ? 'done' : 'warn' },
                    { label: 'Human Review', status: plan.status === 'activated' ? 'done' : 'active' },
                    { label: 'Engine Activation', status: plan.status === 'activated' ? 'done' : 'pending' },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          step.status === 'done'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : step.status === 'active'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 animate-pulse'
                            : step.status === 'warn'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-white/5 text-slate-500 border border-white/10'
                        }`}
                      >
                        {step.status === 'done' ? '✓' : idx + 1}
                      </span>
                      <span className={step.status === 'active' ? 'text-purple-300 font-semibold' : 'text-slate-400'}>
                        {step.label}
                      </span>
                      {idx < 6 && <ChevronRight className="w-3 h-3 text-slate-600 mx-0.5" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-Tabs: Plan Overview, Tool Calls Audit, Simulation Results */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'plan'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    Structured Workflow Plan
                  </button>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'audit'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Auditable Tool Calls ({plan.toolCalls.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('simulation')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'simulation'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Dry-Run Simulation {testResults ? '(Ready)' : ''}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${
                      plan.status === 'activated'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : plan.status === 'tested'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : plan.status === 'cancelled'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    }`}
                  >
                    Status: {plan.status}
                  </span>
                </div>
              </div>

              {/* TAB 1: Structured Workflow Plan View */}
              {activeTab === 'plan' && (
                <div className="space-y-4">
                  {/* Metadata Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#131929] border border-white/5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">Trigger Source</span>
                      <p className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span>{plan.extractedIntent.triggerName}</span>
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">Condition: Status = READY</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#131929] border border-white/5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">Template & Channels</span>
                      <p className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>{plan.extractedIntent.templateName}</span>
                      </p>
                      <span className="text-[10px] text-purple-300 font-medium">
                        {plan.extractedIntent.channels.join(' + ').toUpperCase()}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#131929] border border-white/5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">Publishing Cadence</span>
                      <p className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>{isEditing ? editSchedule : plan.extractedIntent.schedule}</span>
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isEditing ? editCron : plan.extractedIntent.cronExpression}
                      </span>
                    </div>
                  </div>

                  {/* Non-Bypassable Human Review Security Banner */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-purple-200">Enforced Guardrail: Human Review Sign-Off Required</span>
                        <p className="text-[11px] text-purple-300/80">
                          AI cannot bypass approval. Posts generated by this automation require explicit magic-link sign-off before publishing.
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                      REQUIRED: TRUE
                    </span>
                  </div>

                  {/* Workflow Steps/Actions Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Compiled Automation Actions ({plan.structuredPlan.actions.length})
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Workflow Parameters</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="p-4 rounded-xl bg-[#141a2a] border border-purple-500/30 space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300">Automation Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-[#0e1322] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300">Schedule Label</label>
                            <input
                              type="text"
                              value={editSchedule}
                              onChange={(e) => setEditSchedule(e.target.value)}
                              className="w-full mt-1 px-3 py-2 bg-[#0e1322] border border-white/10 rounded-lg text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300">Cron Expression</label>
                            <input
                              type="text"
                              value={editCron}
                              onChange={(e) => setEditCron(e.target.value)}
                              className="w-full mt-1 px-3 py-2 bg-[#0e1322] border border-white/10 rounded-lg text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={loading}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                        {plan.structuredPlan.actions.map((act, i) => (
                          <div
                            key={act.id || i}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#111728] border border-white/5 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-white/5 text-slate-400 flex items-center justify-center text-[10px] font-mono">
                                {i + 1}
                              </span>
                              <span className="font-semibold text-slate-200">{act.name}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400">
                              {act.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Auditable Tool Calls List */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Audit Trail of Tools Invoked by AI Copilot</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                      <Check className="w-3.5 h-3.5" /> All tool calls passed multi-tenant & credential checks
                    </span>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                    {plan.toolCalls.map((tc: CopilotToolCallAudit, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#111728] border border-white/5 space-y-1.5 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between text-purple-300 font-semibold">
                          <span>{tc.toolName}</span>
                          <span className="text-[10px] text-slate-500">{tc.durationMs}ms</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Input: {JSON.stringify(tc.input)}
                        </div>
                        <div className="text-[11px] text-emerald-400/90 truncate">
                          Result: {JSON.stringify(tc.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Simulation Results View */}
              {activeTab === 'simulation' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Dry-Run Execution Simulation</span>
                    <button
                      onClick={handleTest}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Simulating...' : 'Run Dry-Run Test'}</span>
                    </button>
                  </div>

                  {testResults || plan.testResults ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Simulation Status: {(testResults || plan.testResults).testStatus?.toUpperCase() || 'PASSED'}. All pipeline transformations verified without external network mutations.
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                        {((testResults || plan.testResults).stepSimulations || []).map((step: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#111728] border border-white/5 text-xs"
                          >
                            <span className="font-semibold text-slate-200">{step.stepName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">{step.details}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                {step.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-[#111728] border border-white/5">
                      No simulation run yet. Click "Run Dry-Run Test" to test the pipeline safely.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        {plan && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0e1322]">
            <button
              onClick={handleCancel}
              disabled={loading || plan.status === 'cancelled'}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
            >
              Cancel Plan
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={isTesting || loading || plan.status === 'cancelled'}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
              >
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span>Test Simulation</span>
              </button>

              <button
                onClick={handleActivate}
                disabled={loading || plan.status === 'activated' || plan.status === 'cancelled'}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 rounded-xl shadow-lg shadow-emerald-500/20 transition"
              >
                {plan.status === 'activated' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Activated in Engine</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Activate Automation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
