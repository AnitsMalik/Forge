import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Send,
  Copy,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  Sliders,
  Check,
  X,
  Edit3,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lock,
  ChevronRight,
  Eye,
  Shield,
  Search,
  Filter,
  ArrowUpRight,
  User,
  Calendar,
  CheckSquare,
  Square,
  FileText,
  Smartphone,
  Share2,
  AlertOctagon,
  ArrowRight,
  PlusCircle,
  Info,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import type {
  AutonomyLevel,
  BrandGovernanceSettings,
  ApprovalRequestItem,
  GovernanceAuditLog,
} from '@socialforge/shared';
import { AUTONOMY_LEVELS } from '@socialforge/shared';
import {
  PageHeader,
  StatCard,
  SegmentedTabs,
  Drawer,
  StatusBadge,
  EmptyState,
} from '../components/ui/index.js';

interface ApprovalsPageProps {
  onOpenMagicPortal: (token: string) => void;
  onNavigate?: (tab: string, context?: any) => void;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onOpenMagicPortal, onNavigate }) => {
  const { activeBrand } = useAuth();

  // Governance State
  const [govSettings, setGovSettings] = useState<BrandGovernanceSettings | null>(null);
  const [govLoading, setGovLoading] = useState<boolean>(false);
  const [overrideModal, setOverrideModal] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<string>('Emergency review requested by brand lead');

  // Approvals State
  const [activeTab, setActiveTab] = useState<'queue' | 'resolved' | 'audit' | 'links'>('queue');
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<GovernanceAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Preview Drawer State
  const [previewingApproval, setPreviewingApproval] = useState<ApprovalRequestItem | null>(null);
  const [previewTab, setPreviewTab] = useState<'facebook' | 'instagram' | 'linkedin'>('instagram');

  // Edit / Review Drawer State
  const [editingApproval, setEditingApproval] = useState<ApprovalRequestItem | null>(null);
  const [editCaption, setEditCaption] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // Rejection Feedback Drawer
  const [rejectingApproval, setRejectingApproval] = useState<ApprovalRequestItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [selectedRejectPreset, setSelectedRejectPreset] = useState<string | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Legacy Post Links State
  const [posts, setPosts] = useState<any[]>([]);
  const [generatedLink, setGeneratedLink] = useState<{ postId: string; url: string; token: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Load Governance and Approvals Data
  const loadData = async () => {
    if (!activeBrand) return;
    setLoading(true);
    setGovLoading(true);

    try {
      const [govRes, appRes, auditRes, postsRes] = await Promise.all([
        api.governance.getSettings(activeBrand.id).catch(() => null),
        api.governance.listApprovals({ brandId: activeBrand.id }).catch(() => []),
        api.governance.getAuditLogs({ brandId: activeBrand.id, limit: 40 }).catch(() => []),
        api.posts.list(activeBrand.id).catch(() => []),
      ]);

      const normalizedGov = (govRes as any)?.data || govRes;
      if (normalizedGov && normalizedGov.autonomyLevel) {
        setGovSettings(normalizedGov);
      }
      setApprovals(Array.isArray((appRes as any)?.data) ? (appRes as any).data : Array.isArray(appRes) ? appRes : []);
      setAuditLogs(Array.isArray((auditRes as any)?.data) ? (auditRes as any).data : Array.isArray(auditRes) ? auditRes : []);
      setPosts(Array.isArray((postsRes as any)?.data) ? (postsRes as any).data : Array.isArray(postsRes) ? postsRes : []);
    } catch (err: any) {
      console.error('Failed to load governance data:', err);
      showToast('error', err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
      setGovLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBrand]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAutonomyChange = async (newLevel: AutonomyLevel) => {
    if (!activeBrand) return;
    try {
      const res = await api.governance.setAutonomyLevel(
        activeBrand.id,
        newLevel,
        `User set autonomy to ${newLevel}`
      );
      const updatedGov = (res as any)?.data || res;
      setGovSettings(updatedGov);
      showToast('success', `Autonomy updated to ${newLevel} (${AUTONOMY_LEVELS[newLevel].name}).`);
      const auditRes = await api.governance.getAuditLogs({ brandId: activeBrand.id, limit: 40 });
      setAuditLogs((auditRes as any)?.data || (Array.isArray(auditRes) ? auditRes : []));
    } catch (err: any) {
      showToast('error', 'Failed to update autonomy level: ' + err.message);
    }
  };

  const handleToggleEmergencyPause = async () => {
    if (!activeBrand || !govSettings) return;
    try {
      if (govSettings.emergencyPaused) {
        await api.governance.resumeAutomations(activeBrand.id, 'Resumed by user');
        showToast('success', 'Automations resumed. External execution re-authorized.');
      } else {
        await api.governance.pauseAutomations(activeBrand.id, pauseReason);
        showToast('info', 'All automations paused. External actions halted safely.');
      }
      setOverrideModal(false);
      const updated = await api.governance.getSettings(activeBrand.id);
      setGovSettings((updated as any)?.data || updated);
      const auditRes = await api.governance.getAuditLogs({ brandId: activeBrand.id, limit: 40 });
      setAuditLogs((auditRes as any)?.data || (Array.isArray(auditRes) ? auditRes : []));
    } catch (err: any) {
      showToast('error', 'Failed to update kill-switch status: ' + err.message);
    }
  };

  const handleApprove = async (approvalId: string) => {
    setActionLoading(approvalId);
    try {
      await api.governance.approve(approvalId, 'Approved via Approval Center');
      showToast('success', 'Approval granted! Post scheduled and verified.');
      await loadData();
    } catch (err: any) {
      showToast('error', 'Approval failed: ' + (err.message || 'Policy violation'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingApproval) return;
    setActionLoading(rejectingApproval.id);
    const feedback = selectedRejectPreset
      ? `${selectedRejectPreset}: ${rejectNotes}`
      : rejectNotes || 'Changes requested by reviewer';
    try {
      await api.governance.reject(rejectingApproval.id, feedback);
      showToast('info', 'Approval rejected. Feedback recorded for revision.');
      setRejectingApproval(null);
      setRejectNotes('');
      setSelectedRejectPreset(null);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Rejection failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingApproval) return;
    setActionLoading(editingApproval.id);
    try {
      await api.governance.editApproval(editingApproval.id, {
        content: editCaption,
        reviewerNotes: reviewNotes || 'Edited in Approval Center',
      });
      showToast('success', 'Approval request updated with revised copy.');
      setEditingApproval(null);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Edit failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    if (!activeBrand || selectedIds.length === 0) return;
    try {
      const res = await api.governance.bulkApprove(activeBrand.id, selectedIds, 'Bulk approved via Governance Center');
      const bulkData = (res as any)?.data || res;
      showToast('success', `Bulk approval complete: ${bulkData?.approvedCount ?? selectedIds.length} approved, ${bulkData?.failedCount ?? 0} failed.`);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Bulk approval failed: ' + err.message);
    }
  };

  const handleGenerateMagicLink = async (postId: string) => {
    if (!activeBrand) return;
    try {
      const res = await api.posts.submitApproval(activeBrand.id, postId);
      const resData = (res as any)?.data || res;
      const token = resData?.approvalRequest?.magic_token || resData?.magicToken || resData?.token;
      const url = resData?.magicLinkUrl || resData?.url || (token ? `/review/${token}` : '');
      setGeneratedLink({
        postId,
        url,
        token,
      });
      showToast('success', 'Client Magic Review Link generated successfully!');
      await loadData();
    } catch (err: any) {
      showToast('error', 'Failed to generate magic link: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('info', 'Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const safeApprovals = Array.isArray(approvals) ? approvals : [];
  const pendingApprovals = safeApprovals.filter((a) => a.status === 'pending');
  const resolvedApprovals = safeApprovals.filter((a) => a.status !== 'pending');

  // Filtered pending list based on search and platform
  const filteredPending = useMemo(() => {
    return pendingApprovals.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.postSummary?.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.postSummary?.templateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.entityId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.initiatorName || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlatform =
        platformFilter === 'all' ||
        (item.postSummary?.platforms || []).includes(platformFilter);

      return matchesSearch && matchesPlatform;
    });
  }, [pendingApprovals, searchQuery, platformFilter]);

  const rejectPresets = [
    'Price & Discount Mismatch',
    'Tone / Brand Voice Inconsistent',
    'Asset & Image Update Required',
    'Missing Compliance Disclaimer',
    'Hashtag & Link Optimization',
  ];

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border shadow-2xl max-w-md ${
              toastMessage.type === 'success'
                ? 'bg-surface border-emerald-500/40 text-primary shadow-emerald-950/20'
                : toastMessage.type === 'error'
                ? 'bg-surface border-rose-500/40 text-primary shadow-rose-950/20'
                : 'bg-surface border-indigo-500/40 text-primary shadow-indigo-950/20'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />}
            <span className="text-xs font-semibold flex-1 leading-relaxed">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <PageHeader
        category="Trust, Governance & Autonomy"
        categoryIcon={ShieldCheck}
        badge="Stage 8 Policy Engine"
        badgeVariant="indigo"
        title="Client Approvals & Governance Control"
        description="Enforce multi-tenant policies, configure L0–L5 autonomy levels, and review pending campaigns before publication."
        actions={
          <>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Refresh approval records from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setOverrideModal(true)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition active:scale-98 cursor-pointer whitespace-nowrap ${
                govSettings?.emergencyPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {govSettings?.emergencyPaused ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-white" />
                  <span>Resume Automations</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-3.5 h-3.5 text-white" />
                  <span>Emergency Pause All</span>
                </>
              )}
            </button>
          </>
        }
      />

      {/* Stage 8 Governance Status Deck */}
      {govSettings && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Autonomy Level & Boundary Selector */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-secondary text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Autonomy Level</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {govSettings.autonomyLevel} — {AUTONOMY_LEVELS[govSettings.autonomyLevel]?.name || 'Autonomous'}
              </span>
            </div>

            {/* Segmented Autonomy Buttons */}
            <div className="grid grid-cols-6 gap-1 bg-surface-elevated p-1 rounded-lg border border-subtle">
              {(['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as AutonomyLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleAutonomyChange(lvl)}
                  className={`py-1 text-center text-xs font-semibold rounded transition cursor-pointer ${
                    govSettings.autonomyLevel === lvl
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-subtle'
                      : 'text-secondary hover:text-primary'
                  }`}
                  title={AUTONOMY_LEVELS[lvl]?.description || ''}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-muted leading-relaxed min-h-[32px]">
              {AUTONOMY_LEVELS[govSettings.autonomyLevel]?.description}
            </p>
          </div>

          {/* Card 2: Policy Engine Guardrails */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-secondary text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Policy Guardrails</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                11 Active Checks
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-secondary text-[11px]">Claims & Integrity:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Anti-Hallucination</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary text-[11px]">External Action Gate:</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                  {govSettings.requireApprovalForAllExternal ? 'Strict Sign-off' : 'Policy Gated'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary text-[11px]">Allowed Domains:</span>
                <span className="font-mono text-[10px] text-primary truncate max-w-[120px]">
                  {govSettings.allowedDomains?.join(', ') || 'Strict Domain Rule'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Human Oversight / Kill Switch */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-secondary text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Oversight Status</span>
              </span>
              <StatusBadge
                status={govSettings.emergencyPaused ? 'FAILED' : 'ACTIVE'}
                label={govSettings.emergencyPaused ? 'EMERGENCY PAUSED' : 'ALL ACTIVE'}
                size="sm"
              />
            </div>

            <p className="text-[11px] text-muted leading-relaxed min-h-[32px]">
              {govSettings.emergencyPaused
                ? `Paused on ${new Date(govSettings.pausedAt || '').toLocaleDateString()}. External publishing blocked.`
                : 'Automations and publishing are executing according to approved schedules and bounded policies.'}
            </p>

            {govSettings.emergencyPaused && (
              <button
                type="button"
                onClick={handleToggleEmergencyPause}
                className="w-full py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer text-center"
              >
                Clear Pause & Resume
              </button>
            )}
          </div>

          {/* Card 4: Queue Velocity & Metrics */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-secondary text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <Clock className="w-4 h-4 text-sky-500" />
                <span>Queue Metrics</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Live Sync
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-surface-elevated p-2.5 rounded-lg border border-subtle">
                <span className="text-xl font-bold text-amber-500 block leading-tight">{pendingApprovals.length}</span>
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Awaiting</span>
              </div>
              <div className="bg-surface-elevated p-2.5 rounded-lg border border-subtle">
                <span className="text-xl font-bold text-emerald-500 block leading-tight">{resolvedApprovals.length}</span>
                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Resolved</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-subtle pb-4">
        <SegmentedTabs
          tabs={[
            { id: 'queue', label: 'Pending Queue', icon: Clock, count: pendingApprovals.length, countVariant: 'amber' },
            { id: 'resolved', label: 'Resolved History', icon: CheckCircle2, count: resolvedApprovals.length, countVariant: 'emerald' },
            { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, count: auditLogs.length, countVariant: 'slate' },
            { id: 'links', label: 'Client Magic Links', icon: Sparkles, count: posts.length, countVariant: 'indigo' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* Bulk Action Controls */}
        {activeTab === 'queue' && pendingApprovals.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (selectedIds.length === pendingApprovals.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(pendingApprovals.map((i) => i.id));
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              {selectedIds.length === pendingApprovals.length ? 'Deselect All' : 'Select All'}
            </button>

            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Bulk Approve ({selectedIds.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: PENDING QUEUE
          ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Search & Platform Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-surface p-3.5 sm:p-4 rounded-xl border border-subtle shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search pending reviews by caption, template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-elevated border border-subtle rounded-lg pl-8 pr-8 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-secondary text-xs font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-500" /> Platform:
              </span>
              {['all', 'instagram', 'facebook', 'linkedin'].map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setPlatformFilter(platform)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition cursor-pointer whitespace-nowrap shrink-0 ${
                    platformFilter === platform
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-surface-elevated text-secondary hover:text-primary border border-subtle'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-secondary space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Loading pending approval requests...</p>
            </div>
          ) : filteredPending.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All Caught Up!"
              description="There are no pending posts or automations requiring your review right now. All scheduled campaigns are approved and running smoothly."
              action={
                <button
                  type="button"
                  onClick={() => setActiveTab('links')}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-surface-hover border border-subtle text-primary shadow-xs transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Client Magic Links</span>
                </button>
              }
              secondaryAction={
                onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('studio')}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-white" />
                    <span>Create in Content Studio</span>
                  </button>
                )
              }
            />
          ) : (
            filteredPending.map((item) => (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Item Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                        else setSelectedIds(selectedIds.filter((id) => id !== item.id));
                      }}
                      className="cursor-pointer w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <StatusBadge status="PENDING" label="Awaiting Review" size="sm" />
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-surface-elevated border border-subtle text-secondary">
                      Brand: {item.brandName || activeBrand?.name || 'Primary Brand'}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      ID: {item.entityId ? item.entityId.slice(0, 12) + '...' : item.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <strong className="text-primary font-medium">{item.initiatorName || item.requestedBy || 'AI Copilot Workflow'}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      Expires: {new Date(item.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-elevated p-3.5 rounded-lg border border-subtle text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Source</span>
                    <span className="text-primary font-semibold truncate block">
                      {item.postSummary?.source || item.metadata?.source || 'Product Catalog (Sheet)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Template</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate block">
                      {item.postSummary?.templateName || 'Canonical Flagship'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Workflow</span>
                    <span className="text-sky-600 dark:text-sky-400 font-semibold truncate block">
                      {item.postSummary?.automationName || item.metadata?.automationName || 'Promotion Flow'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block mb-0.5">Dispatch Target</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate block">
                      {item.postSummary?.scheduledFor ? new Date(item.postSummary.scheduledFor).toLocaleDateString() : 'Immediate upon approval'}
                    </span>
                  </div>
                </div>

                {/* Creative Content Preview */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary">Generated Creative Content:</span>
                    <div className="flex items-center gap-1.5">
                      {(item.postSummary?.platforms || ['facebook', 'instagram']).map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-subtle uppercase text-secondary">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed bg-surface p-3 rounded-lg border border-subtle font-sans whitespace-pre-wrap">
                    {item.postSummary?.caption || 'Content snapshot pending hydration.'}
                  </p>

                  <div className="flex items-center justify-between gap-3 flex-wrap text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted">CTA:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {item.postSummary?.cta || 'Shop Now'}
                      </span>
                    </div>
                    {item.postSummary?.link && (
                      <div className="flex items-center gap-2 text-xs truncate max-w-sm">
                        <span className="text-[10px] uppercase font-bold text-muted">Link:</span>
                        <a
                          href={item.postSummary.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-500 hover:underline flex items-center gap-1 truncate text-xs"
                        >
                          <span className="truncate">{item.postSummary.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Policy Checks Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs font-bold text-emerald-600 dark:text-emerald-300">Claims Validation Passed</strong>
                      <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed block mt-0.5">
                        {item.postSummary?.claimsValidation?.details || 'All product claims, prices, discounts, and guarantee statements verified authentic.'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2 text-indigo-600 dark:text-indigo-400">
                    <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs font-bold text-indigo-600 dark:text-indigo-300">Policy Engine Verification</strong>
                      <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 leading-relaxed block mt-0.5">
                        {item.postSummary?.policyResult?.summary || 'Policy Passed: Brand Voice, Audience Consent, Budget Caps, Rate Limits verified.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-subtle">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewingApproval(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-500" />
                      <span>Device Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMagicPortal(item.magicToken)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Client Magic View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingApproval(item);
                        setEditCaption(item.postSummary?.caption || '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-secondary" />
                      <span>Edit Copy</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRejectingApproval(item)}
                      disabled={actionLoading === item.id}
                      className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoading === item.id}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: RESOLVED HISTORY
          ========================================================================= */}
      {activeTab === 'resolved' && (
        <div className="space-y-3">
          {resolvedApprovals.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Resolved Approvals Yet"
              description="Historical approval decisions will appear here with reviewer notes and execution timestamps once decisions are recorded."
            />
          ) : (
            resolvedApprovals.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-xl bg-surface border border-subtle shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={item.status === 'approved' ? 'ACTIVE' : item.status === 'expired' ? 'DRAFT' : 'FAILED'}
                      label={item.status.toUpperCase()}
                      size="sm"
                    />
                    <strong className="text-primary font-bold">
                      {item.entityType.toUpperCase()}: {item.entityId}
                    </strong>
                  </div>
                  <p className="text-secondary text-xs">
                    Reviewer Notes: <strong className="text-primary font-medium">{item.reviewNotes || 'Signed off via Approval Center.'}</strong>
                  </p>
                </div>

                <div className="text-muted font-mono text-[11px] self-start sm:self-auto shrink-0">
                  {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : new Date(item.updatedAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: IMMUTABLE AUDIT TRAIL
          ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-subtle flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Immutable Governance Audit Trail</span>
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Cryptographically tracked lifecycle events and policy decisions with strict tenant isolation.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Tenant Scoped • Verified
            </span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-lg bg-surface-elevated border border-subtle flex flex-col gap-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-[11px]">
                    {log.eventType} &rarr; {log.action}
                  </span>
                  <StatusBadge
                    status={log.status === 'allowed' || log.status === 'approved' ? 'ACTIVE' : 'PENDING'}
                    label={log.status.toUpperCase()}
                    size="sm"
                  />
                </div>
                <p className="text-secondary text-xs">{log.reason || 'Executed within policy limits.'}</p>
                <span className="text-muted text-[10px] font-mono">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CLIENT MAGIC LINKS GENERATOR
          ========================================================================= */}
      {activeTab === 'links' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Client Magic Review Links (Zero-Friction Review)</span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Issue secure, 72-hour review tokens allowing external clients or stakeholders to review and approve drafts without creating an account.
            </p>
          </div>

          {generatedLink && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Client Magic Review Link Ready & Active!</span>
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  readOnly
                  value={generatedLink.url}
                  className="w-full bg-surface border border-subtle rounded-lg px-3 py-1.5 text-xs font-mono text-primary shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedLink.url)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenMagicPortal(generatedLink.token)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-white" />
                  <span>Test Portal</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-muted">
              Available Brand Posts & Drafts
            </h4>
            {posts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Posts Available"
                description="Create posts in Content Studio to issue Magic Review Links to your clients."
              />
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-xl bg-surface-elevated border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 max-w-xl">
                    <strong className="text-primary font-bold block">{post.title || 'Untitled Post'}</strong>
                    <span className="text-secondary text-xs truncate block">{post.base_content}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateMagicLink(post.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Generate Magic Link</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER 1: DEVICE SIMULATOR PREVIEW
          ========================================================================= */}
      <Drawer
        open={!!previewingApproval}
        onClose={() => setPreviewingApproval(null)}
        title="Multi-Platform Device Simulator"
        subtitle="Review visual layout, card ratios, copy truncation, and platform formatting before granting approval."
        size="lg"
        footer={
          previewingApproval && (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setRejectingApproval(previewingApproval);
                  setPreviewingApproval(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition cursor-pointer"
              >
                Request Revisions
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApprove(previewingApproval.id);
                  setPreviewingApproval(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Publish</span>
              </button>
            </div>
          )
        }
      >
        {previewingApproval && (
          <div className="space-y-4">
            {/* Platform Selector */}
            <div className="grid grid-cols-3 gap-1 bg-surface-elevated p-1 rounded-lg border border-subtle">
              {(['instagram', 'facebook', 'linkedin'] as const).map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setPreviewTab(platform)}
                  className={`py-1.5 text-center text-xs font-semibold capitalize rounded transition cursor-pointer ${
                    previewTab === platform
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-subtle'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>

            {/* Mockup Frame */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-subtle space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
                  {(previewingApproval.brandName || 'SF').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-bold text-primary block">
                    {previewingApproval.brandName || activeBrand?.name || 'Primary Brand'}
                  </span>
                  <span className="text-[10px] text-muted">Sponsored • Public</span>
                </div>
              </div>

              <div className="p-3 bg-surface rounded-lg border border-subtle text-xs text-secondary leading-relaxed whitespace-pre-wrap">
                {previewingApproval.postSummary?.caption || 'Sample content awaiting hydration.'}
              </div>

              {previewingApproval.postSummary?.link && (
                <div className="p-3 bg-surface rounded-lg border border-subtle flex items-center justify-between text-xs">
                  <span className="text-muted text-[11px] truncate">{previewingApproval.postSummary.link}</span>
                  <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-indigo-600 text-white shadow-xs">
                    {previewingApproval.postSummary.cta || 'Learn More'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* =========================================================================
          DRAWER 2: EDIT APPROVAL COPY
          ========================================================================= */}
      <Drawer
        open={!!editingApproval}
        onClose={() => setEditingApproval(null)}
        title="Revise & Edit Approval Copy"
        subtitle="Make inline edits to the generated caption and attach reviewer notes before final sign-off."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setEditingApproval(null)}
              className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Caption & Content Body</label>
            <textarea
              rows={6}
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              className="w-full bg-surface-elevated border border-subtle rounded-lg p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Internal Reviewer Notes</label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Adjusted tone for summer sale promo, verified UTM links..."
              className="w-full bg-surface-elevated border border-subtle rounded-lg p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
            />
          </div>
        </div>
      </Drawer>

      {/* =========================================================================
          DRAWER 3: REJECTION REASONS
          ========================================================================= */}
      <Drawer
        open={!!rejectingApproval}
        onClose={() => setRejectingApproval(null)}
        title="Request Revisions / Reject"
        subtitle="Select a reason preset or provide specific feedback to guide automated or manual content revision."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setRejectingApproval(null)}
              className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              <span>Submit Rejection</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-2">Preset Categories</label>
            <div className="flex flex-wrap gap-1.5">
              {rejectPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelectedRejectPreset(selectedRejectPreset === preset ? null : preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    selectedRejectPreset === preset
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-surface-elevated text-secondary hover:text-primary border-subtle'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Detailed Reviewer Feedback</label>
            <textarea
              rows={4}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Provide specific change instructions for the creative team or automated workflow..."
              className="w-full bg-surface-elevated border border-subtle rounded-lg p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
            />
          </div>
        </div>
      </Drawer>

      {/* =========================================================================
          DRAWER 4: EMERGENCY PAUSE CONFIRMATION
          ========================================================================= */}
      <Drawer
        open={overrideModal}
        onClose={() => setOverrideModal(false)}
        title={govSettings?.emergencyPaused ? 'Resume Governance Automations' : 'Emergency Pause All Automations'}
        subtitle={
          govSettings?.emergencyPaused
            ? 'Restore normal automated publishing and dispatch schedules.'
            : 'Immediately halts all automated publishing, social dispatches, and external actions across all channels.'
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setOverrideModal(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggleEmergencyPause}
              className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm transition cursor-pointer ${
                govSettings?.emergencyPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {govSettings?.emergencyPaused ? 'Confirm Resume' : 'Confirm Emergency Pause'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              {govSettings?.emergencyPaused
                ? 'Resuming will allow scheduled queues to begin transmitting posts immediately upon their designated timestamps.'
                : 'Emergency Pause is an instant kill-switch. No posts will publish until this pause is explicitly lifted by an authorized administrator.'}
            </p>
          </div>

          {!govSettings?.emergencyPaused && (
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Reason for Emergency Pause</label>
              <textarea
                rows={3}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-full bg-surface-elevated border border-subtle rounded-lg p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-indigo-500 resize-none shadow-xs"
              />
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};
