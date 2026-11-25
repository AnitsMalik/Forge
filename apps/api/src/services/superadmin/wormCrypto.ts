/**
 * WORM Audit Vault — Cryptographic Primitives
 * SocialForge Platform v4.5.0
 *
 * Pure, dependency-free helpers shared by the vault service, the internal verifier and the
 * public external-verification portal:
 *   - deterministic canonical JSON + secret redaction
 *   - SHA-256 continuous hash chaining
 *   - RFC 6962-style Merkle trees (domain-separated leaves/nodes, odd-node promotion)
 *   - Ed25519 seal signing (asymmetric, so external verifiers need only the public key)
 */

import crypto from 'node:crypto';
import type { WormMerkleProofStep } from '@socialforge/shared';

export const GENESIS_HASH = '0'.repeat(64);
export const CHAIN_VERSION = 'worm-chain-v1';
export const SEAL_VERSION = 'worm-seal-v1';

// ---------------------------------------------------------------------------
// Canonicalization & redaction
// ---------------------------------------------------------------------------

const SENSITIVE_KEY_PATTERN = /(pass(word)?|secret|token|api[_-]?key|private[_-]?key|authorization|credential|cookie|signing[_-]?key)/i;

/** Recursively replaces values under sensitive-looking keys so secrets never enter the immutable vault. */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) && v !== null && v !== undefined ? '[REDACTED]' : redactSecrets(v);
    }
    return out;
  }
  return value;
}

/** Deterministic JSON: sorted keys, ISO dates, no whitespace. Identical input always yields identical bytes. */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return JSON.stringify(Number.isNaN(value.getTime()) ? null : value.toISOString());
  if (Buffer.isBuffer(value)) return JSON.stringify(value.toString('base64'));
  if (typeof value === 'bigint') return JSON.stringify(value.toString());
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ---------------------------------------------------------------------------
// Hash chain
// ---------------------------------------------------------------------------

export interface ChainLinkInput {
  previousHash: string;
  sequenceNumber: number;
  sourceTable: string;
  sourceRecordId: string;
  tenantId: string | null;
  eventAction: string;
  actorId: string | null;
  payloadHash: string;
}

/** chain_hash(n) = SHA-256(version | chain_hash(n-1) | seq | source | id | tenant | action | actor | payload_hash) */
export function computeChainHash(link: ChainLinkInput): string {
  return sha256Hex(
    [
      CHAIN_VERSION,
      link.previousHash,
      String(link.sequenceNumber),
      link.sourceTable,
      link.sourceRecordId,
      link.tenantId ?? '',
      link.eventAction,
      link.actorId ?? '',
      link.payloadHash,
    ].join('|')
  );
}

// ---------------------------------------------------------------------------
// Merkle tree (RFC 6962 domain separation; lone nodes are promoted, never duplicated,
// which avoids the CVE-2012-2459 duplicate-leaf ambiguity)
// ---------------------------------------------------------------------------

export function merkleLeafHash(chainHashHex: string): string {
  return crypto.createHash('sha256').update(Buffer.from([0x00])).update(Buffer.from(chainHashHex, 'hex')).digest('hex');
}

export function merkleNodeHash(leftHex: string, rightHex: string): string {
  return crypto
    .createHash('sha256')
    .update(Buffer.from([0x01]))
    .update(Buffer.from(leftHex, 'hex'))
    .update(Buffer.from(rightHex, 'hex'))
    .digest('hex');
}

function buildLevels(leafHashes: string[]): string[][] {
  if (leafHashes.length === 0) throw new Error('Cannot build a Merkle tree with zero leaves.');
  const levels: string[][] = [leafHashes];
  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1];
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(i + 1 < current.length ? merkleNodeHash(current[i], current[i + 1]) : current[i]);
    }
    levels.push(next);
  }
  return levels;
}

export function computeMerkleRoot(chainHashes: string[]): string {
  const levels = buildLevels(chainHashes.map(merkleLeafHash));
  return levels[levels.length - 1][0];
}

