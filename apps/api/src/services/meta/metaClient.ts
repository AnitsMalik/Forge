import { config } from '../../config/index.js';
import { normalizeMetaError, redactTokens } from './errors.js';

export interface MetaClientOptions {
  graphApiVersion?: string;
  testMode?: boolean;
}

export class MetaClient {
  private version: string;
  private baseUrl: string;
  private testMode: boolean;

  // In-memory mock response registry for automated tests
  private static mockHandlers: Map<string, (params: any, body: any) => any> = new Map();

  constructor(options: MetaClientOptions = {}) {
    this.version = options.graphApiVersion || config.meta.graphApiVersion || 'v20.0';
    const base = process.env.META_GRAPH_API_BASE_URL || (config.meta as any).graphApiBaseUrl || 'https://graph.facebook.com';
    this.baseUrl = `${base.replace(/\/$/, '')}/${this.version}`;
    this.testMode = options.testMode !== undefined ? options.testMode : config.meta.testMode;
  }

  public static registerMock(pattern: string, handler: (params: any, body: any) => any): void {
    MetaClient.mockHandlers.set(pattern, handler);
  }

  public static clearMocks(): void {
    MetaClient.mockHandlers.clear();
  }

  public static hasMock(pattern: string): boolean {
    for (const key of MetaClient.mockHandlers.keys()) {
      if (key.includes(pattern) || pattern.includes(key)) {
        return true;
      }
    }
    return false;
  }

  private checkMock(endpoint: string, params?: any, body?: any, accessToken?: string): { handled: boolean; data?: any } {
    const isMockToken = typeof accessToken === 'string' && accessToken.startsWith('mock_');
    if (!this.testMode && !isMockToken && MetaClient.mockHandlers.size === 0) {
      return { handled: false };
    }

    for (const [pattern, handler] of MetaClient.mockHandlers.entries()) {
      if (endpoint.includes(pattern) || new RegExp(pattern).test(endpoint)) {
        const result = handler(params, body);
        return { handled: true, data: result };
      }
    }

    // Default mock response when in testMode or using a mock token and no specific handler was set
    // LIVE MODE SAFETY: a mock_ credential must never receive fabricated success responses outside
    // test mode. Previously this silently returned fake IDs like `fb_post_<ts>` which were then
    // recorded as real published posts.
    if (!this.testMode && isMockToken) {
      throw normalizeMetaError({
        status: 401,
        code: 190,
        type: 'OAuthException',
        message: 'Mock/sandbox credential rejected: live Meta mode is enabled (META_TEST_MODE=false). Please reconnect with a real Meta account.',
      });
    }

    if (this.testMode) {
      const cleanEndpoint = endpoint.replace(/^\/+/, '');

      if (cleanEndpoint.includes('oauth/access_token')) {
        return {
          handled: true,
          data: {
            access_token: 'mock_meta_access_token_production_grade_60d',
            token_type: 'bearer',
            expires_in: 5184000,
          },
        };
      }
      if (cleanEndpoint.includes('debug_token')) {
        return {
          handled: true,
          data: {
            data: {
              app_id: config.meta.appId || 'mock_app_123',
              type: 'USER',
              application: 'SocialForge',
              data_access_expires_at: Math.floor(Date.now() / 1000) + 7776000,
              expires_at: Math.floor(Date.now() / 1000) + 5184000,
              is_valid: true,
              scopes: [
                'pages_show_list',
                'pages_read_engagement',
                'pages_manage_posts',
                'instagram_basic',
                'instagram_content_publish',
                'public_profile',
              ],
              user_id: 'mock_meta_user_999',
            },
          },
        };
      }
      if (cleanEndpoint.includes('me/accounts')) {
        return {
          handled: true,
          data: {
            data: [
              {
                id: 'page_10203040',
                name: 'SocialForge Official Page',
                category: 'Software Company',
                access_token: 'mock_page_access_token_never_expires',
                tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'],
                picture: {
                  data: {
                    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80',
                  },
                },
                instagram_business_account: {
                  id: 'ig_77889900',
                  username: 'socialforge_hq',
                  name: 'SocialForge Official',
                  profile_picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
                  followers_count: 38400,
                },
              },
              {
                id: 'page_50607080',
                name: 'SocialForge Community (No IG)',
                category: 'Community',
                access_token: 'mock_page_token_community',
                tasks: ['CREATE_CONTENT', 'MANAGE'],
                picture: {
                  data: {
                    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&q=80',
                  },
                },
                instagram_business_account: null,
              },
            ],
          },
        };
      }
      // 1. Container status check
      if (cleanEndpoint.includes('ig_container_') || cleanEndpoint.includes('status_code') || (params && params.fields && params.fields.includes('status_code'))) {
        return {
          handled: true,
          data: {
            id: 'ig_container_status',
            status_code: 'FINISHED',
            status: 'Media container ready for publishing',
          },
        };
      }

      // 2. Container creation
      if (cleanEndpoint.endsWith('/media') || cleanEndpoint.endsWith('media')) {
        return {
          handled: true,
          data: {
            id: `ig_container_${Date.now()}`,
          },
        };
      }

      // 3. Container publishing
      if (cleanEndpoint.includes('media_publish')) {
        return {
          handled: true,
          data: {
            id: `ig_media_${Date.now()}`,
          },
        };
      }

      // 4. IG Media permalink
      if (cleanEndpoint.startsWith('ig_media_') || (params && params.fields && params.fields.includes('permalink'))) {
        return {
          handled: true,
          data: {
            id: cleanEndpoint,
            permalink: `https://www.instagram.com/p/C_${cleanEndpoint}/`,
          },
        };
      }

      // 5. Facebook photo/video/feed posting
      if (cleanEndpoint.includes('photos') || cleanEndpoint.includes('videos') || cleanEndpoint.includes('feed')) {
        return {
          handled: true,
          data: {
            id: `fb_post_${Date.now()}`,
            post_id: `fb_post_${Date.now()}`,
          },
        };
      }

      // 6. Facebook Page details with connected Instagram
      if (params?.fields?.includes('instagram_business_account') || cleanEndpoint === 'page_10203040') {
        return {
          handled: true,
          data: {
            id: 'page_10203040',
            name: 'SocialForge Official Page',
            instagram_business_account: {
              id: 'ig_77889900',
              username: 'socialforge_hq',
              name: 'SocialForge Official',
              profile_picture_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
              followers_count: 38400,
            },
          },
        };
      }

      // 7. Instagram account verification
      if (cleanEndpoint === 'ig_77889900' || (!cleanEndpoint.includes('/') && cleanEndpoint.startsWith('ig_'))) {
        return {
          handled: true,
          data: {
            id: 'ig_77889900',
            username: 'socialforge_hq',
            name: 'SocialForge Official',
            permalink: 'https://www.instagram.com/p/Cmockpost123/',
          },
        };
      }
    }

    return { handled: false };
  }

