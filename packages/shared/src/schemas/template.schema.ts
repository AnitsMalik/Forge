import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  brandId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Template name is required'),
  category: z.enum(['promo', 'educational', 'announcement', 'quote', 'story', 'reel']),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  variables: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      defaultValue: z.string().optional(),
    })
  ).default([]),
  variants: z.array(
    z.object({
      platform: z.string(),
      aspectRatio: z.enum(['1:1', '9:16', '16:9', '4:5']),
      maxCharacters: z.number().optional(),
      layoutConfig: z.record(z.unknown()),
    })
  ).default([]),
});

export const RenderTemplateSchema = z.object({
  templateId: z.string().uuid(),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])),
  targetPlatform: z.string().optional(),
});
