export type SecretType =
  | 'api_credential'
  | 'encryption_dek'
  | 'database_password'
  | 'jwt_signing_key'
  | 'webhook_signing_secret'
  | 'oauth_client_secret';

export type VaultProvider =
  | 'internal_aes256_gcm'
  | 'aws_kms'
  | 'hashicorp_vault'
  | 'azure_key_vault'
  | 'gcp_kms';

export type SecretKeyStatus =
  | 'active'
  | 'rotating'
  | 'deprecated'
  | 'revoked'
  | 'compromised';

export type KeyVersionStatus =
  | 'active'
  | 'grace_period'
  | 'deprecated'
  | 'revoked';

export type RotationTrigger =
  | 'automated_schedule'
  | 'manual_operator'
  | 'emergency_compromise';

export type SecretOperationType =
  | 'encrypt'
  | 'decrypt'
  | 'rotate'
  | 'revoke'
  | 'export_public';

export interface SecretVaultKey {
  id: string;
  key_alias: string;
  key_type: SecretType;
  vault_provider: VaultProvider;
  current_version: number;
  status: SecretKeyStatus;
  rotation_interval_days: number;
  auto_rotate_enabled: boolean;
  last_rotated_at: string | null;
  next_rotation_due: string | null;
  grace_period_hours: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  versions?: SecretKeyVersion[];
}

export interface SecretKeyVersion {
  id: string;
  key_id: string;
  version_number: number;
  encrypted_key_material: string;
  key_fingerprint: string;
  algorithm: string;
  status: KeyVersionStatus;
  activated_at: string;
  deprecated_at: string | null;
  revoked_at: string | null;
  rotation_trigger: RotationTrigger;
  created_at: string;
}

export interface SecretAccessAuditLog {
  id: string;
  key_id: string;
  key_alias?: string;
  version_number: number;
  accessor_service: string;
  accessor_user_id: string | null;
  operation: SecretOperationType;
  ip_address: string;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

export interface SecretRotationTelemetry {
  totalKeys: number;
  activeKeys: number;
  rotatingKeys: number;
  expiringSoonCount: number;
  compromisedOrRevokedCount: number;
  totalAccessOperations: number;
  averageRotationAgeDays: number;
  securityPostureScore: number;
  providerDistribution: Record<VaultProvider, number>;
  recentRotations: Array<{
    id: string;
    keyAlias: string;
    versionNumber: number;
    trigger: RotationTrigger;
    timestamp: string;
  }>;
}

export interface EnvelopeReEncryptSimulationResult {
  simulated: boolean;
  keyAlias: string;
  currentVersion: number;
  evaluatedRecordCount: number;
  reEncryptedRecordCount: number;
  simulatedDurationMs: number;
  dataIntegrityChecksumMatch: boolean;
  oldestActiveVersion: number;
  recommendations: string[];
}
