import { db } from '../db/connection.js';
import { processAutomationJob } from '../processors/automation.processor.js';

export async function runAutomationScheduler() {
  try {
    // 1. Process any pending runs queued in automation_runs
    const pendingRuns = await db('automation_runs')
      .where('status', 'pending')
      .limit(10)
      .select('id', 'automation_id', 'trigger_event');

    for (const run of pendingRuns) {
      console.log(`[Automation Scheduler] Dispatching pending run ${run.id} for automation ${run.automation_id}`);
      let triggerPayload = {};
      try {
        triggerPayload = typeof run.trigger_event === 'string' ? JSON.parse(run.trigger_event) : (run.trigger_event || {});
      } catch (e) {}

      await processAutomationJob({
        automationId: run.automation_id,
        runId: run.id,
        triggerEvent: triggerPayload,
      });
    }

    // 2. Evaluate scheduled automations
    const scheduledAutomations = await db('automations')
      .where('status', 'active')
      .andWhere('trigger_type', 'schedule')
      .limit(20);

    const now = Date.now();
    for (const auto of scheduledAutomations) {
      let config: any = {};
      try {
        config = typeof auto.trigger_config === 'string' ? JSON.parse(auto.trigger_config) : (auto.trigger_config || {});
      } catch (e) {}

      // Interval checking (default: 3600s / 1 hour if unspecified)
      const intervalMinutes = config.intervalMinutes || 60;
      const intervalMs = intervalMinutes * 60 * 1000;
      const lastRun = auto.last_run_at ? new Date(auto.last_run_at).getTime() : 0;

      if (now - lastRun >= intervalMs) {
        console.log(`[Automation Scheduler] Schedule trigger elapsed for automation ${auto.id} ("${auto.name}"). Executing...`);
        await processAutomationJob({
          automationId: auto.id,
          triggerEvent: { source: 'cron_scheduler', intervalMinutes, triggeredAt: new Date().toISOString() },
        });
      }
    }
  } catch (err) {
    // Fail gracefully if tables are pending migration or DB is cold
    console.debug?.('[Automation Scheduler] Scheduler cycle completed or table pending:', (err as any)?.message);
  }
}
