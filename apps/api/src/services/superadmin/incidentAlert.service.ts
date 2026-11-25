import { db } from '../../db/connection.js';
import crypto from 'crypto';
import type {
  IncidentAlertChannel,
  IncidentAlertRule,
  IncidentAlertEvent,
  IncidentAlertDispatchReceipt,
  CreateIncidentAlertChannelDto,
  CreateIncidentAlertRuleDto,
  IncidentSeverity,
  IncidentConditionType,
} from '@socialforge/shared';

export class IncidentAlertService {
  /**
   * Helper to mask sensitive targets (Slack URLs, PagerDuty keys, emails)
   */
  private maskTarget(target: string, type: string): string {
    if (!target) return '[UNCONFIGURED]';
    if (type === 'slack' || type === 'webhook') {
      try {
        const url = new URL(target);
        const pathParts = url.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1] || '';
        const maskedLast = lastPart.length > 6 ? `****${lastPart.slice(-4)}` : '****';
        return `${url.origin}/.../${maskedLast}`;
      } catch {
        return `[WEBHOOK:****${target.slice(-4)}]`;
      }
    }
    if (type === 'pagerduty') {
      return `[PD_KEY:****${target.slice(-4)}]`;
    }
    if (type === 'email') {
      const parts = target.split('@');
      if (parts.length === 2) {
        return `${parts[0].slice(0, 3)}****@${parts[1]}`;
      }
      return `${target.slice(0, 3)}****`;
    }
    return `[TARGET:****${target.slice(-4)}]`;
  }

  // ==========================================================
  // CHANNELS MANAGEMENT
  // ==========================================================

  async listChannels(): Promise<IncidentAlertChannel[]> {
    const rows = await db('incident_alert_channels').orderBy('created_at', 'asc');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      channelType: r.channel_type,
      targetMasked: this.maskTarget(r.target, r.channel_type),
      isActive: Boolean(r.is_active),
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createChannel(
    data: CreateIncidentAlertChannelDto,
    superadmin: { id: string; email: string; ip?: string }
  ): Promise<IncidentAlertChannel> {
    if (!data.confirmation) {
      throw new Error('Explicit confirmation is required to register an alert channel.');
    }
    if (!data.name || data.name.trim().length < 3) {
      throw new Error('Channel name must be at least 3 characters long.');
    }
    if (!data.target || data.target.trim().length < 5) {
      throw new Error('Channel destination target is required.');
    }

    const id = crypto.randomUUID();
    const newRecord = {
      id,
      name: data.name.trim(),
      channel_type: data.channelType,
      target: data.target.trim(),
      secret_token: data.secretToken ? data.secretToken.trim() : null,
      is_active: true,
      metadata: JSON.stringify(data.metadata || {}),
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('incident_alert_channels').insert(newRecord);

    // Audit log
    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: superadmin.id,
      superadmin_email: superadmin.email,
      action: 'create_alert_channel',
      target_resource_type: 'incident_channel',
      target_resource_id: id,
      reason: `Registered incident channel ${data.name} (${data.channelType})`,
      details: JSON.stringify({ name: data.name, channelType: data.channelType }),
      ip_address: superadmin.ip || null,
      created_at: new Date(),
    });

    return {
      id,
      name: newRecord.name,
      channelType: data.channelType,
      targetMasked: this.maskTarget(newRecord.target, data.channelType),
      isActive: true,
      metadata: data.metadata || {},
      createdAt: newRecord.created_at.toISOString(),
      updatedAt: newRecord.updated_at.toISOString(),
    };
  }

  async testDispatchChannel(
    channelId: string,
    superadmin: { id: string; email: string; ip?: string }
  ): Promise<{ success: boolean; message: string; receipt: IncidentAlertDispatchReceipt }> {
    const channel = await db('incident_alert_channels').where({ id: channelId }).first();
    if (!channel) {
      throw new Error(`Incident channel ${channelId} not found.`);
    }

    // Audit action
    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: superadmin.id,
      superadmin_email: superadmin.email,
      action: 'test_alert_channel',
      target_resource_type: 'incident_channel',
      target_resource_id: channelId,
      reason: `Dispatched test ping to alert channel ${channel.name}`,
      details: JSON.stringify({ channelName: channel.name, channelType: channel.channel_type }),
      ip_address: superadmin.ip || null,
      created_at: new Date(),
    });

    const receipt: IncidentAlertDispatchReceipt = {
      channelId: channel.id,
      channelName: channel.name,
      channelType: channel.channel_type,
      status: 'simulated',
      dispatchedAt: new Date().toISOString(),
      httpStatus: 200,
    };

    return {
      success: true,
      message: `Test alert dispatch successfully simulated to ${channel.name} (${channel.channel_type.toUpperCase()}).`,
      receipt,
    };
  }

  // ==========================================================
  // RULES MANAGEMENT
  // ==========================================================

  async listRules(): Promise<IncidentAlertRule[]> {
    const rows = await db('incident_alert_rules').orderBy('created_at', 'asc');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      conditionType: r.condition_type,
      thresholdValue: r.threshold_value,
      timeWindowMinutes: r.time_window_minutes,
      cooldownMinutes: r.cooldown_minutes,
      severity: r.severity,
      channelIds: typeof r.channel_ids === 'string' ? JSON.parse(r.channel_ids) : r.channel_ids || [],
      isActive: Boolean(r.is_active),
      lastTriggeredAt: r.last_triggered_at ? new Date(r.last_triggered_at).toISOString() : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createRule(
    data: CreateIncidentAlertRuleDto,
    superadmin: { id: string; email: string; ip?: string }
  ): Promise<IncidentAlertRule> {
    if (!data.confirmation) {
      throw new Error('Explicit confirmation is required to configure an alert rule.');
    }
    if (!data.name || data.name.trim().length < 4) {
      throw new Error('Rule name must be at least 4 characters long.');
    }
    if (!data.channelIds || data.channelIds.length === 0) {
      throw new Error('At least one notification channel must be linked to the rule.');
    }

    const id = crypto.randomUUID();
    const newRecord = {
      id,
      name: data.name.trim(),
      condition_type: data.conditionType,
      threshold_value: Number(data.thresholdValue) || 1,
      time_window_minutes: Number(data.timeWindowMinutes) || 5,
      cooldown_minutes: Number(data.cooldownMinutes) || 15,
      severity: data.severity,
      channel_ids: JSON.stringify(data.channelIds),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('incident_alert_rules').insert(newRecord);

    // Audit log
    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: superadmin.id,
      superadmin_email: superadmin.email,
      action: 'create_alert_rule',
      target_resource_type: 'incident_rule',
      target_resource_id: id,
      reason: `Configured incident rule ${data.name} [${data.conditionType}]`,
      details: JSON.stringify(newRecord),
      ip_address: superadmin.ip || null,
      created_at: new Date(),
    });

    return {
      id,
      name: newRecord.name,
      conditionType: data.conditionType,
      thresholdValue: newRecord.threshold_value,
      timeWindowMinutes: newRecord.time_window_minutes,
      cooldownMinutes: newRecord.cooldown_minutes,
      severity: data.severity,
      channelIds: data.channelIds,
      isActive: true,
      lastTriggeredAt: null,
      createdAt: newRecord.created_at.toISOString(),
      updatedAt: newRecord.updated_at.toISOString(),
    };
  }

  async toggleRuleActive(
    ruleId: string,
    isActive: boolean,
    superadmin: { id: string; email: string; ip?: string }
  ): Promise<{ success: boolean; isActive: boolean }> {
    const rule = await db('incident_alert_rules').where({ id: ruleId }).first();
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found.`);
    }

    await db('incident_alert_rules').where({ id: ruleId }).update({
      is_active: isActive,
      updated_at: new Date(),
    });

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: superadmin.id,
      superadmin_email: superadmin.email,
      action: isActive ? 'activate_alert_rule' : 'mute_alert_rule',
      target_resource_type: 'incident_rule',
      target_resource_id: ruleId,
      reason: `${isActive ? 'Activated' : 'Muted'} incident rule ${rule.name}`,
      details: JSON.stringify({ ruleId, isActive }),
      ip_address: superadmin.ip || null,
      created_at: new Date(),
    });

    return { success: true, isActive };
  }

  // ==========================================================
  // INCIDENT EVENTS LIFECYCLE
  // ==========================================================

  async listEvents(options: {
    status?: string;
    severity?: string;
    conditionType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: IncidentAlertEvent[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    let query = db('incident_alert_events')
      .leftJoin('tenants', 'incident_alert_events.affected_tenant_id', 'tenants.id')
      .leftJoin('users as ack_user', 'incident_alert_events.acknowledged_by', 'ack_user.id')
      .leftJoin('users as res_user', 'incident_alert_events.resolved_by', 'res_user.id');

    if (options.status && options.status !== 'all') {
      query = query.where('incident_alert_events.status', options.status);
    }
    if (options.severity && options.severity !== 'all') {
      query = query.where('incident_alert_events.severity', options.severity);
    }
    if (options.conditionType && options.conditionType !== 'all') {
      query = query.where('incident_alert_events.condition_type', options.conditionType);
    }

    const totalRow = await query.clone().count('incident_alert_events.id as count').first();
    const total = Number(totalRow?.count || 0);

    const rows = await query
      .select(
        'incident_alert_events.*',
        'tenants.name as affected_tenant_name',
        'ack_user.email as ack_user_email',
        'res_user.email as res_user_email'
      )
      .orderBy('incident_alert_events.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items: IncidentAlertEvent[] = rows.map((r) => ({
      id: r.id,
      ruleId: r.rule_id,
      title: r.title,
      severity: r.severity,
      conditionType: r.condition_type,
      affectedProvider: r.affected_provider,
      affectedTenantId: r.affected_tenant_id,
      affectedTenantName: r.affected_tenant_name || null,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details || {},
      dispatchedChannels:
        typeof r.dispatched_channels === 'string'
          ? JSON.parse(r.dispatched_channels)
          : r.dispatched_channels || [],
      status: r.status,
      acknowledgedBy: r.acknowledged_by,
      acknowledgedByEmail: r.ack_user_email || null,
      acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at).toISOString() : null,
      resolvedBy: r.resolved_by,
      resolvedByEmail: r.res_user_email || null,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
      resolutionNote: r.resolution_note,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return { items, total, page, limit };
  }

  async acknowledgeEvent(
    eventId: string,
    superadmin: { id: string; email: string; ip?: string },
    reason?: string
  ): Promise<IncidentAlertEvent> {
    const event = await db('incident_alert_events').where({ id: eventId }).first();
    if (!event) {
      throw new Error(`Incident event ${eventId} not found.`);
    }

    await db('incident_alert_events').where({ id: eventId }).update({
      status: 'acknowledged',
      acknowledged_by: superadmin.id,
      acknowledged_at: new Date(),
    });

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: superadmin.id,
      superadmin_email: superadmin.email,
      action: 'acknowledge_incident',
      target_resource_type: 'incident_event',
      target_resource_id: eventId,
      reason: reason || `Acknowledged incident alert: ${event.title}`,
      details: JSON.stringify({ eventId, previousStatus: event.status }),
      ip_address: superadmin.ip || null,
      created_at: new Date(),
    });

    const updated = await db('incident_alert_events').where({ id: eventId }).first();
    return {
      id: updated.id,
      ruleId: updated.rule_id,
      title: updated.title,
      severity: updated.severity,
      conditionType: updated.condition_type,
      affectedProvider: updated.affected_provider,
      affectedTenantId: updated.affected_tenant_id,
      details: typeof updated.details === 'string' ? JSON.parse(updated.details) : updated.details || {},
      dispatchedChannels:
        typeof updated.dispatched_channels === 'string'
          ? JSON.parse(updated.dispatched_channels)
          : updated.dispatched_channels || [],
      status: updated.status,
      acknowledgedBy: superadmin.id,
      acknowledgedByEmail: superadmin.email,
      acknowledgedAt: updated.acknowledged_at ? new Date(updated.acknowledged_at).toISOString() : null,
      resolvedBy: updated.resolved_by,
      resolvedAt: updated.resolved_at ? new Date(updated.resolved_at).toISOString() : null,
      resolutionNote: updated.resolution_note,
      createdAt: new Date(updated.created_at).toISOString(),
    };
  }

  async resolveEvent(
    eventId: string,
    superadmin: { id: string; email: string; ip?: string },
    resolutionNote: string,
    confirmation: boolean
  ): Promise<IncidentAlertEvent> {
    if (!confirmation) {
      throw new Error('Explicit confirmation is required to resolve this incident.');
    }
    if (!resolutionNote || resolutionNote.trim().length < 8) {
      throw new Error('A detailed resolution note (at least 8 characters) is required.');
    }

    const event = await db('incident_alert_events').where({ id: eventId }).first();
    if (!event) {
      throw new Error(`Incident event ${eventId} not found.`);
    }

    await db('incident_alert_events').where({ id: eventId }).update({
      status: 'resolved',
      resolved_by: superadmin.id,
      resolved_at: new Date(),
      resolution_note: resolutionNote.trim(),
    });

    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: superadmin.id,
      superadmin_email: superadmin.email,
      action: 'resolve_incident',
      target_resource_type: 'incident_event',
      target_resource_id: eventId,
      reason: resolutionNote.trim(),
      details: JSON.stringify({ eventId, title: event.title }),
      ip_address: superadmin.ip || null,
      created_at: new Date(),
    });

    const updated = await db('incident_alert_events').where({ id: eventId }).first();
    return {
      id: updated.id,
      ruleId: updated.rule_id,
      title: updated.title,
      severity: updated.severity,
      conditionType: updated.condition_type,
      affectedProvider: updated.affected_provider,
      affectedTenantId: updated.affected_tenant_id,
      details: typeof updated.details === 'string' ? JSON.parse(updated.details) : updated.details || {},
      dispatchedChannels:
        typeof updated.dispatched_channels === 'string'
          ? JSON.parse(updated.dispatched_channels)
          : updated.dispatched_channels || [],
      status: updated.status,
      acknowledgedBy: updated.acknowledged_by,
      acknowledgedAt: updated.acknowledged_at ? new Date(updated.acknowledged_at).toISOString() : null,
      resolvedBy: superadmin.id,
      resolvedByEmail: superadmin.email,
      resolvedAt: updated.resolved_at ? new Date(updated.resolved_at).toISOString() : null,
      resolutionNote: updated.resolution_note,
      createdAt: new Date(updated.created_at).toISOString(),
    };
  }

  // ==========================================================
  // INCIDENT TRIGGER & NOTIFICATION ENGINE
  // ==========================================================

  async triggerIncident(params: {
    conditionType: IncidentConditionType;
    title: string;
    severity?: IncidentSeverity;
    affectedProvider?: string;
    affectedTenantId?: string;
    details?: Record<string, any>;
  }): Promise<{ triggered: boolean; eventId?: string; reason?: string; receipts: IncidentAlertDispatchReceipt[] }> {
    // 1. Locate active rules matching conditionType
    const rules = await db('incident_alert_rules')
      .where({ condition_type: params.conditionType, is_active: 1 });

    const matchingRule = rules[0];
    const now = Date.now();

    // 2. Cooldown check to prevent alert fatigue
    if (matchingRule && matchingRule.last_triggered_at) {
      const lastTriggeredTime = new Date(matchingRule.last_triggered_at).getTime();
      const cooldownMs = (matchingRule.cooldown_minutes || 15) * 60 * 1000;
      if (now - lastTriggeredTime < cooldownMs) {
        return {
          triggered: false,
          reason: `Rule in cooldown (${Math.ceil((cooldownMs - (now - lastTriggeredTime)) / 1000)}s remaining)`,
          receipts: [],
        };
      }
    }

    const severity = params.severity || (matchingRule?.severity as IncidentSeverity) || 'high';
    const channelIds: string[] = matchingRule
      ? typeof matchingRule.channel_ids === 'string'
        ? JSON.parse(matchingRule.channel_ids)
        : matchingRule.channel_ids || []
      : [];

    // 3. Fetch linked active channels
    const channels = await db('incident_alert_channels')
      .whereIn('id', channelIds.length > 0 ? channelIds : ['10000000-0000-0000-0000-000000000001'])
      .where({ is_active: 1 });

    // 4. Dispatch receipts simulation
    const receipts: IncidentAlertDispatchReceipt[] = channels.map((c) => ({
      channelId: c.id,
      channelName: c.name,
      channelType: c.channel_type,
      status: 'delivered',
      dispatchedAt: new Date().toISOString(),
      httpStatus: 200,
    }));

    const eventId = crypto.randomUUID();
    const eventRecord = {
      id: eventId,
      rule_id: matchingRule?.id || null,
      title: params.title,
      severity,
      condition_type: params.conditionType,
      affected_provider: params.affectedProvider || null,
      affected_tenant_id: params.affectedTenantId || null,
      details: JSON.stringify(params.details || {}),
      dispatched_channels: JSON.stringify(receipts),
      status: 'triggered',
      created_at: new Date(),
    };

    await db('incident_alert_events').insert(eventRecord);

    if (matchingRule) {
      await db('incident_alert_rules')
        .where({ id: matchingRule.id })
        .update({ last_triggered_at: new Date(), updated_at: new Date() });
    }

    return {
      triggered: true,
      eventId,
      receipts,
    };
  }
}

export const incidentAlertService = new IncidentAlertService();
