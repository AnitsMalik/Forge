import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import { TemplateEngine } from '../services/templateEngine.js';
import { AiPosterService } from '../services/aiPosterService.js';
import { BrandBrainService } from '../services/brandBrainService.js';
import type { AspectRatioType, ImageTemplateType, TemplateRenderOptions, TemplateCategory } from '@socialforge/shared';
import crypto from 'crypto';

// The 9 Canonical Standard Built-In Templates
export const BUILT_IN_TEMPLATES = [
  // 1. PROMOTION
  {
    id: 'tpl-promo-vip',
    name: 'VIP Perks & Limited Offer',
    description: 'High-impact promotional campaign hero with glowing gradient pill, bold offer title, and CTA pill.',
    category: 'promotion' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Promotion', 'Offer', 'Discount', 'High Impact'],
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #7c3aed 80%, #db2777 100%)',
      overlayOpacity: 0.2,
    },
    layers: [
      {
        id: 'l-promo-badge',
        type: 'text',
        name: 'Promo Tag',
        x: 50,
        y: 22,
        width: 44,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'EXCLUSIVE OFFER ⚡',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: '800',
        textAlign: 'center',
        color: '#0f172a',
        backgroundColor: '#facc15',
        backgroundPadding: 8,
        borderRadius: 9999,
        letterSpacing: 2,
      },
      {
        id: 'l-promo-head',
        type: 'text',
        name: 'Promotion Headline',
        x: 50,
        y: 44,
        width: 86,
        height: 20,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Unlock 30% Off All Pro Plans',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 48,
        fontWeight: '900',
        textAlign: 'center',
        color: '#ffffff',
        letterSpacing: -1,
        lineHeight: 1.15,
        shadowColor: 'rgba(0, 0, 0, 0.6)',
        shadowBlur: 16,
      },
      {
        id: 'l-promo-sub',
        type: 'text',
        name: 'Promotion Subtitle',
        x: 50,
        y: 68,
        width: 76,
        height: 12,
        rotation: 0,
        opacity: 0.95,
        visible: true,
        text: "Supercharge your team's social reach with AI-driven velocity.",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        color: '#f1f5f9',
      },
      {
        id: 'l-promo-cta',
        type: 'text',
        name: 'Call To Action',
        x: 50,
        y: 84,
        width: 44,
        height: 8,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Claim Promotion ➔',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        color: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        backgroundPadding: 10,
        borderRadius: 9999,
      },
    ],
  },

  // 2. EDUCATIONAL
  {
    id: 'tpl-edu-framework',
    name: '5-Step Framework Masterclass',
    description: 'Actionable numbered framework card with step checklist and swipe indicator for high retention.',
    category: 'educational' as TemplateCategory,
    aspectRatio: '4:5',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Educational', 'Framework', 'Tips', 'Guide'],
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #047857 100%)',
      overlayOpacity: 0.15,
    },
    layers: [
      {
        id: 'l-edu-badge',
        type: 'text',
        name: 'Badge',
        x: 50,
        y: 15,
        width: 44,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'PRO WORKFLOW #01',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        color: '#38bdf8',
        letterSpacing: 2,
      },
      {
        id: 'l-edu-head',
        type: 'text',
        name: 'Headline',
        x: 50,
        y: 30,
        width: 86,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '5 Rules for High-Converting Hooks',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 44,
        fontWeight: '800',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.15,
      },
      {
        id: 'l-edu-step1',
        type: 'text',
        name: 'Step 1',
        x: 50,
        y: 48,
        width: 80,
        height: 9,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '1. Start with high-contrast visuals',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        color: '#f8fafc',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backgroundPadding: 8,
        borderRadius: 8,
      },
      {
        id: 'l-edu-step2',
        type: 'text',
        name: 'Step 2',
        x: 50,
        y: 62,
        width: 80,
        height: 9,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '2. Deliver 1 unmistakable metric',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        color: '#f8fafc',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backgroundPadding: 8,
        borderRadius: 8,
      },
      {
        id: 'l-edu-step3',
        type: 'text',
        name: 'Step 3',
        x: 50,
        y: 76,
        width: 80,
        height: 9,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '3. Direct a clear call-to-action',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        color: '#f8fafc',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backgroundPadding: 8,
        borderRadius: 8,
      },
      {
        id: 'l-edu-footer',
        type: 'text',
        name: 'Footer',
        x: 50,
        y: 90,
        width: 40,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'SAVE THIS POST ✦',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        color: '#facc15',
        letterSpacing: 1.5,
      },
    ],
  },

  // 3. PRODUCT
  {
    id: 'tpl-product-showcase',
    name: 'Flagship Product Showcase',
    description: 'Balanced split showcase with left narrative stack and glowing right product feature container.',
    category: 'product' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Product', 'Feature', 'SaaS', 'Launch'],
    background: {
      type: 'solid' as const,
      value: '#0b101d',
      overlayOpacity: 0.1,
    },
    layers: [
      {
        id: 'l-prod-badge',
        type: 'text',
        name: 'Product Badge',
        x: 26,
        y: 22,
        width: 44,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'NEW RELEASE 🚀',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'left',
        color: '#38bdf8',
        letterSpacing: 2,
      },
      {
        id: 'l-prod-head',
        type: 'text',
        name: 'Product Headline',
        x: 26,
        y: 42,
        width: 46,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Next-Gen Social Command Center',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 40,
        fontWeight: '800',
        textAlign: 'left',
        color: '#ffffff',
        lineHeight: 1.15,
      },
      {
        id: 'l-prod-sub',
        type: 'text',
        name: 'Product Subtext',
        x: 26,
        y: 66,
        width: 46,
        height: 14,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'Built for ambitious creators and fast-moving agency teams.',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 17,
        fontWeight: '500',
        textAlign: 'left',
        color: '#cbd5e1',
      },
      {
        id: 'l-prod-card',
        type: 'shape',
        name: 'Feature Highlight Container',
        shapeType: 'rounded_rect',
        x: 74,
        y: 50,
        width: 42,
        height: 72,
        rotation: 0,
        opacity: 1,
        visible: true,
        fillColor: 'rgba(255, 255, 255, 0.05)',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
        borderRadius: 20,
      },
      {
        id: 'l-prod-metric',
        type: 'text',
        name: 'Metric Callout',
        x: 74,
        y: 42,
        width: 36,
        height: 14,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '10X',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 54,
        fontWeight: '900',
        textAlign: 'center',
        color: '#38bdf8',
      },
      {
        id: 'l-prod-metric-label',
        type: 'text',
        name: 'Metric Label',
        x: 74,
        y: 58,
        width: 36,
        height: 8,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'Faster Output',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        color: '#94a3b8',
        letterSpacing: 1,
      },
      {
        id: 'l-prod-price',
        type: 'text',
        name: 'Price Tag',
        x: 74,
        y: 74,
        width: 36,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Starting at $49/mo',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        color: '#fef08a',
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        borderRadius: 9999,
      },
    ],
  },

  // 4. ANNOUNCEMENT
  {
    id: 'tpl-announcement-v2',
    name: 'Breaking Feature Announcement',
    description: 'Electric launch banner with pill tag, prominent title, and immediate call-to-action button.',
    category: 'announcement' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Announcement', 'Release', 'News', 'Update'],
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #4f46e5 100%)',
      overlayOpacity: 0.2,
    },
    layers: [
      {
        id: 'l-ann-badge',
        type: 'text',
        name: 'Announcement Tag',
        x: 50,
        y: 24,
        width: 48,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '✨ VERSION 2.0 IS LIVE',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: '800',
        textAlign: 'center',
        color: '#c7d2fe',
        backgroundColor: 'rgba(99, 102, 241, 0.3)',
        backgroundPadding: 8,
        borderRadius: 9999,
        letterSpacing: 2,
      },
      {
        id: 'l-ann-head',
        type: 'text',
        name: 'Announcement Title',
        x: 50,
        y: 46,
        width: 86,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'The Future of Multi-Brand Social Media',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 46,
        fontWeight: '800',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.15,
        shadowColor: 'rgba(0, 0, 0, 0.6)',
        shadowBlur: 20,
      },
      {
        id: 'l-ann-sub',
        type: 'text',
        name: 'Context Subtitle',
        x: 50,
        y: 70,
        width: 76,
        height: 12,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'Available today for all global workspaces and enterprise accounts.',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        color: '#cbd5e1',
      },
      {
        id: 'l-ann-cta',
        type: 'text',
        name: 'CTA Pill',
        x: 50,
        y: 84,
        width: 44,
        height: 7,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Read Announcement ↗',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        color: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        backgroundPadding: 8,
        borderRadius: 9999,
      },
    ],
  },

  // 5. TESTIMONIAL
  {
    id: 'tpl-testimonial-rating',
    name: 'Client Testimonial & Review',
    description: 'Verified customer review card with 5-star rating, customer quote, and executive attribution.',
    category: 'testimonial' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Testimonial', 'Review', 'Customer Proof', 'Rating'],
    background: {
      type: 'gradient' as const,
      value: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #090d16 65%, #020617 100%)',
      overlayOpacity: 0.15,
    },
    layers: [
      {
        id: 'l-test-stars',
        type: 'text',
        name: 'Rating Stars',
        x: 50,
        y: 22,
        width: 44,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '★★★★★ 5.0 RATING',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        color: '#facc15',
        letterSpacing: 3,
      },
      {
        id: 'l-test-quote',
        type: 'text',
        name: 'Customer Quote',
        x: 50,
        y: 46,
        width: 84,
        height: 24,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '“SocialForge eliminated 80% of our manual coordination. Our clients love the real-time approval portals.”',
        fontFamily: "'Playfair Display', serif",
        fontSize: 32,
        fontWeight: '700',
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.3,
        shadowColor: 'rgba(0, 0, 0, 0.7)',
        shadowBlur: 16,
      },
      {
        id: 'l-test-author',
        type: 'text',
        name: 'Client Name',
        x: 50,
        y: 72,
        width: 60,
        height: 8,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '— Elena Rostova',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: '#ffffff',
      },
      {
        id: 'l-test-role',
        type: 'text',
        name: 'Client Role',
        x: 50,
        y: 80,
        width: 60,
        height: 6,
        rotation: 0,
        opacity: 0.85,
        visible: true,
        text: 'VP of Growth at HyperScale Media',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
        color: '#94a3b8',
      },
    ],
  },

  // 6. QUOTE
  {
    id: 'tpl-quote-editorial',
    name: 'Modern Editorial Quote Card',
    description: 'Sophisticated serif quote with glowing quotation mark, luxury dark radial backdrop, and executive attribution.',
    category: 'quote' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Quote', 'Thought Leadership', 'Editorial', 'Inspirational'],
    background: {
      type: 'gradient' as const,
      value: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #090d16 65%, #030712 100%)',
      overlayOpacity: 0.15,
    },
    layers: [
      {
        id: 'l-quote-badge',
        type: 'text',
        name: 'Gold Badge',
        x: 50,
        y: 20,
        width: 38,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'FOUNDER INSIGHT',
        fontFamily: "'Playfair Display', serif",
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        color: '#fef08a',
        backgroundColor: 'rgba(234, 179, 8, 0.18)',
        borderRadius: 9999,
        letterSpacing: 2.5,
      },
      {
        id: 'l-quote-glyph',
        type: 'text',
        name: 'Quote Glyph',
        x: 50,
        y: 32,
        width: 20,
        height: 12,
        rotation: 0,
        opacity: 0.25,
        visible: true,
        text: '“',
        fontFamily: "'Playfair Display', serif",
        fontSize: 90,
        fontWeight: '900',
        textAlign: 'center',
        color: '#eab308',
      },
      {
        id: 'l-quote-body',
        type: 'text',
        name: 'Quote Text',
        x: 50,
        y: 52,
        width: 84,
        height: 24,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '“Brand authenticity isn’t an option in modern commerce; it is the currency of trust.”',
        fontFamily: "'Playfair Display', serif",
        fontSize: 36,
        fontWeight: '700',
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.25,
        shadowColor: 'rgba(0, 0, 0, 0.8)',
        shadowBlur: 20,
      },
      {
        id: 'l-quote-auth',
        type: 'text',
        name: 'Author Attribution',
        x: 50,
        y: 76,
        width: 60,
        height: 8,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '— Chief Creative Officer',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        color: '#38bdf8',
        letterSpacing: 1.5,
      },
    ],
  },

  // 7. EVENT
  {
    id: 'tpl-event-masterclass',
    name: 'Live Masterclass & Webinar',
    description: 'High-impact event invitation with live date badge, speaker attribution, and RSVP action button.',
    category: 'event' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Event', 'Webinar', 'Masterclass', 'RSVP'],
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #090e1a 0%, #1e3a8a 60%, #2563eb 100%)',
      overlayOpacity: 0.2,
    },
    layers: [
      {
        id: 'l-event-live',
        type: 'text',
        name: 'Live Tag',
        x: 50,
        y: 20,
        width: 38,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '🔴 LIVE WEBINAR',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        color: '#fca5a5',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: 9999,
        letterSpacing: 2,
      },
      {
        id: 'l-event-head',
        type: 'text',
        name: 'Event Title',
        x: 50,
        y: 40,
        width: 86,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'AI Workflows That Actually Scale In 2026',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 44,
        fontWeight: '800',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.15,
      },
      {
        id: 'l-event-date',
        type: 'text',
        name: 'Date & Time',
        x: 50,
        y: 62,
        width: 76,
        height: 8,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: '🗓 Thursday, Oct 15 • 2:00 PM EST',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: '#38bdf8',
      },
      {
        id: 'l-event-speaker',
        type: 'text',
        name: 'Speaker',
        x: 50,
        y: 74,
        width: 70,
        height: 6,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'With Special Guest Alex Vance',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        color: '#cbd5e1',
      },
      {
        id: 'l-event-cta',
        type: 'text',
        name: 'RSVP Button',
        x: 50,
        y: 86,
        width: 44,
        height: 8,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Register Free Seat ➔',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        color: '#ffffff',
        backgroundColor: '#2563eb',
        backgroundPadding: 10,
        borderRadius: 9999,
      },
    ],
  },

  // 8. CAROUSEL
  {
    id: 'tpl-carousel-hook',
    name: 'Carousel Hook Slide (Cover)',
    description: 'Multi-slide carousel opener with swipe indicator arrows, checklist preview, and retention cues.',
    category: 'carousel' as TemplateCategory,
    aspectRatio: '4:5',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Carousel', 'Swipe', 'Multi-slide', 'Engagement'],
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)',
      overlayOpacity: 0.1,
    },
    layers: [
      {
        id: 'l-car-badge',
        type: 'text',
        name: 'Swipe Badge',
        x: 50,
        y: 18,
        width: 44,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'SWIPE TO READ ➔',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        color: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderRadius: 9999,
        letterSpacing: 2,
      },
      {
        id: 'l-car-head',
        type: 'text',
        name: 'Carousel Headline',
        x: 50,
        y: 38,
        width: 86,
        height: 22,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'How Top Agencies Automate 100+ Posts / Week',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 44,
        fontWeight: '900',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.15,
      },
      {
        id: 'l-car-sub',
        type: 'text',
        name: 'Carousel Subtitle',
        x: 50,
        y: 60,
        width: 76,
        height: 14,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'A complete breakdown of modern AI workflows without sacrificing quality.',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
        color: '#cbd5e1',
      },
      {
        id: 'l-car-slide',
        type: 'text',
        name: 'Slide Counter',
        x: 50,
        y: 82,
        width: 36,
        height: 6,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'Slide 1 of 6 ✦',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        color: '#facc15',
        letterSpacing: 1.5,
      },
    ],
  },

  // 9. SALE
  {
    id: 'tpl-sale-flash',
    name: 'Flash Sale & Limited Drop',
    description: 'High-urgency promotional sale card with percentage badge, coupon code box, and countdown urgency tag.',
    category: 'sale' as TemplateCategory,
    aspectRatio: '1:1',
    isBuiltIn: true,
    isCustom: false,
    tags: ['Sale', 'Discount', 'Promo Code', 'Urgency'],
    background: {
      type: 'gradient' as const,
      value: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
      overlayOpacity: 0.25,
    },
    layers: [
      {
        id: 'l-sale-badge',
        type: 'text',
        name: 'Sale Tag',
        x: 50,
        y: 20,
        width: 44,
        height: 6,
        rotation: -3,
        opacity: 1,
        visible: true,
        text: 'LIMITED TIME ONLY ⚡',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        color: '#0f172a',
        backgroundColor: '#facc15',
        backgroundPadding: 8,
        borderRadius: 9999,
        letterSpacing: 2,
      },
      {
        id: 'l-sale-head',
        type: 'text',
        name: 'Sale Headline',
        x: 50,
        y: 38,
        width: 86,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'SUMMER DROP 50% OFF',
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 52,
        fontWeight: '900',
        textAlign: 'center',
        color: '#ffffff',
        letterSpacing: -1,
        lineHeight: 1.1,
      },
      {
        id: 'l-sale-sub',
        type: 'text',
        name: 'Promo Code',
        x: 50,
        y: 62,
        width: 60,
        height: 10,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: 'USE CODE: GLOW50 AT CHECKOUT',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        color: '#38bdf8',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backgroundPadding: 10,
        borderRadius: 8,
        letterSpacing: 2,
      },
      {
        id: 'l-sale-note',
        type: 'text',
        name: 'Expiration Note',
        x: 50,
        y: 80,
        width: 60,
        height: 6,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: 'Offer expires Sunday at midnight',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
        color: '#cbd5e1',
      },
    ],
  },
];

