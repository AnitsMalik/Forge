export type BrandRole = 'brand_manager' | 'creator' | 'client_approver' | 'analyst';

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  industry?: string | null;
  websiteUrl?: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

export interface ToneOfVoice {
  formality: 'casual' | 'approachable' | 'professional' | 'authoritative' | 'playful';
  descriptors: string[];
}

export interface BrandKit {
  id: string;
  brandId: string;
  toneOfVoice: ToneOfVoice;
  targetAudiences: string[];
  primaryColors: BrandColors;
  fonts: BrandFonts;
  logoUrls: {
    primary?: string | null;
    icon?: string | null;
    darkMode?: string | null;
  };
  hashtagsDefault: string[];
  disclaimers?: string | null;
  tabooWords: string[];
  guidelines?: string | null;
  updatedAt: Date;
}
