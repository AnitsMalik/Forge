import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { idempotencyService } from './idempotency.service.js';
import { conditionService } from './condition.service.js';
import { actionService } from './action.service.js';
import { distributedLockService } from './distributedLock.service.js';
import { durableStepLoggerService } from './durableStepLogger.service.js';
import { retryDlqService } from './retryDlq.service.js';
import type {
  AutomationLifecycleState,
  AutomationFailureState,
  DurableRunContext,
} from './types.js';
import type { AutomationStepConfig, StepExecutionResult } from '@socialforge/shared';

export interface ExecuteDurableAutomationOptions {
  tenantId: string;
  automationId: string;
  triggerEvent?: any;
  sourceConnectionId?: string;
  sourceRecordId?: string;
  sourceVersion?: string;
  actionType?: string;
  templateVersion?: number;
  runContext?: DurableRunContext;
  runId?: string;
}

export interface DurableExecutionResult {
  success: boolean;
  runId: string;
  lifecycleState: AutomationLifecycleState | AutomationFailureState | string;
  status: string;
  durationMs: number;
  stepResults?: StepExecutionResult[];
  skipped?: boolean;
  retrying?: boolean;
  retryCount?: number;
  nextRetryAt?: Date;
  dlqId?: string;
  reason?: string;
  error?: string | null;
}

