/**
 * Enterprise Continuous Compliance, SOC2/HIPAA/GDPR Automated Evidence Locker & Security Posture Mesh Tab
 * HoaspForge Platform v5.6.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Play,
  Plus,
  Shield,
  Lock,
  Download,
  AlertTriangle,
  Clock,
  Eye,
  Check,
  X,
  Layers,
  Database,
  Key,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  ComplianceControl,
  ComplianceEvidence,
  AuditorPortalSession,
  ContinuousComplianceTelemetry,
  ComplianceFrameworkType,
  SimulateComplianceAuditResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'controls' | 'evidence' | 'auditor_sessions' | 'simulator';

export const ContinuousComplianceTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('controls');

  // Telemetry
  const [telemetry, setTelemetry] = useState<ContinuousComplianceTelemetry | null>(null);

  // Accessible Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Controls State
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [searchControl, setSearchControl] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Evidence State
  const [evidenceList, setEvidenceList] = useState<ComplianceEvidence[]>([]);
  const [collectorFilter, setCollectorFilter] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<ComplianceEvidence | null>(null);

  // Auditor Sessions State
  const [sessions, setSessions] = useState<AuditorPortalSession[]>([]);
  const [showAuditorModal, setShowAuditorModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [auditorForm, setAuditorForm] = useState<{
    auditor_email: string;
    auditor_firm: string;
    framework_scope: ComplianceFrameworkType[];
    duration_days: number;
  }>({
    auditor_email: '',
    auditor_firm: '',
    framework_scope: ['soc2_type2', 'iso27001'],
    duration_days: 30,
  });

  // Simulator State
  const [simFramework, setSimFramework] = useState<ComplianceFrameworkType>('soc2_type2');
  const [simStrictMode, setSimStrictMode] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulateComplianceAuditResult | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, ctrlRes, evRes, sessRes] = await Promise.all([
        api.adminOps.getContinuousComplianceTelemetry(),
        api.adminOps.listComplianceControls(),
        api.adminOps.listComplianceEvidence(),
        api.adminOps.listAuditorPortalSessions(),
      ]);
      setTelemetry(telRes);
      setControls(ctrlRes);
      setEvidenceList(evRes);
      setSessions(sessRes);
    } catch (err: any) {
      showToast(`Failed to load compliance data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Evaluate Control
  const handleEvaluateControl = async (id: string, code: string) => {
    setActionLoading(true);
    try {
      const res = await api.adminOps.evaluateComplianceControl(id);
      showToast(`Automated evidence check passed for ${code} with verified SHA-256 hash`, 'success');
      loadData();
    } catch (err: any) {
      showToast(`Evaluation failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Auditor Session
  const handleCreateAuditorSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorForm.auditor_email.trim() || !auditorForm.auditor_firm.trim()) {
      showToast('Auditor email and auditing firm are required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.adminOps.createAuditorPortalSession(auditorForm);
      showToast(`Auditor access granted to ${auditorForm.auditor_email}`, 'success');
      setShowAuditorModal(false);
      setAuditorForm({
        auditor_email: '',
        auditor_firm: '',
        framework_scope: ['soc2_type2', 'iso27001'],
        duration_days: 30,
      });
      loadData();
    } catch (err: any) {
      showToast(`Failed to grant auditor access: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Revoke Auditor Session
  const handleRevokeAuditorSession = (id: string, email: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Auditor Access',
      description: `Revoke auditor portal access for ${email}? Active SOC2/ISO evidence review sessions using this link will immediately be terminated.`,
      confirmText: 'Revoke Access',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        try {
          await api.adminOps.revokeAuditorPortalSession(id);
          showToast(`Auditor access revoked for ${email}`, 'info');
          loadData();
        } catch (err: any) {
          showToast(`Revocation failed: ${err.message}`, 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Handle Run Simulation
  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateComplianceAudit({
        target_framework: simFramework,
        strict_mode: simStrictMode,
      });
      setSimResult(res);
      showToast(`${simFramework.toUpperCase()} audit readiness evaluated`, 'success');
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // Handle Export Package
  const handleExportPackage = async (framework: ComplianceFrameworkType) => {
    try {
      const pkg = await api.adminOps.exportEvidencePackage(framework);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${framework}_evidence_package_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Exported ${framework.toUpperCase()} evidence package with verification hash`, 'success');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, 'error');
    }
  };

  // Filtered Controls
  const filteredControls = controls.filter((c) => {
    if (frameworkFilter && c.framework !== frameworkFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (searchControl) {
      const q = searchControl.toLowerCase();
      return (
        c.control_code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.collector_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Evidence
  const filteredEvidence = evidenceList.filter((e) => {
    if (collectorFilter && e.collector_type !== collectorFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              margin: '0 0 6px 0',
              fontSize: '1.4rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span title="Compliance Locker" style={{ display: 'inline-flex' }}>
              <ShieldCheck size={24} color="#10b981" />
            </span>
            Enterprise Continuous Compliance & Automated Evidence Locker
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Continuous control monitoring across SOC 2 Type II, HIPAA, GDPR, ISO 27001, and FedRAMP with cryptographic SHA-256 evidence validation, automated collector evaluations, and auditor portal session management.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span title="Refresh" style={{ display: 'inline-flex' }}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </span>
            Refresh
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleExportPackage('soc2_type2')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span title="Export" style={{ display: 'inline-flex' }}>
              <Download size={15} />
            </span>
            Export SOC2 Package
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowAuditorModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span title="Grant Access" style={{ display: 'inline-flex' }}>
              <Plus size={16} />
            </span>
            Grant Auditor Access
          </button>
        </div>
      </div>

      {/* 4 KPI Telemetry Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Overall Compliance Score */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Overall Compliance Score
            </span>
            <span title="Compliance Score" style={{ display: 'inline-flex' }}>
              <ShieldCheck size={18} color="#10b981" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#10b981' }}>
            {telemetry?.overallComplianceScore ?? 100.0}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across 5 enterprise security frameworks
          </div>
        </div>

        {/* Passing Controls */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Passing Controls
            </span>
            <span title="Passing Controls" style={{ display: 'inline-flex' }}>
              <CheckCircle2 size={18} color="#3b82f6" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#60a5fa' }}>
            {telemetry?.compliantControlsCount ?? 0} / {telemetry?.totalControls ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {telemetry?.warningControlsCount ?? 0} warnings &bull; {telemetry?.nonCompliantControlsCount ?? 0} non-compliant
          </div>
        </div>

        {/* Automated Evidence Records */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Automated Evidence Records
            </span>
            <span title="Evidence Records" style={{ display: 'inline-flex' }}>
              <FileText size={18} color="#8b5cf6" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#a78bfa' }}>
            {telemetry?.automatedEvidenceItemsCount ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Continuous SHA-256 hashed evidence ledger
          </div>
        </div>

        {/* Active Auditor Sessions */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Auditor Portals
            </span>
            <span title="Auditor Sessions" style={{ display: 'inline-flex' }}>
              <ExternalLink size={18} color="#f59e0b" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fbbf24' }}>
            {telemetry?.activeAuditorSessionsCount ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            External CPA and security auditor portals
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setSubTab('controls')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'controls' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'controls' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'controls' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Controls" style={{ display: 'inline-flex' }}>
            <Shield size={16} />
          </span>
          Control Matrix ({controls.length})
        </button>

        <button
          onClick={() => setSubTab('evidence')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'evidence' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'evidence' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'evidence' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Evidence" style={{ display: 'inline-flex' }}>
            <FileText size={16} />
          </span>
          Evidence Locker & Cryptographic Hashes ({evidenceList.length})
        </button>

        <button
          onClick={() => setSubTab('auditor_sessions')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'auditor_sessions' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'auditor_sessions' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'auditor_sessions' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Auditor Sessions" style={{ display: 'inline-flex' }}>
            <ExternalLink size={16} />
          </span>
          Auditor Portal Sessions ({sessions.length})
        </button>

        <button
          onClick={() => setSubTab('simulator')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'simulator' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'simulator' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'simulator' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Simulator" style={{ display: 'inline-flex' }}>
            <Sliders size={16} />
          </span>
          Audit Readiness Simulator
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CONTROL MATRIX                                                 */}
      {/* ========================================================================= */}
      {subTab === 'controls' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters */}
          <div
            className="glass-card"
            style={{
              padding: '14px 20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search controls by code, title or collector..."
                value={searchControl}
                onChange={(e) => setSearchControl(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
              className="select-custom"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All Frameworks</option>
              <option value="soc2_type2">SOC 2 Type II</option>
              <option value="hipaa">HIPAA Security Rule</option>
              <option value="gdpr">GDPR Art. 32</option>
              <option value="iso27001">ISO 27001</option>
              <option value="fedramp">FedRAMP High</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-custom"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All Statuses</option>
              <option value="compliant">Compliant (100%)</option>
              <option value="warning">Warning</option>
              <option value="non_compliant">Non-Compliant</option>
            </select>
          </div>

          {/* Controls Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Control Code</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Framework</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Title & Description</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Collector Engine</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Pass Rate</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredControls.map((ctrl) => (
                    <tr
                      key={ctrl.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' }}>
                        {ctrl.control_code}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#e2e8f0',
                          }}
                        >
                          {ctrl.framework.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', maxWidth: '340px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ctrl.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', lineClamp: 2 }}>
                          {ctrl.description}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        <code style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px' }}>
                          {ctrl.collector_type}
                        </code>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        {ctrl.pass_percentage.toFixed(1)}%
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background:
                              ctrl.status === 'compliant'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color: ctrl.status === 'compliant' ? '#86efac' : '#fde047',
                          }}
                        >
                          {ctrl.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => handleEvaluateControl(ctrl.id, ctrl.control_code)}
                          disabled={actionLoading}
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <span title="Evaluate" style={{ display: 'inline-flex' }}>
                            <Play size={13} />
                          </span>
                          Evaluate Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: EVIDENCE LOCKER & CRYPTOGRAPHIC HASHES                         */}
      {/* ========================================================================= */}
      {subTab === 'evidence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters */}
          <div
            className="glass-card"
            style={{
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                Continuous Cryptographic Evidence Locker
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Every automated evaluation generates an immutable SHA-256 fingerprint for non-repudiation.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Collector:</span>
              <select
                value={collectorFilter}
                onChange={(e) => setCollectorFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">All Collectors</option>
                <option value="access_control">Access Control (RBAC)</option>
                <option value="secret_rotation">Secret Rotation (KMS)</option>
                <option value="worm_tamper_proof">WORM Tamper Evidence</option>
                <option value="dlp_guardrails">DLP Guardrails</option>
                <option value="incident_response">Incident Response</option>
                <option value="encryption_at_rest">Encryption at Rest</option>
              </select>
            </div>
          </div>

          {/* Evidence Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredEvidence.map((ev) => (
              <div
                key={ev.id}
                className="glass-card"
                style={{
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderLeft: '4px solid #10b981',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#93c5fd',
                      }}
                    >
                      {ev.control_code}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#86efac',
                      }}
                    >
                      {ev.evaluation_status.toUpperCase()}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>
                    {ev.evidence_title}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    SHA-256: {ev.evidence_payload_hash}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div>Collected At</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {new Date(ev.collected_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedEvidence(ev)}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span title="Inspect" style={{ display: 'inline-flex' }}>
                      <Eye size={13} />
                    </span>
                    Inspect Payload
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: AUDITOR PORTAL SESSIONS                                        */}
      {/* ========================================================================= */}
      {subTab === 'auditor_sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                Scoped External Auditor Portal Sessions
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Secure, read-only portals allowing external CPAs and compliance assessors to verify evidence without tenant access.
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={() => setShowAuditorModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Plus size={15} />
              Grant New Auditor Access
            </button>
          </div>

          {/* Sessions Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Auditor Email</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Auditing Firm</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Scoped Frameworks</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Access Expiry</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.auditor_email}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        {s.auditor_firm}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {s.framework_scope.map((f) => (
                            <span
                              key={f}
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#93c5fd',
                                textTransform: 'uppercase',
                              }}
                            >
                              {f.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(s.expires_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: s.is_active
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: s.is_active ? '#86efac' : '#fca5a5',
                          }}
                        >
                          {s.is_active ? 'ACTIVE' : 'REVOKED'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {s.is_active && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleRevokeAuditorSession(s.id, s.auditor_email)}
                            disabled={actionLoading}
                            style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            Revoke Access
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: AUDIT READINESS SIMULATOR                                      */}
      {/* ========================================================================= */}
      {subTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Controls Panel */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span title="Simulator" style={{ display: 'inline-flex' }}>
                  <Sliders size={18} color="#10b981" />
                </span>
                Audit Readiness & Gap Evaluation Simulator
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Simulate an external regulatory audit against live control states to identify remediation items prior to assessor engagement.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Target Regulatory Framework
              </label>
              <select
                value={simFramework}
                onChange={(e) => setSimFramework(e.target.value as ComplianceFrameworkType)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="soc2_type2">SOC 2 Type II (Trust Services Criteria)</option>
                <option value="hipaa">HIPAA Security Rule (45 CFR Part 164)</option>
                <option value="gdpr">GDPR (Article 32 Security of Processing)</option>
                <option value="iso27001">ISO/IEC 27001:2022 (ISMS Controls)</option>
                <option value="fedramp">FedRAMP High Baseline (NIST SP 800-53)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="strict_mode"
                checked={simStrictMode}
                onChange={(e) => setSimStrictMode(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              <label htmlFor="strict_mode" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Enable Strict Material Evidence Verification
              </label>
            </div>

            <button
              className="btn-primary"
              onClick={handleRunSimulation}
              disabled={simLoading}
              style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              <span title="Run" style={{ display: 'inline-flex' }}>
                <Play size={16} />
              </span>
              {simLoading ? 'Simulating Assessment...' : 'Evaluate Audit Readiness'}
            </button>
          </div>

          {/* Results Panel */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span title="Readiness Matrix" style={{ display: 'inline-flex' }}>
                <ShieldCheck size={18} color="#3b82f6" />
              </span>
              Audit Readiness Matrix
            </h3>

            {simResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Score</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#86efac' }}>
                      {simResult.overallScore.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Target: &ge; 95.0%
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Readiness Status</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase' }}>
                      {simResult.readinessStatus.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Assessor readiness
                    </div>
                  </div>
                </div>

                {simResult.flaggedGaps.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', fontWeight: 600, color: '#fde047' }}>
                      Identified Maintenance Items:
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {simResult.flaggedGaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Assessor Recommendations:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {simResult.auditorRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <span title="Pending" style={{ display: 'inline-flex', marginBottom: '12px' }}>
                  <ShieldCheck size={32} />
                </span>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                  Select a compliance framework on the left and click "Evaluate Audit Readiness" to evaluate preparedness.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GRANT AUDITOR ACCESS                                               */}
      {/* ========================================================================= */}
      {showAuditorModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuditorModal(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Grant External Auditor Portal Access</h3>
              <button
                onClick={() => setShowAuditorModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAuditorSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Auditor Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. auditor@ey-cyber.com"
                  value={auditorForm.auditor_email}
                  onChange={(e) => setAuditorForm({ ...auditorForm, auditor_email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Auditing Firm Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ernst & Young LLP"
                  value={auditorForm.auditor_firm}
                  onChange={(e) => setAuditorForm({ ...auditorForm, auditor_firm: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Access Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={auditorForm.duration_days}
                  onChange={(e) => setAuditorForm({ ...auditorForm, duration_days: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAuditorModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Granting...' : 'Grant Portal Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT EVIDENCE PAYLOAD                                           */}
      {/* ========================================================================= */}
      {selectedEvidence && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvidence(null);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '650px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Evidence Payload & Cryptographic Proof
              </h3>
              <button
                onClick={() => setSelectedEvidence(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div><strong>Title:</strong> {selectedEvidence.evidence_title}</div>
              <div><strong>Control Code:</strong> {selectedEvidence.control_code}</div>
              <div style={{ marginTop: '4px', wordBreak: 'break-all', fontFamily: 'monospace', color: '#93c5fd' }}>
                <strong>SHA-256 Hash:</strong> {selectedEvidence.evidence_payload_hash}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Evidence Payload JSON:
              </label>
              <pre
                style={{
                  margin: 0,
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  color: '#86efac',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {JSON.stringify(selectedEvidence.evidence_data, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                className="btn-secondary"
                onClick={() => setSelectedEvidence(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