export function buildInclusionProof(chainHashes: string[], leafIndex: number): { leafHash: string; proof: WormMerkleProofStep[]; root: string } {
  if (leafIndex < 0 || leafIndex >= chainHashes.length) throw new Error('Leaf index out of range.');
  const levels = buildLevels(chainHashes.map(merkleLeafHash));
  const proof: WormMerkleProofStep[] = [];
  let idx = leafIndex;
  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const siblingIdx = idx ^ 1;
    if (siblingIdx < nodes.length) {
      proof.push({ position: idx % 2 === 0 ? 'right' : 'left', hash: nodes[siblingIdx] });
    }
    idx = idx >> 1;
  }
  return { leafHash: levels[0][leafIndex], proof, root: levels[levels.length - 1][0] };
}

const HEX64 = /^[0-9a-f]{64}$/;

export function verifyInclusionProof(leafHash: string, proof: WormMerkleProofStep[], merkleRoot: string): boolean {
  if (!HEX64.test(leafHash) || !HEX64.test(merkleRoot) || !Array.isArray(proof)) return false;
  let current = leafHash;
  for (const step of proof) {
    if (!step || !HEX64.test(step.hash) || (step.position !== 'left' && step.position !== 'right')) return false;
    current = step.position === 'right' ? merkleNodeHash(current, step.hash) : merkleNodeHash(step.hash, current);
  }
  return crypto.timingSafeEqual(Buffer.from(current, 'hex'), Buffer.from(merkleRoot, 'hex'));
}

// ---------------------------------------------------------------------------
// Seal hashing & Ed25519 signing
// ---------------------------------------------------------------------------

export interface SealHashInput {
  sealDate: string;
  firstSequence: number;
  lastSequence: number;
  recordCount: number;
  merkleRoot: string;
  chainHeadHash: string;
  previousSealHash: string;
  signingKeyId: string;
}

export function computeSealHash(seal: SealHashInput): string {
  return sha256Hex(
    canonicalize({
      version: SEAL_VERSION,
      algorithm: 'Ed25519',
      sealDate: seal.sealDate,
      firstSequence: seal.firstSequence,
      lastSequence: seal.lastSequence,
      recordCount: seal.recordCount,
      merkleRoot: seal.merkleRoot,
      chainHeadHash: seal.chainHeadHash,
      previousSealHash: seal.previousSealHash,
      signingKeyId: seal.signingKeyId,
    })
  );
}

const DEV_SIGNING_SEED = 'socialforge_worm_vault_dev_ed25519_seed_do_not_use_in_production';
// PKCS#8 DER prefix for an Ed25519 private key wrapping a raw 32-byte seed (RFC 8410).
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

interface SigningMaterial {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  publicKeyPem: string;
  keyId: string;
  usingDevelopmentSeed: boolean;
}

let cachedMaterial: SigningMaterial | null = null;

/**
 * Derives the Ed25519 seal-signing keypair from WORM_SEAL_SIGNING_SEED. The private key is
 * held only in process memory; it is never persisted to the database or logs.
 */
export function getSigningMaterial(): SigningMaterial {
  if (cachedMaterial) return cachedMaterial;
  const configuredSeed = process.env.WORM_SEAL_SIGNING_SEED;
  const seed = crypto.createHash('sha256').update(configuredSeed || DEV_SIGNING_SEED).digest();
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKey = crypto.createPublicKey(privateKey);
  const spkiDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  cachedMaterial = {
    privateKey,
    publicKey,
    publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    keyId: sha256Hex(spkiDer).slice(0, 16),
    usingDevelopmentSeed: !configuredSeed,
  };
  return cachedMaterial;
}

export function signSealHash(sealHash: string): string {
  return crypto.sign(null, Buffer.from(sealHash, 'utf8'), getSigningMaterial().privateKey).toString('base64');
}

export function verifySealSignature(sealHash: string, signatureB64: string, publicKey?: crypto.KeyObject): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(sealHash, 'utf8'),
      publicKey || getSigningMaterial().publicKey,
      Buffer.from(signatureB64, 'base64')
    );
  } catch {
    return false;
  }
}