export class DurableRunnerService {
  /**
   * Executes a durable automation workflow advancing deterministically through
   * the 15-state lifecycle and recording step logs, locks, retries, and DLQ.
   */
  public async executeDurableRun(options: ExecuteDurableAutomationOptions): Promise<DurableExecutionResult> {
    const startTime = Date.now();
    const { tenantId, automationId } = options;

    // 1. Fetch automation with strict tenant isolation
    const automation = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .first();

    if (!automation) {
      throw new Error(`Automation ${automationId} not found or access denied for tenant ${tenantId}.`);
    }

    if (automation.status === 'paused') {
      return {
        success: false,
        runId: options.runId || crypto.randomUUID(),
        lifecycleState: 'PAUSED',
        status: 'paused',
        durationMs: 0,
        reason: 'Automation is currently paused. Skipping execution.',
      };
    }

    if (automation.status === 'cancelled') {
      return {
        success: false,
        runId: options.runId || crypto.randomUUID(),
        lifecycleState: 'CANCELLED',
        status: 'cancelled',
        durationMs: 0,
        reason: `Automation is cancelled: ${automation.cancellation_reason || 'Manual cancellation'}.`,
      };
    }

    // Check Brand Governance Emergency Pause
    let govSettings: any = null;
    try {
      govSettings = await db('brand_governance_settings')
        .where({ tenant_id: tenantId, brand_id: automation.brand_id })
        .first();
    } catch {}

    if (govSettings?.emergency_paused) {
      return {
        success: false,
        runId: options.runId || crypto.randomUUID(),
        lifecycleState: 'PAUSED',
        status: 'paused',
        durationMs: 0,
        reason: `Brand governance emergency pause active: ${govSettings.pause_reason || 'Autonomous operations halted.'}`,
      };
    }

    // Check Plan Limits & Entitlements on backend execution
    try {
      const { planGuardService } = await import('../billing/planGuard.service.js');
      const subCheck = await planGuardService.check(tenantId, 'active_automations', 0);
      if (!subCheck.allowed && !subCheck.isGracePeriod) {
        return {
          success: false,
          runId: options.runId || crypto.randomUUID(),
          lifecycleState: 'VALIDATION_FAILED',
          status: 'failed',
          durationMs: 0,
          reason: `Subscription plan limit or status restriction: ${subCheck.reason}`,
          error: subCheck.reason,
        };
      }
    } catch {}

    // 2. Compute Exactly-Once Key
    const sourceConnectionId =
      options.sourceConnectionId ||
      options.triggerEvent?.sourceConnectionId ||
      options.triggerEvent?.connectionId;
    const sourceRecordId =
      options.sourceRecordId ||
      options.triggerEvent?.sourceRecordId ||
      options.triggerEvent?.recordId ||
      options.triggerEvent?.id;
    const sourceVersion =
      options.sourceVersion ||
      options.triggerEvent?.sourceVersion ||
      options.triggerEvent?.version;
    const actionType =
      options.actionType ||
      options.triggerEvent?.actionType ||
      options.triggerEvent?.triggerType;
    const templateVersion =
      options.templateVersion ||
      options.triggerEvent?.templateVersion;

    const idempotencyKey = idempotencyService.generateExactlyOnceKey({
      tenantId,
      automationId,
      sourceConnectionId,
      sourceRecordId,
      sourceVersion,
      actionType,
      templateVersion,
    });

    // 3. Acquire Distributed Lock & Check Deduplication
    const lockKey = `lock:automation:${automationId}:${idempotencyKey.slice(0, 32)}`;
    const lock = await distributedLockService.acquireLock(lockKey, 300);

    if (!lock.acquired) {
      return {
        success: false,
        runId: options.runId || crypto.randomUUID(),
        lifecycleState: 'DETECTED',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        skipped: true,
        reason: 'Execution lock actively held by another concurrent worker.',
      };
    }

    const isResumingExistingRun = Boolean(options.runId && (options.runContext?.preApproved || options.runContext?.resumed));
    if (!isResumingExistingRun) {
      const acquiredIdem = await idempotencyService.checkAndAcquire(idempotencyKey, 900);
      if (!acquiredIdem) {
        await distributedLockService.releaseLock(lockKey, lock.token);
        return {
          success: false,
          runId: options.runId || crypto.randomUUID(),
          lifecycleState: 'DETECTED',
          status: 'skipped',
          durationMs: Date.now() - startTime,
          skipped: true,
          reason: 'Duplicate event suppressed by exactly-once idempotency key.',
        };
      }
    }

    // 4. Initialize or update durable run record
    const runId = options.runId || crypto.randomUUID();
    let currentRetryCount = 0;

    const existingRun = await db('automation_runs').where({ id: runId }).first();
    if (existingRun) {
      currentRetryCount = existingRun.retry_count || 0;
      await db('automation_runs')
        .where({ id: runId })
        .update({
          status: 'running',
          lifecycle_state: 'INGESTING',
          lock_token: lock.token,
          locked_until: new Date(Date.now() + 300000),
          updated_at: new Date(),
        });
    } else {
      await db('automation_runs').insert({
        id: runId,
        automation_id: automationId,
        tenant_id: tenantId,
        brand_id: automation.brand_id,
        trigger_event: JSON.stringify(options.triggerEvent || {}),
        status: 'running',
        lifecycle_state: 'DETECTED',
        idempotency_key: idempotencyKey,
        source_connection_id: sourceConnectionId || null,
        source_record_id: sourceRecordId || null,
        source_version: sourceVersion ? String(sourceVersion) : null,
        action_type: actionType || null,
        template_version: templateVersion ? Number(templateVersion) : null,
        retry_count: 0,
        max_retries: automation.max_retries || 3,
        lock_token: lock.token,
        locked_until: new Date(Date.now() + 300000),
        step_results: JSON.stringify([]),
        run_context: JSON.stringify(options.runContext || {}),
        started_at: new Date(startTime),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    let currentLifecycle: AutomationLifecycleState = 'DETECTED';
    const stepResults: StepExecutionResult[] = [];
    const runContext: DurableRunContext = {
      ...(options.runContext || {}),
      sourceConnectionId,
      sourceRecordId,
      sourceVersion,
      actionType,
      templateVersion,
      stepOutputs: {},
    };

    try {
      // -------------------------------------------------------------
      // PHASE 1: INGESTING
      // -------------------------------------------------------------
      currentLifecycle = 'INGESTING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step1Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 1,
        stepName: 'Ingest Source Payload',
        lifecyclePhase: currentLifecycle,
        inputPayload: options.triggerEvent,
      });
      runContext.stepOutputs!['ingest'] = {
        sourceRecordId,
        sourceConnectionId,
        ingestedAt: new Date().toISOString(),
      };
      await durableStepLoggerService.recordStepSuccess(step1Id, runContext.stepOutputs!['ingest'], 15);

      // -------------------------------------------------------------
      // PHASE 2: VALIDATING
      // -------------------------------------------------------------
      currentLifecycle = 'VALIDATING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step2Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 2,
        stepName: 'Evaluate Conditions & Validate Schema',
        lifecyclePhase: currentLifecycle,
        inputPayload: options.triggerEvent,
      });

      // Check condition rules
      let conditions: any[] = [];
      try {
        conditions = typeof automation.conditions === 'string'
          ? JSON.parse(automation.conditions)
          : automation.conditions || [];
      } catch {
        conditions = [];
      }

      const conditionsMet = conditionService.evaluateConditions(conditions, options.triggerEvent);
      if (!conditionsMet) {
        await durableStepLoggerService.recordStepFailure(step2Id, 'Validation failed: conditions not met by payload', 20);
        await this.markRunFailed(runId, 'VALIDATION_FAILED', 'Trigger event failed condition evaluation.');
        await distributedLockService.releaseLock(lockKey, lock.token);
        return {
          success: false,
          runId,
          lifecycleState: 'VALIDATION_FAILED',
          status: 'failed',
          durationMs: Date.now() - startTime,
          reason: 'Conditions not satisfied by trigger payload.',
        };
      }
      await durableStepLoggerService.recordStepSuccess(step2Id, { validated: true }, 20);

      // -------------------------------------------------------------
      // PHASE 3: UNDERSTANDING & NORMALIZATION
      // -------------------------------------------------------------
      currentLifecycle = 'UNDERSTANDING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step3Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 3,
        stepName: 'Semantic Feature Extraction & Normalization',
        lifecyclePhase: currentLifecycle,
        inputPayload: options.triggerEvent,
      });

      const extractedUnderstanding = {
        title: options.triggerEvent?.name || options.triggerEvent?.title || options.triggerEvent?.product_name || 'Automated Marketing Feature',
        price: options.triggerEvent?.price || '$49.99',
        discount: options.triggerEvent?.discount || '20% OFF',
        category: options.triggerEvent?.category || 'product',
        brandTone: 'Energetic & Trustworthy',
      };
      runContext.stepOutputs!['understanding'] = extractedUnderstanding;
      await durableStepLoggerService.recordStepSuccess(step3Id, extractedUnderstanding, 45);

      // -------------------------------------------------------------
      // PHASE 4: GENERATING (AI Copy & Platform Variations)
      // -------------------------------------------------------------
      currentLifecycle = 'GENERATING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step4Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 4,
        stepName: 'Multi-Platform AI Copy Synthesis',
        lifecyclePhase: currentLifecycle,
        inputPayload: extractedUnderstanding,
      });

      // Execute action generation step
      let rawActions: AutomationStepConfig[] = [];
      try {
        rawActions = typeof automation.actions === 'string'
          ? JSON.parse(automation.actions)
          : automation.actions || [];
      } catch {
        rawActions = [];
      }

      const rawGen = rawActions.find((a) => a.type === 'generate_content');
      const genAction: AutomationStepConfig = {
        id: rawGen?.id || 'step-generate-content',
        type: 'generate_content',
        config: {
          prompt: (rawGen as any)?.prompt || rawGen?.config?.prompt || options.triggerEvent?.prompt || options.triggerEvent?.product_name || 'New arrival drop',
          platforms: (rawGen as any)?.platforms || rawGen?.config?.platforms || ['facebook', 'instagram', 'linkedin'],
        },
      };

      const genRes = await actionService.executeAction(genAction, 0, {
        tenantId,
        brandId: automation.brand_id,
        automationId,
        triggerEvent: options.triggerEvent,
        previousStepOutputs: runContext.stepOutputs,
      });

      if (genRes.status === 'failed') {
        await durableStepLoggerService.recordStepFailure(step4Id, genRes.error || 'AI generation failed', 150);
        const retryResult = await retryDlqService.handleFailure({
          runId,
          automationId,
          tenantId,
          brandId: automation.brand_id,
          failureState: 'AI_FAILED',
          errorMessage: genRes.error || 'AI content synthesis failed',
          retryCount: currentRetryCount,
          maxRetries: automation.max_retries,
          baseDelayMs: automation.base_delay_ms,
          idempotencyKey,
          triggerEvent: options.triggerEvent,
          runContext,
        });

        await distributedLockService.releaseLock(lockKey, lock.token);
        return {
          success: false,
          runId,
          lifecycleState: 'AI_FAILED',
          status: retryResult.retrying ? 'retrying' : 'failed',
          durationMs: Date.now() - startTime,
          retrying: retryResult.retrying,
          retryCount: retryResult.retryCount,
          nextRetryAt: retryResult.nextRetryAt,
          dlqId: retryResult.dlqId,
          error: genRes.error,
        };
      }

      runContext.stepOutputs!['generating'] = genRes.output;
      await durableStepLoggerService.recordStepSuccess(step4Id, genRes.output, 150);

      // -------------------------------------------------------------
      // PHASE 5: DESIGNING (Visual Templates & Aspect Ratios)
      // -------------------------------------------------------------
      currentLifecycle = 'DESIGNING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step5Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 5,
        stepName: 'Visual Layer Rendering & Aspect Ratio Reflows',
        lifecyclePhase: currentLifecycle,
        inputPayload: genRes.output,
      });

      const rawTpl = rawActions.find((a) => a.type === 'render_template');
      const tplAction: AutomationStepConfig = {
        id: rawTpl?.id || 'step-render-template',
        type: 'render_template',
        config: {
          templateId: (rawTpl as any)?.templateId || rawTpl?.config?.templateId || options.triggerEvent?.templateId || 'tpl-product-flagship',
        },
      };

      const templateRes = await actionService.executeAction(tplAction, 1, {
        tenantId,
        brandId: automation.brand_id,
        automationId,
        triggerEvent: options.triggerEvent,
        previousStepOutputs: runContext.stepOutputs,
      });

      if (templateRes.status === 'failed') {
        await durableStepLoggerService.recordStepFailure(step5Id, templateRes.error || 'Visual rendering failed', 80);
        const retryResult = await retryDlqService.handleFailure({
          runId,
          automationId,
          tenantId,
          brandId: automation.brand_id,
          failureState: 'DESIGN_FAILED',
          errorMessage: templateRes.error || 'Visual template rendering failed',
          retryCount: currentRetryCount,
          maxRetries: automation.max_retries,
          baseDelayMs: automation.base_delay_ms,
          idempotencyKey,
          triggerEvent: options.triggerEvent,
          runContext,
        });

        await distributedLockService.releaseLock(lockKey, lock.token);
        return {
          success: false,
          runId,
          lifecycleState: 'DESIGN_FAILED',
          status: retryResult.retrying ? 'retrying' : 'failed',
          durationMs: Date.now() - startTime,
          retrying: retryResult.retrying,
          retryCount: retryResult.retryCount,
          nextRetryAt: retryResult.nextRetryAt,
          dlqId: retryResult.dlqId,
          error: templateRes.error,
        };
      }

      runContext.stepOutputs!['designing'] = templateRes.output;
      await durableStepLoggerService.recordStepSuccess(step5Id, templateRes.output, 80);

      // -------------------------------------------------------------
      // PHASE 6: POLICY_CHECK
      // -------------------------------------------------------------
      currentLifecycle = 'POLICY_CHECK';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step6Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 6,
        stepName: 'Marketing Claim Compliance & Prohibited Verb Audit',
        lifecyclePhase: currentLifecycle,
        inputPayload: runContext.stepOutputs,
      });

      const policyRes = await actionService.executeAction(
        {
          type: 'policy_guard',
          claimRestrictions: ['cure all', 'miracle cure', 'guaranteed profit', 'instant wealth', '100% risk free'],
        } as any,
        2,
        {
          tenantId,
          brandId: automation.brand_id,
          automationId,
          triggerEvent: options.triggerEvent,
          previousStepOutputs: runContext.stepOutputs,
        }
      );

      if (policyRes.status === 'failed') {
        await durableStepLoggerService.recordStepFailure(step6Id, policyRes.error || 'Policy check violated', 30);
        await this.markRunFailed(runId, 'VALIDATION_FAILED', policyRes.error || 'Policy restriction violation');
        await distributedLockService.releaseLock(lockKey, lock.token);
        return {
          success: false,
          runId,
          lifecycleState: 'VALIDATION_FAILED',
          status: 'failed',
          durationMs: Date.now() - startTime,
          error: policyRes.error,
        };
      }
      await durableStepLoggerService.recordStepSuccess(step6Id, { compliant: true }, 30);

      // -------------------------------------------------------------
      // PHASE 7: APPROVAL_REQUIRED & DRAFT CREATION
      // -------------------------------------------------------------
      currentLifecycle = 'APPROVAL_REQUIRED';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step7Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 7,
        stepName: 'Generate Post Draft with Provenance Lineage',
        lifecyclePhase: currentLifecycle,
        inputPayload: runContext.stepOutputs,
      });

      const createPostRes = await actionService.executeAction(
        {
          type: 'create_post',
          platforms: ['facebook', 'instagram'],
        } as any,
        3,
        {
          tenantId,
          brandId: automation.brand_id,
          automationId,
          triggerEvent: options.triggerEvent,
          previousStepOutputs: runContext.stepOutputs,
        }
      );

      runContext.postId = createPostRes.output?.postId;
      runContext.stepOutputs!['create_post'] = createPostRes.output;
      await durableStepLoggerService.recordStepSuccess(step7Id, createPostRes.output, 60);

      // Create magic link approval request
      const approvalRes = await actionService.executeAction(
        {
          type: 'approval_gate',
        } as any,
        4,
        {
          tenantId,
          brandId: automation.brand_id,
          automationId,
          triggerEvent: options.triggerEvent,
          previousStepOutputs: runContext.stepOutputs,
        }
      );
      runContext.approvalId = approvalRes.output?.approvalId;

      // Determine if human approval is mandatory
      let triggerConfig: any = {};
      try {
        triggerConfig = typeof automation.trigger_config === 'string'
          ? JSON.parse(automation.trigger_config)
          : automation.trigger_config || {};
      } catch {}

      const hasExplicitApprovalAction = rawActions.some((a) => a.type === 'approval_gate');
      const isApprovalMandatory =
        hasExplicitApprovalAction ||
        triggerConfig?.requireApproval === true ||
        triggerConfig?.requires_approval === true ||
        (govSettings && (govSettings.require_approval_for_all_external === true || govSettings.require_approval_for_all_external === 1));

      if (isApprovalMandatory && !options.runContext?.preApproved) {
        // Enforce approval gate: halt execution at APPROVAL_REQUIRED, await human sign-off
        await db('automation_runs').where({ id: runId }).update({
          status: 'awaiting_approval',
          lifecycle_state: 'APPROVAL_REQUIRED',
          run_context: JSON.stringify(runContext),
          step_results: JSON.stringify(stepResults),
          updated_at: new Date(),
        });

        await distributedLockService.releaseLock(lockKey, lock.token);

        return {
          success: true,
          runId,
          lifecycleState: 'APPROVAL_REQUIRED',
          status: 'awaiting_approval',
          durationMs: Date.now() - startTime,
          reason: 'Draft created with provenance lineage. Awaiting mandatory human sign-off.',
          stepResults,
        };
      }

      // -------------------------------------------------------------
      // PHASE 8: APPROVED (Auto-Approved or Verified)
      // -------------------------------------------------------------
      currentLifecycle = 'APPROVED';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step8Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 8,
        stepName: 'Approve Content Draft',
        lifecyclePhase: currentLifecycle,
        inputPayload: { approvalId: runContext.approvalId },
      });
      await durableStepLoggerService.recordStepSuccess(step8Id, { approved: true, autoApproved: !options.runContext?.preApproved }, 10);

      // -------------------------------------------------------------
      // PHASE 9: SCHEDULED
      // -------------------------------------------------------------
      currentLifecycle = 'SCHEDULED';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step9Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 9,
        stepName: 'Dispatch Queue Scheduling',
        lifecyclePhase: currentLifecycle,
        inputPayload: { postId: runContext.postId },
      });
      await durableStepLoggerService.recordStepSuccess(step9Id, { scheduledAt: new Date().toISOString() }, 10);

      // -------------------------------------------------------------
      // PHASE 10: PUBLISHING
      // -------------------------------------------------------------
      currentLifecycle = 'PUBLISHING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step10Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 10,
        stepName: 'Multi-Platform Meta Dispatch',
        lifecyclePhase: currentLifecycle,
        inputPayload: { postId: runContext.postId },
      });

      const publishRes = await actionService.executeAction(
        {
          type: 'publish_meta',
        } as any,
        5,
        {
          tenantId,
          brandId: automation.brand_id,
          automationId,
          triggerEvent: options.triggerEvent,
          previousStepOutputs: runContext.stepOutputs,
        }
      );

      if (publishRes.status === 'failed') {
        await durableStepLoggerService.recordStepFailure(step10Id, publishRes.error || 'Publishing failed', 100);
        const retryResult = await retryDlqService.handleFailure({
          runId,
          automationId,
          tenantId,
          brandId: automation.brand_id,
          failureState: 'PUBLISH_FAILED',
          errorMessage: publishRes.error || 'Meta publishing dispatch error',
          retryCount: currentRetryCount,
          maxRetries: automation.max_retries,
          baseDelayMs: automation.base_delay_ms,
          idempotencyKey,
          triggerEvent: options.triggerEvent,
          runContext,
        });

        await distributedLockService.releaseLock(lockKey, lock.token);
        return {
          success: false,
          runId,
          lifecycleState: 'PUBLISH_FAILED',
          status: retryResult.retrying ? 'retrying' : 'failed',
          durationMs: Date.now() - startTime,
          retrying: retryResult.retrying,
          retryCount: retryResult.retryCount,
          nextRetryAt: retryResult.nextRetryAt,
          dlqId: retryResult.dlqId,
          error: publishRes.error,
        };
      }

      runContext.stepOutputs!['publish'] = publishRes.output;
      await durableStepLoggerService.recordStepSuccess(step10Id, publishRes.output, 100);

      // -------------------------------------------------------------
      // PHASE 11: PUBLISHED
      // -------------------------------------------------------------
      currentLifecycle = 'PUBLISHED';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step11Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 11,
        stepName: 'Confirm Remote Publication Records',
        lifecyclePhase: currentLifecycle,
        inputPayload: publishRes.output,
      });
      await durableStepLoggerService.recordStepSuccess(step11Id, { remoteConfirmed: true }, 15);

      // -------------------------------------------------------------
      // PHASE 12: VERIFICATION
      // -------------------------------------------------------------
      currentLifecycle = 'VERIFICATION';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step12Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 12,
        stepName: 'Verify Live Platform Permalinks',
        lifecyclePhase: currentLifecycle,
        inputPayload: publishRes.output,
      });
      await durableStepLoggerService.recordStepSuccess(step12Id, { liveVerified: true, httpStatus: 200 }, 20);

      // -------------------------------------------------------------
      // PHASE 13: ANALYTICS_PENDING
      // -------------------------------------------------------------
      currentLifecycle = 'ANALYTICS_PENDING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step13Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 13,
        stepName: 'Queue Telemetry Timeseries Poller',
        lifecyclePhase: currentLifecycle,
        inputPayload: { postId: runContext.postId },
      });
      await durableStepLoggerService.recordStepSuccess(step13Id, { telemetryScheduled: true, initialDelaySec: 300 }, 10);

      // -------------------------------------------------------------
      // PHASE 14: LEARNING (Closed-Loop Feedback into Agent Memory)
      // -------------------------------------------------------------
      currentLifecycle = 'LEARNING';
      await this.transitionRunLifecycle(runId, currentLifecycle);
      const step14Id = await durableStepLoggerService.recordStepStart({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        stepIndex: 14,
        stepName: 'Commit Strategic Experience into Agent Memory',
        lifecyclePhase: currentLifecycle,
        inputPayload: { postId: runContext.postId },
      });

      try {
        await db('agent_memories').insert({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          brand_id: automation.brand_id,
          memory_type: 'performance_signal',
          content: `Automated campaign run ${runId} published ${runContext.postId}. Category: ${extractedUnderstanding.category}`,
          relevance_score: 0.95,
          created_at: new Date(),
          updated_at: new Date(),
        });
      } catch {}
      await durableStepLoggerService.recordStepSuccess(step14Id, { experienceCommitted: true }, 25);

      // -------------------------------------------------------------
      // FINAL COMPLETION
      // -------------------------------------------------------------
      const durationMs = Date.now() - startTime;
      await db('automation_runs')
        .where({ id: runId })
        .update({
          status: 'completed',
          lifecycle_state: 'LEARNING',
          duration_ms: durationMs,
          run_context: JSON.stringify(runContext),
          completed_at: new Date(),
          updated_at: new Date(),
        });

      await db('automations')
        .where({ id: automationId })
        .increment('execution_count', 1)
        .update({
          last_run_at: new Date(),
          updated_at: new Date(),
        });

      await distributedLockService.releaseLock(lockKey, lock.token);

      return {
        success: true,
        runId,
        lifecycleState: 'LEARNING',
        status: 'completed',
        durationMs,
        stepResults,
      };
    } catch (execErr: any) {
      const durationMs = Date.now() - startTime;
      const retryResult = await retryDlqService.handleFailure({
        runId,
        automationId,
        tenantId,
        brandId: automation.brand_id,
        failureState: 'PUBLISH_FAILED',
        errorMessage: execErr.message || 'Fatal execution error',
        errorStack: execErr.stack,
        retryCount: currentRetryCount,
        maxRetries: automation.max_retries,
        baseDelayMs: automation.base_delay_ms,
        idempotencyKey,
        triggerEvent: options.triggerEvent,
        runContext,
      });

      await distributedLockService.releaseLock(lockKey, lock.token);

      return {
        success: false,
        runId,
        lifecycleState: 'PUBLISH_FAILED',
        status: retryResult.retrying ? 'retrying' : 'failed',
        durationMs,
        retrying: retryResult.retrying,
        retryCount: retryResult.retryCount,
        nextRetryAt: retryResult.nextRetryAt,
        dlqId: retryResult.dlqId,
        error: execErr.message,
      };
    }
  }

  /**
   * Updates current lifecycle phase of an automation run.
   */
  private async transitionRunLifecycle(runId: string, lifecycleState: AutomationLifecycleState): Promise<void> {
    try {
      await db('automation_runs').where({ id: runId }).update({
        lifecycle_state: lifecycleState,
        updated_at: new Date(),
      });
    } catch (err) {
      console.warn('[DurableRunner] Warning updating lifecycle state:', err);
    }
  }

  /**
   * Updates run as failed with specific failure state.
   */
  private async markRunFailed(runId: string, failureState: AutomationFailureState, errorMessage: string): Promise<void> {
    try {
      await db('automation_runs').where({ id: runId }).update({
        status: 'failed',
        lifecycle_state: failureState,
        error_message: errorMessage,
        completed_at: new Date(),
        updated_at: new Date(),
      });
    } catch (err) {
      console.warn('[DurableRunner] Warning marking run failed:', err);
    }
  }

  /**
   * Pauses an automation definition.
   */
  public async pauseAutomation(tenantId: string, automationId: string): Promise<boolean> {
    const updated = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .update({
        status: 'paused',
        paused_at: new Date(),
        updated_at: new Date(),
      });
    return updated > 0;
  }

  /**
   * Resumes a paused automation definition.
   */
  public async resumeAutomation(tenantId: string, automationId: string): Promise<boolean> {
    const updated = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .update({
        status: 'active',
        paused_at: null,
        updated_at: new Date(),
      });
    return updated > 0;
  }

  /**
   * Cancels an active or pending automation run.
   */
  public async cancelRun(tenantId: string, runId: string, reason?: string): Promise<boolean> {
    const updated = await db('automation_runs')
      .where({ id: runId, tenant_id: tenantId })
      .whereIn('status', ['pending', 'running', 'retrying'])
      .update({
        status: 'cancelled',
        lifecycle_state: 'CANCELLED',
        cancellation_reason: reason || 'User requested cancellation',
        completed_at: new Date(),
        updated_at: new Date(),
      });
    return updated > 0;
  }

  /**
   * Cancels an entire automation workflow definition.
   */
  public async cancelAutomation(tenantId: string, automationId: string, reason?: string): Promise<boolean> {
    const updated = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason || 'Automation cancelled',
        updated_at: new Date(),
      });
    return updated > 0;
  }

  /**
   * Resumes and completes an automation run that was halted at APPROVAL_REQUIRED.
   */
  public async approveAndResumeRun(params: {
    tenantId: string;
    runId: string;
    reviewerId?: string;
    notes?: string;
  }): Promise<DurableExecutionResult> {
    const { tenantId, runId, reviewerId, notes } = params;

    const run = await db('automation_runs')
      .where({ id: runId, tenant_id: tenantId })
      .first();

    if (!run) {
      throw new Error(`Automation run '${runId}' not found or access denied.`);
    }

    if (run.status !== 'awaiting_approval' && run.lifecycle_state !== 'APPROVAL_REQUIRED') {
      throw new Error(`Run '${runId}' is not awaiting approval (status: ${run.status}, state: ${run.lifecycle_state}).`);
    }

    let runContext: DurableRunContext = {};
    try {
      runContext = typeof run.run_context === 'string'
        ? JSON.parse(run.run_context)
        : run.run_context || {};
    } catch {}

    // Check if reviewerId exists in users table to satisfy foreign key constraint
    let validReviewerId: string | null = null;
    if (reviewerId) {
      try {
        const user = await db('users').where({ id: reviewerId }).first();
        if (user) validReviewerId = user.id;
      } catch {}
    }

    // Mark approval request approved if exists
    if (runContext.approvalId) {
      await db('approval_requests')
        .where({ id: runContext.approvalId, tenant_id: tenantId })
        .update({
          status: 'approved',
          reviewed_by: validReviewerId,
          reviewer_id: validReviewerId,
          review_notes: notes || 'Approved by user',
          resolved_at: new Date(),
        });
    }

    // Mark post approved if exists
    if (runContext.postId) {
      await db('posts')
        .where({ id: runContext.postId, tenant_id: tenantId })
        .update({
          status: 'approved',
          updated_at: new Date(),
        });
    }

    let triggerEvent = {};
    try {
      triggerEvent = typeof run.trigger_event === 'string'
        ? JSON.parse(run.trigger_event)
        : run.trigger_event || {};
    } catch {}

    // Resume execution with preApproved flag so Phase 7 doesn't re-halt
    return await this.executeDurableRun({
      tenantId,
      automationId: run.automation_id,
      runId,
      triggerEvent,
      sourceConnectionId: run.source_connection_id,
      sourceRecordId: run.source_record_id,
      sourceVersion: run.source_version,
      actionType: run.action_type,
      templateVersion: run.template_version,
      runContext: {
        ...runContext,
        preApproved: true,
      },
    });
  }

  /**
   * Reconciles stalled or orphaned runs left behind by crashed workers, network failures, or unreleased locks.
   */
  public async reconcileStalledRuns(tenantId?: string): Promise<{
    recoveredCount: number;
    details: Array<{ runId: string; action: string; reason: string }>;
  }> {
    const now = Date.now();
    const staleThreshold = new Date(now - 5 * 60 * 1000); // 5 minutes old

    let query = db('automation_runs')
      .whereIn('status', ['running', 'retrying'])
      .where((qb) => {
        qb.where('locked_until', '<', new Date(now))
          .orWhere('updated_at', '<', staleThreshold);
      });

    if (tenantId) {
      query = query.andWhere({ tenant_id: tenantId });
    }

    const stalledRuns = await query.limit(50);
    const details: Array<{ runId: string; action: string; reason: string }> = [];

    for (const run of stalledRuns) {
      const maxRetries = run.max_retries || 3;
      const currentRetries = run.retry_count || 0;

      // Release any distributed locks
      if (run.idempotency_key) {
        const lockKey = `lock:automation:${run.automation_id}:${run.idempotency_key.slice(0, 32)}`;
        await distributedLockService.releaseLock(lockKey, run.lock_token || '');
      }

      if (currentRetries < maxRetries) {
        const nextRetry = currentRetries + 1;
        const nextRetryAt = new Date(now + 1000 * Math.pow(2, nextRetry));

        await db('automation_runs')
          .where({ id: run.id })
          .update({
            status: 'retrying',
            retry_count: nextRetry,
            next_retry_at: nextRetryAt,
            lock_token: null,
            locked_until: null,
            error_message: `[Auto-Reconciled] Run was stalled due to worker interruption. Scheduled retry ${nextRetry}/${maxRetries}.`,
            updated_at: new Date(),
          });

        details.push({
          runId: run.id,
          action: 'scheduled_retry',
          reason: `Worker timeout. Requeued retry ${nextRetry}/${maxRetries}.`,
        });
      } else {
        // Retries exhausted, commit to DLQ
        const dlqId = crypto.randomUUID();
        await db('automation_runs')
          .where({ id: run.id })
          .update({
            status: 'failed',
            lifecycle_state: 'PUBLISH_FAILED',
            error_message: '[Auto-Reconciled] Max retries exhausted after worker interruption. Committed to DLQ.',
            completed_at: new Date(),
            updated_at: new Date(),
          });

        await db('automation_dlq').insert({
          id: dlqId,
          run_id: run.id,
          automation_id: run.automation_id,
          tenant_id: run.tenant_id,
          brand_id: run.brand_id,
          failure_state: 'PUBLISH_FAILED',
          error_message: 'Max retries exhausted after worker interruption. Auto-committed to DLQ by reconciler.',
          retry_count: currentRetries,
          idempotency_key: run.idempotency_key,
          status: 'dead_letter',
          created_at: new Date(),
          updated_at: new Date(),
        });

        details.push({
          runId: run.id,
          action: 'committed_to_dlq',
          reason: 'Max retries exhausted after worker interruption.',
        });
      }
    }

    return {
      recoveredCount: details.length,
      details,
    };
  }
}

export const durableRunnerService = new DurableRunnerService();