export class TemplateController {
  // List all available graphic templates (built-in 9 categories + brand custom templates)
  public static async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { category, q } = req.query as { category?: string; q?: string };

      // 1. Fetch custom templates created for this brand or tenant
      let customDbTemplates: any[] = [];
      try {
        if (brandId) {
          customDbTemplates = await db('templates').where('brand_id', brandId).orderBy('created_at', 'desc');
        } else if ((req as any).user?.tenantId) {
          customDbTemplates = await db('templates').where('tenant_id', (req as any).user.tenantId).orderBy('created_at', 'desc');
        }
      } catch (err) {
        console.warn('[TemplateController.listTemplates] Warning fetching custom templates:', err);
      }

      const formattedCustomTemplates = customDbTemplates.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        category: row.category as TemplateCategory,
        aspectRatio: row.aspect_ratio || '1:1',
        isBuiltIn: false,
        isCustom: true,
        brandId: row.brand_id,
        tenantId: row.tenant_id,
        background: typeof row.background === 'string' ? JSON.parse(row.background) : row.background,
        layers: typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers,
        tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : ['Custom'],
        thumbnailUrl: row.thumbnail_url || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Combine canonical built-in templates (including Stage 4 catalog) with custom templates
      const { templateService } = await import('../services/templates/template.service.js');
      const builtIns = templateService.getBuiltInTemplates();
      let allTemplates = [...builtIns, ...formattedCustomTemplates];

