import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  Type,
  Image as ImageIcon,
  Square,
  Download,
  Layers,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  RotateCw,
  Palette,
  LayoutTemplate,
  Upload,
  Check,
  Plus,
  MoveUp,
  MoveDown,
  ChevronsUp,
  ChevronsDown,
  Quote,
  Star,
  Flame,
  Heart,
  CheckCircle2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Crosshair,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Award,
  TrendingUp,
  Send,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sliders,
  Eye,
  EyeOff,
  Maximize2,
  Save,
  PenTool,
  Film,
  Shapes,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Smile,
  Minus,
  Sparkles,
  BookmarkPlus,
  Search,
  FolderOpen,
  RotateCcw,
  Hand,
  Loader2,
  Lock,
  Unlock,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Play,
  Wand2,
  Grid,
  RefreshCw,
  Link2,
  Unlink2,
  FileText,
  Clock,
  Globe,
  Megaphone,
  Gift,
  Tag,
  Bell,
  Camera,
  Crown,
} from 'lucide-react';
import type { BrandBrain, DesignTemplate, TemplateCategory } from '@socialforge/shared';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { ReelMotionStudioModal } from './ReelMotionStudioModal.js';
import {
  CANONICAL_TEMPLATES,
  STUDIO_TEMPLATE_CATEGORIES,
} from '../constants/designTemplates.js';
import { ConfirmDialogModal } from './superadmin/ConfirmDialogModal.js';

export interface LayerAnimationConfig {
  entrance: 'none' | 'fade' | 'slide_up' | 'zoom_in' | 'pop' | 'typewriter' | 'float';
  exit?: 'none' | 'fade_out' | 'slide_down' | 'zoom_out';
  duration: number; // seconds, e.g. 0.8
  delay: number; // seconds, e.g. 0
}

export interface CanvasLayer {
  id: string;
  type: 'text' | 'image' | 'shape' | 'icon';
  name: string;
  x: number; // 0 to 100% of canvas width
  y: number; // 0 to 100% of canvas height
  width: number; // 0 to 100%
  height: number; // 0 to 100%
  rotation: number; // -360 to 360 degrees
  opacity: number; // 0 to 1
  visible: boolean;
  locked?: boolean;
  groupId?: string;

  // Text specific
  text?: string;
  fontFamily?: string;
  fontSize?: number; // in base units
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  backgroundFillMode?: 'box' | 'canvas';
  backgroundPadding?: number;
  borderRadius?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  shadowColor?: string;
  shadowBlur?: number;

  // Image specific
  imageUrl?: string;
  flipX?: boolean;
  flipY?: boolean;
  cropAspect?: 'free' | '1:1' | '4:5' | '16:9' | 'circle';

  // Vector Shape specific
  shapeType?:
    | 'rectangle'
    | 'rounded_rect'
    | 'circle'
    | 'pill'
    | 'triangle'
    | 'star'
    | 'hexagon'
    | 'diamond'
    | 'ribbon'
    | 'speech_bubble'
    | 'arrow'
    | 'line';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDash?: 'solid' | 'dashed' | 'dotted';
  gradientFill?: string;

  // Icon specific
  iconName?: string;
  iconColor?: string;

  // Animation specific
  animation?: LayerAnimationConfig;
}

export interface SavedDesignProject {
  id: string;
  title: string;
  updatedAt: string;
  aspectRatio: string;
  background: {
    type: 'gradient' | 'solid' | 'image' | 'transparent';
    value: string;
    overlayOpacity: number;
  };
  layers: CanvasLayer[];
  thumbnailDataUrl?: string;
}

interface CanvaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToLibrary?: (asset: any) => void;
  onUseInPost?: (asset: any) => void;
  onCreatePost?: (asset?: any) => void;
  initialImageUrl?: string;
  initialText?: string;
  initialLayers?: CanvasLayer[];
  initialBackground?: {
    type: 'gradient' | 'solid' | 'image' | 'transparent';
    value: string;
    overlayOpacity?: number;
  };
  initialAspectRatio?: string;
  isEmbedded?: boolean;
}

export interface DesignPresetItem {
  id: string;
  name: string;
  platform: 'Instagram' | 'Facebook' | 'LinkedIn' | 'X' | 'YouTube' | 'Universal';
  ratio: string;
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  badge: string;
  desc: string;
  icon: string;
}

export const DESIGN_FORMAT_PRESETS: DesignPresetItem[] = [
  {
    id: 'instagram_square',
    name: 'Instagram Post',
    platform: 'Instagram',
    ratio: '1:1',
    width: 1080,
    height: 1080,
    baseWidth: 540,
    baseHeight: 540,
    badge: '1:1',
    desc: '1080 × 1080 px • Square Post',
    icon: '📸',
  },
  {
    id: 'instagram_portrait',
    name: 'Instagram Portrait',
    platform: 'Instagram',
    ratio: '4:5',
    width: 1080,
    height: 1350,
    baseWidth: 480,
    baseHeight: 600,
    badge: '4:5',
    desc: '1080 × 1350 px • Portrait Feed',
    icon: '📱',
  },
  {
    id: 'instagram_story',
    name: 'Instagram Story / Reel',
    platform: 'Instagram',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    baseWidth: 380,
    baseHeight: 675,
    badge: '9:16',
    desc: '1080 × 1920 px • Vertical Story',
    icon: '⚡',
  },
  {
    id: 'facebook',
    name: 'Facebook Post',
    platform: 'Facebook',
    ratio: '1.91:1',
    width: 1200,
    height: 630,
    baseWidth: 680,
    baseHeight: 357,
    badge: '1.91:1',
    desc: '1200 × 630 px • Feed Banner',
    icon: '👍',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Post',
    platform: 'LinkedIn',
    ratio: '1.91:1',
    width: 1200,
    height: 627,
    baseWidth: 680,
    baseHeight: 355,
    badge: '1.91:1',
    desc: '1200 × 627 px • B2B Update',
    icon: '💼',
  },
  {
    id: 'youtube_thumbnail',
    name: 'YouTube Thumbnail',
    platform: 'YouTube',
    ratio: '16:9',
    width: 1280,
    height: 720,
    baseWidth: 680,
    baseHeight: 382,
    badge: '16:9',
    desc: '1280 × 720 px • HD Video Cover',
    icon: '▶️',
  },
  {
    id: 'x',
    name: 'Promotional Banner',
    platform: 'X',
    ratio: '16:9',
    width: 1200,
    height: 675,
    baseWidth: 680,
    baseHeight: 382,
    badge: '16:9',
    desc: '1200 × 675 px • Campaign Ad',
    icon: '📣',
  },
  {
    id: 'tiktok_video_cover',
    name: 'TikTok Video Cover',
    platform: 'Universal',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    baseWidth: 380,
    baseHeight: 675,
    badge: '9:16',
    desc: '1080 × 1920 px • Vertical Video Cover',
    icon: '🎵',
  },
  {
    id: 'pinterest_pin',
    name: 'Event Poster',
    platform: 'Universal',
    ratio: '2:3',
    width: 1000,
    height: 1500,
    baseWidth: 420,
    baseHeight: 630,
    badge: '2:3',
    desc: '1000 × 1500 px • Vertical Poster',
    icon: '🗓️',
  },
];

const ASPECT_RATIOS = [
  ...DESIGN_FORMAT_PRESETS.map((p) => ({
    id: p.id,
    label: `${p.name} (${p.width}×${p.height})`,
    width: p.width,
    height: p.height,
    desc: p.desc,
    ratio: p.ratio,
    icon: p.icon,
    platform: p.platform,
  })),
  { id: '1:1', label: '1:1 Square (1080×1080)', width: 1080, height: 1080, desc: 'Instagram / LinkedIn', ratio: '1:1', icon: '📸', platform: 'Universal' },
  { id: '4:5', label: '4:5 Portrait (1080×1350)', width: 1080, height: 1350, desc: 'Instagram Feed', ratio: '4:5', icon: '📱', platform: 'Universal' },
  { id: '9:16', label: '9:16 Story (1080×1920)', width: 1080, height: 1920, desc: 'Reels & Stories', ratio: '9:16', icon: '⚡', platform: 'Universal' },
  { id: '1.91:1', label: '1.91:1 Landscape (1200×630)', width: 1200, height: 630, desc: 'Facebook / LinkedIn', ratio: '1.91:1', icon: '👍', platform: 'Universal' },
  { id: '16:9', label: '16:9 Widescreen (1280×720)', width: 1280, height: 720, desc: 'YouTube / Banner', ratio: '16:9', icon: '▶️', platform: 'Universal' },
  { id: '2:3', label: '2:3 Poster (1000×1500)', width: 1000, height: 1500, desc: 'Event Poster', ratio: '2:3', icon: '🗓️', platform: 'Universal' },
];

const CANVAS_BASE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  instagram_square: { width: 540, height: 540 },
  instagram_portrait: { width: 480, height: 600 },
  instagram_story: { width: 380, height: 675 },
  facebook: { width: 680, height: 357 },
  linkedin: { width: 680, height: 355 },
  x: { width: 680, height: 382 },
  youtube_thumbnail: { width: 680, height: 382 },
  tiktok_video_cover: { width: 380, height: 675 },
  pinterest_pin: { width: 420, height: 630 },
  '1:1': { width: 540, height: 540 },
  '4:5': { width: 480, height: 600 },
  '1.91:1': { width: 680, height: 357 },
  '9:16': { width: 380, height: 675 },
  '16:9': { width: 680, height: 382 },
  '2:3': { width: 420, height: 630 },
};

export interface SystemFontOption {
  group: 'Modern Google Fonts' | 'System Sans-Serif' | 'System Serif' | 'System Monospace';
  name: string;
  family: string;
}

