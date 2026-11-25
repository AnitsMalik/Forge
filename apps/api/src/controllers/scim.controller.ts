import { Request, Response } from 'express';
import { ScimService } from '../services/superadmin/scim.service.js';

export class ScimController {
  // ============================================================================
  // HELPER FOR SCIM ERROR RESPONSES
  // ============================================================================

  private static sendScimError(
    res: Response,
    status: number,
    detail: string,
    scimType?: string
  ) {
    res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
    return res.status(status).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status: String(status),
      scimType: scimType || undefined,
      detail,
    });
  }

  private static getBaseUrl(req: Request): string {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:4000';
    return `${protocol}://${host}${req.baseUrl}`;
  }

  // ============================================================================
  // SCIM 2.0 PROTOCOL ENDPOINTS (RFC 7643 & RFC 7644)
  // ============================================================================

  /**
   * GET /ServiceProviderConfig
   */
  static async getServiceProviderConfig(req: Request, res: Response): Promise<void> {
    try {
      const baseUrl = ScimController.getBaseUrl(req);
      const config = ScimService.getServiceProviderConfig(baseUrl);
      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(config);
    } catch (err: any) {
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  /**
   * GET /Schemas
   */
  static async getSchemas(req: Request, res: Response): Promise<void> {
    try {
      const baseUrl = ScimController.getBaseUrl(req);
      const schemas = ScimService.getSchemas(baseUrl);
      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(schemas);
    } catch (err: any) {
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  /**
   * GET /Schemas/:id
   */
  static async getSchemaById(req: Request, res: Response): Promise<void> {
    try {
      const baseUrl = ScimController.getBaseUrl(req);
      const { id } = req.params;
      if (id === 'urn:ietf:params:scim:schemas:core:2.0:User') {
        res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
        res.status(200).json(ScimService.getUserSchema(baseUrl));
        return;
      }
      if (id === 'urn:ietf:params:scim:schemas:core:2.0:Group') {
        res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
        res.status(200).json(ScimService.getGroupSchema(baseUrl));
        return;
      }
      ScimController.sendScimError(res, 404, `Schema ${id} not found`);
    } catch (err: any) {
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  /**
   * GET /Users
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      await ScimService.logSyncEvent({
        method: req.method,
        endpoint: req.originalUrl || req.url,
        action: 'query',
        statusCode: 401,
        ipAddress: req.ip,
        errorDetail: authErr.message,
      });
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    try {
      const { filter, startIndex, count } = req.query;
      const listResponse = await ScimService.getUsers({
        filter: filter as string,
        startIndex: startIndex ? Number(startIndex) : undefined,
        count: count ? Number(count) : undefined,
        baseUrl,
        tokenTenantId: token.tenantId,
      });

      await ScimService.logSyncEvent({
        tenantId: token.tenantId,
        tokenId: token.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        action: 'query',
        statusCode: 200,
        ipAddress: req.ip,
      });

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(listResponse);
    } catch (err: any) {
      await ScimService.logSyncEvent({
        tenantId: token?.tenantId,
        tokenId: token?.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        action: 'query',
        statusCode: 500,
        ipAddress: req.ip,
        errorDetail: err.message,
      });
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  /**
   * GET /Users/:id
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    try {
      const { id } = req.params;
      const user = await ScimService.getUserById(id, baseUrl, token.tenantId);
      if (!user) {
        ScimController.sendScimError(res, 404, `User ${id} not found`);
        return;
      }

      await ScimService.logSyncEvent({
        tenantId: token.tenantId,
        tokenId: token.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        scimResourceId: id,
        action: 'read',
        statusCode: 200,
        ipAddress: req.ip,
      });

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(user);
    } catch (err: any) {
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  /**
   * POST /Users
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    try {
      const user = await ScimService.createUser(req.body, baseUrl, token.tenantId);

      await ScimService.logSyncEvent({
        tenantId: token.tenantId,
        tokenId: token.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        scimResourceId: user.id,
        action: 'create',
        statusCode: 201,
        ipAddress: req.ip,
        requestPayload: req.body,
      });

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.setHeader('Location', `${baseUrl}/Users/${user.id}`);
      res.status(201).json(user);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      await ScimService.logSyncEvent({
        tenantId: token?.tenantId,
        tokenId: token?.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        action: 'create',
        statusCode,
        ipAddress: req.ip,
        requestPayload: req.body,
        errorDetail: err.message,
      });
      ScimController.sendScimError(res, statusCode, err.message, err.scimType);
    }
  }

  /**
   * PUT /Users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    const { id } = req.params;
    try {
      const updated = await ScimService.updateUser(id, req.body, baseUrl, token.tenantId);

      await ScimService.logSyncEvent({
        tenantId: token.tenantId,
        tokenId: token.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        scimResourceId: id,
        action: 'update',
        statusCode: 200,
        ipAddress: req.ip,
        requestPayload: req.body,
      });

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(updated);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      ScimController.sendScimError(res, statusCode, err.message, err.scimType);
    }
  }

  /**
   * PATCH /Users/:id
   */
  static async patchUser(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    const { id } = req.params;
    try {
      const updated = await ScimService.patchUser(id, req.body, baseUrl, token.tenantId);
      const isDeactivated = updated.active === false;
      const action = isDeactivated ? 'deactivate' : 'patch';

      await ScimService.logSyncEvent({
        tenantId: token.tenantId,
        tokenId: token.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        scimResourceId: id,
        action,
        statusCode: 200,
        ipAddress: req.ip,
        requestPayload: req.body,
      });

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(updated);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      await ScimService.logSyncEvent({
        tenantId: token?.tenantId,
        tokenId: token?.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        scimResourceId: id,
        action: 'patch',
        statusCode,
        ipAddress: req.ip,
        requestPayload: req.body,
        errorDetail: err.message,
      });
      ScimController.sendScimError(res, statusCode, err.message, err.scimType);
    }
  }

  /**
   * DELETE /Users/:id
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    const { id } = req.params;
    try {
      await ScimService.deleteUser(id, token.tenantId);

      await ScimService.logSyncEvent({
        tenantId: token.tenantId,
        tokenId: token.id,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        scimResourceType: 'User',
        scimResourceId: id,
        action: 'delete',
        statusCode: 204,
        ipAddress: req.ip,
      });

      res.status(204).send();
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      ScimController.sendScimError(res, statusCode, err.message, err.scimType);
    }
  }

  /**
   * GET /Groups
   */
  static async getGroups(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    try {
      const groups = await ScimService.getGroups({
        baseUrl,
        tokenTenantId: token.tenantId,
      });

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(groups);
    } catch (err: any) {
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  /**
   * GET /Groups/:id
   */
  static async getGroupById(req: Request, res: Response): Promise<void> {
    const baseUrl = ScimController.getBaseUrl(req);
    let token: any = null;
    try {
      token = await ScimService.authenticateBearerToken(
        req.headers.authorization || '',
        req.ip
      );
    } catch (authErr: any) {
      ScimController.sendScimError(res, 401, authErr.message || 'Unauthorized');
      return;
    }

    const { id } = req.params;
    try {
      const group = await ScimService.getGroupById(id, baseUrl, token.tenantId);
      if (!group) {
        ScimController.sendScimError(res, 404, `Group ${id} not found`);
        return;
      }

      res.setHeader('Content-Type', 'application/scim+json; charset=utf-8');
      res.status(200).json(group);
    } catch (err: any) {
      ScimController.sendScimError(res, 500, err.message || 'Internal error');
    }
  }

  // ============================================================================
  // SUPERADMIN MISSION CONTROL OPERATIONS
  // ============================================================================

  /**
   * GET /admin/operations/scim/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await ScimService.getOverview();
      res.json(overview);
    } catch (err: any) {
      console.error('[ScimController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve SCIM overview' });
    }
  }

  /**
   * GET /admin/operations/scim/tokens
   */
  static async listTokens(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await ScimService.listTokens();
      res.json(tokens);
    } catch (err: any) {
      console.error('[ScimController] listTokens error:', err);
      res.status(500).json({ error: err.message || 'Failed to list SCIM tokens' });
    }
  }

  /**
   * POST /admin/operations/scim/tokens
   */
  static async createToken(req: Request, res: Response): Promise<void> {
    try {
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const created = await ScimService.createToken(
        req.body,
        superadmin.id,
        superadmin.email
      );
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[ScimController] createToken error:', err);
      res.status(400).json({ error: err.message || 'Failed to create SCIM token' });
    }
  }

  /**
   * POST /admin/operations/scim/tokens/:id/revoke
   */
  static async revokeToken(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const revoked = await ScimService.revokeToken(
        id,
        superadmin.id,
        superadmin.email
      );
      res.json(revoked);
    } catch (err: any) {
      console.error('[ScimController] revokeToken error:', err);
      res.status(400).json({ error: err.message || 'Failed to revoke SCIM token' });
    }
  }

  /**
   * POST /admin/operations/scim/tokens/:id/rotate
   */
  static async rotateToken(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const rotated = await ScimService.rotateToken(
        id,
        superadmin.id,
        superadmin.email
      );
      res.json(rotated);
    } catch (err: any) {
      console.error('[ScimController] rotateToken error:', err);
      res.status(400).json({ error: err.message || 'Failed to rotate SCIM token' });
    }
  }

  /**
   * GET /admin/operations/scim/logs
   */
  static async listLogs(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset, action } = req.query;
      const logs = await ScimService.listLogs({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        action: action as string,
      });
      res.json(logs);
    } catch (err: any) {
      console.error('[ScimController] listLogs error:', err);
      res.status(500).json({ error: err.message || 'Failed to list SCIM logs' });
    }
  }
}
