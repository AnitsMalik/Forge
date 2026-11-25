import { GenericOAuth2Connector } from '../core/GenericOAuth2Connector.js';

export class WooCommerceConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'woocommerce',
      name: 'WooCommerce',
      category: 'ecommerce',
      authorizationEndpoint: 'https://example.com/wc-auth/v1/authorize',
      tokenEndpoint: 'https://example.com/wc-auth/v1/token',
      defaultScopes: ['read_write'],
    });
  }
}

export const wooCommerceConnector = new WooCommerceConnector();
