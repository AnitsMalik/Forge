import { db } from '../../db/connection.js';
import { automationRunnerService } from './automationRunner.service.js';
import { idempotencyService } from './idempotency.service.js';
import type { SupportedTriggerType } from './types.js';

export class TriggerService {
  /**
   * Universal trigger dispatcher supporting all 10 Stage 5 trigger categories:
   * 1. New/changed Drive file
   * 2. New/updated spreadsheet row
   * 3. Excel/CSV import completed
   * 4. New commerce product
   * 5. CRM event/offer
   * 6. Scheduled time
   * 7. Campaign milestone
   * 8. Analytics winner detected
   * 9. Manual Run Now
   * 10. Connector webhook/event
   */
  public async dispatchTrigger(
    tenantId: string,
    triggerType: SupportedTriggerType | string,
    payload: any = {}
  ): Promise<any[]> {
    // Standardize trigger type categories
    const normalizedType = triggerType.toLowerCase();
    const targetBrandId = payload.brandId || payload.brand_id;

    // Duplicate-event protection at the dispatcher level (60-second window)
    const eventFingerprint = payload.eventId || payload.id || payload.sourceRecordId;
    if (eventFingerprint && payload.preventDuplicates !== false) {
      const dedupeKey = `trig_ev_${tenantId}_${targetBrandId || 'all'}_${normalizedType}_${eventFingerprint}`;
      const acquired = await idempotencyService.checkAndAcquire(dedupeKey, 60);
      if (!acquired) {
        return [{
          skipped: true,
          reason: 'Duplicate trigger event suppressed at dispatcher layer.',
          fingerprint: eventFingerprint,
          triggerType: normalizedType,
        }];
      }
    }

    // Query active automations for the tenant matching this trigger type or generic family
    let query = db('automations').where({
      tenant_id: tenantId,
      status: 'active',
    });

    // Multi-brand filtering: if payload specifies brandId or brand_id, restrict query
    if (targetBrandId) {
      query = query.andWhere({ brand_id: targetBrandId });
    }

    const automations = await query.select('*');

    const matching = automations.filter((a) => {
      const aType = (a.trigger_type || '').toLowerCase();
      if (aType === normalizedType) return true;

      // Family matches
      if (normalizedType.startsWith('drive.') && (aType === 'drive' || aType === 'datasource_change')) return true;
      if (normalizedType.startsWith('sheets.') && (aType === 'sheets' || aType === 'datasource_change')) return true;
      if ((normalizedType.startsWith('csv.') || normalizedType.startsWith('excel.')) && (aType === 'csv' || aType === 'excel' || aType === 'datasource_change')) return true;
      if (normalizedType.startsWith('commerce.') && (aType === 'commerce' || aType === 'product')) return true;
      if (normalizedType.startsWith('crm.') && (aType === 'crm' || aType === 'offer')) return true;
      if (normalizedType.startsWith('schedule.') && (aType === 'schedule' || aType === 'cron')) return true;
      if (normalizedType.startsWith('campaign.') && (aType === 'campaign' || aType === 'milestone')) return true;
      if ((normalizedType.startsWith('analytics.') || normalizedType.startsWith('analytics_')) && (aType === 'analytics' || aType === 'metric_threshold' || aType === 'analytics_winner_detected' || aType === 'analytics.winner_detected')) return true;
      if (normalizedType === 'manual.run_now' && (aType === 'manual' || aType === 'schedule')) return true;
      if ((normalizedType.startsWith('connector.') || normalizedType.startsWith('webhook.')) && (aType === 'webhook' || aType === 'connector')) return true;

      return false;
    });

    const results: any[] = [];
    for (const auto of matching) {
      const eventWithMeta = {
        ...payload,
        triggerType: normalizedType,
        triggeredAt: new Date().toISOString(),
      };

      const res = await automationRunnerService.executeAutomation(tenantId, auto.id, eventWithMeta);
      results.push({ automationId: auto.id, result: res });
    }

    return results;
  }

