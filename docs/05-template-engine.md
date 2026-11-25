# SocialForge — Dynamic Image Template Engine

## 1. Engine Architecture & Rendering Stack

The SocialForge Image Template Engine is a headless, server-side graphics synthesis subsystem embedded in `apps/worker`. It converts structured JSON payloads into high-fidelity raster graphics (PNG / WebP) without running heavyweight headless browsers like Puppeteer:

```
[Dynamic Request Payload] + [Brand Kit Fonts & Colors]
                         │
                         ▼
             [React / JSX Component Definition]
                         │
                         ▼
             [Satori (JSX ➔ Clean SVG Engine)]
                         │
                         ▼
        [Resvg / Sharp (SVG ➔ High-Res PNG / WebP)]
                         │
                         ▼
             [Direct Upload to S3 / MinIO]
```

### Why Satori + Sharp over Puppeteer / Chrome?
- **Resource Footprint**: Puppeteer consumes $> 200\text{ MB}$ RAM per browser instance with high launch latency ($1-3\text{ seconds}$).
- **Throughput**: Satori + Sharp compiles JSX to SVG and rasterizes to PNG in $< 200\text{ ms}$ with $< 30\text{ MB}$ memory per job.
- **Font Precision**: Direct TrueType/OpenType font binary loading ensures consistent typographic rendering across Linux containers.

---

## 2. Supported Aspect Ratios & Platform Targets

| Ratio | Pixel Resolution | Typical Platform Usage |
| :--- | :--- | :--- |
| **1:1 Square** | 1080 x 1080 px | Instagram Feed, LinkedIn Feed, Facebook Carousel |
| **4:5 Portrait** | 1080 x 1350 px | Instagram Feed (Maximum vertical feed real estate) |
| **1.91:1 Landscape** | 1200 x 628 px | X (Twitter) Single Image, LinkedIn Link Preview |
| **9:16 Vertical Story**| 1080 x 1920 px | Instagram Stories, Facebook Stories, TikTok Graphic |

---

## 3. Standard Template Gallery

### Template 1: `quote_card_modern`
- **Purpose**: Executive quotes, customer testimonials, thought-leadership hooks.
- **Dynamic Slots**:
  - `quote`: Primary text block with automated smart quotes and quotation marks.
  - `authorName`: Attributed person's full name.
  - `authorTitle`: Professional title or affiliation.
  - `authorAvatarUrl`: Optional circular avatar image.
- **Brand Kit Injections**:
  - Background color gradient (from Brand Kit `primary_colors.background` to `primary_colors.secondary`).
  - Text typography (Brand Kit `fonts.heading`).
  - Brand Logo bug in the top-right corner.

### Template 2: `stat_highlight`
- **Purpose**: Metrics, growth milestones, research percentages.
- **Dynamic Slots**:
  - `metric`: Large emphasis numeral (e.g. `"+340%"`, `"98.4%"`).
  - `label`: Concise headline describing the milestone.
  - `subtext`: 1-2 sentence descriptive context.
  - `trendIcon`: Upward arrow, award badge, or checkmark.

### Template 3: `announcement_banner`
- **Purpose**: Feature launches, webinar dates, breaking news.
- **Dynamic Slots**:
  - `badgeText`: Pill tag (e.g. `"NEW FEATURE"`, `"WEBINAR"`).
  - `headline`: Prominent high-impact title.
  - `dateOrCta`: Date string or call-to-action prompt.

---

## 4. Template JSON Schema Specification

```typescript
export interface ImageTemplateRenderJob {
  templateId: 'quote_card_modern' | 'stat_highlight' | 'announcement_banner';
  aspectRatio: '1:1' | '4:5' | '1.91:1' | '9:16';
  brandKit: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    fonts: {
      headingFontBuffer: Buffer;
      bodyFontBuffer: Buffer;
    };
    logoSvgOrUrl?: string;
  };
  slots: Record<string, string | number | boolean>;
}
```

---

## 5. Caching & S3 Persistence Pipeline

1. **Deterministic Hashing**:
   - A SHA-256 hash is computed across `templateId + aspectRatio + JSON.stringify(brandKit) + JSON.stringify(slots)`.
2. **Cache Check**:
   - Before executing Satori/Sharp rendering, the worker checks if `storage_key = /brands/:id/rendered-images/{hash}.png` already exists in PostgreSQL. If found, the existing asset ID is reused immediately.
3. **Storage & Web Optimization**:
   - Sharp exports images with WebP / PNG compression (lossless, 90% quality).
   - Saved with `Cache-Control: public, max-age=31536000, immutable`.