const SYSTEM_AND_WEB_FONTS: SystemFontOption[] = [
  { group: 'Modern Google Fonts', name: 'Outfit', family: "'Outfit', sans-serif" },
  { group: 'Modern Google Fonts', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" },
  { group: 'Modern Google Fonts', name: 'Inter', family: "'Inter', sans-serif" },
  { group: 'Modern Google Fonts', name: 'Playfair Display', family: "'Playfair Display', serif" },
  { group: 'Modern Google Fonts', name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { group: 'Modern Google Fonts', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { group: 'Modern Google Fonts', name: 'Cinzel', family: "'Cinzel', serif" },
  { group: 'Modern Google Fonts', name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { group: 'Modern Google Fonts', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
  { group: 'System Sans-Serif', name: 'System UI / Roboto', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { group: 'System Sans-Serif', name: 'Arial', family: 'Arial, sans-serif' },
  { group: 'System Sans-Serif', name: 'Helvetica Neue', family: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { group: 'System Sans-Serif', name: 'Verdana', family: 'Verdana, Geneva, sans-serif' },
  { group: 'System Sans-Serif', name: 'Impact', family: 'Impact, Charcoal, sans-serif' },
  { group: 'System Serif', name: 'Georgia', family: 'Georgia, serif' },
  { group: 'System Serif', name: 'Times New Roman', family: "'Times New Roman', Times, serif" },
  { group: 'System Monospace', name: 'Courier New', family: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = [10, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 52, 56, 60, 64, 72, 84, 96, 112];

export const CORELDRAW_SHAPES: {
  type: NonNullable<CanvasLayer['shapeType']>;
  name: string;
  category: 'Basic Primitives' | 'Geometric & Polygons' | 'Banners & Callouts';
  icon: string;
}[] = [
  { type: 'rectangle', name: 'Rectangle Box', category: 'Basic Primitives', icon: '▭' },
  { type: 'rounded_rect', name: 'Rounded Card', category: 'Basic Primitives', icon: '▢' },
  { type: 'circle', name: 'Circle Badge', category: 'Basic Primitives', icon: '○' },
  { type: 'pill', name: 'Pill Capsule', category: 'Basic Primitives', icon: '⬭' },
  { type: 'line', name: 'Divider Line', category: 'Basic Primitives', icon: '―' },
  { type: 'triangle', name: 'Triangle', category: 'Geometric & Polygons', icon: '△' },
  { type: 'star', name: '5-Point Star', category: 'Geometric & Polygons', icon: '★' },
  { type: 'hexagon', name: 'Hexagon', category: 'Geometric & Polygons', icon: '⬡' },
  { type: 'diamond', name: 'Diamond', category: 'Geometric & Polygons', icon: '◇' },
  { type: 'ribbon', name: 'Ribbon Banner', category: 'Banners & Callouts', icon: '🏷️' },
  { type: 'speech_bubble', name: 'Speech Bubble', category: 'Banners & Callouts', icon: '💬' },
  { type: 'arrow', name: 'Arrow Pointer', category: 'Banners & Callouts', icon: '➔' },
];

const GRADIENT_PRESETS = [
  { name: 'Royal Indigo', css: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #7c3aed 100%)' },
  { name: 'Sunset Luxe', css: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' },
  { name: 'Deep Violet', css: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)' },
  { name: 'Obsidian Gold', css: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #78350f 100%)' },
  { name: 'Emerald Executive', css: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)' },
  { name: 'Midnight Slate', css: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' },
  { name: 'Cyber Ocean', css: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)' },
  { name: 'Soft Pearl Light', css: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)' },
];

const CURATED_STOCK_PHOTOS = [
  { id: 'sp-1', title: 'Luxury Product Minimal', category: 'Product', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&q=80' },
  { id: 'sp-2', title: 'Modern Creative Team', category: 'Business', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80' },
  { id: 'sp-3', title: 'Cosmetics & Skincare', category: 'Product', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1080&q=80' },
  { id: 'sp-4', title: 'Executive Conference', category: 'Events', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&q=80' },
  { id: 'sp-5', title: 'Strategy & Analytics', category: 'Business', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&q=80' },
  { id: 'sp-6', title: 'Festival Celebration', category: 'Events', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80' },
  { id: 'sp-7', title: 'Abstract Neon Studio', category: 'Luxury', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&q=80' },
  { id: 'sp-8', title: 'Fine Art & Texture', category: 'Luxury', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80' },
];

const sanitizeTemplatePlaceholderText = (rawText?: string, fallbackTitle?: string): string => {
  if (!rawText) return fallbackTitle || 'Featured Headline';
  const replacements: Record<string, string> = {
    product_name: 'Flagship Collection',
    feature_headline: 'Next-Gen Smart Workflow',
    headline: fallbackTitle || 'Elevate Your Brand Presence',
    subheadline: 'Designed for high-converting social campaigns and modern brands.',
    subtitle: 'Limited-time offer available online and in stores.',
    brand_name: 'HoaspForge Studio',
    discount: '40% OFF',
    offer: 'SPECIAL OFFER ⚡',
    cta_text: 'Explore Now ➔',
    cta: 'Shop Collection ➔',
    date: 'THIS FRIDAY • 7 PM',
    quote: '“Design is the silent ambassador of your brand.”',
    author: '— Creative Director',
    metric: '10X ROI',
    price: '$129.00',
    location: 'GRAND BALLROOM • NYC',
    tip_number: '01',
  };

  return rawText.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr: string) => {
    const parts = expr.split('|').map((p) => p.trim());
    const key = (parts[0] || '').toLowerCase();
    let defaultVal = '';
    const filters: string[] = [];

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const quoted = part.match(/^["'](.*)["']$/);
      if (quoted) {
        defaultVal = quoted[1];
      } else {
        filters.push(part.toLowerCase());
      }
    }

    let resolved =
      defaultVal ||
      replacements[key] ||
      key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    if (filters.includes('uppercase')) resolved = resolved.toUpperCase();
    if (filters.includes('lowercase')) resolved = resolved.toLowerCase();
    return resolved;
  });
};

export const getDesignUnitScale = (canvasWidth: number, canvasHeight: number): number => {
  const minSide = Math.min(canvasWidth || 540, canvasHeight || 540);
  return (minSide / 540) * 0.45;
};

export const computeTextLayoutMetrics = (
  layer: CanvasLayer,
  canvasWidth: number,
  canvasHeight: number
): {
  unitScale: number;
  fontSizePx: number;
  lineHeightRatio: number;
  paddingPx: number;
  borderRadiusPx: number;
  letterSpacingPx: number;
  shadowBlurPx: number;
  boxWidthPx: number;
  boxHeightPx: number;
} => {
  const unitScale = getDesignUnitScale(canvasWidth, canvasHeight);
  const boxWidthPx = Math.max(24, ((layer.width || 60) / 100) * canvasWidth);
  const boxHeightPx = Math.max(18, ((layer.height || 14) / 100) * canvasHeight);
  const rawFontSize = Math.max(10, layer.fontSize || 24);
  let fontSizePx = rawFontSize * unitScale;
  const lineHeightRatio = layer.lineHeight || 1.22;
  const isBadgeOrCta = Boolean(layer.backgroundColor && layer.backgroundFillMode !== 'canvas');
  const paddingPx = isBadgeOrCta ? (layer.backgroundPadding ?? 10) * unitScale : 0;

  const textStr = (layer.text || '').trim();
  if (textStr.length > 0 && layer.backgroundFillMode !== 'canvas') {
    const availW = Math.max(20, boxWidthPx - paddingPx * 2);
    const availH = Math.max(14, boxHeightPx - paddingPx * 1.5);
    const avgCharFactor = layer.letterSpacing && layer.letterSpacing > 1 ? 0.66 : 0.56;

    // Iteratively scale down font size only when text would overflow its bounding box
    for (let step = 0; step < 8; step++) {
      const charsPerLine = Math.max(4, Math.floor(availW / Math.max(6, fontSizePx * avgCharFactor)));
      const words = textStr.split(/\s+/);
      let lineCount = 1;
      let currentLen = 0;
      for (const w of words) {
        if (currentLen === 0) {
          currentLen = w.length;
        } else if (currentLen + 1 + w.length <= charsPerLine) {
          currentLen += 1 + w.length;
        } else {
          lineCount++;
          currentLen = w.length;
        }
      }
      const longestWord = Math.max(...words.map((w) => w.length), 1);
      const wordWidthPx = longestWord * fontSizePx * avgCharFactor;
      const estTotalHeight = lineCount * fontSizePx * lineHeightRatio;

      if ((estTotalHeight <= availH * 1.15 && wordWidthPx <= availW * 1.08) || fontSizePx <= 9 * unitScale) {
        break;
      }
      fontSizePx *= 0.9;
    }
  }

  const borderRadiusPx =
    layer.borderRadius !== undefined
      ? layer.borderRadius >= 999
        ? 9999
        : layer.borderRadius * unitScale * 1.8
      : 6 * unitScale;

  const letterSpacingPx = (layer.letterSpacing || 0) * unitScale * 1.2;
  const shadowBlurPx = (layer.shadowBlur || 8) * unitScale * 1.5;

  return {
    unitScale,
    fontSizePx,
    lineHeightRatio,
    paddingPx,
    borderRadiusPx,
    letterSpacingPx,
    shadowBlurPx,
    boxWidthPx,
    boxHeightPx,
  };
};

export const normalizeTemplateLayers = (
  rawLayers: any[],
  templateName?: string
): CanvasLayer[] => {
  if (!Array.isArray(rawLayers)) return [];
  const seenSignatures = new Set<string>();
  const normalized: CanvasLayer[] = [];

  rawLayers.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;

    const rawType = String(raw.type || 'text').toLowerCase();
    const mappedType: CanvasLayer['type'] =
      rawType === 'badge' || rawType === 'cta'
        ? 'text'
        : rawType === 'image' || rawType === 'shape' || rawType === 'icon'
          ? (rawType as CanvasLayer['type'])
          : 'text';

    const x = Number.isFinite(Number(raw.x)) ? Math.max(4, Math.min(96, Number(raw.x))) : 50;
    const y = Number.isFinite(Number(raw.y)) ? Math.max(4, Math.min(96, Number(raw.y))) : 20 + idx * 18;
    const width = Number.isFinite(Number(raw.width)) ? Math.max(6, Math.min(96, Number(raw.width))) : mappedType === 'text' ? 76 : 40;
    const height = Number.isFinite(Number(raw.height)) ? Math.max(5, Math.min(96, Number(raw.height))) : mappedType === 'text' ? 14 : 30;

    let resolvedImageUrl: string | undefined = raw.imageUrl || raw.url;
    if (mappedType === 'image') {
      if (!resolvedImageUrl || resolvedImageUrl.includes('{{')) {
        resolvedImageUrl = CURATED_STOCK_PHOTOS[idx % CURATED_STOCK_PHOTOS.length].url;
      }
    }

    const sanitizedText =
      mappedType === 'text'
        ? sanitizeTemplatePlaceholderText(raw.text || raw.label || raw.name, templateName)
        : undefined;

    // Deduplicate accidental identical layers in template payload
    const sig = `${mappedType}:${(sanitizedText || resolvedImageUrl || raw.shapeType || '').trim().toLowerCase()}:${Math.round(x / 3)}:${Math.round(y / 3)}`;
    if (seenSignatures.has(sig)) return;
    seenSignatures.add(sig);

    const isCtaOrBadge =
      rawType === 'badge' ||
      rawType === 'cta' ||
      Boolean(raw.backgroundColor) ||
      String(raw.id || '').toLowerCase().includes('cta') ||
      String(raw.id || '').toLowerCase().includes('badge');

    normalized.push({
      ...raw,
      id: raw.id ? `${String(raw.id)}-${idx}` : `layer-${Date.now()}-${idx}`,
      type: mappedType,
      name:
        raw.name ||
        (rawType === 'cta'
          ? 'CTA Button'
          : rawType === 'badge'
            ? 'Promo Badge'
            : mappedType === 'image'
              ? 'Featured Image'
              : mappedType === 'shape'
                ? 'Vector Shape'
                : `Text Layer ${idx + 1}`),
      x,
      y,
      width,
      height,
      rotation: Number.isFinite(Number(raw.rotation)) ? Number(raw.rotation) : 0,
      opacity: Number.isFinite(Number(raw.opacity)) ? Number(raw.opacity) : 1,
      visible: raw.visible !== false,
      locked: Boolean(raw.locked),
      text: sanitizedText,
      imageUrl: resolvedImageUrl,
      fontFamily: raw.fontFamily || "'Outfit', sans-serif",
      fontSize: Number.isFinite(Number(raw.fontSize)) ? Number(raw.fontSize) : isCtaOrBadge ? 16 : 32,
      fontWeight: String(raw.fontWeight || (isCtaOrBadge ? '800' : '700')),
      textAlign: raw.textAlign || 'center',
      color: raw.color || '#ffffff',
      backgroundColor: raw.backgroundColor || (rawType === 'cta' ? '#4f46e5' : rawType === 'badge' ? '#facc15' : undefined),
      backgroundPadding: raw.backgroundPadding ?? (isCtaOrBadge ? 10 : undefined),
      borderRadius: raw.borderRadius ?? (isCtaOrBadge ? 9999 : undefined),
      lineHeight: raw.lineHeight || 1.2,
    });
  });

  return normalized;
};

export interface DesignValidationIssue {
  id: string;
  type: 'overlap' | 'out_of_bounds' | 'empty_text' | 'duplicate' | 'invalid_dimensions' | 'missing_asset';
  severity: 'warning' | 'error';
  layerId?: string;
  layerName?: string;
  message: string;
}

export const validateCanvasDesign = (layers: CanvasLayer[]): DesignValidationIssue[] => {
  const issues: DesignValidationIssue[] = [];
  const visibleLayers = layers.filter((l) => l.visible);

  // 1. Check individual layer validity (empty text, invalid dimensions, out of bounds, missing image/font)
  visibleLayers.forEach((layer) => {
    const w = Number(layer.width);
    const h = Number(layer.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 4 || h < 3) {
      issues.push({
        id: `dim-${layer.id}`,
        type: 'invalid_dimensions',
        severity: 'error',
        layerId: layer.id,
        layerName: layer.name,
        message: `"${layer.name}" has invalid dimensions (${Math.round(w || 0)}% × ${Math.round(h || 0)}%).`,
      });
    }

    if (layer.backgroundFillMode !== 'canvas') {
      const left = layer.x - w / 2;
      const right = layer.x + w / 2;
      const top = layer.y - h / 2;
      const bottom = layer.y + h / 2;
      if (left < -1 || right > 101 || top < -1 || bottom > 101) {
        issues.push({
          id: `oob-${layer.id}`,
          type: 'out_of_bounds',
          severity: 'warning',
          layerId: layer.id,
          layerName: layer.name,
          message: `"${layer.name}" extends outside the canvas safe boundaries.`,
        });
      }
    }

    if (layer.type === 'text') {
      if (!layer.text || layer.text.trim().length === 0) {
        issues.push({
          id: `empty-${layer.id}`,
          type: 'empty_text',
          severity: 'warning',
          layerId: layer.id,
          layerName: layer.name,
          message: `"${layer.name}" is an empty text element.`,
        });
      }
      if (!layer.fontFamily || layer.fontFamily.trim().length === 0) {
        issues.push({
          id: `font-${layer.id}`,
          type: 'missing_asset',
          severity: 'warning',
          layerId: layer.id,
          layerName: layer.name,
          message: `"${layer.name}" is missing a font family specification.`,
        });
      }
    }

    if (layer.type === 'image') {
      if (!layer.imageUrl || layer.imageUrl.trim().length === 0 || layer.imageUrl.includes('{{')) {
        issues.push({
          id: `img-${layer.id}`,
          type: 'missing_asset',
          severity: 'error',
          layerId: layer.id,
          layerName: layer.name,
          message: `"${layer.name}" is missing a valid image source.`,
        });
      }
    }
  });

  // 2. Check duplicate elements and unintentional overlaps among foreground content layers
  const foregroundLayers = visibleLayers.filter(
    (l) => (l.type === 'text' || l.type === 'image') && l.backgroundFillMode !== 'canvas'
  );

  for (let i = 0; i < foregroundLayers.length; i++) {
    for (let j = i + 1; j < foregroundLayers.length; j++) {
      const a = foregroundLayers[i];
      const b = foregroundLayers[j];

      // Duplicate check
      if (
        a.type === b.type &&
        a.type === 'text' &&
        (a.text || '').trim().toLowerCase() === (b.text || '').trim().toLowerCase() &&
        (a.text || '').trim().length > 0
      ) {
        issues.push({
          id: `dup-${a.id}-${b.id}`,
          type: 'duplicate',
          severity: 'warning',
          layerId: b.id,
          layerName: b.name,
          message: `Duplicate text detected: "${a.name}" and "${b.name}" have identical text.`,
        });
        continue;
      }

      // Bounding box overlap check (shrink boxes slightly by 10% tolerance for line-height breathing room)
      const aw = (a.width || 20) * 0.88;
      const ah = (a.height || 10) * 0.85;
      const bw = (b.width || 20) * 0.88;
      const bh = (b.height || 10) * 0.85;

      const aLeft = a.x - aw / 2;
      const aRight = a.x + aw / 2;
      const aTop = a.y - ah / 2;
      const aBottom = a.y + ah / 2;

      const bLeft = b.x - bw / 2;
      const bRight = b.x + bw / 2;
      const bTop = b.y - bh / 2;
      const bBottom = b.y + bh / 2;

      const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
      const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
      const overlapArea = overlapX * overlapY;
      const minArea = Math.min(aw * ah, bw * bh);

      if (overlapArea > 0 && minArea > 0 && overlapArea / minArea > 0.12) {
        issues.push({
          id: `ovl-${a.id}-${b.id}`,
          type: 'overlap',
          severity: 'warning',
          layerId: b.id,
          layerName: b.name,
          message: `"${a.name}" and "${b.name}" overlap on the canvas.`,
        });
      }
    }
  }

  return issues;
};

const ICONS_MAP: Record<string, React.FC<any>> = {
  Sparkles,
  Star,
  Flame,
  Heart,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Award,
  TrendingUp,
  Send,
  Smile,
  Quote,
  Globe,
  Megaphone,
  Gift,
  Tag,
  Bell,
  Camera,
  Crown,
};

export interface KeypadNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
}

export const KeypadNumberInput: React.FC<KeypadNumberInputProps> = ({
  value,
  onChange,
  min = -360,
  max = 360,
  step = 1,
  style,
  className = 'rotation-input-box',
  title,
  placeholder,
  suffix,
  prefix,
}) => {
  const [localStr, setLocalStr] = useState<string>(String(value ?? 0));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(String(value ?? 0));
    }
  }, [value, isFocused]);

  const commitValue = (valStr: string) => {
    let num = parseFloat(valStr);
    if (isNaN(num)) {
      num = value ?? 0;
    }
    num = Math.max(min, Math.min(max, Math.round(num * 100) / 100));
    setLocalStr(String(num));
    if (num !== value) {
      onChange(num);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
      {prefix && <span style={{ fontSize: '0.7rem', color: '#64748b', marginRight: '3px', fontWeight: 600 }}>{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        value={localStr}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '' || val === '-' || val === '.' || val === '-.' || !isNaN(Number(val))) {
            setLocalStr(val);
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) {
              onChange(Math.max(min, Math.min(max, parsed)));
            }
          }
        }}
        onBlur={() => {
          setIsFocused(false);
          commitValue(localStr);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitValue(localStr);
            e.currentTarget.blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.max(min, Math.min(max, (parseFloat(localStr) || 0) + (e.shiftKey ? step * 5 : step)));
            setLocalStr(String(next));
            onChange(next);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.max(min, Math.min(max, (parseFloat(localStr) || 0) - (e.shiftKey ? step * 5 : step)));
            setLocalStr(String(next));
            onChange(next);
          }
        }}
        className={className}
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          background: '#ffffff',
          color: '#0f172a',
          padding: '2px 4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          textAlign: 'center',
          ...style,
        }}
        title={title}
        placeholder={placeholder}
      />
      {suffix && <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '3px' }}>{suffix}</span>}
    </div>
  );
};

type LeftToolId =
  | 'templates'
  | 'elements'
  | 'text'
  | 'photos'
  | 'uploads'
  | 'backgrounds'
  | 'shapes'
  | 'icons'
  | 'brand'
  | 'ai_image'
  | 'ai'
  | 'layers';

const LEFT_SIDEBAR_TOOLS: { id: LeftToolId; label: string; icon: React.FC<any>; tooltip: string }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, tooltip: 'Browse editable templates by category' },
  { id: 'elements', label: 'Elements', icon: Grid, tooltip: 'Badges, stickers, frames & decorative callouts' },
  { id: 'text', label: 'Text', icon: Type, tooltip: 'Typography presets, headings & font pairings' },
  { id: 'photos', label: 'Photos', icon: ImageIcon, tooltip: 'Search high-resolution stock images' },
  { id: 'uploads', label: 'Uploads', icon: Upload, tooltip: 'Upload computer images & browse Media Library' },
  { id: 'backgrounds', label: 'Background', icon: Palette, tooltip: 'Solid colors, gradients & backdrop textures' },
  { id: 'shapes', label: 'Shapes', icon: Shapes, tooltip: 'Vector rectangles, circles, stars & banners' },
  { id: 'icons', label: 'Icons', icon: Smile, tooltip: 'Scalable vector icons & symbols' },
  { id: 'brand', label: 'Brand Kit', icon: ShieldCheck, tooltip: 'Brand logo, colors, fonts & 1-click styling' },
  { id: 'ai_image', label: 'AI Images', icon: Wand2, tooltip: 'Generate custom AI product & marketing visuals' },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles, tooltip: 'AI design instructions & 3-variation generator' },
  { id: 'layers', label: 'Layers', icon: Layers, tooltip: 'Manage layer order, grouping, lock & visibility' },
];

export const CanvaStudioModal: React.FC<CanvaStudioModalProps> = ({
  isOpen,
  onClose,
  onSaveToLibrary,
  onUseInPost,
  onCreatePost,
  initialImageUrl,
  initialText,
  initialLayers,
  initialBackground,
  initialAspectRatio,
  isEmbedded = false,
}) => {
  const { activeBrand, brands } = useAuth();

  // Project Title State
  const [designTitle, setDesignTitle] = useState<string>('Untitled Marketing Design');

  // Active Left Tool & Drawer State (Open by default on desktop)
  const [activeTab, setActiveTab] = useState<LeftToolId>('templates');
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  );

  useEffect(() => {
    const handleViewportResize = () => {
      if (window.innerWidth <= 768) {
        setIsLeftDrawerOpen(false);
        setIsRightPanelCollapsed(true);
      } else if (window.innerWidth <= 1024) {
        setIsRightPanelCollapsed(true);
      }
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  // Aspect Ratio & Format
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspectRatio || 'instagram_square');
  const activeRatioConfig = useMemo(
    () => ASPECT_RATIOS.find((r) => r.id === aspectRatio) || ASPECT_RATIOS[0],
    [aspectRatio]
  );

  // Brand Kit State (editable & persisted to localStorage + BrandBrain)
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null);
  const [customBrandName, setCustomBrandName] = useState<string>('');
  const [customBrandLogo, setCustomBrandLogo] = useState<string>('');
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>('#4f46e5');
  const [customSecondaryColor, setCustomSecondaryColor] = useState<string>('#ec4899');
  const [customAccentColor, setCustomAccentColor] = useState<string>('#f59e0b');
  const [customHeadingFont, setCustomHeadingFont] = useState<string>("'Outfit', sans-serif");
  const [customBodyFont, setCustomBodyFont] = useState<string>("'Plus Jakarta Sans', sans-serif");

  useEffect(() => {
    try {
      const savedKit = localStorage.getItem('sf_studio_brand_kit_v1');
      if (savedKit) {
        const parsed = JSON.parse(savedKit);
        if (parsed.name) setCustomBrandName(parsed.name);
        if (parsed.logo) setCustomBrandLogo(parsed.logo);
        if (parsed.primary) setCustomPrimaryColor(parsed.primary);
        if (parsed.secondary) setCustomSecondaryColor(parsed.secondary);
        if (parsed.accent) setCustomAccentColor(parsed.accent);
        if (parsed.headingFont) setCustomHeadingFont(parsed.headingFont);
        if (parsed.bodyFont) setCustomBodyFont(parsed.bodyFont);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!activeBrand?.id) return;
    let isMounted = true;
    api.brands
      .getBrain(activeBrand.id)
      .then((brain) => {
        if (isMounted && brain) {
          setBrandBrain(brain);
          if (!customBrandName) setCustomBrandName(activeBrand.name || 'HoaspForge Brand');
          if (brain.visualIdentity?.colors?.primary) setCustomPrimaryColor(brain.visualIdentity.colors.primary);
          if (brain.visualIdentity?.colors?.secondary) setCustomSecondaryColor(brain.visualIdentity.colors.secondary);
          if (brain.visualIdentity?.colors?.accent) setCustomAccentColor(brain.visualIdentity.colors.accent);
          const logo = brain.visualIdentity?.logoUrls?.primary || brain.visualIdentity?.logoUrls?.icon;
          if (logo) setCustomBrandLogo(logo);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeBrand?.id]);

  const saveBrandKitSettings = () => {
    try {
      localStorage.setItem(
        'sf_studio_brand_kit_v1',
        JSON.stringify({
          name: customBrandName || activeBrand?.name || 'HoaspForge',
          logo: customBrandLogo,
          primary: customPrimaryColor,
          secondary: customSecondaryColor,
          accent: customAccentColor,
          headingFont: customHeadingFont,
          bodyFont: customBodyFont,
        })
      );
      showStudioToast('Brand Kit settings saved!', 'success');
    } catch {
      showStudioToast('Could not save Brand Kit settings', 'error');
    }
  };

  // Background State
  const [bgType, setBgType] = useState<'gradient' | 'solid' | 'image' | 'transparent'>(
    initialBackground?.type || (initialImageUrl ? 'image' : 'gradient')
  );
  const [lastOpaqueBgType, setLastOpaqueBgType] = useState<'gradient' | 'solid' | 'image'>(
    initialBackground?.type && initialBackground.type !== 'transparent'
      ? initialBackground.type
      : initialImageUrl
        ? 'image'
        : 'gradient'
  );
  useEffect(() => {
    if (bgType !== 'transparent') {
      setLastOpaqueBgType(bgType);
    }
  }, [bgType]);
  const [bgGradient, setBgGradient] = useState<string>(
    initialBackground?.type === 'gradient' ? initialBackground.value : GRADIENT_PRESETS[0].css
  );
  const [bgColor, setBgColor] = useState<string>(
    initialBackground?.type === 'solid' ? initialBackground.value : '#1e1b4b'
  );
  const [bgImageUrl, setBgImageUrl] = useState<string>(
    initialBackground?.type === 'image' ? initialBackground.value : initialImageUrl || CURATED_STOCK_PHOTOS[0].url
  );
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState<number>(
    initialBackground?.overlayOpacity !== undefined ? initialBackground.overlayOpacity : 0.2
  );

  // Canvas Layers State
  const buildDefaultStudioLayers = (seedHeadline?: string): CanvasLayer[] => [
    {
      id: 'layer-badge',
      type: 'text',
      name: 'Category Badge',
      x: 50,
      y: 20,
      width: 46,
      height: 7,
      rotation: 0,
      opacity: 1,
      visible: true,
      text: 'LIMITED RELEASE ⚡',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
      color: '#0f172a',
      backgroundColor: '#facc15',
      backgroundPadding: 8,
      borderRadius: 9999,
      textTransform: 'uppercase',
      letterSpacing: 2,
      animation: { entrance: 'pop', duration: 0.6, delay: 0 },
    },
    {
      id: 'layer-headline',
      type: 'text',
      name: 'Main Headline',
      x: 50,
      y: 44,
      width: 84,
      height: 22,
      rotation: 0,
      opacity: 1,
      visible: true,
      text: seedHeadline || 'Elevate Your Brand Presence With AI Design',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 46,
      fontWeight: '800',
      textAlign: 'center',
      color: '#ffffff',
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowBlur: 14,
      lineHeight: 1.15,
      animation: { entrance: 'slide_up', duration: 0.8, delay: 0.1 },
    },
    {
      id: 'layer-subtext',
      type: 'text',
      name: 'Subheading',
      x: 50,
      y: 66,
      width: 76,
      height: 12,
      rotation: 0,
      opacity: 0.92,
      visible: true,
      text: 'Create studio-grade social media campaigns, product ads, and branded graphics in seconds.',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 18,
      fontWeight: '500',
      textAlign: 'center',
      color: '#e2e8f0',
      lineHeight: 1.4,
      animation: { entrance: 'fade', duration: 0.8, delay: 0.25 },
    },
    {
      id: 'layer-cta',
      type: 'text',
      name: 'Call To Action Button',
      x: 50,
      y: 84,
      width: 44,
      height: 8,
      rotation: 0,
      opacity: 1,
      visible: true,
      text: 'Explore Collection ➔',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      color: '#ffffff',
      backgroundColor: '#ec4899',
      backgroundPadding: 10,
      borderRadius: 9999,
      letterSpacing: 0.5,
      animation: { entrance: 'zoom_in', duration: 0.7, delay: 0.4 },
    },
  ];

  const [layers, setLayers] = useState<CanvasLayer[]>(() =>
    Array.isArray(initialLayers) && initialLayers.length > 0
      ? normalizeTemplateLayers(initialLayers, initialText)
      : buildDefaultStudioLayers(initialText)
  );

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() => {
    if (Array.isArray(initialLayers) && initialLayers.length > 0) {
      const norm = normalizeTemplateLayers(initialLayers, initialText);
      return norm[0]?.id || null;
    }
    return 'layer-headline';
  });
  const selectedLayer = useMemo(() => layers.find((l) => l.id === selectedLayerId) || null, [layers, selectedLayerId]);
  const designValidationIssues = useMemo(() => validateCanvasDesign(layers), [layers]);
  const [isValidationPopoverOpen, setIsValidationPopoverOpen] = useState<boolean>(false);

  // Sync incoming initialLayers / initialBackground when reopening a saved design or template
  useEffect(() => {
    if (!isOpen) return;
    if (initialText) setDesignTitle(initialText);
    if (initialAspectRatio) setAspectRatio(initialAspectRatio);
    if (initialBackground) {
      setBgType(initialBackground.type);
      if (initialBackground.type === 'gradient') setBgGradient(initialBackground.value);
      else if (initialBackground.type === 'solid') setBgColor(initialBackground.value);
      else if (initialBackground.type === 'image') setBgImageUrl(initialBackground.value);
      if (initialBackground.overlayOpacity !== undefined) setBgOverlayOpacity(initialBackground.overlayOpacity);
    } else if (initialImageUrl) {
      setBgType('image');
      setBgImageUrl(initialImageUrl);
    }
    if (Array.isArray(initialLayers) && initialLayers.length > 0) {
      const normalized = normalizeTemplateLayers(initialLayers, initialText);
      setLayers(normalized);
      setSelectedLayerId(normalized[0]?.id || null);
      setHistory([JSON.parse(JSON.stringify(normalized))]);
      setHistoryIndex(0);
    }
  }, [isOpen, initialLayers, initialBackground, initialAspectRatio, initialText, initialImageUrl]);

  // Undo / Redo History
  const [history, setHistory] = useState<CanvasLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pushHistory = (newLayers: CanvasLayer[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      sliced.push(JSON.parse(JSON.stringify(newLayers)));
      if (sliced.length > 30) sliced.shift();
      setHistoryIndex(sliced.length - 1);
      return sliced;
    });
  };

  useEffect(() => {
    if (history.length === 0 && layers.length > 0) {
      setHistory([JSON.parse(JSON.stringify(layers))]);
      setHistoryIndex(0);
    }
  }, []);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setLayers(JSON.parse(JSON.stringify(prev)));
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setLayers(JSON.parse(JSON.stringify(next)));
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Toast Notification
  const [studioToast, setStudioToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showStudioToast = (message: string, type: 'success' | 'error' = 'success') => {
    setStudioToast({ message, type });
    setTimeout(() => setStudioToast(null), 3500);
  };

  // Viewport Zoom, Pan & Snapping Guides
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 900, height: 700 });
  const [zoomLevel, setZoomLevel] = useState<'fit' | number>('fit');
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const [snapGuides, setSnapGuides] = useState<{ verticalCenter: boolean; horizontalCenter: boolean }>({
    verticalCenter: false,
    horizontalCenter: false,
  });

  useEffect(() => {
    if (!viewportRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setViewportSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, []);

  const baseDim = CANVAS_BASE_DIMENSIONS[aspectRatio] || CANVAS_BASE_DIMENSIONS['1:1'];
  const availW = Math.max(200, viewportSize.width - 64);
  const availH = Math.max(200, viewportSize.height - 80);
  const autoFitScale = Math.min(availW / baseDim.width, availH / baseDim.height);
  const effectiveScale = zoomLevel === 'fit' ? Math.max(0.28, Math.min(1.6, autoFitScale)) : zoomLevel;
  const displayZoomPct = Math.round(effectiveScale * 100);

  // Popovers & Modals State
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isResizeMenuOpen, setIsResizeMenuOpen] = useState<boolean>(false);
  const [isAnimationPanelOpen, setIsAnimationPanelOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
  const [animationPlayKey, setAnimationPlayKey] = useState<number>(0);
  const [isSavedProjectsModalOpen, setIsSavedProjectsModalOpen] = useState<boolean>(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState<boolean>(false);
  const [isReelStudioOpen, setIsReelStudioOpen] = useState<boolean>(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState<boolean>(false);
  const [previewTemplateItem, setPreviewTemplateItem] = useState<DesignTemplate | null>(null);
  const [compareVariationItem, setCompareVariationItem] = useState<any | null>(null);

  // Export Settings
  const [exportFormat, setExportFormat] = useState<'png' | 'transparent_png' | 'jpg' | 'pdf' | 'animated'>('png');
  const [exportScale, setExportScale] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Saved Editable Projects State (localStorage)
  const [savedProjects, setSavedProjects] = useState<SavedDesignProject[]>(() => {
    try {
      const raw = localStorage.getItem('sf_saved_design_projects_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Template Library State (Categories, Search, Favorites, Recently Used)
  const [templatesList, setTemplatesList] = useState<DesignTemplate[]>(() =>
    CANONICAL_TEMPLATES.map((t) => ({
      ...t,
      layers: normalizeTemplateLayers(t.layers, t.name),
    }))
  );
  const [studioCategoryFilter, setStudioCategoryFilter] = useState<string>('all');
  const [templateSubTab, setTemplateSubTab] = useState<'all' | 'recent' | 'favorites' | 'brand'>('all');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('sf_studio_fav_templates_v1');
      return raw ? JSON.parse(raw) : ['tpl-promo-vip', 'tpl-product-showcase'];
    } catch {
      return [];
    }
  });
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('sf_studio_recent_templates_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<TemplateCategory>('promotion');
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);

  useEffect(() => {
    if (!activeBrand?.id) return;
    api.templates
      .list(activeBrand.id)
      .then((data) => {
        if (!Array.isArray(data)) return;
        const sanitizedApiTemplates = data.map((t) => ({
          ...t,
          layers: normalizeTemplateLayers(Array.isArray(t.layers) ? t.layers : [], t.name),
        }));
        const merged = CANONICAL_TEMPLATES.map((t) => ({
          ...t,
          layers: normalizeTemplateLayers(t.layers, t.name),
        }));
        sanitizedApiTemplates.forEach((t) => {
          if (!merged.some((c) => c.id === t.id)) merged.push(t);
        });
        setTemplatesList(merged);
      })
      .catch(() => {});
  }, [activeBrand?.id]);

  const toggleFavoriteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteTemplateIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('sf_studio_fav_templates_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredTemplates = useMemo(() => {
    return templatesList.filter((tpl) => {
      if (templateSubTab === 'favorites' && !favoriteTemplateIds.includes(tpl.id)) return false;
      if (templateSubTab === 'recent' && !recentTemplateIds.includes(tpl.id)) return false;
      if (templateSubTab === 'brand' && !tpl.isCustom) return false;

      if (studioCategoryFilter !== 'all') {
        const catMeta = STUDIO_TEMPLATE_CATEGORIES.find((c) => c.id === studioCategoryFilter);
        if (catMeta) {
          const matchesCat = catMeta.matchCategories.includes(tpl.category);
          const matchesTag = (tpl.tags || []).some((t) =>
            catMeta.matchTags.some((mt) => t.toLowerCase().includes(mt.toLowerCase()))
          );
          const matchesAspect = catMeta.defaultAspect && tpl.aspectRatio === catMeta.defaultAspect;
          if (!matchesCat && !matchesTag && !matchesAspect) return false;
        }
      }

      if (templateSearchQuery.trim()) {
        const q = templateSearchQuery.toLowerCase();
        const inName = tpl.name.toLowerCase().includes(q);
        const inDesc = (tpl.description || '').toLowerCase().includes(q);
        const inTags = (tpl.tags || []).some((t) => t.toLowerCase().includes(q));
        return inName || inDesc || inTags;
      }
      return true;
    });
  }, [templatesList, studioCategoryFilter, templateSubTab, favoriteTemplateIds, recentTemplateIds, templateSearchQuery]);

  // Uploads & Media Library State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedAssets, setUploadedAssets] = useState<
    { id: string; name: string; url: string; source: 'upload' | 'library' | 'ai'; createdAt: string }[]
  >([]);
  const [uploadSearchQuery, setUploadSearchQuery] = useState<string>('');
  const [uploadSourceFilter, setUploadSourceFilter] = useState<'all' | 'upload' | 'library' | 'ai'>('all');
  const [replaceTargetLayerId, setReplaceTargetLayerId] = useState<string | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('All');
  const [iconSearchQuery, setIconSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!activeBrand?.id) return;
    api.media
      .list(activeBrand.id)
      .then((res: any) => {
        const items = Array.isArray(res) ? res : res?.items || res?.data || [];
        const mapped = items
          .filter((m: any) => m.publicUrl && (!m.mediaType || m.mediaType === 'image'))
          .slice(0, 24)
          .map((m: any) => ({
            id: m.id || `lib-${ Math.random() }`,
            name: m.fileName || m.metadata?.title || 'Library Asset',
            url: m.publicUrl,
            source: 'library' as const,
            createdAt: m.createdAt || new Date().toISOString(),
          }));
        setUploadedAssets((prev) => {
          const existingUrls = new Set(prev.map((p) => p.url));
          return [...prev, ...mapped.filter((m: any) => !existingUrls.has(m.url))];
        });
      })
      .catch(() => {});
  }, [activeBrand?.id]);

  // AI Image Generator State
  const [aiImagePrompt, setAiImagePrompt] = useState<string>('Luxury minimalist perfume bottle on marble podium with warm golden rim lighting');
  const [aiImageStyle, setAiImageStyle] = useState<string>('Product Studio');
  const [aiImageInsertMode, setAiImageInsertMode] = useState<'replace' | 'add'>('replace');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState<boolean>(false);
  const [generatedAiImages, setGeneratedAiImages] = useState<{ id: string; prompt: string; style: string; url: string }[]>([]);
  const [isRotatingLayer, setIsRotatingLayer] = useState<boolean>(false);

  // AI Design Assistant State
  const [aiInstructionText, setAiInstructionText] = useState<string>('');
  const [aiAssistantMode, setAiAssistantMode] = useState<'full' | 'copy_only' | 'image_only'>('full');
  const [isAiAssistantWorking, setIsAiAssistantWorking] = useState<boolean>(false);
  const [aiGeneratedVariations, setAiGeneratedVariations] = useState<
    {
      id: string;
      name: string;
      tag: string;
      badgeColor: string;
      desc: string;
      bgType: 'gradient' | 'solid' | 'image' | 'transparent';
      bgValue: string;
      previewImageUrl?: string;
      layers: CanvasLayer[];
    }[]
  >([]);

  // Layer Update Helpers
  const updateSelectedLayer = (
    changes: Partial<CanvasLayer>,
    historyMode: 'instant' | 'debounce' | 'none' = 'instant'
  ) => {
    if (!selectedLayerId) return;
    setLayers((prev) => {
      const next = prev.map((l) => (l.id === selectedLayerId ? { ...l, ...changes } : l));
      if (historyMode === 'instant') {
        pushHistory(next);
      }
      return next;
    });
  };

  const updateLayerById = (layerId: string, changes: Partial<CanvasLayer>) => {
    setLayers((prev) => {
      const next = prev.map((l) => (l.id === layerId ? { ...l, ...changes } : l));
      pushHistory(next);
      return next;
    });
  };

  const addTextLayer = (
    preset: 'headline' | 'subtitle' | 'body' | 'badge' | 'quote' | 'metric',
    dropX = 50,
    dropY = 50
  ) => {
    const id = `layer-text-${Date.now()}`;
    const configs: Record<typeof preset, Partial<CanvasLayer>> = {
      headline: {
        name: 'Heading Text',
        text: 'Add a Bold Headline',
        fontFamily: customHeadingFont,
        fontSize: 44,
        fontWeight: '800',
        width: 80,
        height: 18,
        color: '#ffffff',
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowBlur: 12,
      },
      subtitle: {
        name: 'Subheading Text',
        text: 'Add a clear supporting subheading here',
        fontFamily: customBodyFont,
        fontSize: 24,
        fontWeight: '600',
        width: 74,
        height: 12,
        color: '#e2e8f0',
      },
      body: {
        name: 'Body Paragraph',
        text: 'Add body text with details about your product, offer, or event.',
        fontFamily: customBodyFont,
        fontSize: 16,
        fontWeight: '500',
        width: 70,
        height: 10,
        color: '#cbd5e1',
      },
      badge: {
        name: 'Promo Pill Badge',
        text: 'SPECIAL OFFER ⚡',
        fontFamily: customHeadingFont,
        fontSize: 14,
        fontWeight: '800',
        width: 42,
        height: 7,
        color: '#0f172a',
        backgroundColor: '#facc15',
        backgroundPadding: 8,
        borderRadius: 9999,
        letterSpacing: 2,
      },
      quote: {
        name: 'Editorial Quote',
        text: '“Design is the silent ambassador of your brand.”',
        fontFamily: "'Playfair Display', serif",
        fontSize: 32,
        fontWeight: '700',
        fontStyle: 'italic',
        width: 80,
        height: 18,
        color: '#ffffff',
      },
      metric: {
        name: 'Metric Callout',
        text: '10X GROWTH',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 56,
        fontWeight: '900',
        width: 65,
        height: 18,
        color: '#38bdf8',
      },
    };

    const newLayer: CanvasLayer = {
      id,
      type: 'text',
      name: 'Text Layer',
      x: dropX,
      y: dropY,
      width: 70,
      height: 14,
      rotation: 0,
      opacity: 1,
      visible: true,
      textAlign: 'center',
      lineHeight: 1.2,
      animation: { entrance: 'fade', duration: 0.7, delay: 0 },
      ...configs[preset],
    };

    const next = [...layers, newLayer];
    setLayers(next);
    setSelectedLayerId(id);
    pushHistory(next);
  };

  const addShapeLayer = (shapeType: NonNullable<CanvasLayer['shapeType']>, dropX = 50, dropY = 50) => {
    const id = `layer-shape-${Date.now()}`;
    const newLayer: CanvasLayer = {
      id,
      type: 'shape',
      name: `${shapeType.replace('_', ' ')}`,
      shapeType,
      x: dropX,
      y: dropY,
      width: shapeType === 'line' ? 60 : shapeType === 'pill' ? 44 : 36,
      height: shapeType === 'line' ? 2 : shapeType === 'pill' ? 10 : 32,
      rotation: 0,
      opacity: 1,
      visible: true,
      fillColor: shapeType === 'line' ? '#8b5cf6' : 'rgba(99, 102, 241, 0.28)',
      strokeColor: '#818cf8',
      strokeWidth: 2,
      strokeDash: 'solid',
      borderRadius: shapeType === 'rounded_rect' ? 16 : 0,
      animation: { entrance: 'zoom_in', duration: 0.6, delay: 0 },
    };
    const next = [...layers, newLayer];
    setLayers(next);
    setSelectedLayerId(id);
    pushHistory(next);
  };

  const addIconLayer = (iconName: string, dropX = 50, dropY = 50) => {
    const id = `layer-icon-${Date.now()}`;
    const newLayer: CanvasLayer = {
      id,
      type: 'icon',
      name: `${iconName} Icon`,
      iconName,
      iconColor: '#facc15',
      x: dropX,
      y: dropY,
      width: 14,
      height: 14,
      rotation: 0,
      opacity: 1,
      visible: true,
      animation: { entrance: 'pop', duration: 0.6, delay: 0 },
    };
    const next = [...layers, newLayer];
    setLayers(next);
    setSelectedLayerId(id);
    pushHistory(next);
  };

  const addImageOverlayLayer = (
    imageUrl: string,
    dropX = 50,
    dropY = 50,
    customName = 'Image Layer',
    forceMode?: 'replace' | 'add'
  ) => {
    const mode = forceMode || (replaceTargetLayerId || selectedLayer?.type === 'image' ? 'replace' : 'add');
    const existingImageLayer = layers.find((l) => l.type === 'image' && !l.locked);
    const targetId =
      replaceTargetLayerId ||
      (selectedLayer?.type === 'image' ? selectedLayer.id : mode === 'replace' && existingImageLayer ? existingImageLayer.id : null);

    if (mode === 'replace' && bgType === 'image') {
      // Clear old static background image so it doesn't stay stuck behind the new image
      setBgType('gradient');
    }

    if (targetId && mode !== 'add') {
      updateLayerById(targetId, { imageUrl, name: customName });
      setSelectedLayerId(targetId);
      setReplaceTargetLayerId(null);
      showStudioToast('Replaced existing image on canvas!', 'success');
      return;
    }

    const id = `layer-img-${Date.now()}`;
    const newLayer: CanvasLayer = {
      id,
      type: 'image',
      name: customName,
      imageUrl,
      x: dropX,
      y: dropY,
      width: 56,
      height: 44,
      rotation: 0,
      opacity: 1,
      visible: true,
      borderRadius: 12,
      flipX: false,
      flipY: false,
      cropAspect: 'free',
      animation: { entrance: 'fade', duration: 0.7, delay: 0 },
    };
    const next = [...layers, newLayer];
    setLayers(next);
    setSelectedLayerId(id);
    pushHistory(next);
  };

  const deleteLayerById = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    if (target.locked) {
      showStudioToast('Layer is locked. Unlock it first to delete.', 'error');
      return;
    }
    const next = layers.filter((l) => l.id !== id);
    setLayers(next);
    if (selectedLayerId === id) {
      setSelectedLayerId(next[next.length - 1]?.id || null);
    }
    pushHistory(next);
    showStudioToast(`Deleted "${target.name}"`, 'success');
  };

  const removeBackgroundImage = () => {
    setBgType('transparent');
    setBgOverlayOpacity(0);
    setExportFormat('transparent_png');
    showStudioToast('Deleted Canvas Background — Canvas is now Transparent!', 'success');
  };

  const toggleCanvasBackgroundVisibility = () => {
    if (bgType === 'transparent') {
      const restored = lastOpaqueBgType || 'gradient';
      setBgType(restored);
      showStudioToast(`Restored Canvas Background (${restored})`, 'success');
    } else {
      setLastOpaqueBgType(bgType);
      setBgType('transparent');
      setExportFormat('transparent_png');
      showStudioToast('Hidden Canvas Background — Canvas is now Transparent!', 'success');
    }
  };

  const deleteMainCanvasBackground = () => {
    if (bgType !== 'transparent') {
      setLastOpaqueBgType(bgType);
    }
    setBgType('transparent');
    setBgOverlayOpacity(0);
    setExportFormat('transparent_png');
    showStudioToast('Deleted Canvas Background — Canvas is now Transparent!', 'success');
  };

  const convertBgImageToSelectableLayer = () => {
    if (bgType !== 'image' || !bgImageUrl) return;
    const id = `layer-bg-img-${Date.now()}`;
    const bgLayer: CanvasLayer = {
      id,
      type: 'image',
      name: 'Canvas Image Layer',
      imageUrl: bgImageUrl,
      x: 50,
      y: 50,
      width: 82,
      height: 64,
      rotation: 0,
      opacity: 1,
      visible: true,
      borderRadius: 12,
      cropAspect: 'free',
      animation: { entrance: 'fade', duration: 0.7, delay: 0 },
    };
    setBgType('gradient');
    const next = [bgLayer, ...layers];
    setLayers(next);
    setSelectedLayerId(id);
    pushHistory(next);
    showStudioToast('Converted background image into a selectable, movable & deletable layer!', 'success');
  };

  // 1-Click AI Image Background Remover (makes solid/light/corner background pixels 100% transparent)
  const removeSelectedImageBackground = async () => {
    if (!selectedLayer || selectedLayer.type !== 'image' || !selectedLayer.imageUrl) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = selectedLayer.imageUrl!;
      });

      const w = Math.min(1200, img.naturalWidth || 800);
      const h = Math.min(1200, img.naturalHeight || 800);
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample 4 corner pixels to determine the dominant backdrop color
      const sampleIndices = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
      let sr = 0;
      let sg = 0;
      let sb = 0;
      for (const idx of sampleIndices) {
        sr += data[idx];
        sg += data[idx + 1];
        sb += data[idx + 2];
      }
      sr /= sampleIndices.length;
      sg /= sampleIndices.length;
      sb /= sampleIndices.length;

      const tolerance = 54;
      const feather = 24;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Distance from sampled corner backdrop color OR near-pure white backdrop
        const distCorner = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);
        const distWhite = Math.sqrt((r - 252) ** 2 + (g - 252) ** 2 + (b - 252) ** 2);
        const minDist = Math.min(distCorner, distWhite);

        if (minDist < tolerance) {
          data[i + 3] = 0;
        } else if (minDist < tolerance + feather) {
          const factor = (minDist - tolerance) / feather;
          data[i + 3] = Math.round(data[i + 3] * factor);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const transparentDataUrl = offCanvas.toDataURL('image/png');
      updateSelectedLayer({
        imageUrl: transparentDataUrl,
        borderRadius: 0,
        strokeWidth: 0,
        shadowBlur: 0,
        shadowColor: undefined,
      });
      showStudioToast('Removed image background! Image is now transparent.', 'success');
    } catch {
      showStudioToast('Could not remove background from external image', 'error');
    }
  };

  // 1-Click Editable Transparent Logo Builder on Canvas
  const createEditableTransparentLogoOnCanvas = (customPrompt?: string) => {
    const rawName = (customPrompt || customBrandName || activeBrand?.name || 'HoaspForge').trim();
    const cleanTitle = rawName
      .replace(/^(create|make|generate|design)\s+(a|an|my)?\s*(transparent|modern|luxury|minimal|vector|brand)?\s*(logo|emblem|monogram|badge)\s*(for|of)?\s*/i, '')
      .trim() || (customBrandName || activeBrand?.name || 'HoaspForge');
    const words = cleanTitle.split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : cleanTitle.slice(0, 2).toUpperCase();

    const ts = Date.now();
    const pColor = customPrimaryColor || '#4f46e5';
    const sColor = customSecondaryColor || '#ec4899';

    // Generate a 100% transparent-background vector crest SVG for the logo mark
    const crestSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${pColor}"/>
          <stop offset="100%" stop-color="${sColor}"/>
        </linearGradient>
      </defs>
      <polygon points="250,30 440,140 440,360 250,470 60,360 60,140" fill="url(#logoGrad)" stroke="#ffffff" stroke-width="8"/>
      <polygon points="250,62 412,156 412,344 250,438 88,344 88,156" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="3" stroke-dasharray="10,6"/>
      <text x="250" y="295" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="145" font-weight="900" letter-spacing="4">${initials}</text>
    </svg>`;
    const crestDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(crestSvg)}`;

    const logoLayers: CanvasLayer[] = [
      {
        id: `layer-logo-mark-${ts}`,
        type: 'image',
        name: `${cleanTitle} Logo Mark`,
        imageUrl: crestDataUrl,
        x: 50,
        y: 38,
        width: 42,
        height: 42,
        rotation: 0,
        opacity: 1,
        visible: true,
        borderRadius: 0,
        cropAspect: 'free',
        animation: { entrance: 'zoom_in', duration: 0.6, delay: 0 },
      },
      {
        id: `layer-logo-wordmark-${ts}`,
        type: 'text',
        name: 'Brand Wordmark',
        x: 50,
        y: 70,
        width: 84,
        height: 14,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: cleanTitle.toUpperCase(),
        fontFamily: customHeadingFont || "'Outfit', sans-serif",
        fontSize: 40,
        fontWeight: '800',
        textAlign: 'center',
        color: '#0f172a',
        letterSpacing: 3,
        lineHeight: 1.1,
        animation: { entrance: 'slide_up', duration: 0.6, delay: 0.1 },
      },
      {
        id: `layer-logo-tagline-${ts}`,
        type: 'text',
        name: 'Logo Tagline',
        x: 50,
        y: 82,
        width: 68,
        height: 8,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'OFFICIAL BRAND IDENTITY',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        color: pColor,
        letterSpacing: 4,
        lineHeight: 1.2,
        animation: { entrance: 'fade', duration: 0.6, delay: 0.2 },
      },
    ];

    setAspectRatio('1:1');
    setBgType('transparent');
    setBgOverlayOpacity(0);
    setDesignTitle(`${cleanTitle} — Transparent Logo`);
    setExportFormat('transparent_png');
    setLayers(logoLayers);
    setSelectedLayerId(logoLayers[0].id);
    pushHistory(logoLayers);
    showStudioToast(`Created editable transparent logo for "${cleanTitle}"! Ready to customize or export as Transparent PNG.`, 'success');
  };

  const handleComputerFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isReplacing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showStudioToast('Unsupported format. Please upload PNG, JPG, WEBP, or SVG.', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showStudioToast('File exceeds 15MB maximum upload limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const assetItem = {
        id: `up-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: dataUrl,
        source: 'upload' as const,
        createdAt: new Date().toISOString(),
      };
      setUploadedAssets((prev) => [assetItem, ...prev]);

      if (isReplacing && selectedLayer?.type === 'image') {
        updateSelectedLayer({ imageUrl: dataUrl, name: assetItem.name });
        showStudioToast(`Replaced image with "${assetItem.name}"!`, 'success');
      } else {
        addImageOverlayLayer(dataUrl, 50, 50, assetItem.name);
        showStudioToast(`Uploaded "${assetItem.name}" to canvas!`, 'success');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Layer Management: Duplicate, Delete, Order, Lock, Group
  const duplicateSelectedLayer = () => {
    if (!selectedLayer) return;
    const copy: CanvasLayer = {
      ...JSON.parse(JSON.stringify(selectedLayer)),
      id: `layer-${Date.now()}`,
      name: `${selectedLayer.name} (Copy)`,
      x: Math.min(92, selectedLayer.x + 4),
      y: Math.min(92, selectedLayer.y + 4),
      locked: false,
    };
    const next = [...layers, copy];
    setLayers(next);
    setSelectedLayerId(copy.id);
    pushHistory(next);
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    const target = layers.find((l) => l.id === selectedLayerId);
    if (target?.locked) {
      showStudioToast('Layer is locked. Unlock it first to delete.', 'error');
      return;
    }
    const next = layers.filter((l) => l.id !== selectedLayerId);
    setLayers(next);
    setSelectedLayerId(next[next.length - 1]?.id || null);
    pushHistory(next);
  };

  const moveLayerOrder = (direction: 'up' | 'down' | 'front' | 'back') => {
    if (!selectedLayerId) return;
    const idx = layers.findIndex((l) => l.id === selectedLayerId);
    if (idx === -1) return;
    const next = [...layers];
    const [item] = next.splice(idx, 1);
    if (direction === 'up') next.splice(Math.min(next.length, idx + 1), 0, item);
    else if (direction === 'down') next.splice(Math.max(0, idx - 1), 0, item);
    else if (direction === 'front') next.push(item);
    else if (direction === 'back') next.unshift(item);
    setLayers(next);
    pushHistory(next);
  };

  const toggleGroupAllVisibleLayers = () => {
    const hasGrouped = layers.some((l) => l.groupId);
    if (hasGrouped) {
      const ungrouped = layers.map((l) => ({ ...l, groupId: undefined }));
      setLayers(ungrouped);
      pushHistory(ungrouped);
      showStudioToast('Ungrouped all elements', 'success');
    } else {
      const gid = `group-${Date.now()}`;
      const grouped = layers.map((l) => (l.visible && !l.locked ? { ...l, groupId: gid } : l));
      setLayers(grouped);
      pushHistory(grouped);
      showStudioToast('Grouped visible unlocked elements together', 'success');
    }
  };

  const alignSelectedLayer = (mode: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (!selectedLayer || selectedLayer.locked) return;
    const halfW = (selectedLayer.width || 20) / 2;
    const halfH = (selectedLayer.height || 12) / 2;
    if (mode === 'left') updateSelectedLayer({ x: Math.max(8, Math.round(halfW + 4)) });
    if (mode === 'center-h') updateSelectedLayer({ x: 50 });
    if (mode === 'right') updateSelectedLayer({ x: Math.min(92, Math.round(96 - halfW)) });
    if (mode === 'top') updateSelectedLayer({ y: Math.max(8, Math.round(halfH + 4)) });
    if (mode === 'center-v') updateSelectedLayer({ y: 50 });
    if (mode === 'bottom') updateSelectedLayer({ y: Math.min(92, Math.round(96 - halfH)) });
  };

  // Interactive 8-Handle Resizing (Synchronized with Center-Anchored Coordinate Space)
  const handleResizeStart = (
    e: React.MouseEvent,
    layer: CanvasLayer,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (layer.locked) return;

    const rect = canvasBoxRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initX = layer.x;
    const initY = layer.y;
    const initW = layer.width || 30;
    const initH = layer.height || 20;
    const initFontSize = layer.fontSize || 24;

    const onMove = (me: MouseEvent) => {
      const dxPct = ((me.clientX - startX) / rect.width) * 100;
      const dyPct = ((me.clientY - startY) / rect.height) * 100;

      let newW = initW;
      let newH = initH;
      let newX = initX;
      let newY = initY;

      if (handle.includes('e')) {
        newW = Math.max(6, Math.min(98, Math.round(initW + dxPct)));
        newX = Math.max(4, Math.min(96, Math.round(initX + (newW - initW) / 2)));
      }
      if (handle.includes('w')) {
        newW = Math.max(6, Math.min(98, Math.round(initW - dxPct)));
        newX = Math.max(4, Math.min(96, Math.round(initX - (newW - initW) / 2)));
      }
      if (handle.includes('s')) {
        newH = Math.max(4, Math.min(98, Math.round(initH + dyPct)));
        newY = Math.max(4, Math.min(96, Math.round(initY + (newH - initH) / 2)));
      }
      if (handle.includes('n')) {
        newH = Math.max(4, Math.min(98, Math.round(initH - dyPct)));
        newY = Math.max(4, Math.min(96, Math.round(initY - (newH - initH) / 2)));
      }

      const updates: Partial<CanvasLayer> = { x: newX, y: newY, width: newW, height: newH };
      if (layer.type === 'text' && (handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se')) {
        const ratio = newW / Math.max(10, initW);
        updates.fontSize = Math.max(12, Math.min(120, Math.round(initFontSize * ratio)));
      }
      updateSelectedLayer(updates, 'none');
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setLayers((prev) => {
        pushHistory(prev);
        return prev;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Interactive On-Canvas Manual Drag-to-Rotate Handle
  const handleRotateStart = (e: React.MouseEvent, layer: CanvasLayer) => {
    e.stopPropagation();
    e.preventDefault();
    if (layer.locked) return;

    const rect = canvasBoxRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate center of the layer in screen coordinates
    const centerX = rect.left + (layer.x / 100) * rect.width;
    const centerY = rect.top + (layer.y / 100) * rect.height;

    const startAngleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const startAngleDeg = (startAngleRad * 180) / Math.PI;
    const initRotation = layer.rotation || 0;
    setIsRotatingLayer(true);

    const onMove = (me: MouseEvent) => {
      const currentAngleRad = Math.atan2(me.clientY - centerY, me.clientX - centerX);
      const currentAngleDeg = (currentAngleRad * 180) / Math.PI;
      let delta = currentAngleDeg - startAngleDeg;
      let nextRot = Math.round(initRotation + delta);

      // Normalize to [-180, 180]
      while (nextRot > 180) nextRot -= 360;
      while (nextRot < -180) nextRot += 360;

      // Soft snap to cardinal/45-degree angles within ±2° unless Shift is NOT held (or always snap within 2°)
      const snapAngles = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
      for (const sa of snapAngles) {
        if (Math.abs(nextRot - sa) <= 2) {
          nextRot = sa;
          break;
        }
      }

      updateSelectedLayer({ rotation: nextRot }, 'none');
    };

    const onUp = () => {
      setIsRotatingLayer(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setLayers((prev) => {
        pushHistory(prev);
        return prev;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Apply Brand Kit to Design
  const applyBrandKitToCanvas = () => {
    const bName = customBrandName || activeBrand?.name || 'HoaspForge';
    setBgType('gradient');
    setBgGradient(`linear-gradient(135deg, #0f172a 0%, ${customPrimaryColor} 55%, ${customSecondaryColor} 100%)`);

    setLayers((prev) => {
      const updated: CanvasLayer[] = prev.map((l) => {
        if (l.type === 'text') {
          const isHead = l.id.includes('head') || (l.fontSize && l.fontSize >= 30);
          const isBadge = l.id.includes('badge') || l.id.includes('cta') || !!l.backgroundColor;
          return {
            ...l,
            fontFamily: isHead ? customHeadingFont : customBodyFont,
            color: isBadge ? '#ffffff' : '#ffffff',
            backgroundColor: isBadge ? customSecondaryColor : l.backgroundColor,
          };
        }
        if (l.type === 'shape') {
          return {
            ...l,
            fillColor: `${customPrimaryColor}44`,
            strokeColor: customAccentColor,
          };
        }
        return l;
      });

      if (customBrandLogo && !updated.some((l) => l.name.toLowerCase().includes('logo'))) {
        updated.push({
          id: `layer-brand-logo-${Date.now()}`,
          type: 'image',
          name: `${bName} Logo`,
          imageUrl: customBrandLogo,
          x: 16,
          y: 12,
          width: 18,
          height: 10,
          rotation: 0,
          opacity: 1,
          visible: true,
        });
      }

      pushHistory(updated);
      return updated;
    });

    showStudioToast(`Applied ${bName} Brand Kit to design!`, 'success');
  };

  // Use Template Handler (Preserves Original Positions, Layout, Spacing, Alignment & Visual Hierarchy)
  const handleUseTemplate = (template: DesignTemplate) => {
    setDesignTitle(template.name);
    if (template.background) {
      setBgType(template.background.type);
      if (template.background.type === 'gradient') setBgGradient(template.background.value);
      else if (template.background.type === 'solid') setBgColor(template.background.value);
      else if (template.background.type === 'image') setBgImageUrl(template.background.value);
      if (template.background.overlayOpacity !== undefined) setBgOverlayOpacity(template.background.overlayOpacity);
    }
    if (template.aspectRatio) {
      setAspectRatio(template.aspectRatio);
    }
    if (Array.isArray(template.layers) && template.layers.length > 0) {
      const normalized = normalizeTemplateLayers(template.layers, template.name);
      setLayers(normalized);
      setSelectedLayerId(normalized[0]?.id || null);
      pushHistory(normalized);
    }

    setRecentTemplateIds((prev) => {
      const next = [template.id, ...prev.filter((id) => id !== template.id)].slice(0, 12);
      try {
        localStorage.setItem('sf_studio_recent_templates_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
    setPreviewTemplateItem(null);
    showStudioToast(`Applied editable template "${template.name}"`, 'success');
  };

  // Helper: Synthesize Rich Topic-Matched Marketing Copy + AI Visual Image + Photo
  const synthesizeAiContentAndVisual = (rawInput: string, styleHint = 'Product Studio') => {
    const bName = customBrandName || activeBrand?.name || 'HoaspForge';
    const lower = rawInput.toLowerCase();

    // Extract any discount / percentage / offer mentioned by user
    const discountMatch = rawInput.match(/\b(\d{1,2}%\s*off|buy\s*1\s*get\s*1|bogo|free\s*shipping|free\s*trial|\$\d+\s*off)\b/i);
    const offerToken = discountMatch ? discountMatch[1].toUpperCase() : '';

    // Clean meta-instruction words to isolate the user's true subject/topic
    let subject = rawInput
      .replace(
        /^(please\s+)?(create|generate|make|design|build|write|give\s+me|craft|produce)\s+(a\s+|an\s+|three\s+|some\s+)?(new\s+|premium\s+|professional\s+|modern\s+|luxury\s+|promotional\s+)?(content\s+and\s+image|image\s+and\s+content|content|poster|advertisement|ad|banner|post|graphic|design|template|flyer|visual)\s*(for|about|on|of|with)?\s*/i,
        ''
      )
      .replace(/\b(with\s+(an?\s+)?(image|photo|picture|visual|graphic|background)|and\s+image|and\s+content)\b/gi, '')
      .trim();

    if (!subject || subject.length < 3 || /^(this\s+design|it|my\s+design)$/i.test(subject)) {
      subject =
        designTitle && !designTitle.toLowerCase().includes('untitled')
          ? designTitle
          : `${bName} Flagship Collection`;
    }

    const titleCaseSubject = subject
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 48);

    // Detect industry / domain & pick matching high-resolution photography + copywriting
    let domain:
      | 'coffee_food'
      | 'beauty_skincare'
      | 'fashion_luxury'
      | 'tech_ai'
      | 'real_estate'
      | 'fitness_wellness'
      | 'festival_holiday'
      | 'event_webinar'
      | 'education'
      | 'business_promo' = 'business_promo';

    if (/coffee|cafe|espresso|latte|bakery|food|restaurant|pizza|burger|dining|chef|menu|drink|tea/i.test(lower)) {
      domain = 'coffee_food';
    } else if (/skin|beauty|cosmetic|serum|glow|makeup|salon|spa|perfume|fragrance|hair|lotion/i.test(lower)) {
      domain = 'beauty_skincare';
    } else if (/watch|jewelry|fashion|clothing|apparel|shoe|sneaker|bag|luxury|boutique|style|wear/i.test(lower)) {
      domain = 'fashion_luxury';
    } else if (/real\s*estate|property|home|apartment|villa|house|interior|architect|living|mortgage/i.test(lower)) {
      domain = 'real_estate';
    } else if (/gym|fitness|workout|yoga|health|wellness|nutrition|training|sport|coach/i.test(lower)) {
      domain = 'fitness_wellness';
    } else if (/festival|diwali|christmas|eid|holi|new\s*year|holiday|celebrat|season|greeting/i.test(lower)) {
      domain = 'festival_holiday';
    } else if (/event|webinar|conference|summit|workshop|masterclass|concert|party|launch\s*event|live/i.test(lower)) {
      domain = 'event_webinar';
    } else if (/course|learn|academy|school|education|study|bootcamp|certification|class/i.test(lower)) {
      domain = 'education';
    } else if (/ai|saas|tech|software|app|digital|cyber|cloud|data|automation|agency|marketing/i.test(lower)) {
      domain = 'tech_ai';
    }

    const domainConfigs: Record<
      typeof domain,
      {
        badge: string;
        headline: string;
        subtext: string;
        cta: string;
        photoUrl: string;
        altPhotoUrl: string;
        gradientCss: string;
        colors: [string, string, string];
      }
    > = {
      coffee_food: {
        badge: offerToken ? `☕ ${offerToken} • FRESHLY BREWED` : '☕ ARTISAN CRAFTED DAILY',
        headline: `Experience ${titleCaseSubject} — Crafted to Perfection`,
        subtext: 'Rich aroma, hand-selected ingredients, and unforgettable flavor in every single sip and bite.',
        cta: 'Order Fresh Today ➔',
        photoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #271206 0%, #78350f 55%, #d97706 100%)',
        colors: ['#271206', '#78350f', '#fbbf24'],
      },
      beauty_skincare: {
        badge: offerToken ? `✨ ${offerToken} • RADIANT GLOW` : '✨ DERMATOLOGIST APPROVED',
        headline: `${titleCaseSubject}: Unlock Pure Luminous Radiance`,
        subtext: 'Formulated with active botanical extracts for deep hydration and visible skin renewal.',
        cta: 'Shop Skincare Now ➔',
        photoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #4a044e 0%, #86198f 50%, #ec4899 100%)',
        colors: ['#4a044e', '#9d174d', '#f472b6'],
      },
      fashion_luxury: {
        badge: offerToken ? `💎 ${offerToken} • LIMITED EDITION` : '💎 EXCLUSIVE COLLECTION',
        headline: `${titleCaseSubject} — Timeless Luxury & Craftsmanship`,
        subtext: 'Designed for those who demand uncompromising elegance, precision, and modern sophistication.',
        cta: 'Explore Collection ➔',
        photoUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #78350f 100%)',
        colors: ['#090d16', '#312e81', '#fbbf24'],
      },
      real_estate: {
        badge: offerToken ? `🏡 ${offerToken} • EXCLUSIVE LISTING` : '🏡 MODERN LUXURY LIVING',
        headline: `Discover ${titleCaseSubject} — Your Dream Sanctuary`,
        subtext: 'Architectural excellence, panoramic views, and resort-style amenities in a prime location.',
        cta: 'Schedule Private Tour ➔',
        photoUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0284c7 100%)',
        colors: ['#0f172a', '#0f766e', '#38bdf8'],
      },
      fitness_wellness: {
        badge: offerToken ? `🔥 ${offerToken} • JOIN TODAY` : '🔥 TRANSFORM YOUR BODY & MIND',
        headline: `${titleCaseSubject}: Unleash Your Peak Potential`,
        subtext: 'Expert coaching, personalized programs, and a high-energy community built for real results.',
        cta: 'Start Free Trial ➔',
        photoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
        colors: ['#064e3b', '#047857', '#34d399'],
      },
      festival_holiday: {
        badge: offerToken ? `🎉 ${offerToken} • FESTIVE MEGA OFFER` : '🎉 GRAND FESTIVAL CELEBRATION',
        headline: `Celebrate With ${titleCaseSubject} & Exclusive Rewards`,
        subtext: 'Spread joy and prosperity this season with curated festive gifts and limited-time savings.',
        cta: 'Claim Festive Offer ➔',
        photoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #451a03 0%, #9a3412 50%, #ea580c 100%)',
        colors: ['#451a03', '#b45309', '#facc15'],
      },
      event_webinar: {
        badge: offerToken ? `🎙️ ${offerToken} • LIVE EVENT` : '🎙️ LIVE KEYNOTE & MASTERCLASS',
        headline: `${titleCaseSubject} — Reserve Your VIP Seat Today`,
        subtext: 'Join top industry leaders for actionable strategies, live networking, and exclusive insights.',
        cta: 'Register Seat Now ➔',
        photoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%)',
        colors: ['#1e1b4b', '#4338ca', '#a855f7'],
      },
      education: {
        badge: offerToken ? `🎓 ${offerToken} • ENROLLMENT OPEN` : '🎓 CERTIFIED CAREER PROGRAM',
        headline: `Master ${titleCaseSubject} With Industry Experts`,
        subtext: 'Hands-on projects, 1-on-1 mentorship, and career-ready skills designed for rapid growth.',
        cta: 'Enroll Today ➔',
        photoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 55%, #38bdf8 100%)',
        colors: ['#0c4a6e', '#0284c7', '#38bdf8'],
      },
      tech_ai: {
        badge: offerToken ? `⚡ ${offerToken} • NEXT-GEN AI` : '⚡ NEXT-GEN AI PLATFORM',
        headline: `Accelerate ${titleCaseSubject} 10x Faster With AI`,
        subtext: 'Automate workflows, unlock real-time intelligence, and scale your team with zero friction.',
        cta: 'Start Free Trial ➔',
        photoUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #0f172a 0%, #312e81 55%, #4f46e5 100%)',
        colors: ['#0f172a', '#4338ca', '#38bdf8'],
      },
      business_promo: {
        badge: offerToken ? `🔥 ${offerToken} • LIMITED TIME` : `✦ ${bName.toUpperCase()} SPOTLIGHT`,
        headline: `${titleCaseSubject} — Built for Unmatched Results`,
        subtext: `Elevate your experience with ${bName}. Premium quality, trusted service, and proven impact.`,
        cta: offerToken ? `Claim ${offerToken} ➔` : 'Get Started Today ➔',
        photoUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1080&q=80',
        altPhotoUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&q=80',
        gradientCss: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #7c3aed 100%)',
        colors: ['#312e81', customPrimaryColor || '#4f46e5', customSecondaryColor || '#ec4899'],
      },
    };

    const cfg = domainConfigs[domain];
    const [c1, c2, c3] = cfg.colors;
    const cleanSvgLabel = titleCaseSubject.replace(/[<>&"']/g, '').slice(0, 30);
    const subjectWords = cleanSvgLabel.split(/\s+/).filter(Boolean);
    const initials =
      subjectWords.length >= 2
        ? `${subjectWords[0][0]}${subjectWords[1][0]}`.toUpperCase()
        : cleanSvgLabel.slice(0, 2).toUpperCase();

    // 1. Generate 100% Transparent-Background Vector Logo Emblem SVG (Zero Background Fill!)
    const transparentLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c3}"/>
        </linearGradient>
      </defs>
      <polygon points="300,35 460,125 460,305 300,395 140,305 140,125" fill="url(#crestGrad)" stroke="#ffffff" stroke-width="6"/>
      <polygon points="300,62 436,138 436,292 300,368 164,292 164,138" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-dasharray="8,5"/>
      <text x="300" y="252" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="112" font-weight="900" letter-spacing="4">${initials}</text>
      <rect x="80" y="425" width="440" height="68" rx="34" fill="${c1}" stroke="${c3}" stroke-width="3"/>
      <text x="300" y="468" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="26" font-weight="800" letter-spacing="2">${cleanSvgLabel.slice(0, 20).toUpperCase()}</text>
      <text x="300" y="530" text-anchor="middle" fill="${c2}" font-family="sans-serif" font-size="16" font-weight="800" letter-spacing="4">${bName.replace(/[<>&"']/g, '').toUpperCase()}</text>
    </svg>`;
    const transparentLogoSvgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(transparentLogoSvg)}`;

    // 2. Generate 100% Transparent-Background Circular Sticker / Seal Badge SVG
    const transparentStickerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <defs>
        <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <circle cx="300" cy="300" r="245" fill="url(#sealGrad)" stroke="${c3}" stroke-width="10"/>
      <circle cx="300" cy="300" r="215" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="10,8"/>
      <text x="300" y="165" text-anchor="middle" fill="${c3}" font-family="sans-serif" font-size="26" font-weight="900" letter-spacing="6">★ OFFICIAL ★</text>
      <text x="300" y="305" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="88" font-weight="900" letter-spacing="3">${initials}</text>
      <text x="300" y="375" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="800">${cleanSvgLabel.slice(0, 22)}</text>
      <rect x="175" y="405" width="250" height="40" rx="20" fill="${c3}"/>
      <text x="300" y="431" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-size="15" font-weight="900" letter-spacing="2">VERIFIED BRAND</text>
    </svg>`;
    const transparentStickerSvgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(transparentStickerSvg)}`;

    // 3. Generate Pure Visual AI Studio Backdrop Artwork (Zero baked-in text/buttons to avoid duplicating canvas layers)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="55%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c3}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="podium" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
          <stop offset="100%" stop-color="rgba(15,23,42,0.65)"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" rx="28" fill="url(#bg)"/>
      <circle cx="400" cy="270" r="250" fill="url(#glow)"/>
      <circle cx="660" cy="115" r="95" fill="rgba(255,255,255,0.08)"/>
      <circle cx="135" cy="485" r="115" fill="rgba(255,255,255,0.06)"/>
      <circle cx="400" cy="270" r="170" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2" stroke-dasharray="10,8"/>
      <circle cx="400" cy="270" r="125" fill="none" stroke="${c3}" stroke-width="2.5" stroke-opacity="0.55"/>
      <ellipse cx="400" cy="445" rx="220" ry="38" fill="url(#podium)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      <polygon points="400,145 505,235 465,370 335,370 295,235" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    </svg>`;
    const aiSvgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    return {
      subject: titleCaseSubject,
      domain,
      badge: cfg.badge,
      headline: cfg.headline,
      subtext: cfg.subtext,
      cta: cfg.cta,
      photoUrl: cfg.photoUrl,
      altPhotoUrl: cfg.altPhotoUrl,
      aiSvgDataUrl,
      transparentLogoSvgUrl,
      transparentStickerSvgUrl,
      gradientCss: cfg.gradientCss,
      accentHex: c3,
    };
  };

  // AI Image Generator Handler (Generates Transparent Logos, Stickers, AI Studio Graphics & Topic Photos!)
  const handleGenerateAiImage = () => {
    const promptText = aiImagePrompt.trim() || designTitle || 'Luxury Product Showcase';
    setIsGeneratingAiImage(true);
    setTimeout(() => {
      const synth = synthesizeAiContentAndVisual(promptText, aiImageStyle);
      const ts = Date.now();
      const isTransparentRequest =
        aiImageStyle === 'Transparent Logo' ||
        aiImageStyle === 'Transparent Sticker' ||
        /logo|transparent|emblem|monogram|sticker|seal|watermark/i.test(promptText);

      const logoItem = {
        id: `ai-logo-${ts}`,
        prompt: `${synth.subject} (Transparent Logo)`,
        style: 'Transparent Logo',
        url: synth.transparentLogoSvgUrl,
      };
      const stickerItem = {
        id: `ai-sticker-${ts + 1}`,
        prompt: `${synth.subject} (Transparent Seal)`,
        style: 'Transparent Sticker',
        url: synth.transparentStickerSvgUrl,
      };
      const studioItem = {
        id: `ai-img-${ts + 2}`,
        prompt: promptText,
        style: aiImageStyle,
        url: synth.aiSvgDataUrl,
      };
      const photoItem = {
        id: `ai-photo-${ts + 3}`,
        prompt: `${synth.subject} (Photorealistic)`,
        style: 'Photorealistic',
        url: synth.photoUrl,
      };

      setGeneratedAiImages((prev) => [logoItem, stickerItem, photoItem, studioItem, ...prev]);
      setUploadedAssets((prev) => [
        { id: logoItem.id, name: `Logo: ${synth.subject}`, url: logoItem.url, source: 'ai', createdAt: new Date().toISOString() },
        { id: stickerItem.id, name: `Seal: ${synth.subject}`, url: stickerItem.url, source: 'ai', createdAt: new Date().toISOString() },
        { id: photoItem.id, name: `Photo: ${synth.subject}`, url: photoItem.url, source: 'ai', createdAt: new Date().toISOString() },
        { id: studioItem.id, name: `AI: ${synth.subject}`, url: studioItem.url, source: 'ai', createdAt: new Date().toISOString() },
        ...prev,
      ]);

      // Immediately place or replace image on the canvas so user sees it right away!
      const chosenUrl =
        aiImageStyle === 'Transparent Logo'
          ? synth.transparentLogoSvgUrl
          : aiImageStyle === 'Transparent Sticker'
            ? synth.transparentStickerSvgUrl
            : isTransparentRequest
              ? synth.transparentLogoSvgUrl
              : aiImageStyle === 'Photorealistic'
                ? synth.photoUrl
                : synth.aiSvgDataUrl;

      if (isTransparentRequest) {
        setBgType('transparent');
        setBgOverlayOpacity(0);
        setExportFormat('transparent_png');
      }

      addImageOverlayLayer(
        chosenUrl,
        50,
        50,
        isTransparentRequest ? `Logo: ${synth.subject}` : `AI: ${synth.subject}`,
        aiImageInsertMode
      );
      setIsGeneratingAiImage(false);
      showStudioToast(
        isTransparentRequest
          ? `Generated transparent logo for "${synth.subject}" on transparent canvas!`
          : aiImageInsertMode === 'replace'
            ? `Generated AI visual for "${synth.subject}" and replaced canvas image!`
            : `Generated AI visual for "${synth.subject}" and added to canvas!`,
        'success'
      );
    }, 350);
  };

  // Helper to apply a generated variation (supports gradient, solid, image, and transparent backgrounds)
  const applyGeneratedVariation = (v: {
    name: string;
    bgType: 'gradient' | 'solid' | 'image' | 'transparent';
    bgValue: string;
    layers: CanvasLayer[];
  }) => {
    setBgType(v.bgType);
    if (v.bgType === 'gradient') setBgGradient(v.bgValue);
    else if (v.bgType === 'solid') setBgColor(v.bgValue);
    else if (v.bgType === 'image') {
      setBgImageUrl(v.bgValue);
      setBgOverlayOpacity(0.45);
    } else if (v.bgType === 'transparent') {
      setBgOverlayOpacity(0);
      setExportFormat('transparent_png');
    }
    const cloned = JSON.parse(JSON.stringify(v.layers));
    setLayers(cloned);
    setSelectedLayerId(cloned[0]?.id || null);
    pushHistory(cloned);
    showStudioToast(`Applied "${v.name}" variation!`, 'success');
  };

  // AI Design Assistant Natural Language + Content & Image Generator Engine
  const executeAiDesignInstruction = async (
    instructionOverride?: string,
    modeOverride?: 'full' | 'copy_only' | 'image_only'
  ) => {
    const fallbackPrompt =
      designTitle && !designTitle.toLowerCase().includes('untitled')
        ? designTitle
        : `${customBrandName || activeBrand?.name || 'HoaspForge'} Marketing Campaign`;
    const raw = (instructionOverride ?? aiInstructionText).trim() || fallbackPrompt;
    const effectiveMode = modeOverride ?? aiAssistantMode;

    setIsAiAssistantWorking(true);
    const cmd = raw.toLowerCase();

    try {
      // 0. Check if user is asking for a Transparent Logo / Emblem / Monogram / Watermark
      if (/\b(logo|monogram|emblem|watermark|transparent\s+logo|brand\s+logo)\b/i.test(cmd)) {
        const synthLogo = synthesizeAiContentAndVisual(raw, 'Transparent Logo');
        const tsLogo = Date.now();
        setGeneratedAiImages((prev) => [
          { id: `ai-logo-${tsLogo}`, prompt: synthLogo.subject, style: 'Transparent Logo', url: synthLogo.transparentLogoSvgUrl },
          { id: `ai-seal-${tsLogo + 1}`, prompt: synthLogo.subject, style: 'Transparent Sticker', url: synthLogo.transparentStickerSvgUrl },
          ...prev,
        ]);
        createEditableTransparentLogoOnCanvas(raw);
        setAiInstructionText('');
        setIsAiAssistantWorking(false);
        return;
      }

      // 1. Check pure formatting / styling commands first (when user is not asking for new topic/content/image)
      const isPureStyleCommand =
        !/content|image|photo|picture|poster|ad|advertisement|banner|create|generate|write|coffee|skin|sale|offer|launch|event|festival|real estate|gym|tech/i.test(
          cmd
        );

      if (cmd === 'apply my brand colors' || cmd === 'apply brand kit') {
        applyBrandKitToCanvas();
        setAiInstructionText('');
        setIsAiAssistantWorking(false);
        return;
      }

      if (cmd === 'change the background to a luxury style') {
        setBgType('gradient');
        setBgGradient(GRADIENT_PRESETS[3].css);
        showStudioToast('Updated background to Luxury Obsidian Gold style!', 'success');
        setAiInstructionText('');
        setIsAiAssistantWorking(false);
        return;
      }

      if (cmd === 'make this design suitable for instagram') {
        setAspectRatio('instagram_square');
        showStudioToast('Adapted design format for Instagram (1080×1080)!', 'success');
        setAiInstructionText('');
        setIsAiAssistantWorking(false);
        return;
      }

      if (isPureStyleCommand && (cmd.includes('typography') || cmd.includes('more professional'))) {
        setLayers((prev) => {
          const next = prev.map((l) => {
            if (l.type !== 'text') return l;
            const isHead = l.id.includes('head') || (l.fontSize && l.fontSize >= 30);
            return {
              ...l,
              fontFamily: isHead ? "'Playfair Display', serif" : "'Plus Jakarta Sans', sans-serif",
              fontSize: isHead ? Math.min(60, Math.round((l.fontSize || 42) * 1.08)) : l.fontSize,
              letterSpacing: isHead ? -0.5 : l.letterSpacing,
              lineHeight: isHead ? 1.12 : 1.35,
            };
          });
          pushHistory(next);
          return next;
        });
        showStudioToast('Refined typography hierarchy and contrast!', 'success');
        setAiInstructionText('');
        setIsAiAssistantWorking(false);
        return;
      }

      // 2. Synthesize Topic-Matched Copy + High-Res Photo + Custom AI Studio Graphic
      const synth = synthesizeAiContentAndVisual(raw, 'AI Assistant');

      // Optionally enrich with backend AI Poster / Copy endpoint if activeBrand is available
      if (activeBrand?.id) {
        try {
          const apiPoster = await api.templates.generateAiPoster(activeBrand.id, {
            text: raw,
            aspectRatio: activeRatioConfig.ratio || '1:1',
          });
          if (
            apiPoster?.headline &&
            apiPoster.headline.length > 6 &&
            apiPoster.headline.toLowerCase() !== raw.toLowerCase() &&
            !apiPoster.headline.toLowerCase().includes('generate')
          ) {
            synth.headline = apiPoster.headline;
          }
        } catch {
          // Use local synthesizer seamlessly
        }
      }

      // Save generated visual assets into AI Images & Uploads library
      const ts = Date.now();
      setGeneratedAiImages((prev) => [
        { id: `ai-photo-${ts}`, prompt: synth.subject, style: 'Topic Photo', url: synth.photoUrl },
        { id: `ai-svg-${ts + 1}`, prompt: synth.subject, style: 'AI Studio', url: synth.aiSvgDataUrl },
        ...prev.slice(0, 10),
      ]);
      setUploadedAssets((prev) => {
        const urls = new Set(prev.map((a) => a.url));
        const additions: typeof prev = [];
        if (!urls.has(synth.photoUrl)) {
          additions.push({
            id: `up-ai-photo-${ts}`,
            name: `AI Photo: ${synth.subject}`,
            url: synth.photoUrl,
            source: 'ai',
            createdAt: new Date().toISOString(),
          });
        }
        additions.push({
          id: `up-ai-svg-${ts + 1}`,
          name: `AI Graphic: ${synth.subject}`,
          url: synth.aiSvgDataUrl,
          source: 'ai',
          createdAt: new Date().toISOString(),
        });
        return [...additions, ...prev];
      });

      // Build the 3 complete editable variations (with Content + Image)
      const fullPhotoHeroLayers: CanvasLayer[] = [
        {
          id: `layer-badge-${ts}`,
          type: 'text',
          name: 'Category Badge',
          x: 50,
          y: 10,
          width: 54,
          height: 6,
          rotation: 0,
          opacity: 1,
          visible: true,
          text: synth.badge,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          fontWeight: '800',
          textAlign: 'center',
          color: '#0f172a',
          backgroundColor: '#facc15',
          backgroundPadding: 7,
          borderRadius: 9999,
          letterSpacing: 1.5,
          animation: { entrance: 'pop', duration: 0.6, delay: 0 },
        },
        {
          id: `layer-headline-${ts}`,
          type: 'text',
          name: 'Main Headline',
          x: 50,
          y: 24,
          width: 88,
          height: 16,
          rotation: 0,
          opacity: 1,
          visible: true,
          text: synth.headline,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 34,
          fontWeight: '800',
          textAlign: 'center',
          color: '#ffffff',
          shadowColor: 'rgba(0, 0, 0, 0.5)',
          shadowBlur: 12,
          lineHeight: 1.15,
          animation: { entrance: 'slide_up', duration: 0.7, delay: 0.1 },
        },
        {
          id: `layer-hero-img-${ts}`,
          type: 'image',
          name: `${synth.subject} Image`,
          imageUrl: synth.photoUrl,
          x: 50,
          y: 52,
          width: 66,
          height: 34,
          rotation: 0,
          opacity: 1,
          visible: true,
          borderRadius: 14,
          strokeColor: 'rgba(255, 255, 255, 0.45)',
          strokeWidth: 2,
          shadowColor: 'rgba(0, 0, 0, 0.45)',
          shadowBlur: 18,
          cropAspect: '16:9',
          animation: { entrance: 'zoom_in', duration: 0.7, delay: 0.2 },
        },
        {
          id: `layer-subtext-${ts}`,
          type: 'text',
          name: 'Supporting Copy',
          x: 50,
          y: 77,
          width: 82,
          height: 10,
          rotation: 0,
          opacity: 0.94,
          visible: true,
          text: synth.subtext,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15,
          fontWeight: '500',
          textAlign: 'center',
          color: '#e2e8f0',
          lineHeight: 1.35,
          animation: { entrance: 'fade', duration: 0.7, delay: 0.3 },
        },
        {
          id: `layer-cta-${ts}`,
          type: 'text',
          name: 'Call To Action Button',
          x: 50,
          y: 90,
          width: 46,
          height: 7,
          rotation: 0,
          opacity: 1,
          visible: true,
          text: synth.cta,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 15,
          fontWeight: '800',
          textAlign: 'center',
          color: '#ffffff',
          backgroundColor: customSecondaryColor || '#ec4899',
          backgroundPadding: 9,
          borderRadius: 9999,
          animation: { entrance: 'pop', duration: 0.6, delay: 0.4 },
        },
      ];

      const editorialBackdropLayers: CanvasLayer[] = [
        {
          ...fullPhotoHeroLayers[0],
          id: `layer-ed-badge-${ts}`,
          y: 16,
          backgroundColor: '#ffffff',
          color: '#0f172a',
        },
        {
          ...fullPhotoHeroLayers[1],
          id: `layer-ed-head-${ts}`,
          y: 42,
          fontSize: 42,
          fontFamily: "'Playfair Display', serif",
        },
        {
          ...fullPhotoHeroLayers[3],
          id: `layer-ed-sub-${ts}`,
          y: 66,
          fontSize: 17,
        },
        {
          ...fullPhotoHeroLayers[4],
          id: `layer-ed-cta-${ts}`,
          y: 84,
          backgroundColor: '#f59e0b',
          color: '#0f172a',
        },
      ];

      const aiStudioGraphicLayers: CanvasLayer[] = fullPhotoHeroLayers.map((l) =>
        l.type === 'image'
          ? { ...l, id: `layer-ai-svg-${ts}`, name: `${synth.subject} AI Graphic`, imageUrl: synth.aiSvgDataUrl }
          : { ...l, id: `${l.id}-studio` }
      );

      const generatedVars = [
        {
          id: `var-photo-hero-${ts}`,
          name: `${synth.subject} — Photo & Copy`,
          tag: 'Content + Photo',
          badgeColor: '#4f46e5',
          desc: 'Complete marketing headline, subcopy, CTA & framed topic photography',
          bgType: 'gradient' as const,
          bgValue: synth.gradientCss,
          previewImageUrl: synth.photoUrl,
          layers: fullPhotoHeroLayers,
        },
        {
          id: `var-editorial-bg-${ts}`,
          name: `${synth.subject} — Full Photo Backdrop`,
          tag: 'Full Image BG',
          badgeColor: '#f59e0b',
          desc: 'Full-bleed high-resolution photography backdrop with editorial typography',
          bgType: 'image' as const,
          bgValue: synth.altPhotoUrl,
          previewImageUrl: synth.altPhotoUrl,
          layers: editorialBackdropLayers,
        },
        {
          id: `var-ai-studio-${ts}`,
          name: `${synth.subject} — AI Studio Graphic`,
          tag: 'AI Illustration',
          badgeColor: '#10b981',
          desc: 'Custom AI-generated vector studio illustration with brand colors',
          bgType: 'gradient' as const,
          bgValue: `linear-gradient(135deg, #0f172a 0%, ${customPrimaryColor} 55%, ${customSecondaryColor} 100%)`,
          previewImageUrl: synth.aiSvgDataUrl,
          layers: aiStudioGraphicLayers,
        },
      ];

      setAiGeneratedVariations(generatedVars);

      // 3. Apply changes to the active canvas based on mode
      if (effectiveMode === 'image_only') {
        addImageOverlayLayer(synth.photoUrl, 50, 52, `${synth.subject} Image`, 'replace');
        showStudioToast(`Generated & updated image for "${synth.subject}" on canvas!`, 'success');
      } else if (effectiveMode === 'copy_only') {
        setDesignTitle(synth.subject);
        setLayers((prev) => {
          const textLayers = prev.filter((l) => l.type === 'text');
          if (textLayers.length === 0) {
            const copyLayers = fullPhotoHeroLayers.filter((l) => l.type === 'text');
            const merged = [...prev, ...copyLayers];
            pushHistory(merged);
            return merged;
          }
          let textIdx = 0;
          const next = prev.map((l) => {
            if (l.type !== 'text') return l;
            textIdx++;
            if (textIdx === 1 && (l.fontSize || 20) < 24) return { ...l, text: synth.badge };
            if (textIdx === 1 || (textIdx === 2 && (l.fontSize || 20) >= 28)) return { ...l, text: synth.headline };
            if (l.backgroundColor && textIdx >= 3) return { ...l, text: synth.cta };
            return { ...l, text: synth.subtext };
          });
          pushHistory(next);
          return next;
        });
        showStudioToast(`Generated marketing copy for "${synth.subject}"!`, 'success');
      } else {
        // Default 'full' mode: Apply Content + Image variation directly to canvas AND show all 3 variations!
        setDesignTitle(synth.subject);
        setBgType('gradient');
        setBgGradient(synth.gradientCss);
        setLayers(fullPhotoHeroLayers);
        setSelectedLayerId(fullPhotoHeroLayers[2]?.id || fullPhotoHeroLayers[1]?.id || null);
        pushHistory(fullPhotoHeroLayers);
        showStudioToast(`Generated content & image for "${synth.subject}" (+3 variations)!`, 'success');
      }

      setAiInstructionText('');
    } finally {
      setIsAiAssistantWorking(false);
    }
  };

  // High-Resolution Canvas Export Engine (Supports Transparent PNG, PNG, JPG, and PDF!)
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });

  const drawImageWithObjectFit = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
    fit: 'cover' | 'contain'
  ) => {
    const srcW = img.naturalWidth || img.width || destW;
    const srcH = img.naturalHeight || img.height || destH;
    if (!srcW || !srcH) {
      ctx.drawImage(img, destX, destY, destW, destH);
      return;
    }
    const srcRatio = srcW / srcH;
    const destRatio = destW / destH;

    if (fit === 'contain') {
      let drawW = destW;
      let drawH = destH;
      if (srcRatio > destRatio) {
        drawH = destW / srcRatio;
      } else {
        drawW = destH * srcRatio;
      }
      const offsetX = destX + (destW - drawW) / 2;
      const offsetY = destY + (destH - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    } else {
      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;
      if (srcRatio > destRatio) {
        sw = srcH * destRatio;
        sx = (srcW - sw) / 2;
      } else {
        sh = srcW / destRatio;
        sy = (srcH - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, destX, destY, destW, destH);
    }
  };

  const renderToCanvas = async (options?: { transparentBg?: boolean; scale?: number }): Promise<HTMLCanvasElement> => {
    const scale = options?.scale || exportScale || 1;
    const width = activeRatioConfig.width * scale;
    const height = activeRatioConfig.height * scale;
    const unitScale = getDesignUnitScale(width, height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize 2D canvas context');

    // 1. Draw Background unless Transparent PNG is requested or Canvas is in Transparent Mode
    if (!options?.transparentBg && bgType !== 'transparent') {
      if (bgType === 'solid') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
      } else if (bgType === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        const hexMatches = bgGradient.match(/#[0-9a-fA-F]{6}/g);
        if (hexMatches && hexMatches.length >= 2) {
          hexMatches.forEach((hex, idx) => {
            grad.addColorStop(idx / (hexMatches.length - 1), hex);
          });
        } else {
          grad.addColorStop(0, '#312e81');
          grad.addColorStop(0.5, '#4f46e5');
          grad.addColorStop(1, '#ec4899');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (bgType === 'image' && bgImageUrl) {
        try {
          const img = await loadImage(bgImageUrl);
          drawImageWithObjectFit(ctx, img, 0, 0, width, height, 'cover');
        } catch {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, width, height);
        }
      }

      if (bgOverlayOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bgOverlayOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 2. Render Visible Layers using Synchronized Design Coordinates
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();

      const isFullCanvasTextFill =
        layer.type === 'text' && Boolean(layer.backgroundColor) && layer.backgroundFillMode === 'canvas';

      const cx = isFullCanvasTextFill ? width / 2 : (layer.x / 100) * width;
      const cy = isFullCanvasTextFill ? height / 2 : (layer.y / 100) * height;
      const lw = isFullCanvasTextFill ? width : (layer.width / 100) * width;
      const lh = isFullCanvasTextFill ? height : (layer.height / 100) * height;

      ctx.translate(cx, cy);
      if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
      if (layer.flipX || layer.flipY) ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      ctx.globalAlpha = layer.opacity ?? 1;

      if (layer.type === 'shape') {
        const rx = -lw / 2;
        const ry = -lh / 2;
        const drawPoly = (pts: [number, number][]) => {
          ctx.beginPath();
          pts.forEach(([px, py], i) => {
            const xCoord = rx + (px / 100) * lw;
            const yCoord = ry + (py / 100) * lh;
            if (i === 0) ctx.moveTo(xCoord, yCoord);
            else ctx.lineTo(xCoord, yCoord);
          });
          ctx.closePath();
        };

        if (layer.shapeType === 'circle') {
          ctx.beginPath();
          ctx.ellipse(0, 0, lw * 0.48, lh * 0.48, 0, 0, Math.PI * 2);
        } else if (layer.shapeType === 'pill') {
          ctx.beginPath();
          ctx.roundRect(rx, ry, lw, lh, Math.min(lw, lh) / 2);
        } else if (layer.shapeType === 'line') {
          ctx.beginPath();
          const lineThickness = Math.max(2, (layer.strokeWidth || 2) * unitScale * 2);
          ctx.rect(rx, -lineThickness / 2, lw, lineThickness);
        } else if (layer.shapeType === 'triangle') {
          drawPoly([
            [50, 2],
            [98, 98],
            [2, 98],
          ]);
        } else if (layer.shapeType === 'diamond') {
          drawPoly([
            [50, 2],
            [98, 50],
            [50, 98],
            [2, 50],
          ]);
        } else if (layer.shapeType === 'hexagon') {
          drawPoly([
            [50, 2],
            [95, 26],
            [95, 74],
            [50, 98],
            [5, 74],
            [5, 26],
          ]);
        } else if (layer.shapeType === 'star') {
          drawPoly([
            [50, 2],
            [63, 35],
            [98, 37],
            [70, 59],
            [81, 94],
            [50, 73],
            [19, 94],
            [30, 59],
            [2, 37],
            [37, 35],
          ]);
        } else if (layer.shapeType === 'ribbon') {
          drawPoly([
            [0, 0],
            [100, 0],
            [88, 50],
            [100, 100],
            [0, 100],
            [12, 50],
          ]);
        } else if (layer.shapeType === 'arrow') {
          drawPoly([
            [2, 32],
            [60, 32],
            [60, 10],
            [98, 50],
            [60, 90],
            [60, 68],
            [2, 68],
          ]);
        } else if (layer.shapeType === 'speech_bubble') {
          drawPoly([
            [4, 4],
            [96, 4],
            [96, 78],
            [42, 78],
            [24, 98],
            [24, 78],
            [4, 78],
          ]);
        } else {
          ctx.beginPath();
          const rad = layer.shapeType === 'rectangle' ? 0 : (layer.borderRadius || 12) * unitScale * 1.8;
          ctx.roundRect(rx, ry, lw, lh, rad);
        }

        if (layer.fillColor && layer.fillColor !== 'transparent') {
          ctx.fillStyle = layer.fillColor;
          ctx.fill();
        }
        if (layer.strokeColor && (layer.strokeWidth || 0) > 0) {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = (layer.strokeWidth || 2) * unitScale * 1.8;
          if (layer.strokeDash === 'dashed') ctx.setLineDash([12 * unitScale, 8 * unitScale]);
          else if (layer.strokeDash === 'dotted') ctx.setLineDash([4 * unitScale, 6 * unitScale]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (layer.type === 'image' && layer.imageUrl) {
        try {
          const img = await loadImage(layer.imageUrl);
          let boxW = lw;
          let boxH = lh;
          if (layer.cropAspect === '1:1' || layer.cropAspect === 'circle') {
            const side = Math.min(lw, lh);
            boxW = side;
            boxH = side;
          } else if (layer.cropAspect === '4:5') {
            boxH = Math.min(lh, boxW * (5 / 4));
            boxW = boxH * (4 / 5);
          } else if (layer.cropAspect === '16:9') {
            boxH = Math.min(lh, boxW * (9 / 16));
            boxW = boxH * (16 / 9);
          }
          const rx = -boxW / 2;
          const ry = -boxH / 2;

          if (layer.shadowColor) {
            ctx.shadowColor = layer.shadowColor;
            ctx.shadowBlur = (layer.shadowBlur || 16) * unitScale * 1.6;
            ctx.shadowOffsetY = 6 * unitScale;
          }

          ctx.save();
          if (layer.cropAspect === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(boxW, boxH) / 2, 0, Math.PI * 2);
            ctx.clip();
          } else {
            const rad = (layer.borderRadius ?? 12) * unitScale * 1.8;
            if (rad > 0) {
              ctx.beginPath();
              ctx.roundRect(rx, ry, boxW, boxH, rad);
              ctx.clip();
            }
          }

          const isContainAsset =
            layer.name.toLowerCase().includes('logo') ||
            layer.name.toLowerCase().includes('seal') ||
            layer.imageUrl.includes('crestGrad') ||
            layer.imageUrl.includes('sealGrad') ||
            layer.imageUrl.includes('logoGrad');

          drawImageWithObjectFit(ctx, img, rx, ry, boxW, boxH, isContainAsset ? 'contain' : 'cover');
          ctx.restore();

          if ((layer.strokeWidth || 0) > 0) {
            ctx.strokeStyle = layer.strokeColor || '#ffffff';
            ctx.lineWidth = (layer.strokeWidth || 2) * unitScale * 1.8;
            ctx.beginPath();
            if (layer.cropAspect === 'circle') {
              ctx.arc(0, 0, Math.min(boxW, boxH) / 2, 0, Math.PI * 2);
            } else {
              ctx.roundRect(rx, ry, boxW, boxH, (layer.borderRadius ?? 12) * unitScale * 1.8);
            }
            ctx.stroke();
          }
        } catch {}
      } else if (layer.type === 'icon') {
        const sz = Math.min(lw, lh);
        ctx.fillStyle = layer.iconColor || '#facc15';
        ctx.font = `${Math.max(18, sz * 0.72)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', 0, 0);
      } else if (layer.type === 'text' && layer.text) {
        const metrics = computeTextLayoutMetrics(layer, width, height);
        const scaledFontSize = metrics.fontSizePx;
        const fontStyle = layer.fontStyle === 'italic' ? 'italic ' : '';
        const fontWeight = layer.fontWeight || '700';
        const fontFamily = layer.fontFamily || "'Outfit', sans-serif";

        ctx.font = `${fontStyle}${fontWeight} ${scaledFontSize}px ${fontFamily}`;
        ctx.textAlign = (layer.textAlign as CanvasTextAlign) || 'center';
        ctx.textBaseline = 'middle';

        let displayText = layer.text;
        if (layer.textTransform === 'uppercase') displayText = displayText.toUpperCase();
        else if (layer.textTransform === 'lowercase') displayText = displayText.toLowerCase();

        const maxTextWidth = Math.max(24, lw - metrics.paddingPx * 2);
        const paragraphs = displayText.split('\n');
        const lines: string[] = [];

        for (const para of paragraphs) {
          const words = para.split(/\s+/).filter(Boolean);
          if (words.length === 0) {
            lines.push('');
            continue;
          }
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth =
              ctx.measureText(testLine).width + Math.max(0, testLine.length - 1) * metrics.letterSpacingPx;
            if (testWidth > maxTextWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
        }

        const lineH = scaledFontSize * metrics.lineHeightRatio;
        const totalH = lines.length * lineH;
        const startY = -(totalH / 2) + lineH / 2;

        if (layer.backgroundColor) {
          ctx.fillStyle = layer.backgroundColor;
          ctx.beginPath();
          if (isFullCanvasTextFill) {
            ctx.rect(-width / 2, -height / 2, width, height);
          } else {
            const boxW = lw;
            const boxH = Math.max(lh, totalH + metrics.paddingPx * 1.5);
            const rad = Math.min(boxH / 2, metrics.borderRadiusPx);
            ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, rad);
          }
          ctx.fill();
        }

        if (layer.shadowColor) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = metrics.shadowBlurPx;
          ctx.shadowOffsetY = 2 * metrics.unitScale;
        }

        ctx.fillStyle = layer.color || '#ffffff';
        const alignX =
          layer.textAlign === 'left'
            ? -lw / 2 + metrics.paddingPx + 4
            : layer.textAlign === 'right'
              ? lw / 2 - metrics.paddingPx - 4
              : 0;

        lines.forEach((line, idx) => {
          ctx.fillText(line, alignX, startY + idx * lineH);
        });
      }
      ctx.restore();
    }

    return canvas;
  };

  // Generate Valid Downloadable PDF from JPEG DataURL
  const createPdfBlobFromJpegDataUrl = (jpegDataUrl: string, widthPx: number, heightPx: number): Blob => {
    const base64 = jpegDataUrl.split(',')[1];
    const binary = atob(base64);
    const imgBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i);

    const pdfW = Math.round(widthPx * 0.75);
    const pdfH = Math.round(heightPx * 0.75);
    const encoder = new TextEncoder();

    const header = `%PDF-1.4\n`;
    const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${pdfW} ${pdfH}] /Contents 5 0 R >>\nendobj\n`;
    const obj4Head = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`;
    const obj4Foot = `\nendstream\nendobj\n`;
    const stream5 = `q ${pdfW} 0 0 ${pdfH} 0 0 cm /Im0 Do Q`;
    const obj5 = `5 0 obj\n<< /Length ${stream5.length} >>\nstream\n${stream5}\nendstream\nendobj\n`;
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\n%%EOF`;

    return new Blob(
      [
        encoder.encode(header + obj1 + obj2 + obj3 + obj4Head),
        imgBytes,
        encoder.encode(obj4Foot + obj5 + trailer),
      ],
      { type: 'application/pdf' }
    );
  };

  const handleExportDownload = async (fmtOverride?: typeof exportFormat) => {
    const fmt = fmtOverride || exportFormat;
    if (fmt === 'animated') {
      setIsExportMenuOpen(false);
      setIsReelStudioOpen(true);
      return;
    }

    try {
      setIsExporting(true);
      const canvas = await renderToCanvas({
        transparentBg: fmt === 'transparent_png',
        scale: exportScale,
      });
      const safeName =
        designTitle
          .replace(/[^a-zA-Z0-9 -]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .toLowerCase() || 'hoaspforge-design';

      if (fmt === 'pdf') {
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);
        const pdfBlob = createPdfBlobFromJpegDataUrl(jpegUrl, canvas.width, canvas.height);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        showStudioToast(`Exported "${designTitle}" as PDF Document!`, 'success');
      } else {
        const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
        const ext = fmt === 'jpg' ? 'jpg' : 'png';
        const dataUrl = canvas.toDataURL(mime, fmt === 'jpg' ? 0.94 : 1.0);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${safeName}${fmt === 'transparent_png' ? '-transparent' : ''}.${ext}`;
        a.click();
        showStudioToast(
          `Exported ${fmt === 'transparent_png' ? 'Transparent PNG' : fmt.toUpperCase()} (${canvas.width}×${canvas.height}px)!`,
          'success'
        );
      }
    } catch (err: any) {
      showStudioToast('Export failed: ' + (err?.message || 'Canvas error'), 'error');
    } finally {
      setIsExporting(false);
      setIsExportMenuOpen(false);
    }
  };

  // Save Editable Project (Preserves all editable layers + state)
  const handleSaveEditableProject = async () => {
    try {
      setIsExporting(true);
      const thumbCanvas = await renderToCanvas({ scale: 1 });
      const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);

      const project: SavedDesignProject = {
        id: `proj-${Date.now()}`,
        title: designTitle.trim() || 'Untitled Design',
        updatedAt: new Date().toISOString(),
        aspectRatio,
        background: {
          type: bgType,
          value: bgType === 'gradient' ? bgGradient : bgType === 'solid' ? bgColor : bgImageUrl,
          overlayOpacity: bgOverlayOpacity,
        },
        layers: JSON.parse(JSON.stringify(layers)),
        thumbnailDataUrl: thumbUrl,
      };

      setSavedProjects((prev) => {
        const filtered = prev.filter((p) => p.title !== project.title);
        const next = [project, ...filtered].slice(0, 20);
        try {
          localStorage.setItem('sf_saved_design_projects_v1', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Also save to Media Library if activeBrand exists
      const brand = activeBrand || (brands && brands.length > 0 ? brands[0] : null);
      if (brand) {
        try {
          const asset = await api.media.create(brand.id, {
            fileName: `${project.title.toLowerCase().replace(/\s+/g, '-')}.png`,
            publicUrl: thumbUrl,
            thumbnailUrl: thumbUrl,
            mimeType: 'image/png',
            mediaType: 'image',
            fileSizeBytes: Math.round(thumbUrl.length * 0.75),
            metadata: {
              title: project.title,
              width: activeRatioConfig.width,
              height: activeRatioConfig.height,
              aspectRatio,
              source: 'canva_studio',
              editableLayers: project.layers,
              layers: project.layers,
              editableBackground: project.background,
              background: project.background,
            } as any,
          });
          if (onSaveToLibrary) onSaveToLibrary(asset);
        } catch {}
      }

      setIsSaveMenuOpen(false);
      showStudioToast(`Saved editable project "${project.title}"!`, 'success');
    } catch {
      showStudioToast('Saved project to local workspace!', 'success');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenSavedProject = (proj: SavedDesignProject) => {
    setDesignTitle(proj.title);
    setAspectRatio(proj.aspectRatio);
    setBgType(proj.background.type);
    if (proj.background.type === 'gradient') setBgGradient(proj.background.value);
    else if (proj.background.type === 'solid') setBgColor(proj.background.value);
    else if (proj.background.type === 'image') setBgImageUrl(proj.background.value);
    setBgOverlayOpacity(proj.background.overlayOpacity ?? 0.2);
    const normalized = normalizeTemplateLayers(proj.layers, proj.title);
    setLayers(normalized);
    setSelectedLayerId(normalized[0]?.id || null);
    pushHistory(normalized);
    setIsSavedProjectsModalOpen(false);
    showStudioToast(`Reopened editable project "${proj.title}"`, 'success');
  };

  const handleSaveDesignAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    setIsSavingTemplate(true);
    try {
      const currentBg: DesignTemplate['background'] = {
        type: bgType === 'transparent' ? 'solid' : bgType,
        value: bgType === 'transparent' ? 'transparent' : bgType === 'gradient' ? bgGradient : bgType === 'solid' ? bgColor : bgImageUrl,
        overlayOpacity: bgOverlayOpacity,
      };
      const localTpl: DesignTemplate = {
        id: `tpl-custom-${Date.now()}`,
        name: newTemplateName.trim(),
        category: newTemplateCategory,
        aspectRatio,
        isBuiltIn: false,
        isCustom: true,
        background: currentBg,
        layers: JSON.parse(JSON.stringify(layers)),
        tags: ['Custom', 'Brand', newTemplateCategory],
      };

      if (activeBrand?.id) {
        try {
          const saved = await api.templates.create(activeBrand.id, {
            name: localTpl.name,
            category: newTemplateCategory,
            aspectRatio,
            background: currentBg,
            layers: localTpl.layers,
            tags: localTpl.tags,
          });
          setTemplatesList((prev) => [saved, ...prev]);
        } catch {
          setTemplatesList((prev) => [localTpl, ...prev]);
        }
      } else {
        setTemplatesList((prev) => [localTpl, ...prev]);
      }

      setIsSaveTemplateModalOpen(false);
      setNewTemplateName('');
      showStudioToast(`Saved "${localTpl.name}" as a reusable template!`, 'success');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleUseInPost = async () => {
    const brand = activeBrand || (brands && brands.length > 0 ? brands[0] : null);
    try {
      setIsExporting(true);
      const canvas = await renderToCanvas({ scale: 1 });
      const dataUrl = canvas.toDataURL('image/png');
      const fileName = `${designTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`;
      const currentBg = {
        type: bgType,
        value: bgType === 'gradient' ? bgGradient : bgType === 'solid' ? bgColor : bgImageUrl,
        overlayOpacity: bgOverlayOpacity,
      };
      const clonedLayers = JSON.parse(JSON.stringify(layers));

      let asset: any = {
        id: `local-${Date.now()}`,
        brandId: brand?.id || 'default',
        fileName,
        publicUrl: dataUrl,
        thumbnailUrl: dataUrl,
        mimeType: 'image/png',
        mediaType: 'image',
        fileSizeBytes: Math.round(dataUrl.length * 0.75),
        metadata: {
          title: designTitle,
          width: activeRatioConfig.width,
          height: activeRatioConfig.height,
          aspectRatio,
          source: 'canva_studio',
          editableLayers: clonedLayers,
          layers: clonedLayers,
          editableBackground: currentBg,
          background: currentBg,
        },
      };

      if (brand?.id) {
        try {
          asset = await api.media.create(brand.id, {
            fileName,
            publicUrl: dataUrl,
            thumbnailUrl: dataUrl,
            mimeType: 'image/png',
            mediaType: 'image',
            fileSizeBytes: Math.round(dataUrl.length * 0.75),
            metadata: asset.metadata,
          });
        } catch {}
      }

      if (onUseInPost) onUseInPost(asset);
      if (onCreatePost) onCreatePost(asset);
      onClose();
    } catch (err: any) {
      showStudioToast('Could not send design to Content Studio: ' + (err?.message || 'Error'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger Live Animation Playback on Canvas
  const triggerAnimationPreview = () => {
    setIsPlayingAnimation(true);
    setAnimationPlayKey((k) => k + 1);
    setTimeout(() => {
      setIsPlayingAnimation(false);
    }, 2800);
  };

  // Keyboard Shortcuts (Undo, Redo, Delete, Duplicate, Nudge)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const inInput =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey && !inInput) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (isMod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) && !inInput) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (inInput) return;

      if (!selectedLayerId) return;
      const cur = layers.find((l) => l.id === selectedLayerId);
      if (!cur || cur.locked) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedLayer();
      } else if (isMod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedLayer();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        if (e.key === 'ArrowUp') updateSelectedLayer({ y: Math.max(2, cur.y - step) });
        if (e.key === 'ArrowDown') updateSelectedLayer({ y: Math.min(98, cur.y + step) });
        if (e.key === 'ArrowLeft') updateSelectedLayer({ x: Math.max(2, cur.x - step) });
        if (e.key === 'ArrowRight') updateSelectedLayer({ x: Math.min(98, cur.x + step) });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, selectedLayerId, layers, historyIndex, history]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={isEmbedded ? 'canva-embedded-container' : 'canva-modal-backdrop'}
      onClick={isEmbedded ? undefined : () => setIsConfirmCloseOpen(true)}
    >
      <div
        className={`canva-studio-window studio-light-theme ${isEmbedded ? 'canva-studio-embedded' : 'animate-fade-in'}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsSaveMenuOpen(false);
          setIsExportMenuOpen(false);
          setIsResizeMenuOpen(false);
        }}
      >
        {/* Hidden File Upload Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }}
          onChange={(e) => handleComputerFileUpload(e, false)}
        />
        <input
          ref={replaceImageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }}
          onChange={(e) => handleComputerFileUpload(e, true)}
        />

        {/* Floating Status Toast */}
        {studioToast && (
          <div
            className="canva-studio-toast"
            style={{
              position: 'absolute',
              top: '62px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: studioToast.type === 'error' ? '#dc2626' : '#0f172a',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
            }}
          >
            {studioToast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} color="#34d399" />}
            <span>{studioToast.message}</span>
            <button
              type="button"
              onClick={() => setStudioToast(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* =====================================================================
            2. PROFESSIONAL TOP TOOLBAR
           ===================================================================== */}
        <header className="canva-header">
          {/* Left Group: Studio Brand, Format Selector, Resize, Undo/Redo */}
          <div className="canva-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <PenTool size={15} />
              </div>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                AI Design Studio
              </span>
            </div>

            <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

            {/* Social Media Design Size Selector */}
            <select
              aria-label="Social media design size selector"
              className="form-select canva-ratio-select"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              style={{
                height: '32px',
                padding: '0 6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                minWidth: '132px',
                maxWidth: '168px',
                cursor: 'pointer',
              }}
              title="Select Social Media Design Format"
            >
              <optgroup label="Social Media Formats">
                {DESIGN_FORMAT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name} ({p.width}×{p.height})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Standard Ratios">
                <option value="1:1">📸 1:1 Square (1080×1080)</option>
                <option value="4:5">📱 4:5 Portrait (1080×1350)</option>
                <option value="9:16">⚡ 9:16 Story (1080×1920)</option>
                <option value="16:9">▶️ 16:9 Widescreen (1280×720)</option>
                <option value="1.91:1">👍 1.91:1 Social Banner (1200×630)</option>
              </optgroup>
            </select>

            {/* Resize Design Button + Popover */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsResizeMenuOpen(!isResizeMenuOpen)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: isResizeMenuOpen ? '#eef2ff' : '#ffffff',
                  color: '#334155',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
                title="Resize Design Canvas"
              >
                <Maximize2 size={13} color="#4f46e5" />
                <span className="canva-header-label-responsive">Resize</span>
              </button>

              {isResizeMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '38px',
                    left: 0,
                    zIndex: 120,
                    width: '250px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.15)',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                    Smart Resize Design
                  </div>
                  {DESIGN_FORMAT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setAspectRatio(preset.id);
                        setIsResizeMenuOpen(false);
                        showStudioToast(`Resized canvas to ${preset.name} (${preset.width}×${preset.height}px)`, 'success');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: aspectRatio === preset.id ? '#eef2ff' : 'transparent',
                        color: aspectRatio === preset.id ? '#4f46e5' : '#334155',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>
                        {preset.icon} {preset.name}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Undo / Redo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                style={{
                  width: '30px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: historyIndex <= 0 ? '#cbd5e1' : '#334155',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                }}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                style={{
                  width: '30px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: historyIndex >= history.length - 1 ? '#cbd5e1' : '#334155',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
                }}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={14} />
              </button>
            </div>
          </div>

          {/* Center: Editable Design Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 130px', maxWidth: '200px', minWidth: '80px' }}>
            <input
              type="text"
              aria-label="Design title"
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              placeholder="Untitled Design"
              className="form-input"
              style={{
                height: '32px',
                padding: '0 8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textAlign: 'center',
                width: '100%',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
              title="Click to rename design project"
            />
          </div>

          {/* Right Group: Auto Brand, Animation, Preview, Save, Export, Use in Post */}
          <div className="canva-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {/* Auto Brand */}
            <button
              type="button"
              onClick={applyBrandKitToCanvas}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #c7d2fe',
                background: '#eef2ff',
                color: '#4f46e5',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Apply Brand Kit colors, fonts, and logo"
            >
              <Sparkles size={13} />
              <span className="canva-header-label-responsive">Auto Brand</span>
            </button>

            {/* Animation (Hidden when a static-only export format menu is locked, otherwise accessible) */}
            <button
              type="button"
              onClick={() => setIsAnimationPanelOpen(!isAnimationPanelOpen)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: isAnimationPanelOpen ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                background: isAnimationPanelOpen ? '#eef2ff' : '#ffffff',
                color: isAnimationPanelOpen ? '#4f46e5' : '#334155',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Configure Element Animations & Motion"
            >
              <Film size={13} color="#7c3aed" />
              <span className="canva-header-label-responsive">Animation</span>
            </button>

            {/* Preview */}
            <button
              type="button"
              onClick={() => {
                setIsPreviewModalOpen(true);
                triggerAnimationPreview();
              }}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Full-Screen Design & Animation Preview"
            >
              <Eye size={13} />
              <span className="canva-header-label-responsive">Preview</span>
            </button>

            {/* Save Dropdown (Editable Project / Template / Open Saved) */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="canva-save-btn"
                onClick={() => {
                  setIsSaveMenuOpen(!isSaveMenuOpen);
                  setIsExportMenuOpen(false);
                }}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Save Editable Project or Reusable Template"
              >
                <Save size={13} color="#4f46e5" />
                <span>Save</span>
                <ChevronDown size={12} />
              </button>

              {isSaveMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '38px',
                    right: 0,
                    zIndex: 130,
                    width: '255px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {designValidationIssues.length > 0 ? (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '0.66rem',
                        color: '#92400e',
                      }}
                    >
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <AlertTriangle size={11} color="#d97706" />
                        <span>{designValidationIssues.length} Design Check Warning(s)</span>
                      </div>
                      <div style={{ maxHeight: '64px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {designValidationIssues.slice(0, 3).map((iss) => (
                          <div
                            key={iss.id}
                            onClick={() => {
                              if (iss.layerId) setSelectedLayerId(iss.layerId);
                            }}
                            style={{ cursor: iss.layerId ? 'pointer' : 'default', lineHeight: 1.25 }}
                          >
                            • {iss.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        fontSize: '0.65rem',
                        color: '#166534',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={11} color="#16a34a" />
                      <span>Design Validated • Ready to save</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveEditableProject}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#0f172a',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Save size={14} color="#4f46e5" />
                    <div>
                      <div>Save Editable Project</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>
                        Preserves all layers & text
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSaveMenuOpen(false);
                      setNewTemplateName(designTitle || 'Custom Brand Template');
                      setIsSaveTemplateModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#0f172a',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <BookmarkPlus size={14} color="#db2777" />
                    <div>
                      <div>Save as Reusable Template</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>
                        Add to Brand Template Library
                      </div>
                    </div>
                  </button>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '3px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      setIsSaveMenuOpen(false);
                      setIsSavedProjectsModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#f8fafc',
                      color: '#4f46e5',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FolderOpen size={14} /> Open Saved Projects
                    </span>
                    <span
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        fontSize: '0.66rem',
                      }}
                    >
                      {savedProjects.length}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Export Dropdown (PNG, Transparent PNG, JPG, PDF, Animated) */}
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="canva-export-btn"
                onClick={() => {
                  setIsExportMenuOpen(!isExportMenuOpen);
                  setIsSaveMenuOpen(false);
                }}
                disabled={isExporting}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Export Image or PDF"
              >
                {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>Export</span>
                <ChevronDown size={12} />
              </button>

              {isExportMenuOpen && (
                <div
                  className="canva-export-menu-dropdown"
                  style={{
                    position: 'absolute',
                    top: '38px',
                    right: 0,
                    zIndex: 130,
                    width: '275px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                    Export & Download Design
                  </div>

                  {designValidationIssues.length > 0 ? (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '0.66rem',
                        color: '#92400e',
                      }}
                    >
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <AlertTriangle size={11} color="#d97706" />
                        <span>{designValidationIssues.length} Layout Warning(s) Detected</span>
                      </div>
                      <div style={{ maxHeight: '72px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {designValidationIssues.map((iss) => (
                          <div
                            key={iss.id}
                            onClick={() => {
                              if (iss.layerId) setSelectedLayerId(iss.layerId);
                            }}
                            style={{ cursor: iss.layerId ? 'pointer' : 'default', lineHeight: 1.25 }}
                          >
                            • {iss.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        fontSize: '0.66rem',
                        color: '#166534',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={11} color="#16a34a" />
                      <span>Design Validated • Bounds & Typography OK</span>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      File Format
                    </label>
                    <select
                      className="form-select"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      style={{ width: '100%', height: '32px', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      <option value="png">PNG — High Quality Image</option>
                      <option value="transparent_png">PNG — Transparent Background</option>
                      <option value="jpg">JPG — Compact Social Image</option>
                      <option value="pdf">PDF — Print & Document</option>
                      <option value="animated">MP4 / WebM — Animated Video Reel</option>
                    </select>
                  </div>

                  {exportFormat !== 'animated' && (
                    <div>
                      <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        Output Dimensions
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[1, 2].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => setExportScale(sc as 1 | 2)}
                            style={{
                              flex: 1,
                              padding: '5px',
                              borderRadius: '6px',
                              border: exportScale === sc ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                              background: exportScale === sc ? '#eef2ff' : '#f8fafc',
                              color: exportScale === sc ? '#4f46e5' : '#334155',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {sc}x ({activeRatioConfig.width * sc}×{activeRatioConfig.height * sc})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {exportFormat === 'animated' && (
                    <div style={{ fontSize: '0.68rem', color: '#4f46e5', background: '#eef2ff', padding: '6px 8px', borderRadius: '6px' }}>
                      ✨ Animation controls and timeline export enabled for video format.
                    </div>
                  )}

                  <button
                    type="button"
                    className="canva-download-action-btn"
                    onClick={() => handleExportDownload()}
                    disabled={isExporting}
                    style={{
                      width: '100%',
                      height: '34px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download size={14} />
                    <span>
                      Download {exportFormat === 'transparent_png' ? 'Transparent PNG' : exportFormat.toUpperCase()}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Use in Post (Primary CTA to Content Studio) */}
            <button
              type="button"
              onClick={handleUseInPost}
              disabled={isExporting}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
              }}
              title="Send completed design to HoaspForge Content Studio to schedule or publish"
            >
              <Send size={13} />
              <span>Use in Post</span>
            </button>

            {!isEmbedded && (
              <button
                type="button"
                onClick={() => setIsConfirmCloseOpen(true)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Close Studio"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* =====================================================================
            MAIN THREE-SECTION WORKSPACE BODY
           ===================================================================== */}
        <div className="canva-body">
          {/* ===================================================================
              1A. LEFT SIDEBAR — 12 DESIGN TOOLS & DRAWER
             =================================================================== */}
          <div className="canva-left-container">
            <aside className="canva-left-tabs" aria-label="Design Tools Navigation">
              {LEFT_SIDEBAR_TOOLS.map((tool) => {
                const IconComp = tool.icon;
                const isActive = activeTab === tool.id && isLeftDrawerOpen;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`canva-tab-btn canva-tab-${tool.id} ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (activeTab === tool.id && isLeftDrawerOpen) {
                        setIsLeftDrawerOpen(false);
                      } else {
                        setActiveTab(tool.id);
                        setIsLeftDrawerOpen(true);
                        if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
                          setIsRightPanelCollapsed(true);
                        }
                      }
                    }}
                    title={tool.tooltip}
                  >
                    <IconComp size={17} />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </aside>

            {/* Left Contextual Tool Drawer */}
            <div className={`canva-left-drawer ${isLeftDrawerOpen ? 'pinned' : 'collapsed'}`}>
              <div className="canva-left-drawer-header">
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                  {LEFT_SIDEBAR_TOOLS.find((t) => t.id === activeTab)?.label || 'Tools'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLeftDrawerOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                  }}
                  title="Collapse Tool Panel"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>

              {/* 1. TEMPLATES PANEL */}
              {activeTab === 'templates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={14}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search Instagram, Product, Festival..."
                      style={{ width: '100%', height: '32px', paddingLeft: '30px', fontSize: '0.75rem' }}
                    />
                  </div>

                  {/* Sub-tabs: All / Recent / Favorites / Brand */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'recent', label: 'Recent' },
                      { id: 'favorites', label: '★ Saved' },
                      { id: 'brand', label: 'Brand' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setTemplateSubTab(st.id as any)}
                        style={{
                          padding: '4px 2px',
                          borderRadius: '4px',
                          border: 'none',
                          background: templateSubTab === st.id ? '#ffffff' : 'transparent',
                          color: templateSubTab === st.id ? '#4f46e5' : '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: templateSubTab === st.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* 12 Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {STUDIO_TEMPLATE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setStudioCategoryFilter(cat.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: studioCategoryFilter === cat.id ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                          background: studioCategoryFilter === cat.id ? '#eef2ff' : '#f8fafc',
                          color: studioCategoryFilter === cat.id ? '#4f46e5' : '#334155',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Template Cards Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredTemplates.map((tpl) => {
                      const isFav = favoriteTemplateIds.includes(tpl.id);
                      const rawHead =
                        tpl.layers?.find((l: any) => l.type === 'text' && (l.fontSize >= 30 || l.id?.includes('head')))?.text ||
                        tpl.name;
                      const headText = sanitizeTemplatePlaceholderText(rawHead, tpl.name);
                      return (
                        <div
                          key={tpl.id}
                          className="canva-template-card"
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            background: '#ffffff',
                            boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                          }}
                        >
                          {/* Visual Thumbnail Preview */}
                          <div
                            onClick={() => handleUseTemplate(tpl)}
                            style={{
                              height: '110px',
                              background: tpl.background?.value || 'linear-gradient(135deg, #312e81, #4f46e5)',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              position: 'relative',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(15,23,42,0.75)',
                                  color: '#ffffff',
                                }}
                              >
                                {tpl.aspectRatio || '1:1'} • {tpl.layers?.length || 4} layers
                              </span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewTemplateItem(tpl);
                                  }}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.9)',
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                  title="Preview Template before applying"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => toggleFavoriteTemplate(tpl.id, e)}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.9)',
                                    color: isFav ? '#f59e0b' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                  title={isFav ? 'Remove from Favorites' : 'Save to Favorites'}
                                >
                                  <Star size={12} fill={isFav ? '#f59e0b' : 'none'} />
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                lineHeight: 1.2,
                                textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {headText}
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {tpl.name}
                              </div>
                              <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Editable Template</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUseTemplate(tpl)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #c7d2fe',
                                background: '#eef2ff',
                                color: '#4f46e5',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. DESIGN ELEMENTS PANEL */}
              {activeTab === 'elements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Click any promotional sticker, badge, or callout to add it as an editable element.
                  </div>

                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>Promotional Badges & Stickers</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      { label: '🔥 FLASH SALE', bg: '#ef4444', fg: '#ffffff' },
                      { label: '⚡ 50% OFF TODAY', bg: '#facc15', fg: '#0f172a' },
                      { label: '✨ NEW ARRIVAL', bg: '#4f46e5', fg: '#ffffff' },
                      { label: '★ 5.0 VERIFIED', bg: '#10b981', fg: '#ffffff' },
                      { label: '🎁 FESTIVAL OFFER', bg: '#f97316', fg: '#ffffff' },
                      { label: '🔴 LIVE WEBINAR', bg: '#db2777', fg: '#ffffff' },
                    ].map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => {
                          const id = `layer-el-${Date.now()}`;
                          const next: CanvasLayer[] = [
                            ...layers,
                            {
                              id,
                              type: 'text',
                              name: b.label,
                              text: b.label,
                              x: 50,
                              y: 25,
                              width: 46,
                              height: 7,
                              rotation: 0,
                              opacity: 1,
                              visible: true,
                              fontFamily: "'Outfit', sans-serif",
                              fontSize: 15,
                              fontWeight: '800',
                              textAlign: 'center',
                              color: b.fg,
                              backgroundColor: b.bg,
                              backgroundPadding: 8,
                              borderRadius: 9999,
                              letterSpacing: 1.5,
                            },
                          ];
                          setLayers(next);
                          setSelectedLayerId(id);
                          pushHistory(next);
                        }}
                        style={{
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            background: b.bg,
                            color: b.fg,
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {b.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>Frames & Decorative Dividers</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => addShapeLayer('rounded_rect')}
                      className="corel-shape-card"
                      style={{ height: '56px' }}
                    >
                      <Square size={16} />
                      <span className="corel-shape-label">Glass Card Frame</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeLayer('ribbon')}
                      className="corel-shape-card"
                      style={{ height: '56px' }}
                    >
                      <Tag size={16} />
                      <span className="corel-shape-label">Ribbon Banner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeLayer('speech_bubble')}
                      className="corel-shape-card"
                      style={{ height: '56px' }}
                    >
                      <Quote size={16} />
                      <span className="corel-shape-label">Quote Callout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeLayer('line')}
                      className="corel-shape-card"
                      style={{ height: '56px' }}
                    >
                      <Minus size={16} />
                      <span className="corel-shape-label">Accent Divider</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. TEXT & TYPOGRAPHY PANEL */}
              {activeTab === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="canva-add-headline-btn"
                    onClick={() => addTextLayer('headline')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    + Add a Headline
                  </button>
                  <button
                    type="button"
                    className="canva-add-subtitle-btn"
                    onClick={() => addTextLayer('subtitle')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#334155',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    + Add a Subtitle
                  </button>
                  <button
                    type="button"
                    className="canva-add-body-btn"
                    onClick={() => addTextLayer('body')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    + Add body text paragraph
                  </button>

                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                    Curated Font Combinations
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { title: 'Editorial Luxury', sub: 'Playfair Display + Plus Jakarta', preset: 'quote' as const },
                      { title: '10X Metric Spotlight', sub: 'Space Grotesk Bold Callout', preset: 'metric' as const },
                      { title: 'VIP Promo Pill Badge', sub: 'Outfit Heavy Rounded Tag', preset: 'badge' as const },
                    ].map((fc) => (
                      <button
                        key={fc.title}
                        type="button"
                        onClick={() => addTextLayer(fc.preset)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{fc.title}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{fc.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. PHOTOS & STOCK IMAGES PANEL */}
              {activeTab === 'photos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={14}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      placeholder="Search stock photos..."
                      style={{ width: '100%', height: '32px', paddingLeft: '30px', fontSize: '0.75rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['All', 'Product', 'Business', 'Luxury', 'Events'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setStockCategoryFilter(cat)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          border: stockCategoryFilter === cat ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                          background: stockCategoryFilter === cat ? '#eef2ff' : '#f8fafc',
                          color: stockCategoryFilter === cat ? '#4f46e5' : '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {selectedLayer?.type === 'image' && (
                    <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#eef2ff', color: '#4f46e5', fontSize: '0.7rem', fontWeight: 600 }}>
                      💡 Click any photo below to replace the selected image layer in-place.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {CURATED_STOCK_PHOTOS.filter((p) => {
                      if (stockCategoryFilter !== 'All' && p.category !== stockCategoryFilter) return false;
                      if (stockSearchQuery.trim() && !p.title.toLowerCase().includes(stockSearchQuery.toLowerCase())) return false;
                      return true;
                    }).map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#f8fafc',
                        }}
                      >
                        <img
                          src={photo.url}
                          alt={photo.title}
                          onClick={() => addImageOverlayLayer(photo.url, 50, 50, photo.title)}
                          style={{ width: '100%', height: '84px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                        />
                        <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {photo.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setBgType('image');
                              setBgImageUrl(photo.url);
                              showStudioToast('Set photo as canvas background', 'success');
                            }}
                            style={{
                              border: 'none',
                              background: '#e2e8f0',
                              color: '#0f172a',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            title="Use as Canvas Background"
                          >
                            BG
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. UPLOADS & MEDIA LIBRARY PANEL */}
              {activeTab === 'uploads' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px dashed #6366f1',
                      background: '#eef2ff',
                      color: '#4f46e5',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={15} />
                    <span>Upload Image from Computer</span>
                  </button>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', textAlign: 'center' }}>
                    Supports PNG, JPG, WEBP, SVG • Max 15MB
                  </div>

                  {/* Organize & Filter Uploaded / Library Assets */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'upload', label: 'Uploads' },
                      { id: 'library', label: 'Library' },
                      { id: 'ai', label: 'AI' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setUploadSourceFilter(f.id as any)}
                        style={{
                          padding: '4px 2px',
                          borderRadius: '4px',
                          border: 'none',
                          background: uploadSourceFilter === f.id ? '#ffffff' : 'transparent',
                          color: uploadSourceFilter === f.id ? '#4f46e5' : '#475569',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    value={uploadSearchQuery}
                    onChange={(e) => setUploadSearchQuery(e.target.value)}
                    placeholder="Filter uploaded assets..."
                    style={{ width: '100%', height: '30px', padding: '0 8px', fontSize: '0.74rem' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {uploadedAssets
                      .filter((a) => {
                        if (uploadSourceFilter !== 'all' && a.source !== uploadSourceFilter) return false;
                        if (uploadSearchQuery.trim() && !a.name.toLowerCase().includes(uploadSearchQuery.toLowerCase()))
                          return false;
                        return true;
                      })
                      .map((asset) => (
                        <div
                          key={asset.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#ffffff',
                            position: 'relative',
                          }}
                        >
                          <img
                            src={asset.url}
                            alt={asset.name}
                            onClick={() => addImageOverlayLayer(asset.url, 50, 50, asset.name)}
                            style={{ width: '100%', height: '80px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                          />
                          <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {asset.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setUploadedAssets((prev) => prev.filter((item) => item.id !== asset.id))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                              title="Remove asset"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 6. BACKGROUNDS PANEL */}
              {activeTab === 'backgrounds' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Transparent Canvas (Logo & Sticker Mode)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBgType('transparent');
                        setBgOverlayOpacity(0);
                        setExportFormat('transparent_png');
                        showStudioToast('Switched canvas to Transparent Mode! Exports will have no background.', 'success');
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: bgType === 'transparent' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        background:
                          'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 14px 14px',
                        color: '#0f172a',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ background: 'rgba(255,255,255,0.9)', padding: '2px 8px', borderRadius: '4px' }}>
                        {bgType === 'transparent' ? '✓ Transparent Background Active' : '🏁 Make Canvas Transparent (No BG)'}
                      </span>
                    </button>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Solid Background Color
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => {
                          setBgType('solid');
                          setBgColor(e.target.value);
                        }}
                        style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      {['#0f172a', '#1e1b4b', '#312e81', '#064e3b', '#7c2d12', '#ffffff', '#f8fafc', '#fef3c7'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`color-swatch-btn ${bgType === 'solid' && bgColor === c ? 'active' : ''}`}
                          style={{ background: c, width: '24px', height: '24px' }}
                          onClick={() => {
                            setBgType('solid');
                            setBgColor(c);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Studio Gradients
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {GRADIENT_PRESETS.map((g) => (
                        <button
                          key={g.name}
                          type="button"
                          onClick={() => {
                            setBgType('gradient');
                            setBgGradient(g.css);
                          }}
                          style={{
                            height: '44px',
                            borderRadius: '8px',
                            background: g.css,
                            border: bgType === 'gradient' && bgGradient === g.css ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            color: g.name.includes('Light') ? '#0f172a' : '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textShadow: g.name.includes('Light') ? 'none' : '0 1px 3px rgba(0,0,0,0.6)',
                          }}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      <span>Contrast Dimmer Overlay</span>
                      <span>{Math.round(bgOverlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.85"
                      step="0.05"
                      value={bgOverlayOpacity}
                      onChange={(e) => setBgOverlayOpacity(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#4f46e5' }}
                    />
                  </div>
                </div>
              )}

              {/* 7. SHAPES & GRAPHICS PANEL */}
              {activeTab === 'shapes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Click or drag any vector shape onto the canvas.
                  </div>
                  <div className="corel-shapes-grid">
                    {CORELDRAW_SHAPES.map((sh) => (
                      <button
                        key={sh.type}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ layerType: 'shape', shapeType: sh.type })
                          );
                        }}
                        onClick={() => addShapeLayer(sh.type)}
                        className="corel-shape-card"
                      >
                        <span style={{ fontSize: '1.25rem' }}>{sh.icon}</span>
                        <span className="corel-shape-label">{sh.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. ICONS PANEL */}
              {activeTab === 'icons' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={iconSearchQuery}
                    onChange={(e) => setIconSearchQuery(e.target.value)}
                    placeholder="Search icons (Star, Award, Flame...)"
                    style={{ width: '100%', height: '32px', padding: '0 10px', fontSize: '0.75rem' }}
                  />
                  <div className="corel-shapes-grid">
                    {Object.keys(ICONS_MAP)
                      .filter((k) => !iconSearchQuery.trim() || k.toLowerCase().includes(iconSearchQuery.toLowerCase()))
                      .map((iconName) => {
                        const IconC = ICONS_MAP[iconName];
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => addIconLayer(iconName)}
                            className="corel-shape-card"
                          >
                            <IconC size={20} />
                            <span className="corel-shape-label">{iconName}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 9. BRAND KIT PANEL */}
              {activeTab === 'brand' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={applyBrandKitToCanvas}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Apply Brand Kit to Design</span>
                  </button>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Business / Brand Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={customBrandName || activeBrand?.name || ''}
                      onChange={(e) => setCustomBrandName(e.target.value)}
                      placeholder="Your Business Name"
                      style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '0.76rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Brand Logo URL
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={customBrandLogo}
                        onChange={(e) => setCustomBrandLogo(e.target.value)}
                        placeholder="https://.../logo.png"
                        style={{ flex: 1, height: '30px', padding: '0 8px', fontSize: '0.72rem' }}
                      />
                      {customBrandLogo && (
                        <button
                          type="button"
                          onClick={() => addImageOverlayLayer(customBrandLogo, 18, 14, 'Brand Logo')}
                          style={{
                            padding: '0 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Brand Colors (Primary, Secondary, Accent)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { label: 'Primary', val: customPrimaryColor, set: setCustomPrimaryColor },
                        { label: 'Secondary', val: customSecondaryColor, set: setCustomSecondaryColor },
                        { label: 'Accent', val: customAccentColor, set: setCustomAccentColor },
                      ].map((c) => (
                        <div
                          key={c.label}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <input
                            type="color"
                            value={c.val}
                            onChange={(e) => c.set(e.target.value)}
                            style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                          />
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569' }}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Brand Heading Font
                    </label>
                    <select
                      className="form-select"
                      value={customHeadingFont}
                      onChange={(e) => setCustomHeadingFont(e.target.value)}
                      style={{
                        width: '100%',
                        height: '32px',
                        padding: '0 8px',
                        lineHeight: 1.25,
                        fontSize: '0.75rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {SYSTEM_AND_WEB_FONTS.map((f) => (
                        <option key={f.name} value={f.family}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => createEditableTransparentLogoOnCanvas(customBrandName || activeBrand?.name)}
                    style={{
                      width: '100%',
                      padding: '9px',
                      borderRadius: '8px',
                      border: '1px solid #818cf8',
                      background: '#eef2ff',
                      color: '#4f46e5',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Wand2 size={13} />
                    <span>Create AI Transparent Brand Logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const c = await renderToCanvas({ transparentBg: true, scale: 1 });
                        const dataUrl = c.toDataURL('image/png');
                        setCustomBrandLogo(dataUrl);
                        setUploadedAssets((prev) => [
                          {
                            id: `brand-logo-${Date.now()}`,
                            name: `${customBrandName || activeBrand?.name || 'Brand'} Transparent Logo`,
                            url: dataUrl,
                            source: 'ai',
                            createdAt: new Date().toISOString(),
                          },
                          ...prev,
                        ]);
                        showStudioToast('Saved transparent canvas logo to Brand Kit & Uploads!', 'success');
                      } catch {
                        showStudioToast('Could not save canvas as Brand Logo', 'error');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #10b981',
                      background: '#ecfdf5',
                      color: '#047857',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ShieldCheck size={13} />
                    <span>Save Canvas as Transparent Brand Logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={saveBrandKitSettings}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Save Brand Kit Defaults
                  </button>
                </div>
              )}

              {/* 10. AI IMAGE GENERATOR PANEL */}
              {activeTab === 'ai_image' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Describe Image to Generate
                    </label>
                    <textarea
                      rows={3}
                      value={aiImagePrompt}
                      onChange={(e) => setAiImagePrompt(e.target.value)}
                      placeholder="e.g. Luxury watch on obsidian podium with dramatic studio lighting..."
                      style={{ width: '100%', padding: '8px', fontSize: '0.75rem', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Visual Style
                    </label>
                    <select
                      aria-label="Visual Style"
                      className="form-select"
                      value={aiImageStyle}
                      onChange={(e) => setAiImageStyle(e.target.value)}
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 8px',
                        lineHeight: 1.25,
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <option value="Transparent Logo">Transparent Logo & Emblem (No BG)</option>
                      <option value="Transparent Sticker">Transparent Seal / Sticker (No BG)</option>
                      <option value="Product Studio">Product Studio Lighting</option>
                      <option value="Luxury 3D">Luxury Gold & 3D Render</option>
                      <option value="Photorealistic">Photorealistic Editorial</option>
                      <option value="Minimal Vector">Minimal Brand Graphic</option>
                      <option value="Festival Glow">Festival & Celebration Glow</option>
                    </select>
                  </div>

                  {/* Quick 1-Click Editable Transparent Logo Generator */}
                  <button
                    type="button"
                    onClick={() => createEditableTransparentLogoOnCanvas(aiImagePrompt)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #818cf8',
                      background: '#eef2ff',
                      color: '#4f46e5',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Create Editable Transparent Logo on Canvas</span>
                  </button>

                  {/* Placement Mode: Replace Existing Image vs Add as New Layer */}
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Canvas Image Placement
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setAiImageInsertMode('replace')}
                        style={{
                          padding: '5px 6px',
                          borderRadius: '4px',
                          border: 'none',
                          background: aiImageInsertMode === 'replace' ? '#ffffff' : 'transparent',
                          color: aiImageInsertMode === 'replace' ? '#4f46e5' : '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: aiImageInsertMode === 'replace' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        🔄 Replace Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiImageInsertMode('add')}
                        style={{
                          padding: '5px 6px',
                          borderRadius: '4px',
                          border: 'none',
                          background: aiImageInsertMode === 'add' ? '#ffffff' : 'transparent',
                          color: aiImageInsertMode === 'add' ? '#4f46e5' : '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: aiImageInsertMode === 'add' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        }}
                      >
                        ➕ Add New Layer
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateAiImage}
                    disabled={isGeneratingAiImage || !aiImagePrompt.trim()}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #db2777 100%)',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isGeneratingAiImage ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    <span>{isGeneratingAiImage ? 'Generating Visual...' : 'Generate AI Image'}</span>
                  </button>

                  {/* Active Canvas Images — Select or Delete Existing Images on Canvas */}
                  {(layers.some((l) => l.type === 'image') || bgType === 'image') && (
                    <div
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Active Images on Canvas</span>
                        <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Select or Delete</span>
                      </div>

                      {bgType === 'image' && bgImageUrl && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            padding: '5px 6px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <img src={bgImageUrl} alt="BG" style={{ width: '26px', height: '26px', borderRadius: '4px', objectFit: 'cover' }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Background Image
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={convertBgImageToSelectableLayer}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid #c7d2fe',
                                background: '#eef2ff',
                                color: '#4f46e5',
                                fontSize: '0.63rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Convert background image into a selectable, movable layer"
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              onClick={removeBackgroundImage}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '0.63rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                              title="Delete background image"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      )}

                      {layers
                        .filter((l) => l.type === 'image')
                        .map((imgLayer) => {
                          const isSel = imgLayer.id === selectedLayerId;
                          return (
                            <div
                              key={imgLayer.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '6px',
                                padding: '5px 6px',
                                background: isSel ? '#eef2ff' : '#ffffff',
                                border: isSel ? '1px solid #818cf8' : '1px solid #e2e8f0',
                                borderRadius: '6px',
                              }}
                            >
                              <div
                                onClick={() => setSelectedLayerId(imgLayer.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, cursor: 'pointer', flex: 1 }}
                              >
                                <img
                                  src={imgLayer.imageUrl}
                                  alt={imgLayer.name}
                                  style={{ width: '26px', height: '26px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                                />
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    color: isSel ? '#312e81' : '#334155',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {imgLayer.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLayerId(imgLayer.id)}
                                  style={{
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #c7d2fe',
                                    background: isSel ? '#4f46e5' : '#eef2ff',
                                    color: isSel ? '#ffffff' : '#4f46e5',
                                    fontSize: '0.63rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isSel ? 'Selected' : 'Select'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteLayerById(imgLayer.id)}
                                  style={{
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    fontSize: '0.63rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                  title="Delete this image from canvas"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {generatedAiImages.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                      {generatedAiImages.map((img) => (
                        <div
                          key={img.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#f8fafc',
                            position: 'relative',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setGeneratedAiImages((prev) => prev.filter((item) => item.id !== img.id))}
                            title="Delete generated image"
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '22px',
                              height: '22px',
                              borderRadius: '9999px',
                              border: 'none',
                              background: 'rgba(15, 23, 42, 0.72)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 2,
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                          <img
                            src={img.url}
                            alt={img.prompt}
                            onClick={() => addImageOverlayLayer(img.url, 50, 50, `AI ${img.style}`, aiImageInsertMode)}
                            style={{
                              width: '100%',
                              height: '90px',
                              objectFit: img.style.includes('Transparent') ? 'contain' : 'cover',
                              background: img.style.includes('Transparent')
                                ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 12px 12px'
                                : undefined,
                              padding: img.style.includes('Transparent') ? '4px' : 0,
                              cursor: 'pointer',
                              display: 'block',
                            }}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #e2e8f0' }}>
                            <button
                              type="button"
                              onClick={() => addImageOverlayLayer(img.url, 50, 50, `AI ${img.style}`, 'replace')}
                              style={{
                                padding: '4px 2px',
                                border: 'none',
                                borderRight: '1px solid #e2e8f0',
                                background: '#eef2ff',
                                color: '#4f46e5',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Replace existing image on canvas"
                            >
                              🔄 Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => addImageOverlayLayer(img.url, 50, 50, `AI ${img.style}`, 'add')}
                              style={{
                                padding: '4px 2px',
                                border: 'none',
                                background: '#f8fafc',
                                color: '#334155',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Add as a new image layer"
                            >
                              + Add New
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 11. AI DESIGN ASSISTANT PANEL (Clean sidebar experience, zero overlapping canvas bars) */}
              {activeTab === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
                    Describe any topic, product, offer, or instruction — AI will generate editable marketing copy and matching visuals on your canvas.
                  </div>

                  {/* Generation Scope Selector: Content + Image | Copy Only | Image Only */}
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      What should AI generate?
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '4px',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '6px',
                      }}
                    >
                      {[
                        { id: 'full' as const, label: '✨ Copy + Image' },
                        { id: 'copy_only' as const, label: '✍️ Copy Only' },
                        { id: 'image_only' as const, label: '🖼️ Image Only' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAiAssistantMode(m.id)}
                          style={{
                            padding: '5px 4px',
                            borderRadius: '4px',
                            border: 'none',
                            background: aiAssistantMode === m.id ? '#ffffff' : 'transparent',
                            color: aiAssistantMode === m.id ? '#4f46e5' : '#475569',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: aiAssistantMode === m.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      executeAiDesignInstruction();
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                  >
                    <textarea
                      rows={3}
                      value={aiInstructionText}
                      onChange={(e) => setAiInstructionText(e.target.value)}
                      placeholder='e.g. "Artisan coffee shop grand opening 30% off", "Summer skincare serum launch", or "Make this design more professional"'
                      style={{ width: '100%', padding: '8px', fontSize: '0.75rem', resize: 'vertical' }}
                    />
                    <button
                      type="submit"
                      disabled={isAiAssistantWorking}
                      style={{
                        width: '100%',
                        padding: '9px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: isAiAssistantWorking ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                      }}
                    >
                      {isAiAssistantWorking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>
                        {isAiAssistantWorking
                          ? 'Generating Content & Visuals...'
                          : aiAssistantMode === 'copy_only'
                            ? 'Generate Marketing Copy'
                            : aiAssistantMode === 'image_only'
                              ? 'Generate & Place AI Image'
                              : 'Generate Content & Image'}
                      </span>
                    </button>
                  </form>

                  {/* Quick Topic & Instruction Starters */}
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a' }}>
                    One-Click Content & Image Prompts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[
                      'Create a luxury skincare product ad with photo',
                      'Coffee shop grand opening 30% off poster',
                      'AI SaaS platform launch announcement',
                      'Create a promotional festival poster',
                      'Modern real estate luxury villa open house',
                      'Generate three design variations',
                      'Apply my brand colors',
                      'Change the background to a luxury style',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => executeAiDesignInstruction(prompt)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>“{prompt}”</span>
                        <ArrowRight size={11} color="#6366f1" />
                      </button>
                    ))}
                  </div>

                  {/* Generated Variations Preview Thumbnails */}
                  {aiGeneratedVariations.length > 0 && (
                    <div
                      style={{
                        marginTop: '6px',
                        paddingTop: '8px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                          Generated Variations ({aiGeneratedVariations.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setAiGeneratedVariations([])}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Discard All
                        </button>
                      </div>

                      {aiGeneratedVariations.map((v) => (
                        <div
                          key={v.id}
                          style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#ffffff',
                          }}
                        >
                          {/* Variation Visual Thumbnail with Image Preview */}
                          <div
                            onClick={() => applyGeneratedVariation(v)}
                            style={{
                              height: '86px',
                              background:
                                v.bgType === 'image'
                                  ? `linear-gradient(rgba(15,23,42,0.52), rgba(15,23,42,0.72)), url(${v.bgValue}) center/cover`
                                  : v.bgValue,
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  alignSelf: 'flex-start',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                }}
                              >
                                {v.tag}
                              </span>
                              <div
                                style={{
                                  color: '#ffffff',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  lineHeight: 1.2,
                                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {v.name}
                              </div>
                            </div>
                            {v.previewImageUrl && (
                              <img
                                src={v.previewImageUrl}
                                alt={v.name}
                                style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1.5px solid rgba(255,255,255,0.65)',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>

                          <div style={{ padding: '8px' }}>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '6px' }}>{v.desc}</div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => applyGeneratedVariation(v)}
                                style={{
                                  flex: 1,
                                  padding: '4px 6px',
                                  borderRadius: '5px',
                                  border: 'none',
                                  background: '#4f46e5',
                                  color: '#ffffff',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => setCompareVariationItem(v)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  border: '1px solid #cbd5e1',
                                  background: '#f8fafc',
                                  color: '#334155',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Compare
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAiGeneratedVariations((prev) => prev.filter((item) => item.id !== v.id))
                                }
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: '5px',
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                }}
                                title="Discard variation"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 12. LAYERS PANEL */}
              {activeTab === 'layers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
                      {layers.length} Editable Layers
                    </span>
                    <button
                      type="button"
                      onClick={toggleGroupAllVisibleLayers}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#334155',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {layers.some((l) => l.groupId) ? <Unlink2 size={12} /> : <Link2 size={12} />}
                      <span>{layers.some((l) => l.groupId) ? 'Ungroup All' : 'Group All'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {[...layers].reverse().map((layer) => {
                      const isSel = layer.id === selectedLayerId;
                      return (
                        <div
                          key={layer.id}
                          onClick={() => setSelectedLayerId(layer.id)}
                          className={`canva-layer-item ${isSel ? 'active' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                            {layer.type === 'text' && <Type size={13} color="#4f46e5" />}
                            {layer.type === 'image' && <ImageIcon size={13} color="#0284c7" />}
                            {layer.type === 'shape' && <Square size={13} color="#7c3aed" />}
                            {layer.type === 'icon' && <Smile size={13} color="#f59e0b" />}
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: isSel ? 700 : 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {layer.name}
                            </span>
                            {layer.groupId && (
                              <span style={{ fontSize: '0.58rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 4px', borderRadius: '3px' }}>
                                GRP
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLayerId(layer.id);
                                moveLayerOrder('up');
                              }}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                              title="Bring Forward"
                            >
                              <MoveUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLayerId(layer.id);
                                moveLayerOrder('down');
                              }}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                              title="Send Backward"
                            >
                              <MoveDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLayerById(layer.id, { locked: !layer.locked })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: layer.locked ? '#d97706' : '#64748b',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                              title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                            >
                              {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLayerById(layer.id, { visible: !layer.visible })}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                              title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                            >
                              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLayerById(layer.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                              title="Delete Layer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Main Canvas Background Layer Row — Always Present to Hide or Delete for Transparent Canvas */}
                    <div
                      className="canva-layer-item"
                      onClick={() => setActiveTab('backgrounds')}
                      style={{
                        background: bgType === 'transparent' ? '#f8fafc' : '#ffffff',
                        borderStyle: bgType === 'transparent' ? 'dashed' : 'solid',
                        borderColor: bgType === 'transparent' ? '#cbd5e1' : '#c7d2fe',
                        opacity: bgType === 'transparent' ? 0.78 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: '1px solid #94a3b8',
                            flexShrink: 0,
                            background:
                              bgType === 'transparent'
                                ? 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                                : bgType === 'solid'
                                  ? bgColor
                                  : bgType === 'gradient'
                                    ? bgGradient
                                    : `url(${bgImageUrl}) center/cover`,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            textDecoration: bgType === 'transparent' ? 'line-through' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Canvas Background
                        </span>
                        <span
                          style={{
                            fontSize: '0.56rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: bgType === 'transparent' ? '#e2e8f0' : '#eef2ff',
                            color: bgType === 'transparent' ? '#475569' : '#4f46e5',
                          }}
                        >
                          {bgType === 'transparent' ? 'Transparent' : bgType}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} onClick={(e) => e.stopPropagation()}>
                        {bgType === 'image' && bgImageUrl && (
                          <button
                            type="button"
                            onClick={convertBgImageToSelectableLayer}
                            style={{
                              padding: '2px 5px',
                              borderRadius: '4px',
                              border: '1px solid #c7d2fe',
                              background: '#eef2ff',
                              color: '#4f46e5',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Convert background image into a movable layer"
                          >
                            Layer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={toggleCanvasBackgroundVisibility}
                          aria-label={bgType === 'transparent' ? 'Show Canvas Background' : 'Hide Canvas Background (Make Transparent)'}
                          style={{
                            background: bgType === 'transparent' ? '#eef2ff' : 'none',
                            border: 'none',
                            color: bgType === 'transparent' ? '#4f46e5' : '#64748b',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title={bgType === 'transparent' ? 'Restore Canvas Background' : 'Hide Canvas Background (Make Transparent)'}
                        >
                          {bgType === 'transparent' ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={deleteMainCanvasBackground}
                          aria-label="Delete Canvas Background for Transparent Canvas"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: bgType === 'transparent' ? '#94a3b8' : '#ef4444',
                            cursor: 'pointer',
                            padding: '3px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete Canvas Background (Make Transparent)"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===================================================================
              1B. CENTER — MAIN DESIGN CANVAS WORKSPACE
             =================================================================== */}
          <div className="canva-center-area">
            {/* Slim Top Context & Dimensions Bar (No overlapping AI bars!) */}
            <div
              style={{
                height: '38px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, position: 'relative' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#334155',
                    background: '#f1f5f9',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {activeRatioConfig.icon} {activeRatioConfig.width} × {activeRatioConfig.height} px
                </span>

                {/* Real-Time Design Validation Status Pill */}
                <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setIsValidationPopoverOpen((v) => !v)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border:
                        designValidationIssues.length === 0
                          ? '1px solid #bbf7d0'
                          : '1px solid #fde68a',
                      background:
                        designValidationIssues.length === 0
                          ? '#f0fdf4'
                          : '#fffbeb',
                      color:
                        designValidationIssues.length === 0
                          ? '#166534'
                          : '#92400e',
                      fontSize: '0.67rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Inspect Design Validation Status"
                  >
                    {designValidationIssues.length === 0 ? (
                      <>
                        <CheckCircle2 size={11} color="#16a34a" />
                        <span>Layout Valid</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={11} color="#d97706" />
                        <span>{designValidationIssues.length} Warning{designValidationIssues.length > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>

                  {isValidationPopoverOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '28px',
                        left: 0,
                        zIndex: 140,
                        width: '290px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#0f172a' }}>
                          Design Validation Inspector
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsValidationPopoverOpen(false)}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      {designValidationIssues.length === 0 ? (
                        <div style={{ fontSize: '0.69rem', color: '#166534', background: '#f0fdf4', padding: '7px 8px', borderRadius: '6px' }}>
                          ✓ All elements have valid independent bounding boxes, safe canvas coordinates, and no overlapping text or CTA layers.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                          {designValidationIssues.map((iss) => (
                            <div
                              key={iss.id}
                              onClick={() => {
                                if (iss.layerId) setSelectedLayerId(iss.layerId);
                                setIsValidationPopoverOpen(false);
                              }}
                              style={{
                                fontSize: '0.68rem',
                                color: iss.severity === 'error' ? '#991b1b' : '#92400e',
                                background: iss.severity === 'error' ? '#fef2f2' : '#fffbeb',
                                border: iss.severity === 'error' ? '1px solid #fecaca' : '1px solid #fde68a',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                cursor: iss.layerId ? 'pointer' : 'default',
                              }}
                            >
                              {iss.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedLayer && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    • Selected: <strong style={{ color: '#4f46e5' }}>{selectedLayer.name}</strong>
                    {selectedLayer.locked && (
                      <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <Lock size={11} /> Locked
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Quick Layer Actions in Context Strip */}
              {selectedLayer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('left')}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Align Left"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('center-h')}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Center Horizontally"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedLayer('right')}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Align Right"
                  >
                    <AlignRight size={14} />
                  </button>
                  <div style={{ width: '1px', height: '14px', background: '#e2e8f0', margin: '0 2px' }} />
                  <button
                    type="button"
                    onClick={() => moveLayerOrder('front')}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Bring to Front"
                  >
                    <ChevronsUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLayerOrder('back')}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Send to Back"
                  >
                    <ChevronsDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedLayer({ locked: !selectedLayer.locked })}
                    style={{
                      background: selectedLayer.locked ? '#fef3c7' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: selectedLayer.locked ? '#d97706' : '#475569',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title={selectedLayer.locked ? 'Unlock Element' : 'Lock Element'}
                  >
                    {selectedLayer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={duplicateSelectedLayer}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Duplicate (Ctrl+D)"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedLayer}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Delete (Del)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Animation Timing Bar (Shown only when Animation button is toggled & not locked to static export) */}
            {isAnimationPanelOpen && (
              <div
                style={{
                  background: '#ffffff',
                  borderBottom: '1px solid #cbd5e1',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  zIndex: 35,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Film size={14} /> Element Animation:
                  </span>
                  {(['none', 'fade', 'slide_up', 'zoom_in', 'pop', 'float'] as const).map((eff) => {
                    const currentEff = selectedLayer?.animation?.entrance || 'none';
                    return (
                      <button
                        key={eff}
                        type="button"
                        disabled={!selectedLayer}
                        onClick={() =>
                          updateSelectedLayer({
                            animation: {
                              entrance: eff,
                              duration: selectedLayer?.animation?.duration || 0.8,
                              delay: selectedLayer?.animation?.delay || 0,
                            },
                          })
                        }
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          border: currentEff === eff ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                          background: currentEff === eff ? '#eef2ff' : '#f8fafc',
                          color: currentEff === eff ? '#4f46e5' : '#334155',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          cursor: selectedLayer ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {eff.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedLayer && (
                    <>
                      <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Duration:
                        <input
                          type="number"
                          min="0.2"
                          max="4"
                          step="0.1"
                          value={selectedLayer.animation?.duration ?? 0.8}
                          onChange={(e) =>
                            updateSelectedLayer({
                              animation: {
                                entrance: selectedLayer.animation?.entrance || 'fade',
                                duration: parseFloat(e.target.value) || 0.8,
                                delay: selectedLayer.animation?.delay || 0,
                              },
                            })
                          }
                          style={{ width: '48px', height: '24px', fontSize: '0.72rem', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        s
                      </label>
                      <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Delay:
                        <input
                          type="number"
                          min="0"
                          max="3"
                          step="0.1"
                          value={selectedLayer.animation?.delay ?? 0}
                          onChange={(e) =>
                            updateSelectedLayer({
                              animation: {
                                entrance: selectedLayer.animation?.entrance || 'fade',
                                duration: selectedLayer.animation?.duration || 0.8,
                                delay: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          style={{ width: '48px', height: '24px', fontSize: '0.72rem', padding: '0 4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        s
                      </label>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={triggerAnimationPreview}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={12} />
                    <span>Play Preview</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Canvas Viewport */}
            <div
              className="canva-viewport"
              ref={viewportRef}
              onMouseDown={(e) => {
                if (!isPanMode) return;
                setIsPanning(true);
                panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                const onMove = (me: MouseEvent) => {
                  setPanOffset({ x: me.clientX - panStartRef.current.x, y: me.clientY - panStartRef.current.y });
                };
                const onUp = () => {
                  setIsPanning(false);
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              style={{ cursor: isPanMode ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            >
              {/* Button to reopen collapsed Right Inspector */}
              {isRightPanelCollapsed && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRightPanelCollapsed(false);
                    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
                      setIsLeftDrawerOpen(false);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 30,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
                  }}
                >
                  <PanelRightOpen size={14} color="#4f46e5" />
                  <span>Inspector</span>
                </button>
              )}

              {/* Bottom Zoom & Pan Controls */}
              <div className="canva-zoom-toolbar">
                <button
                  type="button"
                  className={`canva-zoom-btn ${isPanMode ? 'active' : ''}`}
                  onClick={() => setIsPanMode(!isPanMode)}
                  title="Pan / Hand Tool"
                >
                  <Hand size={13} />
                </button>
                <button
                  type="button"
                  className="canva-zoom-btn"
                  onClick={() => {
                    setZoomLevel('fit');
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  title="Reset View"
                >
                  <RotateCcw size={12} />
                </button>
                <div style={{ width: '1px', height: '14px', background: '#e2e8f0', margin: '0 2px' }} />
                <button
                  type="button"
                  className="canva-zoom-btn"
                  onClick={() =>
                    setZoomLevel((p) => (p === 'fit' ? Math.max(0.3, autoFitScale - 0.1) : Math.max(0.3, p - 0.1)))
                  }
                  title="Zoom Out"
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  className={`canva-zoom-btn ${zoomLevel === 'fit' ? 'active' : ''}`}
                  onClick={() => setZoomLevel('fit')}
                  title="Fit to Screen"
                >
                  Fit ({displayZoomPct}%)
                </button>
                <button
                  type="button"
                  className="canva-zoom-btn"
                  onClick={() =>
                    setZoomLevel((p) => (p === 'fit' ? Math.min(2.2, autoFitScale + 0.1) : Math.min(2.2, p + 0.1)))
                  }
                  title="Zoom In"
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  className={`canva-zoom-btn ${zoomLevel === 1.0 ? 'active' : ''}`}
                  onClick={() => setZoomLevel(1.0)}
                >
                  100%
                </button>
              </div>

              {/* Scaled Artboard Container */}
              <div
                style={{
                  width: `${Math.round(baseDim.width * effectiveScale)}px`,
                  height: `${Math.round(baseDim.height * effectiveScale)}px`,
                  position: 'relative',
                  flexShrink: 0,
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
              >
                <div
                  key={animationPlayKey}
                  ref={canvasBoxRef}
                  className="canva-canvas-box"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isDragOverCanvas) setIsDragOverCanvas(true);
                  }}
                  onDragLeave={() => setIsDragOverCanvas(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverCanvas(false);
                    const raw = e.dataTransfer.getData('application/json');
                    if (!raw) return;
                    try {
                      const payload = JSON.parse(raw);
                      const rect = canvasBoxRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const dx = Math.round(Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100)));
                      const dy = Math.round(Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100)));
                      if (payload.layerType === 'shape') addShapeLayer(payload.shapeType, dx, dy);
                      else if (payload.layerType === 'text') addTextLayer(payload.preset || 'headline', dx, dy);
                      else if (payload.layerType === 'icon') addIconLayer(payload.iconName, dx, dy);
                      else if (payload.layerType === 'image') addImageOverlayLayer(payload.imageUrl, dx, dy);
                    } catch {}
                  }}
                  onClick={() => setSelectedLayerId(null)}
                  style={{
                    width: `${baseDim.width}px`,
                    height: `${baseDim.height}px`,
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                    borderRadius: '8px',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    overflow: 'hidden',
                    boxShadow: '0 12px 36px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                    background:
                      bgType === 'transparent'
                        ? 'repeating-conic-gradient(#cbd5e1 0% 25%, #f8fafc 0% 50%) 50% / 20px 20px'
                        : bgType === 'solid'
                          ? bgColor
                          : bgType === 'gradient'
                            ? bgGradient
                            : '#0f172a',
                    userSelect: 'none',
                  }}
                >
                  {/* Background Image */}
                  {bgType === 'image' && bgImageUrl && (
                    <img
                      src={bgImageUrl}
                      alt="Canvas Background"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Contrast Dimmer Overlay */}
                  {bgType !== 'transparent' && bgOverlayOpacity > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `rgba(0, 0, 0, ${bgOverlayOpacity})`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Smart Alignment & Snapping Guide Lines */}
                  {snapGuides.verticalCenter && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        width: '1.5px',
                        background: '#ec4899',
                        zIndex: 75,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {snapGuides.horizontalCenter && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        height: '1.5px',
                        background: '#ec4899',
                        zIndex: 75,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Render Editable Layers */}
                  {layers.map((layer) => {
                    if (!layer.visible) return null;
                    const isSelected = layer.id === selectedLayerId;

                    // Determine CSS animation when live playback is active
                    let animCss: string | undefined;
                    if (isPlayingAnimation && layer.animation && layer.animation.entrance !== 'none') {
                      const dur = layer.animation.duration || 0.8;
                      const del = layer.animation.delay || 0;
                      const mapName: Record<string, string> = {
                        fade: 'studioAnimFade',
                        slide_up: 'studioAnimSlideUp',
                        zoom_in: 'studioAnimZoomIn',
                        pop: 'studioAnimPop',
                        typewriter: 'studioAnimFade',
                        float: 'studioAnimFloat',
                      };
                      const kf = mapName[layer.animation.entrance];
                      if (kf) animCss = `${kf} ${dur}s cubic-bezier(0.16, 1, 0.3, 1) ${del}s both`;
                    }

                    return (
                      <div
                        key={layer.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                          if (layer.locked) return;
                          setIsDragging(true);

                          const rect = canvasBoxRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const initPositions = layers.map((l) => ({ id: l.id, x: l.x, y: l.y, groupId: l.groupId }));

                          const onMove = (me: MouseEvent) => {
                            const dx = ((me.clientX - startX) / rect.width) * 100;
                            const dy = ((me.clientY - startY) / rect.height) * 100;

                            let rawX = Math.round(Math.max(2, Math.min(98, layer.x + dx)));
                            let rawY = Math.round(Math.max(2, Math.min(98, layer.y + dy)));

                            // Snap to 50% center guides within 2%
                            const snapV = Math.abs(rawX - 50) <= 2;
                            const snapH = Math.abs(rawY - 50) <= 2;
                            if (snapV) rawX = 50;
                            if (snapH) rawY = 50;
                            setSnapGuides({ verticalCenter: snapV, horizontalCenter: snapH });

                            const actualDx = rawX - layer.x;
                            const actualDy = rawY - layer.y;

                            setLayers((prev) =>
                              prev.map((item) => {
                                const init = initPositions.find((p) => p.id === item.id);
                                if (!init) return item;
                                if (item.id === layer.id || (layer.groupId && item.groupId === layer.groupId)) {
                                  return {
                                    ...item,
                                    x: Math.round(Math.max(2, Math.min(98, init.x + actualDx))),
                                    y: Math.round(Math.max(2, Math.min(98, init.y + actualDy))),
                                  };
                                }
                                return item;
                              })
                            );
                          };

                          const onUp = () => {
                            setIsDragging(false);
                            setSnapGuides({ verticalCenter: false, horizontalCenter: false });
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                            setLayers((prev) => {
                              pushHistory(prev);
                              return prev;
                            });
                          };

                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        style={{
                          position: 'absolute',
                          left:
                            layer.type === 'text' && layer.backgroundColor && layer.backgroundFillMode === 'canvas'
                              ? '50%'
                              : `${layer.x}%`,
                          top:
                            layer.type === 'text' && layer.backgroundColor && layer.backgroundFillMode === 'canvas'
                              ? '50%'
                              : `${layer.y}%`,
                          width:
                            layer.type === 'text' && layer.backgroundColor && layer.backgroundFillMode === 'canvas'
                              ? '100%'
                              : `${layer.width}%`,
                          height:
                            layer.type === 'text' && layer.backgroundColor && layer.backgroundFillMode === 'canvas'
                              ? '100%'
                              : layer.type === 'shape' && layer.shapeType === 'line'
                                ? 'auto'
                                : `${layer.height || 14}%`,
                          minHeight: layer.type === 'text' && layer.height ? `${layer.height}%` : undefined,
                          display: layer.type === 'text' || layer.type === 'image' ? 'flex' : undefined,
                          alignItems: layer.type === 'text' ? 'stretch' : layer.type === 'image' ? 'center' : undefined,
                          justifyContent: layer.type === 'image' ? 'center' : undefined,
                          transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})`,
                          opacity: layer.opacity ?? 1,
                          cursor: layer.locked ? 'not-allowed' : isDragging && isSelected ? 'grabbing' : 'grab',
                          outline: isSelected
                            ? layer.locked
                              ? '2px dashed #f59e0b'
                              : '2px solid #4f46e5'
                            : '1px solid transparent',
                          outlineOffset: '3px',
                          borderRadius: '3px',
                          animation: animCss,
                        }}
                      >
                        {/* Show Selection Handles, Manual Rotation Handle & Quick Action Pill ONLY when selected and unlocked */}
                        {isSelected && !layer.locked && (
                          <>
                            {/* Interactive On-Canvas Manual Rotation Handle */}
                            <div className="canva-rotate-stem" />
                            <div
                              className="canva-rotate-handle"
                              title="Drag to rotate manually (or double-click to reset to 0°)"
                              aria-label="Rotate element manually"
                              onMouseDown={(e) => handleRotateStart(e, layer)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                updateSelectedLayer({ rotation: 0 });
                              }}
                            >
                              <RotateCw size={12} />
                            </div>
                            {(isRotatingLayer || (layer.rotation || 0) !== 0) && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '-52px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  background: '#0f172a',
                                  color: '#ffffff',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '999px',
                                  whiteSpace: 'nowrap',
                                  pointerEvents: 'none',
                                  zIndex: 35,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
                                }}
                              >
                                {layer.rotation || 0}°
                              </div>
                            )}

                            {/* Floating On-Canvas Quick Action Pill (Rotate, Duplicate, Delete) */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                bottom: '-34px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '999px',
                                padding: '2px 5px',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.18)',
                                zIndex: 35,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => updateSelectedLayer({ rotation: ((layer.rotation || 0) - 15) })}
                                title="Rotate -15°"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#334155',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '2px 4px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                }}
                              >
                                ↺ 15°
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedLayer({ rotation: ((layer.rotation || 0) + 15) })}
                                title="Rotate +15°"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#334155',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '2px 4px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                }}
                              >
                                ↻ 15°
                              </button>
                              <div style={{ width: '1px', height: '12px', background: '#e2e8f0' }} />
                              <button
                                type="button"
                                onClick={duplicateSelectedLayer}
                                title="Duplicate layer"
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#475569',
                                  padding: '2px 4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Copy size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={deleteSelectedLayer}
                                title="Delete layer"
                                aria-label="Delete selected layer on canvas"
                                style={{
                                  border: 'none',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  padding: '2px 6px',
                                  borderRadius: '999px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            <div
                              className="canva-resize-handle canva-resize-corner"
                              style={{ top: '-5px', left: '-5px', cursor: 'nwse-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'nw')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-corner"
                              style={{ top: '-5px', right: '-5px', cursor: 'nesw-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'ne')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-corner"
                              style={{ bottom: '-5px', left: '-5px', cursor: 'nesw-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'sw')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-corner"
                              style={{ bottom: '-5px', right: '-5px', cursor: 'nwse-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'se')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-edge-h"
                              style={{ top: '-3px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'n')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-edge-h"
                              style={{ bottom: '-3px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 's')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-edge-v"
                              style={{ left: '-3px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'w')}
                            />
                            <div
                              className="canva-resize-handle canva-resize-edge-v"
                              style={{ right: '-3px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                              onMouseDown={(e) => handleResizeStart(e, layer, 'e')}
                            />
                          </>
                        )}

                        {/* TEXT LAYER RENDER */}
                        {layer.type === 'text' && (() => {
                          const textMetrics = computeTextLayoutMetrics(layer, baseDim.width, baseDim.height);
                          const isFullCanvasText = Boolean(layer.backgroundColor && layer.backgroundFillMode === 'canvas');
                          return (
                            <div
                              contentEditable={isSelected && !layer.locked}
                              suppressContentEditableWarning
                              onBlur={(e) => updateSelectedLayer({ text: e.currentTarget.textContent || '' })}
                              style={{
                                width: '100%',
                                height: '100%',
                                minHeight: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                fontFamily: layer.fontFamily || "'Outfit', sans-serif",
                                fontSize: `${textMetrics.fontSizePx}px`,
                                fontWeight: layer.fontWeight || '700',
                                fontStyle: layer.fontStyle || 'normal',
                                textAlign: layer.textAlign || 'center',
                                color: layer.color || '#ffffff',
                                backgroundColor: layer.backgroundColor || 'transparent',
                                padding: layer.backgroundColor ? `${textMetrics.paddingPx}px` : '0',
                                borderRadius: isFullCanvasText ? '0px' : `${textMetrics.borderRadiusPx}px`,
                                textTransform: layer.textTransform || 'none',
                                letterSpacing: layer.letterSpacing ? `${textMetrics.letterSpacingPx}px` : 'normal',
                                lineHeight: textMetrics.lineHeightRatio,
                                textShadow: layer.shadowColor
                                  ? `0 ${Math.round(2 * textMetrics.unitScale)}px ${Math.round(textMetrics.shadowBlurPx)}px ${layer.shadowColor}`
                                  : 'none',
                                outline: 'none',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                overflow: 'hidden',
                              }}
                            >
                              {layer.text}
                            </div>
                          );
                        })()}

                        {/* SHAPE LAYER RENDER */}
                        {layer.type === 'shape' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {layer.shapeType === 'line' ? (
                              <div
                                style={{
                                  width: '100%',
                                  height: `${Math.max(2, layer.strokeWidth || 2)}px`,
                                  background: layer.fillColor || layer.strokeColor || '#8b5cf6',
                                }}
                              />
                            ) : (
                              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                {(() => {
                                  const fill = layer.fillColor || 'transparent';
                                  const stroke = (layer.strokeWidth || 0) > 0 ? layer.strokeColor || 'transparent' : 'none';
                                  const sw = (layer.strokeWidth || 0) * 0.8;
                                  const dash = layer.strokeDash === 'dashed' ? '6,4' : layer.strokeDash === 'dotted' ? '2,3' : undefined;
                                  if (layer.shapeType === 'circle') {
                                    return <ellipse cx="50" cy="50" rx="48" ry="48" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'pill') {
                                    return <rect x="1" y="1" width="98" height="98" rx="49" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'triangle') {
                                    return <polygon points="50,2 98,98 2,98" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'diamond') {
                                    return <polygon points="50,2 98,50 50,98 2,50" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'hexagon') {
                                    return <polygon points="50,2 95,26 95,74 50,98 5,74 5,26" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'star') {
                                    return <polygon points="50,2 63,35 98,37 70,59 81,94 50,73 19,94 30,59 2,37 37,35" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'ribbon') {
                                    return <path d="M 0 0 L 100 0 L 88 50 L 100 100 L 0 100 L 12 50 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'speech_bubble') {
                                    return <path d="M 2 12 C 2 6 6 2 14 2 L 86 2 C 94 2 98 6 98 12 L 98 70 C 98 76 94 80 86 80 L 40 80 L 25 98 L 25 80 L 14 80 C 6 80 2 76 2 70 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  if (layer.shapeType === 'arrow') {
                                    return <polygon points="2,32 60,32 60,10 98,50 60,90 60,68 2,68" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                  }
                                  const rx = layer.shapeType === 'rectangle' ? 0 : Math.min(45, (layer.borderRadius || 12) * 1.2);
                                  return <rect x="1" y="1" width="98" height="98" rx={rx} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />;
                                })()}
                              </svg>
                            )}
                          </div>
                        )}

                        {/* ICON LAYER RENDER */}
                        {layer.type === 'icon' && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                            {(() => {
                              const IconC = ICONS_MAP[layer.iconName || ''] || Sparkles;
                              return <IconC size={36} color={layer.iconColor || '#facc15'} />;
                            })()}
                          </div>
                        )}

                        {/* IMAGE LAYER RENDER */}
                        {layer.type === 'image' && layer.imageUrl && (
                          <img
                            src={layer.imageUrl}
                            alt={layer.name}
                            draggable={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              maxWidth: '100%',
                              maxHeight: '100%',
                              userSelect: 'none',
                              aspectRatio:
                                layer.cropAspect === '1:1' || layer.cropAspect === 'circle'
                                  ? '1 / 1'
                                  : layer.cropAspect === '4:5'
                                    ? '4 / 5'
                                    : layer.cropAspect === '16:9'
                                      ? '16 / 9'
                                      : undefined,
                              borderRadius:
                                layer.cropAspect === 'circle' ? '50%' : `${layer.borderRadius ?? 12}px`,
                              border:
                                (layer.strokeWidth || 0) > 0
                                  ? `${layer.strokeWidth}px solid ${layer.strokeColor || '#ffffff'}`
                                  : undefined,
                              boxShadow: layer.shadowColor
                                ? `0 6px ${layer.shadowBlur || 16}px ${layer.shadowColor}`
                                : undefined,
                              objectFit:
                                layer.name.toLowerCase().includes('logo') ||
                                layer.name.toLowerCase().includes('seal') ||
                                layer.imageUrl.includes('crestGrad') ||
                                layer.imageUrl.includes('sealGrad') ||
                                layer.imageUrl.includes('logoGrad')
                                  ? 'contain'
                                  : 'cover',
                              display: 'block',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              1C. RIGHT SIDEBAR — CONTEXTUAL INSPECTOR
             =================================================================== */}
          <aside className={`canva-right-panel ${isRightPanelCollapsed ? 'collapsed' : ''}`} aria-label="Contextual Inspector">
            {/* Inspector Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} color="#4f46e5" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedLayer
                    ? `${selectedLayer.type.charAt(0).toUpperCase() + selectedLayer.type.slice(1)} Properties`
                    : 'Canvas Inspector'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRightPanelCollapsed(true)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                title="Collapse Inspector"
              >
                <PanelRightClose size={15} />
              </button>
            </div>

            {selectedLayer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Selected Element Name & Quick Actions */}
                <div className="inspector-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={selectedLayer.name}
                      onChange={(e) => updateSelectedLayer({ name: e.target.value })}
                      style={{ flex: 1, height: '28px', padding: '0 8px', fontSize: '0.76rem', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      onClick={() => updateSelectedLayer({ locked: !selectedLayer.locked })}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: selectedLayer.locked ? '#fef3c7' : '#ffffff',
                        color: selectedLayer.locked ? '#d97706' : '#475569',
                        cursor: 'pointer',
                      }}
                      title={selectedLayer.locked ? 'Unlock' : 'Lock'}
                    >
                      {selectedLayer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={duplicateSelectedLayer}
                      style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={deleteSelectedLayer}
                      style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* =============================================================
                    CONTEXTUAL INSPECTOR FOR TEXT
                   ============================================================= */}
                {selectedLayer.type === 'text' && (
                  <>
                    <div className="inspector-section">
                      <div className="inspector-section-title">
                        <Type size={13} color="#4f46e5" />
                        <span>Typography & Font</span>
                      </div>

                      <textarea
                        rows={2}
                        value={selectedLayer.text || ''}
                        onChange={(e) => updateSelectedLayer({ text: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '0.76rem', resize: 'vertical' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px', gap: '6px' }}>
                        {(() => {
                          const currentFam = selectedLayer.fontFamily || SYSTEM_AND_WEB_FONTS[0].family;
                          const matchedFont = SYSTEM_AND_WEB_FONTS.find(
                            (f) => f.family === currentFam || currentFam.toLowerCase().includes(f.name.toLowerCase())
                          );
                          const effectiveFamValue = matchedFont ? matchedFont.family : currentFam;
                          const customFontLabel = !matchedFont
                            ? currentFam.split(',')[0].replace(/['"]/g, '').trim() || 'Custom Font'
                            : null;

                          return (
                            <select
                              aria-label="Font family"
                              className="form-select"
                              value={effectiveFamValue}
                              onChange={(e) => updateSelectedLayer({ fontFamily: e.target.value })}
                              style={{
                                height: '32px',
                                padding: '0 8px',
                                lineHeight: 1.25,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#0f172a',
                                backgroundColor: '#ffffff',
                              }}
                            >
                              {customFontLabel && <option value={currentFam}>{customFontLabel}</option>}
                              {SYSTEM_AND_WEB_FONTS.map((f) => (
                                <option key={f.name} value={f.family}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          );
                        })()}

                        {(() => {
                          const currentSize = Math.round(selectedLayer.fontSize || 24);
                          const allSizes = FONT_SIZES.includes(currentSize)
                            ? FONT_SIZES
                            : [...FONT_SIZES, currentSize].sort((a, b) => a - b);

                          return (
                            <select
                              aria-label="Font size"
                              className="form-select"
                              value={currentSize}
                              onChange={(e) => updateSelectedLayer({ fontSize: parseInt(e.target.value) || 24 })}
                              style={{
                                height: '32px',
                                padding: '0 8px',
                                lineHeight: 1.25,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#0f172a',
                                backgroundColor: '#ffffff',
                              }}
                            >
                              {allSizes.map((sz) => (
                                <option key={sz} value={sz}>
                                  {sz} px
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>

                      {/* Bold, Italic, Uppercase & Alignment */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedLayer({
                                fontWeight:
                                  selectedLayer.fontWeight === 'bold' ||
                                  selectedLayer.fontWeight === '800' ||
                                  selectedLayer.fontWeight === '700'
                                    ? '400'
                                    : '800',
                              })
                            }
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background:
                                selectedLayer.fontWeight === 'bold' ||
                                selectedLayer.fontWeight === '800' ||
                                selectedLayer.fontWeight === '700'
                                  ? '#eef2ff'
                                  : '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                            }}
                            title="Bold"
                          >
                            <Bold size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedLayer({
                                fontStyle: selectedLayer.fontStyle === 'italic' ? 'normal' : 'italic',
                              })
                            }
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: selectedLayer.fontStyle === 'italic' ? '#eef2ff' : '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                            }}
                            title="Italic"
                          >
                            <Italic size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedLayer({
                                textTransform: selectedLayer.textTransform === 'uppercase' ? 'none' : 'uppercase',
                              })
                            }
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: selectedLayer.textTransform === 'uppercase' ? '#eef2ff' : '#ffffff',
                              color: '#0f172a',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Uppercase"
                          >
                            AA
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '3px' }}>
                          {(['left', 'center', 'right'] as const).map((al) => (
                            <button
                              key={al}
                              type="button"
                              onClick={() => updateSelectedLayer({ textAlign: al })}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: (selectedLayer.textAlign || 'center') === al ? '#eef2ff' : '#ffffff',
                                color: '#0f172a',
                                cursor: 'pointer',
                              }}
                              title={`Align ${al}`}
                            >
                              {al === 'left' && <AlignLeft size={13} />}
                              {al === 'center' && <AlignCenter size={13} />}
                              {al === 'right' && <AlignRight size={13} />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Color */}
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                          Text Color
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <input
                            type="color"
                            value={selectedLayer.color || '#ffffff'}
                            onChange={(e) => updateSelectedLayer({ color: e.target.value })}
                            style={{ width: '26px', height: '26px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                          />
                          {['#ffffff', '#0f172a', '#facc15', '#38bdf8', '#ec4899', '#10b981', customPrimaryColor].map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="color-swatch-btn"
                              style={{ background: c, width: '20px', height: '20px' }}
                              onClick={() => updateSelectedLayer({ color: c })}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Line Spacing & Letter Spacing */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                            <span>Line Spacing</span>
                            <strong>{selectedLayer.lineHeight ?? 1.25}</strong>
                          </div>
                          <input
                            type="range"
                            min="0.9"
                            max="2.2"
                            step="0.05"
                            value={selectedLayer.lineHeight ?? 1.25}
                            onChange={(e) => updateSelectedLayer({ lineHeight: parseFloat(e.target.value) })}
                            style={{ width: '100%', accentColor: '#4f46e5' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                            <span>Letter Spacing</span>
                            <strong>{selectedLayer.letterSpacing ?? 0}px</strong>
                          </div>
                          <input
                            type="range"
                            min="-2"
                            max="12"
                            step="0.5"
                            value={selectedLayer.letterSpacing ?? 0}
                            onChange={(e) => updateSelectedLayer({ letterSpacing: parseFloat(e.target.value) })}
                            style={{ width: '100%', accentColor: '#4f46e5' }}
                          />
                        </div>
                      </div>

                      {/* Manual Text Rotation Slider & Quick Angle Controls */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RotateCw size={11} color="#4f46e5" />
                            <span>Rotate Text</span>
                          </span>
                          <KeypadNumberInput
                            min={-360}
                            max={360}
                            value={selectedLayer.rotation || 0}
                            onChange={(val) => updateSelectedLayer({ rotation: val })}
                            suffix="°"
                            style={{ width: '48px', height: '22px', fontSize: '0.7rem' }}
                          />
                        </div>
                        <input
                          type="range"
                          aria-label="Rotate text angle"
                          min="-180"
                          max="180"
                          step="1"
                          value={selectedLayer.rotation ?? 0}
                          onChange={(e) => updateSelectedLayer({ rotation: parseInt(e.target.value) || 0 })}
                          style={{ width: '100%', accentColor: '#4f46e5' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', marginTop: '3px' }}>
                          {[-45, -15, 0, 15, 45].map((ang) => (
                            <button
                              key={ang}
                              type="button"
                              onClick={() => updateSelectedLayer({ rotation: ang })}
                              style={{
                                padding: '3px 2px',
                                borderRadius: '4px',
                                border: (selectedLayer.rotation || 0) === ang ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                                background: (selectedLayer.rotation || 0) === ang ? '#eef2ff' : '#ffffff',
                                color: (selectedLayer.rotation || 0) === ang ? '#4f46e5' : '#475569',
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {ang > 0 ? `+${ang}°` : `${ang}°`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Text Background Fill & Shadow/Opacity */}
                    <div className="inspector-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="inspector-section-title">Text Box Fill & Background</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedLayer({
                              backgroundColor: selectedLayer.backgroundColor ? undefined : '#4f46e5',
                              backgroundPadding: selectedLayer.backgroundPadding ?? 10,
                              borderRadius: selectedLayer.borderRadius === 9999 ? 8 : (selectedLayer.borderRadius ?? 8),
                            })
                          }
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: selectedLayer.backgroundColor ? '#fef2f2' : '#eef2ff',
                            color: selectedLayer.backgroundColor ? '#dc2626' : '#4f46e5',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {selectedLayer.backgroundColor ? 'Clear Fill' : '+ Fill Text Box'}
                        </button>
                      </div>

                      {/* Direct Fill Color Picker & Swatches for Selected Text Box */}
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                          Fill Color (Fills Selected Text Box)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <input
                            type="color"
                            aria-label="Text box fill color"
                            value={
                              selectedLayer.backgroundColor && selectedLayer.backgroundColor.startsWith('#')
                                ? selectedLayer.backgroundColor
                                : '#4f46e5'
                            }
                            onChange={(e) =>
                              updateSelectedLayer({
                                backgroundColor: e.target.value,
                                backgroundPadding: selectedLayer.backgroundPadding ?? 10,
                                borderRadius: selectedLayer.borderRadius ?? 8,
                              })
                            }
                            style={{ width: '26px', height: '26px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                          />
                          {[
                            '#4f46e5',
                            '#0f172a',
                            '#ec4899',
                            '#facc15',
                            '#10b981',
                            '#0284c7',
                            '#ffffff',
                            'transparent',
                          ].map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`color-swatch-btn ${
                                (c === 'transparent' && !selectedLayer.backgroundColor) ||
                                selectedLayer.backgroundColor === c
                                  ? 'active'
                                  : ''
                              }`}
                              title={c === 'transparent' ? 'No Fill (Transparent)' : `Fill Text Box ${c}`}
                              style={{
                                background:
                                  c === 'transparent'
                                    ? 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 3px, #ffffff 3px, #ffffff 6px)'
                                    : c,
                                width: '20px',
                                height: '20px',
                              }}
                              onClick={() =>
                                updateSelectedLayer({
                                  backgroundColor: c === 'transparent' ? undefined : c,
                                  backgroundPadding: selectedLayer.backgroundPadding ?? 10,
                                  borderRadius:
                                    c === 'transparent'
                                      ? selectedLayer.borderRadius
                                      : selectedLayer.borderRadius === 9999
                                        ? 8
                                        : (selectedLayer.borderRadius ?? 8),
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {/* Quick Span Presets: Selected Box | Full Width Banner | Full Canvas */}
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                          Text Fill Span
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedLayer({
                                backgroundColor: selectedLayer.backgroundColor || '#4f46e5',
                                borderRadius: 8,
                              })
                            }
                            style={{
                              padding: '4px 4px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '0.63rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Fill the current selected text box dimensions"
                          >
                            ▭ Selected Box
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedLayer({
                                backgroundColor: selectedLayer.backgroundColor || '#4f46e5',
                                x: 50,
                                width: 100,
                                borderRadius: 0,
                              })
                            }
                            style={{
                              padding: '4px 4px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '0.63rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Expand text background fill across 100% of canvas width"
                          >
                            ↔ Full Width
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedLayer({
                                backgroundColor: selectedLayer.backgroundColor || '#4f46e5',
                                x: 50,
                                y: 50,
                                width: 100,
                                height: 100,
                                borderRadius: 0,
                              })
                            }
                            style={{
                              padding: '4px 4px',
                              borderRadius: '5px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              fontSize: '0.63rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Fill the entire canvas with this text box background color"
                          >
                            ⛶ Full Canvas
                          </button>
                        </div>
                      </div>

                      {selectedLayer.backgroundColor && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#475569' }}>
                              <span>Box Padding</span>
                              <strong>{selectedLayer.backgroundPadding ?? 10}px</strong>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="32"
                              value={selectedLayer.backgroundPadding ?? 10}
                              onChange={(e) => updateSelectedLayer({ backgroundPadding: parseInt(e.target.value) || 0 })}
                              style={{ width: '100%', accentColor: '#4f46e5' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#475569' }}>
                              <span>Corner Radius</span>
                              <strong>{Math.min(48, selectedLayer.borderRadius ?? 8)}px</strong>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="48"
                              value={Math.min(48, selectedLayer.borderRadius ?? 8)}
                              onChange={(e) => updateSelectedLayer({ borderRadius: parseInt(e.target.value) || 0 })}
                              style={{ width: '100%', accentColor: '#4f46e5' }}
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                          <span>Text Shadow Blur</span>
                          <strong>{selectedLayer.shadowBlur ?? 0}px</strong>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="36"
                          value={selectedLayer.shadowBlur ?? 0}
                          onChange={(e) => {
                            const blur = parseInt(e.target.value) || 0;
                            updateSelectedLayer({
                              shadowBlur: blur,
                              shadowColor: blur > 0 ? selectedLayer.shadowColor || 'rgba(0,0,0,0.65)' : undefined,
                            });
                          }}
                          style={{ width: '100%', accentColor: '#4f46e5' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                          <span>Opacity</span>
                          <strong>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</strong>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={selectedLayer.opacity ?? 1}
                          onChange={(e) => updateSelectedLayer({ opacity: parseFloat(e.target.value) })}
                          style={{ width: '100%', accentColor: '#4f46e5' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* =============================================================
                    CONTEXTUAL INSPECTOR FOR IMAGES
                   ============================================================= */}
                {selectedLayer.type === 'image' && (
                  <div className="inspector-section">
                    <div className="inspector-section-title">
                      <ImageIcon size={13} color="#0284c7" />
                      <span>Image Controls</span>
                    </div>

                    {/* Replace Image */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => replaceImageInputRef.current?.click()}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: '1px solid #4f46e5',
                          background: '#eef2ff',
                          color: '#4f46e5',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <RefreshCw size={12} />
                        <span>Replace File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplaceTargetLayerId(selectedLayer.id);
                          setActiveTab('photos');
                          setIsLeftDrawerOpen(true);
                          showStudioToast('Select any stock photo or upload on the left to replace', 'success');
                        }}
                        style={{
                          padding: '7px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        From Library
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={removeSelectedImageBackground}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: '6px',
                        border: '1px solid #818cf8',
                        background: '#eef2ff',
                        color: '#4f46e5',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                      title="Remove solid/white background from this image to make it transparent"
                    >
                      <Wand2 size={13} />
                      <span>Make Background Transparent</span>
                    </button>

                    <button
                      type="button"
                      onClick={deleteSelectedLayer}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete Image from Canvas</span>
                    </button>

                    {/* Crop & Aspect Ratio */}
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Crop & Shape Mask
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                        {(
                          [
                            { id: 'free', label: 'Free' },
                            { id: '1:1', label: '1:1' },
                            { id: '4:5', label: '4:5' },
                            { id: '16:9', label: '16:9' },
                            { id: 'circle', label: 'Circle' },
                          ] as const
                        ).map((cr) => (
                          <button
                            key={cr.id}
                            type="button"
                            onClick={() => updateSelectedLayer({ cropAspect: cr.id })}
                            style={{
                              padding: '4px 2px',
                              borderRadius: '4px',
                              border: (selectedLayer.cropAspect || 'free') === cr.id ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                              background: (selectedLayer.cropAspect || 'free') === cr.id ? '#eef2ff' : '#ffffff',
                              color: (selectedLayer.cropAspect || 'free') === cr.id ? '#4f46e5' : '#334155',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {cr.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Flip & Rotate */}
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Flip & Rotate
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ flipX: !selectedLayer.flipX })}
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: selectedLayer.flipX ? '#eef2ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                          }}
                          title="Flip Horizontal"
                        >
                          <FlipHorizontal size={13} /> Flip X
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ flipY: !selectedLayer.flipY })}
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: selectedLayer.flipY ? '#eef2ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                          }}
                          title="Flip Vertical"
                        >
                          <FlipVertical size={13} /> Flip Y
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ rotation: ((selectedLayer.rotation || 0) - 90 + 360) % 360 })}
                          style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}
                        >
                          ↺ -90°
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedLayer({ rotation: ((selectedLayer.rotation || 0) + 90) % 360 })}
                          style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}
                        >
                          ↻ +90°
                        </button>
                      </div>
                    </div>

                    {/* Transparency, Border & Corner Radius */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                        <span>Transparency / Opacity</span>
                        <strong>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={selectedLayer.opacity ?? 1}
                        onChange={(e) => updateSelectedLayer({ opacity: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#4f46e5' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                        <span>Corner Radius</span>
                        <strong>{selectedLayer.borderRadius ?? 12}px</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={selectedLayer.borderRadius ?? 12}
                        onChange={(e) => updateSelectedLayer({ borderRadius: parseInt(e.target.value) })}
                        style={{ width: '100%', accentColor: '#4f46e5' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: '#475569' }}>Border:</span>
                      <input
                        type="color"
                        value={selectedLayer.strokeColor || '#ffffff'}
                        onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value })}
                        style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer' }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="16"
                        value={selectedLayer.strokeWidth ?? 0}
                        onChange={(e) => updateSelectedLayer({ strokeWidth: parseInt(e.target.value) })}
                        style={{ flex: 1, accentColor: '#4f46e5' }}
                      />
                    </div>
                  </div>
                )}

                {/* =============================================================
                    CONTEXTUAL INSPECTOR FOR SHAPES
                   ============================================================= */}
                {selectedLayer.type === 'shape' && (
                  <div className="inspector-section">
                    <div className="inspector-section-title">
                      <Square size={13} color="#7c3aed" />
                      <span>Shape Style</span>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Fill Color
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <input
                          type="color"
                          value={selectedLayer.fillColor?.startsWith('#') ? selectedLayer.fillColor : '#6366f1'}
                          onChange={(e) => updateSelectedLayer({ fillColor: e.target.value })}
                          style={{ width: '26px', height: '26px', border: 'none', cursor: 'pointer' }}
                        />
                        {['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#0f172a', '#ffffff', 'transparent'].map((c, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="color-swatch-btn"
                            style={{
                              background:
                                c === 'transparent'
                                  ? 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 3px, #ffffff 3px, #ffffff 6px)'
                                  : c,
                              width: '20px',
                              height: '20px',
                            }}
                            onClick={() => updateSelectedLayer({ fillColor: c })}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                        <span>Border Width</span>
                        <strong>{selectedLayer.strokeWidth ?? 2}px</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="color"
                          value={selectedLayer.strokeColor || '#818cf8'}
                          onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value })}
                          style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={selectedLayer.strokeWidth ?? 2}
                          onChange={(e) => updateSelectedLayer({ strokeWidth: parseInt(e.target.value) })}
                          style={{ flex: 1, accentColor: '#4f46e5' }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                        <span>Corner Radius</span>
                        <strong>{selectedLayer.borderRadius ?? 0}px</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        value={selectedLayer.borderRadius ?? 0}
                        onChange={(e) => updateSelectedLayer({ borderRadius: parseInt(e.target.value) })}
                        style={{ width: '100%', accentColor: '#4f46e5' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569' }}>
                        <span>Transparency</span>
                        <strong>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={selectedLayer.opacity ?? 1}
                        onChange={(e) => updateSelectedLayer({ opacity: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#4f46e5' }}
                      />
                    </div>
                  </div>
                )}

                {/* =============================================================
                    CONTEXTUAL INSPECTOR FOR ICONS
                   ============================================================= */}
                {selectedLayer.type === 'icon' && (
                  <div className="inspector-section">
                    <div className="inspector-section-title">
                      <Smile size={13} color="#f59e0b" />
                      <span>Icon Color & Opacity</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        value={selectedLayer.iconColor || '#facc15'}
                        onChange={(e) => updateSelectedLayer({ iconColor: e.target.value })}
                        style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer' }}
                      />
                      {['#facc15', '#ec4899', '#4f46e5', '#38bdf8', '#10b981', '#ffffff', '#0f172a'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="color-swatch-btn"
                          style={{ background: c, width: '20px', height: '20px' }}
                          onClick={() => updateSelectedLayer({ iconColor: c })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Size & Position Inspector Card */}
                <div className="inspector-section">
                  <div className="inspector-section-title">
                    <SlidersHorizontal size={13} color="#4f46e5" />
                    <span>Size & Position</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <KeypadNumberInput
                      min={4}
                      max={100}
                      value={selectedLayer.width}
                      onChange={(val) => updateSelectedLayer({ width: val })}
                      prefix="W:"
                      suffix="%"
                      style={{ width: '100%', height: '26px' }}
                    />
                    <KeypadNumberInput
                      min={2}
                      max={100}
                      value={selectedLayer.height || 20}
                      onChange={(val) => updateSelectedLayer({ height: val })}
                      prefix="H:"
                      suffix="%"
                      style={{ width: '100%', height: '26px' }}
                    />
                    <KeypadNumberInput
                      min={2}
                      max={98}
                      value={selectedLayer.x}
                      onChange={(val) => updateSelectedLayer({ x: val })}
                      prefix="X:"
                      suffix="%"
                      style={{ width: '100%', height: '26px' }}
                    />
                    <KeypadNumberInput
                      min={2}
                      max={98}
                      value={selectedLayer.y}
                      onChange={(val) => updateSelectedLayer({ y: val })}
                      prefix="Y:"
                      suffix="%"
                      style={{ width: '100%', height: '26px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Rotation Angle</span>
                      <KeypadNumberInput
                        min={-360}
                        max={360}
                        value={selectedLayer.rotation || 0}
                        onChange={(val) => updateSelectedLayer({ rotation: val })}
                        suffix="°"
                        style={{ width: '54px', height: '26px' }}
                      />
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedLayer.rotation ?? 0}
                      onChange={(e) => updateSelectedLayer({ rotation: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', accentColor: '#4f46e5' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Canvas Summary when no element is selected */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="inspector-section">
                  <div className="inspector-section-title">Canvas Summary</div>
                  <div style={{ fontSize: '0.74rem', color: '#334155' }}>
                    <strong>Format:</strong> {activeRatioConfig.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#334155' }}>
                    <strong>Dimensions:</strong> {activeRatioConfig.width} × {activeRatioConfig.height} px
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#334155' }}>
                    <strong>Editable Layers:</strong> {layers.length}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span>
                      <strong>Background:</strong>{' '}
                      <span style={{ textTransform: 'capitalize', color: bgType === 'transparent' ? '#4f46e5' : '#0f172a', fontWeight: 700 }}>
                        {bgType}
                      </span>
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={toggleCanvasBackgroundVisibility}
                        style={{
                          padding: '3px 7px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: bgType === 'transparent' ? '#eef2ff' : '#ffffff',
                          color: bgType === 'transparent' ? '#4f46e5' : '#334155',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title={bgType === 'transparent' ? 'Restore Canvas Background' : 'Hide Canvas Background for Transparent'}
                      >
                        {bgType === 'transparent' ? <Eye size={11} /> : <EyeOff size={11} />}
                        <span>{bgType === 'transparent' ? 'Restore BG' : 'Hide BG'}</span>
                      </button>
                      {bgType !== 'transparent' && (
                        <button
                          type="button"
                          onClick={deleteMainCanvasBackground}
                          style={{
                            padding: '3px 7px',
                            borderRadius: '5px',
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Delete Canvas Background (Make Transparent)"
                        >
                          <Trash2 size={11} />
                          <span>Delete BG</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Design Validation Summary Card in Right Inspector */}
                <div className="inspector-section">
                  <div className="inspector-section-title">Design Validation</div>
                  {designValidationIssues.length === 0 ? (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        fontSize: '0.71rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={14} color="#16a34a" />
                      <span>All {layers.length} layers validated — no overlaps or boundary issues.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {designValidationIssues.map((iss) => (
                        <div
                          key={iss.id}
                          onClick={() => {
                            if (iss.layerId) setSelectedLayerId(iss.layerId);
                          }}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: iss.severity === 'error' ? '#fef2f2' : '#fffbeb',
                            border: iss.severity === 'error' ? '1px solid #fecaca' : '1px solid #fde68a',
                            color: iss.severity === 'error' ? '#991b1b' : '#92400e',
                            fontSize: '0.69rem',
                            fontWeight: 600,
                            cursor: iss.layerId ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '5px',
                          }}
                        >
                          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{iss.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="inspector-section">
                  <div className="inspector-section-title">Quick Select & Manage Layers</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {layers.map((l) => (
                      <div
                        key={l.id}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '5px',
                          opacity: l.visible ? 1 : 0.55,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedLayerId(l.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#0f172a',
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 0,
                            gap: '4px',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                          <span style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', flexShrink: 0 }}>{l.type}</span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => updateLayerById(l.id, { visible: !l.visible })}
                            title={l.visible ? `Hide ${l.name}` : `Show ${l.name}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: l.visible ? '#64748b' : '#94a3b8',
                              borderRadius: '4px',
                              padding: '3px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLayerById(l.id, { locked: !l.locked })}
                            title={l.locked ? `Unlock ${l.name}` : `Lock ${l.name}`}
                            style={{
                              border: 'none',
                              background: l.locked ? '#fef3c7' : 'transparent',
                              color: l.locked ? '#d97706' : '#64748b',
                              borderRadius: '4px',
                              padding: '3px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {l.locked ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLayerById(l.id)}
                            title={`Delete ${l.name}`}
                            style={{
                              border: 'none',
                              background: '#fef2f2',
                              color: '#dc2626',
                              borderRadius: '4px',
                              padding: '3px 4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Main Canvas Background Row in Right Inspector */}
                    <div
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: bgType === 'transparent' ? '1px dashed #cbd5e1' : '1px solid #c7d2fe',
                        background: bgType === 'transparent' ? '#f8fafc' : '#eef2ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '3px',
                            border: '1px solid #94a3b8',
                            flexShrink: 0,
                            background:
                              bgType === 'transparent'
                                ? 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                                : bgType === 'solid'
                                  ? bgColor
                                  : bgType === 'gradient'
                                    ? bgGradient
                                    : `url(${bgImageUrl}) center/cover`,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            textDecoration: bgType === 'transparent' ? 'line-through' : 'none',
                          }}
                        >
                          Canvas Background
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={toggleCanvasBackgroundVisibility}
                          title={bgType === 'transparent' ? 'Restore Canvas Background' : 'Hide Canvas Background (Make Transparent)'}
                          style={{
                            border: 'none',
                            background: '#ffffff',
                            color: bgType === 'transparent' ? '#4f46e5' : '#475569',
                            borderRadius: '4px',
                            padding: '3px 5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {bgType === 'transparent' ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={deleteMainCanvasBackground}
                          title="Delete Canvas Background (Make Transparent)"
                          style={{
                            border: 'none',
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '4px',
                            padding: '3px 5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* =====================================================================
          TEMPLATE PREVIEW BEFORE APPLYING MODAL
         ===================================================================== */}
      {previewTemplateItem && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10010 }}
          onClick={() => setPreviewTemplateItem(null)}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '480px', width: '92vw', background: '#ffffff', color: '#0f172a', padding: '20px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>{previewTemplateItem.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Aspect Ratio: {previewTemplateItem.aspectRatio} • {previewTemplateItem.layers?.length || 0} Editable Layers
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplateItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                height: '240px',
                borderRadius: '10px',
                background: previewTemplateItem.background?.value || '#1e1b4b',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              {previewTemplateItem.layers
                ?.filter((l: any) => l.type === 'text')
                .map((l: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      color: l.color || '#ffffff',
                      backgroundColor: l.backgroundColor || 'transparent',
                      padding: l.backgroundColor ? '4px 10px' : '0',
                      borderRadius: l.borderRadius ? `${l.borderRadius}px` : '0',
                      fontSize: idx === 1 ? '1.25rem' : '0.78rem',
                      fontWeight: idx === 1 ? 800 : 600,
                    }}
                  >
                    {l.text}
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPreviewTemplateItem(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUseTemplate(previewTemplateItem)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#ffffff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Apply Editable Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SIDE-BY-SIDE AI VARIATION COMPARISON MODAL
         ===================================================================== */}
      {compareVariationItem && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10010 }}
          onClick={() => setCompareVariationItem(null)}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '640px', width: '94vw', background: '#ffffff', color: '#0f172a', padding: '20px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Compare Design vs. {compareVariationItem.name}</span>
              <button type="button" onClick={() => setCompareVariationItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '6px 10px', background: '#f8fafc', fontSize: '0.72rem', fontWeight: 700 }}>Current Design</div>
                <div style={{ height: '180px', background: bgType === 'gradient' ? bgGradient : bgColor, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#ffffff', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                    {layers.find((l) => l.type === 'text' && (l.fontSize || 0) >= 30)?.text || designTitle}
                  </div>
                </div>
              </div>

              <div style={{ border: '2px solid #4f46e5', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '6px 10px', background: '#eef2ff', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 700 }}>
                  AI Variation: {compareVariationItem.name}
                </div>
                <div style={{ height: '180px', background: compareVariationItem.bgValue, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#ffffff', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                    {compareVariationItem.layers.find((l: any) => l.type === 'text' && (l.fontSize || 0) >= 30)?.text || designTitle}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCompareVariationItem(null)}
                style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={() => {
                  applyGeneratedVariation(compareVariationItem);
                  setCompareVariationItem(null);
                }}
                style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Apply This Variation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FULL-SCREEN PREVIEW MODAL
         ===================================================================== */}
      {isPreviewModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10010 }}
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '640px', width: '94vw', background: '#ffffff', color: '#0f172a', padding: '20px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800 }}>{designTitle} — Live Preview</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {activeRatioConfig.label} • {activeRatioConfig.width} × {activeRatioConfig.height} px
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={triggerAnimationPreview}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4f46e5', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Play size={12} /> Replay Animation
                </button>
                <button type="button" onClick={() => setIsPreviewModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div
              style={{
                minHeight: '340px',
                borderRadius: '12px',
                background: bgType === 'gradient' ? bgGradient : bgColor,
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                gap: '14px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {layers
                .filter((l) => l.visible && l.type === 'text')
                .map((l) => (
                  <div
                    key={l.id}
                    style={{
                      fontFamily: l.fontFamily,
                      fontSize: `${Math.max(13, (l.fontSize || 24) * 0.55)}px`,
                      fontWeight: l.fontWeight,
                      color: l.color || '#ffffff',
                      backgroundColor: l.backgroundColor || 'transparent',
                      padding: l.backgroundColor ? '6px 14px' : '0',
                      borderRadius: l.borderRadius ? `${l.borderRadius}px` : '0',
                      animation: 'studioAnimSlideUp 0.6s ease both',
                    }}
                  >
                    {l.text}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SAVED PROJECTS MODAL (REOPEN EDITABLE PROJECTS)
         ===================================================================== */}
      {isSavedProjectsModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10010 }}
          onClick={() => setIsSavedProjectsModalOpen(false)}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '520px', width: '92vw', background: '#ffffff', color: '#0f172a', padding: '20px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Saved Editable Projects ({savedProjects.length})</span>
              <button type="button" onClick={() => setIsSavedProjectsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {savedProjects.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                No saved projects yet. Click <strong>Save → Save Editable Project</strong> in the toolbar to save your work.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                {savedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{proj.title}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {proj.layers.length} layers • {new Date(proj.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenSavedProject(proj)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#4f46e5',
                        color: '#ffffff',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Reopen Project
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SAVE AS REUSABLE TEMPLATE MODAL
         ===================================================================== */}
      {isSaveTemplateModalOpen && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10010 }}
          onClick={() => setIsSaveTemplateModalOpen(false)}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '400px', width: '92vw', background: '#ffffff', color: '#0f172a', padding: '20px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>Save as Reusable Template</span>
              <button type="button" onClick={() => setIsSaveTemplateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDesignAsTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  className="form-select"
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value as TemplateCategory)}
                  style={{ width: '100%', height: '34px', fontSize: '0.8rem' }}
                >
                  <option value="promotion">Promotion</option>
                  <option value="product">Product</option>
                  <option value="educational">Educational</option>
                  <option value="announcement">Announcement</option>
                  <option value="event">Event</option>
                  <option value="sale">Sale & Discount</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.76rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#ffffff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSavingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reel Motion Studio Modal */}
      <ReelMotionStudioModal
        isOpen={isReelStudioOpen}
        onClose={() => setIsReelStudioOpen(false)}
        initialText={layers.filter((l) => l.type === 'text' && l.text).map((l) => l.text).join('. ')}
        onSaveToLibrary={onSaveToLibrary}
        onUseInPost={onUseInPost}
      />

      {/* Confirm Close Dialog */}
      <ConfirmDialogModal
        isOpen={isConfirmCloseOpen}
        title="Exit AI Design Studio?"
        description="Make sure you have saved your editable project or exported your graphic before closing."
        confirmText="Exit Studio"
        cancelText="Keep Editing"
        variant="danger"
        onConfirm={() => {
          setIsConfirmCloseOpen(false);
          onClose();
        }}
        onCancel={() => setIsConfirmCloseOpen(false)}
      />
    </div>
  );

  return isEmbedded ? modalContent : createPortal(modalContent, document.body);
};
