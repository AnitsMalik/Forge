import crypto from 'crypto';
import { db } from '../db/connection.js';
import type {
  SecretVaultKey,
  SecretKeyVersion,
  SecretAccessAuditLog,
  SecretRotationTelemetry,
  EnvelopeReEncryptSimulationResult,
  SecretType,
  VaultProvider,
  SecretKeyStatus,
} from '@socialforge/shared';

export class SecretRotationService {
  /**
   * Fetch aggregate telemetry & security posture KPIs
   */
  async getTelemetry(): Promise<SecretRotationTelemetry> {
    const keys = await db('secret_vault_keys').select('*');
    const totalKeys = keys.length;
    const activeKeys = keys.filter((k: any) => k.status === 'active').length;
    const rotatingKeys = keys.filter((k: any) => k.status === 'rotating').length;
    const compromisedOrRevokedCount = keys.filter(
      (k: any) => k.status === 'revoked' || k.status === 'compromised'
    ).length;

    const now = Date.now();
    const fourteenDaysMs = 14 * 86400000;
    const expiringSoonCount = keys.filter((k: any) => {
      if (!k.next_rotation_due || k.status !== 'active') return false;
      const due = new Date(k.next_rotation_due).getTime();
      return due - now <= fourteenDaysMs;
    }).length;

    const auditCountRow = await db('secret_access_audit_logs').count<{ count: number }>('id as count').first();
    const totalAccessOperations = Number(auditCountRow?.count || 0);

    const providerDistribution: Record<VaultProvider, number> = {
      internal_aes256_gcm: 0,
      aws_kms: 0,
      hashicorp_vault: 0,
      azure_key_vault: 0,
      gcp_kms: 0,
    };

    let totalAgeDays = 0;
    for (const k of keys) {
      if (k.vault_provider in providerDistribution) {
        providerDistribution[k.vault_provider as VaultProvider]++;
      }
      const refDate = k.last_rotated_at ? new Date(k.last_rotated_at).getTime() : new Date(k.created_at).getTime();
      const ageDays = Math.max(1, Math.round((now - refDate) / 86400000));
      totalAgeDays += ageDays;
    }
    const averageRotationAgeDays = totalKeys > 0 ? Math.round(totalAgeDays / totalKeys) : 30;

    // Security Posture Score calculation (0 - 100)
    let postureScore = 100;
    postureScore -= compromisedOrRevokedCount * 25;
    postureScore -= expiringSoonCount * 5;
    if (averageRotationAgeDays > 90) postureScore -= 10;
    const securityPostureScore = Math.max(10, Math.min(100, postureScore));

    const recentVersions = await db('secret_key_versions as v')
      .join('secret_vault_keys as k', 'v.key_id', 'k.id')
      .select('v.id', 'k.key_alias as keyAlias', 'v.version_number as versionNumber', 'v.rotation_trigger as trigger', 'v.activated_at as timestamp')
      .orderBy('v.activated_at', 'desc')
      .limit(5);

    return {
      totalKeys,
      activeKeys,
      rotatingKeys,
      expiringSoonCount,
      compromisedOrRevokedCount,
      totalAccessOperations,
      averageRotationAgeDays,
      securityPostureScore,
      providerDistribution,
      recentRotations: recentVersions.map((r: any) => ({
        id: r.id,
        keyAlias: r.keyAlias,
        versionNumber: r.versionNumber,
        trigger: r.trigger,
        timestamp: new Date(r.timestamp).toISOString(),
      })),
    };
  }

  /**
   * List all vault keys with optional filtering
   */
  async listKeys(filters?: { status?: string; vault_provider?: string; key_type?: string }): Promise<SecretVaultKey[]> {
    let query = db('secret_vault_keys').select('*').orderBy('created_at', 'desc');

    if (filters?.status) {
      query = query.where('status', filters.status);
    }
    if (filters?.vault_provider) {
      query = query.where('vault_provider', filters.vault_provider);
    }
    if (filters?.key_type) {
      query = query.where('key_type', filters.key_type);
    }

    const rows = await query;
    return rows.map((r: any) => this.formatKey(r));
  }

  /**
   * Get single key by ID with all versions
   */
  async getKeyById(id: string): Promise<SecretVaultKey | null> {
    const row = await db('secret_vault_keys').where('id', id).first();
    if (!row) return null;

    const versions = await db('secret_key_versions')
      .where('key_id', id)
      .orderBy('version_number', 'desc');

    const key = this.formatKey(row);
    key.versions = versions.map((v: any) => this.formatVersion(v));
    return key;
  }

