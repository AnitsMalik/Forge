import fs from 'fs';
import dotenv from 'dotenv';
import { db } from '../apps/api/dist/db/connection.js';

async function check() {
  const envContent = fs.readFileSync('f:/SocialAgent/.env', 'utf-8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    if (line.trim().startsWith('META_')) {
      const [key, val] = line.split('=');
      console.log(`${key.trim()}: length=${val?.trim().length}, prefix=${val?.trim().slice(0, 8)}...`);
    }
  }

  const connections = await db('meta_connections').orderBy('updated_at', 'desc').limit(3);
  console.log('Recent meta_connections:');
  for (const c of connections) {
    console.log({
      id: c.id,
      brand_id: c.brand_id,
      status: c.status,
      updated_at: c.updated_at,
      selected_page_id: c.selected_page_id,
      instagram_account_id: c.instagram_account_id,
    });
  }

  const pages = await db('meta_facebook_pages').orderBy('updated_at', 'desc').limit(3);
  console.log('Recent meta_facebook_pages:');
  for (const p of pages) {
    console.log({
      id: p.id,
      page_id: p.page_id,
      name: p.name,
      instagram_business_account_id: p.instagram_business_account_id,
      updated_at: p.updated_at,
    });
  }

  const sa = await db('social_accounts').where({ account_id: '1405588742634526' }).select('*');
  console.log('social_accounts for 1405588742634526:');
  for (const s of sa) {
    console.log({
      id: s.id,
      brand_id: s.brand_id,
      platform: s.platform,
      account_name: s.account_name,
      is_active: s.is_active,
      updated_at: s.updated_at,
    });
  }

  process.exit(0);
}

check().catch(console.error);
