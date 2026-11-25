import { Request, Response } from 'express';
import { EnterpriseSsoService } from '../services/superadmin/enterpriseSso.service.js';

export class EnterpriseSsoController {
  // ==========================================================
  // SUPERADMIN MISSION CONTROL ENDPOINTS
  // ==========================================================

  /**
   * GET /admin/operations/sso/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await EnterpriseSsoService.getOverview();
      res.json(overview);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve SSO overview' });
    }
  }

  /**
   * GET /admin/operations/sso/configs
   */
  static async listConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      const configs = await EnterpriseSsoService.listConfigs(tenantId as string);
      res.json(configs);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] listConfigs error:', err);
      res.status(500).json({ error: err.message || 'Failed to list SSO configs' });
    }
  }

  /**
   * POST /admin/operations/sso/configs
   */
  static async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await EnterpriseSsoService.createConfig(req.body, adminUser);
      res.status(201).json(result);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] createConfig error:', err);
      res.status(400).json({ error: err.message || 'Failed to create SSO config' });
    }
  }

  /**
   * PUT /admin/operations/sso/configs/:id
   */
  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await EnterpriseSsoService.updateConfig(id, req.body, adminUser);
      res.json(result);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] updateConfig error:', err);
      res.status(err.message?.includes('not found') ? 404 : 400).json({
        error: err.message || 'Failed to update SSO config',
      });
    }
  }

  /**
   * DELETE /admin/operations/sso/configs/:id
   */
  static async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      await EnterpriseSsoService.deleteConfig(id, adminUser);
      res.json({ success: true, message: `SSO configuration ${id} deleted.` });
    } catch (err: any) {
      console.error('[EnterpriseSsoController] deleteConfig error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to delete SSO config',
      });
    }
  }

  /**
   * POST /admin/operations/sso/configs/:id/simulate
   */
  static async simulateSaml(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await EnterpriseSsoService.simulateSamlAssertion(id, req.body, adminUser);
      res.json(result);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] simulateSaml error:', err);
      res.status(err.message?.includes('not found') ? 404 : 400).json({
        error: err.message || 'Failed to simulate SAML assertion',
      });
    }
  }

  /**
   * GET /admin/operations/sso/audits
   */
  static async listAudits(req: Request, res: Response): Promise<void> {
    try {
      const { configId, status, search, limit } = req.query;
      const audits = await EnterpriseSsoService.listAudits({
        configId: configId as string,
        status: status as any,
        search: search as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(audits);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] listAudits error:', err);
      res.status(500).json({ error: err.message || 'Failed to list SSO audits' });
    }
  }

  // ==========================================================
  // PUBLIC SSO AUTHENTICATION & SAML SP ENDPOINTS
  // ==========================================================

  /**
   * GET /auth/sso/lookup?domain=acme-corp.com
   */
  static async lookupDomain(req: Request, res: Response): Promise<void> {
    try {
      const domain = (req.query.domain || req.query.email) as string;
      if (!domain) {
        res.status(400).json({ error: 'Domain or email parameter is required.' });
        return;
      }
      const result = await EnterpriseSsoService.lookupDomain(domain);
      res.json(result);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] lookupDomain error:', err);
      res.status(500).json({ error: err.message || 'Failed to lookup SSO domain' });
    }
  }

  /**
   * GET /auth/sso/saml/:configId/metadata
   */
  static async getSpMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const xml = await EnterpriseSsoService.generateSpMetadataXml(configId);
      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] getSpMetadata error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to generate SP metadata',
      });
    }
  }

  /**
   * POST /auth/sso/saml/:configId/acs
   * Assertion Consumer Service endpoint handling IdP POST callback
   */
  static async handleSamlAcs(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      const authResult = await EnterpriseSsoService.processSamlAcs({
        configId,
        body: req.body,
        ipAddress,
        userAgent,
      });

      res.json(authResult);
    } catch (err: any) {
      console.error('[EnterpriseSsoController] handleSamlAcs error:', err);
      res.status(400).json({ error: err.message || 'SAML Authentication Failed' });
    }
  }
}
