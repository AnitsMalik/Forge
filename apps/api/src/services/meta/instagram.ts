import { metaClient } from './metaClient.js';
import { MetaIntegrationError } from './errors.js';
import type { MetaInstagramAccount } from '@socialforge/shared';

export class InstagramService {
  /**
   * Retrieves the connected Instagram Professional Account for a Facebook Page.
   */
  public async getConnectedInstagram(
    pageId: string,
    pageAccessToken: string
  ): Promise<MetaInstagramAccount | null> {
    if (!pageId || !pageAccessToken) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: 'Page ID and Page access token are required to discover connected Instagram accounts.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    try {
      const data: any = await metaClient.get(
        pageId,
        {
          fields:
            'name,instagram_business_account{id,username,name,profile_picture_url,followers_count}',
        },
        pageAccessToken
      );

      const pageName = data?.name || 'Facebook Page';
      const ig = data?.instagram_business_account;

      if (!ig?.id) {
        return null;
      }

      return {
        id: ig.id,
        username: ig.username,
        name: ig.name || null,
        profilePictureUrl: ig.profile_picture_url || null,
        followersCount: ig.followers_count || 0,
        isEligible: true,
        connectedPageId: pageId,
        connectedPageName: pageName,
      };
    } catch (err: any) {
      // If error indicates no permission or not linked
      if (err instanceof MetaIntegrationError) {
        throw err;
      }
      return null;
    }
  }

  /**
   * Validates whether an Instagram account exists and is ready for publishing.
   */
  public async verifyInstagramPublishingCapability(
    instagramAccountId: string,
    pageAccessToken: string
  ): Promise<{ eligible: boolean; username: string }> {
    try {
      const data: any = await metaClient.get(
        instagramAccountId,
        { fields: 'id,username,name' },
        pageAccessToken
      );

      if (!data?.id) {
        throw new MetaIntegrationError({
          code: 'META_INSTAGRAM_NOT_CONNECTED',
          userMessage: 'Could not verify Instagram Professional Account credentials.',
          httpStatus: 400,
          isTransient: false,
        });
      }

      return {
        eligible: true,
        username: data.username || 'unknown',
      };
    } catch (err: any) {
      throw new MetaIntegrationError({
        code: 'META_INSTAGRAM_NOT_CONNECTED',
        userMessage: 'The connected Instagram account could not be accessed. Ensure it is an Instagram Professional (Business or Creator) account and has granted instagram_content_publish permission.',
        httpStatus: 400,
        isTransient: false,
        technicalDetails: err?.message,
      });
    }
  }
}

export const instagramService = new InstagramService();
