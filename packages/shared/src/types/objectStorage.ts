/**
 * Enterprise Multi-Cloud Distributed Object Storage Tiering, Immutable Object Lock & Presigned Upload Gateway Types
 * SocialForge Platform v6.3.0
 */

export type StorageProviderType = 'aws_s3' | 'gcp_storage' | 'azure_blob' | 'minio_s3' | 'cloudflare_r2';
export type StorageClassTier = 'standard_hot' | 'infrequent_cool' | 'archive_glacier' | 'deep_archive';
export type ObjectLockMode = 'compliance_strict' | 'governance_bypassable' | 'legal_hold';
export type PresignedUploadStatus = 'issued' | 'uploaded' | 'expired' | 'quarantined_malware';

export interface StorageBucket {
  id: string;
  bucket_name: string;
  provider_type: StorageProviderType;
  region: string;
  endpoint_url: string;
  default_storage_class: StorageClassTier;
  versioning_enabled: boolean;
  is_immutable_locked: boolean;
  total_objects_count: number;
  total_size_bytes: number;
  status: 'active' | 'archived' | 'suspended';
  created_at: string;
}

export interface ObjectStorageLifecycleRule {
  id: string;
  bucket_id: string;
  rule_name: string;
  prefix_filter: string;
  transition_cool_days: number;
  transition_archive_days: number;
  expiration_days: number;
  noncurrent_version_expiration_days: number;
  is_active: boolean;
  created_at: string;
}

export interface ImmutableObjectLock {
  id: string;
  bucket_id: string;
  object_key: string;
  lock_mode: ObjectLockMode;
  retention_until_timestamp: string;
  legal_hold_active: boolean;
  sha256_checksum: string;
  locked_by_email: string;
  created_at: string;
}

export interface PresignedUploadSession {
  id: string;
  bucket_id: string;
  object_key: string;
  presigned_url: string;
  http_method: 'PUT' | 'POST';
  content_type: string;
  expected_sha256: string;
  expires_at: string;
  status: PresignedUploadStatus;
  created_at: string;
}

export interface ObjectStorageTelemetry {
  total_buckets: number;
  total_objects: number;
  total_storage_bytes: number;
  storage_cost_savings_percent: number;
  active_worm_locks: number;
  multi_cloud_distribution: Record<StorageProviderType, number>;
}

export interface CreateBucketInput {
  bucket_name: string;
  provider_type: StorageProviderType;
  region: string;
  endpoint_url?: string;
  default_storage_class?: StorageClassTier;
  versioning_enabled?: boolean;
  is_immutable_locked?: boolean;
}

export interface CreateLifecycleRuleInput {
  bucket_id: string;
  rule_name: string;
  prefix_filter: string;
  transition_cool_days: number;
  transition_archive_days: number;
  expiration_days?: number;
  noncurrent_version_expiration_days?: number;
  is_active?: boolean;
}

export interface CreateObjectLockInput {
  bucket_id: string;
  object_key: string;
  lock_mode: ObjectLockMode;
  retention_days?: number;
  legal_hold_active?: boolean;
  sha256_checksum: string;
  locked_by_email?: string;
}

export interface GeneratePresignedUploadInput {
  bucket_id: string;
  object_key: string;
  content_type: string;
  expected_sha256?: string;
  expiration_seconds?: number;
}

export interface GeneratePresignedUploadResult {
  session_id: string;
  presigned_url: string;
  http_method: 'PUT' | 'POST';
  expires_at: string;
  headers: Record<string, string>;
}

export interface VerifyUploadedObjectInput {
  session_id: string;
  actual_sha256: string;
  actual_size_bytes: number;
}

export interface VerifyUploadedObjectResult {
  verified: boolean;
  message: string;
  object_key: string;
  bucket_id: string;
  lock_eligible: boolean;
}
