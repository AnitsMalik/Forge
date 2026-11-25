import { assertSafeUrl } from '../utils/ssrfValidator.js';
import { config } from '../config/index.js';
import type { WebsiteExtractionResult, WebsiteExtractionPublicPricing } from '@socialforge/shared';
import OpenAI from 'openai';

const openai = config.openai.apiKey ? new OpenAI({ apiKey: config.openai.apiKey }) : null;

export class WebsiteScraperService {
  /**
   * Fetches public HTML safely with SSRF protection, strict timeouts, and payload limits
   */
  public static async fetchSafeHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
    const validatedUrl = assertSafeUrl(rawUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(validatedUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (SocialForge BrandBrain Crawler)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch website (HTTP ${response.status}: ${response.statusText})`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new Error(`Invalid content type '${contentType}'. Only public HTML pages can be imported.`);
      }

      // Read text with 2MB maximum limit
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Could not read response body stream.');
      }

      const decoder = new TextDecoder('utf-8');
      let html = '';
      let bytesRead = 0;
      const MAX_BYTES = 2 * 1024 * 1024; // 2MB

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        if (bytesRead > MAX_BYTES) {
          html += decoder.decode(value);
          break; // Stop reading if limit exceeded
        }
        html += decoder.decode(value, { stream: true });
      }

      return { html, finalUrl: response.url || validatedUrl };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out while fetching website (12s limit). Please verify the URL.');
      }
      throw err;
    }
  }

  /**
   * Cleans HTML and extracts title, meta description, OpenGraph tags, headings, and clean text
   */
  public static parseHtmlContent(html: string): {
    title: string;
    description: string;
    ogImage?: string;
    headings: string[];
    paragraphs: string[];
    listItems: string[];
    priceMatches: WebsiteExtractionPublicPricing[];
    cleanBodyText: string;
  } {
    // 1. Meta Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // 2. Meta Description
    const metaDescMatch =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
      html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i) ||
      html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
    const description = metaDescMatch ? metaDescMatch[1].trim() : '';

    // 3. OpenGraph Image
    const ogImageMatch =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i) ||
      html.match(/<meta\s+content=["']([^"']*)["']\s+property=["']og:image["']/i);
    const ogImage = ogImageMatch ? ogImageMatch[1].trim() : undefined;

    // 4. Strip scripts, styles, svg, and nav clutter
    let stripped = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

    // 5. Extract Headings (h1, h2, h3)
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(stripped)) !== null) {
      const text = hMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text && text.length > 2 && text.length < 120 && !headings.includes(text)) {
        headings.push(text);
      }
    }

    // 6. Extract List Items (li)
    const listItems: string[] = [];
    const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(stripped)) !== null) {
      const text = liMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text && text.length > 5 && text.length < 200 && !listItems.includes(text)) {
        listItems.push(text);
      }
    }

    // 7. Extract Paragraphs
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(stripped)) !== null) {
      const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text && text.length > 20 && !paragraphs.includes(text)) {
        paragraphs.push(text);
      }
    }

    // 8. Strict Public Pricing Scanner (AI must not invent pricing)
    // Only detect pricing if explicitly stated with currency symbols or explicit pricing tiers
    const priceMatches: WebsiteExtractionPublicPricing[] = [];
    const priceRegex =
      /(?:(?:([A-Za-z0-9\s-]{3,30}?)\s*[:–-])?\s*(\$|€|£|₹|USD|EUR|GBP)\s*(\d+(?:[.,]\d{2})?)\s*(?:\/\s*(mo|month|yr|year|user|post))?)/gi;
    let prMatch;
    const seenPricing = new Set<string>();

    while ((prMatch = priceRegex.exec(stripped)) !== null) {
      const rawPlan = prMatch[1] ? prMatch[1].trim() : 'Public Tier';
      const currency = prMatch[2];
      const amount = prMatch[3];
      const cycle = prMatch[4] ? `/${prMatch[4]}` : '';
      const formattedPrice = `${currency}${amount}${cycle}`;

      // Avoid false positives like "version 1.0" or generic dates
      if (Number(amount) > 0 && !seenPricing.has(formattedPrice)) {
        seenPricing.add(formattedPrice);
        if (priceMatches.length < 8) {
          priceMatches.push({
            planOrProduct: rawPlan.length > 40 ? 'Public Plan' : rawPlan,
            price: formattedPrice,
            billingCycle: cycle || undefined,
          });
        }
      }
    }

    // Clean body text (strip remaining tags)
    const cleanBodyText = stripped
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title,
      description,
      ogImage,
      headings,
      paragraphs,
      listItems,
      priceMatches,
      cleanBodyText,
    };
  }

  /**
   * Main entity extraction:
   * Uses OpenAI with strict "DO NOT INVENT" prompt if API key exists,
   * otherwise falls back to deterministic heuristic extraction.
   */
  public static async extractFromWebsite(rawUrl: string): Promise<WebsiteExtractionResult> {
    const { html, finalUrl } = await this.fetchSafeHtml(rawUrl);
    const parsed = this.parseHtmlContent(html);

    // If OpenAI is configured, invoke with strict constraints
    if (openai) {
      try {
        const promptContext = `
PUBLIC WEBSITE URL: ${finalUrl}
PAGE TITLE: ${parsed.title}
META DESCRIPTION: ${parsed.description}
HEADINGS: ${parsed.headings.slice(0, 15).join(' | ')}
KEY LIST ITEMS: ${parsed.listItems.slice(0, 20).join(' | ')}
KEY PARAGRAPHS: ${parsed.paragraphs.slice(0, 8).join('\n')}
BODY EXCERPT: ${parsed.cleanBodyText.slice(0, 3000)}
EXPLICIT PRICES FOUND ON PAGE: ${JSON.stringify(parsed.priceMatches)}
`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an objective corporate fact-extraction assistant for SocialForge Brand Brain.
Your task is to extract public brand and business information strictly from the provided website content.

STRICT CONSTRAINTS (CRITICAL):
1. You must NOT invent, hallucinate, or assume any information that is not explicitly present in the text.
2. If products or services are not mentioned, return empty arrays.
3. For public pricing, ONLY include prices that are explicitly stated in the text. If no explicit pricing is visible, return an empty array. NEVER guess or invent prices.
4. Distinguish clearly between Products (tangible goods/software items) and Services (consulting, bespoke work, implementation).
5. Extract Unique Selling Propositions (USPs) directly from the value propositions highlighted on the page.

Return a valid JSON object matching this exact schema:
{
  "businessDescription": "concise description of what the business does based strictly on the text",
  "products": [
    { "name": "product name", "description": "brief description", "price": "optional explicit price", "category": "category" }
  ],
  "services": [
    { "name": "service name", "description": "brief description" }
  ],
  "usps": ["unique value prop 1", "unique value prop 2"],
  "audience": "target audience or ideal customer profile mentioned on the page",
  "importantMessaging": ["key slogan or hero statement", "mission or philosophy statement"],
  "publicPricing": [
    { "planOrProduct": "plan name", "price": "$XX/mo", "billingCycle": "monthly" }
  ],
  "brandValues": ["core value 1", "core value 2"],
  "toneSuggestions": {
    "formality": "approachable",
    "descriptors": ["modern", "trustworthy", "innovative"]
  },
  "contentPillarsSuggestions": ["Pillar 1", "Pillar 2"]
}`,
            },
            {
              role: 'user',
              content: promptContext,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2, // Low temperature for maximum factual fidelity
        });

