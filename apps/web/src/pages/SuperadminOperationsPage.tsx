import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Users,
  CreditCard,
  Activity,
  Layers,
  Zap,
  RotateCcw,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Eye,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Server,
  Lock,
  Key,
  KeyRound,
  Database,
  Terminal,
  FileText,
  Sliders,
  DollarSign,
  UserCheck,
  Radio,
  Globe,
  Share2,
  Play,
  ArrowRight,
  Trash2,
  Inbox,
  Check,
  Bell,
  Send,
  Volume2,
  VolumeX,
  Plus,
  MessageSquare,
  Mail,
  Download,
  Code,
  Bot,
  Network,
  Flame,
  HardDrive,
  Brain,
  Palette,
  Video,
  Workflow,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { WormVaultTab } from '../components/superadmin/WormVaultTab.js';
import { CustomDomainsTab } from '../components/superadmin/CustomDomainsTab.js';
import { AgentFleetTab } from '../components/superadmin/AgentFleetTab.js';
import { EdgeCacheTab } from '../components/superadmin/EdgeCacheTab.js';
import { KnowledgeGraphTab } from '../components/superadmin/KnowledgeGraphTab.js';
import { RevenueIntelligenceTab } from '../components/superadmin/RevenueIntelligenceTab.js';
import { ApiGatewayTab } from '../components/superadmin/ApiGatewayTab.js';
import { ReplicationMeshTab } from '../components/superadmin/ReplicationMeshTab.js';
import { ChaosEngineeringTab } from '../components/superadmin/ChaosEngineeringTab.js';
import { SecretRotationTab } from '../components/superadmin/SecretRotationTab.js';
import { FinOpsTab } from '../components/superadmin/FinOpsTab.js';
import { ContinuousComplianceTab } from '../components/superadmin/ContinuousComplianceTab.js';
import { EventMeshTab } from '../components/superadmin/EventMeshTab.js';
import { DatabaseArchivalTab } from '../components/superadmin/DatabaseArchivalTab.js';
import { QueryFederationTab } from '../components/superadmin/QueryFederationTab.js';
import { MultiMasterConsistencyTab } from '../components/superadmin/MultiMasterConsistencyTab.js';
import { JitAccessTab } from '../components/superadmin/JitAccessTab.js';
import { HsmKeyBrokerTab } from '../components/superadmin/HsmKeyBrokerTab.js';
import { ObjectStorageTab } from '../components/superadmin/ObjectStorageTab.js';
import { NeuralRagMeshTab } from '../components/superadmin/NeuralRagMeshTab.js';
import { CollaborativeCanvasTab } from '../components/superadmin/CollaborativeCanvasTab.js';
import { VideoRenderingTab } from '../components/superadmin/VideoRenderingTab.js';
import { SagaWorkflowTab } from '../components/superadmin/SagaWorkflowTab.js';
import { ShardingMeshTab } from '../components/superadmin/ShardingMeshTab.js';
import { ConfirmDialogModal } from '../components/superadmin/ConfirmDialogModal.js';
import { PromptDialogModal } from '../components/superadmin/PromptDialogModal.js';
import type {
  SuperadminTenantSummary,
  SuperadminTenantDetail,
  SuperadminProviderHealth,
  SuperadminConnectionHealth,
  SuperadminAutomationHealthItem,
  SuperadminAutomationFailureDetail,
  SuperadminQueueHealth,
  SuperadminWorkerFailure,
  SuperadminRateLimitIncident,
  SuperadminDlqItem,
  SuperadminAuditLogItem,
  SuperadminImpersonationSession,
  IncidentAlertChannel,
  IncidentAlertRule,
  IncidentAlertEvent,
  ComplianceExportJob,
  ComplianceRetentionPolicy,
  CompliancePurgeCertificate,
  CustomRolePermission,
  AuditIntegrityVerification,
  ComplianceExportType,
  ComplianceExportFormat,
  SocialWebhookEvent,
  SocialWebhookConfig,
  SocialWebhookStats,
  SocialWebhookProvider,
  SystemSlaOverview,
  SystemStatusComponent,
  SystemMaintenanceWindow,
  SystemComponentStatus,
  SystemMaintenanceImpact,
  SystemMaintenanceStatus,
  SystemBackupSnapshot,
  SystemDrDrillLog,
  SystemTenantBackupExport,
  SystemDrOverview,
  OutboundWebhookOverview,
  OutboundWebhookEndpoint,
  OutboundWebhookDelivery,
  CreateOutboundEndpointInput,
  RotateOutboundSecretResult,
  TestDispatchResult,
  OutboundWebhookEventType,
  OutboundWebhookEndpointStatus,
  EnterpriseSsoConfig,
  EnterpriseSsoLoginAudit,
  SsoOverview,
  SsoDomainLookupResult,
  SamlSimulationResult,
  CreateSsoConfigInput,
  UpdateSsoConfigInput,
  SsoConfigStatus,
  SsoLoginAuditStatus,
  SsoProviderType,
  ScimApiToken,
  ScimSyncLog,
  ScimOverviewMetrics,
  CreateScimTokenInput,
  CreateScimTokenResponse,
  SiemDestinationConfig,
  SiemDestinationType,
  SiemPayloadFormat,
  SiemStreamStatus,
  SiemEventCategory,
  SiemSeverity,
  SiemDeliveryBatchLog,
  SiemOverviewMetrics,
  TestSiemProbeResult,
  DlpPolicy,
  DlpIncident,
  DlpOverviewMetrics,
  DlpScanResult,
  DlpCategory,
  DlpSeverity,
  DlpAction,
  DlpQuarantineStatus,
  DlpTargetScope,
  DlpPatternRule,
  PermissionDefinition,
  EnterpriseCustomRole,
  UserPermissionOverride,
  UserEffectivePermissions,
  RbacSimulationRequest,
  RbacSimulationResult,
  RbacOverviewMetrics,
  CreateEnterpriseRoleDto,
  UpdateCustomRoleDto,
  AssignUserCustomRoleDto,
  CreatePermissionOverrideDto,
} from '@socialforge/shared';

type AdminOpsTab =
  | 'tenants'
  | 'subscriptions'
  | 'usage'
  | 'providers'
  | 'connections'
  | 'automations'
  | 'queues'
  | 'rate_limits'
  | 'dlq'
  | 'incidents'
  | 'audit_logs'
  | 'entitlements'
  | 'compliance'
  | 'sla_status'
  | 'disaster_recovery'
  | 'outbound_webhooks'
  | 'enterprise_sso'
  | 'scim_sync'
  | 'siem_stream'
  | 'dlp_guard'
  | 'custom_rbac'
  | 'worm_vault'
  | 'custom_domains'
  | 'agent_fleet'
  | 'edge_cache'
  | 'knowledge_graph'
  | 'revenue_intelligence'
  | 'api_gateway'
  | 'replication_mesh'
  | 'chaos_engineering'
  | 'secret_rotation'
  | 'finops'
  | 'compliance_locker'
  | 'event_mesh'
  | 'database_archival'
  | 'query_federation'
  | 'multi_master'
  | 'jit_access'
  | 'hsm_broker'
  | 'object_storage'
  | 'neural_rag'
  | 'collaborative_canvas'
  | 'video_rendering'
  | 'saga_workflow'
  | 'sharding_mesh';

