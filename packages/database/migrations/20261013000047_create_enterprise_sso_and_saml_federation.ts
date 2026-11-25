import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. enterprise_sso_configs
  const hasConfigs = await knex.schema.hasTable('enterprise_sso_configs');
  if (!hasConfigs) {
    await knex.schema.createTable('enterprise_sso_configs', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).nullable().index();
      table.string('name', 255).notNullable();
      table.enu('provider_type', ['saml', 'oidc']).notNullable().defaultTo('saml');
      table.string('idp_entity_id', 255).notNullable();
      table.string('idp_sso_url', 1024).notNullable();
      table.text('idp_certificate').notNullable();
      table.string('idp_metadata_url', 1024).nullable();
      table.string('sp_entity_id', 255).notNullable();
      table.string('sp_acs_url', 1024).notNullable();
      table.json('attribute_mapping').notNullable();
      table.boolean('jit_provisioning_enabled').notNullable().defaultTo(true);
      table.string('default_role', 32).notNullable().defaultTo('editor');
      table.boolean('enforce_sso').notNullable().defaultTo(false);
      table.json('domains').notNullable(); // corporate email domains (e.g. ["acme-corp.com"])
      table.enu('status', ['active', 'inactive', 'testing']).notNullable().defaultTo('active');
      table.string('created_by', 64).notNullable().defaultTo('superadmin');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed initial enterprise SSO configuration
    const dummyCert = `-----BEGIN CERTIFICATE-----
MIIDpDCCAoygAwIBAgIGAY7G8vUAMA0GCSqGSIb3DQEBCwUAMIGSMQswCQYDVQQG
EwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNj
bzESMBAGA1UECgwJQWNtZSBDb3JwMQwwCgYDVQQLDANTRU0xGDAWBgNVBAMMD29r
dGEuYWNtZS1jb3JwLmNvbTEhMB8GCSqGSIb3DQEJARYSc3NvQGFjbWUtY29ycC5j
b20wHhcNMjYwMTAxMDAwMDAwWhcNMzYwMTAxMDAwMDAwWjCBkjELMAkGA1UEBhMC
VVMxEzARBgNVBAgMCkNhbGlmb3JuaWExFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28x
EjAQBgNVBAoMCUFjbWUgQ29ycDEMMAoGA1UECwwDU0VNMRgwFgYDVQQDDA9va3Rh
LmFjbWUtY29ycC5jb20xITAfBgkqhkiG9w0BCQEWEnNzb0BhY21lLWNvcnAuY29t
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y+u123AcmeCorpCert
-----END CERTIFICATE-----`;

    await knex('enterprise_sso_configs').insert([
      {
        id: 'sso-okta-acme-01',
        tenant_id: null,
        name: 'Acme Corp Okta Enterprise Federation',
        provider_type: 'saml',
        idp_entity_id: 'http://www.okta.com/exk1234567890Acme',
        idp_sso_url: 'https://acme-corp.okta.com/app/socialforge/exk1234567890/sso/saml',
        idp_certificate: dummyCert,
        idp_metadata_url: 'https://acme-corp.okta.com/app/exk1234567890/sso/saml/metadata',
        sp_entity_id: 'https://app.socialforge.ai/auth/sso/saml/sso-okta-acme-01/metadata',
        sp_acs_url: 'http://localhost:4000/api/v1/auth/sso/saml/sso-okta-acme-01/acs',
        attribute_mapping: JSON.stringify({
          email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
          firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
          lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
          role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
        }),
        jit_provisioning_enabled: true,
        default_role: 'editor',
        enforce_sso: false,
        domains: JSON.stringify(['acme-corp.com', 'acme.internal']),
        status: 'active',
        created_by: 'system_bootstrap',
      },
      {
        id: 'sso-azure-globex-02',
        tenant_id: null,
        name: 'Globex Corp Microsoft Entra ID (Azure AD)',
        provider_type: 'saml',
        idp_entity_id: 'https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/',
        idp_sso_url: 'https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/saml2',
        idp_certificate: dummyCert,
        idp_metadata_url: 'https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/federationmetadata/2007-06/federationmetadata.xml',
        sp_entity_id: 'https://app.socialforge.ai/auth/sso/saml/sso-azure-globex-02/metadata',
        sp_acs_url: 'http://localhost:4000/api/v1/auth/sso/saml/sso-azure-globex-02/acs',
        attribute_mapping: JSON.stringify({
          email: 'email',
          firstName: 'firstName',
          lastName: 'lastName',
          role: 'groups',
        }),
        jit_provisioning_enabled: true,
        default_role: 'viewer',
        enforce_sso: false,
        domains: JSON.stringify(['globex.com']),
        status: 'active',
        created_by: 'system_bootstrap',
      },
    ]);
  }

  // 2. enterprise_sso_login_audits
  const hasAudits = await knex.schema.hasTable('enterprise_sso_login_audits');
  if (!hasAudits) {
    await knex.schema.createTable('enterprise_sso_login_audits', (table) => {
      table.string('id', 64).primary();
      table.string('config_id', 64).notNullable().index();
      table.string('tenant_id', 64).nullable().index();
      table.string('user_id', 64).nullable().index();
      table.string('email', 255).notNullable().index();
      table.string('idp_name_id', 255).notNullable();
      table.enu('status', [
        'success',
        'failed_signature',
        'failed_domain_unmapped',
        'failed_user_provisioning',
        'blocked_inactive',
      ]).notNullable().defaultTo('success');
      table.string('ip_address', 64).nullable();
      table.string('user_agent', 512).nullable();
      table.text('error_detail').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    // Seed sample successful SSO audit
    await knex('enterprise_sso_login_audits').insert([
      {
        id: 'sso-audit-seed-001',
        config_id: 'sso-okta-acme-01',
        tenant_id: null,
        user_id: null,
        email: 'alice.vp@acme-corp.com',
        idp_name_id: 'alice.vp@acme-corp.com',
        status: 'success',
        ip_address: '198.51.100.42',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        error_detail: null,
        created_at: new Date(),
      },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('enterprise_sso_login_audits');
  await knex.schema.dropTableIfExists('enterprise_sso_configs');
}
