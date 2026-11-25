import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { encryptSecret, decryptSecret, maskSecret } from '../cryptoVault.js';
import type { StoredCredentials } from '@socialforge/shared';

export interface VaultCredentialRecord {
  id: string;
  tenant_id: string;
  connection_id: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  algorithm: string;
  key_version: number;
  created_at: Date;
  updated_at: Date;
}

export class CredentialVaultService {
  /**
   * Encrypts and securely stores provider credentials in connection_credentials.
   * Returns a unique credential_reference string (e.g. cred_<uuid>).
   */
  public async storeCredentials(
    tenantId: string,
    connectionId: string,
    credentials: StoredCredentials
  ): Promise<string> {
    if (!tenantId) {
      throw new Error('Tenant context is required to store credentials.');
    }
    if (!connectionId) {
      throw new Error('Connection ID is required to store credentials.');
    }

    const credentialId = `cred_${crypto.randomUUID()}`;
    const serialized = JSON.stringify(credentials);
    const cipherText = encryptSecret(serialized);

    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Cryptographic vault failed to generate valid ciphertext.');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;

    // Check if credentials already exist for this connection to update in-place
    const existingCred = await db('connection_credentials')
      .where({ tenant_id: tenantId, connection_id: connectionId })
      .first();

    if (existingCred) {
      await db('connection_credentials')
        .where({ id: existingCred.id })
        .update({
          encrypted_data: encryptedDataHex,
          iv: ivHex,
          auth_tag: authTagHex,
          algorithm: 'aes-256-gcm',
          key_version: (existingCred.key_version || 1) + 1,
          updated_at: new Date(),
        });

      await db('social_connections')
        .where({ id: connectionId, tenant_id: tenantId })
        .update({
          credential_reference: existingCred.id,
          updated_at: new Date(),
        });

      return existingCred.id;
    }

    await db('connection_credentials').insert({
      id: credentialId,
      tenant_id: tenantId,
      connection_id: connectionId,
      encrypted_data: encryptedDataHex,
      iv: ivHex,
      auth_tag: authTagHex,
      algorithm: 'aes-256-gcm',
      key_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Link credential_reference in social_connections
    await db('social_connections')
      .where({ id: connectionId, tenant_id: tenantId })
      .update({
        credential_reference: credentialId,
        updated_at: new Date(),
      });

    return credentialId;
  }

  /**
   * Authoritatively retrieves and decrypts stored credentials server-side.
   * Enforces strict tenant ownership check: caller tenantId MUST match record tenant_id.
   * Never exposed to frontend or AI agents.
   */
  public async getCredentials(
    tenantId: string,
    credentialReference: string
  ): Promise<StoredCredentials> {
    if (!tenantId || !credentialReference) {
      throw new Error('Tenant ID and credential reference are required.');
    }

    const record = await db('connection_credentials')
      .where({ id: credentialReference, tenant_id: tenantId })
      .first();

    if (!record) {
      throw new Error('Credentials not found or access denied for this tenant.');
    }

    try {
      const cipherString = `${record.iv}:${record.auth_tag}:${record.encrypted_data}`;
      const decrypted = decryptSecret(cipherString);
      return JSON.parse(decrypted) as StoredCredentials;
    } catch (err: any) {
      // Never include secret details in error message
      console.error('[CredentialVault] Failed to decrypt credentials:', err.message);
      throw new Error('Failed to decrypt credentials. The encryption key may have rotated.');
    }
  }

  /**
   * Updates credentials in-place for an existing credential reference.
   */
  public async updateCredentials(
    tenantId: string,
    credentialReference: string,
    newCredentials: StoredCredentials
  ): Promise<void> {
    if (!tenantId || !credentialReference) {
      throw new Error('Tenant ID and credential reference are required.');
    }

    const existing = await db('connection_credentials')
      .where({ id: credentialReference, tenant_id: tenantId })
      .first();

    if (!existing) {
      throw new Error('Credentials not found for tenant.');
    }

    const serialized = JSON.stringify(newCredentials);
    const cipherText = encryptSecret(serialized);
    const [ivHex, authTagHex, encryptedDataHex] = cipherText.split(':');

    await db('connection_credentials')
      .where({ id: credentialReference, tenant_id: tenantId })
      .update({
        encrypted_data: encryptedDataHex,
        iv: ivHex,
        auth_tag: authTagHex,
        updated_at: new Date(),
      });
  }

  /**
   * Permanently deletes credential record for a tenant.
   */
  public async deleteCredentials(
    tenantId: string,
    credentialReference: string
  ): Promise<void> {
    if (!tenantId || !credentialReference) return;

    await db('connection_credentials')
      .where({ id: credentialReference, tenant_id: tenantId })
      .delete();
  }

  /**
   * Sanitizes and masks credential values for API responses.
   * Guarantees raw tokens or secrets are NEVER sent to the client.
   */
  public maskCredentials(credentials?: StoredCredentials | null): Record<string, string> {
    if (!credentials) return {};
    const masked: Record<string, string> = {};

    if (credentials.accessToken) {
      masked.accessToken = maskSecret(credentials.accessToken);
    }
    if (credentials.refreshToken) {
      masked.refreshToken = maskSecret(credentials.refreshToken);
    }
    if (credentials.apiKey) {
      masked.apiKey = maskSecret(credentials.apiKey);
    }
    if (credentials.apiSecret) {
      masked.apiSecret = maskSecret(credentials.apiSecret);
    }
    if (credentials.clientSecret) {
      masked.clientSecret = maskSecret(credentials.clientSecret);
    }
    if (credentials.clientId) {
      masked.clientId = credentials.clientId;
    }
    if (credentials.tokenType) {
      masked.tokenType = credentials.tokenType;
    }
    if (credentials.expiresAt) {
      masked.expiresAt = String(credentials.expiresAt);
    }

    return masked;
  }
}

export const credentialVaultService = new CredentialVaultService();
