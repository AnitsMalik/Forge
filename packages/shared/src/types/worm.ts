/**
 * Immutable WORM Audit Vault & Cryptographic Tamper-Evidence Types
 * SocialForge Platform v4.5.0
 */

export type WormSourceTable = 'superadmin_audit_logs' | 'governance_audit_logs' | 'publishing_audit_logs';

export const WORM_SOURCE_TABLES: WormSourceTable[] = [
  'superadmin_audit_logs',
  'governance_audit_logs',
  'publishing_audit_logs',
];

export const WORM_GENESIS_HASH = '0'.repeat(64);

/** A single append-only, hash-chained vault record. */
export interface WormVaultRecord {
  id: string;
  sequenceNumber: number;
  tenantId: string | null;
  sourceTable: WormSourceTable;
  sourceRecordId: string;
  eventAction: string;
  actorId: string | null;
  actorEmail: string | null;
  /** Canonical (sorted-key, redacted) JSON payload exactly as hashed. Omitted in list views. */
  payloadCanonical?: string;
  payloadHash: string;
  previousHash: string;
  chainHash: string;
  sourceCreatedAt: string;
  retainUntil: string;
  createdAt: string;
}

/** Signed daily seal covering a contiguous sequence range of vault records. */
export interface WormDailySeal {
  id: string;
  sealDate: string;
  firstSequence: number;
  lastSequence: number;
  recordCount: number;
  merkleRoot: string;
  chainHeadHash: string;
  previousSealHash: string;
  sealHash: string;
  signature: string;
  signingKeyId: string;
  algorithm: 'Ed25519';
  sealedBy: string;
  createdAt: string;
}

export interface WormMerkleProofStep {
  position: 'left' | 'right';
  hash: string;
}

export interface WormInclusionProof {
  sequenceNumber: number;
  chainHash: string;
  payloadHash: string;
  leafIndex: number;
  leafHash: string;
  proof: WormMerkleProofStep[];
  merkleRoot: string;
  seal: WormDailySeal;
  signingPublicKeyPem: string;
}

export interface WormVerificationIssue {
  type:
    | 'sequence_gap'
    | 'payload_hash_mismatch'
    | 'chain_link_broken'
    | 'chain_hash_mismatch'
    | 'merkle_root_mismatch'
    | 'seal_head_mismatch'
    | 'seal_hash_mismatch'
    | 'seal_signature_invalid'
    | 'seal_chain_broken';
  sequenceNumber?: number;
  sealId?: string;
  message: string;
}

export interface WormVerificationReport {
  verified: boolean;
  tamperDetected: boolean;
  recordsChecked: number;
  sealsChecked: number;
  chainHeadSequence: number;
  chainHeadHash: string;
  firstBrokenSequence: number | null;
  issues: WormVerificationIssue[];
  durationMs: number;
  verifiedAt: string;
  simulated?: boolean;
}

export type WormTamperSimulationMode = 'payload' | 'delete' | 'reorder' | 'seal_root';

export interface WormTamperSimulationRequest {
  sequenceNumber?: number;
  mode: WormTamperSimulationMode;
}

export interface WormIngestionResult {
  ingested: number;
  bySource: Record<WormSourceTable, number>;
  chainHeadSequence: number;
  chainHeadHash: string;
  durationMs: number;
}

export type WormLegalHoldStatus = 'active' | 'released';

export interface WormLegalHold {
  id: string;
  tenantId: string | null;
  matterReference: string;
  title: string;
  description: string | null;
  custodianEmail: string | null;
  status: WormLegalHoldStatus;
  placedBy: string;
  releasedBy: string | null;
  releaseReason: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface CreateWormLegalHoldDto {
  tenantId?: string | null;
  matterReference: string;
  title: string;
  description?: string;
  custodianEmail?: string;
}

export interface ReleaseWormLegalHoldDto {
  reason: string;
}

export interface WormVerificationToken {
  id: string;
  label: string;
  auditorEmail: string;
  auditorOrganization: string | null;
  tokenPrefix: string;
  expiresAt: string;
  revoked: boolean;
  accessCount: number;
  lastAccessedAt: string | null;
  createdBy: string;
  createdAt: string;
}

/** Returned once on issuance. The plaintext token is never stored or retrievable again. */
export interface IssuedWormVerificationToken extends WormVerificationToken {
  token: string;
}

export interface IssueWormVerificationTokenDto {
  label: string;
  auditorEmail: string;
  auditorOrganization?: string;
  expiresInDays?: number;
}

export interface WormVerificationEvent {
  id: string;
  tokenId: string | null;
  endpoint: string;
  result: 'valid' | 'invalid' | 'denied';
  sealId: string | null;
  ipAddress: string | null;
  details: Record<string, any> | null;
  createdAt: string;
}

export interface WormSigningKeyInfo {
  algorithm: 'Ed25519';
  keyId: string;
  publicKeyPem: string;
  usingDevelopmentSeed: boolean;
}

export interface WormVaultOverview {
  totalRecords: number;
  chainHeadSequence: number;
  chainHeadHash: string;
  totalSeals: number;
  lastSealAt: string | null;
  lastSealDate: string | null;
  unsealedRecords: number;
  pendingSourceRecords: number;
  activeLegalHolds: number;
  activeVerificationTokens: number;
  externalVerifications24h: number;
  sourceBreakdown: Record<WormSourceTable, number>;
  signingKey: WormSigningKeyInfo;
  wormEnforcement: { recordsTriggers: boolean; sealsTriggers: boolean };
}

/** Result returned to external auditors when verifying a seal through the public portal. */
export interface WormPublicSealVerification {
  seal: WormDailySeal;
  signatureValid: boolean;
  sealHashValid: boolean;
  merkleRootValid: boolean;
  chainHeadValid: boolean;
  previousSealLinkValid: boolean;
  verified: boolean;
  verifiedAt: string;
}

export interface WormProofVerificationRequest {
  leafHash: string;
  proof: WormMerkleProofStep[];
  merkleRoot: string;
}
