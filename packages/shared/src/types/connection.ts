export type ConnectionProvider =
  | 'meta'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'x_twitter'
  | 'google-drive'
  | 'google-sheets'
  | 'excel'
  | 'shopify'
  | 'woocommerce'
  | 'hubspot'
  | 'salesforce'
  | 'generic_oauth2'
  | string;

export type ConnectionStatus =
  | 'CONNECTED'
  | 'CHECKING'
  | 'NEEDS_ATTENTION'
  | 'REAUTH_REQUIRED'
  | 'PERMISSION_MISSING'
  | 'RATE_LIMITED'
  | 'DISCONNECTED';

export type ChannelHealthState =
  | 'Connected'
  | 'Healthy'
  | 'Expiring Soon'
  | 'Refreshing'
  | 'Reauthorization Required'
  | 'Disconnected'
  | 'Provider Error';

export interface ChannelHealthEvaluation {
  connectionId: string;
  provider: string;
  accountName?: string;
  state: ChannelHealthState;
  isPublishingEligible: boolean;
  publishingIneligibilityReason?: string | null;
  tokenValid: boolean;
  tokenExpiresAt?: Date | string | null;
  expiresInSeconds?: number | null;
  isRefreshable: boolean;
  isRefreshing: boolean;
  isRevoked: boolean;
  scopesValid: boolean;
  missingScopes: string[];
  apiReachable: boolean;
  latencyMs?: number;
  isRateLimited: boolean;
  rateLimitResetAt?: Date | string | null;
  isProviderOutage: boolean;
  lastCheckedAt: Date | string;
  lastError?: string | null;
}

export interface MultiAccountDetails {
  connectionId: string;
  accountName: string;
  profileImage?: string | null;
  platform: ConnectionProvider;
  accountType: string;
  connectionStatus: ConnectionStatus;
  channelHealthState?: ChannelHealthState;
  lastSuccessfulSync?: Date | string | null;
  tokenHealth: string;
  availablePublishingPermissions: string[];
  canDisconnect: boolean;
  canReconnect: boolean;
  reconnectUrl?: string;
  isPublishingEligible: boolean;
}

export type LegacyConnectionStatus =
  | 'healthy'
  | 'degraded'
  | 'expired'
  | 'disconnected'
  | 'action_required'
  | 'connected'
  | 'revoked'
  | 'error'
  | 'unreachable';

export interface SocialConnection {
  id: string;
  tenant_id: string;
  brand_id?: string | null;
  provider: ConnectionProvider;
  status: ConnectionStatus;
  provider_account_metadata?: Record<string, unknown> | null;
  scopes?: string[] | null;
  credential_reference?: string | null;
  expires_at?: Date | string | null;
  last_health_check_at?: Date | string | null;
  last_error?: string | Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;

  // Backward compatibility fields
  account_name?: string;
  provider_account_id?: string;
  health_status?: string;
  token_expires_at?: Date | string | null;
  last_synced_at?: Date | string | null;
  metadata?: Record<string, unknown> | null;

  // Multi-account management fields
  profile_image?: string | null;
  account_type?: string | null;
  token_health?: string | null;
  available_permissions?: string[] | null;
  multi_account_details?: MultiAccountDetails | null;
}

