export interface ConnectorContext {
  tenantId: string;
  brandId?: string;
  connectionId?: string;
  accessToken?: string;
  refreshToken?: string;
  metadata?: Record<string, unknown>;
}
