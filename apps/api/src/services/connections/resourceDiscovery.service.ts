import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { connectionService } from './connection.service.js';
import { credentialVaultService } from './credentialVault.service.js';
import { ConnectorRegistry } from '../../connectors/core/ConnectorRegistry.js';
import type { DiscoveredResource } from '@socialforge/shared';

export class ResourceDiscoveryService {
  /**
   * Discovers and persists external resources (folders, sheets, pages, stores)
   * for a given connection with strict tenant scoping.
   */
  public async discoverAndPersistResources(
    tenantId: string,
    connectionId: string
  ): Promise<DiscoveredResource[]> {
    const conn = await connectionService.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for current workspace.');
    }

    const connector = ConnectorRegistry.get(conn.provider);
    if (!connector) {
      // Return existing resources from DB if no active connector registered
      return this.listDiscoveredResources(tenantId, connectionId);
    }

    let credentials: any = {};
    if (conn.credential_reference) {
      try {
        credentials = await credentialVaultService.getCredentials(tenantId, conn.credential_reference);
      } catch (err: any) {
        console.warn('[ResourceDiscovery] Could not decrypt credentials:', err.message);
      }
    }

    const discovered = await connector.discoverResources({
      tenantId,
      connectionId,
      brandId: conn.brand_id,
      credentials,
    });

    const now = new Date();

    // Persist discovered resources into connector_resources
    for (const res of discovered) {
      const existing = await db('connector_resources')
        .where({
          tenant_id: tenantId,
          connection_id: connectionId,
          external_resource_id: res.externalResourceId,
        })
        .first();

      if (existing) {
        await db('connector_resources')
          .where({ id: existing.id })
          .update({
            resource_name: res.name,
            resource_type: res.resourceType,
            config: JSON.stringify(res.metadata || {}),
            updated_at: now,
          });
      } else {
        await db('connector_resources').insert({
          id: res.id || crypto.randomUUID(),
          tenant_id: tenantId,
          connection_id: connectionId,
          brand_id: conn.brand_id || null,
          resource_type: res.resourceType,
          external_resource_id: res.externalResourceId,
          resource_name: res.name,
          is_selected: res.isSelected !== false,
          config: JSON.stringify(res.metadata || {}),
          created_at: now,
          updated_at: now,
        });
      }
    }

    await connectionService.logEvent({
      connectionId,
      tenantId,
      brandId: conn.brand_id,
      eventType: 'resources_discovered',
      status: 'success',
      details: { discoveredCount: discovered.length },
    });

    return this.listDiscoveredResources(tenantId, connectionId);
  }

  /**
   * Lists discovered resources for a connection with tenant verification.
   */
  public async listDiscoveredResources(
    tenantId: string,
    connectionId?: string,
    brandId?: string | null
  ): Promise<DiscoveredResource[]> {
    let query = db('connector_resources').where({ tenant_id: tenantId });

    if (connectionId) {
      query = query.andWhere({ connection_id: connectionId });
    }
    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }

    const rows = await query.orderBy('created_at', 'asc');

    return rows.map((r) => {
      let meta: any = {};
      try {
        const raw = r.config || r.metadata;
        meta = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
      } catch {
        meta = {};
      }

      return {
        id: r.id,
        connectionId: r.connection_id,
        tenantId: r.tenant_id,
        brandId: r.brand_id,
        resourceType: r.resource_type,
        externalResourceId: r.external_resource_id,
        name: r.resource_name || r.name,
        isSelected: Boolean(r.is_selected),
        metadata: meta,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  /**
   * Toggles selection state of a discovered resource (e.g. active folder or sheet).
   */
  public async toggleResourceSelection(
    tenantId: string,
    resourceId: string,
    isSelected: boolean
  ): Promise<DiscoveredResource> {
    const resource = await db('connector_resources')
      .where({ id: resourceId, tenant_id: tenantId })
      .first();

    if (!resource) {
      throw new Error('Resource not found or access denied for tenant.');
    }

    await db('connector_resources')
      .where({ id: resourceId, tenant_id: tenantId })
      .update({
        is_selected: isSelected,
        updated_at: new Date(),
      });

    const updated = await db('connector_resources')
      .where({ id: resourceId, tenant_id: tenantId })
      .first();

    const rawMeta = updated.config || updated.metadata;
    let meta: any = {};
    try {
      meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta || {};
    } catch {
      meta = {};
    }

    return {
      id: updated.id,
      connectionId: updated.connection_id,
      tenantId: updated.tenant_id,
      brandId: updated.brand_id,
      resourceType: updated.resource_type,
      externalResourceId: updated.external_resource_id,
      name: updated.resource_name || updated.name,
      isSelected: Boolean(updated.is_selected),
      metadata: meta,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
}

export const resourceDiscoveryService = new ResourceDiscoveryService();
