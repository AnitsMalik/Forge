import type {
  AuthorizationUrlParams,
  AuthorizationUrlResult,
  CallbackParams,
  CallbackResult,
  RefreshCredentialParams,
  RefreshCredentialResult,
  TestConnectionParams,
  TestConnectionResult,
  DiscoverResourcesParams,
  DiscoveredResource,
  FetchParams,
  FetchResult,
  NormalizeParams,
  NormalizedData,
  SubscribeParams,
  SubscribeResult,
  HealthCheckParams,
  HealthCheckResult,
  DisconnectParams,
  DisconnectResult,
  Connector as IConnector,
} from '@socialforge/shared';

export type {
  AuthorizationUrlParams,
  AuthorizationUrlResult,
  CallbackParams,
  CallbackResult,
  RefreshCredentialParams,
  RefreshCredentialResult,
  TestConnectionParams,
  TestConnectionResult,
  DiscoverResourcesParams,
  DiscoveredResource,
  FetchParams,
  FetchResult,
  NormalizeParams,
  NormalizedData,
  SubscribeParams,
  SubscribeResult,
  HealthCheckParams,
  HealthCheckResult,
  DisconnectParams,
  DisconnectResult,
  IConnector,
};

export interface Connector extends IConnector {}

/**
 * Base abstract class providing common default implementations for connectors.
 */
export abstract class BaseConnector implements Connector {
  abstract readonly provider: string;
  abstract readonly name: string;
  abstract readonly category: string;

  abstract getAuthorizationUrl(params: AuthorizationUrlParams): Promise<AuthorizationUrlResult>;
  abstract handleCallback(params: CallbackParams): Promise<CallbackResult>;
  abstract refreshCredential(params: RefreshCredentialParams): Promise<RefreshCredentialResult>;
  abstract testConnection(params: TestConnectionParams): Promise<TestConnectionResult>;
  abstract discoverResources(params: DiscoverResourcesParams): Promise<DiscoveredResource[]>;
  abstract fetch(params: FetchParams): Promise<FetchResult>;
  abstract normalize(params: NormalizeParams): Promise<NormalizedData>;
  abstract subscribe(params: SubscribeParams): Promise<SubscribeResult>;
  abstract healthCheck(params: HealthCheckParams): Promise<HealthCheckResult>;
  abstract disconnect(params: DisconnectParams): Promise<DisconnectResult>;
}
