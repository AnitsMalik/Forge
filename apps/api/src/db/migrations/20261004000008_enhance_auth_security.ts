import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Extend users table with auth security fields
  const hasEmailVerified = await knex.schema.hasColumn('users', 'email_verified');
  if (!hasEmailVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('email_verified').notNullable().defaultTo(false);
      table.integer('failed_login_attempts').notNullable().defaultTo(0);
      table.timestamp('locked_until').nullable();
      table.integer('token_version').notNullable().defaultTo(1);
      table.timestamp('last_login_at').nullable();
    });
  }

  // Set existing users to email_verified = true
  await knex('users').update({ email_verified: true });

  // 2. Refresh tokens table (with rotation & family tracking)
  const hasRefreshTokens = await knex.schema.hasTable('refresh_tokens');
  if (!hasRefreshTokens) {
    await knex.schema.createTable('refresh_tokens', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash', 64).notNullable().index();
      table.uuid('family_id').notNullable().index();
      table.boolean('is_revoked').notNullable().defaultTo(false);
      table.timestamp('expires_at').notNullable();
      table.string('ip_address', 45).nullable();
      table.text('user_agent').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 3. Password reset tokens table (single-use, hashed)
  const hasResetTokens = await knex.schema.hasTable('password_reset_tokens');
  if (!hasResetTokens) {
    await knex.schema.createTable('password_reset_tokens', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash', 64).notNullable().index();
      table.timestamp('expires_at').notNullable();
      table.boolean('is_used').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 4. Email verification tokens table (single-use, hashed)
  const hasVerifyTokens = await knex.schema.hasTable('email_verification_tokens');
  if (!hasVerifyTokens) {
    await knex.schema.createTable('email_verification_tokens', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash', 64).notNullable().index();
      table.timestamp('expires_at').notNullable();
      table.boolean('is_used').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 5. Auth audit logs table (without sensitive passwords/tokens)
  const hasAuditLogs = await knex.schema.hasTable('auth_audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('auth_audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').nullable().index();
      table.string('email', 255).nullable();
      table.string('event', 50).notNullable().index();
      table.string('ip_address', 45).nullable();
      table.text('user_agent').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).index();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('auth_audit_logs');
  await knex.schema.dropTableIfExists('email_verification_tokens');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('refresh_tokens');

  const hasEmailVerified = await knex.schema.hasColumn('users', 'email_verified');
  if (hasEmailVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('email_verified');
      table.dropColumn('failed_login_attempts');
      table.dropColumn('locked_until');
      table.dropColumn('token_version');
      table.dropColumn('last_login_at');
    });
  }
}
