import { GenericOAuth2Connector } from '../core/GenericOAuth2Connector.js';

export class LinkedInConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'linkedin',
      name: 'LinkedIn',
      category: 'social',
      authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
      defaultScopes: ['r_liteprofile', 'w_member_social'],
    });
  }
}

export const linkedinConnector = new LinkedInConnector();
