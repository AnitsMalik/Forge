export type BackupSnapshotType =
  | 'automated_daily'
  | 'automated_hourly'
  | 'manual_operator'
  | 'pre_migration';

export type BackupStorageTier = 'hot_s3' | 'cold_glacier' | 'multi_region_replica';

export type BackupSnapshotStatus =
  | 'creating'
  | 'available'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'purged';

export type BackupVerificationStatus = 'untested' | 'drill_passed' | 'drill_failed';

export type BackupDrillType = 'automated_synthetic' | 'superadmin_manual';

export type BackupDrillTargetEnv = 'isolated_sandbox' | 'ephemeral_staging';

export type BackupDrillStatus = 'in_progress' | 'passed' | 'failed';

export type TenantBackupFormat = 'sql_gz' | 'json_archive';

export type TenantBackupStatus = 'generating' | 'ready' | 'expired';

export interface SystemBackupSnapshot {
  id: string;
  snapshotType: BackupSnapshotType;
  storageTier: BackupStorageTier;
  storageRegion: string;
  replicaRegions: string[];
  checksumSha256: string;
  sizeBytes: number;
  tableCount: number;
  recordCount: number;
  status: BackupSnapshotStatus;
  verificationStatus: BackupVerificationStatus;
  lastDrillAt?: string | null;
  drillRtoSeconds?: number | null;
  drillRpoSeconds?: number | null;
  createdBy: string;
  retentionDays: number;
  expiresAt: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface SystemDrDrillLog {
  id: string;
  snapshotId: string;
  drillType: BackupDrillType;
  targetEnvironment: BackupDrillTargetEnv;
  status: BackupDrillStatus;
  rtoSeconds: number;
  integrityCheckPassed: boolean;
  tableIntegritySummary?: Record<string, any> | null;
  executedBy: string;
  notes?: string | null;
  createdAt: string;
}

export interface SystemTenantBackupExport {
  id: string;
  tenantId: string;
  format: TenantBackupFormat;
  checksumSha256: string;
  sizeBytes: number;
  downloadExpiresAt: string;
  createdBy: string;
  status: TenantBackupStatus;
  reason?: string | null;
  createdAt: string;
}

export interface SystemDrOverview {
  drStatus: 'resilient' | 'warning' | 'drill_overdue';
  targetRtoSeconds: number;
  achievedRtoSeconds: number;
  targetRpoSeconds: number;
  achievedRpoSeconds: number;
  totalSnapshotsCount: number;
  verifiedSnapshotsCount: number;
  multiRegionSnapshotsCount: number;
  totalVaultStorageBytes: number;
  latestSnapshot: SystemBackupSnapshot | null;
  recentDrills: SystemDrDrillLog[];
}
