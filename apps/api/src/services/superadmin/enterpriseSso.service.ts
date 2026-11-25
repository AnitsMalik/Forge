import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import {
  EnterpriseSsoConfig,
  EnterpriseSsoLoginAudit,
  SsoOverview,
  SsoDomainLookupResult,
  SamlSimulationResult,
  CreateSsoConfigInput,
  UpdateSsoConfigInput,
  SsoConfigStatus,
  SsoLoginAuditStatus,
} from '@socialforge/shared';
import { SuperadminOpsService } from './superadminOps.service.js';

export class EnterpriseSsoService {
  /**
   * Retrieves high-level operational overview & telemetry for SSO
   */
  public static async getOverview(): Promise<SsoOverview> {
    const configRows = await db('enterprise_sso_configs')
      .select('*')
      .orderBy('created_at', 'desc');

    const totalConfigs = configRows.length;
    const activeConfigs = configRows.filter((c: any) => c.status === 'active').length;

    // Count unique mapped corporate domains
    const domainSet = new Set<string>();
    for (const c of configRows) {
      if (c.status === 'active') {
        const domains = this.parseJsonSafe<string[]>(c.domains, []);
        domains.forEach((d) => domainSet.add(d.toLowerCase()));
      }
    }
    const activeDomainsCount = domainSet.size;

    const auditRows = await db('enterprise_sso_login_audits')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(50);

    const totalLoginsCountRes = await db('enterprise_sso_login_audits').count('* as count').first();
    const totalLogins = Number(totalLoginsCountRes?.count || 0);

    const successLoginsRes = await db('enterprise_sso_login_audits')
      .where('status', 'success')
      .count('* as count')
      .first();
    const successfulLogins = Number(successLoginsRes?.count || 0);

    const failedLogins = Math.max(0, totalLogins - successfulLogins);
    const successRatePercent = totalLogins > 0
      ? Number(((successfulLogins / totalLogins) * 100).toFixed(1))
      : 100.0;

    const configs: EnterpriseSsoConfig[] = configRows.map((r: any) => this.mapConfigRow(r));
    const recentAudits: EnterpriseSsoLoginAudit[] = auditRows.map((r: any) => this.mapAuditRow(r));

    return {
      totalConfigs,
      activeConfigs,
      activeDomainsCount,
      totalLogins,
      successfulLogins,
      failedLogins,
      successRatePercent,
      configs,
      recentAudits,
    };
  }

  /**
   * Lists SSO configurations
   */
  public static async listConfigs(tenantId?: string): Promise<EnterpriseSsoConfig[]> {
    let query = db('enterprise_sso_configs').select('*').orderBy('created_at', 'desc');
    if (tenantId) {
      query = query.where((builder: any) => {
        builder.where('tenant_id', tenantId).orWhereNull('tenant_id');
      });
    }

    const rows = await query;
    return rows.map((r: any) => this.mapConfigRow(r));
  }

  /**
   * Registers a new enterprise identity provider configuration
   */
  public static async createConfig(
    input: CreateSsoConfigInput,
    adminUser: { id: string; email: string }
  ): Promise<EnterpriseSsoConfig> {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('SSO Configuration name is required.');
    }
    if (!input.idpEntityId || !input.idpSsoUrl || !input.idpCertificate) {
      throw new Error('IdP Entity ID, IdP SSO URL, and IdP Certificate are required.');
    }
    if (!input.domains || !Array.isArray(input.domains) || input.domains.length === 0) {
      throw new Error('At least one corporate domain mapping is required.');
    }

    const id = `sso-${crypto.randomUUID()}`;
    const baseUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const spEntityId = `https://app.socialforge.ai/auth/sso/saml/${id}/metadata`;
    const spAcsUrl = `${baseUrl}/auth/sso/saml/${id}/acs`;

    const attributeMapping = input.attributeMapping || {
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      role: 'role',
    };

    const cleanDomains = input.domains.map((d) => d.trim().toLowerCase().replace(/^@/, ''));

