import { z } from 'zod';

// Auth Schemas
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  agencyName: z.string().min(2, 'Agency name must be at least 2 characters'),
  agencySlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase alphanumeric characters and hyphens'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Brand Schemas
export const CreateBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase alphanumeric characters and hyphens'),
  industry: z.string().optional(),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
});

export const UpdateBrandKitSchema = z.object({
  toneOfVoice: z
    .object({
      formality: z.enum(['casual', 'approachable', 'professional', 'authoritative', 'playful']),
      descriptors: z.array(z.string()),
    })
    .optional(),
  targetAudiences: z.array(z.string()).optional(),
  primaryColors: z
    .object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
      background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
      text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be valid hex color'),
    })
    .optional(),
  fonts: z
    .object({
      heading: z.string().min(1),
      body: z.string().min(1),
    })
    .optional(),
  hashtagsDefault: z.array(z.string()).optional(),
  tabooWords: z.array(z.string()).optional(),
  disclaimers: z.string().optional().nullable(),
  guidelines: z.string().optional().nullable(),
});

// Brand Brain Schemas (16 Dimensions)
export const BrandBrainProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().default(''),
  price: z.string().optional(),
  category: z.string().optional(),
  url: z.string().optional(),
});

export const BrandBrainServiceOfferingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Service name is required'),
  description: z.string().default(''),
  deliverables: z.array(z.string()).optional(),
});

export const BrandBrainPillarSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Pillar title is required'),
  description: z.string().default(''),
  weightPercentage: z.number().min(0).max(100).optional(),
  sampleTopics: z.array(z.string()).default([]),
});

export const UpdateBrandBrainSchema = z.object({
  businessProfile: z
    .object({
      name: z.string().min(1),
      tagline: z.string().optional(),
      description: z.string().default(''),
      industry: z.string().default(''),
      mission: z.string().optional(),
      websiteUrl: z.string().optional(),
    })
    .optional(),
  products: z.array(BrandBrainProductSchema).optional(),
  services: z.array(BrandBrainServiceOfferingSchema).optional(),
  usps: z.array(z.string()).optional(),
  targetAudience: z
    .object({
      primary: z.string().default(''),
      demographics: z.array(z.string()).default([]),
      icpDescription: z.string().optional(),
    })
    .optional(),
  painPoints: z.array(z.string()).optional(),
  brandValues: z.array(z.string()).optional(),
  tone: z
    .object({
      formality: z.enum(['casual', 'approachable', 'professional', 'authoritative', 'playful']).default('approachable'),
      descriptors: z.array(z.string()).default([]),
      personalityTraits: z.array(z.string()).optional(),
    })
    .optional(),
  writingStyle: z
    .object({
      guidelines: z.string().default(''),
      sentenceStructure: z.enum(['short_punchy', 'balanced', 'elaborate']).optional(),
      vocabularyLevel: z.enum(['accessible', 'technical', 'elevated']).optional(),
      pointOfView: z.enum(['first_person_plural', 'first_person_singular', 'second_person', 'third_person']).optional(),
    })
    .optional(),
  languages: z.array(z.string()).optional(),
  ctaPreferences: z.array(z.string()).optional(),
  emojiPreferences: z
    .object({
      usage: z.enum(['none', 'minimal', 'moderate', 'heavy']).default('moderate'),
      signatureEmojis: z.array(z.string()).default([]),
      rules: z.string().optional(),
    })
    .optional(),
  hashtagPreferences: z
    .object({
      brandTag: z.string().default(''),
      defaultTags: z.array(z.string()).default([]),
      bannedTags: z.array(z.string()).default([]),
      maxCount: z.number().min(0).max(30).default(5),
    })
    .optional(),
  topicsToAvoid: z.array(z.string()).optional(),
  visualIdentity: z
    .object({
      colors: z.object({
        primary: z.string(),
        secondary: z.string(),
        accent: z.string(),
        background: z.string(),
        text: z.string(),
      }),
      fonts: z.object({
        heading: z.string(),
        body: z.string(),
      }),
      logoUrls: z.object({
        primary: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        darkMode: z.string().nullable().optional(),
      }),
    })
    .optional(),
  contentPillars: z.array(BrandBrainPillarSchema).optional(),
});

export const WebsiteExtractionRequestSchema = z.object({
  url: z.string().url('Must be a valid web URL (http or https)'),
});

// Media Schemas
export const PresignedUrlRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
});

export const ConfirmUploadRequestSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
  metadata: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      durationSec: z.number().optional(),
      aspectRatio: z.string().optional(),
    })
    .default({}),
});

// AI Generation Schemas
export const GenerateContentRequestSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters'),
  targetPlatforms: z
    .array(
      z.enum([
        'instagram',
        'facebook',
        'x_twitter',
        'linkedin',
        'tiktok',
        'youtube_shorts',
        'mock_sandbox',
      ])
    )
    .min(1, 'Select at least one platform'),
  campaignGoal: z.enum(['brand_awareness', 'drive_conversions', 'engagement', 'announcement']).optional(),
  includeHashtags: z.boolean().default(true),
});

// Template Rendering Schemas
export const RenderTemplateRequestSchema = z.object({
  templateId: z.enum(['quote_card_modern', 'stat_highlight', 'announcement_banner']),
  aspectRatio: z.enum(['1:1', '4:5', '1.91:1', '9:16']).default('1:1'),
  slots: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

// Post Schemas
export const CreatePostVariantSchema = z.object({
  platform: z.enum([
    'instagram',
    'facebook',
    'x_twitter',
    'linkedin',
    'tiktok',
    'youtube',
    'youtube_shorts',
    'pinterest',
    'mock_sandbox',
  ]),
  content: z.string().min(1, 'Post content is required'),
  mediaAssetIds: z.array(z.string()).default([]),
  platformSpecificConfig: z.record(z.unknown()).default({}),
});

export const CreatePostSchema = z.object({
  title: z.string().min(1, 'Post title is required'),
  baseContent: z.string().default('New post update'),
  campaignId: z.string().uuid().optional().nullable(),
  variants: z.array(CreatePostVariantSchema).min(1, 'At least one platform variant is required'),
});

export const SchedulePostSchema = z.object({
  scheduledFor: z.string().datetime({ message: 'Must be an ISO 8601 UTC timestamp string' }),
});

// Approval Schemas
export const SubmitApprovalSchema = z.object({
  reviewerEmail: z.string().email().optional(),
  generateMagicLink: z.boolean().default(true),
});

export const MagicLinkActionSchema = z.object({
  action: z.enum(['approved', 'changes_requested']),
  comment: z.string().optional(),
  reviewerName: z.string().min(1).default('Client Approver'),
});

export * from './connection.schema.js';
export * from './automation.schema.js';
export * from './template.schema.js';
export * from './agent.schema.js';
