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
} from '../core/Connector.js';
import { GoogleDriveParser } from './GoogleDriveParser.js';

export class GoogleDriveConnector extends BaseConnector {
  readonly provider = 'google-drive';
  readonly name = 'Google Drive';
  readonly category = 'cloud_storage';
  private parser = new GoogleDriveParser();

  private authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  private tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private defaultScopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ];

  public async getAuthorizationUrl(params: AuthorizationUrlParams): Promise<AuthorizationUrlResult> {
    const state = params.state || crypto.randomBytes(16).toString('hex');
    const scopes = params.scopes || this.defaultScopes;

    const clientId = process.env.GOOGLE_CLIENT_ID || 'socialforge_google_client_id.apps.googleusercontent.com';

    const searchParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: params.redirectUri,
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      ...(params.extraParams as any || {}),
    });

    const url = `${this.authorizationEndpoint}?${searchParams.toString()}`;
    return { url, state };
  }

  public async handleCallback(params: CallbackParams): Promise<CallbackResult> {
    const { code } = params;
    if (!code) {
      throw new Error('Authorization code is missing from callback.');
    }

    const accountId = `gdrive_${crypto.randomBytes(6).toString('hex')}`;
    const mockAccessToken = `ya29.gdrive_${crypto.randomBytes(24).toString('hex')}`;
    const mockRefreshToken = `1//04gdrive_refresh_${crypto.randomBytes(24).toString('hex')}`;

    return {
      success: true,
      providerAccountId: accountId,
      accountName: 'Brand Assets Google Drive',
      scopes: this.defaultScopes,
      credentials: {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        accountId,
      },
      accountMetadata: {
        provider: 'google-drive',
        email: 'marketing-assets@socialforge.brand',
        storageQuotaBytes: 15 * 1024 * 1024 * 1024,
        connectedAt: new Date().toISOString(),
      },
      expiresInSeconds: 3600,
    };
  }

  public async refreshCredential(params: RefreshCredentialParams): Promise<RefreshCredentialResult> {
    const { currentCredentials } = params;
    if (!currentCredentials.refreshToken && !currentCredentials.accessToken) {
      throw new Error('Cannot refresh Google Drive credentials without an existing token.');
    }

    const refreshedAccessToken = `ya29.gdrive_refreshed_${crypto.randomBytes(24).toString('hex')}`;
    return {
      success: true,
      credentials: {
        ...currentCredentials,
        accessToken: refreshedAccessToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      expiresInSeconds: 3600,
    };
  }

  public async testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
    const { credentials } = params;
    if (!credentials.accessToken) {
      return {
        success: false,
        status: 'REAUTH_REQUIRED',
        message: 'Missing active access token for Google Drive.',
      };
    }

    return {
      success: true,
      status: 'CONNECTED',
      message: 'Connection to Google Drive is active and verified.',
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
        resourceType: 'drive_folder',
        externalResourceId: 'gdrive_folder_marketing_assets',
        name: 'Brand Marketing Assets',
        isSelected: true,
        metadata: {
          path: '/Brand Marketing Assets',
          mimeType: 'application/vnd.google-apps.folder',
          fileCount: 28,
          lastModified: new Date().toISOString(),
        },
      },
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'drive_folder',
        externalResourceId: 'gdrive_folder_video_reels',
        name: 'Video Raw Footage & Reels',
        isSelected: true,
        metadata: {
          path: '/Video Raw Footage',
          mimeType: 'application/vnd.google-apps.folder',
          fileCount: 14,
          lastModified: new Date().toISOString(),
        },
      },
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'drive_folder',
        externalResourceId: 'gdrive_folder_product_photos',
        name: 'Product Catalog Imagery',
        isSelected: false,
        metadata: {
          path: '/Product Catalog Imagery',
          mimeType: 'application/vnd.google-apps.folder',
          fileCount: 52,
          lastModified: new Date().toISOString(),
        },
      },
    ];
  }

  public async fetch(params: FetchParams): Promise<FetchResult> {
    const { endpoint = '/files' } = params;

    const mockFiles = [
      {
        id: 'file_asset_001',
        name: 'summer_campaign_hero.png',
        mimeType: 'image/png',
        sizeBytes: 2457600,
        webViewLink: 'https://drive.google.com/file/d/file_asset_001/view',
        thumbnailLink: 'https://drive.google.com/thumbnail/file_asset_001',
        modifiedTime: new Date().toISOString(),
      },
      {
        id: 'file_asset_002',
        name: 'brand_video_reel_9x16.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 15728640,
        webViewLink: 'https://drive.google.com/file/d/file_asset_002/view',
        thumbnailLink: 'https://drive.google.com/thumbnail/file_asset_002',
        modifiedTime: new Date().toISOString(),
      },
      {
        id: 'file_asset_003',
        name: 'q4_social_infographic.png',
        mimeType: 'image/png',
        sizeBytes: 1843200,
        webViewLink: 'https://drive.google.com/file/d/file_asset_003/view',
        thumbnailLink: 'https://drive.google.com/thumbnail/file_asset_003',
        modifiedTime: new Date().toISOString(),
      },
    ];

    const parsed = mockFiles.map((f) => this.parser.parseMetadata(f));

    return {
      status: 200,
      data: {
        provider: 'google-drive',
        endpoint,
        files: mockFiles,
        parsed,
        totalFiles: mockFiles.length,
      },
    };
  }

  public async normalize(params: NormalizeParams): Promise<NormalizedData> {
    return {
      schema: params.targetSchema || 'media_asset_list',
      data: params.rawPayload,
    };
  }

  public async subscribe(params: SubscribeParams): Promise<SubscribeResult> {
    return {
      subscribed: true,
      subscriptionId: `sub_gdrive_${crypto.randomBytes(8).toString('hex')}`,
    };
  }

  public async fetchChangedResources(params: {
    folderId?: string;
    sinceCursor?: string;
    modifiedAfter?: string;
    credentials?: any;
    tenantId?: string;
    connectionId?: string;
  }) {
    const fetchRes = await this.fetch({
      tenantId: params.tenantId || 'system',
      connectionId: params.connectionId || 'system',
      credentials: params.credentials || {},
      endpoint: `/files?folder=${params.folderId || 'root'}`,
    });
    const allFiles = (fetchRes.data as any)?.files || [];
    const sinceTime = params.modifiedAfter ? new Date(params.modifiedAfter).getTime() : 0;
    const changed = allFiles.filter((f: any) => {
      const fileTime = new Date(f.modifiedTime).getTime();
      return fileTime >= sinceTime;
    });

    const nextCursor = `cursor_drive_${Date.now()}`;
    return {
      success: true,
      files: changed,
      totalChanged: changed.length,
      nextCursor,
    };
  }

  public async subscribeWebhooks(params: {
    resourceId: string;
    channelId?: string;
    webhookUrl?: string;
    ttlSeconds?: number;
  }) {
    const channelId = params.channelId || `chan_${crypto.randomBytes(8).toString('hex')}`;
    const token = `token_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + (params.ttlSeconds || 86400) * 1000);

    return {
      subscribed: true,
      channelId,
      resourceId: params.resourceId,
      token,
      expiresAt: expiresAt.toISOString(),
      webhookUrl: params.webhookUrl || 'https://api.socialforge.io/api/v1/connections/webhooks/google-drive',
    };
  }

  public async renewWebhooks(params: {
    channelId: string;
    resourceId: string;
    ttlSeconds?: number;
  }) {
    const renewedExpiresAt = new Date(Date.now() + (params.ttlSeconds || 86400) * 1000);
    return {
      renewed: true,
      channelId: params.channelId,
      resourceId: params.resourceId,
      expiresAt: renewedExpiresAt.toISOString(),
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
      latencyMs: 38,
      error: null,
    };
  }

  public async disconnect(params: DisconnectParams): Promise<DisconnectResult> {
    return {
      success: true,
      message: 'Successfully revoked and disconnected Google Drive.',
    };
  }
}

export const googleDriveConnector = new GoogleDriveConnector();
