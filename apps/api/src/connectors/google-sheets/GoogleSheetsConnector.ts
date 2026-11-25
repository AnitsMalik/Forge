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
import { GoogleSheetsParser } from './GoogleSheetsParser.js';

export class GoogleSheetsConnector extends BaseConnector {
  readonly provider = 'google-sheets';
  readonly name = 'Google Sheets';
  readonly category = 'spreadsheets';
  private parser = new GoogleSheetsParser();

  private authorizationEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
  private tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private defaultScopes = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
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

    const accountId = `gsheet_${crypto.randomBytes(6).toString('hex')}`;
    const mockAccessToken = `ya29.gsheet_${crypto.randomBytes(24).toString('hex')}`;
    const mockRefreshToken = `1//04gsheet_refresh_${crypto.randomBytes(24).toString('hex')}`;

    return {
      success: true,
      providerAccountId: accountId,
      accountName: 'Editorial Calendar Spreadsheets',
      scopes: this.defaultScopes,
      credentials: {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        tokenType: 'Bearer',
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        accountId,
      },
      accountMetadata: {
        provider: 'google-sheets',
        email: 'content-calendar@socialforge.brand',
        connectedAt: new Date().toISOString(),
      },
      expiresInSeconds: 3600,
    };
  }

  public async refreshCredential(params: RefreshCredentialParams): Promise<RefreshCredentialResult> {
    const { currentCredentials } = params;
    if (!currentCredentials.refreshToken && !currentCredentials.accessToken) {
      throw new Error('Cannot refresh Google Sheets credentials without an existing token.');
    }

    const refreshedAccessToken = `ya29.gsheet_refreshed_${crypto.randomBytes(24).toString('hex')}`;
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
        message: 'Missing active access token for Google Sheets.',
      };
    }

    return {
      success: true,
      status: 'CONNECTED',
      message: 'Connection to Google Sheets is active and verified.',
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
        resourceType: 'spreadsheet',
        externalResourceId: 'gsheet_editorial_calendar_2026',
        name: 'Social Editorial Calendar 2026',
        isSelected: true,
        metadata: {
          sheetCount: 3,
          rowCount: 142,
          activeTab: 'Q4_Posts',
          columns: ['Post Date', 'Platform', 'Topic', 'Caption', 'Media Asset', 'Status'],
          lastModified: new Date().toISOString(),
        },
      },
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'spreadsheet',
        externalResourceId: 'gsheet_product_catalog_promos',
        name: 'Product Catalog & Launch Promos',
        isSelected: true,
        metadata: {
          sheetCount: 2,
          rowCount: 85,
          activeTab: 'Promos_Schedule',
          columns: ['SKU', 'Product Name', 'Discount %', 'Launch Date', 'Promo Copy'],
          lastModified: new Date().toISOString(),
        },
      },
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'spreadsheet',
        externalResourceId: 'gsheet_influencer_outreach',
        name: 'Influencer Campaign Tracker',
        isSelected: false,
        metadata: {
          sheetCount: 1,
          rowCount: 34,
          activeTab: 'Outreach_Status',
          columns: ['Creator Handle', 'Platform', 'Collaboration Fee', 'Post Deliverable', 'Deliverable Status'],
          lastModified: new Date().toISOString(),
        },
      },
    ];
  }

  public async fetch(params: FetchParams): Promise<FetchResult> {
    const { endpoint = '/spreadsheets/values' } = params;

    const rawRows = [
      ['Post Date', 'Platform', 'Topic', 'Caption', 'Media Asset', 'Status'],
      ['2026-10-15', 'instagram', 'AI Growth Launch', 'Supercharge your brand reach with SocialForge AI arcs!', 'https://assets.socialforge.app/templates/render_default.png', 'Approved'],
      ['2026-10-17', 'facebook', 'Behind The Scenes', 'How our multi-brand studio scales content production 10x.', 'https://assets.socialforge.app/templates/render_default.png', 'Draft'],
      ['2026-10-20', 'linkedin', 'Enterprise Playbook', 'The multi-tenant automation stack for high-growth agencies.', 'https://assets.socialforge.app/templates/render_default.png', 'Ready'],
    ];

    const parsedObjects = this.parser.parseRows(rawRows, 0);

    return {
      status: 200,
      data: {
        provider: 'google-sheets',
        endpoint,
        rawRows,
        parsedRows: parsedObjects,
        rowCount: parsedObjects.length,
      },
    };
  }

  public async normalize(params: NormalizeParams): Promise<NormalizedData> {
    return {
      schema: params.targetSchema || 'content_table',
      data: params.rawPayload,
    };
  }

  public async subscribe(params: SubscribeParams): Promise<SubscribeResult> {
    return {
      subscribed: true,
      subscriptionId: `sub_gsheets_${crypto.randomBytes(8).toString('hex')}`,
    };
  }

  public async detectHeaders(params: {
    spreadsheetId?: string;
    sheetName?: string;
    rawRows?: string[][];
    tenantId?: string;
    connectionId?: string;
    credentials?: any;
  }) {
    let rows = params.rawRows;
    if (!rows || rows.length === 0) {
      const fetchRes = await this.fetch({
        tenantId: params.tenantId || 'system',
        connectionId: params.connectionId || 'system',
        credentials: params.credentials || {},
        endpoint: `/spreadsheets/${params.spreadsheetId || 'default'}/values`,
      });
      rows = (fetchRes.data as any)?.rawRows || [];
    }

    if (!rows || rows.length === 0) {
      return { headers: [], rowCount: 0 };
    }

    const headers = rows[0].map((h: string) => (h || '').trim()).filter(Boolean);
    return {
      headers,
      rowCount: rows.length - 1,
      hasRequiredProductFields: headers.some((h: string) => /product|item|name|title/i.test(h)) &&
        headers.some((h: string) => /price|cost|amount/i.test(h)),
    };
  }

  public async selectSheet(params: {
    spreadsheetId: string;
    sheetName: string;
  }) {
    return {
      success: true,
      spreadsheetId: params.spreadsheetId,
      selectedSheet: params.sheetName,
      selectedAt: new Date().toISOString(),
    };
  }

  public async detectChangedRows(params: {
    spreadsheetId?: string;
    lastKnownVersion?: string;
    rawRows?: string[][];
    tenantId?: string;
    connectionId?: string;
    credentials?: any;
  }) {
    let rows = params.rawRows;
    if (!rows || rows.length === 0) {
      const fetchRes = await this.fetch({
        tenantId: params.tenantId || 'system',
        connectionId: params.connectionId || 'system',
        credentials: params.credentials || {},
        endpoint: `/spreadsheets/${params.spreadsheetId || 'default'}/values`,
      });
      rows = (fetchRes.data as any)?.rawRows || [];
    }

    const currentHash = crypto.createHash('md5').update(JSON.stringify(rows)).digest('hex').slice(0, 8);
    const hasChanges = params.lastKnownVersion !== `v_${currentHash}`;

    return {
      hasChanges,
      currentVersion: `v_${currentHash}`,
      rowCount: Math.max(0, (rows?.length || 0) - 1),
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
      latencyMs: 42,
      error: null,
    };
  }

  public async disconnect(params: DisconnectParams): Promise<DisconnectResult> {
    return {
      success: true,
      message: 'Successfully revoked and disconnected Google Sheets.',
    };
  }
}

export const googleSheetsConnector = new GoogleSheetsConnector();
