export type ScimTokenStatus = 'active' | 'revoked';

export type ScimSyncLogAction =
  | 'create'
  | 'update'
  | 'patch'
  | 'delete'
  | 'deactivate'
  | 'read'
  | 'query';

export interface ScimEmail {
  value: string;
  type?: string;
  primary?: boolean;
}

export interface ScimName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
}

export interface ScimMeta {
  resourceType: 'User' | 'Group' | 'ServiceProviderConfig' | 'Schema';
  created: string;
  lastModified: string;
  location?: string;
  version?: string;
}

export interface ScimUserResource {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  emails?: ScimEmail[];
  active: boolean;
  groups?: Array<{ value: string; display?: string; $ref?: string }>;
  meta: ScimMeta;
}

export interface ScimGroupMember {
  value: string;
  display?: string;
  $ref?: string;
}

export interface ScimGroupResource {
  schemas: string[];
  id: string;
  displayName: string;
  members?: ScimGroupMember[];
  meta: ScimMeta;
}

export interface ScimListResponse<T> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface ScimPatchOperation {
  op: 'add' | 'replace' | 'remove' | 'Add' | 'Replace' | 'Remove';
  path?: string;
  value: any;
}

export interface ScimPatchRequest {
  schemas: string[];
  Operations: ScimPatchOperation[];
}

export interface ScimErrorResponse {
  schemas: string[];
  status: string;
  scimType?: string;
  detail: string;
}

export interface ScimApiToken {
  id: string;
  tenantId?: string | null;
  name: string;
  tokenPrefix: string;
  tokenHash?: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  status: ScimTokenStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScimSyncLog {
  id: string;
  tenantId?: string | null;
  tokenId?: string | null;
  tokenName?: string;
  method: string;
  endpoint: string;
  scimResourceType?: string | null;
  scimResourceId?: string | null;
  action: ScimSyncLogAction;
  statusCode: number;
  ipAddress?: string | null;
  requestPayload?: string | null;
  errorDetail?: string | null;
  createdAt: string;
}

export interface ScimOverviewMetrics {
  activeTokens: number;
  totalSyncEvents24h: number;
  provisionedUsers: number;
  deactivatedUsers: number;
  successRatePercent: number;
}

export interface CreateScimTokenInput {
  tenantId?: string | null;
  name: string;
  expiresInDays?: number;
}

export interface CreateScimTokenResponse {
  token: ScimApiToken;
  rawToken: string;
}
