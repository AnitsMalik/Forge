/**
 * Enterprise Automated Database Partitioning, Cold-Tier Sharding & Zero-Downtime Data Lifecycle Archival Types
 * SocialForge Platform v5.8.0
 */

export type DatabasePartitionType = 'range_date' | 'list_tenant' | 'hash_id';
export type DatabasePartitionStatus = 'active' | 'pruning' | 'archiving';
export type DatabaseStorageTier = 's3_glacier' | 'gcs_coldline' | 'azure_blob_archive' | 'local_cold_store';
export type DatabaseCompressionFormat = 'parquet_zstd' | 'gzip_jsonl';
export type DatabaseArchiveStatus = 'archived' | 'restoring' | 'restored' | 'purged';
export type DatabaseMaintenanceAction =
  | 'partition_created'
  | 'partition_dropped'
  | 'archived_to_cold_tier'
  | 'cold_tier_rehydrated';

export interface DatabasePartitionConfig {
  id: string;
  table_name: string;
  partition_type: DatabasePartitionType;
  partition_key: string;
  retention_days: number;
  active_partition_count: number;
  total_row_count: number;
  total_size_mb: number;
  status: DatabasePartitionStatus;
  last_pruned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseArchivalPolicy {
  id: string;
  policy_name: string;
  target_table: string;
  age_threshold_days: number;
  target_storage_tier: DatabaseStorageTier;
  compression_format: DatabaseCompressionFormat;
  schedule_cron: string;
  is_enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseColdTierArchive {
  id: string;
  policy_id: string;
  table_name: string;
  partition_name: string;
  date_range_start: string;
  date_range_end: string;
  row_count: number;
  uncompressed_bytes: number;
  compressed_bytes: number;
  compression_ratio: number;
  storage_uri: string;
  checksum_sha256: string;
  status: DatabaseArchiveStatus;
  created_at: string;
  restored_at: string | null;
}

export interface DatabasePartitionMaintenanceLog {
  id: string;
  action: DatabaseMaintenanceAction;
  table_name: string;
  details: Record<string, any>;
  duration_ms: number;
  status: 'success' | 'failed';
  executed_at: string;
}

export interface DatabasePartitioningTelemetry {
  total_partitioned_tables: number;
  total_active_partitions: number;
  total_archived_rows: number;
  uncompressed_cold_bytes: number;
  compressed_cold_bytes: number;
  overall_storage_savings_percent: number;
  last_maintenance_run_at: string | null;
  status: 'healthy' | 'warning' | 'maintenance';
}

export interface TriggerArchivalRequest {
  policy_id: string;
  dry_run?: boolean;
}

export interface TriggerArchivalResult {
  archive_id: string;
  table_name: string;
  archived_rows: number;
  uncompressed_bytes: number;
  compressed_bytes: number;
  compression_ratio: number;
  storage_uri: string;
  checksum_sha256: string;
}

export interface RehydrateArchiveRequest {
  archive_id: string;
  target_hot_table?: string;
}

export interface RehydrateArchiveResult {
  archive_id: string;
  table_name: string;
  restored_rows: number;
  status: 'restored' | 'failed';
  restored_at: string;
}

export interface SimulatePartitioningRequest {
  table_name: string;
  daily_ingestion_rows: number;
  retention_days: number;
  compression_format?: DatabaseCompressionFormat;
}

export interface SimulatePartitioningResult {
  table_name: string;
  projected_hot_size_mb: number;
  projected_cold_size_mb: number;
  projected_cost_savings_monthly: number;
  recommended_partitions: number;
  compression_ratio: number;
}
