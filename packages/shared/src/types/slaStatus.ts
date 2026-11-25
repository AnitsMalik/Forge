export type SystemComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export type SystemMaintenanceImpact = 'none' | 'minor_degradation' | 'expected_downtime';

export type SystemMaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type SystemIncidentSeverity = 'minor' | 'major' | 'critical';

export type SystemIncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface SystemStatusComponent {
  id: string;
  name: string;
  description: string | null;
  category: 'core' | 'social_adapters' | 'infrastructure';
  displayOrder: number;
  status: SystemComponentStatus;
  manualOverride: boolean;
  overrideReason?: string | null;
  overrideBy?: string | null;
  overrideAt?: string | null;
  uptimePercentage30d: number;
  uptimePercentage90d: number;
  currentP95LatencyMs: number;
  lastProbeAt?: string | null;
}

export interface SystemSlaTelemetrySample {
  id: string;
  componentId: string;
  sampleTimestamp: string;
  windowType: string;
  status: string;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  sampleCount: number;
  errorCount: number;
  errorRatePct: number;
  isProbe: boolean;
  metadata?: Record<string, any> | null;
}

export interface SystemMaintenanceWindow {
  id: string;
  title: string;
  description: string;
  impactLevel: SystemMaintenanceImpact;
  impactedComponents: string[];
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  status: SystemMaintenanceStatus;
  createdBy: string;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStatusIncidentUpdate {
  id: string;
  status: SystemIncidentStatus;
  message: string;
  timestamp: string;
  updatedBy: string;
}

export interface SystemStatusIncident {
  id: string;
  title: string;
  severity: SystemIncidentSeverity;
  impactedComponents: string[];
  currentStatus: SystemIncidentStatus;
  startedAt: string;
  resolvedAt?: string | null;
  updates: SystemStatusIncidentUpdate[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSlaOverview {
  overallStatus: SystemComponentStatus;
  overallUptime30d: number;
  overallUptime90d: number;
  errorBudgetBurnRate: number;
  activeIncidentsCount: number;
  activeMaintenanceCount: number;
  averageP95LatencyMs: number;
  components: SystemStatusComponent[];
  historicalUptime90d: Array<{ date: string; uptimePct: number; hasIncident: boolean }>;
}

export interface PublicStatusPagePayload {
  platformName: string;
  generatedAt: string;
  overallStatus: SystemComponentStatus;
  statusMessage: string;
  uptime30d: number;
  uptime90d: number;
  components: Array<{
    id: string;
    name: string;
    category: string;
    status: SystemComponentStatus;
    uptimePercentage90d: number;
    latencyMs: number;
  }>;
  activeIncidents: Array<{
    id: string;
    title: string;
    severity: SystemIncidentSeverity;
    status: SystemIncidentStatus;
    impactedComponents: string[];
    startedAt: string;
    updates: SystemStatusIncidentUpdate[];
  }>;
  upcomingMaintenance: Array<{
    id: string;
    title: string;
    description: string;
    impactLevel: SystemMaintenanceImpact;
    impactedComponents: string[];
    scheduledStartAt: string;
    scheduledEndAt: string;
  }>;
}
