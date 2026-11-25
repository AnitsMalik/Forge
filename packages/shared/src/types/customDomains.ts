/**
 * Multi-Tenant Custom Domains & White-Label Agency Portals Types
 * SocialForge Platform v4.6.0
 */

export type CustomDomainStatus = 
  | 'pending_dns' 
  | 'verifying' 
  | 'active' 
  | 'dns_error' 
  | 'ssl_error' 
  | 'suspended';

export type SslCertificateStatus = 
  | 'pending' 
  | 'issued' 
  | 'renewing' 
  | 'failed' 
  | 'expired';

export type PortalType = 
  | 'client_review' 
  | 'analytics_portal' 
  | 'full_white_label';

export type VerificationMethod = 'cname' | 'txt';

export interface WhiteLabelBranding {
  agencyName: string;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  customCss?: string | null;
  hideSocialforgeBranding: boolean;
  footerText?: string | null;
  supportEmail?: string | null;
}

export interface CustomDomain {
  id: string;
  tenantId: string;
  domain: string;
  portalType: PortalType;
  status: CustomDomainStatus;
  verificationToken: string;
  verificationMethod: VerificationMethod;
  dnsTarget: string;
  cnameVerified: boolean;
  txtVerified: boolean;
  sslStatus: SslCertificateStatus;
  sslAutoRenew: boolean;
  sslIssuedAt?: string | null;
  sslExpiresAt?: string | null;
  sslIssuer?: string | null;
  branding: WhiteLabelBranding;
  enforceHttps: boolean;
  lastDnsCheckAt?: string | null;
  dnsErrorDetails?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomDomainAccessLog {
  id: string;
  customDomainId: string;
  tenantId: string;
  hostHeader: string;
  requestPath: string;
  clientIp?: string | null;
  userAgent?: string | null;
  statusCode: number;
  responseTimeMs: number;
  createdAt: string;
}

export interface CustomDomainTelemetry {
  totalDomains: number;
  activeDomains: number;
  pendingDns: number;
  sslIssued: number;
  whiteLabelActive: number;
  dnsCheckPassRate: number;
  totalRequests24h: number;
}

export interface DomainDnsCheckResult {
  domain: string;
  cnameMatched: boolean;
  cnameActual?: string | null;
  txtMatched: boolean;
  txtActual?: string | null;
  isResolving: boolean;
  status: CustomDomainStatus;
  details: string;
}

export interface CreateCustomDomainDto {
  tenantId: string;
  domain: string;
  portalType?: PortalType;
  verificationMethod?: VerificationMethod;
  branding?: Partial<WhiteLabelBranding>;
  enforceHttps?: boolean;
}

export interface UpdateCustomDomainDto {
  portalType?: PortalType;
  enforceHttps?: boolean;
  sslAutoRenew?: boolean;
  status?: CustomDomainStatus;
}

export interface UpdateWhiteLabelBrandingDto {
  agencyName?: string;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  customCss?: string | null;
  hideSocialforgeBranding?: boolean;
  footerText?: string | null;
  supportEmail?: string | null;
}

export interface PublicWhiteLabelConfig {
  domain: string;
  tenantId: string;
  portalType: PortalType;
  agencyName: string;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  customCss?: string | null;
  hideSocialforgeBranding: boolean;
  footerText?: string | null;
  supportEmail?: string | null;
}
