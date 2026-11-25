import { Request, Response } from 'express';
import { DisasterRecoveryService } from '../services/superadmin/disasterRecovery.service.js';

export class DisasterRecoveryController {
  /**
   * GET /admin/operations/dr/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await DisasterRecoveryService.getDrOverview();
      res.json(overview);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve DR overview' });
    }
  }

  /**
   * GET /admin/operations/dr/snapshots
   */
  static async listSnapshots(req: Request, res: Response): Promise<void> {
    try {
      const { type, tier, status } = req.query;
      const snapshots = await DisasterRecoveryService.listSnapshots({
        type: type as string,
        tier: tier as string,
        status: status as string,
      });
      res.json(snapshots);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] listSnapshots error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve snapshots' });
    }
  }

  /**
   * POST /admin/operations/dr/snapshots
   */
  static async createSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { snapshotType, storageTier, replicaRegions, reason, confirmed, retentionDays } = req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      if (!reason || reason.trim().length < 8) {
        res.status(400).json({ error: 'Mandatory operator justification must be at least 8 characters.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const snapshot = await DisasterRecoveryService.createSnapshot(
        {
          snapshotType: snapshotType || 'manual_operator',
          storageTier: storageTier || 'multi_region_replica',
          replicaRegions,
          reason,
          retentionDays,
        },
        adminUser
      );

      res.status(201).json(snapshot);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] createSnapshot error:', err);
      res.status(400).json({ error: err.message || 'Failed to create backup snapshot' });
    }
  }

  /**
   * POST /admin/operations/dr/snapshots/:id/drill
   */
  static async executeDrill(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { drillType, targetEnv, reason, confirmed } = req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      if (!reason || reason.trim().length < 8) {
        res.status(400).json({ error: 'Mandatory operator justification must be at least 8 characters.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await DisasterRecoveryService.executeDrill(
        id,
        drillType || 'superadmin_manual',
        targetEnv || 'isolated_sandbox',
        reason,
        adminUser
      );

      res.json(result);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] executeDrill error:', err);
      res.status(400).json({ error: err.message || 'Failed to execute DR drill' });
    }
  }

  /**
   * GET /admin/operations/dr/drills
   */
  static async listDrills(req: Request, res: Response): Promise<void> {
    try {
      const drills = await DisasterRecoveryService.listDrills();
      res.json(drills);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] listDrills error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve drill logs' });
    }
  }

  /**
   * POST /admin/operations/dr/tenant-backup
   */
  static async requestTenantBackup(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, format, reason, confirmed } = req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      if (!reason || reason.trim().length < 8) {
        res.status(400).json({ error: 'Mandatory operator justification must be at least 8 characters.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const backup = await DisasterRecoveryService.requestTenantBackup(
        tenantId,
        format || 'sql_gz',
        reason,
        adminUser
      );

      res.status(201).json(backup);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] requestTenantBackup error:', err);
      res.status(400).json({ error: err.message || 'Failed to request tenant backup' });
    }
  }

  /**
   * GET /admin/operations/dr/tenant-backups
   */
  static async listTenantBackups(req: Request, res: Response): Promise<void> {
    try {
      const backups = await DisasterRecoveryService.listTenantBackups();
      res.json(backups);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] listTenantBackups error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve tenant backups' });
    }
  }

  /**
   * GET /admin/operations/dr/tenant-backups/:id/download
   */
  static async downloadTenantBackup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const backup = await DisasterRecoveryService.getTenantBackupById(id);
      if (!backup) {
        res.status(404).json({ error: 'Tenant backup archive not found' });
        return;
      }

      if (backup.status === 'expired' || new Date(backup.downloadExpiresAt) < new Date()) {
        res.status(410).json({ error: 'Tenant backup download link has expired' });
        return;
      }

      const isSql = backup.format === 'sql_gz';
      const filename = `${backup.id}.${isSql ? 'sql.gz' : 'json'}`;
      const contentType = isSql ? 'application/gzip' : 'application/json';

      const payload = isSql
        ? Buffer.from(`-- SOCIALFORGE TENANT EXPORT DUMP\n-- TENANT_ID: ${backup.tenantId}\n-- CHECKSUM: ${backup.checksumSha256}\n-- CREATED_AT: ${backup.createdAt}\n`)
        : JSON.stringify({
            tenantId: backup.tenantId,
            exportId: backup.id,
            checksumSha256: backup.checksumSha256,
            generatedAt: backup.createdAt,
            archiveFormat: backup.format,
          });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Checksum-SHA256', backup.checksumSha256);
      res.setHeader('Content-Length', Buffer.byteLength(payload));
      res.send(payload);
    } catch (err: any) {
      console.error('[DisasterRecoveryController] downloadTenantBackup error:', err);
      res.status(500).json({ error: err.message || 'Failed to download tenant backup' });
    }
  }
}
