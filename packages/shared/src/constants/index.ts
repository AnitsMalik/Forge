// BullMQ Queue Names
export const QUEUE_NAMES = {
  CONTENT_AI: 'queue:content-ai',
  RENDER_IMAGE: 'queue:render-image',
  RENDER_VIDEO: 'queue:render-video',
  PUBLISH_DISPATCHER: 'queue:publish-dispatcher',
  ANALYTICS_SYNC: 'queue:analytics-sync',
} as const;

// Social Platform Limits
export const PLATFORM_LIMITS = {
  x_twitter: {
    maxCharacters: 280,
    maxImages: 4,
    maxVideoDurationSeconds: 140,
    recommendedHashtags: 2,
  },
  linkedin: {
    maxCharacters: 3000,
    maxImages: 9,
    maxVideoDurationSeconds: 600,
    recommendedHashtags: 5,
  },
  instagram: {
    maxCharacters: 2200,
    maxImages: 10,
    maxVideoDurationSeconds: 90, // Reels
    maxHashtags: 30,
  },
  facebook: {
    maxCharacters: 63206,
    maxImages: 10,
    maxVideoDurationSeconds: 14400,
    recommendedHashtags: 3,
  },
  tiktok: {
    maxCharacters: 2200,
    maxImages: 0,
    maxVideoDurationSeconds: 180,
    recommendedHashtags: 5,
  },
  youtube_shorts: {
    maxCharacters: 100, // Title limit
    maxImages: 0,
    maxVideoDurationSeconds: 60,
    recommendedHashtags: 3,
  },
  mock_sandbox: {
    maxCharacters: 5000,
    maxImages: 10,
    maxVideoDurationSeconds: 600,
    recommendedHashtags: 10,
  },
} as const;

// Standard Template Configurations
export const TEMPLATE_DEFINITIONS = [
  {
    id: 'quote_card_modern',
    name: 'Modern Executive Quote Card',
    description: 'Minimalist quote presentation with author title, avatar, and brand gradient.',
    supportedAspectRatios: ['1:1', '4:5', '1.91:1'],
    slots: [
      { key: 'quote', label: 'Quote Body', type: 'text', required: true },
      { key: 'authorName', label: 'Author Name', type: 'string', required: true },
      { key: 'authorTitle', label: 'Author Title', type: 'string', required: false },
      { key: 'authorAvatarUrl', label: 'Author Avatar URL', type: 'image_url', required: false },
    ],
  },
  {
    id: 'stat_highlight',
    name: 'Metric & Stat Highlight Card',
    description: 'High-contrast numerical milestone callout with trend descriptor.',
    supportedAspectRatios: ['1:1', '4:5', '1.91:1'],
    slots: [
      { key: 'metric', label: 'Metric Value (e.g. +340%)', type: 'string', required: true },
      { key: 'label', label: 'Short Headline', type: 'string', required: true },
      { key: 'subtext', label: 'Contextual Description', type: 'text', required: false },
    ],
  },
  {
    id: 'announcement_banner',
    name: 'Product & Event Announcement',
    description: 'Bold promotional banner with tag badge, title, and action pill.',
    supportedAspectRatios: ['1:1', '1.91:1', '9:16'],
    slots: [
      { key: 'badgeText', label: 'Tag Pill (e.g. NEW FEATURE)', type: 'string', required: true },
      { key: 'headline', label: 'Headline', type: 'string', required: true },
      { key: 'dateOrCta', label: 'Date or Action Prompt', type: 'string', required: false },
    ],
  },
] as const;

export * from './plans.js';

