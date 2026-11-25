/**
 * Enterprise Custom Roles & Granular RBAC Permissions Controller
 * SocialForge Platform v4.4.0
 */

import { Request, Response, NextFunction } from 'express';
import { rbacService } from '../services/superadmin/rbac.service.js';

export class RbacController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const metrics = await rbacService.getOverview(tenantId);
      res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }

  async listPermissions(_req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = rbacService.listPermissions();
      res.json({ success: true, data: permissions });
    } catch (err) {
      next(err);
    }
  }

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const search = req.query.search as string | undefined;
      const roles = await rbacService.listRoles({ tenantId, search });
      res.json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  }

  async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.query.tenantId as string | undefined;
      const role = await rbacService.getRole(id, tenantId);
      if (!role) {
        return res.status(404).json({ success: false, error: 'Role not found' });
      }
      res.json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  }

  async createCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const created = await rbacService.createCustomRole(req.body, actor);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to create custom role' });
    }
  }

  async updateCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const updated = await rbacService.updateCustomRole(id, req.body, actor);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to update custom role' });
    }
  }

  async deleteCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const result = await rbacService.deleteCustomRole(id, actor);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to delete custom role' });
    }
  }

  async simulatePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await rbacService.simulatePermissionEvaluation(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to simulate permission' });
    }
  }

  async listUserAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId || '';
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required' });
      }
      const assignments = await rbacService.listUserAssignments(tenantId);
      res.json({ success: true, data: assignments });
    } catch (err) {
      next(err);
    }
  }

  async assignUserCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const result = await rbacService.assignUserCustomRole(req.body, actor);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to assign custom role' });
    }
  }

  async unassignUserCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const result = await rbacService.unassignUserCustomRole(id, actor);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to unassign custom role' });
    }
  }

  async listUserOverrides(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId || '';
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required' });
      }
      const overrides = await rbacService.listUserOverrides(tenantId);
      res.json({ success: true, data: overrides });
    } catch (err) {
      next(err);
    }
  }

  async createPermissionOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const created = await rbacService.createPermissionOverride(req.body, actor);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to create permission override' });
    }
  }

  async deletePermissionOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actor = {
        id: req.user?.userId || 'unknown-admin',
        email: req.user?.email || 'admin@socialforge.ai',
      };
      const result = await rbacService.deletePermissionOverride(id, actor);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to delete permission override' });
    }
  }

  async getUserEffectivePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = req.params;
      const effective = await rbacService.resolveEffectivePermissions(tenantId, userId);
      res.json({ success: true, data: effective });
    } catch (err) {
      next(err);
    }
  }
}

export const rbacController = new RbacController();
