import type { Knex } from 'knex';

/**
 * Phase 28: Multi-Tenant Custom Domains & White-Label Agency Portals (v4.6.0)
 *
 * - custom_domains:           Custom agency domains (CNAME/TXT verification, automated SSL, custom branding)
 * - custom_domain_access_logs: HTTP traffic telemetry, response timing, client IP, host headers
 */

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('custom_domains'))) {
    await knex.schema.createTable('custom_domains', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_custom_domains_tenant');
      table.string('domain', 255).notNullable().unique('uq_custom_domain');
      table.string('portal_type', 32).notNullable().defaultTo('client_review');
      table.string('status', 32).notNullable().defaultTo('pending_dns').index('idx_custom_domains_status');
      table.string('verification_token', 64).notNullable();
      table.string('verification_method', 16).notNullable().defaultTo('cname');
      table.string('dns_target', 255).notNullable().defaultTo('cname.socialforge.ai');
      table.boolean('cname_verified').notNullable().defaultTo(false);
      table.boolean('txt_verified').notNullable().defaultTo(false);
      table.string('ssl_status', 32).notNullable().defaultTo('pending');
      table.boolean('ssl_auto_renew').notNullable().defaultTo(true);
      table.dateTime('ssl_issued_at').nullable();
      table.dateTime('ssl_expires_at').nullable();
      table.string('ssl_issuer', 128).nullable();
      table.json('branding_json').notNullable();
      table.boolean('enforce_https').notNullable().defaultTo(true);
      table.dateTime('last_dns_check_at').nullable();
      table.text('dns_error_details').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('custom_domain_access_logs'))) {
    await knex.schema.createTable('custom_domain_access_logs', (table) => {
      table.string('id', 36).primary();
      table.string('custom_domain_id', 36).notNullable().references('id').inTable('custom_domains').onDelete('CASCADE');
      table.string('tenant_id', 36).notNullable().index('idx_domain_logs_tenant');
      table.string('host_header', 255).notNullable();
      table.string('request_path', 512).notNullable();
      table.string('client_ip', 64).nullable();
      table.string('user_agent', 512).nullable();
      table.integer('status_code').notNullable();
      table.integer('response_time_ms').notNullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now()).index('idx_domain_logs_created');
      table.index(['custom_domain_id', 'created_at'], 'idx_domain_logs_lookup');
    });
  }

  // Pre-seed an initial enterprise custom domain for Lumina Wellness (or first tenant)
  const tenant = await knex('tenants').first('id');
  if (tenant) {
    const existingDomain = await knex('custom_domains').where({ domain: 'review.luminawellness.com' }).first();
    if (!existingDomain) {
      const now = new Date();
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const domainId = 'cnd-lumina-review-01';

      await knex('custom_domains').insert({
        id: domainId,
        tenant_id: tenant.id,
        domain: 'review.luminawellness.com',
        portal_type: 'client_review',
        status: 'active',
        verification_token: 'sf-verify-7f9a12c4e8b3',
        verification_method: 'cname',
        dns_target: 'cname.socialforge.ai',
        cname_verified: 1,
        txt_verified: 1,
        ssl_status: 'issued',
        ssl_auto_renew: 1,
        ssl_issued_at: now,
        ssl_expires_at: expiresAt,
        ssl_issuer: "Let's Encrypt Authority X3",
        branding_json: JSON.stringify({
          agencyName: 'Lumina Creative Studio',
          logoLightUrl: 'https://cdn.luminawellness.com/assets/logo-light.svg',
          logoDarkUrl: 'https://cdn.luminawellness.com/assets/logo-dark.svg',
          faviconUrl: 'https://cdn.luminawellness.com/assets/favicon.ico',
          primaryColor: '#6366f1',
          accentColor: '#ec4899',
          customCss: '.lumina-brand-header { font-family: Outfit, sans-serif; }',
          hideSocialforgeBranding: true,
          footerText: 'Powered by Lumina Client Review Portal',
          supportEmail: 'approvals@luminawellness.com',
        }),
        enforce_https: 1,
        last_dns_check_at: now,
        dns_error_details: null,
        created_at: now,
        updated_at: now,
      });

      await knex('custom_domain_access_logs').insert({
        id: 'cnd-log-seed-01',
        custom_domain_id: domainId,
        tenant_id: tenant.id,
        host_header: 'review.luminawellness.com',
        request_path: '/review/portal/token-demo-123',
        client_ip: '192.0.2.45',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        status_code: 200,
        response_time_ms: 42,
        created_at: now,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_domain_access_logs');
  await knex.schema.dropTableIfExists('custom_domains');
}
