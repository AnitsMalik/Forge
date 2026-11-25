/**
 * Production Meta Publication Lock Verification Script
 * Validates that live Facebook post variant (1405588742634526_122100337179498315)
 * and its corresponding publishing job (256cf21a-26cd-4032-a7b8-17261d8a81b1)
 * remain permanently locked in 'published' status.
 */

import { db } from '../apps/api/dist/db/connection.js';

async function verifyMetaLock() {
  console.log('========================================================');
  console.log('   SOCIALFORGE PRODUCTION META PUBLICATION LOCK CHECK   ');
  console.log('========================================================\n');

  try {
    const variants = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' });

    if (variants.length === 0) {
      console.error('❌ FAIL: Production Meta post variant not found in database!');
      process.exit(1);
    }

    const variant = variants[0];
    console.log(`[Variant] ID: ${variant.id}`);
    console.log(`[Variant] Remote Post ID: ${variant.remote_post_id}`);
    console.log(`[Variant] Platform: ${variant.platform}`);
    console.log(`[Variant] Status: ${variant.status}`);

    if (variant.status !== 'published') {
      console.error(`❌ FAIL: Expected variant status 'published', received '${variant.status}'`);
      process.exit(1);
    }
    console.log('  ✓ PASS: Production Meta post variant is strictly locked in published status.');

    const jobs = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' });

    if (jobs.length === 0) {
      console.error('❌ FAIL: Production publishing job not found in database!');
      process.exit(1);
    }

    const job = jobs[0];
    console.log(`\n[Publishing Job] ID: ${job.id}`);
    console.log(`[Publishing Job] Status: ${job.status}`);
    console.log(`[Publishing Job] Platform: ${job.platform}`);

    if (job.status !== 'published') {
      console.error(`❌ FAIL: Expected publishing job status 'published', received '${job.status}'`);
      process.exit(1);
    }
    console.log('  ✓ PASS: Production publishing job is strictly locked in published status.\n');

    console.log('========================================================');
    console.log('   STATUS: ALL PRODUCTION META INVARIANTS INTACT (PASS)  ');
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('Error verifying Meta lock:', error);
    process.exit(1);
  }
}

verifyMetaLock();