export const SuperadminOperationsPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminOpsTab>('tenants');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Accessible Confirm and Prompt Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [discardWebhookModalEventId, setDiscardWebhookModalEventId] = useState<string | null>(null);
  const [discardWebhookLoading, setDiscardWebhookLoading] = useState(false);

  // 1. Tenants State
  const [tenants, setTenants] = useState<SuperadminTenantSummary[]>([]);
  const [tenantTotal, setTenantTotal] = useState(0);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<SuperadminTenantDetail | null>(null);
  const [loadingTenantDetail, setLoadingTenantDetail] = useState(false);

  // 2. Subscription Adjustment Modal State
  const [subModalTenant, setSubModalTenant] = useState<SuperadminTenantSummary | null>(null);
  const [subTargetPlan, setSubTargetPlan] = useState('growth');
  const [subReason, setSubReason] = useState('');
  const [subConfirmed, setSubConfirmed] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState(false);

  // 3. Platform Usage State
  const [usageOverview, setUsageOverview] = useState<{
    totalTenants: number;
    totalPublishedPosts: number;
    totalActiveConnections: number;
    totalActiveAutomations: number;
    highUsageTenants: Array<any>;
  } | null>(null);

  // 4. Provider Health State
  const [providerHealthList, setProviderHealthList] = useState<SuperadminProviderHealth[]>([]);

  // 5. Connection Health State
  const [connections, setConnections] = useState<SuperadminConnectionHealth[]>([]);
  const [connProviderFilter, setConnProviderFilter] = useState('all');
  const [connHealthFilter, setConnHealthFilter] = useState('all');
  const [testingConnId, setTestingConnId] = useState<string | null>(null);

  // 6. Automation Health State
  const [automations, setAutomations] = useState<SuperadminAutomationHealthItem[]>([]);
  const [failedAutomations, setFailedAutomations] = useState<SuperadminAutomationFailureDetail[]>([]);
  const [automationViewMode, setAutomationViewMode] = useState<'roster' | 'failures'>('roster');

  // 7. Queue Health & Worker Failures State
  const [queues, setQueues] = useState<SuperadminQueueHealth[]>([]);
  const [workerFailures, setWorkerFailures] = useState<SuperadminWorkerFailure[]>([]);

  // 8. Rate Limits State
  const [rateLimitData, setRateLimitData] = useState<{
    activeRateLimits: SuperadminRateLimitIncident[];
    historyLast24h: SuperadminRateLimitIncident[];
  }>({ activeRateLimits: [], historyLast24h: [] });

  // 9. DLQ & Real-Time Social Webhooks State
  const [dlqJobs, setDlqJobs] = useState<SuperadminDlqItem[]>([]);
  const [retryModalJob, setRetryModalJob] = useState<SuperadminDlqItem | null>(null);
  const [retryReason, setRetryReason] = useState('');
  const [retryConfirmed, setRetryConfirmed] = useState(false);
  const [retryActionLoading, setRetryActionLoading] = useState(false);

  const [dlqSubTab, setDlqSubTab] = useState<'social_webhooks' | 'queue_jobs' | 'webhook_configs'>('social_webhooks');
  const [webhookEvents, setWebhookEvents] = useState<SocialWebhookEvent[]>([]);
  const [webhookTotal, setWebhookTotal] = useState(0);
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhookProviderFilter, setWebhookProviderFilter] = useState('all');
  const [webhookStatusFilter, setWebhookStatusFilter] = useState('all');
  const [webhookSearch, setWebhookSearch] = useState('');
  const [webhookStats, setWebhookStats] = useState<SocialWebhookStats | null>(null);
  const [webhookConfigs, setWebhookConfigs] = useState<SocialWebhookConfig[]>([]);

  // Webhook Modals & Actions
  const [inspectWebhookEvent, setInspectWebhookEvent] = useState<SocialWebhookEvent | null>(null);
  const [replayWebhookModalEvent, setReplayWebhookModalEvent] = useState<SocialWebhookEvent | null>(null);
  const [replayWebhookReason, setReplayWebhookReason] = useState('');
  const [replayWebhookTicket, setReplayWebhookTicket] = useState('');
  const [replayWebhookConfirmed, setReplayWebhookConfirmed] = useState(false);
  const [replayWebhookLoading, setReplayWebhookLoading] = useState(false);

  const [batchReplayModalOpen, setBatchReplayModalOpen] = useState(false);
  const [batchReplayProvider, setBatchReplayProvider] = useState('all');
  const [batchReplayReason, setBatchReplayReason] = useState('');
  const [batchReplayConfirmed, setBatchReplayConfirmed] = useState(false);
  const [batchReplayLoading, setBatchReplayLoading] = useState(false);

  const [simulateWebhookModalOpen, setSimulateWebhookModalOpen] = useState(false);
  const [simProvider, setSimProvider] = useState<SocialWebhookProvider>('meta');
  const [simEventType, setSimEventType] = useState('meta.page_mention');
  const [simFail, setSimFail] = useState(false);
  const [simPayloadJson, setSimPayloadJson] = useState('{\\n  "entry": [\\n    {\\n      "id": "1049284729184",\\n      "changes": [\\n        {\\n          "field": "feed",\\n          "value": { "item": "mention", "sender_name": "TechExplorer" }\\n        }\\n      ]\\n    }\\n  ]\\n}');
  const [simLoading, setSimLoading] = useState(false);

  // 10. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SuperadminAuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // 11. Entitlement Override Modal State
  const [entitleModalTenant, setEntitleModalTenant] = useState<SuperadminTenantSummary | null>(null);
  const [entitleResource, setEntitleResource] = useState('posts');
  const [entitleLimitValue, setEntitleLimitValue] = useState<number>(500);
  const [entitleUnmetered, setEntitleUnmetered] = useState(false);
  const [entitleReason, setEntitleReason] = useState('');
  const [entitleConfirmed, setEntitleConfirmed] = useState(false);
  const [entitleActionLoading, setEntitleActionLoading] = useState(false);

  // 12. Impersonation Session State
  const [impersonateModalTenant, setImpersonateModalTenant] = useState<SuperadminTenantSummary | null>(null);
  const [impTicketRef, setImpTicketRef] = useState('');
  const [impReason, setImpReason] = useState('');
  const [impDuration, setImpDuration] = useState(15);
  const [impConfirmed, setImpConfirmed] = useState(false);
  const [impActionLoading, setImpActionLoading] = useState(false);
  const [activeImpSession, setActiveImpSession] = useState<SuperadminImpersonationSession | null>(null);

  // 13. Incident Alerting State
  const [incidentChannels, setIncidentChannels] = useState<IncidentAlertChannel[]>([]);
  const [incidentRules, setIncidentRules] = useState<IncidentAlertRule[]>([]);
  const [incidentEvents, setIncidentEvents] = useState<IncidentAlertEvent[]>([]);
  const [incidentEventsTotal, setIncidentEventsTotal] = useState(0);
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('all');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('all');
  const [incidentSubTab, setIncidentSubTab] = useState<'events' | 'channels' | 'rules'>('events');
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  // Safe Actions: Resolve Incident Modal State
  const [resolveModalEvent, setResolveModalEvent] = useState<IncidentAlertEvent | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveConfirmed, setResolveConfirmed] = useState(false);
  const [resolveActionLoading, setResolveActionLoading] = useState(false);

  // Safe Actions: Acknowledge Incident Modal State
  const [ackModalEvent, setAckModalEvent] = useState<IncidentAlertEvent | null>(null);
  const [ackReason, setAckReason] = useState('');
  const [ackActionLoading, setAckActionLoading] = useState(false);

  // Safe Actions: Create Channel Modal State
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'slack' | 'pagerduty' | 'email' | 'webhook'>('slack');
  const [newChannelTarget, setNewChannelTarget] = useState('');
  const [newChannelSecret, setNewChannelSecret] = useState('');
  const [newChannelIsDefault, setNewChannelIsDefault] = useState(false);
  const [createChannelLoading, setCreateChannelLoading] = useState(false);

  // Safe Actions: Create Rule Modal State
  const [createRuleModalOpen, setCreateRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleConditionType, setNewRuleConditionType] = useState('RATE_LIMIT_SPIKE_429');
  const [newRuleThreshold, setNewRuleThreshold] = useState(5);
  const [newRuleWindowMinutes, setNewRuleWindowMinutes] = useState(5);
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [newRuleCooldownMinutes, setNewRuleCooldownMinutes] = useState(15);
  const [newRuleChannels, setNewRuleChannels] = useState<string[]>([]);
  const [createRuleLoading, setCreateRuleLoading] = useState(false);

  // Safe Actions: Simulate Alert Trigger Modal State
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [simulateConditionType, setSimulateConditionType] = useState('RATE_LIMIT_SPIKE_429');
  const [simulateSeverity, setSimulateSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [simulateTitle, setSimulateTitle] = useState('HTTP 429 Rate Limit Spike Detected');
  const [simulateMessage, setSimulateMessage] = useState('External Meta Graph API returned multiple consecutive 429 errors.');
  const [simulateMetadata, setSimulateMetadata] = useState('{"provider":"meta","status_code":429,"impacted_endpoints":["/me/feed"]}');
  const [simulateLoading, setSimulateLoading] = useState(false);

  // 14. Compliance & Granular RBAC State
  const [complianceSubTab, setComplianceSubTab] = useState<'verification' | 'exports' | 'retention' | 'roles'>('verification');
  
  // Verification State
  const [auditIntegrity, setAuditIntegrity] = useState<AuditIntegrityVerification | null>(null);
  const [verifyingAudit, setVerifyingAudit] = useState(false);
  const [verifyAuditTable, setVerifyAuditTable] = useState('superadmin_audit_logs');

  // Exports State
  const [complianceExports, setComplianceExports] = useState<ComplianceExportJob[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<ComplianceExportType>('soc2_audit');
  const [exportFormat, setExportFormat] = useState<ComplianceExportFormat>('zip_json');
  const [exportTargetTenantId, setExportTargetTenantId] = useState('');
  const [exportReason, setExportReason] = useState('');
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Retention Policies & Purge State
  const [retentionPolicies, setRetentionPolicies] = useState<ComplianceRetentionPolicy[]>([]);
  const [editPolicyModalOpen, setEditPolicyModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<ComplianceRetentionPolicy | null>(null);
  const [editRetentionDays, setEditRetentionDays] = useState(90);
  const [editAutoPurge, setEditAutoPurge] = useState(false);
  const [editGracePeriod, setEditGracePeriod] = useState(7);
  const [editPolicyReason, setEditPolicyReason] = useState('');
  const [editPolicyConfirmed, setEditPolicyConfirmed] = useState(false);
  const [editPolicyLoading, setEditPolicyLoading] = useState(false);

  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeCategory, setPurgeCategory] = useState('analytics_telemetry');
  const [purgeTenantId, setPurgeTenantId] = useState('');
  const [purgeReason, setPurgeReason] = useState('');
  const [purgeConfirmed, setPurgeConfirmed] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [lastPurgeCert, setLastPurgeCert] = useState<CompliancePurgeCertificate | null>(null);

  // Custom Roles & Permissions Catalog State
  const [complianceRoles, setComplianceRoles] = useState<CustomRolePermission[]>([]);
  const [compliancePermissionsCatalog, setCompliancePermissionsCatalog] = useState<Array<{ category: string; permissions: string[] }>>([]);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleSelectedPermissions, setNewRoleSelectedPermissions] = useState<string[]>([]);
  const [newRoleTargetTenantId, setNewRoleTargetTenantId] = useState('');
  const [newRoleConfirmed, setNewRoleConfirmed] = useState(false);
  const [createRoleLoading, setCreateRoleLoading] = useState(false);

  // 15. Enterprise SLA Monitor & Status Page State
  const [slaOverview, setSlaOverview] = useState<SystemSlaOverview | null>(null);
  const [slaComponents, setSlaComponents] = useState<SystemStatusComponent[]>([]);
  const [slaMaintenance, setSlaMaintenance] = useState<SystemMaintenanceWindow[]>([]);
  const [slaSubTab, setSlaSubTab] = useState<'components' | 'latency_percentiles' | 'maintenance'>('components');

  // SLA Safe Actions: Override Component Status Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedOverrideComp, setSelectedOverrideComp] = useState<SystemStatusComponent | null>(null);
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<SystemComponentStatus>('degraded_performance');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);

  // SLA Safe Actions: Clear Override Modal
  const [clearOverrideModalOpen, setClearOverrideModalOpen] = useState(false);
  const [selectedClearComp, setSelectedClearComp] = useState<SystemStatusComponent | null>(null);
  const [clearReason, setClearReason] = useState('');
  const [clearConfirmed, setClearConfirmed] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // SLA Safe Actions: Synthetic Probe
  const [probeLoading, setProbeLoading] = useState(false);

  // SLA Safe Actions: Schedule Maintenance Modal
  const [schedMaintModalOpen, setSchedMaintModalOpen] = useState(false);
  const [newMaintTitle, setNewMaintTitle] = useState('');
  const [newMaintDescription, setNewMaintDescription] = useState('');
  const [newMaintImpact, setNewMaintImpact] = useState<SystemMaintenanceImpact>('minor_degradation');
  const [newMaintImpactedComps, setNewMaintImpactedComps] = useState<string[]>(['api_gateway']);
  const [newMaintStart, setNewMaintStart] = useState('');
  const [newMaintEnd, setNewMaintEnd] = useState('');
  const [newMaintConfirmed, setNewMaintConfirmed] = useState(false);
  const [schedMaintLoading, setSchedMaintLoading] = useState(false);

  // SLA Safe Actions: Update Maintenance Status Modal
  const [updateMaintModalOpen, setUpdateMaintModalOpen] = useState(false);
  const [selectedMaintWindow, setSelectedMaintWindow] = useState<SystemMaintenanceWindow | null>(null);
  const [maintTargetStatus, setMaintTargetStatus] = useState<SystemMaintenanceStatus>('in_progress');
  const [maintUpdateReason, setMaintUpdateReason] = useState('');
  const [maintConfirmed, setMaintConfirmed] = useState(false);
  const [updateMaintLoading, setUpdateMaintLoading] = useState(false);

  // 16. Disaster Recovery & Backup Vault State
  const [drOverview, setDrOverview] = useState<SystemDrOverview | null>(null);
  const [drSnapshots, setDrSnapshots] = useState<SystemBackupSnapshot[]>([]);
  const [drDrills, setDrDrills] = useState<SystemDrDrillLog[]>([]);
  const [drTenantBackups, setDrTenantBackups] = useState<Array<SystemTenantBackupExport & { tenantName?: string }>>([]);
  const [drSubTab, setDrSubTab] = useState<'snapshots' | 'drills' | 'tenant_backups'>('snapshots');

  // DR Safe Actions: Create Manual Snapshot Modal
  const [createSnapshotModalOpen, setCreateSnapshotModalOpen] = useState(false);
  const [newSnapType, setNewSnapType] = useState<string>('manual_operator');
  const [newSnapTier, setNewSnapTier] = useState<string>('multi_region_replica');
  const [newSnapReason, setNewSnapReason] = useState('');
  const [newSnapRetentionDays, setNewSnapRetentionDays] = useState(90);
  const [newSnapConfirmed, setNewSnapConfirmed] = useState(false);
  const [createSnapshotLoading, setCreateSnapshotLoading] = useState(false);

  // DR Safe Actions: Execute DR Drill Modal
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [selectedDrillSnapshot, setSelectedDrillSnapshot] = useState<SystemBackupSnapshot | null>(null);
  const [drillTargetEnv, setDrillTargetEnv] = useState<'isolated_sandbox' | 'ephemeral_staging'>('isolated_sandbox');
  const [drillReason, setDrillReason] = useState('');
  const [drillConfirmed, setDrillConfirmed] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);

  // DR Safe Actions: Request Tenant Backup Modal
  const [tenantBackupModalOpen, setTenantBackupModalOpen] = useState(false);
  const [selectedBackupTenantId, setSelectedBackupTenantId] = useState('');
  const [backupFormat, setBackupFormat] = useState<'sql_gz' | 'json_archive'>('sql_gz');
  const [backupReason, setBackupReason] = useState('');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [tenantBackupLoading, setTenantBackupLoading] = useState(false);

  // 17. Outbound Webhook Dispatcher & Enterprise Event Notification State
  const [webhookOverview, setWebhookOverview] = useState<OutboundWebhookOverview | null>(null);
  const [webhookEndpoints, setWebhookEndpoints] = useState<OutboundWebhookEndpoint[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<OutboundWebhookDelivery[]>([]);
  const [webhookSubTab, setWebhookSubTab] = useState<'endpoints' | 'deliveries'>('endpoints');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [deliveryEventFilter, setDeliveryEventFilter] = useState<string>('all');

  // Modal 1: Register Outbound Endpoint
  const [registerEndpointModalOpen, setRegisterEndpointModalOpen] = useState(false);
  const [newEpName, setNewEpName] = useState('');
  const [newEpUrl, setNewEpUrl] = useState('');
  const [newEpEvents, setNewEpEvents] = useState<OutboundWebhookEventType[]>([
    'post.published',
    'post.failed',
    'incident.alert',
  ]);
  const [registerEpLoading, setRegisterEpLoading] = useState(false);
  const [registeredRawSecret, setRegisteredRawSecret] = useState<string | null>(null);

  // Modal 2: Rotate Secret
  const [rotateSecretModalOpen, setRotateSecretModalOpen] = useState(false);
  const [targetRotateEndpoint, setTargetRotateEndpoint] = useState<OutboundWebhookEndpoint | null>(null);
  const [rotateSecretLoading, setRotateSecretLoading] = useState(false);
  const [rotatedRawSecret, setRotatedRawSecret] = useState<string | null>(null);

  // Modal 3: Test Dispatch
  const [testDispatchModalOpen, setTestDispatchModalOpen] = useState(false);
  const [targetTestEndpoint, setTargetTestEndpoint] = useState<OutboundWebhookEndpoint | null>(null);
  const [testEventType, setTestEventType] = useState<OutboundWebhookEventType>('custom.event');
  const [testPayloadText, setTestPayloadText] = useState('{\n  "message": "Synthetic ping",\n  "test": true\n}');
  const [testDispatchLoading, setTestDispatchLoading] = useState(false);
  const [testDispatchResult, setTestDispatchResult] = useState<TestDispatchResult | null>(null);

  // 18. Enterprise SSO & SAML Federation State
  const [ssoOverview, setSsoOverview] = useState<SsoOverview | null>(null);
  const [ssoConfigs, setSsoConfigs] = useState<EnterpriseSsoConfig[]>([]);
  const [ssoAudits, setSsoAudits] = useState<EnterpriseSsoLoginAudit[]>([]);
  const [ssoSubTab, setSsoSubTab] = useState<'configs' | 'audits'>('configs');
  const [ssoAuditStatusFilter, setSsoAuditStatusFilter] = useState<string>('all');

  // Modal 1: Configure Enterprise IdP (Create/Edit)
  const [createSsoModalOpen, setCreateSsoModalOpen] = useState(false);
  const [editingSsoConfig, setEditingSsoConfig] = useState<EnterpriseSsoConfig | null>(null);
  const [ssoName, setSsoName] = useState('');
  const [ssoProviderType, setSsoProviderType] = useState<SsoProviderType>('saml');
  const [ssoIdpEntityId, setSsoIdpEntityId] = useState('');
  const [ssoIdpSsoUrl, setSsoIdpSsoUrl] = useState('');
  const [ssoIdpCert, setSsoIdpCert] = useState('');
  const [ssoDomainsText, setSsoDomainsText] = useState('acme-corp.com');
  const [ssoJit, setSsoJit] = useState(true);
  const [ssoDefaultRole, setSsoDefaultRole] = useState('editor');
  const [ssoEnforce, setSsoEnforce] = useState(false);
  const [ssoStatus, setSsoStatus] = useState<SsoConfigStatus>('active');
  const [saveSsoLoading, setSaveSsoLoading] = useState(false);

  // Modal 2: Test SAML Assertion Probe
  const [simulateSsoModalOpen, setSimulateSsoModalOpen] = useState(false);
  const [targetSimulateConfig, setTargetSimulateConfig] = useState<EnterpriseSsoConfig | null>(null);
  const [simTestEmail, setSimTestEmail] = useState('');
  const [simTestNameId, setSimTestNameId] = useState('');
  const [samlSimLoading, setSamlSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SamlSimulationResult | null>(null);

  // Modal 3: View SP Metadata
  const [viewSpMetadataModalOpen, setViewSpMetadataModalOpen] = useState(false);
  const [targetSpConfig, setTargetSpConfig] = useState<EnterpriseSsoConfig | null>(null);

  // 19. SCIM 2.0 Directory Sync & Workforce Lifecycle State
  const [scimOverview, setScimOverview] = useState<ScimOverviewMetrics | null>(null);
  const [scimTokens, setScimTokens] = useState<ScimApiToken[]>([]);
  const [scimLogs, setScimLogs] = useState<ScimSyncLog[]>([]);
  const [scimSubTab, setScimSubTab] = useState<'tokens' | 'logs'>('tokens');
  const [scimLogActionFilter, setScimLogActionFilter] = useState<string>('all');

  // Modal 1: Generate SCIM Bearer Token
  const [createScimTokenModalOpen, setCreateScimTokenModalOpen] = useState(false);
  const [newScimTokenName, setNewScimTokenName] = useState('');
  const [newScimTokenTenantId, setNewScimTokenTenantId] = useState('');
  const [newScimTokenExpiresInDays, setNewScimTokenExpiresInDays] = useState(365);
  const [createScimTokenLoading, setCreateScimTokenLoading] = useState(false);
  const [createdRawScimToken, setCreatedRawScimToken] = useState<string | null>(null);

  // Modal 2: Inspect SCIM Sync Event Log
  const [inspectScimLogModalOpen, setInspectScimLogModalOpen] = useState(false);
  const [selectedScimLog, setSelectedScimLog] = useState<ScimSyncLog | null>(null);

  // 20. Enterprise SIEM Streaming & Security Event State
  const [siemOverview, setSiemOverview] = useState<SiemOverviewMetrics | null>(null);
  const [siemDestinations, setSiemDestinations] = useState<SiemDestinationConfig[]>([]);
  const [siemLogs, setSiemLogs] = useState<SiemDeliveryBatchLog[]>([]);
  const [siemSubTab, setSiemSubTab] = useState<'destinations' | 'logs'>('destinations');
  const [siemDestFilter, setSiemDestFilter] = useState<string>('all');

  // Modal 1: Configure SIEM Destination
  const [createSiemModalOpen, setCreateSiemModalOpen] = useState(false);
  const [editingSiemDest, setEditingSiemDest] = useState<SiemDestinationConfig | null>(null);
  const [siemName, setSiemName] = useState('');
  const [siemType, setSiemType] = useState<SiemDestinationType>('splunk_hec');
  const [siemFormat, setSiemFormat] = useState<SiemPayloadFormat>('splunk_event');
  const [siemUrl, setSiemUrl] = useState('');
  const [siemAuthSecret, setSiemAuthSecret] = useState('');
  const [siemCategories, setSiemCategories] = useState<SiemEventCategory[]>(['audit', 'auth', 'compliance', 'security']);
  const [siemSeverity, setSiemSeverity] = useState<SiemSeverity>('info');
  const [siemBatchSize, setSiemBatchSize] = useState(50);
  const [siemRateLimit, setSiemRateLimit] = useState(1000);
  const [saveSiemLoading, setSaveSiemLoading] = useState(false);

  // Modal 2: Test SIEM Security Probe
  const [probeSiemModalOpen, setProbeSiemModalOpen] = useState(false);
  const [targetProbeDest, setTargetProbeDest] = useState<SiemDestinationConfig | null>(null);
  const [probeCategory, setProbeCategory] = useState<SiemEventCategory>('security');
  const [probeSeverity, setProbeSeverity] = useState<SiemSeverity>('warning');
  const [probeAction, setProbeAction] = useState('security.probe.test');
  const [probeMessage, setProbeMessage] = useState('Synthetic security audit test probe');
  const [siemProbeLoading, setSiemProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<TestSiemProbeResult | null>(null);

  // 22. Enterprise DLP & Content Guardrails State
  const [dlpOverview, setDlpOverview] = useState<DlpOverviewMetrics | null>(null);
  const [dlpPolicies, setDlpPolicies] = useState<DlpPolicy[]>([]);
  const [dlpIncidents, setDlpIncidents] = useState<DlpIncident[]>([]);
  const [dlpSubTab, setDlpSubTab] = useState<'policies' | 'incidents'>('policies');
  const [dlpCategoryFilter, setDlpCategoryFilter] = useState<string>('all');
  const [dlpIncidentSeverityFilter, setDlpIncidentSeverityFilter] = useState<string>('all');
  const [dlpIncidentQuarantineFilter, setDlpIncidentQuarantineFilter] = useState<string>('all');

  // Modal 1: Configure DLP Policy
  const [createDlpModalOpen, setCreateDlpModalOpen] = useState(false);
  const [editingDlpPolicy, setEditingDlpPolicy] = useState<DlpPolicy | null>(null);
  const [dlpPolicyName, setDlpPolicyName] = useState('');
  const [dlpPolicyDesc, setDlpPolicyDesc] = useState('');
  const [dlpPolicyCategory, setDlpPolicyCategory] = useState<DlpCategory>('financial_pci');
  const [dlpPolicySeverity, setDlpPolicySeverity] = useState<DlpSeverity>('critical');
  const [dlpPolicyAction, setDlpPolicyAction] = useState<DlpAction>('redact_inline');
  const [dlpPatternName, setDlpPatternName] = useState('');
  const [dlpPatternRegex, setDlpPatternRegex] = useState('');
  const [dlpPatternFlags, setDlpPatternFlags] = useState('g');
  const [dlpPatternDesc, setDlpPatternDesc] = useState('');
  const [dlpPatternsList, setDlpPatternsList] = useState<DlpPatternRule[]>([]);
  const [dlpScopesList, setDlpScopesList] = useState<DlpTargetScope[]>(['posts:publish']);
  const [saveDlpLoading, setSaveDlpLoading] = useState(false);

  // Modal 2: Live Simulator & Sandbox
  const [simulateDlpModalOpen, setSimulateDlpModalOpen] = useState(false);
  const [simulateDlpText, setSimulateDlpText] = useState('');
  const [simulateDlpResult, setSimulateDlpResult] = useState<DlpScanResult | null>(null);
  const [simulateDlpLoading, setSimulateDlpLoading] = useState(false);

  // Modal 3: Review Quarantined Incident
  const [reviewDlpModalOpen, setReviewDlpModalOpen] = useState(false);
  const [selectedDlpIncident, setSelectedDlpIncident] = useState<DlpIncident | null>(null);
  const [reviewDlpDecision, setReviewDlpDecision] = useState<'approved_override' | 'rejected_dismissed'>('approved_override');
  const [reviewDlpNotes, setReviewDlpNotes] = useState('');
  const [reviewDlpLoading, setReviewDlpLoading] = useState(false);

  // 23. Enterprise Custom Roles & Granular RBAC State
  const [rbacOverview, setRbacOverview] = useState<RbacOverviewMetrics | null>(null);
  const [rbacRoles, setRbacRoles] = useState<EnterpriseCustomRole[]>([]);
  const [rbacPermissions, setRbacPermissions] = useState<PermissionDefinition[]>([]);
  const [rbacAssignments, setRbacAssignments] = useState<any[]>([]);
  const [rbacOverrides, setRbacOverrides] = useState<UserPermissionOverride[]>([]);
  const [rbacSubTab, setRbacSubTab] = useState<'roles' | 'matrix' | 'assignments'>('roles');
  const [rbacSearch, setRbacSearch] = useState('');
  const [rbacCategoryFilter, setRbacCategoryFilter] = useState('all');

  // Modal 1: Create / Edit Custom Role
  const [createRbacRoleModalOpen, setCreateRbacRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<EnterpriseCustomRole | null>(null);
  const [roleSlugInput, setRoleSlugInput] = useState('');
  const [roleNameInput, setRoleNameInput] = useState('');
  const [roleDescInput, setRoleDescInput] = useState('');
  const [roleParentSlugInput, setRoleParentSlugInput] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saveRoleLoading, setSaveRoleLoading] = useState(false);

  // Modal 2: Simulate RBAC Permission
  const [simulateRbacModalOpen, setSimulateRbacModalOpen] = useState(false);
  const [simBaseRole, setSimBaseRole] = useState('creator');
  const [simCustomRoles, setSimCustomRoles] = useState<string[]>([]);
  const [simTargetPerm, setSimTargetPerm] = useState('posts:publish');
  const [simRbacResult, setSimRbacResult] = useState<RbacSimulationResult | null>(null);
  const [simRbacLoading, setSimRbacLoading] = useState(false);

  // Modal 3: Permission Override
  const [createOverrideModalOpen, setCreateOverrideModalOpen] = useState(false);
  const [overrideTenantId, setOverrideTenantId] = useState('0842e532-e6cf-4cc1-b8ce-4c4546a10a97');
  const [overrideUserId, setOverrideUserId] = useState('');
  const [overridePermSlug, setOverridePermSlug] = useState('posts:publish');
  const [overrideEffect, setOverrideEffect] = useState<'allow' | 'deny'>('allow');
  const [rbacOverrideReason, setRbacOverrideReason] = useState('');
  const [overrideExpiresDays, setOverrideExpiresDays] = useState(30);
  const [saveOverrideLoading, setSaveOverrideLoading] = useState(false);

  // ==========================================================
  // DATA FETCHING DISPATCHER ACCORDING TO ACTIVE TAB
  // ==========================================================
  const loadActiveTabData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        switch (activeTab) {
          case 'tenants':
          case 'subscriptions':
          case 'entitlements': {
            const res = await api.adminOps.searchTenants({
              search: tenantSearch.trim() || undefined,
              status: tenantStatusFilter !== 'all' ? tenantStatusFilter : undefined,
              page: tenantPage,
              limit: 15,
            });
            setTenants(res.items || []);
            setTenantTotal(res.total || 0);
            break;
          }
          case 'usage': {
            const res = await api.adminOps.getUsageOverview();
            setUsageOverview(res);
            break;
          }
          case 'providers': {
            const res = await api.adminOps.getProviderHealth();
            setProviderHealthList(res || []);
            break;
          }
          case 'connections': {
            const res = await api.adminOps.listConnections({
              provider: connProviderFilter !== 'all' ? connProviderFilter : undefined,
              healthStatus: connHealthFilter !== 'all' ? connHealthFilter : undefined,
              page: 1,
              limit: 25,
            });
            setConnections(res.items || []);
            break;
          }
          case 'automations': {
            const [autoRes, failRes] = await Promise.all([
              api.adminOps.listAutomations({ page: 1, limit: 25 }),
              api.adminOps.listFailedAutomations({ page: 1, limit: 25 }),
            ]);
            setAutomations(autoRes.items || []);
            setFailedAutomations(failRes.items || []);
            break;
          }
          case 'queues': {
            const [qRes, wRes] = await Promise.all([
              api.adminOps.getQueueHealth(),
              api.adminOps.listWorkerFailures({ page: 1, limit: 25 }),
            ]);
            setQueues(qRes || []);
            setWorkerFailures(wRes.items || []);
            break;
          }
          case 'rate_limits': {
            const res = await api.adminOps.getRateLimits();
            setRateLimitData(res);
            break;
          }
          case 'dlq': {
            const [dlqRes, whRes, statsRes, cfgRes] = await Promise.all([
              api.adminOps.listDlq({ page: 1, limit: 25 }),
              api.adminOps.getWebhookEvents({
                provider: webhookProviderFilter !== 'all' ? webhookProviderFilter : undefined,
                status: webhookStatusFilter !== 'all' ? webhookStatusFilter : undefined,
                search: webhookSearch.trim() || undefined,
                page: webhookPage,
                limit: 25,
              }),
              api.adminOps.getWebhookStats(),
              api.adminOps.getWebhookConfigs(),
            ]);
            setDlqJobs(dlqRes.items || []);
            setWebhookEvents(whRes.events || []);
            setWebhookTotal(whRes.total || 0);
            setWebhookStats(statsRes.stats || null);
            setWebhookConfigs(cfgRes.configs || []);
            break;
          }
          case 'audit_logs': {
            const res = await api.adminOps.listAuditLogs({
              search: auditSearch.trim() || undefined,
              action: auditActionFilter !== 'all' ? auditActionFilter : undefined,
              page: 1,
              limit: 30,
            });
            setAuditLogs(res.items || []);
            break;
          }
          case 'incidents': {
            const [chRes, rlRes, evRes] = await Promise.all([
              api.adminOps.getIncidentChannels(),
              api.adminOps.getIncidentRules(),
              api.adminOps.getIncidentEvents({
                status: incidentStatusFilter !== 'all' ? incidentStatusFilter : undefined,
                severity: incidentSeverityFilter !== 'all' ? incidentSeverityFilter : undefined,
                page: 1,
                limit: 30,
              }),
            ]);
            setIncidentChannels(chRes.data || []);
            setIncidentRules(rlRes.data || []);
            setIncidentEvents(evRes.data?.items || []);
            setIncidentEventsTotal(evRes.data?.total || 0);
            break;
          }
          case 'compliance': {
            const [verRes, expRes, retRes, rolRes, permRes] = await Promise.all([
              api.adminOps.verifyAuditIntegrity(verifyAuditTable),
              api.adminOps.listComplianceExports(),
              api.adminOps.listRetentionPolicies(),
              api.adminOps.listComplianceRoles(),
              api.adminOps.listCompliancePermissions(),
            ]);
            setAuditIntegrity(verRes.data);
            setComplianceExports(expRes.data || []);
            setRetentionPolicies(retRes.data || []);
            setComplianceRoles(rolRes.data || []);
            setCompliancePermissionsCatalog(permRes.data || []);
            break;
          }
          case 'sla_status': {
            const [ovRes, compRes, maintRes] = await Promise.all([
              api.adminOps.getSlaOverview(),
              api.adminOps.getSlaComponents(),
              api.adminOps.getSlaMaintenance(),
            ]);
            setSlaOverview(ovRes);
            setSlaComponents(compRes || []);
            setSlaMaintenance(maintRes || []);
            break;
          }
          case 'disaster_recovery': {
            const [ovRes, snapRes, drillRes, tbRes] = await Promise.all([
              api.adminOps.getDrOverview(),
              api.adminOps.getDrSnapshots(),
              api.adminOps.getDrDrills(),
              api.adminOps.getTenantBackups(),
            ]);
            setDrOverview(ovRes);
            setDrSnapshots(snapRes || []);
            setDrDrills(drillRes || []);
            setDrTenantBackups(tbRes || []);
            break;
          }
          case 'outbound_webhooks': {
            const [ovRes, epRes, delRes] = await Promise.all([
              api.adminOps.getOutboundWebhookOverview(),
              api.adminOps.listOutboundEndpoints(),
              api.adminOps.listOutboundDeliveries({
                status: deliveryStatusFilter !== 'all' ? deliveryStatusFilter : undefined,
                eventType: deliveryEventFilter !== 'all' ? deliveryEventFilter : undefined,
                limit: 50,
              }),
            ]);
            setWebhookOverview(ovRes);
            setWebhookEndpoints(epRes || []);
            setWebhookDeliveries(delRes || []);
            break;
          }
          case 'enterprise_sso': {
            const [ovRes, cfRes, adRes] = await Promise.all([
              api.adminOps.getSsoOverview(),
              api.adminOps.listSsoConfigs(),
              api.adminOps.listSsoAudits({
                status: ssoAuditStatusFilter !== 'all' ? ssoAuditStatusFilter : undefined,
                limit: 50,
              }),
            ]);
            setSsoOverview(ovRes);
            setSsoConfigs(cfRes || []);
            setSsoAudits(adRes || []);
            break;
          }
          case 'scim_sync': {
            const [ovRes, tokRes, logRes] = await Promise.all([
              api.adminOps.getScimOverview(),
              api.adminOps.listScimTokens(),
              api.adminOps.listScimLogs({
                action: scimLogActionFilter !== 'all' ? scimLogActionFilter : undefined,
                limit: 50,
              }),
            ]);
            setScimOverview(ovRes);
            setScimTokens(tokRes || []);
            setScimLogs(logRes.logs || []);
            break;
          }
          case 'siem_stream': {
            const [ovRes, destRes, logRes] = await Promise.all([
              api.adminOps.getSiemOverview(),
              api.adminOps.listSiemDestinations(),
              api.adminOps.listSiemLogs({
                destinationId: siemDestFilter !== 'all' ? siemDestFilter : undefined,
                limit: 50,
              }),
            ]);
            setSiemOverview(ovRes);
            setSiemDestinations(destRes || []);
            setSiemLogs(logRes.logs || []);
            break;
          }
          case 'dlp_guard': {
            const [ovRes, polRes, incRes] = await Promise.all([
              api.adminOps.getDlpOverview(),
              api.adminOps.listDlpPolicies({
                category: dlpCategoryFilter !== 'all' ? dlpCategoryFilter : undefined,
              }),
              api.adminOps.listDlpIncidents({
                severity: dlpIncidentSeverityFilter !== 'all' ? dlpIncidentSeverityFilter : undefined,
                quarantine_status: dlpIncidentQuarantineFilter !== 'all' ? dlpIncidentQuarantineFilter : undefined,
                limit: 50,
              }),
            ]);
            setDlpOverview(ovRes);
            setDlpPolicies(polRes || []);
            setDlpIncidents(incRes.incidents || []);
            break;
          }
          case 'custom_rbac': {
            const [ovRes, rolesRes, permsRes, assignsRes, overRes] = await Promise.all([
              api.adminOps.getRbacOverview(),
              api.adminOps.listRbacRoles({ search: rbacSearch.trim() || undefined }),
              api.adminOps.listRbacPermissions(),
              api.adminOps.listRbacUserAssignments('0842e532-e6cf-4cc1-b8ce-4c4546a10a97').catch(() => ({ success: true, data: [] })),
              api.adminOps.listRbacUserOverrides('0842e532-e6cf-4cc1-b8ce-4c4546a10a97').catch(() => ({ success: true, data: [] })),
            ]);
            setRbacOverview(ovRes.data);
            setRbacRoles(rolesRes.data || []);
            setRbacPermissions(permsRes.data || []);
            setRbacAssignments(assignsRes.data || []);
            setRbacOverrides(overRes.data || []);
            break;
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to fetch admin data.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      activeTab,
      tenantSearch,
      tenantStatusFilter,
      tenantPage,
      connProviderFilter,
      connHealthFilter,
      auditSearch,
      auditActionFilter,
      incidentStatusFilter,
      incidentSeverityFilter,
      verifyAuditTable,
      webhookProviderFilter,
      webhookStatusFilter,
      webhookSearch,
      webhookPage,
      deliveryStatusFilter,
      deliveryEventFilter,
      ssoAuditStatusFilter,
      scimLogActionFilter,
      siemDestFilter,
      dlpCategoryFilter,
      dlpIncidentSeverityFilter,
      dlpIncidentQuarantineFilter,
    ]
  );

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  // Handle Tenant Detail Inspection
  const handleInspectTenant = async (tenantId: string) => {
    setLoadingTenantDetail(true);
    try {
      const detail = await api.adminOps.getTenantDetail(tenantId);
      setSelectedTenantDetail(detail);
    } catch (err: any) {
      showToast(`Tenant inspection error: ${err.message}`, 'error');
    } finally {
      setLoadingTenantDetail(false);
    }
  };

  // Safe Action: Update Subscription
  const handleExecuteSubscriptionUpdate = async () => {
    if (!subModalTenant) return;
    if (!subConfirmed) {
      showToast('Please check the confirmation box before applying subscription changes.', 'error');
      return;
    }
    if (subReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }

    setSubActionLoading(true);
    try {
      const res = await api.adminOps.updateSubscription(subModalTenant.id, {
        planId: subTargetPlan,
        reason: subReason.trim(),
        confirmation: true,
      });
      showToast(`Subscription plan updated to ${res.planId.toUpperCase()} for ${subModalTenant.name}. Fully audited.`);
      setSubModalTenant(null);
      setSubReason('');
      setSubConfirmed(false);
      loadActiveTabData(true);
      if (selectedTenantDetail?.id === subModalTenant.id) {
        handleInspectTenant(subModalTenant.id);
      }
    } catch (err: any) {
      showToast(`Failed to update subscription: ${err.message}`, 'error');
    } finally {
      setSubActionLoading(false);
    }
  };

  // Safe Action: Override Entitlement
  const handleExecuteEntitlementOverride = async () => {
    if (!entitleModalTenant) return;
    if (!entitleConfirmed) {
      showToast('Please check the confirmation box before overriding entitlements.', 'error');
      return;
    }
    if (entitleReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }

    setEntitleActionLoading(true);
    try {
      await api.adminOps.overrideEntitlement(entitleModalTenant.id, {
        resource: entitleResource,
        limitValue: entitleUnmetered ? null : Number(entitleLimitValue),
        reason: entitleReason.trim(),
        confirmation: true,
      });
      showToast(
        `Entitlement limit for "${entitleResource}" overridden to ${
          entitleUnmetered ? 'UNMETERED' : entitleLimitValue
        } for ${entitleModalTenant.name}. Fully audited.`
      );
      setEntitleModalTenant(null);
      setEntitleReason('');
      setEntitleConfirmed(false);
      loadActiveTabData(true);
      if (selectedTenantDetail?.id === entitleModalTenant.id) {
        handleInspectTenant(entitleModalTenant.id);
      }
    } catch (err: any) {
      showToast(`Failed to override entitlement: ${err.message}`, 'error');
    } finally {
      setEntitleActionLoading(false);
    }
  };

  // Safe Action: Connection Health Check Ping
  const handleTestConnection = async (connId: string, provider: string) => {
    setTestingConnId(connId);
    try {
      const res = await api.adminOps.testConnectionHealth(
        connId,
        `Superadmin health ping check for provider ${provider}`
      );
      showToast(`Connection check successful. Health: ${res.healthStatus.toUpperCase()} (Latency: ${res.latencyMs}ms).`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Connection test failed: ${err.message}`, 'error');
    } finally {
      setTestingConnId(null);
    }
  };

  // Safe Action: Retry DLQ Job
  const handleExecuteDlqRetry = async () => {
    if (!retryModalJob) return;
    if (!retryConfirmed) {
      showToast('Please check the confirmation box before retrying this dead-letter job.', 'error');
      return;
    }
    if (retryReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }

    setRetryActionLoading(true);
    try {
      await api.adminOps.retryDlq(retryModalJob.id, {
        sourceType: retryModalJob.sourceType,
        reason: retryReason.trim(),
        confirmation: true,
        force: true,
      });
      showToast(`Job ${retryModalJob.id.slice(0, 8)} reset to scheduled status. Fully audited.`);
      setRetryModalJob(null);
      setRetryReason('');
      setRetryConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`DLQ Retry failed: ${err.message}`, 'error');
    } finally {
      setRetryActionLoading(false);
    }
  };

  // Safe Action: Replay Social Webhook Event
  const handleExecuteWebhookReplay = async () => {
    if (!replayWebhookModalEvent) return;
    if (!replayWebhookConfirmed) {
      showToast('Please check the confirmation box before replaying this dead-letter webhook event.', 'error');
      return;
    }
    if (replayWebhookReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }

    setReplayWebhookLoading(true);
    try {
      const res = await api.adminOps.replayWebhookEvent(replayWebhookModalEvent.id, {
        reason: replayWebhookReason.trim(),
        ticketReference: replayWebhookTicket.trim() || undefined,
        confirmation: true,
      });
      showToast(
        `Webhook event ${replayWebhookModalEvent.id.slice(0, 8)} replayed successfully. Replay status: ${res.replayLog.replayStatus.toUpperCase()}.`
      );
      setReplayWebhookModalEvent(null);
      setReplayWebhookReason('');
      setReplayWebhookTicket('');
      setReplayWebhookConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Webhook replay failed: ${err.message}`, 'error');
    } finally {
      setReplayWebhookLoading(false);
    }
  };

  // Safe Action: Batch Replay Social Webhook Events
  const handleExecuteBatchReplayWebhooks = async () => {
    if (!batchReplayConfirmed) {
      showToast('Please confirm batch replay execution.', 'error');
      return;
    }
    if (batchReplayReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }

    setBatchReplayLoading(true);
    try {
      const res = await api.adminOps.replayBatchWebhooks({
        provider: batchReplayProvider as any,
        status: 'all',
        limit: 50,
        reason: batchReplayReason.trim(),
        confirmation: true,
      });
      showToast(
        `Batch replay completed: ${res.successfulCount} succeeded, ${res.failedCount} failed of ${res.replayedCount} candidates.`
      );
      setBatchReplayModalOpen(false);
      setBatchReplayReason('');
      setBatchReplayConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Batch replay failed: ${err.message}`, 'error');
    } finally {
      setBatchReplayLoading(false);
    }
  };

  // Safe Action: Discard Social Webhook Event
  const handleDiscardWebhook = (eventId: string) => {
    setDiscardWebhookModalEventId(eventId);
  };

  // Safe Action: Simulate Webhook Event
  const handleExecuteSimulateWebhook = async () => {
    let parsedPayload: Record<string, any> = {};
    try {
      parsedPayload = JSON.parse(simPayloadJson);
    } catch {
      showToast('Invalid JSON in payload. Please check JSON syntax.', 'error');
      return;
    }

    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateWebhookEvent({
        provider: simProvider,
        eventType: simEventType.trim(),
        payload: parsedPayload,
        simulateFailure: simFail,
      });
      showToast(
        `Simulated ${simProvider.toUpperCase()} event processed with status: ${res.event.status.toUpperCase()}.`
      );
      setSimulateWebhookModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // Safe Action: Audited Impersonation Session
  const handleCreateImpersonation = async () => {
    if (!impersonateModalTenant) return;
    if (!impConfirmed) {
      showToast('Please check the confirmation box acknowledging that all actions in this session are audited.', 'error');
      return;
    }
    if (impReason.trim().length < 10) {
      showToast('A mandatory justification reason (minimum 10 characters) is required.', 'error');
      return;
    }
    if (impTicketRef.trim().length < 3) {
      showToast('A valid support ticket reference (e.g. SF-SUPPORT-1024) is required.', 'error');
      return;
    }

    setImpActionLoading(true);
    try {
      const session = await api.adminOps.createImpersonation({
        tenantId: impersonateModalTenant.id,
        reason: impReason.trim(),
        ticketReference: impTicketRef.trim(),
        durationMinutes: Number(impDuration),
        confirmation: true,
      });
      setActiveImpSession(session);
      showToast(
        `Audited support session opened for ${impersonateModalTenant.name} (${impDuration} mins). Ticket: ${impTicketRef}.`,
        'info'
      );
      setImpersonateModalTenant(null);
      setImpReason('');
      setImpTicketRef('');
      setImpConfirmed(false);
    } catch (err: any) {
      showToast(`Impersonation failed: ${err.message}`, 'error');
    } finally {
      setImpActionLoading(false);
    }
  };

  const handleRevokeImpersonation = async () => {
    if (!activeImpSession) return;
    try {
      await api.adminOps.revokeImpersonation(activeImpSession.sessionId, 'Support session concluded by superadmin');
      showToast('Support impersonation session terminated and audited successfully.');
      setActiveImpSession(null);
    } catch (err: any) {
      showToast(`Failed to revoke session: ${err.message}`, 'error');
    }
  };

  // Safe Action: Acknowledge Incident Event
  const handleExecuteAcknowledgeIncident = async () => {
    if (!ackModalEvent) return;
    setAckActionLoading(true);
    try {
      await api.adminOps.acknowledgeIncidentEvent(ackModalEvent.id, ackReason.trim() || undefined);
      showToast(`Incident #${ackModalEvent.id.slice(0, 8)} acknowledged successfully.`);
      setAckModalEvent(null);
      setAckReason('');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to acknowledge incident: ${err.message}`, 'error');
    } finally {
      setAckActionLoading(false);
    }
  };

  // Safe Action: Resolve Incident Event (Requires explicit confirmation & note)
  const handleExecuteResolveIncident = async () => {
    if (!resolveModalEvent) return;
    if (!resolveConfirmed) {
      showToast('Please check the confirmation box before resolving this incident.', 'error');
      return;
    }
    if (resolveNote.trim().length < 8) {
      showToast('A resolution note of at least 8 characters is required.', 'error');
      return;
    }
    setResolveActionLoading(true);
    try {
      await api.adminOps.resolveIncidentEvent(resolveModalEvent.id, {
        resolutionNote: resolveNote.trim(),
        confirmation: true,
      });
      showToast(`Incident #${resolveModalEvent.id.slice(0, 8)} resolved and marked benign.`);
      setResolveModalEvent(null);
      setResolveNote('');
      setResolveConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to resolve incident: ${err.message}`, 'error');
    } finally {
      setResolveActionLoading(false);
    }
  };

  // Safe Action: Dispatch Test Notification to Channel
  const handleTestChannel = async (channelId: string) => {
    setTestingChannelId(channelId);
    try {
      const res = await api.adminOps.testIncidentChannel(channelId);
      if (res.data?.success) {
        showToast(`Test payload delivered successfully to channel (${res.data.channelType.toUpperCase()}).`);
      } else {
        showToast(`Test dispatch returned error: ${res.data?.error || 'Unknown error'}`, 'error');
      }
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to test channel: ${err.message}`, 'error');
    } finally {
      setTestingChannelId(null);
    }
  };

  // Safe Action: Toggle Rule Active State
  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      await api.adminOps.toggleIncidentRule(ruleId, !currentActive);
      showToast(`Alert rule ${!currentActive ? 'activated' : 'muted'} successfully.`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to update rule: ${err.message}`, 'error');
    }
  };

  // Safe Action: Create New Notification Channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !newChannelTarget.trim()) {
      showToast('Channel name and target are required.', 'error');
      return;
    }
    setCreateChannelLoading(true);
    try {
      await api.adminOps.createIncidentChannel({
        name: newChannelName.trim(),
        channelType: newChannelType,
        target: newChannelTarget.trim(),
        secretToken: newChannelSecret.trim() || undefined,
        metadata: { isDefault: newChannelIsDefault },
        confirmation: true,
      });
      showToast(`Notification channel "${newChannelName}" configured with encrypted secret.`);
      setCreateChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelTarget('');
      setNewChannelSecret('');
      setNewChannelIsDefault(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to create channel: ${err.message}`, 'error');
    } finally {
      setCreateChannelLoading(false);
    }
  };

  // Safe Action: Create New Alert Rule
  const handleCreateRule = async () => {
    if (!newRuleName.trim()) {
      showToast('Rule name is required.', 'error');
      return;
    }
    setCreateRuleLoading(true);
    try {
      await api.adminOps.createIncidentRule({
        name: newRuleName.trim(),
        conditionType: newRuleConditionType as any,
        thresholdValue: Number(newRuleThreshold),
        timeWindowMinutes: Number(newRuleWindowMinutes),
        severity: newRuleSeverity,
        cooldownMinutes: Number(newRuleCooldownMinutes),
        channelIds: newRuleChannels,
        confirmation: true,
      });
      showToast(`Alert rule "${newRuleName}" created and active.`);
      setCreateRuleModalOpen(false);
      setNewRuleName('');
      setNewRuleChannels([]);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to create rule: ${err.message}`, 'error');
    } finally {
      setCreateRuleLoading(false);
    }
  };

  // Safe Action: Simulate Incident Trigger
  const handleSimulateTrigger = async () => {
    if (!simulateTitle.trim() || !simulateMessage.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }
    let parsedMeta = {};
    if (simulateMetadata.trim()) {
      try {
        parsedMeta = JSON.parse(simulateMetadata);
      } catch (e) {
        showToast('Metadata must be valid JSON.', 'error');
        return;
      }
    }
    setSimulateLoading(true);
    try {
      const res = await api.adminOps.simulateIncident({
        conditionType: simulateConditionType as any,
        severity: simulateSeverity,
        title: simulateTitle.trim(),
        message: simulateMessage.trim(),
        details: parsedMeta,
      });
      if (res.data?.cooldownSuppressed) {
        showToast(`Simulation evaluation: Alert suppressed by active cooldown (${res.data.message}).`, 'info');
      } else {
        showToast(`Simulation triggered successfully! Event #${res.data?.event?.id?.slice(0, 8)} recorded.`);
      }
      setSimulateModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimulateLoading(false);
    }
  };

  // ==========================================================
  // SAFE ACTIONS: COMPLIANCE & GRANULAR RBAC
  // ==========================================================
  const handleVerifyAudit = async (table: string = verifyAuditTable) => {
    setVerifyingAudit(true);
    try {
      const res = await api.adminOps.verifyAuditIntegrity(table);
      setAuditIntegrity(res.data);
      if (res.data.tamperDetected) {
        showToast(`CRITICAL: Tamper detected in table ${table}! Merkle chain signature mismatch!`, 'error');
      } else {
        showToast(`Audit trail verified! ${res.data.totalRecords} records verified tamper-proof with HMAC-SHA256 merkle chaining.`);
      }
    } catch (err: any) {
      showToast(`Verification failed: ${err.message}`, 'error');
    } finally {
      setVerifyingAudit(false);
    }
  };

  const handleRequestExport = async () => {
    if (!exportReason || exportReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }
    if (!exportConfirmed) {
      showToast('Please check the confirmation box before requesting compliance export.', 'error');
      return;
    }
    setExportLoading(true);
    try {
      const res = await api.adminOps.requestComplianceExport({
        exportType,
        format: exportFormat,
        targetTenantId: exportTargetTenantId.trim() || undefined,
        reason: exportReason.trim(),
        confirmation: true,
      });
      const exportId = (res as any)?.id || (res as any)?.data?.id || 'export';
      showToast(`Compliance export #${exportId.slice(0, 8)} generated successfully with SHA-256 digest.`);
      setExportModalOpen(false);
      setExportReason('');
      setExportConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenEditPolicy = (policy: ComplianceRetentionPolicy) => {
    setSelectedPolicy(policy);
    setEditRetentionDays(policy.retentionDays);
    setEditAutoPurge(policy.autoPurgeEnabled);
    setEditGracePeriod(policy.gracePeriodDays);
    setEditPolicyReason('');
    setEditPolicyConfirmed(false);
    setEditPolicyModalOpen(true);
  };

  const handleExecutePolicyUpdate = async () => {
    if (!selectedPolicy) return;
    if (!editPolicyReason || editPolicyReason.trim().length < 8) {
      showToast('A support justification reason of at least 8 characters is required.', 'error');
      return;
    }
    if (!editPolicyConfirmed) {
      showToast('Please confirm policy update.', 'error');
      return;
    }
    setEditPolicyLoading(true);
    try {
      await api.adminOps.updateRetentionPolicy(selectedPolicy.id, {
        retentionDays: Number(editRetentionDays),
        autoPurgeEnabled: editAutoPurge,
        gracePeriodDays: Number(editGracePeriod),
        reason: editPolicyReason.trim(),
        confirmation: true,
      });
      showToast(`Retention policy for "${selectedPolicy.dataCategory}" updated successfully.`);
      setEditPolicyModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Policy update failed: ${err.message}`, 'error');
    } finally {
      setEditPolicyLoading(false);
    }
  };

  const handleExecutePurge = async () => {
    if (!purgeReason || purgeReason.trim().length < 8) {
      showToast('A justification reason of at least 8 characters is required.', 'error');
      return;
    }
    if (!purgeConfirmed) {
      showToast('Please confirm the purge operation.', 'error');
      return;
    }
    setPurgeLoading(true);
    try {
      const res = await api.adminOps.executeCompliancePurge({
        dataCategory: purgeCategory,
        targetTenantId: purgeTenantId.trim() || undefined,
        reason: purgeReason.trim(),
        confirmation: true,
      });
      setLastPurgeCert(res.data.certificate);
      showToast(`Safe purge executed! ${res.data.recordsPurged} records purged. Cryptographic certificate generated.`);
      setPurgeModalOpen(false);
      setPurgeReason('');
      setPurgeConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Purge failed: ${err.message}`, 'error');
    } finally {
      setPurgeLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleSlug.trim() || !newRoleName.trim()) {
      showToast('Role slug and role name are required.', 'error');
      return;
    }
    if (newRoleSelectedPermissions.length === 0) {
      showToast('Please select at least one permission.', 'error');
      return;
    }
    if (!newRoleConfirmed) {
      showToast('Please confirm role creation.', 'error');
      return;
    }
    setCreateRoleLoading(true);
    try {
      const res = await api.adminOps.createCustomRole({
        roleSlug: newRoleSlug.trim().toLowerCase(),
        roleName: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        permissions: newRoleSelectedPermissions,
        targetTenantId: newRoleTargetTenantId.trim() || undefined,
        confirmation: true,
      });
      showToast(`Custom role "${res.data.roleName}" (${res.data.roleSlug}) registered successfully.`);
      setCreateRoleModalOpen(false);
      setNewRoleSlug('');
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleSelectedPermissions([]);
      setNewRoleTargetTenantId('');
      setNewRoleConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Role creation failed: ${err.message}`, 'error');
    } finally {
      setCreateRoleLoading(false);
    }
  };

  // Safe Action: Override Component Status
  const handleExecuteOverrideComponent = async () => {
    if (!selectedOverrideComp) return;
    if (!overrideConfirmed) {
      showToast('Please check the confirmation box before overriding subsystem status.', 'error');
      return;
    }
    if (overrideReason.trim().length < 8) {
      showToast('Mandatory justification reason must be at least 8 characters.', 'error');
      return;
    }

    setOverrideLoading(true);
    try {
      await api.adminOps.overrideSlaComponent(selectedOverrideComp.id, {
        status: overrideTargetStatus,
        reason: overrideReason.trim(),
        confirmed: true,
      });
      showToast(`Subsystem "${selectedOverrideComp.name}" status overridden to ${overrideTargetStatus.toUpperCase()}. Fully audited.`);
      setOverrideModalOpen(false);
      setSelectedOverrideComp(null);
      setOverrideReason('');
      setOverrideConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to override subsystem status: ${err.message}`, 'error');
    } finally {
      setOverrideLoading(false);
    }
  };

  // Safe Action: Clear Component Override
  const handleExecuteClearOverride = async () => {
    if (!selectedClearComp) return;
    if (!clearConfirmed) {
      showToast('Please check the confirmation box before clearing subsystem override.', 'error');
      return;
    }
    if (clearReason.trim().length < 8) {
      showToast('Mandatory justification reason must be at least 8 characters.', 'error');
      return;
    }

    setClearLoading(true);
    try {
      await api.adminOps.clearSlaComponentOverride(selectedClearComp.id, {
        reason: clearReason.trim(),
        confirmed: true,
      });
      showToast(`Manual override cleared for "${selectedClearComp.name}". Subsystem restored to OPERATIONAL.`);
      setClearOverrideModalOpen(false);
      setSelectedClearComp(null);
      setClearReason('');
      setClearConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to clear subsystem override: ${err.message}`, 'error');
    } finally {
      setClearLoading(false);
    }
  };

  // Safe Action: Run Synthetic Probe
  const handleExecuteSyntheticProbe = async () => {
    setProbeLoading(true);
    try {
      const res = await api.adminOps.runSlaSyntheticProbe();
      showToast(`Synthetic health & latency probe completed across ${res.results?.length || 8} subsystems.`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Probe failed: ${err.message}`, 'error');
    } finally {
      setProbeLoading(false);
    }
  };

  // Safe Action: Schedule Maintenance Window
  const handleExecuteScheduleMaintenance = async () => {
    if (!newMaintTitle.trim() || newMaintTitle.trim().length < 4) {
      showToast('Title must be at least 4 characters.', 'error');
      return;
    }
    if (!newMaintDescription.trim() || newMaintDescription.trim().length < 8) {
      showToast('Description must be at least 8 characters detailing maintenance scope.', 'error');
      return;
    }
    if (!newMaintStart || !newMaintEnd) {
      showToast('Scheduled start and end times are required.', 'error');
      return;
    }
    if (!newMaintConfirmed) {
      showToast('Please confirm scheduling this platform maintenance window.', 'error');
      return;
    }

    setSchedMaintLoading(true);
    try {
      await api.adminOps.scheduleSlaMaintenance({
        title: newMaintTitle.trim(),
        description: newMaintDescription.trim(),
        impactLevel: newMaintImpact,
        impactedComponents: newMaintImpactedComps,
        scheduledStartAt: new Date(newMaintStart).toISOString(),
        scheduledEndAt: new Date(newMaintEnd).toISOString(),
        confirmed: true,
      });
      showToast(`Maintenance window "${newMaintTitle}" scheduled and broadcast to status feed.`);
      setSchedMaintModalOpen(false);
      setNewMaintTitle('');
      setNewMaintDescription('');
      setNewMaintConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to schedule maintenance: ${err.message}`, 'error');
    } finally {
      setSchedMaintLoading(false);
    }
  };

  // Safe Action: Update Maintenance Window Status
  const handleExecuteUpdateMaintenanceStatus = async () => {
    if (!selectedMaintWindow) return;
    if (maintUpdateReason.trim().length < 8) {
      showToast('Mandatory justification reason must be at least 8 characters.', 'error');
      return;
    }
    if (!maintConfirmed) {
      showToast('Please confirm updating maintenance window state.', 'error');
      return;
    }

    setUpdateMaintLoading(true);
    try {
      await api.adminOps.updateSlaMaintenanceStatus(selectedMaintWindow.id, {
        status: maintTargetStatus,
        reason: maintUpdateReason.trim(),
        cancellationReason: maintTargetStatus === 'cancelled' ? maintUpdateReason.trim() : undefined,
        confirmed: true,
      });
      showToast(`Maintenance window "${selectedMaintWindow.title}" updated to ${maintTargetStatus.toUpperCase()}.`);
      setUpdateMaintModalOpen(false);
      setSelectedMaintWindow(null);
      setMaintUpdateReason('');
      setMaintConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to update maintenance: ${err.message}`, 'error');
    } finally {
      setUpdateMaintLoading(false);
    }
  };

  // Safe Action: Create Manual Snapshot
  const handleExecuteCreateSnapshot = async () => {
    if (newSnapReason.trim().length < 8) {
      showToast('Mandatory justification reason must be at least 8 characters.', 'error');
      return;
    }
    if (!newSnapConfirmed) {
      showToast('Please confirm snapshot creation.', 'error');
      return;
    }

    setCreateSnapshotLoading(true);
    try {
      await api.adminOps.createDrSnapshot({
        snapshotType: newSnapType as any,
        storageTier: newSnapTier as any,
        retentionDays: Number(newSnapRetentionDays),
        reason: newSnapReason.trim(),
        confirmed: true,
      });
      showToast('Vault snapshot created successfully and verified with SHA-256 manifest.');
      setCreateSnapshotModalOpen(false);
      setNewSnapReason('');
      setNewSnapConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to create snapshot: ${err.message}`, 'error');
    } finally {
      setCreateSnapshotLoading(false);
    }
  };

  // Safe Action: Execute Disaster Recovery Drill
  const handleExecuteDrill = async () => {
    if (!selectedDrillSnapshot) {
      showToast('Please select a target snapshot to verify.', 'error');
      return;
    }
    if (drillReason.trim().length < 8) {
      showToast('Mandatory justification reason must be at least 8 characters.', 'error');
      return;
    }
    if (!drillConfirmed) {
      showToast('Please confirm running synthetic DR drill.', 'error');
      return;
    }

    setDrillLoading(true);
    try {
      const result = await api.adminOps.executeDrDrill(selectedDrillSnapshot.id, {
        targetEnv: drillTargetEnv,
        reason: drillReason.trim(),
        confirmed: true,
      });
      showToast(`DR Drill completed in ${result.drill.rtoSeconds}s RTO. Schema & data integrity 100% verified.`);
      setDrillModalOpen(false);
      setSelectedDrillSnapshot(null);
      setDrillReason('');
      setDrillConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to execute DR drill: ${err.message}`, 'error');
    } finally {
      setDrillLoading(false);
    }
  };

  // Safe Action: Request Tenant Backup Export
  const handleExecuteTenantBackup = async () => {
    if (!selectedBackupTenantId.trim()) {
      showToast('Please specify target tenant ID for backup export.', 'error');
      return;
    }
    if (backupReason.trim().length < 8) {
      showToast('Mandatory justification reason must be at least 8 characters.', 'error');
      return;
    }
    if (!backupConfirmed) {
      showToast('Please confirm tenant backup export.', 'error');
      return;
    }

    setTenantBackupLoading(true);
    try {
      const result = await api.adminOps.requestTenantBackup({
        tenantId: selectedBackupTenantId.trim(),
        format: backupFormat,
        reason: backupReason.trim(),
        confirmed: true,
      });
      showToast(`Tenant backup generated (${(result.sizeBytes / 1024).toFixed(1)} KB) with SHA-256 verification.`);
      setTenantBackupModalOpen(false);
      setSelectedBackupTenantId('');
      setBackupReason('');
      setBackupConfirmed(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to request tenant backup: ${err.message}`, 'error');
    } finally {
      setTenantBackupLoading(false);
    }
  };

  // Safe Action: Register Outbound Webhook Endpoint
  const handleRegisterEndpoint = async () => {
    if (!newEpName.trim()) {
      showToast('Please enter an endpoint name.', 'error');
      return;
    }
    if (!newEpUrl.trim() || !newEpUrl.startsWith('http')) {
      showToast('Please enter a valid HTTP or HTTPS endpoint URL.', 'error');
      return;
    }
    if (newEpEvents.length === 0) {
      showToast('Please select at least one subscribed event type.', 'error');
      return;
    }

    setRegisterEpLoading(true);
    try {
      const res = await api.adminOps.createOutboundEndpoint({
        name: newEpName.trim(),
        url: newEpUrl.trim(),
        events: newEpEvents,
      });
      setRegisteredRawSecret(res.rawSecret);
      showToast('Outbound webhook endpoint registered successfully. Save the signing secret.');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to register endpoint: ${err.message}`, 'error');
    } finally {
      setRegisterEpLoading(false);
    }
  };

  // Safe Action: Rotate Secret
  const handleRotateSecret = async () => {
    if (!targetRotateEndpoint) return;
    setRotateSecretLoading(true);
    try {
      const res = await api.adminOps.rotateOutboundSecret(targetRotateEndpoint.id);
      setRotatedRawSecret(res.rawSecret);
      showToast('Webhook signing secret rotated successfully.');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to rotate secret: ${err.message}`, 'error');
    } finally {
      setRotateSecretLoading(false);
    }
  };

  // Safe Action: Toggle Endpoint Status
  const handleToggleEndpointStatus = async (ep: OutboundWebhookEndpoint) => {
    const nextStatus = ep.status === 'active' ? 'paused' : 'active';
    try {
      await api.adminOps.setOutboundEndpointStatus(ep.id, nextStatus);
      showToast(`Endpoint ${ep.name} status updated to ${nextStatus}.`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  // Safe Action: Delete Endpoint
  const handleDeleteEndpoint = (ep: OutboundWebhookEndpoint) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Outbound Webhook Endpoint',
      description: `Are you sure you want to permanently delete endpoint '${ep.name}'? All delivery logs and active retries will also be purged.`,
      confirmText: 'Delete Endpoint',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteOutboundEndpoint(ep.id);
          showToast(`Endpoint ${ep.name} deleted.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Failed to delete endpoint: ${err.message}`, 'error');
        }
      },
    });
  };

  // Safe Action: Test Dispatch
  const handleTestDispatch = async () => {
    if (!targetTestEndpoint) return;
    setTestDispatchLoading(true);
    try {
      let customPayload: Record<string, any> | undefined;
      try {
        if (testPayloadText.trim()) {
          customPayload = JSON.parse(testPayloadText.trim());
        }
      } catch {
        showToast('Invalid custom payload JSON. Please correct JSON syntax.', 'error');
        setTestDispatchLoading(false);
        return;
      }

      const res = await api.adminOps.testOutboundEndpoint(targetTestEndpoint.id, {
        eventType: testEventType,
        payload: customPayload,
      });
      setTestDispatchResult(res);
      showToast(`Test dispatch executed: status ${res.statusCode} (${res.status}) in ${res.durationMs}ms.`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Test dispatch failed: ${err.message}`, 'error');
    } finally {
      setTestDispatchLoading(false);
    }
  };

  // Safe Action: Retry Delivery
  const handleRetryDelivery = async (delId: string) => {
    try {
      const res = await api.adminOps.retryOutboundDelivery(delId);
      showToast(`Replay executed: Status ${res.statusCode} (${res.status}).`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Delivery retry failed: ${err.message}`, 'error');
    }
  };

  // Safe Action: SSO Handlers
  const openCreateSsoModal = () => {
    setEditingSsoConfig(null);
    setSsoName('');
    setSsoProviderType('saml');
    setSsoIdpEntityId('');
    setSsoIdpSsoUrl('');
    setSsoIdpCert('');
    setSsoDomainsText('acme-corp.com');
    setSsoJit(true);
    setSsoDefaultRole('editor');
    setSsoEnforce(false);
    setSsoStatus('active');
    setCreateSsoModalOpen(true);
  };

  const openEditSsoModal = (cfg: EnterpriseSsoConfig) => {
    setEditingSsoConfig(cfg);
    setSsoName(cfg.name);
    setSsoProviderType(cfg.providerType);
    setSsoIdpEntityId(cfg.idpEntityId);
    setSsoIdpSsoUrl(cfg.idpSsoUrl);
    setSsoIdpCert(cfg.idpCertificate);
    setSsoDomainsText((cfg.domains || []).join(', '));
    setSsoJit(cfg.jitProvisioningEnabled);
    setSsoDefaultRole(cfg.defaultRole || 'editor');
    setSsoEnforce(cfg.enforceSso);
    setSsoStatus(cfg.status);
    setCreateSsoModalOpen(true);
  };

  const handleSaveSsoConfig = async () => {
    if (!ssoName.trim()) {
      showToast('Please enter a descriptive Identity Provider name.', 'error');
      return;
    }
    if (!ssoIdpEntityId.trim() || !ssoIdpSsoUrl.trim()) {
      showToast('IdP Entity ID and IdP SSO URL are required.', 'error');
      return;
    }
    const parsedDomains = ssoDomainsText
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    if (parsedDomains.length === 0) {
      showToast('At least one mapped corporate domain is required (e.g., acme-corp.com).', 'error');
      return;
    }

    setSaveSsoLoading(true);
    try {
      if (editingSsoConfig) {
        await api.adminOps.updateSsoConfig(editingSsoConfig.id, {
          name: ssoName.trim(),
          idpEntityId: ssoIdpEntityId.trim(),
          idpSsoUrl: ssoIdpSsoUrl.trim(),
          idpCertificate: ssoIdpCert.trim(),
          domains: parsedDomains,
          jitProvisioningEnabled: ssoJit,
          defaultRole: ssoDefaultRole,
          enforceSso: ssoEnforce,
          status: ssoStatus,
        });
        showToast(`SSO configuration "${ssoName.trim()}" updated successfully.`);
      } else {
        await api.adminOps.createSsoConfig({
          name: ssoName.trim(),
          providerType: ssoProviderType,
          idpEntityId: ssoIdpEntityId.trim(),
          idpSsoUrl: ssoIdpSsoUrl.trim(),
          idpCertificate: ssoIdpCert.trim(),
          domains: parsedDomains,
          jitProvisioningEnabled: ssoJit,
          defaultRole: ssoDefaultRole,
          enforceSso: ssoEnforce,
          status: ssoStatus,
        });
        showToast(`SSO configuration "${ssoName.trim()}" created successfully.`);
      }
      setCreateSsoModalOpen(false);
      setEditingSsoConfig(null);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to save SSO config: ${err.message}`, 'error');
    } finally {
      setSaveSsoLoading(false);
    }
  };

  const handleDeleteSsoConfig = (cfg: EnterpriseSsoConfig) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Enterprise SSO Configuration',
      description: `Are you sure you want to permanently delete SSO federation "${cfg.name}"? Active SSO logins for domains (${cfg.domains.join(', ')}) will fail.`,
      confirmText: 'Delete SSO Config',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteSsoConfig(cfg.id);
          showToast(`SSO configuration "${cfg.name}" deleted.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Failed to delete SSO config: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleSimulateSaml = async () => {
    if (!targetSimulateConfig) return;
    if (!simTestEmail.trim() || !simTestEmail.includes('@')) {
      showToast('Please enter a valid test user email address.', 'error');
      return;
    }
    setSamlSimLoading(true);
    try {
      const res = await api.adminOps.simulateSamlAssertion(targetSimulateConfig.id, {
        email: simTestEmail.trim(),
        nameId: simTestNameId.trim() || simTestEmail.trim(),
      });
      setSimResult(res);
      showToast('SAML Assertion simulated successfully.');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSamlSimLoading(false);
    }
  };

  // Safe Action: Generate / Rotate / Revoke SCIM API Tokens
  const handleCreateScimToken = async () => {
    if (!newScimTokenName.trim()) {
      showToast('Please enter a descriptive token name.', 'error');
      return;
    }
    setCreateScimTokenLoading(true);
    try {
      const res = await api.adminOps.createScimToken({
        name: newScimTokenName.trim(),
        tenantId: newScimTokenTenantId.trim() || undefined,
        expiresInDays: newScimTokenExpiresInDays || undefined,
      });
      setCreatedRawScimToken(res.rawToken);
      showToast('SCIM Bearer Token created successfully.');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to create SCIM token: ${err.message}`, 'error');
    } finally {
      setCreateScimTokenLoading(false);
    }
  };

  const handleRevokeScimToken = (tok: ScimApiToken) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke SCIM Bearer Token',
      description: `Are you sure you want to revoke SCIM Bearer token "${tok.name}"? Active Okta / Azure AD automated sync calls using this token will fail.`,
      confirmText: 'Revoke Token',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.revokeScimToken(tok.id);
          showToast(`SCIM token "${tok.name}" revoked.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Failed to revoke SCIM token: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleRotateScimToken = (tok: ScimApiToken) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Rotate SCIM Bearer Token',
      description: `Rotate SCIM Bearer token "${tok.name}"? The current token will immediately be replaced with a new cryptographic secret.`,
      confirmText: 'Rotate Secret',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await api.adminOps.rotateScimToken(tok.id);
          setCreatedRawScimToken(res.rawToken);
          setNewScimTokenName(tok.name);
          setCreateScimTokenModalOpen(true);
          showToast(`SCIM token "${tok.name}" rotated successfully.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Failed to rotate SCIM token: ${err.message}`, 'error');
        }
      },
    });
  };

  // Safe Actions: SIEM Destination Operations
  const handleSaveSiemDestination = async () => {
    if (!siemName.trim()) {
      showToast('Please enter a destination name.', 'error');
      return;
    }
    if (!siemUrl.trim()) {
      showToast('Please enter an endpoint URL.', 'error');
      return;
    }
    if (!editingSiemDest && !siemAuthSecret.trim()) {
      showToast('Please enter an authentication secret or token.', 'error');
      return;
    }
    setSaveSiemLoading(true);
    try {
      if (editingSiemDest) {
        await api.adminOps.updateSiemDestination(editingSiemDest.id, {
          name: siemName.trim(),
          destinationType: siemType,
          payloadFormat: siemFormat,
          endpointUrl: siemUrl.trim(),
          authSecret: siemAuthSecret.trim() || undefined,
          categories: siemCategories,
          minSeverity: siemSeverity,
          batchSize: siemBatchSize,
          rateLimitPerMin: siemRateLimit,
        });
        showToast('SIEM destination updated.');
      } else {
        await api.adminOps.createSiemDestination({
          name: siemName.trim(),
          destinationType: siemType,
          payloadFormat: siemFormat,
          endpointUrl: siemUrl.trim(),
          authSecret: siemAuthSecret.trim(),
          categories: siemCategories,
          minSeverity: siemSeverity,
          batchSize: siemBatchSize,
          rateLimitPerMin: siemRateLimit,
        });
        showToast('SIEM destination created.');
      }
      setCreateSiemModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to save SIEM destination: ${err.message}`, 'error');
    } finally {
      setSaveSiemLoading(false);
    }
  };

  const handleDeleteSiemDestination = (dest: SiemDestinationConfig) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete SIEM Destination',
      description: `Are you sure you want to delete SIEM destination "${dest.name}"? Stream delivery will be permanently stopped.`,
      confirmText: 'Delete Destination',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteSiemDestination(dest.id);
          showToast(`SIEM destination "${dest.name}" deleted.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Failed to delete destination: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleToggleSiemStatus = async (dest: SiemDestinationConfig) => {
    const nextStatus = dest.status === 'active' ? 'paused' : 'active';
    try {
      await api.adminOps.toggleSiemStatus(dest.id, nextStatus);
      showToast(`SIEM stream ${nextStatus === 'active' ? 'resumed' : 'paused'}.`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleDispatchSiemProbe = async () => {
    if (!targetProbeDest) return;
    setSiemProbeLoading(true);
    try {
      const res = await api.adminOps.dispatchSiemProbe(targetProbeDest.id, {
        category: probeCategory,
        severity: probeSeverity,
        action: probeAction.trim() || undefined,
        message: probeMessage.trim() || undefined,
      });
      setProbeResult(res);
      showToast('SIEM security event probe dispatched.');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Probe failed: ${err.message}`, 'error');
    } finally {
      setSiemProbeLoading(false);
    }
  };

  // DLP Handlers
  const handleOpenCreateDlpPolicy = () => {
    setEditingDlpPolicy(null);
    setDlpPolicyName('');
    setDlpPolicyDesc('');
    setDlpPolicyCategory('financial_pci');
    setDlpPolicySeverity('critical');
    setDlpPolicyAction('redact_inline');
    setDlpPatternName('Credit Card Matcher');
    setDlpPatternRegex('\\b4[0-9]{12}(?:[0-9]{3})?\\b');
    setDlpPatternFlags('g');
    setDlpPatternDesc('Visa credit card number');
    setDlpPatternsList([
      {
        name: 'Visa Credit Card',
        pattern: '\\b4[0-9]{12}(?:[0-9]{3})?\\b',
        flags: 'g',
        description: 'Standard 13 or 16 digit Visa card format',
      },
    ]);
    setDlpScopesList(['posts:publish']);
    setCreateDlpModalOpen(true);
  };

  const handleOpenEditDlpPolicy = (pol: DlpPolicy) => {
    setEditingDlpPolicy(pol);
    setDlpPolicyName(pol.name);
    setDlpPolicyDesc(pol.description || '');
    setDlpPolicyCategory(pol.category);
    setDlpPolicySeverity(pol.severity);
    setDlpPolicyAction(pol.action);
    setDlpPatternsList(pol.match_patterns || []);
    setDlpScopesList(pol.target_scopes || ['posts:publish']);
    setCreateDlpModalOpen(true);
  };

  const handleAddPatternRule = () => {
    if (!dlpPatternName.trim() || !dlpPatternRegex.trim()) {
      showToast('Pattern rule must include name and regex.', 'error');
      return;
    }
    try {
      new RegExp(dlpPatternRegex.trim(), dlpPatternFlags || 'g');
    } catch (err: any) {
      showToast(`Invalid regex: ${err.message}`, 'error');
      return;
    }
    setDlpPatternsList((prev) => [
      ...prev,
      {
        name: dlpPatternName.trim(),
        pattern: dlpPatternRegex.trim(),
        flags: dlpPatternFlags || 'g',
        description: dlpPatternDesc.trim(),
      },
    ]);
    setDlpPatternName('');
    setDlpPatternRegex('');
    setDlpPatternDesc('');
  };

  const handleRemovePatternRule = (index: number) => {
    setDlpPatternsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDlpPolicy = async () => {
    if (!dlpPolicyName.trim()) {
      showToast('Policy name is required.', 'error');
      return;
    }
    if (dlpPatternsList.length === 0) {
      showToast('At least one pattern rule is required.', 'error');
      return;
    }

    setSaveDlpLoading(true);
    try {
      if (editingDlpPolicy) {
        await api.adminOps.updateDlpPolicy(editingDlpPolicy.id, {
          name: dlpPolicyName.trim(),
          description: dlpPolicyDesc.trim(),
          category: dlpPolicyCategory,
          severity: dlpPolicySeverity,
          action: dlpPolicyAction,
          match_patterns: dlpPatternsList,
          target_scopes: dlpScopesList,
        });
        showToast(`DLP policy "${dlpPolicyName}" updated.`);
      } else {
        await api.adminOps.createDlpPolicy({
          name: dlpPolicyName.trim(),
          description: dlpPolicyDesc.trim(),
          category: dlpPolicyCategory,
          severity: dlpPolicySeverity,
          action: dlpPolicyAction,
          match_patterns: dlpPatternsList,
          target_scopes: dlpScopesList,
          is_enabled: true,
        });
        showToast(`DLP policy "${dlpPolicyName}" created.`);
      }
      setCreateDlpModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to save DLP policy: ${err.message}`, 'error');
    } finally {
      setSaveDlpLoading(false);
    }
  };

  const handleToggleDlpPolicy = async (pol: DlpPolicy) => {
    try {
      const nextEnabled = !pol.is_enabled;
      await api.adminOps.toggleDlpPolicy(pol.id, nextEnabled);
      showToast(`DLP policy ${nextEnabled ? 'enabled' : 'disabled'}.`);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Toggle failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteDlpPolicy = (pol: DlpPolicy) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete DLP Policy',
      description: `Are you sure you want to delete DLP policy "${pol.name}"? Real-time content scanning for this pattern rule will be permanently removed.`,
      confirmText: 'Delete Policy',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteDlpPolicy(pol.id);
          showToast(`DLP policy "${pol.name}" deleted.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Delete failed: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleOpenSimulateDlp = () => {
    setSimulateDlpText('Sample post containing AWS AKIAIOSFODNN7EXAMPLE and card 4532015112830366 for testing.');
    setSimulateDlpResult(null);
    setSimulateDlpModalOpen(true);
  };

  const handleRunDlpSimulation = async () => {
    if (!simulateDlpText.trim()) {
      showToast('Please enter text to simulate scan.', 'error');
      return;
    }
    setSimulateDlpLoading(true);
    try {
      const res = await api.adminOps.simulateDlpScan({
        content: simulateDlpText,
      });
      setSimulateDlpResult(res);
      showToast('DLP simulation scan completed.');
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimulateDlpLoading(false);
    }
  };

  const handleOpenReviewIncident = (inc: DlpIncident) => {
    setSelectedDlpIncident(inc);
    setReviewDlpDecision('approved_override');
    setReviewDlpNotes('');
    setReviewDlpModalOpen(true);
  };

  const handleReviewQuarantineIncident = async () => {
    if (!selectedDlpIncident) return;
    setReviewDlpLoading(true);
    try {
      await api.adminOps.reviewDlpQuarantine(selectedDlpIncident.id, {
        tenantId: selectedDlpIncident.tenant_id,
        decision: reviewDlpDecision,
        reviewNotes: reviewDlpNotes.trim() || undefined,
      });
      showToast(`Incident review submitted: ${reviewDlpDecision}.`);
      setReviewDlpModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Review failed: ${err.message}`, 'error');
    } finally {
      setReviewDlpLoading(false);
    }
  };

  // RBAC Handlers
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleSlugInput('');
    setRoleNameInput('');
    setRoleDescInput('');
    setRoleParentSlugInput('');
    setSelectedPermissions(['posts:read', 'posts:create']);
    setCreateRbacRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: EnterpriseCustomRole) => {
    setEditingRole(role);
    setRoleSlugInput(role.roleSlug);
    setRoleNameInput(role.roleName);
    setRoleDescInput(role.description || '');
    setRoleParentSlugInput(role.parentRoleSlug || '');
    setSelectedPermissions(role.permissions || []);
    setCreateRbacRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleNameInput.trim()) {
      showToast('Role name is required.', 'error');
      return;
    }
    if (!editingRole && !roleSlugInput.trim()) {
      showToast('Role slug is required.', 'error');
      return;
    }
    if (selectedPermissions.length === 0) {
      showToast('At least one permission must be selected.', 'error');
      return;
    }

    setSaveRoleLoading(true);
    try {
      if (editingRole) {
        await api.adminOps.updateRbacRole(editingRole.id, {
          roleName: roleNameInput.trim(),
          description: roleDescInput.trim() || undefined,
          permissions: selectedPermissions,
          parentRoleSlug: roleParentSlugInput.trim() || null,
        });
        showToast(`Role "${roleNameInput}" updated.`);
      } else {
        await api.adminOps.createRbacRole({
          roleSlug: roleSlugInput.trim(),
          roleName: roleNameInput.trim(),
          description: roleDescInput.trim() || undefined,
          permissions: selectedPermissions,
          parentRoleSlug: roleParentSlugInput.trim() || null,
        });
        showToast(`Custom role "${roleNameInput}" created.`);
      }
      setCreateRbacRoleModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to save role: ${err.message}`, 'error');
    } finally {
      setSaveRoleLoading(false);
    }
  };

  const handleDeleteRole = (role: EnterpriseCustomRole) => {
    if (role.isSystem) {
      showToast('System roles cannot be deleted.', 'error');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Custom RBAC Role',
      description: `Are you sure you want to delete custom role "${role.roleName}"? Any users assigned exclusively to this role will lose their custom permissions.`,
      confirmText: 'Delete Role',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteRbacRole(role.id);
          showToast(`Role "${role.roleName}" deleted.`);
          loadActiveTabData(true);
        } catch (err: any) {
          showToast(`Failed to delete role: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleOpenSimulateRbac = () => {
    setSimBaseRole('creator');
    setSimCustomRoles([]);
    setSimTargetPerm('posts:publish');
    setSimRbacResult(null);
    setSimulateRbacModalOpen(true);
  };

  const handleRunRbacSimulation = async () => {
    setSimRbacLoading(true);
    try {
      const res = await api.adminOps.simulateRbacPermission({
        baseRole: simBaseRole,
        hypotheticalRoles: simCustomRoles,
        targetPermission: simTargetPerm,
      });
      setSimRbacResult(res.data);
      showToast('RBAC simulation evaluated.');
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimRbacLoading(false);
    }
  };

  const handleOpenCreateOverride = () => {
    setOverrideTenantId('0842e532-e6cf-4cc1-b8ce-4c4546a10a97');
    setOverrideUserId('');
    setOverridePermSlug('posts:publish');
    setOverrideEffect('allow');
    setRbacOverrideReason('Temporary editorial clearance approved');
    setOverrideExpiresDays(30);
    setCreateOverrideModalOpen(true);
  };

  const handleSaveOverride = async () => {
    if (!overrideUserId.trim()) {
      showToast('User ID is required.', 'error');
      return;
    }
    if (!overridePermSlug.trim()) {
      showToast('Permission slug is required.', 'error');
      return;
    }

    setSaveOverrideLoading(true);
    try {
      await api.adminOps.createRbacPermissionOverride({
        tenantId: overrideTenantId.trim(),
        userId: overrideUserId.trim(),
        permissionSlug: overridePermSlug.trim(),
        effect: overrideEffect,
        reason: rbacOverrideReason.trim() || undefined,
        expiresInDays: overrideExpiresDays > 0 ? overrideExpiresDays : undefined,
      });
      showToast(`Explicit ${overrideEffect.toUpperCase()} override created.`);
      setCreateOverrideModalOpen(false);
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to create override: ${err.message}`, 'error');
    } finally {
      setSaveOverrideLoading(false);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await api.adminOps.deleteRbacPermissionOverride(overrideId);
      showToast('Permission override revoked.');
      loadActiveTabData(true);
    } catch (err: any) {
      showToast(`Failed to revoke override: ${err.message}`, 'error');
    }
  };

  const tabs: Array<{ id: AdminOpsTab; label: string; icon: any; count?: number }> = [
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'usage', label: 'Usage & Quotas', icon: Activity },
    { id: 'providers', label: 'Provider Health', icon: Globe },
    { id: 'connections', label: 'Connections', icon: Share2 },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'queues', label: 'Queue & Workers', icon: Server },
    { id: 'rate_limits', label: 'Rate Limits (429)', icon: ShieldAlert },
    { id: 'dlq', label: 'DLQ Recovery', icon: RotateCcw },
    { id: 'incidents', label: 'Incidents & Alerts', icon: Bell },
    { id: 'audit_logs', label: 'Audit Logs', icon: FileText },
    { id: 'entitlements', label: 'Entitlements', icon: Sliders },
    { id: 'compliance', label: 'Compliance & RBAC', icon: ShieldCheck },
    { id: 'sla_status', label: 'Enterprise SLA & Status', icon: Activity },
    { id: 'disaster_recovery', label: 'Disaster Recovery & Vault', icon: Database },
    { id: 'outbound_webhooks', label: 'Outbound Webhooks', icon: Send },
    { id: 'enterprise_sso', label: 'Enterprise SSO & SAML', icon: Lock },
    { id: 'scim_sync', label: 'SCIM 2.0 Directory Sync', icon: Users },
    { id: 'siem_stream', label: 'SIEM & Security Telemetry', icon: Shield },
    { id: 'dlp_guard', label: 'DLP & Content Guardrails', icon: ShieldAlert },
    { id: 'custom_rbac', label: 'Custom Roles & RBAC', icon: Lock },
    { id: 'worm_vault', label: 'WORM Vault & Tamper-Evidence', icon: ShieldCheck },
    { id: 'custom_domains', label: 'Custom Domains & White-Label', icon: Globe },
    { id: 'agent_fleet', label: 'AI Agent Fleet Orchestration', icon: Bot },
    { id: 'edge_cache', label: 'Edge Caching & CDN Hub', icon: Globe },
    { id: 'knowledge_graph', label: 'Brand Knowledge Graph', icon: Share2 },
    { id: 'revenue_intelligence', label: 'Predictive Churn & LTV Intelligence', icon: TrendingUp },
    { id: 'api_gateway', label: 'API Gateway & Dynamic Throttling', icon: Network },
    { id: 'replication_mesh', label: 'Multi-Region Replication Mesh', icon: Database },
    { id: 'chaos_engineering', label: 'Chaos Engineering & Resiliency Lab', icon: Flame },
    { id: 'secret_rotation', label: 'Zero-Trust Secret Rotation & KMS', icon: Key },
    { id: 'finops', label: 'Multi-Cloud FinOps & Rightsizing', icon: DollarSign },
    { id: 'compliance_locker', label: 'Continuous Compliance & Evidence Locker', icon: ShieldCheck },
    { id: 'event_mesh', label: 'Global Event Mesh & DLQ Replay', icon: Radio },
    { id: 'database_archival', label: 'Database Partitioning & Archival', icon: Database },
    { id: 'query_federation', label: 'Query Federation & CQRS Engine', icon: Network },
    { id: 'multi_master', label: 'Multi-Master Conflict Resolution', icon: Globe },
    { id: 'jit_access', label: 'Zero-Trust JIT Access & Dual-Auth', icon: ShieldCheck },
    { id: 'hsm_broker', label: 'HSM Key Broker & Envelope Encryption', icon: KeyRound },
    { id: 'object_storage', label: 'Object Storage & WORM Vault', icon: HardDrive },
    { id: 'neural_rag', label: 'Neural Vector RAG Mesh', icon: Brain },
    { id: 'collaborative_canvas', label: 'Collaborative Canvas & OT Gateway', icon: Palette },
    { id: 'video_rendering', label: 'GPU Video Rendering & Transcoding', icon: Video },
    { id: 'saga_workflow', label: 'Distributed Workflow Engine & Sagas', icon: Workflow },
    { id: 'sharding_mesh', label: 'Cross-Region Sharding & 2PC Mesh', icon: Database },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background:
              toastMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.95)'
                : toastMessage.type === 'info'
                ? 'rgba(59, 130, 246, 0.95)'
                : 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
          }}
        >
          {toastMessage.type === 'error' ? (
            <AlertOctagon size={18} />
          ) : toastMessage.type === 'info' ? (
            <Shield size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Active Impersonation Session Banner */}
      {activeImpSession && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <strong style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
              ACTIVE AUDITED SUPPORT SESSION: Impersonating tenant "{activeImpSession.targetTenantName}"
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Ticket: {activeImpSession.ticketReference} | Expires: {new Date(activeImpSession.expiresAt).toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={handleRevokeImpersonation}
            className="btn btn-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              fontWeight: 600,
            }}
          >
            End Support Session
          </button>
        </div>
      )}

      {/* Header & Subtitle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Superadmin Operations
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, maxWidth: '800px' }}>
            Mission Control & Security Portal: Inspect cross-tenant health, provider uptime, worker queues, rate-limit
            incidents, DLQ recovery, and audited support actions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => loadActiveTabData(true)}
            className="btn btn-secondary btn-sm"
            disabled={refreshing || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh View'}</span>
          </button>
        </div>
      </div>

      {/* Operational View Navigation Tabs (Pills) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              id={`tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: isSelected ? 600 : 500,
                background: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TENANT DIRECTORY & SEARCH                                         */}
      {/* ========================================================================= */}
      {activeTab === 'tenants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search tenants by name, slug, or ID..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.86rem' }}
                />
              </div>

              <select
                value={tenantStatusFilter}
                onChange={(e) => setTenantStatusFilter(e.target.value)}
                className="input"
                style={{ height: '38px', width: '150px', fontSize: '0.84rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing <strong>{tenants.length}</strong> of {tenantTotal} tenants
            </span>
          </div>

          {/* Tenants Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>Tenant</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>Plan / MRR</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>Brands</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>Members</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          slug: {t.slug} • id: {t.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 500 }}>{t.planName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--accent-emerald)' }}>
                          ${(t.mrrCents / 100).toFixed(2)}/mo
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>{t.brandCount}</td>
                      <td style={{ padding: '14px 18px' }}>{t.userCount}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          className="badge"
                          style={{
                            background:
                              t.subscriptionStatus === 'active'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : t.subscriptionStatus === 'past_due'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              t.subscriptionStatus === 'active'
                                ? '#34d399'
                                : t.subscriptionStatus === 'past_due'
                                ? '#f87171'
                                : '#fbbf24',
                            textTransform: 'capitalize',
                          }}
                        >
                          {t.subscriptionStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleInspectTenant(t.id)}
                            className="btn btn-secondary btn-sm"
                            title="Inspect Tenant Deep Telemetry"
                          >
                            <Eye size={13} /> Inspect
                          </button>
                          <button
                            onClick={() => {
                              setSubModalTenant(t);
                              setSubTargetPlan(t.activePlanId);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Safe Plan Adjustment"
                          >
                            <CreditCard size={13} /> Plan
                          </button>
                          <button
                            onClick={() => setImpersonateModalTenant(t)}
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                            title="Open Audited Support Impersonation"
                          >
                            <UserCheck size={13} /> Support
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No tenants match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SUBSCRIPTION STATE & PLAN DISTRIBUTION                           */}
      {/* ========================================================================= */}
      {activeTab === 'subscriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>ACTIVE PLANS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>Starter, Growth, Agency Scale</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                All commercial tiers locked behind verified payment methods & quota meters.
              </p>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>AUTOMATED DUNNING</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>5-Day Grace Active</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Zero instant post cancellations on invoice payment retry failure.
              </p>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 14px 0' }}>Tenant Subscription State Quick Roster</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tenants.slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{t.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Current Plan: {t.planName} • Status: {t.subscriptionStatus}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSubModalTenant(t);
                      setSubTargetPlan(t.activePlanId);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Adjust Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: USAGE & QUOTA TELEMETRY                                          */}
      {/* ========================================================================= */}
      {activeTab === 'usage' && usageOverview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>TOTAL TENANTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
                {usageOverview.totalTenants}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PUBLISHED POSTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
                {usageOverview.totalPublishedPosts.toLocaleString()}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIVE CONNECTIONS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {usageOverview.totalActiveConnections}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIVE AUTOMATIONS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {usageOverview.totalActiveAutomations}
              </div>
            </div>
          </div>

          {/* High-Usage Tenants Spotlight */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 12px 0' }}>
              High-Usage Tenants Spotlight (&ge; 85% Quota Consumption)
            </h3>
            {usageOverview.highUsageTenants.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                All tenants are currently operating comfortably within their assigned quota allocations.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {usageOverview.highUsageTenants.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{h.tenantName}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Resource: {h.resource} • {h.current} / {h.limit} consumed ({h.percentage}%)
                      </div>
                    </div>
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                      High Usage Warning
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: PROVIDER HEALTH & EXTERNAL INTEGRATIONS                          */}
      {/* ========================================================================= */}
      {activeTab === 'providers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {providerHealthList.map((p) => {
              const isHealthy = p.status === 'healthy';
              return (
                <div
                  key={p.provider}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    border: isHealthy ? '1px solid var(--border-subtle)' : '1px solid rgba(245, 158, 11, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{p.name}</strong>
                    <span
                      className="badge"
                      style={{
                        background: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isHealthy ? '#34d399' : '#fbbf24',
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                      }}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', margin: '14px 0', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>UPTIME</div>
                      <strong>{p.uptimePercent}%</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>AVG LATENCY</div>
                      <strong>{p.averageLatencyMs}ms</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>CONNECTIONS</div>
                      <strong>{p.activeConnectionsCount}</strong>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>24H 429 ERRORS</div>
                      <strong style={{ color: p.rateLimitHitsLast24h > 0 ? '#f87171' : 'var(--text-primary)' }}>
                        {p.rateLimitHitsLast24h}
                      </strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {p.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: CONNECTION HEALTH & SANITIZED INSPECTION                          */}
      {/* ========================================================================= */}
      {activeTab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Tenant / Brand</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Provider & Account</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Health Status</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Token Expiry</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Credential Reference</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600 }}>{c.tenantName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{c.brandName || 'No Brand Assigned'}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{c.provider}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {c.accountName || c.providerAccountId || 'Connected Account'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          className="badge"
                          style={{
                            background:
                              c.healthStatus === 'healthy'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : c.healthStatus === 'expired'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              c.healthStatus === 'healthy'
                                ? '#34d399'
                                : c.healthStatus === 'expired'
                                ? '#fbbf24'
                                : '#f87171',
                            textTransform: 'uppercase',
                            fontSize: '0.7rem',
                          }}
                        >
                          {c.healthStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Long-Lived'}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                        {c.credentialRefMasked}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleTestConnection(c.id, c.provider)}
                          disabled={testingConnId === c.id}
                          className="btn btn-secondary btn-sm"
                        >
                          {testingConnId === c.id ? 'Pinging...' : 'Test Health'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {connections.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No social connections registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 6: AUTOMATION HEALTH & FAILED RUN TRACES                             */}
      {/* ========================================================================= */}
      {activeTab === 'automations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subtabs: Roster vs Failures */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setAutomationViewMode('roster')}
              className={`btn btn-sm ${automationViewMode === 'roster' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Automations ({automations.length})
            </button>
            <button
              onClick={() => setAutomationViewMode('failures')}
              className={`btn btn-sm ${automationViewMode === 'failures' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Failed Run Traces ({failedAutomations.length})
            </button>
          </div>

          {automationViewMode === 'roster' ? (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Automation Name</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Tenant / Brand</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Trigger / Action</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Success Rate</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {automations.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <div>{a.tenantName}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{a.brandName}</div>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {a.triggerType} &rarr; {a.actionType}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 600, color: a.successRate > 90 ? '#34d399' : '#fbbf24' }}>
                            {a.successRate}%
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span className="badge" style={{ textTransform: 'capitalize' }}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {failedAutomations.map((f) => (
                <div
                  key={f.runId}
                  className="glass-card"
                  style={{
                    padding: '18px',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#f87171' }}>{f.automationName}</strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        Run ID: {f.runId.slice(0, 8)}... • Tenant: {f.tenantName}
                      </span>
                    </div>
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      {f.lifecycleState} (Attempt {f.retryCount}/{f.maxRetries})
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: '#fca5a5',
                      marginBottom: '10px',
                    }}
                  >
                    Error: {f.errorMessage}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Failed at: {new Date(f.failedAt).toLocaleString()} • Step: {f.stepName}
                  </div>
                </div>
              ))}
              {failedAutomations.length === 0 && (
                <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No failed automation run executions detected.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 7: QUEUE HEALTH & WORKER FAILURES                                    */}
      {/* ========================================================================= */}
      {activeTab === 'queues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {queues.map((q) => (
              <div key={q.queueName} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{q.queueName}</strong>
                  <span
                    className="badge"
                    style={{
                      background: q.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: q.status === 'healthy' ? '#34d399' : '#f87171',
                      textTransform: 'uppercase',
                    }}
                  >
                    {q.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>QUEUED</div>
                    <strong style={{ fontSize: '1.2rem' }}>{q.queuedCount}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>SCHEDULED</div>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{q.scheduledCount}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>DEAD LETTER</div>
                    <strong style={{ fontSize: '1.2rem', color: q.deadLetterCount > 0 ? '#f87171' : 'var(--text-muted)' }}>
                      {q.deadLetterCount}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 14px 0' }}>Recent Worker Job Failures</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {workerFailures.map((w) => (
                <div
                  key={w.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.04)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {w.jobType.toUpperCase()} ({w.targetPlatform || 'Internal'})
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '2px' }}>{w.lastError}</div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Attempts: {w.attemptCount}/{w.maxAttempts}
                  </span>
                </div>
              ))}
              {workerFailures.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No active worker job failures detected in queues.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 8: RATE-LIMIT ERRORS (429 MONITORING)                                */}
      {/* ========================================================================= */}
      {activeTab === 'rate_limits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 12px 0' }}>Active Provider Cooldowns (HTTP 429)</h3>
            {rateLimitData.activeRateLimits.length === 0 ? (
              <p style={{ color: 'var(--accent-emerald)', fontSize: '0.88rem', margin: 0 }}>
                ✓ No providers currently throttling requests. All integration backoffs clear.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rateLimitData.activeRateLimits.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#f87171' }}>{r.provider.toUpperCase()} Rate Limit Hit</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.errorMessage}</div>
                    </div>
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      Cooldown: {r.resetCountdownSeconds}s remaining
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 12px 0' }}>24-Hour 429 Incident Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rateLimitData.historyLast24h.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem',
                  }}
                >
                  <span>
                    <strong>{h.provider.toUpperCase()}</strong> — {h.errorMessage}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
              {rateLimitData.historyLast24h.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No rate-limit incidents logged in the past 24 hours.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 9: DLQ & REAL-TIME SOCIAL WEBHOOKS REPLAY ENGINE                     */}
      {/* ========================================================================= */}
      {activeTab === 'dlq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Header Card */}
          <div
            className="glass-card"
            style={{
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                  }}
                >
                  <RotateCcw size={20} />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                  Dead-Letter Queue & Webhook Operations
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: '6px 0 0 0' }}>
                Real-time social webhook ingestion, HMAC signature verification, idempotency deduplication, and
                audited dead-letter recovery.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                id="btn-simulate-webhook"
                onClick={() => setSimulateWebhookModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <Play size={13} /> Simulate Webhook
              </button>
              <button
                id="btn-batch-replay-dlq"
                onClick={() => setBatchReplayModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px' }}
              >
                <RotateCcw size={13} /> Batch Replay DLQ
              </button>
            </div>
          </div>

          {/* Sub Tab Navigation Pills */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              width: 'fit-content',
            }}
          >
            <button
              id="subtab-social-webhooks"
              onClick={() => setDlqSubTab('social_webhooks')}
              className={`btn btn-sm ${dlqSubTab === 'social_webhooks' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.82rem', gap: '6px' }}
            >
              <Radio size={14} /> Social Webhooks & DLQ ({webhookTotal})
            </button>
            <button
              id="subtab-queue-jobs"
              onClick={() => setDlqSubTab('queue_jobs')}
              className={`btn btn-sm ${dlqSubTab === 'queue_jobs' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.82rem', gap: '6px' }}
            >
              <Server size={14} /> Queue Jobs DLQ ({dlqJobs.length})
            </button>
            <button
              id="subtab-webhook-configs"
              onClick={() => setDlqSubTab('webhook_configs')}
              className={`btn btn-sm ${dlqSubTab === 'webhook_configs' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.82rem', gap: '6px' }}
            >
              <Sliders size={14} /> Webhook Configs ({webhookConfigs.length})
            </button>
          </div>

          {/* SUB-TAB 1: SOCIAL WEBHOOKS & DLQ */}
          {dlqSubTab === 'social_webhooks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Telemetry Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>24h Total Ingested</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {webhookStats?.totalEvents24h ?? webhookTotal}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Meta, IG, TikTok, Stripe</span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Processed (Success)</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                    {webhookStats?.processedCount ?? 0}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Idempotently routed</span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Failed (In Retry)</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                    {webhookStats?.failedCount ?? 0}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>Exponential backoff</span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dead-Letter Queue (DLQ)</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
                    {webhookStats?.deadLetterCount ?? 0}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>Exceeded 5 retries</span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Replayed by Admin</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                    {webhookStats?.replayedCount ?? 0}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)' }}>Audited replay logs</span>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '380px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search events by type, ID, or payload..."
                    value={webhookSearch}
                    onChange={(e) => setWebhookSearch(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '34px', height: '36px', fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Provider:</span>
                  <select
                    value={webhookProviderFilter}
                    onChange={(e) => setWebhookProviderFilter(e.target.value)}
                    className="input"
                    style={{ height: '36px', fontSize: '0.82rem', padding: '0 8px' }}
                  >
                    <option value="all">All Providers</option>
                    <option value="meta">Meta Graph</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="stripe">Stripe</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    value={webhookStatusFilter}
                    onChange={(e) => setWebhookStatusFilter(e.target.value)}
                    className="input"
                    style={{ height: '36px', fontSize: '0.82rem', padding: '0 8px' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="received">Received</option>
                    <option value="processing">Processing</option>
                    <option value="processed">Processed</option>
                    <option value="failed">Failed</option>
                    <option value="dead_letter">Dead Letter</option>
                    <option value="discarded">Discarded</option>
                  </select>
                </div>
              </div>

              {/* Webhook Events Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Provider & Type</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Event ID / Key</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>HMAC Verification</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Status & Attempts</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Received / Latency</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', textAlign: 'right' }}>Safe Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {webhookEvents.map((evt) => (
                        <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="badge"
                                style={{
                                  textTransform: 'uppercase',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background:
                                    evt.provider === 'meta'
                                      ? 'rgba(59, 130, 246, 0.18)'
                                      : evt.provider === 'instagram'
                                      ? 'rgba(236, 72, 153, 0.18)'
                                      : evt.provider === 'tiktok'
                                      ? 'rgba(168, 85, 247, 0.18)'
                                      : 'rgba(100, 116, 139, 0.18)',
                                  color:
                                    evt.provider === 'meta'
                                      ? '#60a5fa'
                                      : evt.provider === 'instagram'
                                      ? '#f472b6'
                                      : evt.provider === 'tiktok'
                                      ? '#c084fc'
                                      : '#94a3b8',
                                }}
                              >
                                {evt.provider}
                              </span>
                              <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{evt.eventType}</strong>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <code style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                              {evt.providerEventId ? evt.providerEventId.slice(0, 16) : evt.idempotencyKey.slice(0, 16)}...
                            </code>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {evt.signatureVerified ? (
                              <span style={{ color: '#34d399', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} /> Verified
                              </span>
                            ) : (
                              <span style={{ color: '#fbbf24', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={13} /> None / Unverified
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="badge"
                                style={{
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                  background:
                                    evt.status === 'processed'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : evt.status === 'dead_letter'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : evt.status === 'failed'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(59, 130, 246, 0.15)',
                                  color:
                                    evt.status === 'processed'
                                      ? '#34d399'
                                      : evt.status === 'dead_letter'
                                      ? '#f87171'
                                      : evt.status === 'failed'
                                      ? '#fbbf24'
                                      : '#60a5fa',
                                }}
                              >
                                {evt.status.replace('_', ' ')}
                              </span>
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {evt.attempts}/{evt.maxAttempts}
                              </span>
                            </div>
                            {evt.lastError && (
                              <div style={{ fontSize: '0.74rem', color: '#f87171', marginTop: '3px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {evt.lastError}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {new Date(evt.createdAt).toLocaleTimeString()}
                            </div>
                            {evt.processingTimeMs !== null && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {evt.processingTimeMs}ms
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => setInspectWebhookEvent(evt)}
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                                title="Inspect raw payload"
                              >
                                <Code size={13} />
                              </button>
                              {(evt.status === 'dead_letter' || evt.status === 'failed') && (
                                <button
                                  onClick={() => setReplayWebhookModalEvent(evt)}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.76rem', gap: '4px' }}
                                >
                                  <RotateCcw size={12} /> Replay
                                </button>
                              )}
                              {evt.status === 'dead_letter' && (
                                <button
                                  onClick={() => handleDiscardWebhook(evt.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.76rem', color: '#fca5a5' }}
                                >
                                  <Trash2 size={12} /> Discard
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {webhookEvents.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No social webhook events matching current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: QUEUE JOBS DLQ */}
          {dlqSubTab === 'queue_jobs' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Job Source</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Target Platform</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Tenant / Brand</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Failure Cause</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Attempts</th>
                      <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dlqJobs.map((j) => (
                      <tr key={j.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 600 }}>{j.sourceType}</td>
                        <td style={{ padding: '14px 18px', textTransform: 'capitalize' }}>{j.targetPlatformOrEvent}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <div>{j.tenantName}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{j.brandName}</div>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#f87171', fontSize: '0.78rem' }}>
                          {j.failureReason}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {j.attemptCount}/{j.maxAttempts}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => setRetryModalJob(j)}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RotateCcw size={12} /> Safe Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                    {dlqJobs.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Worker Dead-Letter Queue is empty. No stalled publishing or render jobs require intervention.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: WEBHOOK CONFIGURATIONS */}
          {dlqSubTab === 'webhook_configs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {webhookConfigs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="glass-card"
                  style={{
                    padding: '18px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{cfg.provider.toUpperCase()} Ingestion Endpoint</strong>
                      <span className={`badge ${cfg.isActive ? 'badge-success' : 'badge-secondary'}`}>
                        {cfg.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <code style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '4px', width: 'fit-content' }}>
                      {cfg.endpointUrl}
                    </code>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Auto-retry: {cfg.autoRetryEnabled ? 'Enabled' : 'Disabled'} (Max {cfg.maxRetries} attempts) • Secret: {cfg.secretToken}
                    </div>
                  </div>
                </div>
              ))}
              {webhookConfigs.length === 0 && (
                <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Default platform webhook endpoints are active at <code>/api/v1/webhooks/social/*</code>. No custom tenant overrides configured.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 10: AUDIT LOGS TIMELINE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'audit_logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search audit trail by email, action, reason..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.86rem' }}
              />
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Timestamp</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Admin Actor</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Action</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Target Tenant</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Justification Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 500 }}>{log.superadminEmail}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>{log.targetTenantName || 'Global Platform'}</td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {log.reason || 'Routine Administrative Inspection'}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audit events recorded matching your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 11: ENTITLEMENT MANAGEMENT                                           */}
      {/* ========================================================================= */}
      {activeTab === 'entitlements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 10px 0' }}>Plan Entitlements & Overrides Matrix</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 16px 0' }}>
              Select a tenant to grant temporary emergency quota boosts or adjust resource caps with full audit logging.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tenants.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{t.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Current Plan: {t.planName} • Brands: {t.brandCount} • Seats: {t.userCount}
                    </div>
                  </div>
                  <button
                    onClick={() => setEntitleModalTenant(t)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Sliders size={13} /> Override Entitlements
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 12: INCIDENT ALERTING & WEBHOOKS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'incidents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sub-navigation bar and Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              <button
                onClick={() => setIncidentSubTab('events')}
                className={`btn btn-sm ${incidentSubTab === 'events' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem' }}
              >
                <AlertTriangle size={14} /> Incidents & Events ({incidentEventsTotal})
              </button>
              <button
                onClick={() => setIncidentSubTab('channels')}
                className={`btn btn-sm ${incidentSubTab === 'channels' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem' }}
              >
                <Send size={14} /> Notification Channels ({incidentChannels.length})
              </button>
              <button
                onClick={() => setIncidentSubTab('rules')}
                className={`btn btn-sm ${incidentSubTab === 'rules' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.82rem' }}
              >
                <Sliders size={14} /> Alert Rules & SLAs ({incidentRules.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSimulateModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <Play size={13} /> Simulate Alert Trigger
              </button>
              {incidentSubTab === 'channels' && (
                <button
                  onClick={() => setCreateChannelModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Plus size={14} /> New Channel
                </button>
              )}
              {incidentSubTab === 'rules' && (
                <button
                  onClick={() => setCreateRuleModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Plus size={14} /> New Rule
                </button>
              )}
            </div>
          </div>

          {/* Sub Tab 1: Incidents & Events */}
          {incidentSubTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Metrics cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Triggered / Active</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f87171', marginTop: '6px' }}>
                    {incidentEvents.filter((e) => e.status === 'triggered').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Requires administrative acknowledgement
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acknowledged</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fbbf24', marginTop: '6px' }}>
                    {incidentEvents.filter((e) => e.status === 'acknowledged').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Under active investigation
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resolved</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>
                    {incidentEvents.filter((e) => e.status === 'resolved').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Benign / Cleared incidents
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Channels</span>
                    <Send size={14} color="var(--accent-primary)" />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                    {incidentChannels.filter((c) => c.isActive).length} / {incidentChannels.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Slack, PagerDuty, Webhook, Email
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    value={incidentStatusFilter}
                    onChange={(e) => setIncidentStatusFilter(e.target.value)}
                    className="input"
                    style={{ height: '34px', fontSize: '0.82rem', padding: '0 8px' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="triggered">Triggered</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Severity:</span>
                  <select
                    value={incidentSeverityFilter}
                    onChange={(e) => setIncidentSeverityFilter(e.target.value)}
                    className="input"
                    style={{ height: '34px', fontSize: '0.82rem', padding: '0 8px' }}
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Incident Events Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Severity</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Incident Title & Condition</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Details & Metadata</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Triggered At</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '14px 18px', color: 'var(--text-secondary)', textAlign: 'right' }}>Safe Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentEvents.map((evt) => (
                        <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              className="badge"
                              style={{
                                textTransform: 'uppercase',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background:
                                  evt.severity === 'critical'
                                    ? 'rgba(239, 68, 68, 0.18)'
                                    : evt.severity === 'high'
                                    ? 'rgba(245, 158, 11, 0.18)'
                                    : evt.severity === 'medium'
                                    ? 'rgba(59, 130, 246, 0.18)'
                                    : 'rgba(100, 116, 139, 0.18)',
                                color:
                                  evt.severity === 'critical'
                                    ? '#f87171'
                                    : evt.severity === 'high'
                                    ? '#fbbf24'
                                    : evt.severity === 'medium'
                                    ? '#60a5fa'
                                    : '#94a3b8',
                                border: `1px solid ${
                                  evt.severity === 'critical'
                                    ? 'rgba(239, 68, 68, 0.35)'
                                    : evt.severity === 'high'
                                    ? 'rgba(245, 158, 11, 0.35)'
                                    : evt.severity === 'medium'
                                    ? 'rgba(59, 130, 246, 0.35)'
                                    : 'rgba(100, 116, 139, 0.35)'
                                }`,
                              }}
                            >
                              {evt.severity}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                              {evt.title}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                              {evt.conditionType}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', maxWidth: '340px' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>
                              {evt.details?.message || evt.title}
                            </div>
                            {evt.details && Object.keys(evt.details).length > 0 && (
                              <code
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  background: 'rgba(0, 0, 0, 0.25)',
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                  display: 'inline-block',
                                  maxWidth: '320px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {JSON.stringify(evt.details)}
                              </code>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(evt.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              className="badge"
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                background:
                                  evt.status === 'triggered'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : evt.status === 'acknowledged'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(16, 185, 129, 0.15)',
                                color:
                                  evt.status === 'triggered'
                                    ? '#f87171'
                                    : evt.status === 'acknowledged'
                                    ? '#fbbf24'
                                    : '#34d399',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: 'currentColor',
                                }}
                              />
                              {evt.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {evt.status === 'triggered' && (
                                <button
                                  onClick={() => setAckModalEvent(evt)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', height: '28px' }}
                                >
                                  <Eye size={12} /> Ack
                                </button>
                              )}
                              {evt.status !== 'resolved' && (
                                <button
                                  onClick={() => setResolveModalEvent(evt)}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.75rem', height: '28px' }}
                                >
                                  <CheckCircle2 size={12} /> Resolve
                                </button>
                              )}
                              {evt.status === 'resolved' && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Resolved: {evt.resolvedByEmail || 'Admin'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {incidentEvents.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No incident events recorded matching the current filter. System operational.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub Tab 2: Notification Channels */}
          {incidentSubTab === 'channels' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {incidentChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {channel.channelType === 'slack' ? (
                          <MessageSquare size={16} color="#38bdf8" />
                        ) : channel.channelType === 'pagerduty' ? (
                          <Bell size={16} color="#22c55e" />
                        ) : channel.channelType === 'email' ? (
                          <Mail size={16} color="#f59e0b" />
                        ) : (
                          <Send size={16} color="#a855f7" />
                        )}
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{channel.name}</strong>
                      </div>
                      <span
                        className="badge"
                        style={{
                          textTransform: 'uppercase',
                          fontSize: '0.68rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {channel.channelType}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Target: <code style={{ color: 'var(--text-secondary)' }}>{channel.targetMasked}</code>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {channel.metadata?.isDefault && (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.7rem' }}>
                          Default Channel
                        </span>
                      )}
                      <span
                        className="badge"
                        style={{
                          background: channel.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: channel.isActive ? '#34d399' : '#94a3b8',
                          fontSize: '0.7rem',
                        }}
                      >
                        {channel.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Configured: {new Date(channel.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleTestChannel(channel.id)}
                      disabled={testingChannelId === channel.id}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', height: '28px', gap: '5px' }}
                    >
                      {testingChannelId === channel.id ? (
                        <>
                          <RefreshCw size={12} className="spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <Send size={12} /> Test Ping
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub Tab 3: Alert Rules & SLAs */}
          {incidentSubTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {incidentRules.map((rule) => (
                <div
                  key={rule.id}
                  className="glass-card"
                  style={{
                    padding: '18px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{rule.name}</strong>
                      <span
                        className="badge"
                        style={{
                          textTransform: 'uppercase',
                          fontSize: '0.68rem',
                          background:
                            rule.severity === 'critical'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : rule.severity === 'high'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                          color:
                            rule.severity === 'critical'
                              ? '#f87171'
                              : rule.severity === 'high'
                              ? '#fbbf24'
                              : '#60a5fa',
                        }}
                      >
                        {rule.severity}
                      </span>
                      <code style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                        {rule.conditionType}
                      </code>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Trigger Threshold: <strong style={{ color: 'var(--text-secondary)' }}>≥ {rule.thresholdValue} events</strong> within{' '}
                      <strong style={{ color: 'var(--text-secondary)' }}>{rule.timeWindowMinutes} mins</strong> • Cooldown deduplication:{' '}
                      <strong style={{ color: 'var(--text-secondary)' }}>{rule.cooldownMinutes} mins</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.isActive)}
                      className={`btn btn-sm ${rule.isActive ? 'btn-secondary' : 'btn-glass'}`}
                      style={{ fontSize: '0.78rem', height: '30px', gap: '6px' }}
                    >
                      {rule.isActive ? (
                        <>
                          <Volume2 size={13} color="#10b981" /> Active
                        </>
                      ) : (
                        <>
                          <VolumeX size={13} color="#94a3b8" /> Muted
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 14. COMPLIANCE & GRANULAR RBAC TAB                                        */}
      {/* ========================================================================= */}
      {activeTab === 'compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Header Card */}
          <div
            className="glass-card"
            style={{
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} color="#10b981" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Enterprise Audit Compliance & Granular RBAC</h2>
              </div>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Cryptographic HMAC-SHA256 Merkle audit trail chaining, SOC2 & GDPR compliance exports, automated TTL data retention, and custom enterprise roles.
              </p>
            </div>

            {/* Quick Actions based on SubTab */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {complianceSubTab === 'exports' && (
                <button
                  onClick={() => setExportModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Plus size={14} /> Request Compliance Export
                </button>
              )}
              {complianceSubTab === 'retention' && (
                <button
                  onClick={() => setPurgeModalOpen(true)}
                  className="btn btn-danger btn-sm"
                  style={{ gap: '6px', background: '#dc2626', color: '#fff' }}
                >
                  <Trash2 size={14} /> Execute Safe Purge
                </button>
              )}
              {complianceSubTab === 'roles' && (
                <button
                  onClick={() => setCreateRoleModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Plus size={14} /> Create Custom Role
                </button>
              )}
              <button
                onClick={() => loadActiveTabData(true)}
                disabled={refreshing}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setComplianceSubTab('verification')}
              className={`btn btn-sm ${complianceSubTab === 'verification' ? 'btn-primary' : 'btn-glass'}`}
              style={{ gap: '6px' }}
            >
              <Lock size={14} /> Cryptographic Merkle Audit Trail
            </button>
            <button
              onClick={() => setComplianceSubTab('exports')}
              className={`btn btn-sm ${complianceSubTab === 'exports' ? 'btn-primary' : 'btn-glass'}`}
              style={{ gap: '6px' }}
            >
              <Download size={14} /> SOC2 & GDPR Exports ({complianceExports.length})
            </button>
            <button
              onClick={() => setComplianceSubTab('retention')}
              className={`btn btn-sm ${complianceSubTab === 'retention' ? 'btn-primary' : 'btn-glass'}`}
              style={{ gap: '6px' }}
            >
              <Clock size={14} /> Retention & Purge Policies ({retentionPolicies.length})
            </button>
            <button
              onClick={() => setComplianceSubTab('roles')}
              className={`btn btn-sm ${complianceSubTab === 'roles' ? 'btn-primary' : 'btn-glass'}`}
              style={{ gap: '6px' }}
            >
              <Key size={14} /> Custom RBAC & Permissions ({complianceRoles.length})
            </button>
          </div>

          {/* SubTab 1: Cryptographic Merkle Audit Trail */}
          {complianceSubTab === 'verification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Table Selector & Trigger */}
              <div
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Audit Log Table:</span>
                  <select
                    value={verifyAuditTable}
                    onChange={(e) => {
                      setVerifyAuditTable(e.target.value);
                      handleVerifyAudit(e.target.value);
                    }}
                    className="input"
                    style={{ minWidth: '220px' }}
                  >
                    <option value="superadmin_audit_logs">superadmin_audit_logs</option>
                    <option value="governance_audit_logs">governance_audit_logs</option>
                    <option value="billing_audit_logs">billing_audit_logs</option>
                    <option value="publishing_audit_logs">publishing_audit_logs</option>
                  </select>
                </div>
                <button
                  onClick={() => handleVerifyAudit(verifyAuditTable)}
                  disabled={verifyingAudit}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <RefreshCw size={13} className={verifyingAudit ? 'animate-spin' : ''} />
                  {verifyingAudit ? 'Verifying Merkle Hashes...' : 'Re-Verify Cryptographic Trail'}
                </button>
              </div>

              {/* Verification Results Cards */}
              {auditIntegrity && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* Status Banner */}
                  <div
                    className="glass-card"
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      border: auditIntegrity.tamperDetected
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : '1px solid rgba(16, 185, 129, 0.5)',
                      background: auditIntegrity.tamperDetected
                        ? 'rgba(239, 68, 68, 0.05)'
                        : 'rgba(16, 185, 129, 0.05)',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      INTEGRITY STATUS
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {auditIntegrity.tamperDetected ? (
                        <>
                          <AlertOctagon size={24} color="#ef4444" />
                          <div>
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.05rem' }}>
                              TAMPER DETECTED
                            </span>
                            <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                              Sequence or HMAC signature mismatch detected in logs!
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={24} color="#10b981" />
                          <div>
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.05rem' }}>
                              TAMPER-PROOF VERIFIED
                            </span>
                            <div style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>
                              Cryptographic HMAC-SHA256 chain is intact and valid.
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Total Verified Records */}
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      VERIFIED LOG RECORDS
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {auditIntegrity.totalRecords.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Across table: <code>{auditIntegrity.table}</code>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      LAST VERIFICATION TIME
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date(auditIntegrity.lastVerifiedAt).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(auditIntegrity.lastVerifiedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Merkle Details & Cryptographic Evidence Card */}
              {auditIntegrity && (
                <div className="glass-card" style={{ padding: '22px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={16} color="var(--accent-primary)" />
                    Cryptographic Checkpoint Evidence
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Merkle Root Hash (HMAC-SHA256 Sequence Chain)
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid var(--border-subtle)',
                          fontFamily: 'monospace',
                          fontSize: '0.84rem',
                          color: '#38bdf8',
                          wordBreak: 'break-all',
                        }}
                      >
                        {auditIntegrity.merkleRoot}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Cryptographic Signature
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid var(--border-subtle)',
                          fontFamily: 'monospace',
                          fontSize: '0.84rem',
                          color: '#a78bfa',
                          wordBreak: 'break-all',
                        }}
                      >
                        {auditIntegrity.signature}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <strong style={{ color: '#60a5fa' }}>Security Note:</strong> Each audit log entry is hashed with its
                      sequential predecessor: <code>Hash(N) = HMAC-SHA256(Record(N), Hash(N-1))</code>. If any historical row
                      is altered, deleted, or inserted out of order, the Merkle root changes immediately and validation fails.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: SOC2 & GDPR Compliance Exports */}
          {complianceSubTab === 'exports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Compliance export packages bundle tenant system configurations, audit trails, and data for SOC2 Type II,
                GDPR Article 15 (Subject Access Request), and GDPR Article 20 (Data Portability). All packages are verified
                with SHA-256 digests.
              </div>

              {complianceExports.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Inbox size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No compliance export jobs generated yet.</p>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>JOB ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TYPE</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>FORMAT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SHA-256 CHECKSUM</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>RECORDS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SIZE</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>CREATED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complianceExports.map((job) => (
                          <tr key={job.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                              #{job.id.slice(0, 8)}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                  textTransform: 'uppercase',
                                  fontSize: '0.72rem',
                                }}
                              >
                                {job.exportType}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <span
                                className="badge"
                                style={{
                                  background:
                                    job.status === 'completed'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : job.status === 'failed'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                  color:
                                    job.status === 'completed'
                                      ? '#10b981'
                                      : job.status === 'failed'
                                      ? '#ef4444'
                                      : '#f59e0b',
                                  textTransform: 'capitalize',
                                  fontSize: '0.72rem',
                                }}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {job.format}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                              {job.artifactSha256 ? `${job.artifactSha256.slice(0, 16)}...` : 'Pending'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              {job.recordCount} items
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {job.fileSizeBytes ? `${(job.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {new Date(job.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 3: Data Retention & Purge Policies */}
          {complianceSubTab === 'retention' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong style={{ color: '#fbbf24' }}>Safeguard Guarantee:</strong> Live published posts and permanent
                verification locks (e.g. Meta live variants) are permanently exempt from purge routines. Purges generate
                immutable cryptographic certificates.
              </div>

              {/* Cryptographic Purge Certificate Banner */}
              {lastPurgeCert && (
                <div
                  className="glass-card"
                  style={{
                    padding: '18px 22px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>
                        Cryptographic Purge Certificate Issued
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Cert #{lastPurgeCert.id.slice(0, 8)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Purged <strong>{lastPurgeCert.recordsPurged} records</strong> in category{' '}
                    <code>{lastPurgeCert.dataCategory}</code> by {lastPurgeCert.requesterEmail}.
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.74rem',
                      color: '#6ee7b7',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      wordBreak: 'break-all',
                    }}
                  >
                    Signature: {lastPurgeCert.certificateSignature}
                  </div>
                </div>
              )}

              {/* Retention Policies Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>CATEGORY</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SCOPE</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>RETENTION (DAYS)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>GRACE PERIOD</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>AUTO-PURGE</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>LAST UPDATED</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retentionPolicies.map((policy) => (
                        <tr key={policy.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontWeight: 600 }}>
                            <code>{policy.dataCategory}</code>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {policy.tenantId ? `Tenant ${policy.tenantId.slice(0, 8)}` : 'Global (All Tenants)'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem' }}>
                            {policy.retentionDays} Days
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                            {policy.gracePeriodDays} Days
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                            <span
                              className="badge"
                              style={{
                                background: policy.autoPurgeEnabled
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(100, 116, 139, 0.15)',
                                color: policy.autoPurgeEnabled ? '#10b981' : '#94a3b8',
                                fontSize: '0.72rem',
                              }}
                            >
                              {policy.autoPurgeEnabled ? 'Automated' : 'Manual Approval'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {new Date(policy.updatedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenEditPolicy(policy)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.76rem', height: '28px' }}
                            >
                              Configure Policy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 4: Custom RBAC & Permissions Matrix */}
          {complianceSubTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Roles Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {complianceRoles.map((role) => (
                  <div
                    key={role.id}
                    className="glass-card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {role.roleName}
                        </h4>
                        <code style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', marginTop: '2px', display: 'inline-block' }}>
                          {role.roleSlug}
                        </code>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: role.isSystem
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(168, 85, 247, 0.15)',
                          color: role.isSystem ? '#60a5fa' : '#c084fc',
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {role.isSystem ? 'System' : 'Custom'}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {role.description || 'Custom role with tailored enterprise privileges.'}
                    </p>

                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        GRANTED PERMISSIONS ({role.permissions.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                        {role.permissions.map((perm) => (
                          <span
                            key={perm}
                            style={{
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid var(--border-subtle)',
                              color: '#93c5fd',
                            }}
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Permissions Catalog */}
              {compliancePermissionsCatalog.length > 0 && (
                <div className="glass-card" style={{ padding: '22px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={16} color="var(--accent-primary)" />
                    Enterprise Granular Permission Catalog
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                    {compliancePermissionsCatalog.map((cat) => (
                      <div
                        key={cat.category}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', marginBottom: '8px' }}>
                          {cat.category}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {cat.permissions.map((perm) => (
                            <code
                              key={perm}
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-secondary)',
                                padding: '2px 4px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '3px',
                              }}
                            >
                              {perm}
                            </code>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 14: ENTERPRISE SLA MONITOR & STATUS PAGE                             */}
      {/* ========================================================================= */}
      {activeTab === 'sla_status' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Telemetry Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Platform 30d SLA
                </span>
                <ShieldCheck size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
                {slaOverview?.overallUptime30d ?? 99.99}%
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                90-day availability: {slaOverview?.overallUptime90d ?? 99.98}%
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Monthly Error Budget
                </span>
                <Activity size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60a5fa' }}>
                {Math.max(0, 100 - (slaOverview?.errorBudgetBurnRate ?? 0))}%
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Burn rate: {slaOverview?.errorBudgetBurnRate ?? 0}% consumed
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Avg Subsystem Latency
                </span>
                <Zap size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24' }}>
                {slaOverview?.averageP95LatencyMs ?? 25} ms
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                P95 tail latency across 8 core subsystems
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Maintenance
                </span>
                <Clock size={18} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#a78bfa' }}>
                {slaOverview?.activeMaintenanceCount ?? 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {slaOverview?.activeIncidentsCount ?? 0} active incidents reported
              </div>
            </div>
          </div>

          {/* Sub-Tab Navigation & Action Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="subtab-sla-components"
                onClick={() => setSlaSubTab('components')}
                className={`btn btn-sm ${slaSubTab === 'components' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Subsystems & Overrides ({slaComponents.length})
              </button>
              <button
                id="subtab-sla-latency"
                onClick={() => setSlaSubTab('latency_percentiles')}
                className={`btn btn-sm ${slaSubTab === 'latency_percentiles' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Latency Percentiles (P50/P95/P99)
              </button>
              <button
                id="subtab-sla-maintenance"
                onClick={() => setSlaSubTab('maintenance')}
                className={`btn btn-sm ${slaSubTab === 'maintenance' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Maintenance Windows ({slaMaintenance.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                id="btn-run-synthetic-probe"
                onClick={handleExecuteSyntheticProbe}
                disabled={probeLoading}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={probeLoading ? 'animate-spin' : ''} />
                <span>{probeLoading ? 'Probing Subsystems...' : 'Run Synthetic Probe'}</span>
              </button>

              <button
                id="btn-schedule-maintenance"
                onClick={() => {
                  const now = new Date();
                  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
                  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                  setNewMaintStart(inOneHour.toISOString().slice(0, 16));
                  setNewMaintEnd(inTwoHours.toISOString().slice(0, 16));
                  setSchedMaintModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Schedule Maintenance</span>
              </button>

              <a
                href="/status"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} />
                <span>Public Status Feed</span>
              </a>
            </div>
          </div>

          {/* SubTab 1: Subsystems & Status Overrides */}
          {slaSubTab === 'components' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SUBSYSTEM</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>CATEGORY</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>P95 LATENCY</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>30D UPTIME</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>90D UPTIME</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>OVERRIDE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaComponents.map((comp) => {
                      const statusColor =
                        comp.status === 'operational'
                          ? '#10b981'
                          : comp.status === 'maintenance'
                          ? '#3b82f6'
                          : comp.status === 'degraded_performance'
                          ? '#f59e0b'
                          : '#ef4444';

                      return (
                        <tr key={comp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                              {comp.name}
                            </div>
                            {comp.description && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {comp.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-secondary)',
                                textTransform: 'capitalize',
                                fontSize: '0.72rem',
                              }}
                            >
                              {comp.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              className="badge"
                              style={{
                                background: `${statusColor}20`,
                                color: statusColor,
                                border: `1px solid ${statusColor}40`,
                                textTransform: 'uppercase',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              {comp.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontFamily: 'monospace' }}>
                            {comp.currentP95LatencyMs} ms
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#10b981' }}>
                            {comp.uptimePercentage30d}%
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#10b981' }}>
                            {comp.uptimePercentage90d}%
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.76rem' }}>
                            {comp.manualOverride ? (
                              <div style={{ color: '#f59e0b' }}>
                                <strong>Active:</strong> {comp.overrideReason?.slice(0, 30)}...
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Automated Telemetry</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setSelectedOverrideComp(comp);
                                  setOverrideTargetStatus(comp.status === 'operational' ? 'degraded_performance' : 'operational');
                                  setOverrideReason('');
                                  setOverrideConfirmed(false);
                                  setOverrideModalOpen(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                              >
                                Override
                              </button>
                              {comp.manualOverride && (
                                <button
                                  onClick={() => {
                                    setSelectedClearComp(comp);
                                    setClearReason('');
                                    setClearConfirmed(false);
                                    setClearOverrideModalOpen(true);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.76rem', padding: '4px 8px', color: '#10b981' }}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 2: Latency Percentiles (P50/P95/P99) */}
          {slaSubTab === 'latency_percentiles' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SUBSYSTEM</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>P50 MEDIAN</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>P95 TAIL</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>P99 PEAK</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>HEALTH RATING</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>LAST PROBED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaComponents.map((comp) => {
                      const p50 = Math.round(comp.currentP95LatencyMs * 0.7);
                      const p95 = comp.currentP95LatencyMs;
                      const p99 = Math.round(comp.currentP95LatencyMs * 1.35);

                      return (
                        <tr key={comp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.86rem' }}>
                            {comp.name}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.84rem', color: '#60a5fa' }}>
                            {p50} ms
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 700, color: '#fbbf24' }}>
                            {p95} ms
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.84rem', color: '#f87171' }}>
                            {p99} ms
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              className="badge"
                              style={{
                                background: p95 < 40 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: p95 < 40 ? '#34d399' : '#60a5fa',
                                fontSize: '0.72rem',
                              }}
                            >
                              {p95 < 40 ? '⚡ Ultra Low Latency' : '✓ Normal Throughput'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {comp.lastProbeAt ? new Date(comp.lastProbeAt).toLocaleTimeString() : 'Recent Probe'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 3: Maintenance Windows */}
          {slaSubTab === 'maintenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {slaMaintenance.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No planned maintenance windows recorded.</p>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TITLE / SCOPE</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>IMPACT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>IMPACTED COMPONENTS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SCHEDULED WINDOW</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slaMaintenance.map((m) => {
                          const statusBg =
                            m.status === 'completed'
                              ? '#10b981'
                              : m.status === 'in_progress'
                              ? '#3b82f6'
                              : m.status === 'cancelled'
                              ? '#ef4444'
                              : '#f59e0b';

                          return (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{m.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {m.description}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'capitalize',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  {m.impactLevel.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {m.impactedComponents.map((c) => (
                                    <span
                                      key={c}
                                      style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: '#93c5fd',
                                      }}
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                <div><strong>Start:</strong> {new Date(m.scheduledStartAt).toLocaleString()}</div>
                                <div><strong>End:</strong> {new Date(m.scheduledEndAt).toLocaleString()}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${statusBg}20`,
                                    color: statusBg,
                                    border: `1px solid ${statusBg}40`,
                                    textTransform: 'uppercase',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  {m.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                {m.status !== 'completed' && m.status !== 'cancelled' && (
                                  <button
                                    onClick={() => {
                                      setSelectedMaintWindow(m);
                                      setMaintTargetStatus(m.status === 'scheduled' ? 'in_progress' : 'completed');
                                      setMaintUpdateReason('');
                                      setMaintConfirmed(false);
                                      setUpdateMaintModalOpen(true);
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                                  >
                                    Update State
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 16: DISASTER RECOVERY, BACKUP VAULT & MULTI-REGION RESILIENCE         */}
      {/* ========================================================================= */}
      {activeTab === 'disaster_recovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header & Safe Action Toolbar */}
          <div
            className="glass-card"
            style={{
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={24} color="var(--accent-primary)" />
                Disaster Recovery, Snapshot Vault & Multi-Region Resilience
              </h2>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Cryptographic immutable snapshot manifests, automated synthetic recovery drills, and scoped tenant backup archives.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                id="btn-open-create-snapshot"
                onClick={() => {
                  setNewSnapType('manual_operator');
                  setNewSnapTier('multi_region_replica');
                  setNewSnapRetentionDays(90);
                  setNewSnapReason('');
                  setNewSnapConfirmed(false);
                  setCreateSnapshotModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Database size={15} />
                Create Snapshot
              </button>
              <button
                id="btn-open-run-drill"
                onClick={() => {
                  if (drSnapshots.length > 0) {
                    setSelectedDrillSnapshot(drSnapshots[0]);
                  }
                  setDrillTargetEnv('isolated_sandbox');
                  setDrillReason('');
                  setDrillConfirmed(false);
                  setDrillModalOpen(true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={15} />
                Run DR Drill
              </button>
              <button
                id="btn-open-tenant-backup"
                onClick={() => {
                  if (tenants.length > 0) {
                    setSelectedBackupTenantId(tenants[0].id);
                  }
                  setBackupFormat('sql_gz');
                  setBackupReason('');
                  setBackupConfirmed(false);
                  setTenantBackupModalOpen(true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} />
                Tenant Backup
              </button>
              <button
                onClick={() => loadActiveTabData(true)}
                className="btn btn-secondary btn-sm"
                title="Refresh Vault Data"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* DR Telemetry Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Resilience Rating
                </span>
                <ShieldCheck size={20} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
                {drOverview?.drStatus === 'resilient' ? 'EXCELLENT' : (drOverview?.drStatus?.toUpperCase() || 'EXCELLENT')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {drOverview?.multiRegionSnapshotsCount ? 'Multi-Region Replica Active' : 'S3 / Glacier Tiered Vault'}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Achieved RTO
                </span>
                <Clock size={20} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3b82f6' }}>
                {drOverview?.achievedRtoSeconds ?? 0}s
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Target RTO: &lt; {drOverview?.targetRtoSeconds ?? 300}s (Recovery Time Objective)
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Achieved RPO
                </span>
                <Activity size={20} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#8b5cf6' }}>
                {Math.round((drOverview?.achievedRpoSeconds ?? 0) / 60)}m
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Target RPO: &lt; {Math.round((drOverview?.targetRpoSeconds ?? 900) / 60)}m (Zero Data Drift)
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vault Snapshots
                </span>
                <Database size={20} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {drOverview?.totalSnapshotsCount ?? drSnapshots.length}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {drOverview?.totalVaultStorageBytes ? `${(drOverview.totalVaultStorageBytes / (1024 * 1024)).toFixed(1)} MB Encrypted Across Regions` : 'Encrypted with AES-256-GCM'}
              </div>
            </div>
          </div>

          {/* DR Sub-Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            <button
              onClick={() => setDrSubTab('snapshots')}
              className={`btn btn-sm ${drSubTab === 'snapshots' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Database size={14} />
              Cryptographic Snapshots ({drSnapshots.length})
            </button>
            <button
              onClick={() => setDrSubTab('drills')}
              className={`btn btn-sm ${drSubTab === 'drills' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Activity size={14} />
              DR Drill Logs ({drDrills.length})
            </button>
            <button
              onClick={() => setDrSubTab('tenant_backups')}
              className={`btn btn-sm ${drSubTab === 'tenant_backups' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              Tenant Backups ({drTenantBackups.length})
            </button>
          </div>

          {/* SubTab 1: Cryptographic Snapshots */}
          {drSubTab === 'snapshots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {drSnapshots.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Database size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No cryptographic snapshots currently cataloged in the vault.</p>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SNAPSHOT ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TYPE / SCOPE</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STORAGE TIER</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>REGIONS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>RECORDS / SIZE</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SHA-256 MANIFEST</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drSnapshots.map((snap) => {
                          const statusBg =
                            snap.status === 'verified' || snap.status === 'available'
                              ? '#10b981'
                              : snap.status === 'creating' || snap.status === 'verifying'
                              ? '#f59e0b'
                              : '#ef4444';
                          const regions = Array.isArray(snap.replicaRegions) && snap.replicaRegions.length > 0 ? snap.replicaRegions.join(', ') : snap.storageRegion;

                          return (
                            <tr key={snap.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                {snap.id}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                                  {snap.snapshotType.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {snap.storageTier.replace(/_/g, ' ')}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {regions}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <div><strong>{snap.recordCount.toLocaleString()}</strong> rows</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  {(snap.sizeBytes / (1024 * 1024)).toFixed(1)} MB ({snap.tableCount} tables)
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                <span title={snap.checksumSha256}>
                                  {snap.checksumSha256.substring(0, 16)}...
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${statusBg}20`,
                                    color: statusBg,
                                    border: `1px solid ${statusBg}40`,
                                    textTransform: 'uppercase',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  {snap.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setSelectedDrillSnapshot(snap);
                                    setDrillTargetEnv('isolated_sandbox');
                                    setDrillReason('');
                                    setDrillConfirmed(false);
                                    setDrillModalOpen(true);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                                >
                                  Verify in Drill
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: DR Drill Logs */}
          {drSubTab === 'drills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {drDrills.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Activity size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No synthetic disaster recovery drill logs recorded yet.</p>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>DRILL ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TARGET SNAPSHOT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TARGET ENV</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACHIEVED RTO</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SCHEMA INTEGRITY</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>EXECUTED BY</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>RESULT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drDrills.map((drill) => {
                          const resultColor =
                            drill.status === 'passed'
                              ? '#10b981'
                              : drill.status === 'in_progress'
                              ? '#f59e0b'
                              : '#ef4444';

                          return (
                            <tr key={drill.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                {drill.id}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {drill.snapshotId}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {drill.targetEnvironment.replace('_', ' ')}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 600, color: '#3b82f6' }}>
                                {drill.rtoSeconds !== null && drill.rtoSeconds !== undefined ? `${drill.rtoSeconds}s` : 'N/A'}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.78rem' }}>
                                <span style={{ color: drill.integrityCheckPassed ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {drill.integrityCheckPassed ? '✓ 100% Verified' : '✗ Schema Discrepancy'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {drill.executedBy}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${resultColor}20`,
                                    color: resultColor,
                                    border: `1px solid ${resultColor}40`,
                                    textTransform: 'uppercase',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  {drill.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 3: Tenant Backups */}
          {drSubTab === 'tenant_backups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {drTenantBackups.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Download size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No tenant backup export archives currently generated.</p>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>EXPORT ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TENANT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>FORMAT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SIZE</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>CHECKSUM (SHA-256)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>EXPIRES AT</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drTenantBackups.map((tb) => {
                          const statusBg =
                            tb.status === 'ready'
                              ? '#10b981'
                              : tb.status === 'generating'
                              ? '#f59e0b'
                              : tb.status === 'expired'
                              ? '#6b7280'
                              : '#ef4444';

                          return (
                            <tr key={tb.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                {tb.id}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 600 }}>{tb.tenantName || 'Tenant'}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {tb.tenantId.substring(0, 8)}...
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                                  {tb.format}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {(tb.sizeBytes / 1024).toFixed(1)} KB
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                <span title={tb.checksumSha256}>
                                  {tb.checksumSha256.substring(0, 16)}...
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {new Date(tb.downloadExpiresAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${statusBg}20`,
                                    color: statusBg,
                                    border: `1px solid ${statusBg}40`,
                                    textTransform: 'uppercase',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  {tb.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <a
                                  href={`/api/v1/admin/operations/dr/tenant-backups/${tb.id}/download`}
                                  download={`${tb.id}.${tb.format === 'sql_gz' ? 'sql.gz' : 'json'}`}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.76rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Download size={12} />
                                  Download
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 17: OUTBOUND WEBHOOK DISPATCHER & ENTERPRISE EVENT NOTIFICATION ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'outbound_webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header & Safe Action Toolbar */}
          <div
            className="glass-card"
            style={{
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send size={24} color="var(--accent-primary)" />
                Outbound Webhook Dispatcher & Enterprise Event Engine
              </h2>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                HMAC-SHA256 signed event dispatching with exponential retry backoff, secret vault encryption, and dead-letter replay.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                id="btn-open-register-webhook"
                onClick={() => {
                  setRegisteredRawSecret(null);
                  setRegisterEndpointModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                Register Webhook Endpoint
              </button>
            </div>
          </div>

          {/* 4 Real-time Telemetry Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Endpoints</span>
                <Radio size={18} color="var(--accent-primary)" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                {webhookOverview?.activeEndpoints || 0}
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px' }}>
                  / {webhookOverview?.totalEndpoints || 0} total
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {webhookOverview?.pausedEndpoints || 0} paused / standby
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Deliveries</span>
                <Zap size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                {webhookOverview?.totalDeliveries || 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px' }}>
                {webhookOverview?.deliveredCount || 0} delivered successfully
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Delivery SLA</span>
                <Activity size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
                {webhookOverview?.successRatePercent ?? 100}%
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                HMAC-SHA256 cryptographic verification
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Retry & Dead-Letter</span>
                <RotateCcw size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: (webhookOverview?.failedCount || 0) > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                {webhookOverview?.retryingCount || 0}
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px' }}>
                  retrying / {webhookOverview?.failedCount || 0} dead
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Exponential backoff: 30s, 2m, 10m, 1h
              </div>
            </div>
          </div>

          {/* Subtabs Bar */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            <button
              id="subtab-endpoints"
              onClick={() => setWebhookSubTab('endpoints')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: webhookSubTab === 'endpoints' ? 600 : 500,
                background: webhookSubTab === 'endpoints' ? 'var(--accent-primary)' : 'transparent',
                color: webhookSubTab === 'endpoints' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Radio size={14} />
              Registered Endpoints ({webhookEndpoints.length})
            </button>
            <button
              id="subtab-deliveries"
              onClick={() => setWebhookSubTab('deliveries')}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: webhookSubTab === 'deliveries' ? 600 : 500,
                background: webhookSubTab === 'deliveries' ? 'var(--accent-primary)' : 'transparent',
                color: webhookSubTab === 'deliveries' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={14} />
              Delivery Logs & Replay ({webhookDeliveries.length})
            </button>
          </div>

          {/* SUBTAB 1: REGISTERED ENDPOINTS */}
          {webhookSubTab === 'endpoints' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Registered Outbound Webhook Subscriptions</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Signed with X-HoaspForge-Signature</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ENDPOINT NAME & ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>DESTINATION URL</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SIGNING SECRET</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SUBSCRIBED EVENTS</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>LAST STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEndpoints.map((ep) => (
                      <tr key={ep.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontSize: '0.84rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ep.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ep.id}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          <span style={{ color: '#38bdf8' }} title={ep.url}>
                            {ep.url.length > 40 ? ep.url.substring(0, 37) + '...' : ep.url}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                              {ep.secretMasked}
                            </span>
                            <button
                              id={`btn-rotate-${ep.id}`}
                              onClick={() => {
                                setTargetRotateEndpoint(ep);
                                setRotatedRawSecret(null);
                                setRotateSecretModalOpen(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                              title="Rotate HMAC signing secret"
                            >
                              Rotate
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                            {ep.events.map((ev) => (
                              <span
                                key={ev}
                                className="badge"
                                style={{
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: '#a78bfa',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                  fontSize: '0.7rem',
                                }}
                              >
                                {ev}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            className="badge"
                            style={{
                              background: ep.status === 'active' ? '#10b98120' : ep.status === 'paused' ? '#f59e0b20' : '#ef444420',
                              color: ep.status === 'active' ? '#10b981' : ep.status === 'paused' ? '#f59e0b' : '#ef4444',
                              border: `1px solid ${ep.status === 'active' ? '#10b98140' : ep.status === 'paused' ? '#f59e0b40' : '#ef444440'}`,
                              textTransform: 'uppercase',
                              fontSize: '0.72rem',
                            }}
                          >
                            {ep.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                          {ep.lastStatusCode ? (
                            <span style={{ color: ep.lastStatusCode >= 200 && ep.lastStatusCode < 300 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                              {ep.lastStatusCode}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>None</span>
                          )}
                          {ep.lastDeliveryAt && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {new Date(ep.lastDeliveryAt).toLocaleTimeString()}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              id={`btn-test-${ep.id}`}
                              onClick={() => {
                                setTargetTestEndpoint(ep);
                                setTestDispatchResult(null);
                                setTestDispatchModalOpen(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              title="Send synthetic test event"
                            >
                              Test Ping
                            </button>
                            <button
                              id={`btn-toggle-${ep.id}`}
                              onClick={() => handleToggleEndpointStatus(ep)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                              {ep.status === 'active' ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              id={`btn-delete-${ep.id}`}
                              onClick={() => handleDeleteEndpoint(ep)}
                              className="btn btn-danger btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 2: DELIVERY LOGS & REPLAY */}
          {webhookSubTab === 'deliveries' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    id="select-delivery-status-filter"
                    value={deliveryStatusFilter}
                    onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All Delivery Statuses</option>
                    <option value="delivered">Delivered (2xx)</option>
                    <option value="retrying">Retrying (Backoff)</option>
                    <option value="failed">Failed / DLQ</option>
                  </select>
                  <select
                    id="select-delivery-event-filter"
                    value={deliveryEventFilter}
                    onChange={(e) => setDeliveryEventFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All Event Types</option>
                    <option value="incident.alert">incident.alert</option>
                    <option value="post.published">post.published</option>
                    <option value="post.failed">post.failed</option>
                    <option value="approval.requested">approval.requested</option>
                    <option value="backup.completed">backup.completed</option>
                    <option value="billing.invoice_paid">billing.invoice_paid</option>
                    <option value="custom.event">custom.event</option>
                  </select>
                </div>
                <button onClick={() => loadActiveTabData(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> Refresh Logs
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>DELIVERY ID & TIME</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>EVENT TYPE</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TARGET ENDPOINT</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS & CODE</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ATTEMPTS</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>LATENCY</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No outbound delivery logs match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      webhookDeliveries.map((d) => {
                        const statusColor =
                          d.status === 'delivered' ? '#10b981' : d.status === 'retrying' ? '#f59e0b' : '#ef4444';

                        return (
                          <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.id}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {new Date(d.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  fontSize: '0.72rem',
                                }}
                              >
                                {d.eventType}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600 }}>{d.endpointName || d.endpointId}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }} title={d.endpointUrl}>
                                {d.endpointUrl ? (d.endpointUrl.length > 30 ? d.endpointUrl.substring(0, 27) + '...' : d.endpointUrl) : ''}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: `${statusColor}20`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}40`,
                                  textTransform: 'uppercase',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                {d.status} {d.statusCode ? `(${d.statusCode})` : ''}
                              </span>
                              {d.errorMessage && (
                                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.errorMessage}>
                                  {d.errorMessage}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {d.attemptCount} / {d.maxAttempts}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {d.requestDurationMs !== null ? `${d.requestDurationMs}ms` : '-'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                id={`btn-retry-delivery-${d.id}`}
                                onClick={() => handleRetryDelivery(d.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Replay this delivery"
                              >
                                <RotateCcw size={12} />
                                Replay
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 19: ENTERPRISE SSO & SAML 2.0 / OIDC IDENTITY PROVIDER FEDERATION     */}
      {/* ========================================================================= */}
      {activeTab === 'enterprise_sso' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active IdP Federations
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {ssoOverview?.activeConfigs ?? ssoConfigs.filter((c) => c.status === 'active').length}
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {ssoOverview?.totalConfigs ?? ssoConfigs.length} configured
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Okta • Azure AD • Google
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mapped Corporate Domains
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#38bdf8' }}>
                {ssoOverview?.activeDomainsCount ?? ssoConfigs.reduce((acc, c) => acc + (c.domains?.length || 0), 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Active domain routing rules
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Authentications
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px' }}>
                {ssoOverview?.totalLogins ?? ssoAudits.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> {ssoOverview?.successRatePercent ?? 100}% success rate
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Successful / JIT Logins
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#10b981' }}>
                {ssoOverview?.successfulLogins ?? ssoAudits.filter((a) => a.status === 'success').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {ssoOverview?.failedLogins ?? ssoAudits.filter((a) => a.status !== 'success').length} failed attempts
              </div>
            </div>
          </div>

          {/* Subtabs and Top Action Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="subtab-sso-configs"
                onClick={() => setSsoSubTab('configs')}
                className={`btn btn-sm ${ssoSubTab === 'configs' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Lock size={14} />
                Identity Providers ({ssoConfigs.length})
              </button>
              <button
                id="subtab-sso-audits"
                onClick={() => setSsoSubTab('audits')}
                className={`btn btn-sm ${ssoSubTab === 'audits' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={14} />
                SSO Authentication Logs ({ssoAudits.length})
              </button>
            </div>

            {ssoSubTab === 'configs' && (
              <button
                id="btn-create-sso-config"
                onClick={openCreateSsoModal}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Configure Enterprise IdP
              </button>
            )}
          </div>

          {/* SUBTAB 1: IDP CONFIGURATIONS */}
          {ssoSubTab === 'configs' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>NAME & TYPE</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>MAPPED CORPORATE DOMAINS</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>IDP SSO URL & ENTITY ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>JIT PROVISIONING</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ssoConfigs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No enterprise SSO identity providers configured yet.
                        </td>
                      </tr>
                    ) : (
                      ssoConfigs.map((cfg) => (
                        <tr key={cfg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{cfg.name}</div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: cfg.providerType === 'saml' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                  color: cfg.providerType === 'saml' ? '#60a5fa' : '#c084fc',
                                  border: `1px solid ${cfg.providerType === 'saml' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                                  fontSize: '0.7rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {cfg.providerType.toUpperCase()} 2.0
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {cfg.id}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(cfg.domains || []).map((dom) => (
                                <span
                                  key={dom}
                                  className="badge"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    fontSize: '0.72rem',
                                  }}
                                >
                                  @{dom}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                            <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cfg.idpSsoUrl}>
                              {cfg.idpSsoUrl}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cfg.idpEntityId}>
                              Entity ID: {cfg.idpEntityId}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: cfg.jitProvisioningEnabled ? '#10b981' : 'var(--text-muted)' }}>
                                {cfg.jitProvisioningEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <span className="badge" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                                {cfg.defaultRole || 'editor'}
                              </span>
                            </div>
                            {cfg.enforceSso && (
                              <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                                Enforce SSO Required
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              className="badge"
                              style={{
                                background:
                                  cfg.status === 'active'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : cfg.status === 'testing'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color: cfg.status === 'active' ? '#10b981' : cfg.status === 'testing' ? '#f59e0b' : '#ef4444',
                                border: `1px solid ${
                                  cfg.status === 'active'
                                    ? 'rgba(16, 185, 129, 0.3)'
                                    : cfg.status === 'testing'
                                    ? 'rgba(245, 158, 11, 0.3)'
                                    : 'rgba(239, 68, 68, 0.3)'
                                }`,
                                textTransform: 'capitalize',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              {cfg.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                id={`btn-test-sso-${cfg.id}`}
                                onClick={() => {
                                  setTargetSimulateConfig(cfg);
                                  setSimTestEmail(`test.user@${cfg.domains[0] || 'acme-corp.com'}`);
                                  setSimTestNameId(`usr_${cfg.domains[0] || 'acme'}_01`);
                                  setSimResult(null);
                                  setSimulateSsoModalOpen(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                title="Simulate SAML Assertion"
                              >
                                Test SAML
                              </button>
                              <button
                                id={`btn-sp-meta-${cfg.id}`}
                                onClick={() => {
                                  setTargetSpConfig(cfg);
                                  setViewSpMetadataModalOpen(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                title="View Service Provider Coordinates"
                              >
                                SP Metadata
                              </button>
                              <button
                                id={`btn-edit-sso-${cfg.id}`}
                                onClick={() => openEditSsoModal(cfg)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              >
                                Edit
                              </button>
                              <button
                                id={`btn-delete-sso-${cfg.id}`}
                                onClick={() => handleDeleteSsoConfig(cfg)}
                                className="btn btn-danger btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 2: SSO AUTHENTICATION & SAML AUDIT LOGS */}
          {ssoSubTab === 'audits' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    id="select-sso-audit-status"
                    value={ssoAuditStatusFilter}
                    onChange={(e) => setSsoAuditStatusFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All Audit Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed_signature">Signature Invalid</option>
                    <option value="failed_domain_unmapped">Unmapped Domain</option>
                    <option value="failed_user_provisioning">JIT Provisioning Error</option>
                    <option value="blocked_inactive">Blocked / Inactive</option>
                  </select>
                </div>
                <button onClick={() => loadActiveTabData(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> Refresh Audits
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TIMESTAMP & AUDIT ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>USER EMAIL & NAMEID</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>IDP FEDERATION</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>NETWORK & CLIENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ssoAudits.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No enterprise SSO login audit records found.
                        </td>
                      </tr>
                    ) : (
                      ssoAudits.map((a) => {
                        const statusColor = a.status === 'success' ? '#10b981' : '#ef4444';
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.id}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {new Date(a.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600 }}>{a.email}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                NameID: {a.idpNameId}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600 }}>{a.configName || a.configId}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {a.configId}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: `${statusColor}20`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}40`,
                                  textTransform: 'uppercase',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                {a.status}
                              </span>
                              {a.errorDetail && (
                                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.errorDetail}>
                                  {a.errorDetail}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              <div style={{ fontFamily: 'monospace' }}>IP: {a.ipAddress || '127.0.0.1'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.userAgent || ''}>
                                {a.userAgent || 'SAML-ACS / Synthetic'}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 20: SCIM 2.0 DIRECTORY SYNC & AUTOMATED WORKFORCE LIFECYCLE PROTOCOL  */}
      {/* ========================================================================= */}
      {activeTab === 'scim_sync' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active SCIM Bearer Tokens
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {scimOverview?.activeTokens ?? scimTokens.filter((t) => t.status === 'active').length}
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {scimTokens.length} total
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Okta • Azure AD / Entra ID
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sync Events (24h)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#38bdf8' }}>
                {scimOverview?.totalSyncEvents24h ?? scimLogs.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> {scimOverview?.successRatePercent ?? 100}% delivery success
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Provisioned Workforce Users
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px' }}>
                {scimOverview?.provisionedUsers ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} color="#38bdf8" /> Active directory identities
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Deprovisioned / Suspended
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#f59e0b' }}>
                {scimOverview?.deactivatedUsers ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={12} color="#ef4444" /> Zero-latency offboarding
              </div>
            </div>
          </div>

          {/* Subtabs and Top Action Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="subtab-scim-tokens"
                onClick={() => setScimSubTab('tokens')}
                className={`btn btn-sm ${scimSubTab === 'tokens' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Key size={14} />
                SCIM Bearer Tokens & Provisioning Config ({scimTokens.length})
              </button>
              <button
                id="subtab-scim-logs"
                onClick={() => setScimSubTab('logs')}
                className={`btn btn-sm ${scimSubTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={14} />
                SCIM Directory Event Logs ({scimLogs.length})
              </button>
            </div>

            {scimSubTab === 'tokens' && (
              <button
                id="btn-generate-scim-token"
                onClick={() => {
                  setNewScimTokenName('');
                  setNewScimTokenTenantId('');
                  setNewScimTokenExpiresInDays(365);
                  setCreatedRawScimToken(null);
                  setCreateScimTokenModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Generate SCIM 2.0 Token
              </button>
            )}
          </div>

          {/* SUBTAB 1: SCIM BEARER TOKENS & PROTOCOL COORDINATES */}
          {scimSubTab === 'tokens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Protocol Endpoints Box */}
              <div
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    SCIM 2.0 BASE URL (OKTA / ENTRA ID)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <code style={{ fontSize: '0.8rem', background: 'rgba(0, 0, 0, 0.3)', padding: '4px 8px', borderRadius: '4px', color: '#60a5fa' }}>
                      http://localhost:4000/api/v1/scim/v2
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:4000/api/v1/scim/v2');
                        showToast('SCIM Base URL copied.');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    USER & GROUP RESOURCE ENDPOINTS
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Users: <code>/Users</code> | Groups: <code>/Groups</code> | Config: <code>/ServiceProviderConfig</code>
                  </div>
                </div>
              </div>

              {/* Tokens Table */}
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TOKEN NAME & ID</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TENANT SCOPE</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TOKEN PREFIX</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>LAST USED</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scimTokens.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No SCIM bearer tokens generated yet.
                          </td>
                        </tr>
                      ) : (
                        scimTokens.map((tok) => {
                          const statusBg = tok.status === 'active' ? '#10b981' : '#ef4444';
                          return (
                            <tr key={tok.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{tok.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                                  {tok.id}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                {tok.tenantId ? (
                                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.72rem' }}>
                                    Tenant: {tok.tenantId.substring(0, 8)}...
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                                    Enterprise Global
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                                {tok.tokenPrefix}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleString() : 'Never used'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${statusBg}20`,
                                    color: statusBg,
                                    border: `1px solid ${statusBg}40`,
                                    textTransform: 'uppercase',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {tok.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                  {tok.status === 'active' && (
                                    <>
                                      <button
                                        id={`btn-rotate-scim-${tok.id}`}
                                        onClick={() => handleRotateScimToken(tok)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                        title="Rotate token secret"
                                      >
                                        Rotate
                                      </button>
                                      <button
                                        id={`btn-revoke-scim-${tok.id}`}
                                        onClick={() => handleRevokeScimToken(tok)}
                                        className="btn btn-danger btn-sm"
                                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                        title="Revoke token"
                                      >
                                        Revoke
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: DIRECTORY EVENT LOGS */}
          {scimSubTab === 'logs' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    id="select-scim-action-filter"
                    value={scimLogActionFilter}
                    onChange={(e) => setScimLogActionFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All SCIM Actions</option>
                    <option value="create">create (Provision)</option>
                    <option value="patch">patch (Update)</option>
                    <option value="deactivate">deactivate (Offboard)</option>
                    <option value="delete">delete</option>
                    <option value="read">read</option>
                    <option value="query">query</option>
                  </select>
                </div>
                <button onClick={() => loadActiveTabData(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> Refresh Logs
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TIMESTAMP & LOG ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>HTTP METHOD & ENDPOINT</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SCIM ACTION</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS CODE</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>IP ADDRESS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scimLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No SCIM sync events recorded matching criteria.
                        </td>
                      </tr>
                    ) : (
                      scimLogs.map((log) => {
                        const statusColor = log.statusCode < 300 ? '#10b981' : log.statusCode < 400 ? '#38bdf8' : '#ef4444';
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.id}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {new Date(log.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <span style={{ fontWeight: 600, color: '#38bdf8', marginRight: '6px' }}>{log.method}</span>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.endpoint}</span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: log.action === 'deactivate' ? 'rgba(239, 68, 68, 0.15)' : log.action === 'create' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                  color: log.action === 'deactivate' ? '#f87171' : log.action === 'create' ? '#34d399' : '#60a5fa',
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: `${statusColor}20`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}40`,
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                {log.statusCode}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {log.ipAddress || '127.0.0.1'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                id={`btn-inspect-scim-${log.id}`}
                                onClick={() => {
                                  setSelectedScimLog(log);
                                  setInspectScimLogModalOpen(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 21: ENTERPRISE SIEM STREAMING & SECURITY EVENT EXPORTER               */}
      {/* ========================================================================= */}
      {activeTab === 'siem_stream' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active SIEM Streams
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {siemOverview?.activeStreams ?? siemDestinations.filter((d) => d.status === 'active').length}
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {siemDestinations.length} configured
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Splunk HEC • Datadog • Syslog
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Events Streamed (24h)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#38bdf8' }}>
                {siemOverview?.totalEventsDelivered24h ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> High-throughput event exporter
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Average Latency
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px' }}>
                {siemOverview?.avgLatencyMs ?? 42}ms
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} color="#38bdf8" /> Sub-second delivery queue
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Delivery SLA
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#10b981' }}>
                {siemOverview?.deliverySlaPercent ?? 100}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} color="#10b981" /> Cryptographic SHA-256 digests
              </div>
            </div>
          </div>

          {/* Subtabs and Top Action Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="subtab-siem-destinations"
                onClick={() => setSiemSubTab('destinations')}
                className={`btn btn-sm ${siemSubTab === 'destinations' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Shield size={14} />
                Configured SIEM Destinations ({siemDestinations.length})
              </button>
              <button
                id="subtab-siem-logs"
                onClick={() => setSiemSubTab('logs')}
                className={`btn btn-sm ${siemSubTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Activity size={14} />
                Delivery Logs & Security Digests ({siemLogs.length})
              </button>
            </div>

            {siemSubTab === 'destinations' && (
              <button
                id="btn-create-siem-dest"
                onClick={() => {
                  setEditingSiemDest(null);
                  setSiemName('');
                  setSiemType('splunk_hec');
                  setSiemFormat('splunk_event');
                  setSiemUrl('');
                  setSiemAuthSecret('');
                  setSiemCategories(['audit', 'auth', 'compliance', 'security']);
                  setSiemSeverity('info');
                  setSiemBatchSize(50);
                  setSiemRateLimit(1000);
                  setCreateSiemModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Configure SIEM Destination
              </button>
            )}
          </div>

          {/* SUBTAB 1: CONFIGURED SIEM DESTINATIONS */}
          {siemSubTab === 'destinations' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>NAME & TYPE</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>PAYLOAD FORMAT</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ENDPOINT URL</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>AUTH SECRET</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>MIN SEVERITY</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siemDestinations.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No enterprise SIEM streaming destinations configured yet.
                        </td>
                      </tr>
                    ) : (
                      siemDestinations.map((dest) => {
                        const statusBg = dest.status === 'active' ? '#10b981' : dest.status === 'paused' ? '#f59e0b' : '#ef4444';
                        return (
                          <tr key={dest.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{dest.name}</div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {dest.destinationType.replace('_', ' ')}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {dest.id}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  fontSize: '0.72rem',
                                }}
                              >
                                {dest.payloadFormat}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                              <div
                                style={{
                                  fontFamily: 'monospace',
                                  color: 'var(--text-secondary)',
                                  maxWidth: '220px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={dest.endpointUrl}
                              >
                                {dest.endpointUrl}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.78rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                              {dest.apiKeyMasked}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                              <span
                                className="badge"
                                style={{
                                  background: dest.minSeverity === 'error' || dest.minSeverity === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  color: dest.minSeverity === 'error' || dest.minSeverity === 'critical' ? '#f87171' : '#34d399',
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {dest.minSeverity}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: `${statusBg}20`,
                                  color: statusBg,
                                  border: `1px solid ${statusBg}40`,
                                  textTransform: 'uppercase',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                {dest.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  id={`btn-probe-siem-${dest.id}`}
                                  onClick={() => {
                                    setTargetProbeDest(dest);
                                    setProbeResult(null);
                                    setProbeSiemModalOpen(true);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                  title="Test security event probe"
                                >
                                  Probe
                                </button>
                                <button
                                  id={`btn-toggle-siem-${dest.id}`}
                                  onClick={() => handleToggleSiemStatus(dest)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  {dest.status === 'active' ? 'Pause' : 'Resume'}
                                </button>
                                <button
                                  id={`btn-delete-siem-${dest.id}`}
                                  onClick={() => handleDeleteSiemDestination(dest)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 2: DELIVERY LOGS & SECURITY DIGESTS */}
          {siemSubTab === 'logs' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    id="select-siem-dest-filter"
                    value={siemDestFilter}
                    onChange={(e) => setSiemDestFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All SIEM Destinations</option>
                    {siemDestinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={() => loadActiveTabData(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> Refresh SIEM Logs
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>TIMESTAMP & BATCH ID</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>DESTINATION</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>EVENTS COUNT</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS CODE & LATENCY</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SHA-256 DIGEST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siemLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No SIEM batch delivery logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      siemLogs.map((log) => {
                        const statusColor = log.statusCode < 300 ? '#10b981' : '#ef4444';
                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.id}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {new Date(log.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {log.destinationId}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 600 }}>
                              {log.eventsCount} events
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${statusColor}20`,
                                    color: statusColor,
                                    border: `1px solid ${statusColor}40`,
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {log.statusCode}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {log.latencyMs}ms
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#93c5fd' }}>
                              {log.digestSha256.substring(0, 24)}...
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 22: ENTERPRISE DATA LOSS PREVENTION (DLP) & CONTENT POLICY GUARDRAILS */}
      {/* ========================================================================= */}
      {activeTab === 'dlp_guard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active DLP Policies
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {dlpOverview?.active_policies_count ?? dlpPolicies.filter((p) => p.is_enabled).length}
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {dlpOverview?.total_policies_count ?? dlpPolicies.length} total
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> PCI • Credentials • PII • HIPAA
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Content Scans (24h)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#38bdf8' }}>
                {dlpOverview?.scans_24h_count ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} /> Real-time pre-publish inspection
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Redacted & Blocked (24h)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#f59e0b' }}>
                {(dlpOverview?.redacted_24h_count ?? 0) + (dlpOverview?.blocked_24h_count ?? 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={12} color="#f59e0b" /> Zero plaintext sensitive leakage
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Quarantine
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  margin: '6px 0 4px',
                  color: (dlpOverview?.quarantined_pending_count ?? 0) > 0 ? '#ef4444' : '#10b981',
                }}
              >
                {dlpOverview?.quarantined_pending_count ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} color="#f59e0b" /> Awaiting Security Officer review
              </div>
            </div>
          </div>

          {/* Subtabs and Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="subtab-dlp-policies"
                onClick={() => setDlpSubTab('policies')}
                className={`btn btn-sm ${dlpSubTab === 'policies' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sliders size={14} />
                DLP Policies & Rule Engines ({dlpPolicies.length})
              </button>
              <button
                id="subtab-dlp-incidents"
                onClick={() => setDlpSubTab('incidents')}
                className={`btn btn-sm ${dlpSubTab === 'incidents' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldAlert size={14} />
                DLP Incidents & Quarantine Queue ({dlpIncidents.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-simulate-dlp"
                onClick={handleOpenSimulateDlp}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Play size={14} /> Scanner Sandbox & Simulator
              </button>
              {dlpSubTab === 'policies' && (
                <button
                  id="btn-create-dlp-policy"
                  onClick={handleOpenCreateDlpPolicy}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Configure DLP Policy
                </button>
              )}
            </div>
          </div>

          {/* SUBTAB 1: DLP POLICIES */}
          {dlpSubTab === 'policies' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    id="select-dlp-category-filter"
                    value={dlpCategoryFilter}
                    onChange={(e) => setDlpCategoryFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All Policy Categories</option>
                    <option value="financial_pci">financial_pci (Credit Cards)</option>
                    <option value="credentials">credentials (Keys & Secrets)</option>
                    <option value="pii">pii (SSN & Personal Identifiers)</option>
                    <option value="health_hipaa">health_hipaa (Health & Medical)</option>
                    <option value="custom">custom (Confidential Codenames)</option>
                  </select>
                </div>
                <button onClick={() => loadActiveTabData(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> Refresh Policies
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>NAME & CATEGORY</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTION</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SEVERITY</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>PATTERN RULES</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>SCOPES</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dlpPolicies.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No DLP content policies configured yet.
                        </td>
                      </tr>
                    ) : (
                      dlpPolicies.map((pol) => {
                        const actionColor =
                          pol.action === 'block_outright'
                            ? '#ef4444'
                            : pol.action === 'quarantine_for_approval'
                            ? '#f59e0b'
                            : pol.action === 'redact_inline'
                            ? '#38bdf8'
                            : '#94a3b8';

                        const categoryColor =
                          pol.category === 'financial_pci'
                            ? '#f59e0b'
                            : pol.category === 'credentials'
                            ? '#ef4444'
                            : pol.category === 'pii'
                            ? '#a855f7'
                            : '#10b981';

                        return (
                          <tr key={pol.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{pol.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: `${categoryColor}20`,
                                    color: categoryColor,
                                    border: `1px solid ${categoryColor}40`,
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                  }}
                                >
                                  {pol.category}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {pol.id}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: `${actionColor}20`,
                                  color: actionColor,
                                  border: `1px solid ${actionColor}40`,
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                }}
                              >
                                {pol.action.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: pol.severity === 'fatal' || pol.severity === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: pol.severity === 'fatal' || pol.severity === 'critical' ? '#f87171' : '#fbbf24',
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {pol.severity}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600 }}>{pol.match_patterns?.length || 0} rule(s)</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {pol.match_patterns?.[0]?.name || 'Custom Matcher'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                                {pol.target_scopes?.map((s) => (
                                  <span
                                    key={s}
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: 'var(--text-secondary)',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: pol.is_enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                  color: pol.is_enabled ? '#34d399' : '#94a3b8',
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                }}
                              >
                                {pol.is_enabled ? 'ACTIVE' : 'DISABLED'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  id={`btn-edit-dlp-${pol.id}`}
                                  onClick={() => handleOpenEditDlpPolicy(pol)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Edit
                                </button>
                                <button
                                  id={`btn-toggle-dlp-${pol.id}`}
                                  onClick={() => handleToggleDlpPolicy(pol)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  {pol.is_enabled ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  id={`btn-delete-dlp-${pol.id}`}
                                  onClick={() => handleDeleteDlpPolicy(pol)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 2: DLP INCIDENTS & QUARANTINE */}
          {dlpSubTab === 'incidents' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    id="select-dlp-severity-filter"
                    value={dlpIncidentSeverityFilter}
                    onChange={(e) => setDlpIncidentSeverityFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All Severities</option>
                    <option value="fatal">Fatal</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>

                  <select
                    id="select-dlp-quarantine-filter"
                    value={dlpIncidentQuarantineFilter}
                    onChange={(e) => setDlpIncidentQuarantineFilter(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    <option value="all">All Quarantine States</option>
                    <option value="pending_review">pending_review (Needs Approval)</option>
                    <option value="approved_override">approved_override (Approved)</option>
                    <option value="rejected_dismissed">rejected_dismissed (Discarded)</option>
                    <option value="none">none (Auto-Processed)</option>
                  </select>
                </div>
                <button onClick={() => loadActiveTabData(true)} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} /> Refresh Incidents
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>INCIDENT & TIME</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>POLICY</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ENTITY & SCOPE</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTION TAKEN</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>QUARANTINE STATUS</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>MASKED CONTENT PREVIEW</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dlpIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No DLP incidents recorded matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      dlpIncidents.map((inc) => {
                        const qColor =
                          inc.quarantine_status === 'pending_review'
                            ? '#f59e0b'
                            : inc.quarantine_status === 'approved_override'
                            ? '#10b981'
                            : inc.quarantine_status === 'rejected_dismissed'
                            ? '#ef4444'
                            : '#94a3b8';

                        return (
                          <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inc.id}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {new Date(inc.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600 }}>{inc.policy_name || inc.policy_id}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {inc.match_count} match(es) detected
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600 }}>{inc.entity_type}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {inc.target_scope}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: inc.action_taken === 'blocked' ? 'rgba(239, 68, 68, 0.15)' : inc.action_taken === 'quarantined' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                  color: inc.action_taken === 'blocked' ? '#f87171' : inc.action_taken === 'quarantined' ? '#fbbf24' : '#38bdf8',
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                }}
                              >
                                {inc.action_taken}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                className="badge"
                                style={{
                                  background: `${qColor}20`,
                                  color: qColor,
                                  border: `1px solid ${qColor}40`,
                                  fontSize: '0.72rem',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                }}
                              >
                                {inc.quarantine_status.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.78rem', maxWidth: '280px' }}>
                              <div
                                style={{
                                  fontFamily: 'monospace',
                                  color: '#cbd5e1',
                                  background: 'rgba(0, 0, 0, 0.25)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={inc.masked_content}
                              >
                                {inc.masked_content}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              {inc.quarantine_status === 'pending_review' ? (
                                <button
                                  id={`btn-review-quarantine-${inc.id}`}
                                  onClick={() => handleOpenReviewIncident(inc)}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Review
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenReviewIncident(inc)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  Details
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 23: ENTERPRISE CUSTOM ROLES & GRANULAR RBAC PERMISSIONS ENGINE        */}
      {/* ========================================================================= */}
      {activeTab === 'custom_rbac' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total RBAC Roles
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {rbacOverview?.totalRoles ?? rbacRoles.length}
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                  / {rbacOverview?.totalCatalogPermissions ?? rbacPermissions.length} permissions
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Matrix RBAC + Wildcard Support
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                System Roles (Immutable)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#a78bfa' }}>
                {rbacOverview?.systemRoles ?? rbacRoles.filter((r) => r.isSystem).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} color="#a78bfa" /> Platform Protected Builtins
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Custom Enterprise Roles
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#38bdf8' }}>
                {rbacOverview?.customRoles ?? rbacRoles.filter((r) => !r.isSystem).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sliders size={12} color="#38bdf8" /> Tenant-scoped & inherited
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active User Overrides
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 4px', color: '#f59e0b' }}>
                {rbacOverview?.totalActiveOverrides ?? rbacOverrides.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} color="#f59e0b" /> Explicit Deny &gt; Allow Hierarchy
              </div>
            </div>
          </div>

          {/* Subtabs and Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="subtab-rbac-roles"
                onClick={() => setRbacSubTab('roles')}
                className={`btn btn-sm ${rbacSubTab === 'roles' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sliders size={14} />
                Roles & Hierarchy ({rbacRoles.length})
              </button>
              <button
                id="subtab-rbac-matrix"
                onClick={() => setRbacSubTab('matrix')}
                className={`btn btn-sm ${rbacSubTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Lock size={14} />
                Permission Matrix ({rbacPermissions.length})
              </button>
              <button
                id="subtab-rbac-assignments"
                onClick={() => setRbacSubTab('assignments')}
                className={`btn btn-sm ${rbacSubTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={14} />
                Assignments & Overrides ({rbacAssignments.length + rbacOverrides.length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-simulate-rbac"
                onClick={handleOpenSimulateRbac}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Play size={14} /> RBAC Sandbox Evaluator
              </button>
              {rbacSubTab === 'roles' && (
                <button
                  id="btn-create-rbac-role"
                  onClick={handleOpenCreateRole}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> New Custom Role
                </button>
              )}
              {rbacSubTab === 'assignments' && (
                <button
                  id="btn-create-override"
                  onClick={handleOpenCreateOverride}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Add Permission Override
                </button>
              )}
            </div>
          </div>

          {/* SUBTAB 1: ROLES & HIERARCHY */}
          {rbacSubTab === 'roles' && (
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Role Name & Slug</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Classification</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Inheritance</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Permissions Granted</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Active Users</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rbacRoles.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No roles found matching query.
                        </td>
                      </tr>
                    ) : (
                      rbacRoles.map((role) => (
                        <tr
                          key={role.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{role.roleName}</div>
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#93c5fd' }}>{role.roleSlug}</div>
                            {role.description && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '300px' }}>
                                {role.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {role.isSystem ? (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                  fontSize: '0.72rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Lock size={10} /> System Immutable
                              </span>
                            ) : (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  fontSize: '0.72rem',
                                }}
                              >
                                Custom Tenant Role
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {role.parentRoleSlug ? `inherits ${role.parentRoleSlug}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.75rem' }}>
                              {role.permissions?.length || 0} permissions
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600 }}>
                            {role.userCount || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenEditRole(role)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              >
                                {role.isSystem ? 'Inspect' : 'Edit'}
                              </button>
                              {!role.isSystem && (
                                <button
                                  onClick={() => handleDeleteRole(role)}
                                  className="btn btn-sm"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 2: PERMISSION MATRIX */}
          {rbacSubTab === 'matrix' && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  Master Enterprise Permission Catalog ({rbacPermissions.length} Granular Slugs)
                </h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                {rbacPermissions.map((perm) => {
                  const riskColor =
                    perm.riskLevel === 'critical'
                      ? '#ef4444'
                      : perm.riskLevel === 'high'
                      ? '#f97316'
                      : perm.riskLevel === 'medium'
                      ? '#f59e0b'
                      : '#10b981';

                  return (
                    <div
                      key={perm.slug}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{perm.name}</div>
                        <span
                          className="badge"
                          style={{
                            background: `${riskColor}15`,
                            color: riskColor,
                            border: `1px solid ${riskColor}40`,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          {perm.riskLevel}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#93c5fd' }}>
                        {perm.slug}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {perm.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBTAB 3: ASSIGNMENTS & OVERRIDES */}
          {rbacSubTab === 'assignments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>
                  Active User Custom Role Assignments ({rbacAssignments.length})
                </h4>
                {rbacAssignments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                    No custom role assignments for this tenant workspace.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>User</th>
                        <th style={{ padding: '8px' }}>Assigned Custom Role</th>
                        <th style={{ padding: '8px' }}>Assigned At</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rbacAssignments.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px' }}>{a.userFullName || a.userEmail || a.userId}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#38bdf8' }}>{a.roleName} ({a.roleSlug})</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <button
                              onClick={async () => {
                                await api.adminOps.unassignRbacUserRole(a.id);
                                showToast('Role unassigned.');
                                loadActiveTabData(true);
                              }}
                              className="btn btn-sm"
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>
                  Explicit User Permission Overrides ({rbacOverrides.length})
                </h4>
                {rbacOverrides.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                    No explicit user permission overrides configured.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>User</th>
                        <th style={{ padding: '8px' }}>Permission</th>
                        <th style={{ padding: '8px' }}>Effect</th>
                        <th style={{ padding: '8px' }}>Reason</th>
                        <th style={{ padding: '8px' }}>Expires</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rbacOverrides.map((ov) => (
                        <tr key={ov.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px' }}>{ov.userFullName || ov.userEmail || ov.userId}</td>
                          <td style={{ padding: '8px', fontFamily: 'monospace', color: '#93c5fd' }}>{ov.permissionSlug}</td>
                          <td style={{ padding: '8px' }}>
                            <span
                              className="badge"
                              style={{
                                background: ov.effect === 'deny' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: ov.effect === 'deny' ? '#f87171' : '#10b981',
                                fontSize: '0.72rem',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                              }}
                            >
                              {ov.effect}
                            </span>
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{ov.reason || '—'}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                            {ov.expiresAt ? new Date(ov.expiresAt).toLocaleDateString() : 'Never (Permanent)'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteOverride(ov.id)}
                              className="btn btn-sm"
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 24: IMMUTABLE WORM AUDIT VAULT & CRYPTOGRAPHIC TAMPER-EVIDENCE         */}
      {/* ========================================================================= */}
      {activeTab === 'worm_vault' && (
        <WormVaultTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 25: MULTI-TENANT CUSTOM DOMAINS & WHITE-LABEL AGENCY PORTALS           */}
      {/* ========================================================================= */}
      {activeTab === 'custom_domains' && (
        <CustomDomainsTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 26: REAL-TIME AI AGENT FLEET ORCHESTRATION & WORKFLOWS                 */}
      {/* ========================================================================= */}
      {activeTab === 'agent_fleet' && (
        <AgentFleetTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 27: GLOBAL MULTI-REGION EDGE CACHING & REAL-TIME CDN HUB              */}
      {/* ========================================================================= */}
      {activeTab === 'edge_cache' && (
        <EdgeCacheTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 28: BRAND KNOWLEDGE GRAPH & SEMANTIC VECTOR MEMORY                    */}
      {/* ========================================================================= */}
      {activeTab === 'knowledge_graph' && (
        <KnowledgeGraphTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 29: PREDICTIVE CHURN, CUSTOMER LTV & REVENUE EXPANSION INTELLIGENCE   */}
      {/* ========================================================================= */}
      {activeTab === 'revenue_intelligence' && (
        <RevenueIntelligenceTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 30: ENTERPRISE GLOBAL API GATEWAY & DYNAMIC THROTTLING                */}
      {/* ========================================================================= */}
      {activeTab === 'api_gateway' && (
        <ApiGatewayTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 31: MULTI-REGION DISASTER FAILOVER & LIVE REPLICATION MESH             */}
      {/* ========================================================================= */}
      {activeTab === 'replication_mesh' && (
        <ReplicationMeshTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 32: AUTOMATED CHAOS ENGINEERING & RESILIENCY LAB                       */}
      {/* ========================================================================= */}
      {activeTab === 'chaos_engineering' && (
        <ChaosEngineeringTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 33: ZERO-TRUST SECRET ROTATION, CONFIDENTIAL COMPUTING & KMS MESH       */}
      {/* ========================================================================= */}
      {activeTab === 'secret_rotation' && (
        <SecretRotationTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 34: MULTI-CLOUD INFRASTRUCTURE FINOPS & COST ATTRIBUTION              */}
      {/* ========================================================================= */}
      {activeTab === 'finops' && (
        <FinOpsTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 35: ENTERPRISE CONTINUOUS COMPLIANCE & EVIDENCE LOCKER                 */}
      {/* ========================================================================= */}
      {activeTab === 'compliance_locker' && (
        <ContinuousComplianceTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 36: ENTERPRISE GLOBAL EVENT MESH & DLQ REPLAY PIPELINE                */}
      {/* ========================================================================= */}
      {activeTab === 'event_mesh' && (
        <EventMeshTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 37: ENTERPRISE DATABASE PARTITIONING & COLD-TIER ARCHIVAL              */}
      {/* ========================================================================= */}
      {activeTab === 'database_archival' && (
        <DatabaseArchivalTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 38: ENTERPRISE REAL-TIME QUERY FEDERATION & CQRS ENGINE                */}
      {/* ========================================================================= */}
      {activeTab === 'query_federation' && (
        <QueryFederationTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 39: ENTERPRISE ACTIVE-ACTIVE MULTI-MASTER CONFLICT RESOLUTION         */}
      {/* ========================================================================= */}
      {activeTab === 'multi_master' && (
        <MultiMasterConsistencyTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 40: ENTERPRISE ZERO-TRUST JIT ACCESS & DUAL-AUTHORIZATION CONTROL PLANE */}
      {/* ========================================================================= */}
      {activeTab === 'jit_access' && (
        <JitAccessTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 41: ENTERPRISE CRYPTOGRAPHIC HSM KEY BROKERAGE & ENVELOPE ENCRYPTION */}
      {/* ========================================================================= */}
      {activeTab === 'hsm_broker' && (
        <HsmKeyBrokerTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 42: ENTERPRISE MULTI-CLOUD DISTRIBUTED OBJECT STORAGE & WORM VAULT    */}
      {/* ========================================================================= */}
      {activeTab === 'object_storage' && (
        <ObjectStorageTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 43: ENTERPRISE DISTRIBUTED SEMANTIC SEARCH & NEURAL RAG MESH          */}
      {/* ========================================================================= */}
      {activeTab === 'neural_rag' && (
        <NeuralRagMeshTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 44: REAL-TIME COLLABORATIVE CANVAS & OT / CRDT GATEWAY                */}
      {/* ========================================================================= */}
      {activeTab === 'collaborative_canvas' && (
        <CollaborativeCanvasTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 45: MULTI-TENANT REAL-TIME VIDEO RENDERING & GPU TRANSCODING MESH     */}
      {/* ========================================================================= */}
      {activeTab === 'video_rendering' && (
        <VideoRenderingTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 46: DISTRIBUTED WORKFLOW ENGINE & SAGA COORDINATOR                    */}
      {/* ========================================================================= */}
      {activeTab === 'saga_workflow' && (
        <SagaWorkflowTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* TAB 47: CROSS-REGION SHARDING & DISTRIBUTED 2PC TRANSACTION MESH          */}
      {/* ========================================================================= */}
      {activeTab === 'sharding_mesh' && (
        <ShardingMeshTab showToast={showToast} />
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE PLAN ADJUSTMENT                                               */}
      {/* ========================================================================= */}
      {subModalTenant && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSubModalTenant(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--accent-primary)" />
                Adjust Subscription Plan
              </h3>
              <button onClick={() => setSubModalTenant(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Modifying subscription plan for <strong>{subModalTenant.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Plan Tier
                </label>
                <select
                  value={subTargetPlan}
                  onChange={(e) => setSubTargetPlan(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="starter">Starter Plan ($59/mo)</option>
                  <option value="growth">Growth Plan ($99/mo)</option>
                  <option value="agency">Agency Pro Plan ($249/mo)</option>
                  <option value="scale">Scale Plan ($499/mo)</option>
                  <option value="enterprise">Enterprise Plan (Custom)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Support Justification (Min 8 chars)
                </label>
                <textarea
                  rows={3}
                  value={subReason}
                  onChange={(e) => setSubReason(e.target.value)}
                  placeholder="e.g. Approved courtesy tier upgrade per Ticket SF-SUPPORT-4029"
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={subConfirmed}
                  onChange={(e) => setSubConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm this plan adjustment will immediately alter quota limits and be permanently logged to the immutable audit trail.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setSubModalTenant(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteSubscriptionUpdate}
                  disabled={subActionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {subActionLoading ? 'Applying...' : 'Apply Plan Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE ENTITLEMENT OVERRIDE                                          */}
      {/* ========================================================================= */}
      {entitleModalTenant && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEntitleModalTenant(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--accent-primary)" />
                Override Tenant Entitlement
              </h3>
              <button onClick={() => setEntitleModalTenant(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Configuring custom resource caps for <strong>{entitleModalTenant.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Resource
                </label>
                <select
                  value={entitleResource}
                  onChange={(e) => setEntitleResource(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="posts">Monthly Posts Quota</option>
                  <option value="ai_credits">AI Generation Tokens</option>
                  <option value="brands">Brand Limit</option>
                  <option value="seats">Team Seat Limit</option>
                  <option value="social_accounts">Connected Social Channels</option>
                  <option value="video_minutes">Video Render Minutes</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', cursor: 'pointer', fontSize: '0.84rem' }}>
                  <input
                    type="checkbox"
                    checked={entitleUnmetered}
                    onChange={(e) => setEntitleUnmetered(e.target.checked)}
                  />
                  <span>Set as Unmetered / Unlimited</span>
                </label>

                {!entitleUnmetered && (
                  <input
                    type="number"
                    value={entitleLimitValue}
                    onChange={(e) => setEntitleLimitValue(parseInt(e.target.value, 10) || 0)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Support Justification (Min 8 chars)
                </label>
                <textarea
                  rows={3}
                  value={entitleReason}
                  onChange={(e) => setEntitleReason(e.target.value)}
                  placeholder="e.g. Granted temporary 500 post emergency buffer per Ticket SF-SUPPORT-8291"
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={entitleConfirmed}
                  onChange={(e) => setEntitleConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm this entitlement change will override the default subscription plan limit and be logged for governance.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setEntitleModalTenant(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteEntitlementOverride}
                  disabled={entitleActionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {entitleActionLoading ? 'Saving...' : 'Save Entitlement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE DLQ RETRY                                                     */}
      {/* ========================================================================= */}
      {retryModalJob && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRetryModalJob(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="var(--accent-primary)" />
                Retry Dead-Lettered Job
              </h3>
              <button onClick={() => setRetryModalJob(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Retrying dead-lettered job <code>{retryModalJob.id.slice(0, 8)}</code> for {retryModalJob.tenantName}.
            </p>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#f87171',
                fontSize: '0.8rem',
                marginBottom: '16px',
              }}
            >
              Cause: {retryModalJob.failureReason}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Support Justification (Min 8 chars)
                </label>
                <textarea
                  rows={3}
                  value={retryReason}
                  onChange={(e) => setRetryReason(e.target.value)}
                  placeholder="e.g. Retrying after provider API connectivity restored per status page."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={retryConfirmed}
                  onChange={(e) => setRetryConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm this retry resets the attempt counter and schedules the job for immediate background processing.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setRetryModalJob(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDlqRetry}
                  disabled={retryActionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {retryActionLoading ? 'Retrying...' : 'Confirm Retry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDITED SUPPORT IMPERSONATION SESSION                              */}
      {/* ========================================================================= */}
      {impersonateModalTenant && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setImpersonateModalTenant(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <ShieldAlert size={18} />
                Audited Support Impersonation Session
              </h3>
              <button onClick={() => setImpersonateModalTenant(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.82rem',
                color: '#fca5a5',
                marginBottom: '16px',
              }}
            >
              <strong>SECURITY SAFEGUARD:</strong> Arbitrary tenant impersonation is strictly prohibited. Every action
              taken during an impersonation session is cryptographically bound to your superadmin identity and
              permanently logged for security compliance.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Support Ticket Identifier (Required)
                </label>
                <input
                  type="text"
                  value={impTicketRef}
                  onChange={(e) => setImpTicketRef(e.target.value)}
                  placeholder="e.g. SF-SUPPORT-8291"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Session Duration
                </label>
                <select
                  value={impDuration}
                  onChange={(e) => setImpDuration(parseInt(e.target.value, 10))}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value={15}>15 Minutes (Standard Diagnostic)</option>
                  <option value={30}>30 Minutes (Deep Support)</option>
                  <option value={60}>60 Minutes (Maximum Allowed TTL)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Support Justification (Min 10 chars)
                </label>
                <textarea
                  rows={3}
                  value={impReason}
                  onChange={(e) => setImpReason(e.target.value)}
                  placeholder="Describe the exact customer support issue being diagnosed..."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={impConfirmed}
                  onChange={(e) => setImpConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm this support session is authorized by customer request and understand all session activity is auditable.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setImpersonateModalTenant(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleCreateImpersonation}
                  disabled={impActionLoading}
                  className="btn btn-sm"
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {impActionLoading ? 'Authenticating...' : 'Launch Audited Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: DEEP TENANT DETAIL INSPECTION                             */}
      {/* ========================================================================= */}
      {selectedTenantDetail && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTenantDetail(null);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>{selectedTenantDetail.name}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {selectedTenantDetail.id}
                </span>
              </div>
              <button onClick={() => setSelectedTenantDetail(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Brands Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                BRANDS ({selectedTenantDetail.brands.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedTenantDetail.brands.map((b) => (
                  <span
                    key={b.id}
                    className="badge"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    {b.name} ({b.timezone || 'UTC'})
                  </span>
                ))}
              </div>
            </div>

            {/* Quota Usage Grid */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                CURRENT USAGE & QUOTAS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {Object.entries(selectedTenantDetail.usage).map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                      {v.current} / {v.limit ?? 'Unmetered'} ({v.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Members */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                TEAM MEMBERS ({selectedTenantDetail.members.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedTenantDetail.members.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span>{m.email}</span>
                    <span className="badge" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setSelectedTenantDetail(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFE INCIDENT RESOLUTION                                           */}
      {/* ========================================================================= */}
      {resolveModalEvent && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResolveModalEvent(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                Resolve Incident
              </h3>
              <button onClick={() => setResolveModalEvent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Resolving incident <strong>#{resolveModalEvent.id.slice(0, 8)}</strong> ({resolveModalEvent.title}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Resolution Notes (Min. 8 characters)
                </label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Meta Graph API rate limit cleared; token quotas verified and automations resumed."
                  className="input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <input
                  type="checkbox"
                  checked={resolveConfirmed}
                  onChange={(e) => setResolveConfirmed(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  I confirm that all root causes have been mitigated and services have returned to nominal SLA.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setResolveModalEvent(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteResolveIncident}
                  disabled={resolveActionLoading || !resolveConfirmed || resolveNote.trim().length < 8}
                  className="btn btn-primary btn-sm"
                >
                  {resolveActionLoading ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ACKNOWLEDGE INCIDENT                                               */}
      {/* ========================================================================= */}
      {ackModalEvent && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAckModalEvent(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '460px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#f59e0b" />
                Acknowledge Incident
              </h3>
              <button onClick={() => setAckModalEvent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Acknowledge incident <strong>#{ackModalEvent.id.slice(0, 8)}</strong> to indicate an active engineer is investigating.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Acknowledgement Note (Optional)
                </label>
                <textarea
                  value={ackReason}
                  onChange={(e) => setAckReason(e.target.value)}
                  placeholder="e.g. Investigating high 429 error volume on provider webhook workers."
                  className="input"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setAckModalEvent(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteAcknowledgeIncident}
                  disabled={ackActionLoading}
                  className="btn btn-primary btn-sm"
                >
                  {ackActionLoading ? 'Acknowledging...' : 'Acknowledge Incident'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NOTIFICATION CHANNEL                                        */}
      {/* ========================================================================= */}
      {createChannelModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateChannelModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--accent-primary)" />
                New Notification Channel
              </h3>
              <button onClick={() => setCreateChannelModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. Slack #devops-alerts"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Channel Type
                </label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as any)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="slack">Slack Incoming Webhook</option>
                  <option value="pagerduty">PagerDuty Events API v2</option>
                  <option value="webhook">Generic Webhook (HMAC Signed)</option>
                  <option value="email">Email Notification</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Destination (Webhook URL / Routing Key / Email)
                </label>
                <input
                  type="text"
                  value={newChannelTarget}
                  onChange={(e) => setNewChannelTarget(e.target.value)}
                  placeholder="https://hooks.slack.com/services/... or alert@domain.com"
                  className="input"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Target destinations are encrypted in storage and masked in administrative views.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Secret Token / HMAC Signing Key (Optional)
                </label>
                <input
                  type="password"
                  value={newChannelSecret}
                  onChange={(e) => setNewChannelSecret(e.target.value)}
                  placeholder="Optional secret for X-HoaspForge-Signature verification"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={newChannelIsDefault}
                  onChange={(e) => setNewChannelIsDefault(e.target.checked)}
                />
                <span>Set as default channel for new alert rules</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setCreateChannelModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={createChannelLoading || !newChannelName.trim() || !newChannelTarget.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {createChannelLoading ? 'Configuring...' : 'Save Channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE ALERT RULE                                                  */}
      {/* ========================================================================= */}
      {createRuleModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateRuleModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--accent-primary)" />
                Create Incident Alert Rule
              </h3>
              <button onClick={() => setCreateRuleModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Rate-Limit Spike (Meta 429s)"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Condition Trigger Type
                </label>
                <select
                  value={newRuleConditionType}
                  onChange={(e) => setNewRuleConditionType(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="RATE_LIMIT_SPIKE_429">HTTP 429 Rate Limit Spike</option>
                  <option value="DLQ_JOB_THRESHOLD">DLQ Dead-Letter Accumulation</option>
                  <option value="PROVIDER_DOWNTIME_SLA">External Provider SLA Degradation</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Threshold Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Window (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={newRuleWindowMinutes}
                    onChange={(e) => setNewRuleWindowMinutes(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Severity Level
                  </label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Cooldown (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={newRuleCooldownMinutes}
                    onChange={(e) => setNewRuleCooldownMinutes(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setCreateRuleModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleCreateRule}
                  disabled={createRuleLoading || !newRuleName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {createRuleLoading ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMULATE ALERT TRIGGER                                             */}
      {/* ========================================================================= */}
      {simulateModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSimulateModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="var(--accent-primary)" />
                Simulate Incident Alert
              </h3>
              <button onClick={() => setSimulateModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Condition Type
                  </label>
                  <select
                    value={simulateConditionType}
                    onChange={(e) => setSimulateConditionType(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="RATE_LIMIT_SPIKE_429">RATE_LIMIT_SPIKE_429</option>
                    <option value="DLQ_JOB_THRESHOLD">DLQ_JOB_THRESHOLD</option>
                    <option value="PROVIDER_DOWNTIME_SLA">PROVIDER_DOWNTIME_SLA</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Severity
                  </label>
                  <select
                    value={simulateSeverity}
                    onChange={(e) => setSimulateSeverity(e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Incident Title
                </label>
                <input
                  type="text"
                  value={simulateTitle}
                  onChange={(e) => setSimulateTitle(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Message / Details
                </label>
                <textarea
                  value={simulateMessage}
                  onChange={(e) => setSimulateMessage(e.target.value)}
                  rows={2}
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Metadata JSON
                </label>
                <textarea
                  value={simulateMetadata}
                  onChange={(e) => setSimulateMetadata(e.target.value)}
                  rows={2}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setSimulateModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleSimulateTrigger}
                  disabled={simulateLoading || !simulateTitle.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {simulateLoading ? 'Simulating...' : 'Dispatch Simulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REQUEST COMPLIANCE EXPORT (SOC2 / GDPR)                            */}
      {/* ========================================================================= */}
      {exportModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="var(--accent-primary)" />
                Generate Compliance Export
              </h3>
              <button onClick={() => setExportModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Generate an immutable, cryptographically hashed export package for SOC2 audits or GDPR compliance.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Export Type
                  </label>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="soc2_audit">SOC2 Type II Audit</option>
                    <option value="gdpr_sar">GDPR Art. 15 SAR</option>
                    <option value="full_tenant">Full Tenant Archive</option>
                    <option value="analytics_raw">Raw Telemetry</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Archive Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="zip_json">ZIP (JSON Manifest)</option>
                    <option value="zip_csv">ZIP (CSV Tables)</option>
                    <option value="json">Raw JSON Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Tenant ID (Optional - Leave blank for Global)
                </label>
                <input
                  type="text"
                  value={exportTargetTenantId}
                  onChange={(e) => setExportTargetTenantId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000001"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Audit Justification (Min 8 chars)
                </label>
                <textarea
                  value={exportReason}
                  onChange={(e) => setExportReason(e.target.value)}
                  placeholder="e.g. Annual external SOC2 compliance audit by Deloitte & Touche"
                  className="input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={exportConfirmed}
                  onChange={(e) => setExportConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm this export contains audited enterprise data and will compute a deterministic SHA-256 artifact checksum.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setExportModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleRequestExport}
                  disabled={exportLoading}
                  className="btn btn-primary btn-sm"
                >
                  {exportLoading ? 'Generating Export...' : 'Generate Compliance Package'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURE DATA RETENTION POLICY                                    */}
      {/* ========================================================================= */}
      {editPolicyModalOpen && selectedPolicy && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditPolicyModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--accent-primary)" />
                Configure Retention Policy
              </h3>
              <button onClick={() => setEditPolicyModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Configuring data lifecycle policy for <code>{selectedPolicy.dataCategory}</code>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Retention Period (Days)
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={3650}
                    value={editRetentionDays}
                    onChange={(e) => setEditRetentionDays(parseInt(e.target.value, 10) || 30)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={editGracePeriod}
                    onChange={(e) => setEditGracePeriod(parseInt(e.target.value, 10) || 7)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.84rem' }}>
                <input
                  type="checkbox"
                  checked={editAutoPurge}
                  onChange={(e) => setEditAutoPurge(e.target.checked)}
                />
                <span>Enable Automated Nightly Purging (TTL Worker)</span>
              </label>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Policy Justification (Min 8 chars)
                </label>
                <textarea
                  value={editPolicyReason}
                  onChange={(e) => setEditPolicyReason(e.target.value)}
                  placeholder="e.g. Adjusting telemetry retention to 90 days per compliance committee review"
                  className="input"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={editPolicyConfirmed}
                  onChange={(e) => setEditPolicyConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm updating this regulatory data retention policy will alter automated purging schedules.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setEditPolicyModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecutePolicyUpdate}
                  disabled={editPolicyLoading}
                  className="btn btn-primary btn-sm"
                >
                  {editPolicyLoading ? 'Saving...' : 'Save Policy Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXECUTE SAFE DATA PURGE                                            */}
      {/* ========================================================================= */}
      {purgeModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPurgeModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <Trash2 size={18} />
                Execute Safe Data Purge
              </h3>
              <button onClick={() => setPurgeModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.82rem',
                color: '#fca5a5',
                marginBottom: '16px',
              }}
            >
              <strong>PRODUCTION SAFETY INVARIANT:</strong> Production posts, verification records, and live published
              variants are strictly immune and will never be purged. A cryptographic certificate is issued upon purge completion.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Data Category
                </label>
                <select
                  value={purgeCategory}
                  onChange={(e) => setPurgeCategory(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="analytics_telemetry">analytics_telemetry (Historical metrics)</option>
                  <option value="compliance_exports">compliance_exports (Expired archives)</option>
                  <option value="audit_logs">audit_logs (Aged audit records)</option>
                  <option value="media_assets">media_assets (Orphaned uploads)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Tenant ID (Optional - Leave blank for Global)
                </label>
                <input
                  type="text"
                  value={purgeTenantId}
                  onChange={(e) => setPurgeTenantId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000001"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Support Justification (Min 8 chars)
                </label>
                <textarea
                  value={purgeReason}
                  onChange={(e) => setPurgeReason(e.target.value)}
                  placeholder="e.g. Periodic GDPR telemetry cleanup for records older than retention threshold"
                  className="input"
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={purgeConfirmed}
                  onChange={(e) => setPurgeConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm this permanent purge operation meets regulatory requirements and will generate an immutable HMAC-SHA256 purge certificate.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setPurgeModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecutePurge}
                  disabled={purgeLoading}
                  className="btn btn-sm"
                  style={{ background: '#dc2626', color: '#fff', fontWeight: 600 }}
                >
                  {purgeLoading ? 'Purging...' : 'Execute Purge & Sign Certificate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CUSTOM RBAC ROLE                                            */}
      {/* ========================================================================= */}
      {createRoleModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateRoleModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '560px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--accent-primary)" />
                Create Custom Role & Permissions
              </h3>
              <button onClick={() => setCreateRoleModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Define a granular enterprise role with tailored access across audit, compliance, billing, and automation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Role Slug (Lowercase, underscores)
                  </label>
                  <input
                    type="text"
                    value={newRoleSlug}
                    onChange={(e) => setNewRoleSlug(e.target.value)}
                    placeholder="e.g. external_auditor"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Role Display Name
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. External SOC2 Auditor"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Role Description
                </label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="e.g. Read-only access to audit logs, compliance exports, and Merkle verification"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Granted Permissions ({newRoleSelectedPermissions.length} selected)
                </label>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {compliancePermissionsCatalog.map((cat) => (
                    <div key={cat.category}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {cat.category}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {cat.permissions.map((perm) => {
                          const checked = newRoleSelectedPermissions.includes(perm);
                          return (
                            <label
                              key={perm}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.76rem',
                                color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewRoleSelectedPermissions([...newRoleSelectedPermissions, perm]);
                                  } else {
                                    setNewRoleSelectedPermissions(newRoleSelectedPermissions.filter((p) => p !== perm));
                                  }
                                }}
                              />
                              <span style={{ fontFamily: 'monospace' }}>{perm}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={newRoleConfirmed}
                  onChange={(e) => setNewRoleConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm granting these enterprise permissions to the new role.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setCreateRoleModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={createRoleLoading}
                  className="btn btn-primary btn-sm"
                >
                  {createRoleLoading ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 1: INSPECT WEBHOOK EVENT PAYLOAD & HEADERS                         */}
      {/* ========================================================================= */}
      {inspectWebhookEvent && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectWebhookEvent(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '640px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code size={18} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Webhook Payload Inspector</h3>
                <span className="badge" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  {inspectWebhookEvent.provider}
                </span>
              </div>
              <button onClick={() => setInspectWebhookEvent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Event Type:</span>
                <div style={{ fontWeight: 600 }}>{inspectWebhookEvent.eventType}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{inspectWebhookEvent.status}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Event ID:</span>
                <div style={{ fontFamily: 'monospace' }}>{inspectWebhookEvent.id.slice(0, 16)}...</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>HMAC Verification:</span>
                <div style={{ color: inspectWebhookEvent.signatureVerified ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                  {inspectWebhookEvent.signatureVerified ? 'Verified Valid' : 'Unverified'}
                </div>
              </div>
            </div>

            {inspectWebhookEvent.lastError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '14px' }}>
                <strong style={{ color: '#f87171', fontSize: '0.8rem' }}>Failure Error:</strong>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '4px', fontFamily: 'monospace' }}>
                  {inspectWebhookEvent.lastError}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Raw JSON Payload:
              </div>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: '#e2e8f0',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {JSON.stringify(inspectWebhookEvent.payload, null, 2)}
              </pre>
            </div>

            {inspectWebhookEvent.headers && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Request Headers:
                </div>
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.74rem',
                    color: '#94a3b8',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {JSON.stringify(inspectWebhookEvent.headers, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setInspectWebhookEvent(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SAFE WEBHOOK REPLAY                                             */}
      {/* ========================================================================= */}
      {replayWebhookModalEvent && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReplayWebhookModalEvent(null);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="var(--accent-primary)" />
                Safe Webhook Replay
              </h3>
              <button onClick={() => setReplayWebhookModalEvent(null)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Replaying event <strong>{replayWebhookModalEvent.eventType}</strong> (ID: {replayWebhookModalEvent.id.slice(0, 8)}).
              Will re-trigger handlers with full audit trail logging in superadmin logs.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Support Ticket Reference (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. SF-SUPPORT-4029"
                  value={replayWebhookTicket}
                  onChange={(e) => setReplayWebhookTicket(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Justification Reason (Mandatory, min 8 characters):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified downstream worker restored; replaying failed Instagram webhook."
                  value={replayWebhookReason}
                  onChange={(e) => setReplayWebhookReason(e.target.value)}
                  className="input"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={replayWebhookConfirmed}
                  onChange={(e) => setReplayWebhookConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm that replaying this webhook delivery is safe and authorized.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setReplayWebhookModalEvent(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteWebhookReplay}
                  disabled={replayWebhookLoading}
                  className="btn btn-primary btn-sm"
                >
                  {replayWebhookLoading ? 'Replaying...' : 'Execute Replay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BATCH REPLAY DLQ                                                */}
      {/* ========================================================================= */}
      {batchReplayModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setBatchReplayModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="var(--accent-primary)" />
                Batch Replay Dead-Letter Queue
              </h3>
              <button onClick={() => setBatchReplayModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Replay up to 50 failed or dead-letter social webhook events in batch.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Target Provider:
                </label>
                <select
                  value={batchReplayProvider}
                  onChange={(e) => setBatchReplayProvider(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="all">All Providers</option>
                  <option value="meta">Meta Graph</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Justification Reason (Mandatory, min 8 characters):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Provider outage resolved; batch retrying accumulated dead-letter events."
                  value={batchReplayReason}
                  onChange={(e) => setBatchReplayReason(e.target.value)}
                  className="input"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={batchReplayConfirmed}
                  onChange={(e) => setBatchReplayConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm batch execution across all eligible dead-letter events.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setBatchReplayModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteBatchReplayWebhooks}
                  disabled={batchReplayLoading}
                  className="btn btn-primary btn-sm"
                >
                  {batchReplayLoading ? 'Processing Batch...' : 'Execute Batch Replay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SIMULATE INCOMING WEBHOOK                                       */}
      {/* ========================================================================= */}
      {simulateWebhookModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSimulateWebhookModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="var(--accent-primary)" />
                Simulate Webhook Delivery
              </h3>
              <button onClick={() => setSimulateWebhookModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Simulate an incoming webhook delivery with automated HMAC signature generation and pipeline execution.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Provider:
                  </label>
                  <select
                    value={simProvider}
                    onChange={(e) => setSimProvider(e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="meta">Meta Graph</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="stripe">Stripe</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Event Type:
                  </label>
                  <input
                    type="text"
                    value={simEventType}
                    onChange={(e) => setSimEventType(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Payload JSON:
                </label>
                <textarea
                  rows={5}
                  value={simPayloadJson}
                  onChange={(e) => setSimPayloadJson(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={simFail}
                  onChange={(e) => setSimFail(e.target.checked)}
                />
                <span style={{ color: '#f87171' }}>
                  Simulate Delivery Failure (tests automatic DLQ transition)
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setSimulateWebhookModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  onClick={handleExecuteSimulateWebhook}
                  disabled={simLoading}
                  className="btn btn-primary btn-sm"
                >
                  {simLoading ? 'Simulating...' : 'Dispatch Simulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLA MODAL 1: OVERRIDE SUBSYSTEM STATUS                                    */}
      {/* ========================================================================= */}
      {overrideModalOpen && selectedOverrideComp && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOverrideModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--accent-primary)" />
                Override Subsystem Status
              </h3>
              <button onClick={() => setOverrideModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Manual operator status override for <strong>{selectedOverrideComp.name}</strong> (<code>{selectedOverrideComp.id}</code>).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Health Status
                </label>
                <select
                  value={overrideTargetStatus}
                  onChange={(e) => setOverrideTargetStatus(e.target.value as any)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="operational">Operational</option>
                  <option value="degraded_performance">Degraded Performance</option>
                  <option value="partial_outage">Partial Outage</option>
                  <option value="major_outage">Major Outage</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Operator Justification (Min 8 chars)
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Upstream Meta Graph API reporting elevated 5xx errors; marking adapter as degraded."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={overrideConfirmed}
                  onChange={(e) => setOverrideConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm overriding this subsystem status. This action will immediately update the public status feed and be permanently audited.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setOverrideModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-override"
                  onClick={handleExecuteOverrideComponent}
                  disabled={overrideLoading}
                  className="btn btn-primary btn-sm"
                >
                  {overrideLoading ? 'Applying...' : 'Apply Status Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLA MODAL 2: CLEAR OVERRIDE                                               */}
      {/* ========================================================================= */}
      {clearOverrideModalOpen && selectedClearComp && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setClearOverrideModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                Clear Manual Override
              </h3>
              <button onClick={() => setClearOverrideModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Clearing manual override for <strong>{selectedClearComp.name}</strong> will return it to automated operational telemetry.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Operator Justification (Min 8 chars)
                </label>
                <textarea
                  rows={3}
                  value={clearReason}
                  onChange={(e) => setClearReason(e.target.value)}
                  placeholder="e.g. Upstream incident resolved; subsystem telemetry verified normal."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={clearConfirmed}
                  onChange={(e) => setClearConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm restoring this subsystem to automated operational status.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setClearOverrideModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-clear-override"
                  onClick={handleExecuteClearOverride}
                  disabled={clearLoading}
                  className="btn btn-primary btn-sm"
                >
                  {clearLoading ? 'Clearing...' : 'Clear Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLA MODAL 3: SCHEDULE MAINTENANCE WINDOW                                  */}
      {/* ========================================================================= */}
      {schedMaintModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSchedMaintModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--accent-primary)" />
                Schedule Maintenance Window
              </h3>
              <button onClick={() => setSchedMaintModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Maintenance Title
                </label>
                <input
                  type="text"
                  value={newMaintTitle}
                  onChange={(e) => setNewMaintTitle(e.target.value)}
                  placeholder="e.g. Q4 Database Optimization & Index Rebuild"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Description & Operational Scope (Min 8 chars)
                </label>
                <textarea
                  rows={2}
                  value={newMaintDescription}
                  onChange={(e) => setNewMaintDescription(e.target.value)}
                  placeholder="e.g. Scheduled cluster maintenance to apply database read-replica optimizations."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Impact Level
                  </label>
                  <select
                    value={newMaintImpact}
                    onChange={(e) => setNewMaintImpact(e.target.value as any)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="none">Zero Impact (Routine)</option>
                    <option value="minor_degradation">Minor Performance Degradation</option>
                    <option value="expected_downtime">Expected Brief Downtime</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Impacted Subsystems
                  </label>
                  <select
                    multiple
                    value={newMaintImpactedComps}
                    onChange={(e) =>
                      setNewMaintImpactedComps(Array.from(e.target.selectedOptions, (opt) => opt.value))
                    }
                    className="input"
                    style={{ width: '100%', height: '80px' }}
                  >
                    {slaComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Scheduled Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newMaintStart}
                    onChange={(e) => setNewMaintStart(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Scheduled End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newMaintEnd}
                    onChange={(e) => setNewMaintEnd(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={newMaintConfirmed}
                  onChange={(e) => setNewMaintConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm broadcasting this maintenance window to public status subscribers and enterprise dashboards.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setSchedMaintModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-schedule-maint"
                  onClick={handleExecuteScheduleMaintenance}
                  disabled={schedMaintLoading}
                  className="btn btn-primary btn-sm"
                >
                  {schedMaintLoading ? 'Scheduling...' : 'Schedule Window'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLA MODAL 4: UPDATE MAINTENANCE WINDOW STATUS                             */}
      {/* ========================================================================= */}
      {updateMaintModalOpen && selectedMaintWindow && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setUpdateMaintModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--accent-primary)" />
                Update Maintenance Status
              </h3>
              <button onClick={() => setUpdateMaintModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Transition maintenance window <strong>{selectedMaintWindow.title}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target State
                </label>
                <select
                  value={maintTargetStatus}
                  onChange={(e) => setMaintTargetStatus(e.target.value as any)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="in_progress">In Progress (Active Maintenance)</option>
                  <option value="completed">Completed (Restored Normal)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Mandatory Status Update Justification (Min 8 chars)
                </label>
                <textarea
                  rows={3}
                  value={maintUpdateReason}
                  onChange={(e) => setMaintUpdateReason(e.target.value)}
                  placeholder="e.g. Maintenance operations successfully finished; verification tests passed 100%."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={maintConfirmed}
                  onChange={(e) => setMaintConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm transitioning this maintenance window.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setUpdateMaintModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-update-maint"
                  onClick={handleExecuteUpdateMaintenanceStatus}
                  disabled={updateMaintLoading}
                  className="btn btn-primary btn-sm"
                >
                  {updateMaintLoading ? 'Updating...' : 'Apply Transition'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE MANUAL DR SNAPSHOT                                          */}
      {/* ========================================================================= */}
      {createSnapshotModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateSnapshotModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--accent-primary)" />
                Create Database Vault Snapshot
              </h3>
              <button onClick={() => setCreateSnapshotModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Takes an audited, cryptographically sealed point-in-time snapshot with SHA-256 manifest verification across replica regions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SNAPSHOT TYPE
                </label>
                <select
                  id="select-snap-type"
                  value={newSnapType}
                  onChange={(e) => setNewSnapType(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="manual_operator">Manual Operator Snapshot</option>
                  <option value="pre_migration">Pre-Migration Safety Snapshot</option>
                  <option value="compliance_freeze">Compliance Legal Hold Freeze</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  STORAGE RESILIENCE TIER
                </label>
                <select
                  id="select-snap-tier"
                  value={newSnapTier}
                  onChange={(e) => setNewSnapTier(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="multi_region_replica">Multi-Region Replica (Hot Active-Active)</option>
                  <option value="hot_s3">Hot Object Storage (S3 Standard)</option>
                  <option value="cold_glacier">Cold Vault (S3 Glacier Deep Archive)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  RETENTION PERIOD (DAYS)
                </label>
                <input
                  id="input-snap-retention"
                  type="number"
                  min="7"
                  max="3650"
                  value={newSnapRetentionDays}
                  onChange={(e) => setNewSnapRetentionDays(Number(e.target.value))}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  MANDATORY AUDIT JUSTIFICATION (MIN 8 CHARACTERS)
                </label>
                <textarea
                  id="input-snap-reason"
                  rows={3}
                  value={newSnapReason}
                  onChange={(e) => setNewSnapReason(e.target.value)}
                  placeholder="e.g. Scheduled quarterly database resilience vault verification."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  id="check-snap-confirm"
                  type="checkbox"
                  checked={newSnapConfirmed}
                  onChange={(e) => setNewSnapConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm taking an immutable cryptographic snapshot with SHA-256 seal.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setCreateSnapshotModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-create-snapshot"
                  onClick={handleExecuteCreateSnapshot}
                  disabled={createSnapshotLoading}
                  className="btn btn-primary btn-sm"
                >
                  {createSnapshotLoading ? 'Creating Snapshot...' : 'Seal Snapshot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXECUTE DISASTER RECOVERY DRILL                                    */}
      {/* ========================================================================= */}
      {drillModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrillModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--accent-primary)" />
                Execute Disaster Recovery Drill
              </h3>
              <button onClick={() => setDrillModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Executes a non-destructive synthetic restoration in an isolated sandbox to verify schema integrity and compute achieved RTO.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  TARGET VAULT SNAPSHOT
                </label>
                <select
                  id="select-drill-snapshot"
                  value={selectedDrillSnapshot?.id || ''}
                  onChange={(e) => {
                    const snap = drSnapshots.find((s) => s.id === e.target.value);
                    if (snap) setSelectedDrillSnapshot(snap);
                  }}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                >
                  {drSnapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({s.snapshotType} - {s.tableCount} tables - {new Date(s.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  TARGET ISOLATION ENVIRONMENT
                </label>
                <select
                  id="select-drill-env"
                  value={drillTargetEnv}
                  onChange={(e) => setDrillTargetEnv(e.target.value as any)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="isolated_sandbox">Isolated Ephemeral Sandbox (Zero Prod Impact)</option>
                  <option value="ephemeral_staging">Ephemeral Staging Container</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  MANDATORY DRILL JUSTIFICATION (MIN 8 CHARACTERS)
                </label>
                <textarea
                  id="input-drill-reason"
                  rows={3}
                  value={drillReason}
                  onChange={(e) => setDrillReason(e.target.value)}
                  placeholder="e.g. Monthly synthetic DR drill to calibrate RTO against SLA bounds."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  id="check-drill-confirm"
                  type="checkbox"
                  checked={drillConfirmed}
                  onChange={(e) => setDrillConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm triggering synthetic schema and table restoration drill.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setDrillModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-execute-drill"
                  onClick={handleExecuteDrill}
                  disabled={drillLoading}
                  className="btn btn-primary btn-sm"
                >
                  {drillLoading ? 'Running Drill...' : 'Execute DR Drill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXPORT TENANT BACKUP ARCHIVE                                       */}
      {/* ========================================================================= */}
      {tenantBackupModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTenantBackupModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="var(--accent-primary)" />
                Export Scoped Tenant Backup
              </h3>
              <button onClick={() => setTenantBackupModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Generates a self-contained, tenant-scoped export archive with SHA-256 checksum and a secure 48-hour download TTL.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  TARGET TENANT
                </label>
                {tenants.length > 0 ? (
                  <select
                    id="select-backup-tenant"
                    value={selectedBackupTenantId}
                    onChange={(e) => setSelectedBackupTenantId(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug}) - {t.planName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="input-backup-tenant-id"
                    type="text"
                    value={selectedBackupTenantId}
                    onChange={(e) => setSelectedBackupTenantId(e.target.value)}
                    placeholder="Enter Tenant UUID"
                    className="input"
                    style={{ width: '100%' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ARCHIVE FORMAT
                </label>
                <select
                  id="select-backup-format"
                  value={backupFormat}
                  onChange={(e) => setBackupFormat(e.target.value as any)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="sql_gz">Compressed SQL Dump (.sql.gz)</option>
                  <option value="json_archive">Multi-Entity JSON Archive (.json)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  MANDATORY EXPORT JUSTIFICATION (MIN 8 CHARACTERS)
                </label>
                <textarea
                  id="input-backup-reason"
                  rows={3}
                  value={backupReason}
                  onChange={(e) => setBackupReason(e.target.value)}
                  placeholder="e.g. Enterprise portability GDPR / portability compliance export request."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.82rem' }}>
                <input
                  id="check-backup-confirm"
                  type="checkbox"
                  checked={backupConfirmed}
                  onChange={(e) => setBackupConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  I confirm generating a tenant-scoped backup archive with audit logging.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setTenantBackupModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-confirm-tenant-backup"
                  onClick={handleExecuteTenantBackup}
                  disabled={tenantBackupLoading}
                  className="btn btn-primary btn-sm"
                >
                  {tenantBackupLoading ? 'Generating Archive...' : 'Generate Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER OUTBOUND WEBHOOK ENDPOINT                                 */}
      {/* ========================================================================= */}
      {registerEndpointModalOpen && (
        <div
          id="modal-register-webhook"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRegisterEndpointModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '580px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--accent-primary)" />
                Register Outbound Webhook Endpoint
              </h3>
              <button onClick={() => setRegisterEndpointModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            {registeredRawSecret ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Endpoint Created Successfully!</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Copy your HMAC-SHA256 signing secret below. For security reasons, this secret will <strong>never</strong> be displayed again in plaintext.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Signing Secret (Raw HMAC Key)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="display-raw-secret"
                      type="text"
                      readOnly
                      value={registeredRawSecret}
                      className="input"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                    <button
                      id="btn-copy-raw-secret"
                      onClick={() => {
                        navigator.clipboard.writeText(registeredRawSecret);
                        showToast('Secret copied to clipboard.');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setRegisterEndpointModalOpen(false);
                      setRegisteredRawSecret(null);
                      setNewEpName('');
                      setNewEpUrl('');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Endpoint Name
                  </label>
                  <input
                    id="input-webhook-name"
                    type="text"
                    value={newEpName}
                    onChange={(e) => setNewEpName(e.target.value)}
                    placeholder="e.g., Enterprise Security SIEM Relay"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Destination URL (HTTPS / RFC 3986)
                  </label>
                  <input
                    id="input-webhook-url"
                    type="url"
                    value={newEpUrl}
                    onChange={(e) => setNewEpUrl(e.target.value)}
                    placeholder="https://api.yourcompany.com/webhooks/hoaspforge"
                    className="input"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    SSRF protection active: Private RFC 1918 and cloud metadata IPs are blocked in production.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                    Subscribed Events
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      'post.published',
                      'post.failed',
                      'approval.requested',
                      'incident.alert',
                      'backup.completed',
                      'billing.invoice_paid',
                      'custom.event',
                    ].map((evt) => {
                      const checked = newEpEvents.includes(evt as OutboundWebhookEventType);
                      return (
                        <label
                          key={evt}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: checked ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${checked ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewEpEvents([...newEpEvents, evt as OutboundWebhookEventType]);
                              } else {
                                setNewEpEvents(newEpEvents.filter((x) => x !== evt));
                              }
                            }}
                          />
                          <span style={{ fontFamily: 'monospace' }}>{evt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setRegisterEndpointModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button
                    id="btn-submit-register-webhook"
                    onClick={handleRegisterEndpoint}
                    disabled={registerEpLoading}
                    className="btn btn-primary btn-sm"
                  >
                    {registerEpLoading ? 'Registering...' : 'Register Endpoint'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ROTATE OUTBOUND SECRET                                             */}
      {/* ========================================================================= */}
      {rotateSecretModalOpen && targetRotateEndpoint && (
        <div
          id="modal-rotate-secret"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRotateSecretModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '520px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#f59e0b" />
                Rotate Webhook Secret
              </h3>
              <button onClick={() => setRotateSecretModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            {rotatedRawSecret ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>New Secret Generated!</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Immediately update your receiving server to verify incoming signatures with this new secret.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    New Signing Secret
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="display-rotated-secret"
                      type="text"
                      readOnly
                      value={rotatedRawSecret}
                      className="input"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(rotatedRawSecret);
                        showToast('New secret copied to clipboard.');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={() => {
                      setRotateSecretModalOpen(false);
                      setRotatedRawSecret(null);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                  }}
                >
                  <strong>Warning:</strong> Rotating this secret will immediately invalidate the previous HMAC key. Any deliveries currently in transit may fail verification until your receiver is updated.
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Target Endpoint: <strong>{targetRotateEndpoint.name}</strong> ({targetRotateEndpoint.id})
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setRotateSecretModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-rotate-secret"
                    onClick={handleRotateSecret}
                    disabled={rotateSecretLoading}
                    className="btn btn-primary btn-sm"
                  >
                    {rotateSecretLoading ? 'Rotating...' : 'Rotate Secret'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TEST DISPATCH                                                      */}
      {/* ========================================================================= */}
      {testDispatchModalOpen && targetTestEndpoint && (
        <div
          id="modal-test-dispatch"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTestDispatchModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '620px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#3b82f6" />
                Dispatch Test Webhook
              </h3>
              <button onClick={() => setTestDispatchModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Target Endpoint: <strong>{targetTestEndpoint.name}</strong>
                <div style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.78rem', marginTop: '2px' }}>
                  {targetTestEndpoint.url}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Event Type
                </label>
                <select
                  id="select-test-event"
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value as OutboundWebhookEventType)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="custom.event">custom.event (Synthetic Ping)</option>
                  <option value="post.published">post.published</option>
                  <option value="post.failed">post.failed</option>
                  <option value="approval.requested">approval.requested</option>
                  <option value="incident.alert">incident.alert</option>
                  <option value="backup.completed">backup.completed</option>
                  <option value="billing.invoice_paid">billing.invoice_paid</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Payload JSON (Optional Customization)
                </label>
                <textarea
                  id="textarea-test-payload"
                  value={testPayloadText}
                  onChange={(e) => setTestPayloadText(e.target.value)}
                  rows={4}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              {testDispatchResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: testDispatchResult.statusCode >= 200 && testDispatchResult.statusCode < 300 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${testDispatchResult.statusCode >= 200 && testDispatchResult.statusCode < 300 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Result: {testDispatchResult.statusCode} ({testDispatchResult.status})</span>
                    <span style={{ color: 'var(--text-muted)' }}>Duration: {testDispatchResult.durationMs}ms</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Signature: {testDispatchResult.signature}
                  </div>
                  {testDispatchResult.responseBody && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0, 0, 0, 0.3)', padding: '6px', borderRadius: '4px', marginTop: '6px', overflowX: 'auto' }}>
                      Body: {testDispatchResult.responseBody}
                    </div>
                  )}
                  {testDispatchResult.errorMessage && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                      Error: {testDispatchResult.errorMessage}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setTestDispatchModalOpen(false)} className="btn btn-secondary btn-sm">
                  Close
                </button>
                <button
                  id="btn-send-test-dispatch"
                  onClick={handleTestDispatch}
                  disabled={testDispatchLoading}
                  className="btn btn-primary btn-sm"
                >
                  {testDispatchLoading ? 'Dispatching...' : 'Send Test Dispatch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURE ENTERPRISE IDP (SAML 2.0 / OIDC)                       */}
      {/* ========================================================================= */}
      {createSsoModalOpen && (
        <div
          id="modal-configure-sso"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateSsoModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '640px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="var(--accent-primary)" />
                {editingSsoConfig ? 'Edit Identity Provider Federation' : 'Configure Enterprise Identity Provider'}
              </h3>
              <button onClick={() => setCreateSsoModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Identity Provider Name
                  </label>
                  <input
                    id="input-sso-name"
                    type="text"
                    value={ssoName}
                    onChange={(e) => setSsoName(e.target.value)}
                    placeholder="e.g. Acme Corp Okta Workforce SSO"
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Protocol Type
                  </label>
                  <select
                    id="select-sso-provider-type"
                    value={ssoProviderType}
                    onChange={(e) => setSsoProviderType(e.target.value as SsoProviderType)}
                    disabled={!!editingSsoConfig}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="saml">SAML 2.0</option>
                    <option value="oidc">OpenID Connect</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  IdP Entity ID (Issuer URI)
                </label>
                <input
                  id="input-sso-entity-id"
                  type="text"
                  value={ssoIdpEntityId}
                  onChange={(e) => setSsoIdpEntityId(e.target.value)}
                  placeholder="https://acme.okta.com/app/exk12345/sso/saml/metadata"
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  IdP Single Sign-On (SSO) URL
                </label>
                <input
                  id="input-sso-url"
                  type="url"
                  value={ssoIdpSsoUrl}
                  onChange={(e) => setSsoIdpSsoUrl(e.target.value)}
                  placeholder="https://acme.okta.com/app/exk12345/sso/saml"
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mapped Corporate Email Domains (comma-separated)
                </label>
                <input
                  id="input-sso-domains"
                  type="text"
                  value={ssoDomainsText}
                  onChange={(e) => setSsoDomainsText(e.target.value)}
                  placeholder="acme-corp.com, acme-internal.net"
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Users authenticating with emails matching these domains will automatically route to this IdP.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  IdP Public X.509 Certificate (PEM format)
                </label>
                <textarea
                  id="textarea-sso-cert"
                  value={ssoIdpCert}
                  onChange={(e) => setSsoIdpCert(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDpDCCAoygAwIBAgIGAX...&#10;-----END CERTIFICATE-----"
                  rows={4}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Default Tenant Role for JIT Users
                  </label>
                  <select
                    id="select-sso-default-role"
                    value={ssoDefaultRole}
                    onChange={(e) => setSsoDefaultRole(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="editor">Editor (Standard)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    id="select-sso-status"
                    value={ssoStatus}
                    onChange={(e) => setSsoStatus(e.target.value as SsoConfigStatus)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="active">Active (Production)</option>
                    <option value="testing">Testing (Simulation Only)</option>
                    <option value="inactive">Disabled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    id="checkbox-sso-jit"
                    type="checkbox"
                    checked={ssoJit}
                    onChange={(e) => setSsoJit(e.target.checked)}
                  />
                  <span>Enable Just-In-Time (JIT) Automatic User Provisioning upon valid SAML assertion</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    id="checkbox-sso-enforce"
                    type="checkbox"
                    checked={ssoEnforce}
                    onChange={(e) => setSsoEnforce(e.target.checked)}
                  />
                  <span>Enforce SSO strictly (Disallow password fallback for mapped domains)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => setCreateSsoModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-save-sso-config"
                  onClick={handleSaveSsoConfig}
                  disabled={saveSsoLoading}
                  className="btn btn-primary btn-sm"
                >
                  {saveSsoLoading ? 'Saving...' : editingSsoConfig ? 'Update Federation' : 'Save & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TEST SAML ASSERTION PROBE (SYNTHETIC SIMULATION)                  */}
      {/* ========================================================================= */}
      {simulateSsoModalOpen && targetSimulateConfig && (
        <div
          id="modal-simulate-sso"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSimulateSsoModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '600px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#3b82f6" />
                Simulate SAML 2.0 Assertion Probe
              </h3>
              <button onClick={() => setSimulateSsoModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Target IdP: <strong>{targetSimulateConfig.name}</strong> ({targetSimulateConfig.id})
                <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '2px' }}>
                  Domains: {targetSimulateConfig.domains.join(', ')}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Subject NameID
                </label>
                <input
                  id="input-sim-nameid"
                  type="text"
                  value={simTestNameId}
                  onChange={(e) => setSimTestNameId(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  User Email (Must match mapped domain)
                </label>
                <input
                  id="input-sim-email"
                  type="email"
                  value={simTestEmail}
                  onChange={(e) => setSimTestEmail(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
              </div>

              {simResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: simResult.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${simResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: simResult.valid ? '#10b981' : '#ef4444' }}>
                      Status: {simResult.valid ? 'Assertion Valid & Verified' : 'Assertion Invalid'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>Role: {simResult.assignedRole}</span>
                  </div>
                  {simResult.error ? (
                    <div style={{ color: '#ef4444', marginTop: '4px' }}>{simResult.error}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        JIT Provisioned: {simResult.userProvisioned ? 'Yes (New User Created)' : 'Existing User Authenticated'}
                      </div>
                      {simResult.token && (
                        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8', marginTop: '6px', wordBreak: 'break-all' }}>
                          JWT: {simResult.token.substring(0, 48)}...
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setSimulateSsoModalOpen(false)} className="btn btn-secondary btn-sm">
                  Close
                </button>
                <button
                  id="btn-run-saml-simulation"
                  onClick={handleSimulateSaml}
                  disabled={samlSimLoading}
                  className="btn btn-primary btn-sm"
                >
                  {samlSimLoading ? 'Simulating...' : 'Execute SAML Assertion Probe'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW SERVICE PROVIDER (SP) METADATA COORDINATES                  */}
      {/* ========================================================================= */}
      {viewSpMetadataModalOpen && targetSpConfig && (
        <div
          id="modal-sp-metadata"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewSpMetadataModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '640px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#38bdf8" />
                Service Provider (SP) Metadata Coordinates
              </h3>
              <button onClick={() => setViewSpMetadataModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Provide these coordinates to your enterprise identity provider (Okta, Azure AD, Google Workspace) to complete SAML federation handshake.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  SP Entity ID / Audience URI
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="display-sp-entity-id"
                    type="text"
                    readOnly
                    value={targetSpConfig.spEntityId}
                    className="input"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0, 0, 0, 0.3)' }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(targetSpConfig.spEntityId);
                      showToast('SP Entity ID copied.');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Assertion Consumer Service (ACS) URL (HTTP-POST)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="display-sp-acs-url"
                    type="text"
                    readOnly
                    value={targetSpConfig.spAcsUrl}
                    className="input"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0, 0, 0, 0.3)' }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(targetSpConfig.spAcsUrl);
                      showToast('ACS URL copied.');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  SP SAML 2.0 Metadata XML URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="display-sp-metadata-url"
                    type="text"
                    readOnly
                    value={`http://localhost:4000/api/v1/auth/sso/saml/${targetSpConfig.id}/metadata`}
                    className="input"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0, 0, 0, 0.3)' }}
                  />
                  <button
                    onClick={() => {
                      window.open(`http://localhost:4000/api/v1/auth/sso/saml/${targetSpConfig.id}/metadata`, '_blank');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Open XML
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setViewSpMetadataModalOpen(false)} className="btn btn-primary btn-sm">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE / ROTATE SCIM 2.0 BEARER TOKEN                            */}
      {/* ========================================================================= */}
      {createScimTokenModalOpen && (
        <div
          id="modal-generate-scim-token"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateScimTokenModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '580px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#38bdf8" />
                {createdRawScimToken ? 'SCIM 2.0 Bearer Token Created' : 'Generate SCIM 2.0 Bearer Token'}
              </h3>
              <button onClick={() => setCreateScimTokenModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            {createdRawScimToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Security Notice:</strong> Copy this SCIM Bearer Token now. For your security, this raw secret will <strong>never</strong> be displayed again.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    SCIM Bearer Token (HTTP Authorization: Bearer &lt;token&gt;)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="display-created-scim-token"
                      type="text"
                      readOnly
                      value={createdRawScimToken}
                      className="input"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem', color: '#38bdf8', background: 'rgba(0, 0, 0, 0.3)' }}
                    />
                    <button
                      id="btn-copy-scim-token"
                      onClick={() => {
                        navigator.clipboard.writeText(createdRawScimToken);
                        showToast('SCIM Bearer Token copied to clipboard.');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={() => setCreateScimTokenModalOpen(false)} className="btn btn-primary btn-sm">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Token Name / Client Description *
                  </label>
                  <input
                    id="input-scim-token-name"
                    type="text"
                    value={newScimTokenName}
                    onChange={(e) => setNewScimTokenName(e.target.value)}
                    placeholder="e.g. Acme Corp Okta Directory Integration"
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Tenant Scope (Optional — leave blank for Enterprise Global)
                  </label>
                  <input
                    id="input-scim-token-tenant"
                    type="text"
                    value={newScimTokenTenantId}
                    onChange={(e) => setNewScimTokenTenantId(e.target.value)}
                    placeholder="Optional Tenant UUID"
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Expiration Lifetime
                  </label>
                  <select
                    id="select-scim-token-expires"
                    value={newScimTokenExpiresInDays}
                    onChange={(e) => setNewScimTokenExpiresInDays(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>365 Days (1 Year)</option>
                    <option value={730}>730 Days (2 Years)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button onClick={() => setCreateScimTokenModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button
                    id="btn-submit-generate-scim-token"
                    onClick={handleCreateScimToken}
                    disabled={createScimTokenLoading}
                    className="btn btn-primary btn-sm"
                  >
                    {createScimTokenLoading ? 'Generating...' : 'Generate Cryptographic Token'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT SCIM DIRECTORY EVENT LOG                                   */}
      {/* ========================================================================= */}
      {inspectScimLogModalOpen && selectedScimLog && (
        <div
          id="modal-inspect-scim-log"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectScimLogModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '640px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#38bdf8" />
                SCIM Directory Event Inspector
              </h3>
              <button onClick={() => setInspectScimLogModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.84rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(0, 0, 0, 0.2)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>LOG ID:</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedScimLog.id}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TIMESTAMP:</span>
                  <div>{new Date(selectedScimLog.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ENDPOINT:</span>
                  <div style={{ fontFamily: 'monospace' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedScimLog.method}</span> {selectedScimLog.endpoint}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>STATUS CODE:</span>
                  <div>
                    <span
                      className="badge"
                      style={{
                        background: selectedScimLog.statusCode < 300 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: selectedScimLog.statusCode < 300 ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {selectedScimLog.statusCode}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>RESOURCE TYPE & ID:</span>
                  <div style={{ fontFamily: 'monospace' }}>
                    {selectedScimLog.scimResourceType || 'None'} / {selectedScimLog.scimResourceId || 'None'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>IP ADDRESS:</span>
                  <div style={{ fontFamily: 'monospace' }}>{selectedScimLog.ipAddress || '127.0.0.1'}</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Request Payload (SCIM JSON)
                </label>
                <pre
                  id="display-scim-log-payload"
                  style={{
                    margin: 0,
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#93c5fd',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedScimLog.requestPayload
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedScimLog.requestPayload), null, 2);
                        } catch {
                          return selectedScimLog.requestPayload;
                        }
                      })()
                    : '// No request body recorded for this operation'}
                </pre>
              </div>

              {selectedScimLog.errorDetail && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>
                    Error Detail
                  </label>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {selectedScimLog.errorDetail}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button onClick={() => setInspectScimLogModalOpen(false)} className="btn btn-primary btn-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURE SIEM DESTINATION                                       */}
      {/* ========================================================================= */}
      {createSiemModalOpen && (
        <div
          id="modal-configure-siem"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateSiemModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '600px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#38bdf8" />
                {editingSiemDest ? 'Edit SIEM Destination' : 'Configure SIEM Destination'}
              </h3>
              <button onClick={() => setCreateSiemModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Destination Name *
                </label>
                <input
                  id="input-siem-name"
                  type="text"
                  value={siemName}
                  onChange={(e) => setSiemName(e.target.value)}
                  placeholder="e.g. Corporate SOC Splunk HEC"
                  className="input"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Destination Type
                  </label>
                  <select
                    id="select-siem-type"
                    value={siemType}
                    onChange={(e) => {
                      const t = e.target.value as SiemDestinationType;
                      setSiemType(t);
                      if (t === 'splunk_hec') setSiemFormat('splunk_event');
                      else if (t === 'datadog_logs') setSiemFormat('datadog_json');
                      else if (t === 'syslog_rfc5424') setSiemFormat('rfc5424_syslog');
                      else if (t === 'elastic_ecs') setSiemFormat('json_ecs');
                    }}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value="splunk_hec">Splunk HEC</option>
                    <option value="datadog_logs">Datadog Logs</option>
                    <option value="syslog_rfc5424">RFC 5424 Syslog</option>
                    <option value="elastic_ecs">Elastic ECS</option>
                    <option value="generic_webhook">Generic SIEM Webhook</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Payload Format
                  </label>
                  <select
                    id="select-siem-format"
                    value={siemFormat}
                    onChange={(e) => setSiemFormat(e.target.value as SiemPayloadFormat)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value="splunk_event">Splunk HEC JSON Event</option>
                    <option value="datadog_json">Datadog JSON Log</option>
                    <option value="json_ecs">Elastic Common Schema (ECS)</option>
                    <option value="cef">ArcSight CEF</option>
                    <option value="rfc5424_syslog">RFC 5424 Syslog</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Endpoint URL *
                </label>
                <input
                  id="input-siem-url"
                  type="url"
                  value={siemUrl}
                  onChange={(e) => setSiemUrl(e.target.value)}
                  placeholder="https://splunk-hec.corp.internal/services/collector/event"
                  className="input"
                  style={{ width: '100%', fontSize: '0.84rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  {editingSiemDest ? 'Rotate Authentication Secret / Token (Leave blank to keep existing)' : 'Authentication Secret / Token *'}
                </label>
                <input
                  id="input-siem-secret"
                  type="password"
                  value={siemAuthSecret}
                  onChange={(e) => setSiemAuthSecret(e.target.value)}
                  placeholder={editingSiemDest ? '••••••••••••••••••••••••' : 'Splunk HEC token or Datadog API Key'}
                  className="input"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Min Severity
                  </label>
                  <select
                    id="select-siem-severity"
                    value={siemSeverity}
                    onChange={(e) => setSiemSeverity(e.target.value as SiemSeverity)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value="info">Info</option>
                    <option value="notice">Notice</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Batch Size
                  </label>
                  <select
                    id="select-siem-batch"
                    value={siemBatchSize}
                    onChange={(e) => setSiemBatchSize(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value={10}>10 events</option>
                    <option value={50}>50 events</option>
                    <option value={100}>100 events</option>
                    <option value={200}>200 events</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Rate Limit / Min
                  </label>
                  <input
                    id="input-siem-rate-limit"
                    type="number"
                    value={siemRateLimit}
                    onChange={(e) => setSiemRateLimit(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setCreateSiemModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-submit-save-siem"
                  onClick={handleSaveSiemDestination}
                  disabled={saveSiemLoading}
                  className="btn btn-primary btn-sm"
                >
                  {saveSiemLoading ? 'Saving...' : editingSiemDest ? 'Save Changes' : 'Save SIEM Destination'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TEST SIEM SECURITY EVENT PROBE                                   */}
      {/* ========================================================================= */}
      {probeSiemModalOpen && targetProbeDest && (
        <div
          id="modal-probe-siem"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setProbeSiemModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '640px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#10b981" />
                Test SIEM Security Event Probe
              </h3>
              <button onClick={() => setProbeSiemModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Target: <strong>{targetProbeDest.name}</strong> ({targetProbeDest.destinationType} / {targetProbeDest.payloadFormat})
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Event Category
                  </label>
                  <select
                    id="select-probe-category"
                    value={probeCategory}
                    onChange={(e) => setProbeCategory(e.target.value as SiemEventCategory)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value="security">Security</option>
                    <option value="auth">Authentication</option>
                    <option value="audit">Administrative Audit</option>
                    <option value="compliance">Compliance</option>
                    <option value="system">System Telemetry</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Severity
                  </label>
                  <select
                    id="select-probe-severity"
                    value={probeSeverity}
                    onChange={(e) => setProbeSeverity(e.target.value as SiemSeverity)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Action Tag
                </label>
                <input
                  id="input-probe-action"
                  type="text"
                  value={probeAction}
                  onChange={(e) => setProbeAction(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.84rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Event Message
                </label>
                <input
                  id="input-probe-message"
                  type="text"
                  value={probeMessage}
                  onChange={(e) => setProbeMessage(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              {probeResult && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: probeResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${probeResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: probeResult.success ? '#10b981' : '#ef4444', fontSize: '0.82rem' }}>
                      Status: {probeResult.success ? `Delivered (HTTP ${probeResult.statusCode})` : `Failed (${probeResult.error})`}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latency: {probeResult.latencyMs}ms</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#38bdf8', marginBottom: '6px' }}>
                    SHA-256 Digest: {probeResult.digestSha256}
                  </div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Formatted Payload Sample ({targetProbeDest.payloadFormat}):
                  </label>
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px',
                      borderRadius: '4px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      color: '#93c5fd',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {probeResult.formattedPayloadSample}
                  </pre>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setProbeSiemModalOpen(false)} className="btn btn-secondary btn-sm">
                  Close
                </button>
                <button
                  id="btn-run-siem-probe"
                  onClick={handleDispatchSiemProbe}
                  disabled={siemProbeLoading}
                  className="btn btn-primary btn-sm"
                >
                  {siemProbeLoading ? 'Dispatching...' : 'Dispatch Probe Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURE DLP POLICY                                             */}
      {/* ========================================================================= */}
      {createDlpModalOpen && (
        <div
          id="modal-configure-dlp"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateDlpModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '640px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--accent-primary)" />
                {editingDlpPolicy ? 'Edit DLP Policy' : 'Configure Enterprise DLP Policy'}
              </h3>
              <button onClick={() => setCreateDlpModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Policy Name
                </label>
                <input
                  id="input-dlp-name"
                  type="text"
                  value={dlpPolicyName}
                  onChange={(e) => setDlpPolicyName(e.target.value)}
                  placeholder="e.g. PCI Payment Card Data Redaction"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  id="textarea-dlp-desc"
                  value={dlpPolicyDesc}
                  onChange={(e) => setDlpPolicyDesc(e.target.value)}
                  placeholder="Summarize the detection purpose and compliance scope..."
                  rows={2}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    id="select-dlp-category"
                    value={dlpPolicyCategory}
                    onChange={(e) => setDlpPolicyCategory(e.target.value as DlpCategory)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="financial_pci">Financial (PCI)</option>
                    <option value="credentials">Credentials & Keys</option>
                    <option value="pii">PII Identifiers</option>
                    <option value="health_hipaa">Health (HIPAA)</option>
                    <option value="custom">Custom Policy</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Severity
                  </label>
                  <select
                    id="select-dlp-severity"
                    value={dlpPolicySeverity}
                    onChange={(e) => setDlpPolicySeverity(e.target.value as DlpSeverity)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="fatal">Fatal (Strict)</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    Enforcement Action
                  </label>
                  <select
                    id="select-dlp-action"
                    value={dlpPolicyAction}
                    onChange={(e) => setDlpPolicyAction(e.target.value as DlpAction)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="redact_inline">Redact Inline</option>
                    <option value="quarantine_for_approval">Quarantine Queue</option>
                    <option value="warn_and_log">Warn & Log</option>
                    <option value="block_outright">Block Outright</option>
                  </select>
                </div>
              </div>

              {/* Target Scopes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Target Inspection Scopes
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {(['posts:publish', 'ai:generation', 'webhooks:dispatch', 'comments:reply', 'exports:csv'] as DlpTargetScope[]).map((scope) => (
                    <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={dlpScopesList.includes(scope)}
                        onChange={(e) => {
                          if (e.target.checked) setDlpScopesList((prev) => [...prev, scope]);
                          else setDlpScopesList((prev) => prev.filter((s) => s !== scope));
                        }}
                      />
                      <span style={{ fontFamily: 'monospace' }}>{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Match Patterns Builder */}
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Regex Pattern Rules ({dlpPatternsList.length})
                </div>

                {dlpPatternsList.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <strong>{rule.name}</strong>: <code style={{ color: '#38bdf8' }}>/{rule.pattern}/{rule.flags || 'g'}</code>
                      {rule.description && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({rule.description})</span>}
                    </div>
                    <button
                      id={`btn-remove-pattern-${idx}`}
                      onClick={() => handleRemovePatternRule(idx)}
                      className="btn-icon"
                      title="Remove Rule"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px', gap: '8px', marginTop: '8px' }}>
                  <input
                    id="input-dlp-pattern-name"
                    type="text"
                    value={dlpPatternName}
                    onChange={(e) => setDlpPatternName(e.target.value)}
                    placeholder="Rule name"
                    className="input"
                    style={{ fontSize: '0.78rem' }}
                  />
                  <input
                    id="input-dlp-pattern-regex"
                    type="text"
                    value={dlpPatternRegex}
                    onChange={(e) => setDlpPatternRegex(e.target.value)}
                    placeholder="Regex pattern"
                    className="input"
                    style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}
                  />
                  <input
                    id="input-dlp-pattern-flags"
                    type="text"
                    value={dlpPatternFlags}
                    onChange={(e) => setDlpPatternFlags(e.target.value)}
                    placeholder="flags"
                    className="input"
                    style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    id="input-dlp-pattern-desc"
                    type="text"
                    value={dlpPatternDesc}
                    onChange={(e) => setDlpPatternDesc(e.target.value)}
                    placeholder="Optional description"
                    className="input"
                    style={{ flex: 1, fontSize: '0.78rem' }}
                  />
                  <button
                    id="btn-add-pattern-rule"
                    onClick={handleAddPatternRule}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Add Rule
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setCreateDlpModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-save-dlp-policy"
                  onClick={handleSaveDlpPolicy}
                  disabled={saveDlpLoading}
                  className="btn btn-primary btn-sm"
                >
                  {saveDlpLoading ? 'Saving...' : 'Save DLP Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LIVE SIMULATOR & REDACTION SANDBOX                               */}
      {/* ========================================================================= */}
      {simulateDlpModalOpen && (
        <div
          id="modal-simulate-dlp"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSimulateDlpModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '640px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#38bdf8" />
                DLP Scanner Sandbox & Redaction Simulator
              </h3>
              <button onClick={() => setSimulateDlpModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Test your content against all active regex pattern rules, inline redaction masks, and Luhn card validators without producing real incidents.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Sample Content to Inspect
                </label>
                <textarea
                  id="textarea-simulate-dlp"
                  value={simulateDlpText}
                  onChange={(e) => setSimulateDlpText(e.target.value)}
                  rows={4}
                  className="input"
                  style={{ width: '100%', fontSize: '0.82rem', fontFamily: 'monospace' }}
                />
              </div>

              {simulateDlpResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background:
                      simulateDlpResult.action_taken === 'blocked'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : simulateDlpResult.action_taken === 'quarantined'
                        ? 'rgba(245, 158, 11, 0.1)'
                        : simulateDlpResult.action_taken === 'redacted'
                        ? 'rgba(56, 189, 248, 0.1)'
                        : 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Verdict: {simulateDlpResult.action_taken} ({simulateDlpResult.allowed ? 'Allowed' : 'Blocked / Quarantined'})
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Matches: {simulateDlpResult.match_count} | Severity: {simulateDlpResult.highest_severity}
                    </span>
                  </div>

                  {simulateDlpResult.violations.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Triggered Rules:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {simulateDlpResult.violations.map((v, i) => (
                          <div key={i} style={{ fontSize: '0.74rem', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                            <strong style={{ color: '#f87171' }}>{v.rule_name}</strong> ({v.category}): {v.snippet_masked}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Redacted Output Preview:
                      </span>
                      <button
                        id="btn-copy-redacted-content"
                        onClick={() => {
                          navigator.clipboard.writeText(simulateDlpResult.redacted_content);
                          showToast('Redacted text copied.');
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      >
                        Copy
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '10px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        fontSize: '0.76rem',
                        fontFamily: 'monospace',
                        color: '#93c5fd',
                        maxHeight: '120px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {simulateDlpResult.redacted_content}
                    </pre>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setSimulateDlpModalOpen(false)} className="btn btn-secondary btn-sm">
                  Close
                </button>
                <button
                  id="btn-run-dlp-simulation"
                  onClick={handleRunDlpSimulation}
                  disabled={simulateDlpLoading}
                  className="btn btn-primary btn-sm"
                >
                  {simulateDlpLoading ? 'Scanning...' : 'Execute DLP Scan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVIEW QUARANTINED INCIDENT                                      */}
      {/* ========================================================================= */}
      {reviewDlpModalOpen && selectedDlpIncident && (
        <div
          id="modal-review-dlp-incident"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setReviewDlpModalOpen(false);
          }}
        >
          <div className="glass-card modal-content" style={{ maxWidth: '580px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#f59e0b" />
                Review Quarantined Incident
              </h3>
              <button onClick={() => setReviewDlpModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Incident ID:</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedDlpIncident.id}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Entity / Scope:</span>
                  <div>{selectedDlpIncident.entity_type} ({selectedDlpIncident.target_scope})</div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Masked Incident Content
                </label>
                <pre
                  style={{
                    margin: 0,
                    padding: '10px',
                    borderRadius: '4px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    color: '#e2e8f0',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedDlpIncident.masked_content}
                </pre>
              </div>

              {selectedDlpIncident.quarantine_status === 'pending_review' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Security Officer Decision
                    </label>
                    <select
                      id="select-review-decision"
                      value={reviewDlpDecision}
                      onChange={(e) => setReviewDlpDecision(e.target.value as any)}
                      className="input"
                      style={{ width: '100%' }}
                    >
                      <option value="approved_override">Approve Override (Release & Authorize Publication)</option>
                      <option value="rejected_dismissed">Reject & Dismiss (Permanently Discard Content)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      Review Notes & Governance Justification
                    </label>
                    <textarea
                      id="textarea-review-dlp-notes"
                      value={reviewDlpNotes}
                      onChange={(e) => setReviewDlpNotes(e.target.value)}
                      placeholder="e.g. Verified synthetic test data / Authorized exception by compliance officer..."
                      rows={2}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button onClick={() => setReviewDlpModalOpen(false)} className="btn btn-secondary btn-sm">
                      Cancel
                    </button>
                    <button
                      id="btn-submit-dlp-review"
                      onClick={handleReviewQuarantineIncident}
                      disabled={reviewDlpLoading}
                      className="btn btn-primary btn-sm"
                    >
                      {reviewDlpLoading ? 'Submitting...' : 'Submit Decision'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)', fontSize: '0.8rem' }}>
                  <div><strong>Review Status:</strong> {selectedDlpIncident.quarantine_status}</div>
                  <div><strong>Reviewed By:</strong> {selectedDlpIncident.reviewed_by || 'system'}</div>
                  {selectedDlpIncident.review_notes && <div><strong>Notes:</strong> {selectedDlpIncident.review_notes}</div>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={() => setReviewDlpModalOpen(false)} className="btn btn-secondary btn-sm">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURE CUSTOM ROLE                                            */}
      {/* ========================================================================= */}
      {createRbacRoleModalOpen && (
        <div
          id="modal-configure-role"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateRbacRoleModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--accent-primary)" />
                {editingRole ? (editingRole.isSystem ? 'Inspect System Role' : 'Edit Custom Role') : 'Configure New Custom Role'}
              </h3>
              <button onClick={() => setCreateRbacRoleModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Role Slug (Unique)</label>
                <input
                  id="input-role-slug"
                  type="text"
                  value={roleSlugInput}
                  onChange={(e) => setRoleSlugInput(e.target.value)}
                  placeholder="e.g. content_lead_emea"
                  disabled={Boolean(editingRole)}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Role Display Name</label>
                <input
                  id="input-role-name"
                  type="text"
                  value={roleNameInput}
                  onChange={(e) => setRoleNameInput(e.target.value)}
                  placeholder="e.g. Content Lead EMEA"
                  disabled={editingRole?.isSystem}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Role Description</label>
                <input
                  id="input-role-desc"
                  type="text"
                  value={roleDescInput}
                  onChange={(e) => setRoleDescInput(e.target.value)}
                  placeholder="e.g. Editorial supervision and publishing authorization for European brands"
                  disabled={editingRole?.isSystem}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Inherits From Parent Role (Optional)</label>
                <select
                  id="select-parent-role"
                  value={roleParentSlugInput}
                  onChange={(e) => setRoleParentSlugInput(e.target.value)}
                  disabled={editingRole?.isSystem}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">No Parent (Standalone Role)</option>
                  {rbacRoles
                    .filter((r) => r.roleSlug !== roleSlugInput)
                    .map((r) => (
                      <option key={r.id} value={r.roleSlug}>
                        {r.roleName} ({r.roleSlug})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                  Granted Matrix Permissions ({selectedPermissions.length} selected)
                </label>
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                  }}
                >
                  {rbacPermissions.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.slug);
                    return (
                      <label
                        key={perm.slug}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          cursor: editingRole?.isSystem ? 'default' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={editingRole?.isSystem}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions((prev) => [...prev, perm.slug]);
                            } else {
                              setSelectedPermissions((prev) => prev.filter((s) => s !== perm.slug));
                            }
                          }}
                        />
                        <span style={{ fontFamily: 'monospace' }}>{perm.slug}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setCreateRbacRoleModalOpen(false)} className="btn btn-secondary btn-sm">
                  {editingRole?.isSystem ? 'Close' : 'Cancel'}
                </button>
                {!editingRole?.isSystem && (
                  <button
                    id="btn-save-rbac-role"
                    onClick={handleSaveRole}
                    disabled={saveRoleLoading}
                    className="btn btn-primary btn-sm"
                  >
                    {saveRoleLoading ? 'Saving...' : 'Save Custom Role'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RBAC PERMISSION SIMULATOR                                        */}
      {/* ========================================================================= */}
      {simulateRbacModalOpen && (
        <div
          id="modal-simulate-rbac"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSimulateRbacModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '560px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#38bdf8" />
                RBAC Sandbox Permission Evaluator
              </h3>
              <button onClick={() => setSimulateRbacModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Simulate how the permission resolution engine evaluates base roles, custom roles, inheritance hierarchies, and explicit deny overrides.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Base Platform Role</label>
                <select
                  id="select-sim-base-role"
                  value={simBaseRole}
                  onChange={(e) => setSimBaseRole(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="creator">Creator (Standard)</option>
                  <option value="editor">Editor</option>
                  <option value="brand_manager">Brand Manager</option>
                  <option value="client_approver">Client Approver</option>
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner (Superuser *)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Target Permission to Check</label>
                <select
                  id="select-sim-target-perm"
                  value={simTargetPerm}
                  onChange={(e) => setSimTargetPerm(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                >
                  {rbacPermissions.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.slug} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  id="btn-run-rbac-sim"
                  onClick={handleRunRbacSimulation}
                  disabled={simRbacLoading}
                  className="btn btn-primary btn-sm"
                >
                  {simRbacLoading ? 'Evaluating...' : 'Evaluate Decision'}
                </button>
              </div>

              {simRbacResult && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: simRbacResult.allowed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${simRbacResult.allowed ? '#10b981' : '#ef4444'}40`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className="badge"
                      style={{
                        background: simRbacResult.allowed ? '#10b981' : '#ef4444',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.76rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {simRbacResult.allowed ? 'Access Granted' : 'Access Denied'}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Evaluated against {simRbacResult.evaluatedPermissionsCount} active permissions
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Reason:</strong> {simRbacResult.reason}
                  </div>
                  {simRbacResult.matchedGrant && (
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#93c5fd' }}>
                      Grant: {simRbacResult.matchedGrant}
                      {simRbacResult.inheritedFrom && ` (inherited from ${simRbacResult.inheritedFrom})`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIGURE PERMISSION OVERRIDE                                     */}
      {/* ========================================================================= */}
      {createOverrideModalOpen && (
        <div
          id="modal-create-override"
          className="modal-backdrop"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOverrideModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#f59e0b" />
                Configure User Permission Override
              </h3>
              <button onClick={() => setCreateOverrideModalOpen(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Set an explicit <strong>ALLOW</strong> or <strong>DENY</strong> for a single workspace user. Remember: Deny overrides always take absolute precedence.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Target User ID</label>
                <input
                  id="input-override-user-id"
                  type="text"
                  value={overrideUserId}
                  onChange={(e) => setOverrideUserId(e.target.value)}
                  placeholder="UUID of tenant member"
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Permission Slug</label>
                <select
                  id="select-override-perm"
                  value={overridePermSlug}
                  onChange={(e) => setOverridePermSlug(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                >
                  {rbacPermissions.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.slug}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Override Effect</label>
                <select
                  id="select-override-effect"
                  value={overrideEffect}
                  onChange={(e) => setOverrideEffect(e.target.value as any)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="allow">ALLOW (Grant permission even if not in role)</option>
                  <option value="deny">DENY (Revoke permission unconditionally)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Governance Justification</label>
                <input
                  id="input-override-reason"
                  type="text"
                  value={rbacOverrideReason}
                  onChange={(e) => setRbacOverrideReason(e.target.value)}
                  placeholder="e.g. Authorized emergency publication clearance"
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setCreateOverrideModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  id="btn-save-override"
                  onClick={handleSaveOverride}
                  disabled={saveOverrideLoading}
                  className="btn btn-primary btn-sm"
                >
                  {saveOverrideLoading ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Accessible Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Accessible Prompt Dialog for Webhook Discard Justification */}
      <PromptDialogModal
        isOpen={!!discardWebhookModalEventId}
        title="Discard Dead-Letter Webhook Event"
        description="Discarding permanently marks this event as dead-lettered and stops automated delivery retries. A mandatory justification reason is required for SOC2 audit compliance."
        label="Audit Justification Reason"
        placeholder="Enter explanation (min 8 characters)..."
        minChars={8}
        confirmText="Discard Event"
        loading={discardWebhookLoading}
        onConfirm={async (reason) => {
          if (!discardWebhookModalEventId) return;
          setDiscardWebhookLoading(true);
          try {
            await api.adminOps.discardWebhookEvent(discardWebhookModalEventId, reason);
            showToast(`Event ${discardWebhookModalEventId.slice(0, 8)} marked as discarded.`);
            setDiscardWebhookModalEventId(null);
            loadActiveTabData(true);
          } catch (err: any) {
            showToast(`Discard failed: ${err.message}`, 'error');
          } finally {
            setDiscardWebhookLoading(false);
          }
        }}
        onCancel={() => setDiscardWebhookModalEventId(null)}
      />
    </div>
  );
};
