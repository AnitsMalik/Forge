export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentChannelType = 'slack' | 'pagerduty' | 'email' | 'webhook';
export type IncidentConditionType =
  | 'rate_limit_spike'
  | 'dlq_threshold'
  | 'provider_outage'
  | 'worker_queue_backlog'
  | 'auth_failure_spike';
export type IncidentStatus = 'triggered' | 'acknowledged' | 'resolved';

export interface IncidentAlertChannel {
  id: string;
  name: string;
  channelType: IncidentChannelType;
  targetMasked: string; // Sanitized target (e.g. "https://hooks.slack.com/...****KEY")
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentAlertRule {
  id: string;
  name: string;
  conditionType: IncidentConditionType;
  thresholdValue: number;
  timeWindowMinutes: number;
  cooldownMinutes: number;
  severity: IncidentSeverity;
  channelIds: string[];
  isActive: boolean;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentAlertDispatchReceipt {
  channelId: string;
  channelName: string;
  channelType: IncidentChannelType;
  status: 'delivered' | 'failed' | 'simulated';
  dispatchedAt: string;
  error?: string | null;
  httpStatus?: number;
}

export interface IncidentAlertEvent {
  id: string;
  ruleId?: string | null;
  title: string;
  severity: IncidentSeverity;
  conditionType: IncidentConditionType;
  affectedProvider?: string | null;
  affectedTenantId?: string | null;
  affectedTenantName?: string | null;
  details: Record<string, any>;
  dispatchedChannels: IncidentAlertDispatchReceipt[];
  status: IncidentStatus;
  acknowledgedBy?: string | null;
  acknowledgedByEmail?: string | null;
  acknowledgedAt?: string | null;
  resolvedBy?: string | null;
  resolvedByEmail?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
}

export interface CreateIncidentAlertChannelDto {
  name: string;
  channelType: IncidentChannelType;
  target: string;
  secretToken?: string;
  metadata?: Record<string, any>;
  confirmation: boolean;
}

export interface CreateIncidentAlertRuleDto {
  name: string;
  conditionType: IncidentConditionType;
  thresholdValue: number;
  timeWindowMinutes: number;
  cooldownMinutes: number;
  severity: IncidentSeverity;
  channelIds: string[];
  confirmation: boolean;
}

export interface AcknowledgeIncidentDto {
  reason?: string;
}

export interface ResolveIncidentDto {
  resolutionNote: string;
  confirmation: boolean;
}

export interface TriggerIncidentDto {
  conditionType: IncidentConditionType | string;
  severity: IncidentSeverity;
  title: string;
  message?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}
