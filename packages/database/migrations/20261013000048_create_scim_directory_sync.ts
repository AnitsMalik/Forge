import { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // 1. scim_api_tokens
  const hasTokens = await knex.schema.hasTable('scim_api_tokens');
  if (!hasTokens) {
    await knex.schema.createTable('scim_api_tokens', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).nullable().index();
      table.string('name', 255).notNullable();
      table.string('token_hash', 64).notNullable().unique();
      table.string('token_prefix', 32).notNullable();
      table.timestamp('last_used_at').nullable();
      table.timestamp('expires_at').nullable();
      table.enu('status', ['active', 'revoked']).notNullable().defaultTo('active');
      table.string('created_by', 64).notNullable().defaultTo('superadmin');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // Seed default SCIM Bearer Token for Acme Corp Okta Directory Sync
    const demoTokenRaw = 'scim_live_sec_999888777666555444333222111000';
    const demoTokenHash = crypto.createHash('sha256').update(demoTokenRaw).digest('hex');

    await knex('scim_api_tokens').insert({
      id: 'scim-tok-acme-okta-01',
      tenant_id: null,
      name: 'Acme Corp Okta SCIM 2.0 Integration Token',
      token_hash: demoTokenHash,
      token_prefix: 'scim_live_sec_9998...',
      status: 'active',
      created_by: 'superadmin',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }

  // 2. scim_sync_logs
  const hasLogs = await knex.schema.hasTable('scim_sync_logs');
  if (!hasLogs) {
    await knex.schema.createTable('scim_sync_logs', (table) => {
      table.string('id', 64).primary();
      table.string('tenant_id', 64).nullable().index();
      table.string('token_id', 64).nullable().index();
      table.string('method', 16).notNullable();
      table.string('endpoint', 255).notNullable();
      table.string('scim_resource_type', 64).nullable();
      table.string('scim_resource_id', 255).nullable();
      table.string('action', 64).notNullable(); // create, update, patch, delete, deactivate, read, query
      table.integer('status_code').notNullable();
      table.string('ip_address', 64).nullable();
      table.text('request_payload', 'long').nullable();
      table.text('error_detail').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    });

    // Seed sample telemetry sync logs
    await knex('scim_sync_logs').insert([
      {
        id: 'scim-log-demo-01',
        tenant_id: null,
        token_id: 'scim-tok-acme-okta-01',
        method: 'GET',
        endpoint: '/api/v1/scim/v2/ServiceProviderConfig',
        scim_resource_type: 'ServiceProviderConfig',
        scim_resource_id: null,
        action: 'read',
        status_code: 200,
        ip_address: '52.14.23.11',
        request_payload: null,
        error_detail: null,
        created_at: new Date(Date.now() - 3600000)
      },
      {
        id: 'scim-log-demo-02',
        tenant_id: null,
        token_id: 'scim-tok-acme-okta-01',
        method: 'POST',
        endpoint: '/api/v1/scim/v2/Users',
        scim_resource_type: 'User',
        scim_resource_id: 'user-scim-sample-01',
        action: 'create',
        status_code: 201,
        ip_address: '52.14.23.11',
        request_payload: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'alex.chen@acme-corp.com',
          name: { givenName: 'Alex', familyName: 'Chen', formatted: 'Alex Chen' },
          emails: [{ value: 'alex.chen@acme-corp.com', primary: true, type: 'work' }],
          active: true
        }),
        error_detail: null,
        created_at: new Date(Date.now() - 1800000)
      }
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scim_sync_logs');
  await knex.schema.dropTableIfExists('scim_api_tokens');
}
