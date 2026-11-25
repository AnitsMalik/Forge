export type ComplianceExportType = 'full_tenant' | 'gdpr_sar' | 'soc2_audit' | 'analytics_raw';
export type ComplianceExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
export type ComplianceExportFormat = 'zip_json' | 'zip_csv' | 'json';

export interface ComplianceExportJob {
  id: string;
  tenantId: string;
  requesterId: string;
  requesterEmail: string;
  exportType: ComplianceExportType;
  status: ComplianceExportStatus;
  format: ComplianceExportFormat;
  artifactUrl?: string | null;
  artifactSha256?: string | null;
  fileSizeBytes?: number | null;
  recordCount: number;
  expiresAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface ComplianceRetentionPolicy {
  id: string;
  tenantId?: string | null;
  dataCategory: string; // audit_logs, analytics_telemetry, published_posts, media_assets, compliance_exports
  retentionDays: number;
  autoPurgeEnabled: boolean;
  gracePeriodDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompliancePurgeCertificate {
  id: string;
  tenantId: string;
  policyId?: string | null;
  dataCategory: string;
  recordsPurged: number;
  requesterEmail: string;
  certificateSignature: string;
  purgeTimestamp: string;
  createdAt: string;
}

export interface CustomRolePermission {
  id: string;
  tenantId?: string | null;
  roleSlug: string;
  roleName: string;
  description?: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditIntegrityVerification {
  table: string;
  verified: boolean;
  totalRecords: number;
  lastVerifiedAt: string;
  merkleRoot: string;
  signature: string;
  tamperDetected: boolean;
  details: string;
}

export interface RequestComplianceExportDto {
  exportType: ComplianceExportType;
  format?: ComplianceExportFormat;
  targetTenantId?: string;
  reason: string;
  confirmation: boolean;
}

export interface UpdateRetentionPolicyDto {
  retentionDays: number;
  autoPurgeEnabled: boolean;
  gracePeriodDays?: number;
  reason: string;
  confirmation: boolean;
}

export interface ExecuteDataPurgeDto {
  dataCategory: string;
  targetTenantId?: string;
  reason: string;
  confirmation: boolean;
}

export interface CreateCustomRoleDto {
  roleSlug: string;
  roleName: string;
  description?: string;
  permissions: string[];
  targetTenantId?: string;
  confirmation?: boolean;
}