      // Filter by category if requested
      if (category && category !== 'all') {
        if (category === 'custom') {
          allTemplates = allTemplates.filter((t) => t.isCustom);
        } else {
          allTemplates = allTemplates.filter((t) => t.category.toLowerCase() === category.toLowerCase());
        }
      }

      // Filter by search query if requested
      if (q && q.trim()) {
        const search = q.trim().toLowerCase();
        allTemplates = allTemplates.filter((t) =>
          t.name.toLowerCase().includes(search) ||
          (t.description && t.description.toLowerCase().includes(search)) ||
          t.category.toLowerCase().includes(search) ||
          (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(search)))
        );
      }

      res.json({
        success: true,
        data: allTemplates,
        meta: {
          total: allTemplates.length,
          categories: ['promotion', 'educational', 'product', 'announcement', 'testimonial', 'quote', 'event', 'carousel', 'sale'],
        },
      });
    } catch (err: any) {
      console.error('[TemplateController.listTemplates] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: err.message || 'Failed to list templates' },
      });
    }
  }

  // Get a single template by ID
  public static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, templateId } = req.params;

      // Check built-in and canonical Stage 4 templates first
      const { templateService } = await import('../services/templates/template.service.js');
      const builtIns = templateService.getBuiltInTemplates();
      const canonicalMatch = builtIns.find((t) => t.id === templateId) || BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
      if (canonicalMatch) {
        res.json({ success: true, data: canonicalMatch });
        return;
      }

      // Check custom templates in database
      let query = db('templates').where('id', templateId);
      if (brandId) {
        query = query.andWhere('brand_id', brandId);
      }
      const row = await query.first();
      if (!row) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Template '${templateId}' not found` },
        });
        return;
      }

      const template = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        category: row.category as TemplateCategory,
        aspectRatio: row.aspect_ratio || '1:1',
        isBuiltIn: false,
        isCustom: true,
        brandId: row.brand_id,
        tenantId: row.tenant_id,
        background: typeof row.background === 'string' ? JSON.parse(row.background) : row.background,
        layers: typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers,
        tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : ['Custom'],
        thumbnailUrl: row.thumbnail_url || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      res.json({ success: true, data: template });
    } catch (err: any) {
      console.error('[TemplateController.getTemplate] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'GET_ERROR', message: err.message || 'Failed to retrieve template' },
      });
    }
  }

  // Save current design as a new reusable template
  public static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      if ((req as any).user?.isAgent || req.headers['x-agent-call'] === 'true' || req.body?.isAgent) {
        res.status(403).json({
          success: false,
          error: {
            code: 'AI_MUTATION_RESTRICTED',
            message: 'AI agents cannot modify system template definitions. Templates are controlled system artifacts.',
          },
        });
        return;
      }

      const { brandId } = req.params;
      const {
        name,
        description = '',
        category = 'promotion',
        aspectRatio = '1:1',
        background,
        layers,
        tags = ['Custom'],
        thumbnailUrl = null,
      } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Template name is required' },
        });
        return;
      }

      if (!layers || !Array.isArray(layers)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Template layers array is required' },
        });
        return;
      }

      const brand = await db('brands').where('id', brandId).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const templateId = `tpl-custom-${crypto.randomUUID().slice(0, 8)}`;
      const newTemplateRow = {
        id: templateId,
        tenant_id: brand.tenant_id,
        brand_id: brand.id,
        name: name.trim(),
        description: description?.trim() || '',
        category: category.toLowerCase(),
        subcategory: req.body.subcategory || null,
        aspect_ratio: aspectRatio,
        dimensions: req.body.dimensions ? JSON.stringify(req.body.dimensions) : null,
        is_custom: true,
        is_built_in: false,
        background: JSON.stringify(background || { type: 'solid', value: '#0b0f19', overlayOpacity: 0 }),
        layers: JSON.stringify(layers),
        visual_components: JSON.stringify(req.body.visualComponents || layers),
        tags: JSON.stringify(tags),
        thumbnail_url: thumbnailUrl,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db('templates').insert(newTemplateRow);

      const saved = {
        ...newTemplateRow,
        background: background || { type: 'solid', value: '#0b0f19', overlayOpacity: 0 },
        layers,
        tags,
      };

      res.status(201).json({
        success: true,
        data: saved,
        message: 'Design saved as template successfully',
      });
    } catch (err: any) {
      console.error('[TemplateController.createTemplate] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'SAVE_ERROR', message: err.message || 'Failed to save design as template' },
      });
    }
  }

  // Duplicate an existing template
  public static async duplicateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, templateId } = req.params;

      const brand = await db('brands').where('id', brandId).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      // Check built-in first
      let source = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);

      // If not built-in, check database
      if (!source) {
        const row = await db('templates').where('id', templateId).andWhere('brand_id', brandId).first();
        if (row) {
          source = {
            id: row.id,
            name: row.name,
            description: row.description || '',
            category: row.category as TemplateCategory,
            aspectRatio: row.aspect_ratio || '1:1',
            isBuiltIn: false,
            isCustom: true,
            background: typeof row.background === 'string' ? JSON.parse(row.background) : row.background,
            layers: typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers,
            tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : ['Custom'],
          };
        }
      }

      if (!source) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Template '${templateId}' not found` },
        });
        return;
      }

      const newId = `tpl-custom-${crypto.randomUUID().slice(0, 8)}`;
      const duplicatedName = `${source.name} (Copy)`;

      const newRow = {
        id: newId,
        tenant_id: brand.tenant_id,
        brand_id: brand.id,
        name: duplicatedName,
        description: source.description || '',
        category: source.category,
        aspect_ratio: source.aspectRatio,
        is_custom: true,
        is_built_in: false,
        background: JSON.stringify(source.background),
        layers: JSON.stringify(source.layers),
        tags: JSON.stringify([...(source.tags || []), 'Duplicated']),
        thumbnail_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db('templates').insert(newRow);

      const duplicatedTemplate = {
        ...newRow,
        background: source.background,
        layers: source.layers,
        tags: [...(source.tags || []), 'Duplicated'],
      };

      res.status(201).json({
        success: true,
        data: duplicatedTemplate,
        message: `Template duplicated as "${duplicatedName}"`,
      });
    } catch (err: any) {
      console.error('[TemplateController.duplicateTemplate] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'DUPLICATE_ERROR', message: err.message || 'Failed to duplicate template' },
      });
    }
  }

  // Delete a custom template
  public static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      if ((req as any).user?.isAgent || req.headers['x-agent-call'] === 'true') {
        res.status(403).json({
          success: false,
          error: {
            code: 'AI_MUTATION_RESTRICTED',
            message: 'AI agents cannot modify system template definitions. Templates are controlled system artifacts.',
          },
        });
        return;
      }

      const { brandId, templateId } = req.params;

      const builtIn = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
      if (builtIn) {
        res.status(400).json({
          success: false,
          error: { code: 'PROTECTED_TEMPLATE', message: 'Standard built-in templates cannot be deleted' },
        });
        return;
      }

      const deletedCount = await db('templates').where('id', templateId).andWhere('brand_id', brandId).delete();
      if (!deletedCount) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Custom template '${templateId}' not found` },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (err: any) {
      console.error('[TemplateController.deleteTemplate] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'DELETE_ERROR', message: err.message || 'Failed to delete template' },
      });
    }
  }

  // Render a template and optionally save to Media Library
  public static async renderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const {
        templateId = 'quote_card_modern',
        aspectRatio = '1:1',
        saveToMediaLibrary = false,
        ...customFields
      } = req.body;

      // 1. Fetch Brand & Centralized Brand Brain for default theming
      const brand = await db('brands').where('id', brandId).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const brandBrain = await BrandBrainService.getBrandBrain(brandId);
      const primaryColors = brandBrain.visualIdentity?.colors || null;

      const renderOpts: TemplateRenderOptions = {
        templateId: templateId as ImageTemplateType,
        aspectRatio: aspectRatio as AspectRatioType,
        brandName: customFields.brandName || brand.name,
        brandHandle: customFields.brandHandle || `@${brand.slug}`,
        primaryColor: customFields.primaryColor || primaryColors?.primary || '#6366f1',
        accentColor: customFields.accentColor || primaryColors?.accent || '#ec4899',
        backgroundColor: customFields.backgroundColor || primaryColors?.background || '#0b0f19',
        textColor: customFields.textColor || primaryColors?.text || '#f8fafc',
        headline: customFields.headline,
        subtext: customFields.subtext,
        metric: customFields.metric,
        metricLabel: customFields.metricLabel,
        quote: customFields.quote,
        author: customFields.author,
        badge: customFields.badge,
      };

      const result = TemplateEngine.render(renderOpts);

      let savedAsset = null;
      if (saveToMediaLibrary) {
        const assetId = crypto.randomUUID();
        const fileName = `${templateId}-${aspectRatio.replace(':', 'x')}-${Date.now()}.svg`;
        const buffer = Buffer.from(result.svg, 'utf-8');

        await db('media_assets').insert({
          id: assetId,
          tenant_id: brand.tenant_id,
          brand_id: brand.id,
          storage_key: `templates/${fileName}`,
          public_url: result.dataUri,
          thumbnail_url: result.dataUri,
          file_name: fileName,
          mime_type: 'image/svg+xml',
          file_size_bytes: buffer.length,
          media_type: 'image',
          metadata: JSON.stringify({
            width: result.width,
            height: result.height,
            aspectRatio: result.aspectRatio,
            templateId: result.templateId,
            generator: 'SocialForge SVG Engine',
          }),
          created_at: new Date(),
        });

        savedAsset = await db('media_assets').where('id', assetId).first();
        if (savedAsset && typeof savedAsset.metadata === 'string') {
          savedAsset.metadata = JSON.parse(savedAsset.metadata);
        }
      }

      res.json({
        success: true,
        data: {
          ...result,
          asset: savedAsset,
        },
      });
    } catch (err: any) {
      console.error('[TemplateController.renderTemplate] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'RENDER_ERROR', message: err.message || 'Failed to render template' },
      });
    }
  }

  // Direct SVG preview endpoint (returns image/svg+xml content-type)
  public static async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const query = req.query as Record<string, string>;

      const brand = await db('brands').where('id', brandId).first();
      const brandKit = brand ? await db('brand_kits').where('brand_id', brandId).first() : null;
      const primaryColors = brandKit?.primary_colors
        ? (typeof brandKit.primary_colors === 'string' ? JSON.parse(brandKit.primary_colors) : brandKit.primary_colors)
        : null;

      const renderOpts: TemplateRenderOptions = {
        templateId: (query.templateId as ImageTemplateType) || 'quote_card_modern',
        aspectRatio: (query.aspectRatio as AspectRatioType) || '1:1',
        brandName: query.brandName || brand?.name || 'SocialForge Brand',
        brandHandle: query.brandHandle || (brand ? `@${brand.slug}` : '@socialforge'),
        primaryColor: query.primaryColor || primaryColors?.primary || '#6366f1',
        accentColor: query.accentColor || primaryColors?.accent || '#ec4899',
        backgroundColor: query.backgroundColor || primaryColors?.background || '#0b0f19',
        textColor: query.textColor || primaryColors?.text || '#f8fafc',
        headline: query.headline,
        subtext: query.subtext,
        metric: query.metric,
        metricLabel: query.metricLabel,
        quote: query.quote,
        author: query.author,
        badge: query.badge,
      };

      const result = TemplateEngine.render(renderOpts);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(result.svg);
    } catch (err: any) {
      console.error('[TemplateController.previewTemplate] Error:', err);
      res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg"><text y="20" fill="red">Error rendering template: ${err.message}</text></svg>`);
    }
  }

  // Synthesize on-brand AI social poster from post text
  public static async generateAiPoster(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const {
        text,
        style,
        aspectRatio = '1:1',
        customTopic,
        saveToMediaLibrary = false,
      } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Post text is required for AI graphic generation' },
        });
        return;
      }

      // Fetch Brand & Centralized Brand Brain
      const brand = await db('brands').where('id', brandId).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const brandBrain = await BrandBrainService.getBrandBrain(brandId);
      const primaryColors = brandBrain.visualIdentity?.colors || null;

      const generated = AiPosterService.generatePoster({
        text,
        brandName: brand.name,
        brandSlug: brand.slug,
        primaryColor: primaryColors?.primary || '#8b5cf6',
        accentColor: primaryColors?.accent || '#ec4899',
        backgroundColor: primaryColors?.background || '#0b0f19',
        textColor: primaryColors?.text || '#ffffff',
        style,
        aspectRatio,
        customTopic,
      });

      let savedAsset = null;
      if (saveToMediaLibrary && generated.svg) {
        const assetId = crypto.randomUUID();
        const fileName = `ai-poster-${generated.topic}-${aspectRatio.replace(':', 'x')}-${Date.now()}.svg`;
        const buffer = Buffer.from(generated.svg, 'utf-8');

        await db('media_assets').insert({
          id: assetId,
          tenant_id: brand.tenant_id,
          brand_id: brand.id,
          storage_key: `templates/${fileName}`,
          public_url: generated.dataUri,
          thumbnail_url: generated.dataUri,
          file_name: fileName,
          mime_type: 'image/svg+xml',
          file_size_bytes: buffer.length,
          media_type: 'image',
          metadata: JSON.stringify({
            aspectRatio: generated.aspectRatio,
            headline: generated.headline,
            badge: generated.badge,
            topic: generated.topic,
            style: generated.style,
            generator: 'SocialForge AI Graphic Generator',
          }),
          created_at: new Date(),
        });

        savedAsset = await db('media_assets').where('id', assetId).first();
        if (savedAsset && typeof savedAsset.metadata === 'string') {
          savedAsset.metadata = JSON.parse(savedAsset.metadata);
        }
      }

      res.json({
        success: true,
        data: {
          ...generated,
          asset: savedAsset,
        },
      });
    } catch (err: any) {
      console.error('[TemplateController.generateAiPoster] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'GENERATION_ERROR', message: err.message || 'Failed to generate AI poster' },
      });
    }
  }

  // --- STAGE 4: TEMPLATE ENGINE EXTENSIONS ---

  /**
   * GET /templates/:templateId/versions
   */
  static async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { templateId } = req.params;
      const { templateVersionService } = await import('../services/templates/templateVersion.service.js');
      const versions = await templateVersionService.listVersions(tenantId, templateId);
      res.json({ success: true, versions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /templates/:templateId/versions
   */
  static async createVersion(req: Request, res: Response): Promise<void> {
    try {
      if ((req as any).user?.isAgent || req.headers['x-agent-call'] === 'true' || req.body?.isAgent) {
        res.status(403).json({
          success: false,
          error: {
            code: 'AI_MUTATION_RESTRICTED',
            message: 'AI agents cannot modify system template definitions. Templates are controlled system artifacts.',
          },
        });
        return;
      }

      const tenantId = (req as any).user?.tenantId;
      const { templateId } = req.params;
      const { changelog } = req.body;
      const { templateVersionService } = await import('../services/templates/templateVersion.service.js');
      const version = await templateVersionService.recordVersion(tenantId, templateId, {
        changelog,
        createdBy: (req as any).user?.id,
      });
      res.json({ success: true, version });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /templates/:templateId/versions/:versionNumber/rollback
   */
  static async rollbackVersion(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { templateId, versionNumber } = req.params;
      const { templateVersionService } = await import('../services/templates/templateVersion.service.js');
      const result = await templateVersionService.rollbackToVersion(
        tenantId,
        templateId,
        parseInt(versionNumber, 10),
        (req as any).user?.id
      );
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /templates/:templateId/validate
   */
  static async validateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { brandId } = req.params;
      const template = req.body.template || req.body;
      const { templateValidatorService } = await import('../services/templates/templateValidator.service.js');
      const report = await templateValidatorService.validateTemplate(tenantId, brandId, template);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /templates/:templateId/variants
   */
  static async generateVariants(req: Request, res: Response): Promise<void> {
    try {
      const { templateService } = await import('../services/templates/template.service.js');
      const template = req.body.template || req.body;
      const platforms = req.body.platforms;
      const variants = templateService.generatePlatformVariants(template, platforms);
      res.json({ success: true, variants });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /templates/select
   */
  static async selectTemplate(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user?.tenantId;
      const { brandId } = req.params;
      const { category, platform, aspectRatio } = req.body;
      const { templateService } = await import('../services/templates/template.service.js');
      const selected = await templateService.selectBestTemplate(tenantId, {
        category,
        platform,
        aspectRatio,
        brandId,
      });
      res.json({ success: true, data: selected });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
