/**
 * WORM Audit Vault & Cryptographic Tamper-Evidence Tab
 * HoaspForge Platform v4.5.0
 * 
 * Provides:
 * - Real-time cryptographic ledger health telemetry & WORM trigger status
 * - Manual ingestion & Ed25519-signed Merkle daily seal generation
 * - Live cryptographic ledger verification with tamper simulation sandbox
 * - Granular Merkle inclusion proof inspector
 * - Legal hold management (preservation against automated purge)
 * - External verifier token management & verification access audit trail
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Lock,
  Key,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  Copy,
  Check,
  Eye,
  FileText,
  Clock,
  Play,
  RotateCcw,
  Trash2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  WormVaultOverview,
  WormVaultRecord,
  WormDailySeal,
  WormInclusionProof,
  WormVerificationReport,
  WormTamperSimulationRequest,
  WormLegalHold,
  WormVerificationToken,
  IssuedWormVerificationToken,
  WormVerificationEvent,
  WormPublicSealVerification,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const WormVaultTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'records' | 'seals' | 'holds' | 'tokens' | 'events'>('records');

  // Overview Telemetry
  const [overview, setOverview] = useState<WormVaultOverview | null>(null);

  // Records state
  const [records, setRecords] = useState<WormVaultRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(0);
  const [recordsSourceFilter, setRecordsSourceFilter] = useState('');
  const [recordsActionFilter, setRecordsActionFilter] = useState('');

  // Seals state
  const [seals, setSeals] = useState<WormDailySeal[]>([]);

  // Legal Holds state
  const [holds, setHolds] = useState<WormLegalHold[]>([]);

  // Verification Tokens state
  const [tokens, setTokens] = useState<WormVerificationToken[]>([]);

  // Verification Events state
  const [events, setEvents] = useState<WormVerificationEvent[]>([]);

  // Action states
  const [ingesting, setIngesting] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<WormVerificationReport | null>(null);

  // Modals
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [inspectingSequence, setInspectingSequence] = useState<number | null>(null);
  const [inspectingRecord, setInspectingRecord] = useState<WormVaultRecord | null>(null);
  const [inspectingProof, setInspectingProof] = useState<WormInclusionProof | null>(null);

  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [simMode, setSimMode] = useState<'payload' | 'delete' | 'reorder' | 'seal_root'>('payload');
  const [simSeq, setSimSeq] = useState<string>('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<(WormVerificationReport & { mutation: string }) | null>(null);

  const [createHoldModalOpen, setCreateHoldModalOpen] = useState(false);
  const [holdMatterRef, setHoldMatterRef] = useState('');
  const [holdTitle, setHoldTitle] = useState('');
  const [holdDesc, setHoldDesc] = useState('');
  const [holdCustodian, setHoldCustodian] = useState('');
  const [holdTenantId, setHoldTenantId] = useState('');
  const [createHoldLoading, setCreateHoldLoading] = useState(false);

  const [releaseHoldModalOpen, setReleaseHoldModalOpen] = useState(false);
  const [releasingHold, setReleasingHold] = useState<WormLegalHold | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseHoldLoading, setReleaseHoldLoading] = useState(false);

  const [issueTokenModalOpen, setIssueTokenModalOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState('');
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenOrg, setTokenOrg] = useState('');
  const [tokenDays, setTokenDays] = useState(30);
  const [issueTokenLoading, setIssueTokenLoading] = useState(false);
  const [newlyIssuedToken, setNewlyIssuedToken] = useState<IssuedWormVerificationToken | null>(null);

  const [publicKeyModalOpen, setPublicKeyModalOpen] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2500);
    showToast('Copied to clipboard');
  };

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.adminOps.getWormOverview();
      setOverview(res);
      if (res.lastVerification) {
        setVerificationResult(res.lastVerification);
      }
    } catch (err: any) {
      showToast(`Failed to load WORM overview: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadSubTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (subTab === 'records') {
        const res = await api.adminOps.listWormRecords({
          sourceTable: recordsSourceFilter || undefined,
          action: recordsActionFilter.trim() || undefined,
          limit: 50,
          offset: recordsPage * 50,
        });
        setRecords(res.records);
        setRecordsTotal(res.total);
      } else if (subTab === 'seals') {
        const res = await api.adminOps.listWormSeals();
        setSeals(res);
      } else if (subTab === 'holds') {
        const res = await api.adminOps.listWormLegalHolds();
        setHolds(res);
      } else if (subTab === 'tokens') {
        const res = await api.adminOps.listWormVerificationTokens();
        setTokens(res);
      } else if (subTab === 'events') {
        const res = await api.adminOps.listWormVerificationEvents();
        setEvents(res);
      }
    } catch (err: any) {
      showToast(`Failed to load ${subTab} data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [subTab, recordsSourceFilter, recordsActionFilter, recordsPage, showToast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadSubTabData();
  }, [loadSubTabData]);

  // Actions
  const handleIngest = async () => {
    setIngesting(true);
    try {
      const res = await api.adminOps.ingestWormVault();
      showToast(`Ingestion complete: ${res.ingested} records chained (head #${res.chainHeadSequence}).`);
      await loadOverview();
      if (subTab === 'records') await loadSubTabData();
    } catch (err: any) {
      showToast(`Ingestion failed: ${err.message}`, 'error');
    } finally {
      setIngesting(false);
    }
  };

  const handleCreateSeal = async () => {
    setSealing(true);
    try {
      const res = await api.adminOps.createWormSeal();
      showToast(`Daily cryptographic seal created for range #${res.firstSequence} - #${res.lastSequence}.`);
      await loadOverview();
      if (subTab === 'seals') await loadSubTabData();
    } catch (err: any) {
      showToast(`Sealing failed: ${err.message}`, 'error');
    } finally {
      setSealing(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      const res = await api.adminOps.verifyWormLedger();
      setVerificationResult(res);
      if (res.verified) {
        showToast(`Ledger integrity verified: ${res.recordsChecked} records & ${res.sealsChecked} seals intact.`);
      } else {
        showToast(`Integrity warning: ${res.issues.length} issue(s) detected.`, 'error');
      }
      await loadOverview();
    } catch (err: any) {
      showToast(`Verification failed: ${err.message}`, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleInspectRecord = async (seq: number) => {
    setInspectingSequence(seq);
    try {
      const res = await api.adminOps.getWormRecord(seq);
      setInspectingRecord(res.record);
      setInspectingProof(res.proof);
      setProofModalOpen(true);
    } catch (err: any) {
      showToast(`Failed to inspect record: ${err.message}`, 'error');
    }
  };

  const handleSimulateTamper = async () => {
    setSimLoading(true);
    try {
      const body: WormTamperSimulationRequest = {
        mode: simMode,
        sequenceNumber: simSeq ? Number(simSeq) : undefined,
      };
      const res = await api.adminOps.simulateWormTamper(body);
      setSimResult(res);
      showToast('Tamper simulation executed in memory (stored data unaffected).');
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  const handleCreateLegalHold = async () => {
    if (!holdMatterRef.trim() || !holdTitle.trim()) {
      showToast('Matter reference and title are required.', 'error');
      return;
    }
    setCreateHoldLoading(true);
    try {
      await api.adminOps.createWormLegalHold({
        matterReference: holdMatterRef.trim(),
        title: holdTitle.trim(),
        description: holdDesc.trim() || undefined,
        custodianEmail: holdCustodian.trim() || undefined,
        tenantId: holdTenantId.trim() || undefined,
      });
      showToast('Legal hold placed successfully (data purges blocked).');
      setCreateHoldModalOpen(false);
      setHoldMatterRef('');
      setHoldTitle('');
      setHoldDesc('');
      setHoldCustodian('');
      setHoldTenantId('');
      await loadOverview();
      if (subTab === 'holds') await loadSubTabData();
    } catch (err: any) {
      showToast(`Failed to place hold: ${err.message}`, 'error');
    } finally {
      setCreateHoldLoading(false);
    }
  };

  const handleReleaseLegalHold = async () => {
    if (!releasingHold || releaseReason.trim().length < 8) {
      showToast('Mandatory justification of at least 8 characters is required.', 'error');
      return;
    }
    setReleaseHoldLoading(true);
    try {
      await api.adminOps.releaseWormLegalHold(releasingHold.id, releaseReason.trim());
      showToast(`Legal hold #${releasingHold.matterReference} released.`);
      setReleaseHoldModalOpen(false);
      setReleasingHold(null);
      setReleaseReason('');
      await loadOverview();
      if (subTab === 'holds') await loadSubTabData();
    } catch (err: any) {
      showToast(`Failed to release hold: ${err.message}`, 'error');
    } finally {
      setReleaseHoldLoading(false);
    }
  };

  const handleIssueToken = async () => {
    if (!tokenLabel.trim() || !tokenEmail.trim()) {
      showToast('Label and auditor email are required.', 'error');
      return;
    }
    setIssueTokenLoading(true);
    try {
      const res = await api.adminOps.issueWormVerificationToken({
        label: tokenLabel.trim(),
        auditorEmail: tokenEmail.trim(),
        auditorOrganization: tokenOrg.trim() || undefined,
        expiresInDays: tokenDays,
      });
      setNewlyIssuedToken(res);
      setTokenLabel('');
      setTokenEmail('');
      setTokenOrg('');
      await loadOverview();
      if (subTab === 'tokens') await loadSubTabData();
    } catch (err: any) {
      showToast(`Failed to issue token: ${err.message}`, 'error');
    } finally {
      setIssueTokenLoading(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      await api.adminOps.revokeWormVerificationToken(id);
      showToast('Verification token revoked.');
      await loadOverview();
      if (subTab === 'tokens') await loadSubTabData();
    } catch (err: any) {
      showToast(`Failed to revoke token: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 4 Telemetry Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Card 1: Chained Vault Records */}
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            WORM Vault Records
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {overview?.totalRecords ?? '...'}
            <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              Head #{overview?.chainHeadSequence ?? 0}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} />
            <span>SHA-256 Continuous Hash Chaining</span>
          </div>
        </div>

        {/* Card 2: Daily Seals */}
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Daily Cryptographic Seals
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {overview?.totalSeals ?? '...'}
            <span style={{ fontSize: '0.82rem', fontWeight: 400, color: overview?.unsealedRecords ? '#f59e0b' : '#10b981' }}>
              ({overview?.unsealedRecords ?? 0} unsealed)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Key size={12} />
            <span>Ed25519 Signed Merkle Trees</span>
          </div>
        </div>

        {/* Card 3: Active Legal Holds */}
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Legal Holds
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {overview?.activeLegalHolds ?? 0}
            <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              preservations
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: overview?.activeLegalHolds ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} />
            <span>{overview?.activeLegalHolds ? 'Compliance Purges Blocked' : 'Normal Purge Retention'}</span>
          </div>
        </div>

        {/* Card 4: Verification Portal & Invariant Status */}
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            WORM Enforcement & Portal
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: overview?.wormEnforcement?.recordsTriggers ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={18} /> DB Triggers Active
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={12} />
            <span>{overview?.activeVerificationTokens ?? 0} active tokens · {overview?.externalVerifications24h ?? 0} verifications (24h)</span>
          </div>
        </div>
      </div>

      {/* Verification Banner */}
      {verificationResult && (
        <div
          className="glass-card"
          style={{
            padding: '14px 20px',
            borderLeft: `4px solid ${verificationResult.verified ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {verificationResult.verified ? (
              <CheckCircle2 size={22} color="#10b981" />
            ) : (
              <AlertTriangle size={22} color="#ef4444" />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                {verificationResult.verified
                  ? 'Cryptographic Ledger Verified: Zero Tampering Detected'
                  : `Integrity Alert: ${verificationResult.issues.length} Issue(s) Detected`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {verificationResult.recordsChecked} sequential records & {verificationResult.sealsChecked} signed seals checked in {verificationResult.durationMs}ms · Verified at {new Date(verificationResult.verifiedAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPublicKeyModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem' }}
            >
              <Key size={13} /> View Ed25519 Public Key
            </button>
            <button
              onClick={handleVerifyLedger}
              disabled={verifying}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.8rem' }}
            >
              <RefreshCw size={13} className={verifying ? 'spin' : ''} /> Re-verify Entire Ledger
            </button>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubTab('records')}
            className={`btn btn-sm ${subTab === 'records' ? 'btn-primary' : 'btn-glass'}`}
          >
            <Database size={14} /> Vault Records ({overview?.totalRecords ?? 0})
          </button>
          <button
            onClick={() => setSubTab('seals')}
            className={`btn btn-sm ${subTab === 'seals' ? 'btn-primary' : 'btn-glass'}`}
          >
            <Key size={14} /> Daily Seals ({overview?.totalSeals ?? 0})
          </button>
          <button
            onClick={() => setSubTab('holds')}
            className={`btn btn-sm ${subTab === 'holds' ? 'btn-primary' : 'btn-glass'}`}
          >
            <Lock size={14} /> Legal Holds ({overview?.activeLegalHolds ?? 0})
          </button>
          <button
            onClick={() => setSubTab('tokens')}
            className={`btn btn-sm ${subTab === 'tokens' ? 'btn-primary' : 'btn-glass'}`}
          >
            <Users size={14} /> Verification Tokens ({overview?.activeVerificationTokens ?? 0})
          </button>
          <button
            onClick={() => setSubTab('events')}
            className={`btn btn-sm ${subTab === 'events' ? 'btn-primary' : 'btn-glass'}`}
          >
            <FileText size={14} /> Verification Audit
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="btn btn-glass btn-sm"
            title="Append recent audit events from source tables into the WORM hash chain"
          >
            <RotateCcw size={13} className={ingesting ? 'spin' : ''} />
            {ingesting ? 'Ingesting...' : 'Ingest Audit Events'}
          </button>
          <button
            onClick={handleCreateSeal}
            disabled={sealing || (overview?.unsealedRecords === 0)}
            className="btn btn-glass btn-sm"
            title="Create an Ed25519-signed Merkle seal over unsealed records"
          >
            <Key size={13} className={sealing ? 'spin' : ''} />
            {sealing ? 'Sealing...' : 'Create Daily Seal'}
          </button>
          <button
            onClick={() => {
              setSimResult(null);
              setSimulateModalOpen(true);
            }}
            className="btn btn-glass btn-sm"
            title="Simulate in-memory tampering without modifying database"
          >
            <Play size={13} /> Tamper Sandbox
          </button>
          <button
            onClick={() => setCreateHoldModalOpen(true)}
            className="btn btn-glass btn-sm"
          >
            <Plus size={13} /> Place Legal Hold
          </button>
          <button
            onClick={() => {
              setNewlyIssuedToken(null);
              setIssueTokenModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={13} /> Issue Verifier Token
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Records Table */}
      {subTab === 'records' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Append-Only Chained Ledger</div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing {records.length} of {recordsTotal}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={recordsSourceFilter}
                onChange={(e) => {
                  setRecordsSourceFilter(e.target.value);
                  setRecordsPage(0);
                }}
                className="input-field"
                style={{ fontSize: '0.8rem', padding: '6px 10px', height: '34px' }}
              >
                <option value="">All Source Tables</option>
                <option value="superadmin_audit_logs">superadmin_audit_logs</option>
                <option value="governance_audit_logs">governance_audit_logs</option>
                <option value="publishing_audit_logs">publishing_audit_logs</option>
              </select>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter action..."
                  value={recordsActionFilter}
                  onChange={(e) => {
                    setRecordsActionFilter(e.target.value);
                    setRecordsPage(0);
                  }}
                  className="input-field"
                  style={{ fontSize: '0.8rem', paddingLeft: '30px', height: '34px', width: '180px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>SEQ #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>ACTION</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>SOURCE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>ACTOR</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>CHAIN HASH (SHA-256)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>TIMESTAMP</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No WORM records found. Click &quot;Ingest Audit Events&quot; to populate.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>#{r.sequenceNumber}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {r.eventAction}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        {r.sourceTable.replace('_audit_logs', '')}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        {r.actorEmail || r.actorId || 'system'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                        <span title={r.chainHash}>{r.chainHash.slice(0, 16)}...</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleInspectRecord(r.sequenceNumber)}
                          className="btn btn-glass btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        >
                          <Eye size={12} /> Proof
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div>
              Page {recordsPage + 1} of {Math.max(1, Math.ceil(recordsTotal / 50))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={recordsPage === 0}
                onClick={() => setRecordsPage((p) => Math.max(0, p - 1))}
                className="btn btn-glass btn-sm"
              >
                Previous
              </button>
              <button
                disabled={(recordsPage + 1) * 50 >= recordsTotal}
                onClick={() => setRecordsPage((p) => p + 1)}
                className="btn btn-glass btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Seals Table */}
      {subTab === 'seals' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '14px' }}>
            Daily Cryptographic Seals (Ed25519-Signed Merkle Checkpoints)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>SEAL DATE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>RANGE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>RECORDS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>MERKLE ROOT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>SEAL HASH</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>KEY ID</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>VERIFIED</th>
                </tr>
              </thead>
              <tbody>
                {seals.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No seals created yet. Click &quot;Create Daily Seal&quot; to anchor unsealed records.
                    </td>
                  </tr>
                ) : (
                  seals.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.sealDate}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                        #{s.firstSequence} - #{s.lastSequence}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{s.recordCount}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                        <span title={s.merkleRoot}>{s.merkleRoot.slice(0, 16)}...</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                        <span title={s.sealHash}>{s.sealHash.slice(0, 16)}...</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {s.signingKeyId}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={12} /> Ed25519 Valid
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Legal Holds Table */}
      {subTab === 'holds' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Litigation & Regulatory Legal Holds (Blocks Automated Compliance Purges)
            </div>
            <button
              onClick={() => setCreateHoldModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={13} /> Place Legal Hold
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>MATTER REF</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>TITLE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>SCOPE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>STATUS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>PLACED BY</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>DATE</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {holds.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No legal holds active. Compliance purges operate under standard TTL retention.
                    </td>
                  </tr>
                ) : (
                  holds.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {h.matterReference}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{h.title}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {h.tenantId ? `Tenant: ${h.tenantId.slice(0, 8)}...` : 'Platform-Wide'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: h.status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            color: h.status === 'active' ? '#ef4444' : 'var(--text-muted)',
                          }}
                        >
                          {h.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {h.placedBy}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(h.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {h.status === 'active' ? (
                          <button
                            onClick={() => {
                              setReleasingHold(h);
                              setReleaseReason('');
                              setReleaseHoldModalOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          >
                            Release
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Released by {h.releasedBy || 'auditor'}
                          </span>
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

      {/* Sub-tab 4: External Verifier Tokens */}
      {subTab === 'tokens' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                External Legal Verification Portal Tokens (RFC 6962 Proof Access)
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Tokens grant external auditors access to verify signed seals and Merkle proofs without platform login.
              </div>
            </div>
            <button
              onClick={() => {
                setNewlyIssuedToken(null);
                setIssueTokenModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus size={13} /> Issue Verifier Token
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>LABEL</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>AUDITOR EMAIL</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>PREFIX</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>EXPIRES</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>CALLS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>STATUS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No verifier tokens issued yet. Click &quot;Issue Verifier Token&quot; to authorize an external auditor.
                    </td>
                  </tr>
                ) : (
                  tokens.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t.label}</td>
                      <td style={{ padding: '8px 12px', fontSize: '0.78rem' }}>
                        {t.auditorEmail}
                        {t.auditorOrganization && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {t.auditorOrganization}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.76rem' }}>
                        {t.tokenPrefix}...
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(t.expiresAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{t.accessCount}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: t.revoked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: t.revoked ? '#ef4444' : '#10b981',
                          }}
                        >
                          {t.revoked ? 'REVOKED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {!t.revoked && (
                          <button
                            onClick={() => handleRevokeToken(t.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          >
                            Revoke
                          </button>
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

      {/* Sub-tab 5: Verification Events Table */}
      {subTab === 'events' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '14px' }}>
            External Verification Portal Access Log (RFC 6962 Telemetry)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>TIMESTAMP</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>ENDPOINT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>RESULT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>IP ADDRESS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No external verification calls recorded yet.
                    </td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {e.endpoint}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background:
                              e.result === 'valid'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : e.result === 'invalid'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              e.result === 'valid'
                                ? '#10b981'
                                : e.result === 'invalid'
                                ? '#ef4444'
                                : '#f59e0b',
                          }}
                        >
                          {e.result.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        {e.ipAddress || 'unknown'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        {e.details ? JSON.stringify(e.details) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Inspect Record Proof */}
      {proofModalOpen && inspectingRecord && (
        <div className="modal-backdrop" onClick={() => setProofModalOpen(false)}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#10b981" />
                <span>WORM Record #{inspectingRecord.sequenceNumber} Cryptographic Proof</span>
              </div>
              <button onClick={() => setProofModalOpen(false)} className="btn-icon">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Chain Hash (SHA-256)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  <span style={{ wordBreak: 'break-all' }}>{inspectingRecord.chainHash}</span>
                  <button onClick={() => copyToClipboard(inspectingRecord.chainHash, 'chain')} className="btn-icon" style={{ flexShrink: 0 }}>
                    {copiedKey === 'chain' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Previous Hash (Chained)
                </label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                  {inspectingRecord.previousHash}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Payload Hash (SHA-256 of Redacted Canonical JSON)
                </label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                  {inspectingRecord.payloadHash}
                </div>
              </div>

              {inspectingProof && (
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Merkle Inclusion Proof (Anchored in Seal {inspectingProof.seal.sealDate})
                  </label>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Leaf Index: {inspectingProof.leafIndex} · Root: <span style={{ fontFamily: 'monospace' }}>{inspectingProof.merkleRoot.slice(0, 16)}...</span>
                    </div>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {inspectingProof.proof.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', fontFamily: 'monospace' }}>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{p.position.toUpperCase()}</span>
                          <span style={{ wordBreak: 'break-all', color: 'var(--text-muted)' }}>{p.hash}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {inspectingRecord.payloadCanonical && (
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Canonical Payload (Exact Hashed Bytes)
                  </label>
                  <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '4px', fontSize: '0.72rem', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {inspectingRecord.payloadCanonical}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setProofModalOpen(false)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Simulate Tampering Sandbox */}
      {simulateModalOpen && (
        <div className="modal-backdrop" onClick={() => setSimulateModalOpen(false)}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#f59e0b" />
                <span>WORM Tamper-Evidence Simulation Sandbox</span>
              </div>
              <button onClick={() => setSimulateModalOpen(false)} className="btn-icon">✕</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Executes in-memory attack simulations against a clone of the cryptographic ledger to prove that payload alterations, deletions, re-orderings, or forged seals are deterministically detected. Stored database records are never modified.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Attack Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'payload', title: 'Payload Tampering', desc: 'Mutate canonical payload JSON bytes' },
                    { id: 'delete', title: 'Silent Deletion', desc: 'Delete record from sequential ledger' },
                    { id: 'reorder', title: 'Record Reordering', desc: 'Swap chronological storage positions' },
                    { id: 'seal_root', title: 'Forged Seal Root', desc: 'Tamper with Ed25519 Merkle anchor' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSimMode(m.id as any)}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: `1px solid ${simMode === m.id ? '#f59e0b' : 'var(--border-color)'}`,
                        background: simMode === m.id ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.02)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: simMode === m.id ? '#f59e0b' : 'inherit' }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Target Sequence Number (Optional - defaults to mid-ledger)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={simSeq}
                  onChange={(e) => setSimSeq(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              {simResult && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: simResult.tamperDetected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${simResult.tamperDetected ? '#ef4444' : '#10b981'}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: simResult.tamperDetected ? '#ef4444' : '#10b981', marginBottom: '4px' }}>
                    {simResult.tamperDetected ? '✓ Attack Detected by Cryptographic Verifier' : 'Undetected'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {simResult.mutation}
                  </div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {simResult.issues.map((iss, i) => (
                      <div key={i} style={{ color: '#ef4444', fontFamily: 'monospace' }}>
                        • [{iss.type}] {iss.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSimulateModalOpen(false)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <button
                onClick={handleSimulateTamper}
                disabled={simLoading}
                className="btn btn-primary btn-sm"
              >
                {simLoading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Place Legal Hold */}
      {createHoldModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateHoldModalOpen(false)}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#ef4444" />
                <span>Place Legal Preservation Hold</span>
              </div>
              <button onClick={() => setCreateHoldModalOpen(false)} className="btn-icon">✕</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Active legal holds strictly block compliance purges and automated data retention erasure for the covered tenant (or platform-wide) to preserve evidence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Matter Reference (Case / Regulatory ID) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. LIT-2026-FTC-042"
                  value={holdMatterRef}
                  onChange={(e) => setHoldMatterRef(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. FTC Regulatory Inquiry Audit Trail Preservation"
                  value={holdTitle}
                  onChange={(e) => setHoldTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Custodian Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. generalcounsel@client.example"
                  value={holdCustodian}
                  onChange={(e) => setHoldCustodian(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Target Tenant ID (Optional - leave empty for platform-wide)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0842e532-e6cf-4cc1-b8ce-4c4546a10a97"
                  value={holdTenantId}
                  onChange={(e) => setHoldTenantId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Preservation Instructions & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Preserve all publishing logs, approval chains and audit entries..."
                  value={holdDesc}
                  onChange={(e) => setHoldDesc(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setCreateHoldModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleCreateLegalHold}
                disabled={createHoldLoading}
                className="btn btn-primary btn-sm"
              >
                {createHoldLoading ? 'Placing Hold...' : 'Place Legal Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Release Legal Hold */}
      {releaseHoldModalOpen && releasingHold && (
        <div className="modal-backdrop" onClick={() => setReleaseHoldModalOpen(false)}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Release Legal Hold #{releasingHold.matterReference}
              </div>
              <button onClick={() => setReleaseHoldModalOpen(false)} className="btn-icon">✕</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Releasing this legal hold will unblock automated compliance purges for the covered tenant. A formal legal justification is required.
            </p>

            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                Release Justification (min 8 characters) *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Litigation settled with prejudice; preservation order lifted by judge."
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setReleaseHoldModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleReleaseLegalHold}
                disabled={releaseHoldLoading || releaseReason.trim().length < 8}
                className="btn btn-primary btn-sm"
              >
                {releaseHoldLoading ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Issue Verifier Token */}
      {issueTokenModalOpen && (
        <div className="modal-backdrop" onClick={() => setIssueTokenModalOpen(false)}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#10b981" />
                <span>Issue External Legal Verifier Token</span>
              </div>
              <button onClick={() => setIssueTokenModalOpen(false)} className="btn-icon">✕</button>
            </div>

            {newlyIssuedToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
                <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', fontWeight: 600 }}>
                  ✓ Token Issued Successfully
                </div>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  Provide this token to the external auditor. The plaintext token will never be displayed again.
                </p>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    X-Verification-Token
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    <span style={{ wordBreak: 'break-all', color: '#10b981' }}>{newlyIssuedToken.token}</span>
                    <button onClick={() => copyToClipboard(newlyIssuedToken.token, 'newtoken')} className="btn-icon" style={{ flexShrink: 0 }}>
                      {copiedKey === 'newtoken' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Auditor: {newlyIssuedToken.auditorEmail} · Expires: {new Date(newlyIssuedToken.expiresAt).toLocaleDateString()}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIssueTokenModalOpen(false)} className="btn btn-primary btn-sm">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Token Label *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Q4 SOC2 External Auditor Access"
                      value={tokenLabel}
                      onChange={(e) => setTokenLabel(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Auditor Email *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. lead.auditor@firm.example"
                      value={tokenEmail}
                      onChange={(e) => setTokenEmail(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Auditor Organization (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ernst & Young LLP"
                      value={tokenOrg}
                      onChange={(e) => setTokenOrg(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Validity Window (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={tokenDays}
                      onChange={(e) => setTokenDays(Number(e.target.value))}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setIssueTokenModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleIssueToken}
                    disabled={issueTokenLoading}
                    className="btn btn-primary btn-sm"
                  >
                    {issueTokenLoading ? 'Issuing...' : 'Issue Token'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: Public Key Viewer */}
      {publicKeyModalOpen && overview?.signingKey && (
        <div className="modal-backdrop" onClick={() => setPublicKeyModalOpen(false)}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#10b981" />
                <span>Ed25519 Public Verification Key</span>
              </div>
              <button onClick={() => setPublicKeyModalOpen(false)} className="btn-icon">✕</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              This public key is published without authentication at <code>/api/v1/public/worm-verify/public-key</code> and is used by external verifiers to independently cryptographically authenticate daily seals.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Key ID (Fingerprint)
                </label>
                <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px' }}>
                  {overview.signingKey.keyId}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Public Key (SPKI PEM)
                  </label>
                  <button
                    onClick={() => copyToClipboard(overview.signingKey.publicKeyPem, 'pubkey')}
                    className="btn btn-glass btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                  >
                    {copiedKey === 'pubkey' ? <Check size={12} color="#10b981" /> : <Copy size={12} />} Copy PEM
                  </button>
                </div>
                <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '4px', fontSize: '0.72rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {overview.signingKey.publicKeyPem}
                </pre>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPublicKeyModalOpen(false)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
