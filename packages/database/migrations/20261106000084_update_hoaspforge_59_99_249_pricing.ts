import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const now = new Date();

  // 1. Add agreed_price_cents to tenant_subscriptions if not present
  // This preserves existing customer subscriptions and agreed prices!
  const hasAgreedCol = await knex.schema.hasColumn('tenant_subscriptions', 'agreed_price_cents');
  if (!hasAgreedCol) {
    await knex.schema.alterTable('tenant_subscriptions', (table) => {
      table.integer('agreed_price_cents').nullable().after('plan_id');
    });
  }

  // 2. Backfill existing active tenant subscriptions with their grandfathered/agreed prices
  // Existing customers keep their agreed price unless they explicitly upgrade or change plans
  await knex('tenant_subscriptions')
    .where({ plan_id: 'starter' })
    .whereNull('agreed_price_cents')
    .update({ agreed_price_cents: 2900 });

  await knex('tenant_subscriptions')
    .where({ plan_id: 'growth' })
    .whereNull('agreed_price_cents')
    .update({ agreed_price_cents: 7900 });

  await knex('tenant_subscriptions')
    .whereIn('plan_id', ['agency', 'agency_scale'])
    .whereNull('agreed_price_cents')
    .update({ agreed_price_cents: 19900 });

  await knex('tenant_subscriptions')
    .whereIn('plan_id', ['free_trial', 'trial'])
    .whereNull('agreed_price_cents')
    .update({ agreed_price_cents: 0 });

  // 3. Update new catalog subscription prices in subscription_plans
  // Starter: $59/mo ($5900 cents) | $49/mo equivalent, $588 annually ($58800 cents)
  await knex('subscription_plans')
    .where({ id: 'starter' })
    .update({
      price: 59.00,
      monthly_price_cents: 5900,
      annual_price_cents: 58800,
      updated_at: now,
    });

  // Growth: $99/mo ($9900 cents) | $79/mo equivalent, $948 annually ($94800 cents)
  await knex('subscription_plans')
    .where({ id: 'growth' })
    .update({
      price: 99.00,
      monthly_price_cents: 9900,
      annual_price_cents: 94800,
      updated_at: now,
    });

  // Agency Pro: $249/mo ($24900 cents) | $199/mo equivalent, $2,388 annually ($238800 cents)
  await knex('subscription_plans')
    .where({ id: 'agency' })
    .update({
      price: 249.00,
      monthly_price_cents: 24900,
      annual_price_cents: 238800,
      updated_at: now,
    });

  await knex('subscription_plans')
    .where({ id: 'agency_scale' })
    .update({
      price: 249.00,
      monthly_price_cents: 24900,
      annual_price_cents: 238800,
      updated_at: now,
    });

  // Scale: $499/mo ($49900 cents) | $399/mo equivalent, $4,788 annually ($478800 cents)
  await knex('subscription_plans')
    .where({ id: 'scale' })
    .update({
      price: 499.00,
      monthly_price_cents: 49900,
      annual_price_cents: 478800,
      updated_at: now,
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex('subscription_plans').where({ id: 'starter' }).update({ price: 29.00, monthly_price_cents: 2900, annual_price_cents: 28800 });
  await knex('subscription_plans').where({ id: 'growth' }).update({ price: 79.00, monthly_price_cents: 7900, annual_price_cents: 78000 });
  await knex('subscription_plans').where({ id: 'agency' }).update({ price: 199.00, monthly_price_cents: 19900, annual_price_cents: 190800 });
  await knex('subscription_plans').where({ id: 'agency_scale' }).update({ price: 199.00, monthly_price_cents: 19900, annual_price_cents: 190800 });
}

