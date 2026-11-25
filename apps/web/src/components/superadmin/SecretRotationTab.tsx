/**
 * Enterprise Zero-Trust Secret Rotation, Confidential Computing & Key Management Mesh Tab
 * HoaspForge Platform v5.4.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  KeyRound,
  RotateCw,
  AlertOctagon,
  Lock,
  Activity,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Server,
  Layers,
  ChevronRight,
  ShieldAlert,
  Play,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  SecretVaultKey,
  SecretKeyVersion,
  SecretRotationTelemetry,
  EnvelopeReEncryptSimulationResult,
  SecretType,
  VaultProvider,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'keys' | 'versions' | 'audits' | 'simulator';

export const SecretRotationTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('keys');

  // Telemetry
  const [telemetry, setTelemetry] = useState<SecretRotationTelemetry | null>(null);

  // Vault Keys
  const [keys, setKeys] = useState<SecretVaultKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<SecretVaultKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rotatingKey, setRotatingKey] = useState<SecretVaultKey | null>(null);
  const [revokingKey, setRevokingKey] = useState<SecretVaultKey | null>(null);
  const [revokeReason, setRevokeReason] = useState('Emergency secret compromise containment triggered by security admin');

  // Create Form State
  const [createForm, setCreateForm] = useState<{
    key_alias: string;
    key_type: SecretType;
    vault_provider: VaultProvider;
    rotation_interval_days: number;
    grace_period_hours: number;
    auto_rotate_enabled: boolean;
    algorithm: string;
  }>({
    key_alias: '',
    key_type: 'encryption_dek',
    vault_provider: 'internal_aes256_gcm',
    rotation_interval_days: 90,
    grace_period_hours: 72,
    auto_rotate_enabled: true,
    algorithm: 'aes-256-gcm',
  });

  // Simulator State
  const [simKeyAlias, setSimKeyAlias] = useState('master-field-encryption-dek');
  const [simRecordCount, setSimRecordCount] = useState(15000);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<EnvelopeReEncryptSimulationResult | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, keysRes] = await Promise.all([
        api.adminOps.getSecretRotationTelemetry(),
        api.adminOps.listSecretVaultKeys(),
      ]);
      setTelemetry(telRes);
      setKeys(keysRes);
      if (keysRes.length > 0 && !selectedKey) {
        // Automatically fetch full details for first key
        const detail = await api.adminOps.getSecretVaultKey(keysRes[0].id);
        setSelectedKey(detail);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load secret rotation data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectKey = async (key: SecretVaultKey) => {
    try {
      const detail = await api.adminOps.getSecretVaultKey(key.id);
      setSelectedKey(detail);
      setSubTab('versions');
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch key details', 'error');
    }
  };

  // Create Key Handler
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.key_alias.trim()) {
      showToast('Key alias is required', 'error');
      return;
    }
    try {
      const created = await api.adminOps.createSecretVaultKey(createForm);
      showToast(`Secret Vault Key '${created.key_alias}' provisioned successfully`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        key_alias: '',
        key_type: 'encryption_dek',
        vault_provider: 'internal_aes256_gcm',
        rotation_interval_days: 90,
        grace_period_hours: 72,
        auto_rotate_enabled: true,
        algorithm: 'aes-256-gcm',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to provision key', 'error');
    }
  };

  // Rotate Key Handler
  const handleRotateKey = async () => {
    if (!rotatingKey) return;
    try {
      const res = await api.adminOps.rotateSecretVaultKey(rotatingKey.id, {
        trigger: 'manual_operator',
      });
      showToast(`Key '${res.key.key_alias}' rotated to version ${res.newVersion.version_number}`, 'success');
      setRotatingKey(null);
      if (selectedKey?.id === rotatingKey.id) {
        setSelectedKey(res.key);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate key', 'error');
    }
  };

  // Revoke Key Handler
  const handleRevokeKey = async () => {
    if (!revokingKey) return;
    if (!revokeReason.trim() || revokeReason.trim().length < 8) {
      showToast('Revocation reason must be at least 8 characters', 'error');
      return;
    }
    try {
      const res = await api.adminOps.revokeSecretVaultKey(revokingKey.id, revokeReason);
      showToast(`Key '${res.key_alias}' has been revoked immediately`, 'success');
      setRevokingKey(null);
      if (selectedKey?.id === revokingKey.id) {
        setSelectedKey(res);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke key', 'error');
    }
  };

  // Run Simulation
  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateEnvelopeReEncrypt({
        key_alias: simKeyAlias,
        target_record_count: simRecordCount,
      });
      setSimResult(res);
      showToast('Envelope re-encryption simulation completed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // Filtered keys
  const filteredKeys = keys.filter((k) => {
    if (searchQuery && !k.key_alias.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (providerFilter && k.vault_provider !== providerFilter) {
      return false;
    }
    if (statusFilter && k.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="tab-secret_rotation">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <KeyRound className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Zero-Trust Secret Rotation & KMS Mesh
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Phase 36 • v5.4.0
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Automated multi-version cryptographic key rotation, envelope DEK re-wrapping, and confidential computing mesh.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Provision Vault Key
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Security Posture Score */}
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Security Posture</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {telemetry?.securityPostureScore ?? '--'}
            </span>
            <span className="text-sm text-slate-400">/ 100</span>
          </div>
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {(telemetry?.securityPostureScore ?? 0) >= 90 ? 'Optimal Zero-Trust Compliance' : 'Review Expiring Keys'}
          </p>
        </div>

        {/* Card 2: Active Keys */}
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Vault Keys</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {telemetry?.activeKeys ?? '--'}
            </span>
            <span className="text-sm text-slate-400">/ {telemetry?.totalKeys ?? '--'} registered</span>
          </div>
          <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
            <Server className="w-3.5 h-3.5" />
            Across AWS KMS, Vault & Internal AES
          </p>
        </div>

        {/* Card 3: Expiring / Rotation Due */}
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rotation Due (&lt;14d)</span>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {telemetry?.expiringSoonCount ?? 0}
            </span>
            <span className="text-sm text-slate-400">keys scheduled</span>
          </div>
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <RotateCw className="w-3.5 h-3.5" />
            Avg rotation cycle: {telemetry?.averageRotationAgeDays ?? 45} days
          </p>
        </div>

        {/* Card 4: Cryptographic Operations */}
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">KMS Audit Ledger</span>
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {telemetry?.totalAccessOperations ?? '--'}
            </span>
            <span className="text-sm text-slate-400">logged ops</span>
          </div>
          <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            {telemetry?.compromisedOrRevokedCount ?? 0} revoked keys
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('keys')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            subTab === 'keys'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          id="subtab-vault-keys"
        >
          <KeyRound className="w-4 h-4" />
          Vault Keys & Secret Catalog ({filteredKeys.length})
        </button>

        <button
          onClick={() => setSubTab('versions')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            subTab === 'versions'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          id="subtab-key-versions"
        >
          <Layers className="w-4 h-4" />
          Key Versions & Envelope Lineage {selectedKey ? `(${selectedKey.key_alias})` : ''}
        </button>

        <button
          onClick={() => setSubTab('audits')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            subTab === 'audits'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          id="subtab-access-audits"
        >
          <Activity className="w-4 h-4" />
          Access & Decryption Stream
        </button>

        <button
          onClick={() => setSubTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            subTab === 'simulator'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          id="subtab-envelope-simulator"
        >
          <Zap className="w-4 h-4" />
          Envelope Re-Encryption Simulator
        </button>
      </div>

      {/* Subtab 1: Vault Keys & Secret Catalog */}
      {subTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search keys by alias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Vault Providers</option>
                <option value="internal_aes256_gcm">Internal AES-256-GCM</option>
                <option value="aws_kms">AWS KMS</option>
                <option value="hashicorp_vault">HashiCorp Vault</option>
                <option value="azure_key_vault">Azure Key Vault</option>
                <option value="gcp_kms">GCP KMS</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="rotating">Rotating</option>
                <option value="deprecated">Deprecated</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Key Alias & Type</th>
                    <th className="py-3.5 px-4">Provider</th>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4">Rotation Schedule</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No vault keys found matching filter criteria
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-2">
                            <Lock className="w-4 h-4 text-emerald-400" />
                            {k.key_alias}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {k.key_type} • ID: {k.id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                            {k.vault_provider}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                            v{k.current_version}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-300">
                            Every {k.rotation_interval_days} days
                          </div>
                          <div className="text-xs text-slate-500">
                            Due: {k.next_rotation_due ? new Date(k.next_rotation_due).toLocaleDateString() : 'Manual'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              k.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : k.status === 'revoked'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {k.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSelectKey(k)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                              title="Inspect Versions"
                            >
                              Lineage
                            </button>
                            <button
                              onClick={() => setRotatingKey(k)}
                              disabled={k.status === 'revoked'}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                              title="Rotate Key to Next Version"
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => setRevokingKey(k)}
                              disabled={k.status === 'revoked'}
                              className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                              title="Emergency Revocation"
                            >
                              Revoke
                            </button>
                          </div>
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

      {/* Subtab 2: Key Versions & Envelope Lineage */}
      {subTab === 'versions' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Lineage & Versions: {selectedKey?.key_alias || 'Select a key'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current active version: v{selectedKey?.current_version} • Provider: {selectedKey?.vault_provider}
              </p>
            </div>
            {selectedKey && (
              <button
                onClick={() => setRotatingKey(selectedKey)}
                disabled={selectedKey.status === 'revoked'}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate to v{selectedKey.current_version + 1}
              </button>
            )}
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4">Algorithm & Fingerprint</th>
                    <th className="py-3.5 px-4">Trigger</th>
                    <th className="py-3.5 px-4">Activated At</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!selectedKey?.versions || selectedKey.versions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No version history available for this key
                      </td>
                    </tr>
                  ) : (
                    selectedKey.versions.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-xs">
                            v{v.version_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-slate-200">{v.algorithm}</div>
                          <div className="text-xs font-mono text-slate-500 mt-0.5 truncate max-w-xs">
                            SHA256: {v.key_fingerprint.slice(0, 16)}...{v.key_fingerprint.slice(-8)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-300">
                          {v.rotation_trigger}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {new Date(v.activated_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              v.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : v.status === 'grace_period'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : v.status === 'revoked'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {v.status.toUpperCase()}
                          </span>
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

      {/* Subtab 3: Access & Decryption Stream */}
      {subTab === 'audits' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Cryptographic Key Access Stream
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero-trust audit trail of encryption, decryption, and rotation operations dispatched by microservices.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm space-y-3">
            {telemetry?.recentRotations.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {r.keyAlias} (Version {r.versionNumber})
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Trigger: {r.trigger} • Log ID: {r.id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    SUCCESS
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 4: Envelope Re-Encryption Simulator */}
      {subTab === 'simulator' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              In-Memory Envelope Re-Encryption Simulation Sandbox
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Simulate high-volume DEK envelope re-wrapping across database records without mutating live production data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                  Target DEK Key Alias
                </label>
                <select
                  value={simKeyAlias}
                  onChange={(e) => setSimKeyAlias(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="master-field-encryption-dek">master-field-encryption-dek (AWS KMS v4)</option>
                  <option value="meta-graph-api-oauth">meta-graph-api-oauth (Internal AES-256 v2)</option>
                  <option value="jwt-session-signer">jwt-session-signer (HMAC-SHA256 v3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                  Simulated Record Volume
                </label>
                <input
                  type="number"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={simRecordCount}
                  onChange={(e) => setSimRecordCount(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                {simLoading ? 'Simulating Re-Encryption...' : 'Run Envelope Simulation'}
              </button>
            </div>
          </div>

          {simResult && (
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Simulation Verified
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Simulated in {simResult.simulatedDurationMs}ms
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <div className="text-xs text-slate-400">Records Re-Encrypted</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {simResult.reEncryptedRecordCount.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <div className="text-xs text-slate-400">Target Envelope DEK</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    v{simResult.currentVersion}
                  </div>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <div className="text-xs text-slate-400">Data Integrity Checksum</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {simResult.dataIntegrityChecksumMatch ? '100% MATCH' : 'MISMATCH'}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Architecture & Quota Recommendations
                </h4>
                <ul className="space-y-2">
                  {simResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Provision Vault Key */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="modal-create-vault-key">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              Provision Secret Vault Key
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Initializes a master secret or encryption DEK with automated version tracking.
            </p>

            <form onSubmit={handleCreateKey} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                  Key Alias (Unique)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. stripe-webhook-secret-dek"
                  value={createForm.key_alias}
                  onChange={(e) => setCreateForm({ ...createForm, key_alias: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Secret Type
                  </label>
                  <select
                    value={createForm.key_type}
                    onChange={(e) => setCreateForm({ ...createForm, key_type: e.target.value as SecretType })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="encryption_dek">Encryption DEK</option>
                    <option value="api_credential">API Credential</option>
                    <option value="database_password">Database Password</option>
                    <option value="jwt_signing_key">JWT Signing Key</option>
                    <option value="webhook_signing_secret">Webhook HMAC Secret</option>
                    <option value="oauth_client_secret">OAuth Client Secret</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Vault Provider
                  </label>
                  <select
                    value={createForm.vault_provider}
                    onChange={(e) => setCreateForm({ ...createForm, vault_provider: e.target.value as VaultProvider })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="internal_aes256_gcm">Internal AES-256-GCM</option>
                    <option value="aws_kms">AWS KMS</option>
                    <option value="hashicorp_vault">HashiCorp Vault</option>
                    <option value="azure_key_vault">Azure Key Vault</option>
                    <option value="gcp_kms">GCP KMS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Rotation Interval (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={createForm.rotation_interval_days}
                    onChange={(e) => setCreateForm({ ...createForm, rotation_interval_days: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                    Grace Period (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={createForm.grace_period_hours}
                    onChange={(e) => setCreateForm({ ...createForm, grace_period_hours: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auto_rotate"
                  checked={createForm.auto_rotate_enabled}
                  onChange={(e) => setCreateForm({ ...createForm, auto_rotate_enabled: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="auto_rotate" className="text-xs text-slate-300">
                  Enable automated background rotation on expiry
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
                >
                  Provision Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Rotate Secret Key */}
      {rotatingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="modal-rotate-vault-key">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-emerald-400" />
              Rotate Secret Key
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Creates a new active version and places the previous version in grace period.
            </p>

            <div className="mt-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-2">
              <div className="text-xs text-slate-400">Target Key Alias:</div>
              <div className="text-sm font-bold text-white">{rotatingKey.key_alias}</div>
              <div className="text-xs text-slate-400 mt-2">
                Version Progression: <span className="text-slate-300 font-bold">v{rotatingKey.current_version}</span>{' '}
                &rarr; <span className="text-emerald-400 font-bold">v{rotatingKey.current_version + 1}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRotatingKey(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateKey}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
              >
                Authorize Rotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Emergency Revoke Key */}
      {revokingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="modal-revoke-vault-key">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 text-red-400">
              <span className="p-2 bg-red-500/10 rounded-xl">
                <AlertOctagon className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Emergency Key Revocation</h3>
                <p className="text-xs text-red-400">Immediate containment procedure</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-200">
              <strong className="block mb-1">WARNING: High Impact Security Action</strong>
              Revoking <span className="font-mono font-bold text-white">'{revokingKey.key_alias}'</span> will immediately invalidate all active versions. Any service requesting decryption will fail immediately.
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
                Revocation Security Rationale (&ge;8 chars)
              </label>
              <textarea
                rows={3}
                required
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Explain the security event requiring immediate key revocation..."
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevokingKey(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKey}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-colors"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