  /**
   * 1. Drive Trigger (New/changed file)
   */
  public async handleDriveTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'drive.file_changed', payload);
  }

  /**
   * 2. Sheets Trigger (New/updated spreadsheet row)
   */
  public async handleSheetsTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'sheets.row_added', payload);
  }

  /**
   * 3. Excel/CSV Import Completed Trigger
   */
  public async handleCsvImportTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'csv.import_completed', payload);
  }

  /**
   * 4. Commerce Product Trigger (New product created/updated)
   */
  public async handleCommerceProductTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'commerce.product_created', payload);
  }

  /**
   * 5. CRM Event / Offer Trigger
   */
  public async handleCrmEventTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'crm.event', payload);
  }

  /**
   * 6. Scheduled Time Trigger
   */
  public async handleScheduleTrigger(tenantId: string, automationId: string, payload: any = {}) {
    return await automationRunnerService.executeAutomation(tenantId, automationId, {
      ...payload,
      triggerType: 'schedule.cron',
      triggeredAt: new Date().toISOString(),
    });
  }

  /**
   * 7. Campaign Milestone Trigger
   */
  public async handleCampaignMilestoneTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'campaign.milestone_reached', payload);
  }

  /**
   * 8. Analytics Winner / Performance Trigger
   */
  public async handleAnalyticsWinnerTrigger(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'analytics.winner_detected', payload);
  }

  /**
   * 9. Manual Run Now Trigger
   */
  public async handleManualRunNow(tenantId: string, automationId: string, payloadOverride?: any) {
    return await automationRunnerService.executeAutomation(
      tenantId,
      automationId,
      payloadOverride || { source: 'manual_run_now', triggerType: 'manual.run_now', timestamp: new Date().toISOString() }
    );
  }

  /**
   * 10. Connector Webhook / Event Trigger
   */
  public async handleConnectorEvent(tenantId: string, payload: any) {
    return await this.dispatchTrigger(tenantId, 'connector.event', payload);
  }

  /**
   * Inbound Webhook Token Trigger (backward-compatible)
   */
  public async handleWebhookTrigger(webhookToken: string, payload: any) {
    if (!webhookToken) {
      throw new Error('Webhook token is required.');
    }

    const automations = await db('automations')
      .where('status', 'active')
      .andWhere('trigger_type', 'webhook')
      .select('*');

    const matching = automations.find((a) => {
      try {
        const config = typeof a.trigger_config === 'string' ? JSON.parse(a.trigger_config) : a.trigger_config || {};
        return config.webhookToken === webhookToken;
      } catch {
        return false;
      }
    });

    if (!matching) {
      throw new Error('No active automation matches this webhook token.');
    }

    return await automationRunnerService.executeAutomation(
      matching.tenant_id,
      matching.id,
      payload || { source: 'inbound_webhook', triggerType: 'connector.webhook', timestamp: new Date().toISOString() }
    );
  }

  /**
   * Datasource Change Event Trigger (backward-compatible)
   */
  public async handleDatasourceChange(
    tenantId: string,
    connectionId: string,
    resourceId?: string,
    changePayload?: any
  ) {
    const automations = await db('automations')
      .where({
        tenant_id: tenantId,
        status: 'active',
        trigger_type: 'datasource_change',
      })
      .select('*');

    const results: any[] = [];

    for (const auto of automations) {
      let config: any = {};
      try {
        config = typeof auto.trigger_config === 'string' ? JSON.parse(auto.trigger_config) : auto.trigger_config || {};
      } catch {}

      const matchesConnection = !config.sourceConnectionId || config.sourceConnectionId === connectionId;
      const matchesResource = !config.resourceId || !resourceId || config.resourceId === resourceId;

      if (matchesConnection && matchesResource) {
        const runRes = await automationRunnerService.executeAutomation(
          tenantId,
          auto.id,
          changePayload || { connectionId, resourceId, triggerType: 'datasource.changed', timestamp: new Date().toISOString() }
        );
        results.push({ automationId: auto.id, result: runRes });
      }
    }

    return results;
  }

  /**
   * Manual Trigger (backward-compatible)
   */
  public async handleManualTrigger(
    tenantId: string,
    automationId: string,
    payloadOverride?: any
  ) {
    return await this.handleManualRunNow(tenantId, automationId, payloadOverride);
  }
}

export const triggerService = new TriggerService();