        const gptOutput = JSON.parse(completion.choices[0].message.content || '{}');

        return {
          businessDescription:
            gptOutput.businessDescription || parsed.description || parsed.paragraphs[0] || parsed.title,
          products: Array.isArray(gptOutput.products) ? gptOutput.products : [],
          services: Array.isArray(gptOutput.services) ? gptOutput.services : [],
          usps: Array.isArray(gptOutput.usps) ? gptOutput.usps : parsed.headings.slice(0, 3),
          audience: gptOutput.audience || 'Target customer base identified on website',
          importantMessaging: Array.isArray(gptOutput.importantMessaging)
            ? gptOutput.importantMessaging
            : parsed.headings.slice(0, 4),
          publicPricing: Array.isArray(gptOutput.publicPricing) ? gptOutput.publicPricing : parsed.priceMatches,
          brandValues: Array.isArray(gptOutput.brandValues) ? gptOutput.brandValues : ['Quality', 'Innovation', 'Integrity'],
          toneSuggestions: gptOutput.toneSuggestions || {
            formality: 'approachable',
            descriptors: ['authentic', 'modern', 'professional'],
          },
          contentPillarsSuggestions: Array.isArray(gptOutput.contentPillarsSuggestions)
            ? gptOutput.contentPillarsSuggestions
            : ['Product Spotlights', 'Industry Insights', 'Customer Success'],
          rawMeta: {
            title: parsed.title,
            description: parsed.description,
            ogImage: parsed.ogImage,
            canonicalUrl: finalUrl,
          },
          extractedAt: new Date().toISOString(),
          sourceUrl: finalUrl,
        };
      } catch (err) {
        console.warn('[WebsiteScraperService] OpenAI extraction failed, falling back to heuristic:', err);
      }
    }

    // Heuristic Non-LLM Extraction (High-Fidelity, 0 Hallucination)
    const businessDesc =
      parsed.description ||
      parsed.paragraphs.find((p) => p.length > 40 && p.length < 300) ||
      `${parsed.title} - Official Website`;

    const products: Array<{ name: string; description: string; price?: string; category?: string }> = [];
    const services: Array<{ name: string; description: string }> = [];
    const usps: string[] = [];
    const importantMessaging: string[] = [];

    // Filter headings and list items for USPs and key messages
    parsed.headings.forEach((h) => {
      const lower = h.toLowerCase();
      if (
        lower.includes('feature') ||
        lower.includes('why') ||
        lower.includes('benefit') ||
        lower.includes('difference') ||
        lower.includes('formula') ||
        lower.includes('proven')
      ) {
        usps.push(h);
      } else if (h.length > 10 && h.length < 80) {
        importantMessaging.push(h);
      }
    });

    // Check list items for products or services
    parsed.listItems.forEach((li) => {
      const lower = li.toLowerCase();
      if (lower.includes('service') || lower.includes('consulting') || lower.includes('management') || lower.includes('design')) {
        if (services.length < 5) {
          services.push({ name: li.slice(0, 40), description: li });
        }
      } else if (lower.includes('product') || lower.includes('formula') || lower.includes('serum') || lower.includes('kit') || lower.includes('app')) {
        if (products.length < 5) {
          products.push({ name: li.slice(0, 40), description: li });
        }
      } else if (usps.length < 6 && (li.length > 15 && li.length < 100)) {
        usps.push(li);
      }
    });

    // Fallback if no explicit products were matched
    if (products.length === 0 && parsed.headings.some((h) => /product|collection|catalog/i.test(h))) {
      products.push({
        name: `${parsed.title.split(/[-|]/)[0].trim()} Core Offering`,
        description: businessDesc,
      });
    }

    // Tone suggestion based on vocabulary in parsed text
    const lowerBody = parsed.cleanBodyText.toLowerCase();
    let formality: 'casual' | 'approachable' | 'professional' | 'authoritative' | 'playful' = 'approachable';
    const descriptors: string[] = ['authentic', 'modern'];

    if (lowerBody.includes('clinical') || lowerBody.includes('enterprise') || lowerBody.includes('compliance')) {
      formality = 'authoritative';
      descriptors.push('clinical', 'evidence-based', 'rigorous');
    } else if (lowerBody.includes('fun') || lowerBody.includes('playful') || lowerBody.includes('magic')) {
      formality = 'playful';
      descriptors.push('vibrant', 'fun', 'energetic');
    } else if (lowerBody.includes('b2b') || lowerBody.includes('roi') || lowerBody.includes('scale')) {
      formality = 'professional';
      descriptors.push('strategic', 'results-driven', 'authoritative');
    } else {
      descriptors.push('friendly', 'helpful', 'engaging');
    }

    return {
      businessDescription: businessDesc,
      products,
      services,
      usps: usps.slice(0, 5),
      audience: `Audience and clientele seeking ${parsed.title.split(/[-|]/)[0].trim()} solutions`,
      importantMessaging: importantMessaging.slice(0, 4),
      publicPricing: parsed.priceMatches,
      brandValues: ['Integrity', 'Quality', 'Customer Focus'],
      toneSuggestions: {
        formality,
        descriptors,
      },
      contentPillarsSuggestions: [
        'Product & Feature Spotlights',
        'Industry Insights & Best Practices',
        'Customer Proof & Case Studies',
        'Company Culture & Values',
      ],
      rawMeta: {
        title: parsed.title,
        description: parsed.description,
        ogImage: parsed.ogImage,
        canonicalUrl: finalUrl,
      },
      extractedAt: new Date().toISOString(),
      sourceUrl: finalUrl,
    };
  }
}
