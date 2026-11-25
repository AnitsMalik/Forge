import type {
  AspectRatioType,
  AiPosterStyleType,
  AiPosterLayer,
  AiPosterGenerateResponse,
} from '@socialforge/shared';

interface PosterServiceOptions {
  text: string;
  brandName: string;
  brandSlug: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: AiPosterStyleType;
  aspectRatio?: AspectRatioType;
  customTopic?: string;
}

const STOCK_PHOTOS_BY_TOPIC: Record<string, string[]> = {
  beauty: [
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1080&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&q=80',
    'https://images.unsplash.com/photo-1512290900672-1f55b9e075e8?w=1080&q=80',
  ],
  tech: [
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1080&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
  ],
  business: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&q=80',
  ],
  lifestyle: [
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&q=80',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1080&q=80',
  ],
};

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export class AiPosterService {
  /**
   * Cleans raw text of hashtags, URLs, and formatting artifacts.
   */
  public static cleanText(raw: string): string {
    return raw
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/#\w+/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  /**
   * Detects industry or topic domain.
   */
  public static detectTopic(text: string): string {
    const lower = text.toLowerCase();
    if (/skin|beauty|glow|serum|cosmetic|dermatolog|hydrate|clean\s*beauty|botanical|hair|makeup/i.test(lower)) {
      return 'beauty';
    }
    if (/ai|tech|software|saas|cloud|data|code|api|platform|app|algorithm|cyber/i.test(lower)) {
      return 'tech';
    }
    if (/revenue|market|scale|b2b|enterprise|growth|client|roi|sales|quarter|funding/i.test(lower)) {
      return 'business';
    }
    if (/habit|wellness|fitness|health|routine|mindful|meditat|gym|lifestyle/i.test(lower)) {
      return 'lifestyle';
    }
    return 'general';
  }

  /**
   * Extracts or synthesizes a high-impact headline hook.
   */
  public static extractHeadline(text: string): string {
    // Check first line
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines.length > 0 ? this.cleanText(lines[0]) : '';

    if (firstLine && firstLine.length >= 8 && firstLine.length <= 65) {
      return firstLine.replace(/^["']|["']$/g, '');
    }

    // Try finding the first sentence
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    for (const s of sentences) {
      const cleaned = this.cleanText(s).replace(/^["']|["']$/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 65) {
        return cleaned;
      }
    }

    // Fallback: first 50 chars cleanly broken on word boundary
    const cleaned = this.cleanText(text);
    if (cleaned.length <= 50) return cleaned || 'Transform Your Brand Reach';
    const truncated = cleaned.slice(0, 50);
    return truncated.slice(0, truncated.lastIndexOf(' ')) || 'Transform Your Brand Reach';
  }

  /**
   * Extracts or detects an eye-catching pill badge.
   */
  public static extractBadge(text: string, topic: string): string {
    const lower = text.toLowerCase();
    if (/launch|meet|introducing|announce|official|live/i.test(lower)) {
      return '✦ EXCLUSIVE LAUNCH';
    }
    if (/discount|sale|off|code|promo|special/i.test(lower)) {
      return '🔥 SPECIAL OFFER';
    }
    if (/tip|secret|guide|how to|rule|rule\s*#|breakdown/i.test(lower)) {
      return '💡 PRO INSIGHT';
    }
    if (/%|\+?\d+%\s*(boost|increase|growth)|results|proven/i.test(lower)) {
      return '📈 VERIFIED RESULTS';
    }
    if (/quote|saying|lesson|wisdom|mindset/i.test(lower)) {
      return '💬 DAILY INSPIRATION';
    }

    // Topic-based fallbacks
    switch (topic) {
      case 'beauty':
        return '✨ CLEAN BEAUTY SPOTLIGHT';
      case 'tech':
        return '⚡ TECH INNOVATION';
      case 'business':
        return '✦ EXECUTIVE BRIEF';
      case 'lifestyle':
        return '🌿 WELLNESS FOCUS';
      default:
        return '✨ FEATURED UPDATE';
    }
  }

  /**
   * Extracts metrics or statistics if present in copy.
   */
  public static extractMetric(text: string): { metric?: string; metricLabel?: string } {
    // Matches patterns like +340%, 15%, 94%, 10x, $1.5M, etc.
    const metricMatch = text.match(/(?:\+|\-)?\d+(?:\.\d+)?(?:%|x|k|m|b)/i);
    if (!metricMatch) return {};

    const metric = metricMatch[0].toUpperCase();

    // Look for neighboring words following or preceding
    const metricIndex = text.indexOf(metricMatch[0]);
    const after = text.slice(metricIndex + metricMatch[0].length, metricIndex + metricMatch[0].length + 45);
    const wordsAfter = this.cleanText(after).split(/\s+/).slice(0, 3).join(' ');

    let metricLabel = wordsAfter.length > 2 ? wordsAfter : 'Proven Performance';
    // Capitalize words
    metricLabel = metricLabel.replace(/\b\w/g, (c) => c.toUpperCase());

    return { metric, metricLabel };
  }

  /**
   * Extracts a concise supporting subtext.
   */
  public static extractSubtext(text: string, headline: string): string {
    const cleaned = this.cleanText(text);
    // Remove the headline part if it exists in the cleaned text
    let remaining = cleaned.replace(headline, '').trim();

    // Match a sentence of reasonable length
    const sentences = remaining.match(/[^.!?]+[.!?]+/g) || [remaining];
    for (const s of sentences) {
      const cleanSentence = s.trim();
      if (cleanSentence.length >= 25 && cleanSentence.length <= 110) {
        return cleanSentence;
      }
    }

    if (remaining.length > 15) {
      return remaining.slice(0, 95) + '...';
    }

    return 'Crafted with precision to deliver unmistakable value and engagement across every channel.';
  }

  /**
   * Synthesizes poster layers, background, and SVG for canvas rendering.
   */
  public static generatePoster(options: PosterServiceOptions): AiPosterGenerateResponse {
    const {
      text,
      brandName,
      brandSlug,
      primaryColor = '#8b5cf6',
      accentColor = '#ec4899',
      backgroundColor = '#0b0f19',
      textColor = '#ffffff',
      aspectRatio = '1:1',
      customTopic,
    } = options;

    const topic = customTopic || this.detectTopic(text);
    const headline = this.extractHeadline(text);
    const badge = this.extractBadge(text, topic);
    const { metric, metricLabel } = this.extractMetric(text);
    const subtext = this.extractSubtext(text, headline);

    // Determine style if not explicitly specified
    let style = options.style;
    if (!style) {
      if (metric) {
        style = 'stat_highlight';
      } else if (topic === 'beauty') {
        style = 'minimalist_editorial';
      } else if (topic === 'tech') {
        style = 'modern_gradient';
      } else {
        style = 'bold_impact';
      }
    }

    // Select typography based on topic and style
    let headlineFont = "'Outfit', sans-serif";
    let subtextFont = "'Plus Jakarta Sans', sans-serif";
    if (style === 'minimalist_editorial' || topic === 'beauty') {
      headlineFont = "'Playfair Display', serif";
    } else if (topic === 'tech') {
      headlineFont = "'Space Grotesk', sans-serif";
    } else if (topic === 'business') {
      headlineFont = "'Montserrat', sans-serif";
    }

    // Select background config
    let bgType: 'gradient' | 'solid' | 'image' = 'gradient';
    let bgValue = `linear-gradient(135deg, ${primaryColor} 0%, #4338ca 50%, ${accentColor} 100%)`;
    let bgOverlayOpacity = 0.35;

    const topicPhotos = STOCK_PHOTOS_BY_TOPIC[topic] || STOCK_PHOTOS_BY_TOPIC.beauty;
    const selectedPhoto = topicPhotos[0];

    switch (style) {
      case 'modern_gradient':
        bgType = 'gradient';
        bgValue = `linear-gradient(135deg, ${primaryColor} 0%, #1e1b4b 60%, ${accentColor} 100%)`;
        bgOverlayOpacity = 0.25;
        break;
      case 'minimalist_editorial':
        bgType = 'image';
        bgValue = selectedPhoto;
        bgOverlayOpacity = 0.45;
        break;
      case 'bold_impact':
        bgType = 'gradient';
        bgValue = `linear-gradient(135deg, #090d16 0%, #312e81 60%, ${accentColor} 100%)`;
        bgOverlayOpacity = 0.3;
        break;
      case 'stat_highlight':
        bgType = 'solid';
        bgValue = '#070a13';
        bgOverlayOpacity = 0.2;
        break;
      case 'dark_luxe':
        bgType = 'solid';
        bgValue = '#05070e';
        bgOverlayOpacity = 0.4;
        break;
    }

    // Icon matching
    let iconName = 'Sparkles';
    if (style === 'stat_highlight' || metric) iconName = 'TrendingUp';
    else if (topic === 'tech') iconName = 'Zap';
    else if (topic === 'business') iconName = 'Award';
    else if (badge.includes('OFFER') || badge.includes('DEAL')) iconName = 'Flame';

    // Build layers array compatible with CanvasLayer schema
    const layers: AiPosterLayer[] = [];

    // 1. Badge Pill Layer
    layers.push({
      id: 'layer-badge',
      type: 'text',
      name: 'Badge Pill',
      x: 50,
      y: style === 'stat_highlight' ? 18 : 20,
      width: 44,
      height: 6,
      rotation: 0,
      opacity: 1,
      visible: true,
      text: badge,
      fontFamily: "'Outfit', sans-serif",
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
      color: '#ffffff',
      backgroundColor: accentColor,
      backgroundPadding: 8,
      borderRadius: 9999,
      textTransform: 'uppercase',
      letterSpacing: 2,
    });

    // 2. Icon Layer
    layers.push({
      id: 'layer-icon',
      type: 'icon',
      name: 'Accent Icon',
      x: 50,
      y: style === 'stat_highlight' ? 27 : 29,
      width: 6,
      height: 6,
      rotation: 0,
      opacity: 0.95,
      visible: true,
      iconName,
      iconColor: accentColor,
    });

    // 3. Stat highlight or Main Headline
    if (style === 'stat_highlight' && metric) {
      // Massive metric layer
      layers.push({
        id: 'layer-metric',
        type: 'text',
        name: 'Stat Highlight',
        x: 50,
        y: 44,
        width: 80,
        height: 18,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: metric,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 76,
        fontWeight: '800',
        textAlign: 'center',
        color: '#ffffff',
        shadowColor: primaryColor,
        shadowBlur: 24,
      });

      // Metric label
      layers.push({
        id: 'layer-metric-label',
        type: 'text',
        name: 'Stat Description',
        x: 50,
        y: 57,
        width: 70,
        height: 8,
        rotation: 0,
        opacity: 0.95,
        visible: true,
        text: metricLabel || 'Verified Clinical Metric',
        fontFamily: "'Outfit', sans-serif",
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        color: '#a78bfa',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      });

      // Supporting headline below stat
      layers.push({
        id: 'layer-headline',
        type: 'text',
        name: 'Insight Hook',
        x: 50,
        y: 69,
        width: 82,
        height: 12,
        rotation: 0,
        opacity: 0.95,
        visible: true,
        text: headline,
        fontFamily: headlineFont,
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        color: '#ffffff',
        lineHeight: 1.25,
      });
    } else {
      // Standard Headline Layer
      layers.push({
        id: 'layer-headline',
        type: 'text',
        name: 'Main Headline',
        x: 50,
        y: 43,
        width: 84,
        height: 20,
        rotation: 0,
        opacity: 1,
        visible: true,
        text: headline,
        fontFamily: headlineFont,
        fontSize: 48,
        fontWeight: '700',
        textAlign: 'center',
        color: textColor,
        shadowColor: 'rgba(0, 0, 0, 0.75)',
        shadowBlur: 18,
        lineHeight: 1.18,
      });

      // Subtext Layer
      layers.push({
        id: 'layer-subtext',
        type: 'text',
        name: 'Subheading',
        x: 50,
        y: 65,
        width: 78,
        height: 12,
        rotation: 0,
        opacity: 0.9,
        visible: true,
        text: subtext,
        fontFamily: subtextFont,
        fontSize: 20,
        fontWeight: '500',
        textAlign: 'center',
        color: '#e2e8f0',
        lineHeight: 1.42,
      });
    }

    // 4. Brand Watermark / Handle Footer Layer
    layers.push({
      id: 'layer-handle',
      type: 'text',
      name: 'Brand Watermark',
      x: 50,
      y: 86,
      width: 55,
      height: 6,
      rotation: 0,
      opacity: 0.85,
      visible: true,
      text: `@${brandSlug || 'socialforge'}  •  ${brandName || 'SocialForge'}`,
      fontFamily: "'Outfit', sans-serif",
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
      color: '#cbd5e1',
      letterSpacing: 1.2,
    });

    // Generate crisp SVG Preview
    const { svg, dataUri } = this.renderPreviewSvg({
      aspectRatio,
      headline,
      badge,
      subtext,
      metric,
      metricLabel,
      brandName,
      brandSlug,
      primaryColor,
      accentColor,
      backgroundColor,
      style,
      headlineFont,
    });

    return {
      headline,
      badge,
      subtext,
      metric,
      metricLabel,
      topic,
      style,
      aspectRatio,
      background: {
        type: bgType,
        value: bgValue,
        overlayOpacity: bgOverlayOpacity,
      },
      layers,
      svg,
      dataUri,
    };
  }

  /**
   * Renders high-resolution vector SVG for instant preview and asset storage.
   */
  public static renderPreviewSvg(options: {
    aspectRatio: AspectRatioType;
    headline: string;
    badge: string;
    subtext: string;
    metric?: string;
    metricLabel?: string;
    brandName: string;
    brandSlug: string;
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    style: AiPosterStyleType;
    headlineFont: string;
  }): { svg: string; dataUri: string } {
    const dimensionsMap: Record<AspectRatioType, { width: number; height: number }> = {
      '1:1': { width: 1080, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
      '1.91:1': { width: 1200, height: 630 },
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1200, height: 675 },
      instagram_square: { width: 1080, height: 1080 },
      instagram_portrait: { width: 1080, height: 1350 },
      instagram_story: { width: 1080, height: 1920 },
      facebook: { width: 1200, height: 630 },
      linkedin: { width: 1200, height: 627 },
      x: { width: 1200, height: 675 },
      youtube_thumbnail: { width: 1280, height: 720 },
    };


    const { width, height } = dimensionsMap[options.aspectRatio] || dimensionsMap['1:1'];

    // Wrap headline into 2-3 lines
    const words = options.headline.split(/\s+/);
    const lines: string[] = [];
    let curLine = '';
    for (const w of words) {
      if ((curLine + ' ' + w).trim().length <= 26) {
        curLine = (curLine + ' ' + w).trim();
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
      }
    }
    if (curLine) lines.push(curLine);

    const headlineSvgLines = lines
      .map((l, i) => `<tspan x="${width / 2}" dy="${i === 0 ? 0 : 54}">${escapeXml(l)}</tspan>`)
      .join('');

    const subtextLines: string[] = [];
    let curSub = '';
    for (const w of options.subtext.split(/\s+/)) {
      if ((curSub + ' ' + w).trim().length <= 42) {
        curSub = (curSub + ' ' + w).trim();
      } else {
        if (curSub) subtextLines.push(curSub);
        curSub = w;
      }
    }
    if (curSub) subtextLines.push(curSub);

    const subtextSvgLines = subtextLines
      .slice(0, 3)
      .map((l, i) => `<tspan x="${width / 2}" dy="${i === 0 ? 0 : 30}">${escapeXml(l)}</tspan>`)
      .join('');

    const isStat = options.style === 'stat_highlight' && options.metric;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${options.backgroundColor}" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#050814" />
    </linearGradient>

    <!-- Accent Gradient -->
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${options.primaryColor}" />
      <stop offset="100%" stop-color="${options.accentColor}" />
    </linearGradient>

    <!-- Glowing Filters -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Ambient Glow Orbs -->
  <circle cx="${width * 0.2}" cy="${height * 0.25}" r="${width * 0.35}" fill="${options.primaryColor}" opacity="0.22" filter="url(#softGlow)" />
  <circle cx="${width * 0.8}" cy="${height * 0.7}" r="${width * 0.38}" fill="${options.accentColor}" opacity="0.18" filter="url(#softGlow)" />

  <!-- Glassmorphic Card Container -->
  <rect x="${width * 0.08}" y="${height * 0.1}" width="${width * 0.84}" height="${height * 0.8}" rx="28" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" />

  <!-- Pill Badge Tag -->
  <g transform="translate(${width / 2}, ${height * 0.2})">
    <rect x="-140" y="-18" width="280" height="36" rx="18" fill="${options.accentColor}" />
    <text text-anchor="middle" y="5" fill="#ffffff" font-family="'Outfit', sans-serif" font-size="14" font-weight="700" letter-spacing="2">
      ${escapeXml(options.badge)}
    </text>
  </g>

  ${isStat
        ? `
  <!-- Massive Metric -->
  <text x="${width / 2}" y="${height * 0.44}" text-anchor="middle" fill="#ffffff" font-family="'Space Grotesk', sans-serif" font-size="96" font-weight="800" filter="drop-shadow(0 8px 24px ${options.primaryColor})">
    ${escapeXml(options.metric || '')}
  </text>
  <text x="${width / 2}" y="${height * 0.52}" text-anchor="middle" fill="${options.accentColor}" font-family="'Outfit', sans-serif" font-size="20" font-weight="700" letter-spacing="2">
    ${escapeXml(options.metricLabel || '')}
  </text>
  <!-- Hook Headline -->
  <text x="${width / 2}" y="${height * 0.65}" text-anchor="middle" fill="#ffffff" font-family="${options.headlineFont}" font-size="34" font-weight="700">
    ${headlineSvgLines}
  </text>
  `
        : `
  <!-- Main Hook Headline -->
  <text x="${width / 2}" y="${height * 0.42}" text-anchor="middle" fill="#ffffff" font-family="${options.headlineFont}" font-size="44" font-weight="700" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.8))">
    ${headlineSvgLines}
  </text>

  <!-- Subtext -->
  <text x="${width / 2}" y="${height * 0.62}" text-anchor="middle" fill="#cbd5e1" font-family="'Plus Jakarta Sans', sans-serif" font-size="20" font-weight="500">
    ${subtextSvgLines}
  </text>
  `
      }

  <!-- Footer Watermark -->
  <text x="${width / 2}" y="${height * 0.84}" text-anchor="middle" fill="#94a3b8" font-family="'Outfit', sans-serif" font-size="16" font-weight="600" letter-spacing="1.5">
    @${escapeXml(options.brandSlug || 'socialforge')}  •  ${escapeXml(options.brandName || 'SocialForge')}
  </text>
</svg>
`.trim();

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    return { svg, dataUri };
  }
}