  /**
   * Executes a GET request against Meta Graph API.
   */
  public async get<T>(
    endpoint: string,
    params: Record<string, any> = {},
    accessToken?: string
  ): Promise<T> {
    let mock;
    try {
      mock = this.checkMock(endpoint, params, undefined, accessToken);
    } catch (mockErr) {
      throw normalizeMetaError(mockErr);
    }
    if (mock.handled) {
      return mock.data as T;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(`${this.baseUrl}/${cleanEndpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }

    if (accessToken) {
      url.searchParams.append('access_token', accessToken);
    }

    return this.executeRequest<T>('GET', url);
  }

  /**
   * Executes a POST request against Meta Graph API.
   */
  public async post<T>(
    endpoint: string,
    body: Record<string, any> = {},
    accessToken?: string
  ): Promise<T> {
    let mock;
    try {
      mock = this.checkMock(endpoint, undefined, body, accessToken);
    } catch (mockErr) {
      throw normalizeMetaError(mockErr);
    }
    if (mock.handled) {
      return mock.data as T;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(`${this.baseUrl}/${cleanEndpoint}`);

    const payload: Record<string, any> = { ...body };
    if (accessToken) {
      payload.access_token = accessToken;
    }

    return this.executeRequest<T>('POST', url, payload);
  }

  /**
   * Executes a multipart/form-data POST request against Meta Graph API (e.g. binary photo upload to /{page-id}/photos).
   */
  public async postMultipart<T>(
    endpoint: string,
    formData: FormData,
    accessToken?: string
  ): Promise<T> {
    let mock;
    try {
      mock = this.checkMock(endpoint, undefined, {}, accessToken);
    } catch (mockErr) {
      throw normalizeMetaError(mockErr);
    }
    if (mock.handled) {
      return mock.data as T;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(`${this.baseUrl}/${cleanEndpoint}`);

    if (accessToken && !formData.has('access_token')) {
      formData.append('access_token', accessToken);
    }

    const logUrl = redactTokens(url.toString());
    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      const responseText = await response.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      if (!response.ok || responseJson.error) {
        const errorData = responseJson.error || {
          message: `Meta API HTTP ${response.status}`,
          code: response.status,
          type: 'OAuthException',
        };
        const fbtraceId = errorData.fbtrace_id || response.headers.get('x-fb-trace-id') || undefined;
        const safeMetaMsg = redactTokens(errorData.message || `Meta API failed with HTTP ${response.status}`);

        console.error(`[MetaClient] Meta Graph API multipart error response: HTTP ${response.status}`, {
          httpStatus: response.status,
          code: errorData.code,
          subcode: errorData.error_subcode ?? errorData.subcode,
          type: errorData.type || 'OAuthException',
          message: safeMetaMsg,
          fbtraceId,
        });

        throw normalizeMetaError({
          status: response.status,
          code: errorData.code,
          subcode: errorData.error_subcode ?? errorData.subcode,
          type: errorData.type || 'OAuthException',
          message: errorData.message || `Meta API failed with HTTP ${response.status}`,
          fbtrace_id: fbtraceId,
          error: errorData,
          response: { data: responseJson },
        });
      }

      return responseJson as T;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
        throw normalizeMetaError({
          code: 'ETIMEDOUT',
          message: `Network timeout uploading media to Meta Graph API (${logUrl})`,
        });
      }
      throw normalizeMetaError(err);
    }
  }

  /**
   * Executes a DELETE request against Meta Graph API.
   */
  public async delete<T>(
    endpoint: string,
    params: Record<string, any> = {},
    accessToken?: string
  ): Promise<T> {
    let mock;
    try {
      mock = this.checkMock(endpoint, params, undefined, accessToken);
    } catch (mockErr) {
      throw normalizeMetaError(mockErr);
    }
    if (mock.handled) {
      return mock.data as T;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(`${this.baseUrl}/${cleanEndpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }

    if (accessToken) {
      url.searchParams.append('access_token', accessToken);
    }

    return this.executeRequest<T>('DELETE', url);
  }

  private async executeRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    url: URL,
    body?: Record<string, any>
  ): Promise<T> {
    const logUrl = redactTokens(url.toString());
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    let bodyStr: string | undefined = undefined;
    if (body) {
      headers['Content-Type'] = 'application/json';
      bodyStr = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: bodyStr,
      });

      const responseText = await response.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      if (!response.ok || responseJson.error) {
        const errorData = responseJson.error || {
          message: `Meta API HTTP ${response.status}`,
          code: response.status,
          type: 'OAuthException',
        };

        const fbtraceId = errorData.fbtrace_id || response.headers.get('x-fb-trace-id') || undefined;
        const safeMetaMsg = redactTokens(errorData.message || `Meta API failed with HTTP ${response.status}`);

        // Server log for debugging (Requirement 3 & 6: NEVER log access tokens, keep full non-secret Meta error)
        console.error(`[MetaClient] Meta Graph API error response: HTTP ${response.status}`, {
          httpStatus: response.status,
          code: errorData.code,
          subcode: errorData.error_subcode ?? errorData.subcode,
          type: errorData.type || 'OAuthException',
          message: safeMetaMsg,
          fbtraceId,
        });

        throw normalizeMetaError({
          status: response.status,
          code: errorData.code,
          subcode: errorData.error_subcode ?? errorData.subcode,
          type: errorData.type || 'OAuthException',
          message: errorData.message || `Meta API failed with HTTP ${response.status}`,
          fbtrace_id: fbtraceId,
          error: errorData,
          response: { data: responseJson },
        });
      }

      return responseJson as T;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ETIMEDOUT') {
        throw normalizeMetaError({
          code: 'ETIMEDOUT',
          message: `Network timeout connecting to Meta Graph API (${logUrl})`,
        });
      }
      throw normalizeMetaError(err);
    }
  }
}

export const metaClient = new MetaClient();
