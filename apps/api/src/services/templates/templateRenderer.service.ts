export interface RenderVariableContext {
  [key: string]: any;
}

export class TemplateRendererService {
  /**
   * Resolves dot-path property on an object (e.g. "brand.name" or "product.price")
   */
  private resolveValue(path: string, context: RenderVariableContext): any {
    const parts = path.trim().split('.');
    let current: any = context;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Applies filters like uppercase, lowercase, currency
   */
  private applyFilter(value: any, filterName: string): any {
    if (value === undefined || value === null) return value;
    switch (filterName.trim().toLowerCase()) {
      case 'uppercase':
      case 'upper':
        return String(value).toUpperCase();
      case 'lowercase':
      case 'lower':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);
      case 'currency':
        const num = Number(value);
        return isNaN(num) ? String(value) : `$${num.toFixed(2)}`;
      default:
        return value;
    }
  }

  /**
   * Evaluates text containing {{variable.path | filter | "default"}} expressions
   */
  public renderText(templateBody: string, context: RenderVariableContext): string {
    if (!templateBody) return '';

    // Matches {{ variable | filter | "default" }}
    const pattern = /{{\s*([^}]+?)\s*}}/g;

    return templateBody.replace(pattern, (match, expr) => {
      const tokens = expr.split('|').map((t: string) => t.trim());
      const rawPath = tokens[0];

      let value = this.resolveValue(rawPath, context);

      // Check if remainder tokens are filters or default values
      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
          // Default fallback string if value is nullish
          if (value === undefined || value === null || value === '') {
            value = token.slice(1, -1);
          }
        } else {
          // Filter function
          value = this.applyFilter(value, token);
        }
      }

      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    });
  }

  /**
   * Evaluates variable substitution across an entire template layer tree
   */
  public renderLayers(layers: any[], context: RenderVariableContext): any[] {
    if (!Array.isArray(layers)) return [];

    return layers.map((layer) => {
      const cloned = JSON.parse(JSON.stringify(layer));

      if (typeof cloned.text === 'string') {
        cloned.text = this.renderText(cloned.text, context);
      }
      if (typeof cloned.subtext === 'string') {
        cloned.subtext = this.renderText(cloned.subtext, context);
      }
      if (typeof cloned.ctaText === 'string') {
        cloned.ctaText = this.renderText(cloned.ctaText, context);
      }
      if (typeof cloned.url === 'string') {
        cloned.url = this.renderText(cloned.url, context);
      }

      return cloned;
    });
  }

  /**
   * Convenience method to render full template (metadata + layers)
   */
  public renderTemplate(template: any, context: RenderVariableContext): any {
    const rendered = JSON.parse(JSON.stringify(template));
    if (rendered.name) {
      rendered.name = this.renderText(rendered.name, context);
    }
    if (rendered.description) {
      rendered.description = this.renderText(rendered.description, context);
    }
    if (rendered.layers) {
      rendered.layers = this.renderLayers(rendered.layers, context);
    }
    return rendered;
  }
}

export const templateRendererService = new TemplateRendererService();
