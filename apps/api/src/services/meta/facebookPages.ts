import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { metaClient } from './metaClient.js';
import { metaTokenManager } from './tokenManager.js';
import { MetaIntegrationError } from './errors.js';
import type { MetaFacebookPage } from '@socialforge/shared';

export interface RawFacebookPageResponse {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  tasks?: string[];
  picture?: {
    data?: {
      url?: string;
    };
  };
  instagram_business_account?: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
  } | null;
}

export class FacebookPagesService {
  /**
   * Retrieves all Facebook Pages authorized by the user.
   * Returns clean, safe frontend structures without access tokens.
   */
  public async getFacebookPages(userAccessToken: string): Promise<MetaFacebookPage[]> {
    if (!userAccessToken) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: 'A valid Meta access token is required to discover Facebook Pages.',
        httpStatus: 401,
        isTransient: false,
      });
    }

    const data: any = await metaClient.get(
      'me/accounts',
      {
        fields:
          'id,name,category,access_token,tasks,picture{url},instagram_business_account{id,username,name,profile_picture_url,followers_count}',
      },
      userAccessToken
    );

    const rawPages: RawFacebookPageResponse[] = Array.isArray(data?.data) ? data.data : [];

    return rawPages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category || null,
      pictureUrl: page.picture?.data?.url || null,
      tasks: page.tasks || [],
      hasInstagram: Boolean(page.instagram_business_account?.id),
      instagramAccount: page.instagram_business_account
        ? {
            id: page.instagram_business_account.id,
            username: page.instagram_business_account.username,
            name: page.instagram_business_account.name || null,
            profilePictureUrl: page.instagram_business_account.profile_picture_url || null,
            followersCount: page.instagram_business_account.followers_count || 0,
          }
        : null,
    }));
  }

  /**
   * Fetches raw pages with their Page Access Tokens and stores them encrypted in the database.
   */
  public async syncConnectionPages(
    connectionId: string,
    userAccessToken: string
  ): Promise<MetaFacebookPage[]> {
    const data: any = await metaClient.get(
      'me/accounts',
      {
        fields:
          'id,name,category,access_token,tasks,picture{url},instagram_business_account{id,username,name,profile_picture_url,followers_count}',
      },
      userAccessToken
    );

    const rawPages: RawFacebookPageResponse[] = Array.isArray(data?.data) ? data.data : [];
    const now = new Date();

    const sanitizedPages: MetaFacebookPage[] = [];

    for (const p of rawPages) {
      const encryptedPageToken = p.access_token
        ? metaTokenManager.encryptToken(p.access_token)
        : null;

      // Upsert into meta_facebook_pages
      const existing = await db('meta_facebook_pages')
        .where({ connection_id: connectionId, page_id: p.id })
        .first();

      if (existing) {
        await db('meta_facebook_pages')
          .where({ id: existing.id })
          .update({
            name: p.name,
            category: p.category || null,
            picture_url: p.picture?.data?.url || null,
            tasks: JSON.stringify(p.tasks || []),
            encrypted_access_token: encryptedPageToken,
            instagram_business_account_id: p.instagram_business_account?.id || null,
            updated_at: now,
          });
      } else {
        await db('meta_facebook_pages').insert({
          id: crypto.randomUUID(),
          connection_id: connectionId,
          page_id: p.id,
          name: p.name,
          category: p.category || null,
          picture_url: p.picture?.data?.url || null,
          tasks: JSON.stringify(p.tasks || []),
          encrypted_access_token: encryptedPageToken,
          instagram_business_account_id: p.instagram_business_account?.id || null,
          is_selected: false,
          created_at: now,
          updated_at: now,
        });
      }

      // If this page is currently the connection's selected page, or if it matches target page 1405588742634526 for HOASP brand
      const currentConn = await db('meta_connections').where({ id: connectionId }).first();
      if (
        encryptedPageToken &&
        (currentConn?.selected_page_id === p.id ||
          (p.id === '1405588742634526' && currentConn?.brand_id === '52f09a1e-e490-4c01-9674-4eb729bd5108'))
      ) {
        await db('meta_connections')
          .where({ id: connectionId })
          .update({
            selected_page_id: p.id,
            selected_page_name: p.name,
            encrypted_page_access_token: encryptedPageToken,
            status: 'connected',
            updated_at: now,
          });
      }

      // Upsert connected Instagram account if available
      if (p.instagram_business_account?.id) {
        const ig = p.instagram_business_account;
        const existingIg = await db('meta_instagram_accounts')
          .where({ connection_id: connectionId, instagram_account_id: ig.id })
          .first();

        if (existingIg) {
          await db('meta_instagram_accounts')
            .where({ id: existingIg.id })
            .update({
              page_id: p.id,
              username: ig.username,
              name: ig.name || null,
              profile_picture_url: ig.profile_picture_url || null,
              followers_count: ig.followers_count || 0,
              is_eligible: true,
              updated_at: now,
            });
        } else {
          await db('meta_instagram_accounts').insert({
            id: crypto.randomUUID(),
            connection_id: connectionId,
            page_id: p.id,
            instagram_account_id: ig.id,
            username: ig.username,
            name: ig.name || null,
            profile_picture_url: ig.profile_picture_url || null,
            followers_count: ig.followers_count || 0,
            is_eligible: true,
            created_at: now,
            updated_at: now,
          });
        }
      }

      sanitizedPages.push({
        id: p.id,
        name: p.name,
        category: p.category || null,
        pictureUrl: p.picture?.data?.url || null,
        tasks: p.tasks || [],
        hasInstagram: Boolean(p.instagram_business_account?.id),
        instagramAccount: p.instagram_business_account
          ? {
              id: p.instagram_business_account.id,
              username: p.instagram_business_account.username,
              name: p.instagram_business_account.name || null,
              profilePictureUrl: p.instagram_business_account.profile_picture_url || null,
              followersCount: p.instagram_business_account.followers_count || 0,
            }
          : null,
      });
    }

    return sanitizedPages;
  }

  /**
   * Sets the active Facebook Page for a connection, discovers its Instagram account,
   * and synchronizes the accounts to the core `social_accounts` table.
   */
  public async selectPage(brandId: string, pageId: string): Promise<any> {
    const connection = await db('meta_connections').where({ brand_id: brandId }).first();
    if (!connection) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: 'No Meta connection found for this brand. Please connect your Meta account first.',
        httpStatus: 404,
        isTransient: false,
      });
    }

    const pageRecord = await db('meta_facebook_pages')
      .where({ connection_id: connection.id, page_id: pageId })
      .first();

    if (!pageRecord) {
      throw new MetaIntegrationError({
        code: 'META_PAGE_NOT_FOUND',
        userMessage: `Facebook Page ${pageId} is not in your authorized pages list. Re-authorize Meta to discover new pages.`,
        httpStatus: 404,
        isTransient: false,
      });
    }

    // Mark page as selected in meta_facebook_pages
    await db('meta_facebook_pages')
      .where({ connection_id: connection.id })
      .update({ is_selected: false });

    await db('meta_facebook_pages')
      .where({ id: pageRecord.id })
      .update({ is_selected: true });

    // Look for connected Instagram account
    const igRecord = await db('meta_instagram_accounts')
      .where({ connection_id: connection.id, page_id: pageId })
      .first();

    const now = new Date();

    // Check if this page is already selected or connected by another brand or tenant
    const conflicting = await db('meta_connections')
      .where({ selected_page_id: pageRecord.page_id })
      .whereNot({ brand_id: brandId });

    if (conflicting.length > 0) {
      await db('meta_connections')
        .whereIn('id', [connection.id, ...conflicting.map((c: any) => c.id)])
        .update({
          selected_page_id: pageRecord.page_id,
          selected_page_name: pageRecord.name,
          encrypted_page_access_token: pageRecord.encrypted_access_token,
          status: 'ownership_conflict',
          updated_at: now,
        });

      // Synchronize social_accounts to inactive status for all conflicting connections
      await db('social_accounts')
        .whereIn('brand_id', [brandId, ...conflicting.map((c: any) => c.brand_id)])
        .where({ account_id: pageRecord.page_id })
        .update({
          is_active: false,
          updated_at: now,
        });

      throw new MetaIntegrationError({
        code: 'META_OWNERSHIP_CONFLICT',
        userMessage: `Facebook Page "${pageRecord.name}" (${pageRecord.page_id}) is connected to multiple brands/tenants. Flagged as ownership conflict; publishing is blocked until resolved.`,
        safeMessage: 'Ownership conflict: Meta Page is associated with multiple brands or tenants.',
        httpStatus: 409,
        isTransient: false,
      });
    }

    // Update meta_connections
    await db('meta_connections')
      .where({ id: connection.id })
      .update({
        selected_page_id: pageRecord.page_id,
        selected_page_name: pageRecord.name,
        encrypted_page_access_token: pageRecord.encrypted_access_token,
        instagram_account_id: igRecord?.instagram_account_id || null,
        instagram_username: igRecord?.username || null,
        status: 'connected',
        updated_at: now,
      });

    // Sync to social_accounts table for Facebook Page
    const pageToken = pageRecord.encrypted_access_token || connection.encrypted_user_access_token;
    const existingFb = await db('social_accounts')
      .where({ brand_id: brandId, platform: 'facebook' })
      .first();

    const fbMetadata = {
      handle: `@${pageRecord.name.toLowerCase().replace(/\s+/g, '_')}`,
      avatarUrl: pageRecord.picture_url || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80',
      category: pageRecord.category,
      isSandbox: false,
      profileUrl: `https://facebook.com/${pageRecord.page_id}`,
      metaConnectionId: connection.id,
    };

    if (existingFb) {
      await db('social_accounts')
        .where({ id: existingFb.id })
        .update({
          account_name: pageRecord.name,
          account_id: pageRecord.page_id,
          access_token_encrypted: pageToken,
          token_expires_at: connection.credential_expires_at,
          is_active: true,
          metadata: JSON.stringify(fbMetadata),
          updated_at: now,
        });

      // Deactivate any other duplicate facebook entries for this brand
      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'facebook' })
        .whereNot({ id: existingFb.id })
        .update({ is_active: false, updated_at: now });
    } else {
      await db('social_accounts').insert({
        id: crypto.randomUUID(),
        brand_id: brandId,
        platform: 'facebook',
        account_name: pageRecord.name,
        account_id: pageRecord.page_id,
        access_token_encrypted: pageToken,
        token_expires_at: connection.credential_expires_at,
        is_active: true,
        metadata: JSON.stringify(fbMetadata),
        created_at: now,
        updated_at: now,
      });
    }

    // Sync to social_accounts table for connected Instagram Professional Account if present
    if (igRecord) {
      const existingIg = await db('social_accounts')
        .where({ brand_id: brandId, platform: 'instagram', account_id: igRecord.instagram_account_id })
        .first();

      const igMetadata = {
        handle: `@${igRecord.username}`,
        avatarUrl:
          igRecord.profile_picture_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
        followerCount: igRecord.followers_count || 1000,
        isSandbox: false,
        profileUrl: `https://instagram.com/${igRecord.username}`,
        connectedPageId: pageRecord.page_id,
        metaConnectionId: connection.id,
      };

      if (existingIg) {
        await db('social_accounts')
          .where({ id: existingIg.id })
          .update({
            account_name: igRecord.name || `@${igRecord.username}`,
            access_token_encrypted: pageToken,
            token_expires_at: connection.credential_expires_at,
            is_active: true,
            metadata: JSON.stringify(igMetadata),
            updated_at: now,
          });
      } else {
        await db('social_accounts').insert({
          id: crypto.randomUUID(),
          brand_id: brandId,
          platform: 'instagram',
          account_name: igRecord.name || `@${igRecord.username}`,
          account_id: igRecord.instagram_account_id,
          access_token_encrypted: pageToken,
          token_expires_at: connection.credential_expires_at,
          is_active: true,
          metadata: JSON.stringify(igMetadata),
          created_at: now,
          updated_at: now,
        });
      }

      // Deactivate any sandbox or other Instagram accounts for this brand so live channel is active
      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'instagram' })
        .whereNot({ account_id: igRecord.instagram_account_id })
        .update({ is_active: false, updated_at: now });
    } else {
      // If no linked Instagram Professional account exists on this Facebook Page, mark live accounts inactive
      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'instagram' })
        .whereNot('account_id', 'like', 'sb_%')
        .update({ is_active: false, updated_at: now });
    }

    return {
      selectedPageId: pageRecord.page_id,
      selectedPageName: pageRecord.name,
      hasInstagram: Boolean(igRecord),
      instagramAccount: igRecord
        ? {
            id: igRecord.instagram_account_id,
            username: igRecord.username,
            name: igRecord.name,
            profilePictureUrl: igRecord.profile_picture_url,
            followersCount: igRecord.followers_count,
          }
        : null,
    };
  }
}

export const facebookPagesService = new FacebookPagesService();
