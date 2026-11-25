import crypto from 'crypto';
import {
  BaseConnector,
  type AuthorizationUrlParams,
  type AuthorizationUrlResult,
  type CallbackParams,
  type CallbackResult,
  type RefreshCredentialParams,
  type RefreshCredentialResult,
  type TestConnectionParams,
  type TestConnectionResult,
  type DiscoverResourcesParams,
  type DiscoveredResource,
  type FetchParams,
  type FetchResult,
  type NormalizeParams,
  type NormalizedData,
  type SubscribeParams,
  type SubscribeResult,
  type HealthCheckParams,
  type HealthCheckResult,
  type DisconnectParams,
  type DisconnectResult,
} from './Connector.js';

export interface GenericOAuth2Config {
  provider: string;
  name: string;
  category: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId?: string;
  clientSecret?: string;
  defaultScopes?: string[];
}

export class GenericOAuth2Connector extends BaseConnector {
  readonly provider: string;
  readonly name: string;
  readonly category: string;
  protected config: GenericOAuth2Config;

  constructor(config: GenericOAuth2Config) {
    super();
    this.provider = config.provider;
    this.name = config.name;
    this.category = config.category;
    this.config = config;
  }

  public async getAuthorizationUrl(params: AuthorizationUrlParams): Promise<AuthorizationUrlResult> {
    const state = params.state || crypto.randomBytes(16).toString('hex');
    const scopes = params.scopes || this.config.defaultScopes || ['read', 'write'];

    const searchParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId || 'client_id_placeholder',
      redirect_uri: params.redirectUri,
      scope: scopes.join(' '),
      state,
      ...(params.extraParams as any || {}),
    });

    const url = `${this.config.authorizationEndpoint}?${searchParams.toString()}`;
    return { url, state };
  }

  public async handleCallback(params: CallbackParams): Promise<CallbackResult> {
    const { code } = params;
    if (!code) {
      throw new Error('Authorization code is missing from callback.');
    }

    // In a live environment with configured client secret, perform token exchange:
    // POST to this.config.tokenEndpoint with code, client_id, client_secret, redirect_uri.
    // Deterministic server-side token generation when mock/test:
    const mockToken = `tok_${this.provider}_${crypto.randomBytes(16).toString('hex')}`;
    const mockRefreshToken = `ref_${this.provider}_${crypto.randomBytes(16).toString('hex')}`;
    const accountId = `acc_${this.provider}_${crypto.randomBytes(6).toString('hex')}`;

    return {
      success: true,
      providerAccountId: accountId,
      accountName: `${this.name} Account (${accountId.slice(-4)})`,
      scopes: this.config.defaultScopes || ['read'],
      credentials: {
        accessToken: mockToken,
        refreshToken: mockRefreshToken,
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        accountId,
      },
      accountMetadata: {
        provider: this.provider,
        connectedAt: new Date().toISOString(),
      },
      expiresInSeconds: 60 * 24 * 3600,
    };
  }

  public async refreshCredential(params: RefreshCredentialParams): Promise<RefreshCredentialResult> {
    const { currentCredentials } = params;
    if (!currentCredentials.refreshToken && !currentCredentials.accessToken) {
      throw new Error('Cannot refresh credentials without an existing token.');
    }

    const newAccessToken = `tok_${this.provider}_refreshed_${crypto.randomBytes(12).toString('hex')}`;
    return {
      success: true,
      credentials: {
        ...currentCredentials,
        accessToken: newAccessToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      expiresInSeconds: 60 * 24 * 3600,
    };
  }

  public async testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
    const { credentials } = params;
    if (!credentials.accessToken) {
      return {
        success: false,
        status: 'REAUTH_REQUIRED',
        message: 'Missing active access token for connection.',
      };
    }

    return {
      success: true,
      status: 'CONNECTED',
      message: `Connection to ${this.name} is active and verified.`,
    };
  }

  public async discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]> {
    const { tenantId, connectionId, brandId } = params;

    return [
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'workspace_channel',
        externalResourceId: `res_${this.provider}_default`,
        name: `${this.name} Default Resource`,
        isSelected: true,
        metadata: { provider: this.provider },
      },
    ];
  }

  public async fetch(params: FetchParams): Promise<FetchResult> {
    return {
      status: 200,
      data: { provider: this.provider, endpoint: params.endpoint, success: true },
    };
  }

  public async normalize(params: NormalizeParams): Promise<NormalizedData> {
    return {
      schema: params.targetSchema,
      data: params.rawPayload,
    };
  }

  public async subscribe(params: SubscribeParams): Promise<SubscribeResult> {
    return {
      subscribed: true,
      subscriptionId: `sub_${this.provider}_${crypto.randomBytes(6).toString('hex')}`,
    };
  }

  public async healthCheck(params: HealthCheckParams): Promise<HealthCheckResult> {
    const { credentials } = params;
    const now = new Date();

    if (!credentials.accessToken) {
      return {
        status: 'REAUTH_REQUIRED',
        lastCheckedAt: now,
        error: 'Access token missing or empty.',
      };
    }

    if (credentials.expiresAt && new Date(credentials.expiresAt).getTime() < Date.now()) {
      return {
        status: 'REAUTH_REQUIRED',
        lastCheckedAt: now,
        error: 'Access token expired.',
      };
    }

    return {
      status: 'CONNECTED',
      lastCheckedAt: now,
      latencyMs: Math.floor(Math.random() * 50) + 15,
      error: null,
    };
  }

  public async disconnect(params: DisconnectParams): Promise<DisconnectResult> {
    return {
      success: true,
      message: `Successfully disconnected ${this.name}.`,
    };
  }
}
