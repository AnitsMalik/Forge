import type {
  ApiResponse,
  AnalyticsOverview,
  PostAnalyticsDetail,
  BrandBrain,
  WebsiteExtractionResult,
  AiContentGenerateRequest,
  AiContentGenerateResponse,
  AiTransformRequest,
  AiTransformResponse,
  DesignTemplate,
  CreateTemplateRequest,
  TemplateCategory,
  MetaFacebookPage,
  MetaInstagramAccount,
  PublishingJob,
  PublishingAuditLog,
  SubscriptionPlan,
  TenantSubscription,
  TenantUsageResponse,
  BillingInvoice,
  DunningStatusResponse,
  BillingNotification,
  BillingAuditLog,
  SuperadminBillingMetrics,
  SuperadminRevenueHistoryPoint,
  SuperadminTenantSubscriptionRow,
  BillingWebhookDelivery,
  WebhookDlqStats,
  BillingEmailLog,
  EntitlementAuditLogEntry,
  TenantUsageAlert,
  UsageAlertEvaluationResult,
  CopilotAutomationPlan,
  BrandGovernanceSettings,
  AutonomyLevel,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  ApprovalRequestItem,
  GovernanceAuditLog,
  UpdateGovernanceSettingsRequest,
  BrandPerformanceBaseline,
  GrowthRecommendation,
  ExperimentVariant,
  MultiPeriodBaselineSnapshot,
  LiftEstimateResult,
  EngagementHalfLifeResult,
  BrandGoal,
  GoalGapAnalysis,
  DimensionPerformanceReport,
  GrowthForecastReport,
  CrossChannelRepurposingRecommendation,
  AnalyticsPipelineResult,
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
  CreateIncidentAlertChannelDto,
  CreateIncidentAlertRuleDto,
  TriggerIncidentDto,
  AuditIntegrityVerification,
  ComplianceExportJob,
  ComplianceRetentionPolicy,
  CompliancePurgeCertificate,
  CustomRolePermission,
  RequestComplianceExportDto,
  UpdateRetentionPolicyDto,
  ExecuteDataPurgeDto,
  CreateCustomRoleDto,
  SocialWebhookEvent,
  SocialWebhookConfig,
  SocialWebhookReplayLog,
  SocialWebhookStats,
  ReplayWebhookRequest,
  ReplayBatchRequest,
  SimulateWebhookRequest,
  SystemSlaOverview,
  SystemStatusComponent,
  SystemMaintenanceWindow,
  PublicStatusPagePayload,
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
  EnterpriseSsoConfig,
  EnterpriseSsoLoginAudit,
  SsoOverview,
  SsoDomainLookupResult,
  SamlSimulationResult,
  CreateSsoConfigInput,
  UpdateSsoConfigInput,
  ScimApiToken,
  ScimSyncLog,
  ScimOverviewMetrics,
  CreateScimTokenInput,
  CreateScimTokenResponse,
  SiemDestinationConfig,
  CreateSiemDestinationInput,
  UpdateSiemDestinationInput,
  SiemDeliveryBatchLog,
  SiemOverviewMetrics,
  TestSiemProbeInput,
  TestSiemProbeResult,
  DlpPolicy,
  DlpIncident,
  DlpOverviewMetrics,
  DlpScanResult,
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
  WormVaultOverview,
  WormVaultRecord,
  WormDailySeal,
  WormInclusionProof,
  WormVerificationReport,
  WormTamperSimulationRequest,
  WormIngestionResult,
  WormLegalHold,
  CreateWormLegalHoldDto,
  WormVerificationToken,
  IssuedWormVerificationToken,
  IssueWormVerificationTokenDto,
  WormVerificationEvent,
  WormSigningKeyInfo,
  WormPublicSealVerification,
  WormProofVerificationRequest,
  CustomDomain,
  CustomDomainTelemetry,
  CustomDomainAccessLog,
  DomainDnsCheckResult,
  CreateCustomDomainDto,
  UpdateCustomDomainDto,
  UpdateWhiteLabelBrandingDto,
  PublicWhiteLabelConfig,
  AgentFleetDefinition,
  AgentFleetTelemetry,
  AgentFleetWorkflow,
  AgentWorkflowExecution,
  AgentExecutionStep,
  CreateAgentDefinitionDto,
  UpdateAgentDefinitionDto,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  DispatchWorkflowRunDto,
  CritiqueStepDto,
  EdgeCacheNode,
  EdgeNodeStatus,
  EdgeCacheRule,
  EdgePurgeRequest,
  EdgePurgeType,
  EdgeTrafficMetric,
  EdgeSimulationResult,
  EdgeCacheOverview,
  KnowledgeNode,
  KnowledgeEdge,
  SemanticVectorMemory,
  SemanticSearchQuery,
  SemanticSearchResult,
  GraphTraversalResult,
  KnowledgeGraphOverview,
  TenantChurnScore,
  CustomerLtvMetric,
  CustomerSuccessIntervention,
  RevenueIntelligenceTelemetry,
  AssessTenantRiskRequest,
  CreateInterventionRequest,
  UpdateInterventionRequest,
  PredictiveSimulationRequest,
  PredictiveSimulationResponse,
  GatewayRoute,
  TokenBucketQuota,
  ThrottleAuditLog,
  GatewayTelemetry,
  CreateGatewayRouteDto,
  UpdateGatewayRouteDto,
  SimulateThrottleRequest,
  SimulateThrottleResponse,
  ReplicationNode,
  ReplicationHeartbeatEvent,
  FailoverQuorumEvent,
  MeshTopologyTelemetry,
  CreateReplicationNodeInput,
  UpdateReplicationNodeInput,
  FailoverExecutionRequest,
  FailoverSimulationResult,
  ChaosExperiment,
  ChaosFaultExecution,
  ChaosTripwireEvent,
  ChaosResilienceTelemetry,
  CreateChaosExperimentDto,
  UpdateChaosExperimentDto,
  RunChaosSimulationDto,
  ChaosSimulationResult,
  SecretVaultKey,
  SecretKeyVersion,
  SecretAccessAuditLog,
  SecretRotationTelemetry,
  EnvelopeReEncryptSimulationResult,
  SecretType,
  VaultProvider,
  CloudCostAccount,
  TenantCostAttribution,
  FinOpsResourceRightsizing,
  FinOpsTelemetry,
  FinOpsCostSimulationResult,
  CloudProvider,
  CostCategory,
  RightsizingStatus,
  ComplianceControl,
  ComplianceEvidence,
  AuditorPortalSession,
  ContinuousComplianceTelemetry,
  ComplianceFrameworkType,
  ControlStatus,
  EvidenceCollectorType,
  SimulateComplianceAuditRequest,
  SimulateComplianceAuditResult,
  EventMeshTopic,
  EventMeshSubscription,
  EventMeshDlqMessage,
  EventMeshIdempotencyRecord,
  EventMeshTelemetry,
  EventMeshCircuitBreakerStatus,
  ReplayDlqRequest,
  ReplayDlqResult,
  DiscardDlqRequest,
  SimulateEventMeshRequest,
  SimulateEventMeshResult,
  DatabasePartitionConfig,
  DatabaseArchivalPolicy,
  DatabaseColdTierArchive,
  DatabasePartitionMaintenanceLog,
  DatabasePartitioningTelemetry,
  TriggerArchivalRequest,
  TriggerArchivalResult,
  RehydrateArchiveRequest,
  RehydrateArchiveResult,
  SimulatePartitioningRequest,
  SimulatePartitioningResult,
  DatabasePartitionType,
  DatabaseStorageTier,
  DatabaseCompressionFormat,
  QueryFederationSource,
  ReadReplicaCluster,
  CqrsMaterializedView,
  MaterializedViewRefreshLog,
  QueryFederationTelemetry,
  RefreshMaterializedViewRequest,
  RefreshMaterializedViewResult,
  BenchmarkFederatedQueryRequest,
  BenchmarkFederatedQueryResult,
  UpdateReplicaWeightRequest,
  UpdateReplicaWeightResult,
  FailoverReplicaRequest,
  FailoverReplicaResult,
  FederationBenchmarkQueryType,
  FederationRoutingStrategy,
  CqrsRefreshMode,
  MultiMasterNode,
  VectorClockState,
  ConflictResolutionPolicy,
  DistributedConvergenceLog,
  MultiMasterTelemetry,
  UpdateQuorumFencingRequest,
  UpdateQuorumFencingResult,
  UpdateResolutionPolicyRequest,
  UpdateResolutionPolicyResult,
  SimulateConflictRaceRequest,
  SimulateConflictRaceResult,
  ConflictResolutionStrategy,
  JitAccessRequest,
  EphemeralCredentialLease,
  DualAuthorizationRule,
  JitAuditSession,
  JitTelemetry,
  CreateJitAccessRequestInput,
  ApproveJitAccessRequestInput,
  ApproveJitAccessRequestResult,
  RevokeJitLeaseResult,
  SimulateBreakGlassInput,
  SimulateBreakGlassResult,
  JitElevationTier,
  JitAccessStatus,
  HsmKeyRing,
  EnvelopeDataEncryptionKey,
  KeyDerivationPolicy,
  HsmCryptoAuditLog,
  HsmTelemetry,
  CreateKeyRingInput,
  GenerateDekInput,
  EnvelopeEncryptInput,
  EnvelopeEncryptResult,
  EnvelopeDecryptInput,
  EnvelopeDecryptResult,
  RotateRootKekResult,
  ShredDekInput,
  ShredDekResult,
  HsmProviderType,
  DekPurpose,
  DekStatus,
  StorageBucket,
  ObjectStorageLifecycleRule,
  ImmutableObjectLock,
  PresignedUploadSession,
  ObjectStorageTelemetry,
  CreateBucketInput,
  CreateLifecycleRuleInput,
  CreateObjectLockInput,
  GeneratePresignedUploadInput,
  GeneratePresignedUploadResult,
  VerifyUploadedObjectInput,
  VerifyUploadedObjectResult,
  StorageProviderType,
  StorageClassTier,
  ObjectLockMode,
  PresignedUploadStatus,
  NeuralEmbeddingModel,
  RagKnowledgeCollection,
  SemanticVectorEmbedding,
  HybridSearchQueryLog,
  NeuralRagTelemetry,
  CreateModelInput,
  CreateCollectionInput,
  IngestVectorEmbeddingInput,
  HybridSearchQueryInput,
  HybridSearchQueryResult,
  EmbeddingProviderType,
  VectorDistanceMetric,
  VectorIndexType,
  CanvasRoom,
  CanvasLayerElement,
  CanvasDocumentSnapshot,
  OperationalTransformationOp,
  ActiveUserPresenceSession,
  CollaborativeCanvasTelemetry,
  CreateCanvasRoomInput,
  ApplyCanvasOpInput,
  ApplyCanvasOpResult,
  UpdatePresenceInput,
  UpdatePresenceResult,
  GetRoomStateResult,
  GpuVideoRenderJob,
  MotionCompositionTemplate,
  GpuTranscodeNode,
  RenderedVideoArtifact,
  VideoRenderingTelemetry,
  CreateRenderJobInput,
  CreateMotionTemplateInput,
  RegisterGpuNodeInput,
  UpdateJobProgressInput,
  SagaWorkflowDefinition,
  SagaWorkflowStepConfig,
  StateMachineInstance,
  WorkflowStepExecution,
  SagaCompensatingTransaction,
  SagaWorkflowTelemetry,
  CreateWorkflowDefinitionInput,
  TriggerWorkflowInstanceInput,
  StateMachineInstanceDetailResult,
  DatabaseShard,
  ShardRoutingRange,
  DistributedTransaction,
  DistributedTransactionParticipant,
  ShardRebalanceMigration,
  ShardingMeshTelemetry,
  KeyRouteResult,
  RegisterShardInput,
  CoordinateTransactionInput,
  TriggerRebalanceInput,
} from '@socialforge/shared';


const getBaseUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl.endsWith('/api/v1') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api/v1`;
  }
  // In browser context: use relative /api/v1 so requests go through Vite dev proxy or same-origin deployment
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return 'http://localhost:4000/api/v1';
};

const BASE_URL = getBaseUrl();

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('sf_access_token');
  }

  public setToken(token: string) {
    localStorage.setItem('sf_access_token', token);
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('sf_refresh_token');
  }

  public setRefreshToken(token: string) {
    localStorage.setItem('sf_refresh_token', token);
  }

  public clearToken() {
    localStorage.removeItem('sf_access_token');
    localStorage.removeItem('sf_refresh_token');
  }

  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)sf_csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const token = this.getToken();
    const csrfToken = this.getCsrfToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });

    // Check for 401 Unauthorized - attempt silent token rotation (except on auth routes)
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register') &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/logout')
    ) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry original request with fresh token
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        const retryRes = await fetch(url, {
          credentials: 'include',
          ...options,
          headers,
        });
        let retryData: ApiResponse<T>;
        try {
          retryData = await retryRes.json();
        } catch {
          retryData = { success: false, error: 'Auth refresh received non-JSON response' } as any;
        }
        if (retryRes.ok && retryData.success) {
          return retryData.data as T;
        }
      }
    }

    let data: ApiResponse<T>;
    const resText = await response.text();
    try {
      data = JSON.parse(resText);
    } catch {
      if (resText.trim().startsWith('<')) {
        throw new Error(
          `API server returned HTML instead of JSON (HTTP ${response.status}). Ensure the Node.js API server is started and running on port 4000.`
        );
      }
      throw new Error(`Invalid JSON response from server (HTTP ${response.status}): ${resText.slice(0, 100)}`);
    }

    if (!response.ok || (data && typeof data === 'object' && 'success' in data && (data as any).success === false)) {
      let errorMessage =
        data.error?.message ||
        (typeof data.error === 'string' ? data.error : null) ||
        (data as any).message ||
        `Request failed with status ${response.status}`;
      if (data.error?.details && Array.isArray(data.error.details) && data.error.details.length > 0) {
        const detailsStr = data.error.details.map((d: any) => `${d.field ? `${d.field}: ` : ''}${d.issue || d.message}`).join(', ');
        errorMessage = `${errorMessage} (${detailsStr})`;
      }
      const customErr: any = new Error(errorMessage);
      customErr.data = (data as any).data;
      customErr.metaCode = (data.error as any)?.metaCode || (data.data as any)?.metaCode;
      customErr.metaType = (data.error as any)?.metaType || (data.data as any)?.metaType;
      customErr.safeMessage = (data.error as any)?.safeMessage || (data.data as any)?.safeMessage;
      customErr.fbtraceId = (data.error as any)?.fbtraceId || (data.data as any)?.fbtraceId;
      throw customErr;
    }

    if (data && typeof data === 'object' && 'data' in data && (data as any).data !== undefined) {
      return (data as any).data as T;
    }

    return data as unknown as T;
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data?.tokens?.accessToken) {
          this.setToken(data.data.tokens.accessToken);
          if (data.data.tokens.refreshToken) {
            this.setRefreshToken(data.data.tokens.refreshToken);
          }
          return true;
        }
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  // Authentication
  auth = {
    login: (credentials: { email: string; password: string }) =>
      this.request<{ user: any; tenant: any; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(credentials),
        }
      ),
    sendSignupOtp: (payload: { email: string; agencySlug?: string }) =>
      this.request<{ success: boolean; message: string; expiresInSeconds: number; devOtp?: string }>(
        '/auth/signup/send-otp',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    verifyOtpAndRegister: (payload: {
      email: string;
      otp: string;
      fullName: string;
      password: string;
      agencyName: string;
      agencySlug: string;
    }) =>
      this.request<{
        success: boolean;
        message: string;
        data: { user: any; tenant: any; tokens: { accessToken: string; refreshToken: string } };
      }>('/auth/signup/verify-and-register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    register: (payload: {
      email: string;
      password: string;
      fullName: string;
      agencyName: string;
      agencySlug: string;
    }) =>
      this.request<{ user: any; tenant: any; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    logout: () =>
      this.request<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.getRefreshToken() }),
      }),
    refresh: () =>
      this.request<{ user: any; tenant: any; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.getRefreshToken() }),
        }
      ),
    forgotPassword: (email: string) =>
      this.request<{ success: boolean; message: string; devResetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (payload: { token: string; password: string }) =>
      this.request<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    verifyEmail: (token: string) =>
      this.request<{ success: boolean; message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    resendVerification: (email: string) =>
      this.request<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    me: () => this.request<{ user: any; tenant: any; brands: any[] }>('/auth/me'),
  };

  // Brands & Brand Brain
  brands = {
    list: () => this.request<any[]>('/brands'),
    get: (brandId: string) => this.request<any>(`/brands/${brandId}`),
    create: (payload: { name: string; slug: string; industry?: string; websiteUrl?: string; timezone?: string }) =>
      this.request<any>('/brands', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (brandId: string, payload: { name?: string; slug?: string; industry?: string; websiteUrl?: string; timezone?: string }) =>
      this.request<any>(`/brands/${brandId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (brandId: string) =>
      this.request<{ deletedBrandId: string }>(`/brands/${brandId}`, {
        method: 'DELETE',
      }),
    updateKit: (brandId: string, kit: any) =>
      this.request<any>(`/brands/${brandId}/kit`, {
        method: 'PUT',
        body: JSON.stringify(kit),
      }),
    getBrain: (brandId: string) =>
      this.request<BrandBrain>(`/brands/${brandId}/brain`),
    updateBrain: (brandId: string, brain: Partial<BrandBrain>) =>
      this.request<BrandBrain>(`/brands/${brandId}/brain`, {
        method: 'PUT',
        body: JSON.stringify(brain),
      }),
    extractWebsite: (brandId: string, url: string) =>
      this.request<WebsiteExtractionResult>(`/brands/${brandId}/brain/extract-website`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    getAiContext: (brandId: string) =>
      this.request<{ brandId: string; systemPrompt: string }>(`/brands/${brandId}/brain/ai-context`),
  };

  // Posts & Multi-Platform Variants
  posts = {
    list: (brandId: string, params?: { status?: string; campaignId?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return this.request<any[]>(`/brands/${brandId}/posts${query ? `?${query}` : ''}`);
    },
    get: (brandId: string, postId: string) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}`),
    create: (brandId: string, payload: any) =>
      this.request<any>(`/brands/${brandId}/posts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    schedule: (brandId: string, postId: string, scheduledFor: string) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduledFor }),
      }),
    submitApproval: (brandId: string, postId: string, payload?: { reviewerEmail?: string }) =>
      this.request<{ approvalRequest: any; magicLinkUrl: string }>(
        `/brands/${brandId}/posts/${postId}/submit-for-approval`,
        {
          method: 'POST',
          body: JSON.stringify(payload || {}),
        }
      ),
    publishNow: (brandId: string, postId: string, options?: boolean | { force?: boolean; platforms?: string[] }) => {
      const body = typeof options === 'boolean' ? { force: options } : options || {};
      return this.request<any>(`/brands/${brandId}/posts/${postId}/publish-now`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    batchPublish: (brandId: string, postIds: string[], force?: boolean) =>
      this.request<{ totalCount: number; publishedCount: number; skippedCount: number; failedCount: number; results: any[] }>(
        `/brands/${brandId}/posts/batch-publish`,
        {
          method: 'POST',
          body: JSON.stringify({ postIds, force }),
        }
      ),
    retry: (brandId: string, postId: string) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}/retry`, {
        method: 'POST',
      }),
    update: (brandId: string, postId: string, payload: { title?: string; baseContent?: string; scheduledFor?: string | null; status?: string; variants?: any[] }) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    duplicate: (brandId: string, postId: string) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}/duplicate`, {
        method: 'POST',
      }),
    updateVariant: (brandId: string, postId: string, platform: string, payload: { content?: string; hashtags?: string[]; hookTitle?: string; callToAction?: string }) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}/variants/${platform}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    regenerate: (brandId: string, postId: string, payload?: { prompt?: string; style?: string }) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    transform: (brandId: string, postId: string, payload: { operation: string; platform?: string; targetLanguage?: string }) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}/transform`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (brandId: string, postId: string) =>
      this.request<any>(`/brands/${brandId}/posts/${postId}`, {
        method: 'DELETE',
      }),
  };

  // External Client Magic Link Portal
  approvals = {
    list: (params?: { status?: string; entityType?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.entityType) q.set('entityType', params.entityType);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<any[]>(`/approvals${query}`);
    },
    get: (id: string) => this.request<any>(`/approvals/${id}`),
    decide: (id: string, decision: 'approved' | 'rejected' | 'changes_requested', reviewNotes?: string) =>
      this.request<any>(`/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes }),
      }),
    getMagicPreview: (token: string) =>
      this.request<{
        approvalStatus: string;
        post: any;
        brand: any;
        variants: any[];
        comments: any[];
      }>(`/approvals/magic/${token}`),
    actOnMagicLink: (token: string, action: 'approved' | 'changes_requested', comment?: string, reviewerName?: string) =>
      this.request<{ action: string; message: string }>(`/approvals/magic/${token}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, comment, reviewerName }),
      }),
  };

  // Unified Design Template System
  templates = {
    list: (brandId?: string, params?: { category?: string; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.category) qs.append('category', params.category);
      if (params?.q) qs.append('q', params.q);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      const endpoint = brandId ? `/brands/${brandId}/templates${query}` : `/templates${query}`;
      return this.request<any>(endpoint);
    },
    get: (brandIdOrTplId: string, templateId?: string) => {
      const endpoint = templateId ? `/brands/${brandIdOrTplId}/templates/${templateId}` : `/templates/${brandIdOrTplId}`;
      return this.request<any>(endpoint);
    },
    create: (first: any, second?: any) => {
      let brandId: string | undefined;
      let payload: any;
      if (typeof first === 'string') {
        brandId = first;
        payload = second;
      } else {
        payload = first;
        brandId = first?.brandId || second;
      }
      const endpoint = brandId ? `/brands/${brandId}/templates` : '/templates';
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: (templateId: string, payload: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/templates/${templateId}/versions` : `/templates/${templateId}/versions`;
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          changelog: payload.changelog || 'Updated template layout and layers',
        }),
      });
    },
    duplicate: (first: string, second?: string, third?: string) => {
      let endpoint: string;
      let body: any = undefined;
      if (third !== undefined) {
        endpoint = second ? `/brands/${second}/templates/${first}/duplicate` : `/templates/${first}/duplicate`;
        body = { name: third };
      } else if (second !== undefined) {
        endpoint = `/brands/${first}/templates/${second}/duplicate`;
      } else {
        endpoint = `/templates/${first}/duplicate`;
      }
      return this.request<any>(endpoint, {
        method: 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    },
    delete: (first: string, second?: string) => {
      const endpoint = second ? `/brands/${first}/templates/${second}` : `/templates/${first}`;
      return this.request<any>(endpoint, {
        method: 'DELETE',
      });
    },
    render: (brandId: string, payload: any) =>
      this.request<{
        templateId: string;
        aspectRatio: string;
        svg: string;
        dataUri: string;
        width: number;
        height: number;
        asset?: any;
      }>(`/brands/${brandId}/templates/render`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    generateAiPoster: (
      brandId: string,
      payload: {
        text: string;
        style?: string;
        aspectRatio?: string;
        customTopic?: string;
        saveToMediaLibrary?: boolean;
      }
    ) =>
      this.request<{
        headline: string;
        badge: string;
        subtext: string;
        metric?: string;
        metricLabel?: string;
        topic: string;
        style: string;
        aspectRatio: string;
        background: {
          type: 'gradient' | 'solid' | 'image';
          value: string;
          overlayOpacity: number;
        };
        layers: any[];
        svg?: string;
        dataUri?: string;
        asset?: any;
      }>(`/brands/${brandId}/templates/ai-poster`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    previewUrl: (brandId: string, params: Record<string, string>) => {
      const q = new URLSearchParams(params).toString();
      return `${BASE_URL}/brands/${brandId}/templates/preview?${q}`;
    },
    listVersions: (templateId: string) => {
      return this.request<{ success: boolean; versions: any[] }>(`/templates/${templateId}/versions`);
    },
    createVersion: (templateId: string, changelog?: string) => {
      return this.request<{ success: boolean; version: any }>(`/templates/${templateId}/versions`, {
        method: 'POST',
        body: JSON.stringify({ changelog }),
      });
    },
    rollbackVersion: (templateId: string, versionNumber: number) => {
      return this.request<any>(`/templates/${templateId}/versions/${versionNumber}/rollback`, {
        method: 'POST',
      });
    },
    validate: (template: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/templates/validate` : '/templates/validate';
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(template),
      });
    },
    select: (criteria: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/templates/select` : '/templates/select';
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(criteria),
      });
    },
    generateVariants: (template: any, platforms?: string[]) => {
      return this.request<any>('/templates/variants', {
        method: 'POST',
        body: JSON.stringify({ template, platforms }),
      });
    },
  };

  // Stage 3 Business Data Ingestion & Marketing Objects
  data = {
    listObjects: (params?: { brandId?: string; objectType?: string; source?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.append('brandId', params.brandId);
      if (params?.objectType) qs.append('objectType', params.objectType);
      if (params?.source) qs.append('source', params.source);
      if (params?.status) qs.append('status', params.status);
      if (params?.search) qs.append('search', params.search);
      if (params?.page) qs.append('page', String(params.page));
      if (params?.limit) qs.append('limit', String(params.limit));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ success: boolean; data: any[]; pagination: any }>(`/data/objects${query}`);
    },
    getObject: (id: string) => {
      return this.request<{ success: boolean; data: any }>(`/data/objects/${id}`);
    },
    createObject: (payload: { brandId: string; source?: string; objectType: string; properties: any; sourceRecordId?: string }) => {
      return this.request<{ success: boolean; data: any }>('/data/objects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    retryObject: (id: string) => {
      return this.request<{ success: boolean; data: any }>(`/data/objects/${id}/retry`, {
        method: 'POST',
      });
    },
    deleteObject: (id: string) => {
      return this.request<{ success: boolean }>(`/data/objects/${id}`, {
        method: 'DELETE',
      });
    },
    ingestCsv: (payload: { brandId: string; csvText: string; fileName?: string; objectType?: string }) => {
      return this.request<{ success: boolean; data: any }>('/data/ingest/csv', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    validateCsv: (payload: { csvText: string; objectType?: string }) => {
      return this.request<{ success: boolean; data: any }>('/data/validate/csv', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    ingestSheets: (payload: { brandId: string; connectionId?: string; spreadsheetId?: string; sheetName?: string; objectType?: string }) => {
      return this.request<{ success: boolean; data: any }>('/data/ingest/sheets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    ingestDrive: (payload: { brandId: string; connectionId?: string; folderId?: string; objectType?: string }) => {
      return this.request<{ success: boolean; data: any }>('/data/ingest/drive', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    listAuditLogs: (params?: { brandId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.append('brandId', params.brandId);
      if (params?.limit) qs.append('limit', String(params.limit));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ success: boolean; data: any[] }>(`/data/audit-logs${query}`);
    },
    getStats: (brandId?: string) => {
      const endpoint = brandId ? `/data/stats?brandId=${brandId}` : '/data/stats';
      return this.request<{ success: boolean; data: any }>(endpoint);
    },
    synthesizePost: (id: string, payload?: { platforms?: string[]; templateId?: string; requireApproval?: boolean; customPrompt?: string; autoApprove?: boolean; campaignId?: string; brandId?: string }) => {
      return this.request<{ success: boolean; data: any }>(`/data/objects/${id}/synthesize-post`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },
    batchSynthesize: (payload: { objectIds: string[]; brandId: string; platforms?: string[]; requireApproval?: boolean; autoApprove?: boolean }) => {
      return this.request<{ success: boolean; data: any[] }>('/data/objects/batch-synthesize', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  // Media Assets Library (Per-Brand Isolated Storage, Organization & Reuse)
  media = {
    list: (
      brandId: string,
      params?: string | { type?: string; folder?: string; tag?: string; q?: string; favorite?: boolean }
    ) => {
      if (!params) {
        return this.request<any[]>(`/brands/${brandId}/media`);
      }
      if (typeof params === 'string') {
        return this.request<any[]>(`/brands/${brandId}/media?type=${encodeURIComponent(params)}`);
      }
      const qs = new URLSearchParams();
      if (params.type) qs.set('type', params.type);
      if (params.folder) qs.set('folder', params.folder);
      if (params.tag) qs.set('tag', params.tag);
      if (params.q) qs.set('q', params.q);
      if (params.favorite !== undefined) qs.set('favorite', String(params.favorite));
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<any[]>(`/brands/${brandId}/media${query}`);
    },
    create: (brandId: string, payload: any) =>
      this.request<any>(`/brands/${brandId}/media`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (
      brandId: string,
      assetId: string,
      payload: {
        title?: string;
        fileName?: string;
        folder?: string;
        tags?: string[];
        favorite?: boolean;
        incrementUsage?: boolean;
        metadata?: Record<string, any>;
      }
    ) =>
      this.request<any>(`/brands/${brandId}/media/${assetId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    duplicate: (
      brandId: string,
      assetId: string,
      payload?: { title?: string; folder?: string; targetBrandId?: string }
    ) =>
      this.request<any>(`/brands/${brandId}/media/${assetId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    delete: (brandId: string, assetId: string) =>
      this.request<{ deletedId: string }>(`/brands/${brandId}/media/${assetId}`, {
        method: 'DELETE',
      }),
    bulkUpload: (brandId: string, assets: any[]) =>
      this.request<{ created: any[]; count: number }>(`/brands/${brandId}/media/bulk`, {
        method: 'POST',
        body: JSON.stringify({ assets }),
      }),
    bulkDelete: (brandId: string, assetIds: string[]) =>
      this.request<{ deletedIds: string[]; count: number }>(`/brands/${brandId}/media/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ assetIds }),
      }),
    bulkUpdate: (
      brandId: string,
      payload: { assetIds: string[]; folder?: string; tags?: string[]; addTags?: string[] }
    ) =>
      this.request<{ updatedCount: number; assetIds: string[] }>(`/brands/${brandId}/media/bulk-update`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getStorageSummary: (brandId: string) =>
      this.request<{
        brandId: string;
        brandName: string;
        usedBytes: number;
        limitBytes: number;
        percentUsed: number;
        assetCount: number;
        imagesCount: number;
        videosCount: number;
        documentsCount: number;
        planName: string;
      }>(`/brands/${brandId}/media/storage-summary`),
  };

  // Analytics Engine
  analytics = {
    getOverview: (
      brandId: string,
      params?: {
        timeRange?: string;
        startDate?: string;
        endDate?: string;
        platform?: string;
        page?: number;
        limit?: number;
      } | string
    ) => {
      let query = '';
      if (typeof params === 'string') {
        query = `?timeRange=${params}`;
      } else if (params) {
        const q = new URLSearchParams();
        if (params.timeRange) q.set('timeRange', params.timeRange);
        if (params.startDate) q.set('startDate', params.startDate);
        if (params.endDate) q.set('endDate', params.endDate);
        if (params.platform) q.set('platform', params.platform);
        if (params.page) q.set('page', String(params.page));
        if (params.limit) q.set('limit', String(params.limit));
        query = `?${q.toString()}`;
      }
      return this.request<any>(`/brands/${brandId}/analytics/overview${query}`);
    },
    getPostAnalytics: (brandId: string, postId: string) =>
      this.request<any>(`/brands/${brandId}/analytics/posts/${postId}`),
    getExportUrl: (brandId: string, format: 'csv' | 'json' = 'csv') => {
      const token = this.getToken();
      return `${BASE_URL}/brands/${brandId}/analytics/export?format=${format}&token=${token || ''}`;
    },
    exportReport: async (brandId: string, format: 'csv' | 'json' = 'csv') => {
      const token = this.getToken();
      const res = await fetch(`${BASE_URL}/brands/${brandId}/analytics/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to export report');
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `socialforge-report-${new Date().toISOString().split('T')[0]}.${format}`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { filename };
    },
    sync: (brandId: string, postId?: string) =>
      this.request<{
        syncedCount: number;
        failedCount: number;
        reauthRequired?: boolean;
        message: string;
      }>(`/brands/${brandId}/analytics/sync`, {
        method: 'POST',
        body: JSON.stringify(postId ? { postId } : {}),
      }),
    syncPost: (brandId: string, postId: string) =>
      this.request<any>(`/brands/${brandId}/analytics/posts/${postId}/sync`, {
        method: 'POST',
      }),
    getWinners: (brandId: string, params?: { winnerType?: string; platform?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.winnerType) q.set('winnerType', params.winnerType);
      if (params?.platform) q.set('platform', params.platform);
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ winners: any[]; count: number }>(`/brands/${brandId}/analytics/winners${query}`);
    },
    detectWinners: (brandId: string, forceRecheck?: boolean) => {
      return this.request<{ detectedCount: number; winners: any[] }>(`/brands/${brandId}/analytics/detect-winners`, {
        method: 'POST',
        body: JSON.stringify({ forceRecheck }),
      });
    },
    getLearningInsights: (brandId: string) => {
      return this.request<{ insights: any[]; learnedContext: any }>(`/brands/${brandId}/analytics/learning-insights`);
    },
    getBaselines: (brandId: string) => {
      return this.request<any>(`/brands/${brandId}/analytics/baselines`);
    },
    getAdvisorDiagnosis: (brandId: string) => {
      return this.request<{ success: boolean; data: any }>(`/brands/${brandId}/analytics/advisor`);
    },
    applyAdvisorProposal: (brandId: string, proposalId: string) => {
      return this.request<{ success: boolean; data: any }>(`/brands/${brandId}/analytics/advisor/apply`, {
        method: 'POST',
        body: JSON.stringify({ proposalId }),
      });
    },
  };

  // Short-form Video Pipeline (AI Video Motion & Reels Studio)
  videos = {
    listTemplates: (brandId: string) =>
      this.request<{ templates: any[]; brollVideos: any[]; audioTracks: any[] }>(`/brands/${brandId}/videos/templates`),
    generateStoryboard: (
      brandId: string,
      payload: {
        text: string;
        customTopic?: string;
        campaignId?: string;
        targetDurationSec?: number;
        aspectRatio?: string;
        visualStyle?: string;
        language?: string;
        voiceoverPersona?: string;
        bgMusicId?: string;
      }
    ) =>
      this.request<{
        title: string;
        topic: string;
        aspectRatio?: string;
        visualStyle?: string;
        language?: string;
        voiceoverPersona?: string;
        suggestedMotionStyle: string;
        suggestedBgVideoUrl: string;
        suggestedAudioTrackId: string;
        totalDurationSec: number;
        scenes: any[];
      }>(`/brands/${brandId}/videos/storyboard`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    regenerateScene: (
      brandId: string,
      payload: {
        sceneIndex: number;
        currentScene: any;
        prompt?: string;
        topic?: string;
        visualStyle?: string;
      }
    ) =>
      this.request<{ scene: any; message: string }>(`/brands/${brandId}/videos/scenes/regenerate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    synthesizeSpeech: (
      brandId: string,
      payload: {
        text: string;
        voicePersona?: string;
        language?: string;
        speechRate?: number;
      }
    ) =>
      this.request<{
        filePath: string;
        fileName: string;
        durationSec: number;
        publicUrl: string;
        fileSizeBytes: number;
      }>(`/brands/${brandId}/videos/tts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    render: (
      brandId: string,
      payload: {
        templateId?: string;
        title: string;
        subtext?: string;
        durationSec?: number;
        scenes?: any[];
        motionStyle?: string;
        bgVideoUrl?: string;
        audioTrackId?: string;
        burnSubtitles?: boolean;
        includeOutro?: boolean;
        outroHeadline?: string;
        outroSubtext?: string;
        voiceoverUrl?: string;
        voiceoverPersona?: string;
        generateVoiceoverTts?: boolean;
        aspectRatio?: string;
        qualityPreset?: string;
        visualStyle?: string;
        language?: string;
        musicVolume?: number;
        voiceoverVolume?: number;
        duckingIntensity?: number;
        campaignId?: string;
        captionStyleConfig?: any;
      }
    ) =>
      this.request<{ asset: any; renderResult?: any; message: string }>(`/brands/${brandId}/videos/render`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listJobs: (brandId: string) =>
      this.request<any[]>(`/brands/${brandId}/videos/jobs`),
    getJobStatus: (brandId: string, jobId: string) =>
      this.request<any>(`/brands/${brandId}/videos/jobs/${jobId}`),
    retryJob: (brandId: string, jobId: string) =>
      this.request<any>(`/brands/${brandId}/videos/jobs/${jobId}/retry`, {
        method: 'POST',
      }),
  };

  // AI Content Generator & Multi-Platform Repurposing
  ai = {
    generateCopy: (brandId: string, payload: { prompt: string; style?: string; campaignGoal?: string }) =>
      this.request<any>(`/brands/${brandId}/ai/generate-copy`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    generateContent: (brandId: string, payload: AiContentGenerateRequest) =>
      this.request<AiContentGenerateResponse>(`/brands/${brandId}/ai/generate-content`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    transformCopy: (brandId: string, payload: AiTransformRequest) =>
      this.request<AiTransformResponse>(`/brands/${brandId}/ai/transform-copy`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getHashtags: (brandId: string, text?: string) =>
      this.request<any>(`/brands/${brandId}/ai/hashtags`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  };

  // Phase 7: Social Accounts, Sandbox Channels & Publishing Audit Logs
  socialAccounts = {
    list: (brandId: string) => this.request<any[]>(`/brands/${brandId}/social-accounts`),
    get: (brandId: string, accountId: string) =>
      this.request<any>(`/brands/${brandId}/social-accounts/${accountId}`),
    connect: (brandId: string, payload: any) =>
      this.request<any>(`/brands/${brandId}/social-accounts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    reconnect: (brandId: string, accountId: string) =>
      this.request<{ platform: string; authorizationUrl?: string; message?: string }>(
        `/brands/${brandId}/social-accounts/${accountId}/reconnect`,
        { method: 'POST' }
      ),
    test: (brandId: string, accountId: string) =>
      this.request<any>(`/brands/${brandId}/social-accounts/${accountId}/test`, {
        method: 'POST',
      }),
    disconnect: (brandId: string, accountId: string) =>
      this.request<{ success: boolean; message: string; cancelledJobsCount?: number }>(
        `/brands/${brandId}/social-accounts/${accountId}`,
        {
          method: 'DELETE',
        }
      ),
    seedSandbox: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/social-accounts/sandbox/seed`, {
        method: 'POST',
      }),
    getLogs: (brandId: string) =>
      this.request<any[]>(`/brands/${brandId}/social-accounts/logs`),
  };

  // Campaigns & AI Strategy Arc Generator
  campaigns = {
    list: (brandId: string, status?: string) =>
      this.request<any[]>(`/brands/${brandId}/campaigns${status && status !== 'all' ? `?status=${status}` : ''}`),
    get: (brandId: string, campaignId: string) => this.request<any>(`/brands/${brandId}/campaigns/${campaignId}`),
    previewStrategy: (
      brandId: string,
      payload: { businessIdea: string; campaignGoal: string; duration: string; customDays?: number; platforms?: string[] }
    ) =>
      this.request<any>(`/brands/${brandId}/campaigns/strategy`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    generate: (brandId: string, payload: any) =>
      this.request<any>(`/brands/${brandId}/campaigns/generate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    schedule: (
      brandId: string,
      campaignId: string,
      payload: {
        startDate?: string;
        dailyTime?: string;
        cadence?: 'daily' | 'alternate_days' | 'weekdays' | 'twice_daily';
        scheduleItems?: Array<{ postId: string; scheduledFor: string }>;
      }
    ) =>
      this.request<any>(`/brands/${brandId}/campaigns/${campaignId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    publishBatch: (
      brandId: string,
      campaignId: string,
      payload?: { postIds?: string[]; force?: boolean }
    ) =>
      this.request<{
        campaignId: string;
        totalCount: number;
        publishedCount: number;
        skippedCount: number;
        failedCount: number;
        results: any[];
      }>(`/brands/${brandId}/campaigns/${campaignId}/publish-now`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    update: (brandId: string, campaignId: string, payload: any) =>
      this.request<any>(`/brands/${brandId}/campaigns/${campaignId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (brandId: string, campaignId: string) =>
      this.request<any>(`/brands/${brandId}/campaigns/${campaignId}`, {
        method: 'DELETE',
      }),
  };

  // Meta Social Publishing Integration (Facebook Pages & Instagram Professional)
  meta = {
    getStatus: (brandId: string) =>
      this.request<{
        id?: string;
        connected: boolean;
        status: string;
        provider?: string;
        metaUserId?: string;
        selectedPageId?: string;
        selectedPageName?: string;
        instagramAccountId?: string;
        instagramUsername?: string;
        credentialExpiresAt?: string | null;
        tokenMasked?: string;
        scopes?: string[];
        requireApprovalBeforePublish?: boolean;
        createdAt?: string;
        updatedAt?: string;
      }>(`/brands/${brandId}/integrations/meta/status`),

    getPages: (brandId: string) =>
      this.request<MetaFacebookPage[]>(`/brands/${brandId}/integrations/meta/pages`),

    selectPage: (brandId: string, pageId: string) =>
      this.request<{
        selectedPageId: string;
        selectedPageName: string;
        hasInstagram: boolean;
        instagramAccount?: any;
      }>(`/brands/${brandId}/integrations/meta/select-page`, {
        method: 'POST',
        body: JSON.stringify({ pageId }),
      }),

    importDevToken: (brandId: string, token: string) =>
      this.request<{
        pageCount: number;
        pages: MetaFacebookPage[];
        tokenMasked: string;
        expiresAt: string;
      }>(`/brands/${brandId}/integrations/meta/dev-token`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),

    testConnection: (brandId: string) =>
      this.request<{
        isValid: boolean;
        latencyMs: number;
        expiresAt?: string;
        scopes: string[];
        selectedPageId?: string;
        instagramAccountId?: string;
        tokenMasked: string;
      }>(`/brands/${brandId}/integrations/meta/test`, {
        method: 'POST',
      }),

    publish: (brandId: string, payload: {
      platform: 'facebook' | 'instagram';
      accountId?: string;
      text?: string;
      caption?: string;
      mediaUrls?: string[];
      scheduledAt?: string | null;
      postId?: string;
      postVariantId?: string;
    }) =>
      this.request<any>(`/brands/${brandId}/integrations/meta/publish`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    agentPublish: (brandId: string, payload: {
      platform: 'facebook' | 'instagram';
      account_id?: string;
      text?: string;
      caption?: string;
      media_urls?: string[];
      scheduled_at?: string | null;
      require_approval?: boolean;
    }) =>
      this.request<any>(`/brands/${brandId}/integrations/meta/agent/publish`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getJobs: (brandId: string) =>
      this.request<PublishingJob[]>(`/brands/${brandId}/integrations/meta/jobs`),

    getAuditLogs: (brandId: string) =>
      this.request<PublishingAuditLog[]>(`/brands/${brandId}/integrations/meta/audit-logs`),

    updateSettings: (brandId: string, settings: { requireApprovalBeforePublish: boolean }) =>
      this.request<any>(`/brands/${brandId}/integrations/meta/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),

    disconnect: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/integrations/meta/disconnect`, {
        method: 'POST',
      }),

    getConnectUrl: (brandId: string) =>
      this.request<{ authorizationUrl: string }>(
        `/integrations/meta/connect?brandId=${brandId}&format=json`
      ),

    reconnect: (brandId: string) =>
      this.request<{ authorizationUrl: string; brandId: string; reconnect: boolean }>(
        `/brands/${brandId}/integrations/meta/reconnect`,
        { method: 'POST' }
      ),
  };

  public billing = {
    getPlans: () =>
      this.request<SubscriptionPlan[]>('/billing/plans'),

    getSubscription: () =>
      this.request<TenantSubscription & {
        planName: string;
        price: number;
        currency: string;
        billingInterval: string;
        maxBrands: number;
        maxSocialAccounts: number;
        maxPostsPerMonth: number;
        features?: Record<string, boolean>;
      }>('/billing/subscription'),

    getUsage: () =>
      this.request<TenantUsageResponse>('/billing/usage'),

    getEngineUsage: () =>
      this.request<any>('/billing/usage/engine'),

    getInvoices: () =>
      this.request<BillingInvoice[]>('/billing/invoices'),

    downloadInvoice: async (invoiceId: string, invoiceNumber: string) => {
      let token = this.getToken();
      let res = await fetch(`${BASE_URL}/billing/invoices/${invoiceId}/download`, {
        credentials: 'include',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (res.status === 401) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          token = this.getToken();
          res = await fetch(`${BASE_URL}/billing/invoices/${invoiceId}/download`, {
            credentials: 'include',
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
            },
          });
        }
      }

      if (!res.ok) {
        throw new Error(`Failed to download invoice (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HoaspForge-Invoice-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch {
          // cleanup safe
        }
      }, 1500);
    },

    retryInvoicePayment: (invoiceId: string) =>
      this.request<any>(`/billing/invoices/${invoiceId}/retry`, {
        method: 'POST',
      }),

    updateBillingInfo: (payload: {
      companyLegalName?: string;
      taxId?: string;
      billingEmail?: string;
      billingAddress?: string;
      billingPhone?: string;
      whatsappPhone?: string;
      autoEmailReceipts?: boolean;
      whatsappConsent?: boolean;
    }) =>
      this.request<any>('/billing/billing-info', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    createCheckout: (payload: {
      planId: string;
      billingInterval?: 'month' | 'year';
      successUrl?: string;
      cancelUrl?: string;
    }) =>
      this.request<{
        sessionId: string;
        url: string;
        planId: string;
        billingInterval: string;
      }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    verifyCheckout: (payload: { sessionId: string }) =>
      this.request<{
        success: boolean;
        status: string;
        planId: string;
        alreadyProcessed?: boolean;
        message?: string;
      }>('/billing/checkout/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    reconcile: () =>
      this.request<{
        tenantId: string;
        tenantName: string;
        inSync: boolean;
        discrepanciesFound: number;
        resolutions: any[];
      }>('/billing/reconcile', {
        method: 'POST',
      }),

    createPortal: (payload?: { returnUrl?: string }) =>
      this.request<{ url: string }>('/billing/portal', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),

    changeSubscription: (payload: { newPlanId?: string; billingInterval?: 'month' | 'year'; prorationBehavior?: string; immediate?: boolean }) =>
      this.request<any>('/billing/subscription/change', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    purchaseAddon: (payload: { addonId: string; quantity?: number }) =>
      this.request<{
        success: boolean;
        data: {
          addon: string;
          addonId: string;
          bonus: number;
          newLimit: number;
          invoiceNumber: string;
          amountPaidCents: number;
          activeAddons: string[];
        };
        message: string;
      }>('/billing/addons/purchase', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    cancelSubscription: (payload?: { immediately?: boolean; reason?: string; feedback?: string }) =>
      this.request<any>('/billing/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),

    resumeSubscription: () =>
      this.request<any>('/billing/subscription/resume', {
        method: 'POST',
      }),

    getDunningStatus: () =>
      this.request<DunningStatusResponse>('/billing/dunning'),

    getNotifications: () =>
      this.request<BillingNotification[]>('/billing/notifications'),

    dismissNotification: (id: string) =>
      this.request<{ dismissed: boolean }>(`/billing/notifications/${id}/dismiss`, {
        method: 'PATCH',
      }),

    processDunning: (simulateHours?: number) =>
      this.request<any>('/billing/dunning/process', {
        method: 'POST',
        body: JSON.stringify({ simulateHours }),
      }),

    getAuditLogs: () =>
      this.request<BillingAuditLog[]>('/billing/audit-logs'),

    listEmails: (params?: { page?: number; limit?: number; template?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.template) q.set('template', params.template);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: BillingEmailLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/billing/emails${query}`);
    },

    getEmail: (id: string) =>
      this.request<BillingEmailLog>(`/billing/emails/${id}`),

    previewEmail: (id: string) =>
      this.request<{
        id: string;
        subject: string;
        template: string;
        recipientEmail: string;
        htmlBody: string;
        textBody: string;
        sentAt: string;
      }>(`/billing/emails/${id}/preview`),

    resendEmail: (id: string) =>
      this.request<BillingEmailLog>(`/billing/emails/${id}/resend`, {
        method: 'POST',
      }),

    getUsageAlerts: (params?: { page?: number; limit?: number; periodMonth?: string; resource?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.periodMonth) q.set('periodMonth', params.periodMonth);
      if (params?.resource) q.set('resource', params.resource);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: TenantUsageAlert[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/billing/usage/alerts${query}`);
    },

    evaluateUsageAlerts: () =>
      this.request<{
        evaluatedCount: number;
        triggeredCount: number;
        results: UsageAlertEvaluationResult[];
      }>('/billing/usage/alerts/evaluate', {
        method: 'POST',
      }),
  };

  public workspaces = {
    list: () =>
      this.request<{
        activeTenantId: string;
        workspaces: Array<{
          id: string;
          name: string;
          slug: string;
          role: string;
          planId: string;
          planName: string;
          subscriptionStatus: string;
          isActive: boolean;
        }>;
      }>('/workspaces'),

    create: (payload: { name: string; slug?: string }) =>
      this.request<{
        id: string;
        name: string;
        slug: string;
        role: string;
        planId: string;
      }>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    switch: (tenantId: string) =>
      this.request<{
        accessToken: string;
        activeWorkspace: {
          id: string;
          name: string;
          slug: string;
          role: string;
          plan: {
            id: string;
            name: string;
          };
        };
      }>('/workspaces/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      }),

    getCurrent: () =>
      this.request<{
        id: string;
        name: string;
        slug: string;
        settings: Record<string, any>;
        role: string;
        plan: {
          id: string;
          name: string;
          price: number;
        };
        stats: {
          membersCount: number;
          brandsCount: number;
        };
      }>('/workspaces/current'),

    updateCurrent: (payload: { name?: string; settings?: Record<string, any> }) =>
      this.request<{ success: boolean; message: string }>('/workspaces/current', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    getQuota: () =>
      this.request<any>('/workspaces/quota'),

    getEntitlements: () =>
      this.request<any>('/workspaces/entitlements'),

    listMembers: () =>
      this.request<Array<{
        membershipId: string;
        userId: string;
        email: string;
        fullName: string;
        role: string;
        joinedAt: string;
      }>>('/workspaces/members'),

    updateMemberRole: (userId: string, role: string) =>
      this.request<{ success: boolean; message: string }>(`/workspaces/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),

    removeMember: (userId: string) =>
      this.request<{ success: boolean; message: string }>(`/workspaces/members/${userId}`, {
        method: 'DELETE',
      }),

    listInvites: () =>
      this.request<Array<{
        id: string;
        email: string;
        role: string;
        token: string;
        expiresAt: string;
        createdAt: string;
        inviteUrl: string;
      }>>('/workspaces/invites'),

    inviteMember: (payload: { email: string; role?: string }) =>
      this.request<{
        id: string;
        email: string;
        role: string;
        token: string;
        expiresAt: string;
        inviteUrl: string;
      }>('/workspaces/invites', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    cancelInvite: (inviteId: string) =>
      this.request<{ success: boolean; message: string }>(`/workspaces/invites/${inviteId}`, {
        method: 'DELETE',
      }),

    acceptInvite: (payload: { token: string; password?: string; fullName?: string }) =>
      this.request<{
        accessToken: string;
        workspace: {
          id: string;
          name: string;
          slug: string;
          role: string;
        };
      }>('/workspaces/invites/accept', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  public adminBilling = {
    getMetrics: () =>
      this.request<SuperadminBillingMetrics>('/admin/billing/metrics'),

    getRevenueHistory: (months: number = 6) =>
      this.request<SuperadminRevenueHistoryPoint[]>(`/admin/billing/revenue-history?months=${months}`),

    listSubscriptions: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      planId?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      if (params?.planId) q.set('planId', params.planId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: SuperadminTenantSubscriptionRow[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/subscriptions${query}`);
    },

    listAuditLogs: (limit: number = 50) =>
      this.request<Array<BillingAuditLog & { tenantName?: string; tenantSlug?: string }>>(
        `/admin/billing/audit-logs?limit=${limit}`
      ),

    getDlqStats: () =>
      this.request<WebhookDlqStats>('/admin/billing/dlq/stats'),

    listDlqDeliveries: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      eventType?: string;
      search?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.status) q.set('status', params.status);
      if (params?.eventType) q.set('eventType', params.eventType);
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: BillingWebhookDelivery[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/dlq${query}`);
    },

    replayDlqDelivery: (id: string, force = true) =>
      this.request<{ success: boolean; status: string }>(`/admin/billing/dlq/${id}/replay`, {
        method: 'POST',
        body: JSON.stringify({ force }),
      }),

    replayAllDeadLetters: () =>
      this.request<{ replayed: number; succeeded: number; failed: number }>(
        '/admin/billing/dlq/replay-all',
        { method: 'POST' }
      ),

    discardDlqDelivery: (id: string) =>
      this.request<{ success: boolean }>(`/admin/billing/dlq/${id}`, {
        method: 'DELETE',
      }),

    listEntitlementAuditLogs: (params?: {
      page?: number;
      limit?: number;
      tenantId?: string;
      resource?: string;
      action?: string;
      adminEmail?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.resource) q.set('resource', params.resource);
      if (params?.action) q.set('action', params.action);
      if (params?.adminEmail) q.set('adminEmail', params.adminEmail);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: EntitlementAuditLogEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/entitlements/audit-logs${query}`);
    },

    rollbackEntitlement: (auditId: string, reason: string) =>
      this.request<{ success: boolean; log: EntitlementAuditLogEntry }>(
        `/admin/billing/entitlements/audit-logs/${auditId}/rollback`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),

    listAllEmails: (params?: { page?: number; limit?: number; template?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.template) q.set('template', params.template);
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: Array<BillingEmailLog & { tenantName?: string; tenantSlug?: string }>;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/emails${query}`);
    },

    previewEmail: (id: string) =>
      this.request<BillingEmailLog>(`/admin/billing/emails/${id}/preview`),

    listUsageAlerts: (params?: {
      page?: number;
      limit?: number;
      tenantId?: string;
      periodMonth?: string;
      resource?: string;
      threshold?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.periodMonth) q.set('periodMonth', params.periodMonth);
      if (params?.resource) q.set('resource', params.resource);
      if (params?.threshold) q.set('threshold', String(params.threshold));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: Array<TenantUsageAlert & { tenantName?: string; tenantSlug?: string }>;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/usage/alerts${query}`);
    },

    evaluateTenantUsage: (tenantId: string) =>
      this.request<{
        tenantId: string;
        evaluatedCount: number;
        triggeredCount: number;
        results: UsageAlertEvaluationResult[];
      }>('/admin/billing/usage/alerts/evaluate', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      }),

    listInvoices: (params?: { page?: number; limit?: number; status?: string; search?: string; tenantId?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/invoices${query}`);
    },

    getPlatformUsageOverview: (params?: { page?: number; limit?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/admin/billing/usage/overview${query}`);
    },

    resolveQuotaDispute: (body: {
      tenantId: string;
      resource: string;
      action: 'grant_bonus' | 'reset_counter' | 'custom_limit';
      bonusAmount?: number;
      newLimit?: number;
      reason: string;
    }) =>
      this.request<{ success: boolean; message: string; details: any }>('/admin/billing/usage/disputes/resolve', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  };

  public adminOps = {
    searchTenants: (params?: { search?: string; planId?: string; status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.planId) q.set('planId', params.planId);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminTenantSummary[]; total: number; page: number; totalPages: number }>(`/admin/operations/tenants${query}`);
    },

    getTenantDetail: (tenantId: string) =>
      this.request<SuperadminTenantDetail>(`/admin/operations/tenants/${tenantId}`),

    updateSubscription: (tenantId: string, data: { planId: string; status?: string; reason: string; confirmation: boolean }) =>
      this.request<{ success: boolean; tenantId: string; planId: string; previousPlanId: string }>(
        `/admin/operations/tenants/${tenantId}/subscription`,
        { method: 'POST', body: JSON.stringify(data) }
      ),

    getUsageOverview: () =>
      this.request<{
        totalTenants: number;
        totalPublishedPosts: number;
        totalActiveConnections: number;
        totalActiveAutomations: number;
        highUsageTenants: Array<{ tenantId: string; tenantName: string; resource: string; current: number; limit: number; percentage: number }>;
      }>('/admin/operations/usage'),

    getProviderHealth: () =>
      this.request<SuperadminProviderHealth[]>('/admin/operations/provider-health'),

    listConnections: (params?: { tenantId?: string; provider?: string; healthStatus?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.provider) q.set('provider', params.provider);
      if (params?.healthStatus) q.set('healthStatus', params.healthStatus);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminConnectionHealth[]; total: number; page: number; totalPages: number }>(`/admin/operations/connections${query}`);
    },

    testConnectionHealth: (connectionId: string, reason: string) =>
      this.request<{ success: boolean; connectionId: string; healthStatus: string; latencyMs: number }>(
        `/admin/operations/connections/${connectionId}/test`,
        { method: 'POST', body: JSON.stringify({ reason }) }
      ),

    listAutomations: (params?: { tenantId?: string; status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminAutomationHealthItem[]; total: number; page: number; totalPages: number }>(`/admin/operations/automations${query}`);
    },

    listFailedAutomations: (params?: { tenantId?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminAutomationFailureDetail[]; total: number; page: number; totalPages: number }>(`/admin/operations/automations/failures${query}`);
    },

    getQueueHealth: () =>
      this.request<SuperadminQueueHealth[]>('/admin/operations/queues'),

    listWorkerFailures: (params?: { page?: number; limit?: number; jobType?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.jobType) q.set('jobType', params.jobType);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminWorkerFailure[]; total: number; page: number; totalPages: number }>(`/admin/operations/workers/failures${query}`);
    },

    getRateLimits: () =>
      this.request<{ activeRateLimits: SuperadminRateLimitIncident[]; historyLast24h: SuperadminRateLimitIncident[] }>('/admin/operations/rate-limits'),

    listDlq: (params?: { sourceType?: string; page?: number; limit?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.sourceType) q.set('sourceType', params.sourceType);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminDlqItem[]; total: number; page: number; totalPages: number }>(`/admin/operations/dlq${query}`);
    },

    retryDlq: (id: string, data: { sourceType?: string; reason: string; confirmation: boolean; force?: boolean }) =>
      this.request<{ success: boolean; jobId: string; status: string }>(
        `/admin/operations/dlq/${id}/retry`,
        { method: 'POST', body: JSON.stringify(data) }
      ),

    listAuditLogs: (params?: { superadminId?: string; targetTenantId?: string; action?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.superadminId) q.set('superadminId', params.superadminId);
      if (params?.targetTenantId) q.set('targetTenantId', params.targetTenantId);
      if (params?.action) q.set('action', params.action);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ items: SuperadminAuditLogItem[]; total: number; page: number; totalPages: number }>(`/admin/operations/audit-logs${query}`);
    },

    overrideEntitlement: (tenantId: string, data: { resource: string; limitValue: number | null; isEnabled?: boolean; reason: string; confirmation: boolean }) =>
      this.request<{ success: boolean; tenantId: string; resource: string; newLimit: number | null }>(
        `/admin/operations/tenants/${tenantId}/entitlements`,
        { method: 'POST', body: JSON.stringify(data) }
      ),

    createImpersonation: (data: { tenantId: string; reason: string; ticketReference: string; durationMinutes?: number; confirmation: boolean }) =>
      this.request<SuperadminImpersonationSession>(
        '/admin/operations/impersonate',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    revokeImpersonation: (sessionId: string, reason: string) =>
      this.request<{ success: boolean; sessionId: string }>(
        `/admin/operations/impersonate/${sessionId}/revoke`,
        { method: 'POST', body: JSON.stringify({ reason }) }
      ),

    // 13. Incident Alerting & Webhooks
    getIncidentChannels: () =>
      this.request<{ success: boolean; data: IncidentAlertChannel[] }>('/admin/operations/incidents/channels'),

    createIncidentChannel: (data: CreateIncidentAlertChannelDto) =>
      this.request<{ success: boolean; data: IncidentAlertChannel }>('/admin/operations/incidents/channels', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    testIncidentChannel: (channelId: string) =>
      this.request<{ success: boolean; data: any }>(`/admin/operations/incidents/channels/${channelId}/test`, {
        method: 'POST',
      }),

    getIncidentRules: () =>
      this.request<{ success: boolean; data: IncidentAlertRule[] }>('/admin/operations/incidents/rules'),

    createIncidentRule: (data: CreateIncidentAlertRuleDto) =>
      this.request<{ success: boolean; data: IncidentAlertRule }>('/admin/operations/incidents/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    toggleIncidentRule: (ruleId: string, isActive: boolean) =>
      this.request<{ success: boolean; data: IncidentAlertRule }>(`/admin/operations/incidents/rules/${ruleId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),

    getIncidentEvents: (params?: { status?: string; severity?: string; conditionType?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.severity) q.set('severity', params.severity);
      if (params?.conditionType) q.set('conditionType', params.conditionType);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ success: boolean; data: { items: IncidentAlertEvent[]; total: number; page: number; totalPages: number } }>(`/admin/operations/incidents/events${query}`);
    },

    acknowledgeIncidentEvent: (eventId: string, reason?: string) =>
      this.request<{ success: boolean; data: IncidentAlertEvent }>(`/admin/operations/incidents/events/${eventId}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    resolveIncidentEvent: (eventId: string, data: { resolutionNote: string; confirmation: boolean }) =>
      this.request<{ success: boolean; data: IncidentAlertEvent }>(`/admin/operations/incidents/events/${eventId}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    simulateIncident: (data: TriggerIncidentDto) =>
      this.request<{ success: boolean; data: any }>('/admin/operations/incidents/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 14. Enterprise Compliance, Exports & RBAC Matrix
    verifyAuditIntegrity: (table?: string) => {
      const q = table ? `?table=${encodeURIComponent(table)}` : '';
      return this.request<{ success: boolean; data: AuditIntegrityVerification }>(`/admin/operations/compliance/verify${q}`);
    },

    listComplianceExports: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; data: ComplianceExportJob[] }>(`/admin/operations/compliance/exports${q}`);
    },

    requestComplianceExport: (data: RequestComplianceExportDto) =>
      this.request<{ success: boolean; data: ComplianceExportJob }>('/admin/operations/compliance/exports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listRetentionPolicies: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; data: ComplianceRetentionPolicy[] }>(`/admin/operations/compliance/retention${q}`);
    },

    updateRetentionPolicy: (id: string, data: UpdateRetentionPolicyDto) =>
      this.request<{ success: boolean; data: ComplianceRetentionPolicy }>(`/admin/operations/compliance/retention/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    executeCompliancePurge: (data: ExecuteDataPurgeDto) =>
      this.request<{ success: boolean; data: { certificate: CompliancePurgeCertificate; recordsPurged: number } }>('/admin/operations/compliance/purge', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listComplianceRoles: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; data: CustomRolePermission[] }>(`/admin/operations/compliance/roles${q}`);
    },

    createCustomRole: (data: CreateCustomRoleDto) =>
      this.request<{ success: boolean; data: CustomRolePermission }>('/admin/operations/compliance/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listCompliancePermissions: () =>
      this.request<{ success: boolean; data: Array<{ category: string; permissions: string[] }> }>('/admin/operations/compliance/permissions'),

    // 15. Real-Time Social Webhooks & Dead-Letter Replay Engine
    getWebhookEvents: (params?: { provider?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.provider) q.set('provider', params.provider);
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ success: boolean; events: SocialWebhookEvent[]; total: number }>(`/admin/operations/webhooks/events${query}`);
    },

    getWebhookStats: () =>
      this.request<{ success: boolean; stats: SocialWebhookStats }>('/admin/operations/webhooks/stats'),

    replayWebhookEvent: (id: string, data: ReplayWebhookRequest) =>
      this.request<{ success: boolean; event: SocialWebhookEvent; replayLog: SocialWebhookReplayLog }>(
        `/admin/operations/webhooks/replay/${id}`,
        { method: 'POST', body: JSON.stringify(data) }
      ),

    replayBatchWebhooks: (data: ReplayBatchRequest) =>
      this.request<{ success: boolean; replayedCount: number; successfulCount: number; failedCount: number }>(
        '/admin/operations/webhooks/replay-batch',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    discardWebhookEvent: (id: string, reason: string) =>
      this.request<{ success: boolean; event: SocialWebhookEvent }>(
        `/admin/operations/webhooks/discard/${id}`,
        { method: 'POST', body: JSON.stringify({ reason }) }
      ),

    simulateWebhookEvent: (data: SimulateWebhookRequest) =>
      this.request<{ success: boolean; event: SocialWebhookEvent }>(
        '/admin/operations/webhooks/simulate',
        { method: 'POST', body: JSON.stringify(data) }
      ),

    getWebhookConfigs: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; configs: SocialWebhookConfig[] }>(`/admin/operations/webhooks/configs${q}`);
    },

    saveWebhookConfig: (data: Partial<SocialWebhookConfig>) =>
      this.request<{ success: boolean; config: SocialWebhookConfig }>('/admin/operations/webhooks/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 16. Enterprise SLA Monitor, Health & Status Page
    getSlaOverview: () =>
      this.request<SystemSlaOverview>('/admin/operations/sla/overview'),

    getSlaComponents: () =>
      this.request<SystemStatusComponent[]>('/admin/operations/sla/components'),

    overrideSlaComponent: (id: string, data: { status: string; reason: string; confirmed: boolean }) =>
      this.request<SystemStatusComponent>(`/admin/operations/sla/components/${id}/override`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    clearSlaComponentOverride: (id: string, data: { reason: string; confirmed: boolean }) =>
      this.request<SystemStatusComponent>(`/admin/operations/sla/components/${id}/clear-override`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    runSlaSyntheticProbe: () =>
      this.request<{ success: boolean; results: any[] }>('/admin/operations/sla/probe', {
        method: 'POST',
      }),

    getSlaMaintenance: () =>
      this.request<SystemMaintenanceWindow[]>('/admin/operations/sla/maintenance'),

    scheduleSlaMaintenance: (data: {
      title: string;
      description: string;
      impactLevel: string;
      impactedComponents: string[];
      scheduledStartAt: string;
      scheduledEndAt: string;
      confirmed: boolean;
    }) =>
      this.request<SystemMaintenanceWindow>('/admin/operations/sla/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSlaMaintenanceStatus: (
      id: string,
      data: { status: string; reason: string; cancellationReason?: string; confirmed: boolean }
    ) =>
      this.request<SystemMaintenanceWindow>(`/admin/operations/sla/maintenance/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 17. Disaster Recovery, Snapshot Vault & Multi-Region Backup Verification
    getDrOverview: () =>
      this.request<SystemDrOverview>('/admin/operations/dr/overview'),

    getDrSnapshots: (params?: { type?: string; tier?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.type && params.type !== 'all') q.set('type', params.type);
      if (params?.tier && params.tier !== 'all') q.set('tier', params.tier);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<SystemBackupSnapshot[]>(`/admin/operations/dr/snapshots${query}`);
    },

    createDrSnapshot: (data: {
      snapshotType?: string;
      storageTier?: string;
      replicaRegions?: string[];
      reason: string;
      retentionDays?: number;
      confirmed: boolean;
    }) =>
      this.request<SystemBackupSnapshot>('/admin/operations/dr/snapshots', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    executeDrDrill: (
      snapshotId: string,
      data: { drillType?: string; targetEnv?: string; reason: string; confirmed: boolean }
    ) =>
      this.request<{ drill: SystemDrDrillLog; snapshot: SystemBackupSnapshot }>(
        `/admin/operations/dr/snapshots/${snapshotId}/drill`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),

    getDrDrills: () =>
      this.request<SystemDrDrillLog[]>('/admin/operations/dr/drills'),

    requestTenantBackup: (data: {
      tenantId: string;
      format?: string;
      reason: string;
      confirmed: boolean;
    }) =>
      this.request<SystemTenantBackupExport>('/admin/operations/dr/tenant-backup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getTenantBackups: () =>
      this.request<Array<SystemTenantBackupExport & { tenantName?: string }>>('/admin/operations/dr/tenant-backups'),

    // 18. Outbound Webhook Dispatcher & Enterprise Event Notification Engine
    getOutboundWebhookOverview: () =>
      this.request<OutboundWebhookOverview>('/admin/operations/outbound-webhooks/overview'),

    listOutboundEndpoints: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<OutboundWebhookEndpoint[]>(`/admin/operations/outbound-webhooks/endpoints${q}`);
    },

    createOutboundEndpoint: (data: CreateOutboundEndpointInput) =>
      this.request<{ endpoint: OutboundWebhookEndpoint; rawSecret: string }>(
        '/admin/operations/outbound-webhooks/endpoints',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),

    rotateOutboundSecret: (id: string) =>
      this.request<RotateOutboundSecretResult>(
        `/admin/operations/outbound-webhooks/endpoints/${id}/rotate-secret`,
        {
          method: 'POST',
        }
      ),

    setOutboundEndpointStatus: (id: string, status: 'active' | 'paused' | 'failed_disabled') =>
      this.request<OutboundWebhookEndpoint>(
        `/admin/operations/outbound-webhooks/endpoints/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      ),

    deleteOutboundEndpoint: (id: string) =>
      this.request<{ success: boolean; message: string }>(
        `/admin/operations/outbound-webhooks/endpoints/${id}`,
        {
          method: 'DELETE',
        }
      ),

    testOutboundEndpoint: (id: string, data?: { eventType?: string; payload?: Record<string, any> }) =>
      this.request<TestDispatchResult>(
        `/admin/operations/outbound-webhooks/endpoints/${id}/test`,
        {
          method: 'POST',
          body: JSON.stringify(data || {}),
        }
      ),

    listOutboundDeliveries: (params?: {
      endpointId?: string;
      status?: string;
      eventType?: string;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.endpointId) q.set('endpointId', params.endpointId);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.eventType && params.eventType !== 'all') q.set('eventType', params.eventType);
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<OutboundWebhookDelivery[]>(
        `/admin/operations/outbound-webhooks/deliveries${query}`
      );
    },

    retryOutboundDelivery: (deliveryId: string) =>
      this.request<OutboundWebhookDelivery>(
        `/admin/operations/outbound-webhooks/deliveries/${deliveryId}/retry`,
        {
          method: 'POST',
        }
      ),

    // 19. Enterprise SSO & SAML 2.0 / OIDC Identity Provider Federation
    getSsoOverview: () =>
      this.request<SsoOverview>('/admin/operations/sso/overview'),

    listSsoConfigs: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<EnterpriseSsoConfig[]>(`/admin/operations/sso/configs${q}`);
    },

    createSsoConfig: (data: CreateSsoConfigInput) =>
      this.request<EnterpriseSsoConfig>('/admin/operations/sso/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSsoConfig: (id: string, data: UpdateSsoConfigInput) =>
      this.request<EnterpriseSsoConfig>(`/admin/operations/sso/configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteSsoConfig: (id: string) =>
      this.request<{ success: boolean; message: string }>(`/admin/operations/sso/configs/${id}`, {
        method: 'DELETE',
      }),

    simulateSamlAssertion: (
      id: string,
      data: { nameId: string; email: string; attributes?: Record<string, string> }
    ) =>
      this.request<SamlSimulationResult>(`/admin/operations/sso/configs/${id}/simulate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listSsoAudits: (params?: { configId?: string; status?: string; search?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.configId) q.set('configId', params.configId);
      if (params?.status && params.status !== 'all') q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<EnterpriseSsoLoginAudit[]>(`/admin/operations/sso/audits${query}`);
    },

    // 20. SCIM 2.0 Directory Sync & Automated Workforce Lifecycle Protocol
    getScimOverview: () =>
      this.request<ScimOverviewMetrics>('/admin/operations/scim/overview'),

    listScimTokens: () =>
      this.request<ScimApiToken[]>('/admin/operations/scim/tokens'),

    createScimToken: (data: CreateScimTokenInput) =>
      this.request<CreateScimTokenResponse>('/admin/operations/scim/tokens', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    revokeScimToken: (id: string) =>
      this.request<ScimApiToken>(`/admin/operations/scim/tokens/${id}/revoke`, {
        method: 'POST',
      }),

    rotateScimToken: (id: string) =>
      this.request<CreateScimTokenResponse>(`/admin/operations/scim/tokens/${id}/rotate`, {
        method: 'POST',
      }),

    listScimLogs: (params?: { limit?: number; offset?: number; action?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.action && params.action !== 'all') q.set('action', params.action);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ logs: ScimSyncLog[]; total: number }>(`/admin/operations/scim/logs${query}`);
    },

    // 21. Enterprise SIEM Streaming & Security Event Exporter
    getSiemOverview: () =>
      this.request<SiemOverviewMetrics>('/admin/operations/siem/overview'),

    listSiemDestinations: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<SiemDestinationConfig[]>(`/admin/operations/siem/destinations${q}`);
    },

    getSiemDestinationById: (id: string) =>
      this.request<SiemDestinationConfig>(`/admin/operations/siem/destinations/${id}`),

    createSiemDestination: (data: CreateSiemDestinationInput) =>
      this.request<SiemDestinationConfig>('/admin/operations/siem/destinations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSiemDestination: (id: string, data: UpdateSiemDestinationInput) =>
      this.request<SiemDestinationConfig>(`/admin/operations/siem/destinations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteSiemDestination: (id: string) =>
      this.request<void>(`/admin/operations/siem/destinations/${id}`, {
        method: 'DELETE',
      }),

    toggleSiemStatus: (id: string, status: 'active' | 'paused') =>
      this.request<SiemDestinationConfig>(`/admin/operations/siem/destinations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    dispatchSiemProbe: (id: string, data: TestSiemProbeInput) =>
      this.request<TestSiemProbeResult>(`/admin/operations/siem/destinations/${id}/probe`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listSiemLogs: (params?: { destinationId?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.destinationId && params.destinationId !== 'all') q.set('destinationId', params.destinationId);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ logs: SiemDeliveryBatchLog[]; total: number }>(`/admin/operations/siem/logs${query}`);
    },

    // 22. Enterprise Data Loss Prevention (DLP) & Content Policy Guardrails
    getDlpOverview: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<DlpOverviewMetrics>(`/admin/operations/dlp/overview${q}`);
    },

    listDlpPolicies: (params?: { tenantId?: string; category?: string; enabled?: boolean; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.category && params.category !== 'all') q.set('category', params.category);
      if (typeof params?.enabled === 'boolean') q.set('enabled', String(params.enabled));
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<DlpPolicy[]>(`/admin/operations/dlp/policies${query}`);
    },

    getDlpPolicyById: (id: string, tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<DlpPolicy>(`/admin/operations/dlp/policies/${id}${q}`);
    },

    createDlpPolicy: (data: Partial<DlpPolicy> & { tenantId?: string }) =>
      this.request<DlpPolicy>('/admin/operations/dlp/policies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateDlpPolicy: (id: string, data: Partial<DlpPolicy> & { tenantId?: string }) =>
      this.request<DlpPolicy>(`/admin/operations/dlp/policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteDlpPolicy: (id: string, tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; message: string }>(`/admin/operations/dlp/policies/${id}${q}`, {
        method: 'DELETE',
      });
    },

    toggleDlpPolicy: (id: string, is_enabled: boolean, tenantId?: string) =>
      this.request<DlpPolicy>(`/admin/operations/dlp/policies/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ is_enabled, tenantId }),
      }),

    inspectDlpContent: (data: { tenantId: string; content: string; targetScope: string; entityType?: string; entityId?: string }) =>
      this.request<DlpScanResult>('/admin/operations/dlp/inspect', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    simulateDlpScan: (data: { content: string; policyIds?: string[] }) =>
      this.request<DlpScanResult>('/admin/operations/dlp/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listDlpIncidents: (params?: {
      tenantId?: string;
      severity?: string;
      action_taken?: string;
      quarantine_status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.severity && params.severity !== 'all') q.set('severity', params.severity);
      if (params?.action_taken && params.action_taken !== 'all') q.set('action_taken', params.action_taken);
      if (params?.quarantine_status && params.quarantine_status !== 'all') q.set('quarantine_status', params.quarantine_status);
      if (params?.search) q.set('search', params.search);
      if (params?.page) q.set('page', String(params.page));
      if (params?.limit) q.set('limit', String(params.limit));
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ incidents: DlpIncident[]; total: number; page: number; limit: number }>(
        `/admin/operations/dlp/incidents${query}`
      );
    },

    reviewDlpQuarantine: (id: string, data: { tenantId: string; decision: 'approved_override' | 'rejected_dismissed'; reviewNotes?: string }) =>
      this.request<DlpIncident>(`/admin/operations/dlp/incidents/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 23. Enterprise Custom Roles & Granular RBAC Permissions Engine
    getRbacOverview: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; data: RbacOverviewMetrics }>(`/admin/operations/rbac/overview${q}`);
    },

    listRbacPermissions: () =>
      this.request<{ success: boolean; data: PermissionDefinition[] }>('/admin/operations/rbac/permissions'),

    listRbacRoles: (params?: { tenantId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.tenantId) q.set('tenantId', params.tenantId);
      if (params?.search) q.set('search', params.search);
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ success: boolean; data: EnterpriseCustomRole[] }>(`/admin/operations/rbac/roles${query}`);
    },

    getRbacRoleById: (id: string, tenantId?: string) => {
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<{ success: boolean; data: EnterpriseCustomRole }>(`/admin/operations/rbac/roles/${id}${q}`);
    },

    createRbacRole: (data: CreateEnterpriseRoleDto) =>
      this.request<{ success: boolean; data: EnterpriseCustomRole }>('/admin/operations/rbac/roles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateRbacRole: (id: string, data: UpdateCustomRoleDto) =>
      this.request<{ success: boolean; data: EnterpriseCustomRole }>(`/admin/operations/rbac/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteRbacRole: (id: string) =>
      this.request<{ success: boolean; data: { success: boolean; message: string } }>(`/admin/operations/rbac/roles/${id}`, {
        method: 'DELETE',
      }),

    simulateRbacPermission: (data: RbacSimulationRequest) =>
      this.request<{ success: boolean; data: RbacSimulationResult }>('/admin/operations/rbac/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listRbacUserAssignments: (tenantId: string) =>
      this.request<{ success: boolean; data: any[] }>(`/admin/operations/rbac/assignments?tenantId=${encodeURIComponent(tenantId)}`),

    assignRbacUserRole: (data: AssignUserCustomRoleDto) =>
      this.request<{ success: boolean; data: any }>('/admin/operations/rbac/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    unassignRbacUserRole: (id: string) =>
      this.request<{ success: boolean; data: { success: boolean; message: string } }>(`/admin/operations/rbac/assignments/${id}`, {
        method: 'DELETE',
      }),

    listRbacUserOverrides: (tenantId: string) =>
      this.request<{ success: boolean; data: UserPermissionOverride[] }>(`/admin/operations/rbac/overrides?tenantId=${encodeURIComponent(tenantId)}`),

    createRbacPermissionOverride: (data: CreatePermissionOverrideDto) =>
      this.request<{ success: boolean; data: UserPermissionOverride }>('/admin/operations/rbac/overrides', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteRbacPermissionOverride: (id: string) =>
      this.request<{ success: boolean; data: { success: boolean } }>(`/admin/operations/rbac/overrides/${id}`, {
        method: 'DELETE',
      }),

    getUserEffectivePermissions: (tenantId: string, userId: string) =>
      this.request<{ success: boolean; data: UserEffectivePermissions }>(`/admin/operations/rbac/users/${encodeURIComponent(tenantId)}/${encodeURIComponent(userId)}/effective`),

    // 24. Immutable WORM Audit Vault & Cryptographic Tamper-Evidence
    // (request<T> unwraps the { success, data } envelope, so T is the payload type)
    getWormOverview: () =>
      this.request<WormVaultOverview & { lastVerification: WormVerificationReport | null }>('/admin/operations/worm/overview'),

    ingestWormVault: (limitPerSource?: number) =>
      this.request<WormIngestionResult>('/admin/operations/worm/ingest', {
        method: 'POST',
        body: JSON.stringify({ limitPerSource }),
      }),

    listWormRecords: (params?: { sourceTable?: string; tenantId?: string; action?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== '') q.set(k, String(v));
      });
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ records: WormVaultRecord[]; total: number; limit: number; offset: number }>(`/admin/operations/worm/records${query}`);
    },

    getWormRecord: (sequence: number) =>
      this.request<{ record: WormVaultRecord; proof: WormInclusionProof | null }>(`/admin/operations/worm/records/${sequence}`),

    verifyWormLedger: () =>
      this.request<WormVerificationReport>('/admin/operations/worm/verify', { method: 'POST', body: '{}' }),

    simulateWormTamper: (data: WormTamperSimulationRequest) =>
      this.request<WormVerificationReport & { mutation: string }>('/admin/operations/worm/verify/simulate-tamper', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listWormSeals: () => this.request<WormDailySeal[]>('/admin/operations/worm/seals'),

    createWormSeal: () => this.request<WormDailySeal>('/admin/operations/worm/seals', { method: 'POST', body: '{}' }),

    verifyWormSeal: (id: string) => this.request<WormPublicSealVerification>(`/admin/operations/worm/seals/${id}`),

    getWormSigningKey: () => this.request<WormSigningKeyInfo>('/admin/operations/worm/signing-key'),

    listWormLegalHolds: (status?: 'active' | 'released') =>
      this.request<WormLegalHold[]>(`/admin/operations/worm/legal-holds${status ? `?status=${status}` : ''}`),

    createWormLegalHold: (data: CreateWormLegalHoldDto) =>
      this.request<WormLegalHold>('/admin/operations/worm/legal-holds', { method: 'POST', body: JSON.stringify(data) }),

    releaseWormLegalHold: (id: string, reason: string) =>
      this.request<WormLegalHold>(`/admin/operations/worm/legal-holds/${id}/release`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    listWormVerificationTokens: () => this.request<WormVerificationToken[]>('/admin/operations/worm/verification-tokens'),

    issueWormVerificationToken: (data: IssueWormVerificationTokenDto) =>
      this.request<IssuedWormVerificationToken>('/admin/operations/worm/verification-tokens', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    revokeWormVerificationToken: (id: string) =>
      this.request<WormVerificationToken>(`/admin/operations/worm/verification-tokens/${id}/revoke`, { method: 'POST', body: '{}' }),

    listWormVerificationEvents: () => this.request<WormVerificationEvent[]>('/admin/operations/worm/verification-events'),

    // 25. Multi-Tenant Custom Domains & White-Label Agency Portals
    getCustomDomainsOverview: () =>
      this.request<CustomDomainTelemetry>('/admin/operations/custom-domains/overview'),

    listCustomDomains: (params?: { status?: string; tenantId?: string; portalType?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== '') q.set(k, String(v));
      });
      const query = q.toString() ? `?${q.toString()}` : '';
      return this.request<{ domains: CustomDomain[]; total: number }>(`/admin/operations/custom-domains${query}`);
    },

    getCustomDomainById: (id: string) =>
      this.request<CustomDomain>(`/admin/operations/custom-domains/${id}`),

    createCustomDomain: (data: CreateCustomDomainDto) =>
      this.request<CustomDomain>('/admin/operations/custom-domains', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateCustomDomain: (id: string, data: UpdateCustomDomainDto) =>
      this.request<CustomDomain>(`/admin/operations/custom-domains/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    updateCustomDomainBranding: (id: string, data: UpdateWhiteLabelBrandingDto) =>
      this.request<CustomDomain>(`/admin/operations/custom-domains/${id}/branding`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteCustomDomain: (id: string) =>
      this.request<{ success: boolean; deletedDomain: string }>(`/admin/operations/custom-domains/${id}`, {
        method: 'DELETE',
      }),

    verifyCustomDomainDns: (id: string, data?: { forceSuccess?: boolean; cnameActual?: string; txtActual?: string }) =>
      this.request<DomainDnsCheckResult>(`/admin/operations/custom-domains/${id}/verify-dns`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),

    renewCustomDomainSsl: (id: string) =>
      this.request<CustomDomain>(`/admin/operations/custom-domains/${id}/renew-ssl`, {
        method: 'POST',
        body: '{}',
      }),

    renewSslCertificate: (id: string) =>
      this.request<CustomDomain>(`/admin/operations/custom-domains/${id}/renew-ssl`, {
        method: 'POST',
        body: '{}',
      }),

    listCustomDomainLogs: (id: string, limit?: number) =>
      this.request<CustomDomainAccessLog[]>(`/admin/operations/custom-domains/${id}/logs${limit ? `?limit=${limit}` : ''}`),

    // =========================================================================
    // 26. Real-Time AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows
    // =========================================================================

    getAgentFleetTelemetry: () =>
      this.request<AgentFleetTelemetry>('/admin/operations/agent-fleet/telemetry'),

    listFleetAgents: (params?: { role?: string; status?: string; tenantId?: string; search?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.role) qs.set('role', params.role);
      if (params?.status) qs.set('status', params.status);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ agents: AgentFleetDefinition[]; total: number }>(`/admin/operations/agent-fleet/agents${q}`);
    },

    getFleetAgent: (id: string) =>
      this.request<AgentFleetDefinition>(`/admin/operations/agent-fleet/agents/${id}`),

    createFleetAgent: (data: CreateAgentDefinitionDto) =>
      this.request<AgentFleetDefinition>('/admin/operations/agent-fleet/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateFleetAgent: (id: string, data: UpdateAgentDefinitionDto) =>
      this.request<AgentFleetDefinition>(`/admin/operations/agent-fleet/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteFleetAgent: (id: string) =>
      this.request<{ success: boolean; deletedAgentId: string }>(`/admin/operations/agent-fleet/agents/${id}`, {
        method: 'DELETE',
      }),

    listFleetWorkflows: (params?: { tenantId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.status) qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ workflows: AgentFleetWorkflow[]; total: number }>(`/admin/operations/agent-fleet/workflows${q}`);
    },

    getFleetWorkflow: (id: string) =>
      this.request<AgentFleetWorkflow>(`/admin/operations/agent-fleet/workflows/${id}`),

    createFleetWorkflow: (data: CreateWorkflowDto) =>
      this.request<AgentFleetWorkflow>('/admin/operations/agent-fleet/workflows', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateFleetWorkflow: (id: string, data: UpdateWorkflowDto) =>
      this.request<AgentFleetWorkflow>(`/admin/operations/agent-fleet/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteFleetWorkflow: (id: string) =>
      this.request<{ success: boolean; deletedWorkflowId: string }>(`/admin/operations/agent-fleet/workflows/${id}`, {
        method: 'DELETE',
      }),

    dispatchWorkflowExecution: (data: DispatchWorkflowRunDto) =>
      this.request<{ execution: AgentWorkflowExecution; steps: AgentExecutionStep[] }>('/admin/operations/agent-fleet/executions/dispatch', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listWorkflowExecutions: (params?: { workflowId?: string; tenantId?: string; status?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.workflowId) qs.set('workflowId', params.workflowId);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ executions: AgentWorkflowExecution[]; total: number }>(`/admin/operations/agent-fleet/executions${q}`);
    },

    getWorkflowExecution: (id: string) =>
      this.request<{ execution: AgentWorkflowExecution; steps: AgentExecutionStep[] }>(`/admin/operations/agent-fleet/executions/${id}`),

    abortWorkflowExecution: (id: string, reason?: string) =>
      this.request<AgentWorkflowExecution>(`/admin/operations/agent-fleet/executions/${id}/abort`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    critiqueExecutionStep: (stepId: string, data: CritiqueStepDto) =>
      this.request<AgentExecutionStep>(`/admin/operations/agent-fleet/steps/${stepId}/critique`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 27. Edge Caching & Real-Time CDN Hub
    getEdgeCacheOverview: () =>
      this.request<EdgeCacheOverview>('/admin/operations/edge-cache/overview'),

    listEdgeNodes: () =>
      this.request<EdgeCacheNode[]>('/admin/operations/edge-cache/nodes'),

    getEdgeNode: (id: string) =>
      this.request<EdgeCacheNode>(`/admin/operations/edge-cache/nodes/${id}`),

    updateEdgeNodeStatus: (id: string, status: EdgeNodeStatus) =>
      this.request<EdgeCacheNode>(`/admin/operations/edge-cache/nodes/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    listEdgeRules: (tenantId?: string) => {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return this.request<EdgeCacheRule[]>(`/admin/operations/edge-cache/rules${qs}`);
    },

    getEdgeRule: (id: string) =>
      this.request<EdgeCacheRule>(`/admin/operations/edge-cache/rules/${id}`),

    createEdgeRule: (data: Partial<EdgeCacheRule>) =>
      this.request<EdgeCacheRule>('/admin/operations/edge-cache/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateEdgeRule: (id: string, data: Partial<EdgeCacheRule>) =>
      this.request<EdgeCacheRule>(`/admin/operations/edge-cache/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    toggleEdgeRule: (id: string, isEnabled: boolean) =>
      this.request<EdgeCacheRule>(`/admin/operations/edge-cache/rules/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
      }),

    deleteEdgeRule: (id: string) =>
      this.request<{ success: boolean; deletedId: string }>(`/admin/operations/edge-cache/rules/${id}`, {
        method: 'DELETE',
      }),

    executeEdgePurge: (data: { purgeType: EdgePurgeType; targets: string[]; reason: string; tenantId?: string }) =>
      this.request<EdgePurgeRequest>('/admin/operations/edge-cache/purge', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listEdgePurgeLogs: (limit?: number) => {
      const qs = limit ? `?limit=${limit}` : '';
      return this.request<EdgePurgeRequest[]>(`/admin/operations/edge-cache/purge/logs${qs}`);
    },

    simulateEdgeRequest: (data: { route: string; method?: string; headers?: Record<string, string> }) =>
      this.request<EdgeSimulationResult>('/admin/operations/edge-cache/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getEdgeTrafficMetrics: (limit?: number) => {
      const qs = limit ? `?limit=${limit}` : '';
      return this.request<EdgeTrafficMetric[]>(`/admin/operations/edge-cache/metrics${qs}`);
    },

    // 28. Advanced Vector Search & Brand Knowledge Graph
    getKnowledgeGraphOverview: (brandId?: string) => {
      const qs = brandId ? `?brandId=${encodeURIComponent(brandId)}` : '';
      return this.request<KnowledgeGraphOverview>(`/admin/operations/knowledge-graph/overview${qs}`);
    },

    listKnowledgeNodes: (params?: { brandId?: string; tenantId?: string; entityType?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.set('brandId', params.brandId);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.entityType) qs.set('entityType', params.entityType);
      if (params?.search) qs.set('search', params.search);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<KnowledgeNode[]>(`/admin/operations/knowledge-graph/nodes${q}`);
    },

    getKnowledgeNode: (id: string) =>
      this.request<KnowledgeNode>(`/admin/operations/knowledge-graph/nodes/${id}`),

    createKnowledgeNode: (data: Partial<KnowledgeNode>) =>
      this.request<KnowledgeNode>('/admin/operations/knowledge-graph/nodes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateKnowledgeNode: (id: string, data: Partial<KnowledgeNode>) =>
      this.request<KnowledgeNode>(`/admin/operations/knowledge-graph/nodes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteKnowledgeNode: (id: string) =>
      this.request<{ success: boolean; deletedId: string }>(`/admin/operations/knowledge-graph/nodes/${id}`, {
        method: 'DELETE',
      }),

    listKnowledgeEdges: (params?: { brandId?: string; tenantId?: string; sourceNodeId?: string; targetNodeId?: string; relationType?: string }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.set('brandId', params.brandId);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.sourceNodeId) qs.set('sourceNodeId', params.sourceNodeId);
      if (params?.targetNodeId) qs.set('targetNodeId', params.targetNodeId);
      if (params?.relationType) qs.set('relationType', params.relationType);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<KnowledgeEdge[]>(`/admin/operations/knowledge-graph/edges${q}`);
    },

    createKnowledgeEdge: (data: Partial<KnowledgeEdge>) =>
      this.request<KnowledgeEdge>('/admin/operations/knowledge-graph/edges', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteKnowledgeEdge: (id: string) =>
      this.request<{ success: boolean; deletedId: string }>(`/admin/operations/knowledge-graph/edges/${id}`, {
        method: 'DELETE',
      }),

    listVectorMemories: (params?: { brandId?: string; tenantId?: string; memoryType?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.set('brandId', params.brandId);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.memoryType) qs.set('memoryType', params.memoryType);
      if (params?.search) qs.set('search', params.search);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<SemanticVectorMemory[]>(`/admin/operations/knowledge-graph/memories${q}`);
    },

    createVectorMemory: (data: Partial<SemanticVectorMemory>) =>
      this.request<SemanticVectorMemory>('/admin/operations/knowledge-graph/memories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteVectorMemory: (id: string) =>
      this.request<{ success: boolean; deletedId: string }>(`/admin/operations/knowledge-graph/memories/${id}`, {
        method: 'DELETE',
      }),

    semanticSearchKnowledge: (data: SemanticSearchQuery) =>
      this.request<SemanticSearchResult>('/admin/operations/knowledge-graph/search', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    traverseKnowledgeGraph: (data: { rootNodeId: string; maxDepth?: number }) =>
      this.request<GraphTraversalResult>('/admin/operations/knowledge-graph/traverse', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 29. Enterprise Predictive Churn & Revenue Intelligence
    getRevenueIntelligenceOverview: () =>
      this.request<RevenueIntelligenceTelemetry>('/admin/operations/revenue-intelligence/overview'),

    listChurnScores: (params?: { tier?: string; primaryRiskFactor?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.tier) qs.set('tier', params.tier);
      if (params?.primaryRiskFactor) qs.set('primaryRiskFactor', params.primaryRiskFactor);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<TenantChurnScore[]>(`/admin/operations/revenue-intelligence/churn-scores${q}`);
    },

    getTenantChurnScore: (tenantId: string) =>
      this.request<TenantChurnScore>(`/admin/operations/revenue-intelligence/churn-scores/${tenantId}`),

    evaluateTenantRisk: (data: AssessTenantRiskRequest & { usageVelocityScore?: number; seatUtilizationPercent?: number; billingHealthScore?: number; supportSentiment?: number }) =>
      this.request<TenantChurnScore>('/admin/operations/revenue-intelligence/churn-scores/evaluate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listLtvMetrics: (params?: { tier?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.tier) qs.set('tier', params.tier);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<CustomerLtvMetric[]>(`/admin/operations/revenue-intelligence/ltv-metrics${q}`);
    },

    getTenantLtvMetric: (tenantId: string) =>
      this.request<CustomerLtvMetric>(`/admin/operations/revenue-intelligence/ltv-metrics/${tenantId}`),

    listInterventions: (params?: { status?: string; priority?: string; tenantId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<CustomerSuccessIntervention[]>(`/admin/operations/revenue-intelligence/interventions${q}`);
    },

    createIntervention: (data: CreateInterventionRequest) =>
      this.request<CustomerSuccessIntervention>('/admin/operations/revenue-intelligence/interventions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateIntervention: (id: string, data: UpdateInterventionRequest) =>
      this.request<CustomerSuccessIntervention>(`/admin/operations/revenue-intelligence/interventions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteIntervention: (id: string) =>
      this.request<{ success: boolean; message: string }>(`/admin/operations/revenue-intelligence/interventions/${id}`, {
        method: 'DELETE',
      }),

    simulatePredictiveScenario: (data: PredictiveSimulationRequest) =>
      this.request<PredictiveSimulationResponse>('/admin/operations/revenue-intelligence/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 30. Enterprise Global API Gateway & Token Bucket Throttling
    getApiGatewayTelemetry: () =>
      this.request<GatewayTelemetry>('/admin/operations/api-gateway/telemetry'),

    listGatewayRoutes: (params?: { serviceName?: string; isActive?: boolean; tier?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.serviceName) qs.set('serviceName', params.serviceName);
      if (params?.isActive !== undefined) qs.set('isActive', String(params.isActive));
      if (params?.tier) qs.set('tier', params.tier);
      if (params?.search) qs.set('search', params.search);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<GatewayRoute[]>(`/admin/operations/api-gateway/routes${q}`);
    },

    getGatewayRoute: (id: string) =>
      this.request<GatewayRoute>(`/admin/operations/api-gateway/routes/${id}`),

    createGatewayRoute: (data: CreateGatewayRouteDto) =>
      this.request<GatewayRoute>('/admin/operations/api-gateway/routes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateGatewayRoute: (id: string, data: UpdateGatewayRouteDto) =>
      this.request<GatewayRoute>(`/admin/operations/api-gateway/routes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteGatewayRoute: (id: string) =>
      this.request<{ success: boolean; message: string }>(`/admin/operations/api-gateway/routes/${id}`, {
        method: 'DELETE',
      }),

    listTokenBuckets: (params?: { tenantId?: string; routeId?: string; isThrottled?: boolean; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.routeId) qs.set('routeId', params.routeId);
      if (params?.isThrottled !== undefined) qs.set('isThrottled', String(params.isThrottled));
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<TokenBucketQuota[]>(`/admin/operations/api-gateway/buckets${q}`);
    },

    resetTokenBucket: (tenantId: string, routeId: string) =>
      this.request<TokenBucketQuota>('/admin/operations/api-gateway/buckets/reset', {
        method: 'POST',
        body: JSON.stringify({ tenantId, routeId }),
      }),

    consumeGatewayToken: (tenantId: string, routePath: string, tokenCost = 1) =>
      this.request<{ allowed: boolean; remainingTokens: number; retryAfterSeconds: number }>('/admin/operations/api-gateway/consume', {
        method: 'POST',
        body: JSON.stringify({ tenantId, routePath, tokenCost }),
      }),

    listThrottleLogs: (params?: { tenantId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ThrottleAuditLog[]>(`/admin/operations/api-gateway/logs${q}`);
    },

    simulateGatewayThrottle: (data: SimulateThrottleRequest) =>
      this.request<SimulateThrottleResponse>('/admin/operations/api-gateway/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 31. Enterprise Multi-Region Disaster Failover & Live Active-Active Database Replication Mesh
    getReplicationTelemetry: () =>
      this.request<MeshTopologyTelemetry>('/admin/operations/replication-mesh/telemetry'),

    listReplicationNodes: (params?: { region_code?: string; role?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.region_code) qs.set('region_code', params.region_code);
      if (params?.role) qs.set('role', params.role);
      if (params?.status) qs.set('status', params.status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ReplicationNode[]>(`/admin/operations/replication-mesh/nodes${q}`);
    },

    getReplicationNode: (id: string) =>
      this.request<ReplicationNode>(`/admin/operations/replication-mesh/nodes/${id}`),

    createReplicationNode: (data: CreateReplicationNodeInput) =>
      this.request<ReplicationNode>('/admin/operations/replication-mesh/nodes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateReplicationNode: (id: string, data: UpdateReplicationNodeInput) =>
      this.request<ReplicationNode>(`/admin/operations/replication-mesh/nodes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteReplicationNode: (id: string) =>
      this.request<{ deleted: boolean; id: string }>(`/admin/operations/replication-mesh/nodes/${id}`, {
        method: 'DELETE',
      }),

    recordReplicationHeartbeat: (nodeId: string, data: Partial<ReplicationHeartbeatEvent>) =>
      this.request<ReplicationHeartbeatEvent>(`/admin/operations/replication-mesh/nodes/${nodeId}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listReplicationHeartbeats: (params?: { nodeId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.nodeId) qs.set('nodeId', params.nodeId);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ReplicationHeartbeatEvent[]>(`/admin/operations/replication-mesh/heartbeats${q}`);
    },

    simulateFailover: (candidateNodeId: string) =>
      this.request<FailoverSimulationResult>('/admin/operations/replication-mesh/simulate', {
        method: 'POST',
        body: JSON.stringify({ candidateNodeId }),
      }),

    executeFailover: (data: FailoverExecutionRequest) =>
      this.request<{
        success: boolean;
        promotedNode: ReplicationNode;
        previousLeader: ReplicationNode | null;
        failoverEvent: FailoverQuorumEvent;
      }>('/admin/operations/replication-mesh/failover', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listFailoverEvents: (limit?: number) => {
      const q = limit ? `?limit=${limit}` : '';
      return this.request<FailoverQuorumEvent[]>(`/admin/operations/replication-mesh/failover/events${q}`);
    },

    // 32. Enterprise Automated Chaos Engineering, Resiliency Testing & Fault Injection Engine
    getChaosTelemetry: () =>
      this.request<ChaosResilienceTelemetry>('/admin/operations/chaos-engineering/telemetry'),

    listChaosExperiments: (params?: { status?: string; subsystem?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.subsystem) qs.set('subsystem', params.subsystem);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ChaosExperiment[]>(`/admin/operations/chaos-engineering/experiments${q}`);
    },

    getChaosExperiment: (id: string) =>
      this.request<ChaosExperiment>(`/admin/operations/chaos-engineering/experiments/${id}`),

    createChaosExperiment: (data: CreateChaosExperimentDto) =>
      this.request<ChaosExperiment>('/admin/operations/chaos-engineering/experiments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateChaosExperiment: (id: string, data: UpdateChaosExperimentDto) =>
      this.request<ChaosExperiment>(`/admin/operations/chaos-engineering/experiments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteChaosExperiment: (id: string) =>
      this.request<{ deleted: boolean; id: string }>(`/admin/operations/chaos-engineering/experiments/${id}`, {
        method: 'DELETE',
      }),

    executeChaosExperiment: (id: string) =>
      this.request<{
        success: boolean;
        experiment: ChaosExperiment;
        execution: ChaosFaultExecution;
        tripwireTriggered: boolean;
      }>(`/admin/operations/chaos-engineering/experiments/${id}/execute`, {
        method: 'POST',
      }),

    abortChaosExperiment: (id: string, reason?: string) =>
      this.request<ChaosExperiment>(`/admin/operations/chaos-engineering/experiments/${id}/abort`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    simulateChaosExperiment: (data: RunChaosSimulationDto) =>
      this.request<ChaosSimulationResult>('/admin/operations/chaos-engineering/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listChaosTripwires: (params?: { experimentId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.experimentId) qs.set('experimentId', params.experimentId);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ChaosTripwireEvent[]>(`/admin/operations/chaos-engineering/tripwires${q}`);
    },

    // 33. Enterprise Zero-Trust Secret Rotation, Confidential Computing & Key Management Mesh
    getSecretRotationTelemetry: () =>
      this.request<SecretRotationTelemetry>('/admin/operations/secret-rotation/telemetry'),

    listSecretVaultKeys: (params?: { status?: string; vault_provider?: string; key_type?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.vault_provider) qs.set('vault_provider', params.vault_provider);
      if (params?.key_type) qs.set('key_type', params.key_type);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<SecretVaultKey[]>(`/admin/operations/secret-rotation/keys${q}`);
    },

    getSecretVaultKey: (id: string) =>
      this.request<SecretVaultKey>(`/admin/operations/secret-rotation/keys/${id}`),

    createSecretVaultKey: (data: {
      key_alias: string;
      key_type: SecretType;
      vault_provider: VaultProvider;
      rotation_interval_days?: number;
      auto_rotate_enabled?: boolean;
      grace_period_hours?: number;
      algorithm?: string;
      metadata?: Record<string, any>;
    }) =>
      this.request<SecretVaultKey>('/admin/operations/secret-rotation/keys', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateSecretVaultKey: (
      id: string,
      data: {
        rotation_interval_days?: number;
        auto_rotate_enabled?: boolean;
        grace_period_hours?: number;
        metadata?: Record<string, any>;
      }
    ) =>
      this.request<SecretVaultKey>(`/admin/operations/secret-rotation/keys/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteSecretVaultKey: (id: string) =>
      this.request<{ success: boolean; message: string }>(`/admin/operations/secret-rotation/keys/${id}`, {
        method: 'DELETE',
      }),

    rotateSecretVaultKey: (id: string, options?: { trigger?: string; algorithm?: string }) =>
      this.request<{
        success: boolean;
        key: SecretVaultKey;
        newVersion: SecretKeyVersion;
      }>(`/admin/operations/secret-rotation/keys/${id}/rotate`, {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }),

    revokeSecretVaultKey: (id: string, reason: string) =>
      this.request<SecretVaultKey>(`/admin/operations/secret-rotation/keys/${id}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    simulateEnvelopeReEncrypt: (data?: { key_alias?: string; target_record_count?: number }) =>
      this.request<EnvelopeReEncryptSimulationResult>('/admin/operations/secret-rotation/simulate-envelope-reencrypt', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),

    // 34. Enterprise Multi-Cloud Infrastructure FinOps, Real-Time Cost Attribution & Resource Rightsizing Engine
    getFinOpsTelemetry: () =>
      this.request<FinOpsTelemetry>('/admin/operations/finops/telemetry'),

    listCloudAccounts: (params?: { provider?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.provider) qs.set('provider', params.provider);
      if (params?.status) qs.set('status', params.status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<CloudCostAccount[]>(`/admin/operations/finops/accounts${q}`);
    },

    getCloudAccount: (id: string) =>
      this.request<CloudCostAccount>(`/admin/operations/finops/accounts/${id}`),

    createCloudAccount: (data: {
      provider: CloudProvider;
      account_id: string;
      account_name: string;
      monthly_budget: number;
      current_month_spend?: number;
      currency?: string;
    }) =>
      this.request<CloudCostAccount>('/admin/operations/finops/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateCloudAccount: (
      id: string,
      data: {
        account_name?: string;
        monthly_budget?: number;
        current_month_spend?: number;
        status?: 'active' | 'warning_budget' | 'exceeded_budget';
      }
    ) =>
      this.request<CloudCostAccount>(`/admin/operations/finops/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteCloudAccount: (id: string) =>
      this.request<{ success: boolean; message: string }>(`/admin/operations/finops/accounts/${id}`, {
        method: 'DELETE',
      }),

    listTenantCostAttributions: (params?: { period?: string; tenantId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.period) qs.set('period', params.period);
      if (params?.tenantId) qs.set('tenantId', params.tenantId);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<TenantCostAttribution[]>(`/admin/operations/finops/tenant-attributions${q}`);
    },

    listRightsizingRecommendations: (params?: { status?: string; provider?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.provider) qs.set('provider', params.provider);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<FinOpsResourceRightsizing[]>(`/admin/operations/finops/rightsizing${q}`);
    },

    applyRightsizingRecommendation: (id: string) =>
      this.request<FinOpsResourceRightsizing>(`/admin/operations/finops/rightsizing/${id}/apply`, {
        method: 'POST',
      }),

    dismissRightsizingRecommendation: (id: string) =>
      this.request<FinOpsResourceRightsizing>(`/admin/operations/finops/rightsizing/${id}/dismiss`, {
        method: 'POST',
      }),

    simulateFinOpsGrowth: (data?: {
      target_tenant_id?: string;
      post_growth_percent?: number;
      ai_token_growth_percent?: number;
    }) =>
      this.request<FinOpsCostSimulationResult>('/admin/operations/finops/simulate', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),

    // 35. Enterprise Continuous Compliance, SOC2/HIPAA/GDPR Automated Evidence Locker & Security Posture Mesh
    getContinuousComplianceTelemetry: () =>
      this.request<ContinuousComplianceTelemetry>('/admin/operations/compliance-locker/telemetry'),

    listComplianceControls: (params?: { framework?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.framework) qs.set('framework', params.framework);
      if (params?.status) qs.set('status', params.status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ComplianceControl[]>(`/admin/operations/compliance-locker/controls${q}`);
    },

    getComplianceControl: (id: string) =>
      this.request<ComplianceControl>(`/admin/operations/compliance-locker/controls/${id}`),

    evaluateComplianceControl: (id: string) =>
      this.request<{ control: ComplianceControl; evidence: ComplianceEvidence }>(
        `/admin/operations/compliance-locker/controls/${id}/evaluate`,
        { method: 'POST' }
      ),

    listComplianceEvidence: (params?: { controlId?: string; collectorType?: string }) => {
      const qs = new URLSearchParams();
      if (params?.controlId) qs.set('controlId', params.controlId);
      if (params?.collectorType) qs.set('collectorType', params.collectorType);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ComplianceEvidence[]>(`/admin/operations/compliance-locker/evidence${q}`);
    },

    listAuditorPortalSessions: () =>
      this.request<AuditorPortalSession[]>('/admin/operations/compliance-locker/auditor-sessions'),

    createAuditorPortalSession: (data: {
      auditor_email: string;
      auditor_firm: string;
      framework_scope: ComplianceFrameworkType[];
      duration_days?: number;
    }) =>
      this.request<AuditorPortalSession>('/admin/operations/compliance-locker/auditor-sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    revokeAuditorPortalSession: (id: string) =>
      this.request<AuditorPortalSession>(`/admin/operations/compliance-locker/auditor-sessions/${id}/revoke`, {
        method: 'POST',
      }),

    simulateComplianceAudit: (data: SimulateComplianceAuditRequest) =>
      this.request<SimulateComplianceAuditResult>('/admin/operations/compliance-locker/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    exportEvidencePackage: (framework: ComplianceFrameworkType) =>
      this.request<{
        framework: string;
        generatedAt: string;
        controls: ComplianceControl[];
        evidenceLedger: ComplianceEvidence[];
        packageHash: string;
      }>(`/admin/operations/compliance-locker/export-package?framework=${framework}`),

    // 36. Enterprise Global Event Mesh, Distributed Dead-Letter Replay & Exactly-Once Webhook Processing Pipeline
    getEventMeshTelemetry: () =>
      this.request<EventMeshTelemetry>('/admin/operations/event-mesh/telemetry'),

    listEventMeshTopics: () =>
      this.request<EventMeshTopic[]>('/admin/operations/event-mesh/topics'),

    createEventMeshTopic: (data: {
      topic_name: string;
      partition_count?: number;
      retention_hours?: number;
      schema_validation?: 'strict' | 'relaxed' | 'disabled';
    }) =>
      this.request<EventMeshTopic>('/admin/operations/event-mesh/topics', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listEventMeshSubscriptions: (topicId?: string) =>
      this.request<EventMeshSubscription[]>(
        `/admin/operations/event-mesh/subscriptions${topicId ? `?topicId=${topicId}` : ''}`
      ),

    updateEventMeshCircuitBreaker: (
      subscriptionId: string,
      status: EventMeshCircuitBreakerStatus
    ) =>
      this.request<EventMeshSubscription>(
        `/admin/operations/event-mesh/subscriptions/${subscriptionId}/circuit-breaker`,
        {
          method: 'POST',
          body: JSON.stringify({ circuit_breaker_status: status }),
        }
      ),

    listEventMeshDlq: (params?: { status?: string; topic_name?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.topic_name) qs.set('topic_name', params.topic_name);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<EventMeshDlqMessage[]>(`/admin/operations/event-mesh/dlq${q}`);
    },

    replayEventMeshDlq: (data: ReplayDlqRequest) =>
      this.request<ReplayDlqResult>('/admin/operations/event-mesh/dlq/replay', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    discardEventMeshDlq: (data: DiscardDlqRequest) =>
      this.request<{ discarded_count: number }>('/admin/operations/event-mesh/dlq/discard', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listEventMeshIdempotencyKeys: (limit?: number) =>
      this.request<EventMeshIdempotencyRecord[]>(
        `/admin/operations/event-mesh/idempotency-keys${limit ? `?limit=${limit}` : ''}`
      ),

    simulateEventMeshEvent: (data: SimulateEventMeshRequest) =>
      this.request<SimulateEventMeshResult>('/admin/operations/event-mesh/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 37. Enterprise Automated Database Partitioning, Cold-Tier Sharding & Zero-Downtime Data Lifecycle Archival
    getDatabaseArchivalTelemetry: () =>
      this.request<DatabasePartitioningTelemetry>('/admin/operations/database-archival/telemetry'),

    listDatabasePartitionConfigs: () =>
      this.request<DatabasePartitionConfig[]>('/admin/operations/database-archival/configs'),

    createDatabasePartitionConfig: (data: {
      table_name: string;
      partition_type?: DatabasePartitionType;
      partition_key: string;
      retention_days?: number;
      active_partition_count?: number;
    }) =>
      this.request<DatabasePartitionConfig>('/admin/operations/database-archival/configs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    pruneDatabasePartitions: (tableName: string) =>
      this.request<{ table_name: string; partitions_dropped: number; freed_mb: number }>(
        `/admin/operations/database-archival/configs/${tableName}/prune`,
        { method: 'POST' }
      ),

    listDatabaseArchivalPolicies: () =>
      this.request<DatabaseArchivalPolicy[]>('/admin/operations/database-archival/policies'),

    createDatabaseArchivalPolicy: (data: {
      policy_name: string;
      target_table: string;
      age_threshold_days?: number;
      target_storage_tier?: DatabaseStorageTier;
      compression_format?: DatabaseCompressionFormat;
      schedule_cron?: string;
    }) =>
      this.request<DatabaseArchivalPolicy>('/admin/operations/database-archival/policies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listDatabaseColdTierArchives: (params?: { table_name?: string; status?: string }) => {
      const qs = new URLSearchParams();
      if (params?.table_name) qs.set('table_name', params.table_name);
      if (params?.status) qs.set('status', params.status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<DatabaseColdTierArchive[]>(`/admin/operations/database-archival/archives${q}`);
    },

    triggerDatabaseArchival: (data: TriggerArchivalRequest) =>
      this.request<TriggerArchivalResult>('/admin/operations/database-archival/archives/trigger', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    rehydrateDatabaseArchive: (data: RehydrateArchiveRequest) =>
      this.request<RehydrateArchiveResult>('/admin/operations/database-archival/archives/rehydrate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listDatabasePartitionMaintenanceLogs: (limit?: number) =>
      this.request<DatabasePartitionMaintenanceLog[]>(
        `/admin/operations/database-archival/maintenance-logs${limit ? `?limit=${limit}` : ''}`
      ),

    simulateDatabasePartitioning: (data: SimulatePartitioningRequest) =>
      this.request<SimulatePartitioningResult>('/admin/operations/database-archival/simulate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 38. Enterprise Real-Time Query Federation, Distributed Read Replicas & CQRS Materialized Views Engine
    getQueryFederationTelemetry: () =>
      this.request<QueryFederationTelemetry>('/admin/operations/query-federation/telemetry'),

    listFederationSources: () =>
      this.request<QueryFederationSource[]>('/admin/operations/query-federation/sources'),

    updateFederationSourceWeight: (sourceId: string, readWeight: number) =>
      this.request<UpdateReplicaWeightResult>(`/admin/operations/query-federation/sources/${sourceId}/weight`, {
        method: 'PUT',
        body: JSON.stringify({ read_weight: readWeight }),
      }),

    listReadReplicaClusters: () =>
      this.request<ReadReplicaCluster[]>('/admin/operations/query-federation/replicas'),

    failoverReadReplica: (replicaId: string, data?: FailoverReplicaRequest) =>
      this.request<FailoverReplicaResult>(`/admin/operations/query-federation/replicas/${replicaId}/failover`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),

    listCqrsMaterializedViews: () =>
      this.request<CqrsMaterializedView[]>('/admin/operations/query-federation/materialized-views'),

    refreshCqrsMaterializedView: (viewId: string, data?: RefreshMaterializedViewRequest) =>
      this.request<RefreshMaterializedViewResult>(`/admin/operations/query-federation/materialized-views/${viewId}/refresh`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),

    listMaterializedViewRefreshLogs: (params?: { view_id?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.view_id) qs.set('view_id', params.view_id);
      if (params?.limit) qs.set('limit', String(params.limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<MaterializedViewRefreshLog[]>(`/admin/operations/query-federation/refresh-logs${q}`);
    },

    benchmarkFederatedQuery: (data: BenchmarkFederatedQueryRequest) =>
      this.request<BenchmarkFederatedQueryResult>('/admin/operations/query-federation/benchmark', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 39. Enterprise Cross-Region Active-Active Multi-Master Conflict Resolution & Global Distributed Consistency Engine
    getMultiMasterTelemetry: () =>
      this.request<MultiMasterTelemetry>('/admin/operations/multi-master/telemetry'),

    listMultiMasterNodes: () =>
      this.request<MultiMasterNode[]>('/admin/operations/multi-master/nodes'),

    updateMultiMasterFencing: (nodeId: string, data: UpdateQuorumFencingRequest) =>
      this.request<UpdateQuorumFencingResult>(`/admin/operations/multi-master/nodes/${nodeId}/fence`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listVectorClocks: (entityType?: string) => {
      const qs = new URLSearchParams();
      if (entityType) qs.set('entity_type', entityType);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<VectorClockState[]>(`/admin/operations/multi-master/vector-clocks${q}`);
    },

    listConflictResolutionPolicies: () =>
      this.request<ConflictResolutionPolicy[]>('/admin/operations/multi-master/policies'),

    updateConflictResolutionPolicy: (policyId: string, data: UpdateResolutionPolicyRequest) =>
      this.request<UpdateResolutionPolicyResult>(`/admin/operations/multi-master/policies/${policyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    listDistributedConvergenceLogs: (limit?: number) => {
      const qs = new URLSearchParams();
      if (limit) qs.set('limit', String(limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<DistributedConvergenceLog[]>(`/admin/operations/multi-master/convergence-logs${q}`);
    },

    simulateConflictRace: (data: SimulateConflictRaceRequest) =>
      this.request<SimulateConflictRaceResult>('/admin/operations/multi-master/simulate-conflict', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 40. Enterprise Zero-Trust Ephemeral Access Grants, Just-In-Time (JIT) Privilege Elevation & Dual-Authorization Control Plane
    getJitTelemetry: () =>
      this.request<JitTelemetry>('/admin/operations/jit-access/telemetry'),

    listJitRequests: (status?: string) => {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<JitAccessRequest[]>(`/admin/operations/jit-access/requests${q}`);
    },

    createJitRequest: (data: CreateJitAccessRequestInput) =>
      this.request<JitAccessRequest>('/admin/operations/jit-access/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    approveJitRequest: (requestId: string, data: ApproveJitAccessRequestInput) =>
      this.request<ApproveJitAccessRequestResult>(`/admin/operations/jit-access/requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listEphemeralLeases: (status?: string) => {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<EphemeralCredentialLease[]>(`/admin/operations/jit-access/leases${q}`);
    },

    revokeEphemeralLease: (leaseId: string, reason?: string) =>
      this.request<RevokeJitLeaseResult>(`/admin/operations/jit-access/leases/${leaseId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    listDualAuthorizationRules: () =>
      this.request<DualAuthorizationRule[]>('/admin/operations/jit-access/rules'),

    listJitAuditSessions: (limit?: number) => {
      const qs = new URLSearchParams();
      if (limit) qs.set('limit', String(limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<JitAuditSession[]>(`/admin/operations/jit-access/audit-sessions${q}`);
    },

    simulateBreakGlassElevation: (data: SimulateBreakGlassInput) =>
      this.request<SimulateBreakGlassResult>('/admin/operations/jit-access/break-glass', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 41. Enterprise Cryptographic Hardware Security Module (HSM) Key Brokerage & Envelope Encryption
    getHsmTelemetry: () =>
      this.request<HsmTelemetry>('/admin/operations/hsm-broker/telemetry'),

    listHsmKeyRings: () =>
      this.request<HsmKeyRing[]>('/admin/operations/hsm-broker/key-rings'),

    createHsmKeyRing: (data: CreateKeyRingInput) =>
      this.request<HsmKeyRing>('/admin/operations/hsm-broker/key-rings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listEnvelopeDeks: (keyRingId?: string, status?: string) => {
      const qs = new URLSearchParams();
      if (keyRingId) qs.set('key_ring_id', keyRingId);
      if (status) qs.set('status', status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<EnvelopeDataEncryptionKey[]>(`/admin/operations/hsm-broker/deks${q}`);
    },

    generateEnvelopeDek: (data: GenerateDekInput) =>
      this.request<EnvelopeDataEncryptionKey>('/admin/operations/hsm-broker/deks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listHsmPolicies: () =>
      this.request<KeyDerivationPolicy[]>('/admin/operations/hsm-broker/policies'),

    listHsmCryptoLogs: (limit?: number) => {
      const qs = new URLSearchParams();
      if (limit) qs.set('limit', String(limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<HsmCryptoAuditLog[]>(`/admin/operations/hsm-broker/audit-logs${q}`);
    },

    envelopeEncrypt: (data: EnvelopeEncryptInput) =>
      this.request<EnvelopeEncryptResult>('/admin/operations/hsm-broker/encrypt', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    envelopeDecrypt: (data: EnvelopeDecryptInput) =>
      this.request<EnvelopeDecryptResult>('/admin/operations/hsm-broker/decrypt', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    rotateHsmRootKek: (keyRingId: string) =>
      this.request<RotateRootKekResult>(`/admin/operations/hsm-broker/key-rings/${keyRingId}/rotate`, {
        method: 'POST',
      }),

    cryptoShredDek: (dekId: string, data: ShredDekInput) =>
      this.request<ShredDekResult>(`/admin/operations/hsm-broker/deks/${dekId}/shred`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 42. Enterprise Multi-Cloud Distributed Object Storage Tiering, Immutable Object Lock & Presigned Upload Gateway
    getObjectStorageTelemetry: () =>
      this.request<ObjectStorageTelemetry>('/admin/operations/object-storage/telemetry'),

    listStorageBuckets: () =>
      this.request<StorageBucket[]>('/admin/operations/object-storage/buckets'),

    createStorageBucket: (data: CreateBucketInput) =>
      this.request<StorageBucket>('/admin/operations/object-storage/buckets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listObjectLifecycleRules: (bucketId?: string) => {
      const qs = new URLSearchParams();
      if (bucketId) qs.set('bucket_id', bucketId);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ObjectStorageLifecycleRule[]>(`/admin/operations/object-storage/lifecycle-rules${q}`);
    },

    createObjectLifecycleRule: (data: CreateLifecycleRuleInput) =>
      this.request<ObjectStorageLifecycleRule>('/admin/operations/object-storage/lifecycle-rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listImmutableObjectLocks: (bucketId?: string) => {
      const qs = new URLSearchParams();
      if (bucketId) qs.set('bucket_id', bucketId);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<ImmutableObjectLock[]>(`/admin/operations/object-storage/locks${q}`);
    },

    createImmutableObjectLock: (data: CreateObjectLockInput) =>
      this.request<ImmutableObjectLock>('/admin/operations/object-storage/locks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteStorageObject: (bucketId: string, objectKey: string) =>
      this.request<{ deleted: boolean; message: string }>('/admin/operations/object-storage/delete-object', {
        method: 'POST',
        body: JSON.stringify({ bucket_id: bucketId, object_key: objectKey }),
      }),

    generatePresignedUploadUrl: (data: GeneratePresignedUploadInput) =>
      this.request<GeneratePresignedUploadResult>('/admin/operations/object-storage/presigned-upload', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listPresignedUploadSessions: (bucketId?: string) => {
      const qs = new URLSearchParams();
      if (bucketId) qs.set('bucket_id', bucketId);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<PresignedUploadSession[]>(`/admin/operations/object-storage/presigned-sessions${q}`);
    },

    verifyUploadedObjectChecksum: (data: VerifyUploadedObjectInput) =>
      this.request<VerifyUploadedObjectResult>('/admin/operations/object-storage/verify-upload', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    simulateBucketLifecycleTiering: (bucketId: string) =>
      this.request<any>(`/admin/operations/object-storage/buckets/${bucketId}/simulate-tiering`, {
        method: 'POST',
      }),

    // 43. Enterprise Distributed Semantic Search, Neural Vector Embedding Ingestion & Hybrid RAG Knowledge Mesh
    getNeuralRagTelemetry: () =>
      this.request<NeuralRagTelemetry>('/admin/operations/neural-rag/telemetry'),

    listNeuralModels: () =>
      this.request<NeuralEmbeddingModel[]>('/admin/operations/neural-rag/models'),

    createNeuralModel: (data: CreateModelInput) =>
      this.request<NeuralEmbeddingModel>('/admin/operations/neural-rag/models', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listKnowledgeCollections: () =>
      this.request<RagKnowledgeCollection[]>('/admin/operations/neural-rag/collections'),

    createKnowledgeCollection: (data: CreateCollectionInput) =>
      this.request<RagKnowledgeCollection>('/admin/operations/neural-rag/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    ingestVectorEmbedding: (data: IngestVectorEmbeddingInput) =>
      this.request<SemanticVectorEmbedding>('/admin/operations/neural-rag/embeddings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    executeHybridSearch: (data: HybridSearchQueryInput) =>
      this.request<HybridSearchQueryResult>('/admin/operations/neural-rag/hybrid-search', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listHybridSearchLogs: (collectionId?: string) => {
      const qs = new URLSearchParams();
      if (collectionId) qs.set('collection_id', collectionId);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<HybridSearchQueryLog[]>(`/admin/operations/neural-rag/query-logs${q}`);
    },

    // 44. Multi-Tenant Real-Time Collaborative Canvas, Operational Transformation (OT/CRDT) & Presence Gateway
    getCollaborativeCanvasTelemetry: () =>
      this.request<CollaborativeCanvasTelemetry>('/admin/operations/collaborative-canvas/telemetry'),

    listCanvasRooms: () =>
      this.request<CanvasRoom[]>('/admin/operations/collaborative-canvas/rooms'),

    createCanvasRoom: (data: CreateCanvasRoomInput) =>
      this.request<CanvasRoom>('/admin/operations/collaborative-canvas/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getCanvasRoomState: (id: string) =>
      this.request<GetRoomStateResult>(`/admin/operations/collaborative-canvas/rooms/${id}`),

    applyCanvasOp: (data: ApplyCanvasOpInput) =>
      this.request<ApplyCanvasOpResult>('/admin/operations/collaborative-canvas/ops/apply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateCanvasPresence: (data: UpdatePresenceInput) =>
      this.request<UpdatePresenceResult>('/admin/operations/collaborative-canvas/presence/heartbeat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getCanvasPresence: (roomId: string) =>
      this.request<ActiveUserPresenceSession[]>(`/admin/operations/collaborative-canvas/presence/${roomId}`),

    getCanvasOps: (roomId: string, limit?: number) =>
      this.request<OperationalTransformationOp[]>(
        `/admin/operations/collaborative-canvas/ops/${roomId}${limit ? `?limit=${limit}` : ''}`
      ),

    // 45. Multi-Tenant Real-Time Video Rendering Pipeline, Dynamic Motion Graphics & Cloud GPU Transcoding Mesh
    getVideoRenderingTelemetry: () =>
      this.request<VideoRenderingTelemetry>('/admin/operations/video-rendering/telemetry'),

    listVideoRenderJobs: (brandId?: string, status?: string) => {
      const qs = new URLSearchParams();
      if (brandId) qs.set('brand_id', brandId);
      if (status) qs.set('status', status);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<GpuVideoRenderJob[]>(`/admin/operations/video-rendering/jobs${q}`);
    },

    getVideoRenderJob: (id: string) =>
      this.request<{ job: GpuVideoRenderJob; artifacts: RenderedVideoArtifact[] }>(
        `/admin/operations/video-rendering/jobs/${id}`
      ),

    createVideoRenderJob: (data: CreateRenderJobInput) =>
      this.request<GpuVideoRenderJob>('/admin/operations/video-rendering/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateVideoJobProgress: (id: string, data: Partial<UpdateJobProgressInput>) =>
      this.request<GpuVideoRenderJob>(`/admin/operations/video-rendering/jobs/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    cancelVideoRenderJob: (id: string) =>
      this.request<GpuVideoRenderJob>(`/admin/operations/video-rendering/jobs/${id}/cancel`, {
        method: 'POST',
      }),

    listMotionTemplates: (brandId?: string) => {
      const q = brandId ? `?brand_id=${brandId}` : '';
      return this.request<MotionCompositionTemplate[]>(`/admin/operations/video-rendering/templates${q}`);
    },

    createMotionTemplate: (data: CreateMotionTemplateInput) =>
      this.request<MotionCompositionTemplate>('/admin/operations/video-rendering/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listGpuNodes: () =>
      this.request<GpuTranscodeNode[]>('/admin/operations/video-rendering/nodes'),

    registerGpuNode: (data: RegisterGpuNodeInput) =>
      this.request<GpuTranscodeNode>('/admin/operations/video-rendering/nodes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 46. Enterprise Distributed Workflow Engine, State Machine Orchestration & Long-Running Saga Coordinator
    getSagaWorkflowTelemetry: () =>
      this.request<SagaWorkflowTelemetry>('/admin/operations/saga-workflows/telemetry'),

    listSagaDefinitions: () =>
      this.request<SagaWorkflowDefinition[]>('/admin/operations/saga-workflows/definitions'),

    createSagaDefinition: (data: CreateWorkflowDefinitionInput) =>
      this.request<SagaWorkflowDefinition>('/admin/operations/saga-workflows/definitions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteSagaDefinition: (id: string) =>
      this.request<{ deleted: boolean }>(`/admin/operations/saga-workflows/definitions/${id}`, {
        method: 'DELETE',
      }),

    listStateMachineInstances: (status?: string, limit?: number) => {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (limit) qs.set('limit', String(limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<StateMachineInstance[]>(`/admin/operations/saga-workflows/instances${q}`);
    },

    getStateMachineInstanceDetail: (id: string) =>
      this.request<StateMachineInstanceDetailResult>(`/admin/operations/saga-workflows/instances/${id}`),

    triggerStateMachineInstance: (data: TriggerWorkflowInstanceInput) =>
      this.request<StateMachineInstanceDetailResult>('/admin/operations/saga-workflows/instances/trigger', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    executeWorkflowStep: (
      id: string,
      stepIndex: number,
      outcome: 'succeeded' | 'failed',
      outputPayload?: Record<string, any>,
      errorMessage?: string
    ) =>
      this.request<StateMachineInstanceDetailResult>(
        `/admin/operations/saga-workflows/instances/${id}/steps/${stepIndex}`,
        {
          method: 'POST',
          body: JSON.stringify({ outcome, output_payload: outputPayload, error_message: errorMessage }),
        }
      ),

    triggerSagaCompensation: (id: string, reason: string) =>
      this.request<StateMachineInstanceDetailResult>(
        `/admin/operations/saga-workflows/instances/${id}/compensate`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),

    resumeStateMachineInstance: (id: string, resumeStepIndex?: number) =>
      this.request<StateMachineInstanceDetailResult>(
        `/admin/operations/saga-workflows/instances/${id}/resume`,
        {
          method: 'POST',
          body: JSON.stringify({ resume_step_index: resumeStepIndex }),
        }
      ),

    deleteStateMachineInstance: (id: string) =>
      this.request<{ deleted: boolean }>(`/admin/operations/saga-workflows/instances/${id}`, {
        method: 'DELETE',
      }),

    // 47. Enterprise Cross-Region Active-Active Sharding, Distributed Transaction Coordinator & Autonomous Data Rebalancing Mesh
    getShardingMeshTelemetry: () =>
      this.request<ShardingMeshTelemetry>('/admin/operations/sharding-mesh/telemetry'),

    listDatabaseShards: () =>
      this.request<DatabaseShard[]>('/admin/operations/sharding-mesh/shards'),

    registerDatabaseShard: (data: RegisterShardInput) =>
      this.request<DatabaseShard>('/admin/operations/sharding-mesh/shards', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteDatabaseShard: (id: string) =>
      this.request<{ deleted: boolean }>(`/admin/operations/sharding-mesh/shards/${id}`, {
        method: 'DELETE',
      }),

    listShardRoutingRanges: () =>
      this.request<ShardRoutingRange[]>('/admin/operations/sharding-mesh/ranges'),

    routeShardingKey: (key: string) =>
      this.request<KeyRouteResult>(`/admin/operations/sharding-mesh/route?key=${encodeURIComponent(key)}`),

    listDistributedTransactions: (status?: string, limit?: number) => {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (limit) qs.set('limit', String(limit));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<DistributedTransaction[]>(`/admin/operations/sharding-mesh/transactions${q}`);
    },

    getDistributedTransactionDetail: (id: string) =>
      this.request<DistributedTransaction>(`/admin/operations/sharding-mesh/transactions/${id}`),

    coordinateDistributedTransaction: (data: CoordinateTransactionInput) =>
      this.request<DistributedTransaction>('/admin/operations/sharding-mesh/transactions/coordinate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteDistributedTransaction: (id: string) =>
      this.request<{ deleted: boolean }>(`/admin/operations/sharding-mesh/transactions/${id}`, {
        method: 'DELETE',
      }),

    listShardMigrations: () =>
      this.request<ShardRebalanceMigration[]>('/admin/operations/sharding-mesh/migrations'),

    triggerShardRebalance: (data: TriggerRebalanceInput) =>
      this.request<ShardRebalanceMigration>('/admin/operations/sharding-mesh/migrations/rebalance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteShardMigration: (id: string) =>
      this.request<{ deleted: boolean }>(`/admin/operations/sharding-mesh/migrations/${id}`, {
        method: 'DELETE',
      }),
  };

  /**
   * External Legal Verification Portal (no user session; authenticated by a scoped verifier token).
   * Uses fetch directly so the superadmin bearer token is never attached to verifier requests.
   */
  public wormVerify = {
    call: async <T>(path: string, verifierToken?: string, init: RequestInit = {}): Promise<T> => {
      const res = await fetch(`${BASE_URL}/public/worm-verify${path}`, {
        ...init,
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(verifierToken ? { 'X-Verification-Token': verifierToken } : {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(typeof body.error === 'string' ? body.error : body.error?.message || `Request failed (${res.status})`);
      }
      return body.data as T;
    },
    getPublicKey: () => this.wormVerify.call<{ algorithm: string; keyId: string; publicKeyPem: string }>('/public-key'),
    listSeals: (token: string) => this.wormVerify.call<WormDailySeal[]>('/seals', token),
    verifySeal: (token: string, sealId: string) => this.wormVerify.call<WormPublicSealVerification>(`/seals/${sealId}/verify`, token),
    getRecordProof: (token: string, sequence: number) => this.wormVerify.call<WormInclusionProof>(`/records/${sequence}/proof`, token),
    verifyProof: (token: string, data: WormProofVerificationRequest) =>
      this.wormVerify.call<{ valid: boolean; verifiedAt: string }>('/proof/verify', token, { method: 'POST', body: JSON.stringify(data) }),
  };

  /**
   * Public White-Label Portal API client
   */
  public whiteLabel = {
    getConfig: (domain?: string) => {
      const q = domain ? `?domain=${encodeURIComponent(domain)}` : '';
      return fetch(`${BASE_URL}/public/white-label/config${q}`, {
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body.error || `Failed to resolve white-label config (${res.status})`);
        }
        return body.data as PublicWhiteLabelConfig;
      });
    },
    validateDomain: (domain: string) => {
      return fetch(`${BASE_URL}/public/white-label/validate-domain?domain=${encodeURIComponent(domain)}`, {
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body.error || `Validation failed (${res.status})`);
        }
        return body.data as { domain: string; available: boolean; registered: boolean; status: string | null };
      });
    },
  };

  public lookupSsoDomain = (domain: string) =>
    this.request<SsoDomainLookupResult>(`/auth/sso/lookup?domain=${encodeURIComponent(domain)}`);

  public submitSamlAcs = (configId: string, data: Record<string, any>) =>
    this.request<{ token: string; user: { id: string; email: string; name: string }; redirectUrl?: string }>(
      `/auth/sso/saml/${configId}/acs`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

  public getPublicStatus = () =>
    this.request<PublicStatusPagePayload>('/status');

  public automations = {
    list: async (brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations` : '/automations';
      const res: any = await this.request<any>(endpoint);
      return Array.isArray(res) ? res : res?.automations || res?.data || [];
    },
    get: async (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations/${id}` : `/automations/${id}`;
      const res: any = await this.request<any>(endpoint);
      return res?.automation || res?.data || res;
    },
    create: async (data: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations` : '/automations';
      const res: any = await this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res?.automation || res?.data || res;
    },
    update: async (id: string, data: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations/${id}` : `/automations/${id}`;
      const res: any = await this.request<any>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res?.automation || res?.data || res;
    },
    delete: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations/${id}` : `/automations/${id}`;
      return this.request<{ success: boolean }>(endpoint, {
        method: 'DELETE',
      });
    },
    pause: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations/${id}/pause` : `/automations/${id}/pause`;
      return this.request<any>(endpoint, { method: 'POST' });
    },
    resume: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations/${id}/resume` : `/automations/${id}/resume`;
      return this.request<any>(endpoint, { method: 'POST' });
    },
    trigger: (id: string, payload?: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/automations/${id}/trigger` : `/automations/${id}/trigger`;
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },
    listRecipes: async () => {
      const res: any = await this.request<any>('/automations/recipes');
      return Array.isArray(res) ? res : res?.recipes || res?.data || [];
    },
    instantiateRecipe: async (recipeId: string, payload?: { brandId?: string; customName?: string }) => {
      const res: any = await this.request<any>(`/automations/recipes/${recipeId}/instantiate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      return res?.automation || res?.data || res;
    },
    listRuns: async (id?: string, brandId?: string) => {
      const base = brandId ? `/brands/${brandId}/automations` : '/automations';
      const endpoint = id ? `${base}/${id}/runs` : `${base}/runs`;
      const res: any = await this.request<any>(endpoint);
      return Array.isArray(res) ? res : res?.runs || res?.data || [];
    },
    getHealth: async () => {
      const res: any = await this.request<any>('/automations/health');
      return res?.health || res?.data || res;
    },
  };

  public connections = {
    list: (brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections` : '/connections';
      return this.request<any[]>(endpoint);
    },
    get: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${id}` : `/connections/${id}`;
      return this.request<any>(endpoint);
    },
    create: (data: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections` : '/connections';
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    verify: (payload: { provider: string; credentials: any; metadata?: any }) => {
      return this.request<{ success: boolean; data: any }>('/connections/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    test: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${id}/test` : `/connections/${id}/test`;
      return this.request<any>(endpoint, {
        method: 'POST',
      });
    },
    delete: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${id}` : `/connections/${id}`;
      return this.request<{ success: boolean }>(endpoint, {
        method: 'DELETE',
      });
    },
    disconnect: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${id}/disconnect` : `/connections/${id}/disconnect`;
      return this.request<any>(endpoint, {
        method: 'POST',
      });
    },
    reconnect: (id: string, credentials?: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${id}/reconnect` : `/connections/${id}/reconnect`;
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(credentials || {}),
      });
    },
    triggerHealthCheck: (id: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${id}/health-check` : `/connections/${id}/health-check`;
      return this.request<any>(endpoint, {
        method: 'POST',
      });
    },
    getTenantHealth: (brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/health` : '/connections/health';
      return this.request<any>(endpoint);
    },
    listProviders: () => {
      return this.request<any[]>('/connections/providers');
    },
    getAuthorizationUrl: (payload: { provider: string; redirectUri?: string; scopes?: string[]; brandId?: string; reprompt?: boolean }) => {
      return this.request<{ authorizationUrl: string; state: string }>('/connections/authorize', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    handleOAuthCallback: (payload: { provider: string; code: string; state?: string; brandId?: string }) => {
      return this.request<any>('/connections/callback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getHealth: (provider: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${provider}/health` : `/connections/${provider}/health`;
      return this.request<any>(endpoint);
    },
    getResources: (providerOrId: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/connections/${providerOrId}/resources` : `/connections/${providerOrId}/resources`;
      return this.request<any[]>(endpoint);
    },
    toggleResourceSelection: (resourceId: string, selected: boolean) => {
      return this.request<any>(`/connections/resources/${resourceId}/select`, {
        method: 'PATCH',
        body: JSON.stringify({ selected }),
      });
    },
    selectResources: (connectionId: string, payload: { pageId: string; instagramAccountId?: string | null; brandId?: string }) => {
      return this.request<any>(`/connections/${connectionId}/select-resources`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    getDiscoveredMetaPages: (connectionId?: string) => {
      const q = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
      return this.request<{ success: boolean; data: { pages: any[]; masterConnectionId?: string } }>(`/connections/meta/discovered-pages${q}`);
    },
    saveMetaBatchPages: (payload: {
      connectionId?: string;
      pageSelections: Array<{
        pageId: string;
        brandId: string;
        connectFacebook?: boolean;
        instagramAccountId?: string | null;
        connectInstagram?: boolean;
      }>;
    }) => {
      return this.request<{ success: boolean; data: any }>('/connections/meta/batch-pages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    sync: (id: string, data?: { resourceId?: string; changePayload?: any }) => {
      return this.request<any>(`/connections/${id}/sync`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      });
    },
    importDevToken: (brandId: string, token: string) => {
      return this.request<any>(`/brands/${brandId}/meta/dev-token`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },
  };

  public agent = {
    runGoal: (data: { prompt: string; agentType?: string; brandId?: string; autonomousMode?: string; context?: any }) => {
      const endpoint = data.brandId ? `/brands/${data.brandId}/agent/run` : '/agent/run';
      return this.request<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    listRuns: (brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/agent/runs` : '/agent/runs';
      return this.request<any[]>(endpoint);
    },
    getRun: (runId: string) => {
      return this.request<{ run: any }>(`/agent/runs/${runId}`);
    },
    getSettings: (brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/agent/settings` : '/agent/settings';
      return this.request<any>(endpoint);
    },
    updateSettings: (settings: any, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/agent/settings` : '/agent/settings';
      return this.request<any>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    listMemories: (type?: string, brandId?: string) => {
      return this.request<{ memories: any[] }>(
        `/agent/memories?${new URLSearchParams({
          ...(type ? { type } : {}),
          ...(brandId ? { brandId } : {}),
        }).toString()}`
      );
    },
    listTools: () => {
      return this.request<{ tools: any[] }>('/agent/tools');
    },
  };

  public copilot = {
    createPlan: (prompt: string, brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/agent/copilot/automation` : '/agent/copilot/automation';
      return this.request<{ success: boolean; plan: CopilotAutomationPlan }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ prompt, brandId }),
      });
    },
    getPlan: (planId: string) => {
      return this.request<{ success: boolean; plan: CopilotAutomationPlan }>(`/agent/copilot/automation/${planId}`);
    },
    listPlans: (brandId?: string) => {
      const endpoint = brandId ? `/brands/${brandId}/agent/copilot/automations` : '/agent/copilot/automations';
      return this.request<{ success: boolean; plans: CopilotAutomationPlan[]; count: number }>(endpoint);
    },
    testPlan: (planId: string, samplePayload?: any) => {
      return this.request<{ success: boolean; testResults: any }>(`/agent/copilot/automation/${planId}/test`, {
        method: 'POST',
        body: JSON.stringify({ samplePayload }),
      });
    },
    editPlan: (planId: string, updates: any) => {
      return this.request<{ success: boolean; plan: CopilotAutomationPlan }>(`/agent/copilot/automation/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    activatePlan: (planId: string) => {
      return this.request<{ success: boolean; plan: CopilotAutomationPlan; automationId: string; status: string }>(
        `/agent/copilot/automation/${planId}/activate`,
        {
          method: 'POST',
        }
      );
    },
    cancelPlan: (planId: string, reason?: string) => {
      return this.request<{ success: boolean; plan: CopilotAutomationPlan }>(
        `/agent/copilot/automation/${planId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );
    },
  };

  public governance = {
    getSettings: (brandId: string) => {
      return this.request<{ success: boolean; data: BrandGovernanceSettings }>(`/governance/settings?brandId=${brandId}`);
    },
    updateSettings: (brandId: string, updates: UpdateGovernanceSettingsRequest) => {
      return this.request<{ success: boolean; data: BrandGovernanceSettings }>('/governance/settings', {
        method: 'PUT',
        body: JSON.stringify({ brandId, ...updates }),
      });
    },
    setAutonomyLevel: (brandId: string, level: AutonomyLevel, reason?: string) => {
      return this.request<{ success: boolean; data: BrandGovernanceSettings }>('/governance/autonomy-level', {
        method: 'POST',
        body: JSON.stringify({ brandId, level, reason }),
      });
    },
    pauseAutomations: (brandId?: string, reason?: string) => {
      return this.request<{ success: boolean; data: { pausedCount: number; status: string } }>('/governance/override/pause', {
        method: 'POST',
        body: JSON.stringify({ brandId, reason }),
      });
    },
    resumeAutomations: (brandId?: string, reason?: string) => {
      return this.request<{ success: boolean; data: { resumedCount: number; status: string } }>('/governance/override/resume', {
        method: 'POST',
        body: JSON.stringify({ brandId, reason }),
      });
    },
    evaluatePolicy: (payload: PolicyEvaluationRequest) => {
      return this.request<{ success: boolean; data: PolicyEvaluationResult }>('/governance/policy/evaluate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    listApprovals: (params?: { brandId?: string; status?: string; entityType?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.set('brandId', params.brandId);
      if (params?.status) qs.set('status', params.status);
      if (params?.entityType) qs.set('entityType', params.entityType);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ success: boolean; data: ApprovalRequestItem[] }>(`/governance/approvals${q}`);
    },
    getApproval: (id: string) => {
      return this.request<{ success: boolean; data: ApprovalRequestItem }>(`/governance/approvals/${id}`);
    },
    previewApproval: (id: string) => {
      return this.request<{ success: boolean; data: any }>(`/governance/approvals/${id}/preview`);
    },
    editApproval: (id: string, edits: { content?: string; scheduledFor?: string; reviewerNotes?: string }) => {
      return this.request<{ success: boolean; data: ApprovalRequestItem }>(`/governance/approvals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(edits),
      });
    },
    approve: (id: string, notes?: string) => {
      return this.request<{ success: boolean; data: { success: boolean; approval: ApprovalRequestItem; message: string } }>(
        `/governance/approvals/${id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }
      );
    },
    reject: (id: string, notes?: string) => {
      return this.request<{ success: boolean; data: { success: boolean; approval: ApprovalRequestItem; message: string } }>(
        `/governance/approvals/${id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }
      );
    },
    bulkApprove: (brandId: string, approvalIds: string[], notes?: string) => {
      return this.request<{ success: boolean; data: { approvedCount: number; failedCount: number; errors: any[] } }>(
        '/governance/approvals/bulk-approve',
        {
          method: 'POST',
          body: JSON.stringify({ brandId, approvalIds, notes }),
        }
      );
    },
    getAuditLogs: (params?: { brandId?: string; eventType?: string; status?: string; limit?: number; offset?: number }) => {
      const qs = new URLSearchParams();
      if (params?.brandId) qs.set('brandId', params.brandId);
      if (params?.eventType) qs.set('eventType', params.eventType);
      if (params?.status) qs.set('status', params.status);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ success: boolean; data: GovernanceAuditLog[] }>(`/governance/audit-logs${q}`);
    },
  };

  public growth = {
    getBaselines: (brandId: string, platform?: string, days?: number) => {
      const qs = new URLSearchParams();
      if (platform) qs.set('platform', platform);
      if (days) qs.set('days', String(days));
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ success: boolean; data: MultiPeriodBaselineSnapshot }>(`/brands/${brandId}/growth/baselines${q}`);
    },
    recalculateBaselines: (brandId: string, platform?: string) => {
      return this.request<{ success: boolean; data: Record<string, BrandPerformanceBaseline> }>(
        `/brands/${brandId}/growth/baselines/recalculate`,
        {
          method: 'POST',
          body: JSON.stringify({ platform }),
        }
      );
    },
    getRecommendations: (brandId: string, params?: { status?: string; category?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.category) qs.set('category', params.category);
      const q = qs.toString() ? `?${qs.toString()}` : '';
      return this.request<{ success: boolean; data: GrowthRecommendation[] }>(`/brands/${brandId}/growth/recommendations${q}`);
    },
    generateRecommendations: (brandId: string) => {
      return this.request<{ success: boolean; data: GrowthRecommendation[] }>(
        `/brands/${brandId}/growth/recommendations/generate`,
        { method: 'POST' }
      );
    },
    applyRecommendation: (brandId: string, id: string) => {
      return this.request<{ success: boolean; data: GrowthRecommendation }>(
        `/brands/${brandId}/growth/recommendations/${id}/apply`,
        { method: 'POST' }
      );
    },
    dismissRecommendation: (brandId: string, id: string) => {
      return this.request<{ success: boolean; data: GrowthRecommendation }>(
        `/brands/${brandId}/growth/recommendations/${id}/dismiss`,
        { method: 'POST' }
      );
    },
    getExperiments: (brandId: string) => {
      return this.request<{ success: boolean; data: Record<string, { experimentId: string; experimentName: string; hypothesis?: string; status: string; variants: ExperimentVariant[] }> }>(
        `/brands/${brandId}/growth/experiments`
      );
    },
    createExperiment: (brandId: string, data: any) => {
      return this.request<{ success: boolean; data: ExperimentVariant[] }>(`/brands/${brandId}/growth/experiments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    recordVariantTelemetry: (brandId: string, experimentId: string, variantLetter: string, telemetry: any) => {
      return this.request<{ success: boolean; data: ExperimentVariant }>(
        `/brands/${brandId}/growth/experiments/${experimentId}/variants/${variantLetter}/telemetry`,
        {
          method: 'POST',
          body: JSON.stringify(telemetry),
        }
      );
    },
    evaluateExperiment: (brandId: string, experimentId: string) => {
      return this.request<{ success: boolean; data: any }>(
        `/brands/${brandId}/growth/experiments/${experimentId}/evaluate`,
        { method: 'POST' }
      );
    },
    concludeExperiment: (brandId: string, experimentId: string, winningVariantLetter?: string) => {
      return this.request<{ success: boolean; data: ExperimentVariant[] }>(
        `/brands/${brandId}/growth/experiments/${experimentId}/conclude`,
        {
          method: 'POST',
          body: JSON.stringify({ winningVariantLetter }),
        }
      );
    },
    getHalfLife: (brandId: string, params: { platform: string; publishedAt: string; currentEngagements: number; velocityScore?: number }) => {
      const qs = new URLSearchParams({
        platform: params.platform,
        publishedAt: params.publishedAt,
        currentEngagements: String(params.currentEngagements),
      });
      if (params.velocityScore !== undefined) qs.set('velocityScore', String(params.velocityScore));
      return this.request<{ success: boolean; data: EngagementHalfLifeResult }>(`/brands/${brandId}/growth/half-life?${qs.toString()}`);
    },
    estimateLift: (brandId: string, data: { variantMetric: number; baselineMetric: number; variantSampleSize: number; baselineSampleSize: number; confidenceLevel?: number }) => {
      return this.request<{ success: boolean; data: LiftEstimateResult }>(`/brands/${brandId}/growth/lift/estimate`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getGoalGap: (brandId: string, period?: string) => {
      const qs = period ? `?period=${encodeURIComponent(period)}` : '';
      return this.request<{ success: boolean; data: GoalGapAnalysis }>(`/brands/${brandId}/growth/goal-gap${qs}`);
    },
    getGoals: (brandId: string, period?: string) => {
      const qs = period ? `?period=${encodeURIComponent(period)}` : '';
      return this.request<{ success: boolean; data: BrandGoal[] }>(`/brands/${brandId}/growth/goals${qs}`);
    },
    setGoal: (brandId: string, data: any) => {
      return this.request<{ success: boolean; data: BrandGoal }>(`/brands/${brandId}/growth/goals`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getDimensions: (brandId: string, period?: string) => {
      const qs = period ? `?period=${encodeURIComponent(period)}` : '';
      return this.request<{ success: boolean; data: DimensionPerformanceReport }>(`/brands/${brandId}/growth/dimensions${qs}`);
    },
    getForecast: (brandId: string, horizonDays?: number) => {
      return this.request<{ success: boolean; data: GrowthForecastReport }>(`/brands/${brandId}/growth/forecast`, {
        method: 'POST',
        body: JSON.stringify({ horizonDays }),
      });
    },
    getRepurposing: (brandId: string) => {
      return this.request<{ success: boolean; data: CrossChannelRepurposingRecommendation[] }>(`/brands/${brandId}/growth/repurposing`);
    },
    runPipeline: (brandId: string, options?: any) => {
      return this.request<{ success: boolean; data: AnalyticsPipelineResult }>(`/brands/${brandId}/growth/pipeline/run`, {
        method: 'POST',
        body: JSON.stringify(options || {}),
      });
    },
  };

  crm = {
    listContacts: (brandId: string, params?: { search?: string; status?: string; leadSource?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.status) q.append('status', params.status);
      if (params?.leadSource) q.append('leadSource', params.leadSource);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return this.request<any>(`/brands/${brandId}/crm/contacts${qs}`);
    },
    getContact: (brandId: string, contactId: string) =>
      this.request<any>(`/brands/${brandId}/crm/contacts/${contactId}`),
    createContact: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/crm/contacts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateContact: (brandId: string, contactId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/crm/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteContact: (brandId: string, contactId: string) =>
      this.request<any>(`/brands/${brandId}/crm/contacts/${contactId}`, {
        method: 'DELETE',
      }),
    syncMarketingObjects: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/crm/contacts/sync-marketing-objects`, {
        method: 'POST',
      }),
    syncHubSpotContacts: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/crm/contacts/sync-hubspot`, {
        method: 'POST',
      }),
    getPipeline: (brandId: string, pipelineId?: string) => {
      const qs = pipelineId ? `?pipelineId=${pipelineId}` : '';
      return this.request<any>(`/brands/${brandId}/crm/pipeline${qs}`);
    },
    createDeal: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/crm/deals`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    moveDealStage: (brandId: string, dealId: string, stageId: string) =>
      this.request<any>(`/brands/${brandId}/crm/deals/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId }),
      }),
    deleteDeal: (brandId: string, dealId: string) =>
      this.request<any>(`/brands/${brandId}/crm/deals/${dealId}`, {
        method: 'DELETE',
      }),
  };

  email = {
    listSubscribers: (brandId: string, params?: { search?: string; status?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return this.request<any>(`/brands/${brandId}/email/subscribers${qs}`);
    },
    createSubscriber: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/email/subscribers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    bulkImportSubscribers: (brandId: string, subscribers: Array<{ email: string; firstName?: string; lastName?: string; tags?: string[] }>) =>
      this.request<{ success: boolean; imported: number; total: number }>(`/brands/${brandId}/email/subscribers/bulk`, {
        method: 'POST',
        body: JSON.stringify({ subscribers }),
      }),
    syncCrmContacts: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/email/subscribers/sync-crm`, {
        method: 'POST',
      }),
    unsubscribe: (brandId: string, subscriberId: string) =>
      this.request<any>(`/brands/${brandId}/email/subscribers/${subscriberId}`, {
        method: 'DELETE',
      }),
    listTemplates: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/email/templates`),
    createTemplate: (brandId: string, data: { name: string; category?: string; subject?: string; htmlContent: string; blocksJson?: any }) =>
      this.request<any>(`/brands/${brandId}/email/templates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTemplate: (brandId: string, templateId: string, data: Partial<{ name: string; category?: string; subject?: string; htmlContent: string; blocksJson?: any }>) =>
      this.request<any>(`/brands/${brandId}/email/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteTemplate: (brandId: string, templateId: string) =>
      this.request<any>(`/brands/${brandId}/email/templates/${templateId}`, {
        method: 'DELETE',
      }),
    listCampaigns: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/email/campaigns`),
    createCampaign: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/email/campaigns`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendCampaign: (brandId: string, campaignId: string, payload?: { targetSubscriberIds?: string[] }) =>
      this.request<any>(`/brands/${brandId}/email/campaigns/${campaignId}/send`, {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined,
      }),
    sendTestEmail: (brandId: string, data: { recipientEmail: string; subject: string; htmlContent: string; fromName?: string; fromEmail?: string; campaignId?: string }) =>
      this.request<any>(`/brands/${brandId}/email/send-test`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCampaignDeliveries: (brandId: string, campaignId: string, params?: { status?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.limit) q.append('limit', String(params.limit));
      if (params?.offset) q.append('offset', String(params.offset));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return this.request<any>(`/brands/${brandId}/email/campaigns/${campaignId}/deliveries${qs}`);
    },
    deleteCampaign: (brandId: string, campaignId: string) =>
      this.request<any>(`/brands/${brandId}/email/campaigns/${campaignId}`, {
        method: 'DELETE',
      }),
    getEspConfig: (brandId: string) =>
      this.request<{
        success: boolean;
        config: any;
        envDefaults: any;
        activeProvider: string;
        isLiveDelivery: boolean;
        connectionState: 'NOT_CONNECTED' | 'CONNECTED' | 'ACTION_REQUIRED';
      }>(`/brands/${brandId}/email/esp-config`),
    saveEspConfig: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/email/esp-config`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    testEspConfig: (brandId: string, data: { recipientEmail: string; testConfig?: any }) =>
      this.request<{
        success: boolean;
        recipientEmail: string;
        provider: string;
        isLiveDelivery: boolean;
        messageId: string;
        error?: string;
        message: string;
      }>(`/brands/${brandId}/email/esp-config/test`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifyDomainDns: (brandId: string, domain?: string) =>
      this.request<{
        success: boolean;
        domain: string;
        domainStatus: string;
        spfStatus: string;
        dkimStatus: string;
        dmarcStatus: string;
        dnsRecords: any[];
      }>(`/brands/${brandId}/email/esp-config/verify-dns`, {
        method: 'POST',
        body: JSON.stringify({ domain }),
      }),
    disconnectEspConfig: (brandId: string) =>
      this.request<{ success: boolean; message: string }>(`/brands/${brandId}/email/esp-config/disconnect`, {
        method: 'POST',
      }),
  };

  whatsapp = {
    getAccount: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/whatsapp/account`),
    connectAccount: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/whatsapp/account`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listTemplates: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/whatsapp/templates`),
    createTemplate: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/whatsapp/templates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listCampaigns: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/whatsapp/campaigns`),
    createCampaign: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/whatsapp/campaigns`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    dispatchCampaign: (brandId: string, campaignId: string) =>
      this.request<any>(`/brands/${brandId}/whatsapp/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
      }),
    listConversations: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/whatsapp/conversations`),
    getThread: (brandId: string, phoneNumber: string) =>
      this.request<any>(`/brands/${brandId}/whatsapp/conversations/${encodeURIComponent(phoneNumber)}`),
    sendMessage: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/whatsapp/send`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    simulateInbound: (brandId: string, data: { phoneNumber: string; message: string }) =>
      this.request<any>(`/brands/${brandId}/whatsapp/inbound`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  smsVoice = {
    getSender: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/sender`),
    configureSender: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/sms-voice/sender`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    calculateSegments: (brandId: string, body: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/calculate-segments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    listCampaigns: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/campaigns`),
    createCampaign: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/sms-voice/campaigns`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    dispatchCampaign: (brandId: string, campaignId: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/campaigns/${campaignId}/dispatch`, {
        method: 'POST',
      }),
    listMessages: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/messages`),
    sendSms: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/sms-voice/send`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    simulateInbound: (brandId: string, data: { from: string; body: string }) =>
      this.request<any>(`/brands/${brandId}/sms-voice/inbound`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getVoiceAgent: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/voice/agent`),
    updateVoiceAgent: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/sms-voice/voice/agent`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    listVoiceCalls: (brandId: string) =>
      this.request<any>(`/brands/${brandId}/sms-voice/voice/calls`),
    triggerVoiceCall: (brandId: string, data: any) =>
      this.request<any>(`/brands/${brandId}/sms-voice/voice/calls`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  onboarding = {
    getStatus: () =>
      this.request<{
        success: boolean;
        data: {
          isComplete: boolean;
          currentStep: number;
          brand: any;
          brandKit: any;
          allBrands: any[];
          counts: {
            brands: number;
            socialConnections: number;
            emailConfigured: boolean;
            smsConfigured: boolean;
            whatsappConfigured: boolean;
          };
          socialConnections: any[];
          communicationChannels: {
            email: any;
            sms: any;
            whatsapp: any;
          };
        };
      }>('/onboarding/status'),

    createBrand: (data: any) =>
      this.request<{
        success: boolean;
        data: {
          brand: any;
          brandKit: any;
        };
      }>('/onboarding/brand', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    mapAssets: (brandId: string, connectionIds: string[]) =>
      this.request<{
        success: boolean;
        data: {
          mappedCount: number;
          connections: any[];
        };
      }>('/onboarding/map-assets', {
        method: 'POST',
        body: JSON.stringify({ brandId, connectionIds }),
      }),

    configureCommunication: (brandId: string, channel: 'email' | 'whatsapp' | 'sms' | 'voice', config: any) =>
      this.request<{
        success: boolean;
        channel: string;
        result: any;
      }>('/onboarding/communication', {
        method: 'POST',
        body: JSON.stringify({ brandId, channel, config }),
      }),

    verifyChannels: (brandId?: string) => {
      const q = brandId ? `?brandId=${brandId}` : '';
      return this.request<{
        success: boolean;
        data: {
          brand: any;
          totalChannels: number;
          connectedChannels: number;
          allHealthy: boolean;
          channels: Array<{
            channel: string;
            category: string;
            provider: string;
            accountName: string;
            status: 'CONNECTED' | 'PARTIALLY_CONFIGURED' | 'AWAITING_AUTH' | 'FAILED' | 'SANDBOX';
            lastVerifiedAt: string;
            expiresAt?: string | null;
            error?: string | null;
            details?: any;
          }>;
          verifiedAt: string;
        };
      }>(`/onboarding/verify${q}`);
    },

    complete: (brandId: string) =>
      this.request<{
        success: boolean;
        data: {
          brandId: string;
          brandName: string;
          slug: string;
          channels: any[];
          readyForPublishing: boolean;
          message: string;
        };
      }>('/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({ brandId }),
      }),
  };

  ftue = {
    getState: (brandId?: string) => {
      const q = brandId ? `?brandId=${brandId}` : '';
      return this.request<{ success: boolean; data: any }>(`/onboarding/ftue/state${q}`);
    },

    saveRole: (role: string, objective: string) =>
      this.request<{ success: boolean; data: any }>('/onboarding/ftue/role', {
        method: 'POST',
        body: JSON.stringify({ role, objective }),
      }),

    saveWorkspace: (data: {
      workspaceName: string;
      brandName: string;
      industry: string;
      websiteUrl?: string;
      description?: string;
      targetAudience?: string;
      location?: string;
      logoUrl?: string;
    }) =>
      this.request<{ success: boolean; data: any }>('/onboarding/ftue/workspace', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    saveBrandKit: (data: {
      brandId: string;
      logoUrl?: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      description?: string;
      brandVoice: string;
      communicationTone?: string;
      defaultHashtags?: string[];
      language?: string;
    }) =>
      this.request<{ success: boolean; data: any }>('/onboarding/ftue/brand-kit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    generateBrandAi: (data: { websiteUrl?: string; businessName?: string; industry?: string }) =>
      this.request<{ success: boolean; data: any }>('/onboarding/ftue/generate-brand-ai', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createFirstPost: (data: {
      brandId: string;
      creationMethod: 'ai' | 'manual' | 'template';
      topic?: string;
      title: string;
      content: string;
      platforms: string[];
      mediaUrls?: string[];
      hashtags?: string[];
      scheduledFor?: string;
      status?: 'draft' | 'scheduled' | 'published';
    }) =>
      this.request<{ success: boolean; data: any }>('/onboarding/ftue/first-post', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    scheduleFirstPost: (data: {
      postId: string;
      brandId: string;
      action: 'publish_now' | 'schedule' | 'save_draft';
      scheduledAt?: string;
      timezone?: string;
      platformAccountIds?: string[];
    }) =>
      this.request<{ success: boolean; message: string; description: string; data: any }>('/onboarding/ftue/schedule-first-post', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    trackEvent: (eventName: string, stepNumber?: number, metadata?: any) =>
      this.request<{ success: boolean }>('/onboarding/ftue/track-event', {
        method: 'POST',
        body: JSON.stringify({ eventName, stepNumber, metadata }),
      }),

    getAdminAnalytics: (tenantId?: string) => {
      const q = tenantId ? `?tenantId=${tenantId}` : '';
      return this.request<{ success: boolean; data: any }>(`/onboarding/ftue/admin-analytics${q}`);
    },
  };
}

export const api = new ApiClient();

