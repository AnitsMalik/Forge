import { GenericOAuth2Connector } from '../core/GenericOAuth2Connector.js';

export class ShopifyConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'shopify',
      name: 'Shopify Store',
      category: 'ecommerce',
      authorizationEndpoint: 'https://shopify.com/admin/oauth/authorize',
      tokenEndpoint: 'https://shopify.com/admin/oauth/access_token',
      defaultScopes: ['read_products', 'read_orders'],
    });
  }
}

export const shopifyConnector = new ShopifyConnector();
