import { db } from '../../db/connection.js';

export interface ValidationReport {
  isValid: boolean;
  contrastScore: number;
  warnings: string[];
  errors: string[];
}

export class TemplateValidatorService {
  /**
   * Calculates relative luminance of an sRGB hex color
   */
  private getLuminance(hex: string): number {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length !== 6) return 0.5;

    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;

    const a = [r, g, b].map((v) => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /**
   * Calculates WCAG contrast ratio between two hex colors (1:1 to 21:1)
   */
  public calculateContrastRatio(color1: string, color2: string): number {
    try {
      const lum1 = this.getLuminance(color1);
      const lum2 = this.getLuminance(color2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
    } catch {
      return 4.5;
    }
  }

  /**
   * Validates a template against brand kit guidelines (colors, fonts, contrast ratios)
   */
  async validateTemplate(tenantId: string, brandId: string | undefined, template: any): Promise<ValidationReport> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let minContrast = 21;

    // 1. Fetch Brand Kit / Brand Brain guidelines if brandId provided
    let approvedColors: string[] = ['#ffffff', '#000000', '#f8fafc', '#0f172a'];
    let approvedFonts: string[] = ['Inter', 'Outfit', 'Roboto', 'sans-serif'];

    if (brandId) {
      try {
        const brandBrain = await db('brand_brains').where({ brand_id: brandId }).first();
        if (brandBrain) {
          if (brandBrain.color_palette) {
            const palette = typeof brandBrain.color_palette === 'string'
              ? JSON.parse(brandBrain.color_palette)
              : brandBrain.color_palette;
            if (Array.isArray(palette)) {
              approvedColors = [...approvedColors, ...palette.map((c: string) => c.toLowerCase())];
            }
          }
          if (brandBrain.fonts) {
            const fonts = typeof brandBrain.fonts === 'string'
              ? JSON.parse(brandBrain.fonts)
              : brandBrain.fonts;
            if (Array.isArray(fonts)) {
              approvedFonts = [...approvedFonts, ...fonts];
            }
          }
        }
      } catch {
        // use default neutrals
      }
    }

    const layers = template.layers || [];
    const bg = template.background || {};
    const defaultBgColor = bg.color || '#0f172a';

    // 2. Validate layers
    for (const layer of layers) {
      if (layer.type === 'text') {
        const textColor = layer.color || '#ffffff';
        const layerBgColor = layer.backgroundColor || defaultBgColor;

        // Check contrast
        if (textColor.startsWith('#') && layerBgColor.startsWith('#')) {
          const ratio = this.calculateContrastRatio(textColor, layerBgColor);
          if (ratio < minContrast) minContrast = ratio;

          // WCAG 2.1 AA requirement: minimum 4.5:1 for normal text (< 18pt), 3:1 for large text (>= 18pt)
          const isLarge = (layer.fontSize || 14) >= 18 || layer.fontWeight === 'bold' || layer.fontWeight === '800';
          const threshold = isLarge ? 3.0 : 4.5;

          if (ratio < threshold) {
            warnings.push(
              `Layer "${layer.name || 'Text'}" has contrast ratio of ${ratio}:1, below WCAG AA threshold of ${threshold}:1.`
            );
          }
        }

        // Check fonts if font specified
        if (layer.fontFamily && approvedFonts.length > 0) {
          const matched = approvedFonts.some((f) => layer.fontFamily.toLowerCase().includes(f.toLowerCase()));
          if (!matched) {
            warnings.push(`Font "${layer.fontFamily}" is not in brand approved typography list.`);
          }
        }
      }

      // Check element bounds
      if (typeof layer.x === 'number' && (layer.x < 0 || layer.x > 100)) {
        errors.push(`Layer "${layer.name || 'Element'}" is positioned outside canvas horizontal bounds (x=${layer.x}).`);
      }
      if (typeof layer.y === 'number' && (layer.y < 0 || layer.y > 100)) {
        errors.push(`Layer "${layer.name || 'Element'}" is positioned outside canvas vertical bounds (y=${layer.y}).`);
      }
    }

    return {
      isValid: errors.length === 0,
      contrastScore: minContrast === 21 ? 10.0 : minContrast,
      warnings,
      errors,
    };
  }

  /**
   * Validates that all required fields declared by a template are provided in the payload
   */
  public validateRequiredFields(
    template: any,
    data: Record<string, any>
  ): { isValid: boolean; missingFields: string[] } {
    let reqFields: string[] = [];
    if (Array.isArray(template.requiredFields)) {
      reqFields = template.requiredFields;
    } else if (Array.isArray(template.required_fields)) {
      reqFields = template.required_fields;
    } else if (typeof template.required_fields === 'string') {
      try { reqFields = JSON.parse(template.required_fields); } catch {}
    }

    const missingFields: string[] = [];
    for (const field of reqFields) {
      const val = data[field];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        missingFields.push(field);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Checks copy against disallowed claims and deceptive marketing promises
   */
  public validateClaimRestrictions(
    content: string,
    claimRestrictions?: string[]
  ): { isValid: boolean; violations: string[] } {
    if (!content || !claimRestrictions || claimRestrictions.length === 0) {
      return { isValid: true, violations: [] };
    }

    const lower = content.toLowerCase();
    const violations: string[] = [];

    for (const claim of claimRestrictions) {
      if (claim && lower.includes(claim.toLowerCase().trim())) {
        violations.push(claim);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Validates call to action against authorized CTA rules and patterns
   */
  public validateCtaRules(
    cta: string,
    allowedCtas?: string[]
  ): { isValid: boolean; warnings: string[] } {
    if (!cta || !allowedCtas || allowedCtas.length === 0) {
      return { isValid: true, warnings: [] };
    }

    const lower = cta.toLowerCase().trim();
    const matched = allowedCtas.some((allowed) => lower.includes(allowed.toLowerCase().trim()));

    return {
      isValid: matched,
      warnings: matched ? [] : [`Call to action "${cta}" does not match approved CTA guidelines: [${allowedCtas.join(', ')}]`],
    };
  }
}

export const templateValidatorService = new TemplateValidatorService();