    const newRow = {
      id,
      tenant_id: input.tenantId || null,
      name: input.name.trim(),
      provider_type: input.providerType || 'saml',
      idp_entity_id: input.idpEntityId.trim(),
      idp_sso_url: input.idpSsoUrl.trim(),
      idp_certificate: input.idpCertificate.trim(),
      idp_metadata_url: input.idpMetadataUrl ? input.idpMetadataUrl.trim() : null,
      sp_entity_id: spEntityId,
      sp_acs_url: spAcsUrl,
      attribute_mapping: JSON.stringify(attributeMapping),
      jit_provisioning_enabled: input.jitProvisioningEnabled ?? true,
      default_role: input.defaultRole || 'editor',
      enforce_sso: input.enforceSso ?? false,
      domains: JSON.stringify(cleanDomains),
      status: input.status || 'active',
      created_by: adminUser.email || 'superadmin',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('enterprise_sso_configs').insert(newRow);

    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'enterprise_sso_config_created',
      targetTenantId: input.tenantId || null,
      targetResourceId: id,
      targetResourceType: 'enterprise_sso_config',
      reason: 'Configured new enterprise identity provider federation',
      details: {
        id,
        name: input.name,
        providerType: input.providerType,
        domains: cleanDomains,
      },
    });

    return this.mapConfigRow(newRow);
  }

  /**
   * Updates an existing SSO configuration
   */
  public static async updateConfig(
    configId: string,
    input: UpdateSsoConfigInput,
    adminUser: { id: string; email: string }
  ): Promise<EnterpriseSsoConfig> {
    const existing = await db('enterprise_sso_configs').where('id', configId).first();
    if (!existing) {
      throw new Error(`SSO Configuration '${configId}' not found.`);
    }

    const updates: Record<string, any> = { updated_at: new Date() };

    if (input.name) updates.name = input.name.trim();
    if (input.idpEntityId) updates.idp_entity_id = input.idpEntityId.trim();
    if (input.idpSsoUrl) updates.idp_sso_url = input.idpSsoUrl.trim();
    if (input.idpCertificate) updates.idp_certificate = input.idpCertificate.trim();
    if (input.idpMetadataUrl !== undefined) updates.idp_metadata_url = input.idpMetadataUrl;
    if (input.attributeMapping) updates.attribute_mapping = JSON.stringify(input.attributeMapping);
    if (input.jitProvisioningEnabled !== undefined) updates.jit_provisioning_enabled = input.jitProvisioningEnabled;
    if (input.defaultRole) updates.default_role = input.defaultRole;
    if (input.enforceSso !== undefined) updates.enforce_sso = input.enforceSso;
    if (input.status) updates.status = input.status;
    if (input.domains) {
      updates.domains = JSON.stringify(input.domains.map((d) => d.trim().toLowerCase().replace(/^@/, '')));
    }

    await db('enterprise_sso_configs').where('id', configId).update(updates);

    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'enterprise_sso_config_updated',
      targetTenantId: existing.tenant_id,
      targetResourceId: configId,
      targetResourceType: 'enterprise_sso_config',
      reason: 'Updated enterprise SSO configuration parameters',
      details: { configId, updatedFields: Object.keys(updates) },
    });

    const updated = await db('enterprise_sso_configs').where('id', configId).first();
    return this.mapConfigRow(updated);
  }

  /**
   * Deletes an SSO configuration and associated audit logs
   */
  public static async deleteConfig(
    configId: string,
    adminUser: { id: string; email: string }
  ): Promise<void> {
    const existing = await db('enterprise_sso_configs').where('id', configId).first();
    if (!existing) {
      throw new Error(`SSO Configuration '${configId}' not found.`);
    }

    await db('enterprise_sso_login_audits').where('config_id', configId).delete();
    await db('enterprise_sso_configs').where('id', configId).delete();

    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'enterprise_sso_config_deleted',
      targetTenantId: existing.tenant_id,
      targetResourceId: configId,
      targetResourceType: 'enterprise_sso_config',
      reason: 'Deleted enterprise SSO configuration and purged login audits',
      details: { configId, name: existing.name },
    });
  }

  /**
   * Generates SAML 2.0 SP EntityDescriptor XML
   */
  public static async generateSpMetadataXml(configId: string): Promise<string> {
    const configRow = await db('enterprise_sso_configs').where('id', configId).first();
    if (!configRow) {
      throw new Error(`SSO Configuration '${configId}' not found.`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${configRow.sp_entity_id}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${configRow.sp_acs_url}" index="1" isDefault="true"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">SocialForge Enterprise</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">SocialForge AI Social Platform</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://socialforge.ai</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;

    return xml.trim();
  }

  /**
   * Looks up enterprise SSO configuration by corporate email domain
   */
  public static async lookupDomain(emailOrDomain: string): Promise<SsoDomainLookupResult> {
    if (!emailOrDomain || typeof emailOrDomain !== 'string') {
      return { hasSso: false };
    }

    const domain = emailOrDomain.includes('@')
      ? emailOrDomain.split('@')[1].trim().toLowerCase()
      : emailOrDomain.trim().toLowerCase();

    const activeConfigs = await db('enterprise_sso_configs')
      .where('status', 'active');

    for (const c of activeConfigs) {
      const domains = this.parseJsonSafe<string[]>(c.domains, []);
      if (domains.includes(domain)) {
        return {
          hasSso: true,
          configId: c.id,
          providerType: c.provider_type,
          idpSsoUrl: c.idp_sso_url,
          enforceSso: Boolean(c.enforce_sso),
        };
      }
    }

    return { hasSso: false };
  }

  /**
   * Processes incoming SAML Assertion Consumer Service (ACS) payload
   * Handles extraction, JIT user provisioning, and authentication token issuance
   */
  public static async processSamlAcs(params: {
    configId: string;
    body: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; user: { id: string; email: string; name: string }; redirectUrl?: string }> {
    const { configId, body, ipAddress, userAgent } = params;

    const ssoConfig = await db('enterprise_sso_configs').where('id', configId).first();
    if (!ssoConfig) {
      throw new Error(`SSO Configuration '${configId}' not found.`);
    }

    if (ssoConfig.status === 'inactive') {
      await this.recordAudit({
        configId,
        tenantId: ssoConfig.tenant_id,
        email: body.email || 'unknown@sso',
        idpNameId: body.nameId || 'unknown',
        status: 'blocked_inactive',
        ipAddress,
        userAgent,
        errorDetail: 'Authentication attempted on inactive SSO configuration.',
      });
      throw new Error('This Enterprise SSO configuration is currently inactive.');
    }

    // 1. Extract email and attributes from SAML body
    let email = '';
    let nameId = '';
    let firstName = '';
    let lastName = '';
    let role = ssoConfig.default_role || 'editor';

    // Support direct JSON assertion (simulations & testing) or base64 XML
    if (body.SAMLResponse || body.samlResponse) {
      const raw = body.SAMLResponse || body.samlResponse;
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        // Extract NameID
        const nameIdMatch = decoded.match(/<saml2:NameID[^>]*>([^<]+)<\/saml2:NameID>/i) ||
          decoded.match(/<NameID[^>]*>([^<]+)<\/NameID>/i);
        nameId = nameIdMatch ? nameIdMatch[1].trim() : '';

        // Extract Email attribute
        const emailMatch = decoded.match(/<saml2:Attribute[^>]*Name="[^"]*email[^"]*"[^>]*>\s*<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/i) ||
          decoded.match(/AttributeValue[^>]*>([^<@]+@[^<]+)<\/saml2:AttributeValue>/i);
        email = emailMatch ? emailMatch[1].trim() : nameId;
      } catch {
        // Fallback to body properties if present
        email = body.email || '';
        nameId = body.nameId || email;
      }
    } else {
      email = (body.email || body.NameID || body.nameId || '').trim();
      nameId = (body.NameID || body.nameId || email).trim();
      firstName = body.firstName || '';
      lastName = body.lastName || '';
      if (body.role) role = body.role;
    }

    if (!email || !email.includes('@')) {
      await this.recordAudit({
        configId,
        tenantId: ssoConfig.tenant_id,
        email: email || 'invalid@email',
        idpNameId: nameId || 'missing',
        status: 'failed_signature',
        ipAddress,
        userAgent,
        errorDetail: 'SAML Assertion did not contain a valid email address.',
      });
      throw new Error('Invalid SAML Assertion: missing valid email claim.');
    }

    // 2. Verify email domain against allowed domains
    const domain = email.split('@')[1].toLowerCase();
    const allowedDomains = this.parseJsonSafe<string[]>(ssoConfig.domains, []);
    if (!allowedDomains.includes(domain)) {
      await this.recordAudit({
        configId,
        tenantId: ssoConfig.tenant_id,
        email,
        idpNameId: nameId,
        status: 'failed_domain_unmapped',
        ipAddress,
        userAgent,
        errorDetail: `Email domain '${domain}' is not authorized for this SSO provider.`,
      });
      throw new Error(`Domain '${domain}' is not mapped to this Enterprise Identity Provider.`);
    }

    // 3. User Lookup or JIT (Just-In-Time) Provisioning
    let user = await db('users').where('email', email.toLowerCase()).first();
    let userProvisioned = false;

    if (!user) {
      if (!ssoConfig.jit_provisioning_enabled) {
        await this.recordAudit({
          configId,
          tenantId: ssoConfig.tenant_id,
          email,
          idpNameId: nameId,
          status: 'failed_user_provisioning',
          ipAddress,
          userAgent,
          errorDetail: 'User does not exist and JIT provisioning is disabled.',
        });
        throw new Error('User account not found and Just-In-Time (JIT) provisioning is disabled for this organization.');
      }

      // Provision new user
      const newUserId = crypto.randomUUID();
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
      const randomPasswordHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');

      await db('users').insert({
        id: newUserId,
        email: email.toLowerCase(),
        password_hash: randomPasswordHash,
        full_name: fullName,
        is_superadmin: false,
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Link to tenant if configured
      if (ssoConfig.tenant_id) {
        await db('tenant_users').insert({
          id: crypto.randomUUID(),
          tenant_id: ssoConfig.tenant_id,
          user_id: newUserId,
          role,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      user = await db('users').where('id', newUserId).first();
      userProvisioned = true;
    } else {
      // User exists: verify tenant link if tenant_id set on config
      if (ssoConfig.tenant_id) {
        const tenantLink = await db('tenant_users')
          .where({ tenant_id: ssoConfig.tenant_id, user_id: user.id })
          .first();
        if (!tenantLink) {
          await db('tenant_users').insert({
            id: crypto.randomUUID(),
            tenant_id: ssoConfig.tenant_id,
            user_id: user.id,
            role: ssoConfig.default_role || 'editor',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    }

    // 4. Issue Authentication JWT Token
    const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        isSuperadmin: Boolean(user.is_superadmin),
        tenantId: ssoConfig.tenant_id || undefined,
        ssoLogin: true,
        ssoConfigId: configId,
      },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // 5. Record Success Audit
    await this.recordAudit({
      configId,
      tenantId: ssoConfig.tenant_id,
      userId: user.id,
      email: user.email,
      idpNameId: nameId,
      status: 'success',
      ipAddress,
      userAgent,
      errorDetail: userProvisioned ? 'User provisioned via JIT' : 'Existing user authenticated',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
      },
      redirectUrl: '/dashboard',
    };
  }

  /**
   * Simulates SAML Assertion Verification for Testing Modal
   */
  public static async simulateSamlAssertion(
    configId: string,
    mockAssertion: {
      nameId: string;
      email: string;
      attributes?: Record<string, string>;
    },
    adminUser: { id: string; email: string }
  ): Promise<SamlSimulationResult> {
    const ssoConfig = await db('enterprise_sso_configs').where('id', configId).first();
    if (!ssoConfig) {
      throw new Error(`SSO Configuration '${configId}' not found.`);
    }

    const email = mockAssertion.email.trim().toLowerCase();
    const domain = email.split('@')[1] || '';
    const allowedDomains = this.parseJsonSafe<string[]>(ssoConfig.domains, []);

    if (!allowedDomains.includes(domain)) {
      return {
        valid: false,
        nameId: mockAssertion.nameId,
        email,
        attributes: mockAssertion.attributes || {},
        userProvisioned: false,
        assignedRole: ssoConfig.default_role,
        error: `Domain '${domain}' is not mapped to this SSO configuration.`,
      };
    }

    const existingUser = await db('users').where('email', email).first();
    const willProvision = !existingUser && Boolean(ssoConfig.jit_provisioning_enabled);

    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'enterprise_sso_test_simulated',
      targetTenantId: ssoConfig.tenant_id,
      targetResourceId: configId,
      targetResourceType: 'enterprise_sso_config',
      reason: 'Executed synthetic SAML assertion verification probe',
      details: {
        configId,
        testEmail: email,
        willProvision,
      },
    });

    const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';
    const token = jwt.sign(
      {
        userId: existingUser?.id || `sim_${crypto.randomUUID()}`,
        email,
        isSuperadmin: false,
        tenantId: ssoConfig.tenant_id || undefined,
        ssoLogin: true,
        simulation: true,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    return {
      valid: true,
      nameId: mockAssertion.nameId,
      email,
      attributes: mockAssertion.attributes || {
        email,
        role: ssoConfig.default_role,
      },
      userProvisioned: willProvision,
      assignedRole: ssoConfig.default_role,
      token,
    };
  }

  /**
   * Lists SSO Login Audits with Filtering
   */
  public static async listAudits(params?: {
    configId?: string;
    status?: SsoLoginAuditStatus;
    search?: string;
    limit?: number;
  }): Promise<EnterpriseSsoLoginAudit[]> {
    let query = db('enterprise_sso_login_audits').select('*').orderBy('created_at', 'desc');

    if (params?.configId) {
      query = query.where('config_id', params.configId);
    }
    if (params?.status) {
      query = query.where('status', params.status);
    }
    if (params?.search) {
      const search = `%${params.search.trim()}%`;
      query = query.where((builder: any) => {
        builder.where('email', 'like', search).orWhere('idp_name_id', 'like', search);
      });
    }

    const limit = Math.min(params?.limit || 50, 100);
    const rows = await query.limit(limit);

    // Map config names
    const configIds = Array.from(new Set(rows.map((r: any) => r.config_id)));
    const configs = await db('enterprise_sso_configs')
      .whereIn('id', configIds)
      .select('id', 'name');
    const configMap = new Map(configs.map((c: any) => [c.id, c.name]));

    return rows.map((r: any) => ({
      ...this.mapAuditRow(r),
      configName: configMap.get(r.config_id) || r.config_id,
    }));
  }

  private static async recordAudit(data: {
    configId: string;
    tenantId?: string | null;
    userId?: string | null;
    email: string;
    idpNameId: string;
    status: SsoLoginAuditStatus;
    ipAddress?: string;
    userAgent?: string;
    errorDetail?: string;
  }): Promise<void> {
    await db('enterprise_sso_login_audits').insert({
      id: `sso-audit-${crypto.randomUUID()}`,
      config_id: data.configId,
      tenant_id: data.tenantId || null,
      user_id: data.userId || null,
      email: data.email,
      idp_name_id: data.idpNameId,
      status: data.status,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent ? data.userAgent.slice(0, 512) : null,
      error_detail: data.errorDetail || null,
      created_at: new Date(),
    });
  }

  private static parseJsonSafe<T>(val: any, fallback: T): T {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }

  private static mapConfigRow(row: any): EnterpriseSsoConfig {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      providerType: row.provider_type,
      idpEntityId: row.idp_entity_id,
      idpSsoUrl: row.idp_sso_url,
      idpCertificate: row.idp_certificate,
      idpMetadataUrl: row.idp_metadata_url,
      spEntityId: row.sp_entity_id,
      spAcsUrl: row.sp_acs_url,
      attributeMapping: this.parseJsonSafe(row.attribute_mapping, { email: 'email' }),
      jitProvisioningEnabled: Boolean(row.jit_provisioning_enabled),
      defaultRole: row.default_role,
      enforceSso: Boolean(row.enforce_sso),
      domains: this.parseJsonSafe(row.domains, []),
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private static mapAuditRow(row: any): EnterpriseSsoLoginAudit {
    return {
      id: row.id,
      configId: row.config_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      email: row.email,
      idpNameId: row.idp_name_id,
      status: row.status,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      errorDetail: row.error_detail,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}
