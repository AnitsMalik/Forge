/**
 * Enterprise Cryptographic Hardware Security Module (HSM) Key Brokerage, Envelope Encryption & Vault Broker Types
 * SocialForge Platform v6.2.0
 */

export type HsmProviderType = 'aws_cloudhsm' | 'gcp_cloud_hsm' | 'azure_dedicated_hsm' | 'hashicorp_vault_transit' | 'local_pkcs11';
export type HsmAlgorithm = 'aes_256_gcm' | 'rsa_4096' | 'ecdsa_p384';
export type DekPurpose = 'tenant_pii_envelope' | 'oauth_secrets_envelope' | 'audit_ledger_hmac' | 'media_vault_envelope';
export type DekStatus = 'active' | 'rotated' | 'shredded';
export type HsmCryptoOperation = 'generate_dek' | 'wrap_key' | 'unwrap_key' | 'envelope_encrypt' | 'envelope_decrypt' | 'crypto_shred_dek' | 'rotate_root_kek';

export interface HsmKeyRing {
  id: string;
  ring_name: string;
  provider_type: HsmProviderType;
  hsm_partition_id: string;
  master_key_alias: string;
  algorithm: HsmAlgorithm;
  is_active: boolean;
  rotation_interval_days: number;
  last_rotated_at: string | null;
  created_at: string;
}

export interface EnvelopeDataEncryptionKey {
  id: string;
  key_ring_id: string;
  key_label: string;
  encrypted_dek_ciphertext: string;
  algorithm: HsmAlgorithm;
  intended_purpose: DekPurpose;
  status: DekStatus;
  version: number;
  created_at: string;
  expires_at: string | null;
}

export interface KeyDerivationPolicy {
  id: string;
  policy_name: string;
  target_resource_type: string;
  key_ring_id: string;
  purpose: DekPurpose;
  kdf_algorithm: string;
  is_enforced: boolean;
  created_at: string;
}

export interface HsmCryptoAuditLog {
  id: string;
  operation: HsmCryptoOperation;
  key_id: string;
  operator_email: string;
  status: 'success' | 'failed';
  duration_ms: number;
  sha256_proof: string;
  timestamp: string;
}

export interface HsmTelemetry {
  total_key_rings: number;
  active_deks: number;
  shredded_deks: number;
  crypto_ops_24h: number;
  zero_plaintext_guarantee: 'hardware_enforced' | 'simulated';
}

export interface CreateKeyRingInput {
  ring_name: string;
  provider_type: HsmProviderType;
  hsm_partition_id: string;
  master_key_alias: string;
  algorithm?: HsmAlgorithm;
  rotation_interval_days?: number;
}

export interface GenerateDekInput {
  key_ring_id: string;
  key_label: string;
  intended_purpose: DekPurpose;
  expires_in_days?: number;
}

export interface EnvelopeEncryptInput {
  dek_id: string;
  plaintext: string;
  additional_authenticated_data?: string;
}

export interface EnvelopeEncryptResult {
  success: boolean;
  dek_id: string;
  algorithm: string;
  ciphertext_base64: string;
  iv_base64: string;
  auth_tag_base64: string;
  sha256_proof: string;
  timestamp: string;
}

export interface EnvelopeDecryptInput {
  dek_id: string;
  ciphertext_base64: string;
  iv_base64: string;
  auth_tag_base64: string;
  additional_authenticated_data?: string;
}

export interface EnvelopeDecryptResult {
  success: boolean;
  dek_id: string;
  plaintext: string;
  sha256_proof: string;
  decrypted_at: string;
}

export interface RotateRootKekResult {
  success: boolean;
  key_ring_id: string;
  old_key_alias: string;
  new_key_alias: string;
  rewrapped_deks_count: number;
  rotated_at: string;
  message: string;
}

export interface ShredDekInput {
  reason: string;
  confirmation: boolean;
}

export interface ShredDekResult {
  success: boolean;
  dek_id: string;
  status: 'shredded';
  shredded_at: string;
  message: string;
}