  /**
   * Provision a new Secret Vault Key & initialize version 1
   */
  async createKey(
    input: {
      key_alias: string;
      key_type: SecretType;
      vault_provider: VaultProvider;
      rotation_interval_days?: number;
      auto_rotate_enabled?: boolean;
      grace_period_hours?: number;
      algorithm?: string;
      metadata?: Record<string, any>;
    },
    operatorUserId?: string
  ): Promise<SecretVaultKey> {
    if (!input.key_alias || input.key_alias.trim().length < 3) {
      throw new Error('Key alias must be at least 3 characters long');
    }

    const existing = await db('secret_vault_keys').where('key_alias', input.key_alias.trim()).first();
    if (existing) {
      throw new Error(`Key alias '${input.key_alias}' already exists`);
    }

    const validTypes: SecretType[] = [
      'api_credential',
      'encryption_dek',
      'database_password',
      'jwt_signing_key',
      'webhook_signing_secret',
      'oauth_client_secret',
    ];
    if (!validTypes.includes(input.key_type)) {
      throw new Error(`Invalid key type: ${input.key_type}`);
    }

    const validProviders: VaultProvider[] = [
      'internal_aes256_gcm',
      'aws_kms',
      'hashicorp_vault',
      'azure_key_vault',
      'gcp_kms',
    ];
    if (!validProviders.includes(input.vault_provider)) {
      throw new Error(`Invalid vault provider: ${input.vault_provider}`);
    }

    const intervalDays = Math.max(1, input.rotation_interval_days ?? 90);
    const graceHours = Math.max(1, input.grace_period_hours ?? 72);
    const keyId = `key-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date();
    const nextDue = new Date(now.getTime() + intervalDays * 86400000);

    const keyRecord = {
      id: keyId,
      key_alias: input.key_alias.trim(),
      key_type: input.key_type,
      vault_provider: input.vault_provider,
      current_version: 1,
      status: 'active',
      rotation_interval_days: intervalDays,
      auto_rotate_enabled: input.auto_rotate_enabled !== false ? 1 : 0,
      last_rotated_at: now,
      next_rotation_due: nextDue,
      grace_period_hours: graceHours,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: now,
      updated_at: now,
    };

    await db('secret_vault_keys').insert(keyRecord);

    const versionId = `ver-${keyId}-v1`;
    const fingerprint = crypto.createHash('sha256').update(`${keyId}:v1:${Date.now()}`).digest('hex');
    const algorithm = input.algorithm || (input.key_type === 'jwt_signing_key' ? 'hmac-sha256' : 'aes-256-gcm');

    const versionRecord = {
      id: versionId,
      key_id: keyId,
      version_number: 1,
      encrypted_key_material: `enc:v1:${input.vault_provider}:${crypto.randomBytes(24).toString('base64')}`,
      key_fingerprint: fingerprint,
      algorithm,
      status: 'active',
      activated_at: now,
      deprecated_at: null,
      revoked_at: null,
      rotation_trigger: 'manual_operator',
      created_at: now,
    };

    await db('secret_key_versions').insert(versionRecord);

    // Audit log
    await db('secret_access_audit_logs').insert({
      id: `audit-${crypto.randomUUID().slice(0, 12)}`,
      key_id: keyId,
      version_number: 1,
      accessor_service: 'socialforge-kms-manager',
      accessor_user_id: operatorUserId || null,
      operation: 'rotate',
      ip_address: '127.0.0.1',
      success: 1,
      failure_reason: null,
      created_at: now,
    });

    await this.emitAuditLog(
      operatorUserId,
      'PROVISION_VAULT_KEY',
      keyId,
      `Provisioned vault key "${input.key_alias}" (${input.key_type})`,
      { keyAlias: input.key_alias, keyType: input.key_type, provider: input.vault_provider }
    );

    return (await this.getKeyById(keyId))!;
  }

  /**
   * Update Key Configuration
   */
  async updateKey(
    id: string,
    updates: {
      rotation_interval_days?: number;
      auto_rotate_enabled?: boolean;
      grace_period_hours?: number;
      metadata?: Record<string, any>;
    },
    operatorUserId?: string
  ): Promise<SecretVaultKey> {
    const existing = await db('secret_vault_keys').where('id', id).first();
    if (!existing) {
      throw new Error(`Vault key with id '${id}' not found`);
    }

    const payload: any = { updated_at: new Date() };
    if (updates.rotation_interval_days !== undefined) {
      if (updates.rotation_interval_days < 1) {
        throw new Error('Rotation interval must be at least 1 day');
      }
      payload.rotation_interval_days = updates.rotation_interval_days;
      const baseDate = existing.last_rotated_at ? new Date(existing.last_rotated_at) : new Date();
      payload.next_rotation_due = new Date(baseDate.getTime() + updates.rotation_interval_days * 86400000);
    }
    if (updates.auto_rotate_enabled !== undefined) {
      payload.auto_rotate_enabled = updates.auto_rotate_enabled ? 1 : 0;
    }
    if (updates.grace_period_hours !== undefined) {
      payload.grace_period_hours = Math.max(1, updates.grace_period_hours);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata);
    }

    await db('secret_vault_keys').where('id', id).update(payload);

    await this.emitAuditLog(
      operatorUserId,
      'UPDATE_VAULT_KEY',
      id,
      `Updated vault key "${existing.key_alias}" parameters`,
      updates
    );

    return (await this.getKeyById(id))!;
  }

  /**
   * Rotate Secret Key (create new version)
   */
  async rotateKey(
    id: string,
    options?: { trigger?: string; algorithm?: string },
    operatorUserId?: string
  ): Promise<{ success: boolean; key: SecretVaultKey; newVersion: SecretKeyVersion }> {
    const key = await db('secret_vault_keys').where('id', id).first();
    if (!key) {
      throw new Error(`Vault key with id '${id}' not found`);
    }

    if (key.status === 'revoked' || key.status === 'compromised') {
      throw new Error(`Cannot rotate key in '${key.status}' status. Re-provision or restore key first.`);
    }

    const newVersionNumber = key.current_version + 1;
    const now = new Date();
    const intervalDays = key.rotation_interval_days || 90;
    const nextDue = new Date(now.getTime() + intervalDays * 86400000);

    // Transition existing active versions to grace_period
    await db('secret_key_versions')
      .where('key_id', id)
      .where('status', 'active')
      .update({
        status: 'grace_period',
        deprecated_at: now,
      });

    // Create new version
    const versionId = `ver-${id}-v${newVersionNumber}`;
    const fingerprint = crypto.createHash('sha256').update(`${id}:v${newVersionNumber}:${Date.now()}`).digest('hex');
    const algorithm = options?.algorithm || (key.key_type === 'jwt_signing_key' ? 'hmac-sha256' : 'aes-256-gcm');

    const newVersionRecord = {
      id: versionId,
      key_id: id,
      version_number: newVersionNumber,
      encrypted_key_material: `enc:v${newVersionNumber}:${key.vault_provider}:${crypto.randomBytes(32).toString('base64')}`,
      key_fingerprint: fingerprint,
      algorithm,
      status: 'active',
      activated_at: now,
      deprecated_at: null,
      revoked_at: null,
      rotation_trigger: options?.trigger || 'manual_operator',
      created_at: now,
    };

    await db('secret_key_versions').insert(newVersionRecord);

    // Update parent key
    await db('secret_vault_keys').where('id', id).update({
      current_version: newVersionNumber,
      status: 'active',
      last_rotated_at: now,
      next_rotation_due: nextDue,
      updated_at: now,
    });

    // Record in access audit log
    await db('secret_access_audit_logs').insert({
      id: `audit-${crypto.randomUUID().slice(0, 12)}`,
      key_id: id,
      version_number: newVersionNumber,
      accessor_service: 'socialforge-kms-rotation-engine',
      accessor_user_id: operatorUserId || null,
      operation: 'rotate',
      ip_address: '127.0.0.1',
      success: 1,
      failure_reason: null,
      created_at: now,
    });

    await this.emitAuditLog(
      operatorUserId,
      'ROTATE_SECRET_KEY',
      id,
      `Rotated secret key "${key.key_alias}" to version ${newVersionNumber}`,
      { keyAlias: key.key_alias, newVersion: newVersionNumber, trigger: options?.trigger || 'manual_operator' }
    );

    const updatedKey = (await this.getKeyById(id))!;
    const createdVersion = this.formatVersion(newVersionRecord);

    return {
      success: true,
      key: updatedKey,
      newVersion: createdVersion,
    };
  }

  /**
   * Emergency Revocation of Secret Key
   */
  async revokeKey(
    id: string,
    options: { reason: string },
    operatorUserId?: string
  ): Promise<SecretVaultKey> {
    if (!options.reason || options.reason.trim().length < 8) {
      throw new Error('Revocation reason must be at least 8 characters explaining the security justification');
    }

    const key = await db('secret_vault_keys').where('id', id).first();
    if (!key) {
      throw new Error(`Vault key with id '${id}' not found`);
    }

    const now = new Date();

    // Mark key as revoked
    await db('secret_vault_keys').where('id', id).update({
      status: 'revoked',
      updated_at: now,
    });

    // Revoke all versions
    await db('secret_key_versions')
      .where('key_id', id)
      .whereIn('status', ['active', 'grace_period'])
      .update({
        status: 'revoked',
        revoked_at: now,
      });

    // Access audit log
    await db('secret_access_audit_logs').insert({
      id: `audit-${crypto.randomUUID().slice(0, 12)}`,
      key_id: id,
      version_number: key.current_version,
      accessor_service: 'socialforge-emergency-revoker',
      accessor_user_id: operatorUserId || null,
      operation: 'revoke',
      ip_address: '127.0.0.1',
      success: 1,
      failure_reason: options.reason,
      created_at: now,
    });

    await this.emitAuditLog(
      operatorUserId,
      'EMERGENCY_REVOKE_SECRET_KEY',
      id,
      options.reason,
      { keyAlias: key.key_alias, reason: options.reason }
    );

    return (await this.getKeyById(id))!;
  }

  /**
   * Delete custom key (only if not a core seeded key)
   */
  async deleteKey(id: string, operatorUserId?: string): Promise<boolean> {
    const key = await db('secret_vault_keys').where('id', id).first();
    if (!key) {
      throw new Error(`Vault key with id '${id}' not found`);
    }

    const protectedKeys = [
      'key-meta-oauth-01',
      'key-master-dek-02',
      'key-jwt-signer-03',
      'key-webhook-hmac-04',
      'key-db-mesh-replicator-05',
    ];
    if (protectedKeys.includes(id)) {
      throw new Error(`Cannot delete protected core system key '${key.key_alias}'`);
    }

    await db('secret_vault_keys').where('id', id).delete();

    await this.emitAuditLog(
      operatorUserId,
      'DELETE_VAULT_KEY',
      id,
      `Deleted custom vault key "${key.key_alias}"`,
      { keyAlias: key.key_alias }
    );

    return true;
  }

  /**
   * Non-mutating In-Memory Envelope Re-Encryption Simulation
   */
  simulateEnvelopeReEncrypt(input?: { key_alias?: string; target_record_count?: number }): EnvelopeReEncryptSimulationResult {
    const alias = input?.key_alias || 'master-field-encryption-dek';
    const records = input?.target_record_count || 12500;
    const durationMs = Math.round(records * 0.038 + 12);

    const recommendations = [
      'Execute during off-peak maintenance window (02:00 - 04:00 UTC) to minimize I/O contention.',
      'Maintain grace period of 72 hours for version 3 before deprecation to allow in-flight worker job completion.',
      'Verify AWS KMS request quota permits minimum 450 requests/sec during envelope re-wrapping.',
    ];

    return {
      simulated: true,
      keyAlias: alias,
      currentVersion: 4,
      oldestActiveVersion: 3,
      evaluatedRecordCount: records,
      reEncryptedRecordCount: records,
      simulatedDurationMs: durationMs,
      dataIntegrityChecksumMatch: true,
      recommendations,
    };
  }

  /**
   * Helper formatting
   */
  private formatKey(row: any): SecretVaultKey {
    return {
      id: row.id,
      key_alias: row.key_alias,
      key_type: row.key_type,
      vault_provider: row.vault_provider,
      current_version: row.current_version,
      status: row.status,
      rotation_interval_days: row.rotation_interval_days,
      auto_rotate_enabled: Boolean(row.auto_rotate_enabled),
      last_rotated_at: row.last_rotated_at ? new Date(row.last_rotated_at).toISOString() : null,
      next_rotation_due: row.next_rotation_due ? new Date(row.next_rotation_due).toISOString() : null,
      grace_period_hours: row.grace_period_hours,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private formatVersion(row: any): SecretKeyVersion {
    return {
      id: row.id,
      key_id: row.key_id,
      version_number: row.version_number,
      encrypted_key_material: row.encrypted_key_material,
      key_fingerprint: row.key_fingerprint,
      algorithm: row.algorithm,
      status: row.status,
      activated_at: new Date(row.activated_at).toISOString(),
      deprecated_at: row.deprecated_at ? new Date(row.deprecated_at).toISOString() : null,
      revoked_at: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
      rotation_trigger: row.rotation_trigger,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private async emitAuditLog(
    operatorUserId: string | undefined,
    action: string,
    targetResourceId: string,
    reason: string,
    details?: any
  ): Promise<void> {
    try {
      let superadminId = operatorUserId;
      let superadminEmail = 'superadmin@socialforge.io';
      if (!superadminId) {
        const adminUser = await db('users').where({ is_superadmin: 1, is_active: 1 }).first();
        if (adminUser) {
          superadminId = adminUser.id;
          superadminEmail = adminUser.email;
        }
      } else {
        const u = await db('users').where({ id: superadminId }).first();
        if (u) superadminEmail = u.email;
      }

      if (superadminId) {
        await db('superadmin_audit_logs').insert({
          id: crypto.randomUUID(),
          superadmin_id: superadminId,
          superadmin_email: superadminEmail,
          action,
          target_resource_type: 'secret_rotation',
          target_resource_id: targetResourceId,
          reason,
          details: details ? JSON.stringify(details) : null,
          ip_address: '127.0.0.1',
          created_at: new Date(),
        });
      }
    } catch (err: any) {
      console.warn('[SecretRotationService] Audit log warning:', err.message);
    }
  }
}

export const secretRotationService = new SecretRotationService();

