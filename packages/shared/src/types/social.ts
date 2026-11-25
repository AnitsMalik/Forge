export type SocialPlatform = 'meta' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube' | 'pinterest';

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed';

export interface SocialAccount {
  id: string;
  brandId: string;
  tenantId: string;
  platform: SocialPlatform;
  platformAccountId: string;
  accountName: string;
  accountType?: 'page' | 'business' | 'profile' | 'group' | string;
  profilePictureUrl?: string | null;
  status: 'connected' | 'expired' | 'revoked' | 'error';
  tokenExpiresAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
