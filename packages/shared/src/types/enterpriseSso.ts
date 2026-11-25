export type SsoProviderType = 'saml' | 'oidc';

export type SsoConfigStatus = 'active' | 'inactive' | 'testing';

export type SsoLoginAuditStatus =
  | 'success'
  | 'failed_signature'
  | 'failed_domain_unmapped'
  | 'failed_user_provisioning'
  | 'blocked_inactive';

export interface EnterpriseSsoConfig {
  id: string;
  tenantId?: string | null;
  name: string;
  providerType: SsoProviderType;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
  idpMetadataUrl?: string | null;
  spEntityId: string;
  spAcsUrl: string;
  attributeMapping: {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  jitProvisioningEnabled: boolean;
  defaultRole: string;
  enforceSso: boolean;
  domains: string[];
  status: SsoConfigStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseSsoLoginAudit {
  id: string;
  configId: string;
  configName?: string;
  tenantId?: string | null;
  userId?: string | null;
  email: string;
  idpNameId: string;
  status: SsoLoginAuditStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  errorDetail?: string | null;
  createdAt: string;
}

export interface CreateSsoConfigInput {
  tenantId?: string | null;
  name: string;
  providerType: SsoProviderType;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
  idpMetadataUrl?: string | null;
  attributeMapping?: Record<string, string>;
  jitProvisioningEnabled?: boolean;
  defaultRole?: string;
  enforceSso?: boolean;
  domains: string[];
  status?: SsoConfigStatus;
}

export interface UpdateSsoConfigInput {
  name?: string;
  idpEntityId?: string;
  idpSsoUrl?: string;
  idpCertificate?: string;
  idpMetadataUrl?: string | null;
  attributeMapping?: Record<string, string>;
  jitProvisioningEnabled?: boolean;
  defaultRole?: string;
  enforceSso?: boolean;
  domains?: string[];
  status?: SsoConfigStatus;
}

export interface SsoOverview {
  totalConfigs: number;
  activeConfigs: number;
  activeDomainsCount: number;
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  successRatePercent: number;
  configs: EnterpriseSsoConfig[];
  recentAudits: EnterpriseSsoLoginAudit[];
}

export interface SsoDomainLookupResult {
  hasSso: boolean;
  configId?: string;
  providerType?: SsoProviderType;
  idpSsoUrl?: string;
  enforceSso?: boolean;
}

export interface SamlSimulationResult {
  valid: boolean;
  nameId: string;
  email: string;
  attributes: Record<string, string>;
  userProvisioned: boolean;
  assignedRole: string;
  token?: string;
  error?: string;
}
