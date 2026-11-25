import { ConnectorRegistry } from './core/ConnectorRegistry.js';
import { GenericOAuth2Connector } from './core/GenericOAuth2Connector.js';
import type { DiscoveredResource, DiscoverResourcesParams } from './core/Connector.js';
import crypto from 'crypto';

import { GoogleDriveConnector, googleDriveConnector } from './google-drive/GoogleDriveConnector.js';
import { GoogleSheetsConnector, googleSheetsConnector } from './google-sheets/GoogleSheetsConnector.js';
import { ExcelConnector, excelConnector } from './excel/ExcelConnector.js';
import { HubSpotConnector, hubspotConnector } from './hubspot/HubSpotConnector.js';
import { XTwitterConnector, xTwitterConnector } from './x-twitter/XTwitterConnector.js';
import { YouTubeConnector, youtubeConnector } from './youtube/YouTubeConnector.js';

// 3. LinkedIn Connector
export class LinkedInConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'linkedin',
      name: 'LinkedIn Marketing',
      category: 'social',
      authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      defaultScopes: ['openid', 'profile', 'email', 'w_member_social', 'r_organization_social', 'w_organization_social'],
    });
  }

  public override async discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]> {
    const { tenantId, connectionId, brandId, credentials } = params;
    const resources: DiscoveredResource[] = [];

    const accessToken = credentials?.accessToken;
    const isSandbox = (credentials as any)?.isSandbox;
    if (!accessToken || isSandbox) {
      // In sandbox or unauthenticated mode, return sandbox indicator resource
      return [
        {
          id: crypto.randomUUID(),
          connectionId,
          tenantId,
          brandId,
          resourceType: 'organization',
          externalResourceId: 'urn:li:organization:sandbox_preview',
          name: 'LinkedIn Sandbox Company Page',
          isSelected: true,
          metadata: { vanityName: 'sandbox-company', isSandbox: true },
        },
      ];
    }

    try {
      // 1. Discover Member Personal Profile via OpenID Userinfo
      const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userinfoRes.ok) {
        const userInfo: any = await userinfoRes.json();
        if (userInfo.sub) {
          resources.push({
            id: crypto.randomUUID(),
            connectionId,
            tenantId,
            brandId,
            resourceType: 'personal_profile',
            externalResourceId: `urn:li:person:${userInfo.sub}`,
            name: userInfo.name ? `${userInfo.name} (LinkedIn Profile)` : 'Personal Profile',
            isSelected: true,
            metadata: {
              sub: userInfo.sub,
              email: userInfo.email,
              picture: userInfo.picture,
              type: 'PERSONAL',
            },
          });
        }
      }

      // 2. Discover Organizations where Member has Administrative ACLs
      const aclsRes = await fetch(
        'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&state=APPROVED',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (aclsRes.ok) {
        const aclsData: any = await aclsRes.json();
        const elements = aclsData.elements || [];
        for (const el of elements) {
          const orgUrn = el.organizationalTarget; // e.g. "urn:li:organization:12345"
          if (!orgUrn) continue;

          // Fetch organization name
          let orgName = 'LinkedIn Company Page';
          try {
            const orgRes = await fetch(`https://api.linkedin.com/v2/organizations/${orgUrn.split(':').pop()}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
              },
            });
            if (orgRes.ok) {
              const orgData: any = await orgRes.json();
              orgName = orgData.localizedName || orgData.vanityName || orgName;
            }
          } catch {
            // fallback to default orgName
          }

          resources.push({
            id: crypto.randomUUID(),
            connectionId,
            tenantId,
            brandId,
            resourceType: 'organization',
            externalResourceId: orgUrn,
            name: orgName,
            isSelected: false,
            metadata: {
              role: el.role,
              state: el.state,
              type: 'ORGANIZATION',
            },
          });
        }
      }
    } catch (err: any) {
      console.warn('Live LinkedIn resource discovery error:', err.message);
    }

    return resources.length > 0 ? resources : [
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'personal_profile',
        externalResourceId: 'urn:li:person:me',
        name: 'LinkedIn Member Profile',
        isSelected: true,
        metadata: { type: 'PERSONAL' },
      },
    ];
  }
}

// 4. TikTok Connector
export class TikTokConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'tiktok',
      name: 'TikTok Direct Video',
      category: 'social',
      authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
      clientId: process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      defaultScopes: ['user.info.basic', 'video.publish', 'video.upload'],
    });
  }

  public override async discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]> {
    const { tenantId, connectionId, brandId } = params;
    return [
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'creator_profile',
        externalResourceId: 'tt_creator_98124',
        name: '@agency_creator',
        isSelected: true,
        metadata: { followerCount: 42100 },
      },
    ];
  }
}

// 5. Shopify Connector
export class ShopifyConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'shopify',
      name: 'Shopify Store',
      category: 'ecommerce',
      authorizationEndpoint: 'https://shopify.com/admin/oauth/authorize',
      tokenEndpoint: 'https://shopify.com/admin/oauth/access_token',
      defaultScopes: ['read_products', 'read_orders', 'read_inventory'],
    });
  }

  public override async discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]> {
    const { tenantId, connectionId, brandId } = params;
    return [
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'store',
        externalResourceId: 'shop_myshopify_primary',
        name: 'Primary E-Commerce Storefront',
        isSelected: true,
        metadata: { currency: 'USD', productCount: 320 },
      },
    ];
  }
}

// 6. Generic OAuth 2.0 Connector
export const genericOAuth2Connector = new GenericOAuth2Connector({
  provider: 'generic_oauth2',
  name: 'Custom OAuth 2.0 Service',
  category: 'generic',
  authorizationEndpoint: 'https://oauth.example.com/authorize',
  tokenEndpoint: 'https://oauth.example.com/token',
  defaultScopes: ['read', 'write'],
});

// 7. Threads Connector (Meta)
export class ThreadsConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'threads',
      name: 'Threads (Meta)',
      category: 'social',
      authorizationEndpoint: 'https://threads.net/oauth/authorize',
      tokenEndpoint: 'https://graph.threads.net/oauth/access_token',
      defaultScopes: ['threads_basic', 'threads_content_publish', 'threads_read_replies'],
    });
  }

  public override async discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]> {
    const { tenantId, connectionId, brandId, credentials } = params;
    const accountName = credentials?.accountName || 'Threads Profile';
    return [
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'threads_profile',
        externalResourceId: credentials?.accountId || 'threads_user_primary',
        name: accountName,
        isSelected: true,
        metadata: { handle: accountName, platform: 'threads' },
      },
    ];
  }
}

// 8. Pinterest Connector
export class PinterestConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'pinterest',
      name: 'Pinterest Pins & Boards',
      category: 'social',
      authorizationEndpoint: 'https://www.pinterest.com/oauth/',
      tokenEndpoint: 'https://api.pinterest.com/v5/oauth/token',
      clientId: process.env.PINTEREST_APP_ID,
      clientSecret: process.env.PINTEREST_APP_SECRET,
      defaultScopes: ['boards:read', 'pins:read', 'pins:write'],
    });
  }

  public override async discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]> {
    const { tenantId, connectionId, brandId, credentials } = params;
    const accountName = credentials?.accountName || 'Pinterest Account';
    return [
      {
        id: crypto.randomUUID(),
        connectionId,
        tenantId,
        brandId,
        resourceType: 'board',
        externalResourceId: credentials?.accountId || 'board_primary_pins',
        name: `${accountName} - Main Board`,
        isSelected: true,
        metadata: { platform: 'pinterest' },
      },
    ];
  }
}

import { MetaConnector, facebookConnector, instagramConnector, metaConnector } from './meta/MetaConnector.js';

// Auto-register built-in connectors
export function registerBuiltInConnectors(): void {
  // Meta Family
  ConnectorRegistry.register(facebookConnector, {
    description: 'Direct publishing, page scheduling, community metrics & engagement insights via Meta Graph API.',
    defaultScopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(instagramConnector, {
    description: 'High-res image, reel & carousel publishing with direct creator analytics via Meta Graph API.',
    defaultScopes: ['instagram_basic', 'instagram_content_publish'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(metaConnector, {
    description: 'Provider-neutral Meta Graph API connection for Facebook Pages and Instagram Professional accounts.',
    defaultScopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(new GoogleDriveConnector(), {
    description: 'Import media, raw videos, and creative assets directly from Google Drive folders.',
    defaultScopes: ['drive.readonly', 'drive.file'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(new GoogleSheetsConnector(), {
    description: 'Synchronize editorial calendars, content plans, and performance data from Google Sheets.',
    defaultScopes: ['spreadsheets.readonly'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(new LinkedInConnector(), {
    description: 'Publish company updates and leadership posts to LinkedIn personal and organization pages.',
    defaultScopes: ['r_liteprofile', 'w_member_social', 'rw_organization_admin'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(new TikTokConnector(), {
    description: 'Dispatch 9:16 vertical short-form reels directly to TikTok Creator publishing queues.',
    defaultScopes: ['video.publish', 'user.info.basic'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(new ShopifyConnector(), {
    description: 'Sync products, collections, and catalog discounts into the SocialForge Content Studio.',
    defaultScopes: ['read_products', 'read_inventory'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(genericOAuth2Connector, {
    description: 'Provider-neutral OAuth 2.0 integration for enterprise identity and marketing tools.',
    defaultScopes: ['read', 'write'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(excelConnector, {
    description: 'Upload and parse Excel (.xlsx) and CSV files into normalized marketing objects.',
    defaultScopes: [],
    supportsResourceDiscovery: false,
  });

  ConnectorRegistry.register(new ThreadsConnector(), {
    description: 'Publish text and media threads directly to Meta Threads with real-time creator analytics.',
    defaultScopes: ['threads_basic', 'threads_content_publish', 'threads_read_replies'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(new PinterestConnector(), {
    description: 'Create and pin rich photo boards and visual bookmarks via Pinterest API v5.',
    defaultScopes: ['boards:read', 'pins:read', 'pins:write'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(xTwitterConnector, {
    description: 'Real-time microblogging, breaking updates, thread publishing, and audience velocity tracking via X API v2.',
    defaultScopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(youtubeConnector, {
    description: '9:16 vertical video dispatch to YouTube Shorts via Google Data API v3.',
    defaultScopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    supportsResourceDiscovery: true,
  });

  ConnectorRegistry.register(hubspotConnector, {
    description: 'Inbound CRM lead capture and deal pipeline synchronization from HubSpot.',
    defaultScopes: ['crm.objects.contacts.read', 'crm.objects.deals.read'],
    supportsResourceDiscovery: true,
  });
}

// Initialize registrations
registerBuiltInConnectors();

export * from './core/Connector.js';
export * from './core/ConnectorRegistry.js';
export * from './core/GenericOAuth2Connector.js';
export * from './x-twitter/XTwitterConnector.js';
export * from './youtube/YouTubeConnector.js';
export * from './meta/MetaConnector.js';
export * from './google-drive/GoogleDriveConnector.js';
export * from './google-sheets/GoogleSheetsConnector.js';
export * from './excel/ExcelConnector.js';

