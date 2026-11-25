export class TemplateEngine {
  render(templateStr: string, variables: Record<string, string>): string {
    let result = templateStr;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
    }
    return result;
  }
}
