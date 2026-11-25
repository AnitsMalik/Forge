import type { Connector } from './Connector.js';

export interface ProviderDescriptor {
  provider: string;
  name: string;
  category: string;
  description: string;
  authType: 'oauth2' | 'api_key' | 'webhook';
  defaultScopes: string[];
  supportsResourceDiscovery: boolean;
  supportsWebhooks: boolean;
}

export class ConnectorRegistry {
  private static connectors = new Map<string, Connector>();
  private static descriptors = new Map<string, ProviderDescriptor>();

  public static register(connector: Connector, descriptor?: Partial<ProviderDescriptor>): void {
    const key = connector.provider.toLowerCase();
    this.connectors.set(key, connector);

    this.descriptors.set(key, {
      provider: connector.provider,
      name: connector.name,
      category: connector.category,
      description: descriptor?.description || `${connector.name} integration`,
      authType: descriptor?.authType || 'oauth2',
      defaultScopes: descriptor?.defaultScopes || [],
      supportsResourceDiscovery: descriptor?.supportsResourceDiscovery !== false,
      supportsWebhooks: descriptor?.supportsWebhooks || false,
    });
  }

  public static get(provider: string): Connector | undefined {
    return this.connectors.get(provider.toLowerCase());
  }

  public static has(provider: string): boolean {
    return this.connectors.has(provider.toLowerCase());
  }

  public static getAll(): Connector[] {
    return Array.from(this.connectors.values());
  }

  public static getDescriptors(): ProviderDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  public static getDescriptor(provider: string): ProviderDescriptor | undefined {
    return this.descriptors.get(provider.toLowerCase());
  }
}
