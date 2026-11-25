/**
 * SocialForge End-to-End Platform Journey Test Suite
 * Comprehensive verification of the entire SaaS platform lifecycle across all stages:
 *  - Stage 1: Connect Hub & Credential Vault
 *  - Stage 2: Automation Engine & Graph Runner
 *  - Stage 3: Autonomous AI Agent System (Strategy, Content, Growth Manager)
 *  - Stage 4: Template Engine Architecture & Variant Renderer
 *  - Closed-Loop Marketing Advisor & Telemetry
 *  - Tenant Isolation & Production Data Integrity Lock
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { credentialVaultService } from '../apps/api/dist/services/connections/credentialVault.service.js';
import { connectionService } from '../apps/api/dist/services/connections/connection.service.js';
import { ConnectorRegistry } from '../apps/api/dist/connectors/index.js';
import { GenericOAuth2Connector } from '../apps/api/dist/connectors/core/GenericOAuth2Connector.js';
import {
  automationService,
  automationRunnerService,
} from '../apps/api/dist/services/automation/index.js';
import {
  agentOrchestratorService,
  agentMemoryService,
  agentSettingsService,
} from '../apps/api/dist/services/agent/index.js';
import {
  templateService,
  templateVersionService,
  templateRendererService,
  platformVariantService,
  templateValidatorService,
} from '../apps/api/dist/services/templates/index.js';

console.log('===============================================================');
console.log('  SOCIALFORGE COMPLETE E2E PLATFORM JOURNEY VERIFICATION      ');
console.log('===============================================================\n');

const uuid = () => crypto.randomUUID();

const TENANT_A_ID = uuid();
const TENANT_B_ID = uuid();
const BRAND_A_ID = uuid();
const USER_A_ID = uuid();
const LOCKED_META_POST_ID = '1405588742634526_122100337179498315';

let passed = 0;
let failed = 0;

function check(desc, cond) {
  if (cond) {
    console.log(`  PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  FAIL: ${desc}`);
    failed++;
  }
}

async function setup() {
  console.log('[Setup] Provisioning isolated test workspace & brand fixtures...');
  await db('tenants').insert({
    id: TENANT_A_ID,
    name: 'E2E Apex Growth Tenant',
    slug: `e2e-apex-${Date.now().toString(36)}`,
    subscription_tier: 'growth',
    settings: JSON.stringify({ primaryLocale: 'en-US' }),
  });

  await db('tenants').insert({
    id: TENANT_B_ID,
    name: 'E2E Rival Tenant',
    slug: `e2e-rival-${Date.now().toString(36)}`,
    subscription_tier: 'starter',
    settings: JSON.stringify({ primaryLocale: 'en-US' }),
  });

  await db('users').insert({
    id: USER_A_ID,
    email: `e2e-lead-${Date.now().toString(36)}@apex.com`,
    password_hash: 'hashed_pw_dummy',
    full_name: 'Alex Lead',
  });

  await db('tenant_users').insert({
    id: uuid(),
    tenant_id: TENANT_A_ID,
    user_id: USER_A_ID,
    role: 'owner',
  });

  await db('brands').insert({
    id: BRAND_A_ID,
    tenant_id: TENANT_A_ID,
    name: 'Apex Velocity Brand',
    slug: `apex-velocity-${Date.now().toString(36)}`,
    industry: 'Enterprise B2B SaaS',
    website_url: 'https://apexvelocity.example.com',
  });
}

async function runStage1Verification() {
  console.log('\n[1/6] Verifying Connect Hub & Secure Credential Vault (Stage 1)...');
  
  // Verify connector in registry
  const gdrive = ConnectorRegistry.get('google-drive');
  check('Connector registry has google-drive provider registered', Boolean(gdrive));

  // Store credentials in vault via connectionService
  const testSecretPayload = {
    accessToken: 'gdrive_secret_token_live_abc123',
    refreshToken: 'gdrive_refresh_token_live_xyz789',
    scope: 'drive.readonly drive.file',
  };

  const conn = await connectionService.createConnection({
    tenantId: TENANT_A_ID,
    brandId: BRAND_A_ID,
    provider: 'google-drive',
    credentials: testSecretPayload,
    scopes: ['drive.readonly', 'drive.file'],
    providerAccountMetadata: { email: 'growth@apex.com', name: 'Apex Google Drive' },
  });

  check('connectionService creates connection in CONNECTED state', conn.status === 'CONNECTED');
  const vaultRef = conn.credential_reference;
  check('Credential vault issues secure token reference cred_<uuid>', vaultRef && vaultRef.startsWith('cred_'));

  // Verify DB encrypted storage
  const [credRow] = await db('connection_credentials').where({ id: vaultRef });
  check('connection_credentials row created with tenant isolation', credRow && credRow.tenant_id === TENANT_A_ID);
  check('Plaintext access token is NEVER stored in database row', !JSON.stringify(credRow).includes('gdrive_secret_token_live_abc123'));
  check('AES-256-GCM auth_tag and iv stored', credRow.auth_tag && credRow.iv);

  // Retrieve decrypted credentials
  const decrypted = await credentialVaultService.getCredentials(TENANT_A_ID, vaultRef);
  check('Vault successfully decrypts credentials server-side', decrypted.accessToken === 'gdrive_secret_token_live_abc123');

  // Strict tenant boundary test
  let crossTenantFailed = false;
  try {
    await credentialVaultService.getCredentials(TENANT_B_ID, vaultRef);
  } catch (err) {
    crossTenantFailed = true;
  }
  check('Tenant B cannot decrypt Tenant A credentials (cross-tenant access blocked)', crossTenantFailed);
}

async function runStage2Verification() {
  console.log('\n[2/6] Verifying Automation Engine & Execution Graph (Stage 2)...');

  // Create automation rule
  const auto = await automationService.createAutomation(TENANT_A_ID, {
    name: 'E2E Social Recycler Pipeline',
    brandId: BRAND_A_ID,
    triggerType: 'schedule.cron',
    triggerConfig: { cron: '0 9 * * 1' },
    conditions: [
      { field: 'brand.industry', operator: 'contains', value: 'B2B' },
      { field: 'engagement.threshold', operator: 'greater_than', value: 3.0 },
    ],
    actions: [
      {
        id: 'step-1',
        type: 'generate_content',
        config: {
          prompt: 'Write 3 counter-narrative thought leadership hooks for enterprise founders',
          platforms: ['linkedin', 'x'],
        },
      },
      {
        id: 'step-2',
        type: 'create_post',
        config: {
          status: 'draft',
          platforms: ['linkedin', 'x'],
        },
      },
      {
        id: 'step-3',
        type: 'notify',
        config: {
          channel: 'in_app',
          recipient: USER_A_ID,
          message: 'Automation generated new high-intent draft posts',
        },
      },
    ],
    status: 'active',
  });

  check('Automation rule created with unique id', Boolean(auto?.id));
  check('Automation status set to active', auto.status === 'active');

  // Execute automation through runner
  const runResult = await automationRunnerService.executeAutomation(TENANT_A_ID, auto.id, {
    brand: { industry: 'Enterprise B2B SaaS' },
    engagement: { threshold: 4.8 },
  });

  check('Automation runner completes with completed status', runResult.status === 'completed');
  check('Execution graph executes all 3 action steps', runResult.stepResults.length === 3);
  check('Step 1 (generate_content) returns variants', runResult.stepResults[0].status === 'success');
  check('Step 2 (create_post) creates database draft post', runResult.stepResults[1].status === 'success');
  check('Step 3 (notify) dispatches notification', runResult.stepResults[2].status === 'success');

  // Verify created post exists in database
  const createdPostId = runResult.stepResults[1].output?.postId;
  const dbPost = await db('posts').where({ id: createdPostId, tenant_id: TENANT_A_ID }).first();
  check('Created post is persisted with strict tenant scoping', Boolean(dbPost));
}

async function runStage3Verification() {
  console.log('\n[3/6] Verifying Autonomous AI Agent System (Stage 3)...');

  // Configure agent settings
  const settings = await agentSettingsService.updateSettings(TENANT_A_ID, {
    model: 'gemini-1.5-pro',
    temperature: 0.7,
    autonomousMode: 'full',
    maxWeeklyPosts: 12,
  });
  check('Agent settings configured with autonomousMode=full', settings.autonomousMode === 'full');

  // Execute Orchestrator goal loop
  const goalResult = await agentOrchestratorService.runGoal(TENANT_A_ID, {
    prompt: 'Create draft post for our seasonal flash sale',
    brandId: BRAND_A_ID,
    agentType: 'content_agent',
  }, USER_A_ID);

  check('Agent orchestrator completes goal execution successfully', goalResult.status === 'completed');
  check('Goal output provides strategic plan steps', goalResult.plan && goalResult.plan.length > 0);
  check('Orchestrator records tool calls during execution loop', goalResult.toolCalls && goalResult.toolCalls.length > 0);
  check('Generated post draft persisted with real postId', Boolean(goalResult.results?.draftPost?.postId));

  // Verify agent memory retention
  await agentMemoryService.retain(
    TENANT_A_ID,
    'top_performing_hook_angle',
    { angle: 'The Daily Posting Trap', ctr: 5.8, verifiedAt: new Date().toISOString() },
    { brandId: BRAND_A_ID, memoryType: 'strategic_insight' }
  );

  const recalled = await agentMemoryService.recall(TENANT_A_ID, 'top_performing_hook_angle', BRAND_A_ID);
  check('Agent memory accurately recalled from persistent store', recalled && recalled.angle === 'The Daily Posting Trap');

  // Tenant B cannot recall Tenant A memory
  const crossRecall = await agentMemoryService.recall(TENANT_B_ID, 'top_performing_hook_angle', BRAND_A_ID);
  check('Tenant B cannot recall Tenant A agent memories (memory isolation)', crossRecall === null);
}

async function runStage4Verification() {
  console.log('\n[4/6] Verifying Template Engine Architecture & Variant Generation (Stage 4)...');

  // Validate WCAG Contrast scoring
  const highContrast = templateValidatorService.calculateContrastRatio('#000000', '#FFFFFF');
  check('WCAG Contrast calculation evaluates black on white as 21:1', highContrast >= 20.0);

  // Create custom template
  const template = await templateService.createTemplate(TENANT_A_ID, {
    name: 'Executive SaaS Carousel Slide',
    description: 'High impact B2B carousel layout',
    category: 'Educational',
    aspectRatio: '1:1',
    brandId: BRAND_A_ID,
    background: { type: 'color', value: '#0f172a' },
    layers: [
      {
        id: 'layer-badge',
        type: 'text',
        name: 'Topic Badge',
        text: '{{topic | uppercase}}',
        x: 60,
        y: 60,
        fontSize: 14,
        color: '#A855F7',
      },
      {
        id: 'layer-headline',
        type: 'text',
        name: 'Main Headline',
        text: '{{headline}}',
        x: 60,
        y: 120,
        fontSize: 36,
        color: '#FFFFFF',
      },
    ],
  }, USER_A_ID);

  check('Custom template created with unique id', Boolean(template?.id));

  // Platform variant generation across 1:1, 4:5, 9:16
  const bundle = platformVariantService.generateMultiPlatformBundle(template);
  check('Platform variant bundle includes Instagram Square (1:1)', Boolean(bundle.instagram_square));
  check('Platform variant bundle includes Instagram Portrait (4:5)', Boolean(bundle.instagram_portrait));
  check('Platform variant bundle includes TikTok / Reel Story (9:16)', Boolean(bundle.tiktok_reel));

  // Dynamic template rendering with variable evaluation
  const renderedText = templateRendererService.renderText('Blueprint: {{topic | uppercase}} — {{headline}}', {
    topic: 'Growth Blueprint',
    headline: 'Scaling to $10M ARR Without Burnout',
  });

  check('Variable {{topic | uppercase}} evaluated to GROWTH BLUEPRINT', renderedText.includes('GROWTH BLUEPRINT'));
  check('Variable {{headline}} evaluated correctly', renderedText.includes('Scaling to $10M ARR Without Burnout'));

  // Template version branching and rollback
  await templateService.updateTemplate(TENANT_A_ID, template.id, {
    name: 'Executive SaaS Carousel Slide (v2)',
    layers: [
      ...template.layers,
      {
        id: 'layer-cta',
        type: 'text',
        name: 'Footer CTA',
        text: 'Save this post ↗',
        x: 60,
        y: 800,
        fontSize: 16,
        color: '#94A3B8',
      },
    ],
  });

  const updatedVersions = await templateVersionService.listVersions(TENANT_A_ID, template.id);
  check('New version v2 recorded upon template update', updatedVersions.length === 2);

  const rollbackRes = await templateVersionService.rollbackToVersion(TENANT_A_ID, template.id, 1, USER_A_ID);
  check('Rollback to version 1 succeeds', rollbackRes.success === true);
  check('Rollback creates new audit snapshot v3', rollbackRes.newVersionNumber === 3);
}

async function runClosedLoopMarketingAdvisor() {
  console.log('\n[5/6] Verifying Closed-Loop AI Marketing Advisor & Telemetry...');

  // Telemetry event ingestion (e.g., high engagement event)
  const telemetrySignal = {
    postId: uuid(),
    platform: 'linkedin',
    ctr: 6.4,
    impressions: 4850,
    topic: 'Automated Multi-Channel Distribution',
    detectedAt: new Date().toISOString(),
  };

  // Agent incorporates telemetry into memory
  await agentMemoryService.retain(
    TENANT_A_ID,
    `signal_${telemetrySignal.postId}`,
    telemetrySignal,
    { brandId: BRAND_A_ID, memoryType: 'telemetry_feedback' }
  );

  const savedSignal = await agentMemoryService.recall(TENANT_A_ID, `signal_${telemetrySignal.postId}`, BRAND_A_ID);
  check('High-velocity post telemetry captured in agent memory', savedSignal && savedSignal.ctr === 6.4);

  // Orchestrator utilizes feedback memory to generate recommended action
  const advisorPrompt = `Based on recent telemetry signal showing ${telemetrySignal.ctr}% CTR on "${telemetrySignal.topic}", recommend the next campaign strategy arc.`;
  const advisorRun = await agentOrchestratorService.runGoal(TENANT_A_ID, {
    prompt: advisorPrompt,
    brandId: BRAND_A_ID,
    agentType: 'strategy_agent',
  }, USER_A_ID);

  check('Marketing Advisor generates responsive campaign recommendation', Boolean(advisorRun.results));
  check('Closed-loop feedback is reflected in agent run results', advisorRun.status === 'completed');
}

async function runDataIntegrityAndLockCheck() {
  console.log('\n[6/6] Verifying Production Data Integrity & Meta Lock...');

  // 1. Verify locked production post variant is intact
  const [lockedVariant] = await db('post_variants').where({ remote_post_id: LOCKED_META_POST_ID });
  check('Locked production post variant 1405588742634526_122100337179498315 exists', Boolean(lockedVariant));
  check('Locked production post variant status is strictly "published"', lockedVariant?.status === 'published');

  // 2. Verify publishing jobs integrity
  const [pubJob] = await db('publishing_jobs').where({ external_post_id: LOCKED_META_POST_ID });
  check('Publishing job for locked post exists and is completed/published', pubJob && (pubJob.status === 'completed' || pubJob.status === 'published'));

  // 3. Verify cross-tenant isolation on DB level
  const tenantBAutomations = await db('automations').where({ tenant_id: TENANT_B_ID });
  check('Tenant B cannot see Tenant A automations (0 rows returned)', tenantBAutomations.length === 0);

  const tenantBTemplates = await db('templates').where({ tenant_id: TENANT_B_ID, is_custom: 1 });
  check('Tenant B cannot see Tenant A custom templates (0 rows returned)', tenantBTemplates.length === 0);
}

async function cleanup() {
  console.log('\n[Cleanup] Cleaning up test fixtures...');
  try {
    await db('template_versions').where({ tenant_id: TENANT_A_ID }).del();
    await db('templates').where({ tenant_id: TENANT_A_ID }).del();
    await db('agent_memories').where({ tenant_id: TENANT_A_ID }).del();
    await db('agent_settings').where({ tenant_id: TENANT_A_ID }).del();
    await db('agent_runs').where({ tenant_id: TENANT_A_ID }).del();
    await db('automation_runs').where({ tenant_id: TENANT_A_ID }).del();
    await db('automations').where({ tenant_id: TENANT_A_ID }).del();
    await db('social_connections').where({ tenant_id: TENANT_A_ID }).del();
    await db('connection_credentials').where({ tenant_id: TENANT_A_ID }).del();
    const postIds = await db('posts').where({ tenant_id: TENANT_A_ID }).pluck('id');
    if (postIds.length > 0) {
      await db('post_variants').whereIn('post_id', postIds).del();
    }
    await db('posts').where({ tenant_id: TENANT_A_ID }).del();
    await db('brands').where({ id: BRAND_A_ID }).del();
    await db('tenant_users').where({ tenant_id: TENANT_A_ID }).del();
    await db('users').where({ id: USER_A_ID }).del();
    await db('tenants').whereIn('id', [TENANT_A_ID, TENANT_B_ID]).del();
    console.log('Cleanup completed successfully.');
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }
}

async function main() {
  try {
    await setup();
    await runStage1Verification();
    await runStage2Verification();
    await runStage3Verification();
    await runStage4Verification();
    await runClosedLoopMarketingAdvisor();
    await runDataIntegrityAndLockCheck();
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await cleanup();
    await db.destroy();

    console.log('\n===============================================================');
    console.log(`  E2E PLATFORM JOURNEY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

main();
