import { GenericOAuth2Connector } from '../core/GenericOAuth2Connector.js';

export class SalesforceConnector extends GenericOAuth2Connector {
  constructor() {
    super({
      provider: 'salesforce',
      name: 'Salesforce CRM',
      category: 'crm',
      authorizationEndpoint: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenEndpoint: 'https://login.salesforce.com/services/oauth2/token',
      defaultScopes: ['api', 'refresh_token'],
    });
  }
}

export const salesforceConnector = new SalesforceConnector();
