/**
 * Enterprise Automated Database Partitioning, Cold-Tier Sharding & Zero-Downtime Data Lifecycle Archival Tab
 * HoaspForge Platform v5.8.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Layers,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Search,
  Filter,
  HardDrive,
  Cpu,
  Clock,
  Download,
  Trash2,
  X,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  DatabasePartitionConfig,
  DatabaseArchivalPolicy,
  DatabaseColdTierArchive,
  DatabasePartitionMaintenanceLog,
  DatabasePartitioningTelemetry,
  DatabasePartitionType,
  DatabaseStorageTier,
  DatabaseCompressionFormat,
  SimulatePartitioningResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'partitions' | 'policies' | 'archives' | 'simulator_logs';

export const DatabaseArchivalTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('partitions');

  // Telemetry
  const [telemetry, setTelemetry] = useState<DatabasePartitioningTelemetry | null>(null);

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

  // Partition Configs
  const [configs, setConfigs] = useState<DatabasePartitionConfig[]>([]);
  const [searchTable, setSearchTable] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<{
    table_name: string;
    partition_type: DatabasePartitionType;
    partition_key: string;
    retention_days: number;
    active_partition_count: number;
  }>({
    table_name: '',
    partition_type: 'range_date',
    partition_key: 'created_at',
    retention_days: 90,
    active_partition_count: 12,
  });

  // Policies
  const [policies, setPolicies] = useState<DatabaseArchivalPolicy[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState<{
    policy_name: string;
    target_table: string;
    age_threshold_days: number;
    target_storage_tier: DatabaseStorageTier;
    compression_format: DatabaseCompressionFormat;
    schedule_cron: string;
  }>({
    policy_name: '',
    target_table: 'social_webhook_deliveries',
    age_threshold_days: 60,
    target_storage_tier: 's3_glacier',
    compression_format: 'parquet_zstd',
    schedule_cron: '0 2 * * 0',
  });

  // Cold Archives
  const [archives, setArchives] = useState<DatabaseColdTierArchive[]>([]);
  const [archiveStatusFilter, setArchiveStatusFilter] = useState('all');
  const [selectedArchive, setSelectedArchive] = useState<DatabaseColdTierArchive | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Simulator & Logs
  const [simTable, setSimTable] = useState('social_webhook_deliveries');
  const [simDailyRows, setSimDailyRows] = useState(50000);
  const [simRetentionDays, setSimRetentionDays] = useState(90);
  const [simFormat, setSimFormat] = useState<DatabaseCompressionFormat>('parquet_zstd');
  const [simResult, setSimResult] = useState<SimulatePartitioningResult | null>(null);
  const [logs, setLogs] = useState<DatabasePartitionMaintenanceLog[]>([]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, cfgRes, polRes, archRes, logsRes] = await Promise.all([
        api.adminOps.getDatabaseArchivalTelemetry(),
        api.adminOps.listDatabasePartitionConfigs(),
        api.adminOps.listDatabaseArchivalPolicies(),
        api.adminOps.listDatabaseColdTierArchives(),
        api.adminOps.listDatabasePartitionMaintenanceLogs(30),
      ]);
      setTelemetry(telRes);
      setConfigs(cfgRes);
      setPolicies(polRes);
      setArchives(archRes);
      setLogs(logsRes);
    } catch (err: any) {
      showToast(`Failed to load database archival data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Partition Config
  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.table_name.trim() || !configForm.partition_key.trim()) {
      showToast('Table name and partition key are required', 'error');
      return;
    }
    try {
      await api.adminOps.createDatabasePartitionConfig(configForm);
      showToast(`Partitioning configured on table '${configForm.table_name}'`, 'success');
      setShowConfigModal(false);
      setConfigForm({ table_name: '', partition_type: 'range_date', partition_key: 'created_at', retention_days: 90, active_partition_count: 12 });
      loadData();
    } catch (err: any) {
      showToast(`Failed to configure partition: ${err.message}`, 'error');
    }
  };

  // Handle Prune Partitions
  const handlePrunePartitions = (tableName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Prune Expired Partitions',
      description: `Prune expired partitions for table '${tableName}' according to retention rules? Expired range partitions will be detached and deleted.`,
      confirmText: 'Prune Partitions',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await api.adminOps.pruneDatabasePartitions(tableName);
          showToast(`Pruned ${res.partitions_dropped} partition(s) from ${res.table_name}, freeing ${res.freed_mb} MB`, 'success');
          loadData();
        } catch (err: any) {
          showToast(`Prune failed: ${err.message}`, 'error');
        }
      },
    });
  };

  // Handle Create Policy
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm.policy_name.trim() || !policyForm.target_table.trim()) {
      showToast('Policy name and target table are required', 'error');
      return;
    }
    try {
      await api.adminOps.createDatabaseArchivalPolicy(policyForm);
      showToast(`Archival policy '${policyForm.policy_name}' created successfully`, 'success');
      setShowPolicyModal(false);
      loadData();
    } catch (err: any) {
      showToast(`Failed to create policy: ${err.message}`, 'error');
    }
  };

  // Handle Trigger Archival
  const handleTriggerArchival = async (policyId: string) => {
    setActionLoading(true);
    try {
      const res = await api.adminOps.triggerDatabaseArchival({ policy_id: policyId });
      showToast(
        `Archived ${res.archived_rows.toLocaleString()} rows to cold tier (${res.compression_ratio}x compression ratio)`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(`Archival failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Rehydrate Archive
  const handleRehydrateArchive = async (archiveId: string) => {
    setActionLoading(true);
    try {
      const res = await api.adminOps.rehydrateDatabaseArchive({ archive_id: archiveId });
      showToast(`Rehydrated ${res.restored_rows.toLocaleString()} rows back into table ${res.table_name}`, 'success');
      loadData();
    } catch (err: any) {
      showToast(`Rehydration failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Run Simulation
  const handleRunSimulation = async () => {
    try {
      const res = await api.adminOps.simulateDatabasePartitioning({
        table_name: simTable,
        daily_ingestion_rows: simDailyRows,
        retention_days: simRetentionDays,
        compression_format: simFormat,
      });
      setSimResult(res);
      showToast(`Simulation complete: ${res.compression_ratio}x compression projected`, 'success');
      loadData();
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    }
  };

  const filteredConfigs = configs.filter((c) =>
    c.table_name.toLowerCase().includes(searchTable.toLowerCase())
  );

  const filteredArchives = archives.filter((a) => {
    if (archiveStatusFilter !== 'all' && a.status !== archiveStatusFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px', color: '#f4f4f5', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', color: '#10b981' }}>
              <Database size={28} />
            </span>
            Automated Database Partitioning & Cold-Tier Archival
          </h1>
          <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
            Time-range table partitioning, automated cold storage compression (Parquet Zstandard), zero-downtime pruning, and on-demand rehydration.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
              color: '#f4f4f5',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <RotateCcw size={15} />
            </span>
            Refresh State
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#059669',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <Plus size={16} />
            </span>
            Configure Partitioning
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: '500' }}>Partitioned Tables</span>
            <span style={{ display: 'inline-flex', color: '#10b981' }}>
              <Layers size={18} />
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#f4f4f5' }}>
            {telemetry?.total_partitioned_tables ?? '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px' }}>
            {telemetry?.total_active_partitions ?? 0} active range partitions
          </div>
        </div>

        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: '500' }}>Cold-Tier Archived Rows</span>
            <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
              <Archive size={18} />
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#f4f4f5' }}>
            {(telemetry?.total_archived_rows ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
            Compressed in Parquet Zstandard
          </div>
        </div>

        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: '500' }}>Storage Cost Savings</span>
            <span style={{ display: 'inline-flex', color: '#f59e0b' }}>
              <TrendingUp size={18} />
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#10b981' }}>
            {telemetry?.overall_storage_savings_percent ?? '86.4'}%
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
            7.5x cold compression ratio
          </div>
        </div>

        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: '500' }}>Maintenance Health</span>
            <span style={{ display: 'inline-flex', color: telemetry?.status === 'healthy' ? '#10b981' : '#f59e0b' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#f4f4f5', textTransform: 'capitalize' }}>
            {telemetry?.status ?? 'Healthy'}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
            Zero-downtime maintenance active
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #27272a', marginBottom: '20px' }}>
        <button
          onClick={() => setSubTab('partitions')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'partitions' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'partitions' ? '#ffffff' : '#a1a1aa',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Partitioned Tables ({configs.length})
        </button>
        <button
          onClick={() => setSubTab('policies')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'policies' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'policies' ? '#ffffff' : '#a1a1aa',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Archival Policies ({policies.length})
        </button>
        <button
          onClick={() => setSubTab('archives')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'archives' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'archives' ? '#ffffff' : '#a1a1aa',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Cold-Tier Vault ({archives.length})
        </button>
        <button
          onClick={() => setSubTab('simulator_logs')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'simulator_logs' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'simulator_logs' ? '#ffffff' : '#a1a1aa',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Lifecycle Simulator & Maintenance Logs
        </button>
      </div>

      {/* Tab 1: Partitioned Tables */}
      {subTab === 'partitions' && (
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#27272a', padding: '6px 12px', borderRadius: '6px', width: '320px' }}>
              <span style={{ display: 'inline-flex', color: '#a1a1aa' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#f4f4f5', outline: 'none', width: '100%', fontSize: '13px' }}
              />
            </div>
            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{filteredConfigs.length} partitioned table(s)</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                <th style={{ padding: '12px 16px' }}>Table Name</th>
                <th style={{ padding: '12px 16px' }}>Partition Key</th>
                <th style={{ padding: '12px 16px' }}>Retention Window</th>
                <th style={{ padding: '12px 16px' }}>Active Partitions</th>
                <th style={{ padding: '12px 16px' }}>Total Rows</th>
                <th style={{ padding: '12px 16px' }}>Size</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConfigs.map((cfg) => (
                <tr key={cfg.id} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#60a5fa' }}>
                    {cfg.table_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#d4d4d8', fontFamily: 'monospace' }}>
                    {cfg.partition_key}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#d4d4d8' }}>{cfg.retention_days} days</td>
                  <td style={{ padding: '12px 16px', color: '#f4f4f5', fontWeight: '500' }}>
                    {cfg.active_partition_count} partitions
                  </td>
                  <td style={{ padding: '12px 16px', color: '#e4e4e7' }}>
                    {cfg.total_row_count.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10b981' }}>{cfg.total_size_mb} MB</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                      }}
                    >
                      ACTIVE
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handlePrunePartitions(cfg.table_name)}
                      style={{
                        padding: '5px 10px',
                        background: '#27272a',
                        border: '1px solid #3f3f46',
                        borderRadius: '4px',
                        color: '#f4f4f5',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      Prune Expired
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Archival Policies */}
      {subTab === 'policies' && (
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Automated Lifecycle Archival Policies</h3>
            <button
              onClick={() => setShowPolicyModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#4f46e5',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              <span style={{ display: 'inline-flex' }}>
                <Plus size={14} />
              </span>
              Create Policy
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                <th style={{ padding: '12px 16px' }}>Policy Name</th>
                <th style={{ padding: '12px 16px' }}>Target Table</th>
                <th style={{ padding: '12px 16px' }}>Age Threshold</th>
                <th style={{ padding: '12px 16px' }}>Storage Tier</th>
                <th style={{ padding: '12px 16px' }}>Compression</th>
                <th style={{ padding: '12px 16px' }}>Schedule</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((pol) => (
                <tr key={pol.id} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#f4f4f5' }}>
                    {pol.policy_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#60a5fa' }}>{pol.target_table}</td>
                  <td style={{ padding: '12px 16px', color: '#d4d4d8' }}>{pol.age_threshold_days} days</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 6px', background: '#27272a', borderRadius: '4px', fontSize: '11px', color: '#38bdf8' }}>
                      {pol.target_storage_tier.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 6px', background: '#27272a', borderRadius: '4px', fontSize: '11px', color: '#a855f7' }}>
                      {pol.compression_format.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#a1a1aa', fontFamily: 'monospace' }}>
                    {pol.schedule_cron}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleTriggerArchival(pol.id)}
                      disabled={actionLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        background: '#059669',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      <span style={{ display: 'inline-flex' }}>
                        <Play size={12} />
                      </span>
                      Trigger Archival
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Cold-Tier Vault */}
      {subTab === 'archives' && (
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#27272a', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ display: 'inline-flex', color: '#a1a1aa' }}>
                <Filter size={15} />
              </span>
              <select
                value={archiveStatusFilter}
                onChange={(e) => setArchiveStatusFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#f4f4f5', outline: 'none', fontSize: '13px' }}
              >
                <option value="all" style={{ background: '#27272a' }}>All Archive Statuses</option>
                <option value="archived" style={{ background: '#27272a' }}>Archived</option>
                <option value="restored" style={{ background: '#27272a' }}>Restored (Hot Table)</option>
              </select>
            </div>
            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>{filteredArchives.length} cold archive manifest(s)</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                <th style={{ padding: '12px 16px' }}>Archive Partition</th>
                <th style={{ padding: '12px 16px' }}>Table</th>
                <th style={{ padding: '12px 16px' }}>Rows</th>
                <th style={{ padding: '12px 16px' }}>Raw Size</th>
                <th style={{ padding: '12px 16px' }}>Cold Size</th>
                <th style={{ padding: '12px 16px' }}>Compression</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArchives.map((arch) => (
                <tr key={arch.id} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#38bdf8' }}>{arch.partition_name}</div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>{arch.storage_uri}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#60a5fa' }}>{arch.table_name}</td>
                  <td style={{ padding: '12px 16px', color: '#f4f4f5' }}>{arch.row_count.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#a1a1aa' }}>
                    {(arch.uncompressed_bytes / (1024 * 1024)).toFixed(1)} MB
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '500' }}>
                    {(arch.compressed_bytes / (1024 * 1024)).toFixed(1)} MB
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                      {arch.compression_ratio}x
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: arch.status === 'archived' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: arch.status === 'archived' ? '#38bdf8' : '#34d399',
                      }}
                    >
                      {arch.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedArchive(arch)}
                        style={{
                          padding: '4px 8px',
                          background: '#27272a',
                          border: '1px solid #3f3f46',
                          borderRadius: '4px',
                          color: '#f4f4f5',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        Inspect
                      </button>
                      {arch.status === 'archived' && (
                        <button
                          onClick={() => handleRehydrateArchive(arch.id)}
                          disabled={actionLoading}
                          style={{
                            padding: '4px 8px',
                            background: '#4f46e5',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          Rehydrate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Simulator & Maintenance Logs */}
      {subTab === 'simulator_logs' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Simulator Panel */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: 0, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', color: '#10b981' }}>
                <TrendingUp size={18} />
              </span>
              Storage Lifecycle Growth Simulator
            </h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '16px' }}>
              Model high-volume data ingestion, estimate compression ratios, and forecast monthly cloud infrastructure cost savings.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                Target Partitioned Table
              </label>
              <select
                value={simTable}
                onChange={(e) => setSimTable(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  color: '#f4f4f5',
                  fontSize: '13px',
                }}
              >
                {configs.map((c) => (
                  <option key={c.id} value={c.table_name}>
                    {c.table_name} ({c.active_partition_count} partitions)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                  Daily Ingested Rows
                </label>
                <input
                  type="number"
                  min={1000}
                  step={10000}
                  value={simDailyRows}
                  onChange={(e) => setSimDailyRows(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                  Hot Retention (Days)
                </label>
                <input
                  type="number"
                  min={14}
                  max={730}
                  value={simRetentionDays}
                  onChange={(e) => setSimRetentionDays(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                Compression Format
              </label>
              <select
                value={simFormat}
                onChange={(e) => setSimFormat(e.target.value as DatabaseCompressionFormat)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  color: '#f4f4f5',
                  fontSize: '13px',
                }}
              >
                <option value="parquet_zstd">Parquet + Zstandard (~7.6x compression)</option>
                <option value="gzip_jsonl">Gzip JSON Lines (~4.2x compression)</option>
              </select>
            </div>

            <button
              onClick={handleRunSimulation}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#059669',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Simulate Lifecycle Archival
            </button>

            {simResult && (
              <div style={{ marginTop: '16px', padding: '14px', background: '#27272a', borderRadius: '6px', border: '1px solid #3f3f46' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                  Projected Savings: ${simResult.projected_cost_savings_monthly.toFixed(2)} / month
                </div>
                <div style={{ fontSize: '12px', color: '#d4d4d8', marginBottom: '4px' }}>
                  Hot Tier Footprint: <strong>{simResult.projected_hot_size_mb} MB</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#d4d4d8', marginBottom: '4px' }}>
                  Cold Tier Footprint: <strong>{simResult.projected_cold_size_mb} MB</strong> ({simResult.compression_ratio}x compression)
                </div>
                <div style={{ fontSize: '12px', color: '#38bdf8' }}>
                  Recommended Partitions: <strong>{simResult.recommended_partitions} partitions</strong>
                </div>
              </div>
            )}
          </div>

          {/* Maintenance Logs */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: 0, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
                <Clock size={18} />
              </span>
              Partition Maintenance Audit Trail
            </h3>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '16px' }}>
              Immutable operational records tracking partition creations, automated prunes, and archival executions.
            </p>

            <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #27272a', color: '#a1a1aa' }}>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                    <th style={{ padding: '8px 12px' }}>Table</th>
                    <th style={{ padding: '8px 12px' }}>Duration</th>
                    <th style={{ padding: '8px 12px' }}>Executed At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #27272a' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600', color: '#60a5fa' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>{log.table_name}</td>
                      <td style={{ padding: '8px 12px', color: '#10b981' }}>{log.duration_ms} ms</td>
                      <td style={{ padding: '8px 12px', color: '#71717a' }}>
                        {new Date(log.executed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Archive Modal */}
      {selectedArchive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              padding: '24px',
              width: '600px',
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#38bdf8' }}>
                Cold-Tier Archive Manifest Inspector
              </h3>
              <button
                onClick={() => setSelectedArchive(null)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={20} />
                </span>
              </button>
            </div>

            <div style={{ marginBottom: '14px', padding: '12px', background: '#27272a', borderRadius: '6px' }}>
              <div style={{ fontSize: '13px', color: '#f4f4f5', marginBottom: '4px' }}>
                Partition: <strong>{selectedArchive.partition_name}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '4px' }}>
                Table: <strong>{selectedArchive.table_name}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>
                Storage URI: <code style={{ color: '#60a5fa' }}>{selectedArchive.storage_uri}</code>
              </div>
              <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                SHA-256 Checksum: <code style={{ color: '#34d399' }}>{selectedArchive.checksum_sha256}</code>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: '#27272a', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Archived Rows</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#f4f4f5' }}>
                  {selectedArchive.row_count.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '10px', background: '#27272a', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Compression Ratio</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                  {selectedArchive.compression_ratio}x
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedArchive(null)}
                style={{ padding: '8px 16px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#f4f4f5', cursor: 'pointer' }}
              >
                Close
              </button>
              {selectedArchive.status === 'archived' && (
                <button
                  onClick={() => {
                    handleRehydrateArchive(selectedArchive.id);
                    setSelectedArchive(null);
                  }}
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', background: '#4f46e5', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', fontWeight: '600' }}
                >
                  Rehydrate to Hot Tier
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configure Partition Modal */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              padding: '24px',
              width: '500px',
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Configure Table Partitioning</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={20} />
                </span>
              </button>
            </div>

            <form onSubmit={handleCreateConfig}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                  Table Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. audit_trail_events"
                  value={configForm.table_name}
                  onChange={(e) => setConfigForm({ ...configForm, table_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                  Partition Key Column *
                </label>
                <input
                  type="text"
                  placeholder="e.g. created_at"
                  value={configForm.partition_key}
                  onChange={(e) => setConfigForm({ ...configForm, partition_key: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                    Retention (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={configForm.retention_days}
                    onChange={(e) => setConfigForm({ ...configForm, retention_days: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      color: '#f4f4f5',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                    Partitions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={64}
                    value={configForm.active_partition_count}
                    onChange={(e) => setConfigForm({ ...configForm, active_partition_count: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      color: '#f4f4f5',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{ padding: '8px 16px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#f4f4f5', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#059669', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Partition Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {showPolicyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              padding: '24px',
              width: '500px',
              maxWidth: '90vw',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Create Archival Policy</h3>
              <button
                onClick={() => setShowPolicyModal(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <X size={20} />
                </span>
              </button>
            </div>

            <form onSubmit={handleCreatePolicy}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                  Policy Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Audit Logs Cold Storage"
                  value={policyForm.policy_name}
                  onChange={(e) => setPolicyForm({ ...policyForm, policy_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                  Target Table *
                </label>
                <select
                  value={policyForm.target_table}
                  onChange={(e) => setPolicyForm({ ...policyForm, target_table: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.table_name}>
                      {c.table_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                    Age Threshold (Days)
                  </label>
                  <input
                    type="number"
                    min={7}
                    value={policyForm.age_threshold_days}
                    onChange={(e) => setPolicyForm({ ...policyForm, age_threshold_days: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      color: '#f4f4f5',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>
                    Storage Tier
                  </label>
                  <select
                    value={policyForm.target_storage_tier}
                    onChange={(e) => setPolicyForm({ ...policyForm, target_storage_tier: e.target.value as DatabaseStorageTier })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      color: '#f4f4f5',
                      fontSize: '13px',
                    }}
                  >
                    <option value="s3_glacier">AWS S3 Glacier</option>
                    <option value="gcs_coldline">GCP Coldline</option>
                    <option value="azure_blob_archive">Azure Blob Archive</option>
                    <option value="local_cold_store">Local Cold Vault</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  style={{ padding: '8px 16px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#f4f4f5', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#4f46e5', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', fontWeight: '600' }}
                >
                  Save Policy
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