export interface ConnectionCredentialRecord {
  id: string;
  tenant_id: string;
  connection_id: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  algorithm: string;
  key_version: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface StoredCredentials {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Date | string | null;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accountId?: string;
  accountName?: string;
  customFields?: Record<string, unknown>;
}

export interface DiscoveredResource {
  id: string;
  connectionId: string;
  tenantId: string;
  brandId?: string | null;
  resourceType: 'page' | 'instagram_account' | 'folder' | 'sheet' | 'catalog' | 'store' | string;
  externalResourceId: string;
  name: string;
  isSelected?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ConnectorResource extends DiscoveredResource {}

export interface ConnectionLifecycleEvent {
  id: string;
  connection_id: string;
  tenant_id: string;
  brand_id?: string | null;
  event_type:
    | 'auth_initiated'
    | 'auth_success'
    | 'token_refreshed'
    | 'health_check'
    | 'reconnected'
    | 'disconnected'
    | 'status_changed'
    | 'resources_discovered'
    | 'error';
  status: 'success' | 'failure' | 'warning' | string;
  details?: Record<string, unknown> | string | null;
  created_at: Date | string;
}

// -----------------------------------------------------------------------------
// Provider-Neutral Connector Interface & Parameter Types
// -----------------------------------------------------------------------------

export interface AuthorizationUrlParams {
  tenantId: string;
  brandId?: string | null;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  extraParams?: Record<string, unknown>;
}

export interface AuthorizationUrlResult {
  url: string;
  state: string;
}

export interface CallbackParams {
  code: string;
  state: string;
  redirectUri: string;
  tenantId: string;
  brandId?: string | null;
}

export interface CallbackResult {
  success: boolean;
  providerAccountId: string;
  accountName: string;
  scopes: string[];
  credentials: StoredCredentials;
  accountMetadata?: Record<string, unknown>;
  expiresInSeconds?: number;
}

export interface RefreshCredentialParams {
  tenantId: string;
  connectionId: string;
  currentCredentials: StoredCredentials;
}

export interface RefreshCredentialResult {
  success: boolean;
  credentials: StoredCredentials;
  expiresInSeconds?: number;
}

export interface TestConnectionParams {
  tenantId: string;
  connectionId: string;
  credentials: StoredCredentials;
}

export interface TestConnectionResult {
  success: boolean;
  status: ConnectionStatus;
  message?: string;
  details?: Record<string, unknown>;
}

export interface DiscoverResourcesParams {
  tenantId: string;
  connectionId: string;
  brandId?: string | null;
  credentials: StoredCredentials;
  resourceTypes?: string[];
}

export interface FetchParams {
  tenantId: string;
  connectionId: string;
  endpoint: string;
  credentials: StoredCredentials;
  params?: Record<string, unknown>;
}

export interface FetchResult {
  data: unknown;
  status: number;
  headers?: Record<string, string>;
}

export interface NormalizeParams {
  rawPayload: unknown;
  targetSchema: string;
}

export interface NormalizedData {
  schema: string;
  data: unknown;
}

export interface SubscribeParams {
  tenantId: string;
  connectionId: string;
  webhookUrl: string;
  events: string[];
  credentials: StoredCredentials;
}

export interface SubscribeResult {
  subscribed: boolean;
  subscriptionId?: string;
}

export interface HealthCheckParams {
  tenantId: string;
  connectionId: string;
  credentials: StoredCredentials;
}

export interface HealthCheckResult {
  status: ConnectionStatus;
  lastCheckedAt: Date | string;
  latencyMs?: number;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DisconnectParams {
  tenantId: string;
  connectionId: string;
  credentials?: StoredCredentials;
}

export interface DisconnectResult {
  success: boolean;
  message?: string;
}

export interface Connector {
  readonly provider: string;
  readonly name: string;
  readonly category: string;

  getAuthorizationUrl(params: AuthorizationUrlParams): Promise<AuthorizationUrlResult>;
  handleCallback(params: CallbackParams): Promise<CallbackResult>;
  refreshCredential(params: RefreshCredentialParams): Promise<RefreshCredentialResult>;
  testConnection(params: TestConnectionParams): Promise<TestConnectionResult>;
  discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]>;
  fetch(params: FetchParams): Promise<FetchResult>;
  normalize(params: NormalizeParams): Promise<NormalizedData>;
  subscribe(params: SubscribeParams): Promise<SubscribeResult>;
  healthCheck(params: HealthCheckParams): Promise<HealthCheckResult>;
  disconnect(params: DisconnectParams): Promise<DisconnectResult>;
}
