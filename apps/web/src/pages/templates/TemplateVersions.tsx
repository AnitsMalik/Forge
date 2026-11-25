import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  RotateCcw,
  Lock,
  RefreshCw,
  AlertCircle,
  FileCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

export const TemplateVersions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId') || 'tpl-product-flagship';

  const [versions, setVersions] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rollingBackVer, setRollingBackVer] = useState<number | null>(null);
  const [rollbackConfirmVer, setRollbackConfirmVer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch template details
      const tplRes = await api.templates.get(templateId);
      setTemplate(tplRes?.data || tplRes);

      // Fetch version records
      const verRes = await api.templates.listVersions(templateId);
      const list = verRes?.versions || [];
      setVersions(list);
    } catch (err: any) {
      console.error('Failed to load template versions:', err);
      setError(err.message || 'Unable to retrieve version records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [templateId]);

  const handleRollback = (versionNumber: number) => {
    setRollbackConfirmVer(versionNumber);
  };

  const executeRollback = async () => {
    if (!rollbackConfirmVer) return;
    const versionNumber = rollbackConfirmVer;
    setRollbackConfirmVer(null);
    setRollingBackVer(versionNumber);
    try {
      await api.templates.rollbackVersion(templateId, versionNumber);
      await fetchVersions();
    } catch (err: any) {
      setError(`Rollback failed: ${err.message}`);
    } finally {
      setRollingBackVer(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] font-sans antialiased p-6 md:p-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Templates</span>
          </button>
          <div className="h-4 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Templates</span>
            <span>/</span>
            <span className="text-purple-400 font-semibold">{template?.name || templateId}</span>
            <span>/</span>
            <span className="text-slate-300">Version Audit Trail</span>
          </div>
        </div>

        <button
          onClick={fetchVersions}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Immutable Version History & Rollback</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {template?.name || 'Template'} Versions
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            HoaspForge guarantees complete version immutability. Once a template version is used in a live campaign or automation,
            it is permanently locked to preserve historic publishing provenance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center gap-2">
            <span className="text-slate-400">Current Active:</span>
            <span className="font-mono font-bold text-purple-400">
              v{template?.activeVersion || (versions[0]?.versionNumber ?? 1)}
            </span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Version List Card */}
      <div className="bg-[#0d111b]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        {loading && (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
            Loading immutable version snapshots...
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No version history records found.</p>
            <p className="text-xs text-slate-500">Initial version snapshot is created on first save or usage.</p>
          </div>
        )}

        {!loading && versions.length > 0 && (
          <div className="divide-y divide-white/5">
            {versions.map((v) => {
              const isActive = (template?.activeVersion || versions[0]?.versionNumber) === v.versionNumber;
              const isLocked = v.isLocked || (v.usageCount > 0);

              return (
                <div
                  key={v.id || v.versionNumber}
                  className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-6 first:pt-0 last:pb-0"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                        Version {v.versionNumber}.0
                      </span>

                      {isActive && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Version</span>
                        </span>
                      )}

                      {isLocked ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked (Used {v.usageCount || 1}x)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Draft / Unlocked
                        </span>
                      )}

                      <span className="text-xs text-slate-500">
                        {new Date(v.createdAt).toLocaleDateString()} at{' '}
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 font-medium">
                      {v.changelog || `Version ${v.versionNumber} snapshot`}
                    </p>

                    {/* Metadata & Layers count */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5 text-purple-400" />
                        <span>{Array.isArray(v.layers) ? v.layers.length : 0} Visual Layers</span>
                      </span>

                      {Array.isArray(v.requiredFields) && v.requiredFields.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span>Required:</span>
                          <span className="font-mono text-purple-300">
                            {v.requiredFields.join(', ')}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    {!isActive && (
                      <button
                        onClick={() => handleRollback(v.versionNumber)}
                        disabled={rollingBackVer === v.versionNumber}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-200 hover:text-white transition"
                        title="Rollback active template state to this version snapshot"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${
                            rollingBackVer === v.versionNumber ? 'animate-spin text-purple-400' : ''
                          }`}
                        />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rollback Confirmation Modal */}
      {rollbackConfirmVer !== null && createPortal(
        <div className="modal-backdrop" onClick={() => setRollbackConfirmVer(null)}>
          <div className="modal-dialog max-w-md w-full p-6 space-y-4 border border-purple-500/30 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-purple-400">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Rollback to Version {rollbackConfirmVer}</h3>
                <p className="text-xs text-slate-400">Audit Version Snapshot</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to rollback to <strong className="text-white">Version {rollbackConfirmVer}</strong>? This will branch a new audit version while preserving full version history.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRollbackConfirmVer(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRollback}
                className="btn btn-primary btn-sm"
              >
                Yes, Rollback Version
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TemplateVersions;
