import { db } from '../apps/api/dist/db/connection.js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });
dotenv.config({ path: '.env' });

async function audit() {
  console.log('=== DATABASE SUBSCRIPTION PLANS ===');
  const plans = await db('subscription_plans').select('*');
  console.table(plans.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    monthly_price_cents: p.monthly_price_cents,
    max_brands: p.max_brands,
    max_users: p.max_users,
    max_social_accounts: p.max_social_accounts,
    max_posts_per_month: p.max_posts_per_month,
    ai_tokens_monthly: p.ai_tokens_monthly,
    stripe_price_id: p.stripe_price_id,
    stripe_product_id: p.stripe_product_id,
    is_active: p.is_active
  })));

  console.log('\n=== STRIPE CONFIGURATION IN ENV ===');
  console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.slice(0, 10) + '...' : 'NOT_SET');
  console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.slice(0, 10) + '...' : 'NOT_SET');
  console.log('STRIPE_PRICE_STARTER:', process.env.STRIPE_PRICE_STARTER || 'NOT_SET');
  console.log('STRIPE_PRICE_GROWTH:', process.env.STRIPE_PRICE_GROWTH || 'NOT_SET');
  console.log('STRIPE_PRICE_AGENCY:', process.env.STRIPE_PRICE_AGENCY || 'NOT_SET');

  console.log('\n=== AI ENGINE & TOKENS CONFIGURATION ===');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.slice(0, 10) + '...' : 'NOT_SET');
  console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.slice(0, 10) + '...' : 'NOT_SET');
  console.log('AI_MODEL:', process.env.AI_MODEL || 'NOT_SET');

  console.log('\n=== USAGE TRACKING & QUOTAS IN DB ===');
  const tables = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND (table_name LIKE '%usage%' OR table_name LIKE '%token%' OR table_name LIKE '%quota%')");
  console.log('Relevant Usage Tables:', tables[0].map(r => r.TABLE_NAME || r.table_name));

  await db.destroy();
}

audit().catch(console.error);
