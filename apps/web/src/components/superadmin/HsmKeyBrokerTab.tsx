/**
 * Enterprise Cryptographic Hardware Security Module (HSM) Key Brokerage, Envelope Encryption & Vault Broker Tab
 * HoaspForge Platform v6.2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  Cpu,
  Flame,
  Clock,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  X,
  FileKey,
  Binary,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  HsmKeyRing,
  EnvelopeDataEncryptionKey,
  KeyDerivationPolicy,
  HsmCryptoAuditLog,
  HsmTelemetry,
  HsmProviderType,
  DekPurpose,
  EnvelopeEncryptResult,
  EnvelopeDecryptResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'keyrings' | 'deks' | 'sandbox' | 'audit';

export const HsmKeyBrokerTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('keyrings');

  // Telemetry
  const [telemetry, setTelemetry] = useState<HsmTelemetry | null>(null);

  // Keyrings
  const [keyRings, setKeyRings] = useState<HsmKeyRing[]>([]);
  const [showCreateRingModal, setShowCreateRingModal] = useState(false);
  const [newRingName, setNewRingName] = useState('AWS CloudHSM US-West Dedicated Keyring');
  const [newProviderType, setNewProviderType] = useState<HsmProviderType>('aws_cloudhsm');
  const [newPartitionId, setNewPartitionId] = useState('partition-us-west-2a-hsm02');
  const [newMasterAlias, setNewMasterAlias] = useState('alias/sf-hsm-root-uswest2');
  const [newRotationDays, setNewRotationDays] = useState(90);

  // Rotate KEK Modal
  const [rotatingRing, setRotatingRing] = useState<HsmKeyRing | null>(null);
  const [rotating, setRotating] = useState(false);

  // DEKs
  const [deks, setDeks] = useState<EnvelopeDataEncryptionKey[]>([]);
  const [filterRingId, setFilterRingId] = useState<string>('all');
  const [filterDekStatus, setFilterDekStatus] = useState<string>('all');
  const [showGenerateDekModal, setShowGenerateDekModal] = useState(false);
  const [genTargetRingId, setGenTargetRingId] = useState('');
  const [genDekLabel, setGenDekLabel] = useState('Workspace Media Vault Envelope Key (v2)');
  const [genPurpose, setGenPurpose] = useState<DekPurpose>('media_vault_envelope');
  const [genExpiresDays, setGenExpiresDays] = useState(365);

  // Crypto-Shred Modal
  const [shreddingDek, setShreddingDek] = useState<EnvelopeDataEncryptionKey | null>(null);
  const [shredReason, setShredReason] = useState('Right-to-be-Forgotten compliance purge requested by tenant legal team');
  const [shredConfirmText, setShredConfirmText] = useState('');

  // Policies & Audit Logs
  const [policies, setPolicies] = useState<KeyDerivationPolicy[]>([]);
  const [cryptoLogs, setCryptoLogs] = useState<HsmCryptoAuditLog[]>([]);

  // Sandbox State
  const [sandboxDekId, setSandboxDekId] = useState('');
  const [sandboxPlaintext, setSandboxPlaintext] = useState('Customer Sensitive Social Media Auth Secret Token: oauth2_tok_live_84f910a2948e710b');
  const [sandboxAad, setSandboxAad] = useState('tenant_uuid:tenant-enterprise-acme-corp');
  const [encrypting, setEncrypting] = useState(false);
  const [encryptResult, setEncryptResult] = useState<EnvelopeEncryptResult | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptResult, setDecryptResult] = useState<EnvelopeDecryptResult | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, ringsRes, deksRes, policiesRes, logsRes] = await Promise.all([
        api.adminOps.getHsmTelemetry(),
        api.adminOps.listHsmKeyRings(),
        api.adminOps.listEnvelopeDeks(
          filterRingId === 'all' ? undefined : filterRingId,
          filterDekStatus === 'all' ? undefined : filterDekStatus
        ),
        api.adminOps.listHsmPolicies(),
        api.adminOps.listHsmCryptoLogs(40),
      ]);
      setTelemetry(telRes);
      setKeyRings(ringsRes);
      setDeks(deksRes);
      setPolicies(policiesRes);
      setCryptoLogs(logsRes);

      if (!genTargetRingId && ringsRes.length > 0) {
        setGenTargetRingId(ringsRes[0].id);
      }
      if (!sandboxDekId && deksRes.length > 0) {
        const activeDek = deksRes.find((d) => d.status === 'active');
        if (activeDek) setSandboxDekId(activeDek.id);
      }
    } catch (err: any) {
      showToast(`Failed to load HSM key brokerage data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterRingId, filterDekStatus, genTargetRingId, sandboxDekId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Keyring
  const handleCreateRing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.createHsmKeyRing({
        ring_name: newRingName,
        provider_type: newProviderType,
        hsm_partition_id: newPartitionId,
        master_key_alias: newMasterAlias,
        rotation_interval_days: Number(newRotationDays),
      });
      showToast('HSM Root Keyring provisioned successfully', 'success');
      setShowCreateRingModal(false);
      loadData();
    } catch (err: any) {
      showToast(`Failed to provision keyring: ${err.message}`, 'error');
    }
  };

  // Handle Rotate KEK
  const handleRotateKek = async () => {
    if (!rotatingRing) return;
    setRotating(true);
    try {
      const res = await api.adminOps.rotateHsmRootKek(rotatingRing.id);
      showToast(res.message, 'success');
      setRotatingRing(null);
      loadData();
    } catch (err: any) {
      showToast(`KEK rotation failed: ${err.message}`, 'error');
    } finally {
      setRotating(false);
    }
  };

  // Handle Generate DEK
  const handleGenerateDek = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminOps.generateEnvelopeDek({
        key_ring_id: genTargetRingId,
        key_label: genDekLabel,
        intended_purpose: genPurpose,
        expires_in_days: Number(genExpiresDays),
      });
      showToast('New Envelope Data Encryption Key (DEK) wrapped and issued', 'success');
      setShowGenerateDekModal(false);
      loadData();
    } catch (err: any) {
      showToast(`Failed to generate DEK: ${err.message}`, 'error');
    }
  };

  // Handle Crypto Shredding
  const handleCryptoShred = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shreddingDek) return;
    if (shredConfirmText !== 'PERMANENTLY SHRED') {
      showToast('Type "PERMANENTLY SHRED" to confirm cryptographic erasure', 'error');
      return;
    }

    try {
      const res = await api.adminOps.cryptoShredDek(shreddingDek.id, {
        reason: shredReason,
        confirmation: true,
      });
      showToast(res.message, 'success');
      setShreddingDek(null);
      setShredConfirmText('');
      loadData();
    } catch (err: any) {
      showToast(`Cryptographic shredding failed: ${err.message}`, 'error');
    }
  };

  // Handle Sandbox Encrypt
  const handleSandboxEncrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxDekId) return;
    setEncrypting(true);
    setDecryptResult(null);
    try {
      const res = await api.adminOps.envelopeEncrypt({
        dek_id: sandboxDekId,
        plaintext: sandboxPlaintext,
        additional_authenticated_data: sandboxAad || undefined,
      });
      setEncryptResult(res);
      showToast('Plaintext envelope encrypted with AES-256-GCM', 'success');
      loadData();
    } catch (err: any) {
      showToast(`Encryption failed: ${err.message}`, 'error');
    } finally {
      setEncrypting(false);
    }
  };

  // Handle Sandbox Decrypt
  const handleSandboxDecrypt = async () => {
    if (!encryptResult) return;
    setDecrypting(true);
    try {
      const res = await api.adminOps.envelopeDecrypt({
        dek_id: encryptResult.dek_id,
        ciphertext_base64: encryptResult.ciphertext_base64,
        iv_base64: encryptResult.iv_base64,
        auth_tag_base64: encryptResult.auth_tag_base64,
        additional_authenticated_data: sandboxAad || undefined,
      });
      setDecryptResult(res);
      showToast('Ciphertext decrypted and auth tag verified in-memory', 'success');
      loadData();
    } catch (err: any) {
      showToast(`Decryption failed: ${err.message}`, 'error');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
            <span style={{ display: 'inline-flex', color: '#10b981' }}>
              <KeyRound size={26} />
            </span>
            Cryptographic Hardware Security Module (HSM) Key Brokerage & Envelope Encryption
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Cloud HSM Keyrings, AES-256-GCM Envelope Encryption, Zero-Plaintext Exposure & GDPR Irreversible Cryptographic Shredding
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
            onClick={() => setShowCreateRingModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#047857',
              color: '#f8fafc',
              border: '1px solid #10b981',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <Cpu size={14} />
            </span>
            + Provision HSM Keyring
          </button>
          <button
            onClick={() => setShowGenerateDekModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0f766e',
              color: '#f8fafc',
              border: '1px solid #14b8a6',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <FileKey size={14} />
            </span>
            + Generate Envelope DEK
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Active Keyrings */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Root HSM Keyrings
            </span>
            <span style={{ display: 'inline-flex', color: '#10b981' }}>
              <Cpu size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.total_key_rings ?? '--'} Rings
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>FIPS 140-2 Level 3</span>
            <span>• Multi-cloud Broker</span>
          </div>
        </div>

        {/* KPI 2: Active DEKs */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Managed Envelope DEKs
            </span>
            <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
              <KeyRound size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.active_deks ?? '--'} Keys
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>AES-256-GCM Wrapped</span>
            <span>• Time-bounded</span>
          </div>
        </div>

        {/* KPI 3: 24h Crypto Ops */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              24h Cryptographic Ops
            </span>
            <span style={{ display: 'inline-flex', color: '#a855f7' }}>
              <Zap size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.crypto_ops_24h ?? '--'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: (telemetry?.shredded_deks ?? 0) > 0 ? '#ef4444' : '#34d399', fontWeight: 600 }}>
              {telemetry?.shredded_deks ?? 0} Shredded
            </span>
            <span>• Sub-5ms latency</span>
          </div>
        </div>

        {/* KPI 4: Zero-Plaintext Security Posture */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Zero-Plaintext Invariant
            </span>
            <span style={{ display: 'inline-flex', color: '#34d399' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem', textTransform: 'capitalize' }}>
            {telemetry?.zero_plaintext_guarantee.replace('_', ' ') ?? 'Hardware'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>Enclave Protected</span>
            <span>• No disk persistence</span>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', gap: '1rem' }}>
        <button
          onClick={() => setSubTab('keyrings')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'keyrings' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'keyrings' ? '#10b981' : '#94a3b8',
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
            <Cpu size={16} />
          </span>
          Root Keyrings & Partitions ({keyRings.length})
        </button>
        <button
          onClick={() => setSubTab('deks')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'deks' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'deks' ? '#10b981' : '#94a3b8',
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
          Envelope DEK Ledger ({deks.length})
        </button>
        <button
          onClick={() => setSubTab('sandbox')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'sandbox' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'sandbox' ? '#10b981' : '#94a3b8',
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
            <Binary size={16} />
          </span>
          Envelope Cryptography Sandbox
        </button>
        <button
          onClick={() => setSubTab('audit')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'audit' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'audit' ? '#10b981' : '#94a3b8',
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
            <Clock size={16} />
          </span>
          Cryptographic Audit & Shredding Log ({cryptoLogs.length})
        </button>
      </div>

      {/* SUBTAB 1: Root Keyrings & Partitions */}
      {subTab === 'keyrings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Keyring Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Provider</th>
                  <th style={{ padding: '0.75rem 1rem' }}>HSM Partition ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Master Key Alias</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Algorithm</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Rotation</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keyRings.map((ring) => (
                  <tr key={ring.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      {ring.ring_name}
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{ring.id}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background:
                            ring.provider_type === 'aws_cloudhsm'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : ring.provider_type === 'gcp_cloud_hsm'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(16, 185, 129, 0.2)',
                          color:
                            ring.provider_type === 'aws_cloudhsm'
                              ? '#fbbf24'
                              : ring.provider_type === 'gcp_cloud_hsm'
                              ? '#60a5fa'
                              : '#34d399',
                        }}
                      >
                        {ring.provider_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.8rem' }}>
                      {ring.hsm_partition_id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.8rem' }}>
                      {ring.master_key_alias}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', textTransform: 'uppercase' }}>
                      {ring.algorithm.replace(/_/g, '-')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                      Every {ring.rotation_interval_days}d
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: ring.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: ring.is_active ? '#4ade80' : '#f87171',
                        }}
                      >
                        {ring.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setRotatingRing(ring)}
                        style={{
                          background: '#1e293b',
                          color: '#38bdf8',
                          border: '1px solid #0284c7',
                          borderRadius: '4px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Rotate KEK
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Envelope DEK Ledger */}
      {subTab === 'deks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filter Keyring:</span>
              <select
                value={filterRingId}
                onChange={(e) => setFilterRingId(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.85rem',
                }}
              >
                <option value="all">All Keyrings</option>
                {keyRings.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ring_name}
                  </option>
                ))}
              </select>

              <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '0.5rem' }}>Status:</span>
              <select
                value={filterDekStatus}
                onChange={(e) => setFilterDekStatus(e.target.value)}
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
                <option value="active">Active Only</option>
                <option value="shredded">Shredded</option>
                <option value="rotated">Rotated</option>
              </select>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Showing {deks.length} data encryption keys
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>DEK Label & ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Parent Keyring</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Purpose</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Wrapped Ciphertext (Encrypted)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Version</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deks.map((dek) => (
                  <tr key={dek.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      {dek.key_label}
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>{dek.id}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {dek.key_ring_id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                        }}
                      >
                        {dek.intended_purpose.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#64748b', fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dek.encrypted_dek_ciphertext.slice(0, 24)}...
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      v{dek.version}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background:
                            dek.status === 'active'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : dek.status === 'shredded'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(245, 158, 11, 0.2)',
                          color:
                            dek.status === 'active'
                              ? '#4ade80'
                              : dek.status === 'shredded'
                              ? '#f87171'
                              : '#fbbf24',
                        }}
                      >
                        {dek.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {dek.status === 'active' ? (
                        <button
                          onClick={() => setShreddingDek(dek)}
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
                          Crypto-Shred
                        </button>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>Unrecoverable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Envelope Cryptography Sandbox */}
      {subTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Encryption Panel */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', color: '#10b981' }}>
                <Lock size={20} />
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                In-Memory Envelope Encryption Sandbox
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Zero-Plaintext Guarantee: Plaintext is encrypted in-memory using an ephemeral unwrap of the selected DEK. Raw keys are never written to disk.
            </p>

            <form onSubmit={handleSandboxEncrypt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Select Active DEK
                </label>
                <select
                  value={sandboxDekId}
                  onChange={(e) => setSandboxDekId(e.target.value)}
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
                  {deks
                    .filter((d) => d.status === 'active')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.key_label} ({d.id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Plaintext Data String
                </label>
                <textarea
                  rows={3}
                  value={sandboxPlaintext}
                  onChange={(e) => setSandboxPlaintext(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Additional Authenticated Data (AAD)
                </label>
                <input
                  type="text"
                  value={sandboxAad}
                  onChange={(e) => setSandboxAad(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={encrypting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: '#059669',
                  color: '#f8fafc',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: encrypting ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <Lock size={16} />
                </span>
                {encrypting ? 'Encrypting...' : 'Envelope Encrypt (AES-256-GCM)'}
              </button>
            </form>
          </div>

          {/* Decryption & Verification Panel */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
                <Unlock size={20} />
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Decryption & Cryptographic Proof Verification
              </h3>
            </div>

            {encryptResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ciphertext (Base64):</span>
                  <div style={{ background: '#0f172a', padding: '0.5rem', borderRadius: '4px', color: '#10b981', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                    {encryptResult.ciphertext_base64}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>IV (Base64):</span>
                    <div style={{ background: '#0f172a', padding: '0.4rem', borderRadius: '4px', color: '#cbd5e1', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                      {encryptResult.iv_base64}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Auth Tag:</span>
                    <div style={{ background: '#0f172a', padding: '0.4rem', borderRadius: '4px', color: '#cbd5e1', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                      {encryptResult.auth_tag_base64}
                    </div>
                  </div>
                </div>

                <div>
                  <span style={{ color: '#94a3b8' }}>SHA-256 Proof:</span>
                  <div style={{ background: '#0f172a', padding: '0.4rem', borderRadius: '4px', color: '#a855f7', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    {encryptResult.sha256_proof}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSandboxDecrypt}
                  disabled={decrypting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: '#0284c7',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: decrypting ? 'not-allowed' : 'pointer',
                    marginTop: '0.5rem',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}>
                    <Unlock size={16} />
                  </span>
                  {decrypting ? 'Decrypting...' : 'Verify Auth Tag & Decrypt'}
                </button>

                {decryptResult && (
                  <div style={{ marginTop: '0.5rem', background: '#0f172a', border: '1px solid #10b981', borderRadius: '6px', padding: '0.75rem' }}>
                    <div style={{ color: '#34d399', fontWeight: 600, marginBottom: '0.25rem' }}>
                      ✓ Decryption Verified Successfully:
                    </div>
                    <div style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{decryptResult.plaintext}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                Run an envelope encryption operation on the left panel to generate cryptographic ciphertext and verification proofs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: Cryptographic Audit & Shredding Log */}
      {subTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Operation</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Key ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Operator</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>SHA-256 Proof</th>
                </tr>
              </thead>
              <tbody>
                {cryptoLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background:
                            log.operation.includes('shred')
                              ? 'rgba(239, 68, 68, 0.2)'
                              : log.operation.includes('encrypt')
                              ? 'rgba(16, 185, 129, 0.2)'
                              : log.operation.includes('decrypt')
                              ? 'rgba(56, 189, 248, 0.2)'
                              : 'rgba(168, 85, 247, 0.2)',
                          color:
                            log.operation.includes('shred')
                              ? '#f87171'
                              : log.operation.includes('encrypt')
                              ? '#34d399'
                              : log.operation.includes('decrypt')
                              ? '#38bdf8'
                              : '#c084fc',
                        }}
                      >
                        {log.operation.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#f8fafc', fontSize: '0.8rem' }}>
                      {log.key_id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                      {log.operator_email}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: log.status === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: log.status === 'success' ? '#4ade80' : '#f87171',
                        }}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                      {log.duration_ms}ms
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#a855f7', fontSize: '0.75rem' }}>
                      {log.sha256_proof.slice(0, 20)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Provision HSM Keyring */}
      {showCreateRingModal && (
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
                <span style={{ display: 'inline-flex', color: '#10b981' }}>
                  <Cpu size={18} />
                </span>
                Provision HSM Root Keyring
              </h3>
              <button
                onClick={() => setShowCreateRingModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={18} />
                </span>
              </button>
            </div>

            <form onSubmit={handleCreateRing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Keyring Name
                </label>
                <input
                  type="text"
                  value={newRingName}
                  onChange={(e) => setNewRingName(e.target.value)}
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
                  HSM Provider Type
                </label>
                <select
                  value={newProviderType}
                  onChange={(e) => setNewProviderType(e.target.value as HsmProviderType)}
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
                  <option value="aws_cloudhsm">AWS CloudHSM</option>
                  <option value="gcp_cloud_hsm">GCP Cloud HSM</option>
                  <option value="azure_dedicated_hsm">Azure Dedicated HSM</option>
                  <option value="hashicorp_vault_transit">HashiCorp Vault Transit Engine</option>
                  <option value="local_pkcs11">Hardware PKCS#11 Enclave</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  HSM Partition / Cluster ID
                </label>
                <input
                  type="text"
                  value={newPartitionId}
                  onChange={(e) => setNewPartitionId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Master Key Alias (Root KEK)
                </label>
                <input
                  type="text"
                  value={newMasterAlias}
                  onChange={(e) => setNewMasterAlias(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateRingModal(false)}
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
                    background: '#047857',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Provision Keyring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generate Envelope DEK */}
      {showGenerateDekModal && (
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
                <span style={{ display: 'inline-flex', color: '#10b981' }}>
                  <FileKey size={18} />
                </span>
                Generate & Wrap Envelope DEK
              </h3>
              <button
                onClick={() => setShowGenerateDekModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={18} />
                </span>
              </button>
            </div>

            <form onSubmit={handleGenerateDek} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Target HSM Keyring
                </label>
                <select
                  value={genTargetRingId}
                  onChange={(e) => setGenTargetRingId(e.target.value)}
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
                  {keyRings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.ring_name} ({r.provider_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  DEK Label
                </label>
                <input
                  type="text"
                  value={genDekLabel}
                  onChange={(e) => setGenDekLabel(e.target.value)}
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
                  Intended Purpose
                </label>
                <select
                  value={genPurpose}
                  onChange={(e) => setGenPurpose(e.target.value as DekPurpose)}
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
                  <option value="tenant_pii_envelope">Tenant PII Column Envelope</option>
                  <option value="oauth_secrets_envelope">Social Provider OAuth Secrets</option>
                  <option value="audit_ledger_hmac">Audit Ledger Cryptographic HMAC</option>
                  <option value="media_vault_envelope">Media Vault Binary Envelope</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min={30}
                  max={730}
                  value={genExpiresDays}
                  onChange={(e) => setGenExpiresDays(Number(e.target.value))}
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
                  onClick={() => setShowGenerateDekModal(false)}
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
                    background: '#0f766e',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rotate Root KEK */}
      {rotatingRing && (
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
                <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
                  <RotateCcw size={18} />
                </span>
                Rotate Root Key Encryption Key (KEK)
              </h3>
              <button
                onClick={() => setRotatingRing(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={18} />
                </span>
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div>Keyring: <strong>{rotatingRing.ring_name}</strong></div>
              <div>Current Master Alias: <code style={{ color: '#38bdf8' }}>{rotatingRing.master_key_alias}</code></div>
              <div style={{ marginTop: '0.5rem', color: '#f59e0b' }}>
                Rotating the root KEK creates a new version in the HSM and automatically re-wraps all active DEKs under the updated master key without service downtime.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRotatingRing(null)}
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
                onClick={handleRotateKek}
                disabled={rotating}
                style={{
                  background: '#0284c7',
                  color: '#f8fafc',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: rotating ? 'not-allowed' : 'pointer',
                }}
              >
                {rotating ? 'Rotating & Re-wrapping...' : 'Confirm KEK Rotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Crypto Shredding */}
      {shreddingDek && (
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
              border: '1px solid #ef4444',
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
                <span style={{ display: 'inline-flex', color: '#ef4444' }}>
                  <Flame size={18} />
                </span>
                Irreversible Cryptographic Shredding
              </h3>
              <button
                onClick={() => {
                  setShreddingDek(null);
                  setShredConfirmText('');
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={18} />
                </span>
              </button>
            </div>

            <div style={{ background: '#450a0a', border: '1px solid #b91c1c', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#fca5a5' }}>
              <strong>DANGER:</strong> Cryptographically shredding this DEK permanently destroys the wrapped key material. All historical ciphertext encrypted with this key will become <strong>permanently and mathematically unrecoverable</strong>.
            </div>

            <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div>Target Key: <strong>{shreddingDek.key_label}</strong></div>
              <div>DEK ID: <code style={{ color: '#ef4444' }}>{shreddingDek.id}</code></div>
              <div>Purpose: <strong>{shreddingDek.intended_purpose}</strong></div>
            </div>

            <form onSubmit={handleCryptoShred} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Erasure Justification / Legal Context
                </label>
                <input
                  type="text"
                  value={shredReason}
                  onChange={(e) => setShredReason(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#f87171', marginBottom: '0.3rem' }}>
                  Type "PERMANENTLY SHRED" to confirm:
                </label>
                <input
                  type="text"
                  value={shredConfirmText}
                  onChange={(e) => setShredConfirmText(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShreddingDek(null);
                    setShredConfirmText('');
                  }}
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
                  disabled={shredConfirmText !== 'PERMANENTLY SHRED'}
                  style={{
                    background: shredConfirmText === 'PERMANENTLY SHRED' ? '#dc2626' : '#7f1d1d',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: shredConfirmText === 'PERMANENTLY SHRED' ? 'pointer' : 'not-allowed',
                  }}
                >
                  Execute Cryptographic Shredding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
