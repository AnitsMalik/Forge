import type {
  AspectRatioType,
  ImageTemplateType,
  RenderedTemplateResult,
  TemplateRenderOptions,
} from '@socialforge/shared';

interface Dimensions {
  width: number;
  height: number;
}

export const ASPECT_RATIOS: Record<AspectRatioType, Dimensions> = {
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

function wrapText(text: string, maxChars = 32): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export class TemplateEngine {
  public static getDimensions(aspectRatio: AspectRatioType): Dimensions {
    return ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['1:1'];
  }

  public static render(options: TemplateRenderOptions): RenderedTemplateResult {
    const {
      templateId,
      aspectRatio = '1:1',
      primaryColor = '#6366f1',
      accentColor = '#ec4899',
      backgroundColor = '#0b0f19',
      textColor = '#f8fafc',
      brandName = 'SocialForge Brand',
      brandHandle = '@socialforge',
    } = options;

    const { width, height } = this.getDimensions(aspectRatio);

    let contentSvg = '';

    switch (templateId) {
      case 'quote_card_modern':
        contentSvg = this.renderQuoteCard(options, width, height);
        break;
      case 'stat_highlight':
        contentSvg = this.renderStatHighlight(options, width, height);
        break;
      case 'announcement_banner':
        contentSvg = this.renderAnnouncementBanner(options, width, height);
        break;
      case 'tip_carousel_cover':
        contentSvg = this.renderTipCarouselCover(options, width, height);
        break;
      default:
        contentSvg = this.renderQuoteCard(options, width, height);
        break;
    }

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${backgroundColor}" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <!-- Accent Gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${accentColor}" />
    </linearGradient>

    <!-- Soft Glow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="80" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Canvas Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Ambient Light Orbs -->
  <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${Math.min(width, height) * 0.4}" fill="${primaryColor}" opacity="0.18" filter="url(#glow)" />
  <circle cx="${width * 0.15}" cy="${height * 0.85}" r="${Math.min(width, height) * 0.35}" fill="${accentColor}" opacity="0.15" filter="url(#glow)" />

  <!-- Card Border & Backdrop Grid -->
  <rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="32" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />

  ${contentSvg}

  <!-- Brand Signature Footer -->
  <g transform="translate(70, ${height - 70})">
    <rect x="-10" y="-24" width="${width - 120}" height="40" fill="none" />
    <circle cx="8" cy="-4" r="6" fill="url(#accentGrad)" />
    <text x="24" y="0" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" letter-spacing="0.5">
      ${escapeXml(brandName)}
    </text>
    <text x="${width - 150}" y="0" text-anchor="end" fill="rgba(255, 255, 255, 0.5)" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">
      ${escapeXml(brandHandle)}
    </text>
  </g>
</svg>
`.trim();

    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      templateId,
      aspectRatio,
      svg,
      dataUri,
      width,
      height,
    };
  }

  // Template 1: Modern Quote Card
  private static renderQuoteCard(opts: TemplateRenderOptions, width: number, height: number): string {
    const quote = opts.quote || opts.headline || 'Creativity is intelligence having fun. Elevate your presence across every channel.';
    const author = opts.author || opts.brandName || 'Brand Voice';
    const badge = opts.badge || 'INSIGHT';
    const maxChars = width > 1000 ? 30 : 24;
    const lines = wrapText(quote, maxChars);

    const cardWidth = width - 140;
    const cardHeight = height - 220;
    const startY = height * 0.38 - (lines.length * 36);

    const tspans = lines
      .map((line, idx) => `<tspan x="${width / 2}" dy="${idx === 0 ? 0 : 56}">${escapeXml(line)}</tspan>`)
      .join('\n');

    return `
    <!-- Top Pill Badge -->
    <g transform="translate(${width / 2}, 110)">
      <rect x="-70" y="-18" width="140" height="36" rx="18" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" />
      <text text-anchor="middle" y="5" fill="${opts.accentColor || '#ec4899'}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" letter-spacing="2">
        ${escapeXml(badge.toUpperCase())}
      </text>
    </g>

    <!-- Glowing Quote Glyph -->
    <text x="${width / 2}" y="${height * 0.26}" text-anchor="middle" fill="${opts.primaryColor || '#6366f1'}" opacity="0.3" font-family="Georgia, serif" font-size="140" font-weight="bold">“</text>

    <!-- Glass Card Container -->
    <rect x="70" y="150" width="${cardWidth}" height="${cardHeight}" rx="24" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" />

    <!-- Main Quote Text -->
    <text x="${width / 2}" y="${Math.max(280, startY)}" text-anchor="middle" fill="${opts.textColor || '#f8fafc'}" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="600" font-style="italic">
      ${tspans}
    </text>

    <!-- Author Attribution -->
    <g transform="translate(${width / 2}, ${height - 180})">
      <line x1="-50" y1="-20" x2="50" y2="-20" stroke="url(#accentGrad)" stroke-width="2" stroke-linecap="round" />
      <text text-anchor="middle" y="10" fill="${opts.textColor || '#ffffff'}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700">
        — ${escapeXml(author)}
      </text>
    </g>
    `;
  }

  // Template 2: Stat & KPI Highlight
  private static renderStatHighlight(opts: TemplateRenderOptions, width: number, height: number): string {
    const metric = opts.metric || '+340%';
    const metricLabel = opts.metricLabel || 'Organic Engagement Growth';
    const subtext = opts.subtext || opts.headline || 'Verified performance across multi-channel client accounts.';
    const badge = opts.badge || '✦ PERFORMANCE METRIC';

    const subLines = wrapText(subtext, 36);
    const subTspans = subLines
      .map((line, idx) => `<tspan x="${width / 2}" dy="${idx === 0 ? 0 : 36}">${escapeXml(line)}</tspan>`)
      .join('\n');

    return `
    <!-- Top Pill Badge -->
    <g transform="translate(${width / 2}, 120)">
      <rect x="-120" y="-18" width="240" height="36" rx="18" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" />
      <text text-anchor="middle" y="5" fill="${opts.accentColor || '#ec4899'}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1.5">
        ${escapeXml(badge)}
      </text>
    </g>

    <!-- Central Halo Glow Behind Stat -->
    <circle cx="${width / 2}" cy="${height * 0.44}" r="${Math.min(width, height) * 0.28}" fill="url(#accentGrad)" opacity="0.12" filter="url(#glow)" />

    <!-- Big Metric Number -->
    <text x="${width / 2}" y="${height * 0.46}" text-anchor="middle" fill="url(#accentGrad)" font-family="system-ui, -apple-system, sans-serif" font-size="${width > 900 ? 120 : 96}" font-weight="900" letter-spacing="-2">
      ${escapeXml(metric)}
    </text>

    <!-- Metric Label -->
    <text x="${width / 2}" y="${height * 0.56}" text-anchor="middle" fill="${opts.textColor || '#ffffff'}" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" letter-spacing="0.5">
      ${escapeXml(metricLabel)}
    </text>

    <!-- Subtext Explainer -->
    <text x="${width / 2}" y="${height * 0.65}" text-anchor="middle" fill="rgba(255, 255, 255, 0.65)" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400">
      ${subTspans}
    </text>
    `;
  }

  // Template 3: Announcement Banner
  private static renderAnnouncementBanner(opts: TemplateRenderOptions, width: number, height: number): string {
    const headline = opts.headline || 'Exciting Product Announcement';
    const subtext = opts.subtext || 'Discover the next generation of social media automation built for brands and agencies.';
    const badge = opts.badge || '✨ NEW RELEASE';

    const headLines = wrapText(headline, 28);
    const headTspans = headLines
      .map((line, idx) => `<tspan x="${width / 2}" dy="${idx === 0 ? 0 : 54}">${escapeXml(line)}</tspan>`)
      .join('\n');

    const subLines = wrapText(subtext, 36);
    const subTspans = subLines
      .map((line, idx) => `<tspan x="${width / 2}" dy="${idx === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
      .join('\n');

    return `
    <!-- Top Pill Badge -->
    <g transform="translate(${width / 2}, 130)">
      <rect x="-100" y="-20" width="200" height="40" rx="20" fill="url(#accentGrad)" />
      <text text-anchor="middle" y="6" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="1.5">
        ${escapeXml(badge)}
      </text>
    </g>

    <!-- Headline -->
    <text x="${width / 2}" y="${height * 0.38}" text-anchor="middle" fill="${opts.textColor || '#ffffff'}" font-family="system-ui, -apple-system, sans-serif" font-size="${width > 900 ? 52 : 42}" font-weight="800" letter-spacing="-0.5">
      ${headTspans}
    </text>

    <!-- Subtext -->
    <text x="${width / 2}" y="${height * 0.58}" text-anchor="middle" fill="rgba(255, 255, 255, 0.7)" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400">
      ${subTspans}
    </text>

    <!-- Glass CTA Pill Button -->
    <g transform="translate(${width / 2}, ${height * 0.74})">
      <rect x="-130" y="-26" width="260" height="52" rx="26" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.5" />
      <text text-anchor="middle" y="8" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700">
        Discover More ↗
      </text>
    </g>
    `;
  }

  // Template 4: Tip & Checklist Carousel Cover
  private static renderTipCarouselCover(opts: TemplateRenderOptions, width: number, height: number): string {
    const headline = opts.headline || '3 Steps to Boost Your Content Velocity';
    const badge = opts.badge || 'PRO TIP #01';
    const tips = [
      'Maintain brand consistency across all channels',
      'Leverage AI for multi-platform copywriting',
      'Automate approval workflows with magic links',
    ];

    const headLines = wrapText(headline, 28);
    const headTspans = headLines
      .map((line, idx) => `<tspan x="100" dy="${idx === 0 ? 0 : 48}">${escapeXml(line)}</tspan>`)
      .join('\n');

    const tipCards = tips
      .map((tip, idx) => {
        const y = height * 0.44 + (idx * 90);
        return `
        <g transform="translate(100, ${y})">
          <rect x="0" y="0" width="${width - 200}" height="68" rx="16" fill="rgba(255, 255, 255, 0.04)" stroke="rgba(255, 255, 255, 0.09)" stroke-width="1.5" />
          <circle cx="34" cy="34" r="16" fill="url(#accentGrad)" />
          <text x="34" y="40" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900">${idx + 1}</text>
          <text x="70" y="41" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600">${escapeXml(tip)}</text>
        </g>
        `;
      })
      .join('\n');

    return `
    <!-- Top Pill Badge -->
    <g transform="translate(100, 120)">
      <rect x="0" y="-18" width="160" height="36" rx="18" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" />
      <text text-anchor="middle" x="80" y="5" fill="${opts.accentColor || '#ec4899'}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1.5">
        ${escapeXml(badge)}
      </text>
    </g>

    <!-- Headline Left-Aligned -->
    <text x="100" y="210" fill="${opts.textColor || '#ffffff'}" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="-0.5">
      ${headTspans}
    </text>

    <!-- Tip Checklist Cards -->
    ${tipCards}

    <!-- Bottom Swipe Indicator -->
    <g transform="translate(${width - 100}, ${height - 130})">
      <rect x="-160" y="-20" width="160" height="40" rx="20" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" />
      <text x="-80" y="6" text-anchor="middle" fill="${opts.accentColor || '#ec4899'}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700">
        SWIPE NEXT ➔
      </text>
    </g>
    `;
  }
}
