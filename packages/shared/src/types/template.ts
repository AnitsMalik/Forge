export type TemplateCategory = 'promo' | 'educational' | 'announcement' | 'quote' | 'story' | 'reel';

export interface TemplatePlatformVariant {
  platform: string;
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:5';
  maxCharacters?: number;
  layoutConfig: Record<string, unknown>;
}

export interface Template {
  id: string;
  tenantId?: string | null;
  brandId?: string | null;
  name: string;
  category: TemplateCategory;
  description?: string;
  thumbnailUrl?: string;
  variables: Array<{ name: string; type: string; defaultValue?: string }>;
  variants: TemplatePlatformVariant[];
  version: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  changelog?: string;
  snapshot: Record<string, unknown>;
  createdAt: Date;
}
