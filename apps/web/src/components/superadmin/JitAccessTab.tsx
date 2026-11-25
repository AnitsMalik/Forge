/**
 * Enterprise Zero-Trust Ephemeral Access Grants, Just-In-Time (JIT) Privilege Elevation & Dual-Authorization Control Plane Tab
 * HoaspForge Platform v6.1.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  UserCheck,
  FileText,
  Sliders,
  X,
  Radio,
  FileKey,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  JitAccessRequest,
  EphemeralCredentialLease,
  DualAuthorizationRule,
  JitAuditSession,
  JitTelemetry,
  JitElevationTier,
  SimulateBreakGlassResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'pending' | 'leases' | 'rules' | 'breakglass';

export const JitAccessTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('pending');

  // Telemetry
  const [telemetry, setTelemetry] = useState<JitTelemetry | null>(null);

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

  // Requests
  const [requests, setRequests] = useState<JitAccessRequest[]>([]);
  const [filterRequestStatus, setFilterRequestStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTargetRole, setNewTargetRole] = useState('superadmin');
  const [newElevationTier, setNewElevationTier] = useState<JitElevationTier>('elevated_admin');
  const [newJustification, setNewJustification] = useState('Urgent compliance investigation and audit remediation');
  const [newDuration, setNewDuration] = useState(60);

  // Decision Modal
  const [decidingRequest, setDecidingRequest] = useState<JitAccessRequest | null>(null);
  const [decisionApproved, setDecisionApproved] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState('Authorized by secondary lead administrator');

  // Leases
  const [leases, setLeases] = useState<EphemeralCredentialLease[]>([]);
  const [filterLeaseStatus, setFilterLeaseStatus] = useState<string>('all');

  // Rules
  const [rules, setRules] = useState<DualAuthorizationRule[]>([]);

  // Audit Sessions & Break-Glass Simulator
  const [auditSessions, setAuditSessions] = useState<JitAuditSession[]>([]);
  const [bgJustification, setBgJustification] = useState('Catastrophic database outage requiring immediate root lease elevation');
  const [bgDuration, setBgDuration] = useState(30);
  const [bgSimulating, setBgSimulating] = useState(false);
  const [bgResult, setBgResult] = useState<SimulateBreakGlassResult | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, reqRes, leaseRes, rulesRes, auditRes] = await Promise.all([
        api.adminOps.getJitTelemetry(),
        api.adminOps.listJitRequests(filterRequestStatus === 'all' ? undefined : filterRequestStatus),
        api.adminOps.listEphemeralLeases(filterLeaseStatus === 'all' ? undefined : filterLeaseStatus),
        api.adminOps.listDualAuthorizationRules(),
        api.adminOps.listJitAuditSessions(30),
      ]);
      setTelemetry(telRes);
      setRequests(reqRes);
      setLeases(leaseRes);
      setRules(rulesRes);
      setAuditSessions(auditRes);
    } catch (err: any) {
      showToast(`Failed to load JIT access data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterRequestStatus, filterLeaseStatus, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Request Creation
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createJitRequest({
        target_role: newTargetRole,
        elevation_tier: newElevationTier,
        justification: newJustification,
        requested_duration_minutes: Number(newDuration),
      });
      showToast('JIT Privilege Elevation Request submitted for dual-authorization', 'success');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      showToast(`Failed to submit request: ${err.message}`, 'error');
    }
  };

  // Handle Approve/Reject Decision
  const handleDecideRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingRequest) return;
    try {
      const res = await api.adminOps.approveJitRequest(decidingRequest.id, {
        approved: decisionApproved,
        decision_notes: decisionNotes,
      });
      showToast(
        decisionApproved
          ? `Request approved! Ephemeral credential lease issued.`
          : `Request rejected.`,
        'success'
      );
      setDecidingRequest(null);
      loadData();
    } catch (err: any) {
      showToast(`Dual-authorization failed: ${err.message}`, 'error');
    }
  };

  // Handle Revoke Lease
  const handleRevokeLease = (leaseId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Ephemeral Credential Lease',
      description: 'Are you sure you want to immediately revoke this ephemeral credential lease? Active elevated access tokens will be invalidated immediately.',
      confirmText: 'Revoke Lease',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.revokeEphemeralLease(leaseId, 'Manual on-demand revocation by security administrator');
          showToast('Ephemeral credential lease revoked immediately', 'success');
          loadData();
        } catch (err: any) {
          showToast(`Failed to revoke lease: ${err.message}`, 'error');
        }
      },
    });
  };

  // Handle Break-Glass Simulation
  const handleSimulateBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    setBgSimulating(true);
    try {
      const res = await api.adminOps.simulateBreakGlassElevation({
        justification: bgJustification,
        duration_minutes: Number(bgDuration),
      });
      setBgResult(res);
      showToast('Break-glass emergency elevation triggered and logged!', 'info');
      loadData();
    } catch (err: any) {
      showToast(`Break-glass simulation failed: ${err.message}`, 'error');
    } finally {
      setBgSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
            <span style={{ display: 'inline-flex', color: '#06b6d4' }}>
              <ShieldCheck size={26} />
            </span>
            Zero-Trust Ephemeral Access Grants & Dual-Authorization Control Plane
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Just-In-Time (JIT) Privilege Elevation, Multi-Party Dual Authorization, Short-Lived Credential Leases & Break-Glass Cryptographic Audits
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </span>
            Refresh State
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0e7490',
              color: '#f8fafc',
              border: '1px solid #06b6d4',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <Key size={14} />
            </span>
            + Request JIT Elevation
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Active Ephemeral Leases */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Ephemeral Leases
            </span>
            <span style={{ display: 'inline-flex', color: '#06b6d4' }}>
              <FileKey size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.active_leases ?? '--'} Leases
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>Cryptographically Signed</span>
            <span>• Time-bounded TTL</span>
          </div>
        </div>

        {/* KPI 2: Pending Dual-Auth Approvals */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Approvals
            </span>
            <span style={{ display: 'inline-flex', color: '#f59e0b' }}>
              <UserCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.pending_requests ?? '--'} Requests
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: (telemetry?.pending_requests ?? 0) > 0 ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>
              {(telemetry?.pending_requests ?? 0) > 0 ? 'Action Required' : 'Inbox Clear'}
            </span>
            <span>• 2-Operator Rule Enforced</span>
          </div>
        </div>

        {/* KPI 3: 24h Elevations */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              24h Total Elevations
            </span>
            <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
              <Clock size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.total_elevations_24h ?? '--'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: (telemetry?.break_glass_events_24h ?? 0) > 0 ? '#ef4444' : '#34d399', fontWeight: 600 }}>
              {telemetry?.break_glass_events_24h ?? 0} Break-Glass
            </span>
            <span>• Emergency events</span>
          </div>
        </div>

        {/* KPI 4: Zero-Trust Posture */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Zero-Trust Posture
            </span>
            <span style={{ display: 'inline-flex', color: telemetry?.compliance_posture === 'strict_zero_trust' ? '#34d399' : '#f59e0b' }}>
              <ShieldAlert size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem', textTransform: 'capitalize' }}>
            {telemetry?.compliance_posture.replace('_', ' ') ?? 'Strict'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>No Standing Privileges</span>
            <span>• Ephemeral Leases</span>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', gap: '1rem' }}>
        <button
          onClick={() => setSubTab('pending')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'pending' ? '2px solid #06b6d4' : '2px solid transparent',
            color: subTab === 'pending' ? '#06b6d4' : '#94a3b8',
            padding: '0.75rem 0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span style={{ display: 'inline-flex' }}>
            <UserCheck size={16} />
          </span>
          Pending Requests & Dual-Auth Inbox ({requests.filter((r) => r.status === 'pending_approval').length})
        </button>
        <button
          onClick={() => setSubTab('leases')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'leases' ? '2px solid #06b6d4' : '2px solid transparent',
            color: subTab === 'leases' ? '#06b6d4' : '#94a3b8',
            padding: '0.75rem 0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span style={{ display: 'inline-flex' }}>
            <FileKey size={16} />
          </span>
          Active Ephemeral Leases ({leases.filter((l) => l.status === 'active').length})
        </button>
        <button
          onClick={() => setSubTab('rules')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'rules' ? '2px solid #06b6d4' : '2px solid transparent',
            color: subTab === 'rules' ? '#06b6d4' : '#94a3b8',
            padding: '0.75rem 0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span style={{ display: 'inline-flex' }}>
            <Sliders size={16} />
          </span>
          Dual-Authorization Policies ({rules.length})
        </button>
        <button
          onClick={() => setSubTab('breakglass')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'breakglass' ? '2px solid #06b6d4' : '2px solid transparent',
            color: subTab === 'breakglass' ? '#06b6d4' : '#94a3b8',
            padding: '0.75rem 0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span style={{ display: 'inline-flex' }}>
            <ShieldAlert size={16} />
          </span>
          Break-Glass Emergency & Forensics
        </button>
      </div>

      {/* SUBTAB 1: Pending Requests & Dual-Auth Inbox */}
      {subTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filter Status:</span>
              <select
                value={filterRequestStatus}
                onChange={(e) => setFilterRequestStatus(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="rejected">Rejected</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Showing {requests.length} requests
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Request ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Requester</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role / Tier</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Justification</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Approver</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No JIT access requests found. Click "+ Request JIT Elevation" to submit one.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                        {r.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 500 }}>
                        {r.requester_email}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 600 }}>{r.target_role}</div>
                        <div style={{ fontSize: '0.75rem', color: '#06b6d4', textTransform: 'capitalize' }}>
                          {r.elevation_tier.replace('_', ' ')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', maxWidth: '240px', wordBreak: 'break-word' }}>
                        {r.justification}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#f8fafc' }}>
                        {r.requested_duration_minutes}m
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background:
                              r.status === 'pending_approval'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : r.status === 'approved' || r.status === 'active'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color:
                              r.status === 'pending_approval'
                                ? '#fbbf24'
                                : r.status === 'approved' || r.status === 'active'
                                ? '#4ade80'
                                : '#f87171',
                          }}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {r.approver_email ?? '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {r.status === 'pending_approval' ? (
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => {
                                setDecidingRequest(r);
                                setDecisionApproved(true);
                              }}
                              style={{
                                background: '#15803d',
                                color: '#f8fafc',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setDecidingRequest(r);
                                setDecisionApproved(false);
                              }}
                              style={{
                                background: '#b91c1c',
                                color: '#f8fafc',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Active Ephemeral Leases */}
      {subTab === 'leases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status Filter:</span>
              <select
                value={filterLeaseStatus}
                onChange={(e) => setFilterLeaseStatus(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Leases</option>
                <option value="active">Active Only</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Showing {leases.length} credential leases
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Lease ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Operator</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Elevation Tier</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Token Signature</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Issued At</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Expires At</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leases.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No ephemeral credential leases found.
                    </td>
                  </tr>
                ) : (
                  leases.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#06b6d4' }}>
                        {l.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 500 }}>
                        {l.operator_email}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background:
                              l.elevation_tier === 'break_glass_root'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(14, 116, 144, 0.2)',
                            color: l.elevation_tier === 'break_glass_root' ? '#f87171' : '#38bdf8',
                          }}
                        >
                          {l.elevation_tier.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.75rem' }}>
                        {l.token_signature ? `${l.token_signature.slice(0, 16)}...` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                        {new Date(l.issued_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                        {new Date(l.expires_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background:
                              l.status === 'active'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(100, 116, 139, 0.2)',
                            color: l.status === 'active' ? '#4ade80' : '#94a3b8',
                          }}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {l.status === 'active' ? (
                          <button
                            onClick={() => handleRevokeLease(l.id)}
                            style={{
                              background: '#b91c1c',
                              color: '#f8fafc',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Revoke
                          </button>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Dual-Authorization Policies */}
      {subTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
              Multi-Party Dual-Authorization Guardrail Rules
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              These high-impact operational actions strictly require independent multi-operator quorum before execution can be permitted.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {rule.action_name}
                  </span>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: rule.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: rule.is_active ? '#4ade80' : '#f87171',
                    }}
                  >
                    {rule.is_active ? 'ENFORCED' : 'DISABLED'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>{rule.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                  <span>Target: <strong style={{ color: '#06b6d4' }}>{rule.target_resource_type}</strong></span>
                  <span>Required Approvers: <strong style={{ color: '#f59e0b' }}>{rule.required_approvers}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: Break-Glass Emergency & Forensics */}
      {subTab === 'breakglass' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Simulator Form */}
          <div style={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ display: 'inline-flex', color: '#ef4444' }}>
                <ShieldAlert size={20} />
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Emergency Break-Glass Root Privilege Elevation
              </h3>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              Simulates an urgent, mission-critical break-glass elevation bypass. Produces an ephemeral credential lease with maximum forensic telemetry and dispatches critical security notifications.
            </p>

            <form onSubmit={handleSimulateBreakGlass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Incident Justification / Emergency Context
                  </label>
                  <input
                    type="text"
                    value={bgJustification}
                    onChange={(e) => setBgJustification(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Lease TTL Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={bgDuration}
                    onChange={(e) => setBgDuration(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={bgSimulating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#dc2626',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: bgSimulating ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}>
                    <Zap size={16} />
                  </span>
                  {bgSimulating ? 'Elevating...' : 'Trigger Break-Glass Elevation'}
                </button>
              </div>
            </form>

            {bgResult && (
              <div style={{ marginTop: '1.25rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#38bdf8' }}>
                  ✓ Break-Glass Elevation Issued Successfully
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div>Incident ID: <strong style={{ color: '#f8fafc' }}>{bgResult.emergency_incident_id}</strong></div>
                  <div>Lease ID: <strong style={{ color: '#06b6d4' }}>{bgResult.lease_id}</strong></div>
                  <div>Elevation Tier: <strong style={{ color: '#ef4444' }}>{bgResult.elevation_tier}</strong></div>
                  <div>Forensic Signature: <code style={{ color: '#a855f7' }}>{bgResult.forensic_signature.slice(0, 24)}...</code></div>
                </div>
              </div>
            )}
          </div>

          {/* Audit Replay Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
              Forensic JIT Audit Session Replay ({auditSessions.length})
            </h3>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Operator</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Resource</th>
                    <th style={{ padding: '0.75rem 1rem' }}>IP Address</th>
                    <th style={{ padding: '0.75rem 1rem' }}>HMAC Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {auditSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No audit sessions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditSessions.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                          {new Date(s.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 500 }}>
                          {s.operator_email}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#38bdf8', fontWeight: 600 }}>
                          {s.action_performed}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                          {s.resource_affected}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {s.ip_address}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#a855f7', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {s.signature ? `${s.signature.slice(0, 18)}...` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request JIT Elevation */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '520px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-flex', color: '#06b6d4' }}>
                  <Key size={18} />
                </span>
                Request JIT Privilege Elevation
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={18} />
                </span>
              </button>
            </div>

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Target Role
                </label>
                <select
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="compliance_auditor">Compliance Auditor</option>
                  <option value="security_lead">Security Lead</option>
                  <option value="infrastructure_operator">Infrastructure Operator</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Elevation Tier
                </label>
                <select
                  value={newElevationTier}
                  onChange={(e) => setNewElevationTier(e.target.value as JitElevationTier)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="standard_ops">Standard Ops (Tier 1)</option>
                  <option value="elevated_admin">Elevated Admin (Tier 2)</option>
                  <option value="break_glass_root">Break-Glass Root (Tier 3)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Requested Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Business Justification (Required)
                </label>
                <textarea
                  rows={3}
                  value={newJustification}
                  onChange={(e) => setNewJustification(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#0e7490',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dual-Auth Decision */}
      {decidingRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-flex', color: decisionApproved ? '#22c55e' : '#ef4444' }}>
                  {decisionApproved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </span>
                {decisionApproved ? 'Approve' : 'Reject'} JIT Elevation Request
              </h3>
              <button
                onClick={() => setDecidingRequest(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={18} />
                </span>
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <div>Requester: <strong>{decidingRequest.requester_email}</strong></div>
              <div>Role: <strong>{decidingRequest.target_role}</strong> ({decidingRequest.elevation_tier})</div>
              <div>Justification: <em>{decidingRequest.justification}</em></div>
              <div style={{ color: '#f59e0b', marginTop: '0.25rem' }}>
                Note: Independent 2nd operator approval is strictly enforced. Self-approval is rejected.
              </div>
            </div>

            <form onSubmit={handleDecideRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Decision Notes / Audit Justification
                </label>
                <input
                  type="text"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDecidingRequest(null)}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: decisionApproved ? '#15803d' : '#b91c1c',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm {decisionApproved ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
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
